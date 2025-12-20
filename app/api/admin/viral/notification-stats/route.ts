/**
 * Admin API: Viral Notification Statistics
 * 
 * GET /api/admin/viral/notification-stats
 * 
 * Returns notification delivery analytics including success rate, failure breakdown,
 * and daily trends. Admin-only access required.
 * 
 * Query params:
 * - timeframe: '24h' | '7d' | '30d' | 'all' (default: '7d')
 * 
 * Hybrid Pattern:
 * - Supabase: user_notification_history for delivery logs
 * - Calculated: Success rate, failure breakdown, daily trends
 * 
 * Source: Phase 5.2 Admin Dashboard
 * MCP Verified: November 17, 2025
 * TRUE HYBRID: December 19, 2025
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCached } from '@/lib/cache/server'
import { rateLimit, getClientIp, strictLimiter } from '@/lib/middleware/rate-limit'
import { createClient } from '@/lib/supabase/edge'
import { validateAdminRequest } from '@/lib/auth/admin'
import { createErrorResponse, ErrorType } from '@/lib/middleware/error-handler'
import { AdminQuerySchema } from '@/lib/validation/api-schemas'

type NotificationStats = {
  total_sent: number
  total_failed: number
  success_rate: number
  failure_breakdown: {
    no_tokens: number
    rate_limited: number
    api_errors: number
    other: number
  }
  daily_trends: Array<{
    date: string
    sent: number
    failed: number
  }>
  avg_delivery_time_ms: number | null
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, strictLimiter)
  
  if (!success) {
    return createErrorResponse({
      type: ErrorType.RATE_LIMIT,
      message: 'Rate limit exceeded',
      statusCode: 429
    })
  }

  // Validate query parameters
  const { searchParams } = new URL(req.url)
  const queryValidation = AdminQuerySchema.safeParse({
    timeframe: searchParams.get('timeframe') || undefined,
  })
  
  if (!queryValidation.success) {
    return createErrorResponse({
      type: ErrorType.VALIDATION,
      message: 'Invalid query parameters',
      statusCode: 400,
      details: queryValidation.error.issues
    })
  }

  // 1. Admin auth check
  const auth = await validateAdminRequest(req)
  if (!auth.ok && auth.reason !== 'admin_security_disabled') {
    return createErrorResponse({
      type: ErrorType.AUTHORIZATION,
      message: 'Admin authentication required',
      statusCode: 401,
      details: { reason: auth.reason }
    })
  }

  // 2. Parse timeframe
  const timeframe = searchParams.get('timeframe') ?? '7d'

  // 3. Get notification stats with caching
  const stats = await getCached<NotificationStats>(
    'admin-notification-stats',
    timeframe,
    async () => {
      const supabase = createClient()

      // Calculate cutoff date based on timeframe
      const cutoffDate = new Date()
      if (timeframe === '24h') {
        cutoffDate.setHours(cutoffDate.getHours() - 24)
      } else if (timeframe === '7d') {
        cutoffDate.setDate(cutoffDate.getDate() - 7)
      } else if (timeframe === '30d') {
        cutoffDate.setDate(cutoffDate.getDate() - 30)
      } else {
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 10) // 'all' timeframe
      }

      // LAYER 1: Off-chain (Supabase) - Query notification history
      // Note: user_notification_history stores all notification attempts
      // We track delivery status in metadata.delivery_status field
      const { data: notifications, error } = await supabase
        .from('user_notification_history')
        .select('created_at, metadata, tone')
        .gte('created_at', cutoffDate.toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[notification-stats] Supabase query error:', error)
        throw new Error(`Failed to fetch notification history: ${error.message}`)
      }

      // LAYER 2: Calculated - Aggregate statistics from notification logs
      const stats: NotificationStats = {
        total_sent: 0,
        total_failed: 0,
        success_rate: 0,
        failure_breakdown: {
          no_tokens: 0,
          rate_limited: 0,
          api_errors: 0,
          other: 0,
        },
        daily_trends: [],
        avg_delivery_time_ms: null,
      }

      const dailyMap = new Map<string, { sent: number; failed: number }>()
      const deliveryTimes: number[] = []

      for (const notification of notifications ?? []) {
        const dateKey = new Date(notification.created_at).toISOString().split('T')[0]
        
        if (!dailyMap.has(dateKey)) {
          dailyMap.set(dateKey, { sent: 0, failed: 0 })
        }
        
        const dailyStats = dailyMap.get(dateKey)!

        // Parse metadata to check delivery status
        const metadata = notification.metadata as any || {}
        const deliveryStatus = metadata.delivery_status || 'sent'

        if (deliveryStatus === 'sent' || deliveryStatus === 'delivered') {
          stats.total_sent++
          dailyStats.sent++

          // Extract delivery time if available
          if (metadata.delivery_time_ms && typeof metadata.delivery_time_ms === 'number') {
            deliveryTimes.push(metadata.delivery_time_ms)
          }
        } else if (deliveryStatus === 'failed') {
          stats.total_failed++
          dailyStats.failed++

          // Parse failure reason from metadata
          const reason = metadata.failure_reason || metadata.reason || 'other'

          if (typeof reason === 'string') {
            if (reason.includes('no_token') || reason.includes('no token')) {
              stats.failure_breakdown.no_tokens++
            } else if (reason.includes('rate_limit') || reason.includes('rate limit')) {
              stats.failure_breakdown.rate_limited++
            } else if (reason.includes('api_error') || reason.includes('API')) {
              stats.failure_breakdown.api_errors++
            } else {
              stats.failure_breakdown.other++
            }
          } else {
            stats.failure_breakdown.other++
          }
        }
      }

      // Calculate success rate
      const totalAttempts = stats.total_sent + stats.total_failed
      stats.success_rate = totalAttempts > 0
        ? Math.round((stats.total_sent / totalAttempts) * 100 * 10) / 10
        : 100

      // Calculate average delivery time
      if (deliveryTimes.length > 0) {
        const sum = deliveryTimes.reduce((acc, val) => acc + val, 0)
        stats.avg_delivery_time_ms = Math.round(sum / deliveryTimes.length)
      }

      // Convert daily map to array (sorted by date)
      stats.daily_trends = Array.from(dailyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, { sent, failed }]) => ({ date, sent, failed }))

      return stats
    },
    { ttl: 300 } // Cache for 5 minutes
  )

  // 4. Return statistics
  return NextResponse.json({
    ok: true,
    stats,
    timeframe,
  })
}
