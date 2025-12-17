/**
 * @file app/api/admin/bot/health/route.ts
 * 
 * Bot Health Metrics API Endpoint
 * Returns aggregated health metrics for the bot (webhook success rate, reply success rate, response times, error rates).
 * 
 * PHASE: Phase 1 - Week 1-2 (December 2025)
 * DATE: Created December 16, 2025
 * STATUS: ✅ IMPLEMENTED
 * 
 * FEATURES:
 * - ✅ Webhook success rate calculation
 * - ✅ Reply success rate calculation
 * - ✅ Response time percentiles (P50, P95, P99)
 * - ✅ API error rate monitoring
 * - ✅ Rate limit hit tracking
 * - ✅ Recent errors retrieval
 * - ✅ Time window filtering (1h, 24h, 7d, 30d)
 * 
 * REFERENCE:
 * - lib/bot-analytics.ts - Health metrics calculation functions
 * - FARCASTER-BOT-ENHANCEMENT-PLAN-PART-3.md (Section 10.1: Bot Performance Metrics)
 * 
 * REQUIREMENTS:
 * - Admin-only access (authenticated user with is_admin flag)
 * - bot_metrics table must exist in Supabase
 * - Service role access for querying metrics
 */

import { NextRequest, NextResponse } from 'next/server'
import { getBotHealthMetrics, getRecentBotErrors, type MetricWindow } from '@/lib/bot/analytics'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    // Get time window from query params
    const { searchParams } = new URL(req.url)
    const window = (searchParams.get('window') || '24h') as MetricWindow
    
    // Validate window parameter
    const validWindows: MetricWindow[] = ['1h', '24h', '7d', '30d', 'all']
    if (!validWindows.includes(window)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid window parameter', valid: validWindows },
        { status: 400 }
      )
    }

    // Fetch health metrics
    const metrics = await getBotHealthMetrics(window)
    
    // Fetch recent errors
    const recentErrors = await getRecentBotErrors(10)

    return NextResponse.json({
      ok: true,
      window,
      metrics,
      recentErrors,
      fetchedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[bot-health-api] Failed to fetch health metrics:', error)
    return NextResponse.json(
      { 
        ok: false, 
        error: 'Failed to fetch health metrics',
        detail: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
