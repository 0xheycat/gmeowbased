/**
 * #file: scripts/cache-cleanup.ts
 * 
 * PHASE: Free-Tier Failover Architecture
 * DATE: December 17, 2025
 * 
 * Cache cleanup script - runs on app startup
 * 
 * USAGE:
 * ```bash
 * # Run manually
 * tsx scripts/cache-cleanup.ts
 * 
 * # Or add to package.json:
 * "scripts": {
 *   "cache:cleanup": "tsx scripts/cache-cleanup.ts"
 * }
 * ```
 */

import { localCache } from '../lib/bot/local-cache'

async function main() {
  console.log('[CacheCleanup] Starting cache cleanup...')
  
  try {
    // Get cache stats before cleanup
    const statsBefore = await localCache.getStats()
    console.log('[CacheCleanup] Cache stats before cleanup:', {
      files: statsBefore.totalFiles,
      size: `${(statsBefore.totalSize / 1024).toFixed(2)} KB`,
      oldest: statsBefore.oldestEntry 
        ? new Date(statsBefore.oldestEntry).toISOString() 
        : 'N/A',
      newest: statsBefore.newestEntry 
        ? new Date(statsBefore.newestEntry).toISOString() 
        : 'N/A'
    })

    // Run cleanup
    await localCache.cleanup()

    // Get cache stats after cleanup
    const statsAfter = await localCache.getStats()
    console.log('[CacheCleanup] Cache stats after cleanup:', {
      files: statsAfter.totalFiles,
      size: `${(statsAfter.totalSize / 1024).toFixed(2)} KB`,
      oldest: statsAfter.oldestEntry 
        ? new Date(statsAfter.oldestEntry).toISOString() 
        : 'N/A',
      newest: statsAfter.newestEntry 
        ? new Date(statsAfter.newestEntry).toISOString() 
        : 'N/A'
    })

    const filesDeleted = statsBefore.totalFiles - statsAfter.totalFiles
    console.log(`[CacheCleanup] ✅ Cleanup complete! Deleted ${filesDeleted} files`)

  } catch (error) {
    console.error('[CacheCleanup] ❌ Cleanup failed:', error)
    process.exit(1)
  }
}

main()
