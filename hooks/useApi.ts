/**
 * React Hooks for API Data Fetching
 * Handles loading states, errors, and caching
 */

import { useState, useEffect, useCallback } from 'react'
import * as apiService from '@/lib/api-service'

type UseApiState<T> = {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

// ========================================
// Daily GM Hook
// ========================================

export function useGMStatus(fid: number): UseApiState<apiService.GMStatus> {
  const [data, setData] = useState<apiService.GMStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiService.getGMStatus(fid)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load GM status')
    } finally {
      setLoading(false)
    }
  }, [fid])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

// ========================================
// Quest Hooks
// ========================================

export function useQuests(fid?: number): UseApiState<apiService.QuestData[]> {
  const [data, setData] = useState<apiService.QuestData[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiService.fetchQuests(fid)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quests')
    } finally {
      setLoading(false)
    }
  }, [fid])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

// ========================================
// Guild Hooks
// ========================================

export function useGuilds(fid?: number): UseApiState<apiService.GuildData[]> {
  const [data, setData] = useState<apiService.GuildData[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiService.fetchGuilds(fid)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load guilds')
    } finally {
      setLoading(false)
    }
  }, [fid])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

// ========================================
// Profile Hooks
// ========================================

export function useProfile(fid: number): UseApiState<apiService.ProfileData> {
  const [data, setData] = useState<apiService.ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiService.fetchProfile(fid)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [fid])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

export function useActivities(fid: number, limit: number = 10): UseApiState<apiService.ActivityData[]> {
  const [data, setData] = useState<apiService.ActivityData[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiService.fetchActivities(fid, limit)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activities')
    } finally {
      setLoading(false)
    }
  }, [fid, limit])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

// ========================================
// Badge Hooks
// ========================================

export function useBadges(fid: number): UseApiState<apiService.BadgeData[]> {
  const [data, setData] = useState<apiService.BadgeData[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiService.fetchBadges(fid)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load badges')
    } finally {
      setLoading(false)
    }
  }, [fid])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

// ========================================
// Leaderboard Hooks
// ========================================

export function useLeaderboard(
  timeframe: apiService.LeaderboardTimeframe = 'all-time',
  limit: number = 50
): UseApiState<apiService.LeaderboardEntry[]> {
  const [data, setData] = useState<apiService.LeaderboardEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiService.fetchLeaderboard(timeframe, 0, limit)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }, [timeframe, limit])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
