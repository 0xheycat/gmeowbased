/**
 * useLeaderboardBadges Hook
 * Fetches badges for multiple users in leaderboard
 */

'use client'

import { useState, useEffect, useCallback } from 'react'

export interface BadgeData {
  id: number
  badgeId: string
  badgeType: string
  tier: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'
  assignedAt: string
  metadata?: {
    name?: string
    description?: string
    imageUrl?: string
  }
}

interface LeaderboardBadgesResponse {
  success: boolean
  data: Record<number, BadgeData[]>
  meta: {
    userCount: number
    maxBadgesPerUser: number
  }
}

interface UseLeaderboardBadgesReturn {
  badgesByFid: Record<number, BadgeData[]>
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useLeaderboardBadges(fids: number[]): UseLeaderboardBadgesReturn {
  const [badgesByFid, setBadgesByFid] = useState<Record<number, BadgeData[]>>({})
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBadges = useCallback(async () => {
    if (fids.length === 0) {
      setBadgesByFid({})
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const fidsParam = fids.join(',')
      const response = await fetch(`/api/leaderboard-v2/badges?fids=${fidsParam}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch badges: ${response.statusText}`)
      }

      const data: LeaderboardBadgesResponse = await response.json()

      if (!data.success) {
        throw new Error('API returned unsuccessful response')
      }

      setBadgesByFid(data.data)
    } catch (err) {
      console.error('[useLeaderboardBadges] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch badges')
      setBadgesByFid({})
    } finally {
      setLoading(false)
    }
  }, [fids])

  useEffect(() => {
    fetchBadges()
  }, [fetchBadges])

  return {
    badgesByFid,
    loading,
    error,
    refetch: fetchBadges,
  }
}
