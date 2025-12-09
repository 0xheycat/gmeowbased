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
 * 
 * Uses the secured /api/onchain-stats/[chain] API endpoint
 */

import { useEffect, useState, useCallback, useRef } from 'react'

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

      memoryCache.set(cacheKey, { data: stats, fetchedAt: Date.now() })
      setData(stats)
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
