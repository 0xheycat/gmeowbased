import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { getViralTier, calculateEngagementScore, type EngagementMetrics } from '@/lib/viral-bonus'
import { FIDSchema } from '@/lib/validation/api-schemas'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { withErrorHandler } from '@/lib/error-handler'
import { withTiming } from '@/lib/middleware/timing'
import { getCached } from '@/lib/cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Viral Statistics API
 * 
 * Get user's viral engagement statistics and top performing casts.
 * 
 * Quality Gates Applied:
 * - GI-11: Input validation and safe queries
 * - GI-13: Clear data structure and user-friendly responses
 * 
 * Route: GET /api/viral/stats?fid=123
 */

type ViralCastStat = {
  castHash: string
  castUrl: string
  badgeId: string
  likes: number
  recasts: number
  replies: number
  score: number
  tier: string
  tierEmoji: string
  bonusXp: number
  createdAt: string
}

type TierBreakdown = {
  mega_viral: number
  viral: number
  popular: number
  engaging: number
  active: number
}

export const GET = withTiming(withErrorHandler(async (request: Request) => {
  const ip = getClientIp(request as NextRequest)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const { searchParams } = new URL(request.url)
  const fidParam = searchParams.get('fid')
    
    // GI-11: Input validation
    if (!fidParam) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Missing fid parameter' },
        { status: 400 }
      )
    }
    
    const fid = parseInt(fidParam, 10)
    
    // Zod validation
    const fidValidation = FIDSchema.safeParse(fid)
    if (!fidValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid fid parameter', details: fidValidation.error.flatten() },
        { status: 400 }
      )
    }
    
    // Fetch with cache (2 minute TTL)
    const result = await getCached(
      'viral-stats',
      `fid:${fid}`,
      async () => {
        const supabase = getSupabaseServerClient()
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Internal Error', message: 'Database connection failed' },
        { status: 500 }
      )
    }
    
    // GI-11: Fetch user's badge casts with metrics
    const { data: casts, error } = await supabase
      .from('badge_casts')
      .select('*')
      .eq('fid', fid)
      .order('viral_bonus_xp', { ascending: false })
      .limit(50) // GI-11: Limit result size
    
    if (error) {
      console.error('[Viral Stats] Database error:', error)
      return NextResponse.json(
        { error: 'Internal Error', message: 'Failed to fetch viral statistics' },
        { status: 500 }
      )
    }
    
    if (!casts || casts.length === 0) {
      // GI-13: Return empty state with helpful message
      return NextResponse.json({
        fid,
        totalViralXp: 0,
        totalCasts: 0,
        topCasts: [],
        tierBreakdown: {
          mega_viral: 0,
          viral: 0,
          popular: 0,
          engaging: 0,
          active: 0,
        },
        message: 'No badge casts found. Share your first badge to start earning viral XP!',
      })
    }
    
    // Calculate total viral XP
    const totalViralXp = casts.reduce((sum, cast) => sum + (cast.viral_bonus_xp || 0), 0)
    
    // Build top casts list with tier information
    const topCasts: ViralCastStat[] = casts
      .filter(cast => cast.viral_bonus_xp && cast.viral_bonus_xp > 0)
      .map(cast => {
        const metrics: EngagementMetrics = {
          likes: cast.likes_count || 0,
          recasts: cast.recasts_count || 0,
          replies: cast.replies_count || 0,
        }
        
        const score = calculateEngagementScore(metrics)
        const tier = getViralTier(score)
        
        return {
          castHash: cast.cast_hash,
          castUrl: cast.cast_url,
          badgeId: cast.badge_id,
          likes: metrics.likes,
          recasts: metrics.recasts,
          replies: metrics.replies,
          score,
          tier: tier.name,
          tierEmoji: tier.emoji,
          bonusXp: cast.viral_bonus_xp,
          createdAt: cast.created_at,
        }
      })
      .slice(0, 10) // Top 10 casts
    
    // Calculate tier breakdown
    const tierBreakdown: TierBreakdown = {
      mega_viral: 0,
      viral: 0,
      popular: 0,
      engaging: 0,
      active: 0,
    }
    
    casts.forEach(cast => {
      const metrics: EngagementMetrics = {
        likes: cast.likes_count || 0,
        recasts: cast.recasts_count || 0,
        replies: cast.replies_count || 0,
      }
      
      const score = calculateEngagementScore(metrics)
      const tier = getViralTier(score)
      
      if (tier.name === 'Mega Viral') tierBreakdown.mega_viral++
      else if (tier.name === 'Viral') tierBreakdown.viral++
      else if (tier.name === 'Popular') tierBreakdown.popular++
      else if (tier.name === 'Engaging') tierBreakdown.engaging++
      else if (tier.name === 'Active') tierBreakdown.active++
    })
    
    return {
      fid,
      totalViralXp,
      totalCasts: casts.length,
      topCasts,
      tierBreakdown,
      averageXpPerCast: casts.length > 0 ? Math.round(totalViralXp / casts.length) : 0,
    }
      },
      { ttl: 120 }
    )

    const response = NextResponse.json(result)
    response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
    return response
}))
