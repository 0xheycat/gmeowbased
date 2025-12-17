import { createPublicClient, http } from 'viem'
import { getContractAddress, CHAIN_IDS, type ChainKey, STANDALONE_ADDRESSES } from '@/lib/contracts/gmeow-utils'
import { GM_CONTRACT_ABI, GUILD_ABI_JSON } from '@/lib/contracts/abis'
import { buildFrameShareUrl } from '@/lib/api/share'
import { calculateRankProgress } from '@/lib/leaderboard/rank'
import { fetchUserByAddress, fetchFidByAddress, fetchUserByFid } from '@/lib/integrations/neynar'
import { getReferrer } from '@/lib/contracts/referral-contract'

// Type definitions
export type ProfileChainSnapshot = {
  chain: ChainKey
  totalPoints: number
  availablePoints: number
  lockedPoints: number
  streak: number
  lastGM?: number
  registered: boolean
  gmReward?: number
  teamId?: number
}

export type TeamOverview = {
  chain: ChainKey
  teamId: number
  name: string
  founder: `0x${string}`
  memberCount: number
}

export type ProfileOverviewData = {
  address: `0x${string}`
  fid: number | null
  displayName: string
  username?: string
  pfpUrl?: string
  farcasterUser: any
  totalPoints: number
  estimatedGMs: number
  streak: number
  lastGM?: number
  globalRank: number | null
  referrer: `0x${string}` | null
  team: TeamOverview | null
  chainSummaries: ProfileChainSnapshot[]
  badges: any[]
  registeredChains: ChainKey[]
  frameUrl?: string
  shareUrl?: string
  neynarScore: number | null
}

export const PROFILE_SUPPORTED_CHAINS: ChainKey[] = Object.keys(CHAIN_IDS) as ChainKey[]

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
//we only support base network for profile data fetching, delete others to reduce code size
const PUBLIC_RPCS: Partial<Record<ChainKey, string>> = {
  base: process.env.NEXT_PUBLIC_RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/A6u4vxXFMPMk07zeChjbziq1Ch0Wcrjg',

}

const PROFILE_CHAIN_CACHE_TTL = getNumberFromEnv('NEXT_PUBLIC_PROFILE_CHAIN_CACHE_TTL_MS', 30_000)
const PROFILE_CHAIN_CACHE_LIMIT = getNumberFromEnv('NEXT_PUBLIC_PROFILE_CHAIN_CACHE_LIMIT', 64)
const PROFILE_FARCASTER_CACHE_TTL = getNumberFromEnv('NEXT_PUBLIC_PROFILE_FARCASTER_CACHE_TTL_MS', 120_000)
const PROFILE_FARCASTER_CACHE_LIMIT = getNumberFromEnv('NEXT_PUBLIC_PROFILE_FARCASTER_CACHE_LIMIT', 64)
const PROFILE_GLOBAL_RANK_CACHE_TTL = getNumberFromEnv('NEXT_PUBLIC_PROFILE_GLOBAL_RANK_CACHE_TTL_MS', 60_000)
const PROFILE_GLOBAL_RANK_CACHE_LIMIT = getNumberFromEnv('NEXT_PUBLIC_PROFILE_GLOBAL_RANK_CACHE_LIMIT', 32)
const PROFILE_ENABLE_GLOBAL_RANK = getBooleanFromEnv('NEXT_PUBLIC_PROFILE_ENABLE_GLOBAL_RANK', true)

type FarcasterProfileResult = Awaited<ReturnType<typeof fetchUserByAddress>> | null

type CacheEntry<T> = {
  promise: Promise<T>
  value?: T
  expiresAt: number
}

const chainSnapshotCache = new Map<string, CacheEntry<ChainAggregation | null>>()
const farcasterProfileCache = new Map<string, CacheEntry<{ user: FarcasterProfileResult; fid: number | null }>>()
const globalRankCache = new Map<string, CacheEntry<number | null>>()

function getNumberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function getBooleanFromEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name]
  if (!raw) return fallback
  const normalized = raw.trim().toLowerCase()
  if (['0', 'false', 'off', 'no'].includes(normalized)) return false
  if (['1', 'true', 'on', 'yes'].includes(normalized)) return true
  return fallback
}

function memoizeAsync<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  ttl: number,
  factory: () => Promise<T>,
  maxEntries?: number,
): Promise<T> {
  if (ttl <= 0) {
    return factory()
  }

  const now = Date.now()
  const existing = cache.get(key)
  if (existing) {
    if (now < existing.expiresAt) {
      if (Object.prototype.hasOwnProperty.call(existing, 'value')) {
        return Promise.resolve(existing.value as T)
      }
      return existing.promise
    }
    cache.delete(key)
  }

  if (typeof maxEntries === 'number' && maxEntries > 0 && cache.size >= maxEntries) {
    const oldest = cache.keys().next().value
    if (typeof oldest === 'string') {
      cache.delete(oldest)
    }
  }

  const entry: CacheEntry<T> = {
    expiresAt: now + ttl,
    promise: Promise.resolve()
      .then(factory)
      .then((result) => {
        entry.value = result
        entry.expiresAt = Date.now() + ttl
        return result
      })
      .catch((err) => {
        cache.delete(key)
        throw err
      }),
  }

  cache.delete(key)
  cache.set(key, entry)

  return entry.promise
}

export type MiniAppUser = {
  fid?: number
  username?: string
  displayName?: string
  pfpUrl?: string
  custodyAddress?: string
  walletAddress?: string
  verifications?: string[]
  verifiedAddresses?: Array<string | { address?: string }>
}

export type ChainAggregation = {
  summary: ProfileChainSnapshot
  gmReward?: number
  farcasterFid?: number | null
  referrer?: `0x${string}` | null
  team?: TeamOverview | null
}

export function normalizeAddress(value: unknown): `0x${string}` | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) return null
  return trimmed.toLowerCase() as `0x${string}`
}

export function pickAddressFromSource(source: any): `0x${string}` | null {
  if (!source) return null
  const candidates: unknown[] = []

  const push = (val: unknown) => {
    if (!val) return
    if (Array.isArray(val)) {
      val.forEach(push)
    } else if (typeof val === 'object') {
      const maybeAddress = (val as any)?.address ?? (val as any)?.value
      if (maybeAddress) push(maybeAddress)
    } else {
      candidates.push(val)
    }
  }

  push(source.address)
  push(source.walletAddress)
  push(source.primaryAddress)
  push(source.connectedAddress)
  push(source.custodyAddress)
  push(source.defaultAddress)
  push((source.user || source)?.custodyAddress)
  push((source.user || source)?.walletAddress)
  push((source.user || source)?.address)
  push((source.user || source)?.primaryAddress)
  push((source.user || source)?.defaultAddress)
  push(source.verifications)
  push(source.verifiedAddresses)
  push((source.user || source)?.verifications)
  push((source.user || source)?.verifiedAddresses)

  return candidates.map(normalizeAddress).find(Boolean) ?? null
}

export async function fetchChainSnapshot(chain: ChainKey, userAddress: `0x${string}`): Promise<ChainAggregation | null> {
  const cacheKey = `${chain}:${userAddress.toLowerCase()}`
  return memoizeAsync(
    chainSnapshotCache,
    cacheKey,
    PROFILE_CHAIN_CACHE_TTL,
    () => fetchChainSnapshotWithoutCache(chain, userAddress),
    PROFILE_CHAIN_CACHE_LIMIT,
  )
}

async function fetchChainSnapshotWithoutCache(chain: ChainKey, userAddress: `0x${string}`): Promise<ChainAggregation | null> {
  const rpc = PUBLIC_RPCS[chain]
  if (!rpc) return null
  // Only proceed if chain is supported by getContractAddress
  if (chain !== 'base') return null
  try {
    const client = createPublicClient({ transport: http(rpc) })
    const contract = getContractAddress(chain)

    // Add 10s timeout to prevent hanging
    const rpcTimeout = <T>(promise: Promise<T>, fallback: T): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 10000))
      ])

    const [statsRaw, gmRaw, fidRaw, guildRaw, rewardRaw, referrerRaw] = await Promise.all([
      rpcTimeout(client.readContract({ address: contract, abi: GM_CONTRACT_ABI, functionName: 'getUserStats', args: [userAddress] }).catch(() => null), null),
      rpcTimeout(client.readContract({ address: contract, abi: GM_CONTRACT_ABI, functionName: 'gmhistory', args: [userAddress] }).catch(() => null), null),
      rpcTimeout(client.readContract({ address: contract, abi: GM_CONTRACT_ABI, functionName: 'farcasterFidOf', args: [userAddress] }).catch(() => 0n), 0n),
      rpcTimeout(client.readContract({ address: contract, abi: GM_CONTRACT_ABI, functionName: 'guildOf', args: [userAddress] }).catch(() => 0n), 0n),
      rpcTimeout(client.readContract({ address: contract, abi: GM_CONTRACT_ABI, functionName: 'gmPointReward' }).catch(() => null), null),
      rpcTimeout(getReferrer(userAddress).catch(() => null), null),
    ])

    const availablePoints = Number((statsRaw as any)?.[0] ?? 0n)
    const lockedPoints = Number((statsRaw as any)?.[1] ?? 0n)
    const totalPoints = availablePoints + lockedPoints
    const streak = Number((gmRaw as any)?.[1] ?? 0n)
    const lastGMSeconds = Number((gmRaw as any)?.[0] ?? 0n)
    const lastGM = lastGMSeconds > 0 ? lastGMSeconds * 1000 : undefined
    const fid = Number(fidRaw ?? 0n)
    const guildId = Number(guildRaw ?? 0n)
    const gmReward = rewardRaw != null ? Number(rewardRaw as bigint) : undefined
    const referrerCandidate = normalizeAddress(referrerRaw)
    const referrer = referrerCandidate && referrerCandidate !== ZERO_ADDRESS ? referrerCandidate : null

    let team: TeamOverview | null = null
    if (Number.isFinite(guildId) && guildId > 0) {
      try {
        const guildRawData = await rpcTimeout(
          client.readContract({
            address: STANDALONE_ADDRESSES.base.guild,
            abi: GUILD_ABI_JSON,
            functionName: 'getGuildInfo',
            args: [BigInt(guildId)],
          }),
          null
        )
        if (guildRawData) {
          const [name, leader, , memberCount] = guildRawData as [string, `0x${string}`, bigint, bigint, bigint, bigint, bigint]
          const founder = normalizeAddress(leader) || ZERO_ADDRESS
          const memberCountNum = Number(memberCount ?? 0n)
          team = { chain, teamId: guildId, name: String(name || `Guild #${guildId}`), founder, memberCount: memberCountNum }
        }
      } catch {}
    }

    const summary: ProfileChainSnapshot = {
      chain,
      totalPoints,
      availablePoints,
      lockedPoints,
      streak,
      lastGM,
      registered: fid > 0 || totalPoints > 0 || streak > 0,
      gmReward,
      teamId: team?.teamId,
    }

    return {
      summary,
      gmReward,
      farcasterFid: Number.isFinite(fid) && fid > 0 ? fid : null,
      referrer,
      team,
    }
  } catch (err) {
    console.warn(`fetchChainSnapshot failed on ${chain}:`, (err as Error)?.message || err)
    return null
  }
}

export async function resolveFarcasterProfile(
  address: `0x${string}`,
  contextUser: MiniAppUser | null,
  chainFid: number | null,
): Promise<{ user: FarcasterProfileResult; fid: number | null }> {
  const keyParts: string[] = [address.toLowerCase()]
  if (typeof chainFid === 'number' && chainFid > 0) {
    keyParts.push(`fid:${chainFid}`)
  }
  const cacheKey = keyParts.join('|')

  return memoizeAsync(
    farcasterProfileCache,
    cacheKey,
    PROFILE_FARCASTER_CACHE_TTL,
    () => resolveFarcasterProfileWithoutCache(address, contextUser, chainFid),
    PROFILE_FARCASTER_CACHE_LIMIT,
  )
}

async function resolveFarcasterProfileWithoutCache(
  address: `0x${string}`,
  contextUser: MiniAppUser | null,
  chainFid: number | null,
): Promise<{ user: FarcasterProfileResult; fid: number | null }> {
  let fid = typeof contextUser?.fid === 'number' && contextUser.fid > 0 ? contextUser.fid : null
  let farcasterUser: FarcasterProfileResult = null

  try {
    farcasterUser = await fetchUserByAddress(address)
  } catch (err) {
    console.warn('fetchUserByAddress failed:', (err as Error)?.message || err)
  }

  if (farcasterUser?.fid) fid = farcasterUser.fid
  if (!fid && chainFid) fid = chainFid

  if (!fid) {
    try {
      const resolved = await fetchFidByAddress(address)
      if (resolved) fid = resolved
    } catch (err) {
      console.warn('fetchFidByAddress failed:', (err as Error)?.message || err)
    }
  }

  if (!farcasterUser && fid) {
    try {
      farcasterUser = await fetchUserByFid(fid)
    } catch (err) {
      console.warn('fetchUserByFid failed:', (err as Error)?.message || err)
    }
  }

  return { user: farcasterUser, fid }
}

export async function fetchGlobalRank(address: `0x${string}`): Promise<number | null> {
  if (!PROFILE_ENABLE_GLOBAL_RANK) {
    return null
  }

  const cacheKey = address.toLowerCase()
  return memoizeAsync(
    globalRankCache,
    cacheKey,
    PROFILE_GLOBAL_RANK_CACHE_TTL,
    () => fetchGlobalRankWithoutCache(address),
    PROFILE_GLOBAL_RANK_CACHE_LIMIT,
  )
}

async function fetchGlobalRankWithoutCache(address: `0x${string}`): Promise<number | null> {
  try {
    const res = await fetch('/api/leaderboard-v2?period=all_time&pageSize=250', { cache: 'no-store' })
    if (!res.ok) return null
    const result = await res.json().catch(() => null)
    if (!result?.data) return null
    const entry = (result.data as Array<{ address?: string; global_rank?: number }>).find(
      (row) => typeof row.address === 'string' && row.address.toLowerCase() === address.toLowerCase(),
    )
    return typeof entry?.global_rank === 'number' ? entry.global_rank : null
  } catch {
    return null
  }
}

export async function buildProfileOverview(
  addr: `0x${string}`,
  miniUser: MiniAppUser | null,
  chainResults?: Array<ChainAggregation | null>,
): Promise<ProfileOverviewData> {
  const results = chainResults ?? (await Promise.all(PROFILE_SUPPORTED_CHAINS.map((chain) => fetchChainSnapshot(chain, addr))))
  const validResults = results.filter(Boolean) as ChainAggregation[]
  const summaries = validResults.map((entry) => entry.summary)
  const totalPoints = summaries.reduce((acc, s) => acc + (s.totalPoints || 0), 0)
  const rankProgress = calculateRankProgress(totalPoints)
  const gmRewards = validResults.map((entry) => entry.gmReward).filter((value): value is number => typeof value === 'number' && value > 0)
  const avgReward = gmRewards.length ? gmRewards.reduce((a, b) => a + b, 0) / gmRewards.length : 10
  const estimatedGMs = avgReward > 0 ? Math.round(totalPoints / avgReward) : 0
  const maxStreak = summaries.reduce((acc, s) => Math.max(acc, s.streak || 0), 0)
  const latestGM = summaries.reduce((acc, s) => (s.lastGM && s.lastGM > acc ? s.lastGM : acc), 0)
  const registeredChains = summaries.filter((s) => s.registered).map((s) => s.chain)
  const referrer = validResults.map((entry) => entry.referrer).find((val) => val && val !== ZERO_ADDRESS) ?? null
  const firstTeam = validResults.map((entry) => entry.team).find((team) => !!team && team.teamId > 0) ?? null
  const chainFid = validResults.map((entry) => entry.farcasterFid).find((fid) => typeof fid === 'number' && fid > 0) ?? null

  const { user: farcasterUser, fid } = await resolveFarcasterProfile(addr, miniUser, chainFid)

  const displayName =
    farcasterUser?.displayName ||
    miniUser?.displayName ||
    miniUser?.username ||
    `${addr.slice(0, 6)}…${addr.slice(-4)}`
  const username = farcasterUser?.username || miniUser?.username
  const pfpUrl = farcasterUser?.pfpUrl || miniUser?.pfpUrl

  const frameUrl = buildFrameShareUrl({
    type: 'points',
    user: addr,
    chain: 'all',
    fid: fid ?? undefined,
    extra: {
      totalPoints,
      level: rankProgress.level,
      xpCurrent: rankProgress.xpIntoLevel,
      xpMax: rankProgress.xpForLevel,
      xpToNext: rankProgress.xpToNextLevel,
      tier: rankProgress.currentTier.name,
      tierTagline: rankProgress.currentTier.tagline,
      tierPercent: Math.round(rankProgress.percent * 100),
    },
  })

  let globalRank: number | null = null
  if (totalPoints > 0) {
    globalRank = await fetchGlobalRank(addr)
  }

  return {
    address: addr,
    fid,
    displayName,
    username,
    pfpUrl,
    farcasterUser,
    totalPoints,
    estimatedGMs,
    streak: maxStreak,
    lastGM: latestGM || undefined,
    globalRank,
    referrer,
    team: firstTeam,
    chainSummaries: summaries,
    badges: [],
    registeredChains,
    frameUrl: frameUrl || undefined,
    shareUrl: frameUrl || undefined,
    neynarScore: farcasterUser?.neynarScore ?? null,
  }
}
