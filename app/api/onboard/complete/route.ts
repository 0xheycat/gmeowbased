import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

type TierType = 'mythic' | 'legendary' | 'epic' | 'rare' | 'common'

const TIER_CONFIG = {
  mythic: { points: 1000, xp: 0 },
  legendary: { points: 400, xp: 0 },
  epic: { points: 200, xp: 0 },
  rare: { points: 100, xp: 0 },
  common: { points: 0, xp: 0 },
}

const BASELINE_REWARDS = {
  points: 50,
  xp: 30,
}

/**
 * POST /api/onboard/complete
 * Complete onboarding and award rewards based on tier
 */
export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServerClient()
    
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { fid, tier, neynarScore, address } = body

    if (!fid || !tier) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get current user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user already completed onboarding
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('onboarded_at, fid')
      .eq('fid', fid)
      .single()

    if (existingProfile?.onboarded_at) {
      return NextResponse.json({
        success: false,
        error: 'Already completed onboarding',
        alreadyOnboarded: true,
      })
    }

    // Calculate rewards
    const tierConfig = TIER_CONFIG[tier as TierType] || TIER_CONFIG.common
    const totalPoints = BASELINE_REWARDS.points + tierConfig.points
    const totalXP = BASELINE_REWARDS.xp + tierConfig.xp

    const isMythic = tier === 'mythic'

    // Update user profile with onboarding data
    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_profiles')
      .upsert({
        fid,
        neynar_score: neynarScore || 0,
        neynar_tier: tier,
        onboarded_at: new Date().toISOString(),
        points: totalPoints,
        xp: totalXP,
        wallet_address: address || null,
        og_nft_eligible: isMythic,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    // For Mythic users, queue OG NFT mint
    if (isMythic && address) {
      await supabase.from('mint_queue').insert({
        fid,
        wallet_address: address,
        badge_type: 'og_member',
        status: 'pending',
        created_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      success: true,
      tier,
      rewards: {
        baselinePoints: BASELINE_REWARDS.points,
        baselineXP: BASELINE_REWARDS.xp,
        tierPoints: tierConfig.points,
        totalPoints,
        totalXP,
      },
      ogNftEligible: isMythic,
      profile: updatedProfile,
    })
  } catch (error) {
    console.error('Error completing onboarding:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
