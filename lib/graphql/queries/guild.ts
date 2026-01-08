/**
 * Guild GraphQL Queries
 * Purpose: Query guild data from Subsquid indexer
 * Usage: Import queries for Apollo Client useQuery hooks
 * 
 * Architecture:
 * - Guild stats from Subsquid (treasury, level, member count, on-chain)
 * - Guild metadata from Supabase (description, banner, off-chain)
 */

import { gql } from '@apollo/client'
import { GUILD_FIELDS } from '../fragments'

/**
 * Get all guilds with on-chain stats
 * Returns: Guild[], sorted by totalMembers DESC
 * 
 * Use Case: Guild discovery page, guild list
 * Data Source: Subsquid (on-chain)
 * 
 * Note: Subsquid uses underscore syntax for ordering and filtering:
 * - orderBy: totalMembers_DESC (not { totalMembers: DESC })
 * - where: { isActive_eq: true } (not { isActive: { eq: true } })
 */
export const GET_ALL_GUILDS = gql`
  ${GUILD_FIELDS}
  query GetAllGuilds(
    $limit: Int = 20
    $offset: Int = 0
    $orderBy: [GuildOrderByInput!] = [totalMembers_DESC]
  ) {
    guilds(
      limit: $limit
      offset: $offset
      orderBy: $orderBy
      where: { isActive_eq: true }
    ) {
      ...GuildFields
    }
  }
`

/**
 * Get single guild by ID with full details
 * Returns: Guild or null
 * 
 * Use Case: Guild detail page, guild profile
 * Data Source: Subsquid (on-chain)
 */
export const GET_GUILD_BY_ID = gql`
  ${GUILD_FIELDS}
  query GetGuildById($guildId: String!) {
    guild: guildById(id: $guildId) {
      ...GuildFields
    }
  }
`

/**
 * Get guild members with user stats
 * Returns: GuildMember[], sorted by pointsContributed DESC
 * 
 * Use Case: Guild member list, top contributors
 * Data Source: Subsquid (on-chain)
 */
export const GET_GUILD_MEMBERS = gql`
  query GetGuildMembers(
    $guildId: String!
    $limit: Int = 50
    $offset: Int = 0
  ) {
    guildMembers(
      limit: $limit
      offset: $offset
      where: { 
        guild: { id_eq: $guildId }
        isActive_eq: true
      }
      orderBy: pointsContributed_DESC
    ) {
      id
      role
      joinedAt
      pointsContributed
      isActive
      user {
        id
        level
        rankTier
        totalScore
        multiplier
        gmPoints
        viralPoints
        questPoints
        guildPoints
        referralPoints
      }
    }
  }
`

/**
 * Get guild leaderboard (guilds ranked by treasury)
 * Returns: Guild[], sorted by treasuryPoints DESC
 * 
 * Use Case: Guild leaderboard page
 * Data Source: Subsquid (on-chain)
 */
export const GET_GUILD_LEADERBOARD = gql`
  ${GUILD_FIELDS}
  query GetGuildLeaderboard(
    $limit: Int = 50
    $offset: Int = 0
  ) {
    guilds(
      limit: $limit
      offset: $offset
      orderBy: treasuryPoints_DESC
      where: { isActive_eq: true }
    ) {
      ...GuildFields
    }
  }
`

/**
 * Get user's guild membership
 * Returns: GuildMember or null
 * 
 * Use Case: Check if user is in a guild, get guild info
 * Data Source: Subsquid (on-chain)
 */
export const GET_USER_GUILD = gql`
  ${GUILD_FIELDS}
  query GetUserGuild($userAddress: String!) {
    guildMembers(
      where: { 
        user: { id_eq: $userAddress }
        isActive_eq: true
      }
      limit: 1
    ) {
      id
      role
      joinedAt
      pointsContributed
      guild {
        ...GuildFields
      }
    }
  }
`

/**
 * Get guild events (deposits, level ups)
 * Returns: GuildEvent[], sorted by timestamp DESC
 * 
 * Use Case: Guild activity feed, recent deposits
 * Data Source: Subsquid (on-chain)
 */
export const GET_GUILD_EVENTS = gql`
  query GetGuildEvents(
    $guildId: String!
    $limit: Int = 20
    $offset: Int = 0
  ) {
    guildEvents(
      limit: $limit
      offset: $offset
      where: { guild: { id_eq: $guildId } }
      orderBy: timestamp_DESC
    ) {
      id
      eventType
      user
      amount
      timestamp
      blockNumber
      txHash
    }
  }
`

/**
 * Search guilds by name
 * Returns: Guild[], filtered by name pattern
 * 
 * Use Case: Guild search, autocomplete
 * Data Source: Subsquid (on-chain)
 */
export const SEARCH_GUILDS = gql`
  ${GUILD_FIELDS}
  query SearchGuilds(
    $namePattern: String!
    $limit: Int = 20
  ) {
    guilds(
      limit: $limit
      where: { 
        name_containsInsensitive: $namePattern
        isActive_eq: true
      }
      orderBy: totalMembers_DESC
    ) {
      ...GuildFields
    }
  }
`
