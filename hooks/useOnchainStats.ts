/**
 * useOnchainStats - Professional SWR-inspired data fetching hook
 * 
 * Pattern: Stale-while-revalidate (inspired by useSWR, react-query)
 * 
 * Features:
 * - ✅ Request deduplication (100 users = 1 API call)
 * - ✅ Automatic caching (client-side)
 * - ✅ Background revalidation (update stale data)
 * - ✅ Optimistic updates (instant UI feedback)
 * - ✅ On-chain contract reads (ScoringModule) - Phase 3.2B (Dec 31, 2025)
 * 
 * Uses the secured /api/onchain-stats/[chain] API endpoint
 * AND direct ScoringModule contract reads for points/scores
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { useReadContract } from 'wagmi'
import { STANDALONE_ADDRESSES } from '@/lib/contracts/gmeow-utils'
import { SCORING_ABI } from '@/lib/contracts/abis'

type ChainKey = 'base' | 'ethereum' | 'optimism' | 'op' | 'arbitrum' | 'polygon' | 'gnosis' | 'celo' | 'scroll' | 'unichain' | 'soneium' | 'zksync' | 'zora'

export type TokenHolding = {
  symbol: string
  balance: string
  valueUSD: string
  address: string
}

export type NFTCollection = {
  name: string
  symbol: string
  address: string
  tokenType: string
  tokenCount: number
  floorPriceETH: string | null
  floorPriceUSD: string | null
  totalValueETH: string | null
  totalValueUSD: string | null
}

export type OnchainStatsData = {
  // Core Identity - ENHANCED with MCP data (Dec 12)
  address?: string | null
  ensName?: string | null
  isContract?: boolean | null
  publicTags?: string[] | null // FIXED: Now gets actual tags from MCP
  contractVerified?: boolean | null
  contractName?: string | null // NEW: Contract name from MCP
  accountAgeDays: number | null
  
  // Portfolio Value - FIXED with accurate balance from MCP
  balance: string | null
  balanceWei: string | null
  portfolioValueUSD?: string | null
  erc20TokenCount?: number | null
  nftCollectionsCount?: number | null
  stablecoinBalance?: string | null
  topTokens?: TokenHolding[] | null
  
  // NFT Portfolio
  nftPortfolioValueUSD?: string | null
  nftFloorValueETH?: string | null
  topNFTCollections?: NFTCollection[] | null
  
  // Account Activity
  totalTxs?: number | null
  totalTokenTxs?: number | null
  uniqueContracts?: number | null
  contractsDeployed: number | null
  uniqueDays?: number | null
  uniqueWeeks?: number | null
  uniqueMonths?: number | null
  accountAge?: number | null
  firstTx: { blockNumber: string | null; timestamp: number | null; date: string | null } | null
  lastTx?: { blockNumber: string | null; timestamp: number | null; date: string | null } | null
  firstTxDate?: string | null
  lastTxDate?: string | null
  
  // Financial Metrics
  totalVolume?: string | null
  totalVolumeWei?: string | null
  
  // Gas Analytics
  totalGasUsed?: string | null
  totalGasSpentETH?: string | null
  totalGasSpentUSD?: string | null
  avgGasPrice?: string | null
  
  // L2 & Bridge Stats
  bridgeDeposits?: number | null
  bridgeWithdrawals?: number | null
  nativeBridgeUsed?: boolean | null
  
  // Reputation Scores
  talentScore?: number | null
  neynarScore?: number | null
  
  // Metadata
  duration?: number
  
  // ═══════════════════════════════════════════════════════════════
  // PHASE 3.2B: ScoringModule On-Chain Stats (Dec 31, 2025)
  // ═══════════════════════════════════════════════════════════════
  // Points breakdown from ScoringModule contract
  scoringStats?: {
    tier: number              // User tier (0-11)
    gmPoints: number          // GM rewards points
    questPoints: number       // Quest completion points
    viralPoints: number       // Viral engagement points
    guildPoints: number       // Guild activity points
    referralPoints: number    // Referral bonus points
    totalScore: number        // Total score sum
  } | null
}

type UseOnchainStatsOptions = {
  refreshInterval?: number
  revalidateOnFocus?: boolean
  dedupingInterval?: number
  fallbackData?: OnchainStatsData | null
  enabled?: boolean
}

type UseOnchainStatsReturn = {
  data: OnchainStatsData | null
  loading: boolean
  validating: boolean
  error: Error | null
  mutate: (data: OnchainStatsData | null) => void
  revalidate: () => void
}

const ongoingRequests = new Map<string, Promise<OnchainStatsData>>()
const memoryCache = new Map<string, { data: OnchainStatsData; fetchedAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000

export function useOnchainStats(
  address: string | undefined,
  chainKey: ChainKey,
  options: UseOnchainStatsOptions = {}
): UseOnchainStatsReturn {
  const {
    refreshInterval = 0,
    revalidateOnFocus = false,
    dedupingInterval = 5000,
    fallbackData = null,
    enabled = true,
  } = options

  const [data, setData] = useState<OnchainStatsData | null>(fallbackData)
  const [loading, setLoading] = useState<boolean>(!!address && enabled) // Start as true if address exists
  const [validating, setValidating] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  const isMounted = useRef(true)
  const refreshTimer = useRef<NodeJS.Timeout | null>(null)

  const cacheKey = address && enabled ? `${address}:${chainKey}` : null

  // ═══════════════════════════════════════════════════════════════
  // PHASE 3.2B: ScoringModule Contract Read (Dec 31, 2025)
  // ═══════════════════════════════════════════════════════════════
  // Read user stats directly from ScoringModule contract (Base chain only)
  const { data: scoringStatsRaw, isLoading: scoringLoading } = useReadContract({
    address: STANDALONE_ADDRESSES.base.scoringModule,
    abi: SCORING_ABI,
    functionName: 'getUserStats',
    args: address && chainKey === 'base' ? [address as `0x${string}`] : undefined,
    chainId: 8453, // Base chain
    query: {
      enabled: !!address && enabled && chainKey === 'base',
      refetchInterval: 60000, // Refetch every 60 seconds
      staleTime: 30000, // Consider data stale after 30 seconds
    },
  })

  // Convert ScoringModule stats from BigInt to numbers
  const scoringStats = scoringStatsRaw ? {
    tier: Number((scoringStatsRaw as any)[0]),
    gmPoints: Number((scoringStatsRaw as any)[1]),
    questPoints: Number((scoringStatsRaw as any)[2]),
    viralPoints: Number((scoringStatsRaw as any)[3]),
    guildPoints: Number((scoringStatsRaw as any)[4]),
    referralPoints: Number((scoringStatsRaw as any)[5]),
    totalScore: Number((scoringStatsRaw as any)[1]) + 
                Number((scoringStatsRaw as any)[2]) + 
                Number((scoringStatsRaw as any)[3]) + 
                Number((scoringStatsRaw as any)[4]) + 
                Number((scoringStatsRaw as any)[5]),
  } : null

  const fetchStats = useCallback(async (addr: string, chain: ChainKey, isBackground = false): Promise<OnchainStatsData> => {
    const key = `${addr}:${chain}`

    if (ongoingRequests.has(key)) {
      return ongoingRequests.get(key)!
    }

    if (isBackground) {
      const cached = memoryCache.get(key)
      if (cached && Date.now() - cached.fetchedAt < dedupingInterval) {
        return cached.data
      }
    }

    const promise = fetch(`/api/onchain-stats/${chain}?address=${addr}`)
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(errorData.error || errorData.message || `HTTP ${res.status}`)
        }
        return res.json()
      })
      .finally(() => ongoingRequests.delete(key))

    ongoingRequests.set(key, promise)
    return promise
  }, [dedupingInterval])

  const load = useCallback(async (isBackground = false) => {
    if (!address || !enabled || !cacheKey) {
      setLoading(false)
      return
    }

    // Check cache first (before setting loading state)
    if (!isBackground) {
      const cached = memoryCache.get(cacheKey)
      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        setData(cached.data)
        setError(null)
        setLoading(false)
        return
      }
    }

    // Set loading state
    if (!isBackground) {
      setLoading(true)
    } else {
      setValidating(true)
    }
    setError(null)

    try {
      const stats = await fetchStats(address, chainKey, isBackground)

      if (!isMounted.current) return

      // Merge API stats with on-chain ScoringModule stats (Phase 3.2B)
      const mergedStats = {
        ...stats,
        scoringStats: chainKey === 'base' ? scoringStats : null,
      }

      memoryCache.set(cacheKey, { data: mergedStats, fetchedAt: Date.now() })
      setData(mergedStats)
      setError(null)
    } catch (err) {
      if (!isMounted.current) return

      const error = err instanceof Error ? err : new Error('Failed to fetch stats')
      setError(error)
    } finally {
      if (!isMounted.current) return

      if (!isBackground) {
        setLoading(false)
      } else {
        setValidating(false)
      }
    }
  }, [address, chainKey, cacheKey, enabled, fetchStats])

  const mutate = useCallback((newData: OnchainStatsData | null) => {
    setData(newData)
    if (newData && cacheKey) {
      memoryCache.set(cacheKey, { data: newData, fetchedAt: Date.now() })
    }
  }, [cacheKey])

  const revalidate = useCallback(() => {
    if (cacheKey) {
      memoryCache.delete(cacheKey)
    }
    void load(false)
  }, [cacheKey, load])

  useEffect(() => {
    void load(false)
  }, [load])

  useEffect(() => {
    if (refreshInterval > 0 && address && enabled) {
      refreshTimer.current = setInterval(() => void load(true), refreshInterval)
      return () => {
        if (refreshTimer.current) clearInterval(refreshTimer.current)
      }
    }
  }, [refreshInterval, address, enabled, load])

  useEffect(() => {
    if (!revalidateOnFocus || !address || !enabled) return

    const handleFocus = () => void load(true)
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [revalidateOnFocus, address, enabled, load])

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      if (refreshTimer.current) clearInterval(refreshTimer.current)
    }
  }, [])

  return { data, loading, validating, error, mutate, revalidate }
}
