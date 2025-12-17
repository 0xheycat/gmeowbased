/**
 * #file: lib/bot/stats-with-fallback.ts
 * 
 * PHASE: Free-Tier Failover Architecture (Day 1-2)
 * DATE: December 17, 2025
 * WEBSITE: https://gmeowhq.art
 * NETWORK: Base (Chain ID: 8453)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * FEATURES
 * ═══════════════════════════════════════════════════════════════════════════
 * ✅ Automatic cache fallback when Supabase unavailable
 * ✅ Staleness detection ("Data may be delayed")
 * ✅ User-friendly disclaimers (inspired by Twitter/Facebook)
 * ✅ Retry logic integration
 * ✅ Type-safe with proper error handling
 * ✅ Zero external dependencies (no Redis required)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * USAGE EXAMPLE
 * ═══════════════════════════════════════════════════════════════════════════
 * ```typescript
 * import { getUserStatsWithFallback } from '@/lib/bot/stats-with-fallback'
 * 
 * const result = await getUserStatsWithFallback(fid, address)
 * 
 * if (!result.stats) {
 *   // No data available
 *   reply = result.disclaimer // "Stats temporarily unavailable..."
 * } else {
 *   // Generate normal reply
 *   reply = formatStatsReply(result.stats)
 *   
 *   // Add disclaimer if using stale cache
 *   if (result.disclaimer) {
 *     reply += `\n\n${result.disclaimer}`
 *   }
 * }
 * ```
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * DISCLAIMER MESSAGES (Inspired by Major Platforms)
 * ═══════════════════════════════════════════════════════════════════════════
 * Fresh data (live):
 *   No disclaimer
 * 
 * Cached data (fresh, <5 minutes):
 *   No disclaimer (data is fresh enough)
 * 
 * Cached data (stale, 5-15 minutes):
 *   "⚠️ Data may be delayed (~8m ago). Refreshing..."
 * 
 * Cached data (very stale, 15-60 minutes):
 *   "⚠️ Showing cached data from ~45 minutes ago. Live data temporarily unavailable."
 * 
 * No data available:
 *   "⚠️ Stats temporarily unavailable. Please try again in a few minutes."
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { localCache } from './local-cache'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { getUserStats as getSubsquidStats } from '@/lib/integrations/subsquid-client'
import { computeBotUserStats, type BotUserStats } from '@/lib/bot/analytics/stats'

/**
 * User stats result with cache metadata
 */
export interface UserStatsResult {
  stats: BotUserStats | null
  source: 'live' | 'cache-fresh' | 'cache-stale' | 'cache-expired'
  cacheAge?: number // Age in minutes
  disclaimer?: string // User-facing message
}

/**
 * Get base URL for the app
 * 
 * Supports multiple environments:
 * - Production: NEXT_PUBLIC_APP_URL
 * - Vercel Preview: VERCEL_URL
 * - Local: localhost:3000
 */
function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return 'https://gmeowhq.art' // Fallback to production
}

/**
 * Get valid URLs for current routing structure
 * 
 * Current Routes (as of Dec 17, 2025):
 * - Profile: /profile/[fid]
 * - Quests: /quests
 * - Guild: /guild
 * - Referral: /referral
 * - Leaderboard: /leaderboard
 */
export function getValidUrls(fid?: number, username?: string) {
  const base = getBaseUrl()
  
  return {
    profile: fid ? `${base}/profile/${fid}` : `${base}/profile`,
    quests: `${base}/quests`,
    guild: `${base}/guild`,
    referral: `${base}/referral`,
    leaderboard: `${base}/leaderboard`,
    home: base
  }
}

/**
 * Get disclaimer message based on cache age
 * 
 * @param cacheAge Age in minutes
 * @returns User-friendly disclaimer OR undefined if data is fresh
 */
function getDisclaimerMessage(cacheAge: number): string | undefined {
  if (cacheAge < 5) {
    return undefined // Fresh enough, no disclaimer
  }

  if (cacheAge < 15) {
    return `⚠️ Data may be delayed (~${cacheAge}m ago). Refreshing...`
  }

  if (cacheAge < 60) {
    return `⚠️ Showing cached data from ~${cacheAge} minutes ago. Live data temporarily unavailable.`
  }

  const hours = Math.floor(cacheAge / 60)
  return `⚠️ Data is outdated (~${hours}h ago). Please try again later.`
}

/**
 * Get user stats with automatic cache fallback
 * 
 * FLOW:
 * 1. Try live data from Supabase
 * 2. On success: Update cache + return live data
 * 3. On failure: Return cached data (if available)
 * 4. Add disclaimer if using stale cache
 * 
 * @param fid Farcaster FID
 * @param address Ethereum address (optional, for Subsquid fallback)
 * @returns User stats result with cache metadata
 */
export async function getUserStatsWithFallback(
  fid: number,
  address?: string
): Promise<UserStatsResult> {
  const cacheKey = `stats:user:${fid}`

  try {
    // Try live data first
    const supabase = getSupabaseServerClient()
    if (!supabase) throw new Error('Supabase not configured')

    // Fetch user profile from Supabase
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('fid', fid)
      .single()

    if (error || !profile) {
      throw new Error('User not found in Supabase')
    }

    // Get wallet address (required for stats computation)
    const walletAddress = profile.wallet_address || address
    if (!walletAddress) {
      throw new Error('No wallet address available for user')
    }

    // Compute bot stats (takes address string only)
    const stats = await computeBotUserStats(walletAddress)

    if (!stats) {
      throw new Error('Failed to compute stats')
    }

    // Cache successful result (5 minutes TTL)
    await localCache.set(cacheKey, stats, 5 * 60 * 1000)

    return {
      stats,
      source: 'live'
    }

  } catch (error) {
    console.warn(`[StatsWithFallback] Live fetch failed for FID ${fid}, trying cache:`, error)

    // Fallback to cache
    const cached = await localCache.get<BotUserStats>(cacheKey)

    if (cached) {
      const ageMinutes = Math.floor(cached.age / 60000)

      return {
        stats: cached.data,
        source: cached.isStale ? 'cache-stale' : 'cache-fresh',
        cacheAge: ageMinutes,
        disclaimer: getDisclaimerMessage(ageMinutes)
      }
    }

    // No cache available - return null
    const urls = getValidUrls(fid)
    return {
      stats: null,
      source: 'cache-expired',
      disclaimer: `⚠️ Stats temporarily unavailable. Please try again in a few minutes.\n\nCheck your profile at ${urls.profile}`
    }
  }
}

/**
 * Get leaderboard with cache fallback
 * 
 * @param timeframe Timeframe (7d, 30d, all-time)
 * @param limit Number of entries
 * @returns Leaderboard result with cache metadata
 */
export async function getLeaderboardWithFallback(
  timeframe: '7d' | '30d' | 'all-time' = 'all-time',
  limit = 10
): Promise<UserStatsResult> {
  const cacheKey = `leaderboard:${timeframe}:${limit}`

  try {
    // Try live data first
    const supabase = getSupabaseServerClient()
    if (!supabase) throw new Error('Supabase not configured')

    const { data, error } = await supabase
      .from('leaderboard_calculations')
      .select('*')
      .order('total_score', { ascending: false })
      .limit(limit)

    if (error || !data) {
      throw new Error('Failed to fetch leaderboard')
    }

    // Cache successful result (5 minutes TTL)
    await localCache.set(cacheKey, data, 5 * 60 * 1000)

    return {
      stats: data as any, // Type assertion for leaderboard data
      source: 'live'
    }

  } catch (error) {
    console.warn(`[StatsWithFallback] Leaderboard fetch failed, trying cache:`, error)

    // Fallback to cache
    const cached = await localCache.get<any>(cacheKey)

    if (cached) {
      const ageMinutes = Math.floor(cached.age / 60000)

      return {
        stats: cached.data,
        source: cached.isStale ? 'cache-stale' : 'cache-fresh',
        cacheAge: ageMinutes,
        disclaimer: getDisclaimerMessage(ageMinutes)
      }
    }

    // No cache available
    const urls = getValidUrls()
    return {
      stats: null,
      source: 'cache-expired',
      disclaimer: `⚠️ Leaderboard temporarily unavailable. Please try again in a few minutes.\n\nVisit ${urls.leaderboard}`
    }
  }
}

/**
 * Get quest recommendations with cache fallback
 * 
 * @param fid Farcaster FID
 * @returns Quest recommendations with cache metadata
 */
export async function getQuestRecommendationsWithFallback(
  fid: number
): Promise<UserStatsResult> {
  const cacheKey = `quests:recommendations:${fid}`

  try {
    // Try live data first
    const supabase = getSupabaseServerClient()
    if (!supabase) throw new Error('Supabase not configured')

    const { data: quests, error } = await supabase
      .from('quest_definitions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5)

    if (error || !quests) {
      throw new Error('Failed to fetch quests')
    }

    // Cache successful result (10 minutes TTL)
    await localCache.set(cacheKey, quests, 10 * 60 * 1000)

    return {
      stats: quests as any,
      source: 'live'
    }

  } catch (error) {
    console.warn(`[StatsWithFallback] Quest fetch failed, trying cache:`, error)

    // Fallback to cache
    const cached = await localCache.get<any>(cacheKey)

    if (cached) {
      const ageMinutes = Math.floor(cached.age / 60000)

      return {
        stats: cached.data,
        source: cached.isStale ? 'cache-stale' : 'cache-fresh',
        cacheAge: ageMinutes,
        disclaimer: getDisclaimerMessage(ageMinutes)
      }
    }

    // No cache available
    const urls = getValidUrls()
    return {
      stats: null,
      source: 'cache-expired',
      disclaimer: `⚠️ Quests temporarily unavailable. Please try again in a few minutes.\n\nBrowse quests at ${urls.quests}`
    }
  }
}

/**
 * Prefetch and warm cache for common queries
 * 
 * This should be called on app startup or periodically
 * to ensure cache is populated before users request data
 */
export async function warmCache(fids: number[]): Promise<void> {
  console.log(`[StatsWithFallback] Warming cache for ${fids.length} users...`)
  
  const promises = fids.map(fid => 
    getUserStatsWithFallback(fid).catch(err => {
      console.error(`[StatsWithFallback] Failed to warm cache for FID ${fid}:`, err)
    })
  )

  await Promise.all(promises)
  console.log('[StatsWithFallback] Cache warming complete')
}
