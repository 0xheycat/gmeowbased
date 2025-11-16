import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Viral XP Leaderboard API
 * 
 * Get top users by viral engagement XP earned.
 * 
 * Quality Gates Applied:
 * - GI-11: Input validation, pagination, safe queries
 * - GI-13: Clear leaderboard structure with ranks
 * 
 * Route: GET /api/viral/leaderboard?limit=50&chain=base&season=current
 */

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // GI-11: Input validation with defaults
    const limitParam = searchParams.get('limit') || '50'
    const limit = Math.min(Math.max(1, parseInt(limitParam, 10) || 50), 100) // Max 100
    
    const chain = searchParams.get('chain') || 'all'
    const season = searchParams.get('season') || 'current'
    
    const supabase = getSupabaseServerClient()
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Internal Error', message: 'Database connection failed' },
        { status: 500 }
      )
    }
    
    // GI-11: Build query with filters
    const query = supabase
      .from('badge_casts')
      .select('fid, viral_bonus_xp, tier')
    
    // Filter by chain if specified
    if (chain !== 'all') {
      // Note: badge_casts doesn't have chain column directly
      // Would need to join with user_badges table in production
      // For now, return all chains
    }
    
    const { data: casts, error } = await query
    
    if (error) {
      console.error('[Viral Leaderboard] Database error:', error)
      return NextResponse.json(
        { error: 'Internal Error', message: 'Failed to fetch leaderboard' },
        { status: 500 }
      )
    }
    
    if (!casts || casts.length === 0) {
      // GI-13: Return empty leaderboard with helpful message
      return NextResponse.json({
        leaderboard: [],
        totalUsers: 0,
        chain,
        season,
        message: 'No viral casts found yet. Be the first to share a badge!',
      })
    }
    
    // Aggregate viral XP by FID
    const fidStats = new Map<number, {
      totalXp: number
      castCount: number
      topTier: string
    }>()
    
    casts.forEach(cast => {
      const fid = cast.fid
      const xp = cast.viral_bonus_xp || 0
      const tier = cast.tier || 'common'
      
      if (!fidStats.has(fid)) {
        fidStats.set(fid, {
          totalXp: 0,
          castCount: 0,
          topTier: tier,
        })
      }
      
      const stats = fidStats.get(fid)!
      stats.totalXp += xp
      stats.castCount++
      
      // Track highest tier achieved
      const tierPriority: Record<string, number> = {
        mythic: 5,
        legendary: 4,
        epic: 3,
        rare: 2,
        common: 1,
      }
      
      if ((tierPriority[tier] || 0) > (tierPriority[stats.topTier] || 0)) {
        stats.topTier = tier
      }
    })
    
    // Convert to array and sort by total XP
    const sortedEntries = Array.from(fidStats.entries())
      .map(([fid, stats]) => ({
        fid,
        totalViralXp: stats.totalXp,
        viralCasts: stats.castCount,
        topTier: stats.topTier,
      }))
      .sort((a, b) => b.totalViralXp - a.totalViralXp)
      .slice(0, limit)
    
    // Fetch user profiles for top entries (would use Neynar bulk API in production)
    const leaderboard: LeaderboardEntry[] = sortedEntries.map((entry, index) => {
      // GI-13: Map tier to emoji
      const tierEmojis: Record<string, string> = {
        mythic: '👑',
        legendary: '🌟',
        epic: '⚡',
        rare: '💎',
        common: '🎖️',
      }
      
      return {
        rank: index + 1,
        fid: entry.fid,
        username: null, // Would fetch from Neynar
        displayName: null,
        pfpUrl: null,
        totalViralXp: entry.totalViralXp,
        viralCasts: entry.viralCasts,
        topTier: entry.topTier,
        topTierEmoji: tierEmojis[entry.topTier] || '🎖️',
      }
    })
    
    // GI-13: Return structured leaderboard response
    return NextResponse.json({
      leaderboard,
      totalUsers: fidStats.size,
      chain,
      season,
      limit,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Viral Leaderboard] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal Error', message: 'Failed to process request' },
      { status: 500 }
    )
  }
}
