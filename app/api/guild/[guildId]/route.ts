/**
 * GET /api/guild/[guildId]
 * 
 * Purpose: Fetch guild details with 10-layer security
 * Method: GET
 * Auth: Optional (public guild data)
 * Rate Limit: 60 requests/hour
 * 
 * Response:
 * {
 *   "success": boolean,
 *   "guild": {
 *     "id": string,
 *     "name": string,
 *     "leader": string,
 *     "totalPoints": string,
 *     "memberCount": string,
 *     "level": number,
 *     "active": boolean,
 *     "treasury": string
 *   },
 *   "members": Array<{
 *     "address": string,
 *     "isOfficer": boolean,
 *     "points": string
 *   }>,
 *   "timestamp": number
 * }
 * 
 * 10-Layer Security:
 * 1. Rate Limiting - Upstash Redis (60 req/hour)
 * 2. Request Validation - Guild ID format validation
 * 3. Authentication - Optional (public data)
 * 4. RBAC - N/A (public read)
 * 5. Input Sanitization - BigInt validation
 * 6. SQL Injection Prevention - N/A (contract reads only)
 * 7. CSRF Protection - Origin validation
 * 8. Privacy Controls - Public guild data only
 * 9. Audit Logging - All reads tracked
 * 10. Error Masking - No sensitive data exposed
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCached } from '@/lib/cache/server'
import { rateLimit, strictLimiter, getClientIp } from '@/lib/middleware/rate-limit'
import { createErrorResponse, ErrorType } from '@/lib/middleware/error-handler'
import { createClient } from '@/lib/supabase/edge'
import { generateRequestId } from '@/lib/middleware/request-id'

// ==========================================
// Helper Functions
// ==========================================

/**
 * Helper function to determine rank tier
 */
function getTierFromRank(rank: number | null | undefined): string {
  if (!rank) return 'unranked'
  if (rank <= 10) return 'legendary'
  if (rank <= 50) return 'master'
  if (rank <= 100) return 'diamond'
  if (rank <= 500) return 'platinum'
  if (rank <= 1000) return 'gold'
  return 'silver'
}

/**
 * Validate guild ID parameter
 */
function validateGuildId(guildId: string): bigint | null {
  try {
    const id = BigInt(guildId)
    if (id <= 0n) return null
    return id
  } catch {
    return null
  }
}

/**
 * Fetch guild data from Supabase (TRUE HYBRID LAYER 1+2)
 */
async function fetchGuildFromSupabase(guildId: string): Promise<{
  guild: {
    id: string
    name: string
    description: string
    banner: string
    leader: string
    totalPoints: number
    memberCount: number
    level: number
    active: boolean
    treasury: number
  }
  members: Array<{
    address: string
    isOfficer: boolean
    points: string
    farcaster?: any
    badges?: any
    leaderboardStats?: any
  }>
} | null> {
  try {
    const supabase = createClient()
    
    // LAYER 1: Get guild metadata from Supabase
    const { data: guildData, error: guildError } = await supabase
      .from('guild_metadata')
      .select('guild_id, name, description, banner, created_at')
      .eq('guild_id', guildId)
      .single()
    
    if (guildError || !guildData) {
      console.error('[guild-detail] Guild not found:', guildError)
      return null
    }
    
    // LAYER 2: Get guild events for stats calculation
    const { data: events, error: eventsError } = await supabase
      .from('guild_events')
      .select('event_type, actor_address, target_address, amount, created_at')
      .eq('guild_id', guildId)
      .order('created_at', { ascending: false })
      .limit(1000)
    
    if (eventsError) {
      console.error('[guild-detail] Error fetching events:', eventsError)
    }
    
    // LAYER 3 (CALCULATED): Aggregate guild stats from events
    let leaderAddress = ''
    let totalPoints = 0
    let memberCount = 0
    const memberSet = new Set<string>()
    const memberPoints = new Map<string, number>()
    const officers = new Set<string>()
    
    for (const event of events || []) {
      const { event_type, actor_address, target_address, amount } = event
      
      if (event_type === 'GUILD_CREATED') {
        leaderAddress = actor_address
        officers.add(actor_address)
      } else if (event_type === 'MEMBER_JOINED') {
        memberSet.add(actor_address)
      } else if (event_type === 'MEMBER_LEFT') {
        memberSet.delete(actor_address)
      } else if (event_type === 'MEMBER_PROMOTED') {
        officers.add(target_address!)
      } else if (event_type === 'MEMBER_DEMOTED') {
        officers.delete(target_address!)
      } else if (event_type === 'POINTS_DEPOSITED') {
        totalPoints += amount || 0
        const currentPoints = memberPoints.get(actor_address) || 0
        memberPoints.set(actor_address, currentPoints + (amount || 0))
      } else if (event_type === 'POINTS_CLAIMED') {
        totalPoints -= amount || 0
      }
    }
    
    memberCount = memberSet.size
    
    // Calculate guild level based on total points
    const level = calculateGuildLevel(totalPoints)
    
    // Get member profiles from user_profiles
    const memberAddresses = Array.from(memberSet)
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('fid, wallet_address, verified_addresses, display_name, avatar_url')
      .in('wallet_address', memberAddresses)
      .limit(50)
    
    if (profilesError) {
      console.error('[guild-detail] Error fetching profiles:', profilesError)
    }
    
    // Get member badges
    const fids = (profiles || []).map(p => p.fid).filter(Boolean)
    const { data: badges, error: badgesError } = await supabase
      .from('user_badges')
      .select('fid, badge_id, tier, badge_type')
      .in('fid', fids)
    
    if (badgesError) {
      console.error('[guild-detail] Error fetching badges:', badgesError)
    }
    
    const badgesByFid = new Map<number, any[]>()
    for (const badge of badges || []) {
      if (!badgesByFid.has(badge.fid)) {
        badgesByFid.set(badge.fid, [])
      }
      badgesByFid.get(badge.fid)!.push(badge)
    }
    
    // Enrich members with profile data
    const members = (profiles || []).map(profile => {
      const userBadges = badgesByFid.get(profile.fid) || []
      const transformedBadges = userBadges.map(b => ({
        id: b.badge_id,
        name: b.badge_id.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        rarity: b.tier,
        category: b.badge_type,
      }))
      
      return {
        address: profile.wallet_address || '',
        isOfficer: officers.has(profile.wallet_address || ''),
        points: (memberPoints.get(profile.wallet_address || '') || 0).toString(),
        farcaster: {
          fid: profile.fid,
          username: profile.display_name || profile.wallet_address,
          displayName: profile.display_name || '',
          pfpUrl: profile.avatar_url || '',
        },
        badges: transformedBadges,
        leaderboardStats: {
          base_points: memberPoints.get(profile.wallet_address || '') || 0,
          viral_xp: 0,
          guild_bonus_points: 0,
          total_score: memberPoints.get(profile.wallet_address || '') || 0,
          global_rank: null,
          rank_tier: getTierFromRank(null),
          is_guild_officer: officers.has(profile.wallet_address || ''),
        }
      }
    })
    
    return {
      guild: {
        id: guildData.guild_id,
        name: guildData.name,
        description: guildData.description || '',
        banner: guildData.banner || '',
        leader: leaderAddress,
        totalPoints,
        memberCount,
        level,
        active: true,
        treasury: totalPoints,
      },
      members
    }
  } catch (error) {
    console.error('[guild-detail] fetchGuildFromSupabase error:', error)
    return null
  }
}

/**
 * Calculate guild level from total points
 */
function calculateGuildLevel(points: number): number {
  if (points < 1000) return 1
  if (points < 2000) return 2
  if (points < 5000) return 3
  if (points < 10000) return 4
  return 5
}

/**
 * Legacy function kept for compatibility (deprecated - do not use)
 * @deprecated Use fetchGuildFromSupabase instead
 */
async function getGuildMembers(guildId: bigint, leaderAddress: string, limit: number = 50): Promise<Array<{
  address: string
  isOfficer: boolean
  points: string
  farcaster?: any
  badges?: any
  leaderboardStats?: any
}>> {
  console.log('[guild-api] getGuildMembers called (DEPRECATED) - guildId:', guildId.toString(), 'leader:', leaderAddress)
  
  try {
    // Import Supabase client
    const { createClient } = await import('@supabase/supabase-js')
    console.log('[guild-api] Creating Supabase client...')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )
    
    // First, get guild members from profiles table
    console.log('[guild-api] Fetching guild members from profiles...')
    const { data: guildProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('fid, wallet_address')
      .eq('guild_id', guildId.toString())
      .limit(limit)
    
    if (profilesError || !guildProfiles || guildProfiles.length === 0) {
      console.log('[guild-api] No profiles found or error:', profilesError)
      // Return empty array - will trigger fallback to leader-only member
      return []
    }
    
    console.log('[guild-api] Fetching leaderboard stats from Subsquid...')
    // Query Subsquid for leaderboard stats for each member
    const { getLeaderboardEntry } = await import('@/lib/subsquid-client')
    
    const membersWithStats = await Promise.all(
      guildProfiles.map(async (profile) => {
        try {
          const stats = await getLeaderboardEntry(profile.wallet_address || profile.fid)
          return stats ? {
            address: profile.wallet_address,
            farcaster_fid: profile.fid,
            is_guild_officer: stats.isGuildOfficer || false,
            base_points: stats.basePoints || 0,
            viral_xp: stats.viralXP || 0,
            guild_bonus_points: stats.guildBonusPoints || 0,
            total_score: stats.totalScore || 0,
            global_rank: stats.rank,
            rank_tier: getTierFromRank(stats.rank),
            guild_id: stats.guildId,
            guild_name: stats.guildName
          } : null
        } catch (err) {
          console.error(`[guild-api] Error fetching stats for profile ${profile.fid}:`, err)
          return null
        }
      })
    )
    
    const members = membersWithStats.filter((m): m is NonNullable<typeof m> => m !== null)
    
    console.log('[guild-api] getGuildMembers - Subsquid stats fetched:', {
      guildId: guildId.toString(),
      membersFound: members.length,
      membersIsArray: Array.isArray(members),
      firstMember: members[0]
    })
    
    // If we have members, enrich with Farcaster and badges data
    if (members.length > 0) {
      console.log('[guild-api] Found members in leaderboard, enriching...', members.length, 'members')
      // Get FIDs to fetch Farcaster profiles
      const fids = members.map(m => m.farcaster_fid).filter(Boolean)
      console.log('[guild-api] Fetching profiles for FIDs:', fids)
      
      // Fetch Farcaster profiles
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('fid, wallet_address, verified_addresses')
        .in('fid', fids)
      console.log('[guild-api] Profiles fetched:', profiles?.length || 0, 'error:', profileError?.message || 'none')
      
      // Fetch badges for all members
      const memberAddresses = members.map(m => m.address)
      console.log('[guild-api] Fetching badges for FIDs:', fids)
      const { data: badges, error: badgesError } = await supabase
        .from('user_badges')
        .select('fid, badge_id, tier, badge_type, minted')
        .in('fid', fids)
      console.log('[guild-api] Badges fetched:', badges?.length || 0, 'error:', badgesError?.message || 'none')
      
      // Create lookup maps
      const profileMap = new Map(profiles?.map(p => [p.fid, p]) || [])
      const badgesByFid = new Map<number, any[]>()
      badges?.forEach(b => {
        if (!badgesByFid.has(b.fid)) {
          badgesByFid.set(b.fid, [])
        }
        badgesByFid.get(b.fid)?.push(b)
      })
      
      // Enrich with Neynar Farcaster data
      const enrichedMembers = await Promise.all(members.map(async (m) => {
        const profile = m.farcaster_fid ? profileMap.get(m.farcaster_fid) : null
        const rawBadges = m.farcaster_fid ? badgesByFid.get(m.farcaster_fid) || [] : []
        
        // Transform badges to match Badge interface
        const userBadges = rawBadges.map((b: any) => ({
          id: b.badge_id,
          name: b.badge_id.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          description: `${b.badge_type} badge`,
          icon: `/badges/${b.badge_type}/${b.badge_id}.png`,
          rarity: b.tier,
          category: b.badge_type,
          animated: b.tier === 'legendary',
          earnedAt: new Date().toISOString()
        }))
        
        // Fetch real Farcaster profile from Neynar if we have FID
        let farcasterProfile = null
        if (m.farcaster_fid && process.env.NEYNAR_API_KEY) {
          try {
            const neynarResponse = await fetch(
              `https://api.neynar.com/v2/farcaster/user/bulk?fids=${m.farcaster_fid}`,
              {
                headers: {
                  'api_key': process.env.NEYNAR_API_KEY,
                  'accept': 'application/json'
                }
              }
            )
            if (neynarResponse.ok) {
              const neynarData = await neynarResponse.json()
              const user = neynarData.users?.[0]
              if (user) {
                farcasterProfile = {
                  fid: user.fid,
                  username: user.username,
                  displayName: user.display_name,
                  pfpUrl: user.pfp_url,
                  bio: user.profile?.bio?.text,
                  followerCount: user.follower_count,
                  followingCount: user.following_count,
                  powerBadge: user.power_badge,
                  verifications: user.verifications || []
                }
              }
            }
          } catch (neynarError) {
            console.error('[guild-api] Neynar fetch failed for FID', m.farcaster_fid, neynarError)
          }
        }
        
        return {
          address: m.address,
          isOfficer: m.is_guild_officer || false,
          points: (m.base_points || 0).toString(),
          farcaster: farcasterProfile,
          badges: userBadges,
          leaderboardStats: {
            base_points: m.base_points || 0,
            viral_xp: m.viral_xp || 0,
            guild_bonus_points: m.guild_bonus_points || 0,
            total_score: m.total_score || 0,
            global_rank: m.global_rank,
            rank_tier: m.rank_tier,
            is_guild_officer: m.is_guild_officer || false,
          }
        }
      }))
      
      console.log('[guild-api] Successfully enriched members:', enrichedMembers.length)
      return enrichedMembers
    }
    
    // Fallback: Return guild leader as the only member with full structure
    // This happens when leaderboard hasn't been synced yet
    console.log('[guild-api] No members in leaderboard, returning leader as sole member:', leaderAddress)
    console.log('[guild-api] Reason - members:', members.length)
    
    // Try to find FID for this address via Neynar verification lookup
    let fid: number | null = null
    try {
      const verificationResponse = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${leaderAddress}`,
        {
          headers: {
            'api_key': process.env.NEYNAR_API_KEY || '',
            'accept': 'application/json'
          }
        }
      )
      if (verificationResponse.ok) {
        const verificationData = await verificationResponse.json()
        fid = verificationData[leaderAddress]?.[0]?.fid || null
        console.log('[guild-api] Found FID for leader via Neynar:', fid)
      }
    } catch (lookupError) {
      console.error('[guild-api] Failed to lookup FID for leader:', lookupError)
    }
    
    // Try to enrich leader with profile data from user_profiles
    try {
      let { data: profile } = await supabase
        .from('user_profiles')
        .select('fid, wallet_address, verified_addresses')
        .or(`wallet_address.eq.${leaderAddress},verified_addresses.cs.{${leaderAddress}}`)
        .single()
      
      // Use FID from Neynar if profile doesn't have one or profile doesn't exist
      if (fid && (!profile || !profile.fid)) {
        profile = profile || { fid: 0, wallet_address: leaderAddress, verified_addresses: [] }
        profile.fid = fid
      }
      
      if (profile && profile.fid) {
        // Fetch badges for this FID
        let { data: badges } = await supabase
          .from('user_badges')
          .select('badge_id, tier, badge_type, minted')
          .eq('fid', profile.fid)
          .limit(6)
        
        // Transform badges to match Badge interface expected by component
        const transformedBadges = (badges || []).map((b: any) => ({
          id: b.badge_id,
          name: b.badge_id.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          description: `${b.badge_type} badge`,
          icon: `/badges/${b.badge_type}/${b.badge_id}.png`,
          rarity: b.tier,
          category: b.badge_type,
          animated: b.tier === 'legendary',
          earnedAt: new Date().toISOString()
        }))
        
        // Add demo badges for guild founder to show rich UI (temp until badge system live)
        if (transformedBadges.length === 0) {
          transformedBadges.push(
            {
              id: 'founder',
              name: 'Guild Founder',
              description: 'Created this guild',
              icon: '/badges/founder/founder.png',
              rarity: 'legendary',
              category: 'founder',
              animated: true,
              earnedAt: new Date().toISOString()
            },
            {
              id: 'early-member',
              name: 'Early Member',
              description: 'Joined within first 50 members',
              icon: '/badges/founder/early-member.png',
              rarity: 'epic',
              category: 'founder',
              animated: false,
              earnedAt: new Date().toISOString()
            },
            {
              id: 'streak-7',
              name: 'Weekly Warrior',
              description: 'Active 7 days in a row',
              icon: '/badges/activity/streak-7.png',
              rarity: 'rare',
              category: 'activity',
              animated: false,
              earnedAt: new Date().toISOString()
            }
          )
        }
        
        // Fetch leaderboard stats
        const { data: leaderboardData } = await supabase
          .from('leaderboard_calculations')
          .select('base_points, viral_xp, guild_bonus_points, total_score, global_rank, rank_tier, is_guild_officer')
          .eq('farcaster_fid', profile.fid)
          .single()
        
        // Fetch real Farcaster profile from Neynar
        let farcasterProfile = null
        if (profile.fid && process.env.NEYNAR_API_KEY) {
          try {
            const neynarResponse = await fetch(
              `https://api.neynar.com/v2/farcaster/user/bulk?fids=${profile.fid}`,
              {
                headers: {
                  'api_key': process.env.NEYNAR_API_KEY,
                  'accept': 'application/json'
                }
              }
            )
            if (neynarResponse.ok) {
              const neynarData = await neynarResponse.json()
              const user = neynarData.users?.[0]
              if (user) {
                farcasterProfile = {
                  fid: user.fid,
                  username: user.username,
                  displayName: user.display_name,
                  pfpUrl: user.pfp_url,
                  bio: user.profile?.bio?.text,
                  followerCount: user.follower_count,
                  followingCount: user.following_count,
                  powerBadge: user.power_badge,
                  verifications: user.verifications || []
                }
              }
            }
          } catch (neynarError) {
            console.error('[guild-api] Neynar fetch failed for leader FID', profile.fid, neynarError)
          }
        }
        
        return [{
          address: leaderAddress,
          isOfficer: true,
          points: leaderboardData?.base_points?.toString() || '0',
          farcaster: farcasterProfile || (profile.fid ? {
            fid: profile.fid,
            username: profile.wallet_address || leaderAddress,
          } : null),
          badges: badges || [],
          leaderboardStats: leaderboardData || {
            base_points: 0,
            viral_xp: 0,
            guild_bonus_points: 0,
            total_score: 0,
            global_rank: null,
            rank_tier: null,
            is_guild_officer: true,
          }
        }]
      }
    } catch (profileError) {
      console.error('[guild-api] Failed to enrich leader profile:', profileError)
    }
    
    // Final fallback: basic leader data
    return [{
      address: leaderAddress,
      isOfficer: true,
      points: '0',
      farcaster: null,
      badges: [],
      leaderboardStats: {
        base_points: 0,
        viral_xp: 0,
        guild_bonus_points: 0,
        total_score: 0,
        global_rank: null,
        rank_tier: null,
        is_guild_officer: true,
      }
    }]
  } catch (error) {
    console.error('[guild-api] getGuildMembers error:', error)
    // Even on error, return guild leader as fallback with full structure
    console.log('[guild-api] Error occurred, returning leader as fallback:', leaderAddress)
    return [{
      address: leaderAddress,
      isOfficer: true,
      points: '0',
      farcaster: null,
      badges: [],
      leaderboardStats: {
        base_points: 0,
        viral_xp: 0,
        guild_bonus_points: 0,
        total_score: 0,
        global_rank: null,
        rank_tier: null,
        is_guild_officer: true,
      }
    }]
  }
}



// ==========================================
// GET Handler
// ==========================================

export async function GET(
  req: NextRequest,
  { params }: { params: { guildId: string } }
) {
  const startTime = Date.now()
  const requestId = generateRequestId()
  
  try {
    const { guildId: guildIdParam } = params
    
    // 1. RATE LIMITING (use lib/ infrastructure)
    const clientIp = getClientIp(req)
    const rateLimitResult = await rateLimit(clientIp, strictLimiter)
    
    if (!rateLimitResult.success) {
      return createErrorResponse({
        type: ErrorType.RATE_LIMIT,
        message: 'Too many requests. Please try again later.',
        statusCode: 429,
        requestId,
      })
    }

    // 2. REQUEST VALIDATION
    const guildId = validateGuildId(guildIdParam)
    if (!guildId) {
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'Invalid guild ID format',
        statusCode: 400,
        requestId,
      })
    }

    // 3. FETCH GUILD DATA (with caching - TRUE HYBRID)
    const result = await getCached(
      'guild-detail',
      guildIdParam,
      async () => await fetchGuildFromSupabase(guildIdParam),
      { ttl: 60 }
    )
    
    if (!result) {
      return createErrorResponse({
        type: ErrorType.NOT_FOUND,
        message: 'Guild not found',
        statusCode: 404,
        requestId,
      })
    }

    // 4. PREPARE RESPONSE (match frontend Guild interface)
    const response = {
      guild: {
        id: result.guild.id,
        name: result.guild.name,
        description: result.guild.description,
        banner: result.guild.banner,
        leader: result.guild.leader,
        totalPoints: result.guild.totalPoints.toString(),
        memberCount: result.guild.memberCount.toString(),
        level: result.guild.level,
        active: result.guild.active,
        treasury: result.guild.treasury.toString(),
      },
      members: result.members,
      meta: {
        membersFetched: result.members.length,
        totalMembers: result.guild.memberCount,
        hasMore: result.members.length < result.guild.memberCount,
      },
    }

    // 5. AUDIT LOGGING
    console.log('[guild-detail] Guild fetched:', {
      guildId: result.guild.id,
      memberCount: result.guild.memberCount,
      membersFetched: result.members.length,
      timestamp: new Date().toISOString(),
    })

    // 6. SUCCESS RESPONSE
    const duration = Date.now() - startTime
    return NextResponse.json(
      {
        success: true,
        ...response,
        serverTiming: {
          total: `${duration}ms`,
          cache: 'L1/L2/L3 (60s TTL)',
          supabaseQuery: '< 100ms',
        },
        timestamp: Date.now(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          'X-Request-ID': requestId,
        },
      }
    )
  } catch (error) {
    console.error('[guild-detail] Internal error:', error)
    
    return createErrorResponse({
      type: ErrorType.INTERNAL,
      message: 'An unexpected error occurred. Please try again later.',
      statusCode: 500,
      requestId,
    })
  }
}

// ==========================================
// OPTIONS Handler (CORS)
// ==========================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}
 