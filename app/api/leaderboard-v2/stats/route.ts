import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, apiLimiter, getClientIp } from '@/lib/middleware/rate-limit'
import { getCached } from '@/lib/cache/server'
import { createErrorResponse, ErrorType } from '@/lib/middleware/error-handler'
import { FIDSchema } from '@/lib/validation/api-schemas'
import { getSubsquidClient } from '@/lib/subsquid-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic' // Uses request.headers
export const revalidate = 300 // 5 minutes

/**
 * GET /api/leaderboard-v2/stats
 * 
 * Fetch aggregate statistics for leaderboard using Subsquid
 * Uses lib/ infrastructure for caching, rate limiting, and error handling
 * 
 * Query Parameters:
 * - period: 'daily' | 'weekly' | 'all_time' (default: 'all_time')
 * - fid: number (optional - to calculate user's rank and percentile)
 * 
 * Response:
 * {
 *   totalPilots: number
 *   averageScore: number
 *   top1PercentThreshold: number
 *   top10PercentThreshold: number
 *   yourRank?: number (if fid provided)
 *   yourPercentile?: number (if fid provided)
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
    const fidParam = searchParams.get('fid')
    
    // Validate period
    if (!['daily', 'weekly', 'all_time'].includes(period)) {
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'Invalid period. Must be daily, weekly, or all_time',
        statusCode: 400,
      })
    }
    
    // Validate FID if provided
    let fid: number | undefined
    if (fidParam) {
      const validation = FIDSchema.safeParse(parseInt(fidParam))
      if (!validation.success) {
        return createErrorResponse({
          type: ErrorType.VALIDATION,
          message: 'Invalid FID format',
          details: validation.error.issues,
          statusCode: 400,
        })
      }
      fid = validation.data
    }
    
    // 3. Get cached data with lib/ infrastructure
    const stats = await getCached(
      'leaderboard-stats',        // namespace
      `${period}:${fid || 'all'}`, // key
      async () => {                // fetcher
        const client = getSubsquidClient()
        
        // Fetch full leaderboard to calculate statistics
        const leaderboardData = await client.getLeaderboard(10000, 0)
        
        if (!leaderboardData || leaderboardData.length === 0) {
          return {
            totalPilots: 0,
            averageScore: 0,
            top1PercentThreshold: 0,
            top10PercentThreshold: 0,
          }
        }
        
        // Calculate statistics
        const totalPilots = leaderboardData.length
        const totalScore = leaderboardData.reduce((sum, entry) => sum + (entry.totalScore || 0), 0)
        const averageScore = totalScore / totalPilots
        
        // Calculate percentile thresholds
        const top1PercentIndex = Math.max(0, Math.floor(totalPilots * 0.01) - 1)
        const top10PercentIndex = Math.max(0, Math.floor(totalPilots * 0.10) - 1)
        
        const top1PercentThreshold = leaderboardData[top1PercentIndex]?.totalScore || 0
        const top10PercentThreshold = leaderboardData[top10PercentIndex]?.totalScore || 0
        
        const response: any = {
          totalPilots,
          averageScore,
          top1PercentThreshold,
          top10PercentThreshold,
        }
        
        // If FID provided, calculate user's rank and percentile
        if (fid !== undefined) {
          const userEntry = await client.getUserStatsByFID(fid)
          
          if (userEntry) {
            response.yourRank = (userEntry as any).rank || 0
            response.yourPercentile = (((userEntry as any).rank || 0) / totalPilots) * 100
          }
        }
        
        return response
      },
      { ttl: 300 }                 // 5 minutes cache
    )
    
    // 4. Return with cache headers
    return NextResponse.json(stats, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
    
  } catch (error) {
    return createErrorResponse({
      type: ErrorType.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to fetch statistics',
      statusCode: 500,
    })
  }
}
