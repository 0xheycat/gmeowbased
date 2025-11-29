/**
 * Quest Marketplace API - My Quests Stats
 * GET /api/quests/marketplace/my
 * 
 * Query params:
 * - fid: number (user's Farcaster ID)
 * 
 * Returns stats and lists
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json(
      { ok: false, error: 'rate_limit_exceeded' },
      { status: 429 }
    )
  }

  try {
    const { searchParams } = new URL(req.url)
    const fid = Number(searchParams.get('fid'))

    if (!fid || isNaN(fid)) {
      return NextResponse.json(
        { ok: false, error: 'invalid_fid' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServerClient()
    
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: 'database_unavailable' },
        { status: 503 }
      )
    }

    // Get quests created by user
    const { data: createdQuests, error: createdError } = await supabase
      .from('unified_quests')
      .select('*')
      .eq('creator_fid', fid)
      .order('created_at', { ascending: false })

    if (createdError) {
      console.error('[QuestMarketplace/my] Failed to fetch created quests:', createdError)
    }

    // Get quests completed by user
    const { data: completions, error: completionsError } = await supabase
      .from('quest_completions')
      .select('*')
      .eq('completer_fid', fid)
      .order('completed_at', { ascending: false })

    if (completionsError) {
      console.error('[QuestMarketplace/my] Failed to fetch completions:', completionsError)
    }

    // Get total earnings as creator
    const { data: earnings, error: earningsError } = await supabase
      .from('quest_creator_earnings')
      .select('points_earned, viral_bonus_awarded')
      .eq('creator_fid', fid)

    if (earningsError) {
      console.error('[QuestMarketplace/my] Failed to fetch earnings:', earningsError)
    }

    // Calculate totals
    const totalEarnings = earnings?.reduce(
      (sum: number, e: any) => sum + (e.points_earned || 0) + (e.viral_bonus_awarded || 0),
      0
    ) || 0

    return NextResponse.json({
      ok: true,
      quests_created: createdQuests?.length || 0,
      quests_completed: completions?.length || 0,
      total_earnings: totalEarnings,
      created_quests: createdQuests || [],
      completed_quests: completions || [],
      earnings_breakdown: earnings || []
    })
  } catch (error: any) {
    console.error('[QuestMarketplace/my] Error:', error)
    return NextResponse.json(
      { ok: false, error: 'internal_error', message: error.message },
      { status: 500 }
    )
  }
}
