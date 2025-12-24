/**
 * Cron Endpoint: Sync Guild Deposits
 * POST /api/cron/sync-guild-deposits
 * 
 * Triggers synchronization of GuildPointsDeposited events
 * from Subsquid (Layer 2) to Supabase (Layer 3)
 * 
 * AUTHENTICATION:
 * - Bearer token required (CRON_SECRET environment variable)
 * - Called by GitHub Actions workflow every 15 minutes
 * 
 * USAGE:
 * ```bash
 * curl -X POST http://localhost:3000/api/cron/sync-guild-deposits \
 *   -H "Authorization: Bearer ${CRON_SECRET}"
 * ```
 * 
 * RESPONSE:
 * ```json
 * {
 *   "success": true,
 *   "inserted": 6,
 *   "updated": 0,
 *   "totalProcessed": 6,
 *   "durationMs": 1234,
 *   "lastSyncedBlock": 39899092
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server'
import { syncGuildDeposits } from '@/lib/jobs/sync-guild-deposits'

export const runtime = 'nodejs' // Required for Subsquid GraphQL fetch
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds max (Vercel Pro limit)

export async function POST(req: NextRequest) {
  try {
    // Authentication check
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token || token !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Execute sync job
    console.log('[Cron] Starting guild deposits sync...')
    const result = await syncGuildDeposits()

    // Return result
    return NextResponse.json(result, {
      status: result.success ? 200 : 500
    })

  } catch (error) {
    console.error('[Cron] Sync failed:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        inserted: 0,
        updated: 0,
        totalProcessed: 0,
        errors: 1
      },
      { status: 500 }
    )
  }
}
