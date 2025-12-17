import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/middleware/rate-limit'
import { withErrorHandler } from '@/lib/middleware/error-handler'
import { generateRequestId } from '@/lib/middleware/request-id'

/**
 * Badge Analytics Endpoint
 * GET /api/analytics/badges
 * Returns: new badges in last 24h, badge distribution by tier, top 20 users by tier
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const requestId = generateRequestId()
  
  // Apply rate limiting
  const ip = getClientIp(request)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'X-Request-ID': requestId } }
    )
  }

  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database unavailable' },
      { status: 503, headers: { 'X-Request-ID': requestId } }
    )
  }

    // Calculate 24 hours ago timestamp
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // ========================================
    // 1. New badges in last 24 hours
    // ========================================
    const { data: recentBadges, error: recentError } = await supabase
      .from('user_badges')
      .select('id, fid, tier, badge_type, assigned_at')
      .gte('assigned_at', twentyFourHoursAgo)
      .order('assigned_at', { ascending: false })

    if (recentError) {
      console.error('[Badge Analytics] Recent badges error:', recentError)
    }

    const newBadgesCount = recentBadges?.length || 0

    // ========================================
    // 2. Badge distribution (pie chart data)
    // ========================================
    const { data: allBadges, error: distributionError } = await supabase
      .from('user_badges')
      .select('tier')

    if (distributionError) {
      console.error('[Badge Analytics] Distribution error:', distributionError)
    }

    const distribution = {
      mythic: 0,
      legendary: 0,
      epic: 0,
      rare: 0,
      common: 0,
      total: allBadges?.length || 0,
    }

    if (allBadges) {
      allBadges.forEach((badge) => {
        const tier = badge.tier as keyof typeof distribution
        if (tier !== 'total' && tier in distribution) {
          distribution[tier]++
        }
      })
    }

    // Calculate percentages
    const distributionWithPercentages = {
      mythic: {
        count: distribution.mythic,
        percentage: distribution.total > 0 ? (distribution.mythic / distribution.total) * 100 : 0,
      },
      legendary: {
        count: distribution.legendary,
        percentage: distribution.total > 0 ? (distribution.legendary / distribution.total) * 100 : 0,
      },
      epic: {
        count: distribution.epic,
        percentage: distribution.total > 0 ? (distribution.epic / distribution.total) * 100 : 0,
      },
      rare: {
        count: distribution.rare,
        percentage: distribution.total > 0 ? (distribution.rare / distribution.total) * 100 : 0,
      },
      common: {
        count: distribution.common,
        percentage: distribution.total > 0 ? (distribution.common / distribution.total) * 100 : 0,
      },
      total: distribution.total,
    }

    // ========================================
    // 3. Top 20 users by tier (Mythic first)
    // ========================================
    
    // Get users with badge counts per tier
    const { data: userStats, error: userStatsError } = await supabase
      .from('user_badges')
      .select('fid, tier')

    if (userStatsError) {
      console.error('[Badge Analytics] User stats error:', userStatsError)
    }

    // Calculate user badge counts by tier
    const userBadgeMap = new Map<number, {
      fid: number
      mythic: number
      legendary: number
      epic: number
      rare: number
      common: number
      total: number
      highestTier: 'mythic' | 'legendary' | 'epic' | 'rare' | 'common'
    }>()

    const tierRank = { mythic: 5, legendary: 4, epic: 3, rare: 2, common: 1 }

    if (userStats) {
      userStats.forEach((badge) => {
        const fid = badge.fid
        const tier = badge.tier as 'mythic' | 'legendary' | 'epic' | 'rare' | 'common'

        if (!userBadgeMap.has(fid)) {
          userBadgeMap.set(fid, {
            fid,
            mythic: 0,
            legendary: 0,
            epic: 0,
            rare: 0,
            common: 0,
            total: 0,
            highestTier: 'common',
          })
        }

        const userRecord = userBadgeMap.get(fid)!
        userRecord[tier]++
        userRecord.total++

        // Update highest tier
        if (tierRank[tier] > tierRank[userRecord.highestTier]) {
          userRecord.highestTier = tier
        }
      })
    }

    // Sort by highest tier, then by total count
    const topUsers = Array.from(userBadgeMap.values())
      .sort((a, b) => {
        // First sort by highest tier rank
        const tierDiff = tierRank[b.highestTier] - tierRank[a.highestTier]
        if (tierDiff !== 0) return tierDiff
        
        // Then by total badge count
        return b.total - a.total
      })
      .slice(0, 20)

    // Fetch user profiles for top users
    const topFids = topUsers.map((u) => u.fid)
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('fid, username, display_name')
      .in('fid', topFids)

    const profileMap = new Map(profiles?.map((p) => [p.fid, p]) || [])

    const topUsersWithProfiles = topUsers.map((user) => {
      const profile = profileMap.get(user.fid)
      return {
        fid: user.fid,
        username: profile?.username || `user-${user.fid}`,
        displayName: profile?.display_name || profile?.username || `User ${user.fid}`,
        badges: {
          mythic: user.mythic,
          legendary: user.legendary,
          epic: user.epic,
          rare: user.rare,
          common: user.common,
          total: user.total,
        },
        highestTier: user.highestTier,
      }
    })

    // ========================================
    // Response
    // ========================================
    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        analytics: {
          newBadges24h: {
            count: newBadgesCount,
            badges: recentBadges?.slice(0, 10).map((b) => ({
              fid: b.fid,
              tier: b.tier,
              badgeType: b.badge_type,
              assignedAt: b.assigned_at,
            })) || [],
          },
          distribution: distributionWithPercentages,
          topUsers: topUsersWithProfiles,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
          'X-Request-ID': requestId,
        },
      }
    )
})
