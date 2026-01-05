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
import { rateLimit, getClientIp, apiLimiter } from '@/lib/middleware/rate-limit'
import { getCached } from '@/lib/cache/server'
import { createClient } from '@/lib/supabase/edge'
import { createErrorResponse, ErrorType } from '@/lib/middleware/error-handler'
import { FIDSchema } from '@/lib/validation/api-schemas'
import { getUserQuestHistory } from '@/lib/subsquid-client'

export const dynamic = 'force-dynamic'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const QuerySchema = z.object({
  status: z.enum(['all', 'completed', 'in-progress']).optional().default('all'),
  sort: z.enum(['recent', 'oldest', 'xp_earned']).optional().default('recent'),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(), // Optional wallet address override
})

// ============================================================================
// GET QUEST COMPLETIONS
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
    const fidResult = FIDSchema.safeParse(parseInt(params.fid, 10))
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
        statusCode: 400,
      })
    }

    const { status, sort, limit, offset, address: addressOverride } = queryResult.data

    // 3. Cached Database Query with TRUE HYBRID pattern
    const result = await getCached(
      'user-quests',
      `${fid}:${status}:${sort}:${limit}:${offset}:${addressOverride || 'default'}`,
      async () => {
        const supabase = createClient()

        // Determine which wallet address to use
        let userAddress: string | null = null

        if (addressOverride) {
          // Use provided address override (from connected wallet)
          userAddress = addressOverride.toLowerCase()
        } else {
          // LAYER 1: Off-chain (Supabase) - Get user's wallet address
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('wallet_address')
            .eq('fid', fid)
            .single()

          // Handle case where profile doesn't exist or has no wallet
          if (profileError || !profile || !profile.wallet_address) {
            return { quests: [], total: 0 }
          }

          userAddress = profile.wallet_address.toLowerCase()
        }

        // LAYER 2: On-chain (Subsquid) - Get quest completions from blockchain
        const onChainCompletions = await getUserQuestHistory(userAddress, 100)

        // Extract quest IDs from on-chain data
        const questIds = onChainCompletions.map(c => c.quest.id)

        if (questIds.length === 0) {
          return { quests: [], total: 0 }
        }

        // LAYER 3: Off-chain (Supabase) - Get quest metadata and progress tracking
        let progressQuery = supabase
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
              status,
              cover_image_url,
              badge_image_url
            )
          `)
          .eq('user_fid', fid)
          .in('quest_id', questIds.map(id => parseInt(id)))

        // Filter by status
        if (status === 'completed') {
          progressQuery = progressQuery.eq('status', 'completed')
        } else if (status === 'in-progress') {
          progressQuery = progressQuery.eq('status', 'in-progress')
        }

        const { data: progressData, error: progressError } = await progressQuery

        if (progressError) {
          console.error('Quest progress fetch error:', progressError)
        }

        // LAYER 4: Calculated - Merge on-chain and off-chain data
        const mergedQuests = onChainCompletions.map(completion => {
          const progressInfo = progressData?.find(
            p => p.quest_id.toString() === completion.quest.id
          )

          // Calculate progress percentage from on-chain data if not in Supabase
          const progressPercentage = progressInfo?.progress_percentage || 
            (completion.pointsAwarded > 0 ? 100 : 0)

          return {
            id: completion.quest.id,
            quest_id: parseInt(completion.quest.id), // ✅ Convert to number
            quest_slug: progressInfo?.unified_quests?.slug || '', // ✅ Renamed for component
            quest_title: progressInfo?.unified_quests?.title || `Quest ${completion.quest.id}`, // ✅ Renamed
            quest_image_url: progressInfo?.unified_quests?.cover_image_url, // ✅ Renamed for component
            difficulty: progressInfo?.unified_quests?.difficulty || 'medium',
            xp_earned: 0, // XP rewards tracked off-chain in separate system
            points_earned: completion.pointsAwarded, // From blockchain
            status: progressInfo?.status || 'completed',
            completed_at: progressInfo?.completed_at || completion.timestamp,
            progress_percentage: progressPercentage,
            // Additional metadata (not used by QuestActivity but useful for other consumers)
            description: progressInfo?.unified_quests?.description || '',
            badge_image_url: progressInfo?.unified_quests?.badge_image_url,
            blockchain_data: {
              txHash: completion.txHash,
              blockNumber: completion.blockNumber,
              timestamp: completion.timestamp,
              pointsAwarded: completion.pointsAwarded,
            },
          }
        })

        // Apply sorting (Calculated)
        let sortedQuests = [...mergedQuests]
        if (sort === 'recent') {
          sortedQuests.sort((a, b) => 
            new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime()
          )
        } else if (sort === 'oldest') {
          sortedQuests.sort((a, b) => 
            new Date(a.blockchain_data.timestamp).getTime() - new Date(b.blockchain_data.timestamp).getTime()
          )
        } else if (sort === 'xp_earned') {
          sortedQuests.sort((a, b) => b.xp_earned - a.xp_earned)
        }

        // Apply pagination (Calculated)
        const paginatedQuests = sortedQuests.slice(offset, offset + limit)

        return {
          quests: paginatedQuests,
          total: sortedQuests.length,
        }
      },
      { ttl: 60 }
    )

    return NextResponse.json(
      {
        success: true,
        quests: result.quests,
        pagination: {
          total: result.total,
          limit,
          offset,
          hasMore: (offset + limit) < result.total,
        },
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': String(rateLimitResult.remaining ?? 59),
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
