'use client'

import { useState, useEffect, useCallback } from 'react'
import type { LeaderboardEntry } from '@/components/leaderboard/LeaderboardTable'

type TimePeriod = 'daily' | 'weekly' | 'all_time'
type OrderBy = 'total_score' | 'points_balance' | 'viral_points' | 'guild_points_awarded' | 'referral_bonus' | 'streak_bonus' | 'badge_prestige' | 'tip_points' | 'nft_points'

interface LeaderboardResult {
  data: LeaderboardEntry[]
  pagination: {
    currentPage: number
    totalPages: number
    totalCount: number
    pageSize: number
  }
}

interface UseLeaderboardReturn {
  data: LeaderboardEntry[]
  loading: boolean
  error: string | null
  currentPage: number
  totalPages: number
  totalCount: number
  period: TimePeriod
  search: string
  setPage: (page: number) => void
  setPeriod: (period: TimePeriod) => void
  setSearch: (query: string) => void
  refresh: () => void
}

/**
 * useLeaderboard Hook
 * 
 * React hook for managing leaderboard data fetching, pagination, search, and time period filtering
 * 
 * @param initialPeriod - Initial time period (default: 'all_time')
 * @param pageSize - Number of entries per page (default: 15)
 * @param orderBy - Column to sort by (default: 'total_score')
 * 
 * @example
 * const { data, loading, currentPage, totalPages, period, setPeriod, setPage, setSearch } = useLeaderboard('all_time', 15, 'tip_points')
 */
export function useLeaderboard(
  initialPeriod: TimePeriod = 'all_time',
  pageSize: number = 15,
  orderBy: OrderBy = 'total_score'
): UseLeaderboardReturn {
  const [data, setData] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [period, setPeriod] = useState<TimePeriod>(initialPeriod)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  
  // Debounce search input (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setCurrentPage(1) // Reset to page 1 on search
    }, 500)
    
    return () => clearTimeout(timer)
  }, [search])
  
  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        period,
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        orderBy,
      })
      
      if (debouncedSearch) {
        params.append('search', debouncedSearch)
      }
      
      const response = await fetch(`/api/leaderboard-v2?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard')
      }
      
      const result: LeaderboardResult = await response.json()
      
      setData(result.data)
      setTotalPages(result.pagination.totalPages)
      setTotalCount(result.pagination.totalCount)
    } catch (err) {
      console.error('[useLeaderboard] Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [period, currentPage, pageSize, debouncedSearch, orderBy])
  
  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])
  
  // Reset to page 1 when period changes
  const handleSetPeriod = useCallback((newPeriod: TimePeriod) => {
    setPeriod(newPeriod)
    setCurrentPage(1)
  }, [])
  
  return {
    data,
    loading,
    error,
    currentPage,
    totalPages,
    totalCount,
    period,
    search,
    setPage: setCurrentPage,
    setPeriod: handleSetPeriod,
    setSearch,
    refresh: fetchLeaderboard,
  }
}
