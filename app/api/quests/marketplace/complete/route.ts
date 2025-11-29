/**
 * Quest Marketplace API - Complete Quest
 * POST /api/quests/marketplace/complete
 * 
 * Body:
 * - quest_id: number
 * - completer_address: string
 * - completer_fid: number
 * 
 * Flow:
 * 1. Verify quest exists and is active
 * 2. Check if user already completed
 * 3. Verify quest completion (call verification system)
 * 4. Award points/rewards
 * 5. Update creator earnings
 * 6. Record completion
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json(
      { ok: false, error: 'rate_limit_exceeded' },
      { status: 429 }
    )
  }

  try {
    const body = await req.json()
    const { quest_id, completer_address, completer_fid } = body

    // Validate input
    if (!quest_id || !completer_address || !completer_fid) {
      return NextResponse.json(
        { ok: false, error: 'missing_parameters' },
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

    // 1. Get quest details
    const { data: quest, error: questError } = await supabase
      .from('unified_quests')
      .select('*')
      .eq('id', quest_id)
      .single()

    if (questError || !quest) {
      return NextResponse.json(
        { ok: false, error: 'quest_not_found' },
        { status: 404 }
      )
    }

    // Check quest is active
    if (quest.status !== 'active') {
      return NextResponse.json(
        { ok: false, error: 'quest_not_active', status: quest.status },
        { status: 400 }
      )
    }

    // Check if expired
    if (quest.expiry_date && new Date(quest.expiry_date) < new Date()) {
      return NextResponse.json(
        { ok: false, error: 'quest_expired' },
        { status: 400 }
      )
    }

    // Check max completions
    if (quest.max_completions && quest.total_completions >= quest.max_completions) {
      return NextResponse.json(
        { ok: false, error: 'quest_max_completions_reached' },
        { status: 400 }
      )
    }

    // 2. Check if already completed
    const { data: existing } = await supabase
      .from('quest_completions')
      .select('id')
      .eq('quest_id', quest_id)
      .eq('completer_fid', completer_fid)
      .single()

    if (existing) {
      return NextResponse.json(
        { ok: false, error: 'quest_already_completed' },
        { status: 400 }
      )
    }

    // 3. Verify quest completion (delegate to verification system)
    const verificationResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/quests/marketplace/verify-completion`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quest_id,
          quest_category: quest.category,
          quest_type: quest.type,
          verification_data: quest.verification_data,
          completer_address,
          completer_fid
        })
      }
    )

    const verificationResult = await verificationResponse.json()

    if (!verificationResult.ok || !verificationResult.verified) {
      return NextResponse.json(
        { 
          ok: false, 
          error: 'verification_failed',
          reason: verificationResult.reason || 'Unknown reason'
        },
        { status: 400 }
      )
    }

    // 4. Award points (insert completion record)
    const pointsAwarded = quest.reward_points || 0
    const verificationProof = verificationResult.proof || {}

    const { data: completion, error: completionError } = await supabase
      .from('quest_completions')
      .insert({
        quest_id,
        completer_fid,
        completer_address,
        points_awarded: pointsAwarded,
        verification_proof: verificationProof
      })
      .select()
      .single()

    if (completionError) {
      console.error('[QuestMarketplace/complete] Failed to insert completion:', completionError)
      return NextResponse.json(
        { ok: false, error: 'completion_insert_failed', message: completionError.message },
        { status: 500 }
      )
    }

    // 5. Increment quest completion count
    const { error: incrementError } = await supabase.rpc('increment_quest_completion', {
      p_quest_id: quest_id
    })

    if (incrementError) {
      console.error('[QuestMarketplace/complete] Failed to increment:', incrementError)
    }

    // 6. Award creator earnings
    const creatorEarnings = Math.floor((pointsAwarded * quest.creator_earnings_percent) / 100)
    
    if (creatorEarnings > 0) {
      const { error: earningsError } = await supabase.rpc('award_creator_earnings', {
        p_quest_id: quest_id,
        p_creator_fid: quest.creator_fid,
        p_points: creatorEarnings
      })

      if (earningsError) {
        console.error('[QuestMarketplace/complete] Failed to award earnings:', earningsError)
      }
    }

    // 7. Update user points (TODO: implement in user_profiles table)
    // For now, we'll skip this and let the client handle it

    return NextResponse.json({
      ok: true,
      completion_id: completion.id,
      points_awarded: pointsAwarded,
      creator_earnings: creatorEarnings,
      verification_proof: verificationProof
    })
  } catch (error: any) {
    console.error('[QuestMarketplace/complete] Error:', error)
    return NextResponse.json(
      { ok: false, error: 'internal_error', message: error.message },
      { status: 500 }
    )
  }
}
