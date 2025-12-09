import { NextRequest, NextResponse } from 'next/server'
import { recalculateGlobalRanks } from '@/lib/leaderboard-scorer'
import { checkIdempotency, storeIdempotency, returnCachedResponse } from '@/lib/idempotency'
import { generateRequestId } from '@/lib/request-id'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes

/**
 * POST /api/cron/update-leaderboard
 * 
 * Cron job to update leaderboard calculations for all time periods
 * 
 * Scheduled via GitHub Actions: Every 6 hours
 * 
 * Authentication: Verifies CRON_SECRET from GitHub Actions secrets
 * 
 * Process:
 * 1. Recalculates global ranks for daily period
 * 2. Recalculates global ranks for weekly period
 * 3. Recalculates global ranks for all_time period
 * 
 * Response:
 * {
 *   success: true,
 *   message: string,
 *   timestamp: string,
 *   periods: {
 *     daily: { updated: number },
 *     weekly: { updated: number },
 *     all_time: { updated: number }
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  
  try {
    // Verify cron secret from GitHub Actions
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
    
    if (!authHeader || authHeader !== expectedAuth) {
      console.error('[Leaderboard Cron] Unauthorized request')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: { 'X-Request-ID': requestId } }
      )
    }
    
    console.log('[Leaderboard Cron] Starting leaderboard update...')
    const startTime = Date.now()
    
    // Idempotency check (prevents double execution on retry)
    const now = new Date()
    const dateKey = now.toISOString().slice(0, 13).replace(/[-:T]/g, '') // YYYYMMDDHH
    const idempotencyKey = `cron-update-leaderboard-${dateKey}`
    
    const idempotencyResult = await checkIdempotency(idempotencyKey)
    if (idempotencyResult.exists) {
      console.log(`[Leaderboard Cron] Replaying cached result for key: ${idempotencyKey}`)
      return returnCachedResponse(idempotencyResult)
    }
    
    // Update all periods in parallel for performance
    const [dailyResult, weeklyResult, allTimeResult] = await Promise.all([
      recalculateGlobalRanks('daily'),
      recalculateGlobalRanks('weekly'),
      recalculateGlobalRanks('all_time'),
    ])
    
    const duration = Date.now() - startTime
    
    const result = {
      success: true,
      message: 'Leaderboard updated successfully',
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      periods: {
        daily: { updated: dailyResult },
        weekly: { updated: weeklyResult },
        all_time: { updated: allTimeResult },
      },
    }
    
    console.log('[Leaderboard Cron] Update complete:', result)
    
    // Store result for idempotency (24h cache TTL)
    await storeIdempotency(idempotencyKey, result, 200)
    
    return NextResponse.json(result, { headers: { 'X-Request-ID': requestId } })
  } catch (error) {
    console.error('[Leaderboard Cron] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to update leaderboard',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }
}

/**
 * GET /api/cron/update-leaderboard
 * 
 * Manual trigger endpoint for testing (requires CRON_SECRET)
 */
export async function GET(request: NextRequest) {
  // Use same logic as POST for manual testing
  return POST(request)
}
