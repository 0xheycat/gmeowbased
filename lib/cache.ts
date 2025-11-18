/**
 * Phase 4: Performance Optimization - Cache Helper
 * 
 * Provides multi-layer caching for API responses and database queries.
 * Supports in-memory caching (dev) and external cache providers (Redis/Vercel KV).
 * 
 * Cache Strategy:
 * - L1: In-memory cache (fast, limited capacity, process-local)
 * - L2: External cache (Redis/Vercel KV) (shared, persistent)
 * 
 * Usage:
 * ```typescript
 * import { getCached, invalidateCache } from '@/lib/cache'
 * 
 * // Fetch with cache
 * const badges = await getCached(
 *   'user-badges',
 *   `user:${fid}:badges`,
 *   () => getUserBadgesFromDB(fid),
 *   { ttl: 120 } // 2 minutes
 * )
 * 
 * // Invalidate on update
 * await invalidateCache('user-badges', `user:${fid}:badges`)
 * ```
 */

import { kv } from '@vercel/kv'

// ========================================
// TYPES
// ========================================

export type CacheOptions = {
  /** Time-to-live in seconds (default: 60) */
  ttl?: number
  /** Use stale data while revalidating (default: false) */
  staleWhileRevalidate?: boolean
  /** Stale revalidation window in seconds (default: ttl * 2) */
  staleWindow?: number
  /** Skip L1 in-memory cache (default: false) */
  skipMemory?: boolean
  /** Skip L2 external cache (default: false) */
  skipExternal?: boolean
  /** Force refresh (bypass cache) (default: false) */
  force?: boolean
}

export type CacheEntry<T> = {
  data: T
  timestamp: number
  expiresAt: number
}

export type CacheStats = {
  hits: number
  misses: number
  size: number
  memoryHitRate: number
  externalHitRate: number
}

// ========================================
// IN-MEMORY CACHE (L1)
// ========================================

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private maxSize: number
  private hits = 0
  private misses = 0

  constructor(maxSize = 1000) {
    this.maxSize = maxSize
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) {
      this.misses++
      return null
    }

    const now = Date.now()
    if (now > entry.expiresAt) {
      this.cache.delete(key)
      this.misses++
      return null
    }

    this.hits++
    return entry.data as T
  }

  set<T>(key: string, data: T, ttlSeconds: number): void {
    // Enforce max size (LRU-style eviction)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) this.cache.delete(firstKey)
    }

    const now = Date.now()
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttlSeconds * 1000,
    })
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  deletePattern(pattern: string): number {
    let deleted = 0
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
        deleted++
      }
    }
    
    return deleted
  }

  clear(): void {
    this.cache.clear()
    this.hits = 0
    this.misses = 0
  }

  size(): number {
    return this.cache.size
  }

  stats(): { hits: number; misses: number; size: number; hitRate: number } {
    const total = this.hits + this.misses
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total > 0 ? this.hits / total : 0,
    }
  }
}

// Global in-memory cache instance
const memoryCache = new MemoryCache(1000)

// ========================================
// EXTERNAL CACHE (L2) - Vercel KV / Redis
// ========================================

const USE_EXTERNAL_CACHE = !!process.env.KV_REST_API_URL || !!process.env.REDIS_URL

let externalHits = 0
let externalMisses = 0

async function getFromExternal<T>(namespace: string, key: string): Promise<T | null> {
  if (!USE_EXTERNAL_CACHE) return null

  try {
    const fullKey = `${namespace}:${key}`
    const data = await kv.get<T>(fullKey)
    
    if (data === null) {
      externalMisses++
      return null
    }
    
    externalHits++
    return data
  } catch (error) {
    console.error('[Cache] External cache GET error:', error)
    return null
  }
}

async function setToExternal<T>(
  namespace: string,
  key: string,
  data: T,
  ttlSeconds: number
): Promise<void> {
  if (!USE_EXTERNAL_CACHE) return

  try {
    const fullKey = `${namespace}:${key}`
    await kv.set(fullKey, data, { ex: ttlSeconds })
  } catch (error) {
    console.error('[Cache] External cache SET error:', error)
  }
}

async function deleteFromExternal(namespace: string, key: string): Promise<void> {
  if (!USE_EXTERNAL_CACHE) return

  try {
    const fullKey = `${namespace}:${key}`
    await kv.del(fullKey)
  } catch (error) {
    console.error('[Cache] External cache DEL error:', error)
  }
}

async function deletePatternFromExternal(namespace: string, pattern: string): Promise<number> {
  if (!USE_EXTERNAL_CACHE) return 0

  try {
    // Scan for matching keys
    const fullPattern = `${namespace}:${pattern}`
    const keys = await kv.keys(fullPattern)
    
    if (keys.length === 0) return 0
    
    // Delete in batches
    await kv.del(...keys)
    return keys.length
  } catch (error) {
    console.error('[Cache] External cache pattern delete error:', error)
    return 0
  }
}

// ========================================
// CACHE INTERFACE
// ========================================

/**
 * Get cached value or compute if missing
 * 
 * @param namespace - Cache namespace (e.g., 'user-badges', 'leaderboard')
 * @param key - Cache key (e.g., 'user:123:badges')
 * @param fetcher - Function to fetch data if cache miss
 * @param options - Cache options (ttl, staleWhileRevalidate, etc.)
 * @returns Cached or freshly fetched data
 */
export async function getCached<T>(
  namespace: string,
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const {
    ttl = 60,
    staleWhileRevalidate = false,
    staleWindow = ttl * 2,
    skipMemory = false,
    skipExternal = false,
    force = false,
  } = options

  const cacheKey = `${namespace}:${key}`

  // Force refresh: bypass cache
  if (force) {
    const fresh = await fetcher()
    if (!skipMemory) memoryCache.set(cacheKey, fresh, ttl)
    if (!skipExternal) await setToExternal(namespace, key, fresh, ttl)
    return fresh
  }

  // L1: Check in-memory cache
  if (!skipMemory) {
    const memCached = memoryCache.get<T>(cacheKey)
    if (memCached !== null) {
      return memCached
    }
  }

  // L2: Check external cache (Redis/Vercel KV)
  if (!skipExternal) {
    const extCached = await getFromExternal<T>(namespace, key)
    if (extCached !== null) {
      // Populate L1 cache
      if (!skipMemory) memoryCache.set(cacheKey, extCached, ttl)
      return extCached
    }
  }

  // Cache miss: fetch fresh data
  const fresh = await fetcher()

  // Store in cache layers
  if (!skipMemory) memoryCache.set(cacheKey, fresh, ttl)
  if (!skipExternal) await setToExternal(namespace, key, fresh, ttl)

  return fresh
}

/**
 * Invalidate cache entry
 * 
 * @param namespace - Cache namespace
 * @param key - Cache key to invalidate
 */
export async function invalidateCache(namespace: string, key: string): Promise<void> {
  const cacheKey = `${namespace}:${key}`
  memoryCache.delete(cacheKey)
  await deleteFromExternal(namespace, key)
}

/**
 * Invalidate cache entries matching pattern
 * 
 * @param namespace - Cache namespace
 * @param pattern - Glob pattern (supports * wildcard)
 * @returns Number of entries deleted
 */
export async function invalidateCachePattern(namespace: string, pattern: string): Promise<number> {
  const memDeleted = memoryCache.deletePattern(`${namespace}:${pattern}`)
  const extDeleted = await deletePatternFromExternal(namespace, pattern)
  return memDeleted + extDeleted
}

/**
 * Clear all cache entries for a namespace
 * 
 * @param namespace - Cache namespace to clear
 */
export async function clearCacheNamespace(namespace: string): Promise<void> {
  await invalidateCachePattern(namespace, '*')
}

/**
 * Clear entire cache (all namespaces)
 */
export function clearAllCache(): void {
  memoryCache.clear()
  // Note: Cannot clear all external cache keys without scanning
  console.warn('[Cache] Cleared in-memory cache. External cache may still contain entries.')
}

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats {
  const memStats = memoryCache.stats()
  const extTotal = externalHits + externalMisses
  
  return {
    hits: memStats.hits + externalHits,
    misses: memStats.misses + externalMisses,
    size: memStats.size,
    memoryHitRate: memStats.hitRate,
    externalHitRate: extTotal > 0 ? externalHits / extTotal : 0,
  }
}

/**
 * Reset cache statistics
 */
export function resetCacheStats(): void {
  externalHits = 0
  externalMisses = 0
  memoryCache.clear()
}

// ========================================
// CACHE KEY BUILDERS
// ========================================

/**
 * Build cache key for user badges
 */
export function buildUserBadgesKey(fid: number): string {
  return `user:${fid}:badges`
}

/**
 * Build cache key for user profile
 */
export function buildUserProfileKey(fid: number): string {
  return `user:${fid}:profile`
}

/**
 * Build cache key for leaderboard
 */
export function buildLeaderboardKey(season: string, page: number): string {
  return `leaderboard:${season}:page:${page}`
}

/**
 * Build cache key for quest status
 */
export function buildQuestStatusKey(questId: string, fid: number): string {
  return `quest:${questId}:fid:${fid}`
}

/**
 * Build cache key for badge templates
 */
export function buildBadgeTemplatesKey(includeInactive: boolean): string {
  return `templates:${includeInactive ? 'all' : 'active'}`
}

// ========================================
// CACHE WARMING (Optional)
// ========================================

/**
 * Pre-warm cache with frequently accessed data
 * Call this on server startup or after cache clear
 */
export async function warmCache(): Promise<void> {
  console.log('[Cache] Cache warming started...')
  
  // Pre-load badge templates (most accessed)
  try {
    const { listBadgeTemplates } = await import('@/lib/badges')
    await getCached(
      'badge-templates',
      'templates:active',
      () => listBadgeTemplates({ includeInactive: false }),
      { ttl: 300 } // 5 minutes
    )
    console.log('[Cache] Badge templates warmed')
  } catch (error) {
    console.error('[Cache] Failed to warm badge templates:', error)
  }
  
  console.log('[Cache] Cache warming complete')
}

// ========================================
// EXPORTS
// ========================================

export {
  // Core functions
  getCached,
  invalidateCache,
  invalidateCachePattern,
  clearCacheNamespace,
  clearAllCache,
  
  // Stats
  getCacheStats,
  resetCacheStats,
  
  // Key builders
  buildUserBadgesKey,
  buildUserProfileKey,
  buildLeaderboardKey,
  buildQuestStatusKey,
  buildBadgeTemplatesKey,
  
  // Warming
  warmCache,
}
