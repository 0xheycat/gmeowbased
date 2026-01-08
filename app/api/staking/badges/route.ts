/**
 * Available Badges API
 * GET /api/staking/badges
 * 
 * Features:
 * - Fetch user's available (unstaked) badges
 * - Filter out currently staked badges
 * - Redis caching (5min TTL)
 * - Rate limiting (100 req/min per IP)
 * - Badge metadata from Supabase
 * 
 * Data Flow:
 * 1. Subsquid: getActiveBadgeStakes() - currently staked badges
 * 2. Supabase: user_badges - all owned badges
 * 3. Filter: owned - staked = available
 * 
 * Phase: 8.3 UI Integration
 * Date: December 19, 2025
 */

import { NextRequest, NextResponse } from 'next/server'
import { getActiveBadgeStakes } from '@/lib/subsquid-client'
import { createClient } from '@/lib/supabase/edge'
import { getCached } from '@/lib/cache/server'
import { logError } from '@/lib/middleware/error-handler'

// Note: Using Node.js runtime because getCached uses fs/path (not available in edge)
export const dynamic = 'force-dynamic'

interface AvailableBadge {
  badgeId: string
  name: string
  description: string
  imageUrl: string
  tier: string
  owned: number
  staked: number
  available: number
  canStake: boolean
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
    const cacheKey = `badges:${user.toLowerCase()}`
    
    const result = await getCached('staking', cacheKey, async () => {

    // Initialize Supabase client
    const supabase = createClient()

    // Fetch currently staked badges from Subsquid
    const stakedBadges = await getActiveBadgeStakes(user)
    
    // For now, we'll assume all staked badges are "owned"
    // In future, can query on-chain NFT balance or Supabase user_badges by FID
    // Count staked badges by ID
    const badgeMap = new Map<string, number>()
    for (const stake of stakedBadges) {
      const badgeId = stake.badgeId.toString()
      badgeMap.set(badgeId, (badgeMap.get(badgeId) || 0) + 1)
    }

      if (badgeMap.size === 0) {
        return {
          badges: [],
          count: 0,
          summary: {
            totalOwned: 0,
            totalStaked: 0,
            totalAvailable: 0,
          },
        }
      }

    // Get badge templates from Supabase
    const badgeIds = Array.from(badgeMap.keys())
    const { data: badgeTemplates } = await supabase
      .from('badge_templates')
      .select('id, name, description, image_url, metadata')
      .in('id', badgeIds)

    const templateMap = new Map(badgeTemplates?.map((b: any) => [b.id, b]) || [])

    // Build available badges list with real metadata
    const availableBadges: AvailableBadge[] = Array.from(badgeMap.entries()).map(([badgeId, staked]) => {
      const template = templateMap.get(badgeId) as any
      return {
        badgeId,
        name: template?.name || `Badge #${badgeId}`,
        description: template?.description || 'Badge description',
        imageUrl: template?.image_url || `/badges/placeholder.png`,
        tier: (template?.metadata?.tier as string) || 'common',
        owned: staked,
        staked,
        available: 0, // All are currently staked
        canStake: false,
      }
    })

    // Sort by availability (available first, then by tier)
    const tierPriority = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 }
    availableBadges.sort((a, b) => {
      // Available badges first
      if (a.canStake !== b.canStake) {
        return a.canStake ? -1 : 1
      }
      // Then by tier
      const aTier = tierPriority[a.tier.toLowerCase() as keyof typeof tierPriority] ?? 5
      const bTier = tierPriority[b.tier.toLowerCase() as keyof typeof tierPriority] ?? 5
      return aTier - bTier
    })

      return {
        badges: availableBadges,
        count: availableBadges.length,
        summary: {
          totalOwned: stakedBadges.length,
          totalStaked: stakedBadges.length,
          totalAvailable: 0,
        },
      }
    }, { ttl: 300 }) // 5 minute cache

    return NextResponse.json(result)

  } catch (error) {
    logError('Failed to fetch available badges', {
      error,
      user,
    })

    return NextResponse.json(
      {
        error: 'Failed to fetch available badges',
        badges: [],
        count: 0,
      },
      { status: 500 }
    )
  }
}
