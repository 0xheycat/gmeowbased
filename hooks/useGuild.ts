/**
 * useGuild Hook
 * Purpose: Fetch guild data from Subsquid GraphQL
 * Architecture: GraphQL-first with error handling
 * 
 * Usage:
 * const { guilds, loading, error, refetch } = useGuilds({ limit: 20 })
 * const { guild, loading, error } = useGuildById(guildId)
 * const { members, loading, error } = useGuildMembers(guildId)
 */

import { useQuery, type QueryResult } from '@apollo/client'
import {
  GET_ALL_GUILDS,
  GET_GUILD_BY_ID,
  GET_GUILD_MEMBERS,
  GET_GUILD_LEADERBOARD,
  GET_USER_GUILD,
  GET_GUILD_EVENTS,
  SEARCH_GUILDS,
} from '@/lib/graphql/queries/guild'

// ==========================================
// Types
// ==========================================

export interface Guild {
  id: string
  name: string
  owner: string
  createdAt: string
  totalMembers: number
  level: number
  isActive: boolean
  treasuryPoints: string // BigInt as string
}

export interface GuildMember {
  id: string
  role: string
  joinedAt: string
  pointsContributed: string
  isActive: boolean
  user: {
    id: string
    level: number
    rankTier: number
    totalScore: string
    multiplier: number
    gmPoints: string
    viralPoints: string
    questPoints: string
    guildPoints: string
    referralPoints: string
  }
}

export interface GuildEvent {
  id: string
  eventType: string
  user: string
  amount: string | null
  timestamp: string
  blockNumber: number
  txHash: string
}

// ==========================================
// Hooks
// ==========================================

/**
 * Get all guilds with pagination and sorting
 * 
 * @param options.limit - Number of guilds to fetch (default: 20)
 * @param options.offset - Offset for pagination (default: 0)
 * @param options.orderBy - Sort order (default: totalMembers DESC)
 * 
 * @returns QueryResult with guilds array
 * 
 * @example
 * const { guilds, loading, error } = useGuilds({ limit: 50 })
 */
export function useGuilds(options?: {
  limit?: number
  offset?: number
  orderBy?: 'members' | 'treasury' | 'level' | 'recent'
}) {
  const { limit = 20, offset = 0, orderBy = 'members' } = options || {}

  // Map orderBy to GraphQL order (Subsquid syntax: field_DESC/field_ASC)
  const getOrderBy = () => {
    switch (orderBy) {
      case 'treasury':
        return 'treasuryPoints_DESC'
      case 'level':
        return 'level_DESC'
      case 'recent':
        return 'createdAt_DESC'
      case 'members':
      default:
        return 'totalMembers_DESC'
    }
  }

  const result = useQuery<{ guilds: Guild[] }>(GET_ALL_GUILDS, {
    variables: {
      limit,
      offset,
      orderBy: getOrderBy(),
    },
    fetchPolicy: 'cache-first',
    nextFetchPolicy: 'cache-first',
  })

  return {
    guilds: result.data?.guilds || [],
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  }
}

/**
 * Get single guild by ID
 * 
 * @param guildId - Guild ID (as string)
 * 
 * @returns QueryResult with guild object
 * 
 * @example
 * const { guild, loading, error } = useGuildById('1')
 */
export function useGuildById(guildId: string | undefined) {
  const result = useQuery<{ guild: Guild | null }>(GET_GUILD_BY_ID, {
    variables: { guildId },
    skip: !guildId,
    fetchPolicy: 'cache-first',
    nextFetchPolicy: 'cache-first',
  })

  return {
    guild: result.data?.guild || null,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  }
}

/**
 * Get guild members with user stats
 * 
 * @param guildId - Guild ID
 * @param options.limit - Number of members to fetch (default: 50)
 * @param options.offset - Offset for pagination (default: 0)
 * 
 * @returns QueryResult with members array
 * 
 * @example
 * const { members, loading, error } = useGuildMembers('1', { limit: 100 })
 */
export function useGuildMembers(
  guildId: string | undefined,
  options?: {
    limit?: number
    offset?: number
  }
) {
  const { limit = 50, offset = 0 } = options || {}

  const result = useQuery<{ guildMembers: GuildMember[] }>(GET_GUILD_MEMBERS, {
    variables: {
      guildId,
      limit,
      offset,
    },
    skip: !guildId,
    fetchPolicy: 'cache-first',
    nextFetchPolicy: 'cache-first',
  })

  return {
    members: result.data?.guildMembers || [],
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  }
}

/**
 * Get guild leaderboard (top guilds by treasury)
 * 
 * @param options.limit - Number of guilds to fetch (default: 50)
 * @param options.offset - Offset for pagination (default: 0)
 * 
 * @returns QueryResult with guilds array sorted by treasuryPoints
 * 
 * @example
 * const { guilds, loading, error } = useGuildLeaderboard({ limit: 100 })
 */
export function useGuildLeaderboard(options?: {
  limit?: number
  offset?: number
}) {
  const { limit = 50, offset = 0 } = options || {}

  const result = useQuery<{ guilds: Guild[] }>(GET_GUILD_LEADERBOARD, {
    variables: {
      limit,
      offset,
    },
    fetchPolicy: 'cache-first',
    nextFetchPolicy: 'cache-first',
  })

  return {
    guilds: result.data?.guilds || [],
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  }
}

/**
 * Get user's guild membership
 * 
 * @param userAddress - User wallet address
 * 
 * @returns QueryResult with guild membership or null
 * 
 * @example
 * const { guildMember, loading, error } = useUserGuild('0x123...')
 */
export function useUserGuild(userAddress: string | undefined) {
  const result = useQuery<{ guildMembers: Array<GuildMember & { guild: Guild }> }>(
    GET_USER_GUILD,
    {
      variables: { userAddress: userAddress?.toLowerCase() },
      skip: !userAddress,
      fetchPolicy: 'cache-first',
      nextFetchPolicy: 'cache-first',
    }
  )

  return {
    guildMember: result.data?.guildMembers?.[0] || null,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  }
}

/**
 * Get guild activity events
 * 
 * @param guildId - Guild ID
 * @param options.limit - Number of events to fetch (default: 20)
 * @param options.offset - Offset for pagination (default: 0)
 * 
 * @returns QueryResult with events array
 * 
 * @example
 * const { events, loading, error } = useGuildEvents('1')
 */
export function useGuildEvents(
  guildId: string | undefined,
  options?: {
    limit?: number
    offset?: number
  }
) {
  const { limit = 20, offset = 0 } = options || {}

  const result = useQuery<{ guildEvents: GuildEvent[] }>(GET_GUILD_EVENTS, {
    variables: {
      guildId,
      limit,
      offset,
    },
    skip: !guildId,
    fetchPolicy: 'cache-first',
    nextFetchPolicy: 'cache-first',
  })

  return {
    events: result.data?.guildEvents || [],
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  }
}

/**
 * Search guilds by name
 * 
 * @param searchQuery - Name pattern to search for
 * @param options.limit - Number of guilds to fetch (default: 20)
 * 
 * @returns QueryResult with matching guilds
 * 
 * @example
 * const { guilds, loading, error } = useSearchGuilds('alpha')
 */
export function useSearchGuilds(
  searchQuery: string,
  options?: {
    limit?: number
  }
) {
  const { limit = 20 } = options || {}

  const result = useQuery<{ guilds: Guild[] }>(SEARCH_GUILDS, {
    variables: {
      namePattern: searchQuery,
      limit,
    },
    skip: !searchQuery || searchQuery.length < 2,
    fetchPolicy: 'cache-first',
    nextFetchPolicy: 'cache-first',
  })

  return {
    guilds: result.data?.guilds || [],
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  }
}
