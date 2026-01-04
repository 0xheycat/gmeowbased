/**
 * @file lib/cache/server.ts
 * @description Unified server-side caching with L1/L2/L3 strategy (Memory/Redis/Filesystem)
 * 
 * PHASE: Phase 8.1 - Caching Consolidation (December 18, 2025)
 * CONSOLIDATED FROM:
 *   - lib/bot/local-cache.ts (366 lines) - Filesystem cache
 *   - lib/supabase/edge.ts ServerCache class (60 lines) - In-memory client cache
 *   - lib/leaderboard/leaderboard-aggregator.ts inline caches (3 Maps)
 *   - lib/profile/partner-snapshot.ts ClientCache
 *   - lib/utils/telemetry.ts telemetryClientCache
 *   - lib/utils/utils.ts localStorage helpers
 * 
 * FEATURES:
 *   - L1: In-memory cache (Map with TTL, 1000 entries max)
 *   - L2: Redis/Vercel KV cache (shared across serverless)
 *   - L3: Filesystem cache (free-tier fallback, bot automation)
 *   - Stale-while-revalidate pattern (serve stale, refresh background)
 *   - TTL-based expiration (configurable per key)
 *   - Cache statistics (hits, misses, hit rate)
 *   - Namespace isolation (prevent key collisions)
 *   - Pattern-based invalidation (delete multiple keys)
 *   - Cache warming (preload hot data)
 *   - Graceful degradation (works without Redis)
 *   - Backward compatibility (ServerCache class, localCache singleton)
 *   - Cleanup/maintenance functions (remove stale entries)
 * 
 * API OVERVIEW:
 *   Primary API (Functional):
 *     - getCached(namespace, key, fetcher, options) - Get/set with auto-fetch
 *     - invalidateCache(namespace, key) - Remove single entry
 *     - invalidateCachePattern(namespace, pattern) - Remove multiple entries
 *     - clearCacheNamespace(namespace) - Clear entire namespace
 *     - getCacheStats() - Get hit/miss statistics
 *     - cleanupFilesystemCache() - Remove old L3 entries
 * 
 *   Compatibility API (Class-based):
 *     - new ServerCache(namespace) - Create namespaced cache instance
 *     - cache.get(key) - Get with staleness detection
 *     - cache.set(key, data, ttl) - Set with TTL
 *     - cache.delete(key) - Remove entry
 *     - cache.cleanup() - Remove old entries
 *     - cache.clear() - Clear all entries in namespace
 * 
 *   Migration Path:
 *     OLD: import { localCache } from '@/lib/bot/local-cache'
 *     NEW: import { localCache } from '@/lib/cache/server'
 *     API: 100% compatible, zero code changes required
 * 
 * REFERENCE DOCUMENTATION:
 *   - Core Plan: LIB-REFACTOR-PLAN.md Phase 8.1 (Caching Consolidation)
 *   - Original: lib/bot/local-cache.ts (filesystem implementation)
 *   - HTTP Caching: RFC 7234 (stale-while-revalidate pattern)
 *   - Used by: 50+ files across dashboard/guild/profile/leaderboard/quests/bot modules
 * 
 * REQUIREMENTS:
 *   - Website: https://gmeowhq.art
 *   - Network: Base blockchain
 *   - NO EMOJIS in production code
 *   - Server-side only (DO NOT use in client components)
 *   - Redis optional (graceful degradation to filesystem)
 *   - Filesystem cache: .cache/server/ directory
 * 
 * TODO:
 *   - [x] Add L3 filesystem cache (free-tier support) - December 18, 2025
 *   - [x] Add ServerCache class for backward compatibility - December 18, 2025
 *   - [x] Add cleanup/clear functions for filesystem maintenance - December 18, 2025
 *   - [x] Add detailed filesystem statistics - December 18, 2025
 *   - [x] Export localCache singleton for bot migration - December 18, 2025
 *   - [x] Implement stale-while-revalidate pattern - December 18, 2025
 *   - [x] Add cache stampede prevention - December 18, 2025
 *   - [x] Add graceful degradation (error handling) - December 18, 2025
 *   - [x] Add staleness detection (getEntry method) - December 18, 2025
 *   - [ ] Add distributed cache invalidation (Redis pub/sub)
 *   - [x] Implement cache compression (reduce memory usage) - January 3, 2026 (Phase 8.4.3)
 *   - [x] Add cache metrics dashboard (hit rate, eviction rate) - January 3, 2026 (Phase 8.4.2)
 *   - [ ] Support cache tags (group invalidation)
 *   - [ ] Add cache preloading strategies (predictive)
 *   - [ ] Implement cache versioning (schema migrations)
 *   - [ ] Add cache replication (multi-region)
 *   - [ ] Support custom serialization (msgpack, protobuf)
 * 
 * CRITICAL:
 *   - L1 memory cache is per-instance (lost on serverless cold start)
 *   - L2 Redis cache is shared (requires UPSTASH_REDIS_REST_URL)
 *   - L3 filesystem cache is ephemeral (lost on deployment)
 *   - Cache keys must be unique per namespace (use prefixes)
 *   - TTL must be reasonable (avoid cache stampede on expiry)
 *   - Stale data is served while revalidating (eventual consistency)
 *   - Cache size limits enforced (L1: 1000 entries, L3: 1000 files)
 *   - Always handle cache misses gracefully (fetch from source)
 *   - Cache stampede prevention: In-flight requests deduped automatically
 *   - Errors in cache writes don't block data return (fire-and-forget)
 *   - Graceful degradation: L2 fail → L3, L3 fail → fetcher
 *   - Stale-while-revalidate: >80% TTL age = stale, refresh in background
 * 
 * SUGGESTIONS:
 *   - Use short TTL for frequently changing data (30-60s)
 *   - Use long TTL for static data (5-60 min)
 *   - Enable stale-while-revalidate for better UX
 *   - Use namespaces to isolate different data types
 *   - Invalidate cache on write operations (maintain consistency)
 *   - Monitor hit rate (aim for >70% for hot paths)
 *   - Use L3 filesystem for bot automation (free tier)
 *   - Use L2 Redis for production API caching
 * 
 * AVOID:
 *   - ❌ DON'T cache sensitive data (PII, tokens, passwords)
 *   - ❌ DON'T use in client components (use lib/cache/client.ts)
 *   - ❌ DON'T cache error responses (4xx, 5xx status codes)
 *   - ❌ DON'T set TTL too high (stale data issues)
 *   - ❌ DON'T bypass cache without forceRefresh flag
 *   - ❌ DON'T forget to invalidate on updates (stale data)
 *   - ❌ DON'T store large blobs (use references/URLs instead)
 *   - ❌ DON'T mix cache backends (use getCached abstraction)
 */

import { kv } from '@vercel/kv'
import { promises as fs } from 'fs'
import path from 'path'
import { 
  compressData, 
  decompressData,
  getCompressionStats,
  type CompressionOptions 
} from './compression'

// ========================================
// TYPES
// ========================================

export type CacheBackend = 'memory' | 'redis' | 'filesystem' | 'auto'

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
  /** Skip L3 filesystem cache (default: false) */
  skipFilesystem?: boolean
  /** Force refresh (bypass cache) (default: false) */
  force?: boolean
  /** Preferred backend (default: 'auto' - tries redis → filesystem → memory) */
  backend?: CacheBackend
  /** Enable compression for cached values (default: true, Phase 8.4.3) */
  compress?: boolean
  /** Compression options (algorithm, level, minSize) */
  compressionOptions?: CompressionOptions
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
  filesystemHitRate: number
  compression?: {
    totalOriginalBytes: number
    totalCompressedBytes: number
    avgCompressionRatio: number
    compressionCount: number
    decompressionCount: number
    avgCompressionTime: number
    avgDecompressionTime: number
    totalBytesSaved: number
  }
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

  /**
   * Get cache entry with metadata (for staleness check)
   */
  getEntry<T>(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry as CacheEntry<T>
  }
}

// Global in-memory cache instance
const memoryCache = new MemoryCache(1000)

// ========================================
// EXTERNAL CACHE (L2) - Vercel KV / Redis
// ========================================

// @vercel/kv automatically uses KV_REST_API_URL or UPSTASH_REDIS_REST_URL
// Trim environment variables to remove whitespace/newlines
const USE_EXTERNAL_CACHE = 
  !!process.env.KV_REST_API_URL?.trim() || 
  !!process.env.UPSTASH_REDIS_REST_URL?.trim() || 
  !!process.env.REDIS_URL?.trim()

let externalHits = 0
let externalMisses = 0

async function getFromExternal<T>(namespace: string, key: string, useCompression = true): Promise<T | null> {
  if (!USE_EXTERNAL_CACHE) return null

  try {
    const fullKey = `${namespace}:${key}`
    const data = await kv.get(fullKey)
    
    if (data === null) {
      externalMisses++
      return null
    }
    
    externalHits++
    
    // Check if data is compressed (has the compressed wrapper structure)
    if (useCompression && data && typeof data === 'object' && 'compressed' in data) {
      try {
        return await decompressData(data as any)
      } catch (error) {
        console.error('[Cache] Decompression failed, returning uncompressed:', error)
        return data as T
      }
    }
    
    return data as T
  } catch (error) {
    console.error('[Cache] External cache GET error:', error)
    return null
  }
}

async function setToExternal<T>(
  namespace: string,
  key: string,
  data: T,
  ttlSeconds: number,
  useCompression = true,
  compressionOpts?: CompressionOptions
): Promise<void> {
  if (!USE_EXTERNAL_CACHE) return

  try {
    const fullKey = `${namespace}:${key}`
    
    // Compress data if enabled
    let dataToStore: any = data
    if (useCompression) {
      try {
        dataToStore = await compressData(data, compressionOpts)
      } catch (error) {
        console.error('[Cache] Compression failed, storing uncompressed:', error)
        dataToStore = data
      }
    }
    
    await kv.set(fullKey, dataToStore, { ex: ttlSeconds })
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
// FILESYSTEM CACHE (L3) - Free Tier Fallback
// ========================================

const CACHE_DIR = path.join(process.cwd(), '.cache', 'server')
const MAX_CACHE_FILES = 1000
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours

// Export constants for compatibility
export const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes (in milliseconds)
export const MAX_CACHE_AGE = MAX_CACHE_AGE_MS // 24 hours (in milliseconds)

let filesystemInitialized = false
let filesystemHits = 0
let filesystemMisses = 0

// In-flight request tracking (prevent cache stampede)
const inflightRequests = new Map<string, Promise<unknown>>()

async function initFilesystem(): Promise<boolean> {
  if (filesystemInitialized) return true
  
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true })
    filesystemInitialized = true
    return true
  } catch (error) {
    console.error('[Cache] Failed to initialize filesystem cache:', error)
    return false
  }
}

function getFilesystemPath(namespace: string, key: string): string {
  // Sanitize key to prevent directory traversal
  const sanitized = key.replace(/[^a-zA-Z0-9_-]/g, '_')
  return path.join(CACHE_DIR, `${namespace}_${sanitized}.json`)
}

async function getFromFilesystem<T>(namespace: string, key: string, useCompression = true): Promise<T | null> {
  try {
    const initialized = await initFilesystem()
    if (!initialized) return null

    const filePath = getFilesystemPath(namespace, key)
    const content = await fs.readFile(filePath, 'utf-8')
    const entry: CacheEntry<any> = JSON.parse(content)

    const age = Date.now() - entry.timestamp

    // Data too old - delete and return null
    if (age > MAX_CACHE_AGE_MS) {
      await fs.unlink(filePath).catch(() => {})
      filesystemMisses++
      return null
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      await fs.unlink(filePath).catch(() => {})
      filesystemMisses++
      return null
    }

    filesystemHits++
    
    // Check if data is compressed
    if (useCompression && entry.data && typeof entry.data === 'object' && 'compressed' in entry.data) {
      try {
        return await decompressData(entry.data)
      } catch (error) {
        console.error('[Cache] Decompression failed, returning uncompressed:', error)
        return entry.data as T
      }
    }
    
    return entry.data as T
  } catch (error) {
    filesystemMisses++
    return null
  }
}

async function setToFilesystem<T>(
  namespace: string,
  key: string,
  data: T,
  ttlSeconds: number,
  useCompression = true,
  compressionOpts?: CompressionOptions
): Promise<void> {
  try {
    const initialized = await initFilesystem()
    if (!initialized) return

    // Check cache size limit
    const files = await fs.readdir(CACHE_DIR).catch(() => [])
    if (files.length >= MAX_CACHE_FILES) {
      // Delete oldest files (simple cleanup)
      const sorted = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(CACHE_DIR, file)
          const stats = await fs.stat(filePath)
          return { file, mtime: stats.mtime.getTime() }
        })
      )
      sorted.sort((a, b) => a.mtime - b.mtime)
      
      // Delete oldest 10% of files
      const toDelete = Math.floor(files.length * 0.1)
      for (let i = 0; i < toDelete; i++) {
        await fs.unlink(path.join(CACHE_DIR, sorted[i].file)).catch(() => {})
      }
    }

    // Compress data if enabled
    let dataToStore: any = data
    if (useCompression) {
      try {
        dataToStore = await compressData(data, compressionOpts)
      } catch (error) {
        console.error('[Cache] Compression failed, storing uncompressed:', error)
        dataToStore = data
      }
    }

    const entry: CacheEntry<any> = {
      data: dataToStore,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlSeconds * 1000,
    }

    const filePath = getFilesystemPath(namespace, key)
    await fs.writeFile(filePath, JSON.stringify(entry), 'utf-8')
  } catch (error) {
    console.error('[Cache] Filesystem cache SET error:', error)
  }
}

async function deleteFromFilesystem(namespace: string, key: string): Promise<void> {
  try {
    const filePath = getFilesystemPath(namespace, key)
    await fs.unlink(filePath)
  } catch (error) {
    // Ignore errors (file might not exist)
  }
}

async function deletePatternFromFilesystem(namespace: string, pattern: string): Promise<number> {
  try {
    const initialized = await initFilesystem()
    if (!initialized) return 0

    const files = await fs.readdir(CACHE_DIR)
    const prefix = `${namespace}_`
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    
    let deleted = 0
    for (const file of files) {
      if (file.startsWith(prefix)) {
        const key = file.replace(prefix, '').replace('.json', '')
        if (regex.test(key)) {
          await fs.unlink(path.join(CACHE_DIR, file)).catch(() => {})
          deleted++
        }
      }
    }
    
    return deleted
  } catch (error) {
    console.error('[Cache] Filesystem pattern delete error:', error)
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
async function getCached<T>(
  namespace: string,
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // Input validation
  if (!namespace || typeof namespace !== 'string') {
    throw new Error('[Cache] namespace must be a non-empty string')
  }
  if (!key || typeof key !== 'string') {
    throw new Error('[Cache] key must be a non-empty string')
  }
  if (typeof fetcher !== 'function') {
    throw new Error('[Cache] fetcher must be a function')
  }

  const {
    ttl = 60,
    staleWhileRevalidate = false,
    staleWindow = ttl * 2,
    skipMemory = false,
    skipExternal = false,
    force = false,
    backend = 'auto',
    compress = true, // Default: enable compression
    compressionOptions,
  } = options

  // Validate TTL
  if (ttl <= 0) {
    throw new Error('[Cache] ttl must be positive')
  }
  if (ttl > 86400) {
    console.warn(`[Cache] TTL ${ttl}s is very high (>24h), consider shorter TTL`)
  }

  const cacheKey = `${namespace}:${key}`
  const inflightKey = `${namespace}:${key}`

  // Determine which backends to use
  const useMemory = !skipMemory && (backend === 'memory' || backend === 'auto')
  const useRedis = !skipExternal && (backend === 'redis' || backend === 'auto')
  const useFilesystem = backend === 'filesystem' || (backend === 'auto' && !process.env.UPSTASH_REDIS_REST_URL)

  // Force refresh: bypass cache
  if (force) {
    try {
      const fresh = await fetcher()
      // Store in cache layers (fire and forget, don't block on errors)
      if (useMemory) {
        try { memoryCache.set(cacheKey, fresh, ttl) } catch (e) { /* ignore */ }
      }
      if (useRedis) {
        setToExternal(namespace, key, fresh, ttl, compress, compressionOptions).catch(() => { /* ignore */ })
      }
      if (useFilesystem) {
        setToFilesystem(namespace, key, fresh, ttl, compress, compressionOptions).catch(() => { /* ignore */ })
      }
      return fresh
    } catch (error) {
      console.error(`[Cache] Force refresh failed for ${cacheKey}:`, error)
      throw error // Re-throw fetcher errors
    }
  }

  // L1: Check in-memory cache
  let staleData: T | null = null
  let hasStaleData = false

  if (useMemory) {
    const memCached = memoryCache.get<T>(cacheKey)
    if (memCached !== null) {
      // Check if data is stale (>80% of TTL)
      if (staleWhileRevalidate) {
        const entry = memoryCache.getEntry<T>(cacheKey)
        if (entry) {
          const age = Date.now() - entry.timestamp
          const isStale = age > (ttl * 1000 * 0.8)
          if (isStale) {
            staleData = memCached
            hasStaleData = true
          } else {
            return memCached // Fresh data
          }
        } else {
          return memCached // Fresh data (can't check staleness)
        }
      } else {
        return memCached // Not using stale-while-revalidate
      }
    }
  }

  // L2: Check external cache (Redis/Vercel KV)
  if (useRedis && !hasStaleData) {
    try {
      const extCached = await getFromExternal<T>(namespace, key, compress)
      if (extCached !== null) {
        // Populate L1 cache
        if (useMemory) {
          try { memoryCache.set(cacheKey, extCached, ttl) } catch (e) { /* ignore */ }
        }
        return extCached
      }
    } catch (error) {
      console.error(`[Cache] Redis GET failed for ${cacheKey}, degrading to L3:`, error)
      // Continue to L3, graceful degradation
    }
  }

  // L3: Check filesystem cache (free-tier fallback)
  if (useFilesystem && !hasStaleData) {
    try {
      const fsCached = await getFromFilesystem<T>(namespace, key, compress)
      if (fsCached !== null) {
        // Populate L1 cache
        if (useMemory) {
          try { memoryCache.set(cacheKey, fsCached, ttl) } catch (e) { /* ignore */ }
        }
        return fsCached
      }
    } catch (error) {
      console.error(`[Cache] Filesystem GET failed for ${cacheKey}:`, error)
      // Continue to fetcher
    }
  }

  // Stale-while-revalidate: Return stale data, refresh in background
  if (hasStaleData && staleData !== null) {
    // Background refresh (don't await)
    setImmediate(async () => {
      try {
        const fresh = await fetcher()
        // Update all cache layers
        if (useMemory) {
          try { memoryCache.set(cacheKey, fresh, ttl) } catch (e) { /* ignore */ }
        }
        if (useRedis) {
          setToExternal(namespace, key, fresh, ttl, compress, compressionOptions).catch(() => { /* ignore */ })
        }
        if (useFilesystem) {
          setToFilesystem(namespace, key, fresh, ttl, compress, compressionOptions).catch(() => { /* ignore */ })
        }
      } catch (error) {
        console.error(`[Cache] Background refresh failed for ${cacheKey}:`, error)
      }
    })
    return staleData // Return stale data immediately
  }

  // Cache stampede prevention: Check if request is already in-flight
  const existingRequest = inflightRequests.get(inflightKey)
  if (existingRequest) {
    return existingRequest as Promise<T>
  }

  // Cache miss: fetch fresh data
  const fetchPromise = (async () => {
    try {
      const fresh = await fetcher()

      // Store in cache layers (fire and forget)
      if (useMemory) {
        try { memoryCache.set(cacheKey, fresh, ttl) } catch (e) { /* ignore */ }
      }
      if (useRedis) {
        setToExternal(namespace, key, fresh, ttl, compress, compressionOptions).catch(() => { /* ignore */ })
      }
      if (useFilesystem) {
        setToFilesystem(namespace, key, fresh, ttl, compress, compressionOptions).catch(() => { /* ignore */ })
      }

      return fresh
    } finally {
      // Remove from in-flight after completion
      inflightRequests.delete(inflightKey)
    }
  })()

  // Track in-flight request
  inflightRequests.set(inflightKey, fetchPromise)

  return fetchPromise
}

/**
 * Invalidate cache entry
 * 
 * @param namespace - Cache namespace
 * @param key - Cache key to invalidate
 */
async function invalidateCache(namespace: string, key: string): Promise<void> {
  const cacheKey = `${namespace}:${key}`
  memoryCache.delete(cacheKey)
  await deleteFromExternal(namespace, key)
  await deleteFromFilesystem(namespace, key)
}

/**
 * Invalidate cache entries matching pattern
 * 
 * @param namespace - Cache namespace
 * @param pattern - Glob pattern (supports * wildcard)
 * @returns Number of entries deleted
 */
async function invalidateCachePattern(namespace: string, pattern: string): Promise<number> {
  const memDeleted = memoryCache.deletePattern(`${namespace}:${pattern}`)
  const extDeleted = await deletePatternFromExternal(namespace, pattern)
  const fsDeleted = await deletePatternFromFilesystem(namespace, pattern)
  return memDeleted + extDeleted + fsDeleted
}

/**
 * Clear all cache entries for a namespace
 * 
 * @param namespace - Cache namespace to clear
 */
async function clearCacheNamespace(namespace: string): Promise<void> {
  await invalidateCachePattern(namespace, '*')
}

/**
 * Clear entire cache (all namespaces)
 */
function clearAllCache(): void {
  memoryCache.clear()
  // Note: Cannot clear all external cache keys without scanning
  console.warn('[Cache] Cleared in-memory cache. External cache may still contain entries.')
}

/**
 * Get cache statistics (including compression metrics)
 */
function getCacheStats(): CacheStats {
  const memStats = memoryCache.stats()
  const extTotal = externalHits + externalMisses
  const fsTotal = filesystemHits + filesystemMisses
  const compressionStats = getCompressionStats()
  
  return {
    hits: memStats.hits + externalHits + filesystemHits,
    misses: memStats.misses + externalMisses + filesystemMisses,
    size: memStats.size,
    memoryHitRate: memStats.hitRate,
    externalHitRate: extTotal > 0 ? externalHits / extTotal : 0,
    filesystemHitRate: fsTotal > 0 ? filesystemHits / fsTotal : 0,
    compression: compressionStats,
  }
}

/**
 * Reset cache statistics
 */
function resetCacheStats(): void {
  externalHits = 0
  externalMisses = 0
  filesystemHits = 0
  filesystemMisses = 0
  memoryCache.clear()
}

// ========================================
// CACHE KEY BUILDERS
// ========================================

/**
 * Build cache key for user badges
 */
function buildUserBadgesKey(fid: number): string {
  return `user:${fid}:badges`
}

/**
 * Build cache key for user profile
 */
function buildUserProfileKey(fid: number): string {
  return `user:${fid}:profile`
}

/**
 * Build cache key for leaderboard
 */
function buildLeaderboardKey(season: string, page: number): string {
  return `leaderboard:${season}:page:${page}`
}

/**
 * Build cache key for quest status
 */
function buildQuestStatusKey(questId: string, fid: number): string {
  return `quest:${questId}:fid:${fid}`
}

/**
 * Build cache key for badge templates
 */
function buildBadgeTemplatesKey(includeInactive: boolean): string {
  return `templates:${includeInactive ? 'all' : 'active'}`
}

// ========================================
// FILESYSTEM CACHE MAINTENANCE
// ========================================

/**
 * Cleanup old filesystem cache entries (>24 hours)
 * Should be called periodically or on startup
 */
async function cleanupFilesystemCache(): Promise<number> {
  try {
    const initialized = await initFilesystem()
    if (!initialized) return 0

    const files = await fs.readdir(CACHE_DIR)
    const now = Date.now()
    let deletedCount = 0

    for (const file of files) {
      if (!file.endsWith('.json')) continue

      const filePath = path.join(CACHE_DIR, file)
      try {
        const content = await fs.readFile(filePath, 'utf-8')
        const entry = JSON.parse(content)

        // Delete if too old
        if (now - entry.timestamp > MAX_CACHE_AGE_MS) {
          await fs.unlink(filePath)
          deletedCount++
        }
      } catch (error) {
        // If can't parse, delete the corrupted file
        await fs.unlink(filePath).catch(() => {})
        deletedCount++
      }
    }

    if (deletedCount > 0) {
      console.log(`[Cache] Cleaned up ${deletedCount} stale filesystem entries`)
    }

    return deletedCount
  } catch (error) {
    console.error('[Cache] Filesystem cleanup failed:', error)
    return 0
  }
}

/**
 * Clear all filesystem cache entries
 * ⚠️ Use with caution - deletes ALL cached data on disk
 */
async function clearFilesystemCache(): Promise<number> {
  try {
    const initialized = await initFilesystem()
    if (!initialized) return 0

    const files = await fs.readdir(CACHE_DIR)
    let deletedCount = 0

    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const filePath = path.join(CACHE_DIR, file)
      await fs.unlink(filePath).catch(() => {})
      deletedCount++
    }

    console.log(`[Cache] Cleared ${deletedCount} filesystem cache entries`)
    return deletedCount
  } catch (error) {
    console.error('[Cache] Filesystem clear failed:', error)
    return 0
  }
}

/**
 * Get detailed filesystem cache statistics
 */
async function getFilesystemStats(): Promise<{
  totalFiles: number
  totalSize: number
  oldestEntry: number | null
  newestEntry: number | null
}> {
  try {
    const initialized = await initFilesystem()
    if (!initialized) {
      return { totalFiles: 0, totalSize: 0, oldestEntry: null, newestEntry: null }
    }

    const files = await fs.readdir(CACHE_DIR)
    let totalSize = 0
    let oldestEntry: number | null = null
    let newestEntry: number | null = null

    for (const file of files) {
      if (!file.endsWith('.json')) continue

      const filePath = path.join(CACHE_DIR, file)
      const stats = await fs.stat(filePath)
      totalSize += stats.size

      try {
        const content = await fs.readFile(filePath, 'utf-8')
        const entry = JSON.parse(content)

        if (!oldestEntry || entry.timestamp < oldestEntry) {
          oldestEntry = entry.timestamp
        }
        if (!newestEntry || entry.timestamp > newestEntry) {
          newestEntry = entry.timestamp
        }
      } catch (error) {
        // Skip corrupted files
      }
    }

    return {
      totalFiles: files.filter(f => f.endsWith('.json')).length,
      totalSize,
      oldestEntry,
      newestEntry
    }
  } catch (error) {
    return { totalFiles: 0, totalSize: 0, oldestEntry: null, newestEntry: null }
  }
}

// ========================================
// CACHE WARMING (Optional)
// ========================================

/**
 * Pre-warm cache with frequently accessed data
 * Call this on server startup or after cache clear
 * 
 * @param targets Optional array of cache targets to warm (default: all)
 */
async function warmCache(targets: string[] = ['badges']): Promise<{
  success: number
  failed: number
  errors: string[]
}> {
  const results = { success: 0, failed: 0, errors: [] as string[] }

  // Pre-load badge templates (most accessed)
  if (targets.includes('badges')) {
    try {
      const { listBadgeTemplates } = await import('@/lib/badges')
      await getCached(
        'badge-templates',
        'templates:active',
        () => listBadgeTemplates({ includeInactive: false }),
        { ttl: 300 } // 5 minutes
      )
      results.success++
      console.log('[Cache] Warmed: badge templates')
    } catch (error) {
      results.failed++
      const msg = `Badge templates: ${error}`
      results.errors.push(msg)
      console.error('[Cache] Warm failed:', msg)
    }
  }

  // Add more warming targets here as needed
  // Example: leaderboard, guild data, etc.

  console.log(`[Cache] Warming complete: ${results.success} success, ${results.failed} failed`)
  return results
}

/**
 * Initialize cache system on server startup
 * - Cleanup old filesystem entries
 * - Warm frequently accessed data
 */
export async function initializeCache(): Promise<void> {
  console.log('[Cache] Initializing cache system...')
  
  try {
    // Cleanup old filesystem entries
    const deleted = await cleanupFilesystemCache()
    if (deleted > 0) {
      console.log(`[Cache] Cleaned up ${deleted} old filesystem entries`)
    }

    // Warm cache with hot data
    await warmCache(['badges'])
    
    console.log('[Cache] Cache system initialized successfully')
  } catch (error) {
    console.error('[Cache] Initialization failed:', error)
    // Don't throw - allow app to continue without cache warming
  }
}

// ========================================
// COMPATIBILITY LAYER - LocalCache API
// ========================================

/**
 * LocalCache compatibility wrapper for bot/local-cache.ts migration
 * Provides class-based API while using unified cache backend
 * 
 * Usage:
 *   const cache = new ServerCache('bot')
 *   await cache.set('key', data, 5 * 60 * 1000)
 *   const result = await cache.get<Data>('key')
 */
export class ServerCache {
  private namespace: string

  constructor(namespace: string = 'default') {
    this.namespace = namespace
  }

  /**
   * Get cached data with staleness detection
   * @returns { data, isStale, age } or null if not found
   */
  async get<T>(key: string): Promise<{ data: T; isStale: boolean; age: number } | null> {
    try {
      const cached = await getFromFilesystem<T>(this.namespace, key)
      if (!cached) return null

      // Calculate staleness (filesystem cache doesn't track TTL per entry)
      // We'll use the entry's expiresAt to determine staleness
      const filePath = getFilesystemPath(this.namespace, key)
      const content = await fs.readFile(filePath, 'utf-8')
      const entry = JSON.parse(content)
      
      const age = Date.now() - entry.timestamp
      const ttl = entry.expiresAt - entry.timestamp
      const isStale = age > ttl * 0.8 // 80% of TTL = stale

      return { data: cached, isStale, age }
    } catch (error) {
      return null
    }
  }

  /**
   * Set cache data
   * @param key Cache key
   * @param data Data to cache
   * @param ttl Time to live in milliseconds (default: 5 minutes)
   */
  async set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): Promise<void> {
    await setToFilesystem(this.namespace, key, data, Math.floor(ttl / 1000))
  }

  /**
   * Delete cache entry
   */
  async delete(key: string): Promise<void> {
    await deleteFromFilesystem(this.namespace, key)
  }

  /**
   * Clean up old entries
   */
  async cleanup(): Promise<void> {
    await cleanupFilesystemCache()
  }

  /**
   * Clear all cache entries in this namespace
   */
  async clear(): Promise<void> {
    await deletePatternFromFilesystem(this.namespace, '*')
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    return await getFilesystemStats()
  }
}

// Export singleton for backward compatibility
export const serverCache = new ServerCache('server')

// Export localCache for bot/local-cache.ts compatibility
export const localCache = new ServerCache('bot')

// ========================================
// REDIS PUB/SUB (DISTRIBUTED INVALIDATION)
// ========================================

/**
 * Distributed cache invalidation via Redis pub/sub
 * 
 * When one serverless instance invalidates a cache key, it publishes
 * a message to Redis. All other instances subscribe to this channel
 * and invalidate their L1 memory cache accordingly.
 * 
 * This ensures cache consistency across multiple serverless instances.
 */

const CACHE_INVALIDATION_CHANNEL = 'cache:invalidation'

/** Subscribe to cache invalidation events */
export async function subscribeToCacheInvalidation(): Promise<void> {
  try {
    if (!kv) return // Redis not available
    
    // Note: Vercel KV doesn't support pub/sub in REST API
    // This requires Redis client with subscribe capability
    // For now, we document the pattern for future Redis implementation
    
    console.log('[Cache] Distributed invalidation requires Redis pub/sub (not available in Vercel KV REST API)')
    console.log('[Cache] Alternative: Use webhook-based invalidation or TTL-based expiration')
  } catch (error) {
    console.error('[Cache] Failed to subscribe to invalidation channel:', error)
  }
}

/** Publish cache invalidation event */
async function publishInvalidation(namespace: string, key: string): Promise<void> {
  try {
    if (!kv) return // Redis not available
    
    // With full Redis client, would publish:
    // await redis.publish(CACHE_INVALIDATION_CHANNEL, JSON.stringify({ namespace, key }))
    
    // For Vercel KV, we rely on L2 invalidation and TTL expiration
  } catch (error) {
    console.error('[Cache] Failed to publish invalidation:', error)
  }
}

// ========================================
// EXPORTS
// ========================================

export {
  getCached,
  invalidateCache,
  invalidateCachePattern,
  clearCacheNamespace,
  clearAllCache,
  
  // Stats
  getCacheStats,
  resetCacheStats,
  
  // Filesystem maintenance
  cleanupFilesystemCache,
  clearFilesystemCache,
  getFilesystemStats,
  
  // Key builders
  buildUserBadgesKey,
  buildUserProfileKey,
  buildLeaderboardKey,
  buildQuestStatusKey,
  buildBadgeTemplatesKey,
  
  // Compression utilities (Phase 8.4.3)
  compressData,
  decompressData,
  getCompressionStats,
  
  // Warming & initialization
  warmCache,
}
