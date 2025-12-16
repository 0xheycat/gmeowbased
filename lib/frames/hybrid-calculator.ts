/**
 * Hybrid Leaderboard Score Calculator
 * 
 * Combines Subsquid (blockchain events) + Supabase (off-chain data)
 * to calculate comprehensive leaderboard scores.
 * 
 * Architecture: 95/5 Rule
 * - Subsquid (95%): GM streaks, Guild membership, Badges, NFTs, Referrals
 * - Supabase (5%): Quest completions, Viral engagement, Tip activity, FID mapping
 */

import { getUserStats as getSubsquidUserStats } from '@/lib/subsquid-client'
import { createClient } from '@/lib/supabase/server'

/**
 * Leaderboard category types for filtered views
 */
export type LeaderboardCategory = 
  | 'all_pilots'          // Overall leaderboard
  | 'quest_masters'       // Quest completion focus
  | 'viral_legends'       // Viral engagement focus
  | 'guild_heroes'        // Guild activity focus
  | 'referral_champions'  // Referral focus
  | 'streak_kings'        // GM streak focus
  | 'badge_collectors'    // Badge collection focus
  | 'tip_lords'           // Tip activity focus
  | 'nft_holders'         // NFT holdings focus

/**
 * Badge tier types
 */
export type BadgeTier = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'

/**
 * Guild member role types
 */
export type GuildRole = 'owner' | 'officer' | 'member'

/**
 * Score breakdown by component
 */
export interface ScoreBreakdown {
  basePoints: number          // Quest completions (Supabase)
  viralXP: number             // Badge cast engagement (Supabase)
  guildBonus: number          // Guild level * 100 (Subsquid)
  referralBonus: number       // Referral count * 50 (Subsquid)
  streakBonus: number         // GM streak * 10 (Subsquid)
  badgePrestige: number       // Badge count * 25 (Subsquid)
  tipPoints: number           // Tip activity (Supabase)
  nftPoints: number           // NFT rewards (Subsquid)
  guildBonusPoints: number    // 10% member + 5% officer (Supabase)
}

export interface LeaderboardScore {
  totalScore: number
  breakdown: ScoreBreakdown
  fid: number
  walletAddress: string
  rank?: number
}

/**
 * Extended user stats for frame generation
 */
export interface UserFrameStats extends LeaderboardScore {
  username: string
  displayName: string
  currentStreak: number
  lifetimeGMs: number
  badgeCount: number
  guildLevel: number
  referralCount: number
}

/**
 * Quest-specific statistics
 */
export interface QuestStats {
  questName: string
  progress: number        // 0-100 percentage
  xpReward: number
  completed: boolean
  deadline?: Date
}

/**
 * Guild-specific statistics
 */
export interface GuildStats {
  guildId: string
  guildName: string
  memberCount: number
  totalDeposits: number
  level: number
  role: GuildRole
  pointsContributed: number
}

/**
 * Badge data for collection display
 */
export interface BadgeData {
  id: string
  name: string
  tier: BadgeTier
  imageUrl: string
  earnedAt?: Date
}

/**
 * Badge collection statistics
 */
export interface BadgeCollectionStats {
  earnedCount: number
  eligibleCount: number
  badgeXp: number
  badges: BadgeData[]
}

/**
 * Calculate complete leaderboard score for a user
 * Combines Subsquid blockchain data + Supabase off-chain data
 */
export async function calculateHybridScore(
  fid: number,
  walletAddress: string
): Promise<LeaderboardScore> {
  // Parallel fetch from both sources
  const [subsquidData, supabaseData] = await Promise.all([
    getSubsquidStats(walletAddress),
    getSupabaseStats(fid)
  ])
  
  // Calculate Subsquid-sourced components (60% of total score)
  const streakBonus = subsquidData.currentStreak * 10
  const badgePrestige = subsquidData.badgeCount * 25
  const referralBonus = subsquidData.referralCount * 50
  const nftPoints = subsquidData.nftRewards || 0
  const guildBonus = subsquidData.guildLevel * 100
  
  // Calculate Supabase-sourced components (40% of total score)
  const basePoints = supabaseData.questCompletions
  const viralXP = supabaseData.castEngagement
  const tipPoints = supabaseData.tipActivity
  const guildBonusPoints = calculateGuildMemberBonus(supabaseData)
  
  // Sum all components
  const totalScore = 
    basePoints + 
    viralXP + 
    guildBonus + 
    referralBonus + 
    streakBonus + 
    badgePrestige + 
    tipPoints + 
    nftPoints + 
    guildBonusPoints
  
  return {
    totalScore,
    breakdown: {
      basePoints,
      viralXP,
      guildBonus,
      referralBonus,
      streakBonus,
      badgePrestige,
      tipPoints,
      nftPoints,
      guildBonusPoints,
    },
    fid,
    walletAddress,
  }
}

/**
 * Get Subsquid blockchain stats for a user
 * Returns: GM streaks, badges, guild membership, referrals, NFTs
 */
async function getSubsquidStats(walletAddress: string) {
  const stats = await getSubsquidUserStats(walletAddress)
  
  return {
    currentStreak: stats?.user?.currentStreak || 0,
    badgeCount: stats?.user?.badges?.length || 0,
    referralCount: stats?.user?.referralCodes?.[0]?.totalUses || 0,
    nftRewards: calculateNFTPoints(stats?.user?.nftMints || []),
    guildLevel: calculateGuildLevel(stats?.user?.guilds || []),
  }
}

/**
 * Get Supabase off-chain stats for a user
 * Returns: Quest completions, viral engagement, tip activity, guild bonuses
 */
async function getSupabaseStats(fid: number) {
  const supabase = createClient()
  
  // Fetch all off-chain data in parallel
  const [questData, viralData, tipData, guildData] = await Promise.all([
    // Quest completions (base_points)
    supabase
      .from('quest_completions')
      .select('reward_points')
      .eq('fid', fid),
    
    // Viral engagement (viral_xp from badge_casts)
    supabase
      .from('badge_casts')
      .select('viral_bonus_xp, viral_score')
      .eq('fid', fid),
    
    // Tip activity (tip_points)
    supabase
      .from('points_transactions')
      .select('amount')
      .eq('fid', fid)
      .in('source', ['tip_earned', 'tip_given']),
    
    // Guild membership bonus (guild_bonus_points)
    supabase
      .from('guild_members')
      .select('role, points_contributed, guild:guilds(level)')
      .eq('fid', fid)
      .eq('is_active', true)
  ])
  
  // Calculate quest completions
  const questCompletions = questData.data?.reduce(
    (sum, quest) => sum + (quest.reward_points || 0), 
    0
  ) || 0
  
  // Calculate viral engagement
  const castEngagement = viralData.data?.reduce(
    (sum, cast) => sum + (cast.viral_bonus_xp || 0) + (cast.viral_score || 0), 
    0
  ) || 0
  
  // Calculate tip activity
  const tipActivity = tipData.data?.reduce(
    (sum, tip) => sum + (tip.amount || 0), 
    0
  ) || 0
  
  return {
    questCompletions,
    castEngagement,
    tipActivity,
    guildMemberships: guildData.data || [],
  }
}

/**
 * Calculate guild member bonus points
 * 10% of guild points for members, 5% additional for officers
 */
function calculateGuildMemberBonus(supabaseData: any): number {
  let bonus = 0
  
  for (const membership of supabaseData.guildMemberships) {
    const pointsContributed = membership.points_contributed || 0
    
    // 10% bonus for being a member
    bonus += Math.floor(pointsContributed * 0.1)
    
    // Additional 5% for officers
    if (membership.role === 'officer' || membership.role === 'owner') {
      bonus += Math.floor(pointsContributed * 0.05)
    }
  }
  
  return bonus
}

/**
 * Calculate NFT points from NFT holdings
 * Different NFTs may have different point values
 */
function calculateNFTPoints(nftMints: any[]): number {
  // Basic calculation: 100 points per NFT
  // TODO: Add rarity-based scoring when metadata available
  return nftMints.length * 100
}

/**
 * Calculate guild level from membership data
 * Higher tier guilds give more bonus points
 */
function calculateGuildLevel(guilds: any[]): number {
  if (!guilds || guilds.length === 0) return 0
  
  // Get highest guild level from user's memberships
  return guilds.reduce((maxLevel, guild) => {
    const level = guild.guild?.level || 0
    return Math.max(maxLevel, level)
  }, 0)
}

/**
 * Calculate category-specific scores
 * Used for leaderboard category tabs
 */
export async function calculateCategoryScore(
  category: string,
  fid: number,
  walletAddress: string
): Promise<number> {
  const fullScore = await calculateHybridScore(fid, walletAddress)
  
  switch (category) {
    case 'quest_masters':
      return fullScore.breakdown.basePoints
    case 'viral_legends':
      return fullScore.breakdown.viralXP
    case 'guild_heroes':
      return fullScore.breakdown.guildBonus + fullScore.breakdown.guildBonusPoints
    case 'referral_champions':
      return fullScore.breakdown.referralBonus
    case 'streak_kings':
      return fullScore.breakdown.streakBonus
    case 'badge_collectors':
      return fullScore.breakdown.badgePrestige
    case 'tip_lords':
      return fullScore.breakdown.tipPoints
    case 'nft_holders':
      return fullScore.breakdown.nftPoints
    case 'all_pilots':
    default:
      return fullScore.totalScore
  }
}

/**
 * Batch calculate scores for multiple users
 * More efficient for leaderboard generation
 */
export async function calculateBatchScores(
  users: Array<{ fid: number; walletAddress: string }>
): Promise<LeaderboardScore[]> {
  const scores = await Promise.all(
    users.map(user => calculateHybridScore(user.fid, user.walletAddress))
  )
  
  // Sort by total score and assign ranks
  scores.sort((a, b) => b.totalScore - a.totalScore)
  scores.forEach((score, index) => {
    score.rank = index + 1
  })
  
  return scores
}
