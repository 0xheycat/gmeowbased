import { NextResponse } from 'next/server'
import { assignBadgeToUser, getBadgeFromRegistry } from '@/lib/badges'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { BadgeAssignSchema } from '@/lib/validation/api-schemas'
import { withErrorHandler } from '@/lib/error-handler'
import { withTiming } from '@/lib/middleware/timing'
import { invalidateCache, buildUserBadgesKey, getCached, buildUserProfileKey } from '@/lib/cache/server'
import { generateRequestId } from '@/lib/request-id'

export const dynamic = 'force-dynamic'

type TierType = 'mythic' | 'legendary' | 'epic' | 'rare' | 'common'

/**
 * POST /api/badges/assign
 * Manually assign a badge to a user
 * 
 * Body:
 * {
 *   fid: number
 *   badgeId: string  // from registry
 *   metadata?: Record<string, unknown>
 * }
 * 
 * Performance optimizations:
 * - Request timing tracking
 * - Cache invalidation on assignment
 */
export const POST = withTiming(withErrorHandler(async (request: Request) => {
  const requestId = generateRequestId();
  const body = await request.json()
  
  // Validate input with Zod
  const validationResult = BadgeAssignSchema.safeParse(body)
    if (!validationResult.success) {
      console.error('[Badge Assign] Validation failed:', validationResult.error.issues)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid input',
          details: validationResult.error.issues
        },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      )
    }

    const { fid, badgeId, metadata } = validationResult.data

    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500, headers: { 'X-Request-ID': requestId } }
      )
    }

    // Get badge definition from registry (fast - embedded data)
    const badgeDef = getBadgeFromRegistry(badgeId)
    
    if (!badgeDef) {
      return NextResponse.json(
        { success: false, error: `Badge ${badgeId} not found in registry` },
        { status: 404, headers: { 'X-Request-ID': requestId } }
      )
    }

    // Get user profile with caching (includes wallet address check)
    const profilePromise = getCached(
      'user-profiles',
      buildUserProfileKey(fid),
      async () => {
        const { data } = await supabase
          .from('user_profiles')
          .select('wallet_address, fid')
          .eq('fid', fid)
          .single()
        return data
      },
      { ttl: 300 } // 5 minutes cache
    )

    // Assign badge and prefetch profile in parallel (profile cached for future use)
    const [badge] = await Promise.all([
      assignBadgeToUser({
        fid,
        badgeId: badgeDef.id,
        badgeType: badgeDef.badgeType,
        tier: badgeDef.tier as TierType,
        metadata: metadata || {
          assignedBy: 'manual',
          assignedAt: new Date().toISOString(),
        },
      }),
      profilePromise,
    ])

    // NOTE: Badge is assigned but NOT auto-minted
    // User must manually claim/mint from their profile page
    // This allows user to pay gas while oracle provides the points
    console.log(`[Badge Assign] Badge ${badgeDef.badgeType} assigned to FID ${fid}. User must claim to mint on-chain.`)

    // Invalidate caches in parallel (non-blocking)
    Promise.all([
      invalidateCache('user-badges', buildUserBadgesKey(fid)),
      invalidateCache('user-profiles', buildUserProfileKey(fid)),
    ]).catch((error: unknown) => {
      console.error('[Badge Assign] Cache invalidation error:', error)
    })

    return NextResponse.json({
      success: true,
      badge,
    }, {
      headers: { 'X-Request-ID': requestId }
    })
}))
