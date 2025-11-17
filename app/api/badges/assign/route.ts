import { NextResponse } from 'next/server'
import { assignBadgeToUser, getBadgeFromRegistry } from '@/lib/badges'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { BadgeAssignSchema } from '@/lib/validation/api-schemas'
import { withErrorHandler } from '@/lib/error-handler'

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
 */
export const POST = withErrorHandler(async (request: Request) => {
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

    // Get badge definition from registry
    const badgeDef = getBadgeFromRegistry(badgeId)
    
    if (!badgeDef) {
      return NextResponse.json(
        { success: false, error: `Badge ${badgeId} not found in registry` },
        { status: 404 }
      )
    }

    // Assign badge to user
    const badge = await assignBadgeToUser({
      fid,
      badgeId: badgeDef.id,
      badgeType: badgeDef.badgeType,
      tier: badgeDef.tier as TierType,
      metadata: metadata || {
        assignedBy: 'manual',
        assignedAt: new Date().toISOString(),
      },
    })

    // Queue badge mint if user has wallet
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('wallet_address')
      .eq('fid', fid)
      .single()

    if (profile?.wallet_address) {
      await supabase.from('mint_queue').insert({
        fid,
        wallet_address: profile.wallet_address,
        badge_type: badgeDef.badgeType,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      success: true,
      badge,
    })
})
