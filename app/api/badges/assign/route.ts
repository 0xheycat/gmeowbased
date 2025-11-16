import { NextResponse } from 'next/server'
import { assignBadgeToUser, getBadgeFromRegistry } from '@/lib/badges'
import { getSupabaseServerClient } from '@/lib/supabase-server'

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
export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServerClient()
    
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      )
    }

    // Verify admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { fid, badgeId, metadata } = body

    if (!fid || !badgeId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: fid, badgeId' },
        { status: 400 }
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
        assignedByUser: user.id,
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
      mintQueued: !!profile?.wallet_address,
    })
  } catch (error) {
    console.error('Error assigning badge:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to assign badge' 
      },
      { status: 500 }
    )
  }
}
