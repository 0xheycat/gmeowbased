/**
 * Quest Marketplace API - Create Quest
 * POST /api/quests/marketplace/create
 * 
 * Body:
 * - title: string
 * - description: string
 * - category: 'onchain' | 'social'
 * - type: QuestType
 * - reward_points: number
 * - creation_cost: number (100-500)
 * - creator_earnings_percent: number (10-20)
 * - verification_data: Record<string, any>
 * - creator_fid: number
 * - creator_address: string
 * - max_completions?: number
 * - expiry_date?: string
 * 
 * Creator Economy:
 * - Deduct creation_cost from creator points
 * - Set creator_earnings_percent (10-20%)
 * - Track earnings in quest_creator_earnings table
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { rateLimit, getClientIp, strictLimiter } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, strictLimiter) // Stricter limit for creation
  
  if (!success) {
    return NextResponse.json(
      { ok: false, error: 'rate_limit_exceeded' },
      { status: 429 }
    )
  }

  try {
    const body = await req.json()
    const {
      title,
      description,
      category,
      type,
      reward_points,
      creation_cost,
      creator_earnings_percent,
      verification_data,
      creator_fid,
      creator_address,
      max_completions,
      expiry_date
    } = body

    // Validate required fields
    if (!title || !description || !category || !type || !verification_data || !creator_fid || !creator_address) {
      return NextResponse.json(
        { ok: false, error: 'missing_required_fields' },
        { status: 400 }
      )
    }

    // Validate category
    if (!['onchain', 'social'].includes(category)) {
      return NextResponse.json(
        { ok: false, error: 'invalid_category' },
        { status: 400 }
      )
    }

    // Validate creation cost (100-500 points)
    const cost = creation_cost || 100
    if (cost < 100 || cost > 500) {
      return NextResponse.json(
        { ok: false, error: 'invalid_creation_cost', min: 100, max: 500 },
        { status: 400 }
      )
    }

    // Validate creator earnings percent (10-20%)
    const earningsPercent = creator_earnings_percent || 10
    if (earningsPercent < 10 || earningsPercent > 20) {
      return NextResponse.json(
        { ok: false, error: 'invalid_creator_earnings_percent', min: 10, max: 20 },
        { status: 400 }
      )
    }

    // Validate reward points (must be greater than 0)
    const rewardPoints = reward_points || 0
    if (rewardPoints <= 0) {
      return NextResponse.json(
        { ok: false, error: 'invalid_reward_points' },
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

    // Check creator's points balance
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('points')
      .eq('fid', creator_fid)
      .single()

    if (profileError) {
      console.error('[QuestMarketplace/create] Failed to fetch profile:', profileError)
      return NextResponse.json(
        { ok: false, error: 'profile_not_found' },
        { status: 404 }
      )
    }

    const currentPoints = profile?.points || 0
    if (currentPoints < cost) {
      return NextResponse.json(
        { 
          ok: false, 
          error: 'insufficient_points', 
          current_points: currentPoints,
          required_points: cost
        },
        { status: 400 }
      )
    }

    // Create quest
    const { data: quest, error: questError } = await supabase
      .from('unified_quests')
      .insert({
        title,
        description,
        category,
        type,
        reward_points: rewardPoints,
        creation_cost: cost,
        creator_earnings_percent: earningsPercent,
        verification_data,
        creator_fid,
        creator_address,
        max_completions,
        expiry_date,
        status: 'active'
      })
      .select()
      .single()

    if (questError) {
      console.error('[QuestMarketplace/create] Failed to create quest:', questError)
      return NextResponse.json(
        { ok: false, error: 'quest_creation_failed', message: questError.message },
        { status: 500 }
      )
    }

    // Deduct creation cost from creator's points
    const { error: deductError } = await supabase
      .from('user_profiles')
      .update({ 
        points: currentPoints - cost 
      })
      .eq('fid', creator_fid)

    if (deductError) {
      console.error('[QuestMarketplace/create] Failed to deduct points:', deductError)
      // Quest created but points not deducted - log this as critical
      // In production, we might want to rollback the quest creation
    }

    // Initialize creator earnings record
    const { error: earningsError } = await supabase
      .from('quest_creator_earnings')
      .insert({
        quest_id: quest.id,
        creator_fid,
        completions_count: 0,
        points_earned: 0,
        viral_bonus_awarded: 0
      })

    if (earningsError) {
      console.error('[QuestMarketplace/create] Failed to init earnings:', earningsError)
    }

    return NextResponse.json({
      ok: true,
      quest,
      points_deducted: cost,
      new_balance: currentPoints - cost
    })
  } catch (error: any) {
    console.error('[QuestMarketplace/create] Error:', error)
    return NextResponse.json(
      { ok: false, error: 'internal_error', message: error.message },
      { status: 500 }
    )
  }
}
