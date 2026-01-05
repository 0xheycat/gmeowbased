/**
 * Badge Claim API - TRUE HYBRID Pattern
 * 
 * POST /api/badges/claim
 * User-initiated badge claim/mint (INSTANT MINTING)
 * 
 * Data Sources:
 * - LAYER 1 (Subsquid): Check on-chain badge stakes (already minted?)
 * - LAYER 2 (Supabase): user_badges (eligibility), badge_templates (metadata)
 * - LAYER 3 (Calculated): Points cost validation
 * 
 * Flow:
 * 1. Validate input (FID, badgeId, walletAddress)
 * 2. Check eligibility (badge assigned but not minted in Supabase)
 * 3. Verify not already minted on-chain (Subsquid check)
 * 4. Mint INSTANTLY on blockchain (oracle pays gas)
 * 5. Update user_badges with tx_hash + minted status
 * 6. Return success with transaction details
 * 
 * Created: December 21, 2025
 * Migration: TRUE HYBRID Pattern (3-layer architecture)
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp, strictLimiter } from '@/lib/middleware/rate-limit'
import { getCached, invalidateCache } from '@/lib/cache/server'
import { createClient } from '@/lib/supabase/edge'
import { createErrorResponse, ErrorType } from '@/lib/middleware/error-handler'
import { FIDSchema, AddressSchema } from '@/lib/validation/api-schemas'
import { getBadgeStakesByAddress } from '@/lib/subsquid-client'
import { getBadgeFromRegistry, updateBadgeMintStatus } from '@/lib/badges/badges'
import { mintBadgeOnChain } from '@/lib/contracts/contract-mint'
import { generateRequestId } from '@/lib/middleware/request-id'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const ClaimBadgeSchema = z.object({
  fid: FIDSchema,
  badgeId: z.string().min(1, 'Badge ID is required'),
  walletAddress: AddressSchema,
})

// ============================================================================
// POST: CLAIM/MINT BADGE (TRUE HYBRID)
// ============================================================================

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  
  try {
    // 1. Rate Limiting (strict - minting operation)
    const ip = getClientIp(request)
    const rateLimitResult = await rateLimit(ip, strictLimiter)
    if (!rateLimitResult.success) {
      return createErrorResponse({
        type: ErrorType.RATE_LIMIT,
        message: 'Too many mint requests. Please try again later.',
        statusCode: 429,
      })
    }

    // 2. Input Validation
    const body = await request.json()
    const validationResult = ClaimBadgeSchema.safeParse(body)
    
    if (!validationResult.success) {
      console.error('[Badge Claim] Validation failed:', validationResult.error.issues)
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'Invalid claim request',
        details: validationResult.error.issues,
        statusCode: 400,
      })
    }

    const { fid, badgeId, walletAddress } = validationResult.data

    // 3. LAYER 2 (Supabase): Get badge definition and check eligibility
    const supabase = createClient()
    
    const badgeDef = getBadgeFromRegistry(badgeId)
    if (!badgeDef) {
      return createErrorResponse({
        type: ErrorType.NOT_FOUND,
        message: `Badge ${badgeId} not found in registry`,
        statusCode: 404,
      })
    }

    // Check if user owns this badge (must be assigned but not minted)
    const { data: userBadge, error: badgeError } = await supabase
      .from('user_badges')
      .select('id, badge_id, minted, tier, assigned_at')
      .eq('fid', fid)
      .eq('badge_id', badgeId)
      .single()

    if (badgeError || !userBadge) {
      return createErrorResponse({
        type: ErrorType.NOT_FOUND,
        message: 'Badge not found or not eligible. You must be assigned this badge first.',
        statusCode: 404,
      })
    }

    if (userBadge.minted) {
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'Badge already minted',
        statusCode: 400,
      })
    }

    // 4. LAYER 1 (Subsquid): Verify not already minted on-chain
    const onChainStakes = await getBadgeStakesByAddress(walletAddress.toLowerCase())
    const alreadyStaked = onChainStakes.some(stake => 
      stake.badgeId === badgeId || 
      (stake.badge && stake.badge.name === badgeDef.name)
    )
    
    if (alreadyStaked) {
      console.warn(`[Badge Claim] Badge ${badgeId} already staked on-chain for ${walletAddress}`)
      
      // Update database to reflect on-chain reality
      await supabase
        .from('user_badges')
        .update({ minted: true, updated_at: new Date().toISOString() })
        .eq('id', userBadge.id)
      
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'Badge already minted on blockchain',
        statusCode: 400,
      })
    }

    console.log(`[Badge Claim] Starting instant mint for FID ${fid}, badge ${badgeDef.badgeType}`)

    // 5. Mint on blockchain INSTANTLY (oracle pays gas)
    const mintResult = await mintBadgeOnChain({
      id: userBadge.id.toString(),
      fid,
      walletAddress,
      badgeType: badgeDef.badgeType,
      status: 'minting',
      createdAt: new Date(userBadge.assigned_at).toISOString(),
      updatedAt: new Date().toISOString(),
    })

    console.log(`[Badge Claim] Mint successful! TX: ${mintResult.txHash}, Token ID: ${mintResult.tokenId}`)

    // 6. Update user_badges table with mint details
    await updateBadgeMintStatus({
      fid,
      badgeType: badgeDef.badgeType,
      txHash: mintResult.txHash,
      tokenId: mintResult.tokenId,
    })

    // 7. Invalidate caches
    await invalidateCache('user-badges', `${fid}`)
    await invalidateCache('user-profile', `${fid}`)

    // 8. Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Badge minted successfully!',
        txHash: mintResult.txHash,
        tokenId: mintResult.tokenId,
        badge: {
          id: badgeDef.id,
          name: badgeDef.name,
          tier: badgeDef.tier,
          chain: badgeDef.chain,
        },
        metadata: {
          sources: {
            onchain: true,  // Verified no duplicate mint
            offchain: true, // Checked eligibility in Supabase
            calculated: false, // No calculations needed
          },
          mintedAt: new Date().toISOString(),
          requestId,
        },
      },
      {
        headers: {
          'X-Request-ID': requestId,
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error: any) {
    console.error('[Badge Claim] Mint failed:', error)
    
    return createErrorResponse({
      type: ErrorType.INTERNAL,
      message: error.message || 'Failed to mint badge',
      details: error.toString(),
      statusCode: 500,
    })
  }
}
