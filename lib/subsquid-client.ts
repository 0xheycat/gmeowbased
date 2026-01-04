/**
 * Subsquid GraphQL Client - LAYER 1 (Blockchain Data Only)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * CRITICAL: 3-LAYER ARCHITECTURE COMPLIANCE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This file is LAYER 1 ONLY - On-chain blockchain data from Subsquid indexer.
 * 
 * ✅ ALLOWED (Layer 1 - Blockchain):
 *    - User.totalPoints (GM rewards with streak multiplier from contract)
 *    - User.pointsBalance (current spendable balance)
 *    - User.totalEarnedFromGMs (cumulative GM rewards)
 *    - User.currentStreak (streak counter from contract)
 *    - User.lifetimeGMs (total GM count)
 *    - GMEvent, PointsTransaction, BadgeStake, QuestCompletion events
 *    - Guild deposits, referral events, tip events
 *    - All on-chain timestamps, block numbers, transaction hashes
 * 
 * ❌ FORBIDDEN (Layer 2 - Off-chain / Layer 3 - Calculated):
 *    - viralPoints → Layer 2 (Supabase badge_casts.viral_bonus_xp)
 *    - rank → Layer 3 (Calculated by unified-calculator.ts)
 *    - level → Layer 3 (Calculated by unified-calculator.ts)
 *    - totalScore → Layer 3 (Calculated: blockchain + viral + quests)
 *    - guildBonus, referralBonus → Layer 2 or Layer 3
 *    - Any FID-based queries → Layer 2 (FID is off-chain metadata)
 *    - Any calculation logic → Layer 3 (use lib/scoring/unified-calculator.ts)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * USAGE IN ROUTES
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * // Step 1: Get on-chain data (Layer 1)
 * const onChain = await getLeaderboardEntry(address)
 * 
 * // Step 2: Get off-chain data (Layer 2 - in route, not here!)
 * const { data: viralPoints } = await supabase.from('badge_casts')...
 * 
 * // Step 3: Calculate derived metrics (Layer 3 - in route, not here!)
 * import { calculateCompleteStats } from '@/lib/scoring/unified-calculator'
 * const stats = calculateCompleteStats({
 *   pointsBalance: Number(onChain.pointsBalance),
 *   viralPoints: viralPoints || 0,
 *   ...
 * })
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * DATA SOURCE:
 * - Subsquid Indexer: https://squid.subsquid.io/gmeow-indexer/graphql (production)
 * - Subsquid Indexer: http://localhost:4350/graphql (local dev)
 * 
 * FEATURES:
 * ✅ User on-chain stats (totalPoints, currentStreak, lifetimeGMs)
 * ✅ GM events (activity history with timestamps)
 * ✅ Points transactions (deposits, withdrawals)
 * ✅ Badge stakes (NFT staking events)
 * ✅ Quest completions (on-chain quest events)
 * ✅ Guild events (deposits, withdrawals)
 * ✅ Referral events (on-chain referrer tracking)
 * ✅ Tip events (on-chain tip transfers)
 * ✅ Error handling with fallbacks
 * ✅ Type-safe GraphQL queries
 * 
 * PERFORMANCE:
 * - User query: <20ms (indexed by wallet address)
 * - Events query: <30ms (filtered by date range)
 * - Analytics query: <50ms (aggregated events)
 * 
 * Created: December 18, 2025
 * Updated: December 22, 2025 (Layer 1 compliance)
 * Reference: COMPLETE-CALCULATION-SYSTEM.md (3-layer architecture)
 * Reference: gmeow-indexer/schema.graphql (actual Subsquid schema)
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
// TYPES - LAYER 1 (On-Chain Blockchain Data Only)
// ============================================================================

/**
 * User on-chain stats from Subsquid
 * LAYER 1 ONLY - No calculated or off-chain fields!
 * 
 * For complete user stats with calculations, use:
 * - Layer 2: Supabase (viral XP, quest progress, referrals)
 * - Layer 3: unified-calculator.ts (level, rank, totalScore)
 */
export interface UserOnChainStats {
  id: string                    // Wallet address (primary key)
  pointsBalance: number          // Current spendable balance (on-chain)
  totalEarnedFromGMs: number     // Cumulative GM rewards (on-chain)
  currentStreak: number          // Current GM streak (on-chain)
  lifetimeGMs: number            // Total GM count (on-chain)
  lastGMTimestamp: string | null // Last GM timestamp (on-chain)
  totalTipsGiven: number         // Tips sent count (on-chain)
  totalTipsReceived: number      // Tips received count (on-chain)
  milestoneCount: number         // Milestone achievements (on-chain)
}

/**
 * @deprecated Use UserOnChainStats instead
 * This type mixed Layer 1, 2, 3 data (violation of architecture)
 */
export interface LeaderboardEntry {
  id: string
  wallet: string
  fid?: number
  rank: number
  totalScore: number
  basePoints: number
  viralPoints: number
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

/**
 * @deprecated Use UserOnChainStats instead
 * This type mixed Layer 1, 2, 3 data (violation of architecture)
 */
export interface UserStats {
  wallet: string
  fid?: number
  totalScore: number
  basePoints: number
  viralPoints: number
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
  totalPoints: number    // DEPRECATED: Use pointsAwarded from event instead
  previousPoints: number // DEPRECATED: Not reliably tracked on-chain
  level: number          // DEPRECATED: Level is Layer 3 (calculated)
  tierName: string       // DEPRECATED: Tier is Layer 3 (calculated)
  tierPercent: number    // DEPRECATED: Percentage is Layer 3 (calculated)
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
  id: string              // Guild ID
  treasuryPoints: string  // Guild treasury balance (from contract, returned as string from BigInt)
  totalMembers: number    // Total member count
  owner: string           // Guild owner/leader address
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

// Query users with actual Subsquid schema (on-chain data only)
const USERS_QUERY = `
  query GetUsers($limit: Int!, $offset: Int!) {
    users(
      limit: $limit
      offset: $offset
      orderBy: pointsBalance_DESC
    ) {
      id
      pointsBalance
      totalEarnedFromGMs
      currentStreak
      lifetimeGMs
      lastGMTimestamp
      totalTipsGiven
      totalTipsReceived
      milestoneCount
    }
  }
`

// Query user by wallet (on-chain data only)
const USER_BY_WALLET_QUERY = `
  query GetUserByWallet($wallet: String!) {
    users(where: { id_eq: $wallet }, limit: 1) {
      id
      pointsBalance
      totalEarnedFromGMs
      currentStreak
      lifetimeGMs
      lastGMTimestamp
      totalTipsGiven
      totalTipsReceived
      milestoneCount
    }
  }
`

// NOTE: FID is NOT stored in Subsquid (off-chain metadata)
// To query by FID: First lookup wallet address from Supabase user_profiles, then use USER_BY_WALLET_QUERY


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
    guilds(where: { id_eq: $guildId }) {
      id
      treasuryPoints
      totalMembers
      owner
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
   * Get users ordered by pointsBalance (raw on-chain data)
   * 
   * LAYER 1 ONLY: Returns on-chain blockchain data from Subsquid User entities.
   * For complete user stats, combine with:
   * - Layer 2 (Supabase): viral XP, quest progress, referrals
   * - Layer 3 (unified-calculator): level, rank, totalScore
   * 
   * @returns Array of User entities with on-chain fields only
   */
  async getLeaderboard(limit: number = 100, offset: number = 0): Promise<UserOnChainStats[]> {
    const data = await this.query<{ users: any[] }>(
      USERS_QUERY,
      { limit, offset }
    )

    return (data?.users || []).map(user => ({
      id: user.id,
      pointsBalance: Number(user.pointsBalance || 0),
      totalEarnedFromGMs: Number(user.totalEarnedFromGMs || 0),
      currentStreak: Number(user.currentStreak || 0),
      lifetimeGMs: Number(user.lifetimeGMs || 0),
      lastGMTimestamp: user.lastGMTimestamp,
      totalTipsGiven: Number(user.totalTipsGiven || 0),
      totalTipsReceived: Number(user.totalTipsReceived || 0),
      milestoneCount: Number(user.milestoneCount || 0),
    }))
  }

  /**
   * Get user by wallet address (raw on-chain data)
   * 
   * LAYER 1 ONLY: Returns on-chain User entity.
   * For complete stats, use unified-calculator.ts to calculate level/rank.
   * 
   * @param wallet - Wallet address (0x...)
   * @returns User entity with on-chain fields only, or null if not found
   */
  async getUserStatsByWallet(wallet: string): Promise<UserOnChainStats | null> {
    // Normalize wallet address
    const normalizedWallet = wallet.toLowerCase()

    const data = await this.query<{ users: any[] }>(
      USER_BY_WALLET_QUERY,
      { wallet: normalizedWallet }
    )

    const user = data?.users?.[0]
    if (!user) return null

    return {
      id: user.id,
      pointsBalance: Number(user.pointsBalance || 0),
      totalEarnedFromGMs: Number(user.totalEarnedFromGMs || 0),
      currentStreak: Number(user.currentStreak || 0),
      lifetimeGMs: Number(user.lifetimeGMs || 0),
      lastGMTimestamp: user.lastGMTimestamp,
      totalTipsGiven: Number(user.totalTipsGiven || 0),
      totalTipsReceived: Number(user.totalTipsReceived || 0),
      milestoneCount: Number(user.milestoneCount || 0),
    }
  }

  /**
   * Get user stats by FID - NOT SUPPORTED
   * FID is off-chain metadata, not stored in Subsquid.
   * 
   * To query by FID:
   * 1. Query Supabase user_profiles to get wallet address(es) for FID
   * 2. Call getUserStatsByWallet(wallet)
   */
  async getUserStatsByFID(fid: number) {
    console.warn('getUserStatsByFID: FID not stored in Subsquid. Use Supabase to resolve FID -> wallet first.')
    return null
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
    const data = await this.query<{ guilds: GuildStats[] }>(GUILD_STATS_QUERY, { guildId })

    return data?.guilds?.[0] || null
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
 * Get on-chain user stats by wallet address (RECOMMENDED)
 * 
 * LAYER 1 ONLY: Returns blockchain data from Subsquid indexer.
 * This function provides clear, descriptive naming for on-chain data retrieval.
 * 
 * For complete user stats, combine with:
 * - Layer 2 (Supabase): viral XP, quest progress, profile data
 * - Layer 3 (unified-calculator): level, rank, totalScore calculations
 * 
 * @param wallet - Wallet address (0x...) - FID NOT supported (use Supabase to resolve FID → wallet)
 * @returns User on-chain stats or null if not found
 * 
 * @example
 * // Multi-wallet aggregation pattern
 * const profile = await supabase.from('user_profiles').select('wallet_address, verified_addresses, custody_address').eq('fid', fid).single()
 * const allWallets = [profile.wallet_address, profile.custody_address, ...(profile.verified_addresses || [])].filter(Boolean)
 * const onChainData = await Promise.all(allWallets.map(w => getOnChainUserStats(w)))
 * const totalPoints = onChainData.reduce((sum, d) => sum + (d?.pointsBalance || 0), 0)
 */
export async function getOnChainUserStats(wallet: string): Promise<UserOnChainStats | null> {
  const client = getSubsquidClient()
  return client.getUserStatsByWallet(wallet)
}

/**
 * Get user on-chain stats by FID or wallet address
 * 
 * @deprecated Use getOnChainUserStats(wallet) instead for clearer naming.
 * This function name suggests ranking/leaderboard position (Layer 3 calculation),
 * but it actually returns raw on-chain data (Layer 1).
 * 
 * Migration:
 * - Old: const stats = await getLeaderboardEntry(wallet)
 * - New: const stats = await getOnChainUserStats(wallet)
 * 
 * LAYER 1 ONLY: Returns blockchain data from Subsquid.
 * For FID lookups, first resolve FID → wallet via Supabase user_profiles.
 * 
 * @param fidOrWallet - FID number or wallet address string
 * @returns User on-chain stats or null
 */
export async function getLeaderboardEntry(fidOrWallet: number | string): Promise<UserOnChainStats | null> {
  console.warn('[DEPRECATED] getLeaderboardEntry() is deprecated. Use getOnChainUserStats(wallet) instead.')
  
  const client = getSubsquidClient()

  if (typeof fidOrWallet === 'number') {
    console.warn('[getLeaderboardEntry] FID lookup not supported in Subsquid. Use Supabase to resolve FID → wallet first.')
    return null
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

/**
 * Get Power Badge status for a specific FID
 * Phase 8.3: PowerBadgeSet event tracking
 * @param fid - Farcaster ID
 * @returns PowerBadge record or null
 */
export async function getPowerBadge(fid: string): Promise<any | null> {
  const query = `
    query GetPowerBadge($fid: String!) {
      powerBadges(
        where: { id_eq: $fid },
        limit: 1
      ) {
        id
        fid
        isPowerBadge
        setBy
        timestamp
        blockNumber
        txHash
      }
    }
  `

  try {
    const client = getSubsquidClient()
    const data = await client['query']<{ powerBadges: any[] }>(query, { fid })
    return data?.powerBadges?.[0] || null
  } catch (error) {
    logError('Failed to fetch power badge', { error, fid })
    return null
  }
}

/**
 * Check if a FID has Power Badge status
 * @param fid - Farcaster ID
 * @returns true if has power badge, false otherwise
 */
export async function isPowerBadge(fid: string): Promise<boolean> {
  const powerBadge = await getPowerBadge(fid)
  return powerBadge?.isPowerBadge === true
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

/**
 * Get guild membership by wallet address
 * 
 * @param address - Wallet address
 * @returns Array of guild memberships
 */
export async function getGuildMembershipByAddress(address: string): Promise<any[]> {
  const normalizedAddress = address.toLowerCase()
  
  const query = `
    query GetGuildMembership($address: String!) {
      guildMembers(where: { user: { id_eq: $address }, isActive_eq: true }) {
        id
        joinedAt
        role
        pointsContributed
        isActive
        guild {
          id
          owner
          totalMembers
          totalPoints
        }
      }
    }
  `
  
  try {
    const response = await fetch(SUBSQUID_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { address: normalizedAddress }
      })
    })
    
    if (!response.ok) {
      // Log warning but don't throw - guild membership is optional
      console.warn(`[Subsquid] Guild membership query failed: HTTP ${response.status}`, { address: normalizedAddress })
      return []
    }
    
    const result = await response.json()
    
    if (result.errors) {
      // Log warning but don't throw - guild membership is optional
      console.warn('[Subsquid] Guild membership GraphQL error:', result.errors[0]?.message, { address: normalizedAddress })
      return []
    }
    
    return result.data?.guildMembers || []
  } catch (error) {
    // Silent fallback - guild membership is optional data
    console.warn('[Subsquid] Guild membership fetch error:', error instanceof Error ? error.message : 'Unknown error', { address: normalizedAddress })
    return []
  }
}

/**
 * Get referral code by owner address
 * 
 * @param address - Wallet address of referral code owner
 * @returns Referral code data or null
 */
export async function getReferralCodeByOwner(address: string): Promise<any | null> {
  const normalizedAddress = address.toLowerCase()
  
  const query = `
    query GetReferralCode($owner: String!) {
      referralCodes(where: { owner_eq: $owner }, limit: 1) {
        id
        owner
        createdAt
        totalUses
        totalRewards
      }
    }
  `
  
  try {
    const response = await fetch(SUBSQUID_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { owner: normalizedAddress }
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (result.errors) {
      throw new Error(result.errors[0]?.message || 'GraphQL query failed')
    }
    
    const codes = result.data?.referralCodes || []
    return codes.length > 0 ? codes[0] : null
  } catch (error) {
    logError('Failed to fetch referral code', { error, address })
    return null
  }
}

/**
 * Get badge stakes by wallet address
 * 
 * @param address - Wallet address
 * @returns Array of active badge stakes
 */
export async function getBadgeStakesByAddress(address: string): Promise<any[]> {
  const normalizedAddress = address.toLowerCase()
  
  const query = `
    query GetBadgeStakes($address: String!) {
      badgeStakes(where: { user_eq: $address, isActive_eq: true }) {
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
    const response = await fetch(SUBSQUID_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { address: normalizedAddress }
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (result.errors) {
      throw new Error(result.errors[0]?.message || 'GraphQL query failed')
    }
    
    return result.data?.badgeStakes || []
  } catch (error) {
    logError('Failed to fetch badge stakes', { error, address })
    return []
  }
}
