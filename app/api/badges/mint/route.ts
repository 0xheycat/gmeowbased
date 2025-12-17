import { NextResponse } from 'next/server'
import { updateBadgeMintStatus } from '@/lib/badges'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { BadgeMintSchema } from '@/lib/validation/api-schemas'
import { withErrorHandler } from '@/lib/error-handler'
import { generateRequestId } from '@/lib/request-id'

export const dynamic = 'force-dynamic'

/**
 * POST /api/badges/mint
 * Update badge mint status after on-chain minting
 * 
 * Body:
 * {
 *   fid: number
 *   badgeType: string
 *   txHash: string
 *   tokenId?: number
 *   contractAddress?: string
 * }
 */
export const POST = withErrorHandler(async (request: Request) => {
  const requestId = generateRequestId()
  const supabase = getSupabaseServerClient()
  
  if (!supabase) {
    return NextResponse.json(
      { success: false, error: 'Database not configured' },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }

  // Validate input with Zod
  const body = await request.json()
  const validationResult = BadgeMintSchema.safeParse(body)

  if (!validationResult.success) {
    console.error('[Badge Mint] Validation failed:', validationResult.error.issues)
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid input',
        details: validationResult.error.issues
      },
      { status: 400, headers: { 'X-Request-ID': requestId } }
    )
  }

  const { fid, badgeType, txHash, tokenId, contractAddress } = validationResult.data

  // Check if badge is already minted to prevent duplicates
  const { data: existingBadge } = await supabase
    .from('user_badges')
    .select('minted, tx_hash')
    .eq('fid', fid)
    .eq('badge_type', badgeType)
    .maybeSingle()

  if (existingBadge?.minted && existingBadge.tx_hash) {
    console.warn(`Badge ${badgeType} for FID ${fid} already minted: ${existingBadge.tx_hash}`)
    return NextResponse.json({
      success: true,
      fid,
      badgeType,
      txHash: existingBadge.tx_hash,
      tokenId,
      note: 'Badge was already minted',
    }, { headers: { 'X-Request-ID': requestId } })
  }

  // Update badge mint status (includes cache invalidation)
  await updateBadgeMintStatus({
    fid,
    badgeType,
    txHash,
    tokenId,
    contractAddress,
  })

  // Update mint queue status
  const { error: queueError } = await supabase
    .from('mint_queue')
    .update({
      status: 'minted',
      tx_hash: txHash,
      minted_at: new Date().toISOString(),
    })
    .eq('fid', fid)
    .eq('badge_type', badgeType)
    .in('status', ['pending', 'minting'])

  if (queueError) {
    console.error('Failed to update mint queue:', queueError)
    // Don't fail the request since badge was updated successfully
  }

  return NextResponse.json({
    success: true,
    fid,
    badgeType,
    txHash,
    tokenId,
  }, { headers: { 'X-Request-ID': requestId } })
})
