/**
 * Phase 5.7: Cast API Integration - Badge Share Route
 * 
 * POST endpoint for publishing badge shares to Warpcast via Neynar API
 * Accepts badge share request from ShareButton (Phase 5.5)
 * Embeds OG image from tier-card route (Phase 5.6)
 * Logs cast to badge_casts table for viral metrics (Phase 5.8)
 * 
 * Route: /api/cast/badge-share
 */

import { NextRequest, NextResponse } from 'next/server'
import { getNeynarServerClient } from '@/lib/neynar-server'
import { resolveBotSignerUuid } from '@/lib/neynar-bot'
import { getUserBadges } from '@/lib/badges'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { withErrorHandler } from '@/lib/error-handler'

export const runtime = 'nodejs'

type TierType = 'mythic' | 'legendary' | 'epic' | 'rare' | 'common'

type BadgeShareRequest = {
  fid: string
  badgeId: string
  tier: TierType
  badgeName?: string
}

const TIER_EMOJI = {
  mythic: '🌟',
  legendary: '👑',
  epic: '💎',
  rare: '⚡',
  common: '✨',
}

const MAX_CAST_LENGTH = 320

function generateCastText(params: { fid: string; tier: TierType; badgeName?: string }): string {
  const emoji = TIER_EMOJI[params.tier]
  const tierLabel = params.tier.charAt(0).toUpperCase() + params.tier.slice(1)
  const badge = params.badgeName || `${tierLabel} Badge`
  
  // Base text with emoji, badge name, and tier
  let text = `${emoji} Just unlocked ${badge} on @gmeowbased! 🎯\n\nFID: ${params.fid} | Tier: ${tierLabel}`
  
  // Add CTA if under limit
  const cta = '\n\nJoin the adventure: gmeowhq.art'
  if (text.length + cta.length <= MAX_CAST_LENGTH) {
    text += cta
  }
  
  return text
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  let body: BadgeShareRequest
  try {
    body = (await req.json()) as BadgeShareRequest
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload' }, { status: 400 })
  }

  // Validate required fields
  const { fid, badgeId, tier, badgeName } = body
  if (!fid || !badgeId || !tier) {
    return NextResponse.json(
      { ok: false, error: 'Missing required fields: fid, badgeId, tier' },
      { status: 400 }
    )
  }

  const fidNumber = parseInt(fid, 10)
  if (isNaN(fidNumber) || fidNumber <= 0) {
    return NextResponse.json({ ok: false, error: 'Invalid fid' }, { status: 400 })
  }

  // Validate tier
  const validTiers: TierType[] = ['mythic', 'legendary', 'epic', 'rare', 'common']
  if (!validTiers.includes(tier)) {
    return NextResponse.json({ ok: false, error: 'Invalid tier' }, { status: 400 })
  }

  // Verify bot signer configured
  const signerUuid = resolveBotSignerUuid()
  if (!signerUuid) {
    return NextResponse.json(
      { ok: false, error: 'Bot signer UUID not configured on server' },
      { status: 500 }
    )
  }

  // Validate badge ownership
  const userBadges = await getUserBadges(fidNumber)
  const ownsBadge = userBadges.some(b => b.badgeId === badgeId)
  
  if (!ownsBadge) {
    return NextResponse.json(
      { ok: false, error: 'User does not own this badge' },
      { status: 403 }
    )
  }

  // Generate cast text
  const text = generateCastText({ fid, tier, badgeName })

  // Build OG image embed URL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                  'http://localhost:3000'
  const ogImageUrl = `${baseUrl}/api/og/tier-card?fid=${fid}&badgeId=${badgeId}`

  // Publish cast via Neynar API
  const client = getNeynarServerClient()
  const response = await client.publishCast({
    signerUuid,
    text,
    embeds: [{ url: ogImageUrl }],
  })

  const castHash = response.cast?.hash
  const castUrl = castHash ? `https://warpcast.com/~/conversations/${castHash}` : null

  // Log cast to database for viral metrics tracking (Phase 5.8)
  try {
    const supabase = getSupabaseServerClient()
    if (supabase && castHash) {
      await supabase.from('badge_casts').insert({
        fid: fidNumber,
        badge_id: badgeId,
        cast_hash: castHash,
        cast_url: castUrl,
        tier,
        created_at: new Date().toISOString(),
      })
    }
  } catch (logError) {
    // Non-critical: log but don't fail the request
    console.error('[badge-share] Failed to log cast to database:', logError)
  }

  return NextResponse.json({
    ok: true,
    cast: {
      hash: castHash,
      url: castUrl,
      text,
      embedUrl: ogImageUrl,
    },
    publishedAt: new Date().toISOString(),
  })
})
