/**
 * User History Hook
 * Phase 3.2G - Hybrid Architecture Migration (Jan 1, 2026)
 * 
 * React hook for fetching user progression history (level ups, rank ups, stats changes)
 */

import { useQuery } from '@apollo/client/react'
import type { Address } from 'viem'
import {
  GET_USER_LEVEL_UPS,
  GET_USER_RANK_UPS,
  GET_USER_STATS_HISTORY,
  GET_USER_COMPLETE_HISTORY,
  GET_RECENT_LEVEL_UPS,
  GET_RECENT_RANK_UPS,
  GET_STATS_BY_TRIGGER,
} from '@/lib/graphql/queries'

/**
 * Level Up Event Type
 */
export interface LevelUpEvent {
  id: string
  blockNumber: number
  timestamp: string
  transactionHash: string
  oldLevel: number
  newLevel: number
  xpGained: string
  user: {
    id: string
    address: string
  }
}

/**
 * Rank Up Event Type
 */
export interface RankUpEvent {
  id: string
  blockNumber: number
  timestamp: string
  transactionHash: string
  oldTier: number
  newTier: number
  pointsGained: string
  newMultiplier: number
  user: {
    id: string
    address: string
  }
}

/**
 * Stats Updated Event Type
 */
export interface StatsUpdatedEvent {
  id: string
  blockNumber: number
  timestamp: string
  transactionHash: string
  triggerType: string
  triggerContext?: string
  user: {
    id: string
    address: string
  }
}

/**
 * History Type Options
 */
export type HistoryType = 'level' | 'rank' | 'stats' | 'complete'

/**
 * Trigger Type for Stats Events
 */
export type TriggerType = 'GM' | 'QUEST' | 'GUILD' | 'REFERRAL' | 'VIRAL'

/**
 * Hook Options
 */
interface UseUserHistoryOptions {
  /**
   * Type of history to fetch
   * @default 'complete'
   */
  type?: HistoryType
  
  /**
   * Number of events to fetch
   * @default 50
   */
  limit?: number
  
  /**
   * Offset for pagination
   * @default 0
   */
  offset?: number
  
  /**
   * Filter by trigger type (for stats events only)
   */
  triggerType?: TriggerType
  
  /**
   * Skip query
   * @default false
   */
  skip?: boolean
}

/**
 * Hook Return Type
 */
interface UseUserHistoryReturn {
  levelUps: LevelUpEvent[]
  rankUps: RankUpEvent[]
  statsUpdates: StatsUpdatedEvent[]
  loading: boolean
  error: Error | null
  refetch: () => void
  fetchMore: () => Promise<void>
  hasMore: boolean
}

/**
 * useUserHistory Hook
 * 
 * @example
 * ```tsx
 * // All history
 * const { levelUps, rankUps, loading } = useUserHistory(address)
 * 
 * // Level ups only
 * const { levelUps } = useUserHistory(address, { type: 'level' })
 * 
 * // Stats by trigger
 * const { statsUpdates } = useUserHistory(address, { 
 *   type: 'stats',
 *   triggerType: 'QUEST'
 * })
 * ```
 */
export function useUserHistory(
  address?: Address,
  options: UseUserHistoryOptions = {}
): UseUserHistoryReturn {
  const {
    type = 'complete',
    limit = 50,
    offset = 0,
    triggerType,
    skip = false,
  } = options

  // Select query based on type
  const query = type === 'level'
    ? GET_USER_LEVEL_UPS
    : type === 'rank'
    ? GET_USER_RANK_UPS
    : type === 'stats'
    ? triggerType
      ? GET_STATS_BY_TRIGGER
      : GET_USER_STATS_HISTORY
    : GET_USER_COMPLETE_HISTORY

  // GraphQL query
  const {
    data,
    loading,
    error,
    refetch,
    fetchMore: apolloFetchMore,
  } = useQuery(query, {
    variables: {
      address: address?.toLowerCase(),
      limit,
      offset,
      triggerType,
    },
    skip: !address || skip,
    pollInterval: 60000, // 60s
    fetchPolicy: 'cache-first',
  })

  // Extract events based on query type
  const levelUps = data?.levelUpEvents || []
  const rankUps = data?.rankUpEvents || []
  const statsUpdates = data?.statsUpdatedEvents || []

  // Check if more events exist
  const hasMore = type === 'complete'
    ? levelUps.length === limit || rankUps.length === limit
    : (levelUps.length || rankUps.length || statsUpdates.length) === limit

  // Fetch more events
  const fetchMore = async () => {
    if (!hasMore || loading) return

    await apolloFetchMore({
      variables: {
        offset: offset + limit,
      },
    })
  }

  return {
    levelUps,
    rankUps,
    statsUpdates,
    loading,
    error: error ? new Error(`Failed to fetch user history: ${error.message}`) : null,
    refetch,
    fetchMore,
    hasMore,
  }
}

/**
 * useRecentActivity Hook
 * 
 * Get recent level ups and rank ups across all users (for activity feed)
 * 
 * @example
 * ```tsx
 * const { levelUps, rankUps } = useRecentActivity({ limit: 10 })
 * 
 * <ActivityFeed>
 *   {levelUps.map(event => (
 *     <div>User {event.user.address} leveled up to {event.newLevel}</div>
 *   ))}
 * </ActivityFeed>
 * ```
 */
export function useRecentActivity(options: { limit?: number } = {}) {
  const { limit = 20 } = options

  const {
    data: levelUpData,
    loading: levelUpLoading,
    error: levelUpError,
  } = useQuery(GET_RECENT_LEVEL_UPS, {
    variables: { limit },
    pollInterval: 60000,
  })

  const {
    data: rankUpData,
    loading: rankUpLoading,
    error: rankUpError,
  } = useQuery(GET_RECENT_RANK_UPS, {
    variables: { limit },
    pollInterval: 60000,
  })

  const levelUps = levelUpData?.levelUpEvents || []
  const rankUps = rankUpData?.rankUpEvents || []

  // Combine and sort by timestamp
  const allEvents = [...levelUps, ...rankUps].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })

  return {
    levelUps,
    rankUps,
    allEvents: allEvents.slice(0, limit),
    loading: levelUpLoading || rankUpLoading,
    error: levelUpError || rankUpError
      ? new Error('Failed to fetch recent activity')
      : null,
  }
}

/**
 * useUserProgressionChart Hook
 * 
 * Get level/rank progression data formatted for charts
 * 
 * @example
 * ```tsx
 * const { chartData } = useUserProgressionChart(address, 'level')
 * 
 * <LineChart data={chartData}>
 *   <Line dataKey="level" />
 * </LineChart>
 * ```
 */
export function useUserProgressionChart(
  address?: Address,
  type: 'level' | 'rank' = 'level'
) {
  const { levelUps, rankUps, loading, error } = useUserHistory(address, {
    type: type === 'level' ? 'level' : 'rank',
    limit: 100,
  })

  // Format for chart
  const chartData = (type === 'level' ? levelUps : rankUps).map(event => ({
    timestamp: event.timestamp,
    value: type === 'level' 
      ? (event as LevelUpEvent).newLevel 
      : (event as RankUpEvent).newTier,
    label: new Date(event.timestamp).toLocaleDateString(),
  }))

  return {
    chartData,
    loading,
    error,
  }
}
