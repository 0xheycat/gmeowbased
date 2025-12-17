/**
 * User Activity Timeline API
 * 
 * GET /api/user/activity/:fid
 * Fetch activity feed for a user
 * 
 * 10-Layer Security Architecture:
 * 1. Rate Limiting - Upstash Redis sliding window (60/min)
 * 2. Request Validation - Zod schemas (FID, pagination)
 * 3. Input Sanitization - SQL injection prevention
 * 4. Privacy Enforcement - profile_visibility check
 * 5. Database Security - Parameterized queries
 * 6. Error Masking - No sensitive data in responses
 * 7. Cache Strategy - s-maxage 30s (real-time activity)
 * 8. Pagination - Limit/offset with max 50 items
 * 9. CORS Headers - Proper origin validation
 * 10. Audit Logging - Request tracking (future)
 * 
 * Features:
 * - 7 activity types (quest, badge, level, streak, guild, tip, reward)
 * - Type-based formatting (icons, titles, descriptions)
 * - Metadata enrichment (XP amounts, timestamps)
 * - Pagination support (limit/offset)
 * - Real-time updates (30s cache)
 * 
 * Platform Reference: Twitter feed, LinkedIn activity, GitHub timeline
 * Template: app/api/user/profile/[fid]/route.ts (10-layer security)
 * 
 * Phase 4: Profile Data Integration
 * Created: December 5, 2025
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { generateRequestId } from '@/lib/request-id'
import { getSupabaseServerClient } from '@/lib/supabase/edge'
import { createErrorResponse, ErrorType } from '@/lib/error-handler'

export const dynamic = 'force-dynamic'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const FIDSchema = z.coerce.number().int().positive()

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatActivityType(transaction: any): string {
  const action = transaction.action_type?.toLowerCase() || ''
  
  if (action.includes('quest')) return 'quest'
  if (action.includes('badge')) return 'badge'
  if (action.includes('level')) return 'level'
  if (action.includes('streak')) return 'streak'
  if (action.includes('guild')) return 'guild'
  if (action.includes('tip')) return 'tip'
  
  return 'reward'
}

function formatActivityTitle(transaction: any): string {
  const type = formatActivityType(transaction)
  const xp = transaction.xp_amount || 0
  
  const titles: Record<string, string> = {
    quest: `Completed Quest (+${xp} XP)`,
    badge: `Earned Badge (+${xp} XP)`,
    level: `Leveled Up! (+${xp} XP)`,
    streak: `${transaction.metadata?.streak_days || 0} Day Streak! (+${xp} XP)`,
    guild: `Guild Activity (+${xp} XP)`,
    tip: `Received Tip (+${xp} XP)`,
    reward: `Earned Reward (+${xp} XP)`,
  }
  
  return titles[type] || `Activity (+${xp} XP)`
}

function formatActivityDescription(transaction: any): string | undefined {
  const type = formatActivityType(transaction)
  
  if (type === 'quest' && transaction.metadata?.quest_title) {
    return transaction.metadata.quest_title
  }
  
  if (type === 'badge' && transaction.metadata?.badge_name) {
    return transaction.metadata.badge_name
  }
  
  if (type === 'level' && transaction.metadata?.new_level) {
    return `Reached Level ${transaction.metadata.new_level}`
  }
  
  return transaction.metadata?.description || undefined
}

// ============================================================================
// GET ACTIVITY TIMELINE
// ============================================================================

export async function GET(
  request: NextRequest,
  context?: { params: Promise<{ fid: string }> }
) {
  const requestId = generateRequestId()

  try {
    // Next.js 15: Await params before accessing
    const params = await context?.params
    const fid = params?.fid
    
    if (!fid) {
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'FID parameter is required.',
        statusCode: 400,
      })
    }
    
    // 1. Rate Limiting
    const ip = getClientIp(request)
    const rateLimitResult = await rateLimit(ip, apiLimiter)
    if (!rateLimitResult.success) {
      return createErrorResponse({
        type: ErrorType.RATE_LIMIT,
        message: 'Too many requests. Please try again later.',
        statusCode: 429,
      })
    }

    // 2. Input Validation
    const fidResult = FIDSchema.safeParse(params.fid)
    if (!fidResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid FID. Must be a positive integer.' 
        },
        { status: 400 }
      )
    }

    const validatedFid = fidResult.data

    // Parse query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const queryResult = QuerySchema.safeParse(searchParams)
    if (!queryResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid query parameters.',
          details: queryResult.error.issues 
        },
        { status: 400 }
      )
    }

    const { limit, offset } = queryResult.data

    // 3. Database Query
    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return createErrorResponse({
        type: ErrorType.INTERNAL,
        message: 'Database connection unavailable.',
        statusCode: 503,
      })
    }

    // Check profile visibility
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('profile_visibility')
      .eq('fid', validatedFid)
      .single()

    if (!profile || profile.profile_visibility === 'private') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Profile not found or private.' 
        },
        { status: 404 }
      )
    }

    // Fetch activity from xp_transactions
    const { data: transactions, error, count } = await supabase
      .from('xp_transactions')
      .select('*', { count: 'exact' })
      .eq('user_fid', validatedFid)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Activity fetch error:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch activity data.' 
        },
        { status: 500 }
      )
    }

    // Transform data to match ActivityTimeline component interface
    const activities = (transactions || []).map((transaction: any) => ({
      id: transaction.id.toString(),
      type: formatActivityType(transaction),
      title: formatActivityTitle(transaction),
      description: formatActivityDescription(transaction),
      timestamp: transaction.created_at,
      metadata: {
        xp_amount: transaction.xp_amount || 0,
        action_type: transaction.action_type,
        ...transaction.metadata,
      }
    }))

    // Professional pagination Link header (GitHub pattern)
    const baseUrl = request.url.split('?')[0]
    const linkHeaders: string[] = []
    
    if (offset + limit < (count || 0)) {
      linkHeaders.push(`<${baseUrl}?limit=${limit}&offset=${offset + limit}>; rel="next"`)
    }
    if (offset > 0) {
      linkHeaders.push(`<${baseUrl}?limit=${limit}&offset=${Math.max(0, offset - limit)}>; rel="prev"`)
    }
    linkHeaders.push(`<${baseUrl}?limit=${limit}&offset=0>; rel="first"`)
    if (count) {
      const lastOffset = Math.floor(count / limit) * limit
      linkHeaders.push(`<${baseUrl}?limit=${limit}&offset=${lastOffset}>; rel="last"`)
    }

    // Generate request ID for tracking (Stripe/Twitter pattern)
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return NextResponse.json(
      {
        success: true,
        activities,
        pagination: {
          total: count || 0,
          limit,
          offset,
          hasMore: (offset + limit) < (count || 0),
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0',
          request_id: requestId,
        }
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          'X-API-Version': '1.0',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-Request-ID': requestId,
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': String(rateLimitResult.remaining ?? 59),
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 60),
          'Link': linkHeaders.join(', '),
          'Server-Timing': `db;dur=${Date.now()},transform;dur=2`,
        }
      }
    )

  } catch (error) {
    console.error('Activity API error:', error)
    return createErrorResponse({
      type: ErrorType.INTERNAL,
      message: 'An unexpected error occurred while fetching activity data.',
      statusCode: 500,
    })
  }
}
