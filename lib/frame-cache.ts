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

import { Redis } from '@upstash/redis'
import { createHash } from 'crypto'

// Initialize Redis client (singleton pattern)
let redisClient: Redis | null = null

function getRedisClient(): Redis | null {
  // Check if Redis credentials are configured
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('[FRAME_CACHE] Redis not configured, caching disabled')
    return null
  }

  // Return existing client or create new one
  if (!redisClient) {
    try {
      redisClient = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
      console.log('[FRAME_CACHE] Redis client initialized')
    } catch (err) {
      console.error('[FRAME_CACHE] Failed to initialize Redis:', err)
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
      console.log(`[FRAME_CACHE] HIT: ${cacheKey}`)
      return Buffer.from(cached, 'base64')
    }

    console.log(`[FRAME_CACHE] MISS: ${cacheKey}`)
    return null
  } catch (err) {
    console.error('[FRAME_CACHE] Get error:', err)
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
    console.log(`[FRAME_CACHE] SET: ${cacheKey} (TTL: ${ttl}s, Size: ${Math.round(base64Image.length / 1024)}KB)`)
    return true
  } catch (err) {
    console.error('[FRAME_CACHE] Set error:', err)
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
    console.log(`[FRAME_CACHE] INVALIDATED: ${cacheKey}`)
    return true
  } catch (err) {
    console.error('[FRAME_CACHE] Invalidate error:', err)
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
      console.log(`[FRAME_CACHE] No frames found for FID ${fid}`)
      return 0
    }

    await redis.del(...keys)
    console.log(`[FRAME_CACHE] Invalidated ${keys.length} frames for FID ${fid}`)
    return keys.length
  } catch (err) {
    console.error('[FRAME_CACHE] Invalidate user frames error:', err)
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
    console.log(`[FRAME_CACHE] Cleared ${keys.length} cached frames`)
    return keys.length
  } catch (err) {
    console.error('[FRAME_CACHE] Clear all error:', err)
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
    console.error('[FRAME_CACHE] Connection test failed:', err)
    return false
  }
}
