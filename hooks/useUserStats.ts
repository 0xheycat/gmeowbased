/**
 * User Stats Hook
 * Phase 3.2G - Hybrid Architecture Migration (Jan 1, 2026)
 * 
 * React hook for fetching user stats with GraphQL + contract fallback
 * 
 * Data Flow:
 * 1. Primary: GraphQL query to Subsquid (50-100ms)
 * 2. Fallback: Contract read via RPC pool (300-500ms)
 * 3. Error Boundary: Graceful degradation
 */

import { useQuery } from '@apollo/client/react'
import { useReadContract } from 'wagmi'
import type { Address } from 'viem'
import { GET_USER_STATS, GET_USER_SCORING, GET_USER_POINT_BREAKDOWN, GET_USER_PROGRESSION } from '@/lib/graphql/queries'
import { STANDALONE_ADDRESSES } from '@/lib/contracts/gmeow-utils'
import { SCORING_ABI } from '@/lib/contracts/abis'

/**
 * User Stats Type (matches Subsquid schema)
 */
export interface UserStats {
  id: string
  address: string
  
  // Core Scoring
  level: number
  rankTier: number
  totalScore: string
  multiplier: number
  
  // Point Breakdown
  gmPoints: string
  viralPoints: string
  questPoints: string
  guildPoints: string
  referralPoints: string
  
  // Progression
  xpIntoLevel: string
  xpToNextLevel: string
  pointsIntoTier: string
  pointsToNextTier: string
  
  // History
  lastLevelUpAt?: string
  lastRankUpAt?: string
  totalLevelUps: number
  totalRankUps: number
  
  // Legacy Fields (for backward compatibility)
  pointsBalance?: string
  currentStreak?: number
  lifetimeGMs?: number
}

/**
 * Hook Options
 */
interface UseUserStatsOptions {
  /**
   * Which variant to fetch
   * - 'complete': All fields (default)
   * - 'scoring': Scoring fields only
   * - 'breakdown': Point breakdown only
   * - 'progression': Level/rank progress only
   */
  variant?: 'complete' | 'scoring' | 'breakdown' | 'progression'
  
  /**
   * Enable contract fallback on GraphQL error
   * @default true
   */
  enableFallback?: boolean
  
  /**
   * Poll interval in ms (0 = no polling)
   * @default 60000 (60s)
   */
  pollInterval?: number
  
  /**
   * Skip query if address is invalid
   * @default true
   */
  skip?: boolean
}

/**
 * Hook Return Type
 */
interface UseUserStatsReturn {
  stats: UserStats | null
  loading: boolean
  error: Error | null
  refetch: () => void
  source: 'subsquid' | 'contract' | null
}

/**
 * useUserStats Hook
 * 
 * @example
 * ```tsx
 * const { stats, loading, error, source } = useUserStats(address)
 * 
 * if (loading) return <Skeleton />
 * if (error) return <ErrorFallback error={error} />
 * 
 * return <div>Level: {stats.level}</div>
 * ```
 */
export function useUserStats(
  address?: Address,
  options: UseUserStatsOptions = {}
): UseUserStatsReturn {
  const {
    variant = 'complete',
    enableFallback = true,
    pollInterval = 60000, // 60s default
    skip = false,
  } = options

  // Select query based on variant
  const query = {
    complete: GET_USER_STATS,
    scoring: GET_USER_SCORING,
    breakdown: GET_USER_POINT_BREAKDOWN,
    progression: GET_USER_PROGRESSION,
  }[variant]

  // Primary: GraphQL query to Subsquid
  const {
    data: graphqlData,
    loading: graphqlLoading,
    error: graphqlError,
    refetch: graphqlRefetch,
  } = useQuery(query, {
    variables: { address: address?.toLowerCase() },
    skip: !address || skip,
    pollInterval,
    fetchPolicy: 'cache-first',
    nextFetchPolicy: 'cache-and-network',
  })

  // Fallback: Contract read (only if GraphQL fails and fallback enabled)
  const {
    data: contractData,
    isLoading: contractLoading,
    error: contractError,
    refetch: contractRefetch,
  } = useReadContract({
    address: STANDALONE_ADDRESSES.base.scoringModule,
    abi: SCORING_ABI,
    functionName: 'getUserStats',
    args: address ? [address] : undefined,
    query: {
      enabled: enableFallback && !!address && !!graphqlError && !skip,
      staleTime: 30 * 60 * 1000, // 30min cache
      gcTime: 60 * 60 * 1000, // 1hr garbage collection
    },
  })

  // Transform contract data to UserStats format
  const transformContractData = (data: any): UserStats | null => {
    if (!data || !address) return null
    
    return {
      id: address.toLowerCase(),
      address: address.toLowerCase(),
      level: data.level || 0,
      rankTier: data.rankTier || 0,
      totalScore: data.totalScore?.toString() || '0',
      multiplier: data.multiplier || 100,
      gmPoints: data.scoreBreakdown?.gmPoints?.toString() || '0',
      viralPoints: data.scoreBreakdown?.viralPoints?.toString() || '0',
      questPoints: data.scoreBreakdown?.questPoints?.toString() || '0',
      guildPoints: data.scoreBreakdown?.guildPoints?.toString() || '0',
      referralPoints: data.scoreBreakdown?.referralPoints?.toString() || '0',
      xpIntoLevel: '0', // Not available in contract
      xpToNextLevel: '0',
      pointsIntoTier: '0',
      pointsToNextTier: '0',
      totalLevelUps: 0,
      totalRankUps: 0,
    }
  }

  // Determine data source and stats
  let stats: UserStats | null = null
  let source: 'subsquid' | 'contract' | null = null

  if (graphqlData?.users?.[0]) {
    stats = graphqlData.users[0]
    source = 'subsquid'
  } else if (contractData) {
    stats = transformContractData(contractData)
    source = 'contract'
  }

  // Combined loading state
  const loading: boolean = !!graphqlLoading || (enableFallback && !!graphqlError && !!contractLoading)

  // Combined error (only if both fail)
  const error = graphqlError && (!enableFallback || contractError)
    ? new Error(`Failed to fetch user stats: ${graphqlError.message}`)
    : null

  // Combined refetch
  const refetch = () => {
    graphqlRefetch()
    if (enableFallback && graphqlError) {
      contractRefetch()
    }
  }

  return {
    stats,
    loading,
    error,
    refetch,
    source,
  }
}

/**
 * Batch variant: Fetch stats for multiple users
 * 
 * @example
 * ```tsx
 * const { statsMap, loading } = useUsersStats([addr1, addr2, addr3])
 * ```
 */
export function useUsersStats(addresses: Address[]) {
  const { data, loading, error, refetch } = useQuery(GET_USER_STATS, {
    variables: {
      addresses: addresses.map(a => a.toLowerCase()),
    },
    skip: !addresses.length,
    pollInterval: 60000,
  })

  // Transform to map for easy lookup
  const statsMap = new Map<string, UserStats>()
  if (data?.users) {
    data.users.forEach((user: UserStats) => {
      statsMap.set(user.address, user)
    })
  }

  return {
    statsMap,
    loading,
    error,
    refetch,
  }
}
