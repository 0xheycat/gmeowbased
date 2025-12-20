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
 * ✅ Points transactions (historical on-chain points data)
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
 * Get tip events for a user (for tip analytics)
 * Phase 6: Replace fetchTipPoints() deprecated function
 * 
 * Note: This is a temporary implementation that queries by wallet.
 * In production, this should be optimized with a dedicated wallet-based query.
 * 
 * @param walletAddress - User's wallet address (0x...)
 * @param since - Optional date to filter events from
 * @returns Array of tip events with amounts
 */
export async function getTipEvents(
  walletAddress: string,
  since?: Date,
  limit: number = 50
): Promise<TipEvent[]> {
  try {
    const sinceISO = since ? since.toISOString() : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    
    const query = `
      query GetTipEvents($address: String!, $since: String!, $limit: Int!) {
        tipEvents(
          where: {
            OR: [
              { from: { id_eq: $address } }
              { to: { id_eq: $address } }
            ]
            timestamp_gte: $since
          }
          orderBy: timestamp_DESC
          limit: $limit
        ) {
          id
          from { id }
          to { id }
          amount
          timestamp
          txHash
        }
      }
    `
    
    const response = await fetch(SUBSQUID_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: {
          address: walletAddress.toLowerCase(),
          since: sinceISO,
          limit
        }
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const json = await response.json()
    
    if (json.errors) {
      throw new Error(json.errors[0]?.message || 'GraphQL error')
    }
    
    return (json.data?.tipEvents || []).map((event: any) => ({
      id: event.id,
      from: event.from.id,
      to: event.to.id,
      amount: Number(event.amount),
      timestamp: event.timestamp,
      txHash: event.txHash
    }))
  } catch (error) {
    console.error('[getTipEvents] Subsquid query failed:', error)
    return []
  }
}

export interface TipEvent {
  id: string
  amount: number
  timestamp: string
  txHash: string
}

/**
 * Get rank events for community activity feeds
 * Phase 6 Priority 2: Replace getCommunityEvents() and getLegacyGMEvents()
 * 
 * @param options - Query options (FID, limit, event types, since date)
 * @returns Array of rank events (GM, tips, quests, etc.)
 */
export async function getRankEvents(options: {
  fid?: number
  limit?: number
  types?: string[]
  since?: Date
}): Promise<GMRankEvent[]> {
  try {
    const client = getSubsquidClient()
    
    // If FID provided, use the existing getGMRankEvents method
    if (options.fid) {
      const sinceDate = options.since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const allEvents = await client.getGMRankEvents(options.fid, sinceDate)
      
      // Filter by event types if specified
      if (options.types && options.types.length > 0) {
        return allEvents
          .filter(event => options.types!.includes(event.eventType))
          .slice(0, options.limit || 100)
      }
      
      return allEvents.slice(0, options.limit || 100)
    }
    
    // Global query - get recent GM events without FID filter
    const sinceISO = (options.since || new Date(Date.now() - 24 * 60 * 60 * 1000)).toISOString()
    const limit = options.limit || 100
    
    const query = `
      query GetRecentGMEvents($since: String!, $limit: Int!) {
        gmEvents(
          where: { timestamp_gte: $since }
          orderBy: timestamp_DESC
          limit: $limit
        ) {
          id
          user { id }
          timestamp
          pointsAwarded
          streakDay
          txHash
        }
      }
    `
    
    const response = await fetch(SUBSQUID_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { since: sinceISO, limit }
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const json = await response.json()
    
    if (json.errors) {
      throw new Error(json.errors[0]?.message || 'GraphQL error')
    }
    
    // Map to GMRankEvent format
    return (json.data?.gmEvents || []).map((event: any) => ({
      id: event.id,
      fid: 0, // Not available in global query
      wallet: event.user.id,
      eventType: 'GM',
      delta: Number(event.pointsAwarded),
      totalPoints: 0, // Not tracked
      previousPoints: 0,
      level: 0,
      tierName: null,
      tierPercent: 0,
      questId: null,
      metadata: null,
      createdAt: event.timestamp
    }))
  } catch (error) {
    console.error('[getRankEvents] Subsquid query failed:', error)
    return []
  }
}

/**
 * Get viral milestones for notification processing
 * Phase 6 Priority 3: Replace processQueuedViralNotifications()
 * 
 * @param options - Query options (since date for recent milestones)
 * @returns Array of viral milestone events
 */
export async function getViralMilestones(options: {
  since?: Date
  limit?: number
  userId?: string
}): Promise<ViralMilestone[]> {
  try {
    const sinceISO = options.since ? options.since.toISOString() : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const limit = options.limit || 50
    
    const whereClause = options.userId 
      ? `where: { user: { id_eq: "${options.userId.toLowerCase()}" }, timestamp_gte: "${sinceISO}" }`
      : `where: { timestamp_gte: "${sinceISO}" }`
    
    const query = `
      query GetViralMilestones {
        viralMilestones(
          ${whereClause}
          orderBy: timestamp_DESC
          limit: ${limit}
        ) {
          id
          user { id }
          milestoneType
          value
          timestamp
          castHash
          notificationSent
        }
      }
    `
    
    const response = await fetch(SUBSQUID_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const json = await response.json()
    
    if (json.errors) {
      throw new Error(json.errors[0]?.message || 'GraphQL error')
    }
    
    return (json.data?.viralMilestones || []).map((milestone: any) => ({
      id: milestone.id,
      fid: 0, // TODO: Add FID to schema
      milestoneType: milestone.milestoneType,
      value: Number(milestone.value),
      timestamp: milestone.timestamp,
      castHash: milestone.castHash
    }))
  } catch (error) {
    console.error('[getViralMilestones] Subsquid query failed:', error)
    return []
  }
}

export interface ViralMilestone {
  id: string
  fid: number
  milestoneType: string
  value: number
  timestamp: string
  castHash?: string
}

// ============================================================================
// PHASE 8.1: QUEST QUERIES
// ============================================================================

export interface Quest {
  id: string
  questType: string
  creator: string
  contractAddress: string
  rewardPoints: bigint
  rewardToken?: string
  rewardTokenAmount?: bigint
  onchainType?: number
  targetAsset?: string
  targetAmount?: bigint
  targetData?: string
  createdAt: string
  createdBlock: number
  closedAt?: string
  closedBlock?: number
  isActive: boolean
  totalCompletions: number
  totalPointsAwarded: bigint
  totalTokensAwarded: bigint
  txHash: string
}

export interface QuestCompletion {
  id: string
  quest: Quest
  user: { id: string }
  pointsAwarded: bigint
  tokenReward?: bigint
  rewardToken?: string
  fid: bigint
  timestamp: string
  blockNumber: number
  txHash: string
}

/**
 * Get quest completions with filtering
 * 
 * @param options.questId - Filter by specific quest ID
 * @param options.userAddress - Filter by user wallet address
 * @param options.since - Filter completions after this date
 * @param options.limit - Maximum results (default: 50)
 * @returns Array of quest completions
 */
export async function getQuestCompletions(options: {
  questId?: string
  userAddress?: string
  since?: Date
  limit?: number
}): Promise<QuestCompletion[]> {
  try {
    const limit = options.limit || 50
    const whereConditions: string[] = []
    
    if (options.questId) {
      whereConditions.push(`quest: { id_eq: "${options.questId}" }`)
    }
    
    if (options.userAddress) {
      whereConditions.push(`user: { id_eq: "${options.userAddress.toLowerCase()}" }`)
    }
    
    if (options.since) {
      whereConditions.push(`timestamp_gte: "${options.since.toISOString()}"`)
    }
    
    const whereClause = whereConditions.length > 0 
      ? `where: { ${whereConditions.join(', ')} }`
      : ''
    
    const query = `
      query GetQuestCompletions {
        questCompletions(
          ${whereClause}
          orderBy: timestamp_DESC
          limit: ${limit}
        ) {
          id
          quest {
            id
            questType
            rewardPoints
            isActive
          }
          user { id }
          pointsAwarded
          tokenReward
          rewardToken
          fid
          timestamp
          blockNumber
          txHash
        }
      }
    `
    
    const response = await fetch(SUBSQUID_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const json = await response.json()
    
    if (json.errors) {
      throw new Error(json.errors[0]?.message || 'GraphQL error')
    }
    
    return json.data?.questCompletions || []
  } catch (error) {
    console.error('[getQuestCompletions] Subsquid query failed:', error)
    return []
  }
}

/**
 * Get quest by ID with full details
 * 
 * @param questId - Quest ID from contract
 * @returns Quest details or null if not found
 */
export async function getQuestById(questId: string): Promise<Quest | null> {
  try {
    const query = `
      query GetQuestById {
        questById(id: "${questId}") {
          id
          questType
          creator
          contractAddress
          rewardPoints
          rewardToken
          rewardTokenAmount
          onchainType
          targetAsset
          targetAmount
          targetData
          createdAt
          createdBlock
          closedAt
          closedBlock
          isActive
          totalCompletions
          totalPointsAwarded
          totalTokensAwarded
          txHash
        }
      }
    `
    
    const response = await fetch(SUBSQUID_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const json = await response.json()
    
    if (json.errors) {
      throw new Error(json.errors[0]?.message || 'GraphQL error')
    }
    
    return json.data?.questById || null
  } catch (error) {
    console.error('[getQuestById] Subsquid query failed:', error)
    return null
  }
}

/**
 * Get quest leaderboard (most completed quests)
 * 
 * @param options.limit - Maximum results (default: 10)
 * @param options.period - Filter by time period (24h, 7d, 30d, all)
 * @returns Array of quest completions sorted by user completion counts
 */
export async function getQuestLeaderboard(options: {
  limit?: number
  period?: '24h' | '7d' | '30d' | 'all'
}): Promise<{ userAddress: string; completionCount: number; totalPoints: bigint }[]> {
  try {
    const limit = options.limit || 10
    let sinceISO: string | undefined
    
    if (options.period && options.period !== 'all') {
      const hoursAgo = options.period === '24h' ? 24 : options.period === '7d' ? 168 : 720
      sinceISO = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString()
    }
    
    const whereClause = sinceISO 
      ? `where: { timestamp_gte: "${sinceISO}" }`
      : ''
    
    const query = `
      query GetQuestLeaderboard {
        questCompletions(
          ${whereClause}
          orderBy: timestamp_DESC
          limit: 1000
        ) {
          user { id }
          pointsAwarded
        }
      }
    `
    
    const response = await fetch(SUBSQUID_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const json = await response.json()
    
    if (json.errors) {
      throw new Error(json.errors[0]?.message || 'GraphQL error')
    }
    
    const completions = json.data?.questCompletions || []
    
    // Aggregate by user
    const userMap = new Map<string, { count: number; points: bigint }>()
    
    for (const completion of completions) {
      const userId = completion.user.id
      const existing = userMap.get(userId) || { count: 0, points: 0n }
      
      userMap.set(userId, {
        count: existing.count + 1,
        points: existing.points + BigInt(completion.pointsAwarded)
      })
    }
    
    // Convert to array and sort
    return Array.from(userMap.entries())
      .map(([userAddress, data]) => ({
        userAddress,
        completionCount: data.count,
        totalPoints: data.points
      }))
      .sort((a, b) => b.completionCount - a.completionCount)
      .slice(0, limit)
  } catch (error) {
    console.error('[getQuestLeaderboard] Subsquid query failed:', error)
    return []
  }
}

/**
 * Get quest statistics (completion counts, popular quests)
 * 
 * @param options.limit - Maximum quests to return (default: 10)
 * @param options.activeOnly - Only return active quests
 * @returns Array of quests sorted by completion count
 */
export async function getQuestStats(options: {
  limit?: number
  activeOnly?: boolean
}): Promise<Quest[]> {
  try {
    const limit = options.limit || 10
    const whereClause = options.activeOnly 
      ? 'where: { isActive_eq: true }'
      : ''
    
    const query = `
      query GetQuestStats {
        quests(
          ${whereClause}
          orderBy: totalCompletions_DESC
          limit: ${limit}
        ) {
          id
          questType
          creator
          contractAddress
          rewardPoints
          rewardToken
          rewardTokenAmount
          createdAt
          createdBlock
          closedAt
          closedBlock
          isActive
          totalCompletions
          totalPointsAwarded
          totalTokensAwarded
          txHash
        }
      }
    `
    
    const response = await fetch(SUBSQUID_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const json = await response.json()
    
    if (json.errors) {
      throw new Error(json.errors[0]?.message || 'GraphQL error')
    }
    
    return json.data?.quests || []
  } catch (error) {
    console.error('[getQuestStats] Subsquid query failed:', error)
    return []
  }
}

/**
 * Get quest completion count for a specific quest
 * 
 * @param questId - Quest ID from contract
 * @returns Number of completions
 */
export async function getQuestCompletionCount(questId: string): Promise<number> {
  try {
    const quest = await getQuestById(questId)
    return quest?.totalCompletions || 0
  } catch (error) {
    console.error('[getQuestCompletionCount] Failed:', error)
    return 0
  }
}

/**
 * Get user's quest completion history
 * 
 * @param userAddress - User wallet address
 * @param limit - Maximum results (default: 50)
 * @returns Array of user's quest completions
 */
export async function getUserQuestHistory(
  userAddress: string,
  limit: number = 50
): Promise<QuestCompletion[]> {
  return getQuestCompletions({ userAddress, limit })
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

// ============================================================================
// ANALYTICS QUERIES (Phase 8.1.5)
// ============================================================================

/**
 * Analytics time series data
 * Used for telemetry dashboard and platform stats
 */
export interface AnalyticsSeries {
  daily: number[] // Last 7 days
  last24h: number
  previous24h: number
  total7d: number
}

/**
 * Get tip event count and volume analytics
 * Replaces RPC client.getLogs() calls for tips
 * 
 * @param since - Start date (ISO string or Date)
 * @param until - End date (ISO string or Date) - defaults to now
 * @returns Analytics series with daily breakdown
 */
export async function getTipAnalytics(
  since: string | Date,
  until?: string | Date
): Promise<AnalyticsSeries> {
  const query = `
    query GetTipAnalytics($since: String!, $until: String!) {
      tipEvents(where: { timestamp_gte: $since, timestamp_lte: $until }) {
        id
        amount
        timestamp
      }
    }
  `

  const sinceDate = typeof since === 'string' ? since : since.toISOString()
  const untilDate = until 
    ? (typeof until === 'string' ? until : until.toISOString())
    : new Date().toISOString()

  try {
    const client = getSubsquidClient()
    const response = await client['query']<{
      tipEvents: Array<{ id: string; amount: string; timestamp: string }>
    }>(query, { since: sinceDate, until: untilDate })

    if (!response?.tipEvents) {
      return { daily: Array(7).fill(0), last24h: 0, previous24h: 0, total7d: 0 }
    }

    return calculateAnalyticsSeries(response.tipEvents, 'timestamp')
  } catch (error) {
    console.error('[getTipAnalytics]', error)
    return { daily: Array(7).fill(0), last24h: 0, previous24h: 0, total7d: 0 }
  }
}

/**
 * Get quest completion analytics
 * Replaces RPC client.getLogs() calls for quest completions
 * 
 * @param since - Start date (ISO string or Date)
 * @param until - End date (ISO string or Date) - defaults to now
 * @returns Analytics series with daily breakdown
 */
export async function getQuestCompletionAnalytics(
  since: string | Date,
  until?: string | Date
): Promise<AnalyticsSeries> {
  const query = `
    query GetQuestCompletionAnalytics($since: String!, $until: String!) {
      questCompletions(where: { timestamp_gte: $since, timestamp_lte: $until }) {
        id
        pointsAwarded
        timestamp
      }
    }
  `

  const sinceDate = typeof since === 'string' ? since : since.toISOString()
  const untilDate = until 
    ? (typeof until === 'string' ? until : until.toISOString())
    : new Date().toISOString()

  try {
    const client = getSubsquidClient()
    const response = await client['query']<{
      questCompletions: Array<{ id: string; pointsAwarded: string; timestamp: string }>
    }>(query, { since: sinceDate, until: untilDate })

    if (!response?.questCompletions) {
      return { daily: Array(7).fill(0), last24h: 0, previous24h: 0, total7d: 0 }
    }

    return calculateAnalyticsSeries(response.questCompletions, 'timestamp')
  } catch (error) {
    console.error('[getQuestCompletionAnalytics]', error)
    return { daily: Array(7).fill(0), last24h: 0, previous24h: 0, total7d: 0 }
  }
}

/**
 * Get badge mint analytics
 * Replaces RPC client.getLogs() calls for badge mints
 * 
 * @param since - Start date (ISO string or Date)
 * @param until - End date (ISO string or Date) - defaults to now
 * @returns Analytics series with daily breakdown
 */
export async function getBadgeMintAnalytics(
  since: string | Date,
  until?: string | Date
): Promise<AnalyticsSeries> {
  const query = `
    query GetBadgeMintAnalytics($since: String!, $until: String!) {
      badgeMints(where: { mintedAt_gte: $since, mintedAt_lte: $until }) {
        id
        mintedAt
      }
    }
  `

  const sinceDate = typeof since === 'string' ? since : since.toISOString()
  const untilDate = until 
    ? (typeof until === 'string' ? until : until.toISOString())
    : new Date().toISOString()

  try {
    const client = getSubsquidClient()
    const response = await client['query']<{
      badgeMints: Array<{ id: string; mintedAt: string }>
    }>(query, { since: sinceDate, until: untilDate })

    if (!response?.badgeMints) {
      return { daily: Array(7).fill(0), last24h: 0, previous24h: 0, total7d: 0 }
    }

    return calculateAnalyticsSeries(response.badgeMints, 'mintedAt')
  } catch (error) {
    console.error('[getBadgeMintAnalytics]', error)
    return { daily: Array(7).fill(0), last24h: 0, previous24h: 0, total7d: 0 }
  }
}

/**
 * Get GM event analytics
 * Replaces RPC client.getLogs() calls for GM events
 * 
 * @param since - Start date (ISO string or Date)
 * @param until - End date (ISO string or Date) - defaults to now
 * @returns Analytics series with daily breakdown
 */
export async function getGMEventAnalytics(
  since: string | Date,
  until?: string | Date
): Promise<AnalyticsSeries> {
  const query = `
    query GetGMEventAnalytics($since: String!, $until: String!) {
      gmEvents(where: { timestamp_gte: $since, timestamp_lte: $until }) {
        id
        timestamp
      }
    }
  `

  const sinceDate = typeof since === 'string' ? since : since.toISOString()
  const untilDate = until 
    ? (typeof until === 'string' ? until : until.toISOString())
    : new Date().toISOString()

  try {
    const client = getSubsquidClient()
    const response = await client['query']<{
      gmEvents: Array<{ id: string; timestamp: string }>
    }>(query, { since: sinceDate, until: untilDate })

    if (!response?.gmEvents) {
      return { daily: Array(7).fill(0), last24h: 0, previous24h: 0, total7d: 0 }
    }

    return calculateAnalyticsSeries(response.gmEvents, 'timestamp')
  } catch (error) {
    console.error('[getGMEventAnalytics]', error)
    return { daily: Array(7).fill(0), last24h: 0, previous24h: 0, total7d: 0 }
  }
}

/**
 * Get guild deposit analytics
 * Replaces RPC client.getLogs() calls for guild deposits
 * 
 * @param since - Start date (ISO string or Date)
 * @param until - End date (ISO string or Date) - defaults to now
 * @returns Analytics series with daily breakdown
 */
export async function getGuildDepositAnalytics(
  since: string | Date,
  until?: string | Date
): Promise<AnalyticsSeries> {
  const query = `
    query GetGuildDepositAnalytics($since: String!, $until: String!) {
      guildEvents(where: { 
        eventType_eq: "PointsDeposited",
        timestamp_gte: $since, 
        timestamp_lte: $until 
      }) {
        id
        amount
        timestamp
      }
    }
  `

  const sinceDate = typeof since === 'string' ? since : since.toISOString()
  const untilDate = until 
    ? (typeof until === 'string' ? until : until.toISOString())
    : new Date().toISOString()

  try {
    const client = getSubsquidClient()
    const response = await client['query']<{
      guildEvents: Array<{ id: string; amount: string; timestamp: string }>
    }>(query, { since: sinceDate, until: untilDate })

    if (!response?.guildEvents) {
      return { daily: Array(7).fill(0), last24h: 0, previous24h: 0, total7d: 0 }
    }

    return calculateAnalyticsSeries(response.guildEvents, 'timestamp')
  } catch (error) {
    console.error('[getGuildDepositAnalytics]', error)
    return { daily: Array(7).fill(0), last24h: 0, previous24h: 0, total7d: 0 }
  }
}

/**
 * Helper function to calculate analytics series from event data
 * Allocates events to daily buckets based on timestamp
 * 
 * @param events - Array of events with timestamp field
 * @param timestampField - Name of timestamp field ('timestamp', 'mintedAt', etc.)
 * @returns Analytics series with daily breakdown
 */
function calculateAnalyticsSeries(
  events: Array<{ timestamp?: string; mintedAt?: string; [key: string]: any }>,
  timestampField: string
): AnalyticsSeries {
  const daily = Array(7).fill(0)
  const now = Date.now()
  const DAY_MS = 86_400_000

  for (const event of events) {
    const timestamp = event[timestampField]
    if (!timestamp) continue

    const eventTime = new Date(timestamp).getTime()
    const delta = now - eventTime

    // Skip events outside 7-day window
    if (delta < 0 || delta > 7 * DAY_MS) continue

    // Calculate which day bucket this event belongs to
    const daysAgo = Math.floor(delta / DAY_MS)
    if (daysAgo >= 0 && daysAgo < 7) {
      const index = 6 - daysAgo // Most recent day is index 6
      daily[index] += 1
    }
  }

  const last24h = daily[6] || 0
  const previous24h = daily[5] || 0
  const total7d = daily.reduce((sum, value) => sum + value, 0)

  return { daily, last24h, previous24h, total7d }
}

/**
 * Get combined platform analytics
 * Single call to fetch all metrics for dashboard
 * 
 * @param since - Start date (ISO string or Date)
 * @param until - End date (ISO string or Date) - defaults to now
 * @returns Object with all analytics series
 */
export async function getPlatformAnalytics(
  since: string | Date,
  until?: string | Date
) {
  const [tips, quests, badges, gms, guilds] = await Promise.all([
    getTipAnalytics(since, until),
    getQuestCompletionAnalytics(since, until),
    getBadgeMintAnalytics(since, until),
    getGMEventAnalytics(since, until),
    getGuildDepositAnalytics(since, until),
  ])

  return { tips, quests, badges, gms, guilds }
}

// ============================================================================
// PHASE 8.2: POINTS & TREASURY QUERIES
// ============================================================================

export interface PointsTransaction {
  id: string
  transactionType: 'DEPOSIT' | 'WITHDRAW'
  user: string
  amount: bigint
  from: string | null
  to: string | null
  timestamp: Date
  blockNumber: number
  txHash: string
}

export interface TreasuryOperation {
  id: string
  operationType: 'ESCROW_DEPOSIT' | 'PAYOUT' | 'REFUND'
  token: string
  amount: bigint
  from: string
  to: string | null
  questId: bigint | null
  timestamp: Date
  blockNumber: number
  txHash: string
}

/**
 * Get points transactions for a user
 * 
 * @param user - Wallet address
 * @param options - Query options (limit, offset, type filter)
 * @returns Array of points transactions
 */
export async function getPointsTransactions(
  user: string,
  options?: {
    limit?: number
    offset?: number
    type?: 'DEPOSIT' | 'WITHDRAW'
  }
): Promise<PointsTransaction[]> {
  const limit = options?.limit || 50
  const offset = options?.offset || 0
  const typeFilter = options?.type ? `transactionType_eq: "${options.type}",` : ''

  const query = `
    query GetPointsTransactions($user: String!, $limit: Int!, $offset: Int!) {
      pointsTransactions(
        where: {
          user_eq: $user,
          ${typeFilter}
        },
        orderBy: timestamp_DESC,
        limit: $limit,
        offset: $offset
      ) {
        id
        transactionType
        user
        amount
        from
        to
        timestamp
        blockNumber
        txHash
      }
    }
  `

  try {
    const client = getSubsquidClient()
    const data = await client['query']<{
      pointsTransactions: PointsTransaction[]
    }>(query, {
      user: user.toLowerCase(),
      limit,
      offset,
    })

    return data?.pointsTransactions || []
  } catch (error) {
    logError('Failed to fetch points transactions', { error, user })
    return []
  }
}

/**
 * Get points balance for a user (sum of deposits - withdrawals)
 * Note: This calculates from transaction history, not live contract balance
 * 
 * @param user - Wallet address
 * @returns Points balance
 */
export async function getPointsBalance(user: string): Promise<bigint> {
  const transactions = await getPointsTransactions(user, { limit: 1000 })

  let balance = 0n
  for (const tx of transactions) {
    if (tx.transactionType === 'DEPOSIT') {
      balance += tx.amount
    } else if (tx.transactionType === 'WITHDRAW') {
      balance -= tx.amount
    }
  }

  return balance
}

/**
 * Get treasury operations (ERC20 escrow, payouts, refunds)
 * 
 * @param options - Query options (limit, offset, token, questId)
 * @returns Array of treasury operations
 */
export async function getTreasuryOperations(options?: {
  limit?: number
  offset?: number
  token?: string
  questId?: string
  operationType?: 'ESCROW_DEPOSIT' | 'PAYOUT' | 'REFUND'
}): Promise<TreasuryOperation[]> {
  const limit = options?.limit || 50
  const offset = options?.offset || 0

  const filters: string[] = []
  if (options?.token) {
    filters.push(`token_eq: "${options.token.toLowerCase()}"`)
  }
  if (options?.questId) {
    filters.push(`questId_eq: "${options.questId}"`)
  }
  if (options?.operationType) {
    filters.push(`operationType_eq: "${options.operationType}"`)
  }

  const whereClause = filters.length > 0 ? `where: { ${filters.join(', ')} },` : ''

  const query = `
    query GetTreasuryOperations($limit: Int!, $offset: Int!) {
      treasuryOperations(
        ${whereClause}
        orderBy: timestamp_DESC,
        limit: $limit,
        offset: $offset
      ) {
        id
        operationType
        token
        amount
        from
        to
        questId
        timestamp
        blockNumber
        txHash
      }
    }
  `

  try {
    const client = getSubsquidClient()
    const data = await client['query']<{
      treasuryOperations: TreasuryOperation[]
    }>(query, {
      limit,
      offset,
    })

    return data?.treasuryOperations || []
  } catch (error) {
    logError('Failed to fetch treasury operations', { error, options })
    return []
  }
}

/**
 * Get points transaction analytics (deposits/withdrawals over time)
 * 
 * @param since - Start date
 * @param until - End date (defaults to now)
 * @returns Analytics series with daily counts
 */
export async function getPointsAnalytics(
  since: string | Date,
  until?: string | Date
): Promise<AnalyticsSeries> {
  const sinceISO = typeof since === 'string' ? since : since.toISOString()
  const untilISO = until
    ? typeof until === 'string'
      ? until
      : until.toISOString()
    : new Date().toISOString()

  const query = `
    query GetPointsAnalytics($since: DateTime!, $until: DateTime!) {
      pointsTransactions(
        where: {
          timestamp_gte: $since,
          timestamp_lte: $until
        },
        orderBy: timestamp_ASC
      ) {
        timestamp
        transactionType
      }
    }
  `

  try {
    const client = getSubsquidClient()
    const data = await client['query']<{
      pointsTransactions: Array<{ timestamp: string; transactionType: string }>
    }>(query, {
      since: sinceISO,
      until: untilISO,
    })

    return calculateAnalyticsSeries(data?.pointsTransactions || [], 'timestamp')
  } catch (error) {
    logError('Failed to fetch points analytics', { error, since, until })
    return { daily: Array(7).fill(0), last24h: 0, previous24h: 0, total7d: 0 }
  }
}

// ============================================================================
// PHASE 8.3: BADGE STAKING QUERIES
// ============================================================================

export interface BadgeStake {
  id: string
  user: string
  badgeId: bigint
  stakeType: 'STAKED' | 'UNSTAKED'
  stakedAt: Date | null
  unstakedAt: Date | null
  isActive: boolean
  rewardsEarned: bigint | null
  lastRewardClaim: Date | null
  isPowerBadge: boolean
  powerMultiplier: number | null
  blockNumber: number
  txHash: string
}

/**
 * Get badge staking history for a user
 * 
 * @param user - Wallet address
 * @param options - Query options (limit, offset, activeOnly)
 * @returns Array of badge stake records
 */
export async function getBadgeStakes(
  user: string,
  options?: {
    limit?: number
    offset?: number
    activeOnly?: boolean
  }
): Promise<BadgeStake[]> {
  const limit = options?.limit || 50
  const offset = options?.offset || 0
  const activeFilter = options?.activeOnly ? 'isActive_eq: true,' : ''

  const query = `
    query GetBadgeStakes($user: String!, $limit: Int!, $offset: Int!) {
      badgeStakes(
        where: {
          user_eq: $user,
          ${activeFilter}
        },
        orderBy: blockNumber_DESC,
        limit: $limit,
        offset: $offset
      ) {
        id
        user
        badgeId
        stakeType
        stakedAt
        unstakedAt
        isActive
        rewardsEarned
        lastRewardClaim
        isPowerBadge
        powerMultiplier
        blockNumber
        txHash
      }
    }
  `

  try {
    const client = getSubsquidClient()
    const data = await client['query']<{
      badgeStakes: BadgeStake[]
    }>(query, {
      user: user.toLowerCase(),
      limit,
      offset,
    })

    return data?.badgeStakes || []
  } catch (error) {
    logError('Failed to fetch badge stakes', { error, user })
    return []
  }
}

/**
 * Get currently staked badges for a user
 * 
 * @param user - Wallet address
 * @returns Array of active badge stakes
 */
export async function getActiveBadgeStakes(user: string): Promise<BadgeStake[]> {
  return getBadgeStakes(user, { activeOnly: true, limit: 100 })
}

/**
 * Get badge staking analytics (total staked, rewards earned)
 * 
 * @param user - Wallet address
 * @returns Staking statistics
 */
export async function getBadgeStakingStats(
  user: string
): Promise<{
  totalStaked: number
  totalRewards: bigint
  activeBadges: number
  powerBadges: number
}> {
  try {
    const allStakes = await getBadgeStakes(user, { limit: 1000 })

    const activeStakes = allStakes.filter((s) => s.isActive)
    const powerBadges = activeStakes.filter((s) => s.isPowerBadge)

    let totalRewards = 0n
    for (const stake of allStakes) {
      if (stake.rewardsEarned) {
        totalRewards += stake.rewardsEarned
      }
    }

    return {
      totalStaked: allStakes.length,
      totalRewards,
      activeBadges: activeStakes.length,
      powerBadges: powerBadges.length,
    }
  } catch (error) {
    logError('Failed to fetch badge staking stats', { error, user })
    return {
      totalStaked: 0,
      totalRewards: 0n,
      activeBadges: 0,
      powerBadges: 0,
    }
  }
}

/**
 * Get badge stake by badge ID
 * 
 * @param user - Wallet address
 * @param badgeId - NFT token ID
 * @returns Badge stake record or null
 */
export async function getBadgeStakeByBadgeId(
  user: string,
  badgeId: bigint
): Promise<BadgeStake | null> {
  const query = `
    query GetBadgeStakeByBadgeId($user: String!, $badgeId: BigInt!) {
      badgeStakes(
        where: {
          user_eq: $user,
          badgeId_eq: $badgeId,
          isActive_eq: true
        },
        orderBy: blockNumber_DESC,
        limit: 1
      ) {
        id
        user
        badgeId
        stakeType
        stakedAt
        unstakedAt
        isActive
        rewardsEarned
        lastRewardClaim
        isPowerBadge
        powerMultiplier
        blockNumber
        txHash
      }
    }
  `

  try {
    const client = getSubsquidClient()
    const data = await client['query']<{
      badgeStakes: BadgeStake[]
    }>(query, {
      user: user.toLowerCase(),
      badgeId: badgeId.toString(),
    })

    return data?.badgeStakes?.[0] || null
  } catch (error) {
    logError('Failed to fetch badge stake by badge ID', { error, user, badgeId })
    return null
  }
}

// ============================================================================
// Phase 8.4: Referral Chain Tracking
// ============================================================================

/**
 * Get referrer chain for a user (who referred who)
 * 
 * @param user - Wallet address
 * @returns Array of referrer relationships
 */
export async function getReferrerChain(user: string): Promise<Array<{
  id: string
  user: string
  referrer: string
  timestamp: bigint
  txHash: string
}>> {
  const query = `
    query GetReferrerChain($user: String!) {
      referrerSets(
        where: { user_eq: $user }
        orderBy: timestamp_DESC
      ) {
        id
        user
        referrer
        timestamp
        blockNumber
        txHash
      }
    }
  `

  try {
    const client = getSubsquidClient()
    const data = await client['query']<{
      referrerSets: Array<{
        id: string
        user: string
        referrer: string
        timestamp: bigint
        blockNumber: number
        txHash: string
      }>
    }>(query, { user: user.toLowerCase() })

    return data?.referrerSets || []
  } catch (error) {
    logError('Failed to fetch referrer chain', { error, user })
    return []
  }
}

/**
 * Get all users who set a specific address as their referrer
 * 
 * @param referrer - Referrer wallet address
 * @param limit - Maximum results (default 100)
 * @returns Array of users who set this referrer
 */
export async function getReferrerHistory(
  referrer: string,
  limit: number = 100
): Promise<Array<{
  id: string
  user: string
  referrer: string
  timestamp: bigint
  txHash: string
}>> {
  const query = `
    query GetReferrerHistory($referrer: String!, $limit: Int!) {
      referrerSets(
        where: { referrer_eq: $referrer }
        orderBy: timestamp_DESC
        limit: $limit
      ) {
        id
        user
        referrer
        timestamp
        blockNumber
        txHash
      }
    }
  `

  try {
    const client = getSubsquidClient()
    const data = await client['query']<{
      referrerSets: Array<{
        id: string
        user: string
        referrer: string
        timestamp: bigint
        blockNumber: number
        txHash: string
      }>
    }>(query, { 
      referrer: referrer.toLowerCase(),
      limit 
    })

    return data?.referrerSets || []
  } catch (error) {
    logError('Failed to fetch referrer history', { error, referrer })
    return []
  }
}

/**
 * Get referral network statistics
 * 
 * @param address - Wallet address (as referrer)
 * @returns Statistics about referral network
 */
export async function getReferralNetworkStats(address: string): Promise<{
  totalReferrals: number
  firstReferral: bigint | null
  lastReferral: bigint | null
}> {
  try {
    const history = await getReferrerHistory(address, 1000)
    
    if (history.length === 0) {
      return {
        totalReferrals: 0,
        firstReferral: null,
        lastReferral: null,
      }
    }

    // History is already sorted DESC, so last is first chronologically
    return {
      totalReferrals: history.length,
      firstReferral: history[history.length - 1].timestamp,
      lastReferral: history[0].timestamp,
    }
  } catch (error) {
    logError('Failed to fetch referral network stats', { error, address })
    return {
      totalReferrals: 0,
      firstReferral: null,
      lastReferral: null,
    }
  }
}

/**
 * Get GM events for a user (alias for getRankEvents)
 * This is a convenience function for backward compatibility
 * 
 * @param fid - Farcaster ID
 * @param since - Optional start date (defaults to 30 days ago)
 * @returns Array of GM events
 */
export async function getGMEvents(fid: number, since?: Date): Promise<GMRankEvent[]> {
  return getRankEvents({
    fid,
    limit: 1000, // Get all events
    types: ['gm'], // Only GM events
    since: since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  })
}
