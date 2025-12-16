/**
 * Frame Caching with Redis/Upstash
 * Phase 1A: Foundation Improvements
 * 
 * Implements multi-layer caching for frame images to reduce:
 * - Response time: 800ms → <200ms (cache hit)
 * - Vercel function invocations by 75%
 * - Cold start impact
 * 
 * Cache Strategy:
 * - TTL: 5 minutes default (300s)
 * - Cache key: frame:{type}:{fid}:{tier}:{params_hash}
 * - Invalidation: Automatic TTL expiry
 */

import { trackError } from '@/lib/notifications/error-tracking'

import { Redis } from '@upstash/redis'
import { createHash } from 'crypto'

// Initialize Redis client (singleton pattern)
let redisClient: Redis | null = null

function getRedisClient(): Redis | null {
  // Check if Redis credentials are configured
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }

  // Return existing client or create new one
  if (!redisClient) {
    try {
      redisClient = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    } catch (err) {
      trackError('frame_cache_init_failed', err, { function: 'getRedis' })
      return null
    }
  }

  return redisClient
}

// Cache key structure
export type FrameCacheKey = {
  type: string
  fid: number | null
  tier: string | null
  params: Record<string, string>
}

/**
 * Generate deterministic cache key from frame parameters
 */
function generateCacheKey(key: FrameCacheKey): string {
  const paramsHash = hashParams(key.params)
  const parts = [
    'frame',
    key.type,
    key.fid ?? 'null',
    key.tier ?? 'null',
    paramsHash,
  ]
  return parts.join(':')
}

/**
 * Hash query parameters for cache key
 * Sorts keys alphabetically for deterministic results
 */
function hashParams(params: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) {
    return 'empty'
  }

  const normalized = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')

  if (!normalized) return 'empty'

  // Create short hash for cache key
  return createHash('md5').update(normalized).digest('hex').substring(0, 8)
}

/**
 * Get cached frame image
 * @returns Buffer if found in cache, null if cache miss
 */
export async function getCachedFrame(key: FrameCacheKey): Promise<Buffer | null> {
  const redis = getRedisClient()
  if (!redis) return null

  try {
    const cacheKey = generateCacheKey(key)
    const cached = await redis.get<string>(cacheKey)

    if (cached && typeof cached === 'string') {
      return Buffer.from(cached, 'base64')
    }

    return null
  } catch (err) {
    trackError('frame_cache_get_error', err, { function: 'get', key })
    return null
  }
}

/**
 * Store frame image in cache
 * @param ttl Time to live in seconds (default: 5 minutes)
 */
export async function setCachedFrame(
  key: FrameCacheKey,
  imageBuffer: Buffer,
  ttl = 300 // 5 minutes default
): Promise<boolean> {
  const redis = getRedisClient()
  if (!redis) return false

  try {
    const cacheKey = generateCacheKey(key)
    const base64Image = imageBuffer.toString('base64')

    await redis.setex(cacheKey, ttl, base64Image)
    return true
  } catch (err) {
    trackError('frame_cache_set_error', err, { function: 'set', key, ttl })
    return false
  }
}

/**
 * Invalidate specific frame from cache
 * Useful when frame data changes (e.g., user updates profile)
 */
export async function invalidateFrame(key: FrameCacheKey): Promise<boolean> {
  const redis = getRedisClient()
  if (!redis) return false

  try {
    const cacheKey = generateCacheKey(key)
    await redis.del(cacheKey)
    return true
  } catch (err) {
    trackError('frame_cache_invalidate_error', err, { function: 'invalidate', key })
    return false
  }
}

/**
 * Invalidate all frames for a specific FID
 * Use when user profile changes significantly
 */
export async function invalidateUserFrames(fid: number): Promise<number> {
  const redis = getRedisClient()
  if (!redis) return 0

  try {
    // Pattern: frame:*:{fid}:*:*
    const pattern = `frame:*:${fid}:*:*`
    const keys = await redis.keys(pattern)

    if (keys.length === 0) {
      return 0
    }

    await redis.del(...keys)
    return keys.length
  } catch (err) {
    trackError('frame_cache_invalidate_user_error', err, { function: 'invalidateUserFrames', fid })
    return 0
  }
}

/**
 * Get cache statistics
 * Useful for monitoring and optimization
 */
export async function getCacheStats(): Promise<{
  ok: boolean
  totalKeys: number
  error?: string
}> {
  const redis = getRedisClient()
  if (!redis) {
    return { ok: false, totalKeys: 0, error: 'Redis not configured' }
  }

  try {
    const keys = await redis.keys('frame:*')
    return {
      ok: true,
      totalKeys: keys.length,
    }
  } catch (err) {
    return {
      ok: false,
      totalKeys: 0,
      error: String(err),
    }
  }
}

/**
 * Clear all frame cache (use with caution)
 * Useful for debugging or after major frame changes
 */
export async function clearAllFrameCache(): Promise<number> {
  const redis = getRedisClient()
  if (!redis) return 0

  try {
    const keys = await redis.keys('frame:*')
    if (keys.length === 0) return 0

    await redis.del(...keys)
    return keys.length
  } catch (err) {
    trackError('frame_cache_clear_all_error', err, { function: 'clearAll' })
    return 0
  }
}

/**
 * Test Redis connection
 * Returns true if Redis is configured and responsive
 */
export async function testRedisConnection(): Promise<boolean> {
  const redis = getRedisClient()
  if (!redis) return false

  try {
    const testKey = 'frame:health:check'
    await redis.set(testKey, 'ok', { ex: 10 })
    const result = await redis.get(testKey)
    await redis.del(testKey)
    return result === 'ok'
  } catch (err) {
    trackError('frame_cache_connection_test_failed', err, { function: 'testConnection' })
    return false
  }
}
