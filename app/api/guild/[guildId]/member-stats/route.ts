/**
 * Guild Member Stats API Endpoint
 * 
 * GET /api/guild/[guildId]/member-stats?address=0x...
 * 
 * Purpose: Fetch individual member statistics for hover cards
 * Data: Join date, last active, points contributed, rank
 * Source: guild_events table + leaderboard_calculations
 * 
 * Features:
 * - Last active from guild_events (most recent event)
 * - Join date from MEMBER_JOINED event
 * - Points contributed from POINTS_DEPOSITED events
 * - Global rank from leaderboard_calculations
 * - Cache: 60s for performance
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const startTime = Date.now()
  const requestId = `member-stats-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const { guildId } = await params
  const { searchParams } = new URL(req.url)
  const memberAddress = searchParams.get('address')

  console.log('[member-stats] Request:', { requestId, guildId, memberAddress })

  // 1. VALIDATION
  if (!memberAddress) {
    return NextResponse.json(
      { success: false, message: 'Member address is required' },
      { status: 400 }
    )
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[member-stats] Missing Supabase credentials')
    return NextResponse.json(
      { success: false, message: 'Server configuration error' },
      { status: 500 }
    )
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 2. FETCH JOIN DATE (first MEMBER_JOINED event)
    const { data: joinEvent, error: joinError } = await supabase
      .from('guild_events')
      .select('created_at')
      .eq('guild_id', guildId)
      .eq('event_type', 'MEMBER_JOINED')
      .eq('actor_address', memberAddress.toLowerCase())
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (joinError && joinError.code !== 'PGRST116') {
      console.error('[member-stats] Join date query error:', joinError)
    }

    const joinedAt = joinEvent?.created_at || new Date().toISOString()

    // 3. FETCH LAST ACTIVE (most recent event)
    const { data: lastEvent, error: lastError } = await supabase
      .from('guild_events')
      .select('created_at, event_type')
      .eq('guild_id', guildId)
      .eq('actor_address', memberAddress.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (lastError && lastError.code !== 'PGRST116') {
      console.error('[member-stats] Last active query error:', lastError)
    }

    const lastActive = lastEvent?.created_at

    // 4. FETCH POINTS CONTRIBUTED (sum of all POINTS_DEPOSITED events)
    const { data: depositEvents, error: depositError } = await supabase
      .from('guild_events')
      .select('amount')
      .eq('guild_id', guildId)
      .eq('event_type', 'POINTS_DEPOSITED')
      .eq('actor_address', memberAddress.toLowerCase())

    if (depositError) {
      console.error('[member-stats] Points contributed query error:', depositError)
    }

    const pointsContributed = depositEvents
      ? depositEvents.reduce((sum, event) => sum + (event.amount || 0), 0)
      : 0

    // 5. FETCH GLOBAL RANK (from leaderboard_calculations)
    const { data: leaderboardData, error: leaderboardError } = await supabase
      .from('leaderboard_calculations')
      .select('global_rank, total_score')
      .ilike('address', memberAddress)
      .eq('period', 'all_time')
      .single()

    if (leaderboardError && leaderboardError.code !== 'PGRST116') {
      console.error('[member-stats] Leaderboard query error:', leaderboardError)
    }

    // 6. BUILD RESPONSE
    const stats = {
      joinedAt,
      lastActive,
      pointsContributed,
      totalScore: leaderboardData?.total_score || 0,
      globalRank: leaderboardData?.global_rank || null,
    }

    const duration = Date.now() - startTime
    console.log('[member-stats] Success:', { requestId, duration, stats })

    return NextResponse.json(
      {
        success: true,
        stats,
        timestamp: Date.now(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[member-stats] Error:', { requestId, error, duration })
    
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch member stats',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
