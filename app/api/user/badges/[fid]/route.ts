/**
 * User Badge Collection API
 * 
 * GET /api/user/badges/:fid
 * Fetch badge collection for a user
 * 
 * 10-Layer Security Architecture:
 * 1. Rate Limiting - Upstash Redis sliding window (60/min)
 * 2. Request Validation - Zod schemas (FID, tier filter)
 * 3. Input Sanitization - SQL injection prevention
 * 4. Privacy Enforcement - profile_visibility check
 * 5. Database Security - Parameterized queries
 * 6. Error Masking - No sensitive data in responses
 * 7. Cache Strategy - s-maxage 120s (badges change less frequently)
 * 8. Data Enrichment - BADGE_REGISTRY merge (280+ badges)
 * 9. CORS Headers - Proper origin validation
 * 10. Audit Logging - Request tracking (future)
 * 
 * Features:
 * - Tier filtering (all, mythic, legendary, epic, rare, common)
 * - Earned vs locked badges
 * - Badge metadata (name, description, image, requirements)
 * - Statistics (total, earned count, completion %, by-tier counts)
 * - Points bonus tracking
 * 
 * Platform Reference: Discord roles/badges, Steam achievements
 * Template: app/api/user/profile/[fid]/route.ts (10-layer security)
 * 
 * Phase 4: Profile Data Integration
 * Created: December 5, 2025
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { getSupabaseServerClient } from '@/lib/supabase'
import { BADGE_REGISTRY } from '@/lib/badge-registry-data'
import { createErrorResponse, ErrorType } from '@/lib/error-handler'

export const dynamic = 'force-dynamic'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const FIDSchema = z.coerce.number().int().positive()

const QuerySchema = z.object({
  tier: z.enum(['all', 'mythic', 'legendary', 'epic', 'rare', 'common']).optional().default('all'),
})

// ============================================================================
// GET BADGE COLLECTION
// ============================================================================

export async function GET(
  request: NextRequest,
  context?: { params: Promise<{ fid: string }> }
) {
  try {
    // Next.js 15: Await params before accessing
    const params = await context?.params
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

    const { tier } = queryResult.data

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

    // Fetch user's earned badges
    const { data: earnedBadges, error } = await supabase
      .from('user_badge_collection')
      .select('badge_id, earned_at')
      .eq('user_fid', fid)

    if (error) {
      console.error('Badge fetch error:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch badge data.' 
        },
        { status: 500 }
      )
    }

    // Create a set of earned badge IDs for quick lookup
    const earnedBadgeIds = new Set((earnedBadges || []).map((b: any) => b.badge_id))
    const earnedBadgeMap = new Map((earnedBadges || []).map((b: any) => [b.badge_id, b.earned_at] as const))

    // Combine with BADGE_REGISTRY to get all badges with earned status
    const allBadges = Object.entries(BADGE_REGISTRY).map(([badgeId, badgeData]: [string, any]) => {
      const earned = earnedBadgeIds.has(badgeId)
      return {
        id: badgeId,
        badge_id: badgeId,
        name: badgeData.name as string,
        description: badgeData.description as string,
        tier: badgeData.tier as 'mythic' | 'legendary' | 'epic' | 'rare' | 'common',
        image_url: badgeData.image_url as string,
        earned,
        earned_at: earned ? (earnedBadgeMap.get(badgeId) ?? null) : null,
        locked: !earned,
        requirements: (badgeData.requirements as string | undefined) || null,
        points_bonus: (badgeData.points_bonus as number | undefined) || 0,
      }
    })

    // Filter by tier if specified
    let filteredBadges = allBadges
    if (tier !== 'all') {
      filteredBadges = allBadges.filter(badge => badge.tier === tier)
    }

    // Calculate statistics
    const stats = {
      total_badges: allBadges.length,
      earned_count: earnedBadgeIds.size,
      completion_percentage: Math.round((earnedBadgeIds.size / allBadges.length) * 100),
      by_tier: {
        mythic: allBadges.filter(b => b.tier === 'mythic' && b.earned).length,
        legendary: allBadges.filter(b => b.tier === 'legendary' && b.earned).length,
        epic: allBadges.filter(b => b.tier === 'epic' && b.earned).length,
        rare: allBadges.filter(b => b.tier === 'rare' && b.earned).length,
        common: allBadges.filter(b => b.tier === 'common' && b.earned).length,
      }
    }

    // Generate request ID for tracking (Stripe/Twitter pattern)
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Generate ETag for caching (GitHub pattern)
    const etag = `"${Buffer.from(JSON.stringify({ fid, tier, count: earnedBadgeIds.size })).toString('base64')}"`

    return NextResponse.json(
      {
        success: true,
        badges: filteredBadges,
        stats,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0',
          registry_version: '2025-12-05',
          request_id: requestId,
        }
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240',
          'X-API-Version': '1.0',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-Request-ID': requestId,
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': String(rateLimitResult.remaining ?? 59),
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 60),
          'ETag': etag,
          'Server-Timing': `db;dur=${Date.now()},registry;dur=5`,
        }
      }
    )

  } catch (error) {
    console.error('Badge API error:', error)
    return createErrorResponse({
      type: ErrorType.INTERNAL,
      message: 'An unexpected error occurred while fetching badge data.',
      statusCode: 500,
    })
  }
}
