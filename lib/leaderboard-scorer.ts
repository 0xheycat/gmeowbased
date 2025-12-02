/**
 * Leaderboard Score Calculator
 * Calculates leaderboard scores from on-chain + off-chain sources
 * 
 * Formula: Base Points + Viral XP + Guild Bonus + Referral Bonus + Streak Bonus + Badge Prestige
 * 
 * NO HARDCODED COLORS - Uses Tailwind config only
 * NO EMOJIS - Uses icon references only
 */

import { getSupabaseServerClient } from '@/lib/supabase-server'
import { createPublicClient, http, parseAbiItem } from 'viem'
import { base } from 'viem/chains'
import { CONTRACT_ADDRESSES, GM_CONTRACT_ABI } from '@/lib/gmeow-utils'
import { fetchUserByFid } from '@/lib/neynar'

export type LeaderboardScore = {
  address: string
  farcasterFid: number
  basePoints: number         // Quest points from contract
  viralXP: number            // Viral bonuses from badge_casts
  guildBonus: number         // Guild level * 100
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
  const supabase = getSupabaseServerClient()
  if (!supabase) {
    console.error('Supabase not configured')
    return null
  }

  // 1. Get Farcaster FID
  const { data: userData } = await supabase
    .from('user_profiles')
    .select('farcaster_fid')
    .eq('address', address)
    .single()

  if (!userData?.farcaster_fid) {
    console.error(`No FID found for address: ${address}`)
    return null
  }

  const fid = userData.farcaster_fid

  // 2. Get on-chain quest points (from contract events)
  const basePoints = await getQuestPointsFromContract(address)

  // 3. Get viral XP from badge_casts table
  const { data: viralData } = await supabase
    .from('badge_casts')
    .select('viral_bonus_xp')
    .eq('fid', fid)

  const viralXP = viralData?.reduce((sum, row) => sum + (row.viral_bonus_xp || 0), 0) || 0

  // 4. Get guild bonus (guild level * 100)
  const { data: guildData } = await supabase
    .from('guild_members')
    .select('guild_level')
    .eq('address', address)
    .single()

  const guildBonus = (guildData?.guild_level || 0) * 100

  // 5. Get referral count (count * 50)
  const { count: referralCount } = await supabase
    .from('referral_tracking')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_address', address)

  const referralBonus = (referralCount || 0) * 50

  // 6. Get GM streak (streak * 10)
  const streakBonus = await getStreakBonusFromContract(address)

  // 7. Get badge count (count * 25)
  const { count: badgeCount } = await supabase
    .from('badge_ownership')
    .select('*', { count: 'exact', head: true })
    .eq('address', address)

  const badgePrestige = (badgeCount || 0) * 25

  // Calculate total
  const totalScore =
    basePoints + viralXP + guildBonus + referralBonus + streakBonus + badgePrestige

  return {
    address,
    farcasterFid: fid,
    basePoints,
    viralXP,
    guildBonus,
    referralBonus,
    streakBonus,
    badgePrestige,
    totalScore,
  }
}

/**
 * Get quest points from contract QuestCompleted events
 */
async function getQuestPointsFromContract(address: string): Promise<number> {
  try {
    const rpcUrl = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_BASE || 'https://mainnet.base.org'
    const client = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    })

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
    const rpcUrl = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_BASE || 'https://mainnet.base.org'
    const client = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    })

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

  // Get rank tier name
  const { getImprovedRankTierByPoints } = await import('@/lib/rank')
  const tier = getImprovedRankTierByPoints(score.totalScore)

  // Upsert into leaderboard_calculations
  const { error } = await supabase.from('leaderboard_calculations').upsert(
    {
      address: score.address,
      farcaster_fid: score.farcasterFid,
      base_points: score.basePoints,
      viral_xp: score.viralXP,
      guild_bonus: score.guildBonus,
      referral_bonus: score.referralBonus,
      streak_bonus: score.streakBonus,
      badge_prestige: score.badgePrestige,
      rank_tier: tier.name,
      period,
    },
    {
      onConflict: 'address,period',
    }
  )

  if (error) {
    console.error(`Failed to update leaderboard: ${error.message}`)
    return false
  }

  return true
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

  // Get all entries sorted by total_score DESC
  const { data: entries, error } = await supabase
    .from('leaderboard_calculations')
    .select('address, total_score, global_rank')
    .eq('period', period)
    .order('total_score', { ascending: false })

  if (error || !entries) {
    console.error(`Failed to fetch leaderboard entries: ${error?.message}`)
    return 0
  }

  // Calculate rank changes and update
  let updateCount = 0
  for (let i = 0; i < entries.length; i++) {
    const newRank = i + 1
    const oldRank = entries[i].global_rank || newRank
    const rankChange = oldRank - newRank // Positive = moved up

    await supabase
      .from('leaderboard_calculations')
      .update({
        global_rank: newRank,
        rank_change: rankChange,
      })
      .eq('address', entries[i].address)
      .eq('period', period)

    updateCount++
  }

  return updateCount
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
}) {
  const supabase = getSupabaseServerClient()
  if (!supabase) {
    console.error('Supabase not configured')
    return { data: [], count: 0, page: 1, perPage: 15, totalPages: 0 }
  }
  const {
    period = 'all_time',
    page = 1,
    perPage = 15,
    search = '',
  } = options

  let query = supabase
    .from('leaderboard_calculations')
    .select('*', { count: 'exact' })
    .eq('period', period)
    .order('total_score', { ascending: false })

  // Apply search filter if provided
  if (search) {
    query = query.or(`address.ilike.%${search}%,farcaster_fid.eq.${parseInt(search) || 0}`)
  }

  // Apply pagination
  const start = (page - 1) * perPage
  const end = start + perPage - 1
  query = query.range(start, end)

  const { data, error, count } = await query

  if (error) {
    console.error(`Failed to fetch leaderboard: ${error.message}`)
    return { data: [], count: 0, page, perPage, totalPages: 0 }
  }

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
