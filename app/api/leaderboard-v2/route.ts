import { NextRequest, NextResponse } from 'next/server'
import { getLeaderboard } from '@/lib/leaderboard/leaderboard-service'
import { rateLimit, apiLimiter, getClientIp } from '@/lib/middleware/rate-limit'
import { getCached } from '@/lib/cache/server'
import { createErrorResponse } from '@/lib/middleware/error-handler'

export const runtime = 'nodejs'
export const revalidate = 300 // 5 minutes

/**
 * GET /api/leaderboard-v2
 * 
 * Fetch leaderboard data with hybrid Subsquid + Supabase pattern
 * Uses lib/ infrastructure for caching, rate limiting, and error handling
 * 
 * Query Parameters:
 * - period: 'daily' | 'weekly' | 'all_time' (default: 'all_time')
 * - page: number (default: 1)
 * - pageSize: number (default: 15, max: 100)
 * - search: string (optional - search by username or FID)
 * - orderBy: 'total_score' | 'base_points' | 'viral_xp' | 'guild_bonus' | 'referral_bonus' | 'streak_bonus' | 'badge_prestige' | 'tip_points' | 'nft_points' (default: 'total_score')
 * 
 * Response:
 * {
 *   data: LeaderboardEntry[]
 *   pagination: {
 *     currentPage: number
 *     totalPages: number
 *     totalCount: number
 *     pageSize: number
 *   }
 * }
 */
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

    const searchParams = request.nextUrl.searchParams
    
    // 2. Parse and validate query parameters
    const period = (searchParams.get('period') || 'all_time') as 'daily' | 'weekly' | 'all_time'
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '15'), 100)
    const search = searchParams.get('search') || undefined
    const orderBy = (searchParams.get('orderBy') || 'total_score') as 'total_score' | 'base_points' | 'viral_xp' | 'guild_bonus' | 'referral_bonus' | 'streak_bonus' | 'badge_prestige' | 'tip_points' | 'nft_points'
    
    // Validate period
    if (!['daily', 'weekly', 'all_time'].includes(period)) {
      return NextResponse.json(
        { error: 'Invalid period. Must be daily, weekly, or all_time' },
        { status: 400 }
      )
    }
    
    // Validate orderBy
    const validOrderBy = ['total_score', 'base_points', 'viral_xp', 'guild_bonus', 'referral_bonus', 'streak_bonus', 'badge_prestige', 'tip_points', 'nft_points']
    if (!validOrderBy.includes(orderBy)) {
      return NextResponse.json(
        { error: 'Invalid orderBy parameter' },
        { status: 400 }
      )
    }
    
    // Validate pagination
    if (page < 1 || pageSize < 1) {
      return NextResponse.json(
        { error: 'Page and pageSize must be positive integers' },
        { status: 400 }
      )
    }
    
    // 3. Get cached data with lib/ infrastructure
    const result = await getCached(
      'leaderboard-v2',              // namespace
      `${period}:${page}:${pageSize}:${search || 'all'}:${orderBy}`, // key
      async () => {                  // fetcher
        return await getLeaderboard({
          period,
          page,
          perPage: pageSize,
          search,
          orderBy,
        })
      },
      { ttl: 300 }                   // 5 minutes cache
    )
    
    // 4. Transform response to match expected format
    const response = {
      data: result.data,
      pagination: {
        currentPage: result.page,
        totalPages: result.totalPages,
        totalCount: result.count,
        pageSize: result.perPage,
      },
    }
    
    // 5. Return with cache headers
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
    
  } catch (error) {
    return createErrorResponse({
      type: 'internal_error' as any,
      message: error instanceof Error ? error.message : 'Failed to fetch leaderboard data',
      statusCode: 500,
    })
  }
}
