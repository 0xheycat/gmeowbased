/**
 * Leaderboard Hook
 * Phase 3.2G - Hybrid Architecture Migration (Jan 1, 2026)
 * 
 * React hook for fetching leaderboard data with pagination
 */

import { useQuery } from '@apollo/client/react'
import {
  GET_GLOBAL_LEADERBOARD,
  GET_LEADERBOARD_BY_TIER,
  GET_WEEKLY_LEADERBOARD,
  GET_MONTHLY_LEADERBOARD,
  GET_USER_LEADERBOARD_POSITION,
} from '@/lib/graphql/queries'

/**
 * Leaderboard Entry Type
 */
export interface LeaderboardEntry {
  id: string
  rank: number
  totalPoints: string
  weeklyPoints: string
  monthlyPoints: string
  previousRank?: number
  rankChange?: number
  
  // User relation
  user: {
    id: string
    address: string
    level: number
    rankTier: number
    multiplier: number
  }
}

/**
 * Timeframe Options
 */
export type Timeframe = 'all' | 'weekly' | 'monthly'

/**
 * Hook Options
 */
interface UseLeaderboardOptions {
  /**
   * Filter by rank tier (0-9)
   */
  tier?: number
  
  /**
   * Timeframe for leaderboard
   * @default 'all'
   */
  timeframe?: Timeframe
  
  /**
   * Number of entries per page
   * @default 50
   */
  limit?: number
  
  /**
   * Offset for pagination
   * @default 0
   */
  offset?: number
  
  /**
   * Poll interval in ms (0 = no polling)
   * @default 300000 (5min)
   */
  pollInterval?: number
  
  /**
   * Skip query
   * @default false
   */
  skip?: boolean
}

/**
 * Hook Return Type
 */
interface UseLeaderboardReturn {
  entries: LeaderboardEntry[]
  loading: boolean
  error: Error | null
  refetch: () => void
  fetchMore: () => Promise<void>
  hasMore: boolean
}

/**
 * useLeaderboard Hook
 * 
 * @example
 * ```tsx
 * // Global leaderboard
 * const { entries, loading, fetchMore } = useLeaderboard()
 * 
 * // Tier-filtered
 * const { entries } = useLeaderboard({ tier: 5 })
 * 
 * // Weekly leaderboard
 * const { entries } = useLeaderboard({ timeframe: 'weekly' })
 * ```
 */
export function useLeaderboard(
  options: UseLeaderboardOptions = {}
): UseLeaderboardReturn {
  const {
    tier,
    timeframe = 'all',
    limit = 50,
    offset = 0,
    pollInterval = 300000, // 5min default
    skip = false,
  } = options

  // Select query based on options
  const query = tier !== undefined
    ? GET_LEADERBOARD_BY_TIER
    : timeframe === 'weekly'
    ? GET_WEEKLY_LEADERBOARD
    : timeframe === 'monthly'
    ? GET_MONTHLY_LEADERBOARD
    : GET_GLOBAL_LEADERBOARD

  // GraphQL query
  const {
    data,
    loading,
    error,
    refetch,
    fetchMore: apolloFetchMore,
  } = useQuery(query, {
    variables: {
      tierIndex: tier,
      limit,
      offset,
    },
    skip,
    pollInterval,
    fetchPolicy: 'cache-first',
    nextFetchPolicy: 'cache-and-network',
  })

  const entries = data?.leaderboardEntries || []

  // Check if more entries exist
  const hasMore = entries.length === limit

  // Fetch more entries (pagination)
  const fetchMore = async () => {
    if (!hasMore || loading) return

    await apolloFetchMore({
      variables: {
        offset: entries.length,
      },
    })
  }

  return {
    entries,
    loading,
    error: error ? new Error(`Failed to fetch leaderboard: ${error.message}`) : null,
    refetch,
    fetchMore,
    hasMore,
  }
}

/**
 * useUserLeaderboardPosition Hook
 * 
 * Get a specific user's position on the leaderboard
 * 
 * @example
 * ```tsx
 * const { entry, loading } = useUserLeaderboardPosition(address)
 * 
 * if (entry) {
 *   console.log(`Rank: ${entry.rank}`)
 * }
 * ```
 */
export function useUserLeaderboardPosition(address?: string) {
  const { data, loading, error, refetch } = useQuery(GET_USER_LEADERBOARD_POSITION, {
    variables: { address: address?.toLowerCase() },
    skip: !address,
    pollInterval: 300000, // 5min
  })

  const entry = data?.leaderboardEntries?.[0] || null

  return {
    entry,
    loading,
    error: error ? new Error(`Failed to fetch user position: ${error.message}`) : null,
    refetch,
  }
}

/**
 * useLeaderboardInfinite Hook
 * 
 * Infinite scroll variant
 * 
 * @example
 * ```tsx
 * const { entries, loadMore, hasMore, loading } = useLeaderboardInfinite()
 * 
 * <InfiniteScroll
 *   loadMore={loadMore}
 *   hasMore={hasMore}
 * >
 *   {entries.map(entry => <LeaderboardRow key={entry.id} entry={entry} />)}
 * </InfiniteScroll>
 * ```
 */
export function useLeaderboardInfinite(
  options: Omit<UseLeaderboardOptions, 'offset'> = {}
) {
  const {
    tier,
    timeframe = 'all',
    limit = 50,
    pollInterval = 300000,
    skip = false,
  } = options

  const query = tier !== undefined
    ? GET_LEADERBOARD_BY_TIER
    : timeframe === 'weekly'
    ? GET_WEEKLY_LEADERBOARD
    : timeframe === 'monthly'
    ? GET_MONTHLY_LEADERBOARD
    : GET_GLOBAL_LEADERBOARD

  const {
    data,
    loading,
    error,
    fetchMore: apolloFetchMore,
  } = useQuery(query, {
    variables: {
      tierIndex: tier,
      limit,
      offset: 0,
    },
    skip,
    pollInterval,
    fetchPolicy: 'cache-first',
  })

  const entries = data?.leaderboardEntries || []
  const hasMore = entries.length % limit === 0 && entries.length > 0

  const loadMore = async () => {
    if (!hasMore || loading) return

    await apolloFetchMore({
      variables: {
        offset: entries.length,
      },
    })
  }

  return {
    entries,
    loading,
    error: error ? new Error(`Failed to fetch leaderboard: ${error.message}`) : null,
    loadMore,
    hasMore,
  }
}
