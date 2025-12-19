/**
 * User Stats Cache
 * Phase 7 Priority 2: Caching Layer
 * 
 * Implements caching for user statistics queries with 5-minute TTL to reduce
 * database load and improve user profile response times.
 * 
 * Target Performance:
 * - Cold cache: ~100ms (Subsquid query)
 * - Warm cache: <5ms (Redis hit)
 * - Cache hit rate: 90%+
 * 
 * Cache Strategy:
 * - TTL: 5 minutes (300 seconds)
 * - Invalidation: On user events (GM, tips, achievements)
 * - Key format: user:stats:{walletAddress}
 * 
 * @module lib/cache/user-cache
 */

import redis from './redis-client'
import { getLeaderboardEntry } from '@/lib/subsquid-client'
import type { UserStats } from '@/lib/subsquid-client'

// Cache configuration
const USER_STATS_PREFIX = 'user:stats:'
const USER_STATS_TTL = 5 * 60 // 5 minutes in seconds

/**
 * Generate cache key for user stats
 * 
 * @param walletAddress - User's wallet address
 * @returns Cache key string
 */
function getUserStatsKey(walletAddress: string): string {
  return `${USER_STATS_PREFIX}${walletAddress.toLowerCase()}`
}

/**
 * Get cached user statistics
 * 
 * Attempts to retrieve user stats from cache first. On cache miss,
 * fetches from Subsquid and stores in cache.
 * 
 * @param walletAddress - User's wallet address
 * @returns User statistics object
 */
export async function getCachedUserStats(walletAddress: string) {
  try {
    const key = getUserStatsKey(walletAddress)
    
    // Try cache first
    const cached = await redis.get(key)
    
    if (cached) {
      console.log(`[Cache] User stats HIT: ${walletAddress}`)
      return JSON.parse(cached)
    }
    
    // Cache miss - fetch from Subsquid
    console.log(`[Cache] User stats MISS: ${walletAddress}, fetching from Subsquid...`)
    const data = await getLeaderboardEntry(walletAddress)
    
    // Store in cache
    await redis.setex(key, USER_STATS_TTL, JSON.stringify(data))
    
    console.log(`[Cache] Stored user stats: ${walletAddress} (TTL: ${USER_STATS_TTL}s)`)
    return data
    
  } catch (error) {
    console.error(`[Cache] User stats cache error (${walletAddress}):`, error)
    
    // Fallback to direct query on any cache error
    console.log(`[Cache] Falling back to direct Subsquid query: ${walletAddress}`)
    return await getLeaderboardEntry(walletAddress)
  }
}

/**
 * Invalidate user stats cache
 * 
 * Call this when user data changes (GM events, tips, achievements)
 * to ensure fresh data on next request.
 * 
 * @param walletAddress - User's wallet address
 * @returns Number of keys deleted (1 if invalidated, 0 if not found)
 */
export async function invalidateUserCache(walletAddress: string): Promise<number> {
  try {
    const key = getUserStatsKey(walletAddress)
    const deleted = await redis.del(key)
    
    if (deleted > 0) {
      console.log(`[Cache] User stats cache INVALIDATED: ${walletAddress}`)
    }
    
    return deleted
  } catch (error) {
    console.error(`[Cache] Failed to invalidate user stats cache (${walletAddress}):`, error)
    return 0
  }
}

/**
 * Batch invalidate multiple user caches
 * 
 * Useful when a single event affects multiple users (e.g., tipping)
 * 
 * @param walletAddresses - Array of wallet addresses
 * @returns Total number of keys deleted
 */
export async function invalidateMultipleUserCaches(walletAddresses: string[]): Promise<number> {
  try {
    if (!walletAddresses || walletAddresses.length === 0) {
      return 0
    }
    
    const keys = walletAddresses.map(addr => getUserStatsKey(addr))
    const deleted = await redis.del(...keys)
    
    console.log(`[Cache] Batch invalidated ${deleted} user caches`)
    return deleted
  } catch (error) {
    console.error('[Cache] Failed to batch invalidate user caches:', error)
    return 0
  }
}

/**
 * Warm up user stats cache
 * 
 * Pre-populate cache with fresh data for a specific user.
 * 
 * @param walletAddress - User's wallet address
 */
export async function warmUserStatsCache(walletAddress: string): Promise<void> {
  try {
    console.log(`[Cache] Warming up user stats cache: ${walletAddress}`)
    
    // Fetch fresh data
    const data = await getLeaderboardEntry(walletAddress)
    
    // Store in cache
    const key = getUserStatsKey(walletAddress)
    await redis.setex(key, USER_STATS_TTL, JSON.stringify(data))
    
    console.log(`[Cache] User stats cache warmed: ${walletAddress}`)
  } catch (error) {
    console.error(`[Cache] Failed to warm user stats cache (${walletAddress}):`, error)
  }
}

/**
 * Get user stats cache status
 * 
 * Check if user stats are cached and get TTL remaining.
 * 
 * @param walletAddress - User's wallet address
 * @returns Cache status object
 */
export async function getUserStatsCacheStatus(walletAddress: string) {
  try {
    const key = getUserStatsKey(walletAddress)
    const exists = await redis.exists(key)
    const ttl = await redis.ttl(key)
    
    return {
      walletAddress,
      cached: exists === 1,
      ttlRemaining: ttl > 0 ? ttl : 0,
      ttlRemainingMinutes: ttl > 0 ? Math.round(ttl / 60) : 0,
    }
  } catch (error) {
    console.error(`[Cache] Failed to get user stats cache status (${walletAddress}):`, error)
    return {
      walletAddress,
      cached: false,
      ttlRemaining: 0,
      ttlRemainingMinutes: 0,
    }
  }
}

/**
 * Clear all user stats caches
 * 
 * Dangerous operation - clears all cached user stats.
 * Use with caution (e.g., after major data migrations).
 * 
 * @returns Number of keys deleted
 */
export async function clearAllUserStatsCache(): Promise<number> {
  try {
    console.log('[Cache] Clearing all user stats caches...')
    
    // Find all user stats keys
    const keys = await redis.keys(`${USER_STATS_PREFIX}*`)
    
    if (keys.length === 0) {
      console.log('[Cache] No user stats caches to clear')
      return 0
    }
    
    // Delete all keys
    const deleted = await redis.del(...keys)
    
    console.log(`[Cache] Cleared ${deleted} user stats caches`)
    return deleted
  } catch (error) {
    console.error('[Cache] Failed to clear all user stats caches:', error)
    return 0
  }
}
