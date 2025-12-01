/**
 * useOnchainStats Hook
 * 
 * Purpose: Fetch and cache onchain statistics for wallet addresses
 * Optimized: Client-side caching, request cancellation, loading states
 * 
 * Usage:
 * ```tsx
 * const { stats, loading, error, refetch } = useOnchainStats(address)
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { chainStateCache } from '@/lib/cache-storage'

const STATS_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

type OnchainStatsData = {
  totalOutgoingTxs: number | null
  contractsDeployed: number | null
  talentScore: number | null
  talentUpdatedAt: string | null
  firstTxAt: number | null
  lastTxAt: number | null
  baseAgeSeconds: number | null
  baseBalanceEth: string | null
  totalVolumeEth?: string | null
  neynarScore?: number | null
  powerBadge?: boolean | null
}

type CachedStats = {
  data: OnchainStatsData
  fetchedAt: number
}

type UseOnchainStatsResult = {
  stats: OnchainStatsData | null
  loading: boolean
  error: string | null
  refetch: () => void
}

function createEmptyStats(): OnchainStatsData {
  return {
    totalOutgoingTxs: null,
    contractsDeployed: null,
    talentScore: null,
    talentUpdatedAt: null,
    firstTxAt: null,
    lastTxAt: null,
    baseAgeSeconds: null,
    baseBalanceEth: null,
    totalVolumeEth: null,
    neynarScore: null,
    powerBadge: null,
  }
}

/**
 * Fetch onchain statistics for a wallet address
 * 
 * @param address - Wallet address (0x...)
 * @param chainKey - Chain to query (default: 'base')
 * @param options - Optional configuration
 * @returns Stats data, loading state, error, and refetch function
 */
export function useOnchainStats(
  address: string | null | undefined,
  chainKey: string = 'base',
  options?: {
    enabled?: boolean // Disable automatic fetching
    refetchInterval?: number // Auto-refetch interval in ms
  }
): UseOnchainStatsResult {
  const { enabled = true, refetchInterval } = options || {}
  
  const [stats, setStats] = useState<OnchainStatsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const fetchIdRef = useRef(0)
  
  const fetchStats = useCallback(
    async (force: boolean = false) => {
      const normalizedAddress = address?.toLowerCase()
      
      if (!normalizedAddress || !enabled) {
        setStats(null)
        setLoading(false)
        setError(null)
        return
      }
      
      // Check cache first
      if (!force) {
        const cacheKey = `stats:${normalizedAddress}:${chainKey}`
        const cached = chainStateCache.get(cacheKey) as CachedStats | null
        
        if (cached && Date.now() - cached.fetchedAt < STATS_CACHE_TTL_MS) {
          setStats(cached.data)
          setLoading(false)
          setError(null)
          return
        }
      }
      
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      const currentFetchId = ++fetchIdRef.current
      const controller = new AbortController()
      abortControllerRef.current = controller
      
      setLoading(true)
      setError(null)
      
      try {
        const params = new URLSearchParams({
          address: normalizedAddress,
          chain: chainKey,
        })
        
        if (force) {
          params.set('force', 'true')
        }
        
        const response = await fetch(`/api/onchain-stats?${params.toString()}`, {
          signal: controller.signal,
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }
        
        const data = await response.json()
        
        // Check if this is still the latest request
        if (currentFetchId !== fetchIdRef.current) {
          return
        }
        
        if (data.ok && data.data) {
          const statsData = data.data
          
          // Update cache
          const cacheKey = `stats:${normalizedAddress}:${chainKey}`
          chainStateCache.set(cacheKey, {
            data: statsData,
            fetchedAt: Date.now(),
          })
          
          setStats(statsData)
          setError(null)
        } else {
          throw new Error(data.error || 'Invalid response format')
        }
      } catch (err) {
        // Check if this is still the latest request
        if (currentFetchId !== fetchIdRef.current) {
          return
        }
        
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            // Request was cancelled, ignore
            return
          }
          
          setError(err.message)
        } else {
          setError('Failed to fetch onchain stats')
        }
        
        setStats(createEmptyStats())
      } finally {
        // Check if this is still the latest request
        if (currentFetchId === fetchIdRef.current) {
          setLoading(false)
        }
      }
    },
    [address, chainKey, enabled]
  )
  
  // Initial fetch
  useEffect(() => {
    fetchStats()
    
    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchStats])
  
  // Auto-refetch interval
  useEffect(() => {
    if (!refetchInterval || !address || !enabled) {
      return
    }
    
    const intervalId = setInterval(() => {
      fetchStats()
    }, refetchInterval)
    
    return () => clearInterval(intervalId)
  }, [refetchInterval, address, enabled, fetchStats])
  
  const refetch = useCallback(() => {
    fetchStats(true) // Force refetch (bypass cache)
  }, [fetchStats])
  
  return {
    stats,
    loading,
    error,
    refetch,
  }
}
