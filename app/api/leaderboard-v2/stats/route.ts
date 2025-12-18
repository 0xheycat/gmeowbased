import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/edge'
import { generateRequestId } from '@/lib/middleware/request-id'

export const runtime = 'nodejs'
export const revalidate = 300 // 5 minutes

/**
 * GET /api/leaderboard-v2/stats
 * 
 * Fetch aggregate statistics for leaderboard
 * 
 * Query Parameters:
 * - period: 'daily' | 'weekly' | 'all_time' (default: 'all_time')
 * - fid: number (optional - to calculate user's rank and percentile)
 * 
 * Response:
 * {
 *   totalPilots: number
 *   averageScore: number
 *   top1PercentThreshold: number
 *   top10PercentThreshold: number
 *   yourRank?: number (if fid provided)
 *   yourPercentile?: number (if fid provided)
 * }
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  try {
    const searchParams = request.nextUrl.searchParams
    const period = (searchParams.get('period') || 'all_time') as 'daily' | 'weekly' | 'all_time'
    const fid = searchParams.get('fid') ? parseInt(searchParams.get('fid')!) : undefined
    
    // Validate period
    if (!['daily', 'weekly', 'all_time'].includes(period)) {
      return NextResponse.json(
        { error: 'Invalid period. Must be daily, weekly, or all_time' },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      )
    }
    
    const supabase = getSupabaseServerClient()
    
    if (!supabase) {
      console.error('[Leaderboard Stats API] Supabase not configured')
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500, headers: { 'X-Request-ID': requestId } }
      )
    }
    
    // Get aggregate statistics from Subsquid (replaces leaderboard_calculations)
    const { getSubsquidClient } = await import('@/lib/subsquid-client')
    const client = getSubsquidClient()
    
    // Fetch full leaderboard to calculate statistics
    const leaderboardData = await client.getLeaderboard(10000, 0) // Get all entries
    
    if (!leaderboardData || leaderboardData.length === 0) {
      return NextResponse.json({
        totalPilots: 0,
        averageScore: 0,
        top1PercentThreshold: 0,
        top10PercentThreshold: 0,
      }, {
        headers: { 
          'X-Request-ID': requestId,
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      })
    }
    
    // Calculate statistics
    const totalPilots = leaderboardData.length
    const totalScore = leaderboardData.reduce((sum, entry) => sum + (entry.totalScore || 0), 0)
    const averageScore = totalScore / totalPilots
    
    // Calculate percentile thresholds
    const top1PercentIndex = Math.max(0, Math.floor(totalPilots * 0.01) - 1)
    const top10PercentIndex = Math.max(0, Math.floor(totalPilots * 0.10) - 1)
    
    const top1PercentThreshold = leaderboardData[top1PercentIndex]?.totalScore || 0
    const top10PercentThreshold = leaderboardData[top10PercentIndex]?.totalScore || 0
    
    const response: any = {
      totalPilots,
      averageScore,
      top1PercentThreshold,
      top10PercentThreshold,
    }
    
    // If FID provided, calculate user's rank and percentile
    if (fid !== undefined) {
      const userEntry = await client.getUserStatsByFID(fid)
      
      if (userEntry) {
        response.yourRank = userEntry.rank || 0
        response.yourPercentile = ((userEntry.rank || 0) / totalPilots) * 100
      }
    }
    
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'X-Request-ID': requestId,
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (error) {
    console.error('[Leaderboard Stats API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }
}
