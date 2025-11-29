/**
 * useOnchainStats Hook
 * 
 * Purpose: Fetch and cache onchain statistics for wallet addresses
 * Optimized: Client-side caching, automatic refetch, loading states
 * 
 * Usage:
 * ```tsx
 * const { stats, loading, error, refetch } = useOnchainStats(address, 'base')
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ChainKey } from '@/lib/chain-registry'
import type { OnchainStatsData } from '@/lib/onchain-stats-types'
import { createEmptyStats } from '@/lib/onchain-stats-types'

type UseOnchainStatsResult = {
  stats: OnchainStatsData
  loading: boolean
  error: string | null
  refetch: () => void
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
  chainKey: ChainKey = 'base',
  options?: {
    enabled?: boolean // Disable automatic fetching
    refetchInterval?: number // Auto-refetch interval in ms
  }
): UseOnchainStatsResult {
  const { enabled = true, refetchInterval } = options || {}
  
  const [stats, setStats] = useState<OnchainStatsData>(createEmptyStats())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const fetchIdRef = useRef(0)
  
  const fetchStats = useCallback(
    async (force: boolean = false) => {
      if (!address || !enabled) {
        setStats(createEmptyStats())
        setLoading(false)
        setError(null)
        return
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
          address,
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
          setStats(data.data)
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
