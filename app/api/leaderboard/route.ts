// /api/leaderboard/route.ts
import { NextResponse } from 'next/server'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { CONTRACT_ADDRESSES, gmContractHasFunction, isGMChain, type ChainKey, type GMChainKey } from '@/lib/gmeow-utils'
import { computeLeaderboardSlice, PROFILE_SUPPORTED } from '@/lib/leaderboard-aggregator'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase-server'
import { fetchUsersByAddresses } from '@/lib/neynar'
import { LeaderboardQuerySchema } from '@/lib/validation/api-schemas'
import { withErrorHandler } from '@/lib/error-handler'

const CACHE_TTL = 25_000
const CACHE_HEADERS = { 'cache-control': 's-maxage=30, stale-while-revalidate=60' }
let cache: { key: string; at: number; data: LeaderboardResponse } | null = null

const SEASONS_SUPPORTED = gmContractHasFunction('getAllSeasons') && gmContractHasFunction('getSeason')
const SUPABASE_TIMEOUT_MS = Number(process.env.SUPABASE_TIMEOUT_MS ?? 5_000)
const SUPABASE_MAX_RETRIES = Number(process.env.SUPABASE_MAX_RETRIES ?? 2)

function isChainKey(value: string): value is ChainKey {
  return Object.prototype.hasOwnProperty.call(CONTRACT_ADDRESSES, value)
}


type LeaderboardEntry = {
  rank: number
  address: `0x${string}`
  chain: ChainKey
  points: number
  pfpUrl: string
  name: string
  farcasterFid: number
  completed: number
  rewards: number
  seasonAlloc: number
}

type LeaderboardResponse = {
  ok: true
  chain: ChainKey
  global: boolean
  offset: number
  limit: number
  total: number
  top: LeaderboardEntry[]
  updatedAt: number
  seasonSupported: boolean
  profileSupported: boolean
  seasonWarning?: string
}

type SupabaseLeaderboardRow = {
  address?: string | null
  chain?: string | null
  points?: number | string | null
  completed?: number | string | null
  rewards?: number | string | null
  season_alloc?: number | string | null
  seasonAllocation?: number | string | null
  seasonAlloc?: number | string | null
  farcaster_fid?: number | string | null
  farcasterFid?: number | string | null
  display_name?: string | null
  name?: string | null
  pfp_url?: string | null
  avatar_url?: string | null
  updated_at?: string | null
  updatedAt?: string | null
  rank?: number | null
  position?: number | null
  global?: boolean | null
  season_key?: string | null
  season?: string | null
}

const SUPABASE_CONFIG = {
  table: process.env.SUPABASE_LEADERBOARD_TABLE || 'leaderboard_snapshots',
  currentView: process.env.SUPABASE_LEADERBOARD_VIEW_CURRENT || null,
  seasonColumn: process.env.SUPABASE_LEADERBOARD_SEASON_COLUMN || 'season_key',
  chainColumn: process.env.SUPABASE_LEADERBOARD_CHAIN_COLUMN || 'chain',
  globalColumn: process.env.SUPABASE_LEADERBOARD_GLOBAL_COLUMN || 'global',
  rankColumn: process.env.SUPABASE_LEADERBOARD_RANK_COLUMN || 'rank',
  updatedColumn: process.env.SUPABASE_LEADERBOARD_UPDATED_COLUMN || 'updated_at',
}

type SupabaseFetchParams = {
  chain: ChainKey
  global: boolean
  season: string | null
  limit: number
  offset: number
  eventType?: string
  timeframe?: string
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

/**
 * Fetch event-based leaderboard aggregated from gmeow_rank_events
 * Supports filtering by event type and timeframe
 */
async function fetchEventBasedLeaderboard(
  params: SupabaseFetchParams
): Promise<{ total: number; entries: LeaderboardEntry[]; updatedAt: number } | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  try {
    // Calculate timeframe filter
    let createdAtFilter: Date | null = null
    if (params.timeframe && params.timeframe !== 'all-time') {
      const now = new Date()
      switch (params.timeframe) {
        case 'daily':
          createdAtFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case 'weekly':
          createdAtFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'monthly':
          createdAtFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
      }
    }

    // Build aggregation query
    let query = supabase.rpc('get_event_leaderboard', {
      p_chain: params.chain,
      p_event_type: params.eventType === 'all' ? null : params.eventType,
      p_created_after: createdAtFilter ? createdAtFilter.toISOString() : null,
      p_limit: params.limit,
      p_offset: params.offset,
    })

    const { data, error } = await query

    if (error) {
      console.warn('Event-based leaderboard query failed, falling back to snapshot:', error.message)
      return null
    }

    if (!data || !Array.isArray(data)) {
      return null
    }

    // Transform raw aggregated data to leaderboard entries
    const entries: LeaderboardEntry[] = await Promise.all(
      data.map(async (row: any, index: number) => {
        const address = (row.wallet_address || ZERO_ADDRESS) as `0x${string}`
        const points = parseSupabaseNumber(row.total_points)
        const completed = parseSupabaseNumber(row.event_count)

        return {
          rank: params.offset + index + 1,
          address,
          chain: params.chain,
          points,
          pfpUrl: '',
          name: '',
          farcasterFid: parseSupabaseNumber(row.fid, 0),
          completed,
          rewards: Math.floor(points / 20),
          seasonAlloc: 0,
        }
      })
    )

    // Enrich with user profiles
    const needsEnrichment = entries.filter(entry => !entry.name.trim() || !entry.pfpUrl)
    if (needsEnrichment.length > 0) {
      try {
        const addressMap = await fetchUsersByAddresses(needsEnrichment.map(entry => entry.address))
        for (const entry of needsEnrichment) {
          const user = addressMap[entry.address] ?? addressMap[entry.address.toLowerCase()]
          if (!user) continue

          const handle = user.username ? `@${user.username}` : ''
          const display = typeof user.displayName === 'string' ? user.displayName.trim() : ''
          const resolvedName = display || handle || entry.address.slice(0, 8)
          const neynarPfp = typeof user.pfpUrl === 'string' ? user.pfpUrl.trim() : ''
          const resolvedFid =
            entry.farcasterFid && entry.farcasterFid > 0
              ? entry.farcasterFid
              : typeof user.fid === 'number' && user.fid > 0
              ? user.fid
              : 0

          entry.name = resolvedName
          entry.pfpUrl = neynarPfp
          entry.farcasterFid = resolvedFid
        }
      } catch (enrichError) {
        console.warn('Profile enrichment failed:', enrichError)
      }
    }

    // Ensure all entries have names
    entries.forEach(entry => {
      if (!entry.name.trim()) {
        entry.name = entry.address.slice(0, 8) + '...'
      }
    })

    return {
      total: data.length > 0 ? params.offset + data.length : 0,
      entries,
      updatedAt: Date.now(),
    }
  } catch (error) {
    console.warn('Event-based leaderboard failed:', formatSupabaseError(error))
    return null
  }
}

function parseSupabaseNumber(value: string | number | null | undefined, fallback = 0): number {
  if (value == null) return fallback
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseSupabaseString(value: string | null | undefined, fallback = ''): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function parseSupabaseTimestamp(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function formatSupabaseError(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return `timeout after ${SUPABASE_TIMEOUT_MS}ms`
    }
    return error.message
  }
  if (error && typeof error === 'object') {
    if ('name' in error && (error as Record<string, unknown>).name === 'AbortError') {
      return `timeout after ${SUPABASE_TIMEOUT_MS}ms`
    }
    const message = 'message' in error && typeof (error as Record<string, unknown>).message === 'string' ? (error as Record<string, unknown>).message : null
    const details = 'details' in error && typeof (error as Record<string, unknown>).details === 'string' ? (error as Record<string, unknown>).details : null
    const hint = 'hint' in error && typeof (error as Record<string, unknown>).hint === 'string' ? (error as Record<string, unknown>).hint : null
    const parts = [message, details, hint].filter(Boolean)
    if (parts.length > 0) {
      return parts.join(' | ')
    }
    try {
      return JSON.stringify(error)
    } catch (jsonError) {
      return String(jsonError)
    }
  }
  return String(error)
}

async function fetchLeaderboardFromSupabase(params: SupabaseFetchParams): Promise<{ total: number; entries: LeaderboardEntry[]; updatedAt: number } | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  const { table, currentView, seasonColumn, chainColumn, globalColumn, rankColumn, updatedColumn } = SUPABASE_CONFIG

  const source = params.season === 'current' && currentView ? currentView : table
  const attempts = Number.isFinite(SUPABASE_MAX_RETRIES) ? Math.max(1, Math.floor(SUPABASE_MAX_RETRIES) + 1) : 1

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null

      let query = supabase
        .from(source)
        .select('*', { count: 'exact' })

      if (globalColumn) {
        query = query.eq(globalColumn, params.global)
      }

      if (!params.global) {
        query = query.eq(chainColumn, params.chain)
      }

      if (source === table && params.season) {
        query = query.eq(seasonColumn, params.season)
      }

      query = query
        .order(rankColumn, { ascending: true })
        .range(params.offset, params.offset + params.limit - 1)

      if (controller) {
        query = query.abortSignal(controller.signal)
        timeoutId = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS)
      }

      const { data, error, count } = await query
      if (timeoutId) clearTimeout(timeoutId)

      if (error) {
        throw error
      }

      if (!data) return null
      const rows = data as SupabaseLeaderboardRow[]

      const resolvedTotal = typeof count === 'number' && count >= 0 ? count : rows.length + params.offset
      let latestUpdate = 0

      const entries: LeaderboardEntry[] = rows.map((row, index) => {
        const rawAddress = parseSupabaseString(row.address, ZERO_ADDRESS)
        const address = (rawAddress.startsWith('0x') ? rawAddress : ZERO_ADDRESS) as `0x${string}`

        const normalizedChain = parseSupabaseString(row.chain).toLowerCase()
        const chain = (normalizedChain && isChainKey(normalizedChain) ? normalizedChain : params.chain) as ChainKey

        const points = parseSupabaseNumber(row.points)
        const completed = parseSupabaseNumber(row.completed)
        const rewards = parseSupabaseNumber(row.rewards, Math.floor(points / 20))
        const seasonAlloc = parseSupabaseNumber(row.seasonAlloc ?? row.season_alloc ?? row.seasonAllocation)
        const farcasterFid = parseSupabaseNumber(row.farcaster_fid ?? row.farcasterFid, 0)
        const name = parseSupabaseString(row.display_name ?? row.name)
        const pfpUrl = parseSupabaseString(row.pfp_url ?? row.avatar_url)
        const rank = typeof row.rank === 'number' && row.rank > 0 ? row.rank : typeof row.position === 'number' && row.position > 0 ? row.position : params.offset + index + 1

        const configuredUpdated = (row as Record<string, unknown>)[updatedColumn]
        const configuredUpdatedString = typeof configuredUpdated === 'string' ? configuredUpdated : undefined
        const updatedAtCandidate = parseSupabaseTimestamp(configuredUpdatedString ?? row.updated_at ?? row.updatedAt)
        if (updatedAtCandidate && updatedAtCandidate > latestUpdate) {
          latestUpdate = updatedAtCandidate
        }

        return {
          rank,
          address,
          chain,
          points,
          pfpUrl,
          name,
          farcasterFid,
          completed,
          rewards,
          seasonAlloc,
        }
      })

      const needsEnrichment = entries.filter(entry => !entry.name.trim() || !entry.pfpUrl || entry.pfpUrl.trim().length === 0)
      if (needsEnrichment.length > 0) {
        try {
          const addressMap = await fetchUsersByAddresses(needsEnrichment.map(entry => entry.address))
          for (const entry of needsEnrichment) {
            const user = addressMap[entry.address] ?? addressMap[entry.address.toLowerCase()]
            if (!user) continue

            const handle = user.username ? `@${user.username}` : ''
            const display = typeof user.displayName === 'string' ? user.displayName.trim() : ''
            const resolvedName = entry.name.trim() || display || handle
            const existingPfp = entry.pfpUrl.trim()
            const neynarPfp = typeof user.pfpUrl === 'string' ? user.pfpUrl.trim() : ''
            const resolvedPfp = existingPfp || neynarPfp
            const resolvedFid =
              entry.farcasterFid && entry.farcasterFid > 0
                ? entry.farcasterFid
                : typeof user.fid === 'number' && Number.isFinite(user.fid) && user.fid > 0
                ? user.fid
                : 0

            if (!entry.name.trim() && resolvedName) {
              entry.name = resolvedName
            }
            if ((!entry.pfpUrl || entry.pfpUrl.trim().length === 0) && resolvedPfp) {
              entry.pfpUrl = resolvedPfp
            }
            if ((!entry.farcasterFid || entry.farcasterFid <= 0) && resolvedFid > 0) {
              entry.farcasterFid = resolvedFid
            }
          }
        } catch (enrichError) {
          console.warn('neynar enrichment failed:', enrichError)
        }
      }

      const updatedAt = latestUpdate > 0 ? latestUpdate : Date.now()

      return { total: resolvedTotal, entries, updatedAt }
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId)
      const isLastAttempt = attempt === attempts - 1
      const message = formatSupabaseError(error)
      if (isLastAttempt) {
        console.warn('supabase leaderboard fetch failed:', message)
        return null
      }

      const backoff = Math.min(500, 150 * (attempt + 1))
      await new Promise(resolve => setTimeout(resolve, backoff))
    }
  }

  return null
}

export const GET = withErrorHandler(async (req: Request) => {
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const url = new URL(req.url)
    
    // Validate query parameters with Zod
    const queryValidation = LeaderboardQuerySchema.safeParse({
      chain: url.searchParams.get('chain') || undefined,
      limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined,
      offset: url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!) : undefined,
      eventType: url.searchParams.get('eventType') || undefined,
      timeframe: url.searchParams.get('timeframe') || undefined,
    })
    
    if (!queryValidation.success) {
      return NextResponse.json(
        { error: 'validation_error', issues: queryValidation.error.issues },
        { status: 400 }
      )
    }
    
    const chainParam = queryValidation.data.chain || 'base'
    const limit = Math.min(queryValidation.data.limit ?? 50, 500)
    const offset = queryValidation.data.offset ?? 0
    const eventType = queryValidation.data.eventType || 'all'
    const timeframe = queryValidation.data.timeframe || 'all-time'
    const seasonParam = url.searchParams.get('season')
    const global = url.searchParams.get('global') === '1' || url.searchParams.get('global') === 'true'

    if (!global && !isGMChain(chainParam)) {
      return NextResponse.json({ ok: false, reason: 'unsupported_chain' }, { status: 400 })
    }

    const chain: GMChainKey = global ? 'base' : (isGMChain(chainParam) ? chainParam : 'base')
    const seasonKey = seasonParam ? (SEASONS_SUPPORTED ? seasonParam : 'unsupported') : 'all'
    const cacheKey = `lb:${chain}:${global ? 'global' : 'chain'}:${seasonKey}:${eventType}:${timeframe}:${offset}:${limit}`

    if (cache && cache.key === cacheKey && Date.now() - cache.at < CACHE_TTL) {
      return NextResponse.json(cache.data, { headers: CACHE_HEADERS })
    }

    // Use event-based leaderboard when filtering by event type or timeframe
    const useEventBasedLeaderboard = eventType !== 'all' || timeframe !== 'all-time'
    
    if (useEventBasedLeaderboard) {
      const eventResult = await fetchEventBasedLeaderboard({ 
        chain, 
        global, 
        season: seasonParam, 
        limit, 
        offset,
        eventType,
        timeframe,
      })
      
      if (eventResult) {
        const data: LeaderboardResponse = {
          ok: true,
          chain,
          global,
          offset,
          limit,
          total: eventResult.total,
          top: eventResult.entries,
          updatedAt: eventResult.updatedAt,
          seasonSupported: SEASONS_SUPPORTED,
          profileSupported: PROFILE_SUPPORTED,
          seasonWarning: seasonParam && !SEASONS_SUPPORTED ? 'season_data_unavailable' : undefined,
        }

        cache = { key: cacheKey, at: Date.now(), data }
        return NextResponse.json(data, { headers: CACHE_HEADERS })
      }
      // Fall through to snapshot-based leaderboard if event-based fails
    }

    const supabaseResult = await fetchLeaderboardFromSupabase({ chain, global, season: seasonParam, limit, offset })
    if (supabaseResult) {
      const data: LeaderboardResponse = {
        ok: true,
        chain,
        global,
        offset,
        limit,
        total: supabaseResult.total,
        top: supabaseResult.entries,
        updatedAt: supabaseResult.updatedAt,
        seasonSupported: SEASONS_SUPPORTED,
        profileSupported: PROFILE_SUPPORTED,
        seasonWarning: seasonParam && !SEASONS_SUPPORTED ? 'season_data_unavailable' : undefined,
      }

      cache = { key: cacheKey, at: Date.now(), data }
      return NextResponse.json(data, { headers: CACHE_HEADERS })
    }

    const { total, enriched, updatedAt } = await computeLeaderboardSlice({
      global,
      chain,
      limit,
      offset,
    })

    const top: LeaderboardEntry[] = enriched.map((row, index) => ({
      rank: offset + index + 1,
      address: row.address,
      chain: row.chain,
      points: row.points,
      pfpUrl: row.pfpUrl,
      name: row.name,
      farcasterFid: row.farcasterFid,
      completed: row.completed,
      rewards: row.rewards,
      seasonAlloc: row.seasonAlloc,
    }))

    const data: LeaderboardResponse = {
      ok: true,
      chain,
      global,
      offset,
      limit,
      total,
      top,
      updatedAt,
      seasonSupported: SEASONS_SUPPORTED,
      profileSupported: PROFILE_SUPPORTED,
      seasonWarning: seasonParam && !SEASONS_SUPPORTED ? 'season_data_unavailable' : undefined,
    }

    cache = { key: cacheKey, at: Date.now(), data }
    return NextResponse.json(data, { headers: CACHE_HEADERS })
})
