/**
 * GET /api/referral/[fid]/analytics
 * 
 * Purpose: Fetch referral analytics data for performance tracking
 * Security: 10-layer security pattern
 * 
 * Features:
 * - Referral timeline (last 30 days)
 * - Conversion metrics
 * - Tier distribution
 * - Period comparison
 * - Performance stats
 * 
 * Response Format:
 * {
 *   success: true,
 *   data: {
 *     timeline: [{ date, referrals, points }],
 *     metrics: { totalReferrals, conversionRate, averageTimeToConvert, growthRate, peakDay },
 *     tierDistribution: { bronze, silver, gold },
 *     comparison: { thisWeek, lastWeek, thisMonth, lastMonth }
 *   },
 *   fid: number,
 *   timestamp: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/edge'
import { strictLimiter, getClientIp } from '@/lib/middleware/rate-limit'
import { createErrorResponse, ErrorType, logError } from '@/lib/middleware/error-handler'
import { generateRequestId } from '@/lib/middleware/request-id'

// ===== SECURITY LAYER 2: INPUT VALIDATION =====
const FidParamSchema = z.object({
  fid: z.coerce.number().int().positive(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { fid: string } }
) {
  const requestId = generateRequestId()
  const startTime = Date.now()
  const clientIp = getClientIp(request)

  // ===== SECURITY LAYER 9: AUDIT LOGGING =====
  console.log('[API /api/referral/[fid]/analytics] Request received', {
    requestId,
    ip: clientIp,
    fid: params.fid,
    timestamp: new Date().toISOString(),
  })

  try {
    // ===== SECURITY LAYER 1: RATE LIMITING =====
    if (!strictLimiter) {
      return createErrorResponse({
        type: ErrorType.INTERNAL,
        message: 'Rate limiter not available',
        statusCode: 503,
      })
    }

    const rateLimitResult = await strictLimiter.limit(clientIp)
    
    if (!rateLimitResult.success) {
      return createErrorResponse({
        type: ErrorType.RATE_LIMIT,
        message: 'Too many requests. Please try again later.',
        statusCode: 429,
      })
    }

    // ===== SECURITY LAYER 2: INPUT VALIDATION =====
    const validation = FidParamSchema.safeParse(params)
    
    if (!validation.success) {
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'Invalid FID parameter',
        statusCode: 400,
        ...(process.env.NODE_ENV === 'development' && {
          _devDetails: validation.error.issues,
        }),
      })
    }

    const { fid } = validation.data

    // ===== SECURITY LAYER 3: DATABASE SECURITY =====
    const supabase = getSupabaseServerClient()
    
    if (!supabase) {
      return createErrorResponse({
        type: ErrorType.INTERNAL,
        message: 'Database client not available',
        statusCode: 503,
      })
    }

    // Fetch referral timeline (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: timelineData, error: timelineError } = await supabase
      .from('referral_timeline')
      .select('date, referrals, points')
      .eq('fid', fid)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (timelineError) {
      logError('Database query failed (timeline)', {
        endpoint: '/api/referral/[fid]/analytics',
        ip: clientIp,
        requestId,
        error: timelineError.message,
      })

      return createErrorResponse({
        type: ErrorType.DATABASE,
        message: 'Failed to fetch analytics data',
        statusCode: 500,
      })
    }

    // Fetch referral metrics
    const { data: metricsData, error: metricsError } = await supabase
      .from('referral_stats')
      .select('total_referrals, conversion_rate, growth_rate')
      .eq('fid', fid)
      .single()

    if (metricsError) {
      logError('Database query failed (metrics)', {
        endpoint: '/api/referral/[fid]/analytics',
        ip: clientIp,
        requestId,
        error: metricsError.message,
      })

      // Return empty metrics if not found
      if (metricsError.code === 'PGRST116') {
        return NextResponse.json(
          {
            success: true,
            data: {
              timeline: [],
              metrics: {
                totalReferrals: 0,
                conversionRate: 0,
                averageTimeToConvert: 0,
                growthRate: 0,
                peakDay: { date: new Date().toISOString().split('T')[0], count: 0 },
              },
              tierDistribution: { bronze: 0, silver: 0, gold: 0 },
              comparison: { thisWeek: 0, lastWeek: 0, thisMonth: 0, lastMonth: 0 },
            },
            fid,
            timestamp: new Date().toISOString(),
          },
          {
            status: 200,
            headers: {
              'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
              'X-Request-ID': requestId,
              'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '0',
              'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '0',
              'X-RateLimit-Reset': rateLimitResult.reset?.toString() || '0',
              'Server-Timing': `db;dur=${Date.now() - startTime}`,
            },
          }
        )
      }

      return createErrorResponse({
        type: ErrorType.DATABASE,
        message: 'Failed to fetch analytics data',
        statusCode: 500,
      })
    }

    // Fetch tier distribution (row-based data)
    const { data: tierRows, error: tierError } = await supabase
      .from('referral_tier_distribution')
      .select('tier, count')
      .eq('fid', fid)

    const tierData = tierRows?.reduce((acc, row) => {
      acc[row.tier] = row.count
      return acc
    }, {} as Record<string, number>)

    if (tierError && tierError.code !== 'PGRST116') {
      logError('Database query failed (tier)', {
        endpoint: '/api/referral/[fid]/analytics',
        ip: clientIp,
        requestId,
        error: tierError.message,
      })
    }

    // Fetch period comparison (row-based data)
    const { data: comparisonRows, error: comparisonError } = await supabase
      .from('referral_period_comparison')
      .select('period, referrals, points')
      .eq('fid', fid)

    const comparisonData = comparisonRows?.reduce((acc, row) => {
      acc[row.period] = row.referrals || 0
      return acc
    }, {} as Record<string, number>)

    if (comparisonError && comparisonError.code !== 'PGRST116') {
      logError('Database query failed (comparison)', {
        endpoint: '/api/referral/[fid]/analytics',
        ip: clientIp,
        requestId,
        error: comparisonError.message,
      })
    }

    // Calculate peak day from timeline
    const peakDay = timelineData?.reduce(
      (max, day) => ((day.referrals || 0) > max.count ? { date: day.date, count: day.referrals || 0 } : max),
      { date: new Date().toISOString().split('T')[0], count: 0 }
    ) || { date: new Date().toISOString().split('T')[0], count: 0 }

    // ===== SECURITY LAYER 9: AUDIT LOGGING =====
    console.log('[Referral Analytics API] Success', {
      requestId,
      ip: clientIp,
      fid,
      timelineRecords: timelineData?.length || 0,
      totalReferrals: metricsData?.total_referrals || 0,
      duration: Date.now() - startTime,
    })

    // ===== SECURITY LAYER 6: RESPONSE FORMATTING =====
    return NextResponse.json(
      {
        success: true,
        data: {
          timeline: timelineData || [],
          metrics: {
            totalReferrals: metricsData?.total_referrals || 0,
            conversionRate: metricsData?.conversion_rate || 0,
            averageTimeToConvert: 0, // Not tracked in current schema
            growthRate: metricsData?.growth_rate || 0,
            peakDay,
          },
          tierDistribution: {
            bronze: tierData?.bronze || 0,
            silver: tierData?.silver || 0,
            gold: tierData?.gold || 0,
          },
          comparison: {
            thisWeek: comparisonData?.this_week || 0,
            lastWeek: comparisonData?.last_week || 0,
            thisMonth: comparisonData?.this_month || 0,
            lastMonth: comparisonData?.last_month || 0,
          },
        },
        fid,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'X-Request-ID': requestId,
          'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '0',
          'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '0',
          'X-RateLimit-Reset': rateLimitResult.reset?.toString() || '0',
          'Server-Timing': `db;dur=${Date.now() - startTime}`,
        },
      }
    )
  } catch (error) {
    // ===== SECURITY LAYER 10: ERROR MASKING (CRITICAL) =====
    logError('Unexpected error in referral analytics API', {
      endpoint: '/api/referral/[fid]/analytics',
      ip: clientIp,
      requestId,
      fid: params.fid,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return createErrorResponse({
      type: ErrorType.INTERNAL,
      message: 'An unexpected error occurred',
      statusCode: 500,
      ...(process.env.NODE_ENV === 'development' && {
        _devDetails: error instanceof Error ? error.message : 'Unknown error',
      }),
    })
  }
}
