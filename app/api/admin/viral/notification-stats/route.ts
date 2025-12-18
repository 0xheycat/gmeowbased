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
 * Source: Phase 5.2 Admin Dashboard
 * MCP Verified: November 17, 2025
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateRequestId } from '@/lib/middleware/request-id'
import { rateLimit, getClientIp, strictLimiter } from '@/lib/middleware/rate-limit'
import { getSupabaseServerClient } from '@/lib/supabase/edge'
import { validateAdminRequest } from '@/lib/auth/admin'
import { withErrorHandler } from '@/lib/middleware/error-handler'
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

export const GET = withErrorHandler(async (req: NextRequest) => {
  const requestId = generateRequestId()
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, strictLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'X-Request-ID': requestId } }
    )
  }

  // Validate query parameters
  const { searchParams } = new URL(req.url)
  const queryValidation = AdminQuerySchema.safeParse({
    timeframe: searchParams.get('timeframe') || undefined,
  })
  
  if (!queryValidation.success) {
    return NextResponse.json(
      { error: 'validation_error', issues: queryValidation.error.issues },
      { status: 400, headers: { 'X-Request-ID': requestId } }
    )
  }

  // 1. Admin auth check
  const auth = await validateAdminRequest(req)
  if (!auth.ok && auth.reason !== 'admin_security_disabled') {
    return NextResponse.json(
      { ok: false, error: 'admin_auth_required', reason: auth.reason },
      { status: 401, headers: { 'X-Request-ID': requestId } }
    )
  }

    // 2. Parse query params
    const timeframe = searchParams.get('timeframe') ?? '7d'

    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: 'supabase_not_configured' },
        { status: 500, headers: { 'X-Request-ID': requestId } }
      )
    }

    // 3. Query notification events from Subsquid (replaces gmeow_rank_events)
    // Phase 5.1 logs notification-sent and notification-failed events
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

    // Note: Subsquid getGMRankEvents is FID-specific, not for notification tracking
    // For now, return empty array - this endpoint may need redesign for Subsquid
    const events: any[] = []
    console.warn('[notification-stats] Notification event tracking not yet implemented in Subsquid')

    // 4. Calculate statistics
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

    const dailyMap = new Map<
      string,
      { sent: number; failed: number }
    >()

    const deliveryTimes: number[] = []

    for (const event of events ?? []) {
      const dateKey = new Date(event.created_at).toISOString().split('T')[0]
      
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { sent: 0, failed: 0 })
      }
      
      const dailyStats = dailyMap.get(dateKey)!

      if (event.event_type === 'notification-sent') {
        stats.total_sent++
        dailyStats.sent++

        // Extract delivery time if available
        try {
          const detail = typeof event.metadata === 'string'
            ? JSON.parse(event.metadata)
            : event.metadata
          
          if (detail?.delivery_time_ms && typeof detail.delivery_time_ms === 'number') {
            deliveryTimes.push(detail.delivery_time_ms)
          }
        } catch {
          // Skip if can't parse
        }
      } else if (event.event_type === 'notification-failed') {
        stats.total_failed++
        dailyStats.failed++

        // Parse failure reason
        try {
          const detail = typeof event.metadata === 'string'
            ? JSON.parse(event.metadata)
            : event.metadata
          
          const reason = detail?.reason ?? 'other'

          if (reason.includes('no_token') || reason.includes('no token')) {
            stats.failure_breakdown.no_tokens++
          } else if (reason.includes('rate_limit') || reason.includes('rate limit')) {
            stats.failure_breakdown.rate_limited++
          } else if (reason.includes('api_error') || reason.includes('API')) {
            stats.failure_breakdown.api_errors++
          } else {
            stats.failure_breakdown.other++
          }
        } catch {
          stats.failure_breakdown.other++
        }
      }
    }

    // 5. Calculate success rate
    const totalAttempts = stats.total_sent + stats.total_failed
    stats.success_rate = totalAttempts > 0
      ? Math.round((stats.total_sent / totalAttempts) * 100 * 10) / 10
      : 100

    // 6. Calculate average delivery time
    if (deliveryTimes.length > 0) {
      const sum = deliveryTimes.reduce((acc, val) => acc + val, 0)
      stats.avg_delivery_time_ms = Math.round(sum / deliveryTimes.length)
    }

    // 7. Convert daily map to array (sorted by date)
    stats.daily_trends = Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, { sent, failed }]) => ({ date, sent, failed }))

  // 8. Return statistics
  return NextResponse.json({
    ok: true,
    stats,
    timeframe,
  }, {
    headers: { 'X-Request-ID': requestId }
  })
})
