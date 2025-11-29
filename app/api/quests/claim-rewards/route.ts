import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/farcaster'
import { getSupabaseServerClient } from '@/lib/supabase-server'

/**
 * Quest Reward Claim API (Supabase)
 * 
 * POST /api/quests/claim-rewards
 * Body: { quest_id: number }
 * 
 * Claims quest rewards (XP, points, badges)
 * Marks quest as claimed
 * Records XP/points in gmeow_rank_events
 * 
 * Source: New implementation with Supabase
 * MCP Verified: November 27, 2025
 */

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const fid = await requireAuth(request)

    const body = await request.json()
    const { quest_id } = body

    if (!quest_id) {
      return NextResponse.json(
        { error: 'quest_id required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      )
    }

    // Get quest definition
    const { data: quest, error: questError } = await supabase
      .from('quest_definitions')
      .select('*')
      .eq('id', quest_id)
      .single()

    if (questError || !quest) {
      return NextResponse.json(
        { error: 'Quest not found' },
        { status: 404 }
      )
    }

    // Get user quest progress
    const { data: userQuest, error: userQuestError } = await supabase
      .from('user_quests')
      .select('*')
      .eq('fid', fid)
      .eq('quest_id', quest_id)
      .single()

    if (userQuestError || !userQuest) {
      return NextResponse.json(
        { error: 'Quest progress not found' },
        { status: 404 }
      )
    }

    // Check if quest is completed
    if (userQuest.status !== 'completed') {
      return NextResponse.json(
        { error: 'Quest not completed yet' },
        { status: 400 }
      )
    }

    // Check if already claimed
    if (userQuest.status === 'claimed' || userQuest.claimed_at) {
      return NextResponse.json(
        { error: 'Rewards already claimed' },
        { status: 400 }
      )
    }

    // Get user profile for wallet address
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('wallet_address, points, xp')
      .eq('fid', fid)
      .single()

    const walletAddress = profile?.wallet_address || `fid:${fid}`
    const currentPoints = profile?.points || 0
    const currentXP = profile?.xp || 0

    // Award XP and points
    const newXP = currentXP + (quest.reward_xp || 0)
    const newPoints = currentPoints + (quest.reward_points || 0)

    // Update user profile
    await supabase
      .from('user_profiles')
      .update({
        xp: newXP,
        points: newPoints,
        updated_at: new Date().toISOString()
      })
      .eq('fid', fid)

    // Record event in gmeow_rank_events
    await supabase
      .from('gmeow_rank_events')
      .insert({
        fid,
        wallet_address: walletAddress,
        event_type: 'quest-complete',
        chain: 'base',
        delta: quest.reward_points || 0,
        total_points: newPoints,
        previous_points: currentPoints,
        level: Math.floor(newXP / 100) + 1,
        tier_name: calculateTier(newXP),
        tier_percent: (newXP % 100) / 100,
        metadata: {
          quest_id,
          quest_name: quest.quest_name,
          quest_type: quest.quest_type,
          reward_xp: quest.reward_xp,
          reward_points: quest.reward_points,
          completed_at: userQuest.completed_at
        }
      })

    // Mark quest as claimed
    const { data: updatedQuest, error: updateError } = await supabase
      .from('user_quests')
      .update({
        status: 'claimed',
        claimed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('fid', fid)
      .eq('quest_id', quest_id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to mark quest as claimed:', updateError)
      return NextResponse.json(
        { error: 'Failed to claim rewards' },
        { status: 500 }
      )
    }

    // Increment quest completion count
    await supabase
      .from('quest_definitions')
      .update({
        completion_count: (quest.completion_count || 0) + 1
      })
      .eq('id', quest_id)

    return NextResponse.json({
      success: true,
      rewards: {
        xp: quest.reward_xp,
        points: quest.reward_points,
        badges: quest.reward_badges || []
      },
      new_totals: {
        xp: newXP,
        points: newPoints,
        level: Math.floor(newXP / 100) + 1
      },
      quest: updatedQuest
    })

  } catch (error: any) {
    console.error('Quest claim error:', error)
    
    if (error.message === 'Not authenticated') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Calculate tier from XP
 */
function calculateTier(xp: number): string {
  if (xp >= 10000) return 'Diamond'
  if (xp >= 5000) return 'Platinum'
  if (xp >= 2000) return 'Gold'
  if (xp >= 1000) return 'Silver'
  return 'Bronze'
}
