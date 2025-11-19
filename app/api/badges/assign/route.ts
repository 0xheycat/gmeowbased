import { NextResponse } from 'next/server'
import { assignBadgeToUser, getBadgeFromRegistry } from '@/lib/badges'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { BadgeAssignSchema } from '@/lib/validation/api-schemas'
import { withErrorHandler } from '@/lib/error-handler'
import { withTiming } from '@/lib/middleware/timing'
import { invalidateCache, buildUserBadgesKey, getCached, buildUserProfileKey } from '@/lib/cache'

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
        { status: 400 }
      )
    }

    const { fid, badgeId, metadata } = validationResult.data

    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      )
    }

    // Get badge definition from registry (fast - embedded data)
    const badgeDef = getBadgeFromRegistry(badgeId)
    
    if (!badgeDef) {
      return NextResponse.json(
        { success: false, error: `Badge ${badgeId} not found in registry` },
        { status: 404 }
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

    // Assign badge and get profile in parallel
    const [badge, profile] = await Promise.all([
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

    // Queue badge mint asynchronously (non-blocking) if user has wallet
    if (profile?.wallet_address) {
      // Fire and forget - don't wait for mint queue insertion
      supabase.from('mint_queue').insert({
        fid,
        wallet_address: profile.wallet_address,
        badge_type: badgeDef.badgeType,
        status: 'pending',
        created_at: new Date().toISOString(),
      }).then(() => {
        console.log(`[Badge Assign] Mint queued for FID ${fid}, badge ${badgeDef.badgeType}`)
      }).catch((error) => {
        console.error(`[Badge Assign] Failed to queue mint:`, error)
      })
    }

    // Invalidate caches in parallel (non-blocking)
    Promise.all([
      invalidateCache('user-badges', buildUserBadgesKey(fid)),
      invalidateCache('user-profiles', buildUserProfileKey(fid)),
    ]).catch((error) => {
      console.error('[Badge Assign] Cache invalidation error:', error)
    })

    return NextResponse.json({
      success: true,
      badge,
    })
}))
