'use client'

import { useState, useEffect } from 'react'

/**
 * Hook to fetch unread notification count
 * 
 * Polls the notifications API to get count of unread events
 * Used in AppNavigation for badge display
 * 
 * Source: New hook for Tailwick navigation
 * Created: Nov 27, 2025
 */

interface UseNotificationCountOptions {
  pollInterval?: number // milliseconds, default: 30000 (30s)
  enabled?: boolean // default: true
}

export function useNotificationCount(options: UseNotificationCountOptions = {}) {
  const { pollInterval = 30000, enabled = true } = options
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!enabled) return

    const fetchCount = async () => {
      try {
        const response = await fetch('/api/notifications?limit=1')
        if (response.ok) {
          const data = await response.json()
          setCount(data.meta?.unreadCount || 0)
          setError(null)
        } else {
          throw new Error('Failed to fetch notification count')
        }
      } catch (err) {
        console.error('Error fetching notification count:', err)
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
  }, [enabled, pollInterval])

  return {
    count,
    loading,
    error,
    refetch: async () => {
      setLoading(true)
      const response = await fetch('/api/notifications?limit=1')
      if (response.ok) {
        const data = await response.json()
        setCount(data.meta?.unreadCount || 0)
      }
      setLoading(false)
    }
  }
}
