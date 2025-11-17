import { NextRequest, NextResponse } from 'next/server'
import { NeynarAPIClient } from '@neynar/nodejs-sdk'

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY

export const dynamic = 'force-dynamic'

/**
 * GET /api/user/profile
 * Get current user's Farcaster profile
 * 
 * Priority order:
 * 1. FID from query param (?fid=123)
 * 2. FID from Farcaster Frame context header
 * 3. FID from MiniKit context
 * 4. Default to demo FID for testing (18139 - @heycat)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    let fid: string | null = null
    let source: string = 'unknown'

    // 1. Try query parameter first (explicit FID from URL)
    fid = searchParams.get('fid')
    if (fid) source = 'query-param'

    // 2. Try Frame context (sent as header by Warpcast frames)
    if (!fid) {
      const frameContext = req.headers.get('x-farcaster-frame-context')
      if (frameContext) {
        try {
          const context = JSON.parse(frameContext)
          fid = context.untrustedData?.fid?.toString() || context.fid?.toString()
          if (fid) source = 'frame-context'
        } catch (e) {
          console.error('[Profile API] Failed to parse frame context:', e)
        }
      }
    }

    // 3. Try MiniKit SDK context (sent by Farcaster miniapp client)
    if (!fid) {
      // Check for miniapp-specific headers
      const miniKitFid = req.headers.get('x-minikit-fid') || req.headers.get('x-farcaster-fid')
      if (miniKitFid) {
        fid = miniKitFid
        source = 'minikit-header'
      }
    }

    // 4. Try referer-based detection (Warpcast web referrer)
    if (!fid) {
      const referer = req.headers.get('referer') || req.headers.get('referrer')
      if (referer && (referer.includes('warpcast.com') || referer.includes('farcaster.xyz'))) {
        // Extract FID from referer URL if present
        const fidMatch = referer.match(/[?&]fid=([0-9]+)/)
        if (fidMatch && fidMatch[1]) {
          fid = fidMatch[1]
          source = 'referer-url'
        }
      }
    }

    // 5. If no FID found, return anonymous mode with guidance
    if (!fid) {
      console.log('[Profile API] ⚠️ No FID detected from any source')
      return NextResponse.json(
        {
          anonymous: true,
          message: 'No Farcaster ID detected. Open this app from Warpcast or provide ?fid= parameter.',
          sources_checked: ['query-param', 'frame-context', 'minikit-headers', 'referer-url']
        },
        { status: 200 }
      )
    }

    console.log(`[Profile API] ✅ FID detected: ${fid} (source: ${source})`)

    // Fetch user from Neynar
    if (!NEYNAR_API_KEY) {
      return NextResponse.json(
        { error: 'Neynar API not configured' },
        { status: 500 }
      )
    }

    const neynar = new NeynarAPIClient({ apiKey: NEYNAR_API_KEY })
    const user = await neynar.fetchBulkUsers({ fids: [parseInt(fid)] })

    if (!user?.users?.[0]) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const fcUser = user.users[0]

    return NextResponse.json({
      fid: fcUser.fid,
      username: fcUser.username,
      displayName: fcUser.display_name || fcUser.username,
      pfpUrl: fcUser.pfp_url,
      bio: fcUser.profile?.bio?.text || '',
      followerCount: fcUser.follower_count || 0,
      followingCount: fcUser.following_count || 0,
      powerBadge: fcUser.power_badge || false,
      verifiedAddresses: fcUser.verified_addresses || [],
      custodyAddress: fcUser.custody_address,
    })
  } catch (error) {
    console.error('[user/profile] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user profile', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
