/**
 * Cron Job: Sync Neynar Wallets
 * 
 * Periodically syncs multi-wallet configuration from Neynar API
 * Updates user_profiles with latest custody_address and verified_addresses
 * 
 * Schedule: Every 6 hours
 * Endpoint: GET /api/cron/sync-neynar-wallets
 * 
 * Auth: Vercel Cron Secret or Admin API key
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/edge'
import { syncWalletsFromNeynar } from '@/lib/integrations/neynar-wallet-sync'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes

/**
 * GET /api/cron/sync-neynar-wallets
 * Sync wallet addresses for active users
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // 1. Auth check
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const supabase = createClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Supabase unavailable' },
        { status: 500 }
      )
    }

    // Get active users (with recent activity in last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: activeUsers, error: queryError } = await supabase
      .from('user_profiles')
      .select('fid')
      .gte('updated_at', thirtyDaysAgo.toISOString())
      .order('updated_at', { ascending: false })
      .limit(1000) // Process 1000 most active users

    if (queryError) {
      console.error('[Cron:SyncWallets] Query error:', queryError)
      return NextResponse.json(
        { success: false, error: 'Database query failed' },
        { status: 500 }
      )
    }

    if (!activeUsers || activeUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active users to sync',
        stats: { processed: 0, successful: 0, failed: 0 },
      })
    }

    console.log(`[Cron:SyncWallets] Processing ${activeUsers.length} active users...`)

    // Sync wallets in batches of 10 (Neynar rate limit)
    const BATCH_SIZE = 10
    let successful = 0
    let failed = 0

    for (let i = 0; i < activeUsers.length; i += BATCH_SIZE) {
      const batch = activeUsers.slice(i, i + BATCH_SIZE)
      
      const results = await Promise.allSettled(
        batch.map(user => syncWalletsFromNeynar(user.fid, false))
      )

      successful += results.filter(r => r.status === 'fulfilled' && r.value !== null).length
      failed += results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value === null)).length

      // Rate limiting: wait 1 second between batches
      if (i + BATCH_SIZE < activeUsers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    const duration = Date.now() - startTime

    console.log(`[Cron:SyncWallets] ✅ Complete: ${successful} success, ${failed} failed (${duration}ms)`)

    return NextResponse.json({
      success: true,
      stats: {
        processed: activeUsers.length,
        successful,
        failed,
        duration: `${duration}ms`,
      },
    })
  } catch (error) {
    console.error('[Cron:SyncWallets] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
