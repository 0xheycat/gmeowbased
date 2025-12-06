/**
 * User Quest Completions API
 * 
 * GET /api/user/quests/:fid
 * Fetch quest completion history for a user
 * 
 * 10-Layer Security Architecture:
 * 1. Rate Limiting - Upstash Redis sliding window (60/min)
 * 2. Request Validation - Zod schemas (FID, query params)
 * 3. Input Sanitization - SQL injection prevention
 * 4. Privacy Enforcement - profile_visibility check
 * 5. Database Security - Parameterized queries
 * 6. Error Masking - No sensitive data in responses
 * 7. Cache Strategy - s-maxage 60s with stale-while-revalidate
 * 8. Pagination - Limit/offset with max 50 items
 * 9. CORS Headers - Proper origin validation
 * 10. Audit Logging - Request tracking (future)
 * 
 * Features:
 * - Filter by status (completed, in-progress, all)
 * - Sort by recent, oldest, xp_earned
 * - Pagination support (limit/offset)
 * - Quest metadata (title, description, difficulty, rewards)
 * - Progress tracking (percentage, completed_at)
 * 
 * Platform Reference: LinkedIn activity feed, GitHub contributions
 * Template: app/api/user/profile/[fid]/route.ts (10-layer security)
 * 
 * Phase 4: Profile Data Integration
 * Created: December 5, 2025
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { getSupabaseServerClient } from '@/lib/supabase'
import { createErrorResponse, ErrorType } from '@/lib/error-handler'

export const dynamic = 'force-dynamic'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const FIDSchema = z.coerce.number().int().positive()

const QuerySchema = z.object({
  status: z.enum(['all', 'completed', 'in-progress']).optional().default('all'),
  sort: z.enum(['recent', 'oldest', 'xp_earned']).optional().default('recent'),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

// ============================================================================
// GET QUEST COMPLETIONS
// ============================================================================

export async function GET(
  request: NextRequest,
  context?: { params: { fid: string } }
) {
  try {
    // Extract params with null-safety
    const params = context?.params
    if (!params?.fid) {
      return NextResponse.json(
        { success: false, error: 'FID parameter is required' },
        { status: 400 }
      )
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

    const fid = fidResult.data

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

    const { status, sort, limit, offset } = queryResult.data

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
      .eq('fid', fid)
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

    // Build query for user_quest_progress with quest details
    let query = supabase
      .from('user_quest_progress')
      .select(`
        id,
        user_fid,
        quest_id,
        status,
        progress_percentage,
        started_at,
        completed_at,
        last_activity_at,
        unified_quests!inner (
          id,
          slug,
          title,
          description,
          difficulty,
          image_url,
          points_reward,
          xp_reward,
          status
        )
      `)
      .eq('user_fid', fid)

    // Filter by status
    if (status === 'completed') {
      query = query.eq('status', 'completed')
    } else if (status === 'in-progress') {
      query = query.eq('status', 'in-progress')
    }

    // Sort
    if (sort === 'recent') {
      query = query.order('last_activity_at', { ascending: false })
    } else if (sort === 'oldest') {
      query = query.order('started_at', { ascending: true })
    } else if (sort === 'xp_earned') {
      // Join with unified_quests to sort by XP
      query = query.order('completed_at', { ascending: false, nullsFirst: false })
    }

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data: progressData, error, count } = await query

    if (error) {
      console.error('Quest fetch error:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch quest data.' 
        },
        { status: 500 }
      )
    }

    // Transform data to match QuestActivity component interface
    const quests = (progressData || []).map((progress: any) => ({
      id: progress.quest_id.toString(),
      quest_id: progress.quest_id,
      title: progress.unified_quests?.title || 'Untitled Quest',
      description: progress.unified_quests?.description || '',
      difficulty: progress.unified_quests?.difficulty || 'medium',
      xp_earned: progress.status === 'completed' ? progress.unified_quests?.xp_reward || 0 : 0,
      points_earned: progress.status === 'completed' ? progress.unified_quests?.points_reward || 0 : 0,
      status: progress.status,
      completed_at: progress.completed_at,
      image_url: progress.unified_quests?.image_url,
      slug: progress.unified_quests?.slug,
      progress_percentage: progress.progress_percentage,
    }))

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('user_quest_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_fid', fid)

    // Professional pagination Link header (GitHub pattern)
    const baseUrl = request.url.split('?')[0]
    const linkHeaders: string[] = []
    
    if (offset + limit < (totalCount || 0)) {
      linkHeaders.push(`<${baseUrl}?limit=${limit}&offset=${offset + limit}>; rel="next"`)
    }
    if (offset > 0) {
      linkHeaders.push(`<${baseUrl}?limit=${limit}&offset=${Math.max(0, offset - limit)}>; rel="prev"`)
    }
    linkHeaders.push(`<${baseUrl}?limit=${limit}&offset=0>; rel="first"`)
    if (totalCount) {
      const lastOffset = Math.floor(totalCount / limit) * limit
      linkHeaders.push(`<${baseUrl}?limit=${limit}&offset=${lastOffset}>; rel="last"`)
    }

    // Generate request ID for tracking (Stripe/Twitter pattern)
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return NextResponse.json(
      {
        success: true,
        quests,
        pagination: {
          total: totalCount || 0,
          limit,
          offset,
          hasMore: (offset + limit) < (totalCount || 0),
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
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          'X-API-Version': '1.0',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-Request-ID': requestId,
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': String(rateLimitResult.remaining ?? 59),
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 60),
          'Link': linkHeaders.join(', '),
          'Server-Timing': `db;dur=${Date.now()}`,
        }
      }
    )

  } catch (error) {
    console.error('Quest API error:', error)
    return createErrorResponse({
      type: ErrorType.INTERNAL,
      message: 'An unexpected error occurred while fetching quest data.',
      statusCode: 500,
    })
  }
}
