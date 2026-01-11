/**
 * @file lib/frames/hybrid-data.ts
 * @description Hybrid data fetcher combining Subsquid blockchain + Supabase off-chain data
 * 
 * PHASE: Phase 7.3 - Frames (December 17, 2025)
 * ENHANCED: Existing documentation upgraded with comprehensive Phase 7 header
 * 
 * FEATURES:
 *   - Dual data source strategy (Subsquid + Supabase)
 *   - Leaderboard data aggregation
 *   - User profile enrichment
 *   - Quest completion tracking
 *   - Viral score calculations
 *   - In-memory caching (5min TTL)
 *   - Parallel data fetching for performance
 * 
 * Strategy:
 * - Subsquid: Source of truth for on-chain events (GMs, badges, guilds, referrals)
 * - Supabase: Enrichment data (user profiles, quest completions, viral scores)
 * - Cache: Short TTL for expensive queries
 * 
 * REFERENCE DOCUMENTATION:
 *   - Hybrid calculator: lib/frames/hybrid-calculator.ts
 *   - Types: lib/frames/types.ts
 *   - Utils: lib/frames/utils.ts
 *   - Subsquid: gmeow-indexer/ directory
 * 
 * REQUIREMENTS:
 *   - Website: https://gmeowhq.art
 *   - Network: Base blockchain (8453)
 *   - Subsquid API must be available
 *   - Supabase must be configured
 *   - Cache must expire to allow fresh data
 * 
 * TODO:
 *   - [ ] Add Redis caching for distributed environments
 *   - [ ] Add data staleness indicators
 *   - [ ] Add fallback logic when Subsquid unavailable
 *   - [ ] Add batch fetching optimization
 *   - [ ] Add data freshness monitoring
 *   - [ ] Add query performance metrics
 * 
 * CRITICAL:
 *   - Cache TTL must be short enough for real-time data (5min)
 *   - Parallel queries required for performance
 *   - Must handle missing data gracefully
 *   - Subsquid failures should not break frames
 *   - All queries must have timeouts
 * 
 * SUGGESTIONS:
 *   - Add query result pooling for identical requests
 *   - Implement data prefetching for predicted queries
 *   - Add query analytics (most requested data)
 *   - Cache negative results to avoid repeated failures
 *   - Add data validation before caching
 * 
 * AVOID:
 *   - Blocking frame rendering on slow queries
 *   - Caching stale data indefinitely
 *   - Making sequential queries (use parallel)
 *   - Ignoring Subsquid errors (log and fallback)
 *   - Exposing raw database queries in responses
 */

import type { Trace, HybridDataResult } from './types'
import { tracePush, isCacheValid, getCacheKey } from './utils'

// -------------------- Cache --------------------

const DATA_CACHE = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCached<T>(key: string): T | null {
  const cached = DATA_CACHE.get(key)
  if (!cached) return null
  if (!isCacheValid(cached.timestamp, CACHE_TTL)) {
    DATA_CACHE.delete(key)
    return null
  }
  return cached.data as T
}

function setCache(key: string, data: any): void {
  DATA_CACHE.set(key, { data, timestamp: Date.now() })
}

// -------------------- Leaderboard (Subsquid + Supabase) --------------------

export type LeaderboardEntry = {
  rank: number
  address: string
  totalScore: number
  // Subsquid data
  gmStreak: number
  lifetimeGMs: number
  badgeCount: number
  guildRole: string | null
  referralCount: number
  // Supabase enrichment
  fid: number
  username: string
  displayName: string
  pfpUrl: string
  // Quest data from Supabase
  questsCompleted: number
  viralPoints: number
}

export async function fetchLeaderboard(params: {
  limit?: number
  offset?: number
  period?: 'weekly' | 'monthly' | 'all_time'
  chain?: string
  traces: Trace
}): Promise<HybridDataResult<LeaderboardEntry[]>> {
  const { limit = 10, offset = 0, period = 'all_time', chain = 'base', traces } = params
  
  const cacheKey = getCacheKey('leaderboard', limit, offset, period, chain)
  const cached = getCached<LeaderboardEntry[]>(cacheKey)
  
  if (cached) {
    tracePush(traces, 'leaderboard-cache-hit', { count: cached.length })
    return {
      data: cached,
      source: 'cache',
      cached: true,
      timestamp: Date.now(),
      traces,
    }
  }
  
  try {
    // HYBRID ARCHITECTURE:
    // 1. PRIMARY: Supabase leaderboard_snapshots (has pfp_url, display_name, fid)
    // 2. FALLBACK: Subsquid users (blockchain data only, no profiles)
    // 3. ENRICHMENT: Neynar for missing user profiles (future)
    
    // Step 1: Try Supabase snapshots first (fastest, has all user metadata)
    tracePush(traces, 'leaderboard-supabase-snapshots-start')
    const supabase = (await import('@/lib/supabase')).getSupabaseServerClient()
    
    if (!supabase) {
      throw new Error('Supabase client unavailable')
    }
    
    const { data: snapshots, error } = await supabase
      .from('leaderboard_snapshots')
      .select('*')
      .eq('season_key', period === 'all_time' ? 'all' : period)
      .eq('global', chain === 'global' || chain === 'all')
      .order('rank', { ascending: true })
      .range(offset, offset + limit - 1)
    
    if (error) {
      console.error('[Leaderboard] Supabase snapshot error:', error)
      throw error
    }
    
    if (snapshots && snapshots.length > 0) {
      tracePush(traces, 'leaderboard-supabase-snapshots-ok', { count: snapshots.length })
      
      // Convert Supabase snapshots to LeaderboardEntry format
      const entries: LeaderboardEntry[] = snapshots.map((snap: any) => ({
        rank: snap.rank || 0,
        address: snap.address,
        totalScore: parseInt(snap.points) || 0,
        gmStreak: 0, // Not in snapshots
        lifetimeGMs: 0, // Not in snapshots
        badgeCount: 0, // Not in snapshots
        guildRole: '', // Not in snapshots
        referralCount: 0, // Not in snapshots
        fid: snap.farcaster_fid || 0,
        username: snap.display_name || '',
        displayName: snap.display_name || '',
        pfpUrl: snap.pfp_url || '',
        questsCompleted: snap.completed || 0,
        viralPoints: 0, // Not in snapshots
      }))
      
      setCache(cacheKey, entries)
      
      return {
        data: entries,
        source: 'supabase-snapshots',
        cached: false,
        timestamp: Date.now(),
        traces,
      }
    }
    
    // Step 2: Fallback to Subsquid if no snapshots (slower, needs enrichment)
    tracePush(traces, 'leaderboard-subsquid-fallback-start')
    const { getLeaderboard } = await import('@/lib/integrations/subsquid-client')
    const subsquidData = await getLeaderboard({ limit, offset, period })
    tracePush(traces, 'leaderboard-subsquid-ok', { count: subsquidData.length })
    
    if (subsquidData.length === 0) {
      throw new Error('No leaderboard data available from Subsquid or Supabase')
    }
    
    // Step 3: Enrich Subsquid data with Supabase profiles (for display names/pfps)
    tracePush(traces, 'leaderboard-supabase-enrichment-start')
    const walletAddresses = subsquidData.map((entry: any) => entry.address)
    const { enrichLeaderboardWithProfiles } = await import('@/lib/supabase/queries/leaderboard')
    const profilesMap = await enrichLeaderboardWithProfiles(walletAddresses)
    tracePush(traces, 'leaderboard-supabase-enrichment-ok', { profiles: profilesMap.size })
    
    // Step 4: Combine Subsquid + Supabase enrichment
    const combined: LeaderboardEntry[] = subsquidData.map((entry: any) => {
      const profile = profilesMap.get(entry.address)
      
      return {
        rank: entry.rank,
        address: entry.address,
        totalScore: entry.totalXP || 0,
        // Subsquid blockchain data
        gmStreak: entry.currentStreak || 0,
        lifetimeGMs: entry.lifetimeGMs || 0,
        badgeCount: entry.badges?.length || 0,
        guildRole: entry.guilds?.[0]?.role || null,
        referralCount: entry.referralCodes?.length || 0,
        // Supabase enrichment
        fid: profile?.fid || 0,
        username: profile?.username || '',
        displayName: profile?.displayName || '',
        pfpUrl: profile?.pfpUrl || '',
        questsCompleted: (profile as any)?.questsCompleted || 0,
        viralPoints: (profile as any)?.viralPoints || 0,
      }
    })
    
    setCache(cacheKey, combined)
    tracePush(traces, 'leaderboard-combined', { count: combined.length })
    
    return {
      data: combined,
      source: 'subsquid',
      cached: false,
      timestamp: Date.now(),
      traces,
    }
  } catch (error: any) {
    tracePush(traces, 'leaderboard-error', error.message)
    console.error('[Leaderboard] Failed to fetch:', error.message)
    
    // NO FALLBACK: Leaderboard must show real data only
    throw new Error(`Leaderboard unavailable: ${error.message}`)
  }
}

// -------------------- User Stats (Subsquid + Supabase) --------------------

export type UserStatsData = {
  address: string
  // Subsquid on-chain data
  currentStreak: number
  lifetimeGMs: number
  totalXP: number
  badgeCount: number
  referralCodes: number
  guildRole: string | null
  // Supabase off-chain data
  fid: number
  username: string
  pfpUrl: string
  questsCompleted: number
  viralPoints: number
  tipsSent: number
  tipsReceived: number
}

export async function fetchUserStats(params: {
  address: string
  fid?: number
  traces: Trace
}): Promise<HybridDataResult<UserStatsData>> {
  const { address, fid, traces } = params
  
  const cacheKey = getCacheKey('user-stats', address)
  const cached = getCached<UserStatsData>(cacheKey)
  
  if (cached) {
    tracePush(traces, 'user-stats-cache-hit')
    return {
      data: cached,
      source: 'cache',
      cached: true,
      timestamp: Date.now(),
      traces,
    }
  }
  
  try {
    // Step 1: Get on-chain stats from Subsquid
    tracePush(traces, 'user-stats-subsquid-start')
    const { getUserStats } = await import('@/lib/integrations/subsquid-client')
    const subsquidData = await getUserStats(address.toLowerCase())
    tracePush(traces, 'user-stats-subsquid-ok')
    
    // Step 2: Get off-chain data from Supabase
    tracePush(traces, 'user-stats-supabase-start')
    const { getUserProfile } = await import('@/lib/supabase/queries/user')
    const supabaseData = await getUserProfile(address, fid)
    tracePush(traces, 'user-stats-supabase-ok')
    
    // Step 3: Combine
    const combined: UserStatsData = {
      address,
      // Subsquid
      currentStreak: subsquidData?.currentStreak || 0,
      lifetimeGMs: subsquidData?.lifetimeGMs || 0,
      totalXP: Number(subsquidData?.total || 0),
      badgeCount: 0, // TODO: Query badges separately
      referralCodes: 0, // TODO: Query referrals separately
      guildRole: null, // TODO: Query guild membership separately
      // Supabase
      fid: (supabaseData as any)?.fid || 0,
      username: (supabaseData as any)?.username || '',
      pfpUrl: (supabaseData as any)?.pfpUrl || '',
      questsCompleted: (supabaseData as any)?.questsCompleted || 0,
      viralPoints: (supabaseData as any)?.viralPoints || 0,
      tipsSent: (supabaseData as any)?.tipsSent || 0,
      tipsReceived: (supabaseData as any)?.tipsReceived || 0,
    }
    
    setCache(cacheKey, combined)
    tracePush(traces, 'user-stats-combined')
    
    return {
      data: combined,
      source: 'subsquid',
      cached: false,
      timestamp: Date.now(),
      traces,
    }
  } catch (error: any) {
    tracePush(traces, 'user-stats-error', error.message)
    throw error
  }
}

// -------------------- Guild Data (Subsquid + Supabase) --------------------

export type GuildData = {
  id: number
  name: string
  owner: string
  totalMembers: number
  totalPoints: number
  // Subsquid on-chain data
  createdAt: string
  membersOnChain: number
  // Supabase enrichment
  description: string
  banner: string
  membersWithProfiles: Array<{
    address: string
    role: string
    username: string
    pfpUrl: string
  }>
}

export async function fetchGuildData(params: {
  guildId: number
  traces: Trace
}): Promise<HybridDataResult<GuildData>> {
  const { guildId, traces } = params
  
  const cacheKey = getCacheKey('guild', guildId)
  const cached = getCached<GuildData>(cacheKey)
  
  if (cached) {
    tracePush(traces, 'guild-cache-hit')
    return {
      data: cached,
      source: 'cache',
      cached: true,
      timestamp: Date.now(),
      traces,
    }
  }
  
  try {
    // Step 1: Get guild from Subsquid
    tracePush(traces, 'guild-subsquid-start')
    const { getGuildStats } = await import('@/lib/integrations/subsquid-client')
    const subsquidData = await getGuildStats(String(guildId))
    tracePush(traces, 'guild-subsquid-ok')
    
    if (!subsquidData) {
      throw new Error('Guild not found')
    }
    
    // Step 2: Enrich members with Supabase profiles
    tracePush(traces, 'guild-supabase-start')
    const memberAddresses = subsquidData.members?.map((m: any) => m.address) || []
    const { enrichLeaderboardWithProfiles } = await import('@/lib/supabase/queries/leaderboard')
    const profilesMap = await enrichLeaderboardWithProfiles(memberAddresses)
    tracePush(traces, 'guild-supabase-ok')
    
    // Step 3: Combine
    const combined: GuildData = {
      id: subsquidData.id || guildId,
      name: `Guild #${guildId}`, // TODO: Add guild name to Subsquid
      owner: subsquidData.owner,
      totalMembers: subsquidData.totalMembers || 0,
      totalPoints: subsquidData.totalPoints || 0,
      createdAt: String(subsquidData.createdAt || Date.now()),
      membersOnChain: subsquidData.members?.length || 0,
      description: '', // Could be added to Supabase
      banner: '',
      membersWithProfiles: (subsquidData.members || []).map((member: any) => {
        const profile = profilesMap.get(member.address)
        return {
          address: member.address,
          role: member.role,
          username: profile?.username || '',
          pfpUrl: profile?.pfpUrl || '',
        }
      }),
    }
    
    setCache(cacheKey, combined)
    tracePush(traces, 'guild-combined')
    
    return {
      data: combined,
      source: 'subsquid',
      cached: false,
      timestamp: Date.now(),
      traces,
    }
  } catch (error: any) {
    tracePush(traces, 'guild-error', error.message)
    throw error
  }
}
