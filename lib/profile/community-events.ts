/**
 * @file lib/profile/community-events.ts
 * @description Community event aggregation system for activity feeds and notifications.
 * Fetches, formats, and enriches rank events from Supabase with Farcaster profile data.
 * 
 * PHASE: Phase 6.3 - Profile Category Consolidation (December 17, 2025)
 * CONSOLIDATED FROM:
 *   - lib/profile/community-event-types.ts (48 lines, type definitions)
 *   - lib/profile/community-events.ts (374 lines, event aggregation logic)
 * 
 * FEATURES:
 *   - Event type system (gm, quest-verify, quest-create, tip, stats-query, stake, unstake)
 *   - Real-time activity feed from gmeow_rank_events table
 *   - Farcaster profile enrichment via Neynar API
 *   - Contextual headlines and descriptions
 *   - Smart CTAs (call-to-action links)
 *   - Pagination with cursor-based navigation
 *   - Type filtering and time-based queries
 * 
 * REFERENCE DOCUMENTATION:
 *   - LIB-REFACTOR-PLAN.md (Phase 6.3)
 *   - DOCS-STRUCTURE.md (Profile system)
 *   - Supabase: gmeow_rank_events table schema
 *   - Neynar API: User profile enrichment
 * 
 * REQUIREMENTS:
 *   - Website: https://gmeowhq.art
 *   - Network: Base blockchain
 *   - NO EMOJIS in production code
 *   - NO HARDCODED COLORS
 *   - Supabase configured (falls back gracefully if not)
 *   - Neynar API for Farcaster data enrichment
 * 
 * TODO:
 *   - [ ] Add event caching layer (Redis/Upstash) for high-traffic periods
 *   - [ ] Implement real-time subscriptions for live activity feed
 *   - [ ] Add event analytics (most popular event types, peak times)
 *   - [ ] Support event reactions/comments (future social feature)
 * 
 * CRITICAL:
 *   - Validate 'since' parameter to prevent SQL injection/errors
 *   - Handle Neynar API failures gracefully (don't block event listing)
 *   - Batch Farcaster profile lookups (avoid rate limits)
 *   - Use proper cursor-based pagination (not offset/limit)
 * 
 * SUGGESTIONS:
 *   - Consider WebSocket/SSE for real-time event streaming
 *   - Add event filtering by wallet address or FID
 *   - Implement event search by keywords
 *   - Cache enriched events for 5-10 minutes
 * 
 * AVOID:
 *   - Fetching all Farcaster profiles individually (batch them)
 *   - Hardcoded event type strings (use COMMUNITY_EVENT_TYPES constant)
 *   - Exposing raw database errors to clients
 *   - Blocking event listing if enrichment fails
 */

import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/edge'
import type { Database } from '@/types/supabase'
import { sanitizeAddress as normalizeAddress } from '@/lib/middleware/api-security'
import { fetchUserByFid, type FarcasterUser } from '@/lib/integrations/neynar'
import { CHAIN_KEYS, type ChainKey } from '@/lib/contracts/gmeow-utils'

// ========================================
// EVENT TYPE SYSTEM
// ========================================

/**
 * All supported community event types
 * Must match gmeow_rank_events.event_type enum in Supabase
 */
export const COMMUNITY_EVENT_TYPES = [
  'gm',              // GM streak logged
  'quest-verify',    // Quest completion verified
  'quest-create',    // New quest created
  'tip',             // User received tip
  'stats-query',     // User synced stats
  'stake',           // Staked into treasury
  'unstake',         // Withdrew from treasury
] as const

export type CommunityEventType = (typeof COMMUNITY_EVENT_TYPES)[number]

/**
 * Actor (user) in a community event
 */
export type CommunityEventActor = {
  fid: number | null
  username: string | null
  displayName: string | null
  walletAddress: `0x${string}` | string | null
}

/**
 * Call-to-action link for an event
 */
export type CommunityEventCta = {
  label: string
  href: string
}

/**
 * Complete community event summary (enriched with Farcaster data)
 */
export type CommunityEventSummary = {
  id: string
  eventType: CommunityEventType
  headline: string
  context: string | null
  emphasis: 'positive' | 'neutral' | 'negative'
  createdAt: string
  cursor: string
  chain: ChainKey | null
  questId: number | null
  delta: number | null
  totalPoints: number | null
  previousTotal: number | null
  level: number | null
  tierName: string | null
  tierPercent: number | null
  actor: CommunityEventActor
  metadata: Record<string, unknown> | null
  cta: CommunityEventCta | null
}

// ========================================
// FETCH OPTIONS & RESULT TYPES
// ========================================

export type FetchCommunityEventsOptions = {
  limit?: number
  since?: string | null
  types?: CommunityEventType[] | null
}

export type FetchCommunityEventsResult = {
  events: CommunityEventSummary[]
  fetchedAt: string
  nextCursor: string | null
  meta: {
    limit: number
    requestedTypes: CommunityEventType[]
    appliedTypes: CommunityEventType[]
    since: string | null
    supabaseConfigured: boolean
  }
}

type RankEventRow = {
  id?: string
  created_at?: string
  event_type?: string
  chain?: string | null
  wallet_address?: string | null
  fid?: number | string | null
  quest_id?: number | string | null
  delta?: number | string | null
  total_points?: number | string | null
  previous_points?: number | string | null
  level?: number | string | null
  tier_name?: string | null
  tier_percent?: number | string | null
  metadata?: Record<string, unknown> | null
}

// ========================================
// CONSTANTS & UTILITIES
// ========================================

const RANK_EVENT_TABLE = 'gmeow_rank_events'
const DEFAULT_LIMIT = 40
const MAX_LIMIT = 120

function clampLimit(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  const numeric = value as number
  if (numeric <= 0) return fallback
  if (numeric > MAX_LIMIT) return MAX_LIMIT
  return Math.floor(numeric)
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function coerceChain(value: unknown): ChainKey | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  return (CHAIN_KEYS as readonly string[]).includes(normalized)
    ? (normalized as ChainKey)
    : null
}

function sanitizeEventType(value: unknown): CommunityEventType | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  return (COMMUNITY_EVENT_TYPES as readonly string[]).includes(normalized)
    ? (normalized as CommunityEventType)
    : null
}

function computeEmphasis(delta: number | null): 'positive' | 'neutral' | 'negative' {
  if (delta == null || !Number.isFinite(delta)) return 'neutral'
  if (delta > 0) return 'positive'
  if (delta < 0) return 'negative'
  return 'neutral'
}

function formatActorLabel(actor: { username: string | null; displayName: string | null; fid: number | null; wallet: string | null }): string {
  if (actor.displayName) return actor.displayName
  if (actor.username) return `@${actor.username}`
  if (actor.fid) return `pilot #${actor.fid}`
  if (actor.wallet) return `${actor.wallet.slice(0, 6)}…${actor.wallet.slice(-4)}`
  return 'A pilot'
}

function toTwoDecimals(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null
  return Math.round(value * 100) / 100
}

// ========================================
// EVENT DESCRIPTION GENERATION
// ========================================

function describeEvent(row: RankEventRow, actorLabel: string): { headline: string; context: string | null } {
  const delta = coerceNumber(row.delta)
  const total = coerceNumber(row.total_points)
  const questId = coerceNumber(row.quest_id)
  const chain = typeof row.chain === 'string' ? row.chain.toUpperCase() : null
  const level = coerceNumber(row.level)
  const tierName = typeof row.tier_name === 'string' ? row.tier_name : null
  const eventType = sanitizeEventType(row.event_type)

  switch (eventType) {
    case 'gm':
      return {
        headline: `${actorLabel} logged a GM streak`,
        context: level != null && tierName
          ? `Level ${level} · ${tierName}${delta ? ` · +${delta} pts` : ''}`
          : delta
            ? `Streak synced · +${delta} pts`
            : 'Streak synced',
      }
    case 'quest-verify':
      return {
        headline: questId != null
          ? `${actorLabel} completed Quest #${questId}${chain ? ` on ${chain}` : ''}`
          : `${actorLabel} verified a quest${chain ? ` on ${chain}` : ''}`,
        context: delta != null && total != null
          ? `+${delta} pts · ${total.toLocaleString()} pts total`
          : delta != null
            ? `+${delta} pts`
            : total != null
              ? `${total.toLocaleString()} pts total`
              : null,
      }
    case 'quest-create':
      return {
        headline: `${actorLabel} launched a new quest${chain ? ` on ${chain}` : ''}`,
        context: questId != null ? `Quest ID ${questId}` : null,
      }
    case 'tip':
      return {
        headline: `${actorLabel} received a tip${chain ? ` on ${chain}` : ''}`,
        context: delta != null ? `+${delta} pts from tips` : null,
      }
    case 'stats-query':
      return {
        headline: `${actorLabel} requested a ledger sync`,
        context: total != null && tierName
          ? `${tierName} · ${total.toLocaleString()} pts`
          : total != null
            ? `${total.toLocaleString()} pts`
            : null,
      }
    case 'stake':
      return {
        headline: `${actorLabel} staked into the treasury${chain ? ` (${chain})` : ''}`,
        context: delta != null ? `Locked ${delta.toLocaleString()} pts` : null,
      }
    case 'unstake':
      return {
        headline: `${actorLabel} withdrew treasury stake${chain ? ` (${chain})` : ''}`,
        context: delta != null ? `${delta.toLocaleString()} pts withdrawn` : null,
      }
    default:
      return {
        headline: `${actorLabel} triggered ${row.event_type || 'an event'}`,
        context: delta != null ? `${delta.toLocaleString()} pts` : null,
      }
  }
}

// ========================================
// CTA GENERATION
// ========================================

function deriveCta(row: RankEventRow): { label: string; href: string } | null {
  const eventType = sanitizeEventType(row.event_type)
  const questId = coerceNumber(row.quest_id)
  const chain = typeof row.chain === 'string' ? row.chain.toLowerCase() : null

  if (eventType === 'quest-verify' || eventType === 'quest-create') {
    if (questId != null) {
      return { label: 'Review quest', href: `/Quest/leaderboard${chain ? `/${chain}` : ''}?quest=${questId}` }
    }
    return { label: 'Open quests', href: '/Quest' }
  }

  if (eventType === 'gm') {
    return { label: 'View streaks', href: '/Quest' }
  }

  if (eventType === 'tip') {
    return { label: 'Leaderboard', href: '/leaderboard' }
  }

  if (eventType === 'stats-query') {
    return { label: 'Open dashboard', href: '/Dashboard' }
  }

  return null
}

// ========================================
// ACTOR ENRICHMENT
// ========================================

function buildActorCacheEntry(user: FarcasterUser | null, fid: number | null, wallet: `0x${string}` | string | null) {
  return {
    fid,
    username: user?.username ?? null,
    displayName: user?.displayName ?? null,
    walletAddress: wallet ?? user?.custodyAddress ?? null,
  }
}

// ========================================
// MAIN FETCH FUNCTION
// ========================================

/**
 * Fetch recent community events with Farcaster profile enrichment
 * 
 * @param options - Filter and pagination options
 * @returns Enriched event list with metadata
 * 
 * @example
 * const result = await fetchRecentCommunityEvents({
 *   limit: 20,
 *   since: '2025-12-01T00:00:00Z',
 *   types: ['gm', 'quest-verify']
 * })
 */
export async function fetchRecentCommunityEvents(options: FetchCommunityEventsOptions = {}): Promise<FetchCommunityEventsResult> {
  const supabaseConfigured = isSupabaseConfigured()
  const nowIso = new Date().toISOString()
  const requestedTypes = Array.isArray(options.types) && options.types.length
    ? options.types
    : ([] as CommunityEventType[])

  if (!supabaseConfigured) {
    return {
      events: [],
      fetchedAt: nowIso,
      nextCursor: null,
      meta: {
        limit: DEFAULT_LIMIT,
        requestedTypes,
        appliedTypes: [],
        since: options.since ?? null,
        supabaseConfigured,
      },
    }
  }

  const client = getSupabaseServerClient()
  if (!client) {
    return {
      events: [],
      fetchedAt: nowIso,
      nextCursor: null,
      meta: {
        limit: DEFAULT_LIMIT,
        requestedTypes,
        appliedTypes: [],
        since: options.since ?? null,
        supabaseConfigured,
      },
    }
  }

  const appliedTypes = (requestedTypes.length ? requestedTypes : COMMUNITY_EVENT_TYPES).filter((type): type is CommunityEventType => COMMUNITY_EVENT_TYPES.includes(type))
  const limit = clampLimit(options.limit, DEFAULT_LIMIT)
  
  // Validate and normalize since parameter to prevent query errors
  let sinceFilter: string | null = null
  if (options.since && options.since.trim().length) {
    try {
      const sinceDate = new Date(options.since)
      if (!isNaN(sinceDate.getTime())) {
        sinceFilter = sinceDate.toISOString()
      } else {
        console.warn('[community-events] Invalid since parameter (not a valid date):', options.since)
      }
    } catch (err) {
      console.warn('[community-events] Failed to parse since parameter:', options.since, (err as Error)?.message)
    }
  }

  // DEPRECATED (Phase 3): gmeow_rank_events table dropped, use Subsquid
  console.warn('[getCommunityEvents] DEPRECATED: gmeow_rank_events table dropped in Phase 3')
  return {
    events: [],
    fetchedAt: new Date().toISOString(),
    nextCursor: null,
    meta: {
      limit,
      requestedTypes: appliedTypes,
      appliedTypes,
      since: sinceFilter,
      supabaseConfigured: true,
    },
  }

  /* Original implementation:
  let query = client
    .from(RANK_EVENT_TABLE)
    .select('id,created_at,event_type,chain,wallet_address,fid,quest_id,delta,total_points,previous_points,level,tier_name,tier_percent,metadata')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (appliedTypes.length) {
    query = query.in('event_type', appliedTypes as unknown as string[])
  }

  if (sinceFilter) {
    query = query.gt('created_at', sinceFilter)
  }

  const { data, error } = await query
  if (error) {
    console.error('[community-events] Supabase query failed:', {
      error,
      code: error.code,
      details: error.details,
      hint: error.hint,
      message: error.message,
      table: RANK_EVENT_TABLE,
      filters: { 
        appliedTypes, 
        limit, 
        since: sinceFilter,
        originalSince: options.since,
      },
    })
    throw new Error(`[community-events] Supabase query failed: ${error.message}`)
  }

  const rows: RankEventRow[] = Array.isArray(data) ? (data as RankEventRow[]) : []
  const fidSet = new Set<number>()

  for (const row of rows) {
    const fid = coerceNumber(row.fid)
    if (fid != null && fid > 0) fidSet.add(fid)
  }

  const actorMap = new Map<number, ReturnType<typeof buildActorCacheEntry>>()

  await Promise.all(
    Array.from(fidSet).map(async (fid) => {
      try {
        const user = await fetchUserByFid(fid)
        const entry = buildActorCacheEntry(user, fid, null)
        actorMap.set(fid, entry)
      } catch (err) {
        console.warn('[community-events] Failed to resolve Farcaster user', fid, (err as Error)?.message || err)
        actorMap.set(fid, buildActorCacheEntry(null, fid, null))
      }
    }),
  )

  const events: CommunityEventSummary[] = rows.map((row) => {
    const fid = coerceNumber(row.fid)
    const normalizedWallet = normalizeAddress(row.wallet_address) ?? null
    const actor = fid != null && fid > 0
      ? actorMap.get(fid) ?? buildActorCacheEntry(null, fid, normalizedWallet)
      : buildActorCacheEntry(null, null, normalizedWallet)

    const actorLabel = formatActorLabel({
      username: actor.username,
      displayName: actor.displayName,
      fid: actor.fid,
      wallet: actor.walletAddress,
    })

    const { headline, context } = describeEvent(row, actorLabel)
    const createdAtIso = row.created_at ? new Date(row.created_at).toISOString() : nowIso
    const cursor = row.id ? `${createdAtIso}#${row.id}` : `${createdAtIso}#${Math.random().toString(36).slice(2, 8)}`
    const delta = coerceNumber(row.delta)

    return {
      id: row.id || cursor,
      eventType: sanitizeEventType(row.event_type) ?? 'gm',
      headline,
      context,
      emphasis: computeEmphasis(delta),
      createdAt: createdAtIso,
      cursor,
      chain: coerceChain(row.chain),
      questId: coerceNumber(row.quest_id),
      delta,
      totalPoints: coerceNumber(row.total_points),
      previousTotal: coerceNumber(row.previous_points),
      level: coerceNumber(row.level),
      tierName: typeof row.tier_name === 'string' ? row.tier_name : null,
      tierPercent: toTwoDecimals(coerceNumber(row.tier_percent)),
      actor,
      metadata: row.metadata ?? null,
      cta: deriveCta(row),
    }
  })

  const nextCursor = events.length ? events[0]?.cursor ?? null : sinceFilter

  return {
    events,
    fetchedAt: nowIso,
    nextCursor,
    meta: {
      limit,
      requestedTypes,
      appliedTypes,
      since: sinceFilter,
      supabaseConfigured,
    },
  }
  */
}
