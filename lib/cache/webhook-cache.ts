/**
 * Farcaster Webhook Cache
 * Phase 7 Priority 4: Webhook Caching Layer
 * 
 * PURPOSE:
 * - Cache webhook event processing to avoid duplicate work
 * - Cache cast data for repeated mentions/replies
 * - Cache engagement metrics for viral tracking
 * - Reduce redundant Neynar API calls
 * 
 * FEATURES:
 * ✅ Webhook deduplication (idempotency keys)
 * ✅ Cast data caching (hash-based lookups)
 * ✅ User mention caching (reduce profile fetches)
 * ✅ Engagement metrics caching (viral tier checks)
 * 
 * PERFORMANCE TARGETS:
 * - Webhook deduplication: 95%+ hit rate
 * - Cast data cache: 80%+ hit rate
 * - Mention cache: 85%+ hit rate
 * - Overall webhook latency: <50ms (warm cache)
 * 
 * TTL STRATEGY:
 * - Webhook events: 24 hours (prevent reprocessing)
 * - Cast data: 1 hour (casts rarely change)
 * - User mentions: 30 minutes (profiles update infrequently)
 * - Engagement metrics: 5 minutes (viral status updates)
 * 
 * Created: December 19, 2025 (Phase 7 Priority 4)
 * Reference: PHASE-7-PERFORMANCE-OPTIMIZATION-PLAN.md
 */

import redis from './redis-client'

// ============================================================================
// Webhook Event Deduplication
// ============================================================================

/**
 * Check if webhook event was already processed
 * 
 * Uses idempotency keys to prevent duplicate processing of same event.
 * Critical for reliability when webhooks are retried.
 * 
 * @param idempotencyKey - Unique event identifier from Neynar
 * @returns true if event was already processed
 */
export async function isWebhookProcessed(idempotencyKey: string): Promise<boolean> {
  try {
    const key = `webhook:processed:${idempotencyKey}`
    const exists = await redis.exists(key)
    
    if (exists) {
      console.log(`[Webhook Cache] DUPLICATE: ${idempotencyKey}`)
    }
    
    return exists === 1
  } catch (error) {
    console.error('[Webhook Cache] Error checking processed status:', error)
    // Fail open - allow processing on cache error
    return false
  }
}

/**
 * Mark webhook event as processed
 * 
 * @param idempotencyKey - Unique event identifier
 * @param ttl - Time to live in seconds (default: 24 hours)
 */
export async function markWebhookProcessed(
  idempotencyKey: string,
  ttl: number = 24 * 60 * 60
): Promise<void> {
  try {
    const key = `webhook:processed:${idempotencyKey}`
    await redis.setex(key, ttl, Date.now().toString())
    console.log(`[Webhook Cache] MARKED: ${idempotencyKey} (TTL: ${ttl}s)`)
  } catch (error) {
    console.error('[Webhook Cache] Error marking processed:', error)
  }
}

// ============================================================================
// Cast Data Caching
// ============================================================================

export type CachedCast = {
  hash: string
  authorFid: number
  text: string
  embedsCount: number
  mentionsCount: number
  timestamp: string
  cachedAt: number
}

/**
 * Get cached cast data
 * 
 * @param castHash - Cast hash identifier
 * @returns Cached cast data or null
 */
export async function getCachedCast(castHash: string): Promise<CachedCast | null> {
  try {
    const key = `webhook:cast:${castHash}`
    const cached = await redis.get(key)
    
    if (cached) {
      console.log(`[Webhook Cache] Cast HIT: ${castHash}`)
      return JSON.parse(cached)
    }
    
    console.log(`[Webhook Cache] Cast MISS: ${castHash}`)
    return null
  } catch (error) {
    console.error('[Webhook Cache] Error getting cached cast:', error)
    return null
  }
}

/**
 * Cache cast data
 * 
 * @param castData - Cast data to cache
 * @param ttl - Time to live in seconds (default: 1 hour)
 */
export async function setCachedCast(
  castData: Omit<CachedCast, 'cachedAt'>,
  ttl: number = 60 * 60
): Promise<void> {
  try {
    const key = `webhook:cast:${castData.hash}`
    const cacheData: CachedCast = {
      ...castData,
      cachedAt: Date.now(),
    }
    
    await redis.setex(key, ttl, JSON.stringify(cacheData))
    console.log(`[Webhook Cache] Cast SET: ${castData.hash} (TTL: ${ttl}s)`)
  } catch (error) {
    console.error('[Webhook Cache] Error caching cast:', error)
  }
}

// ============================================================================
// User Mention Caching
// ============================================================================

export type CachedMention = {
  fid: number
  username: string
  displayName: string
  isBot: boolean
  cachedAt: number
}

/**
 * Get cached mention data
 * 
 * Reduces need to fetch user profiles for every mention.
 * 
 * @param fid - User FID
 * @returns Cached mention data or null
 */
export async function getCachedMention(fid: number): Promise<CachedMention | null> {
  try {
    const key = `webhook:mention:${fid}`
    const cached = await redis.get(key)
    
    if (cached) {
      console.log(`[Webhook Cache] Mention HIT: ${fid}`)
      return JSON.parse(cached)
    }
    
    return null
  } catch (error) {
    console.error('[Webhook Cache] Error getting cached mention:', error)
    return null
  }
}

/**
 * Cache mention data
 * 
 * @param mentionData - Mention data to cache
 * @param ttl - Time to live in seconds (default: 30 minutes)
 */
export async function setCachedMention(
  mentionData: Omit<CachedMention, 'cachedAt'>,
  ttl: number = 30 * 60
): Promise<void> {
  try {
    const key = `webhook:mention:${mentionData.fid}`
    const cacheData: CachedMention = {
      ...mentionData,
      cachedAt: Date.now(),
    }
    
    await redis.setex(key, ttl, JSON.stringify(cacheData))
    console.log(`[Webhook Cache] Mention SET: ${mentionData.fid} (TTL: ${ttl}s)`)
  } catch (error) {
    console.error('[Webhook Cache] Error caching mention:', error)
  }
}

// ============================================================================
// Engagement Metrics Caching
// ============================================================================

export type CachedEngagement = {
  castHash: string
  likes: number
  recasts: number
  replies: number
  viralTier: string
  lastUpdated: number
}

/**
 * Get cached engagement metrics
 * 
 * Used for viral tier detection without repeated DB queries.
 * 
 * @param castHash - Cast hash identifier
 * @returns Cached engagement data or null
 */
export async function getCachedEngagement(castHash: string): Promise<CachedEngagement | null> {
  try {
    const key = `webhook:engagement:${castHash}`
    const cached = await redis.get(key)
    
    if (cached) {
      console.log(`[Webhook Cache] Engagement HIT: ${castHash}`)
      return JSON.parse(cached)
    }
    
    return null
  } catch (error) {
    console.error('[Webhook Cache] Error getting cached engagement:', error)
    return null
  }
}

/**
 * Cache engagement metrics
 * 
 * @param engagementData - Engagement data to cache
 * @param ttl - Time to live in seconds (default: 5 minutes)
 */
export async function setCachedEngagement(
  engagementData: CachedEngagement,
  ttl: number = 5 * 60
): Promise<void> {
  try {
    const key = `webhook:engagement:${engagementData.castHash}`
    await redis.setex(key, ttl, JSON.stringify(engagementData))
    console.log(`[Webhook Cache] Engagement SET: ${engagementData.castHash} (TTL: ${ttl}s)`)
  } catch (error) {
    console.error('[Webhook Cache] Error caching engagement:', error)
  }
}

// ============================================================================
// Cache Statistics
// ============================================================================

export type WebhookCacheStats = {
  processedEvents: number
  cachedCasts: number
  cachedMentions: number
  cachedEngagements: number
}

/**
 * Get webhook cache statistics
 * 
 * @returns Cache statistics object
 */
export async function getWebhookCacheStats(): Promise<WebhookCacheStats> {
  try {
    const [processedKeys, castKeys, mentionKeys, engagementKeys] = await Promise.all([
      redis.keys('webhook:processed:*'),
      redis.keys('webhook:cast:*'),
      redis.keys('webhook:mention:*'),
      redis.keys('webhook:engagement:*'),
    ])
    
    return {
      processedEvents: processedKeys.length,
      cachedCasts: castKeys.length,
      cachedMentions: mentionKeys.length,
      cachedEngagements: engagementKeys.length,
    }
  } catch (error) {
    console.error('[Webhook Cache] Error getting stats:', error)
    return {
      processedEvents: 0,
      cachedCasts: 0,
      cachedMentions: 0,
      cachedEngagements: 0,
    }
  }
}

/**
 * Clear all webhook caches
 * 
 * Dangerous operation - use with caution.
 * 
 * @returns Number of keys deleted
 */
export async function clearWebhookCaches(): Promise<number> {
  try {
    console.log('[Webhook Cache] Clearing all webhook caches...')
    
    const keys = await redis.keys('webhook:*')
    
    if (keys.length === 0) {
      return 0
    }
    
    const deleted = await redis.del(...keys)
    console.log(`[Webhook Cache] Cleared ${deleted} webhook cache keys`)
    return deleted
  } catch (error) {
    console.error('[Webhook Cache] Error clearing caches:', error)
    return 0
  }
}
