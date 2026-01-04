import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/edge'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/middleware/rate-limit'
import { withErrorHandler } from '@/lib/middleware/error-handler'
import { withTiming } from '@/lib/middleware/timing'
import { getCached } from '@/lib/cache/server'
import { LeaderboardQuerySchema } from '@/lib/validation/api-schemas'
import { getLeaderboardEntry } from '@/lib/subsquid-client'
import { calculateLevelProgress, getRankTierByPoints, formatPoints } from '@/lib/scoring/unified-calculator'
import { getUserStatsOnChain, getLevelProgressOnChain } from '@/lib/contracts/scoring-module'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type LeaderboardEntry = {
  rank: number
  fid: number
  username: string | null
  displayName: string | null
  pfpUrl: string | null
  viralPoints: number
  viralCasts: number
  topTier: string
  topTierEmoji: string
  // On-chain data (Subsquid)
  pointsBalance: number
  totalScore: number
  level: number
  rankTier: string
  globalRank: number | null
}

export const GET = withTiming(withErrorHandler(async (request: Request) => {
  const ip = getClientIp(request as NextRequest)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { 
      status: 429
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
      status: 400
    })
  }

  const validated = queryValidation.data
  const limit = validated.limit ?? 50
  const offset = validated.offset ?? 0
  const chain = validated.chain || 'all'
  const season = searchParams.get('season') || 'current'
  
  const cacheKey = `chain:${chain}:limit:${limit}:offset:${offset}:season:${season}`
  
  const result = await getCached('viral-leaderboard', cacheKey, async () => {
    const supabase = createClient()
    if (!supabase) throw new Error('Database connection failed')
    
    // LAYER 2: Supabase - Get viral engagement data (off-chain)
    const query = supabase.from('badge_casts').select('fid, viral_bonus_xp, tier')
    const { data: casts, error } = await query
    
    if (error) {
      console.error('[Viral Leaderboard] Database error:', error)
      throw new Error('Failed to fetch leaderboard')
    }
    
    if (!casts || casts.length === 0) {
      return { leaderboard: [], totalUsers: 0, chain, season, message: 'No viral casts found yet.' }
    }
    
    // LAYER 3: Calculated - Aggregate viral stats per user
    const fidStats = new Map<number, { totalXp: number; castCount: number; topTier: string }>()
    
    casts.forEach(cast => {
      const fid = cast.fid
      const xp = (cast as any).viral_bonus_xp || 0
      const tier = (cast as any).tier || 'common'
      
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
    
    // Sort by viral points and paginate
    const sortedEntries = Array.from(fidStats.entries())
      .map(([fid, stats]) => ({ fid, viralPoints: stats.totalXp, viralCasts: stats.castCount, topTier: stats.topTier }))
      .sort((a, b) => b.viralPoints - a.viralPoints)
      .slice(offset, offset + limit)
    
    // Get FIDs for profile lookup
    const fids = sortedEntries.map(e => e.fid)
    
    // LAYER 2: Supabase - Get user profiles for enrichment
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('fid, display_name, avatar_url, verified_addresses')
      .in('fid', fids)
    
    const profileMap = new Map(profiles?.map(p => [p.fid, p]) || [])
    
    // LAYER 1: Subsquid - Get on-chain stats for each user
    const onChainStatsPromises = sortedEntries.map(async (entry) => {
      const profile = profileMap.get(entry.fid)
      if (!profile?.verified_addresses?.[0]) return null
      
      try {
        const stats = await getLeaderboardEntry(profile.verified_addresses[0])
        return { fid: entry.fid, stats }
      } catch (error) {
        console.error(`Failed to get stats for FID ${entry.fid}:`, error)
        return null
      }
    })
    
    const onChainResults = await Promise.all(onChainStatsPromises)
    const onChainMap = new Map(
      onChainResults
        .filter((r): r is { fid: number; stats: any } => r !== null && r.stats !== null)
        .map(r => [r.fid, r.stats])
    )
    
    const tierEmojis: Record<string, string> = { mythic: '👑', legendary: '🌟', epic: '⚡', rare: '💎', common: '🎖️' }
    
    // LAYER 3: Calculated - Merge all layers and calculate derived stats
    const leaderboard: LeaderboardEntry[] = await Promise.all(sortedEntries.map(async (entry, index) => {
      const profile = profileMap.get(entry.fid)
      const onChainStats = onChainMap.get(entry.fid)
      
      // Calculate total score (blockchain + viral points)
      const pointsBalance = onChainStats?.totalXp || 0
      const totalScore = pointsBalance + entry.viralPoints
      
      // Phase 9.3: Fetch on-chain level/rank from ScoringModule contract
      let levelData: any
      let rankTier: any
      
      if (profile?.verified_addresses?.[0]) {
        try {
          const contractStats = await getUserStatsOnChain(profile.verified_addresses[0])
          const levelProgress = await getLevelProgressOnChain(profile.verified_addresses[0])
          
          levelData = {
            level: contractStats.level,
            levelPercent: levelProgress.progressPercent / 100,
            xpToNextLevel: Number(levelProgress.xpToNextLevel),
          }
          
          rankTier = { name: getRankName(contractStats.rankTier) }
        } catch (error) {
          // Fallback to offline calculations
          levelData = calculateLevelProgress(totalScore)
          rankTier = getRankTierByPoints(totalScore)
        }
      } else {
        // No verified address, use offline calculations
        levelData = calculateLevelProgress(totalScore)
        rankTier = getRankTierByPoints(totalScore)
      }
      
      return {
        rank: offset + index + 1,
        fid: entry.fid,
        username: null, // Not in user_profiles schema
        displayName: profile?.display_name || null,
        pfpUrl: profile?.avatar_url || null,
        viralPoints: entry.viralPoints,
        viralCasts: entry.viralCasts,
        topTier: entry.topTier,
        topTierEmoji: tierEmojis[entry.topTier] || '🎖️',
        // On-chain stats
        pointsBalance,
        totalScore,
        level: levelData.level,
        rankTier: rankTier.name,
        globalRank: onChainStats?.rank || null,
      }
    }))
    
    return { leaderboard, totalUsers: fidStats.size, hasMore: offset + limit < fidStats.size, chain, season }
  }, { ttl: 180 })

  const response = NextResponse.json(result)
  response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=240')
  return response
}))

// Phase 9.3: Helper function for rank tier name mapping
function getRankName(tierIndex: number): string {
  const names = ['Cadet', 'Pilot', 'Captain', 'Commander', 'Star Admiral', 'Galaxy Marshal', 'Cosmic Ace', 'Nebula Lord', 'Stellar Emperor', 'Void Sovereign', 'Astral Titan', 'Cosmic Legend']
  return names[tierIndex] || 'Unknown'
}
