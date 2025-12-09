import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { withErrorHandler } from '@/lib/error-handler'
import { withTiming } from '@/lib/middleware/timing'
import { getCached } from '@/lib/cache'
import { LeaderboardQuerySchema } from '@/lib/validation/api-schemas'
import { generateRequestId } from '@/lib/request-id'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type LeaderboardEntry = {
  rank: number
  fid: number
  username: string | null
  displayName: string | null
  pfpUrl: string | null
  totalViralXp: number
  viralCasts: number
  topTier: string
  topTierEmoji: string
}

export const GET = withTiming(withErrorHandler(async (request: Request) => {
  const requestId = generateRequestId()
  const ip = getClientIp(request as NextRequest)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { 
      status: 429,
      headers: { 'X-Request-ID': requestId }
    })
  }

  const { searchParams } = new URL(request.url)
    
  const queryValidation = LeaderboardQuerySchema.safeParse({
    chain: searchParams.get('chain') || undefined,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
  })

  if (!queryValidation.success) {
    return NextResponse.json({ error: 'validation_error', issues: queryValidation.error.issues }, { 
      status: 400,
      headers: { 'X-Request-ID': requestId }
    })
  }

  const validated = queryValidation.data
  const limit = validated.limit ?? 50
  const offset = validated.offset ?? 0
  const chain = validated.chain || 'all'
  const season = searchParams.get('season') || 'current'
  
  const cacheKey = `chain:${chain}:limit:${limit}:offset:${offset}:season:${season}`
  
  const result = await getCached('viral-leaderboard', cacheKey, async () => {
    const supabase = getSupabaseServerClient()
    if (!supabase) throw new Error('Database connection failed')
    
    const query = supabase.from('badge_casts').select('fid, viral_bonus_xp, tier')
    const { data: casts, error } = await query
    
    if (error) {
      console.error('[Viral Leaderboard] Database error:', error)
      throw new Error('Failed to fetch leaderboard')
    }
    
    if (!casts || casts.length === 0) {
      return { leaderboard: [], totalUsers: 0, chain, season, message: 'No viral casts found yet.' }
    }
    
    const fidStats = new Map<number, { totalXp: number; castCount: number; topTier: string }>()
    
    casts.forEach(cast => {
      const fid = cast.fid
      const xp = cast.viral_bonus_xp || 0
      const tier = cast.tier || 'common'
      
      if (!fidStats.has(fid)) {
        fidStats.set(fid, { totalXp: 0, castCount: 0, topTier: tier })
      }
      
      const stats = fidStats.get(fid)!
      stats.totalXp += xp
      stats.castCount++
      
      const tierPriority: Record<string, number> = { mythic: 5, legendary: 4, epic: 3, rare: 2, common: 1 }
      if ((tierPriority[tier] || 0) > (tierPriority[stats.topTier] || 0)) {
        stats.topTier = tier
      }
    })
    
    const sortedEntries = Array.from(fidStats.entries())
      .map(([fid, stats]) => ({ fid, totalViralXp: stats.totalXp, viralCasts: stats.castCount, topTier: stats.topTier }))
      .sort((a, b) => b.totalViralXp - a.totalViralXp)
      .slice(offset, offset + limit)
    
    const tierEmojis: Record<string, string> = { mythic: '👑', legendary: '🌟', epic: '⚡', rare: '💎', common: '🎖️' }
    
    const leaderboard: LeaderboardEntry[] = sortedEntries.map((entry, index) => ({
      rank: offset + index + 1,
      fid: entry.fid,
      username: null,
      displayName: null,
      pfpUrl: null,
      totalViralXp: entry.totalViralXp,
      viralCasts: entry.viralCasts,
      topTier: entry.topTier,
      topTierEmoji: tierEmojis[entry.topTier] || '🎖️',
    }))
    
    return { leaderboard, totalUsers: fidStats.size, hasMore: offset + limit < fidStats.size, chain, season }
  }, { ttl: 180 })

  const response = NextResponse.json(result)
  response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=240')
  response.headers.set('X-Request-ID', requestId)
  return response
}))
