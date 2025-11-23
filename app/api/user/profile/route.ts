import { NextRequest, NextResponse } from 'next/server'
import { NeynarAPIClient } from '@neynar/nodejs-sdk'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { FIDSchema } from '@/lib/validation/api-schemas'
import { withErrorHandler } from '@/lib/error-handler'
import { withTiming } from '@/lib/middleware/timing'
import { getCached, buildUserProfileKey } from '@/lib/cache'

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
export const GET = withTiming(withErrorHandler(async (req: Request) => {
  const ip = getClientIp(req as NextRequest)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

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

    // Validate FID format BEFORE parsing
    if (!/^\d+$/.test(fid)) {
      return NextResponse.json(
        { error: 'Invalid FID format', details: 'FID must be a positive integer' },
        { status: 400 }
      )
    }

    const fidNumber = parseInt(fid, 10)
    
    // Validate FID value with Zod
    const validation = FIDSchema.safeParse(fidNumber)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid FID format', details: validation.error.issues },
        { status: 400 }
      )
    }

    // Fetch user from Neynar with cache
    const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY
    if (!NEYNAR_API_KEY) {
      return NextResponse.json(
        { error: 'Neynar API not configured' },
        { status: 500 }
      )
    }

    const profileData = await getCached(
      'user-profile',
      buildUserProfileKey(fidNumber),
      async () => {
        const neynar = new NeynarAPIClient({ apiKey: NEYNAR_API_KEY })
        const user = await neynar.fetchBulkUsers({ fids: [parseInt(fid)] })

        if (!user?.users?.[0]) {
          // Return null to indicate user not found
          return null
        }

        const fcUser = user.users[0]

        return {
          fid: fcUser.fid,
          username: fcUser.username,
          displayName: fcUser.display_name || fcUser.username,
          pfpUrl: fcUser.pfp_url,
          bio: fcUser.profile?.bio?.text || '',
          followerCount: fcUser.follower_count || 0,
          followingCount: fcUser.following_count || 0,
          powerBadge: (fcUser as any).power_badge || false,
          verifiedAddresses: fcUser.verified_addresses || [],
          custodyAddress: fcUser.custody_address,
        }
      },
      { ttl: 300 }
    )

    // Check if user was found
    if (!profileData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const response = NextResponse.json(profileData)
    response.headers.set('Cache-Control', 's-maxage=180, stale-while-revalidate=300')
    return response
}))
