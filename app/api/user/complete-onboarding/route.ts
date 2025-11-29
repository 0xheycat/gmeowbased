import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'

/**
 * Complete onboarding for current user
 * POST /api/user/complete-onboarding
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      )
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Update user profile with onboarded_at timestamp
    const { data: profile, error: updateError } = await supabase
      .from('user_profiles')
      .update({ onboarded_at: new Date().toISOString() })
      .eq('fid', user.id)
      .select('fid, username, onboarded_at')
      .single()

    if (updateError) {
      console.error('Failed to complete onboarding:', updateError)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    // Grant tutorial completion rewards (+50 XP)
    try {
      await supabase
        .from('gmeow_rank_events')
        .insert({
          fid: user.id,
          wallet_address: profile.username || `fid:${user.id}`,
          event_type: 'tutorial-complete',
          chain: 'base',
          delta: 50,
          total_points: 50,
          previous_points: 0,
          level: 1,
          tier_name: 'Bronze',
          tier_percent: 0,
          metadata: {
            source: 'onboarding',
            reward: 'Tutorial completion bonus',
            timestamp: new Date().toISOString()
          }
        })
    } catch (rewardError) {
      // Non-critical: log but don't fail the onboarding
      console.error('Failed to grant tutorial rewards:', rewardError)
    }

    // Auto-unlock beginner quests after onboarding
    let unlockedQuests = 0
    try {
      // Fetch all beginner quests that are active and available for onboarding
      const { data: beginnerQuests, error: questsError } = await supabase
        .from('quest_definitions')
        .select('id, quest_name, quest_slug')
        .eq('is_active', true)
        .or('difficulty.eq.beginner,category.eq.onboarding')
        .order('created_at', { ascending: true })

      if (!questsError && beginnerQuests && beginnerQuests.length > 0) {
        // Insert user_quests records for each beginner quest
        const userQuestInserts = beginnerQuests.map(quest => ({
          fid: user.id,
          quest_id: quest.id,
          status: 'available',
          progress: {},
          metadata: {
            unlocked_by: 'onboarding',
            unlocked_at: new Date().toISOString()
          }
        }))

        const { error: insertError } = await supabase
          .from('user_quests')
          .upsert(userQuestInserts, {
            onConflict: 'fid,quest_id',
            ignoreDuplicates: true
          })

        if (!insertError) {
          unlockedQuests = beginnerQuests.length
          console.log(`Unlocked ${unlockedQuests} beginner quests for user ${user.id}`)
        } else {
          console.error('Failed to unlock beginner quests:', insertError)
        }
      }
    } catch (questError) {
      // Non-critical: log but don't fail the onboarding
      console.error('Failed to auto-unlock quests:', questError)
    }

    return NextResponse.json({
      success: true,
      onboardedAt: profile.onboarded_at,
      fid: profile.fid,
      username: profile.username,
      rewards: {
        xp: 50,
        message: 'Tutorial completed! +50 XP'
      },
      questsUnlocked: unlockedQuests
    })
  } catch (error) {
    console.error('Complete onboarding error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
