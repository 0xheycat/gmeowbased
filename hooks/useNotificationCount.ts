'use client'

import { useState, useEffect } from 'react'

/**
 * Hook to fetch unread notification count
 * 
 * Polls the notifications API to get count of unread events
 * Used in navigation for badge display
 */

interface UseNotificationCountOptions {
  pollInterval?: number // milliseconds, default: 30000 (30s)
  enabled?: boolean // default: true
  fid?: number
  walletAddress?: string
}

export function useNotificationCount(options: UseNotificationCountOptions = {}) {
  const { pollInterval = 30000, enabled = true, fid, walletAddress } = options
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!enabled || (!fid && !walletAddress)) {
      setCount(0)
      setLoading(false)
      return
    }

    const fetchCount = async () => {
      try {
        const params = new URLSearchParams()
        if (fid) params.set('fid', fid.toString())
        if (walletAddress) params.set('walletAddress', walletAddress)
        params.set('limit', '1')

        const response = await fetch(`/api/notifications?${params.toString()}`)
        if (response.ok) {
          const data = await response.json()
          setCount(data.meta?.unreadCount || data.count || 0)
          setError(null)
        } else {
          throw new Error('Failed to fetch notification count')
        }
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    // Initial fetch
    fetchCount()

    // Set up polling
    const interval = setInterval(fetchCount, pollInterval)

    return () => clearInterval(interval)
  }, [enabled, pollInterval, fid, walletAddress])

  return {
    count,
    loading,
    error,
    refetch: async () => {
      if (!fid && !walletAddress) return
      
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (fid) params.set('fid', fid.toString())
        if (walletAddress) params.set('walletAddress', walletAddress)
        params.set('limit', '1')

        const response = await fetch(`/api/notifications?${params.toString()}`)
        if (response.ok) {
          const data = await response.json()
          setCount(data.meta?.unreadCount || data.count || 0)
        }
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }
  }
}
