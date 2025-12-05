import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'

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
  try {
    const searchParams = request.nextUrl.searchParams
    const period = (searchParams.get('period') || 'all_time') as 'daily' | 'weekly' | 'all_time'
    const fid = searchParams.get('fid') ? parseInt(searchParams.get('fid')!) : undefined
    
    // Validate period
    if (!['daily', 'weekly', 'all_time'].includes(period)) {
      return NextResponse.json(
        { error: 'Invalid period. Must be daily, weekly, or all_time' },
        { status: 400 }
      )
    }
    
    const supabase = getSupabaseServerClient()
    
    if (!supabase) {
      console.error('[Leaderboard Stats API] Supabase not configured')
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }
    
    // Get aggregate statistics
    const { data: stats, error: statsError } = await supabase
      .from('leaderboard_calculations')
      .select('total_score')
      .eq('period', period)
      .order('total_score', { ascending: false })
    
    if (statsError) {
      console.error('[Leaderboard Stats API] Error:', statsError)
      return NextResponse.json(
        { error: 'Failed to fetch statistics' },
        { status: 500 }
      )
    }
    
    if (!stats || stats.length === 0) {
      return NextResponse.json({
        totalPilots: 0,
        averageScore: 0,
        top1PercentThreshold: 0,
        top10PercentThreshold: 0,
      })
    }
    
    // Calculate statistics
    const totalPilots = stats.length
    const totalScore = stats.reduce((sum, entry) => sum + entry.total_score, 0)
    const averageScore = totalScore / totalPilots
    
    // Calculate percentile thresholds
    const top1PercentIndex = Math.max(0, Math.floor(totalPilots * 0.01) - 1)
    const top10PercentIndex = Math.max(0, Math.floor(totalPilots * 0.10) - 1)
    
    const top1PercentThreshold = stats[top1PercentIndex]?.total_score || 0
    const top10PercentThreshold = stats[top10PercentIndex]?.total_score || 0
    
    const response: any = {
      totalPilots,
      averageScore,
      top1PercentThreshold,
      top10PercentThreshold,
    }
    
    // If FID provided, calculate user's rank and percentile
    if (fid) {
      const { data: userEntry, error: userError } = await supabase
        .from('leaderboard_calculations')
        .select('total_score, global_rank')
        .eq('period', period)
        .eq('fid', fid)
        .single()
      
      if (!userError && userEntry) {
        response.yourRank = userEntry.global_rank
        response.yourPercentile = (userEntry.global_rank / totalPilots) * 100
      }
    }
    
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    console.error('[Leaderboard Stats API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
