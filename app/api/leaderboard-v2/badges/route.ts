/**
 * GET /api/leaderboard-v2/badges
 * Fetch badges for multiple users (for leaderboard display)
 * Returns up to 5 most recent badges per user
 * Uses lib/ infrastructure for rate limiting and error handling
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserBadges } from '@/lib/badges/badges'
import { rateLimit, apiLimiter, getClientIp } from '@/lib/middleware/rate-limit'
import { createErrorResponse, ErrorType } from '@/lib/middleware/error-handler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Maximum badges to return per user
const MAX_BADGES_PER_USER = 5

// Maximum users to fetch badges for in one request
const MAX_USERS_PER_REQUEST = 50

export async function GET(request: NextRequest) {
  try {
    // 1. Rate limiting
    const ip = getClientIp(request)
    const { success } = await rateLimit(ip, apiLimiter)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const { searchParams } = new URL(request.url)
    const fidsParam = searchParams.get('fids')

    // 2. Validate input
    if (!fidsParam) {
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'Missing required parameter: fids',
        statusCode: 400,
      })
    }

    // Parse FIDs from comma-separated string
    const fids = fidsParam
      .split(',')
      .map((fid) => parseInt(fid.trim(), 10))
      .filter((fid) => !isNaN(fid) && fid > 0)
      .slice(0, MAX_USERS_PER_REQUEST) // Limit to max users

    if (fids.length === 0) {
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'No valid FIDs provided',
        statusCode: 400,
      })
    }

    // 3. Fetch badges for all users in parallel
    const badgePromises = fids.map(async (fid) => {
      try {
        const badges = await getUserBadges(fid)
        // Return only the most recent badges (up to MAX_BADGES_PER_USER)
        const recentBadges = badges.slice(0, MAX_BADGES_PER_USER).map((badge) => ({
          id: badge.id,
          badgeId: badge.badgeId,
          badgeType: badge.badgeType,
          tier: badge.tier,
          assignedAt: badge.assignedAt,
          metadata: badge.metadata,
        }))
        return { fid, badges: recentBadges }
      } catch (error) {
        console.error(`[BadgesAPI] Failed to fetch badges for FID ${fid}:`, error)
        return { fid, badges: [] }
      }
    })

    const results = await Promise.all(badgePromises)

    // 4. Convert to object for easier lookup
    const badgesByFid: Record<number, typeof results[0]['badges']> = {}
    for (const result of results) {
      badgesByFid[result.fid] = result.badges
    }

    // 5. Return with cache headers
    return NextResponse.json(
      {
        success: true,
        data: badgesByFid,
        meta: {
          userCount: fids.length,
          maxBadgesPerUser: MAX_BADGES_PER_USER,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // 5min cache
        },
      }
    )
    
  } catch (error) {
    return createErrorResponse({
      type: ErrorType.INTERNAL,
      message: error instanceof Error ? error.message : 'Internal server error',
      statusCode: 500,
    })
  }
}
