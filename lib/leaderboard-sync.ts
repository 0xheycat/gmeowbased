import type { SupabaseClient } from '@supabase/supabase-js'
import { CHAIN_KEYS, type ChainKey } from '@/lib/gm-utils'
import { fetchAggregatedRaw, enrichAggregatedRows, PROFILE_SUPPORTED } from '@/lib/leaderboard-aggregator'

type SyncLogger = {
  info?: (message?: unknown, ...optional: unknown[]) => void
  warn?: (message?: unknown, ...optional: unknown[]) => void
  error?: (message?: unknown, ...optional: unknown[]) => void
}

type SyncOptions = {
  supabase: SupabaseClient
  tableName?: string
  seasonKey?: string
  updatedAt?: Date
  logger?: SyncLogger
}

type SyncResult = {
  updatedAtIso: string
  globalRows: number
  perChain: Record<ChainKey, number>
  totalRows: number
  profileSupported: boolean
}

const DEFAULT_TABLE = process.env.SUPABASE_LEADERBOARD_TABLE || 'leaderboard_snapshots'
const DEFAULT_SEASON_KEY = process.env.SUPABASE_LEADERBOARD_SEASON_KEY || 'all'

async function buildPayload(
  options: { global: boolean; chain?: ChainKey },
  seasonKey: string,
  updatedAtIso: string,
): Promise<{
  rows: Array<{
    address: `0x${string}`
    chain: ChainKey
    season_key: string
    global: boolean
    points: number
    completed: number
    rewards: number
    season_alloc: number
    farcaster_fid: number | null
    display_name: string | null
    pfp_url: string | null
    rank: number
    updated_at: string
  }>
  updatedAtIso: string
}> {
  const { global, chain } = options
  const { rows } = await fetchAggregatedRaw({ global, chain })
  const enriched = await enrichAggregatedRows(rows)

  const payload = enriched.map((row, index) => ({
    address: row.address,
    chain: row.chain,
    season_key: seasonKey,
    global,
    points: row.points,
    completed: row.completed,
    rewards: row.rewards,
    season_alloc: row.seasonAlloc,
    farcaster_fid: row.farcasterFid || null,
    display_name: row.name || null,
    pfp_url: row.pfpUrl || null,
    rank: index + 1,
    updated_at: updatedAtIso,
  }))

  return { rows: payload, updatedAtIso }
}

async function upsertSegment(
  supabase: SupabaseClient,
  tableName: string,
  payload: Awaited<ReturnType<typeof buildPayload>>['rows'],
  filters: Array<[string, string | number | boolean]>,
) {
  const deleteQuery = filters.reduce((query, [column, value]) => query.eq(column, value), supabase.from(tableName).delete())
  const { error: deleteError } = await deleteQuery
  if (deleteError) throw deleteError

  if (payload.length === 0) return

  const { error: insertError } = await supabase.from(tableName).insert(payload)
  if (insertError) throw insertError
}

export async function syncSupabaseLeaderboard(options: SyncOptions): Promise<SyncResult> {
  const { supabase, logger } = options
  const tableName = options.tableName ?? DEFAULT_TABLE
  const seasonKey = options.seasonKey ?? DEFAULT_SEASON_KEY
  const updatedAtIso = options.updatedAt?.toISOString() ?? new Date().toISOString()

  const logInfo = (message?: unknown, ...optional: unknown[]) => {
    if (logger && typeof logger.info === 'function') {
      logger.info(message, ...optional)
    }
  }

  const perChainCounts: Record<ChainKey, number> = Object.create(null)

  logInfo(
    'Building global leaderboard snapshot (profiles %s)...',
    PROFILE_SUPPORTED ? 'enabled' : 'disabled',
  )
  const { rows: globalRows } = await buildPayload({ global: true }, seasonKey, updatedAtIso)
  await upsertSegment(
    supabase,
    tableName,
    globalRows,
    [
      ['global', true],
      ['season_key', seasonKey],
    ],
  )
  logInfo('Stored %d global rows', globalRows.length)

  for (const chain of CHAIN_KEYS) {
    logInfo('Building %s leaderboard snapshot', chain)
    const { rows: chainRows } = await buildPayload({ global: false, chain }, seasonKey, updatedAtIso)
    await upsertSegment(
      supabase,
      tableName,
      chainRows,
      [
        ['global', false],
        ['chain', chain],
        ['season_key', seasonKey],
      ],
    )
    perChainCounts[chain] = chainRows.length
    logInfo('Stored %d rows for %s', chainRows.length, chain)
  }

  const totalRows = globalRows.length + Object.values(perChainCounts).reduce((sum, count) => sum + count, 0)

  return {
    updatedAtIso,
    globalRows: globalRows.length,
    perChain: perChainCounts,
    totalRows,
    profileSupported: PROFILE_SUPPORTED,
  }
  }