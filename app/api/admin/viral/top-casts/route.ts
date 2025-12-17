/**
 * Admin API: Top Viral Casts Leaderboard
 * 
 * GET /api/admin/viral/top-casts
 * 
 * Returns the highest-scoring viral casts within a timeframe, sorted by viral_score.
 * Includes engagement metrics (likes, recasts, replies). Admin-only access required.
 * 
 * Query params:
 * - timeframe: '24h' | '7d' | '30d' | 'all' (default: '7d')
 * - limit: number (default: 20, max: 100)
 * 
 * Source: Phase 5.2 Admin Dashboard
 * MCP Verified: November 17, 2025
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateRequestId } from '@/lib/middleware/request-id'
import { rateLimit, getClientIp, strictLimiter } from '@/lib/middleware/rate-limit'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { validateAdminRequest } from '@/lib/auth/admin'
import { NeynarAPIClient } from '@neynar/nodejs-sdk'
import { withErrorHandler } from '@/lib/middleware/error-handler'
import { AdminQuerySchema } from '@/lib/validation/api-schemas'

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY

type ViralCast = {
  cast_hash: string
  fid: number
  viral_score: number
  viral_tier: string
  likes_count: number
  recasts_count: number
  replies_count: number
  created_at: string
  username?: string
  display_name?: string
  avatar_url?: string
}

export const GET = withErrorHandler(async (req: NextRequest) => {
  const requestId = generateRequestId()
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, strictLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'X-Request-ID': requestId } }
    )
  }

  // Validate query parameters
  const { searchParams } = new URL(req.url)
  const queryValidation = AdminQuerySchema.safeParse({
    timeframe: searchParams.get('timeframe') || undefined,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
  })
  
  if (!queryValidation.success) {
    return NextResponse.json(
      { error: 'validation_error', issues: queryValidation.error.issues },
      { status: 400, headers: { 'X-Request-ID': requestId } }
    )
  }

  // 1. Admin auth check
  const auth = await validateAdminRequest(req)
  if (!auth.ok && auth.reason !== 'admin_security_disabled') {
    return NextResponse.json(
      { ok: false, error: 'admin_auth_required', reason: auth.reason },
      { status: 401, headers: { 'X-Request-ID': requestId } }
    )
  }

    // 2. Parse query params
    const timeframe = searchParams.get('timeframe') ?? '7d'
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)

    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: 'supabase_not_configured' },
        { status: 500, headers: { 'X-Request-ID': requestId } }
      )
    }

    // 3. Query badge_casts for top viral casts
    // Calculate the cutoff timestamp
    const cutoffDate = new Date()
    if (timeframe === '24h') {
      cutoffDate.setHours(cutoffDate.getHours() - 24)
    } else if (timeframe === '7d') {
      cutoffDate.setDate(cutoffDate.getDate() - 7)
    } else if (timeframe === '30d') {
      cutoffDate.setDate(cutoffDate.getDate() - 30)
    } else {
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 10) // 'all' timeframe
    }

    const { data: casts, error } = await supabase
      .from('badge_casts')
      .select(
        'cast_hash, fid, viral_score, viral_tier, likes_count, recasts_count, replies_count, created_at'
      )
      .gte('created_at', cutoffDate.toISOString())
      .gt('viral_score', 0) // Only casts with viral scores
      .order('viral_score', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[top-casts] Database error:', error)
      return NextResponse.json(
        { ok: false, error: 'database_error', message: error.message },
        { status: 500, headers: { 'X-Request-ID': requestId } }
      )
    }

    // 4. Enrich with user data from Neynar (batch lookup)
    const enrichedCasts: ViralCast[] = []

    if (casts && casts.length > 0 && NEYNAR_API_KEY) {
      const fids = [...new Set(casts.map((c: { fid: number }) => c.fid))]

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

        for (const cast of casts) {
          const userInfo = userMap.get(cast.fid)
          enrichedCasts.push({
            cast_hash: cast.cast_hash,
            fid: cast.fid,
            viral_score: cast.viral_score,
            viral_tier: cast.viral_tier,
            likes_count: cast.likes_count ?? 0,
            recasts_count: cast.recasts_count ?? 0,
            replies_count: cast.replies_count ?? 0,
            created_at: cast.created_at,
            username: userInfo?.username,
            display_name: userInfo?.display_name,
            avatar_url: userInfo?.avatar_url,
          })
        }
      } catch (neynarError) {
        console.warn('[top-casts] Neynar enrichment failed:', neynarError)
        // Return casts without enrichment
        enrichedCasts.push(
          ...casts.map((c: any) => ({
            cast_hash: c.cast_hash,
            fid: c.fid,
            viral_score: c.viral_score,
            viral_tier: c.viral_tier,
            likes_count: c.likes_count ?? 0,
            recasts_count: c.recasts_count ?? 0,
            replies_count: c.replies_count ?? 0,
            created_at: c.created_at,
          }))
        )
      }
    }

  // 5. Return leaderboard
  return NextResponse.json({
    ok: true,
    casts: enrichedCasts,
    timeframe,
    limit,
  }, {
    headers: { 'X-Request-ID': requestId }
  })
})
