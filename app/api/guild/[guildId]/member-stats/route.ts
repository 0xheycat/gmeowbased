/**
 * Guild Member Stats API Endpoint
 * 
 * GET /api/guild/[guildId]/member-stats?address=0x...
 * 
 * Purpose: Fetch individual member statistics for hover cards
 * Data: Join date, last active, points contributed, rank
 * 
 * Hybrid Pattern:
 * - On-chain (Subsquid): Global rank, total score from leaderboard
 * - Off-chain (Supabase): Guild events (joined, last active, deposits)
 * - Calculated: Points contributed aggregation
 * 
 * Infrastructure:
 * - getCached() for 60s caching
 * - rateLimit() with apiLimiter
 * - AddressSchema validation
 * - createClient() from @/lib/supabase/edge
 * - createErrorResponse() for errors
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/edge'
import { getCached } from '@/lib/cache/server'
import { rateLimit, apiLimiter, getClientIp } from '@/lib/middleware/rate-limit'
import { createErrorResponse, ErrorType } from '@/lib/middleware/error-handler'
import { AddressSchema } from '@/lib/validation/api-schemas'
import { getLeaderboardEntry } from '@/lib/subsquid-client'

export const runtime = 'nodejs'
export const revalidate = 60

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  try {
    // 1. Rate limiting
    const ip = getClientIp(req)
    const { success } = await rateLimit(ip, apiLimiter)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const { guildId } = await params
    const { searchParams } = new URL(req.url)
    const memberAddress = searchParams.get('address')

    // 2. Validation
    if (!memberAddress) {
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'Member address is required',
        statusCode: 400,
      })
    }

    const addressValidation = AddressSchema.safeParse(memberAddress)
    if (!addressValidation.success) {
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'Invalid Ethereum address',
        details: addressValidation.error.issues,
        statusCode: 400,
      })
    }

    const address = addressValidation.data.toLowerCase()

    // 3. Get cached data
    const stats = await getCached(
      'guild-member-stats',
      `${guildId}:${address}`,
      async () => {
        const supabase = createClient()

        // HYBRID LAYER 1: Off-chain data (Supabase) - Guild events
        
        // Fetch join date (first MEMBER_JOINED event)
        const { data: joinEvent } = await supabase
          .from('guild_events')
          .select('created_at')
          .eq('guild_id', guildId)
          .eq('event_type', 'MEMBER_JOINED')
          .eq('actor_address', address)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()

        const joinedAt = joinEvent?.created_at || new Date().toISOString()

        // Fetch last active (most recent event)
        const { data: lastEvent } = await supabase
          .from('guild_events')
          .select('created_at, event_type')
          .eq('guild_id', guildId)
          .eq('actor_address', address)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const lastActive = lastEvent?.created_at || null

        // Fetch points contributed (sum of POINTS_DEPOSITED)
        const { data: depositEvents } = await supabase
          .from('guild_events')
          .select('amount')
          .eq('guild_id', guildId)
          .eq('event_type', 'POINTS_DEPOSITED')
          .eq('actor_address', address)

        // HYBRID LAYER 2: Calculated - Aggregate points
        const pointsContributed = depositEvents
          ? depositEvents.reduce((sum, event) => sum + (event.amount || 0), 0)
          : 0

        // HYBRID LAYER 3: On-chain data (Subsquid) - Global leaderboard
        let leaderboardData = null
        try {
          const entry = await getLeaderboardEntry(address)
          if (entry) {
            leaderboardData = {
              global_rank: entry.rank || null,
              total_score: entry.totalScore || 0
            }
          }
        } catch (error) {
          console.error('[guild-member-stats] Subsquid error:', error)
        }

        return {
          joinedAt,
          lastActive,
          pointsContributed,
          totalScore: leaderboardData?.total_score || 0,
          globalRank: leaderboardData?.global_rank || null,
        }
      },
      { ttl: 60 }
    )

    return NextResponse.json(
      {
        success: true,
        stats,
        timestamp: Date.now(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    )
  } catch (error) {
    return createErrorResponse({
      type: ErrorType.INTERNAL,
      message: error instanceof Error ? error.message : 'Failed to fetch member stats',
      statusCode: 500,
    })
  }
}
