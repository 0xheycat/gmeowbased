import { NextResponse } from 'next/server'
import { getBadgeFromRegistry } from '@/lib/badges'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { withErrorHandler } from '@/lib/error-handler'
import { withTiming } from '@/lib/middleware/timing'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const ClaimBadgeSchema = z.object({
  fid: z.number().int().positive(),
  badgeId: z.string().min(1),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
})

/**
 * POST /api/badges/claim
 * User-initiated badge claim/mint
 * 
 * Flow:
 * 1. User clicks "Claim Badge" on profile
 * 2. Checks user owns the badge (assigned but not minted)
 * 3. Adds to mint_queue for processing
 * 4. Oracle mints using its points (free for user)
 * 5. User pays only gas fees
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

  // Check if already in mint queue
  const { data: existingMint } = await supabase
    .from('mint_queue')
    .select('id, status')
    .eq('fid', fid)
    .eq('badge_type', badgeDef.badgeType)
    .in('status', ['pending', 'minting'])
    .single()

  if (existingMint) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Badge mint already in progress',
        queueId: existingMint.id,
        status: existingMint.status
      },
      { status: 400 }
    )
  }

  // Add to mint queue - oracle will process and pay points, user pays gas
  const { data: mintEntry, error: mintError } = await supabase
    .from('mint_queue')
    .insert({
      fid,
      wallet_address: walletAddress,
      badge_type: badgeDef.badgeType,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (mintError) {
    console.error('[Badge Claim] Failed to queue mint:', mintError)
    return NextResponse.json(
      { success: false, error: 'Failed to queue badge mint' },
      { status: 500 }
    )
  }

  console.log(`[Badge Claim] Queued mint for FID ${fid}, badge ${badgeDef.badgeType}`)

  return NextResponse.json({
    success: true,
    message: 'Badge queued for minting',
    queueId: mintEntry.id,
    badge: {
      id: badgeDef.id,
      name: badgeDef.name,
      tier: badgeDef.tier,
      chain: badgeDef.chain,
    }
  })
}))
