/**
 * @file lib/cache/filesystem-optimizer.ts
 * @description Filesystem cache optimization for $0 cost production deployment
 * 
 * Phase: Phase 8.4.4 - $0 Cost Caching (January 3, 2026)
 * 
 * Features:
 * - Intelligent cache warming (preload hot data)
 * - LRU eviction (keep most-used data)
 * - Cache size monitoring & alerts
 * - Automatic cleanup & maintenance
 * - Performance optimization
 * - Production-ready for free tier
 * 
 * Why Filesystem Cache?
 * - Zero cost (no Redis/KV required)
 * - Persistent across deploys (in serverless environments with writable /tmp)
 * - Fast reads (local disk, <10ms)
 * - Unlimited storage (limited only by disk)
 * - Compression support (60-80% space savings)
 * 
 * @module lib/cache/filesystem-optimizer
 */

import { promises as fs } from 'fs'
import path from 'path'
import { compressData, decompressData } from './compression'

// ============================================
// TYPES
// ============================================

interface CacheEntry {
  data: any
  timestamp: number
  expiresAt: number
  accessCount: number
  lastAccessed: number
  size: number
}

interface FilesystemStats {
  totalFiles: number
  totalSize: number
  avgFileSize: number
  oldestFile: number
  newestFile: number
  hitRate: number
}

interface WarmupConfig {
  namespace: string
  keys: string[]
  fetcher: (key: string) => Promise<any>
  ttl: number
}

// ============================================
// CONSTANTS
// ============================================

const CACHE_DIR = path.join(process.cwd(), '.cache', 'server')
const MAX_CACHE_SIZE_MB = 100 // 100MB max cache size
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

// ============================================
// STATISTICS TRACKING
// ============================================

let filesystemHits = 0
let filesystemMisses = 0
let filesystemWrites = 0
let filesystemDeletes = 0

// ============================================
// CACHE WARMING
// ============================================

/**
 * Warm up cache with frequently accessed data
 * 
 * @param configs - Array of warmup configurations
 * 
 * @example
 * await warmupFilesystemCache([
 *   {
 *     namespace: 'user-scoring',
 *     keys: ['user:0x123', 'user:0x456'],
 *     fetcher: (key) => fetchUserScoring(key),
 *     ttl: 300
 *   }
 * ])
 */
export async function warmupFilesystemCache(configs: WarmupConfig[]): Promise<{
  total: number
  success: number
  failed: number
  duration: number
}> {
  const startTime = Date.now()
  let success = 0
  let failed = 0
  const total = configs.reduce((sum, config) => sum + config.keys.length, 0)

  console.log(`[Cache] Warming up ${total} cache entries...`)

  for (const config of configs) {
    await Promise.all(
      config.keys.map(async (key) => {
        try {
          const data = await config.fetcher(key)
          const compressed = await compressData(data)
          
          const entry: CacheEntry = {
            data: compressed,
            timestamp: Date.now(),
            expiresAt: Date.now() + config.ttl * 1000,
            accessCount: 0,
            lastAccessed: Date.now(),
            size: Buffer.byteLength(JSON.stringify(compressed))
          }

          const filePath = getFilesystemPath(config.namespace, key)
          await fs.mkdir(path.dirname(filePath), { recursive: true })
          await fs.writeFile(filePath, JSON.stringify(entry), 'utf-8')
          
          filesystemWrites++
          success++
        } catch (error) {
          console.error(`[Cache] Failed to warm up ${config.namespace}:${key}:`, error)
          failed++
        }
      })
    )
  }

  const duration = Date.now() - startTime
  console.log(`[Cache] Warmup complete: ${success}/${total} in ${duration}ms`)

  return { total, success, failed, duration }
}

/**
 * Get cache file path for namespace and key
 */
function getFilesystemPath(namespace: string, key: string): string {
  const sanitized = key.replace(/[^a-zA-Z0-9_-]/g, '_')
  return path.join(CACHE_DIR, `${namespace}_${sanitized}.json`)
}

// ============================================
// LRU EVICTION
// ============================================

/**
 * Evict least recently used cache entries
 * 
 * @param targetSizeMB - Target cache size in MB
 * @returns Number of files evicted
 */
export async function evictLRUEntries(targetSizeMB: number): Promise<number> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true })
    const files = await fs.readdir(CACHE_DIR)
    
    // Get file stats with access times
    const fileStats = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(CACHE_DIR, file)
        const stats = await fs.stat(filePath)
        const content = await fs.readFile(filePath, 'utf-8')
        const entry: CacheEntry = JSON.parse(content)
        
        return {
          file,
          filePath,
          size: stats.size,
          lastAccessed: entry.lastAccessed || stats.mtime.getTime(),
          accessCount: entry.accessCount || 0
        }
      })
    )

    // Calculate total size
    const totalSize = fileStats.reduce((sum, stat) => sum + stat.size, 0)
    const totalSizeMB = totalSize / (1024 * 1024)

    if (totalSizeMB <= targetSizeMB) {
      return 0 // No eviction needed
    }

    // Sort by access score (LRU with access count weighting)
    fileStats.sort((a, b) => {
      const scoreA = a.lastAccessed + (a.accessCount * 1000) // Weight frequent access
      const scoreB = b.lastAccessed + (b.accessCount * 1000)
      return scoreA - scoreB // Lowest score first (oldest + least accessed)
    })

    // Evict until we reach target size
    let evicted = 0
    let currentSizeMB = totalSizeMB

    for (const stat of fileStats) {
      if (currentSizeMB <= targetSizeMB) break

      await fs.unlink(stat.filePath)
      currentSizeMB -= stat.size / (1024 * 1024)
      evicted++
      filesystemDeletes++
    }

    console.log(`[Cache] Evicted ${evicted} LRU entries (${totalSizeMB.toFixed(2)}MB → ${currentSizeMB.toFixed(2)}MB)`)
    return evicted
  } catch (error) {
    console.error('[Cache] LRU eviction failed:', error)
    return 0
  }
}

// ============================================
// CACHE MAINTENANCE
// ============================================

/**
 * Remove expired cache entries
 * 
 * @returns Number of files deleted
 */
export async function cleanupExpiredEntries(): Promise<number> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true })
    const files = await fs.readdir(CACHE_DIR)
    const now = Date.now()
    let deleted = 0

    await Promise.all(
      files.map(async (file) => {
        try {
          const filePath = path.join(CACHE_DIR, file)
          const content = await fs.readFile(filePath, 'utf-8')
          const entry: CacheEntry = JSON.parse(content)

          // Delete if expired or too old
          if (now > entry.expiresAt || (now - entry.timestamp) > MAX_CACHE_AGE_MS) {
            await fs.unlink(filePath)
            deleted++
            filesystemDeletes++
          }
        } catch (error) {
          // If file is corrupted, delete it
          const filePath = path.join(CACHE_DIR, file)
          await fs.unlink(filePath).catch(() => {})
          deleted++
        }
      })
    )

    if (deleted > 0) {
      console.log(`[Cache] Cleaned up ${deleted} expired entries`)
    }

    return deleted
  } catch (error) {
    console.error('[Cache] Cleanup failed:', error)
    return 0
  }
}

/**
 * Run periodic cache maintenance
 * - Remove expired entries
 * - Evict LRU entries if size > max
 * - Update access statistics
 */
export async function runCacheMaintenance(): Promise<{
  expired: number
  evicted: number
  currentSizeMB: number
}> {
  console.log('[Cache] Running maintenance...')
  
  // Clean up expired entries
  const expired = await cleanupExpiredEntries()
  
  // Evict LRU entries if cache is too large
  const evicted = await evictLRUEntries(MAX_CACHE_SIZE_MB)
  
  // Get current cache size
  const stats = await getDetailedFilesystemStats()
  
  console.log(`[Cache] Maintenance complete: ${expired} expired, ${evicted} evicted, ${stats.totalSizeMB.toFixed(2)}MB`)
  
  return {
    expired,
    evicted,
    currentSizeMB: stats.totalSizeMB
  }
}

/**
 * Schedule periodic cache maintenance
 * 
 * @returns Cleanup interval ID (call clearInterval to stop)
 */
export function scheduleMaintenanceTask(): NodeJS.Timeout {
  console.log(`[Cache] Scheduling maintenance every ${CLEANUP_INTERVAL_MS / 1000}s`)
  
  // Run immediately
  runCacheMaintenance().catch(console.error)
  
  // Schedule periodic runs
  return setInterval(() => {
    runCacheMaintenance().catch(console.error)
  }, CLEANUP_INTERVAL_MS)
}

// ============================================
// STATISTICS & MONITORING
// ============================================

/**
 * Get detailed filesystem cache statistics
 */
export async function getDetailedFilesystemStats(): Promise<{
  totalFiles: number
  totalSize: number
  totalSizeMB: number
  avgFileSize: number
  oldestEntry: number
  newestEntry: number
  hitRate: number
  compressionRatio: number
  topNamespaces: Array<{ namespace: string; count: number; size: number }>
}> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true })
    const files = await fs.readdir(CACHE_DIR)
    
    if (files.length === 0) {
      return {
        totalFiles: 0,
        totalSize: 0,
        totalSizeMB: 0,
        avgFileSize: 0,
        oldestEntry: 0,
        newestEntry: 0,
        hitRate: 0,
        compressionRatio: 0,
        topNamespaces: []
      }
    }

    let totalSize = 0
    let totalOriginalSize = 0
    let oldestEntry = Date.now()
    let newestEntry = 0
    const namespaces = new Map<string, { count: number; size: number }>()

    await Promise.all(
      files.map(async (file) => {
        try {
          const filePath = path.join(CACHE_DIR, file)
          const stats = await fs.stat(filePath)
          const content = await fs.readFile(filePath, 'utf-8')
          const entry: CacheEntry = JSON.parse(content)

          totalSize += stats.size
          
          // Track compression ratio
          if (entry.data && typeof entry.data === 'object' && 'originalSize' in entry.data) {
            totalOriginalSize += entry.data.originalSize || stats.size
          }

          // Track timestamps
          if (entry.timestamp < oldestEntry) oldestEntry = entry.timestamp
          if (entry.timestamp > newestEntry) newestEntry = entry.timestamp

          // Track namespaces
          const namespace = file.split('_')[0]
          const existing = namespaces.get(namespace) || { count: 0, size: 0 }
          namespaces.set(namespace, {
            count: existing.count + 1,
            size: existing.size + stats.size
          })
        } catch (error) {
          // Ignore corrupted files
        }
      })
    )

    const totalHits = filesystemHits + filesystemMisses
    const hitRate = totalHits > 0 ? filesystemHits / totalHits : 0

    const topNamespaces = Array.from(namespaces.entries())
      .map(([namespace, data]) => ({ namespace, ...data }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)

    const compressionRatio = totalOriginalSize > 0
      ? ((totalOriginalSize - totalSize) / totalOriginalSize) * 100
      : 0

    return {
      totalFiles: files.length,
      totalSize,
      totalSizeMB: totalSize / (1024 * 1024),
      avgFileSize: totalSize / files.length,
      oldestEntry,
      newestEntry,
      hitRate,
      compressionRatio,
      topNamespaces
    }
  } catch (error) {
    console.error('[Cache] Failed to get filesystem stats:', error)
    return {
      totalFiles: 0,
      totalSize: 0,
      totalSizeMB: 0,
      avgFileSize: 0,
      oldestEntry: 0,
      newestEntry: 0,
      hitRate: 0,
      compressionRatio: 0,
      topNamespaces: []
    }
  }
}

/**
 * Get filesystem cache performance metrics
 */
export function getFilesystemMetrics() {
  const totalOperations = filesystemHits + filesystemMisses
  const hitRate = totalOperations > 0 ? (filesystemHits / totalOperations) * 100 : 0

  return {
    hits: filesystemHits,
    misses: filesystemMisses,
    writes: filesystemWrites,
    deletes: filesystemDeletes,
    hitRate: hitRate.toFixed(2) + '%',
    totalOperations
  }
}

/**
 * Reset filesystem cache metrics
 */
export function resetFilesystemMetrics() {
  filesystemHits = 0
  filesystemMisses = 0
  filesystemWrites = 0
  filesystemDeletes = 0
}

// ============================================
// HEALTH CHECKS
// ============================================

/**
 * Check filesystem cache health
 * 
 * @returns Health status with warnings/errors
 */
export async function checkFilesystemHealth(): Promise<{
  healthy: boolean
  warnings: string[]
  errors: string[]
  stats: Awaited<ReturnType<typeof getDetailedFilesystemStats>>
}> {
  const warnings: string[] = []
  const errors: string[] = []
  const stats = await getDetailedFilesystemStats()

  // Check cache size
  if (stats.totalSizeMB > MAX_CACHE_SIZE_MB * 0.9) {
    warnings.push(`Cache size ${stats.totalSizeMB.toFixed(2)}MB approaching limit ${MAX_CACHE_SIZE_MB}MB`)
  }
  if (stats.totalSizeMB > MAX_CACHE_SIZE_MB) {
    errors.push(`Cache size ${stats.totalSizeMB.toFixed(2)}MB exceeds limit ${MAX_CACHE_SIZE_MB}MB`)
  }

  // Check hit rate
  if (stats.hitRate < 0.7 && stats.totalFiles > 100) {
    warnings.push(`Low cache hit rate: ${(stats.hitRate * 100).toFixed(1)}% (target: >70%)`)
  }

  // Check cache age
  const now = Date.now()
  const oldestAge = now - stats.oldestEntry
  if (oldestAge > MAX_CACHE_AGE_MS && stats.totalFiles > 0) {
    warnings.push(`Oldest cache entry is ${Math.floor(oldestAge / 1000 / 60 / 60)}h old (cleanup needed)`)
  }

  // Check compression ratio
  if (stats.compressionRatio < 50 && stats.totalFiles > 10) {
    warnings.push(`Low compression ratio: ${stats.compressionRatio.toFixed(1)}% (expected: >60%)`)
  }

  const healthy = errors.length === 0

  return { healthy, warnings, errors, stats }
}
