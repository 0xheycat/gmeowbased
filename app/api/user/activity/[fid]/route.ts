/**
 * User Activity Timeline API
 * 
 * GET /api/user/activity/:fid
 * Fetch activity feed for a user
 * 
 * Features:
 * - 7 activity types (quest, badge, level, streak, guild, tip, reward)
 * - Fetches from xp_transactions and user_quest_progress
 * - Pagination support
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
import { z } from 'zod'

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

    const { limit, offset } = queryResult.data

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

    // Fetch activity from xp_transactions
    const { data: transactions, error, count } = await supabase
      .from('xp_transactions')
      .select('*', { count: 'exact' })
      .eq('user_fid', fid)
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

    return NextResponse.json(
      {
        success: true,
        activities,
        pagination: {
          total: count || 0,
          limit,
          offset,
          hasMore: (offset + limit) < (count || 0),
        }
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        }
      }
    )

  } catch (error) {
    console.error('Activity API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error.' 
      },
      { status: 500 }
    )
  }
}
