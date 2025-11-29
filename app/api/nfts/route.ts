/**
 * GET /api/nfts?fid=123
 * Get all NFTs available to user (minted + available + locked)
 * 
 * Returns:
 * - Minted NFTs with token IDs
 * - Available NFTs user can mint (eligible)
 * - Locked NFTs (requirements not met)
 * 
 * Reused from: /api/badges/list (query pattern, caching, rate limiting)
 */

import { NextResponse } from 'next/server'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { FIDSchema } from '@/lib/validation/api-schemas'
import { withErrorHandler } from '@/lib/error-handler'
import { withTiming } from '@/lib/middleware/timing'
import { getCached } from '@/lib/cache'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { NFT_REGISTRY } from '@/lib/nfts'
import type { NFTMetadata } from '@/lib/nfts'

export const dynamic = 'force-dynamic'

/**
 * Check if user meets NFT requirements
 */
async function checkNFTEligibility(
  fid: number,
  nft: NFTMetadata,
  supabase: any
): Promise<boolean> {
  if (!nft.requirements) return true

  const { requirements } = nft

  // Check Neynar score
  if (requirements.neynar_score !== undefined) {
    // Fetch user's Neynar score from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('neynar_score')
      .eq('fid', fid)
      .single()

    if (!profile || (profile.neynar_score || 0) < requirements.neynar_score) {
      return false
    }
  }

  // Check quest completion count
  if (requirements.quest_completion !== undefined) {
    const { data: completions } = await supabase
      .from('quest_completions')
      .select('id', { count: 'exact' })
      .eq('user_fid', fid)

    if ((completions?.length || 0) < requirements.quest_completion) {
      return false
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
      return false
    }
  }

  return true
}

/**
 * Get user's NFTs with eligibility status
 */
async function getUserNFTs(fid: number) {
  const supabase = getSupabaseServerClient()

  if (!supabase) {
    throw new Error('Database not configured')
  }

  // Get minted NFTs from user_badges (nft_type = 'nft')
  const { data: mintedNFTs, error: mintedError } = await supabase
    .from('user_badges')
    .select('*')
    .eq('fid', fid)
    .eq('nft_type', 'nft')

  if (mintedError) {
    console.error('[NFT API] Error fetching minted NFTs:', mintedError)
  }

  // Get pending mints from mint_queue
  const { data: pendingMints, error: pendingError } = await supabase
    .from('mint_queue')
    .select('*')
    .eq('fid', fid)
    .in('status', ['pending', 'processing'])
    .not('badgeType', 'is', null) // Only NFT mints

  if (pendingError) {
    console.error('[NFT API] Error fetching pending mints:', pendingError)
  }

  // Build NFT list with status
  const nfts = await Promise.all(
    NFT_REGISTRY.filter(nft => nft.is_active).map(async (nft) => {
      // Check if minted
      const minted = mintedNFTs?.find(
        (m: any) => m.nft_type_id === nft.id || m.badgeType === nft.id
      )

      // Check if pending
      const pending = pendingMints?.find(
        (p: any) => p.badgeType === nft.id
      )

      // Check eligibility
      const eligible = await checkNFTEligibility(fid, nft, supabase)

      return {
        ...nft,
        nft_type_id: nft.id,
        is_minted: !!minted,
        is_pending: !!pending,
        is_eligible: eligible,
        minted_at: minted?.created_at,
        token_id: minted?.token_id,
      }
    })
  )

  return nfts
}

export const GET = withTiming(withErrorHandler(async (request: Request) => {
  const ip = getClientIp(request)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const { searchParams } = new URL(request.url)
  const fid = searchParams.get('fid')

  if (!fid) {
    return NextResponse.json(
      { ok: false, error: 'Missing fid parameter' },
      { status: 400 }
    )
  }

  const fidNumber = parseInt(fid, 10)
  const validation = FIDSchema.safeParse(fidNumber)
  if (!validation.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid fid parameter', details: validation.error.issues },
      { status: 400 }
    )
  }

  // Fetch with cache (1 minute TTL - shorter for real-time minting)
  const nfts = await getCached(
    'user-nfts',
    `user:${fidNumber}:nfts`,
    () => getUserNFTs(fidNumber),
    { ttl: 60 }
  )

  const response = NextResponse.json({
    ok: true,
    fid: fidNumber,
    nfts,
    count: nfts.length,
  })

  // Add cache headers
  response.headers.set('Cache-Control', 's-maxage=30, stale-while-revalidate=60')

  return response
}))
