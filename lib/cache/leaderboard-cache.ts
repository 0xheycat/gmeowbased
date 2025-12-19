/**
 * Leaderboard Cache
 * Phase 7 Priority 2: Caching Layer
 * 
 * Implements caching for leaderboard queries with 15-minute TTL to reduce
 * Subsquid query load and improve API response times.
 * 
 * Target Performance:
 * - Cold cache: ~200ms (Subsquid query)
 * - Warm cache: <5ms (Redis hit)
 * - Cache hit rate: 95%+
 * 
 * Cache Strategy:
 * - TTL: 15 minutes (900 seconds)
 * - Invalidation: On new GM events (webhook)
 * - Fallback: Direct Subsquid query on cache failure
 * 
 * @module lib/cache/leaderboard-cache
 */

import redis from './redis-client'
import { getLeaderboard } from '@/lib/subsquid-client'

// Cache configuration
const LEADERBOARD_KEY = 'leaderboard:top100'
const LEADERBOARD_TTL = 15 * 60 // 15 minutes in seconds

/**
 * Get cached leaderboard data
 * 
 * Attempts to retrieve leaderboard from cache first. On cache miss,
 * fetches from Subsquid and stores in cache.
 * 
 * @param limit - Number of entries to return (default: 100)
 * @returns Leaderboard entries
 */
export async function getCachedLeaderboard(limit = 100) {
  try {
    // Try cache first
    const cached = await redis.get(LEADERBOARD_KEY)
    
    if (cached) {
      console.log('[Cache] Leaderboard HIT')
      return JSON.parse(cached)
    }
    
    // Cache miss - fetch from Subsquid
    console.log('[Cache] Leaderboard MISS, fetching from Subsquid...')
    const data = await getLeaderboard(limit)
    
    // Store in cache
    await redis.setex(
      LEADERBOARD_KEY,
      LEADERBOARD_TTL,
      JSON.stringify(data)
    )
    
    console.log(`[Cache] Stored leaderboard (${limit} entries, TTL: ${LEADERBOARD_TTL}s)`)
    return data
    
  } catch (error) {
    console.error('[Cache] Leaderboard cache error:', error)
    
    // Fallback to direct query on any cache error
    console.log('[Cache] Falling back to direct Subsquid query')
    return await getLeaderboard(limit)
  }
}

/**
 * Invalidate leaderboard cache
 * 
 * Call this when new GM events occur to ensure fresh data.
 * Typically called from webhooks or event processors.
 * 
 * @returns Number of keys deleted (1 if invalidated, 0 if not found)
 */
export async function invalidateLeaderboardCache(): Promise<number> {
  try {
    const deleted = await redis.del(LEADERBOARD_KEY)
    
    if (deleted > 0) {
      console.log('[Cache] Leaderboard cache INVALIDATED')
    }
    
    return deleted
  } catch (error) {
    console.error('[Cache] Failed to invalidate leaderboard cache:', error)
    return 0
  }
}

/**
 * Warm up leaderboard cache
 * 
 * Pre-populate cache with fresh data. Useful for scheduled jobs
 * or after deployments.
 * 
 * @param limit - Number of entries to cache
 */
export async function warmLeaderboardCache(limit = 100): Promise<void> {
  try {
    console.log('[Cache] Warming up leaderboard cache...')
    
    // Fetch fresh data
    const data = await getLeaderboard(limit)
    
    // Store in cache
    await redis.setex(
      LEADERBOARD_KEY,
      LEADERBOARD_TTL,
      JSON.stringify(data)
    )
    
    console.log(`[Cache] Leaderboard cache warmed (${data?.length || 0} entries)`)
  } catch (error) {
    console.error('[Cache] Failed to warm leaderboard cache:', error)
  }
}

/**
 * Get leaderboard cache status
 * 
 * Check if leaderboard is cached and get TTL remaining.
 * 
 * @returns Cache status object
 */
export async function getLeaderboardCacheStatus() {
  try {
    const exists = await redis.exists(LEADERBOARD_KEY)
    const ttl = await redis.ttl(LEADERBOARD_KEY)
    
    return {
      cached: exists === 1,
      ttlRemaining: ttl > 0 ? ttl : 0,
      ttlRemainingMinutes: ttl > 0 ? Math.round(ttl / 60) : 0,
    }
  } catch (error) {
    console.error('[Cache] Failed to get leaderboard cache status:', error)
    return {
      cached: false,
      ttlRemaining: 0,
      ttlRemainingMinutes: 0,
    }
  }
}
