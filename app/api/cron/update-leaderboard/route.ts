import { NextRequest, NextResponse } from 'next/server'
import { recalculateGlobalRanks } from '@/lib/leaderboard-scorer'

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
  try {
    // Verify cron secret from GitHub Actions
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
    
    if (!authHeader || authHeader !== expectedAuth) {
      console.error('[Leaderboard Cron] Unauthorized request')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    console.log('[Leaderboard Cron] Starting leaderboard update...')
    const startTime = Date.now()
    
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
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('[Leaderboard Cron] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to update leaderboard',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
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
