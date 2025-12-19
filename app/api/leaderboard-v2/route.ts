import { NextRequest, NextResponse } from 'next/server'
import { getLeaderboard } from '@/lib/leaderboard/leaderboard-service'
import {
  checkLeaderboardRateLimit,
  createRateLimitResponse,
  addRateLimitHeaders,
} from '@/lib/middleware/rate-limit'
import { generateRequestId } from '@/lib/middleware/request-id'
import redis from '@/lib/cache/redis-client'

export const runtime = 'nodejs'
export const revalidate = 300 // 5 minutes

/**
 * GET /api/leaderboard-v2
 * 
 * Fetch leaderboard data from leaderboard_calculations table
 * New V2.2 leaderboard with 6-source scoring aggregation
 * 
 * Rate Limit: 60 requests per minute per IP
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
  const requestId = generateRequestId()
  
  try {
    // Skip rate limiting in development
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    // Check rate limit first (skip in dev)
    let rateLimitResult = null
    if (!isDevelopment) {
      rateLimitResult = await checkLeaderboardRateLimit(request)
      
      if (!rateLimitResult.allowed) {
        return createRateLimitResponse(rateLimitResult)
      }
    }
    
    const searchParams = request.nextUrl.searchParams
    
    // Parse query parameters
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
    if (!['total_score', 'base_points', 'viral_xp', 'guild_bonus', 'referral_bonus', 'streak_bonus', 'badge_prestige', 'tip_points', 'nft_points'].includes(orderBy)) {
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
    
    // Phase 7 Priority 2: Implement caching
    // Cache key based on query parameters
    const cacheKey = `leaderboard:v2:${period}:${page}:${pageSize}:${search || 'all'}:${orderBy}`
    const cacheTTL = 300 // 5 minutes (matches revalidate)
    
    // Try cache first
    let result
    let cacheHit = false
    
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        console.log(`[Cache] Leaderboard V2 HIT: ${cacheKey}`)
        result = JSON.parse(cached)
        cacheHit = true
      }
    } catch (cacheError) {
      console.error('[Cache] Leaderboard V2 cache read error:', cacheError)
    }
    
    // Cache miss - fetch from database
    if (!result) {
      console.log(`[Cache] Leaderboard V2 MISS: ${cacheKey}`)
      result = await getLeaderboard({
        period,
        page,
        perPage: pageSize,
        search,
        orderBy,
      })
      
      // Store in cache
      try {
        await redis.setex(cacheKey, cacheTTL, JSON.stringify(result))
        console.log(`[Cache] Stored leaderboard V2: ${cacheKey} (TTL: ${cacheTTL}s)`)
      } catch (cacheError) {
        console.error('[Cache] Failed to store leaderboard V2:', cacheError)
      }
    }
    
    // Transform response to match expected format
    const response = {
      data: result.data,
      pagination: {
        currentPage: result.page,
        totalPages: result.totalPages,
        totalCount: result.count,
        pageSize: result.perPage,
      },
    }
    
    // Return with rate limit headers and cache status
    const nextResponse = NextResponse.json(response, {
      status: 200,
      headers: {
        'X-Request-ID': requestId,
        'X-Cache-Status': cacheHit ? 'HIT' : 'MISS',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
    
    // Add rate limit headers in production
    if (rateLimitResult) {
      return addRateLimitHeaders(nextResponse, rateLimitResult)
    }
    
    return nextResponse
  } catch (error) {
    console.error('[Leaderboard V2 API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard data' },
      { 
        status: 500,
        headers: { 'X-Request-ID': requestId }
      }
    )
  }
}
