/**
 * GET /api/nfts/stats?fid=123
 * Get user's NFT stats for dashboard
 * 
 * Returns:
 * - total_nfts: Total available NFT types
 * - minted_nfts: NFTs user has minted
 * - pending_nfts: NFTs in mint queue
 * - completion_percent: Percentage of NFTs collected
 * 
 * Reused from: /api/badges/list (query pattern, caching)
 */

import { NextResponse } from 'next/server'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { FIDSchema } from '@/lib/validation/api-schemas'
import { withErrorHandler } from '@/lib/error-handler'
import { withTiming } from '@/lib/middleware/timing'
import { getCached } from '@/lib/cache'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { NFT_REGISTRY } from '@/lib/nfts'
import type { NFTStats } from '@/lib/nfts'

export const dynamic = 'force-dynamic'

/**
 * Get user's NFT stats
 */
async function getUserNFTStats(fid: number) {
  const supabase = getSupabaseServerClient()

  if (!supabase) {
    throw new Error('Database not configured')
  }

  // Total active NFT types
  const totalNFTs = NFT_REGISTRY.filter(nft => nft.is_active).length

  // Minted NFTs count
  const { count: mintedCount } = await supabase
    .from('user_badges')
    .select('*', { count: 'exact', head: true })
    .eq('fid', fid)
    .eq('nft_type', 'nft')

  // Pending mints count
  const { count: pendingCount } = await supabase
    .from('mint_queue')
    .select('*', { count: 'exact', head: true })
    .eq('fid', fid)
    .in('status', ['pending', 'processing'])
    .not('badgeType', 'is', null)

  const minted = mintedCount || 0
  const pending = pendingCount || 0
  const completionPercent = totalNFTs > 0 
    ? Math.round((minted / totalNFTs) * 100) 
    : 0

  return {
    total_nfts: totalNFTs,
    minted_nfts: minted,
    pending_nfts: pending,
    completion_percent: completionPercent,
    by_rarity: {},
    by_category: {},
  }
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

  // Fetch with cache (1 minute TTL)
  const stats = await getCached(
    'user-nft-stats',
    `user:${fidNumber}:nft-stats`,
    () => getUserNFTStats(fidNumber),
    { ttl: 60 }
  )

  const response = NextResponse.json({
    ok: true,
    fid: fidNumber,
    stats,
  })

  // Add cache headers
  response.headers.set('Cache-Control', 's-maxage=30, stale-while-revalidate=60')

  return response
}))
