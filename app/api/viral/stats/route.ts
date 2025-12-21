import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/edge'
import type { Database } from '@/types/supabase'
import { 
  getViralTier, 
  calculateEngagementScore, 
  calculateLevelProgress,
  getRankTierByPoints,
  formatPoints,
  type EngagementMetrics 
} from '@/lib/scoring/unified-calculator'
import { getLeaderboardEntry } from '@/lib/subsquid-client'
import { FIDSchema } from '@/lib/validation/api-schemas'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/middleware/rate-limit'
import { withErrorHandler } from '@/lib/middleware/error-handler'
import { withTiming } from '@/lib/middleware/timing'
import { getCached } from '@/lib/cache/server'

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

type ViralStats = {
  fid: number
  // Layer 2: Supabase (off-chain viral engagement)
  totalViralXp: number
  totalCasts: number
  topCasts: ViralCastStat[]
  tierBreakdown: TierBreakdown
  averageXpPerCast: number
  // Layer 1: Subsquid (blockchain stats)
  blockchainPoints: number
  globalRank: number | null
  currentStreak: number
  // Layer 3: Calculated (unified-calculator)
  totalScore: number
  level: number
  rankTier: string
  message?: string
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
        const supabase = createClient()
    
        if (!supabase) {
          throw new Error('Database connection failed')
        }

        // LAYER 2: Supabase - Get user's wallet for Subsquid lookup
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('verified_addresses')
          .eq('fid', fid)
          .single()

        // LAYER 1: Subsquid - Get blockchain stats (on-chain)
        let blockchainStats = null
        if (profile?.verified_addresses?.[0]) {
          try {
            blockchainStats = await getLeaderboardEntry(profile.verified_addresses[0])
          } catch (error) {
            console.error('[viral/stats] Failed to fetch blockchain stats:', error)
          }
        }
    
        // LAYER 2: Supabase - Fetch user's badge casts with metrics (off-chain)
        const { data: casts, error } = await supabase
          .from('badge_casts')
          .select('*')
          .eq('fid', fid)
          .order('viral_bonus_xp', { ascending: false })
          .limit(50) as { data: Database['public']['Tables']['badge_casts']['Row'][] | null, error: any } // GI-11: Limit result size
    
    if (error) {
      console.error('[viral/stats] Database error:', error)
      return NextResponse.json(
        { error: 'Internal Error', message: 'Failed to fetch viral statistics' },
        { 
          status: 500,
          headers: { 
            'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240'
          }
        }
      )
    }
    
    if (!casts || casts.length === 0) {
      // LAYER 3: Calculate stats even with no viral XP
      const blockchainPoints = blockchainStats?.totalScore || 0
      const totalScore = blockchainPoints + 0 // No viral XP yet
      const levelData = calculateLevelProgress(totalScore)
      const rankTier = getRankTierByPoints(totalScore)
      
      // GI-13: Return empty state with helpful message + blockchain data
      return {
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
        averageXpPerCast: 0,
        // Layer 1: Blockchain
        blockchainPoints,
        globalRank: blockchainStats?.rank || null,
        currentStreak: Math.floor((blockchainStats?.streakBonus || 0) / 10), // 10 points per streak day
        // Layer 3: Calculated
        totalScore,
        level: levelData.level,
        rankTier: rankTier.name,
        message: 'No badge casts found. Share your first badge to start earning viral XP!',
      }
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
          bonusXp: cast.viral_bonus_xp || 0,
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
    
    // LAYER 3: Calculated - Use unified-calculator for total score, level, rank
        const blockchainPoints = blockchainStats?.totalScore || 0
        const totalScore = blockchainPoints + totalViralXp
        const levelData = calculateLevelProgress(totalScore)
        const rankTier = getRankTierByPoints(totalScore)

        return {
          fid,
          // Layer 2: Viral engagement (off-chain)
          totalViralXp,
          totalCasts: casts.length,
          topCasts,
          tierBreakdown,
          averageXpPerCast: casts.length > 0 ? Math.round(totalViralXp / casts.length) : 0,
          // Layer 1: Blockchain (on-chain)
          blockchainPoints,
          globalRank: blockchainStats?.rank || null,
          currentStreak: Math.floor((blockchainStats?.streakBonus || 0) / 10), // 10 points per streak day
          // Layer 3: Calculated (unified-calculator)
          totalScore,
          level: levelData.level,
          rankTier: rankTier.name,
        }
      },
      { ttl: 120 }
    )

    const response = NextResponse.json(result)
    response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=240')
    return response
}))
