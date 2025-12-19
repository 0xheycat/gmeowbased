/**
 * Events Cache
 * Phase 7 Priority 2: Caching Layer
 * 
 * Implements caching for blockchain events queries (GM events, rank events,
 * tip events) with 3-minute TTL to reduce Subsquid load and improve API
 * response times.
 * 
 * Target Performance:
 * - Cold cache: ~150ms (Subsquid query)
 * - Warm cache: <5ms (Redis hit)
 * - Cache hit rate: 85%+
 * 
 * Cache Strategy:
 * - TTL: 3 minutes (180 seconds) - shorter due to frequent updates
 * - Invalidation: On new blockchain events (webhook)
 * - Key formats:
 *   - events:gm:{limit}
 *   - events:rank:{address}:{limit}
 *   - events:tips:{address}:{limit}
 * 
 * @module lib/cache/events-cache
 */

import redis from './redis-client'
import { getSubsquidClient } from '@/lib/subsquid-client'

// Cache configuration
const EVENTS_PREFIX = 'events:'
const EVENTS_TTL = 3 * 60 // 3 minutes in seconds

/**
 * Generate cache key for GM events
 * 
 * @param limit - Number of events to retrieve
 * @returns Cache key string
 */
function getGMEventsKey(limit: number): string {
  return `${EVENTS_PREFIX}gm:${limit}`
}

/**
 * Generate cache key for rank events
 * 
 * @param address - User's wallet address
 * @param limit - Number of events to retrieve
 * @returns Cache key string
 */
function getRankEventsKey(address: string, limit: number): string {
  return `${EVENTS_PREFIX}rank:${address.toLowerCase()}:${limit}`
}

/**
 * Generate cache key for tip events
 * 
 * @param address - User's wallet address
 * @param limit - Number of events to retrieve
 * @returns Cache key string
 */
function getTipEventsKey(address: string, limit: number): string {
  return `${EVENTS_PREFIX}tips:${address.toLowerCase()}:${limit}`
}

/**
 * Get cached recent GM events
 * 
 * @param limit - Number of events to retrieve (default: 50)
 * @returns GM events array
 */
export async function getCachedRecentGMEvents(limit = 50) {
  try {
    const key = getGMEventsKey(limit)
    
    // Try cache first
    const cached = await redis.get(key)
    
    if (cached) {
      console.log(`[Cache] GM events HIT (limit: ${limit})`)
      return JSON.parse(cached)
    }
    
    // Cache miss - fetch from Subsquid
    console.log(`[Cache] GM events MISS (limit: ${limit}), fetching from Subsquid...`)
    const { getRankEvents } = await import('@/lib/subsquid-client')
    const data = await getRankEvents({ limit })
    
    // Store in cache
    await redis.setex(key, EVENTS_TTL, JSON.stringify(data))
    
    console.log(`[Cache] Stored GM events (${limit} limit, TTL: ${EVENTS_TTL}s)`)
    return data
    
  } catch (error) {
    console.error('[Cache] GM events cache error:', error)
    
    // Fallback to direct query on any cache error
    console.log('[Cache] Falling back to direct Subsquid query')
    const { getRankEvents } = await import('@/lib/subsquid-client')
    return await getRankEvents({ limit })
  }
}

/**
 * Get cached rank events for a user
 * 
 * @param address - User's wallet address
 * @param limit - Number of events to retrieve (default: 50)
 * @returns Rank events array
 */
export async function getCachedRankEvents(address: string, limit = 50) {
  try {
    const key = getRankEventsKey(address, limit)
    
    // Try cache first
    const cached = await redis.get(key)
    
    if (cached) {
      console.log(`[Cache] Rank events HIT: ${address} (limit: ${limit})`)
      return JSON.parse(cached)
    }
    
    // Cache miss - fetch from Subsquid
    console.log(`[Cache] Rank events MISS: ${address} (limit: ${limit}), fetching from Subsquid...`)
    // Note: getRankEvents needs FID, not address. For now return empty array.
    // TODO: Add wallet->FID lookup or use different query
    const data: any[] = []
    
    // Store in cache
    await redis.setex(key, EVENTS_TTL, JSON.stringify(data))
    
    console.log(`[Cache] Stored rank events: ${address} (${limit} limit, TTL: ${EVENTS_TTL}s)`)
    return data
    
  } catch (error) {
    console.error(`[Cache] Rank events cache error (${address}):`, error)
    
    // Fallback to direct query on any cache error
    console.log(`[Cache] Falling back to direct Subsquid query: ${address}`)
    // Note: getRankEvents needs FID, not address
    return []
  }
}

/**
 * Get cached tip events for a user
 * 
 * @param address - User's wallet address
 * @param limit - Number of events to retrieve (default: 50)
 * @returns Tip events array
 */
export async function getCachedTipEvents(address: string, limit = 50) {
  try {
    const key = getTipEventsKey(address, limit)
    
    // Try cache first
    const cached = await redis.get(key)
    
    if (cached) {
      console.log(`[Cache] Tip events HIT: ${address} (limit: ${limit})`)
      return JSON.parse(cached)
    }
    
    // Cache miss - fetch from Subsquid
    console.log(`[Cache] Tip events MISS: ${address} (limit: ${limit}), fetching from Subsquid...`)
    const { getTipEvents } = await import('@/lib/subsquid-client')
    const data = await getTipEvents(address, undefined, limit)
    
    // Store in cache
    await redis.setex(key, EVENTS_TTL, JSON.stringify(data))
    
    console.log(`[Cache] Stored tip events: ${address} (${limit} limit, TTL: ${EVENTS_TTL}s)`)
    return data
    
  } catch (error) {
    console.error(`[Cache] Tip events cache error (${address}):`, error)
    
    // Fallback to direct query on any cache error
    console.log(`[Cache] Falling back to direct Subsquid query: ${address}`)
    const { getTipEvents } = await import('@/lib/subsquid-client')
    return await getTipEvents(address, undefined, limit)
  }
}

/**
 * Invalidate all GM events caches
 * 
 * Call this when new GM events occur.
 * 
 * @returns Number of keys deleted
 */
export async function invalidateGMEventsCache(): Promise<number> {
  try {
    const pattern = `${EVENTS_PREFIX}gm:*`
    const keys = await redis.keys(pattern)
    
    if (keys.length === 0) {
      return 0
    }
    
    const deleted = await redis.del(...keys)
    console.log(`[Cache] Invalidated ${deleted} GM events caches`)
    return deleted
  } catch (error) {
    console.error('[Cache] Failed to invalidate GM events cache:', error)
    return 0
  }
}

/**
 * Invalidate user-specific events caches
 * 
 * Call this when user events change (rank updates, tips).
 * 
 * @param address - User's wallet address
 * @returns Number of keys deleted
 */
export async function invalidateUserEventsCache(address: string): Promise<number> {
  try {
    const rankPattern = `${EVENTS_PREFIX}rank:${address.toLowerCase()}:*`
    const tipsPattern = `${EVENTS_PREFIX}tips:${address.toLowerCase()}:*`
    
    const rankKeys = await redis.keys(rankPattern)
    const tipsKeys = await redis.keys(tipsPattern)
    const allKeys = [...rankKeys, ...tipsKeys]
    
    if (allKeys.length === 0) {
      return 0
    }
    
    const deleted = await redis.del(...allKeys)
    console.log(`[Cache] Invalidated ${deleted} user events caches: ${address}`)
    return deleted
  } catch (error) {
    console.error(`[Cache] Failed to invalidate user events cache (${address}):`, error)
    return 0
  }
}

/**
 * Clear all events caches
 * 
 * Dangerous operation - clears all cached events.
 * Use with caution (e.g., after major data migrations).
 * 
 * @returns Number of keys deleted
 */
export async function clearAllEventsCache(): Promise<number> {
  try {
    console.log('[Cache] Clearing all events caches...')
    
    const keys = await redis.keys(`${EVENTS_PREFIX}*`)
    
    if (keys.length === 0) {
      console.log('[Cache] No events caches to clear')
      return 0
    }
    
    const deleted = await redis.del(...keys)
    console.log(`[Cache] Cleared ${deleted} events caches`)
    return deleted
  } catch (error) {
    console.error('[Cache] Failed to clear all events caches:', error)
    return 0
  }
}

/**
 * Warm up events caches
 * 
 * Pre-populate common event queries with fresh data.
 * 
 * @param gmLimit - Limit for GM events (default: 50)
 */
export async function warmEventsCache(gmLimit = 50): Promise<void> {
  try {
    console.log('[Cache] Warming up events caches...')
    
    // Warm GM events cache
    await getCachedRecentGMEvents(gmLimit)
    
    console.log('[Cache] Events cache warmed')
  } catch (error) {
    console.error('[Cache] Failed to warm events cache:', error)
  }
}
