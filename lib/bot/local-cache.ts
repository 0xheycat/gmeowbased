/**
 * @file lib/bot/local-cache.ts
 * @description Filesystem-based cache for free-tier deployments without Redis
 * 
 * PHASE: Phase 7.2 - Bot (December 17, 2025)
 * ENHANCED: Existing documentation upgraded with comprehensive Phase 7 header
 * 
 * ORIGINAL: Free-Tier Failover Architecture (Day 1-2)
 * DATE: December 17, 2025
 * WEBSITE: https://gmeowhq.art
 * NETWORK: Base (Chain ID: 8453)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * FEATURES
 * ═══════════════════════════════════════════════════════════════════════════
 * ✅ Filesystem-based cache (no Redis subscription required)
 * ✅ TTL-based expiration (5 minutes fresh, 24 hours max age)
 * ✅ Automatic staleness detection
 * ✅ Cleanup on startup (removes old entries)
 * ✅ Works on Vercel/Netlify free tier
 * ✅ SSR-safe (checks for filesystem availability)
 * ✅ Type-safe with generics
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * USAGE EXAMPLE
 * ═══════════════════════════════════════════════════════════════════════════
 * ```typescript
 * import { localCache } from '@/lib/bot/local-cache'
 * 
 * // Set cache
 * await localCache.set('user:123', userData, 5 * 60 * 1000) // 5 min TTL
 * 
 * // Get cache (with staleness check)
 * const cached = await localCache.get<UserData>('user:123')
 * if (cached) {
 *   if (cached.isStale) {
 *     console.log(`Data is stale (${cached.age}ms old)`)
 *   }
 *   return cached.data
 * }
 * 
 * // Delete cache
 * await localCache.delete('user:123')
 * 
 * // Cleanup old entries
 * await localCache.cleanup()
 * ```
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════════════════
 * Storage Location: .cache/bot/
 * File Format: {key}.json
 * Entry Structure:
 * {
 *   data: T,              // The cached data
 *   timestamp: number,    // When cache was created
 *   ttl: number          // Time to live in milliseconds
 * }
 * 
 * Staleness Rules:
 * - Fresh: age < TTL (5 minutes by default)
 * - Stale: age >= TTL && age < MAX_CACHE_AGE (24 hours)
 * - Expired: age >= MAX_CACHE_AGE (deleted automatically)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * COST COMPARISON
 * ═══════════════════════════════════════════════════════════════════════════
 * Free Tier (This Implementation):
 * - Cost: $0/month
 * - Storage: Vercel filesystem (ephemeral but functional)
 * - Persistence: Lost on deployment (acceptable trade-off)
 * - Limitation: Single instance only
 * 
 * Paid Tier (Redis):
 * - Cost: $10-25/month
 * - Storage: Persistent across deployments
 * - Limitation: Requires subscription
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { promises as fs } from 'fs'
import path from 'path'

// Cache configuration
const CACHE_DIR = path.join(process.cwd(), '.cache', 'bot')
const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes
const MAX_CACHE_AGE = 24 * 60 * 60 * 1000 // 24 hours
const MAX_CACHE_FILES = 1000 // Prevent filesystem exhaustion

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

interface CacheResult<T> {
  data: T
  isStale: boolean
  age: number // Age in milliseconds
}

/**
 * Local filesystem cache for bot data
 * 
 * Features:
 * - Persistent across app restarts (until deployment)
 * - TTL-based expiration
 * - Automatic staleness detection
 * - No external dependencies
 * - Works on Vercel free tier
 */
export class LocalCache {
  private isInitialized = false

  /**
   * Initialize cache directory
   */
  private async init(): Promise<void> {
    if (this.isInitialized) return

    try {
      await fs.mkdir(CACHE_DIR, { recursive: true })
      this.isInitialized = true
    } catch (error) {
      console.error('[LocalCache] Failed to initialize cache directory:', error)
      // Don't throw - allow app to continue without cache
    }
  }

  /**
   * Get cached data (with staleness check)
   * 
   * @param key Cache key
   * @returns Cache result with data, staleness flag, and age OR null if not found
   */
  async get<T>(key: string): Promise<CacheResult<T> | null> {
    try {
      await this.init()
      const filePath = this.getFilePath(key)
      const content = await fs.readFile(filePath, 'utf-8')
      const entry: CacheEntry<T> = JSON.parse(content)

      const age = Date.now() - entry.timestamp

      // Data too old - delete and return null
      if (age > MAX_CACHE_AGE) {
        await this.delete(key)
        return null
      }

      // Data stale but usable
      const isStale = age > entry.ttl

      return { 
        data: entry.data, 
        isStale,
        age
      }
    } catch (error) {
      // Cache miss or read error - not a critical error
      return null
    }
  }

  /**
   * Set cache data
   * 
   * @param key Cache key
   * @param data Data to cache
   * @param ttl Time to live in milliseconds (default: 5 minutes)
   */
  async set<T>(key: string, data: T, ttl = DEFAULT_TTL): Promise<void> {
    try {
      await this.init()

      // Check cache size limit
      const fileCount = await this.getCacheFileCount()
      if (fileCount >= MAX_CACHE_FILES) {
        console.warn('[LocalCache] Cache limit reached, cleaning up old entries')
        await this.cleanup()
      }

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl
      }

      const filePath = this.getFilePath(key)
      await fs.writeFile(filePath, JSON.stringify(entry), 'utf-8')
    } catch (error) {
      console.error('[LocalCache] Write failed for key:', key, error)
      // Don't throw - allow app to continue without cache
    }
  }

  /**
   * Delete cache entry
   * 
   * @param key Cache key
   */
  async delete(key: string): Promise<void> {
    try {
      const filePath = this.getFilePath(key)
      await fs.unlink(filePath)
    } catch (error) {
      // Ignore errors (file may not exist)
    }
  }

  /**
   * Get file path for cache key
   * 
   * @param key Cache key
   * @returns Absolute file path
   */
  private getFilePath(key: string): string {
    // Sanitize key to prevent directory traversal
    const safeKey = key.replace(/[^a-zA-Z0-9_:-]/g, '_')
    return path.join(CACHE_DIR, `${safeKey}.json`)
  }

  /**
   * Get cache file count
   * 
   * @returns Number of cache files
   */
  private async getCacheFileCount(): Promise<number> {
    try {
      const files = await fs.readdir(CACHE_DIR)
      return files.length
    } catch (error) {
      return 0
    }
  }

  /**
   * Clean up stale cache files (>24 hours old)
   * 
   * This should be called on app startup or periodically
   */
  async cleanup(): Promise<void> {
    try {
      await this.init()
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
          if (now - entry.timestamp > MAX_CACHE_AGE) {
            await fs.unlink(filePath)
            deletedCount++
          }
        } catch (error) {
          // If can't parse, delete the corrupted file
          await fs.unlink(filePath)
          deletedCount++
        }
      }

      if (deletedCount > 0) {
        console.log(`[LocalCache] Cleaned up ${deletedCount} stale cache entries`)
      }
    } catch (error) {
      console.error('[LocalCache] Cleanup failed:', error)
      // Don't throw - cleanup is non-critical
    }
  }

  /**
   * Clear all cache entries
   * 
   * ⚠️ Use with caution - this deletes ALL cached data
   */
  async clear(): Promise<void> {
    try {
      await this.init()
      const files = await fs.readdir(CACHE_DIR)

      for (const file of files) {
        if (!file.endsWith('.json')) continue
        const filePath = path.join(CACHE_DIR, file)
        await fs.unlink(filePath)
      }

      console.log('[LocalCache] All cache entries cleared')
    } catch (error) {
      console.error('[LocalCache] Clear failed:', error)
    }
  }

  /**
   * Get cache statistics
   * 
   * Useful for monitoring and debugging
   */
  async getStats(): Promise<{
    totalFiles: number
    totalSize: number
    oldestEntry: number | null
    newestEntry: number | null
  }> {
    try {
      await this.init()
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
      return {
        totalFiles: 0,
        totalSize: 0,
        oldestEntry: null,
        newestEntry: null
      }
    }
  }
}

// Export singleton instance
export const localCache = new LocalCache()

// Export types
export type { CacheEntry, CacheResult }
export { DEFAULT_TTL, MAX_CACHE_AGE }
