import { NextResponse } from 'next/server'
import { getBadgeFromRegistry, updateBadgeMintStatus } from '@/lib/badges'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { withErrorHandler } from '@/lib/error-handler'
import { withTiming } from '@/lib/middleware/timing'
import { mintBadgeOnChain } from '@/lib/contract-mint'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ClaimBadgeSchema = z.object({
  fid: z.number().int().positive(),
  badgeId: z.string().min(1),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
})

/**
 * POST /api/badges/claim
 * User-initiated badge claim/mint (INSTANT MINTING)
 * 
 * Flow:
 * 1. User clicks "Claim Badge" on profile
 * 2. Checks user owns the badge (assigned but not minted)
 * 3. Mints INSTANTLY on blockchain (oracle pays points)
 * 4. Updates user_badges with tx_hash
 * 5. Returns success with transaction details
 * 
 * Body:
 * {
 *   fid: number
 *   badgeId: string
 *   walletAddress: string
 * }
 */
export const POST = withTiming(withErrorHandler(async (request: Request) => {
  const body = await request.json()
  
  // Validate input
  const validationResult = ClaimBadgeSchema.safeParse(body)
  if (!validationResult.success) {
    console.error('[Badge Claim] Validation failed:', validationResult.error.issues)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Invalid input',
        details: validationResult.error.issues
      },
      { status: 400 }
    )
  }

  const { fid, badgeId, walletAddress } = validationResult.data

  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    )
  }

  // Get badge definition from registry
  const badgeDef = getBadgeFromRegistry(badgeId)
  if (!badgeDef) {
    return NextResponse.json(
      { success: false, error: `Badge ${badgeId} not found in registry` },
      { status: 404 }
    )
  }

  // Check if user owns this badge (must be assigned but not minted)
  const { data: userBadge, error: badgeError } = await supabase
    .from('user_badges')
    .select('id, badge_id, minted')
    .eq('fid', fid)
    .eq('badge_id', badgeId)
    .single()

  if (badgeError || !userBadge) {
    return NextResponse.json(
      { success: false, error: 'Badge not found or not eligible' },
      { status: 404 }
    )
  }

  if (userBadge.minted) {
    return NextResponse.json(
      { success: false, error: 'Badge already minted' },
      { status: 400 }
    )
  }

  console.log(`[Badge Claim] Starting instant mint for FID ${fid}, badge ${badgeDef.badgeType}`)

  try {
    // Mint on blockchain INSTANTLY (oracle pays points)
    const mintResult = await mintBadgeOnChain({
      id: userBadge.id.toString(),
      fid,
      walletAddress,
      badgeType: badgeDef.badgeType,
      status: 'minting',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    console.log(`[Badge Claim] Mint successful! TX: ${mintResult.txHash}, Token ID: ${mintResult.tokenId}`)

    // Update user_badges table with mint details
    await updateBadgeMintStatus({
      fid,
      badgeType: badgeDef.badgeType,
      txHash: mintResult.txHash,
      tokenId: mintResult.tokenId,
    })

    return NextResponse.json({
      success: true,
      message: 'Badge minted successfully!',
      txHash: mintResult.txHash,
      tokenId: mintResult.tokenId,
      badge: {
        id: badgeDef.id,
        name: badgeDef.name,
        tier: badgeDef.tier,
        chain: badgeDef.chain,
      }
    })
  } catch (error: any) {
    console.error('[Badge Claim] Mint failed:', error)
    
    // Return detailed error message
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to mint badge',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}))
