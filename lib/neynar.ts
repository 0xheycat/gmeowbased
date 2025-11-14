// Unified Neynar helpers (Edge/Server/Client safe)

export interface ContractData {
  currentStreak: number
  longestStreak: number
  totalGMs: number
  lastGMTimestamp: number
  canGMToday: boolean
  isRegistered: boolean
  points?: number
  rank?: number
}

export interface FarcasterUser {
  fid: number
  username?: string
  displayName?: string
  pfpUrl?: string
  bio?: string
  followerCount?: number
  followingCount?: number
  verifications?: string[]
  powerBadge?: boolean
  custodyAddress?: string
  activeStatus?: string
  neynarScore?: number | null
  contractData?: ContractData
  walletAddress?: `0x${string}` // add this
}

type NeynarUser = {
  fid: number
  username?: string
  display_name?: string
  pfp_url?: string
  profile?: { bio?: { text?: string } }
  follower_count?: number
  following_count?: number
  verifications?: string[]
  power_badge?: boolean
  custody_address?: string
  active_status?: string
  score?: number | string
}

type NeynarCast = {
  hash?: string
  url?: string
  author?: { fid?: number; username?: string }
  text?: string
  viewer_context?: { liked?: boolean; recasted?: boolean }
  replies?: { count?: number }
}

const NEYNAR_API_BASE = 'https://api.neynar.com'
const NEYNAR_SDK_BASE = 'https://api.neynar.com'

// Prefer server key when available (server/edge). Otherwise fall back to SDK client id (browser).
function getServerApiKey(): string | undefined {
  return process.env.NEYNAR_API_KEY || process.env.NEYNAR_GLOBAL_API || process.env.NEXT_PUBLIC_NEYNAR_API_KEY || undefined
}
function getSdkClientId(): string | undefined {
  return process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || process.env.NEXT_PUBLIC_NEYNAR_API_KEY || undefined
}

type UrlParamValue = string | number | Array<string | number> | undefined

function buildUrl(base: string, path: string, params?: Record<string, UrlParamValue>) {
  const url = new URL(path, base)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (Array.isArray(v)) {
        v.forEach((entry) => {
          if (entry !== undefined && entry !== null && String(entry).length > 0) {
            url.searchParams.append(k, String(entry))
          }
        })
      } else if (v !== undefined && v !== null && String(v).length > 0) {
        url.searchParams.set(k, String(v))
      }
    }
  }
  return url.toString()
}

// Generic fetch that chooses server API or SDK API automatically
async function neynarFetch<T = any>(
  path: string, // e.g. '/v2/farcaster/user/bulk?fids=1,2'
  params?: Record<string, UrlParamValue>
): Promise<T | null> {
  const apiKey = getServerApiKey()
  const clientId = getSdkClientId()

  // Server: use api.neynar.com + x-api-key
  if (apiKey) {
    try {
      const url = buildUrl(NEYNAR_API_BASE, path, params)
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'x-api-key': apiKey, // fix: correct header
          'x-neynar-experimental': 'false',
        },
        cache: 'no-store',
      })
      if (!res.ok) return null
      return (await res.json()) as T
    } catch {
      return null
    }
  }

  // Client fallback: use sdk-api.neynar.com + client_id
  if (clientId) {
    try {
  const merged: Record<string, UrlParamValue> = { ...(params || {}), client_id: clientId }
      const url = buildUrl(NEYNAR_SDK_BASE, path, merged)
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })
      if (!res.ok) return null
      return (await res.json()) as T
    } catch {
      return null
    }
  }

  // No credentials available anywhere
  return null
}

function toNumberOrNull(v: unknown): number | null {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) ? n : null
}

function mapUser(u: NeynarUser | undefined): FarcasterUser | null {
  if (!u) return null
  return {
    fid: u.fid,
    username: u.username,
    displayName: u.display_name,
    pfpUrl: u.pfp_url,
    bio: u.profile?.bio?.text,
    followerCount: u.follower_count,
    followingCount: u.following_count,
    verifications: u.verifications || [],
    powerBadge: u.power_badge,
    custodyAddress: u.custody_address,
    activeStatus: u.active_status,
    neynarScore: toNumberOrNull(u.score),
  }
}

// -------------------- Public API --------------------

export async function fetchUsersByAddresses(
  addresses: string[]
): Promise<Record<string, FarcasterUser | null>> {
  const out: Record<string, FarcasterUser | null> = {}
  const uniques = Array.from(new Set(addresses.filter(Boolean))).map(a => a.toLowerCase())
  if (uniques.length === 0) return out

  const CHUNK = 90
  const chunks: string[][] = []
  for (let i = 0; i < uniques.length; i += CHUNK) chunks.push(uniques.slice(i, i + CHUNK))

  const addressToUser = new Map<string, FarcasterUser | null>()
  const fidsToEnrich = new Set<number>()

  for (const chunk of chunks) {
    const data = await neynarFetch<Record<string, NeynarUser[]>>(
      '/v2/farcaster/user/bulk-by-address',
      {
        addresses: chunk.join(','),
        address_types: ['custody_address', 'verified_address'],
      },
    )

    if (data) {
      for (const addr of chunk) {
        const u0 = data[addr]?.[0]
        const mapped = mapUser(u0)
        if (mapped) {
          mapped.walletAddress = addr as `0x${string}`
          addressToUser.set(addr, mapped)
          if (mapped.neynarScore == null && mapped.fid) fidsToEnrich.add(mapped.fid)
        } else {
          addressToUser.set(addr, null)
        }
      }
    } else {
      for (const addr of chunk) addressToUser.set(addr, null)
    }
  }

  // Enrich scores in bulk if needed
  if (fidsToEnrich.size) {
    const fids = Array.from(fidsToEnrich)
    const fidChunks: number[][] = []
    for (let i = 0; i < fids.length; i += 150) fidChunks.push(fids.slice(i, i + 150))
    const fidScoreMap = new Map<number, number | null>()
    for (const fc of fidChunks) {
      const users = await neynarFetch<{ users?: NeynarUser[] }>(
        '/v2/farcaster/user/bulk',
        { fids: fc.join(',') }
      )
      users?.users?.forEach(u => {
        const score = toNumberOrNull(u?.score)
        fidScoreMap.set(u.fid, score)
      })
    }
    for (const [, user] of addressToUser) {
      if (user && user.neynarScore == null && user.fid) {
        user.neynarScore = fidScoreMap.get(user.fid) ?? null
      }
    }
  }

  for (const a of addresses) {
    const lower = a?.toLowerCase()
    out[a] = lower ? addressToUser.get(lower) ?? null : null
  }
  return out
}

export async function fetchUserByAddress(address: string): Promise<FarcasterUser | null> {
  const res = await fetchUsersByAddresses([address])
  return res[address] ?? res[address.toLowerCase()] ?? null
}

/** Resolve FID from a connected wallet address. Returns null if not linked. */
export async function fetchFidByAddress(address: string): Promise<number | null> {
  const addr = (address || '').trim().toLowerCase()
  if (!addr || !addr.startsWith('0x')) return null

  try {
    const data = await neynarFetch<Record<string, NeynarUser[]>>(
      '/v2/farcaster/user/bulk-by-address',
      {
        addresses: addr,
        address_types: ['custody_address', 'verified_address'],
      },
    )

    const record = data?.[addr]
    if (Array.isArray(record) && record.length) {
      const fid = Number(record[0]?.fid || 0)
      if (Number.isFinite(fid) && fid > 0) return fid
    }

    const fallback = await neynarFetch<{ result?: { users?: NeynarUser[] }; user?: NeynarUser }>(
      '/v2/farcaster/user/by-verification',
      { address: addr },
    )
    const fallbackFid = Number(
      fallback?.result?.users?.[0]?.fid ??
      fallback?.user?.fid ??
      (fallback as any)?.fid ??
      0,
    )
    return Number.isFinite(fallbackFid) && fallbackFid > 0 ? fallbackFid : null
  } catch {
    return null
  }
}

// Keep component import compatibility


export async function fetchUserByFid(fid: number | string): Promise<FarcasterUser | null> {
  const f = typeof fid === 'string' ? parseInt(fid, 10) : fid
  if (!Number.isFinite(f) || f <= 0) return null

  const data = await neynarFetch<{ users?: NeynarUser[] }>(
    '/v2/farcaster/user/bulk',
    { fids: String(f) }
  )
  const u = data?.users?.[0]
  return mapUser(u)
}

// Optional helper: fetch a cast by URL or hash (works with server API or SDK API)
export async function fetchCastByIdentifier(
  identifier: string,
  type: 'url' | 'hash',
  viewerFid?: number
): Promise<NeynarCast | null> {
  if (!identifier || !type) return null
  const data = await neynarFetch<{ cast?: NeynarCast; result?: { cast?: NeynarCast } }>(
    '/v2/farcaster/cast',
    { identifier, type, viewer_fid: viewerFid ? String(viewerFid) : undefined }
  )
  return (data as any)?.cast || (data as any)?.result?.cast || null
}

// Add: fetch user by username (mapped to FarcasterUser), uses same key/SDK fallback
export async function fetchUserByUsername(username: string): Promise<FarcasterUser | null> {
  const u = (username || '').replace(/^@/, '').trim().toLowerCase()
  if (!u) return null
  const data = await neynarFetch<{ user?: NeynarUser; result?: { user?: NeynarUser } }>(
    '/v2/farcaster/user/by-username',
    { username: u }
  )
  const raw = (data as any)?.user || (data as any)?.result?.user
  return mapUser(raw)
}

// --- Simple in-memory cache + throttle for username -> FID lookups ---
const __usernameFidCache = new Map<string, number>()
let __lastUsernameLookupAt = 0

/**
 * Resolve Farcaster FID by @username (without @).
 * - Caches results in-memory.
 * - Throttles calls to at most 1 per 1200ms to avoid rate limiting.
 */
export async function fetchFidByUsername(username: string): Promise<number | null> {
  const u = (username || '').replace(/^@/, '').trim().toLowerCase()
  if (!u) return null
  if (__usernameFidCache.has(u)) return __usernameFidCache.get(u) ?? null
  const now = Date.now()
  if (now - __lastUsernameLookupAt < 1200) {
    // too soon; rely on cache or wait
    return null
  }
  __lastUsernameLookupAt = now
  // Try server SDK; endpoint: /v2/farcaster/user/by-username
  const data = await neynarFetch<{ user?: NeynarUser; result?: { user?: NeynarUser } }>(
    '/v2/farcaster/user/by-username',
    { username: u }
  )
  const fid = (data as any)?.user?.fid ?? (data as any)?.result?.user?.fid ?? null
  const n = Number(fid)
  const out = Number.isFinite(n) && n > 0 ? n : null
  if (out) __usernameFidCache.set(u, out)
  return out
}