/**
 * Admin API: Viral Achievement Statistics
 * 
 * GET /api/admin/viral/achievement-stats
 * 
 * Returns achievement distribution and timeline data showing how many users
 * have unlocked each achievement type. Admin-only access required.
 * 
 * Source: Phase 5.2 Admin Dashboard
 * MCP Verified: November 17, 2025
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp, strictLimiter } from '@/lib/rate-limit'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { validateAdminRequest } from '@/lib/admin-auth'
import { withErrorHandler } from '@/lib/error-handler'
import { AdminQuerySchema } from '@/lib/validation/api-schemas'

type AchievementStat = {
  type: string
  count: number
  percentage: number
}

type AchievementTimeline = {
  date: string
  first_viral: number
  '10_viral_casts': number
  '100_shares': number
  mega_viral_master: number
}

export const GET = withErrorHandler(async (req: NextRequest) => {
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, strictLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  // Validate query parameters
  const { searchParams } = new URL(req.url)
  const queryValidation = AdminQuerySchema.safeParse({
    timeframe: searchParams.get('timeframe') || undefined,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
  })
  
  if (!queryValidation.success) {
    return NextResponse.json(
      { error: 'validation_error', issues: queryValidation.error.issues },
      { status: 400 }
    )
  }

  // 1. Admin auth check
  const auth = await validateAdminRequest(req)
  if (!auth.ok && auth.reason !== 'admin_security_disabled') {
    return NextResponse.json(
      { ok: false, error: 'admin_auth_required', reason: auth.reason },
      { status: 401 }
    )
  }

    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: 'supabase_not_configured' },
        { status: 500 }
      )
    }

    // 2. Get total users with achievements
    const { count: totalUsersWithAchievements, error: countError } = await supabase
      .from('viral_milestone_achievements')
      .select('fid', { count: 'exact', head: true })

    if (countError) {
      console.error('[achievement-stats] Count error:', countError)
      return NextResponse.json(
        { ok: false, error: 'database_error', message: countError.message },
        { status: 500 }
      )
    }

    // 3. Get achievement timeline (last 7 days)
    const { data: timelineData, error: timelineError } = await supabase
      .from('viral_milestone_achievements')
      .select('achievement_type, achieved_at')

    if (timelineError) {
      console.error('[achievement-stats] Query error:', timelineError)
      return NextResponse.json(
        { ok: false, error: 'database_error', message: timelineError.message },
        { status: 500 }
      )
    }

    // 4. Calculate distribution stats
    const achievementCounts = new Map<string, number>()
    const weeklyTimeline = new Map<
      string,
      {
        first_viral: number
        '10_viral_casts': number
        '100_shares': number
        mega_viral_master: number
      }
    >()

    for (const achievement of timelineData ?? []) {
      // Count by type
      const currentCount = achievementCounts.get(achievement.achievement_type) ?? 0
      achievementCounts.set(achievement.achievement_type, currentCount + 1)

      // Weekly timeline (ISO week start - Monday)
      const date = new Date(achievement.achieved_at)
      const weekStart = getWeekStart(date)
      const weekKey = weekStart.toISOString().split('T')[0]

      if (!weeklyTimeline.has(weekKey)) {
        weeklyTimeline.set(weekKey, {
          first_viral: 0,
          '10_viral_casts': 0,
          '100_shares': 0,
          mega_viral_master: 0,
        })
      }

      const weekStats = weeklyTimeline.get(weekKey)!
      const type = achievement.achievement_type as keyof typeof weekStats
      
      if (type in weekStats) {
        weekStats[type]++
      }
    }

    // 5. Calculate percentages (percentage of total users)
    const achievementStats: AchievementStat[] = Array.from(achievementCounts.entries()).map(
      ([type, count]) => ({
        type,
        count,
        percentage:
          totalUsersWithAchievements && totalUsersWithAchievements > 0
            ? Math.round((count / totalUsersWithAchievements) * 100 * 10) / 10
            : 0,
      })
    )

    // Sort by count (most common first)
    achievementStats.sort((a, b) => b.count - a.count)

    // 6. Convert timeline map to sorted array
    const timeline: AchievementTimeline[] = Array.from(weeklyTimeline.entries())
      .sort((a, b) => b[0].localeCompare(a[0])) // Most recent first
      .map(([date, stats]) => ({
        date,
        ...stats,
      }))

  // 7. Return statistics
  return NextResponse.json({
    ok: true,
    achievements: achievementStats,
    total_users_with_achievements: totalUsersWithAchievements ?? 0,
    timeline,
  })
})

/**
 * Get the Monday of the week for a given date
 */
function getWeekStart(date: Date): Date {
  const dayOfWeek = date.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Sunday is 0, Monday is 1
  const weekStart = new Date(date)
  weekStart.setDate(date.getDate() + diff)
  weekStart.setHours(0, 0, 0, 0)
  return weekStart
}
