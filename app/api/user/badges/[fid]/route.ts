/**
 * User Badge Collection API
 * 
 * GET /api/user/badges/:fid
 * Fetch badge collection for a user
 * 
 * Features:
 * - Filter by tier (all, mythic, legendary, epic, rare, common)
 * - Show earned and locked badges
 * - Badge metadata from BADGE_REGISTRY
 * - Privacy check (profile visibility)
 * 
 * Security:
 * - Rate limiting (60/min)
 * - Input validation
 * - Privacy enforcement
 * 
 * Phase 4: Profile Data Integration
 * Template: app/api/user/profile/[fid]/route.ts (10-layer security pattern)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiLimiter } from '@/lib/api/utils/rate-limiting'
import { BADGE_REGISTRY } from '@/lib/badges/badge-registry'
import { z } from 'zod'

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
  { params }: { params: { fid: string } }
) {
  try {
    // 1. Rate Limiting
    const rateLimitResult = await apiLimiter.check(request)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many requests. Please try again later.' 
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
          }
        }
      )
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
          details: queryResult.error.errors 
        },
        { status: 400 }
      )
    }

    const { tier } = queryResult.data

    // 3. Database Query
    const supabase = await createClient()

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
    const earnedBadgeIds = new Set((earnedBadges || []).map(b => b.badge_id))
    const earnedBadgeMap = new Map((earnedBadges || []).map(b => [b.badge_id, b.earned_at]))

    // Combine with BADGE_REGISTRY to get all badges with earned status
    const allBadges = Object.entries(BADGE_REGISTRY).map(([badgeId, badgeData]) => {
      const earned = earnedBadgeIds.has(badgeId)
      return {
        id: badgeId,
        badge_id: badgeId,
        name: badgeData.name,
        description: badgeData.description,
        tier: badgeData.tier,
        image_url: badgeData.image_url,
        earned,
        earned_at: earned ? earnedBadgeMap.get(badgeId) : null,
        locked: !earned,
        requirements: badgeData.requirements || null,
        points_bonus: badgeData.points_bonus || 0,
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

    return NextResponse.json(
      {
        success: true,
        badges: filteredBadges,
        stats,
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240',
        }
      }
    )

  } catch (error) {
    console.error('Badge API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error.' 
      },
      { status: 500 }
    )
  }
}
