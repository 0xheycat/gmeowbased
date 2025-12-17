import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { CHAIN_KEYS, CONTRACT_ADDRESSES, type ChainKey } from '@/lib/contracts/gmeow-utils'
import { getRpcUrl } from '@/lib/contracts/rpc'
import { createPublicClient, http, parseAbiItem, type AbiEvent, type Log } from 'viem'
import type { SupabaseClient } from '@supabase/supabase-js'

export type TelemetryMetric = {
  value: number
  delta: number
}

export type TelemetryTrends = {
  tips: number[]
  quests: number[]
  guilds: number[]
}

export type TelemetryAlert = {
  id: string
  label: string
  detail: string
  occurredAt: number
}

export type TelemetrySummary = {
  refreshedAt: number
  summary: {
    tips: TelemetryMetric
    quests: TelemetryMetric
    guilds: TelemetryMetric
    badges: TelemetryMetric
  }
  trends: TelemetryTrends
  alerts: TelemetryAlert[]
}

const TELEMETRY_CACHE_TTL_MS = Number(process.env.TELEMETRY_CACHE_TTL_MS ?? 60_000)
const DASHBOARD_CACHE_TTL_MS = Number(process.env.DASHBOARD_TELEMETRY_TTL_MS ?? 60_000)
const RPC_TIMEOUT_MS = 8000 // 8 second timeout per RPC call

const DAY_MS = 86_400_000
const DAY_SECONDS = 86_400
const LOOKBACK_DAYS = 7
const LOOKBACK_BUFFER_SECONDS = 6 * 60 * 60
const DEFAULT_BLOCK_TIME_SEC = 3

const BLOCK_TIME_SEC: Partial<Record<ChainKey, number>> = {
  base: 2,
  unichain: 2,
  op: 2,
  celo: 5,
}

type CacheBucket = {
  value: TelemetrySummary
  expiresAt: number
}

type DashboardCacheBucket = {
  value: DashboardTelemetryPayload
  expiresAt: number
}

type TelemetrySeries = {
  daily: number[]
  last24h: number
  previous24h: number
  total7d: number
}

type SeriesMap = {
  tips: TelemetrySeries
  quests: TelemetrySeries
  guilds: TelemetrySeries
  badges: TelemetrySeries
}

type EventConfig = {
  label: string
  event: AbiEvent
  extract: (log: Log) => number
}

export type RankTelemetryEventKind =
  | 'quest-create'
  | 'quest-verify'
  | 'gm'
  | 'tip'
  | 'stake'
  | 'unstake'
  | 'stats-query'

export type RankTelemetryEventInput = {
  event: RankTelemetryEventKind
  chain: ChainKey
  walletAddress: `0x${string}` | string
  fid?: number | null
  questId?: number | null
  delta: number
  totalPoints: number
  previousTotal?: number | null
  level: number
  tierName: string
  tierPercent: number
  metadata?: Record<string, unknown> | null
}

let cache: CacheBucket | null = null
let dashboardCache: DashboardCacheBucket | null = null

const telemetryClientCache = new Map<ChainKey, ReturnType<typeof createPublicClient>>()

const EVT_POINTS_TIPPED = parseAbiItem(
  'event PointsTipped(address indexed from, address indexed to, uint256 points, uint256 fid)',
) as AbiEvent
const EVT_QUEST_COMPLETED = parseAbiItem(
  'event QuestCompleted(uint256 indexed questId, address indexed user, uint256 pointsAwarded, uint256 fid, address rewardToken, uint256 tokenAmount)',
) as AbiEvent
const EVT_GUILD_POINTS_DEPOSITED = parseAbiItem(
  'event GuildPointsDeposited(uint256 indexed guildId, address indexed from, uint256 amount)',
) as AbiEvent
const EVT_GUILD_TREASURY_TOKEN_DEPOSITED = parseAbiItem(
  'event GuildTreasuryTokenDeposited(uint256 indexed guildId, address indexed token, uint256 amount)',
) as AbiEvent
const EVT_BADGE_MINTED = parseAbiItem(
  'event BadgeMinted(address indexed to, uint256 tokenId, string badgeType)',
) as AbiEvent
const EVT_GM_SENT = parseAbiItem(
  'event GMSent(address indexed user, uint256 streak, uint256 pointsEarned)',
) as AbiEvent

export type ChainDashboardTelemetry = {
  chain: ChainKey
  activePilots24h: number
  activePilots7d: number
  questCompletions24h: number
  tipsVolume24h: number
  guildDeposits24h: number
  badgeMints24h: number
  streakBreaks24h: number
}

export type DashboardTelemetryPayload = {
  ok: true
  updatedAt: string
  ttl: number
  latencyMs: number
  totals: {
    activePilots24h: number
    activePilots7d: number
    questCompletions24h: number
    tipsVolume24h: number
    guildDeposits24h: number
    badgeMints24h: number
    streakBreaks24h: number
  }
  chains: ChainDashboardTelemetry[]
  notes: string[]
  version: string
}

function buildEmptySummary(): TelemetrySummary {
  return {
    refreshedAt: Date.now(),
    summary: {
      tips: { value: 0, delta: 0 },
      quests: { value: 0, delta: 0 },
      guilds: { value: 0, delta: 0 },
      badges: { value: 0, delta: 0 },
    },
    trends: {
      tips: Array(LOOKBACK_DAYS).fill(0),
      quests: Array(LOOKBACK_DAYS).fill(0),
      guilds: Array(LOOKBACK_DAYS).fill(0),
    },
    alerts: [],
  }
}

function toSafeNumber(value: unknown): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) return 0
    return value
  }
  if (typeof value === 'bigint') {
    if (value < 0n) return 0
    const max = BigInt(Number.MAX_SAFE_INTEGER)
    return value > max ? Number(max) : Number(value)
  }
  return 0
}

function normalizeAddressValue(value: unknown): `0x${string}` | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().toLowerCase()
  if (!/^0x[0-9a-f]{40}$/.test(trimmed)) return null
  return trimmed as `0x${string}`
}

function getStartBlock(chain: ChainKey): bigint {
  const envKey = `CHAIN_START_BLOCK_${chain.toUpperCase()}`
  const direct = process.env[envKey]
  if (direct) {
    const parsed = Number(direct)
    if (Number.isFinite(parsed) && parsed >= 0) return BigInt(Math.floor(parsed))
  }
  const inline = process.env.CHAIN_START_BLOCK
  if (inline) {
    for (const chunk of inline.split(',')) {
      const [key, value] = chunk.split(':').map(part => part.trim())
      if (key === chain) {
        const parsed = Number(value)
        if (Number.isFinite(parsed) && parsed >= 0) return BigInt(Math.floor(parsed))
      }
    }
  }
  return 0n
}

function getTelemetryClient(chain: ChainKey) {
  const cached = telemetryClientCache.get(chain)
  if (cached) return cached

  let rpc = ''
  try {
    rpc = getRpcUrl(chain)
  } catch {
    rpc = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_BASE || ''
  }

  if (!rpc) {
    throw new Error(`RPC URL not configured for chain ${chain}`)
  }

  const client = createPublicClient({ transport: http(rpc) })
  telemetryClientCache.set(chain, client)
  return client
}

function allocateToBucket(daily: number[], timestampMs: number, value: number, now: number) {
  if (value <= 0) return
  const delta = now - timestampMs
  if (delta < 0 || delta > LOOKBACK_DAYS * DAY_MS) return
  const daysAgo = Math.floor(delta / DAY_MS)
  if (daysAgo < 0 || daysAgo >= LOOKBACK_DAYS) return
  const index = LOOKBACK_DAYS - 1 - daysAgo
  daily[index] += value
}

async function computeSeries(configs: EventConfig[]): Promise<TelemetrySeries> {
  const daily = Array(LOOKBACK_DAYS).fill(0)
  const now = Date.now()
  const lookbackSeconds = LOOKBACK_DAYS * DAY_SECONDS + LOOKBACK_BUFFER_SECONDS

  await Promise.all(
    CHAIN_KEYS.map(async chain => {
      let client
      try {
        client = getTelemetryClient(chain)
      } catch (error) {
        console.warn('[telemetry] failed to init client', { chain, error: (error as Error)?.message || error })
        return
      }
      const latestBlock = await client.getBlockNumber().catch(() => 0n)
      if (latestBlock === 0n) return

      const blockTime = BLOCK_TIME_SEC[chain] ?? DEFAULT_BLOCK_TIME_SEC
      const approxBlocks = BigInt(Math.ceil(lookbackSeconds / Math.max(blockTime, 1)))
      const startBlock = getStartBlock(chain)

      let fromBlock = latestBlock > approxBlocks ? latestBlock - approxBlocks : 0n
      if (startBlock > fromBlock) fromBlock = startBlock
      if (fromBlock > latestBlock) return

      const blockTimestampCache = new Map<bigint, number>()
      const getBlockTimestamp = async (blockNumber: bigint) => {
        const cachedTs = blockTimestampCache.get(blockNumber)
        if (cachedTs) return cachedTs
        const block = await client.getBlock({ blockNumber })
        const timestamp = Number(block.timestamp) * 1000
        blockTimestampCache.set(blockNumber, timestamp)
        return timestamp
      }

      for (const config of configs) {
        let logs: Log[] = []
        try {
          logs = await client.getLogs({
            address: CONTRACT_ADDRESSES[chain],
            event: config.event,
            fromBlock,
            toBlock: latestBlock,
          })
        } catch (error) {
          console.warn('[telemetry] log fetch failed', { chain, event: config.label, error: (error as Error)?.message || error })
          continue
        }

        for (const log of logs) {
          const blockNumber = log.blockNumber
          if (blockNumber == null) continue
          const timestampMs = await getBlockTimestamp(blockNumber)
          allocateToBucket(daily, timestampMs, config.extract(log), now)
        }
      }
    }),
  )

  const last24h = daily[LOOKBACK_DAYS - 1] ?? 0
  const previous24h = daily[LOOKBACK_DAYS - 2] ?? 0
  const total7d = daily.reduce((sum, value) => sum + value, 0)

  return { daily, last24h, previous24h, total7d }
}

function computeDelta(series: TelemetrySeries): number {
  const previousDays = series.daily.slice(0, LOOKBACK_DAYS - 1)
  const previousTotal = previousDays.reduce((sum, value) => sum + value, 0)
  const sample = previousDays.length || 1
  const average = previousTotal / sample
  if (!Number.isFinite(average) || average <= 0) {
    return series.last24h > 0 ? 100 : 0
  }
  const raw = ((series.last24h - average) / average) * 100
  if (!Number.isFinite(raw)) return 0
  if (raw > 999) return 999
  if (raw < -999) return -999
  return Number(raw.toFixed(1))
}

function formatPercent(delta: number): string {
  const formatted = delta.toFixed(1)
  return delta > 0 ? `+${formatted}%` : `${formatted}%`
}

function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return '0'
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

function buildAlerts(series: SeriesMap, deltas: Record<keyof SeriesMap, number>, now: number): TelemetryAlert[] {
  const alerts: TelemetryAlert[] = []

  if (series.tips.last24h > 0 && deltas.tips >= 25) {
    alerts.push({
      id: `tips-${Math.floor(now / 1000)}`,
      label: 'Tip surge',
      detail: `Tip volume hit ${formatQuantity(series.tips.last24h)} pts in the last 24h (${formatPercent(deltas.tips)} vs avg).`,
      occurredAt: now,
    })
  }

  if (series.quests.last24h > 0 && deltas.quests >= 35) {
    alerts.push({
      id: `quests-${Math.floor(now / 1000)}`,
      label: 'Quest momentum',
      detail: `${formatQuantity(series.quests.last24h)} quests verified in the last 24h (${formatPercent(deltas.quests)} change).`,
      occurredAt: now,
    })
  }

  if (series.guilds.last24h > 0 && deltas.guilds >= 25) {
    alerts.push({
      id: `guilds-${Math.floor(now / 1000)}`,
      label: 'Guild treasury spike',
      detail: `Guild deposits totalled ${formatQuantity(series.guilds.last24h)} pts in 24h (${formatPercent(deltas.guilds)} vs avg).`,
      occurredAt: now,
    })
  }

  if (series.badges.last24h > 0 && deltas.badges >= 25) {
    alerts.push({
      id: `badges-${Math.floor(now / 1000)}`,
      label: 'Badge mint streak',
      detail: `${formatQuantity(series.badges.last24h)} badges minted over the last 24h (${formatPercent(deltas.badges)} change).`,
      occurredAt: now,
    })
  }

  return alerts
}

async function fetchSupabaseAggregate(_supabase: SupabaseClient): Promise<TelemetrySummary | null> {
  // TODO: replace with Supabase-native telemetry snapshots once the data pipeline is live.
  // Returning null ensures we fall back to the on-chain aggregate for now.
  return null
}

async function fetchOnchainAggregate(): Promise<TelemetrySummary> {
  const [tipsSeries, questSeries, guildSeries, badgeSeries] = await Promise.all([
    computeSeries([
      {
        label: 'PointsTipped',
        event: EVT_POINTS_TIPPED,
        extract: log => {
          const args = (log as unknown as { args?: Record<string, unknown> }).args || {}
          return toSafeNumber(args.points)
        },
      },
    ]),
    computeSeries([
      {
        label: 'QuestCompleted',
        event: EVT_QUEST_COMPLETED,
        extract: () => 1,
      },
    ]),
    computeSeries([
      {
        label: 'GuildPointsDeposited',
        event: EVT_GUILD_POINTS_DEPOSITED,
        extract: log => {
          const args = (log as unknown as { args?: Record<string, unknown> }).args || {}
          return toSafeNumber(args.amount)
        },
      },
      {
        label: 'GuildTreasuryTokenDeposited',
        event: EVT_GUILD_TREASURY_TOKEN_DEPOSITED,
        extract: log => {
          const args = (log as unknown as { args?: Record<string, unknown> }).args || {}
          return toSafeNumber(args.amount)
        },
      },
    ]),
    computeSeries([
      {
        label: 'BadgeMinted',
        event: EVT_BADGE_MINTED,
        extract: () => 1,
      },
    ]),
  ])

  const now = Date.now()
  const series: SeriesMap = {
    tips: tipsSeries,
    quests: questSeries,
    guilds: guildSeries,
    badges: badgeSeries,
  }

  const deltas: Record<keyof SeriesMap, number> = {
    tips: computeDelta(tipsSeries),
    quests: computeDelta(questSeries),
    guilds: computeDelta(guildSeries),
    badges: computeDelta(badgeSeries),
  }

  return {
    refreshedAt: now,
    summary: {
      tips: { value: tipsSeries.last24h, delta: deltas.tips },
      quests: { value: questSeries.last24h, delta: deltas.quests },
      guilds: { value: guildSeries.last24h, delta: deltas.guilds },
      badges: { value: badgeSeries.last24h, delta: deltas.badges },
    },
    trends: {
      tips: tipsSeries.daily,
      quests: questSeries.daily,
      guilds: guildSeries.daily,
    },
    alerts: buildAlerts(series, deltas, now),
  }
}

async function fetchDashboardTelemetryPayload(): Promise<DashboardTelemetryPayload> {
  const startedAt = Date.now()
  const now = startedAt
  const cutoff24h = now - DAY_MS
  const cutoff7d = now - DAY_MS * 7
  const lookbackSeconds = 7 * DAY_SECONDS + LOOKBACK_BUFFER_SECONDS

  const globalActive24h = new Set<string>()
  const globalActive7d = new Set<string>()
  const chains: ChainDashboardTelemetry[] = []
  const notes: string[] = []

  let totalQuest = 0
  let totalTips = 0
  let totalGuild = 0
  let totalBadges = 0
  let totalStreakBreaks = 0

  for (const chain of CHAIN_KEYS) {
    const chainStarted = Date.now()
    const chainStats: ChainDashboardTelemetry = {
      chain,
      activePilots24h: 0,
      activePilots7d: 0,
      questCompletions24h: 0,
      tipsVolume24h: 0,
      guildDeposits24h: 0,
      badgeMints24h: 0,
      streakBreaks24h: 0,
    }
    const chainActive24h = new Set<string>()
    const chainActive7d = new Set<string>()

    try {
      const client = getTelemetryClient(chain)
      const latestBlock = await Promise.race([
        client.getBlockNumber(),
        new Promise<0n>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), RPC_TIMEOUT_MS)
        )
      ]).catch(() => 0n)
      
      if (latestBlock === 0n) {
        notes.push(`[${chain}] latest block unavailable`)
      } else {
        const blockTime = BLOCK_TIME_SEC[chain] ?? DEFAULT_BLOCK_TIME_SEC
        const approxBlocks = BigInt(Math.ceil(lookbackSeconds / Math.max(blockTime, 1)))
        const baseStartBlock = getStartBlock(chain)

        let fromBlock = latestBlock > approxBlocks ? latestBlock - approxBlocks : 0n
        if (baseStartBlock > fromBlock) fromBlock = baseStartBlock
        if (fromBlock > latestBlock) fromBlock = latestBlock

        const fetchLogs = async (event: AbiEvent, label: string) => {
          try {
            const logs = await Promise.race([
              client.getLogs({
                address: CONTRACT_ADDRESSES[chain],
                event,
                fromBlock,
                toBlock: latestBlock,
              }),
              new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), RPC_TIMEOUT_MS)
              )
            ])
            return logs as Log[]
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error)
            notes.push(`[${chain}] ${label} logs failed: ${msg}`)
            return [] as Log[]
          }
        }

        const [questLogs, gmLogs, tipLogs, guildPointLogs, guildTokenLogs, badgeLogs] = await Promise.all([
          fetchLogs(EVT_QUEST_COMPLETED, 'QuestCompleted'),
          fetchLogs(EVT_GM_SENT, 'GMSent'),
          fetchLogs(EVT_POINTS_TIPPED, 'PointsTipped'),
          fetchLogs(EVT_GUILD_POINTS_DEPOSITED, 'GuildPointsDeposited'),
          fetchLogs(EVT_GUILD_TREASURY_TOKEN_DEPOSITED, 'GuildTreasuryTokenDeposited'),
          fetchLogs(EVT_BADGE_MINTED, 'BadgeMinted'),
        ])

        const allLogs = [questLogs, gmLogs, tipLogs, guildPointLogs, guildTokenLogs, badgeLogs]
        const blockNumbers = new Set<bigint>()
        for (const list of allLogs) {
          for (const log of list) {
            if (log.blockNumber != null) blockNumbers.add(log.blockNumber)
          }
        }

        const timestampMap = new Map<bigint, number>()
        // Limit concurrent block fetches to prevent RPC overload
        const blockArray = Array.from(blockNumbers).slice(0, 50) // Max 50 blocks
        await Promise.all(
          blockArray.map(async blockNumber => {
            if (timestampMap.has(blockNumber)) return
            try {
              const block = await Promise.race([
                client.getBlock({ blockNumber }),
                new Promise<never>((_, reject) => 
                  setTimeout(() => reject(new Error('Timeout')), RPC_TIMEOUT_MS)
                )
              ])
              timestampMap.set(blockNumber, Number(block.timestamp) * 1000)
            } catch (error) {
              const msg = error instanceof Error ? error.message : String(error)
              notes.push(`[${chain}] block ${blockNumber.toString()} fetch failed: ${msg}`)
            }
          }),
        )

        const getTimestamp = (log: Log): number | null => {
          const blockNumber = log.blockNumber
          if (blockNumber == null) return null
          return timestampMap.get(blockNumber) ?? null
        }

        const registerActive = (timestamp: number | null, address: unknown) => {
          if (timestamp == null) return
          const normalized = normalizeAddressValue(address)
          if (!normalized) return
          if (timestamp >= cutoff7d) chainActive7d.add(normalized)
          if (timestamp >= cutoff24h) chainActive24h.add(normalized)
        }

        for (const log of questLogs) {
          const timestamp = getTimestamp(log)
          const args = (log as unknown as { args?: Record<string, unknown> }).args ?? {}
          registerActive(timestamp, args.user)
          if (timestamp != null && timestamp >= cutoff24h) {
            chainStats.questCompletions24h += 1
          }
        }

        for (const log of gmLogs) {
          const timestamp = getTimestamp(log)
          const args = (log as unknown as { args?: Record<string, unknown> }).args ?? {}
          registerActive(timestamp, args.user)
          if (timestamp != null && timestamp >= cutoff24h) {
            const streakValue = toSafeNumber(args.streak)
            if (streakValue <= 1) chainStats.streakBreaks24h += 1
          }
        }

        for (const log of tipLogs) {
          const timestamp = getTimestamp(log)
          if (timestamp == null || timestamp < cutoff24h) continue
          const args = (log as unknown as { args?: Record<string, unknown> }).args ?? {}
          chainStats.tipsVolume24h += toSafeNumber(args.points)
        }

        for (const log of guildPointLogs) {
          const timestamp = getTimestamp(log)
          if (timestamp == null || timestamp < cutoff24h) continue
          const args = (log as unknown as { args?: Record<string, unknown> }).args ?? {}
          chainStats.guildDeposits24h += toSafeNumber(args.amount)
        }

        for (const log of guildTokenLogs) {
          const timestamp = getTimestamp(log)
          if (timestamp == null || timestamp < cutoff24h) continue
          const args = (log as unknown as { args?: Record<string, unknown> }).args ?? {}
          chainStats.guildDeposits24h += toSafeNumber(args.amount)
        }

        for (const log of badgeLogs) {
          const timestamp = getTimestamp(log)
          if (timestamp == null || timestamp < cutoff24h) continue
          chainStats.badgeMints24h += 1
        }

        const processedIn = Date.now() - chainStarted
        notes.push(`[${chain}] processed ${questLogs.length} quests, ${gmLogs.length} gms in ${processedIn}ms`)
      }
    } catch (error) {
      notes.push(`[${chain}] telemetry error: ${(error as Error)?.message || error}`)
    }

    chainStats.activePilots24h = chainActive24h.size
    chainStats.activePilots7d = chainActive7d.size

    chainActive24h.forEach(addr => globalActive24h.add(addr))
    chainActive7d.forEach(addr => globalActive7d.add(addr))

    totalQuest += chainStats.questCompletions24h
    totalTips += chainStats.tipsVolume24h
    totalGuild += chainStats.guildDeposits24h
    totalBadges += chainStats.badgeMints24h
    totalStreakBreaks += chainStats.streakBreaks24h

    chains.push(chainStats)
  }

  const totals = {
    activePilots24h: globalActive24h.size,
    activePilots7d: globalActive7d.size,
    questCompletions24h: totalQuest,
    tipsVolume24h: totalTips,
    guildDeposits24h: totalGuild,
    badgeMints24h: totalBadges,
    streakBreaks24h: totalStreakBreaks,
  }

  const latencyMs = Date.now() - startedAt
  notes.push(`latency:${latencyMs}ms`)

  return {
    ok: true,
    updatedAt: new Date(now).toISOString(),
    ttl: Math.max(15, Math.floor(DASHBOARD_CACHE_TTL_MS / 1000)),
    latencyMs,
    totals,
    chains,
    notes,
    version: '2025.11.07-alpha',
  }
}

export async function getDashboardTelemetry(): Promise<DashboardTelemetryPayload> {
  const now = Date.now()
  if (dashboardCache && dashboardCache.expiresAt > now) {
    return dashboardCache.value
  }
  const value = await fetchDashboardTelemetryPayload()
  dashboardCache = {
    value,
    expiresAt: now + DASHBOARD_CACHE_TTL_MS,
  }
  return value
}

export async function getTelemetrySummary(): Promise<TelemetrySummary> {
  const now = Date.now()
  if (cache && cache.expiresAt > now) {
    return cache.value
  }

  let summary: TelemetrySummary | null = null

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServerClient()
    if (supabase) {
      summary = await fetchSupabaseAggregate(supabase)
    }
  }

  if (!summary) {
    summary = await fetchOnchainAggregate().catch(error => {
      console.warn('[telemetry] on-chain aggregate failed:', (error as Error)?.message || error)
      return buildEmptySummary()
    })
  }

  cache = {
    value: summary,
    expiresAt: now + TELEMETRY_CACHE_TTL_MS,
  }

  return summary
}

// @edit-start 2025-11-11 — Rank telemetry insertion
const RANK_EVENT_TABLE = 'gmeow_rank_events'

function toRounded(value: number, fallback = 0): number {
  if (!Number.isFinite(value)) return fallback
  return Math.round(value)
}

export async function recordRankEvent(input: RankTelemetryEventInput): Promise<void> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return

  const normalizedAddress = normalizeAddressValue(input.walletAddress)
  if (!normalizedAddress) return

  const payload = {
    event_type: input.event,
    chain: input.chain,
    wallet_address: normalizedAddress,
    fid: input.fid ?? null,
    quest_id: input.questId ?? null,
    delta: toRounded(input.delta),
    total_points: toRounded(input.totalPoints),
    previous_points: input.previousTotal != null ? toRounded(input.previousTotal) : null,
    level: toRounded(input.level, 0),
    tier_name: input.tierName,
    tier_percent: (() => {
      if (!Number.isFinite(input.tierPercent)) return null
      if (input.event === 'stats-query') {
        return Math.max(0, Math.min(100, Number((input.tierPercent as number).toFixed(2))))
      }
      return Math.max(0, Math.min(100, Number(((input.tierPercent as number) * 100).toFixed(2))))
    })(),
    metadata: input.metadata ?? null,
  }

  try {
    await supabase.from(RANK_EVENT_TABLE).insert(payload)
  } catch (error) {
    console.warn('[telemetry] recordRankEvent failed:', (error as Error)?.message || error)
  }
}
// @edit-end

export function resetTelemetryCache() {
  cache = null
}

export function resetDashboardTelemetryCache() {
  dashboardCache = null
}
