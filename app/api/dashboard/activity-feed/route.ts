/**
 * Dashboard - Activity Feed API
 * 
 * Fetches global trending Farcaster casts
 * with 10-layer security protection + Request-ID headers.
 * 
 * Security: 10-layer protection
 * Rate Limit: 60 requests/minute per IP (standard tier)
 * Cache: 30s TTL (same as direct Neynar calls)
 * 
 * GET /api/dashboard/activity-feed
 * Response: { data: ActivityCast[], cached_at: string, ttl: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  applySecurityLayers,
  RateLimitTier,
  getCorsHeaders,
  getSecurityHeaders,
  createErrorResponse,
  logApiRequest,
} from '@/lib/api-security'
import { getRequestId } from '@/lib/request-id'
import { getActivityFeed } from '@/lib/api/neynar-dashboard'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const requestId = getRequestId(request)

  try {
    // ============================================================================
    // SECURITY LAYER 1-10: Apply comprehensive protection
    // ============================================================================
    const securityError = await applySecurityLayers(request, {
      rateLimitTier: RateLimitTier.STANDARD, // 60 req/min
      maxRequestSizeKB: 10, // Small GET request
      logRequests: true,
    })

    if (securityError) {
      const errorResponse = NextResponse.json(
        { error: 'Security check failed', requestId },
        {
          status: securityError.status,
          headers: {
            ...securityError.headers,
            'X-Request-ID': requestId,
          },
        }
      )
      return errorResponse
    }

    // ============================================================================
    // BUSINESS LOGIC: Fetch activity feed
    // ============================================================================
    const response = await getActivityFeed()

    const duration = Date.now() - startTime
    console.log(`[Activity Feed API] Completed in ${duration}ms | Request-ID: ${requestId}`)

    // ============================================================================
    // RESPONSE: Return data with security headers + Request-ID
    // ============================================================================
    return NextResponse.json(response, {
      status: 200,
      headers: {
        ...getCorsHeaders(request.headers.get('origin')),
        ...getSecurityHeaders(),
        'X-Request-ID': requestId,
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    console.error('[Activity Feed API] Error:', error)
    logApiRequest({
      method: 'GET',
      path: '/api/dashboard/activity-feed',
      status: 500,
      duration: Date.now() - startTime,
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })

    return createErrorResponse(
      'Internal server error',
      500,
      request.headers.get('origin'),
      requestId
    )
  }
}

// OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...getCorsHeaders(request.headers.get('origin')),
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  })
}
