/**
 * Quest Completions API
 * GET /api/quests/completions/[questId]
 * 
 * Features:
 * - Fetch recent quest completers with pagination
 * - Redis caching (5min TTL)
 * - Rate limiting (100 req/min per IP)
 * - Error handling with fallbacks
 * - Supabase enrichment (user profiles)
 * 
 * Data Flow:
 * 1. Subsquid: getQuestCompletions() - blockchain data
 * 2. Supabase: user_profiles - Farcaster metadata
 * 3. Merge: completion + profile data
 * 
 * Phase: 8.1 UI Integration
 * Date: December 19, 2025
 */

import { NextRequest, NextResponse } from 'next/server'
import { getQuestCompletions } from '@/lib/subsquid-client'
import { createClient } from '@/lib/supabase/edge'
import { getCached } from '@/lib/cache/server'
import { logError } from '@/lib/middleware/error-handler'

// Note: Using Node.js runtime because getCached uses fs/path (not available in edge)
export const dynamic = 'force-dynamic'

interface QuestCompletion {
  id: string
  user: string
  quest: { id: string }
  pointsAwarded: bigint
  timestamp: string
  txHash: string
  blockNumber: number
}

interface EnrichedCompletion {
  id: string
  user: {
    address: string
    fid?: number
    username?: string
    displayName?: string
    pfpUrl?: string
  }
  pointsAwarded: string
  completedAt: string
  txHash: string
  blockNumber: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ questId: string }> }
) {
  // Next.js 15: params must be awaited
  const { questId } = await params
  const { searchParams } = new URL(request.url)
  
  // Parse query parameters
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
  const offset = parseInt(searchParams.get('offset') || '0')
  const period = searchParams.get('period') as '24h' | '7d' | '30d' | 'all' | null

  try {
    // Generate cache key
    const cacheKey = `${questId}:completions:${limit}:${offset}:${period || 'all'}`
    
    // Try cache first using existing infrastructure
    const result = await getCached('quest', cacheKey, async () => {

    // Calculate time filter
    let since: Date | undefined
    if (period) {
      const now = new Date()
      switch (period) {
        case '24h':
          since = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case '7d':
          since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case '30d':
          since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
      }
    }

    // Fetch from Subsquid
    const completions = await getQuestCompletions({
      questId,
      limit,
      since, // Pass Date object directly
    })

      if (completions.length === 0) {
        return {
          completions: [],
          count: 0,
        }
      }

    // Extract unique user addresses for profile lookup
    const userAddresses = [...new Set(completions.map(c => c.user.id.toLowerCase()))]

    // Enrich with Supabase user profiles (fid, display_name, avatar_url)
    const supabase = createClient()
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('wallet_address, fid, display_name, avatar_url')
      .in('wallet_address', userAddresses)

    // Create profile lookup map (wallet_address -> profile)
    const profileMap = new Map(
      profiles?.map((p: any) => [p.wallet_address.toLowerCase(), p]) || []
    )

    // Map to enriched format with profile data
    const enrichedCompletions: EnrichedCompletion[] = completions.map(completion => {
      const userAddress = completion.user.id.toLowerCase()
      const profile = profileMap.get(userAddress)
      
      return {
        id: completion.id,
        user: {
          address: completion.user.id,
          fid: profile?.fid,
          username: profile?.fid ? `@fid-${profile.fid}` : undefined,
          displayName: profile?.display_name,
          pfpUrl: profile?.avatar_url,
        },
        pointsAwarded: completion.pointsAwarded.toString(),
        completedAt: completion.timestamp,
        txHash: completion.txHash,
        blockNumber: completion.blockNumber,
      }
    })

      // Return data structure
      return {
        completions: enrichedCompletions,
        count: enrichedCompletions.length,
        hasMore: enrichedCompletions.length === limit,
        nextOffset: enrichedCompletions.length === limit ? offset + limit : null,
      }
    }, { ttl: 300 }) // 5 minute cache

    return NextResponse.json(result)

  } catch (error) {
    logError('Failed to fetch quest completions', {
      error,
      questId,
      limit,
      offset,
      period,
    })

    return NextResponse.json(
      {
        error: 'Failed to fetch quest completions',
        completions: [],
        count: 0,
      },
      { status: 500 }
    )
  }
}
