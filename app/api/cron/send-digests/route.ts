/**
 * Vercel Cron: Send Daily Digests
 * 
 * Runs at 8am UTC (adjust per timezone)
 * Fetches all users with pending notifications and sends daily digests
 * 
 * SCHEDULE: 0 8 * * * (8am UTC daily)
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/send-digests",
 *     "schedule": "0 8 * * *"
 *   }]
 * }
 * 
 * PHASE: Phase 2 P6 - Notification Batching
 * DATE: December 16, 2025
 * 
 * @see lib/notification-batching.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { sendDailyDigest } from '@/lib/notification-batching'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

/**
 * Verify Vercel Cron authentication
 * 
 * Cron requests include CRON_SECRET header for authentication
 */
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('[Cron] CRON_SECRET not configured')
    return false
  }

  const expectedAuth = `Bearer ${cronSecret}`
  return authHeader === expectedAuth
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron authentication
    if (!verifyCronAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      )
    }

    // Fetch all users with pending notifications scheduled for now or earlier
    const { data: pendingNotifications, error } = await supabase
      .from('notification_batch_queue')
      .select('fid')
      .is('delivered_at', null)
      .lte('scheduled_for', new Date().toISOString())
      .order('fid')

    if (error) {
      console.error('[Cron] Error fetching pending notifications:', error)
      return NextResponse.json(
        { error: 'Database query failed' },
        { status: 500 }
      )
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending notifications to send',
        processed: 0,
      })
    }

    // Get unique FIDs
    const uniqueFids = Array.from(new Set(pendingNotifications.map((n) => n.fid)))

    console.log(`[Cron] Processing digests for ${uniqueFids.length} users`)

    // Send digest for each user
    const results = await Promise.allSettled(
      uniqueFids.map(async (fid) => {
        try {
          const sent = await sendDailyDigest(fid, supabase)
          return { fid, sent, error: null }
        } catch (error) {
          console.error(`[Cron] Error sending digest for FID ${fid}:`, error)
          return { fid, sent: false, error: String(error) }
        }
      })
    )

    // Count successes and failures
    const successful = results.filter(
      (r) => r.status === 'fulfilled' && r.value.sent
    ).length
    const failed = results.length - successful

    console.log(`[Cron] Completed: ${successful} sent, ${failed} failed`)

    return NextResponse.json({
      success: true,
      processed: uniqueFids.length,
      successful,
      failed,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: String(error),
      },
      { status: 500 }
    )
  }
}
