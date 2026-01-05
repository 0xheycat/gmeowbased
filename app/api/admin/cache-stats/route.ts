/**
 * Cache Statistics API
 * Phase 7 Priority 2: Cache Monitoring
 * 
 * GET /api/admin/cache-stats
 * 
 * Provides comprehensive Redis cache statistics for monitoring:
 * - Memory usage
 * - Key counts by pattern
 * - Hit/miss rates (estimated from info stats)
 * - Connection status
 * - Uptime
 * 
 * Auth: Admin only (requires ADMIN_API_KEY)
 * 
 * Response:
 * {
 *   redis: {
 *     connected: boolean
 *     uptime: number (seconds)
 *     version: string
 *   },
 *   memory: {
 *     used: string
 *     peak: string
 *     fragmentation: number
 *   },
 *   stats: {
 *     totalKeys: number
 *     hitRate: number (0-100)
 *     evictedKeys: number
 *   },
 *   keys: {
 *     leaderboard: number
 *     userStats: number
 *     events: number
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRedisInfo, checkRedisHealth } from '@/lib/cache/redis-client'
import { getWebhookCacheStats } from '@/lib/cache/webhook-cache'
import { getNeynarCacheStats } from '@/lib/cache/neynar-cache'
import { getNotificationCacheStats } from '@/lib/cache/notification-cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic' // Always fresh data

/**
 * GET /api/admin/cache-stats
 * 
 * Requires Authorization: Bearer <ADMIN_API_KEY>
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const authHeader = request.headers.get('authorization')
    const adminKey = process.env.ADMIN_API_KEY
    
    if (adminKey && authHeader !== `Bearer ${adminKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Check Redis health
    const isHealthy = await checkRedisHealth()
    
    if (!isHealthy) {
      return NextResponse.json(
        { error: 'Redis is not available' },
        { status: 503 }
      )
    }
    
    // Get Redis info
    const info = await getRedisInfo()
    
    // Get webhook cache stats (Phase 7 Priority 4)
    const webhookStats = await getWebhookCacheStats()
    
    // Get Neynar cache stats (Upstash Redis)
    const neynarStats = await getNeynarCacheStats()
    
    // Get notification cache stats (Phase 7 Priority 4)
    const notificationStats = await getNotificationCacheStats()
    
    return NextResponse.json({
      success: true,
      data: {
        ...info,
        webhookCache: webhookStats,
        neynarCache: neynarStats,
        notificationCache: notificationStats,
      },
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('[Cache Stats API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cache statistics' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/cache-stats
 * 
 * Clear specific cache patterns or all caches
 * Requires Authorization: Bearer <ADMIN_API_KEY>
 * 
 * Query Parameters:
 * - pattern: Cache key pattern to clear (e.g., "leaderboard:*", "user:stats:*")
 * - all: Clear all caches (dangerous)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check admin authorization
    const authHeader = request.headers.get('authorization')
    const adminKey = process.env.ADMIN_API_KEY
    
    if (adminKey && authHeader !== `Bearer ${adminKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const searchParams = request.nextUrl.searchParams
    const pattern = searchParams.get('pattern')
    const clearAll = searchParams.get('all') === 'true'
    
    // Import dynamically to avoid circular dependencies
    const { clearAllCache, clearCacheByPattern } = await import('@/lib/cache/redis-client')
    
    let deleted = 0
    
    if (clearAll) {
      console.log('[Cache Stats API] Clearing ALL caches')
      deleted = await clearAllCache()
    } else if (pattern) {
      console.log(`[Cache Stats API] Clearing pattern: ${pattern}`)
      deleted = await clearCacheByPattern(pattern)
    } else {
      return NextResponse.json(
        { error: 'Must specify pattern or all=true' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      success: true,
      deleted,
      message: `Cleared ${deleted} cache keys`,
    })
    
  } catch (error) {
    console.error('[Cache Stats API] Error clearing cache:', error)
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    )
  }
}
