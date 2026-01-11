import { parseAbiItem, type Log } from 'viem'
import {
  CHAIN_KEYS,
  CONTRACT_ADDRESSES,
  GM_CONTRACT_ABI,
  gmContractHasFunction,
  type ChainKey,
  type GMChainKey,
} from '@/lib/contracts/gmeow-utils'
import { trackWarning } from '@/lib/notifications/error-tracking'
import { getBatchCachedNeynarUsers, setCachedNeynarUser } from '@/lib/cache/neynar-cache'
import { fetchUserByFid } from '@/lib/integrations/neynar'

// Dynamic import helpers for server-only cache module (prevents bundling to client)
async function getCachedSafe<T>(
  namespace: string,
  key: string,
  factory: () => Promise<T>,
  options?: { ttl?: number; staleWhileRevalidate?: boolean; force?: boolean }
): Promise<T> {
  if (typeof window !== 'undefined') {
    return factory() // Client: bypass cache
  }
  const { getCached } = await import('@/lib/cache/server')
  return getCached(namespace, key, factory, options)
}

async function invalidateCachePatternSafe(namespace: string, pattern: string): Promise<void> {
  if (typeof window !== 'undefined') {
    return // Client: no-op
  }
  const { invalidateCachePattern } = await import('@/lib/cache/server')
  await invalidateCachePattern(namespace, pattern)
}

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
  return await getCachedSafe(
    'chain-aggregate',
    chain,
    async () => await loadChainAggregateInternal(chain),
    { ttl: CHAIN_AGGREGATE_CACHE_TTL, staleWhileRevalidate: true }
  )
}

async function loadChainAggregateInternal(chain: ChainKey): Promise<ChainAggregateState> {
  const now = Date.now()
  
  // Get previous state from cache (for incremental updates)
  const cached = await getCachedSafe<ChainAggregateState | null>(
    'chain-aggregate-state',
    chain,
    async () => null,
    { ttl: CHAIN_AGGREGATE_CACHE_TTL * 10 } // Keep state longer
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
  await getCachedSafe(
    'chain-aggregate-state',
    chain,
    async () => updatedState,
    { ttl: CHAIN_AGGREGATE_CACHE_TTL, force: true }
  )
  
  return updatedState
}

export async function fetchAggregatedRaw(options: { global: boolean; chain?: ChainKey }): Promise<{ rows: RawAggregate[]; updatedAt: number }> {
  const { global, chain } = options
  const chainsToQuery: ChainKey[] = global ? CHAIN_KEYS : [chain ?? 'base']

  const states = await Promise.all(chainsToQuery.map(loadChainAggregate))
  const rows = states.flatMap(state => state.rows)

  // Phase 9.1: Enrich with FIDs from user_profiles (multi-wallet integration)
  try {
    const { createClient } = await import('@/lib/supabase/edge')
    const supabase = createClient()
    
    console.log('[fetchAggregatedRaw] Starting FID enrichment, rows:', rows.length)
    
    if (supabase) {
      const addressesWithoutFid = rows
        .filter(row => !row.farcasterFid || row.farcasterFid === 0)
        .map(row => row.address.toLowerCase())
      
      console.log('[fetchAggregatedRaw] Addresses without FID:', addressesWithoutFid.length)
      
      if (addressesWithoutFid.length > 0) {
        // Use LOWER() in SQL for case-insensitive matching
        const { data: profiles, error } = await supabase
          .from('user_profiles')
          .select('wallet_address, fid')
          .not('fid', 'is', null)
        
        console.log('[fetchAggregatedRaw] Query result - profiles:', profiles?.length, 'error:', error)
        
        if (profiles) {
          const addressToFidMap = new Map<string, number>()
          for (const profile of profiles) {
            if (profile.fid && profile.wallet_address) {
              addressToFidMap.set(profile.wallet_address.toLowerCase(), profile.fid)
            }
          }
          
          console.log('[fetchAggregatedRaw] Address→FID map:', Object.fromEntries(addressToFidMap))
          
          // Update rows with FIDs
          let enriched = 0
          for (const row of rows) {
            if (!row.farcasterFid || row.farcasterFid === 0) {
              const fid = addressToFidMap.get(row.address.toLowerCase())
              if (fid) {
                row.farcasterFid = fid
                enriched++
              }
            }
          }
          
          console.log('[fetchAggregatedRaw] Enriched', enriched, 'rows with FIDs')
        }
      }
    } else {
      console.error('[fetchAggregatedRaw] Supabase client is null!')
    }
  } catch (err) {
    console.error('[fetchAggregatedRaw] Failed to enrich FIDs from user_profiles:', err)
  }

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
  return await getCachedSafe(
    'leaderboard-profile',
    key,
    async () => {
      return await resolveProfileFromChain(entry)
    },
    { ttl: PROFILE_CACHE_TTL_SEC, staleWhileRevalidate: true }
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
    // Phase 9.1: Multi-Wallet Integration (uses existing auth infrastructure)
    // Step 1: Look up FIDs from user_profiles (wallet → FID mapping from Neynar sync)
    const addressToFidMap = new Map<string, number>()
    
    // Import createClient dynamically (server-only)
    const { createClient } = await import('@/lib/supabase/edge')
    const supabase = createClient()
    
    if (supabase) {
      const addresses = missing.map(row => row.address.toLowerCase())
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('wallet_address, fid, display_name, avatar_url')
        .in('wallet_address', addresses)
        .not('fid', 'is', null)
      
      if (profiles) {
        for (const profile of profiles) {
          if (profile.fid && profile.wallet_address) {
            addressToFidMap.set(profile.wallet_address.toLowerCase(), profile.fid)
          }
        }
      }
    }

    // Step 2: Populate FIDs for rows that don't have them
    for (const row of missing) {
      if (!row.farcasterFid || row.farcasterFid <= 0) {
        const fid = addressToFidMap.get(row.address.toLowerCase())
        if (fid) {
          row.farcasterFid = fid
        }
      }
    }

    // Step 3: Collect FIDs to fetch profiles for
    const fidsToFetch = missing
      .filter(row => row.farcasterFid && row.farcasterFid > 0)
      .map(row => row.farcasterFid)
    
    if (fidsToFetch.length === 0) return enriched

    // Step 4: Check Neynar cache (getBatchCachedNeynarUsers from lib/cache/neynar-cache.ts)
    const cachedUsers = await getBatchCachedNeynarUsers(fidsToFetch)
    const now = Date.now()

    // Step 5: Enrich rows with cached data
    for (const row of missing) {
      if (!row.farcasterFid || row.farcasterFid <= 0) continue
      
      const cached = cachedUsers.get(row.farcasterFid)
      if (cached) {
        // Use cached profile data
        row.name = row.name.trim() || cached.displayName || cached.username || ''
        row.pfpUrl = row.pfpUrl.trim() || cached.pfpUrl || ''
        
        // Update server cache (unified cache system)
        await getCachedSafe(
          'leaderboard-profile',
          profileCacheKey(row.chain, row.address),
          async () => ({
            name: row.name,
            pfpUrl: row.pfpUrl,
            farcasterFid: row.farcasterFid || 0,
          }),
          { ttl: PROFILE_CACHE_TTL_SEC, force: true }
        ).catch(() => {}) // Fire and forget
        continue
      }

      // Step 6: Fetch missing profiles from Neynar (uses cache internally)
      try {
        const user = await fetchUserByFid(row.farcasterFid)
        if (user) {
          const resolvedName = row.name.trim() || user.displayName || user.username || ''
          const resolvedPfp = row.pfpUrl.trim() || user.pfpUrl || ''
          
          row.name = resolvedName
          row.pfpUrl = resolvedPfp

          // Cache for next time (setCachedNeynarUser from lib/cache/neynar-cache.ts)
          await setCachedNeynarUser(row.farcasterFid, {
            fid: row.farcasterFid,
            username: user.username || '',
            displayName: user.displayName || '',
            pfpUrl: user.pfpUrl || '',
          })

          // Update server cache
          await getCachedSafe(
            'leaderboard-profile',
            profileCacheKey(row.chain, row.address),
            async () => ({
              name: row.name,
              pfpUrl: row.pfpUrl,
              farcasterFid: row.farcasterFid || 0,
            }),
            { ttl: PROFILE_CACHE_TTL_SEC, force: true }
          ).catch(() => {})
        }
      } catch (err) {
        if (AGGREGATOR_DEBUG) {
          trackWarning('leaderboard_profile_fetch_failed', { 
            function: 'enrichAggregatedRows', 
            fid: row.farcasterFid, 
            error: String(err) 
          })
        }
      }
    }
  } catch (err) {
    if (AGGREGATOR_DEBUG) {
      trackWarning('leaderboard_neynar_enrichment_failed', { function: 'enrichAggregatedRows', error: String(err) })
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
  await invalidateCachePatternSafe('chain-aggregate', '*')
  await invalidateCachePatternSafe('chain-aggregate-state', '*')
  await invalidateCachePatternSafe('leaderboard-profile', '*')
  
  // Phase 8.2.2: RPC clients now in centralized pool (lib/contracts/rpc-client-pool.ts)
  // No need to clear local cache - pool is shared
}
