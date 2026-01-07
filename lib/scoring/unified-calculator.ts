/**
 * @file lib/scoring/unified-calculator.ts
 * @description SINGLE SOURCE OF TRUTH for all scoring calculations
 * 
 * Created: December 20, 2025
 * Purpose: Unified scoring engine consolidating ALL calculation logic from:
 *   - lib/leaderboard/rank.ts (Level progression, 12-tier ranks, multipliers)
 *   - lib/viral/viral-bonus.ts (Viral engagement scoring & XP tiers)
 *   - lib/profile/stats-calculator.ts (Display formatting & derived stats)
 *   - lib/profile/profile-service.ts (Data aggregation orchestration)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 3-LAYER ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * LAYER 1 (Blockchain - Subsquid Indexer):
 *   - GM rewards (with streak multiplier applied in contract)
 *   - GM streak tracking (User.currentStreak)
 *   - NFT badge ownership (minted badges)
 *   - Guild membership (guild join events)
 *   Storage: Subsquid User.totalPoints
 * 
 * LAYER 2 (Off-Chain - Supabase Database):
 *   - Quest completions (user_quest_progress table, via website)
 *   - Viral bonus XP (badge_casts.viral_bonus_xp, from engagement)
 *   - Guild activity (guild_members table, via website)
 *   - Referral rewards (referrals table, via bot API calls)
 *   Storage: Supabase tables (badge_casts, user_quest_progress, etc)
 * 
 * LAYER 3 (Application Logic - This File):
 *   - Total score calculation: Layer1 + Layer2
 *   - Level progression: Quadratic formula from total score
 *   - Rank tier assignment: 12-tier system based on total score
 *   - Multiplier application: Rank-based XP multipliers
 *   - Display formatting: Human-readable numbers & stats
 *   Computation: Real-time in profile-service.ts
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * COMPLETE CALCULATION FLOW
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 1. FETCH LAYER 1 (Blockchain):
 *    pointsBalance = Subsquid User.pointsBalance (GM rewards)
 * 
 * 2. FETCH LAYER 2 (Off-Chain):
 *    viralPoints = SUM(badge_casts.viral_bonus_xp)
 *    questPoints = SUM(user_quest_progress.points)
 *    guildPoints = SUM(guild_activity.points)
 *    referralPoints = SUM(referrals.points)
 * 
 * 3. CALCULATE TOTAL SCORE:
 *    totalScore = pointsBalance + viralPoints + questPoints + guildPoints + referralPoints
 * 
 * 4. DERIVE LEVEL:
 *    level = calculateLevelProgress(totalScore)
 *    Formula: Quadratic progression (300 + n×200 XP per level)
 * 
 * 5. DERIVE RANK TIER:
 *    rankTier = getRankTierByPoints(totalScore)
 *    System: 12 tiers from Signal Kitten (0) to Omniversal Being (500K+)
 * 
 * 6. APPLY MULTIPLIERS:
 *    finalXP = applyRankMultiplier(baseXP, totalScore)
 *    Multipliers: 1.1x to 2.0x based on rank tier
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * REFERENCE DOCUMENTATION
 * ═══════════════════════════════════════════════════════════════════════════
 * - COMPLETE-CALCULATION-SYSTEM.md (Full system documentation)
 * - contract/modules/BaseModule.sol (Streak multiplier logic)
 * - contract/libraries/CoreLogicLib.sol (GM reward calculation)
 * - gmeow-indexer/src/main.ts (Event indexing)
 * - lib/profile/profile-service.ts (Data orchestration)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * CRITICAL RULES
 * ═══════════════════════════════════════════════════════════════════════════
 * ✅ ALL scoring calculations MUST go through this file
 * ✅ NO calculations should be duplicated in other files
 * ✅ ALL formulas must match contract logic (streak multipliers, etc)
 * ✅ ALL tier thresholds are immutable (no runtime changes)
 * ❌ NO direct database writes (read-only calculations)
 * ❌ NO mixing XP/Points terminology (use Points everywhere)
 * ❌ NO emojis in calculation logic (icons only)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { clamp } from '@/lib/utils/utils'
import { STANDALONE_ADDRESSES } from '@/lib/contracts/gmeow-utils'
import { SCORING_ABI } from '@/lib/contracts/abis'
import { getPublicClient } from '@/lib/contracts/rpc-client-pool'

// Dynamic import helpers for server-only cache module
// This prevents server-only code from being bundled to client
async function getCachedSafe<T>(
  namespace: string,
  key: string,
  factory: () => Promise<T>,
  options?: { ttl?: number; staleWhileRevalidate?: boolean; force?: boolean }
): Promise<T> {
  if (typeof window !== 'undefined') {
    // Client-side: bypass cache, call factory directly
    return factory()
  }
  const { getCached } = await import('@/lib/cache/server')
  return getCached(namespace, key, factory, options)
}

async function invalidateCacheSafe(...args: Parameters<typeof import('@/lib/cache/server').invalidateCache>) {
  if (typeof window !== 'undefined') {
    return // Client-side: no-op
  }
  const { invalidateCache } = await import('@/lib/cache/server')
  return invalidateCache(...args)
}

// ============================================================================
// VIEM CLIENT (Phase 8.2 - Connection Pooling)
// ============================================================================
// Uses pooled RPC client instead of creating new instances
// This prevents RPC rate limiting and connection pool exhaustion

// ============================================================================
// PERFORMANCE MONITORING (Phase 8.3 - Production-Grade Enhancements)
// ============================================================================
// Track RPC call latency and cache performance
const performanceMetrics = {
  rpcCalls: 0,
  cacheHits: 0,
  cacheMisses: 0,
  avgLatency: 0,
  lastReset: Date.now(),
}

function trackRPCCall(startTime: number) {
  const latency = Date.now() - startTime
  performanceMetrics.rpcCalls++
  performanceMetrics.avgLatency = 
    (performanceMetrics.avgLatency * (performanceMetrics.rpcCalls - 1) + latency) / performanceMetrics.rpcCalls
}

function trackCacheHit() {
  performanceMetrics.cacheHits++
}

function trackCacheMiss() {
  performanceMetrics.cacheMisses++
}

/**
 * Get performance metrics for scoring operations
 * Useful for monitoring RPC call frequency and cache efficiency
 */
export function getScoringPerformanceMetrics() {
  const totalCacheAttempts = performanceMetrics.cacheHits + performanceMetrics.cacheMisses
  return {
    ...performanceMetrics,
    cacheHitRate: totalCacheAttempts > 0 
      ? (performanceMetrics.cacheHits / totalCacheAttempts * 100).toFixed(2) + '%'
      : 'N/A',
    uptime: ((Date.now() - performanceMetrics.lastReset) / 1000 / 60).toFixed(2) + ' minutes',
  }
}

/**
 * Reset performance metrics
 */
export function resetScoringMetrics() {
  performanceMetrics.rpcCalls = 0
  performanceMetrics.cacheHits = 0
  performanceMetrics.cacheMisses = 0
  performanceMetrics.avgLatency = 0
  performanceMetrics.lastReset = Date.now()
}

// ============================================================================
// TYPES
// ============================================================================

export type RankTier = {
  name: string
  minPoints: number
  maxPoints?: number
  tagline: string
  tier?: 'beginner' | 'intermediate' | 'advanced' | 'legendary' | 'mythic'
  icon?: string
  colorClass?: string
  bgClass?: string
  reward?: {
    type: 'badge' | 'multiplier' | 'exclusive'
    name?: string
    value?: number
    label?: string
  }
}

export type LevelProgress = {
  level: number
  levelFloor: number
  nextLevelTarget: number
  xpIntoLevel: number
  xpForLevel: number
  xpToNextLevel: number
  levelPercent: number
}

export type RankProgress = LevelProgress & {
  currentTier: RankTier
  nextTier?: RankTier
  percent: number
  currentFloor: number
  nextTarget: number
  pointsIntoTier: number
  pointsToNext: number
}

export type ViralTier = 'mega_viral' | 'viral' | 'popular' | 'engaging' | 'active' | 'none'

export type EngagementMetrics = {
  likes: number
  recasts: number
  replies: number
}

export type ViralTierConfig = {
  name: string
  emoji: string
  xp: number
  minScore: number
  color: string
}

export type TotalScore = {
  pointsBalance: number      // Layer 1: Subsquid User.pointsBalance (blockchain state)
  viralPoints: number        // Layer 2: SUM(badge_casts.viral_bonus_xp) - XP progression
  questPoints: number        // Layer 2: SUM(user_quest_progress.points)
  guildPoints: number        // Layer 2: SUM(guild_activity.points)
  referralPoints: number     // Layer 2: SUM(referrals.points)
  totalScore: number         // Sum of all above
}

export type CompleteStats = {
  // Score breakdown
  scores: TotalScore
  
  // Level progression
  level: LevelProgress
  
  // Rank progression
  rank: RankProgress
  
  // Display formatting
  formatted: {
    totalScore: string
    pointsBalance: string
    viralPoints: string
    level: string
    rankTier: string
  }
  
  // Metadata
  streak: number             // Current GM streak days
  lastGMTimestamp: number | null
  lifetimeGMs: number
}

// ============================================================================
// ON-CHAIN DATA FETCHING (Phase 3.2A)
// ============================================================================

/**
 * UserStats struct from ScoringModule.sol
 * @see contract/modules/ScoringModule.sol
 */
export type OnChainUserStats = {
  tier: bigint
  gmPoints: bigint
  questPoints: bigint
  viralPoints: bigint
  guildPoints: bigint
  referralPoints: bigint
}

/**
 * Fetch user stats directly from ScoringModule contract
 * 
 * ENHANCEMENTS (Phase 8.3):
 * - L1/L2/L3 caching (30s TTL, stale-while-revalidate)
 * - Performance monitoring (RPC latency tracking)
 * - Graceful error handling with zero fallback
 * - Request deduplication (cache stampede prevention)
 * 
 * @param address User wallet address
 * @param forceRefresh Skip cache and fetch fresh data
 * @returns On-chain user stats with all point breakdowns
 * 
 * @example
 * const stats = await fetchUserStatsOnChain('0x123...')
 * console.log(stats.gmPoints) // 1500n
 */
export async function fetchUserStatsOnChain(
  address: `0x${string}`,
  forceRefresh = false
): Promise<OnChainUserStats> {
  const cacheKey = `user-stats-${address.toLowerCase()}`
  
  return getCachedSafe(
    'scoring',
    cacheKey,
    async () => {
      const startTime = Date.now()
      try {
        trackCacheMiss()
        const publicClient = getPublicClient()
        const result = await publicClient.readContract({
          address: STANDALONE_ADDRESSES.base.scoringModule,
          abi: SCORING_ABI,
          functionName: 'getUserStats',
          args: [address],
        }) as [bigint, bigint, bigint, bigint, bigint, bigint]
        
        trackRPCCall(startTime)
        
        return {
          tier: result[0],
          gmPoints: result[1],
          questPoints: result[2],
          viralPoints: result[3],
          guildPoints: result[4],
          referralPoints: result[5],
        }
      } catch (error) {
        trackRPCCall(startTime)
        console.error('[fetchUserStatsOnChain] Error:', error)
        // Return zeros on error (wallet may not exist in contract yet)
        return {
          tier: 0n,
          gmPoints: 0n,
          questPoints: 0n,
          viralPoints: 0n,
          guildPoints: 0n,
          referralPoints: 0n,
        }
      }
    },
    {
      ttl: 300, // 5 minutes (scores only change on events: quest claim, GM reward, guild join)
      staleWhileRevalidate: true, // Serve stale data while refreshing background
      force: forceRefresh,
    }
  ).then(data => {
    if (!forceRefresh) trackCacheHit()
    return data
  })
}

/**
 * Fetch total score from ScoringModule contract
 * 
 * ENHANCEMENTS (Phase 8.3):
 * - L1/L2/L3 caching (30s TTL, stale-while-revalidate)
 * - Performance monitoring (RPC latency tracking)
 * - Graceful error handling with zero fallback
 * 
 * @param address User wallet address
 * @param forceRefresh Skip cache and fetch fresh data
 * @returns Total score (sum of all point types)
 * 
 * @example
 * const total = await fetchTotalScoreOnChain('0x123...')
 * console.log(total) // 15000n
 */
export async function fetchTotalScoreOnChain(
  address: `0x${string}`,
  forceRefresh = false
): Promise<bigint> {
  const cacheKey = `total-score-${address.toLowerCase()}`
  
  return getCachedSafe(
    'scoring',
    cacheKey,
    async () => {
      const startTime = Date.now()
      try {
        trackCacheMiss()
        const publicClient = getPublicClient()
        const result = await publicClient.readContract({
          address: STANDALONE_ADDRESSES.base.scoringModule,
          abi: SCORING_ABI,
          functionName: 'totalScore',
          args: [address],
        }) as bigint
        
        trackRPCCall(startTime)
        return result
      } catch (error) {
        trackRPCCall(startTime)
        console.error('[fetchTotalScoreOnChain] Error:', error)
        return 0n
      }
    },
    {
      ttl: 300, // 5 minutes (total score changes only on score update events)
      staleWhileRevalidate: true,
      force: forceRefresh,
    }
  ).then(data => {
    if (!forceRefresh) trackCacheHit()
    return data
  })
}

/**
 * Fetch user tier from ScoringModule contract
 * 
 * ENHANCEMENTS (Phase 8.3):
 * - L1/L2/L3 caching (30s TTL, stale-while-revalidate)
 * - Performance monitoring (RPC latency tracking)
 * - Graceful error handling with zero fallback
 * 
 * @param address User wallet address
 * @param forceRefresh Skip cache and fetch fresh data
 * @returns User tier (0-11 for 12-tier system)
 * 
 * @example
 * const tier = await fetchUserTierOnChain('0x123...')
 * console.log(tier) // 3n (Galactic Kitty)
 */
export async function fetchUserTierOnChain(
  address: `0x${string}`,
  forceRefresh = false
): Promise<bigint> {
  const cacheKey = `user-tier-${address.toLowerCase()}`
  
  return getCachedSafe(
    'scoring',
    cacheKey,
    async () => {
      const startTime = Date.now()
      try {
        trackCacheMiss()
        const publicClient = getPublicClient()
        const result = await publicClient.readContract({
          address: STANDALONE_ADDRESSES.base.scoringModule,
          abi: SCORING_ABI,
          functionName: 'getUserTier',
          args: [address],
        }) as bigint
        
        trackRPCCall(startTime)
        return result
      } catch (error) {
        trackRPCCall(startTime)
        console.error('[fetchUserTierOnChain] Error:', error)
        return 0n
      }
    },
    {
      ttl: 300, // 5 minutes (tier upgrades happen infrequently)
      staleWhileRevalidate: true,
      force: forceRefresh,
    }
  ).then(data => {
    if (!forceRefresh) trackCacheHit()
    return data
  })
}

/**
 * Fetch score breakdown from ScoringModule contract
 * 
 * ENHANCEMENTS (Phase 8.3):
 * - L1/L2/L3 caching (30s TTL, stale-while-revalidate)
 * - Performance monitoring (RPC latency tracking)
 * - Graceful error handling with zero fallback
 * 
 * @param address User wallet address
 * @param forceRefresh Skip cache and fetch fresh data
 * @returns Full breakdown of points by category
 * 
 * @example
 * const breakdown = await fetchScoreBreakdownOnChain('0x123...')
 * console.log(breakdown) // { gmPoints: 1000n, questPoints: 500n, ... }
 */
export async function fetchScoreBreakdownOnChain(
  address: `0x${string}`,
  forceRefresh = false
): Promise<Omit<OnChainUserStats, 'tier'>> {
  const cacheKey = `score-breakdown-${address.toLowerCase()}`
  
  return getCachedSafe(
    'scoring',
    cacheKey,
    async () => {
      const startTime = Date.now()
      try {
        trackCacheMiss()
        const publicClient = getPublicClient()
        const result = await publicClient.readContract({
          address: STANDALONE_ADDRESSES.base.scoringModule,
          abi: SCORING_ABI,
          functionName: 'getScoreBreakdown',
          args: [address],
        }) as [bigint, bigint, bigint, bigint, bigint]
        
        trackRPCCall(startTime)
        
        return {
          gmPoints: result[0],
          questPoints: result[1],
          viralPoints: result[2],
          guildPoints: result[3],
          referralPoints: result[4],
        }
      } catch (error) {
        trackRPCCall(startTime)
        console.error('[fetchScoreBreakdownOnChain] Error:', error)
        return {
          gmPoints: 0n,
          questPoints: 0n,
          viralPoints: 0n,
          guildPoints: 0n,
          referralPoints: 0n,
        }
      }
    },
    {
      ttl: 300, // 5 minutes (breakdown changes only on score update events)
      staleWhileRevalidate: true,
      force: forceRefresh,
    }
  ).then(data => {
    if (!forceRefresh) trackCacheHit()
    return data
  })
}

/**
 * Batch fetch user stats for multiple addresses (Phase 8.3 - Request Batching)
 * 
 * PERFORMANCE:
 * - Parallel requests (not sequential)
 * - Individual caching per address
 * - Shared cache stampede prevention
 * - Graceful degradation (continues on individual failures)
 * 
 * @param addresses Array of wallet addresses
 * @param forceRefresh Skip cache for all addresses
 * @returns Array of OnChainUserStats in same order as input
 * 
 * @example
 * const addresses = ['0x123...', '0x456...', '0x789...']
 * const stats = await batchFetchUserStats(addresses)
 * console.log(stats[0].gmPoints) // First user's GM points
 */
export async function batchFetchUserStats(
  addresses: `0x${string}`[],
  forceRefresh = false
): Promise<OnChainUserStats[]> {
  // Parallel fetch with individual error handling
  const promises = addresses.map(address => 
    fetchUserStatsOnChain(address, forceRefresh)
      .catch(error => {
        console.error(`[batchFetchUserStats] Failed for ${address}:`, error)
        // Return zeros on error (don't fail entire batch)
        return {
          tier: 0n,
          gmPoints: 0n,
          questPoints: 0n,
          viralPoints: 0n,
          guildPoints: 0n,
          referralPoints: 0n,
        }
      })
  )
  
  return Promise.all(promises)
}

/**
 * Invalidate cached scoring data for a user (call after score updates)
 * 
 * @param address User wallet address
 * 
 * @example
 * // After quest completion or GM reward
 * await invalidateUserScoringCache('0x123...')
 */
export async function invalidateUserScoringCache(address: `0x${string}`): Promise<void> {
  const lowerAddress = address.toLowerCase()
  await Promise.all([
    invalidateCacheSafe('scoring', `user-stats-${lowerAddress}`),
    invalidateCacheSafe('scoring', `total-score-${lowerAddress}`),
    invalidateCacheSafe('scoring', `user-tier-${lowerAddress}`),
    invalidateCacheSafe('scoring', `score-breakdown-${lowerAddress}`),
  ])
}

/**
 * Convert on-chain stats to TotalScore format
 * 
 * @param stats On-chain user stats (bigint values)
 * @returns TotalScore with number values for calculations
 * 
 * @example
 * const stats = await fetchUserStatsOnChain('0x123...')
 * const total = convertOnChainStats(stats)
 * console.log(total.totalScore) // 15000 (number)
 */
export function convertOnChainStats(stats: OnChainUserStats): TotalScore {
  const gmPoints = Number(stats.gmPoints)
  const questPoints = Number(stats.questPoints)
  const viralPoints = Number(stats.viralPoints)
  const guildPoints = Number(stats.guildPoints)
  const referralPoints = Number(stats.referralPoints)
  
  return {
    pointsBalance: gmPoints, // GM points = Layer 1 points balance
    viralPoints,
    questPoints,
    guildPoints,
    referralPoints,
    totalScore: gmPoints + questPoints + viralPoints + guildPoints + referralPoints,
  }
}

/**
 * Fetch complete user stats from on-chain + calculate derived values
 * 
 * @param address User wallet address
 * @param currentStreak Current GM streak (from Subsquid or 0)
 * @returns Complete stats with level, rank, and formatting
 * 
 * @example
 * const stats = await fetchCompleteStatsOnChain('0x123...', 5)
 * console.log(stats.level.level) // 12
 * console.log(stats.rank.currentTier.name) // "Galactic Kitty"
 */
export async function fetchCompleteStatsOnChain(
  address: `0x${string}`,
  currentStreak: number = 0
): Promise<CompleteStats> {
  // Fetch on-chain stats
  const onChainStats = await fetchUserStatsOnChain(address)
  
  // Convert to TotalScore format
  const scores = convertOnChainStats(onChainStats)
  
  // Calculate level progression
  const level = calculateLevelProgress(scores.totalScore)
  
  // Calculate rank tier and progression
  const currentTier = getRankTierByPoints(scores.totalScore)
  const currentIndex = IMPROVED_RANK_TIERS.findIndex((tier) => tier.name === currentTier.name)
  const nextTier = currentIndex >= 0 && currentIndex < IMPROVED_RANK_TIERS.length - 1
    ? IMPROVED_RANK_TIERS[currentIndex + 1]
    : undefined
  
  const currentFloor = currentTier.minPoints
  const nextTarget = nextTier ? nextTier.minPoints : currentFloor + 2000
  const span = nextTarget - currentFloor
  const pointsIntoTier = scores.totalScore - currentFloor
  const pointsToNext = nextTier ? Math.max(0, nextTarget - scores.totalScore) : 0
  const percent = span > 0 ? clamp(pointsIntoTier / span, 0, 1) : 1
  
  const rank: RankProgress = {
    ...level,
    currentTier,
    nextTier,
    percent,
    currentFloor,
    nextTarget,
    pointsIntoTier,
    pointsToNext,
  }
  
  return {
    scores,
    level,
    rank,
    formatted: {
      totalScore: formatNumber(scores.totalScore),
      pointsBalance: formatNumber(scores.pointsBalance),
      viralPoints: formatNumber(scores.viralPoints),
      level: `Level ${level.level}`,
      rankTier: currentTier.name,
    },
    streak: currentStreak,
    lastGMTimestamp: null, // TODO: Fetch from Subsquid
    lifetimeGMs: 0, // TODO: Fetch from Subsquid
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Level Progression (Quadratic Formula)
const LEVEL_XP_BASE = 300
const LEVEL_XP_INCREMENT = 200

// Engagement Weights (Viral Scoring)
export const ENGAGEMENT_WEIGHTS = {
  RECAST: 10,  // Highest value - amplifies reach
  REPLY: 5,    // High value - drives conversation
  LIKE: 2,     // Medium value - shows approval
} as const

// Viral Tier Thresholds
export const VIRAL_TIERS: Record<ViralTier, ViralTierConfig> = {
  mega_viral: {
    name: 'Mega Viral',
    emoji: '🔥',
    xp: 500,
    minScore: 100,  // 10 recasts or 50 likes
    color: 'rgb(234 88 12)',
  },
  viral: {
    name: 'Viral',
    emoji: '⚡',
    xp: 250,
    minScore: 50,   // 5 recasts or 25 likes
    color: 'rgb(251 191 36)',
  },
  popular: {
    name: 'Popular',
    emoji: '✨',
    xp: 100,
    minScore: 20,   // 2 recasts or 10 likes
    color: 'rgb(6 182 212)',
  },
  engaging: {
    name: 'Engaging',
    emoji: '💫',
    xp: 50,
    minScore: 10,   // 1 recast or 5 likes
    color: 'rgb(139 92 246)',
  },
  active: {
    name: 'Active',
    emoji: '🌟',
    xp: 25,
    minScore: 5,    // 3 likes
    color: '#D3D7DC',
  },
  none: {
    name: 'None',
    emoji: '',
    xp: 0,
    minScore: 0,
    color: '#808080',
  },
}

// 12-Tier Rank System
export const IMPROVED_RANK_TIERS: RankTier[] = [
  // Beginner (0-5K)
  {
    name: 'Signal Kitten',
    minPoints: 0,
    maxPoints: 500,
    tagline: 'First pings onchain.',
    tier: 'beginner',
    icon: 'star',
    colorClass: 'text-gray-400',
    bgClass: 'bg-gray-900/50',
    reward: { type: 'badge', name: 'First Steps', label: 'First Steps Badge' },
  },
  {
    name: 'Warp Scout',
    minPoints: 500,
    maxPoints: 1500,
    tagline: 'Finding the daily signals.',
    tier: 'beginner',
    icon: 'compass',
    colorClass: 'text-blue-400',
    bgClass: 'bg-blue-900/50',
    reward: { type: 'badge', name: 'Explorer', label: 'Explorer Badge' },
  },
  {
    name: 'Beacon Runner',
    minPoints: 1500,
    maxPoints: 4000,
    tagline: 'Guiding the GM relay.',
    tier: 'beginner',
    icon: 'flash',
    colorClass: 'text-accent-green',
    bgClass: 'bg-green-900/50',
    reward: { type: 'multiplier', value: 1.1, label: '+10% Quest XP' },
  },

  // Intermediate (4K-25K)
  {
    name: 'Night Operator',
    minPoints: 4000,
    maxPoints: 8000,
    tagline: 'Keeping streaks alive across chains.',
    tier: 'intermediate',
    icon: 'moon',
    colorClass: 'text-purple-400',
    bgClass: 'bg-purple-900/50',
    reward: { type: 'badge', name: 'Streak Master', label: 'Streak Master Badge' },
  },
  {
    name: 'Star Captain',
    minPoints: 8000,
    maxPoints: 15000,
    tagline: 'Leading squads across the nebula.',
    tier: 'intermediate',
    icon: 'star-fill',
    colorClass: 'text-gold',
    bgClass: 'bg-yellow-900/50',
    reward: { type: 'multiplier', value: 1.2, label: '+20% Quest XP' },
  },
  {
    name: 'Nebula Commander',
    minPoints: 15000,
    maxPoints: 25000,
    tagline: 'Coordinating fleet maneuvers.',
    tier: 'intermediate',
    icon: 'verified',
    colorClass: 'text-pink-400',
    bgClass: 'bg-pink-900/50',
    reward: { type: 'badge', name: 'Guild Founder', label: 'Guild Founder Badge' },
  },

  // Advanced (25K-100K)
  {
    name: 'Quantum Navigator',
    minPoints: 25000,
    maxPoints: 40000,
    tagline: 'Bending spacetime protocols.',
    tier: 'advanced',
    icon: 'level-icon',
    colorClass: 'text-violet-400',
    bgClass: 'bg-violet-900/50',
    reward: { type: 'multiplier', value: 1.3, label: '+30% Quest XP' },
  },
  {
    name: 'Cosmic Architect',
    minPoints: 40000,
    maxPoints: 60000,
    tagline: 'Building cross-chain infrastructure.',
    tier: 'advanced',
    icon: 'verified-icon',
    colorClass: 'text-red-400',
    bgClass: 'bg-red-900/50',
    reward: { type: 'badge', name: 'System Builder', label: 'System Builder Badge' },
  },
  {
    name: 'Void Walker',
    minPoints: 60000,
    maxPoints: 100000,
    tagline: 'Transcending the known networks.',
    tier: 'advanced',
    icon: 'power',
    colorClass: 'text-emerald-400',
    bgClass: 'bg-emerald-900/50',
    reward: { type: 'multiplier', value: 1.5, label: '+50% Quest XP' },
  },

  // Legendary (100K+)
  {
    name: 'Singularity Prime',
    minPoints: 100000,
    maxPoints: 250000,
    tagline: 'Legendary broadcast mastery.',
    tier: 'legendary',
    icon: 'star-fill',
    colorClass: 'text-orange-400',
    bgClass: 'bg-orange-900/50',
    reward: { type: 'badge', name: 'Legendary Pilot', label: 'Legendary Pilot Badge' },
  },
  {
    name: 'Infinite GM',
    minPoints: 250000,
    maxPoints: 500000,
    tagline: 'Eternal presence across all chains.',
    tier: 'legendary',
    icon: 'loop-icon',
    colorClass: 'text-cyan-400',
    bgClass: 'bg-cyan-900/50',
    reward: { type: 'multiplier', value: 2.0, label: '+100% Quest XP' },
  },
  {
    name: 'Omniversal Being',
    minPoints: 500000,
    maxPoints: Infinity,
    tagline: 'Peak existence beyond comprehension.',
    tier: 'mythic',
    icon: 'star-fill',
    colorClass: 'text-brand',
    bgClass: 'bg-brand/20',
    reward: { type: 'exclusive', label: 'Custom Role + Discord Access' },
  },
]

// ============================================================================
// LEVEL PROGRESSION (Quadratic Formula)
// ============================================================================

/**
 * Calculate XP required for a specific level
 * Formula: 300 + (level-1) × 200
 */
function getXpForLevel(level: number): number {
  const normalized = Math.max(1, Math.floor(level))
  return LEVEL_XP_BASE + (normalized - 1) * LEVEL_XP_INCREMENT
}

/**
 * Calculate total XP needed to reach a level
 * Formula: Sum of all XP requirements from level 1 to n-1
 */
function getTotalXpToReachLevel(level: number): number {
  const normalized = Math.max(0, Math.floor(level) - 1)
  if (normalized <= 0) return 0
  
  const n = normalized
  const a = LEVEL_XP_INCREMENT / 2
  const b = (2 * LEVEL_XP_BASE - LEVEL_XP_INCREMENT) / 2
  return a * n * n + b * n
}

/**
 * Calculate level progression from total points
 * 
 * @param points - Total score (Layer 1 + Layer 2)
 * @returns Level progression data
 */
export function calculateLevelProgress(points: number): LevelProgress {
  const normalized = Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0
  
  if (normalized <= 0) {
    const xpForLevel = getXpForLevel(1)
    return {
      level: 1,
      levelFloor: 0,
      nextLevelTarget: xpForLevel,
      xpIntoLevel: 0,
      xpForLevel,
      xpToNextLevel: xpForLevel,
      levelPercent: 0,
    }
  }

  // Quadratic formula to find level
  const a = LEVEL_XP_INCREMENT / 2
  const b = (2 * LEVEL_XP_BASE - LEVEL_XP_INCREMENT) / 2
  const c = -normalized
  const discriminant = Math.max(0, b * b - 4 * a * c)
  const raw = (-b + Math.sqrt(discriminant)) / (2 * a)
  let n = Math.floor(raw)
  if (n < 0) n = 0

  // Refine level calculation (FIXED: off-by-one bug)
  // User is at level (n+1) if they have >= XP to reach level (n+1)
  // and < XP to reach level (n+2)
  while (getTotalXpToReachLevel(n + 2) <= normalized) n += 1
  while (n > 0 && getTotalXpToReachLevel(n + 1) > normalized) n -= 1

  const level = n + 1
  const levelFloor = getTotalXpToReachLevel(level)
  const nextLevelTarget = getTotalXpToReachLevel(level + 1)
  const xpIntoLevel = normalized - levelFloor
  const xpForLevel = nextLevelTarget - levelFloor || getXpForLevel(level)
  const xpToNextLevel = Math.max(0, nextLevelTarget - normalized)
  const levelPercent = xpForLevel > 0 ? clamp(xpIntoLevel / xpForLevel, 0, 1) : 1

  return {
    level,
    levelFloor,
    nextLevelTarget,
    xpIntoLevel,
    xpForLevel,
    xpToNextLevel,
    levelPercent,
  }
}

// ============================================================================
// RANK TIER SYSTEM (12 Tiers)
// ============================================================================

/**
 * Get rank tier by total points
 * 
 * @param points - Total score
 * @returns Tier configuration
 */
export function getRankTierByPoints(points: number): RankTier {
  if (!Number.isFinite(points) || points < 0) return IMPROVED_RANK_TIERS[0]
  
  let candidate = IMPROVED_RANK_TIERS[0]
  for (const tier of IMPROVED_RANK_TIERS) {
    if (points >= tier.minPoints && (tier.maxPoints === undefined || points < tier.maxPoints)) {
      candidate = tier
      break
    }
  }
  return candidate
}

/**
 * Calculate rank progression
 * 
 * @param points - Total score
 * @returns Complete rank progress data
 */
export function calculateRankProgress(points: number): RankProgress {
  const normalized = Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0
  const currentTier = getRankTierByPoints(normalized)
  const currentIndex = IMPROVED_RANK_TIERS.findIndex((tier) => tier.name === currentTier.name)
  const nextTier = currentIndex >= 0 && currentIndex < IMPROVED_RANK_TIERS.length - 1
    ? IMPROVED_RANK_TIERS[currentIndex + 1]
    : undefined
    
  const currentFloor = currentTier.minPoints
  const nextTarget = nextTier ? nextTier.minPoints : currentFloor + 2000
  const span = nextTarget - currentFloor
  const pointsIntoTier = normalized - currentFloor
  const pointsToNext = nextTier ? Math.max(0, nextTarget - normalized) : 0
  const percent = span > 0 ? clamp(pointsIntoTier / span, 0, 1) : 1
  const levelSnapshot = calculateLevelProgress(normalized)

  return {
    ...levelSnapshot,
    currentTier,
    nextTier,
    percent,
    currentFloor,
    nextTarget,
    pointsIntoTier,
    pointsToNext,
  }
}

/**
 * Apply rank-based multiplier to XP earnings
 * 
 * @param baseXP - Base XP amount
 * @param currentPoints - User's total score
 * @returns Multiplied XP
 */
export function applyRankMultiplier(baseXP: number, currentPoints: number): number {
  if (!Number.isFinite(baseXP) || baseXP <= 0) return 0

  const normalized = Number.isFinite(currentPoints) ? Math.max(0, Math.floor(currentPoints)) : 0
  const currentTier = getRankTierByPoints(normalized)

  // Check if tier has multiplier reward
  if (currentTier?.reward?.type === 'multiplier' && currentTier.reward.value) {
    return Math.floor(baseXP * currentTier.reward.value)
  }

  return Math.floor(baseXP)
}

/**
 * Get next tier reward info
 * 
 * @param currentPoints - User's total score
 * @returns Next tier details
 */
export function getNextTierReward(currentPoints: number): {
  nextTier: RankTier | null
  pointsNeeded: number
  reward: RankTier['reward'] | null
} {
  const normalized = Number.isFinite(currentPoints) ? Math.max(0, Math.floor(currentPoints)) : 0
  const currentTier = getRankTierByPoints(normalized)
  const currentIndex = IMPROVED_RANK_TIERS.findIndex((t) => t.name === currentTier.name)
  
  if (currentIndex === -1 || currentIndex >= IMPROVED_RANK_TIERS.length - 1) {
    return { nextTier: null, pointsNeeded: 0, reward: null }
  }

  const nextTier = IMPROVED_RANK_TIERS[currentIndex + 1]
  const pointsNeeded = nextTier.minPoints - normalized

  return {
    nextTier,
    pointsNeeded: Math.max(0, pointsNeeded),
    reward: nextTier.reward || null,
  }
}

// ============================================================================
// VIRAL ENGAGEMENT SCORING
// ============================================================================

/**
 * Calculate engagement score from metrics
 * Formula: (recasts × 10) + (replies × 5) + (likes × 2)
 * 
 * @param metrics - Cast engagement metrics
 * @returns Weighted engagement score
 */
export function calculateEngagementScore(metrics: EngagementMetrics): number {
  const safeLikes = Math.max(0, Math.floor(metrics.likes || 0))
  const safeRecasts = Math.max(0, Math.floor(metrics.recasts || 0))
  const safeReplies = Math.max(0, Math.floor(metrics.replies || 0))
  
  const score =
    (safeRecasts * ENGAGEMENT_WEIGHTS.RECAST) +
    (safeReplies * ENGAGEMENT_WEIGHTS.REPLY) +
    (safeLikes * ENGAGEMENT_WEIGHTS.LIKE)
  
  return Math.max(0, Math.floor(score))
}

/**
 * Get viral tier from engagement score
 * 
 * @param score - Engagement score
 * @returns Viral tier configuration
 */
export function getViralTier(score: number): ViralTierConfig {
  const safeScore = Math.max(0, Math.floor(score || 0))
  
  if (safeScore >= VIRAL_TIERS.mega_viral.minScore) return VIRAL_TIERS.mega_viral
  if (safeScore >= VIRAL_TIERS.viral.minScore) return VIRAL_TIERS.viral
  if (safeScore >= VIRAL_TIERS.popular.minScore) return VIRAL_TIERS.popular
  if (safeScore >= VIRAL_TIERS.engaging.minScore) return VIRAL_TIERS.engaging
  if (safeScore >= VIRAL_TIERS.active.minScore) return VIRAL_TIERS.active
  
  return VIRAL_TIERS.none
}

/**
 * Calculate viral bonus XP from metrics
 * 
 * @param metrics - Cast engagement metrics
 * @returns Viral bonus data with breakdown
 */
export function calculateViralBonus(metrics: EngagementMetrics): {
  score: number
  tier: ViralTierConfig
  xp: number
  breakdown: {
    recasts: number
    replies: number
    likes: number
  }
} {
  const score = calculateEngagementScore(metrics)
  const tier = getViralTier(score)
  
  const breakdown = {
    recasts: (metrics.recasts || 0) * ENGAGEMENT_WEIGHTS.RECAST,
    replies: (metrics.replies || 0) * ENGAGEMENT_WEIGHTS.REPLY,
    likes: (metrics.likes || 0) * ENGAGEMENT_WEIGHTS.LIKE,
  }
  
  return { score, tier, xp: tier.xp, breakdown }
}

/**
 * Check if engagement metrics have increased
 * Used to prevent duplicate XP awards for same metrics
 * 
 * @param current - Current engagement metrics
 * @param previous - Previous engagement metrics
 * @returns True if any metric increased
 */
export function hasMetricsIncreased(
  current: EngagementMetrics,
  previous: EngagementMetrics
): boolean {
  return (
    current.likes > previous.likes ||
    current.recasts > previous.recasts ||
    current.replies > previous.replies
  )
}

/**
 * Calculate incremental XP bonus (only award for new engagement)
 * Prevents double-rewarding users for same engagement metrics
 * 
 * @param current - Current engagement metrics
 * @param previous - Previous engagement metrics
 * @returns Incremental XP to award (only new engagement)
 */
export function calculateIncrementalBonus(
  current: EngagementMetrics,
  previous: EngagementMetrics
): number {
  const currentBonus = calculateViralBonus(current)
  const previousBonus = calculateViralBonus(previous)
  
  // Only award difference (no double-dipping)
  const incrementalXP = Math.max(0, currentBonus.xp - previousBonus.xp)
  
  return incrementalXP
}

/**
 * Estimate progress to next viral tier
 * Used for gamification - shows users what they need to reach next tier
 * 
 * @param currentScore - Current engagement score
 * @param currentTier - Current viral tier config
 * @returns Next tier info with required engagement, or null if at max tier
 */
export function estimateNextTier(
  currentScore: number,
  currentTier: ViralTierConfig
): {
  nextTier: ViralTierConfig | null
  scoreNeeded: number
  suggestedEngagement: string
} | null {
  const tiers = [
    VIRAL_TIERS.mega_viral,
    VIRAL_TIERS.viral,
    VIRAL_TIERS.popular,
    VIRAL_TIERS.engaging,
    VIRAL_TIERS.active,
  ]
  
  const currentIndex = tiers.findIndex(t => t.name === currentTier.name)
  
  if (currentIndex === 0) {
    // Already at highest tier
    return null
  }
  
  const nextTier = tiers[currentIndex - 1]
  const scoreNeeded = nextTier.minScore - currentScore
  
  // Calculate suggested engagement to reach next tier
  const recasts = Math.ceil(scoreNeeded / ENGAGEMENT_WEIGHTS.RECAST)
  const likes = Math.ceil(scoreNeeded / ENGAGEMENT_WEIGHTS.LIKE)
  
  const suggestedEngagement = recasts <= 5
    ? `${recasts} more recast${recasts !== 1 ? 's' : ''}`
    : `${likes} more likes or ${recasts} recasts`
  
  return {
    nextTier,
    scoreNeeded,
    suggestedEngagement,
  }
}

/**
 * Format engagement metrics into human-readable string
 * 
 * @param metrics - Engagement metrics to format
 * @returns Formatted string (e.g., "5 likes, 2 recasts, 3 replies")
 */
export function formatEngagementMetrics(metrics: EngagementMetrics): string {
  const parts: string[] = []
  
  if (metrics.likes > 0) parts.push(`${metrics.likes} like${metrics.likes !== 1 ? 's' : ''}`)
  if (metrics.recasts > 0) parts.push(`${metrics.recasts} recast${metrics.recasts !== 1 ? 's' : ''}`)
  if (metrics.replies > 0) parts.push(`${metrics.replies} repl${metrics.replies !== 1 ? 'ies' : 'y'}`)
  
  return parts.join(', ') || 'No engagement yet'
}

// ============================================================================
// DISPLAY FORMATTING
// ============================================================================

/**
 * Format points for display (with K/M suffix)
 */
export function formatPoints(points: number): string {
  if (!Number.isFinite(points)) return '0'
  if (Math.abs(points) >= 1_000_000) return `${(points / 1_000_000).toFixed(1)}M`
  if (Math.abs(points) >= 1000) return `${(points / 1000).toFixed(1)}k`
  return points.toLocaleString('en-US')
}

/**
 * Format number with commas
 */
export function formatNumber(value: number): string {
  return value.toLocaleString('en-US')
}

/**
 * Format XP (integer only)
 */
const INTL_INTEGER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
export function formatXp(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return INTL_INTEGER.format(Math.max(0, Math.floor(value)))
}

/**
 * Calculate member age in days from onboarding date
 * 
 * @param memberSince - ISO date string (e.g., user_profiles.onboarded_at)
 * @returns Number of days since onboarding
 */
export function getMemberAgeDays(memberSince: string): number {
  const onboardedAt = new Date(memberSince)
  const now = new Date()
  const diffMs = now.getTime() - onboardedAt.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Format member age for display
 * 
 * @param memberSince - ISO date string
 * @returns Human-readable age (e.g., "3 months", "2 years")
 * 
 * Examples:
 * - 0-30 days: "X days"
 * - 31-365 days: "X months"
 * - 366+ days: "X years"
 */
export function formatMemberAge(memberSince: string): string {
  const days = getMemberAgeDays(memberSince)
  
  if (days < 31) {
    return `${days} day${days !== 1 ? 's' : ''}`
  }
  
  if (days < 366) {
    const months = Math.floor(days / 30)
    return `${months} month${months !== 1 ? 's' : ''}`
  }
  
  const years = Math.floor(days / 365)
  return `${years} year${years !== 1 ? 's' : ''}`
}

/**
 * Format last active time
 * 
 * @param lastActive - ISO date string (e.g., leaderboard_calculations.updated_at)
 * @returns Human-readable time (e.g., "2 hours ago", "Just now")
 * 
 * Examples:
 * - < 1 hour: "Just now"
 * - < 24 hours: "X hours ago"
 * - < 7 days: "X days ago"
 * - 7+ days: "Inactive"
 */
export function formatLastActive(lastActive: string): string {
  const lastActiveAt = new Date(lastActive)
  const now = new Date()
  const diffMs = now.getTime() - lastActiveAt.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMinutes < 60) {
    return 'Just now'
  }
  
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  }
  
  if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  }
  
  return 'Inactive'
}

// ============================================================================
// MAIN ORCHESTRATOR (Layer 3 Calculation)
// ============================================================================

/**
 * Calculate complete user statistics
 * 
 * This is the MAIN ENTRY POINT for all scoring calculations.
 * Call this from profile-service.ts with Layer 1 + Layer 2 data.
 * 
 * @param input - Raw data from Layer 1 (Subsquid) and Layer 2 (Supabase)
 * @returns Complete calculated statistics
 */
export function calculateCompleteStats(input: {
  // Layer 1: Blockchain (Subsquid)
  pointsBalance: number          // User.pointsBalance (GM rewards with streak multiplier)
  currentStreak: number          // User.currentStreak
  lastGMTimestamp: number | null // User.lastGMTimestamp
  lifetimeGMs: number            // User.lifetimeGMs
  
  // Layer 2: Off-Chain (Supabase)
  viralPoints: number            // SUM(badge_casts.viral_bonus_xp) - XP progression
  questPoints?: number           // SUM(user_quest_progress.points)
  guildPoints?: number           // SUM(guild_activity.points)
  referralPoints?: number        // SUM(referrals.points)
}): CompleteStats {
  // STEP 1: Calculate total score (Layer 1 + Layer 2)
  const scores: TotalScore = {
    pointsBalance: input.pointsBalance,
    viralPoints: input.viralPoints,
    questPoints: input.questPoints || 0,
    guildPoints: input.guildPoints || 0,
    referralPoints: input.referralPoints || 0,
    totalScore:
      input.pointsBalance +
      input.viralPoints +
      (input.questPoints || 0) +
      (input.guildPoints || 0) +
      (input.referralPoints || 0),
  }

  // STEP 2: Calculate level progression
  const level = calculateLevelProgress(scores.totalScore)

  // STEP 3: Calculate rank progression
  const rank = calculateRankProgress(scores.totalScore)

  // STEP 4: Format for display
  const formatted = {
    totalScore: formatPoints(scores.totalScore),
    pointsBalance: formatPoints(scores.pointsBalance),
    viralPoints: formatPoints(scores.viralPoints),
    level: level.level.toString(),
    rankTier: rank.currentTier.name,
  }

  return {
    scores,
    level,
    rank,
    formatted,
    streak: input.currentStreak,
    lastGMTimestamp: input.lastGMTimestamp,
    lifetimeGMs: input.lifetimeGMs,
  }
}

// ============================================================================
// LEGACY COMPATIBILITY WRAPPERS (ProfileStats Component)
// ============================================================================

/**
 * Legacy stats calculation result type (for ProfileStats component)
 * 
 * @deprecated Use calculateCompleteStats instead (new unified API)
 */
export interface StatsCalculationResult {
  level: number
  levelPercent: number
  xpToNextLevel: number
  rankTier: string
  streak: number
  totalScore: number
  formattedStats: {
    points_balance: string      // Spendable points currency
    viral_xp: string            // Viral engagement XP (progression metric)
    total_score: string
    quest_completions: string
    badge_count: string
  }
  rankProgress: RankProgress
}

/**
 * ProfileStats interface (from lib/profile/types.ts)
 * Used by legacy calculateStats wrapper
 */
export interface ProfileStats {
  // Primary fields (from user_points_balances)
  points_balance: number        // Spendable points currency
  viral_xp: number              // Viral engagement XP (progression metric)
  guild_points_awarded: number  // Guild bonus points
  total_score: number
  
  // Calculated fields
  level: number
  rank_tier: string
  current_streak: number        // Renamed from streak (from Subsquid)
  
  // Legacy/calculated fields (optional for backward compatibility)
  global_rank?: number
  referral_bonus?: number
  streak_bonus?: number
  badge_prestige?: number
  
  // Activity metrics
  quest_completions: number
  badge_count: number
  viral_casts: number
  
  // Timestamps
  member_since: string
  last_active: string
}

/**
 * Calculate stats for profile display (legacy wrapper)
 * 
 * This is a COMPATIBILITY WRAPPER for the old stats-calculator.ts API.
 * Used by ProfileStats component until it's refactored to use calculateCompleteStats.
 * 
 * IMPORTANT: This accepts the FULL ProfileStats interface but only uses
 * the fields needed for calculation. This maintains backward compatibility
 * with existing code.
 * 
 * @deprecated Migrate to calculateCompleteStats for new code
 */
export function calculateStats(stats: ProfileStats): StatsCalculationResult {
  // Calculate level from total_score (UNIFIED SYSTEM)
  const levelData = calculateLevelProgress(stats.total_score)
  
  // Calculate rank tier from total_score (UNIFIED SYSTEM - uses total_score NOT points_balance)
  const tier = getRankTierByPoints(stats.total_score)
  
  // Get streak directly (no calculation needed - comes from Subsquid currentStreak)
  const streak = stats.current_streak
  
  // Create rank progress object (UNIFIED FORMAT)
  const rankProgress: RankProgress = {
    ...levelData,
    currentTier: tier,
    percent: levelData.levelPercent,
    currentFloor: levelData.levelFloor,
    nextTarget: levelData.nextLevelTarget,
    pointsIntoTier: levelData.xpIntoLevel,
    pointsToNext: levelData.xpToNextLevel,
  }
  
  // Format numbers for display (UNIFIED FORMATTERS) - using new field names
  const formattedStats = {
    points_balance: formatNumber(stats.points_balance),
    viral_xp: formatNumber(stats.viral_xp),
    total_score: formatNumber(stats.total_score),
    quest_completions: formatNumber(stats.quest_completions),
    badge_count: formatNumber(stats.badge_count),
  }
  
  return {
    level: levelData.level,
    levelPercent: levelData.levelPercent,
    xpToNextLevel: levelData.xpToNextLevel,
    rankTier: stats.rank_tier || tier.name, // Prefer pre-calculated tier if available
    streak,
    totalScore: stats.total_score,
    formattedStats,
    rankProgress,
  }
}

/**
 * Calculate activity rate (quests per day)
 */
export function calculateActivityRate(questCompletions: number, memberSince: string): number {
  const days = Math.max(1, getMemberAgeDays(memberSince))
  return questCompletions / days
}
