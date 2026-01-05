/**
 * Badge Templates API Route
 * 
 * TRUE HYBRID IMPLEMENTATION
 * ==========================
 * 
 * DATA ARCHITECTURE:
 * - Layer 2 (Supabase): Badge template metadata (definitions)
 * - Layer 3 (Calculated): N/A (no calculations needed for static templates)
 * - Layer 1 (Subsquid): N/A (templates are off-chain metadata, not on-chain events)
 * 
 * NOTE: Badge templates are static metadata that define badge types.
 * For on-chain badge stats (mint counts, supply), see /api/badges/stats route.
 * 
 * INFRASTRUCTURE USED:
 * - lib/cache/server: getCached() for stale-while-revalidate
 * - lib/middleware/rate-limit: apiLimiter for protection
 * - lib/middleware/error-handler: createErrorResponse() for errors
 * - lib/middleware/request-id: Request tracking
 * 
 * RESPONSE CONTRACT:
 * {
 *   ok: boolean,
 *   templates: BadgeTemplate[],
 *   metadata: {
 *     sources: { supabase: true },
 *     cached: boolean,
 *     timestamp: string
 *   }
 * }
 */

import { NextResponse } from 'next/server'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/middleware/rate-limit'
import { listBadgeTemplates } from '@/lib/badges/badges'
import { getCached, buildBadgeTemplatesKey } from '@/lib/cache/server'
import { generateRequestId } from '@/lib/middleware/request-id'
import { createErrorResponse, ErrorType } from '@/lib/middleware/error-handler'

export const runtime = 'nodejs'

/**
 * GET /api/badges/templates
 * 
 * Returns all active badge templates (metadata definitions).
 * Templates define badge types but don't include on-chain stats.
 * 
 * Rate Limit: 100 req/min (apiLimiter)
 * Cache: 300s with stale-while-revalidate
 */
export async function GET(request: Request) {
  const requestId = generateRequestId()
  
  try {
    // Rate limiting
    const ip = getClientIp(request)
    const { success } = await rateLimit(ip, apiLimiter)
    
    if (!success) {
      return createErrorResponse({
        type: ErrorType.RATE_LIMIT,
        message: 'Too many requests. Please try again later.',
        statusCode: 429,
        requestId,
      })
    }

    // Layer 2: Fetch badge templates from Supabase (cached)
    const templates = await getCached(
      'badge-templates',
      buildBadgeTemplatesKey(false),
      () => listBadgeTemplates({ includeInactive: false }),
      { ttl: 300 }
    )
    
    return NextResponse.json(
      {
        ok: true,
        templates,
        metadata: {
          sources: {
            supabase: true, // Template definitions from Supabase
          },
          cached: true,
          timestamp: new Date().toISOString(),
        },
      },
      {
        headers: {
          'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
          'X-Request-ID': requestId,
        },
      }
    )
  } catch (error) {
    console.error('[GET /api/badges/templates]', error)
    return createErrorResponse({
      type: ErrorType.DATABASE,
      message: 'Failed to fetch badge templates',
      statusCode: 500,
      requestId,
      details: error,
    })
  }
}
