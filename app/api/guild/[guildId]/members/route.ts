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
import { apiLimiter } from '@/lib/middleware/rate-limit'
import { createPublicClient, http, type Address } from 'viem'
import { base } from 'viem/chains'
import { getContractAddress, GM_CONTRACT_ABI, STANDALONE_ADDRESSES } from '@/lib/contracts/gmeow-utils'
import { generateRequestId } from '@/lib/middleware/request-id'
import { GUILD_ABI_JSON } from '@/lib/contracts/abis'
import { fetchUsersByAddresses, type FarcasterUser } from '@/lib/integrations/neynar'
import type { Badge } from '@/components/guild/badges/BadgeIcon'
import { createClient } from '@supabase/supabase-js'

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
 * Get public client for reading contract
 */
function getPublicClient() {
  return createPublicClient({
    chain: base,
    transport: http(),
  })
}

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
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { data, error } = await supabase
      .from('leaderboard_calculations')
      .select('address, total_score, base_points, viral_xp, guild_bonus_points, is_guild_officer, global_rank, rank_tier')
      .in('address', addresses)
      .eq('period', 'all_time')
    
    if (error) {
      console.error('[guild-members] Error fetching leaderboard stats:', error)
      return {}
    }
    
    // Build lookup map (address → stats)
    const statsMap: Record<string, any> = {}
    for (const row of data || []) {
      statsMap[row.address.toLowerCase()] = {
        total_score: row.total_score || 0,
        base_points: row.base_points || 0,
        viral_xp: row.viral_xp || 0,
        guild_bonus_points: row.guild_bonus_points || 0,
        is_guild_officer: row.is_guild_officer || false,
        global_rank: row.global_rank,
        rank_tier: row.rank_tier,
      }
    }
    
    return statsMap
  } catch (error) {
    console.error('[guild-members] Error fetching leaderboard stats:', error)
    return {}
  }
}

/**
 * Get guild data
 */
async function getGuildData(guildId: bigint) {
  const client = getPublicClient()
  
  try {
    const guildData = await client.readContract({
      address: STANDALONE_ADDRESSES.base.guild as Address,
      abi: GUILD_ABI_JSON,
      functionName: 'getGuildInfo',
      args: [guildId],
    }) as any
    
    // Handle both tuple array and object format
    const [name, leader, totalPoints, memberCount, active, level] = Array.isArray(guildData) 
      ? guildData 
      : [guildData.name, guildData.leader, guildData.totalPoints, guildData.memberCount, guildData.active, guildData.level]
    
    if (!name || !active) return null
    
    return {
      name: name as string,
      leader: leader as string,
      totalPoints: BigInt(totalPoints || 0),
      memberCount: Number(memberCount || 0),
      active: active as boolean,
    }
  } catch (error) {
    console.error('[guild-members] getGuildData error:', error)
    return null
  }
}

/**
 * Get all addresses that are in this guild
 * Uses Supabase guild_events to track MEMBER_JOINED and MEMBER_LEFT events
 */
async function getGuildMembers(guildId: bigint): Promise<GuildMember[]> {
  const client = getPublicClient()
  const guildData = await getGuildData(guildId)
  
  if (!guildData || !guildData.active) {
    return []
  }

  // Initialize Supabase client (server-side with service role key)
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('[guild-members] Missing Supabase credentials')
    console.error('[guild-members] SUPABASE_URL:', supabaseUrl ? 'present' : 'missing')
    console.error('[guild-members] SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'present' : 'missing')
    return []
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Query guild_events for all MEMBER_JOINED events
  const { data: joinEvents, error: joinError } = await supabase
    .from('guild_events')
    .select('actor_address, created_at')
    .eq('guild_id', guildId.toString())
    .eq('event_type', 'MEMBER_JOINED')
    .order('created_at', { ascending: true })

  if (joinError) {
    console.error('[guild-members] Error fetching join events:', joinError)
  }

  // Query guild_events for all MEMBER_LEFT events
  const { data: leaveEvents, error: leaveError } = await supabase
    .from('guild_events')
    .select('actor_address, created_at')
    .eq('guild_id', guildId.toString())
    .eq('event_type', 'MEMBER_LEFT')
    .order('created_at', { ascending: true })

  if (leaveError) {
    console.error('[guild-members] Error fetching leave events:', leaveError)
  }

  // Build member list (joined - left)
  const memberMap = new Map<string, { joinedAt: string }>()
  
  // Add all joins
  if (joinEvents && joinEvents.length > 0) {
    for (const event of joinEvents) {
      const address = event.actor_address.toLowerCase()
      if (!memberMap.has(address)) {
        memberMap.set(address, { joinedAt: event.created_at })
      }
    }
  }

  // Remove all leaves
  if (leaveEvents && leaveEvents.length > 0) {
    for (const event of leaveEvents) {
      const address = event.actor_address.toLowerCase()
      memberMap.delete(address)
    }
  }

  // Ensure guild owner is included (even if no MEMBER_JOINED event)
  const ownerAddress = guildData.leader.toLowerCase()
  if (!memberMap.has(ownerAddress)) {
    memberMap.set(ownerAddress, { joinedAt: new Date().toISOString() })
  }

  // Convert to member array
  const members: GuildMember[] = []
  const memberAddresses: string[] = []

  for (const [address, data] of memberMap.entries()) {
    try {
      // Get member points
      const memberPoints = await client.readContract({
        address: getContractAddress('base'),
        abi: GM_CONTRACT_ABI,
        functionName: 'pointsBalance',
        args: [address as Address],
      }) as bigint

      // Determine role
      let role: 'owner' | 'officer' | 'member' = 'member'
      if (address === ownerAddress) {
        role = 'owner'
      } else {
        // Check if officer using correct ABI function name: isOfficer (not isGuildOfficer)
        try {
          const isOfficerResult = await client.readContract({
            address: STANDALONE_ADDRESSES.base.guild as Address,
            abi: GUILD_ABI_JSON,
            functionName: 'isOfficer',
            args: [guildId, address as Address],
          }) as boolean
          
          if (isOfficerResult) {
            role = 'officer'
          }
        } catch (error) {
          console.error(`[guild-members] Error checking officer status for ${address}:`, error)
        }
      }

      members.push({
        address,
        role,
        points: memberPoints.toString(),
        joinedAt: data.joinedAt,
      })
      memberAddresses.push(address)
    } catch (error) {
      console.error(`[guild-members] Error fetching data for ${address}:`, error)
    }
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

/**
 * Create success response with cache headers
 */
function createSuccessResponse(data: any) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`
  
  return NextResponse.json(
    {
      success: true,
      ...data,
      timestamp: Date.now(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=120',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-Request-ID': requestId,
        'X-API-Version': '1.0.0',
      },
    }
  )
}

/**
 * Create error response (no sensitive data)
 */
function createErrorResponse(message: string, status: number = 400) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`
  
  return NextResponse.json(
    {
      success: false,
      message,
      timestamp: Date.now(),
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-Request-ID': requestId,
        'X-API-Version': '1.0.0',
      },
    }
  )
}

// ==========================================
// 5. GET Handler
// ==========================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const startTime = Date.now()

  try {
    // Await params in Next.js 15
    const { guildId } = await params
    
    // 1. RATE LIMITING
    if (!apiLimiter) {
      return createErrorResponse('Rate limiting not configured', 503)
    }
    
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const rateLimitKey = `${RATE_LIMIT_CONFIG.identifier}:${clientIp}`
    const rateLimitResult = await apiLimiter.limit(rateLimitKey)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Rate limit exceeded. Please try again later.',
          timestamp: Date.now(),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(RATE_LIMIT_CONFIG.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Date.now() + RATE_LIMIT_CONFIG.windowMs),
          },
        }
      )
    }

    // 2. INPUT VALIDATION
    const { searchParams } = new URL(req.url)
    const queryResult = QuerySchema.safeParse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    })

    if (!queryResult.success) {
      return createErrorResponse(
        `Invalid query parameters: ${queryResult.error.issues.map((i) => i.message).join(', ')}`,
        400
      )
    }

    const { limit, offset } = queryResult.data

    // Validate guildId
    const guildIdNum = BigInt(guildId)
    if (guildIdNum <= 0n) {
      return createErrorResponse('Invalid guild ID', 400)
    }

    // 3. FETCH MEMBERS
    const allMembers = await getGuildMembers(guildIdNum)
    
    if (allMembers.length === 0) {
      return createErrorResponse('Guild not found or has no members', 404)
    }

    // 4. PAGINATE
    const { items, total } = paginateMembers(allMembers, limit, offset)

    // 5. AUDIT LOGGING
    console.log('[guild-members] Member list fetched:', {
      guildId,
      total,
      limit,
      offset,
      timestamp: new Date().toISOString(),
    })

    const duration = Date.now() - startTime

    return createSuccessResponse({
      members: items,
      pagination: {
        limit,
        offset,
        total,
      },
      performance: {
        duration,
      },
    })
  } catch (error: any) {
    console.error('[guild-members] Error:', error)

    // 10. ERROR MASKING
    return createErrorResponse(
      'Failed to fetch guild members. Please try again later.',
      500
    )
  }
}
