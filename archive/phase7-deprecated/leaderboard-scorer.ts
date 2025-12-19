/**
 * Leaderboard Score Calculator
 * Phase 7.5: Comprehensive Headers
 * 
 * ⚠️ DEPRECATED: This file will be replaced by Subsquid in Phase 3
 * 
 * FEATURES:
 * - Multi-component score calculation (8 factors)
 * - On-chain data: Base points, streaks, badges from GM contract
 * - Off-chain data: Viral XP from badge_casts engagement
 * - Guild system: Level bonus + membership bonus (10% member + 5% officer)
 * - Referral rewards: 50 points per referral
 * - Badge prestige: 25 points per badge
 * - Supabase storage: leaderboard_calculations table
 * 
 * FORMULA:
 * totalScore = basePoints + viralXP + guildBonus + guildBonusPoints + referralBonus + streakBonus + badgePrestige
 * 
 * Guild Bonus Points:
 * - Members: 10% of (basePoints + viralXP)
 * - Officers: Additional 5% bonus (15% total)
 * 
 * PERFORMANCE:
 * - RPC queries: ~300ms (contract reads)
 * - Supabase queries: ~150ms (viral XP, guild data)
 * - Total: ~500ms per user
 * - Batch mode: 50 users in ~10s (parallel processing)
 * 
 * PHASE 3 MIGRATION:
 * ❌ DEPRECATED TABLE: leaderboard_calculations
 * ✅ NEW SOURCE: Subsquid LeaderboardEntry (pre-computed, <10ms queries)
 * 
 * Migration Path:
 * 1. Phase 3: Drop leaderboard_calculations table
 * 2. Phase 4: Replace with lib/subsquid-client.ts getLeaderboard()
 * 3. Subsquid computes scores in real-time from blockchain events
 * 4. API routes use Subsquid GraphQL endpoint
 * 
 * TODO (Phase 4):
 * - [ ] Create lib/subsquid-client.ts with getLeaderboard() function
 * - [ ] Update app/api/leaderboard/route.ts to use Subsquid
 * - [ ] Add Redis caching for Subsquid responses (5-min TTL)
 * - [ ] Remove this file after full migration
 * 
 * CRITICAL:
 * - This scorer runs ON-DEMAND (expensive RPC calls)
 * - Subsquid will run CONTINUOUSLY (event-driven, cached)
 * - Do NOT use this for high-traffic routes
 * - Current usage: Admin panel refresh, manual recalculation only
 * 
 * AVOID:
 * - Calling this in API endpoints (use cached leaderboard_calculations)
 * - Batch processing >100 users (memory issues)
 * - Running without rate limits (RPC quota exhaustion)
 * - Hardcoded colors or emojis (use Tailwind config + icon references)
 * 
 * Created: November 2025
 * Last Modified: December 18, 2025 (Phase 3 migration preparation)
 * Reference: SUBSQUID-SUPABASE-MIGRATION-PLAN.md Phase 3
 * Quality Gates: GI-14 (Performance), GI-17 (Data Accuracy)
 */

import { getSupabaseServerClient } from '@/lib/supabase/edge'
import { parseAbiItem } from 'viem'
import { base } from 'viem/chains'
import { getPublicClient } from '@/lib/contracts/rpc-client-pool'
import { CONTRACT_ADDRESSES, GM_CONTRACT_ABI } from '@/lib/contracts/gmeow-utils'
import { fetchUserByFid } from '@/lib/integrations/neynar'
import {
  getCachedContractData,
  setCachedContractData,
} from '@/lib/cache/contract-cache'

export type LeaderboardScore = {
  address: string
  farcasterFid: number
  basePoints: number         // Quest points from contract
  viralXP: number            // Viral bonuses from badge_casts
  guildBonus: number         // Guild level * 100 (legacy)
  guildBonusPoints: number   // Guild membership bonus: 10% member + 5% officer
  referralBonus: number      // Referral count * 50
  streakBonus: number        // GM streak * 10
  badgePrestige: number      // Badge count * 25
  totalScore: number         // Sum of all above
  rankTier?: string          // Tier name
  globalRank?: number        // Position in leaderboard
  rankChange?: number        // Change from previous period
}

/**
 * Calculate leaderboard score for a given address
 * @param address - User's wallet address
 * @returns LeaderboardScore object with breakdown
 */
export async function calculateLeaderboardScore(
  address: string
): Promise<LeaderboardScore | null> {
  // DEPRECATED: leaderboard_calculations table dropped in Phase 3
  // Use Subsquid API instead: lib/subsquid-client.ts getLeaderboardEntry()
  console.warn('[DEPRECATED] calculateLeaderboardScore() - use Subsquid API instead')
  return null
  
  /* const supabase = getSupabaseServerClient()
  if (!supabase) {
    console.error('Supabase not configured')
    return null
  }

  // 1. Get Farcaster FID
  const { data: userData } = await supabase
    .from('user_profiles')
    .select('fid')
    .eq('wallet_address', address)
    .single()

  if (!userData?.fid) {
    console.error(`No FID found for address: ${address}`)
    return null
  }

  const fid = userData.fid

  // 2. Check contract data cache first
  const cachedContract = await getCachedContractData(address)
  
  let basePoints: number
  let streakBonus: number
  
  if (cachedContract) {
    // Use cached contract data
    basePoints = cachedContract.basePoints
    streakBonus = cachedContract.streakBonus
  } else {
    // Cache miss - fetch from contract
    basePoints = await getQuestPointsFromContract(address)
    streakBonus = await getStreakBonusFromContract(address)
    
    // Cache the result
    await setCachedContractData({
      address,
      basePoints,
      streakBonus,
    })
  }

  // 3. Get viral XP from badge_casts table (not in Database types)
  const { data: viralData } = await (supabase as any)
    .from('badge_casts')
    .select('viral_bonus_xp')
    .eq('fid', fid)

  const viralXP = viralData?.reduce((sum: number, row: any) => sum + (row.viral_bonus_xp || 0), 0) || 0

  // 4. Guild bonus - guild_members table doesn't exist, skip for now
  const guildBonus = 0

  // 4.5. Get guild bonus points (10% member + 5% officer)
  const { data: guildMembershipData } = await supabase
    .from('leaderboard_calculations')
    .select('guild_id, is_guild_officer')
    .eq('address', address)
    .single()

  let guildBonusPoints = 0
  if (guildMembershipData?.guild_id) {
    const baseScore = basePoints + viralXP
    guildBonusPoints = Math.floor(baseScore * 0.1)  // 10% member bonus
    
    if (guildMembershipData.is_guild_officer) {
      guildBonusPoints += Math.floor(baseScore * 0.05)  // +5% officer bonus
    }
  }

  // 5. Get referral count (count * 50) - referral_tracking not in Database types
  const { count: referralCount } = await (supabase as any)
    .from('referral_tracking')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_address', address)

  const referralBonus = (referralCount || 0) * 50

  // 7. Get badge count (count * 25) - badge_ownership not in Database types
  const { count: badgeCount } = await (supabase as any)
    .from('badge_ownership')
    .select('*', { count: 'exact', head: true })
    .eq('address', address)

  const badgePrestige = (badgeCount || 0) * 25

  // Calculate total
  const totalScore =
    basePoints + viralXP + guildBonus + guildBonusPoints + referralBonus + streakBonus + badgePrestige

  return {
    address,
    farcasterFid: fid,
    basePoints,
    viralXP,
    guildBonus,
    guildBonusPoints,
    referralBonus,
    streakBonus,
    badgePrestige,
    totalScore,
  }
  */
}

/**
 * Get quest points from contract QuestCompleted events
 */
async function getQuestPointsFromContract(address: string): Promise<number> {
  try {
    // Phase 8.2.2: Use centralized RPC client pool
    const client = getPublicClient(base.id)

    const contractAddress = CONTRACT_ADDRESSES.base
    const startBlock = BigInt(process.env.CHAIN_START_BLOCK_BASE || '0')
    const latestBlock = await client.getBlockNumber()

    // Parse QuestCompleted event
    const questCompletedEvent = parseAbiItem(
      'event QuestCompleted(uint256 indexed questId, address indexed user, uint256 pointsAwarded, uint256 fid, address rewardToken, uint256 tokenAmount)'
    )

    // Fetch logs in chunks to avoid RPC limits
    const chunkSize = 100000n
    let totalPoints = 0

    for (let fromBlock = startBlock; fromBlock <= latestBlock; fromBlock += chunkSize) {
      const toBlock = fromBlock + chunkSize > latestBlock ? latestBlock : fromBlock + chunkSize

      const logs = await client.getLogs({
        address: contractAddress,
        event: questCompletedEvent,
        args: {
          user: address as `0x${string}`,
        },
        fromBlock,
        toBlock,
      })

      // Sum up points from all completed quests
      for (const log of logs) {
        if (log.args?.pointsAwarded) {
          totalPoints += Number(log.args.pointsAwarded)
        }
      }
    }

    return totalPoints
  } catch (error) {
    console.error('[getQuestPointsFromContract] Error:', error)
    return 0 // Fallback to 0 on error
  }
}

/**
 * Get streak bonus from contract GMEvent reads
 */
async function getStreakBonusFromContract(address: string): Promise<number> {
  try {
    // Phase 8.2.2: Use centralized RPC client pool
    const client = getPublicClient(base.id)

    const contractAddress = CONTRACT_ADDRESSES.base

    // Try to read user profile which includes streak data
    const profile = await client.readContract({
      address: contractAddress,
      abi: GM_CONTRACT_ABI,
      functionName: 'getUserProfile',
      args: [address as `0x${string}`],
    })

    // Profile returns: [name, bio, location, pfpUrl, currentStreak, activeToday, fid]
    if (profile && Array.isArray(profile) && profile.length >= 5) {
      const currentStreak = Number(profile[4]) // currentStreak is 5th element
      return currentStreak * 10 // Streak bonus = streak * 10
    }

    return 0
  } catch (error) {
    console.error('[getStreakBonusFromContract] Error:', error)
    return 0 // Fallback to 0 on error
  }
}

/**
 * Update leaderboard calculations for a specific period
 * @param address - User's wallet address
 * @param period - Time period ('daily', 'weekly', 'all_time')
 * @returns Success status
 */
export async function updateLeaderboardCalculation(
  address: string,
  period: 'daily' | 'weekly' | 'all_time' = 'all_time'
): Promise<boolean> {
  const supabase = getSupabaseServerClient()
  if (!supabase) {
    console.error('Supabase not configured')
    return false
  }
  const score = await calculateLeaderboardScore(address)

  if (!score) {
    console.error(`Failed to calculate score for: ${address}`)
    return false
  }

  // DEPRECATED (Phase 3): leaderboard_calculations table dropped
  // This function is a no-op, kept for backward compatibility
  // Leaderboard data now comes from Subsquid
  console.warn('[leaderboard-scorer] updateLeaderboard DEPRECATED: leaderboard_calculations dropped in Phase 3')
  return true

  /* ORIGINAL CODE (before Phase 3 migration):
  const { getImprovedRankTierByPoints } = await import('@/lib/leaderboard/rank')
  const tier = getImprovedRankTierByPoints(score.totalScore)
  const { error } = await supabase.from('leaderboard_calculations').upsert(...)
  */
}

/**
 * Recalculate global ranks for a period
 * @param period - Time period ('daily', 'weekly', 'all_time')
 * @returns Number of entries updated
 */
export async function recalculateGlobalRanks(
  period: 'daily' | 'weekly' | 'all_time' = 'all_time'
): Promise<number> {
  const supabase = getSupabaseServerClient()
  if (!supabase) {
    console.error('Supabase not configured')
    return 0
  }

  // DEPRECATED (Phase 3): leaderboard_calculations table dropped
  // This function is a no-op, kept for backward compatibility
  // Rank calculation now handled by Subsquid
  console.warn('[leaderboard-scorer] recalculateGlobalRanks DEPRECATED: leaderboard_calculations dropped in Phase 3')
  return 0

  /* ORIGINAL CODE (before Phase 3 migration):
  const { data: entries, error } = await supabase.from('leaderboard_calculations').select(...)
  Calculate rank changes and update entries...
  */
}

/**
 * Get leaderboard entries with pagination
 * @param options - Query options (period, page, perPage, search)
 * @returns Leaderboard entries with pagination metadata
 */
export async function getLeaderboard(options: {
  period?: 'daily' | 'weekly' | 'all_time'
  page?: number
  perPage?: number
  search?: string
  orderBy?: 'total_score' | 'base_points' | 'viral_xp' | 'guild_bonus' | 'referral_bonus' | 'streak_bonus' | 'badge_prestige' | 'tip_points' | 'nft_points'
}) {
  const {
    period = 'all_time',
    page = 1,
    perPage = 15,
    search = '',
    orderBy = 'total_score',
  } = options

  // Fetch from Subsquid (replaces leaderboard_calculations)
  const { getSubsquidClient } = await import('@/lib/subsquid-client')
  const client = getSubsquidClient()
  
  // Calculate pagination
  const offset = (page - 1) * perPage
  const limit = perPage
  
  // Get leaderboard data from Subsquid
  let rawData = await client.getLeaderboard(limit, offset)
  
  // Apply search filter if provided
  if (search) {
    const searchTerm = search.trim().toLowerCase()
    
    // Check if it's a username search (starts with @ or no 0x prefix)
    if (searchTerm.startsWith('@') || (!searchTerm.startsWith('0x') && isNaN(parseInt(searchTerm)))) {
      // Username search - need to resolve FID from Neynar first
      const username = searchTerm.replace('@', '')
      const { fetchUserByUsername } = await import('@/lib/integrations/neynar')
      const neynarUser = await fetchUserByUsername(username)
      
      if (neynarUser?.fid) {
        // Found user - filter by FID
        rawData = rawData.filter(entry => entry.fid === neynarUser.fid)
      } else {
        // User not found - return empty results
        return { data: [], count: 0, page, perPage, totalPages: 0 }
      }
    } else {
      // Address or FID search
      rawData = rawData.filter(entry => 
        entry.wallet?.toLowerCase().includes(searchTerm) ||
        entry.fid?.toString() === searchTerm
      )
    }
  }
  
  // Map Subsquid response to expected format
  const data = rawData.map(entry => ({
    address: entry.wallet,
    farcaster_fid: entry.fid,
    total_score: entry.totalScore || 0,
    base_points: entry.basePoints || 0,
    viral_xp: entry.viralXP || 0,
    guild_bonus: entry.guildBonus || 0,
    guild_bonus_points: entry.guildBonusPoints || 0,
    referral_bonus: entry.referralBonus || 0,
    streak_bonus: entry.streakBonus || 0,
    badge_prestige: entry.badgePrestige || 0,
    tip_points: 0, // Not in Subsquid yet
    nft_points: 0, // Not in Subsquid yet
    global_rank: entry.rank,
    is_guild_officer: entry.isGuildOfficer || false,
    guild_id: entry.guildId,
    guild_name: entry.guildName,
    period: period,
  }))
  
  const count = data.length

  // Enrich data with Neynar usernames and PFPs
  const enrichedData = await Promise.all(
    (data || []).map(async (entry) => {
      // Skip if no FID
      if (!entry.farcaster_fid) {
        return {
          ...entry,
          username: null,
          display_name: null,
          pfp_url: null,
        }
      }

      try {
        const neynarUser = await fetchUserByFid(entry.farcaster_fid)
        return {
          ...entry,
          username: neynarUser?.username || null,
          display_name: neynarUser?.displayName || null,
          pfp_url: neynarUser?.pfpUrl || null,
        }
      } catch (error) {
        console.error(`Failed to fetch Neynar user for FID ${entry.farcaster_fid}:`, error)
        return {
          ...entry,
          username: null,
          display_name: null,
          pfp_url: null,
        }
      }
    })
  )

  return {
    data: enrichedData,
    count: count || 0,
    page,
    perPage,
    totalPages: Math.ceil((count || 0) / perPage),
  }
}
