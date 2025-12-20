/**
 * User Badge Collection API
 * 
 * GET /api/user/badges/:fid
 * Fetch badge collection for a user using Subsquid + Supabase
 * Uses lib/ infrastructure for caching, rate limiting, and error handling
 * 
 * Features:
 * - Tier filtering (all, mythic, legendary, epic, rare, common)
 * - Earned vs locked badges
 * - Badge metadata (name, description, image, requirements)
 * - Statistics (total, earned count, completion %, by-tier counts)
 * - Points bonus tracking
 * 
 * Phase 2 Day 2: User Stats API Migration
 * Created: December 19, 2025
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/middleware/rate-limit'
import { getCached } from '@/lib/cache/server'
import { createClient } from '@/lib/supabase/edge'
import { BADGE_REGISTRY } from '@/lib/badges/badge-registry-data'
import { createErrorResponse, ErrorType } from '@/lib/middleware/error-handler'
import { FIDSchema } from '@/lib/validation/api-schemas'

export const dynamic = 'force-dynamic'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

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
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'FID parameter is required',
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
    const fidResult = FIDSchema.safeParse(parseInt(params.fid))
    if (!fidResult.success) {
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'Invalid FID. Must be a positive integer.',
        statusCode: 400,
      })
    }

    const fid = fidResult.data

    // Parse query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const queryResult = QuerySchema.safeParse(searchParams)
    if (!queryResult.success) {
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'Invalid query parameters.',
        details: queryResult.error.issues,
        statusCode: 400,
      })
    }

    const { tier } = queryResult.data

    // 3. Get cached badge data
    const result = await getCached(
      'user-badges',                // namespace
      `${fid}:${tier}`,             // key
      async () => {                 // fetcher
        const supabase = createClient()

        // Fetch user's earned badges
        const { data: earnedBadges, error } = await supabase
          .from('user_badges')
          .select('badge_id, assigned_at')
          .eq('fid', fid)

        if (error) {
          console.error('Badge fetch error:', error)
          throw new Error('Failed to fetch badge data')
        }

        // Create a set of earned badge IDs for quick lookup
        const earnedBadgeIds = new Set((earnedBadges || []).map((b: any) => b.badge_id))
        const earnedBadgeMap = new Map((earnedBadges || []).map((b: any) => [b.badge_id, b.assigned_at] as const))

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

        return {
          badges: filteredBadges,
          stats
        }
      },
      { ttl: 120 }                  // 2 minutes cache (badges change less frequently)
    )

    // 4. Return with cache headers
    return NextResponse.json(
      {
        success: true,
        ...result,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0',
          registry_version: '2025-12-05',
        }
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240',
        }
      }
    )

  } catch (error) {
    return createErrorResponse({
      type: ErrorType.INTERNAL,
      message: 'An unexpected error occurred while fetching badge data.',
      statusCode: 500,
    })
  }
}
