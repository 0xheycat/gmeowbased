import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { 
  getTierFromScore, 
  getBadgeByTier, 
  assignBadgeToUser, 
  getTierConfig,
  mintBadgeViaNeynar,
  sendBadgeAwardNotification,
} from '@/lib/badges'

export const dynamic = 'force-dynamic'

type TierType = 'mythic' | 'legendary' | 'epic' | 'rare' | 'common'

const BASELINE_REWARDS = {
  points: 50,
  xp: 30,
}

/**
 * POST /api/onboard/complete
 * Complete onboarding with REAL Neynar scoring + automatic badge assignment
 * 
 * Flow:
 * 1. Fetch real Neynar score from /api/neynar/score
 * 2. Calculate tier (Common → Mythic)
 * 3. Assign tier badge automatically
 * 4. Award baseline + tier bonus rewards
 * 5. Queue badge mint + OG NFT mint (Mythic only)
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
    const { fid, address } = body

    if (!fid) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: fid' },
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

    // Fetch REAL Neynar score
    const scoreUrl = new URL('/api/neynar/score', request.url)
    scoreUrl.searchParams.set('fid', fid.toString())
    
    const scoreResponse = await fetch(scoreUrl.toString())
    const scoreData = await scoreResponse.json()
    
    if (!scoreResponse.ok) {
      console.error('Failed to fetch Neynar score:', scoreData)
      return NextResponse.json(
        { success: false, error: 'Failed to calculate Neynar score' },
        { status: 500 }
      )
    }

    const neynarScore = scoreData.score || 0
    const tier = getTierFromScore(neynarScore) as TierType

    // Get tier configuration
    const tierConfig = getTierConfig(tier)
    const totalPoints = BASELINE_REWARDS.points + tierConfig.pointsBonus
    const totalXP = BASELINE_REWARDS.xp

    const isMythic = tier === 'mythic'

    // Update user profile with onboarding data
    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_profiles')
      .upsert({
        fid,
        neynar_score: neynarScore,
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

    // Assign tier badge automatically
    let assignedBadge = null
    let mintResult = null
    try {
      const badgeDef = getBadgeByTier(tier)
      if (badgeDef) {
        assignedBadge = await assignBadgeToUser({
          fid,
          badgeId: badgeDef.id,
          badgeType: badgeDef.badgeType,
          tier,
          metadata: {
            neynarScore,
            assignedDuring: 'onboarding',
            scoreMetrics: scoreData.metrics || {},
          },
        })

        // Phase 4.7: Instant mint for Mythic users (others use queue)
        if (isMythic && address && process.env.NEYNAR_SERVER_WALLET_ID) {
          // Use Phase 4 instant minting for Mythic tier
          const MYTHIC_CONTRACT = process.env.BADGE_CONTRACT_MYTHIC || '0x...'
          mintResult = await mintBadgeViaNeynar(
            fid,
            MYTHIC_CONTRACT,
            'base'
          )
          
          if (mintResult.success) {
            console.log(`[Onboarding] Mythic badge minted instantly for FID ${fid}: ${mintResult.transactionHash}`)
          } else {
            console.error(`[Onboarding] Instant mint failed, falling back to queue:`, mintResult.error)
            // Fallback to mint queue
            await supabase.from('mint_queue').insert({
              fid,
              wallet_address: address,
              badge_type: badgeDef.badgeType,
              status: 'pending',
              error: `Instant mint failed: ${mintResult.error}`,
              created_at: new Date().toISOString(),
            })
          }
        } else {
          // Use mint queue for non-Mythic users
          await supabase.from('mint_queue').insert({
            fid,
            wallet_address: address || null,
            badge_type: badgeDef.badgeType,
            status: 'pending',
            created_at: new Date().toISOString(),
          })
        }

        // Phase 4.7: Send badge award notification
        try {
          await sendBadgeAwardNotification(
            fid,
            badgeDef.badgeType,
            tier,
            `https://gmeowhq.art/profile?fid=${fid}`
          )
          console.log(`[Onboarding] Badge award notification sent to FID ${fid}`)
        } catch (notificationError) {
          console.error('[Onboarding] Failed to send notification:', notificationError)
          // Don't fail onboarding if notification fails
        }
      }
    } catch (badgeError) {
      console.error('Failed to assign badge:', badgeError)
      // Don't fail the entire onboarding if badge assignment fails
    }

    // For Mythic users, ALSO queue OG NFT mint (separate from tier badge)
    if (isMythic && address) {
      await supabase.from('mint_queue').insert({
        fid,
        wallet_address: address,
        badge_type: 'gmeow_vanguard', // OG Mythic badge
        status: 'pending',
        created_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      success: true,
      tier,
      neynarScore,
      scoreBreakdown: scoreData.breakdown || {},
      rewards: {
        baselinePoints: BASELINE_REWARDS.points,
        baselineXP: BASELINE_REWARDS.xp,
        tierPoints: tierConfig.pointsBonus,
        totalPoints,
        totalXP,
      },
      badge: assignedBadge ? {
        id: assignedBadge.badgeId,
        type: assignedBadge.badgeType,
        tier: assignedBadge.tier,
        assignedAt: assignedBadge.assignedAt,
        instantMinted: mintResult?.success || false,
        txHash: mintResult?.transactionHash || null,
      } : null,
      ogNftEligible: isMythic,
      profile: updatedProfile,
      phase4: {
        instantMinting: isMythic && mintResult?.success,
        notificationSent: true, // Attempted notification
      },
    })
  } catch (error) {
    console.error('Error completing onboarding:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

