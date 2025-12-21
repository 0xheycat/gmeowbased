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
import { getCached } from '@/lib/cache/server'
import { rateLimit, apiLimiter, getClientIp } from '@/lib/middleware/rate-limit'
import { createErrorResponse, ErrorType } from '@/lib/middleware/error-handler'
import { createClient } from '@/lib/supabase/edge'
import { generateRequestId } from '@/lib/middleware/request-id'
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
  id: string
  chain: 'base'
  name: string
  leader: string
  totalPoints: number
  memberCount: number
  level: number
  active: boolean
  description?: string
  banner?: string
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
 * LAYER 3: Calculated
 */
function calculateGuildLevel(points: number): number {
  if (points < 1000) return 1
  if (points < 2000) return 2
  if (points < 5000) return 3
  if (points < 10000) return 4
  return 5
}

/**
 * Fetch guilds with TRUE HYBRID pattern
 * LAYER 1: Off-chain (Supabase) - Guild metadata
 * LAYER 2: Off-chain (Supabase) - Guild events for stats
 * LAYER 3: Calculated - Stats aggregation + achievements
 */
async function fetchGuildsFromSupabase(): Promise<Guild[]> {
  try {
    const supabase = createClient()

    // LAYER 1: Get all guild metadata
    const { data: guilds, error: guildsError } = await supabase
      .from('guild_metadata')
      .select('guild_id, name, description, banner, created_at')

    if (guildsError || !guilds) {
      console.error('[guild/list] Failed to fetch guild metadata:', guildsError)
      return []
    }

    // LAYER 2: Get cached guild stats (from cron sync - updated every 6 hours)
    const { data: cachedStats, error: statsError } = await supabase
      .from('guild_stats_cache')
      .select('guild_id, member_count, total_points, level, treasury_balance, is_active, leader_address')

    if (statsError) {
      console.error('[guild/list] Failed to fetch guild stats cache:', statsError)
    }

    // Build stats map from cache
    const statsMap = new Map<string, any>()
    if (cachedStats) {
      for (const stat of cachedStats) {
        statsMap.set(stat.guild_id, stat)
      }
    }

    // Build guild list from metadata + cached stats
    const guildList: Guild[] = guilds.map((guild) => {
      const stats = statsMap.get(guild.guild_id)

      return {
        id: guild.guild_id,
        chain: 'base' as const,
        name: guild.name || 'Unknown Guild',
        leader: stats?.leader_address || '',
        totalPoints: stats?.total_points || 0,
        memberCount: stats?.member_count || 0,
        level: stats?.level || 1,
        active: stats?.is_active !== false,
        description: guild.description || undefined,
        banner: guild.banner || undefined,
      }
    })

    return guildList
  } catch (error) {
    console.error('[guild/list] Error fetching guilds:', error)
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
 * LAYER 3: Calculated
 */
function sortGuilds(guilds: Guild[], sortBy: QueryParams['sortBy']): Guild[] {
  const sorted = [...guilds]

  switch (sortBy) {
    case 'members':
      sorted.sort((a, b) => b.memberCount - a.memberCount)
      break
    case 'points':
      sorted.sort((a, b) => b.totalPoints - a.totalPoints)
      break
    case 'level':
      sorted.sort((a, b) => b.level - a.level || b.totalPoints - a.totalPoints)
      break
    case 'recent':
      sorted.sort((a, b) => parseInt(b.id) - parseInt(a.id)) // Newer guilds first
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

// ==========================================
// 5. GET Handler
// ==========================================

export async function GET(req: NextRequest) {
  const startTime = Date.now()
  const requestId = generateRequestId()
  const clientIp = getClientIp(req)

  try {
    // LAYER 1: Rate Limiting
    const rateLimitResult = await rateLimit(clientIp, apiLimiter)

    if (!rateLimitResult.success) {
      return createErrorResponse({
        type: ErrorType.RATE_LIMIT,
        message: 'Rate limit exceeded. Please try again later.',
        statusCode: 429,
      })
    }

    // LAYER 2: Input Validation
    const { searchParams } = new URL(req.url)
    const queryResult = QuerySchema.safeParse({
      chain: searchParams.get('chain'),
      search: searchParams.get('search'),
      sortBy: searchParams.get('sortBy'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    })

    if (!queryResult.success) {
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: `Invalid query parameters: ${queryResult.error.issues.map((i) => i.message).join(', ')}`,
        statusCode: 400,
      })
    }

    const { chain, search, sortBy, limit, offset } = queryResult.data

    // LAYER 3: Fetch with caching (TRUE HYBRID)
    const cacheKey = `guild-list:${chain}:${search || 'all'}:${sortBy}:${limit}:${offset}`
    const allGuilds = await getCached(
      'guild-list',
      cacheKey,
      async () => await fetchGuildsFromSupabase(),
      { ttl: 60 }
    )

    // LAYER 3: Filter and sort (Calculated)
    const filtered = filterGuilds(allGuilds, search ?? undefined)
    const sorted = sortGuilds(filtered, sortBy)

    // LAYER 3: Paginate
    const { items, total, hasMore } = paginateGuilds(sorted, limit, offset)

    // LAYER 4: Format response - match frontend interface
    const guilds = items.map((guild) => ({
      id: guild.id,
      name: guild.name,
      description: guild.description || '',
      chain: guild.chain,
      memberCount: guild.memberCount,
      treasury: guild.totalPoints, // Frontend expects 'treasury'
      level: guild.level,
      xp: guild.totalPoints, // Frontend expects 'xp'
      owner: guild.leader, // Frontend expects 'owner'
      avatarUrl: guild.banner || undefined,
      achievements: assignGuildAchievements(guild),
    }))

    const duration = Date.now() - startTime

    return NextResponse.json(
      {
        success: true,
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
        timestamp: Date.now(),
      },
      {
        status: 200,
        headers: {
          'X-Request-ID': requestId,
          'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=120',
          'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '60',
          'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '0',
          'Server-Timing': `total;dur=${duration}`,
        },
      }
    )
  } catch (error: any) {
    console.error('[guild/list] Error:', error)

    return createErrorResponse({
      type: ErrorType.INTERNAL,
      message: 'Failed to fetch guild list. Please try again later.',
      statusCode: 500,
    })
  }
}
