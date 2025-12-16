/**
 * Dashboard - Trending Tokens API
 * 
 * Fetches trending fungible tokens on Base network (24h window)
 * with 10-layer security protection + Request-ID headers.
 * 
 * Security: 10-layer protection
 * Rate Limit: 60 requests/minute per IP (standard tier)
 * Cache: 30s TTL (same as direct Neynar calls)
 * 
 * GET /api/dashboard/trending-tokens
 * Response: { data: TrendingToken[], cached_at: string, ttl: number }
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
import { getTrendingTokens } from '@/lib/api/neynar-dashboard'
import { generateRequestId } from '@/lib/request-id'

export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  const startTime = Date.now()

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
      // Add Request-ID to error responses
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
    // BUSINESS LOGIC: Fetch trending tokens
    // ============================================================================
    const response = await getTrendingTokens()

    const duration = Date.now() - startTime
    console.log(`[Trending Tokens API] Completed in ${duration}ms | Request-ID: ${requestId}`)

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
    console.error('[Trending Tokens API] Error:', error)
    logApiRequest(request, {
      status: 500,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    })

    return createErrorResponse(
      'Internal server error',
      500
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
