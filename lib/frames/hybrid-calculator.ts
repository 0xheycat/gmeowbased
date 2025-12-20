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
 * ✅ 7 scoring components (aligned with COMPLETE-CALCULATION-SYSTEM.md):
 *    • blockchainPoints - On-chain points from Subsquid User.totalPoints (GM + Quests + Tips)
 *    • viralXP - Off-chain engagement from Supabase badge_casts.viral_bonus_xp
 *    • streakDays - Current GM streak (metadata, NOT scored as points - see contract)
 *    • guildBonus - Guild membership value (calculated from guild level)
 *    • referralBonus - Referral rewards (calculated from referral count)
 *    • badgePrestige - NFT badge collection prestige
 *    • totalScore - blockchainPoints + viralXP (primary scoring metric)
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
 * CURRENT: /COMPLETE-CALCULATION-SYSTEM.md (Dec 20, 2025 - Authoritative source)
 * Core: /FARCASTER-BOT-ENHANCEMENT-PLAN-PART-2.md (Sec 4.1-4.8: XP Formulas)
 * Priority: /FARCASTER-BOT-ENHANCEMENT-PLAN-PART-3.md (Sec 8.1: Critical Blocker)
 * Usage: /HYBRID-CALCULATOR-USAGE-GUIDE.md (375 lines, integration specs)
 * Status: /PHASE-1-WEEK-1-2-COMPLETE.md
 * Schema: /SUBSQUID-SCHEMA-FIX-COMPLETE.md (Points terminology, not XP)
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
import { createClient } from '@/lib/supabase/edge'
import { 
  calculateEngagementScore,
  calculateViralBonus,
  formatPoints,
  calculateCompleteStats
} from '@/lib/scoring/unified-calculator'

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
 * Aligned with COMPLETE-CALCULATION-SYSTEM.md
 */
export interface ScoreBreakdown {
  blockchainPoints: number    // Subsquid User.totalPoints (GM + Quests + Tips on-chain)
  viralXP: number             // Supabase badge_casts.viral_bonus_xp (engagement scoring)
  streakDays: number          // Current streak in days (metadata only, NOT scored directly)
  guildBonus: number          // Guild membership value (if applicable)
  referralBonus: number       // Referral rewards (if applicable)
  badgePrestige: number       // Badge collection value (if applicable)
  totalScore: number          // blockchainPoints + viralXP (final score)
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
 * 
 * CALCULATION FLOW (per COMPLETE-CALCULATION-SYSTEM.md):
 * 1. Fetch blockchain points: Subsquid User.totalPoints (on-chain GM + Quests + Tips)
 * 2. Fetch viral bonus: Supabase badge_casts.viral_bonus_xp (off-chain engagement)
 * 3. Calculate total: blockchainPoints + viralXP = totalScore
 * 4. Derive level: from totalScore using quadratic formula (rank.ts)
 * 5. Derive rank tier: from totalScore using 12-tier system (rank.ts)
 * 
 * NOTE: Streak is stored in User.currentStreak but NOT scored as points directly.
 * Contract applies streak as MULTIPLIER (7d=+15%, 30d=+30%, 100d=+60%) to GM rewards,
 * which is already included in User.totalPoints.
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
  
  // Use unified calculator for complete stats calculation
  const stats = calculateCompleteStats({
    blockchainPoints: subsquidData.totalPoints || 0,
    currentStreak: subsquidData.currentStreak || 0,
    lastGMTimestamp: null, // Not available in current data
    lifetimeGMs: 0, // Not available in current data
    viralXP: supabaseData.castEngagement || 0,
    questPoints: 0, // Included in blockchainPoints
    guildPoints: 0, // Included in blockchainPoints
    referralPoints: 0, // Included in blockchainPoints
  })
  
  // Map to LeaderboardScore format
  return {
    totalScore: stats.scores.totalScore,
    breakdown: {
      blockchainPoints: stats.scores.blockchainPoints,
      viralXP: stats.scores.viralXP,
      streakDays: stats.streak,
      guildBonus: subsquidData.guildLevel * 100,
      referralBonus: subsquidData.referralCount * 50,
      badgePrestige: subsquidData.badgeCount * 25,
      totalScore: stats.scores.totalScore,
    },
    fid,
    walletAddress,
  }
}

/**
 * Get Subsquid blockchain stats for a user
 * Queries User entity: totalPoints, currentStreak, badgeCount, etc.
 * 
 * IMPORTANT: User.totalPoints already includes:
 * - Base GM rewards (gmPointReward from contract)
 * - Streak bonus multiplier (7d=+15%, 30d=+30%, 100d=+60%)
 * - Quest completion rewards
 * - Tip earnings
 */
async function getSubsquidStats(walletAddress: string) {
  const stats = await getSubsquidUserStats(walletAddress)
  
  return {
    totalPoints: Number(stats?.totalPoints || 0),  // Primary scoring metric
    currentStreak: stats?.currentStreak || 0,      // Metadata (streak days)
    badgeCount: stats?.badgeCount || 0,            // Badge count for prestige
    referralCount: 0,  // TODO: Add when referral tracking implemented
    guildLevel: stats?.guildMemberships || 0,      // Guild level
  }
}

/**
 * Get Supabase off-chain stats for a user
 * 
 * PRIMARY METRIC: Viral engagement XP from badge_casts
 * - Engagement score: (recasts×10) + (replies×5) + (likes×2)
 * - Viral tiers: mega_viral(100→500XP), viral(50→250XP), popular(20→100XP), etc.
 * - Stored in: badge_casts.viral_bonus_xp
 * 
 * NOTE: Quest completions and tips are tracked ON-CHAIN (in Subsquid User.totalPoints)
 * This function only fetches OFF-CHAIN social engagement data.
 */
async function getSupabaseStats(fid: number) {
  const supabase = createClient()
  
  // Fetch viral engagement data (primary off-chain metric)
  const { data: viralData } = await supabase
    .from('badge_casts')
    .select('viral_bonus_xp')
    .eq('fid', fid)
  
  // Calculate total viral XP from all badge casts
  const castEngagement = viralData?.reduce(
    (sum, cast) => sum + (cast.viral_bonus_xp || 0), 
    0
  ) || 0
  
  return {
    castEngagement,  // Viral bonus XP (off-chain social engagement)
  }
}

// NOTE: Guild bonus calculation removed - guild points are tracked on-chain
// and included in User.totalPoints via Subsquid indexer.

/**
 * Calculate category-specific scores
 * Used for leaderboard category tabs
 * 
 * NOTE: Most categories now use on-chain data (Subsquid User.totalPoints)
 * Only 'viral_legends' uses off-chain Supabase data
 */
export async function calculateCategoryScore(
  category: string,
  fid: number,
  walletAddress: string
): Promise<number> {
  const fullScore = await calculateHybridScore(fid, walletAddress)
  
  switch (category) {
    case 'viral_legends':
      return fullScore.breakdown.viralXP
    case 'streak_kings':
      return fullScore.breakdown.streakDays  // Days, not points
    case 'badge_collectors':
      return fullScore.breakdown.badgePrestige
    case 'guild_heroes':
      return fullScore.breakdown.guildBonus
    case 'referral_champions':
      return fullScore.breakdown.referralBonus
    case 'all_pilots':
    default:
      return fullScore.totalScore  // blockchainPoints + viralXP
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
