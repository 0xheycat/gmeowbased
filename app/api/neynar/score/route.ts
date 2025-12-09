import { NextResponse } from 'next/server'
import { getNeynarServerClient } from '@/lib/neynar-server'
import { withErrorHandler, handleValidationError, handleNotFoundError, handleExternalApiError } from '@/lib/error-handler'
import { FIDSchema } from '@/lib/validation/api-schemas'
import { generateRequestId } from '@/lib/request-id'

export const dynamic = 'force-dynamic'

type TierType = 'mythic' | 'legendary' | 'epic' | 'rare' | 'common'

/**
 * Calculate tier from Neynar influence score
 */
function getTierFromScore(score: number): TierType {
  if (score >= 1.0) return 'mythic'
  if (score >= 0.8) return 'legendary'
  if (score >= 0.5) return 'epic'
  if (score >= 0.3) return 'rare'
  return 'common'
}

/**
 * GET /api/neynar/score?fid=123
 * Fetch REAL Neynar influence score using lookupUserByFid
 * 
 * Scoring algorithm:
 * - Base score from follower count (0-0.5)
 * - Power badge bonus (+0.3)
 * - Engagement ratio bonus (0-0.2)
 * 
 * Tier mapping:
 * - Mythic: ≥1.0
 * - Legendary: 0.8-1.0
 * - Epic: 0.5-0.8
 * - Rare: 0.3-0.5
 * - Common: <0.3
 */
export const GET = withErrorHandler(async (request: Request) => {
  const requestId = generateRequestId()
  const { searchParams } = new URL(request.url)
  const fidParam = searchParams.get('fid')

  if (!fidParam) {
    return handleValidationError(new Error('Missing fid parameter'))
  }

  const fidNumber = parseInt(fidParam, 10)
  
  // GI-8: Validate FID with Zod
  const fidValidation = FIDSchema.safeParse(fidNumber)
  if (!fidValidation.success) {
    return handleValidationError(new Error(`Invalid fid parameter: must be a positive integer`))
  }

  const neynarClient = getNeynarServerClient()

  // Use fetchBulkUsers for real Neynar data
  let response
  try {
    response = await neynarClient.fetchBulkUsers({ fids: [fidNumber] })
  } catch (error) {
    throw handleExternalApiError(
      error instanceof Error ? error : new Error('Failed to fetch user data'),
      'Neynar'
    )
  }
  
  if (!response?.users?.[0]) {
    return handleNotFoundError('User')
  }

    const user = response.users[0]

    // Extract engagement metrics
    const followerCount = user.follower_count || 0
    const followingCount = user.following_count || 0
    const hasPowerBadge = (user as any).power_badge || false
    const verifications = user.verifications || []
    const activeStatus = (user as any).active_status || 'inactive'

    // Calculate influence score (0 to 1.0+)
    let score = 0

    // 1. Base follower score (0-0.5)
    // Linear scaling: 0 followers = 0, 2000+ followers = 0.5
    score += Math.min(followerCount / 2000, 0.5)

    // 2. Power badge premium (+0.3)
    if (hasPowerBadge) {
      score += 0.3
    }

    // 3. Engagement ratio bonus (0-0.2)
    // High follower/following ratio = influential
    if (followingCount > 0) {
      const engagementRatio = followerCount / followingCount
      if (engagementRatio >= 3) {
        score += 0.2 // Very influential
      } else if (engagementRatio >= 2) {
        score += 0.15 // Influential
      } else if (engagementRatio >= 1) {
        score += 0.1 // Moderately influential
      }
    } else if (followerCount > 100) {
      // Edge case: many followers but follows nobody
      score += 0.15
    }

    // 4. Active status bonus (+0.05)
    if (activeStatus === 'active') {
      score += 0.05
    }

    // 5. Verified addresses bonus (+0.05 per verification, max +0.15)
    const verificationBonus = Math.min(verifications.length * 0.05, 0.15)
    score += verificationBonus

    // Round to 2 decimal places
    const finalScore = Math.round(score * 100) / 100

    // Calculate tier
    const tier = getTierFromScore(finalScore)

    return NextResponse.json(
      {
        fid: fidNumber,
        score: finalScore,
        tier,
        metrics: {
          followerCount,
          followingCount,
          powerBadge: hasPowerBadge,
          verifications: verifications.length,
          activeStatus,
          engagementRatio: followingCount > 0 
            ? Math.round((followerCount / followingCount) * 100) / 100 
            : null,
        },
        breakdown: {
          baseScore: Math.min(followerCount / 2000, 0.5),
          powerBadgeBonus: hasPowerBadge ? 0.3 : 0,
          engagementBonus: finalScore - Math.min(followerCount / 2000, 0.5) - (hasPowerBadge ? 0.3 : 0),
        },
      },
      {
        headers: {
          'X-Request-ID': requestId,
        },
      }
    )
})