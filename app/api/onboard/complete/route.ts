import { NextResponse } from 'next/server'
import { z } from 'zod'
import { NeynarAPIClient } from '@neynar/nodejs-sdk'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { 
  getTierFromScore, 
  getBadgeByTier, 
  assignBadgeToUser, 
  getTierConfig,
  mintBadgeViaNeynar,
  sendBadgeAwardNotification,
} from '@/lib/badges'

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY

export const dynamic = 'force-dynamic'

type TierType = 'mythic' | 'legendary' | 'epic' | 'rare' | 'common'

// Input validation schema
const OnboardCompleteSchema = z.object({
  fid: z.number().int().positive('FID must be a positive integer'),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address').optional(),
  neynarScore: z.number().min(0).max(1, 'Neynar score must be between 0 and 1').optional(),
  badges: z.array(z.string()).optional(),
})

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
    // 1. Validate input with Zod
    const body = await request.json()
    const validationResult = OnboardCompleteSchema.safeParse(body)
    
    if (!validationResult.success) {
      console.error('[Onboard Complete] Validation failed:', validationResult.error.issues)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid input',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const { fid, address, neynarScore, badges } = validationResult.data

    // 2. Verify FID exists via Neynar
    if (!NEYNAR_API_KEY) {
      console.error('[Onboard Complete] Neynar API key not configured')
      return NextResponse.json(
        { success: false, error: 'Service configuration error' },
        { status: 500 }
      )
    }

    const neynar = new NeynarAPIClient({ apiKey: NEYNAR_API_KEY })
    let neynarUser: any
    try {
      const userResult = await neynar.fetchBulkUsers({ fids: [fid] })
      if (!userResult?.users?.[0]) {
        console.warn('[Onboard Complete] FID not found in Neynar:', fid)
        return NextResponse.json(
          { success: false, error: 'Invalid Farcaster ID' },
          { status: 400 }
      )
      }
      neynarUser = userResult.users[0]
      console.log('[Onboard Complete] ✅ FID verified:', fid, neynarUser.username)
    } catch (neynarError) {
      console.error('[Onboard Complete] Neynar verification failed:', neynarError)
      return NextResponse.json(
        { success: false, error: 'Failed to verify Farcaster account' },
        { status: 500 }
      )
    }

    // 3. Check database connection
    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      )
    }

    // 4. Check if user already completed onboarding
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('onboarded_at, fid')
      .eq('fid', fid)
      .single()

    if (existingProfile?.onboarded_at) {
      console.log('[Onboard Complete] ⚠️ User already onboarded:', fid)
      return NextResponse.json({
        success: false,
        error: 'Already completed onboarding',
        alreadyOnboarded: true,
      })
    }

    // 5. Extract addresses from Neynar data
    const custodyAddress = neynarUser.custody_address || null
    const verifiedAddresses = neynarUser.verified_addresses?.eth_addresses || []
    const primaryAddress = neynarUser.verified_addresses?.primary?.eth_address || null
    const walletAddress = address || primaryAddress || (verifiedAddresses.length > 0 ? verifiedAddresses[0] : null)

    console.log('[Onboard Complete] 📍 Addresses extracted:', {
      custody: custodyAddress,
      verified: verifiedAddresses,
      primary: primaryAddress,
      wallet: walletAddress
    })

    // 6. Fetch REAL Neynar score (or use provided score)
    let finalScore = neynarScore ?? 0.5 // Default to epic tier
    
    if (!neynarScore) {
      const scoreUrl = new URL('/api/neynar/score', request.url)
      scoreUrl.searchParams.set('fid', fid.toString())
      
      try {
        const scoreResponse = await fetch(scoreUrl.toString())
        const scoreData = await scoreResponse.json()
        
        if (scoreResponse.ok && scoreData.score !== undefined) {
          finalScore = scoreData.score
          console.log('[Onboard Complete] ✅ Neynar score fetched:', finalScore)
        } else {
          console.warn('[Onboard Complete] ⚠️ Failed to fetch score, using default')
          finalScore = 0.5 // Default to epic tier
        }
      } catch (scoreError) {
        console.error('[Onboard Complete] Error fetching score:', scoreError)
        finalScore = 0.5 // Default to epic tier
      }
    }

    const tier = getTierFromScore(finalScore) as TierType
    const tierConfig = getTierConfig(tier)
    const totalPoints = BASELINE_REWARDS.points + tierConfig.pointsBonus
    const totalXP = BASELINE_REWARDS.xp

    const isMythic = tier === 'mythic'

    console.log('[Onboard Complete] ✅ Rewards calculated:', {
      tier,
      finalScore,
      totalPoints,
      totalXP,
      isMythic,
    })

    // 7. Update user profile with onboarding data
    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_profiles')
      .upsert({
        fid,
        neynar_score: finalScore,
        neynar_tier: tier,
        onboarded_at: new Date().toISOString(),
        points: totalPoints,
        xp: totalXP,
        wallet_address: walletAddress,
        custody_address: custodyAddress,
        verified_addresses: verifiedAddresses.length > 0 ? verifiedAddresses : null,
        og_nft_eligible: isMythic,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (updateError) {
      console.error('[Onboard Complete] Error updating profile:', updateError)
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
            neynarScore: finalScore,
            assignedDuring: 'onboarding',
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
      neynarScore: finalScore,
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

