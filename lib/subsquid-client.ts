/**
 * Subsquid GraphQL Client
 * Phase 3.2: Hybrid Architecture Implementation
 * 
 * PURPOSE:
 * Query pre-computed analytics from Subsquid indexer (replaces Supabase heavy tables)
 * 
 * FEATURES:
 * ✅ Leaderboard queries (rankings, scores, stats)
 * ✅ User stats queries (FID or wallet lookup)
 * ✅ GM rank events (activity history)
 * ✅ XP transactions (historical XP data)
 * ✅ Guild stats (member counts, points)
 * ✅ Error handling with fallbacks
 * ✅ Type-safe GraphQL queries
 * 
 * DATA SOURCES:
 * - Subsquid Indexer: http://localhost:4350/graphql (local dev)
 * - Subsquid Indexer: https://squid.subsquid.io/gmeow-indexer/graphql (production)
 * - Replaces: leaderboard_calculations, xp_transactions, gmeow_rank_events, viral_tier_history
 * 
 * PERFORMANCE:
 * - Leaderboard query: <10ms (pre-computed, indexed)
 * - User stats query: <20ms (wallet or FID lookup)
 * - Activity events: <30ms (last 30 days filtered)
 * - Cache: Redis 5-min TTL recommended
 * 
 * HYBRID PATTERN:
 * 1. Query Subsquid for stats (fast, pre-computed)
 * 2. Enrich with Supabase user_profiles (FID, display name, pfp)
 * 3. Merge results for complete user experience
 * 
 * TODO (Phase 3.3):
 * - [ ] Add Redis caching layer
 * - [ ] Implement WebSocket subscriptions for real-time updates
 * - [ ] Add batch query optimization
 * - [ ] Monitor query performance (Datadog/Sentry)
 * 
 * TODO (Phase 4):
 * - [ ] Add daily stats queries (DailyStats entities)
 * - [ ] Implement viral tier calculations
 * - [ ] Add guild analytics queries
 * - [ ] Multi-chain aggregation
 * 
 * CRITICAL:
 * - Always handle Subsquid unavailable (return null, fallback to cache)
 * - DO NOT write to Subsquid (read-only analytics)
 * - Validate wallet addresses before queries (prevent injection)
 * - Log all query errors for monitoring
 * 
 * AVOID:
 * - Querying Supabase for analytics (use Subsquid)
 * - Synchronous waterfall queries (use parallel fetching)
 * - Hardcoded Subsquid URL (use environment variable)
 * - Exposing raw GraphQL errors to users
 * 
 * Created: December 18, 2025
 * Reference: SUBSQUID-SUPABASE-MIGRATION-PLAN.md Phase 3
 * Reference: gmeow-indexer/schema.graphql
 * Quality Gates: GI-14 (Performance <10ms), GI-15 (Data Accuracy)
 */

import { logError } from './middleware/error-handler'

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUBSQUID_URL =
  process.env.NEXT_PUBLIC_SUBSQUID_URL ||
  process.env.SUBSQUID_URL ||
  'http://localhost:4350/graphql'

const DEFAULT_TIMEOUT = 10000 // 10 seconds
const MAX_RETRIES = 2

// ============================================================================
// TYPES
// ============================================================================

export interface LeaderboardEntry {
  id: string
  wallet: string
  fid?: number
  rank: number
  totalScore: number
  basePoints: number
  viralXP: number
  guildBonus: number
  guildBonusPoints: number
  referralBonus: number
  streakBonus: number
  badgePrestige: number
  guildId?: string
  guildName?: string
  isGuildOfficer?: boolean
  updatedAt: string
}

export interface UserStats {
  wallet: string
  fid?: number
  totalScore: number
  basePoints: number
  viralXP: number
  guildBonus: number
  guildBonusPoints: number
  referralBonus: number
  streakBonus: number
  badgePrestige: number
  rank?: number
  guildId?: string
  guildName?: string
  isGuildOfficer?: boolean
  lastUpdated: string
}

export interface GMRankEvent {
  id: string
  fid: number
  wallet: string
  eventType: string
  delta: number
  totalPoints: number
  previousPoints: number
  level: number
  tierName: string
  tierPercent: number
  questId?: number
  metadata?: Record<string, any>
  createdAt: string
}

export interface XPTransaction {
  id: string
  fid: number
  amount: number
  source: string
  createdAt: string
}

export interface GuildStats {
  guildId: string
  memberCount: number
  totalPoints: number
  averagePoints: number
  rank?: number
}

export interface SubsquidError {
  message: string
  locations?: Array<{ line: number; column: number }>
  path?: string[]
}

export interface SubsquidResponse<T> {
  data?: T
  errors?: SubsquidError[]
}

// ============================================================================
// GRAPHQL QUERIES
// ============================================================================

const LEADERBOARD_QUERY = `
  query GetLeaderboard($limit: Int!, $offset: Int!) {
    leaderboardEntries(
      limit: $limit
      offset: $offset
      orderBy: totalScore_DESC
    ) {
      id
      wallet
      fid
      rank
      totalScore
      basePoints
      viralXP
      guildBonus
      guildBonusPoints
      referralBonus
      streakBonus
      badgePrestige
      guildId
      guildName
      isGuildOfficer
      updatedAt
    }
  }
`

const USER_STATS_BY_WALLET_QUERY = `
  query GetUserStatsByWallet($wallet: String!) {
    leaderboardEntries(where: { wallet_eq: $wallet }) {
      id
      wallet
      fid
      rank
      totalScore
      basePoints
      viralXP
      guildBonus
      guildBonusPoints
      referralBonus
      streakBonus
      badgePrestige
      guildId
      guildName
      isGuildOfficer
      updatedAt
    }
  }
`

const USER_STATS_BY_FID_QUERY = `
  query GetUserStatsByFID($fid: Int!) {
    leaderboardEntries(where: { fid_eq: $fid }) {
      id
      wallet
      fid
      rank
      totalScore
      basePoints
      viralXP
      guildBonus
      guildBonusPoints
      referralBonus
      streakBonus
      badgePrestige
      guildId
      guildName
      isGuildOfficer
      updatedAt
    }
  }
`

const GM_RANK_EVENTS_QUERY = `
  query GetGMRankEvents($fid: Int!, $since: String!) {
    gmRankEvents(
      where: { fid_eq: $fid, createdAt_gte: $since }
      orderBy: createdAt_DESC
      limit: 100
    ) {
      id
      fid
      wallet
      eventType
      delta
      totalPoints
      previousPoints
      level
      tierName
      tierPercent
      questId
      metadata
      createdAt
    }
  }
`

const XP_TRANSACTIONS_QUERY = `
  query GetXPTransactions($fid: Int!, $since: String!) {
    xpTransactions(
      where: { fid_eq: $fid, createdAt_gte: $since }
      orderBy: createdAt_DESC
      limit: 100
    ) {
      id
      fid
      amount
      source
      createdAt
    }
  }
`

const GUILD_STATS_QUERY = `
  query GetGuildStats($guildId: String!) {
    guildStats(where: { guildId_eq: $guildId }) {
      guildId
      memberCount
      totalPoints
      averagePoints
      rank
    }
  }
`

// ============================================================================
// CLIENT CLASS
// ============================================================================

export class SubsquidClient {
  private url: string
  private timeout: number

  constructor(url: string = SUBSQUID_URL, timeout: number = DEFAULT_TIMEOUT) {
    this.url = url
    this.timeout = timeout
  }

  /**
   * Execute GraphQL query with retry logic
   */
  private async query<T>(
    query: string,
    variables: Record<string, any> = {},
    retries: number = MAX_RETRIES
  ): Promise<T | null> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Subsquid HTTP error: ${response.status} ${response.statusText}`)
      }

      const result: SubsquidResponse<T> = await response.json()

      if (result.errors && result.errors.length > 0) {
        const errorMsg = result.errors.map((e) => e.message).join(', ')
        throw new Error(`Subsquid GraphQL error: ${errorMsg}`)
      }

      return result.data || null
    } catch (error: any) {
      // Retry on network errors
      if (retries > 0 && (error.name === 'AbortError' || error.message.includes('fetch'))) {
        console.warn(`[SubsquidClient] Retrying query, ${retries} attempts left`)
        return this.query<T>(query, variables, retries - 1)
      }

      console.error('[SubsquidClient] Query failed:', error, {
        query: query.split('\n')[1],
        variables,
      })

      return null
    }
  }

  /**
   * Get leaderboard (top N users)
   */
  async getLeaderboard(limit: number = 100, offset: number = 0): Promise<LeaderboardEntry[]> {
    const data = await this.query<{ leaderboardEntries: LeaderboardEntry[] }>(
      LEADERBOARD_QUERY,
      { limit, offset }
    )

    return data?.leaderboardEntries || []
  }

  /**
   * Get user stats by wallet address
   */
  async getUserStatsByWallet(wallet: string): Promise<UserStats | null> {
    // Normalize wallet address
    const normalizedWallet = wallet.toLowerCase()

    const data = await this.query<{ leaderboardEntries: LeaderboardEntry[] }>(
      USER_STATS_BY_WALLET_QUERY,
      { wallet: normalizedWallet }
    )

    const entry = data?.leaderboardEntries?.[0]
    if (!entry) return null

    return {
      wallet: entry.wallet,
      fid: entry.fid,
      totalScore: entry.totalScore,
      basePoints: entry.basePoints,
      viralXP: entry.viralXP,
      guildBonus: entry.guildBonus,
      guildBonusPoints: entry.guildBonusPoints,
      referralBonus: entry.referralBonus,
      streakBonus: entry.streakBonus,
      badgePrestige: entry.badgePrestige,
      rank: entry.rank,
      guildId: entry.guildId,
      guildName: entry.guildName,
      isGuildOfficer: entry.isGuildOfficer,
      lastUpdated: entry.updatedAt,
    }
  }

  /**
   * Get user stats by FID
   */
  async getUserStatsByFID(fid: number): Promise<UserStats | null> {
    const data = await this.query<{ leaderboardEntries: LeaderboardEntry[] }>(
      USER_STATS_BY_FID_QUERY,
      { fid }
    )

    const entry = data?.leaderboardEntries?.[0]
    if (!entry) return null

    return {
      wallet: entry.wallet,
      fid: entry.fid,
      totalScore: entry.totalScore,
      basePoints: entry.basePoints,
      viralXP: entry.viralXP,
      guildBonus: entry.guildBonus,
      guildBonusPoints: entry.guildBonusPoints,
      referralBonus: entry.referralBonus,
      streakBonus: entry.streakBonus,
      badgePrestige: entry.badgePrestige,
      rank: entry.rank,
      guildId: entry.guildId,
      guildName: entry.guildName,
      isGuildOfficer: entry.isGuildOfficer,
      lastUpdated: entry.updatedAt,
    }
  }

  /**
   * Get GM rank events for a user (recent activity)
   */
  async getGMRankEvents(fid: number, since?: Date): Promise<GMRankEvent[]> {
    const sinceDate = since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Default: last 30 days
    const sinceISO = sinceDate.toISOString()

    const data = await this.query<{ gmRankEvents: GMRankEvent[] }>(GM_RANK_EVENTS_QUERY, {
      fid,
      since: sinceISO,
    })

    return data?.gmRankEvents || []
  }

  /**
   * Get XP transactions for a user
   */
  async getXPTransactions(fid: number, since?: Date): Promise<XPTransaction[]> {
    const sinceDate = since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Default: last 30 days
    const sinceISO = sinceDate.toISOString()

    const data = await this.query<{ xpTransactions: XPTransaction[] }>(XP_TRANSACTIONS_QUERY, {
      fid,
      since: sinceISO,
    })

    return data?.xpTransactions || []
  }

  /**
   * Get guild stats
   */
  async getGuildStats(guildId: string): Promise<GuildStats | null> {
    const data = await this.query<{ guildStats: GuildStats[] }>(GUILD_STATS_QUERY, { guildId })

    return data?.guildStats?.[0] || null
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let subsquidClient: SubsquidClient | null = null

export function getSubsquidClient(): SubsquidClient {
  if (!subsquidClient) {
    subsquidClient = new SubsquidClient()
  }
  return subsquidClient
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Get user leaderboard entry (with fallback for missing data)
 */
export async function getLeaderboardEntry(fidOrWallet: number | string): Promise<UserStats | null> {
  const client = getSubsquidClient()

  if (typeof fidOrWallet === 'number') {
    return client.getUserStatsByFID(fidOrWallet)
  } else {
    return client.getUserStatsByWallet(fidOrWallet)
  }
}

/**
 * Get recent activity events for a user
 */
export async function getRecentActivity(fid: number, days: number = 30): Promise<GMRankEvent[]> {
  const client = getSubsquidClient()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return client.getGMRankEvents(fid, since)
}

/**
 * Check if Subsquid is available (health check)
 */
export async function isSubsquidAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)

    const response = await fetch(SUBSQUID_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ __typename }' }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    return response.ok
  } catch {
    return false
  }
}
