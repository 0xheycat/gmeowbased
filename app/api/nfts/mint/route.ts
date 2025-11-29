/**
 * POST /api/nfts/mint
 * Initiate NFT minting for user
 * 
 * Flow:
 * 1. Validate user eligibility (requirements check)
 * 2. Add to mint_queue (status: pending)
 * 3. Trigger instant mint via contract-nft-mint.ts
 * 4. Update user_badges table with mint result
 * 5. Return txHash + tokenId
 * 
 * Body:
 * {
 *   fid: number
 *   address: string (user's wallet)
 *   nft_type_id: string
 *   chain: ChainKey
 * }
 * 
 * Reused from: /api/badges/mint (validation, queue, instant minting)
 */

import { NextResponse } from 'next/server'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { withErrorHandler } from '@/lib/error-handler'
import { withTiming } from '@/lib/middleware/timing'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { NFT_REGISTRY } from '@/lib/nfts'
import { mintNFTOnChain } from '@/lib/contract-nft-mint'
import { invalidateCache } from '@/lib/cache'
import type { ChainKey } from '@/lib/gmeow-utils'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Validation schema
const NFTMintSchema = z.object({
  fid: z.number().int().positive(),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  nft_type_id: z.string().min(1),
  chain: z.enum(['base', 'op', 'celo', 'ink', 'unichain']),
})

/**
 * Check if user meets NFT requirements
 */
async function checkNFTEligibility(
  fid: number,
  nftTypeId: string,
  supabase: any
): Promise<{ eligible: boolean; reason?: string }> {
  const nft = NFT_REGISTRY.find(n => n.id === nftTypeId)
  if (!nft) {
    return { eligible: false, reason: 'NFT type not found' }
  }

  if (!nft.is_active) {
    return { eligible: false, reason: 'NFT is not currently available' }
  }

  if (!nft.requirements) {
    return { eligible: true }
  }

  const { requirements } = nft

  // Check Neynar score
  if (requirements.neynar_score !== undefined) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('neynar_score')
      .eq('fid', fid)
      .single()

    if (!profile || (profile.neynar_score || 0) < requirements.neynar_score) {
      return { 
        eligible: false, 
        reason: `Requires Neynar score of ${requirements.neynar_score} or higher` 
      }
    }
  }

  // Check quest completion count
  if (requirements.quest_completion !== undefined) {
    const { data: completions } = await supabase
      .from('quest_completions')
      .select('id', { count: 'exact' })
      .eq('user_fid', fid)

    if ((completions?.length || 0) < requirements.quest_completion) {
      return { 
        eligible: false, 
        reason: `Requires ${requirements.quest_completion} quest completions` 
      }
    }
  }

  // Check guild membership
  if (requirements.guild_membership) {
    const { data: membership } = await supabase
      .from('guild_members')
      .select('id')
      .eq('fid', fid)
      .single()

    if (!membership) {
      return { eligible: false, reason: 'Requires guild membership' }
    }
  }

  return { eligible: true }
}

export const POST = withTiming(withErrorHandler(async (request: Request) => {
  const ip = getClientIp(request)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  // Validate input
  const body = await request.json()
  const validationResult = NFTMintSchema.safeParse(body)

  if (!validationResult.success) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Invalid input',
        details: validationResult.error.issues
      },
      { status: 400 }
    )
  }

  const { fid, address, nft_type_id, chain } = validationResult.data
  const supabase = getSupabaseServerClient()

  if (!supabase) {
    return NextResponse.json({
      ok: false,
      error: 'Database not configured',
    }, { status: 500 })
  }

  // Check if already minted
  const { data: existingNFT } = await supabase
    .from('user_badges')
    .select('*')
    .eq('fid', fid)
    .eq('nft_type_id', nft_type_id)
    .eq('nft_type', 'nft')
    .maybeSingle()

  if (existingNFT && existingNFT.minted) {
    return NextResponse.json({
      ok: false,
      error: 'NFT already minted',
      txHash: existingNFT.tx_hash,
      tokenId: existingNFT.token_id,
    }, { status: 400 })
  }

  // Check eligibility
  const eligibility = await checkNFTEligibility(fid, nft_type_id, supabase)
  if (!eligibility.eligible) {
    return NextResponse.json({
      ok: false,
      error: eligibility.reason || 'Not eligible to mint this NFT',
    }, { status: 403 })
  }

  try {
    // Add to mint queue
    const { data: queueEntry, error: queueError } = await supabase
      .from('mint_queue')
      .insert({
        fid,
        wallet_address: address,
        badgeType: nft_type_id, // Reuse badgeType column for NFT type
        chain,
        status: 'processing',
      })
      .select()
      .single()

    if (queueError) {
      console.error('[NFT Mint] Queue insert error:', queueError)
      return NextResponse.json({
        ok: false,
        error: 'Failed to add to mint queue',
      }, { status: 500 })
    }

    // Mint NFT on-chain (instant minting like badges)
    const mintResult = await mintNFTOnChain({
      nftTypeId: nft_type_id,
      recipientAddress: address,
      chain: chain as ChainKey,
      reason: 'user_mint',
    })

    // Update user_badges table
    const { error: badgeError } = await supabase
      .from('user_badges')
      .upsert({
        fid,
        badge_type: nft_type_id,
        nft_type_id,
        nft_type: 'nft',
        minted: true,
        tx_hash: mintResult.txHash,
        token_id: mintResult.tokenId,
        chain,
        assigned_at: new Date().toISOString(),
      })

    if (badgeError) {
      console.error('[NFT Mint] Badge insert error:', badgeError)
    }

    // Update mint queue status
    await supabase
      .from('mint_queue')
      .update({
        status: 'minted',
        tx_hash: mintResult.txHash,
        minted_at: new Date().toISOString(),
      })
      .eq('id', queueEntry.id)

    // Invalidate caches
    await Promise.all([
      invalidateCache('user-nfts', `user:${fid}:nfts`),
      invalidateCache('user-nft-stats', `user:${fid}:nft-stats`),
    ])

    return NextResponse.json({
      ok: true,
      fid,
      nft_type_id,
      txHash: mintResult.txHash,
      tokenId: mintResult.tokenId,
      chain,
    })
  } catch (error: any) {
    console.error('[NFT Mint] Error:', error)

    // Update queue status to failed
    await supabase
      .from('mint_queue')
      .update({ status: 'failed' })
      .eq('fid', fid)
      .eq('badgeType', nft_type_id)
      .eq('status', 'processing')

    return NextResponse.json({
      ok: false,
      error: error.message || 'Failed to mint NFT',
    }, { status: 500 })
  }
}))
