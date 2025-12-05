import { useState, useEffect } from 'react'

export interface LeaderboardStats {
  totalPilots: number
  averageScore: number
  top1PercentThreshold: number
  top10PercentThreshold: number
  yourRank?: number
  yourPercentile?: number
}

interface UseLeaderboardStatsOptions {
  period: 'daily' | 'weekly' | 'all_time'
  userFid?: number
}

interface UseLeaderboardStatsResult {
  stats: LeaderboardStats | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useLeaderboardStats({ 
  period, 
  userFid 
}: UseLeaderboardStatsOptions): UseLeaderboardStatsResult {
  const [stats, setStats] = useState<LeaderboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [refetchKey, setRefetchKey] = useState(0)

  useEffect(() => {
    let isCancelled = false

    async function fetchStats() {
      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({ period })
        if (userFid) {
          params.append('fid', userFid.toString())
        }

        const response = await fetch(`/api/leaderboard-v2/stats?${params}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch stats: ${response.statusText}`)
        }

        const data = await response.json()
        
        if (!isCancelled) {
          setStats(data)
          setIsLoading(false)
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch stats'))
          setIsLoading(false)
        }
      }
    }

    fetchStats()

    return () => {
      isCancelled = true
    }
  }, [period, userFid, refetchKey])

  const refetch = () => {
    setRefetchKey((prev) => prev + 1)
  }

  return { stats, isLoading, error, refetch }
}
