/**
 * Badge Metrics API Route
 * 
 * GET /api/viral/badge-metrics?fid={fid}&sortBy={sortBy}&limit={limit}
 * 
 * Returns per-badge viral performance metrics for a user.
 * Groups badge_casts by badge_id with engagement aggregations.
 * 
 * Quality Gates Applied:
 * - GI-7: MCP Spec Sync (Supabase schema verified)
 * - GI-11: Security (null checks, input validation, RLS compliance)
 * - GI-13: UI/UX (clear error messages, empty states)
 * 
 * @author GMEOW Assistant Agent
 * @date November 16, 2025
 * @phase Phase 5.10
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { withErrorHandler } from '@/lib/error-handler'

type BadgeMetric = {
  badgeId: string
  badgeName: string
  badgeImage?: string
  castCount: number
  totalViralXp: number
  averageXp: number
  topTier: string
  engagementBreakdown: {
    likes: number
    recasts: number
    replies: number
  }
  lastCastAt: string
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
    
    // GI-11: Input validation with defaults
    const fidParam = searchParams.get('fid')
    const sortBy = (searchParams.get('sortBy') || 'xp') as 'xp' | 'casts' | 'engagement'
    const limitParam = searchParams.get('limit') || '10'
    const limit = Math.min(Math.max(1, parseInt(limitParam, 10) || 10), 50) // Max 50
    
    // GI-11: Validate required parameters
    if (!fidParam) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Missing required parameter: fid' },
        { status: 400 }
      )
    }
    
    const fid = parseInt(fidParam, 10)
    
    if (isNaN(fid) || fid <= 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid fid parameter (must be positive integer)' },
        { status: 400 }
      )
    }
    
    // GI-11: Safe database connection
    const supabase = getSupabaseServerClient()
    
    if (!supabase) {
      console.error('[Badge Metrics] Database connection failed')
      return NextResponse.json(
        { error: 'Internal Error', message: 'Database connection failed' },
        { status: 500 }
      )
    }
    
    // GI-11: Query badge_casts with aggregations
    // Note: badge_casts.badge_id is TEXT (not UUID reference to user_badges)
    const { data: casts, error } = await supabase
      .from('badge_casts')
      .select('badge_id, fid, cast_hash, tier, likes_count, recasts_count, replies_count, viral_bonus_xp, created_at')
      .eq('fid', fid)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('[Badge Metrics] Database query error:', error)
      return NextResponse.json(
        { error: 'Internal Error', message: 'Failed to fetch badge metrics' },
        { status: 500 }
      )
    }
    
    // GI-13: Empty state handling
    if (!casts || casts.length === 0) {
      return NextResponse.json({
        badges: [],
        totalBadges: 0,
        totalCasts: 0,
        totalXp: 0,
        fid,
        message: 'No badges shared yet. Share your first badge to start tracking performance!',
      })
    }
    
    // Aggregate metrics by badge_id
    const badgeMap = new Map<string, {
      badgeId: string
      castCount: number
      totalViralXp: number
      totalLikes: number
      totalRecasts: number
      totalReplies: number
      topTier: string
      lastCastAt: string
    }>()
    
    for (const cast of casts) {
      const existing = badgeMap.get(cast.badge_id)
      
      if (!existing) {
        badgeMap.set(cast.badge_id, {
          badgeId: cast.badge_id,
          castCount: 1,
          totalViralXp: cast.viral_bonus_xp || 0,
          totalLikes: cast.likes_count || 0,
          totalRecasts: cast.recasts_count || 0,
          totalReplies: cast.replies_count || 0,
          topTier: cast.tier,
          lastCastAt: cast.created_at,
        })
      } else {
        existing.castCount += 1
        existing.totalViralXp += cast.viral_bonus_xp || 0
        existing.totalLikes += cast.likes_count || 0
        existing.totalRecasts += cast.recasts_count || 0
        existing.totalReplies += cast.replies_count || 0
        
        // Update lastCastAt if this cast is newer (should already be sorted, but safety check)
        if (new Date(cast.created_at) > new Date(existing.lastCastAt)) {
          existing.lastCastAt = cast.created_at
        }
      }
    }
    
    // Convert map to array with formatted data
    let badges: BadgeMetric[] = Array.from(badgeMap.values()).map(badge => ({
      badgeId: badge.badgeId,
      badgeName: formatBadgeName(badge.badgeId),
      badgeImage: undefined, // TODO: Query user_badges table for image URL
      castCount: badge.castCount,
      totalViralXp: badge.totalViralXp,
      averageXp: badge.castCount > 0 ? badge.totalViralXp / badge.castCount : 0,
      topTier: badge.topTier,
      engagementBreakdown: {
        likes: badge.totalLikes,
        recasts: badge.totalRecasts,
        replies: badge.totalReplies,
      },
      lastCastAt: badge.lastCastAt,
    }))
    
    // Sort badges based on sortBy parameter
    badges.sort((a, b) => {
      switch (sortBy) {
        case 'xp':
          return b.totalViralXp - a.totalViralXp
        case 'casts':
          return b.castCount - a.castCount
        case 'engagement': {
          const aTotal = a.engagementBreakdown.likes + a.engagementBreakdown.recasts + a.engagementBreakdown.replies
          const bTotal = b.engagementBreakdown.likes + b.engagementBreakdown.recasts + b.engagementBreakdown.replies
          return bTotal - aTotal
        }
        default:
          return b.totalViralXp - a.totalViralXp
      }
    })
    
    // Limit results
    badges = badges.slice(0, limit)
    
    // Calculate totals
    const totalBadges = badgeMap.size
    const totalCasts = casts.length
    const totalXp = Array.from(badgeMap.values()).reduce((sum, b) => sum + b.totalViralXp, 0)
    
    return NextResponse.json({
      badges,
      totalBadges,
      totalCasts,
      totalXp,
      fid,
    })
})

/**
 * Format badge ID into human-readable name
 * 
 * Examples:
 * - "og-builder" -> "OG Builder"
 * - "early-adopter" -> "Early Adopter"
 * - "gm-streak-7" -> "GM Streak 7"
 * 
 * GI-13: User-friendly badge names
 */
function formatBadgeName(badgeId: string): string {
  return badgeId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
