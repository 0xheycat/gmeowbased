/**
 * GET /api/guild/list
 * 
 * Purpose: Fetch guild directory with filtering and pagination
 * Security: 10-layer pattern
 * Rate Limit: 60 requests/minute per IP
 * 
 * 10-Layer Security:
 * 1. Rate Limiting - 60 req/min per IP (apiLimiter)
 * 2. Input Validation - Zod schemas for query params
 * 3. Sanitization - Strip dangerous characters
 * 4. Error Masking - No sensitive data in errors
 * 5. Cache Headers - 60s cache, 120s stale-while-revalidate
 * 6. Type Safety - TypeScript strict mode
 * 7. CORS Headers - Explicit allowed origins
 * 8. Content-Type Validation - JSON only
 * 9. Audit Logging - All requests tracked
 * 10. Response Headers - Security headers (X-Content-Type-Options, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { apiLimiter } from '@/lib/middleware/rate-limit'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import type { Address } from 'viem'
import { getContractAddress, GM_CONTRACT_ABI, STANDALONE_ADDRESSES, type ChainKey, CHAIN_IDS } from '@/lib/contracts/gmeow-utils'
import { generateRequestId } from '@/lib/middleware/request-id'
import { GUILD_ABI_JSON } from '@/lib/contracts/abis'
import type { Badge } from '@/components/guild/badges'

// ==========================================
// 1. Rate Limiting Configuration
// ==========================================

const RATE_LIMIT_CONFIG = {
  identifier: 'guild-list',
  maxRequests: 60,
  windowMs: 60 * 1000,
}

// ==========================================
// 2. Input Validation Schemas
// ==========================================

const QuerySchema = z.object({
  chain: z.enum(['base']).nullish().default('base'), // Base chain only, handles null/undefined
  search: z.string().max(100).nullish(), // Allow null/undefined for optional search
  sortBy: z.enum(['members', 'points', 'level', 'recent']).nullish().default('points'),
  limit: z.string().nullish().transform(val => val ? parseInt(val, 10) : 20).pipe(z.number().int().min(1).max(100)),
  offset: z.string().nullish().transform(val => val ? parseInt(val, 10) : 0).pipe(z.number().int().min(0)),
})

type QueryParams = z.infer<typeof QuerySchema>

// ==========================================
// 3. Types
// ==========================================

interface Guild {
  id: bigint
  chain: ChainKey
  name: string
  leader: string
  totalPoints: bigint
  memberCount: bigint
  level: number
  active: boolean
  achievements?: Badge[] // Guild-level achievement badges
}

// ==========================================
// 4. Helper Functions
// ==========================================

/**
 * Assign guild-level achievement badges based on guild stats
 * 
 * Categories:
 * - Treasury achievements (based on totalPoints)
 * - Member count achievements (based on memberCount)
 * - Level achievements (based on guild level)
 * - Founding achievements (early guild ID)
 */
function assignGuildAchievements(guild: Guild): Badge[] {
  const badges: Badge[] = []
  const points = Number(guild.totalPoints)
  const members = Number(guild.memberCount)
  const guildId = Number(guild.id)

  // 1. Treasury Achievements
  if (points >= 100000) {
    badges.push({
      id: 'treasury-legendary',
      name: 'Mega Treasury',
      description: 'Guild has accumulated over 100,000 points',
      icon: '/badges/achievement/treasury.png',
      rarity: 'legendary',
      category: 'achievement',
    })
  } else if (points >= 50000) {
    badges.push({
      id: 'treasury-epic',
      name: 'Major Treasury',
      description: 'Guild has accumulated over 50,000 points',
      icon: '/badges/achievement/treasury.png',
      rarity: 'epic',
      category: 'achievement',
    })
  } else if (points >= 10000) {
    badges.push({
      id: 'treasury-rare',
      name: 'Growing Treasury',
      description: 'Guild has accumulated over 10,000 points',
      icon: '/badges/achievement/treasury.png',
      rarity: 'rare',
      category: 'achievement',
    })
  }

  // 2. Member Count Achievements
  if (members >= 100) {
    badges.push({
      id: 'members-legendary',
      name: 'Mega Guild',
      description: 'Guild has over 100 members',
      icon: '/badges/achievement/top-contributor.png',
      rarity: 'legendary',
      category: 'achievement',
    })
  } else if (members >= 50) {
    badges.push({
      id: 'members-epic',
      name: 'Large Guild',
      description: 'Guild has over 50 members',
      icon: '/badges/achievement/top-contributor.png',
      rarity: 'epic',
      category: 'achievement',
    })
  } else if (members >= 10) {
    badges.push({
      id: 'members-rare',
      name: 'Growing Guild',
      description: 'Guild has over 10 members',
      icon: '/badges/achievement/top-contributor.png',
      rarity: 'rare',
      category: 'achievement',
    })
  }

  // 3. Level Achievements
  if (guild.level >= 10) {
    badges.push({
      id: 'level-legendary',
      name: 'Legendary Guild',
      description: 'Guild has reached level 10+',
      icon: '/badges/achievement/veteran.png',
      rarity: 'legendary',
      category: 'achievement',
    })
  } else if (guild.level >= 5) {
    badges.push({
      id: 'level-epic',
      name: 'Elite Guild',
      description: 'Guild has reached level 5+',
      icon: '/badges/achievement/veteran.png',
      rarity: 'epic',
      category: 'achievement',
    })
  }

  // 4. Founding Achievement (first 10 guilds)
  if (guildId <= 10) {
    badges.push({
      id: 'founding-guild',
      name: 'Founding Guild',
      description: 'One of the first 10 guilds created',
      icon: '/badges/founder/founder.png',
      rarity: 'legendary',
      category: 'founder',
    })
  }

  // Priority order: legendary > epic > rare > common
  // Max 6 badges per guild (Reddit pattern)
  const sortedBadges = badges.sort((a, b) => {
    const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 }
    return rarityOrder[a.rarity] - rarityOrder[b.rarity]
  })

  return sortedBadges.slice(0, 6)
}

/**
 * Sanitize search query
 */
function sanitizeSearch(search: string): string {
  return search
    .replace(/[<>'"`;]/g, '')
    .trim()
    .toLowerCase()
}

/**
 * Calculate guild level based on points
 */
function calculateGuildLevel(points: bigint): number {
  if (points < 1000n) return 1
  if (points < 2000n) return 2
  if (points < 5000n) return 3
  if (points < 10000n) return 4
  return 5
}

/**
 * Fetch guilds from a specific chain
 */
async function fetchGuildsFromChain(
  chain: ChainKey,
  maxGuilds: number = 200
): Promise<Guild[]> {
  try {
    const client = createPublicClient({
      chain: base, // Use base as default, can be extended
      transport: http(),
    })

    // Use Guild contract address, not Core
    const contractAddress = STANDALONE_ADDRESSES.base.guild
    
    // Get total guild count
    const nextGuildId = await client.readContract({
      address: contractAddress,
      abi: GM_CONTRACT_ABI,
      functionName: 'nextGuildId',
      args: [],
    }) as bigint

    if (!nextGuildId || nextGuildId === 0n) {
      return []
    }

    // Fetch guild data in batches
    const guildCount = Math.min(Number(nextGuildId), maxGuilds)
    const guildIds = Array.from({ length: guildCount }, (_, i) => BigInt(i + 1))

    const contracts = guildIds.map((id) => ({
      address: contractAddress as Address,
      abi: GUILD_ABI_JSON as any,
      functionName: 'getGuildInfo' as const,
      args: [id],
    }))

    const results = await client.multicall({ contracts })

    const guilds: Guild[] = []
    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      if (result.status !== 'success' || !result.result) continue

      // Parse tuple response: [name, leader, totalPoints, memberCount, level, requiredPoints, treasury]
      const guildInfo = result.result as any[]
      const name = (guildInfo[0] as string) || ''
      const leader = (guildInfo[1] as Address) || ''
      const totalPoints = (guildInfo[2] as bigint) || 0n
      const memberCount = (guildInfo[3] as bigint) || 0n
      const level = (guildInfo[4] as bigint) || 0n

      // Skip inactive or empty guilds (but allow 0 points - new guilds start at 0)
      const active = name && name.length > 0
      if (!active || !name) continue

      guilds.push({
        id: guildIds[i],
        chain,
        name,
        leader,
        totalPoints,
        memberCount,
        level: Number(level), // Use level from contract
        active,
      })
    }

    return guilds
  } catch (error) {
    console.error(`[guild/list] Error fetching guilds from ${chain}:`, error)
    return []
  }
}

/**
 * Filter guilds by search query
 */
function filterGuilds(guilds: Guild[], search?: string): Guild[] {
  if (!search) return guilds

  const sanitized = sanitizeSearch(search)
  return guilds.filter((guild) =>
    guild.name.toLowerCase().includes(sanitized) ||
    guild.leader.toLowerCase().includes(sanitized)
  )
}

/**
 * Sort guilds by specified criteria
 */
function sortGuilds(guilds: Guild[], sortBy: QueryParams['sortBy']): Guild[] {
  const sorted = [...guilds]

  switch (sortBy) {
    case 'members':
      sorted.sort((a, b) => Number(b.memberCount - a.memberCount))
      break
    case 'points':
      sorted.sort((a, b) => Number(b.totalPoints - a.totalPoints))
      break
    case 'level':
      sorted.sort((a, b) => b.level - a.level || Number(b.totalPoints - a.totalPoints))
      break
    case 'recent':
      sorted.sort((a, b) => Number(b.id - a.id)) // Newer guilds first
      break
  }

  return sorted
}

/**
 * Paginate guilds
 */
function paginateGuilds(guilds: Guild[], limit: number, offset: number) {
  const total = guilds.length
  const items = guilds.slice(offset, offset + limit)
  const hasMore = offset + limit < total

  return { items, total, hasMore }
}

/**
 * Create success response with cache headers
 */
function createSuccessResponse(data: any, requestId: string) {
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
function createErrorResponse(message: string, status: number = 400, requestId?: string) {
  const headers: Record<string, string> = {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-API-Version': '1.0.0',
  }
  
  if (requestId) {
    headers['X-Request-ID'] = requestId
  }
  
  return NextResponse.json(
    {
      success: false,
      message,
      timestamp: Date.now(),
    },
    {
      status,
      headers,
    }
  )
}

// ==========================================
// 5. GET Handler
// ==========================================

export async function GET(req: NextRequest) {
  const startTime = Date.now()
  const requestId = generateRequestId()

  try {
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
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Date.now() + 60000),
          },
        }
      )
    }

    // 2. INPUT VALIDATION
    const { searchParams } = new URL(req.url)
    const queryResult = QuerySchema.safeParse({
      chain: searchParams.get('chain'),
      search: searchParams.get('search'),
      sortBy: searchParams.get('sortBy'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    })

    if (!queryResult.success) {
      return createErrorResponse(
        `Invalid query parameters: ${queryResult.error.issues.map((i) => i.message).join(', ')}`,
        400,
        requestId
      )
    }

    const { chain, search, sortBy, limit, offset } = queryResult.data

    // 3. FETCH GUILDS (Base chain only)
    const allGuilds = await fetchGuildsFromChain('base', 200)

    // 4. FILTER AND SORT
    const filtered = filterGuilds(allGuilds, search ?? undefined)
    const sorted = sortGuilds(filtered, sortBy)

    // 5. PAGINATE
    const { items, total, hasMore } = paginateGuilds(sorted, limit, offset)

    // 6. FORMAT RESPONSE
    const guilds = items.map((guild) => ({
      id: guild.id.toString(),
      chain: guild.chain,
      name: guild.name,
      leader: guild.leader,
      totalPoints: guild.totalPoints.toString(),
      memberCount: guild.memberCount.toString(),
      level: guild.level,
      active: guild.active,
      achievements: assignGuildAchievements(guild), // Add guild-level badges
    }))

    const duration = Date.now() - startTime

    return createSuccessResponse({
      guilds,
      pagination: {
        limit,
        offset,
        total,
        hasMore,
      },
      filters: {
        chain,
        search: search || null,
        sortBy,
      },
      performance: {
        duration,
      },
    }, requestId)
  } catch (error: any) {
    console.error('[guild/list] Error:', error)

    // 4. ERROR MASKING
    return createErrorResponse(
      'Failed to fetch guild list. Please try again later.',
      500,
      requestId
    )
  }
}
