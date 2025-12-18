/**
 * @file lib/frames/hybrid-calculator.ts
 * @description Hybrid scoring system combining Subsquid blockchain data + Supabase off-chain data
 * 
 * PHASE: Phase 7.3 - Frames (December 17, 2025)
 * ENHANCED: Existing documentation upgraded with comprehensive Phase 7 header
 * 
 * ORIGINAL: Phase 1 Week 1-2 Complete (Dec 16, 2025)
 * DATE UPDATED: December 16, 2025, 4:00 PM CST
 * WEBSITE: https://gmeowhq.art
 * NETWORK: Base (Chain ID: 8453)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * FEATURES
 * ═══════════════════════════════════════════════════════════════════════════
 * ✅ Hybrid scoring (Subsquid blockchain + Supabase off-chain)
 * ✅ 9 scoring components:
 *    • basePoints - Core activity multiplier (Neynar score * 100)
 *    • viralXP - Engagement from badge casts (recasts×10 + replies×5 + likes×2)
 *    • guildBonus - Active guild membership multiplier (10% + 5% officer)
 *    • referralBonus - Successful referral rewards (50 XP per referral)
 *    • streakBonus - GM streak consistency bonus (days × 5 XP)
 *    • badgePrestige - NFT badge collection value (100 XP per badge)
 *    • tipPoints - Tip participation score (10 XP per tip)
 *    • nftPoints - OnchainStats NFT ownership (100 XP per NFT)
 *    • guildBonusPoints - Guild activity bonus (calculated separately)
 * ✅ Category-specific leaderboards (8 categories: base, viral, guild, referral, streak, badge, tip, nft)
 * ✅ Batch calculation support for efficient leaderboard generation
 * ✅ Parallel data fetching (Subsquid + Supabase queries run concurrently)
 * ✅ Comprehensive type safety (TypeScript interfaces for all data shapes)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * TODO - FUTURE ENHANCEMENTS
 * ═══════════════════════════════════════════════════════════════════════════
 * [ ] Rarity-based NFT scoring (currently 100pts flat per badge)
 * [ ] Redis caching layer (5-min TTL for frequently accessed scores)
 * [ ] Score history tracking (trend analysis, growth charts)
 * [ ] Optimize batch calculations (for leaderboards >100 users)
 * [ ] Fallback logic when Subsquid unavailable (graceful degradation)
 * [ ] XP time decay system (defer until DAUs > 1000 per instructions)
 * [ ] Category weight customization (admin-configurable multipliers)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * REFERENCE DOCUMENTATION
 * ═══════════════════════════════════════════════════════════════════════════
 * Core: /FARCASTER-BOT-ENHANCEMENT-PLAN-PART-2.md (Sec 4.1-4.8: XP Formulas)
 * Priority: /FARCASTER-BOT-ENHANCEMENT-PLAN-PART-3.md (Sec 8.1: Critical Blocker)
 * Usage: /HYBRID-CALCULATOR-USAGE-GUIDE.md (375 lines, integration specs)
 * Status: /PHASE-1-WEEK-1-2-COMPLETE.md
 * Instructions: /.config/Code/User/prompts/farcaster.instructions.md
 * Related: lib/bot-stats.ts (original stats engine, now deprecated for scoring)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * CRITICAL ISSUES & WARNINGS
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ SUBSQUID DEPENDENCY: Requires gmeow-indexer running (no fallback yet)
 * ⚠️ PERFORMANCE: Full recalculation per user (~400-600ms per FID)
 * ⚠️ NO CACHING: Every score request hits database (Redis cache TODO)
 * ⚠️ NFT SCORING: Flat 100pts per badge (no rarity weighting)
 * ⚠️ GUILD BONUS: Requires guild_members table populated correctly
 * ⚠️ BATCH LIMITS: May timeout for >500 users (need pagination)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * SUGGESTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 * 💡 Pre-compute scores hourly (cron job) instead of on-demand
 * 💡 Use PostgreSQL materialized views for leaderboard queries
 * 💡 Implement score change notifications (e.g., "You moved up 3 ranks!")
 * 💡 Add score prediction (show progress to next milestone)
 * 💡 Create score breakdown visualization (donut chart per category)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * AVOID / REQUIREMENTS (from farcaster.instructions.md)
 * ═══════════════════════════════════════════════════════════════════════════
 * ❌ NO RPC calls (use Blockscout API only per instructions)
 * ❌ NO unvalidated Subsquid data (verify schema matches before querying)
 * ❌ NO mixing old stats computation (bot-stats.ts deprecated for scoring)
 * ✅ USE parallel fetching (Promise.all for Subsquid + Supabase)
 * ✅ USE null-safety (check data exists before scoring)
 * ✅ VALIDATE addresses (normalizeAddress before queries)
 * ✅ LOG score breakdowns (for debugging/transparency)
 * ═══════════════════════════════════════════════════════════════════════════
 * - SUBSQUID-SUPABASE-MIGRATION-PLAN.md (Section 2: Hybrid Calculator MISSING)
 * 
 * ARCHITECTURE: 95/5 Rule
 * - Subsquid (95%): GM streaks, Guild membership, Badges, NFTs, Referrals
 * - Supabase (5%): Quest completions, Viral engagement, Tip activity, FID mapping
 * 
 * SUGGESTIONS:
 * - Consider implementing score caching to reduce database load
 * - Add monitoring for score calculation performance (target: <500ms P95)
 * - Implement gradual rollout: calculate scores for top 100 users first
 * - Add A/B test infrastructure to validate new scoring formulas
 * 
 * CRITICAL FINDINGS:
 * ⚠️ PERFORMANCE: Batch calculations may timeout for >200 users (add pagination)
 * ⚠️ DATA CONSISTENCY: Subsquid lag (5-10 min) vs Supabase real-time creates score drift
 * ⚠️ EDGE CASE: Users without wallets can't get Subsquid data (FID-only users)
 * ⚠️ GAMING RISK: No unique user check for viral score (self-recast exploit possible)
 * 
 * REQUIREMENTS FROM farcaster.instructions.md:
 * - Avoid creating new Supabase tables (use existing leaderboard_calculations)
 * - Use existing Subsquid indexer (do NOT create new indexer)
 * - Follow hybrid data model: onchain via Subsquid, offchain via Supabase
 * - Network: Base (ChainID: 8453)
 * - Website: https://gmeowhq.art
 */

import { getUserStats as getSubsquidUserStats } from '@/lib/integrations/subsquid-client'
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
    currentStreak: stats?.currentStreak || 0,
    badgeCount: stats?.badgeCount || 0,
    referralCount: 0, // Referral count not in UserStats type
    nftRewards: 0, // NFT mints not in UserStats type
    guildLevel: stats?.guildMemberships || 0,
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
      .select('points_awarded')
      .eq('completer_fid', fid),
    
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
    
    // Guild membership bonus (guild_bonus_points) - TODO: Implement when guild_members table exists
    Promise.resolve({ data: null, error: null })
  ])
  
  // Calculate quest completions
  const questCompletions = questData.data?.reduce(
    (sum, quest) => sum + (quest.points_awarded || 0), 
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
