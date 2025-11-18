import { NextResponse } from 'next/server'
import { getUserBadges } from '@/lib/badges'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { FIDSchema } from '@/lib/validation/api-schemas'
import { withErrorHandler } from '@/lib/error-handler'
import { withTiming } from '@/lib/middleware/timing'
import { getCached, buildUserBadgesKey } from '@/lib/cache'

export const dynamic = 'force-dynamic'

/**
 * GET /api/badges/list?fid=123
 * Get all badges assigned to a user
 * 
 * Performance optimizations:
 * - Cache results for 2 minutes
 * - Request timing tracking
 */
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
        { success: false, error: 'Missing fid parameter' },
        { status: 400 }
      )
    }

    const fidNumber = parseInt(fid, 10)
    const validation = FIDSchema.safeParse(fidNumber)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid fid parameter', details: validation.error.issues },
        { status: 400 }
      )
    }

    // Fetch with cache (2 minute TTL)
    const badges = await getCached(
      'user-badges',
      buildUserBadgesKey(fidNumber),
      () => getUserBadges(fidNumber),
      { ttl: 120 }
    )

    const response = NextResponse.json({
      success: true,
      fid: fidNumber,
      badges,
      count: badges.length,
    })

    // Add cache headers for CDN/browser caching
    response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=120')

    return response
}))
