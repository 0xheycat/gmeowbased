/**
 * Quest Marketplace API - List Quests
 * GET /api/quests/marketplace/list
 * 
 * Query params:
 * - category: 'onchain' | 'social' | 'all'
 * - creator_fid: number (filter by creator)
 * - completer: address (filter by completer address)
 * - status: 'active' | 'paused' | 'completed' | 'expired'
 * - limit: number (default: 50)
 * - offset: number (default: 0)
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
    const category = searchParams.get('category') as 'onchain' | 'social' | 'all' | null
    const creatorFid = searchParams.get('creator_fid')
    const completerAddress = searchParams.get('completer')
    const status = searchParams.get('status') || 'active'
    const limit = Math.min(100, Number(searchParams.get('limit')) || 50)
    const offset = Number(searchParams.get('offset')) || 0

    const supabase = getSupabaseServerClient()
    
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: 'database_unavailable' },
        { status: 503 }
      )
    }

    let query = supabase
      .from('unified_quests')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply category filter
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    // Apply creator filter
    if (creatorFid) {
      query = query.eq('creator_fid', Number(creatorFid))
    }

    // If completer filter, join with quest_completions
    if (completerAddress) {
      const { data: completions } = await supabase
        .from('quest_completions')
        .select('quest_id')
        .eq('completer_address', completerAddress)

      if (completions && completions.length > 0) {
        const completedQuestIds = completions.map((c: any) => c.quest_id)
        query = query.in('id', completedQuestIds)
      } else {
        // No completions, return empty
        return NextResponse.json({ ok: true, quests: [], total: 0 })
      }
    }

    const { data: quests, error } = await query

    if (error) {
      console.error('[QuestMarketplace/list] Database error:', error)
      return NextResponse.json(
        { ok: false, error: 'database_error', message: error.message },
        { status: 500 }
      )
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('unified_quests')
      .select('*', { count: 'exact', head: true })
      .eq('status', status)

    if (category && category !== 'all') {
      countQuery = countQuery.eq('category', category)
    }

    const { count } = await countQuery

    return NextResponse.json({
      ok: true,
      quests: quests || [],
      total: count || 0,
      limit,
      offset
    })
  } catch (error: any) {
    console.error('[QuestMarketplace/list] Error:', error)
    return NextResponse.json(
      { ok: false, error: 'internal_error', message: error.message },
      { status: 500 }
    )
  }
}
