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
    // 1. Try query param
    const { searchParams } = new URL(req.url)
    let fid = searchParams.get('fid')

    // 2. Try Farcaster Frame context header
    if (!fid) {
      const frameContext = req.headers.get('x-farcaster-frame-context')
      if (frameContext) {
        try {
          const context = JSON.parse(frameContext)
          fid = context.untrustedData?.fid?.toString() || context.fid?.toString()
        } catch {
          // Invalid JSON, continue
        }
      }
    }

    // 3. Try MiniKit context (stored in localStorage, sent via header)
    if (!fid) {
      const miniKitFid = req.headers.get('x-minikit-fid')
      if (miniKitFid) {
        fid = miniKitFid
      }
    }

    // 4. Default FID for testing
    if (!fid) {
      // Return anonymous user - client will prompt for FID input
      return NextResponse.json({
        anonymous: true,
        message: 'No FID found. Please provide FID via ?fid=YOUR_FID',
      })
    }

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
