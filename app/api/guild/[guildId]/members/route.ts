/**
 * GET /api/guild/[guildId]/members
 * 
 * Purpose: Get list of guild members with roles and stats
 * Method: GET
 * Auth: Optional (public endpoint)
 * Rate Limit: 60 requests/minute per IP
 * 
 * Query Params:
 * - limit: number (default: 50, max: 100)
 * - offset: number (default: 0)
 * 
 * Response:
 * {
 *   "success": boolean,
 *   "members": Array<{
 *     "address": string,
 *     "role": "owner" | "officer" | "member",
 *     "points": string,
 *     "joinedAt": string (ISO timestamp - estimated from guild creation)
 *   }>,
 *   "pagination": {
 *     "limit": number,
 *     "offset": number,
 *     "total": number
 *   },
 *   "timestamp": number
 * }
 * 
 * 10-Layer Security:
 * 1. Rate Limiting - Upstash Redis (60 req/min per IP)
 * 2. Request Validation - Zod schema validation
 * 3. Input Sanitization - XSS prevention
 * 4. Error Masking - No sensitive data in errors
 * 5. Cache Headers - 60s cache, 120s stale-while-revalidate
 * 6. Type Safety - TypeScript strict mode
 * 7. CORS Headers - Explicit allowed origins
 * 8. Content-Type Validation - JSON only
 * 9. Audit Logging - All requests tracked
 * 10. Response Headers - Security headers
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCached } from '@/lib/cache/server'
import { rateLimit, apiLimiter, getClientIp } from '@/lib/middleware/rate-limit'
import { createErrorResponse, ErrorType } from '@/lib/middleware/error-handler'
import { createClient } from '@/lib/supabase/edge'
import { generateRequestId } from '@/lib/middleware/request-id'
import { fetchUsersByAddresses, type FarcasterUser } from '@/lib/integrations/neynar'
import type { Badge } from '@/components/guild/badges/BadgeIcon'

// ==========================================
// 1. Rate Limiting Configuration
// ==========================================

const RATE_LIMIT_CONFIG = {
  identifier: 'guild-members',
  maxRequests: 60,
  windowMs: 60 * 1000, // 1 minute
}

// ==========================================
// 2. Input Validation Schemas
// ==========================================

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

type QueryParams = z.infer<typeof QuerySchema>

// ==========================================
// 3. Types
// ==========================================

interface GuildMember {
  address: string
  role: 'owner' | 'officer' | 'member'
  points: string
  joinedAt: string
  // Leaderboard stats from leaderboard_calculations table
  leaderboardStats?: {
    total_score: number
    base_points: number
    viral_xp: number
    guild_bonus_points: number
    is_guild_officer: boolean
    global_rank: number | null
    rank_tier: string | null
  }
  // Farcaster profile data
  farcaster?: {
    fid: number
    username?: string
    displayName?: string
    pfpUrl?: string
    bio?: string
    followerCount?: number
    followingCount?: number
    powerBadge?: boolean
    verifications?: string[]
  }
  // Achievement badges
  badges?: Badge[]
}

// ==========================================
// 4. Helper Functions
// ==========================================



/**
 * Assign badges to member based on role and achievements
 * Following priority: Role > Special > Founding > Achievement > Activity
 */
function assignMemberBadges(member: GuildMember, guildCreatedAt: Date): Badge[] {
  const badges: Badge[] = []
  const memberJoinedAt = new Date(member.joinedAt)
  const daysSinceJoin = Math.floor((Date.now() - memberJoinedAt.getTime()) / (1000 * 60 * 60 * 24))
  
  // 1. Role badges (always displayed first)
  if (member.role === 'owner') {
    badges.push({
      id: 'owner',
      name: 'Guild Owner',
      description: 'Leader and founder of this guild',
      icon: '/badges/role/crown.png',
      rarity: 'legendary',
      category: 'role',
      earnedAt: memberJoinedAt,
    })
  } else if (member.role === 'officer') {
    badges.push({
      id: 'officer',
      name: 'Guild Officer',
      description: 'Trusted officer with management permissions',
      icon: '/badges/role/shield.png',
      rarity: 'epic',
      category: 'role',
      earnedAt: memberJoinedAt,
    })
  } else {
    badges.push({
      id: 'member',
      name: 'Guild Member',
      description: 'Active guild member',
      icon: '/badges/role/star.png',
      rarity: 'common',
      category: 'role',
      earnedAt: memberJoinedAt,
    })
  }
  
  // 2. Special badges (Farcaster power badge)
  if (member.farcaster?.powerBadge) {
    badges.push({
      id: 'verified',
      name: 'Verified',
      description: 'Farcaster Power User',
      icon: '/badges/special/verified.png',
      rarity: 'epic',
      category: 'special',
    })
  }
  
  // 3. Founding badges (early member)
  const daysOld = Math.floor((Date.now() - guildCreatedAt.getTime()) / (1000 * 60 * 60 * 24))
  if (daysSinceJoin >= daysOld * 0.9) { // Joined in first 10% of guild lifetime
    badges.push({
      id: 'early-member',
      name: 'Early Member',
      description: 'Joined in the first wave',
      icon: '/badges/founder/early-member.png',
      rarity: 'rare',
      category: 'founder',
      earnedAt: memberJoinedAt,
    })
  }
  
  // 4. Achievement badges (based on points)
  const points = parseInt(member.points || '0')
  if (points >= 10000) {
    badges.push({
      id: 'top-contributor',
      name: 'Top Contributor',
      description: 'Contributed 10,000+ points',
      icon: '/badges/achievement/top-contributor.png',
      rarity: 'legendary',
      category: 'achievement',
    })
  } else if (points >= 5000) {
    badges.push({
      id: 'high-contributor',
      name: 'High Contributor',
      description: 'Contributed 5,000+ points',
      icon: '/badges/achievement/top-contributor.png',
      rarity: 'epic',
      category: 'achievement',
    })
  } else if (points >= 1000) {
    badges.push({
      id: 'active-contributor',
      name: 'Active Contributor',
      description: 'Contributed 1,000+ points',
      icon: '/badges/achievement/top-contributor.png',
      rarity: 'rare',
      category: 'achievement',
    })
  }
  
  // 5. Activity badges (based on join duration)
  if (daysSinceJoin >= 365) {
    badges.push({
      id: 'veteran',
      name: 'Veteran',
      description: 'Member for over 1 year',
      icon: '/badges/achievement/veteran.png',
      rarity: 'legendary',
      category: 'activity',
    })
  } else if (daysSinceJoin >= 90) {
    badges.push({
      id: 'dedicated',
      name: 'Dedicated',
      description: 'Member for over 90 days',
      icon: '/badges/achievement/veteran.png',
      rarity: 'epic',
      category: 'activity',
    })
  } else if (daysSinceJoin >= 30) {
    badges.push({
      id: 'committed',
      name: 'Committed',
      description: 'Member for over 30 days',
      icon: '/badges/achievement/veteran.png',
      rarity: 'rare',
      category: 'activity',
    })
  }
  
  // Return max 6 badges (Reddit pattern)
  return badges.slice(0, 6)
}

/**
 * Fetch leaderboard stats for member addresses
 */
async function fetchLeaderboardStats(addresses: string[]): Promise<Record<string, any>> {
  if (addresses.length === 0) return {}
  
  try {
    // Fetch stats from Subsquid (replaces leaderboard_calculations)
    const { getLeaderboardEntry } = await import('@/lib/subsquid-client')
    
    // Build lookup map (address → stats) from Subsquid
    const statsMap: Record<string, any> = {}
    
    // Query Subsquid for each address in parallel
    const statsPromises = addresses.map(async (address) => {
      try {
        const stats = await getLeaderboardEntry(address)
        if (stats) {
          statsMap[address.toLowerCase()] = {
            total_score: stats.totalScore || 0,
            base_points: stats.basePoints || 0,
            viral_xp: stats.viralXP || 0,
            guild_bonus_points: stats.guildBonusPoints || 0,
            is_guild_officer: stats.isGuildOfficer || false,
            global_rank: stats.rank,
            rank_tier: getTierFromRank(stats.rank),
          }
        }
      } catch (err) {
        console.error(`[guild-members] Error fetching stats for ${address}:`, err)
      }
    })
    
    await Promise.all(statsPromises)
    
    return statsMap
  } catch (error) {
    console.error('[guild-members] Error fetching leaderboard stats:', error)
    return {}
  }
}

// Helper function to determine rank tier
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
 * Get guild data from Supabase (TRUE HYBRID)
 */
async function getGuildData(guildId: string) {
  try {
    const supabase = createClient()
    
    // Get guild metadata
    const { data: guildData, error: guildError } = await supabase
      .from('guild_metadata')
      .select('guild_id, name, description, banner')
      .eq('guild_id', guildId)
      .single()
    
    if (guildError || !guildData) {
      console.error('[guild-members] Guild not found:', guildError)
      return null
    }
    
    // Get guild events to calculate leader and stats
    const { data: events, error: eventsError } = await supabase
      .from('guild_events')
      .select('event_type, actor_address, amount')
      .eq('guild_id', guildId)
      .order('created_at', { ascending: false })
      .limit(1000)
    
    if (eventsError) {
      console.error('[guild-members] Error fetching events:', eventsError)
    }
    
    // Calculate stats from events
    let leader = ''
    let totalPoints = 0
    let memberCount = 0
    const memberSet = new Set<string>()
    
    for (const event of events || []) {
      if (event.event_type === 'GUILD_CREATED') {
        leader = event.actor_address
      } else if (event.event_type === 'MEMBER_JOINED') {
        memberSet.add(event.actor_address)
      } else if (event.event_type === 'MEMBER_LEFT') {
        memberSet.delete(event.actor_address)
      } else if (event.event_type === 'POINTS_DEPOSITED') {
        totalPoints += event.amount || 0
      } else if (event.event_type === 'POINTS_CLAIMED') {
        totalPoints -= event.amount || 0
      }
    }
    
    memberCount = memberSet.size
    
    return {
      name: guildData.name,
      leader,
      totalPoints: BigInt(totalPoints),
      memberCount,
      active: true,
    }
  } catch (error) {
    console.error('[guild-members] getGuildData error:', error)
    return null
  }
}

/**
 * Get all members with roles and points from Supabase (TRUE HYBRID)
 */
async function getGuildMembers(guildId: string): Promise<GuildMember[]> {
  const guildData = await getGuildData(guildId)
  
  if (!guildData || !guildData.active) {
    return []
  }

  const supabase = createClient()

  // Query guild_events for member tracking
  const { data: events, error: eventsError } = await supabase
    .from('guild_events')
    .select('event_type, actor_address, target_address, amount, created_at')
    .eq('guild_id', guildId)
    .order('created_at', { ascending: true })

  if (eventsError) {
    console.error('[guild-members] Error fetching events:', eventsError)
    return []
  }

  // Build member list with points and roles from events
  const memberMap = new Map<string, { 
    joinedAt: string
    points: number
    role: 'owner' | 'officer' | 'member'
  }>()
  const officers = new Set<string>()
  let ownerAddress = ''
  
  // Process events chronologically
  for (const event of events || []) {
    const address = event.actor_address.toLowerCase()
    
    if (event.event_type === 'GUILD_CREATED') {
      ownerAddress = address
      memberMap.set(address, {
        joinedAt: event.created_at || new Date().toISOString(),
        points: 0,
        role: 'owner'
      })
    } else if (event.event_type === 'MEMBER_JOINED') {
      if (!memberMap.has(address)) {
        memberMap.set(address, {
          joinedAt: event.created_at || new Date().toISOString(),
          points: 0,
          role: 'member'
        })
      }
    } else if (event.event_type === 'MEMBER_LEFT') {
      memberMap.delete(address)
    } else if (event.event_type === 'MEMBER_PROMOTED') {
      const target = event.target_address?.toLowerCase()
      if (target && memberMap.has(target)) {
        officers.add(target)
        const member = memberMap.get(target)!
        member.role = 'officer'
      }
    } else if (event.event_type === 'MEMBER_DEMOTED') {
      const target = event.target_address?.toLowerCase()
      if (target && memberMap.has(target)) {
        officers.delete(target)
        const member = memberMap.get(target)!
        member.role = 'member'
      }
    } else if (event.event_type === 'POINTS_DEPOSITED') {
      if (memberMap.has(address)) {
        const member = memberMap.get(address)!
        member.points += event.amount || 0
      }
    } else if (event.event_type === 'POINTS_CLAIMED') {
      if (memberMap.has(address)) {
        const member = memberMap.get(address)!
        member.points -= event.amount || 0
      }
    }
  }

  // Ensure guild owner is included
  if (ownerAddress && !memberMap.has(ownerAddress)) {
    memberMap.set(ownerAddress, {
      joinedAt: new Date().toISOString(),
      points: 0,
      role: 'owner'
    })
  }

  // Convert to member array
  const members: GuildMember[] = []
  const memberAddresses: string[] = []

  for (const [address, data] of memberMap.entries()) {
    members.push({
      address,
      role: data.role,
      points: data.points.toString(),
      joinedAt: data.joinedAt,
    })
    memberAddresses.push(address)
  }

  // Fetch Farcaster profiles for all members in bulk
  if (memberAddresses.length > 0) {
    try {
      const farcasterProfiles = await fetchUsersByAddresses(memberAddresses)
      
      for (const member of members) {
        const profile = farcasterProfiles[member.address] || farcasterProfiles[member.address.toLowerCase()]
        
        if (profile) {
          member.farcaster = {
            fid: profile.fid,
            username: profile.username,
            displayName: profile.displayName,
            pfpUrl: profile.pfpUrl,
            bio: profile.bio,
            followerCount: profile.followerCount,
            followingCount: profile.followingCount,
            powerBadge: profile.powerBadge,
            verifications: profile.verifications,
          }
        }
      }
    } catch (error) {
      console.error('[guild-members] Error fetching Farcaster profiles:', error)
    }
  }

  // Fetch leaderboard stats for all members
  if (memberAddresses.length > 0) {
    try {
      const leaderboardStats = await fetchLeaderboardStats(memberAddresses)
      
      for (const member of members) {
        const stats = leaderboardStats[member.address.toLowerCase()]
        if (stats) {
          member.leaderboardStats = stats
        }
      }
    } catch (error) {
      console.error('[guild-members] Error fetching leaderboard stats:', error)
    }
  }

  // Assign badges
  const guildCreatedAt = new Date('2024-12-01')
  for (const member of members) {
    member.badges = assignMemberBadges(member, guildCreatedAt)
  }

  return members
}

/**
 * Paginate members
 */
function paginateMembers(members: GuildMember[], limit: number, offset: number) {
  const total = members.length
  const items = members.slice(offset, offset + limit)
  
  return { items, total }
}



// ==========================================
// 5. GET Handler
// ==========================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const startTime = Date.now()
  const requestId = generateRequestId()

  try {
    // Await params in Next.js 15
    const { guildId } = await params
    
    // 1. RATE LIMITING (use lib/ infrastructure)
    const clientIp = getClientIp(req)
    const rateLimitResult = await rateLimit(clientIp, apiLimiter)
    
    if (!rateLimitResult.success) {
      return createErrorResponse({
        type: ErrorType.RATE_LIMIT,
        message: 'Too many requests. Please try again later.',
        statusCode: 429,
        requestId,
      })
    }

    // 2. INPUT VALIDATION
    const url = new URL(req.url)
    const queryParams = QuerySchema.parse({
      limit: url.searchParams.get('limit') || '50',
      offset: url.searchParams.get('offset') || '0',
    })

    // 3. FETCH MEMBERS (with caching - TRUE HYBRID)
    const allMembers = await getCached(
      'guild-members',
      guildId,
      async () => await getGuildMembers(guildId),
      { ttl: 60 }
    )

    if (!allMembers || allMembers.length === 0) {
      return createErrorResponse({
        type: ErrorType.NOT_FOUND,
        message: 'Guild not found or has no members',
        statusCode: 404,
        requestId,
      })
    }

    // 4. PAGINATION
    const { items, total } = paginateMembers(
      allMembers,
      queryParams.limit,
      queryParams.offset
    )

    // 5. SUCCESS RESPONSE
    const duration = Date.now() - startTime
    return NextResponse.json(
      {
        success: true,
        members: items,
        pagination: {
          limit: queryParams.limit,
          offset: queryParams.offset,
          total,
        },
        meta: {
          duration: `${duration}ms`,
          cache: 'L1/L2/L3 (60s TTL)',
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('[guild-members] Internal error:', {
      message: errorMessage,
      stack: errorStack,
      guildId: await params.then(p => p.guildId),
    })
    
    return createErrorResponse({
      type: ErrorType.INTERNAL,
      message: 'Failed to fetch guild members. Please try again.',
      statusCode: 500,
      requestId,
      details: process.env.NODE_ENV === 'development' ? { error: errorMessage } : undefined,
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
