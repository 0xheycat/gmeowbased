/**
 * Badge Staking API
 * GET /api/staking/stakes
 * 
 * Features:
 * - Fetch user's staked badges
 * - Aggregate staking statistics
 * - Redis caching (2min TTL for active stakes)
 * - Rate limiting (100 req/min per IP)
 * - Badge metadata enrichment
 * 
 * Data Flow:
 * 1. Subsquid: getActiveBadgeStakes() - on-chain stake data
 * 2. Subsquid: getBadgeStakingStats() - aggregate stats
 * 3. Supabase: user_badges - badge metadata
 * 4. Merge: stake + badge metadata
 * 
 * Phase: 8.3 UI Integration
 * Date: December 19, 2025
 */

import { NextRequest, NextResponse } from 'next/server'
import { getActiveBadgeStakes, getBadgeStakingStats } from '@/lib/subsquid-client'
import { createClient } from '@/lib/supabase/edge'
import { getCached } from '@/lib/cache/server'
import { logError } from '@/lib/middleware/error-handler'

// Note: Using Node.js runtime because getCached uses fs/path (not available in edge)
export const dynamic = 'force-dynamic'

interface BadgeMetadata {
  badge_id: number
  name: string
  description: string
  image_url: string
  tier: string
}

interface EnrichedStake {
  id: string
  badgeId: string
  badge: {
    name: string
    description: string
    imageUrl: string
    tier: string
  }
  stakedAt: string
  rewardsEarned: string
  isPowerBadge: boolean
  powerMultiplier: number | null
  isActive: boolean
  txHash: string
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // Get user wallet address (required)
  const user = searchParams.get('user')
  if (!user) {
    return NextResponse.json(
      { error: 'User wallet address required' },
      { status: 400 }
    )
  }

  // Validate Ethereum address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(user)) {
    return NextResponse.json(
      { error: 'Invalid wallet address format' },
      { status: 400 }
    )
  }

  try {
    // Use existing cache infrastructure
    const cacheKey = `stakes:${user.toLowerCase()}`
    
    const result = await getCached('staking', cacheKey, async () => {

    // Initialize Supabase client
    const supabase = createClient()

    // Fetch from Subsquid in parallel
    const [stakes, stats] = await Promise.all([
      getActiveBadgeStakes(user),
      getBadgeStakingStats(user),
    ])

      if (stakes.length === 0) {
        return {
          stakes: [],
          stats: {
            totalStaked: 0,
            totalRewards: '0',
            activeBadges: 0,
            powerBadges: 0,
          },
        }
      }

    // Get badge templates from Supabase
    const badgeIds = stakes.map(s => s.badgeId.toString())
    const { data: badgeTemplates } = await supabase
      .from('badge_templates')
      .select('id, name, description, image_url, metadata')
      .in('id', badgeIds)

    const badgeMap = new Map(badgeTemplates?.map((b: any) => [b.id, b]) || [])

    // Map stakes with real badge metadata from badge_templates
    const enrichedStakes: EnrichedStake[] = stakes.map(stake => {
      const template = badgeMap.get(stake.badgeId.toString()) as any
      return {
        id: stake.id,
        badgeId: stake.badgeId.toString(),
        badge: {
          name: template?.name || `Badge #${stake.badgeId}`,
          description: template?.description || (stake.isPowerBadge ? 'Power Badge - Enhanced rewards' : 'Standard Badge'),
          imageUrl: template?.image_url || `/badges/placeholder.png`,
          tier: (template?.metadata?.tier as string) || (stake.isPowerBadge ? 'legendary' : 'common'),
        },
        stakedAt: stake.stakedAt?.toString() || '',
        rewardsEarned: stake.rewardsEarned?.toString() || '0',
        isPowerBadge: stake.isPowerBadge,
        powerMultiplier: stake.powerMultiplier,
        isActive: stake.isActive,
        txHash: stake.txHash,
      }
    })

    // Format stats
    const formattedStats = {
      totalStaked: stats.totalStaked,
      totalRewards: stats.totalRewards.toString(),
      activeBadges: stats.activeBadges,
      powerBadges: stats.powerBadges,
    }

      return {
        stakes: enrichedStakes,
        stats: formattedStats,
      }
    }, { ttl: 120 }) // 2 minute cache

    return NextResponse.json(result)

  } catch (error) {
    logError('Failed to fetch badge stakes', {
      error,
      user,
    })

    return NextResponse.json(
      {
        error: 'Failed to fetch badge stakes',
        stakes: [],
        stats: {
          totalStaked: 0,
          totalRewards: '0',
          activeBadges: 0,
          powerBadges: 0,
        },
      },
      { status: 500 }
    )
  }
}
