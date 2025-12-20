/**
 * User Activity Timeline API
 * 
 * GET /api/user/activity/:fid
 * Fetch activity feed for a user using Subsquid
 * Uses lib/ infrastructure for caching, rate limiting, and error handling
 * 
 * Features:
 * - 7 activity types (quest, badge, level, streak, guild, tip, reward)
 * - Type-based formatting (icons, titles, descriptions)
 * - Metadata enrichment (XP amounts, timestamps)
 * - Pagination support (limit/offset)
 * - Real-time updates (30s cache)
 * 
 * Phase 2 Day 2: User Stats API Migration
 * Created: December 19, 2025
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/middleware/rate-limit'
import { getCached } from '@/lib/cache/server'
import { getSubsquidClient } from '@/lib/subsquid-client'
import { createErrorResponse, ErrorType } from '@/lib/middleware/error-handler'
import { FIDSchema } from '@/lib/validation/api-schemas'

export const dynamic = 'force-dynamic'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

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
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'Invalid FID. Must be a positive integer.',
        statusCode: 400,
      })
    }

    const validatedFid = fidResult.data

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

    const { limit, offset } = queryResult.data

    // 3. Get cached activity data
    const result = await getCached(
      'user-activity',              // namespace
      `${validatedFid}:${limit}:${offset}`, // key
      async () => {                 // fetcher
        const client = getSubsquidClient()
        
        // Get XP transactions from Subsquid (last 6 months)
        const sinceDate = new Date()
        sinceDate.setMonth(sinceDate.getMonth() - 6)
        
        const allTransactions = await client.getXPTransactions(validatedFid, sinceDate)
        
        // Apply pagination
        const transactions = allTransactions.slice(offset, offset + limit)
        const count = allTransactions.length

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

        return {
          activities,
          pagination: {
            total: count || 0,
            limit,
            offset,
            hasMore: (offset + limit) < (count || 0),
          }
        }
      },
      { ttl: 30 }                   // 30 seconds cache (real-time activity)
    )

    // 4. Return with cache headers
    return NextResponse.json(
      {
        success: true,
        ...result,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0',
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
    return createErrorResponse({
      type: ErrorType.INTERNAL,
      message: 'An unexpected error occurred while fetching activity data.',
      statusCode: 500,
    })
  }
}
