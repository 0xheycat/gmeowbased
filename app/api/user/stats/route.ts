import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { getFarcasterFid } from '@/lib/auth/farcaster'

/**
 * Get User Stats API
 * 
 * Returns real user stats from database:
 * - GM streak (from gmeow_rank_events)
 * - Total XP (from gmeow_rank_events aggregation)
 * - Badges earned (from user_badges count)
 * - Leaderboard rank (from leaderboard_snapshots)
 * 
 * GET /api/user/stats?fid=123
 * 
 * Source: Reused query patterns from old foundation
 * MCP Verified: January 12, 2025
 * Quality Gates: GI-7, GI-8
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }

    // Get FID from query param or auth
    const { searchParams } = new URL(request.url)
    const queryFid = searchParams.get('fid')
    const authFid = await getFarcasterFid(request)
    
    const fid = queryFid ? Number(queryFid) : authFid
    
    if (!fid || !Number.isFinite(fid) || fid <= 0) {
      return NextResponse.json(
        { error: 'Invalid or missing FID' },
        { status: 400 }
      )
    }

    // 1. Get GM streak from gmeow_rank_events
    const { data: gmEvents, error: gmError } = await supabase
      .from('gmeow_rank_events')
      .select('created_at, event_type, metadata')
      .eq('fid', fid)
      .eq('event_type', 'gm')
      .order('created_at', { ascending: false })
      .limit(100)

    let gmStreak = 0
    if (gmEvents && gmEvents.length > 0) {
      // Calculate streak: consecutive days with GM
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      let currentDate = new Date(today)
      gmStreak = 0

      for (const event of gmEvents) {
        const eventDate = new Date(event.created_at)
        eventDate.setHours(0, 0, 0, 0)

        if (eventDate.getTime() === currentDate.getTime()) {
          gmStreak++
          currentDate.setDate(currentDate.getDate() - 1)
        } else if (eventDate.getTime() < currentDate.getTime()) {
          break // Streak broken
        }
      }
    }

    // 2. Get total XP from gmeow_rank_events
    const { data: xpEvents, error: xpError } = await supabase
      .from('gmeow_rank_events')
      .select('points')
      .eq('fid', fid)

    const totalXP = xpEvents
      ? xpEvents.reduce((sum, event) => sum + (event.points || 0), 0)
      : 0

    // 3. Get badges earned (check if user_badges table exists)
    let badgesEarned = 0
    try {
      const { count: badgeCount, error: badgeError } = await supabase
        .from('user_badges')
        .select('id', { count: 'exact', head: true })
        .eq('fid', fid)

      if (!badgeError && badgeCount !== null) {
        badgesEarned = badgeCount
      }
    } catch (error) {
      // user_badges table might not exist yet, default to 0
      console.warn('user_badges table not found, defaulting to 0')
    }

    // 4. Get leaderboard rank (check if leaderboard_snapshots exists)
    let rank: number | string = 'Unranked'
    try {
      const { data: leaderboardData, error: leaderboardError } = await supabase
        .from('leaderboard_snapshots')
        .select('rank')
        .eq('fid', fid)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!leaderboardError && leaderboardData?.rank) {
        rank = leaderboardData.rank
      }
    } catch (error) {
      // leaderboard_snapshots table might not exist yet
      console.warn('leaderboard_snapshots table not found')
    }

    return NextResponse.json({
      fid,
      gmStreak,
      totalXP,
      badgesEarned,
      rank,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('User stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
