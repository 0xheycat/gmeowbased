/**
 * Admin API: Viral Tier Upgrades Feed
 * 
 * GET /api/admin/viral/tier-upgrades
 * 
 * Returns paginated list of recent viral tier upgrades with user details.
 * Admin-only access required.
 * 
 * Query params:
 * - limit: number (default: 50, max: 100)
 * - offset: number (default: 0)
 * - tier_filter: 'viral' | 'mega_viral' | 'popular' | 'engaging' (optional)
 * 
 * Source: Phase 5.2 Admin Dashboard
 * MCP Verified: November 17, 2025
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp, strictLimiter } from '@/lib/rate-limit'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { validateAdminRequest } from '@/lib/admin-auth'
import { NeynarAPIClient } from '@neynar/nodejs-sdk'
import { withErrorHandler } from '@/lib/error-handler'

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY

type TierUpgrade = {
  id: string
  fid: number
  cast_hash: string
  old_tier: string
  new_tier: string
  xp_bonus_awarded: number
  changed_at: string
  username?: string
  display_name?: string
  avatar_url?: string
}

export const GET = withErrorHandler(async (req: NextRequest) => {
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, strictLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  // 1. Admin auth check
  const auth = await validateAdminRequest(req)
  if (!auth.ok && auth.reason !== 'admin_security_disabled') {
    return NextResponse.json(
      { ok: false, error: 'admin_auth_required', reason: auth.reason },
      { status: 401 }
    )
  }

    // 2. Parse query params
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100)
    const offset = parseInt(searchParams.get('offset') ?? '0', 10)
    const tierFilter = searchParams.get('tier_filter')

    // 3. Query viral_tier_history table
    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: 'supabase_not_configured' },
        { status: 500 }
      )
    }

    let query = supabase
      .from('viral_tier_history')
      .select('*')
      .order('changed_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply tier filter if provided
    if (tierFilter && ['viral', 'mega_viral', 'popular', 'engaging'].includes(tierFilter)) {
      query = query.eq('new_tier', tierFilter)
    }

    const { data: upgrades, error, count } = await query

    if (error) {
      console.error('[viral-tier-upgrades] Database error:', error)
      return NextResponse.json(
        { ok: false, error: 'database_error', message: error.message },
        { status: 500 }
      )
    }

    // 4. Enrich with user data from Neynar (batch lookup)
    const enrichedUpgrades: TierUpgrade[] = []
    
    if (upgrades && upgrades.length > 0 && NEYNAR_API_KEY) {
      const fids = [...new Set(upgrades.map((u) => u.fid))]
      
      try {
        const client = new NeynarAPIClient({ apiKey: NEYNAR_API_KEY })
        const usersResponse = await client.fetchBulkUsers({ fids })
        
        const userMap = new Map(
          usersResponse.users.map((user) => [
            user.fid,
            {
              username: user.username,
              display_name: user.display_name,
              avatar_url: user.pfp_url,
            },
          ])
        )

        for (const upgrade of upgrades) {
          const userInfo = userMap.get(upgrade.fid)
          enrichedUpgrades.push({
            id: upgrade.id,
            fid: upgrade.fid,
            cast_hash: upgrade.cast_hash,
            old_tier: upgrade.old_tier,
            new_tier: upgrade.new_tier,
            xp_bonus_awarded: upgrade.xp_bonus_awarded,
            changed_at: upgrade.changed_at,
            username: userInfo?.username,
            display_name: userInfo?.display_name,
            avatar_url: userInfo?.avatar_url,
          })
        }
      } catch (neynarError) {
        console.warn('[viral-tier-upgrades] Neynar enrichment failed:', neynarError)
        // Return upgrades without enrichment
        enrichedUpgrades.push(
          ...upgrades.map((u) => ({
            id: u.id,
            fid: u.fid,
            cast_hash: u.cast_hash,
            old_tier: u.old_tier,
            new_tier: u.new_tier,
            xp_bonus_awarded: u.xp_bonus_awarded,
            changed_at: u.changed_at,
          }))
        )
      }
    }

  // 5. Return paginated response
  return NextResponse.json({
    ok: true,
    upgrades: enrichedUpgrades,
    total: count ?? 0,
    limit,
    offset,
    page: Math.floor(offset / limit) + 1,
  })
})
