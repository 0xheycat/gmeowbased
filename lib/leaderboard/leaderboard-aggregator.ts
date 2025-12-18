import { parseAbiItem, type Log } from 'viem'
import {
  CHAIN_KEYS,
  CONTRACT_ADDRESSES,
  GM_CONTRACT_ABI,
  gmContractHasFunction,
  type ChainKey,
  type GMChainKey,
} from '@/lib/contracts/gmeow-utils'
import { fetchUsersByAddresses } from '@/lib/integrations/neynar'
import { trackWarning } from '@/lib/notifications/error-tracking'
import { getCached, invalidateCachePattern } from '@/lib/cache/server'
import { getClientByChainKey } from '@/lib/contracts/rpc-client-pool'

const EVT_QUEST_COMPLETED = parseAbiItem(
  'event QuestCompleted(uint256 indexed questId, address indexed user, uint256 pointsAwarded, uint256 fid, address rewardToken, uint256 tokenAmount)',
)
// Old cache TTLs removed in Phase 8.1.4 - migrated to unified cache system
const LOG_CHUNK_SIZE = 120_000n
const LOG_FETCH_CONCURRENCY = 4

export const PROFILE_SUPPORTED = gmContractHasFunction('getUserProfile')

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

// ========================================
// RPC CLIENT (Phase 8.2.2)
// ========================================
// Use centralized RPC client pool from rpc-client-pool.ts

type AggregateBucket = { points: bigint; completed: number; fid: number }

type ChainAggregateState = {
  updatedAt: number
  lastBlock: bigint
  totals: Map<string, AggregateBucket>
  rows: RawAggregate[]
}

type ProfileCacheEntry = { at: number; name: string; pfpUrl: string; fid: number }

// ========================================
// CACHE CONFIGURATION (Phase 8.1.4 - Unified Caching)
// ========================================
// Migrated from inline Map caches to lib/cache/server.ts
// Benefits: Stale-while-revalidate, stampede prevention, graceful degradation
const CHAIN_AGGREGATE_CACHE_TTL = 120 // 2 minutes (was AGGREGATE_CACHE_TTL 120_000ms)
const PROFILE_CACHE_TTL_SEC = 300 // 5 minutes (was PROFILE_CACHE_TTL 300_000ms)

const AGGREGATOR_DEBUG = process.env.DEBUG_LEADERBOARD_AGGREGATOR === '1'

function profileCacheKey(chain: ChainKey, address: `0x${string}`) {
  return `${chain}:${address.toLowerCase()}`
}

type QuestCompletedArgs = {
  questId: bigint
  user: `0x${string}`
  pointsAwarded: bigint
  fid: bigint
  rewardToken: `0x${string}`
  tokenAmount: bigint
}

type QuestCompletedLog = Log & { args: QuestCompletedArgs }

export type RawAggregate = {
  address: `0x${string}`
  chain: ChainKey
  points: bigint
  completed: number
  farcasterFid: number
}

export type EnrichedRow = {
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

async function fetchLogsInChunks(
  client: ReturnType<typeof getClientByChainKey>,
  address: `0x${string}`,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<QuestCompletedLog[]> {
  if (fromBlock > toBlock) return []

  const ranges: Array<{ from: bigint; to: bigint }> = []
  let cursor = fromBlock
  while (cursor <= toBlock) {
    const upper = cursor + LOG_CHUNK_SIZE
    const cappedUpper = upper > toBlock ? toBlock : upper
    ranges.push({ from: cursor, to: cappedUpper })
    if (cappedUpper === toBlock) break
    cursor = cappedUpper + 1n
  }

  const rpcTimeout = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 10000))
    ])

  const logsByRange = await mapWithConcurrency(ranges, LOG_FETCH_CONCURRENCY, async range => {
    const logs = await rpcTimeout(
      client.getLogs({ address, event: EVT_QUEST_COMPLETED, fromBlock: range.from, toBlock: range.to }),
      []
    ).catch(error => {
        if (AGGREGATOR_DEBUG) {
          trackWarning('leaderboard_log_fetch_failed', { function: 'fetchLogsInRanges', address, from: range.from.toString(), to: range.to.toString(), error: String(error) })
        }
        return []
      })
    return logs as QuestCompletedLog[]
  })

  return logsByRange.flat()
}

async function loadChainAggregate(chain: ChainKey): Promise<ChainAggregateState> {
  // Phase 8.1.4: Use unified cache system with stale-while-revalidate
  return await getCached(
    'chain-aggregate',
    chain,
    async () => await loadChainAggregateInternal(chain),
    { ttl: CHAIN_AGGREGATE_CACHE_TTL, backend: 'memory', staleWhileRevalidate: true }
  )
}

async function loadChainAggregateInternal(chain: ChainKey): Promise<ChainAggregateState> {
  const now = Date.now()
  
  // Get previous state from cache (for incremental updates)
  const cached = await getCached<ChainAggregateState | null>(
    'chain-aggregate-state',
    chain,
    async () => null,
    { ttl: CHAIN_AGGREGATE_CACHE_TTL * 10, backend: 'memory' } // Keep state longer
  ).catch(() => null)

  let client: ReturnType<typeof getClientByChainKey>
  try {
    client = getClientByChainKey(chain)
  } catch (error) {
    trackWarning('leaderboard_client_creation_failed', { function: 'getClientByChainKey', chain, error: String(error) })
    throw error
  }
  const contractAddr = CONTRACT_ADDRESSES[chain as GMChainKey]

  const rpcTimeout = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 10000))
    ])

  const latestBlock = await rpcTimeout(
    client.getBlockNumber(),
    cached?.lastBlock ?? getStartBlock(chain)
  )
  const baseStartBlock = getStartBlock(chain)
  const totals = cached?.totals ?? new Map<string, AggregateBucket>()
  const lastProcessed = cached?.lastBlock ?? (baseStartBlock > 0n ? baseStartBlock - 1n : -1n)
  const nextFromBlock = lastProcessed + 1n
  const effectiveFrom = nextFromBlock > baseStartBlock ? nextFromBlock : baseStartBlock

  if (AGGREGATOR_DEBUG) {
  }

  if (effectiveFrom <= latestBlock) {
    const logs = await fetchLogsInChunks(client, contractAddr, effectiveFrom, latestBlock)
    if (AGGREGATOR_DEBUG) {
    }
    for (const lg of logs) {
      const { user, pointsAwarded, fid } = lg.args
      if (!user) continue
      const key = user.toLowerCase()
      const prev = totals.get(key) ?? { points: 0n, completed: 0, fid: 0 }
      const awarded = pointsAwarded ?? 0n
      const fidNumber = fid != null ? Number(fid) : prev.fid
      totals.set(key, {
        points: prev.points + awarded,
        completed: prev.completed + 1,
        fid: Number.isFinite(fidNumber) ? fidNumber : prev.fid,
      })
    }
  }

  const rows = Array.from(totals.entries()).map(([addressLower, data]) => ({
    chain,
    address: addressLower as `0x${string}`,
    points: data.points,
    completed: data.completed,
    farcasterFid: data.fid,
  }))

  const resolvedLastBlock = cached ? (latestBlock > cached.lastBlock ? latestBlock : cached.lastBlock) : latestBlock
  const updatedState: ChainAggregateState = {
    updatedAt: now,
    lastBlock: resolvedLastBlock,
    totals,
    rows,
  }

  // Phase 8.1.4: Store state in unified cache for next incremental update
  await getCached(
    'chain-aggregate-state',
    chain,
    async () => updatedState,
    { ttl: CHAIN_AGGREGATE_CACHE_TTL, backend: 'memory', force: true }
  )
  
  return updatedState
}

export async function fetchAggregatedRaw(options: { global: boolean; chain?: ChainKey }): Promise<{ rows: RawAggregate[]; updatedAt: number }> {
  const { global, chain } = options
  const chainsToQuery: ChainKey[] = global ? CHAIN_KEYS : [chain ?? 'base']

  const states = await Promise.all(chainsToQuery.map(loadChainAggregate))
  const rows = states.flatMap(state => state.rows)

  rows.sort((a, b) => {
    if (a.points === b.points) return 0
    return a.points > b.points ? -1 : 1
  })

  const updatedAt = states.reduce((acc, state) => (state.updatedAt > acc ? state.updatedAt : acc), Date.now())
  return { rows, updatedAt }
}

async function resolveProfile(entry: RawAggregate) {
  if (!PROFILE_SUPPORTED) {
    return { name: '', pfpUrl: '', farcasterFid: entry.farcasterFid }
  }

  const key = profileCacheKey(entry.chain, entry.address)
  
  // Phase 8.1.4: Use unified cache system
  return await getCached(
    'leaderboard-profile',
    key,
    async () => {
      return await resolveProfileFromChain(entry)
    },
    { ttl: PROFILE_CACHE_TTL_SEC, backend: 'memory', staleWhileRevalidate: true }
  )
}

async function resolveProfileFromChain(entry: RawAggregate) {

  try {
    const client = getClientByChainKey(entry.chain)
    const rpcTimeout = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 10000))
      ])

    const profile = await rpcTimeout(
      client.readContract({
        address: CONTRACT_ADDRESSES[entry.chain as GMChainKey],
        abi: GM_CONTRACT_ABI,
        functionName: 'getUserProfile',
        args: [entry.address],
      }) as Promise<UserProfileTuple>,
      null
    )
    if (!profile) throw new Error('Profile read timeout')
    const [name, , , pfpUrl, , , fidRaw] = profile
    const fidNumber = Number(fidRaw)
    const resolvedFid = Number.isFinite(fidNumber) && fidNumber > 0 ? fidNumber : entry.farcasterFid
    return { 
      name: String(name || ''), 
      pfpUrl: String(pfpUrl || ''), 
      farcasterFid: resolvedFid 
    }
  } catch {
    return { name: '', pfpUrl: '', farcasterFid: entry.farcasterFid }
  }
}

type UserProfileTuple = readonly [string, string, string, string, bigint, boolean, bigint]

export async function enrichAggregatedRows(entries: RawAggregate[]): Promise<EnrichedRow[]> {
  const concurrency = PROFILE_SUPPORTED ? 4 : 8
  const enriched = await mapWithConcurrency(entries, concurrency, async entry => {
    const { name, pfpUrl, farcasterFid } = await resolveProfile(entry)
    const pointsNumber = Number(entry.points ?? 0n)

    return {
      address: entry.address,
      chain: entry.chain,
      points: pointsNumber,
      pfpUrl,
      name,
      farcasterFid,
      completed: entry.completed,
      rewards: Math.floor(pointsNumber / 20),
      seasonAlloc: 0,
    }
  })

  const missing = enriched.filter(row => !row.name.trim() || !row.pfpUrl || row.pfpUrl.trim().length === 0)
  if (missing.length === 0) return enriched

  try {
    const addressToUser = await fetchUsersByAddresses(missing.map(row => row.address))
    const now = Date.now()

    for (const row of missing) {
      const user = addressToUser[row.address] ?? addressToUser[row.address.toLowerCase()]
      if (!user) continue

      const handle = user.username ? `@${user.username}` : ''
      const resolvedName = row.name.trim() || (user.displayName && user.displayName.trim()) || handle
      const existingPfp = row.pfpUrl.trim()
      const neynarPfp = typeof user.pfpUrl === 'string' ? user.pfpUrl.trim() : ''
      const resolvedPfp = existingPfp || neynarPfp
      const resolvedFid =
        row.farcasterFid && row.farcasterFid > 0
          ? row.farcasterFid
          : typeof user.fid === 'number' && Number.isFinite(user.fid) && user.fid > 0
          ? user.fid
          : 0

      row.name = resolvedName ? resolvedName : row.name
      if ((!row.pfpUrl || row.pfpUrl.trim().length === 0) && resolvedPfp) {
        row.pfpUrl = resolvedPfp
      }
      if ((!row.farcasterFid || row.farcasterFid <= 0) && resolvedFid > 0) {
        row.farcasterFid = resolvedFid
      }

      // Phase 8.1.4: Update unified cache with Neynar enrichment
      await getCached(
        'leaderboard-profile',
        profileCacheKey(row.chain, row.address),
        async () => ({
          name: row.name,
          pfpUrl: row.pfpUrl,
          farcasterFid: row.farcasterFid || 0,
        }),
        { ttl: PROFILE_CACHE_TTL_SEC, backend: 'memory', force: true }
      ).catch(() => {}) // Fire and forget
    }
  } catch (err) {
    if (AGGREGATOR_DEBUG) {
      trackWarning('leaderboard_neynar_enrichment_failed', { function: 'getTopUsers', error: String(err) })
    }
  }

  return enriched
}

export async function computeLeaderboardSlice(options: {
  global: boolean
  chain?: ChainKey
  limit: number
  offset: number
}): Promise<{ total: number; page: RawAggregate[]; enriched: EnrichedRow[]; updatedAt: number }> {
  const { global, chain, limit, offset } = options
  const { rows, updatedAt } = await fetchAggregatedRaw({ global, chain })
  const total = rows.length
  const page = rows.slice(offset, offset + limit)
  const enriched = await enrichAggregatedRows(page)
  return { total, page, enriched, updatedAt }
}

function mapWithConcurrency<T, U>(items: T[], limit: number, iterator: (item: T, index: number) => Promise<U>): Promise<U[]> {
  if (items.length === 0) return Promise.resolve([])
  const results: U[] = new Array(items.length)
  let cursor = 0

  async function worker() {
    while (true) {
      const index = cursor++
      if (index >= items.length) break
      // eslint-disable-next-line no-await-in-loop
      results[index] = await iterator(items[index], index)
    }
  }

  const workerCount = Math.min(limit, items.length)
  return Promise.all(Array.from({ length: workerCount }, () => worker())).then(() => results)
}

export async function resetLeaderboardCaches() {
  // Phase 8.1.4: Use unified cache invalidation
  await invalidateCachePattern('chain-aggregate', '*')
  await invalidateCachePattern('chain-aggregate-state', '*')
  await invalidateCachePattern('leaderboard-profile', '*')
  
  // Phase 8.2.2: RPC clients now in centralized pool (lib/contracts/rpc-client-pool.ts)
  // No need to clear local cache - pool is shared
}
