/**
 * Admin API: Webhook Health Monitoring
 * 
 * GET /api/admin/viral/webhook-health
 * 
 * Returns webhook health metrics including last webhook timestamp, success rate,
 * average processing time, and recent errors. Admin-only access required.
 * 
 * Source: Phase 5.2 Admin Dashboard
 * MCP Verified: November 17, 2025
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { validateAdminRequest } from '@/lib/admin-auth'

type WebhookHealth = {
  last_webhook_at: string | null
  total_webhooks_today: number
  success_rate: number
  avg_processing_time_ms: number | null
  recent_errors: Array<{
    timestamp: string
    error_message: string
    cast_hash?: string
  }>
}

export async function GET(req: NextRequest) {
  try {
    // 1. Admin auth check
    const auth = await validateAdminRequest(req)
    if (!auth.ok && auth.reason !== 'admin_security_disabled') {
      return NextResponse.json(
        { ok: false, error: 'admin_auth_required', reason: auth.reason },
        { status: 401 }
      )
    }

    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: 'supabase_not_configured' },
        { status: 500 }
      )
    }

    // 2. Query webhook events from gmeow_rank_events
    // Phase 5.1 logs webhook-received and webhook-error events
    const yesterday = new Date()
    yesterday.setHours(yesterday.getHours() - 24)

    const { data: webhookEvents, error } = await supabase
      .from('gmeow_rank_events')
      .select('event_type, metadata, created_at')
      .in('event_type', ['webhook-received', 'webhook-error'])
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[webhook-health] Database error:', error)
      return NextResponse.json(
        { ok: false, error: 'database_error', message: error.message },
        { status: 500 }
      )
    }

    // 3. Calculate health metrics
    const health: WebhookHealth = {
      last_webhook_at: null,
      total_webhooks_today: 0,
      success_rate: 0,
      avg_processing_time_ms: null,
      recent_errors: [],
    }

    const processingTimes: number[] = []
    let successCount = 0
    let totalCount = 0

    for (const event of webhookEvents ?? []) {
      if (event.event_type === 'webhook-received') {
        totalCount++
        successCount++
        health.total_webhooks_today++

        // Last webhook timestamp (most recent success)
        if (!health.last_webhook_at) {
          health.last_webhook_at = event.created_at
        }

        // Extract processing time if available
        try {
          const detail =
            typeof event.metadata === 'string'
              ? JSON.parse(event.metadata)
              : event.metadata

          if (detail?.processing_time_ms && typeof detail.processing_time_ms === 'number') {
            processingTimes.push(detail.processing_time_ms)
          }
        } catch {
          // Skip if can't parse
        }
      } else if (event.event_type === 'webhook-error') {
        totalCount++
        health.total_webhooks_today++

        // Parse error details
        try {
          const detail =
            typeof event.metadata === 'string'
              ? JSON.parse(event.metadata)
              : event.metadata

          // Add to recent errors (limit to 10 most recent)
          if (health.recent_errors.length < 10) {
            health.recent_errors.push({
              timestamp: event.created_at,
              error_message: detail?.error ?? detail?.message ?? 'Unknown error',
              cast_hash: detail?.cast_hash,
            })
          }
        } catch {
          if (health.recent_errors.length < 10) {
            health.recent_errors.push({
              timestamp: event.created_at,
              error_message: 'Failed to parse error details',
            })
          }
        }
      }
    }

    // 4. Calculate success rate
    health.success_rate =
      totalCount > 0 ? Math.round((successCount / totalCount) * 100 * 10) / 10 : 100

    // 5. Calculate average processing time
    if (processingTimes.length > 0) {
      const sum = processingTimes.reduce((acc, val) => acc + val, 0)
      health.avg_processing_time_ms = Math.round(sum / processingTimes.length)
    }

    // 6. Return health metrics
    return NextResponse.json({
      ok: true,
      health,
    })
  } catch (error) {
    console.error('[webhook-health] Unexpected error:', error)
    return NextResponse.json(
      {
        ok: false,
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
