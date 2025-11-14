import { ImageResponse } from '@vercel/og'
import type { ImgHTMLAttributes } from 'react'
import { createPublicClient, http } from 'viem'
import { base, celo, optimism } from 'viem/chains'
import {
  CHAIN_IDS,
  type ChainKey,
  GM_CONTRACT_ABI,
  getContractAddress,
} from '@/lib/gm-utils'

import { fetchUserByAddress, fetchUserByFid } from '@/lib/neynar'

// Raw <img> is required for @vercel/og rendering; Next Image cannot be used inside ImageResponse.
// eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
const OgImage = ({ alt, ...props }: ImgHTMLAttributes<HTMLImageElement>) => <img alt={alt ?? ''} {...props} />

export const runtime = 'edge'
// Cache OG responses at the edge for 5 minutes (speeds up repeat loads)
export const revalidate = 300

// --- Perf helpers ---
function timeLimit<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(fallback), ms)
    p.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      () => {
        clearTimeout(t)
        resolve(fallback)
      },
    )
  })
}

// Module-level font cache (reused across hot edge instances)
let fontCachePromise: Promise<ArrayBuffer | null> | null = null

function isValidFont(buf: ArrayBuffer | null): buf is ArrayBuffer {
  if (!buf) return false
  const sig = String.fromCharCode(...new Uint8Array(buf.slice(0, 4)))
  // Accept common signatures
  return sig === 'wOF2' || sig === 'wOFF' || sig === 'OTTO' || sig === 'ttcf'
}

async function fetchFontChecked(url: string): Promise<ArrayBuffer | null> {
  try {
    const r = await fetch(url, { cache: 'force-cache' })
    if (!r.ok) return null
    const ct = r.headers.get('content-type') || ''
    // Basic content-type sanity
    if (
      !ct.includes('font') &&
      !ct.includes('application/octet-stream') &&
      !ct.includes('application/font-woff') &&
      !ct.includes('application/font-woff2')
    ) {
      // still try but validate bytes
    }
    const buf = await r.arrayBuffer()
    return isValidFont(buf) ? buf : null
  } catch {
    return null
  }
}

function loadFont(origin: string) {
  if (!fontCachePromise) {
    fontCachePromise = (async () => {
      // Priority: ENV override -> local public asset -> raw GitHub fallback
      const envUrl = process.env.OG_FONT_URL
      if (envUrl) {
        const b = await fetchFontChecked(envUrl)
        if (b) return b
      }
      const local = new URL('/fonts/gmeow2.ttf', origin).toString()
      const bLocal = await fetchFontChecked(local)
      if (bLocal) return bLocal
      // Use raw.githubusercontent.com to avoid HTML responses
      const remote = 'https://github.com/0xheycat/image-/raw/refs/heads/main/PixelifySans-Bold.ttf'
      const bRemote = await fetchFontChecked(remote)
      if (bRemote) return bRemote
      return null
    })()
  }
  return fontCachePromise
}

// Try multiple point function names for legacy contracts
async function readUserPoints(
  client: { readContract: (args: any) => Promise<any> },
  addr: `0x${string}`,
  contractAddr: `0x${string}`,
  abi: any
): Promise<number> {
  const fns = ['getUserTotalPoints', 'getUserPoints', 'pointsOf']
  for (const fn of fns) {
    try {
      const v = await client.readContract({
        address: contractAddr,
        abi,
        functionName: fn,
        args: [addr],
      })
      const n = Number(v ?? 0n)
      if (Number.isFinite(n) && n >= 0) return n
    } catch {}
  }
  return 0
}

// Read contract data with new ABI, fallback to legacy helpers
async function readUserDataWithPoints(
  client: { readContract: (args: any) => Promise<any> },
  addr: `0x${string}`,
  contractAddr: `0x${string}`,
  abi: any
) {
  try {
    const stat = await client.readContract({
      address: contractAddr,
      abi,
      functionName: 'getUserStats',
      args: [addr],
    }) as unknown as readonly [
      bigint, // lastGMTime
      bigint, // streak
      bigint, // totalPoints
      bigint, // frozenUntil
      `0x${string}`, // referrer
      bigint, // teamId
      bigint, // stakedPoints
      bigint, // stakingMultiplier
      boolean // registered
    ]
    const cs = Number(stat?.[1] ?? 0n)
    const pts = Number(stat?.[2] ?? 0n)
    // No total GM count on-chain now; approximate with current streak
    return { cs, tgm: cs, pts }
  } catch {
    try {
      // Legacy fallbacks
      const pts = await readUserPoints(client, addr, contractAddr, abi)
      return { cs: 0, tgm: 0, pts }
    } catch {
      return { cs: 0, tgm: 0, pts: 0 }
    }
  }
}

// Extra reads against latest ABI (with graceful fallbacks)
async function readUserStatsFull(
  client: { readContract: (args: any) => Promise<any> },
  addr: `0x${string}`,
  contractAddr: `0x${string}`,
  abi: any
) {
  try {
    const stat = (await client.readContract({
      address: contractAddr,
      abi,
      functionName: 'getUserStats',
      args: [addr],
    })) as readonly [bigint, bigint, bigint, bigint, `0x${string}`, bigint, bigint, bigint, boolean]
    const lastGMTime = Number(stat?.[0] ?? 0n)
    const streak = Number(stat?.[1] ?? 0n)
    const referrer = (stat?.[4] as `0x${string}`) || '0x0000000000000000000000000000000000000000'
    const teamId = Number(stat?.[5] ?? 0n)
    const stakedPoints = Number(stat?.[6] ?? 0n)
    const stakingMultiplier = Number(stat?.[7] ?? 0n)
    return { lastGMTime, streak, referrer, teamId, stakedPoints, stakingMultiplier }
  } catch {
    return { lastGMTime: 0, streak: 0, referrer: '0x0000000000000000000000000000000000000000' as const, teamId: 0, stakedPoints: 0, stakingMultiplier: 0 }
  }
}

async function readBestStreak(
  client: { readContract: (args: any) => Promise<any> },
  addr: `0x${string}`,
  contractAddr: `0x${string}`,
  abi: any
): Promise<number> {
  const fns = ['getUserBestStreak', 'bestStreakOf', 'getBestStreak']
  for (const fn of fns) {
    try {
      const v = await client.readContract({ address: contractAddr, abi, functionName: fn, args: [addr] })
      const n = Number(v ?? 0n)
      if (Number.isFinite(n) && n >= 0) return n
    } catch {}
  }
  return 0
}

async function readTeamName(
  client: { readContract: (args: any) => Promise<any> },
  teamId: number,
  contractAddr: `0x${string}`,
  abi: any
): Promise<string | null> {
  if (!teamId) return null
  const probes = [
    {
      fn: 'guilds' as const,
      pick: (res: any) => (Array.isArray(res) ? res[0] : undefined),
    },
    {
      fn: 'getTeam' as const,
      pick: (res: any) => res?.name ?? (Array.isArray(res) ? res[0] : undefined),
    },
    {
      fn: 'teamOf' as const,
      pick: (res: any) => res?.name ?? (Array.isArray(res) ? res[0] : undefined),
    },
  ]

  for (const probe of probes) {
    try {
      const raw = await client.readContract({ address: contractAddr, abi, functionName: probe.fn, args: [BigInt(teamId)] })
      const name = probe.pick(raw)
      if (typeof name === 'string' && name.trim().length > 0) return name
    } catch {}
  }

  return null
}

async function readReferralCount(
  client: { readContract: (args: any) => Promise<any> },
  addr: `0x${string}`,
  contractAddr: `0x${string}`,
  abi: any
): Promise<number> {
  const countFns = ['getReferralCount', 'referralCount', 'referralsCountOf', 'getTotalReferrals']
  for (const fn of countFns) {
    try {
      const v = await client.readContract({ address: contractAddr, abi, functionName: fn, args: [addr] })
      const n = Number(v ?? 0n)
      if (Number.isFinite(n) && n >= 0) return n
    } catch {}
  }
  // Fallback: arrays
  const arrFns = ['getUserReferrals', 'referralsOf', 'getReferralsFor']
  for (const fn of arrFns) {
    try {
      const v = (await client.readContract({ address: contractAddr, abi, functionName: fn, args: [addr] })) as string[]
      if (Array.isArray(v)) return v.length
    } catch {}
  }
  return 0
}

async function readActiveSeasonScore(
  client: { readContract: (args: any) => Promise<any> },
  addr: `0x${string}`,
  contractAddr: `0x${string}`,
  abi: any
): Promise<number> {
  const seasonIdFns = ['activeSeasonId', 'currentSeasonId', 'seasonId']
  let sid: bigint | null = null
  for (const fn of seasonIdFns) {
    try {
      const v = (await client.readContract({ address: contractAddr, abi, functionName: fn })) as bigint
      if (typeof v === 'bigint') { sid = v; break }
    } catch {}
  }
  if (sid === null) return 0
  const scoreFns = [
    { fn: 'getSeasonScore', args: (a: `0x${string}`, s: bigint) => [a, s] },
    { fn: 'getUserSeasonScore', args: (a: `0x${string}`, s: bigint) => [a, s] },
    { fn: 'seasonScoreOf', args: (a: `0x${string}`, _s: bigint) => [a] },
  ] as const
  for (const ent of scoreFns) {
    try {
      const v = await client.readContract({ address: contractAddr, abi, functionName: ent.fn, args: ent.args(addr, sid) })
      const n = Number(v ?? 0n)
      if (Number.isFinite(n) && n >= 0) return n
    } catch {}
  }
  return 0
}

async function readBadgesCount(
  client: { readContract: (args: any) => Promise<any> },
  addr: `0x${string}`,
  contractAddr: `0x${string}`,
  abi: any
): Promise<number> {
  const countFns = ['badgeCount', 'badgesLength', 'badgeMetaCount']
  for (const fn of countFns) {
    try {
      const v = await client.readContract({ address: contractAddr, abi, functionName: fn })
      const n = Number(v ?? 0n)
      if (Number.isFinite(n) && n >= 0) return n
    } catch {}
  }
  // Probe first N badge IDs with hasBadge(address,id)
  const N = 12
  try {
    const checks = await Promise.all(
      Array.from({ length: N }, (_, i) => i + 1).map((id) =>
        client
          .readContract({ address: contractAddr, abi, functionName: 'hasBadge', args: [addr, BigInt(id)] })
          .then((v: any) => Boolean(v))
          .catch(() => false)
      )
    )
    return checks.filter(Boolean).length
  } catch {
    return 0
  }
}

function formatAddr(a: string) {
  return `${a.slice(0, 6)}...${a.slice(-4)}`
}

function formatNumber(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US').format(n)
}

function calcPointsFontSize(
  value: number | null | undefined,
  base = 44,
  min = 20,
  step = 2,
  threshold = 6
): number {
  const n = Math.max(0, Number(value ?? 0))
  const len = n.toString().length
  return Math.max(min, base - Math.max(0, len - threshold) * step)
}

// New: helpers to scale by content length
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}
function digitLen(v: number | null | undefined): number {
  const n = Math.abs(Number(v ?? 0))
  if (!Number.isFinite(n)) return 1
  if (n === 0) return 1
  return Math.floor(Math.log10(n)) + 1
}
function computeScale(maxDigits: number): number {
  if (maxDigits >= 12) return 0.74
  if (maxDigits >= 10) return 0.82
  if (maxDigits >= 8) return 0.9
  return 1
}
function fitTextByLength(text: string, base: number, min: number) {
  const len = (text || '').length
  const over = Math.max(0, len - 12)
  const size = base - over * 1.2
  return clamp(Math.round(size), min, base)
}

type Theme = {
  name: 'bronze' | 'platinum' | 'gold' | 'default'
  bgGradient: string
  gridColor: string
  cardBorderOuter: string
  cardBorderInner: string
  headline: string
  sub: string
  streak: string
  gms: string
  points: string
  badgeBg: string
  badgeText: string
  badgeLabel: string
}

function getTheme(score: number | null): Theme {
  if (score !== null && score > 0.7) {
    return {
      name: 'gold',
      bgGradient: 'linear-gradient(180deg, #1a1400 0%, #3b2f00 60%, #1a1400 100%)',
      gridColor: '#4d3f00',
      cardBorderOuter: '#b45309',
      cardBorderInner: '#f59e0b',
      headline: '#FFE98A',
      sub: '#FDE68A',
      streak: '#F59E0B',
      gms: '#FACC15',
      points: '#FBBF24',
      badgeBg: '#F59E0B',
      badgeText: '#0b0a16',
      badgeLabel: 'OG GMEOW',
    }
  }
  if (score !== null && score >= 0.5) {
    return {
      name: 'platinum',
      bgGradient: 'linear-gradient(180deg, #0b0c10 0%, #171a21 60%, #0b0c10 100%)',
      gridColor: '#2a2f38',
      cardBorderOuter: '#64748B',
      cardBorderInner: '#E5E7EB',
      headline: '#F1F5F9',
      sub: '#CBD5E1',
      streak: '#A3A3A3',
      gms: '#E5E4E2',
      points: '#D1D5DB',
      badgeBg: '#E5E4E2',
      badgeText: '#111827',
      badgeLabel: 'PLATINUM',
    }
  }
  if (score !== null && score < 0.5) {
    return {
      name: 'bronze',
      bgGradient: 'linear-gradient(180deg, #1a0e08 0%, #2a1107 60%, #1a0e08 100%)',
      gridColor: '#3b1c10',
      cardBorderOuter: '#8B5A2B',
      cardBorderInner: '#CD7F32',
      headline: '#FCE7D2',
      sub: '#F5D0B5',
      streak: '#CD7F32',
      gms: '#E8B07C',
      points: '#E2B48D',
      badgeBg: '#CD7F32',
      badgeText: '#0b0a16',
      badgeLabel: 'LIMITED',
    }
  }
  return {
    name: 'default',
    bgGradient: 'linear-gradient(180deg, #0e0c1a 0%, #1a1233 60%, #0b0a16 100%)',
    gridColor: '#1f1844',
    cardBorderOuter: '#20154d',
    cardBorderInner: '#5b21b6',
    headline: '#E9D5FF',
    sub: '#C7D2FE',
    streak: '#FB923C',
    gms: '#22C55E',
    points: '#A78BFA',
    badgeBg: '#7C3AED',
    badgeText: '#F8FAFC',
    badgeLabel: 'GMEOW',
  }
}

// Unichain definition
const unichain = {
  id: CHAIN_IDS.unichain,
  name: 'Unichain',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [process.env.UNICHAIN_RPC_URL || 'https://mainnet.unichain.org'] } },
  blockExplorers: { default: { name: 'Uniscan', url: 'https://uniscan.xyz' } },
} as const

// NEW: Ink chain definition
const ink = {
  id: CHAIN_IDS.ink,
  name: 'Ink',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [process.env.INK_RPC_URL || 'https://rpc.inkonchain.com'] } },
  blockExplorers: { default: { name: 'Ink Explorer', url: 'https://explorer.inkonchain.com' } },
} as const

// Optimism client uses viem chain preset
// RPC env: OP_RPC_URL (falls back to public)
// Contract constants: GM_OP_CONTRACT_ADDRESS / GM_OP_CONTRACT_ABI

// Read user rank via common fn names
async function readUserRank(
  client: { readContract: (args: any) => Promise<any> },
  addr: `0x${string}`,
  contractAddr: `0x${string}`,
  abi: any
): Promise<number | null> {
  const fns = ['getUserRank', 'getLeaderboardRank', 'rankOf', 'getRank', 'userRank']
  for (const fn of fns) {
    try {
      const v = await client.readContract({
        address: contractAddr,
        abi,
        functionName: fn,
        args: [addr],
      })
      const n = Number(v ?? 0n)
      if (Number.isFinite(n) && n > 0) return n
    } catch {}
  }
  return null
}

// Base onchain stats: RPC nonce only (faster than BaseScan API)
async function fetchBaseOnchainStats(address: `0x${string}`) {
  try {
    const client = createPublicClient({
      chain: base,
      transport: http(process.env.BASE_RPC || 'https://base-mainnet.g.alchemy.com/v2/AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe'),
    })
    const nonce = await client.getTransactionCount({ address })
    return { totalTransactions: Number(nonce) }
  } catch {
    return { totalTransactions: null as number | null }
  }
}

function getTierBackgroundUrl(tier: Theme['name']): string | undefined {
  const map: Record<Theme['name'], string | undefined> = {
    gold: process.env.OG_BG_IMG_GOLD,
    platinum: process.env.OG_BG_IMG_PLATINUM,
    bronze: process.env.OG_BG_IMG_BRONZE,
    default: process.env.OG_BG_IMG_DEFAULT,
  }
  return map[tier]
}

// NEW: Chain icons (extend as you add networks)
const CHAIN_ICONS: Partial<Record<ChainKey, string>> = {
  base: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/base.svg',
  celo: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/celo.png',
  op: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/op.svg',
  unichain: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/unichain.png',
  ink: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/ink.png',
  // eth: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/eth.svg',
  // arbitrum: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/arbitrum.svg',
  // avax: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/avax.svg',
  // berachain: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/berachain.svg',
  // bnb: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/bnb.svg',
  // fraxtal: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/fraxtal.svg',
  // katana: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/katana.svg',
  // soneium: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/soneium.png',
  // taiko: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/taiko.svg',
  // hyper: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/hyper.png',
}

// Team meta (pfp) if available
async function readTeamMetaPfp(
  client: { readContract: (args: any) => Promise<any> },
  teamId: number,
  contractAddr: `0x${string}`,
  abi: any
): Promise<string | null> {
  if (!teamId) return null
  try {
    // TeamMeta { string pfp; string bio; } -> teamMeta(teamId) -> [pfp, bio]
    const meta = (await client.readContract({
      address: contractAddr,
      abi,
      functionName: 'teamMeta',
      args: [BigInt(teamId)],
    })) as readonly [string, string]
    const pfp = (meta?.[0] || '').trim()
    return pfp ? pfp : null
  } catch {
    return null
  }
}

// Determine if user's team is leading by points (scan first N teamIds)
async function readTeamLeaderInfo(
  client: { readContract: (args: any) => Promise<any> },
  teamId: number,
  contractAddr: `0x${string}`,
  abi: any,
  scan = 10
): Promise<{ isLeading: boolean; leaderPoints: number; myPoints: number }> {
  if (!teamId) return { isLeading: false, leaderPoints: 0, myPoints: 0 }
  try {
    const readGuildPoints = async (id: number): Promise<bigint> => {
      const probes = ['guilds', 'getTeam'] as const
      for (const fn of probes) {
        try {
          const raw = await client.readContract({ address: contractAddr, abi, functionName: fn, args: [BigInt(id)] })
          if (raw === null || raw === undefined) continue
          const tuple = Array.isArray(raw) ? raw : null
          if (tuple && typeof tuple[2] === 'bigint') return tuple[2]
          const direct = (raw as any)?.totalPoints
          if (typeof direct === 'bigint') return direct
        } catch {}
      }
      return 0n
    }

    const myPts = Number(await readGuildPoints(teamId))
    let leader = myPts
    for (let id = 1; id <= scan; id++) {
      try {
        const pts = Number(await readGuildPoints(id))
        if (pts > leader) leader = pts
      } catch {}
    }
    return { isLeading: myPts > 0 && myPts >= leader, leaderPoints: leader, myPoints: myPts }
  } catch {
    return { isLeading: false, leaderPoints: 0, myPoints: 0 }
  }
}

// Active quests progress (completed/total) with ABI fallbacks
async function readActiveQuestsProgress(
  client: { readContract: (args: any) => Promise<any> },
  addr: `0x${string}`,
  contractAddr: `0x${string}`,
  abi: any
): Promise<{ completed: number; total: number }> {
  // Try getActiveQuestIds -> uint256[]
  try {
    const ids = (await client.readContract({
      address: contractAddr,
      abi,
      functionName: 'getActiveQuestIds',
    })) as readonly bigint[]
    const total = Array.isArray(ids) ? ids.length : 0
    if (!total) return { completed: 0, total: 0 }
    let completed = 0
    for (const id of ids) {
      try {
        // Preferred: completedQuests(address, id) -> bool
        const done = await client.readContract({
          address: contractAddr,
          abi,
          functionName: 'completedQuests',
          args: [addr, id],
        })
        if (Boolean(done)) completed++
      } catch {
        try {
          // Alt: getUserQuestProgress(address,id) -> [current,target] or bool
          const prog = (await client.readContract({
            address: contractAddr,
            abi,
            functionName: 'getUserQuestProgress',
            args: [addr, id],
          })) as any
          if (Array.isArray(prog)) {
            const curr = Number(prog[0] ?? 0)
            const target = Number(prog[1] ?? 0)
            if (target > 0 && curr >= target) completed++
          } else if (typeof prog === 'boolean') {
            if (prog) completed++
          }
        } catch {}
      }
    }
    return { completed, total }
  } catch {
    // Fallback: scan first N questIds
    const N = 5
    let total = 0
    let completed = 0
    for (let i = 1; i <= N; i++) {
      try {
        await client.readContract({ address: contractAddr, abi, functionName: 'getQuest', args: [BigInt(i)] })
        total++
        try {
          const done = await client.readContract({
            address: contractAddr,
            abi,
            functionName: 'completedQuests',
            args: [addr, BigInt(i)],
          })
          if (Boolean(done)) completed++
        } catch {}
      } catch {}
    }
    return { completed, total }
  }
}

// Season end timestamp
async function readSeasonEndsAt(
  client: { readContract: (args: any) => Promise<any> },
  contractAddr: `0x${string}`,
  abi: any
): Promise<number> {
  // Direct endsAt
  const endFns = ['activeSeasonEndsAt', 'currentSeasonEndsAt', 'seasonEndsAt']
  for (const fn of endFns) {
    try {
      const v = (await client.readContract({ address: contractAddr, abi, functionName: fn })) as bigint
      if (typeof v === 'bigint') return Number(v)
    } catch {}
  }
  // Derive via getSeason(activeSeasonId)
  const sidFns = ['activeSeasonId', 'currentSeasonId', 'seasonId']
  for (const sfn of sidFns) {
    try {
      const sid = (await client.readContract({ address: contractAddr, abi, functionName: sfn })) as bigint
      if (typeof sid === 'bigint') {
        // Try getSeason(sid) -> [start,end,...] or struct with endsAt/endTime
        try {
          const season = await client.readContract({ address: contractAddr, abi, functionName: 'getSeason', args: [sid] })
          if (Array.isArray(season)) {
            // Heuristic: pick the larger of the first two values as end
            const a = Number(season[0] ?? 0n)
            const b = Number(season[1] ?? 0n)
            return Math.max(a, b)
          } else if (season && typeof season === 'object') {
            const end = (season as any).endsAt ?? (season as any).endTime
            if (typeof end === 'bigint') return Number(end)
          }
        } catch {}
      }
    } catch {}
  }
  return 0
}

// Season rank (if contract exposes it)
async function readSeasonRank(
  client: { readContract: (args: any) => Promise<any> },
  addr: `0x${string}`,
  contractAddr: `0x${string}`,
  abi: any
): Promise<number | null> {
  const sidFns = ['activeSeasonId', 'currentSeasonId', 'seasonId']
  let sid: bigint | null = null
  for (const fn of sidFns) {
    try {
      const v = (await client.readContract({ address: contractAddr, abi, functionName: fn })) as bigint
      if (typeof v === 'bigint') { sid = v; break }
    } catch {}
  }
  if (!sid) return null
  const rankFns = ['getSeasonRank', 'getUserSeasonRank', 'seasonRankOf']
  for (const fn of rankFns) {
    try {
      const v = await client.readContract({ address: contractAddr, abi, functionName: fn, args: [addr, sid] })
      const n = Number(v ?? 0n)
      if (Number.isFinite(n) && n > 0) return n
    } catch {}
  }
  return null
}

function formatCountdown(endTsSec: number): string | null {
  if (!endTsSec) return null
  const now = Math.floor(Date.now() / 1000)
  let s = Math.max(0, endTsSec - now)
  const d = Math.floor(s / 86400)
  s -= d * 86400
  const h = Math.floor(s / 3600)
  return `${d}d ${h}h`
}

function resolveUri(u?: string | null): string | null {
  if (!u) return null
  if (u.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${u.slice(7)}`
  return u
}
function safeJson<T = any>(s: string | null): T | null {
  try { return s ? JSON.parse(s) : null } catch { return null }
}

// Read a few badge images (if contract exposes badgeContract/tokenURI + hasBadge)
async function readBadgeThumbs(
  client: { readContract: (args: any) => Promise<any> },
  addr: `0x${string}`,
  contractAddr: `0x${string}`,
  abi: any,
  max = 3
): Promise<string[]> {
  try {
    const badgeAddr = await client.readContract({
      address: contractAddr,
      abi,
      functionName: 'badgeContract',
    }) as `0x${string}`
    const out: string[] = []
    let id = 1
    while (out.length < max && id <= 16) {
      try {
        const has = await client.readContract({
          address: contractAddr,
          abi,
          functionName: 'hasBadge',
          args: [addr, BigInt(id)],
        })
        if (has) {
          try {
            const uri = await client.readContract({
              address: badgeAddr,
              // ERC721 tokenURI ABI fallback
              abi: [{ type: 'function', name: 'tokenURI', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'string' }] }],
              functionName: 'tokenURI',
              args: [BigInt(id)],
            }) as string
            if (uri?.startsWith('data:')) {
              const json = safeJson<{ image?: string }>(atob(uri.split(',')[1] || ''))
              const img = resolveUri(json?.image || null)
              if (img) out.push(img)
            } else {
              const img = resolveUri(uri)
              if (img) out.push(img)
            }
          } catch {}
        }
      } catch {}
      id++
    }
    return out
  } catch {
    return []
  }
}

// Read user referral code text (so we can share a join link)
async function readReferralCodeStringFull(
  client: { readContract: (args: any) => Promise<any> },
  addr: `0x${string}`,
  contractAddr: `0x${string}`,
  abi: any
): Promise<string | null> {
  try {
    const codeHash = await client.readContract({
      address: contractAddr,
      abi,
      functionName: 'userReferralCode',
      args: [addr],
    }) as `0x${string}`
    if (codeHash && codeHash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      try {
        const s = await client.readContract({
          address: contractAddr,
          abi,
          functionName: 'referralCodeString',
          args: [codeHash],
        }) as string
        return (s || '').trim() || null
      } catch {}
    }
  } catch {}
  // Alt direct string
  try {
    const s2 = await client.readContract({
      address: contractAddr,
      abi,
      functionName: 'getReferralCodeFor',
      args: [addr],
    }) as string
    return (s2 || '').trim() || null
  } catch {}
  return null
}

export async function GET(req: Request) {
  try {
    // URL and params
    const url = new URL(req.url)
    const parts = url.pathname.split('/')
    const raw = parts[parts.length - 1] || parts[parts.length - 2]
    const address = decodeURIComponent(raw) as `0x${string}`
    const bgUrl = url.searchParams.get('bgUrl') || undefined
    // ADD: optional fid fallback when wallet->Farcaster mapping isn’t present
    const fidParam = url.searchParams.get('fid')

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return new Response('Invalid address', { status: 400 })
    }

    // Font (module-cached, fast local woff2 if available)
    const gameFont = await timeLimit(loadFont(url.origin), 800, null)

    // Clients
    // Supported chains and clients
    const CHAINS: ChainKey[] = ['base', 'celo', 'unichain', 'ink', 'op']
    const chainObj: Record<ChainKey, any> = {
      base,
      celo,
      unichain,
      ink,
      op: optimism,
    }
    const rpcEnv: Partial<Record<ChainKey, string>> = {
      base: process.env.BASE_RPC || 'https://base-mainnet.g.alchemy.com/v2/AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe',
      celo: process.env.CELO_RPC_URL || 'https://forno.celo.org',
      unichain: unichain.rpcUrls.default.http[0] as string,
      ink: ink.rpcUrls.default.http[0] as string,
      op: process.env.OP_RPC_URL || 'https://mainnet.optimism.io',
    }
    const clients = Object.fromEntries(
      CHAINS.map((k) => [k, createPublicClient({ chain: chainObj[k], transport: http(rpcEnv[k]!) })])
    ) as Record<ChainKey, ReturnType<typeof createPublicClient>>

    // Stats per contract (timeboxed)
    const zero = { cs: 0, tgm: 0, pts: 0 }
    const statsEntries = await Promise.all(
      CHAINS.map(async (k) => {
        const addr = getContractAddress(k) as `0x${string}`
        const v = await timeLimit(readUserDataWithPoints(clients[k] as any, address, addr, GM_CONTRACT_ABI), 900, zero)
        return [k, v] as const
      })
    )
    const stats = Object.fromEntries(statsEntries) as Record<ChainKey, typeof zero>
    const baseStats = stats.base || zero
    const celoStats = stats.celo || zero
    const uniStats = stats.unichain || zero
    const inkStats = stats.ink || zero
    const opStats = stats.op || zero

    // Rank (timeboxed; skip if slow)
    const rankEntries = await Promise.all(
      CHAINS.map((k) =>
        timeLimit(
          readUserRank(clients[k] as any, address, getContractAddress(k) as `0x${string}`, GM_CONTRACT_ABI),
          700,
          null
        ).then((v) => [k, v] as const)
      )
    )
    const ranks = Object.fromEntries(rankEntries) as Record<ChainKey, number | null>
    const chainRank = ranks.base ?? ranks.celo ?? ranks.unichain ?? ranks.ink ?? ranks.op ?? null

    // Aggregates (include Ink + OP)
    const totalGMs = baseStats.tgm + celoStats.tgm + uniStats.tgm + inkStats.tgm + opStats.tgm
    const totalPoints = baseStats.pts + celoStats.pts + uniStats.pts + inkStats.pts + opStats.pts

    // Optional: per-chain points (use in JSX if needed)
    const chainPoints = {
      base: baseStats.pts,
      celo: celoStats.pts,
      unichain: uniStats.pts,
      ink: inkStats.pts,
      op: opStats.pts,
    }

    // Active network (highest points)
    const ACTIVE_ORDER: ChainKey[] = ['base', 'op', 'celo', 'unichain', 'ink']
    const activeChain: ChainKey = ACTIVE_ORDER.reduce(
      (best, k) => (chainPoints[k] > chainPoints[best] ? k : best),
      'base' as ChainKey
    )
    const activeIcon = CHAIN_ICONS[activeChain]

    // Neynar user (timeboxed; optional)
    let fc: Awaited<ReturnType<typeof fetchUserByAddress>> | Awaited<ReturnType<typeof fetchUserByFid>> = null
    try {
      if (process.env.NEYNAR_API_KEY || process.env.NEYNAR_GLOBAL_API) {
        // CHANGE: longer timeout and fid fallback
        if (fidParam && /^\d+$/.test(fidParam)) {
          fc = await timeLimit(fetchUserByFid(parseInt(fidParam, 10)), 2000, null)
        } else {
          fc = await timeLimit(fetchUserByAddress(address), 2000, null)
        }
      }
    } catch { fc = null }

    const score =
      fc?.neynarScore != null && !isNaN(Number(fc.neynarScore)) ? Number(fc.neynarScore) : null
    const theme = getTheme(score)
    // followerCount/followingCount not shown on the card

    // Base-only onchain (timeboxed)
    const baseOnchain = await timeLimit(fetchBaseOnchainStats(address), 700, { totalTransactions: null })

    // Background
    const resolvedBgUrl = bgUrl || getTierBackgroundUrl(theme.name)

    const displayHandle = fc?.username ? `@${fc.username}` : formatAddr(address)

    // Choose a primary chain for extras (Base preferred)
    const primary: ChainKey = 'base'
    const primaryClient = clients[primary] as any
    const primaryAddr = getContractAddress(primary) as `0x${string}`

    // Fetch extras with timeouts
    // 1) Core user stat; then parallel extras
    const statsFull = await timeLimit(
      readUserStatsFull(primaryClient, address, primaryAddr, GM_CONTRACT_ABI),
      800,
      { lastGMTime: 0, streak: 0, referrer: '0x0000000000000000000000000000000000000000', teamId: 0, stakedPoints: 0, stakingMultiplier: 0 }
    )
    const [
      bestStreak, teamName, teamMetaPfp, teamLeaderInfo, referralsCount, seasonScore,
      badgesCount, seasonEndsAt, seasonRank, questsProg, badgeThumbs, refCode
    ] = await Promise.all([
      timeLimit(readBestStreak(primaryClient, address, primaryAddr, GM_CONTRACT_ABI), 600, 0),
      timeLimit(readTeamName(primaryClient, statsFull.teamId, primaryAddr, GM_CONTRACT_ABI), 600, null),
      timeLimit(readTeamMetaPfp(primaryClient, statsFull.teamId, primaryAddr, GM_CONTRACT_ABI), 600, null),
      timeLimit(readTeamLeaderInfo(primaryClient, statsFull.teamId, primaryAddr, GM_CONTRACT_ABI), 700, { isLeading: false, leaderPoints: 0, myPoints: 0 }),
      timeLimit(readReferralCount(primaryClient, address, primaryAddr, GM_CONTRACT_ABI), 600, 0),
      timeLimit(readActiveSeasonScore(primaryClient, address, primaryAddr, GM_CONTRACT_ABI), 700, 0),
      timeLimit(readBadgesCount(primaryClient, address, primaryAddr, GM_CONTRACT_ABI), 800, 0),
      timeLimit(readSeasonEndsAt(primaryClient, primaryAddr, GM_CONTRACT_ABI), 600, 0),
      timeLimit(readSeasonRank(primaryClient, address, primaryAddr, GM_CONTRACT_ABI), 600, null),
      timeLimit(readActiveQuestsProgress(primaryClient, address, primaryAddr, GM_CONTRACT_ABI), 700, { completed: 0, total: 0 }),
      timeLimit(readBadgeThumbs(primaryClient, address, primaryAddr, GM_CONTRACT_ABI), 800, []),
      timeLimit(readReferralCodeStringFull(primaryClient, address, primaryAddr, GM_CONTRACT_ABI), 600, null),
    ])

    // Scale post-queries so seasonRank is defined
    const maxDigits = Math.max(
      digitLen(totalPoints),
      digitLen(totalGMs),
      digitLen(baseOnchain.totalTransactions ?? 0),
      digitLen((seasonRank ?? chainRank) ?? 0)
    )
    const scale = computeScale(maxDigits)
    const s = (base: number, min = Math.round(base * 0.7)) => Math.round(clamp(base * scale, min, base))

    const sizes = {
      label: s(12, 10),
      title: s(20, 16),
      name: s(24, 16),
      sub: s(16, 14),
      score: s(14, 12),
      big: s(48, 26),
      mid: s(40, 24),
      small: s(34, 22),
      chainPoints: s(22, 12),
    }

    const referrerShort =
      statsFull.referrer && statsFull.referrer !== '0x0000000000000000000000000000000000000000'
        ? formatAddr(statsFull.referrer)
        : '—'
    const isOG = Boolean(fc?.powerBadge) || bestStreak >= 100 || referralsCount >= 10
    const seasonEndsIn = formatCountdown(seasonEndsAt)
    const flames = '🔥'.repeat(Math.max(0, Math.min(10, statsFull.streak)))
    const joinUrl = `${new URL('/Guild', url.origin).toString()}?team=${statsFull.teamId || ''}&ref=${encodeURIComponent(refCode || address)}`
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(joinUrl)}`
    // Human‑readable display (no protocol, no query noise)
    const joinUrlObj = new URL(joinUrl)
    const joinUrlDisplay = `${joinUrlObj.host}${joinUrlObj.pathname}`

    const formattedSeasonScore = formatNumber(seasonScore)
    const formattedTotalPoints = formatNumber(totalPoints)
    const formattedTotalGms = formatNumber(totalGMs)
    const formattedReferrals = formatNumber(referralsCount)
    const formattedBadges = formatNumber(badgesCount)
    const formattedStaked = formatNumber(statsFull.stakedPoints)
    const resolvedRank = seasonRank ?? chainRank
    const formattedRank = resolvedRank != null ? formatNumber(resolvedRank) : null

    const NETWORK_ORDER: ChainKey[] = ['base', 'op', 'celo', 'unichain', 'ink']
    const element = (
      <div style={{ position: 'relative', width: '1200px', height: '630px', display: 'flex', flexDirection: 'column', background: theme.bgGradient, color: '#F8FAFC', padding: '28px', fontFamily: '"GMeow", monospace', letterSpacing: '-0.2px' }}>
        {resolvedBgUrl ? (
          <OgImage
            src={resolvedBgUrl}
            alt="bg"
            width={1200}
            height={630}
            style={{
              position: 'absolute',
              inset: 0,
              width: '1200px',
              height: '630px',
              objectFit: 'cover',
              imageRendering: 'pixelated' as any,
            }}
          />
        ) : null}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            backgroundImage:
              `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
            backgroundSize: '24px 24px, 24px 24px',
            opacity: 0.28,
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 18,
            display: 'flex',
            boxShadow: `0 0 0 6px ${theme.cardBorderOuter}, inset 0 0 0 6px ${theme.cardBorderInner}, 0 10px 0 rgba(0,0,0,0.35)`,
            borderRadius: 10,
          }}
        />

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 24, flex: 1 }}>
          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', width: 360, minWidth: 360, height: '100%', background: '#0f0b22', borderRadius: 10, padding: 20, boxShadow: `0 0 0 4px ${theme.cardBorderOuter}, inset 0 0 0 4px ${theme.cardBorderInner}, 0 8px 0 rgba(0,0,0,0.35)` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* PFP */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 104, height: 104, borderRadius: 8, background: '#0b0a16', overflow: 'hidden', boxShadow: `0 0 0 4px ${theme.cardBorderOuter}, inset 0 0 0 4px ${theme.cardBorderInner}` }}>
                {fc?.pfpUrl ? (
                  <OgImage src={fc.pfpUrl} alt="pfp" width={104} height={104} style={{ imageRendering: 'pixelated' as any }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: theme.sub }}>
                    {address.slice(2, 4).toUpperCase()}
                  </div>
                )}
              </div>
              {/* Name + speech bubble */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'block', fontSize: fitTextByLength(displayHandle, sizes.name, 16), color: theme.headline, textShadow: `0 2px 0 ${theme.cardBorderOuter}`, lineHeight: 1 }}>
                  {displayHandle}
                </div>
                <div style={{ display: 'block', fontSize: sizes.sub, color: theme.sub, opacity: 0.9, lineHeight: 1 }}>
                  {fc?.displayName || 'GMEOW Adventurer'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#131035', padding: '6px 8px', borderRadius: 8, boxShadow: `0 0 0 3px ${theme.cardBorderOuter}, inset 0 0 0 3px ${theme.cardBorderInner}`, fontSize: 11, color: theme.sub }}>
                  {`💬 GM, ${displayHandle}!`}
                </div>
              </div>
            </div>

            {/* Team + leader */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
              <div style={{ display: 'flex', background: '#131035', padding: '6px 10px', borderRadius: 8, boxShadow: `0 0 0 3px ${theme.cardBorderOuter}, inset 0 0 0 3px ${theme.cardBorderInner}`, fontSize: 12, color: theme.sub }}>
                {`Team: ${teamName || '—'}`}
              </div>
              {teamMetaPfp ? (
                <OgImage src={teamMetaPfp} alt="team" width={20} height={20} style={{ borderRadius: 4, imageRendering: 'pixelated' as any, boxShadow: `0 0 0 2px ${theme.cardBorderInner}` }} />
              ) : null}
              {teamLeaderInfo?.isLeading ? (
                <div style={{ display: 'flex', background: '#1f2937', padding: '4px 8px', borderRadius: 999, fontSize: 11, color: '#FCD34D', boxShadow: `0 0 0 2px ${theme.cardBorderInner}` }}>
                  🏆 Leading!
                </div>
              ) : null}
            </div>

            {/* OG / status pill */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 12, padding: '10px 14px', background: theme.badgeBg, color: theme.badgeText, borderRadius: 8, boxShadow: `0 0 0 3px ${theme.cardBorderOuter}, inset 0 0 0 3px ${theme.cardBorderInner}`, fontSize: 12 }}>
              {isOG ? 'OG GMEOW' : theme.badgeLabel}
            </div>

            {/* Achievements (sidebar: progress + streaks only) */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                marginTop: 12,
                background: '#111042',
                borderRadius: 8,
                padding: 12,
                boxShadow: `0 0 0 3px ${theme.cardBorderOuter}, inset 0 0 0 3px ${theme.cardBorderInner}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'block', fontSize: sizes.label, color: theme.sub }}>Achievements</div>
                {seasonEndsIn ? (
                  <div style={{ display: 'block', fontSize: sizes.label, color: theme.sub, opacity: 0.9 }}>
                    {`Ends in ${seasonEndsIn}`}
                  </div>
                ) : null}
              </div>

              {/* Active Quests */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'block', fontSize: sizes.label, color: theme.sub }}>Active Quests</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'block', fontSize: sizes.label, color: theme.headline, lineHeight: 1 }}>
                    {`${questsProg.completed}/${questsProg.total}`}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    height: 8,
                    background: '#0b0a16',
                    borderRadius: 6,
                    overflow: 'hidden',
                    boxShadow: `inset 0 0 0 2px ${theme.cardBorderInner}`,
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, Math.round((questsProg.total ? (questsProg.completed / questsProg.total) : 0) * 100))}%`,
                      background: theme.gms,
                    }}
                  ></div>
                </div>
              </div>

              {/* Streaks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'block', fontSize: sizes.label, color: theme.sub }}>GM Streak</div>
                  <div style={{ display: 'block', fontSize: calcPointsFontSize(statsFull.streak, 18, 14, 2, 4), color: theme.streak, textShadow: `0 1px 0 ${theme.cardBorderOuter}` }}>
                    {`🔥 ${statsFull.streak}`}
                  </div>
                </div>
                {flames ? (
                  <div style={{ display: 'block', fontSize: sizes.label, color: theme.gms }} aria-hidden>
                    {flames}
                  </div>
                ) : null}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'block', fontSize: sizes.label, color: theme.sub }}>Best Streak</div>
                  <div style={{ display: 'block', fontSize: calcPointsFontSize(bestStreak || statsFull.streak, 18, 14, 2, 4), color: theme.sub }}>
                    {bestStreak || statsFull.streak}
                  </div>
                </div>
              </div>
            </div>

            {/* Networks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              <div style={{ display: 'flex', fontSize: sizes.label, color: theme.sub, opacity: 0.95 }}>
                Networks
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {NETWORK_ORDER.map((k) => {
                  const src = CHAIN_ICONS[k]
                  if (!src) return null
                  return (
                    <div
                      key={k}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 38,
                        height: 38,
                        background: '#111042',
                        borderRadius: 8,
                        boxShadow: `0 0 0 3px ${theme.cardBorderOuter}, inset 0 0 0 3px ${theme.cardBorderInner}${k === activeChain ? `, 0 0 0 2px ${theme.gms}` : ''}`,
                      }}
                    >
                      <OgImage src={src} alt={`${k} icon`} width={20} height={20} style={{ display: 'flex', imageRendering: 'pixelated' as any }} />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Join my team + QR */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16 }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                background: '#131035',
                padding: '10px 12px',
                borderRadius: 8,
                boxShadow: `0 0 0 3px ${theme.cardBorderOuter}, inset 0 0 0 3px ${theme.cardBorderInner}`,
                minWidth: 0,
              }}>
                <div style={{ display: 'block', fontSize: 12, fontWeight: 800, color: theme.headline, lineHeight: 1 }}>
                  ➕ Join and collect your OG card
                </div>
                <div style={{ display: 'block', fontSize: 11, color: theme.sub, opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {joinUrlDisplay}
                </div>
              </div>
              <OgImage
                src={qrUrl}
                alt="qr"
                width={88}
                height={88}
                style={{ imageRendering: 'pixelated' as any, borderRadius: 6, boxShadow: `0 0 0 3px ${theme.cardBorderInner}` }}
              />
            </div>

            <div style={{ display: 'flex', marginTop: 'auto', fontSize: 10, color: theme.sub, opacity: 0.8 }}></div>
          </div>

          {/* Main (compact metric cards + engagement) */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 10 }}>
            {/* Header with active network */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'block', fontSize: sizes.title, color: theme.headline, textShadow: `0 2px 0 ${theme.cardBorderOuter}`, lineHeight: 1 }}>
                Overview
              </div>
              {activeIcon ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'block', fontSize: sizes.label, color: theme.sub }}>Active</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, background: '#111042', borderRadius: 8, boxShadow: `0 0 0 3px ${theme.cardBorderOuter}, inset 0 0 0 3px ${theme.cardBorderInner}` }}>
                    <OgImage src={activeIcon} alt={`${activeChain} icon`} width={18} height={18} style={{ display: 'flex', imageRendering: 'pixelated' as any }} />
                  </div>
                </div>
              ) : null}
            </div>

            {/* Compact metrics row */}
            <div style={{ display: 'flex', gap: 10 }}>
              {/* Season Score */}
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: '#0f0b22', borderRadius: 10, padding: 12, boxShadow: `0 0 0 4px ${theme.cardBorderOuter}, inset 0 0 0 4px ${theme.cardBorderInner}` }}>
                <div style={{ display: 'flex', fontSize: sizes.label, color: theme.sub, justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span>Season Score</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {resolvedRank != null && formattedRank ? (
                      <span style={{ color: theme.points, fontWeight: 700 }}>{`#${formattedRank}`}</span>
                    ) : null}
                    {seasonEndsIn ? <span style={{ color: theme.sub, opacity: 0.9 }}>{`Ends ${seasonEndsIn}`}</span> : null}
                  </div>
                </div>
                <div style={{ display: 'block', fontSize: calcPointsFontSize(seasonScore, sizes.small, 18, 2, 6), color: theme.gms, marginTop: 6, textShadow: `0 2px 0 ${theme.cardBorderOuter}`, lineHeight: 1 }}>
                  {formattedSeasonScore}
                </div>
              </div>

              {/* Total Points */}
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: '#0f0b22', borderRadius: 10, padding: 12, boxShadow: `0 0 0 4px ${theme.cardBorderOuter}, inset 0 0 0 4px ${theme.cardBorderInner}` }}>
                <div style={{ display: 'block', fontSize: sizes.label, color: theme.sub }}>Total Points</div>
                <div style={{ display: 'block', fontSize: calcPointsFontSize(totalPoints, sizes.small, 18, 2, 6), color: theme.points, marginTop: 6, textShadow: `0 2px 0 ${theme.cardBorderOuter}`, lineHeight: 1 }}>
                  {formattedTotalPoints}
                </div>
              </div>

              {/* Total GMs */}
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: '#0f0b22', borderRadius: 10, padding: 12, boxShadow: `0 0 0 4px ${theme.cardBorderOuter}, inset 0 0 0 4px ${theme.cardBorderInner}` }}>
                <div style={{ display: 'block', fontSize: sizes.label, color: theme.sub }}>Total GMs</div>
                <div style={{ display: 'block', fontSize: calcPointsFontSize(totalGMs, sizes.small, 18, 2, 6), color: theme.gms, marginTop: 6, textShadow: `0 2px 0 ${theme.cardBorderOuter}`, lineHeight: 1 }}>
                  {formattedTotalGms}
                </div>
              </div>

              {/* Leaderboard Rank */}
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: '#0f0b22', borderRadius: 10, padding: 12, boxShadow: `0 0 0 4px ${theme.cardBorderOuter}, inset 0 0 0 4px ${theme.cardBorderInner}` }}>
                <div style={{ display: 'block', fontSize: sizes.label, color: theme.sub }}>Leaderboard Rank</div>
                <div style={{ display: 'block', fontSize: calcPointsFontSize((resolvedRank ?? 0), sizes.small, 18, 2, 4), color: theme.streak, marginTop: 6, textShadow: `0 2px 0 ${theme.cardBorderOuter}`, lineHeight: 1 }}>
                  {resolvedRank != null && formattedRank ? `#${formattedRank}` : '—'}
                </div>
              </div>
            </div>

            {/* Engagement (badges, referrals, staked) */}
            <div style={{ display: 'flex', flexDirection: 'column', background: '#0f0b22', borderRadius: 10, padding: 12, boxShadow: `0 0 0 4px ${theme.cardBorderOuter}, inset 0 0 0 4px ${theme.cardBorderInner}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'block', fontSize: sizes.label, color: theme.sub }}>Engagement</div>
                <div style={{ display: 'block', fontSize: sizes.label, color: theme.sub, opacity: 0.9 }}>{displayHandle}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                {/* Badges */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: '#111042', padding: 10, borderRadius: 8, boxShadow: `inset 0 0 0 3px ${theme.cardBorderInner}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: sizes.label, color: theme.sub }}>
                    <span>Badges</span>
                    <span>{formattedBadges}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    {badgeThumbs?.length
                      ? badgeThumbs.slice(0, 3).map((src, i) => (
                          <OgImage key={i} src={src} alt="badge" width={28} height={28} style={{ imageRendering: 'pixelated' as any, borderRadius: 6, boxShadow: `0 0 0 2px ${theme.cardBorderInner}` }} />
                        ))
                      : <div style={{ display: 'flex', fontSize: sizes.label, color: theme.points }}>—</div>}
                  </div>
                </div>
                {/* Referrals */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: '#111042', padding: 10, borderRadius: 8, boxShadow: `inset 0 0 0 3px ${theme.cardBorderInner}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: sizes.label, color: theme.sub }}>
                    <span>Referrals</span>
                    <span>{formattedReferrals}</span>
                  </div>
                  <div style={{ display: 'block', fontSize: sizes.label, color: theme.sub, marginTop: 6 }}>
                    {`By: ${referrerShort}`}
                  </div>
                </div>
                {/* Staked */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: '#111042', padding: 10, borderRadius: 8, boxShadow: `inset 0 0 0 3px ${theme.cardBorderInner}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: sizes.label, color: theme.sub }}>
                    <span>Staked</span>
                    <span>{formattedStaked}</span>
                  </div>
                  <div style={{ display: 'block', fontSize: sizes.label, color: theme.sub, marginTop: 6 }}>
                    {`x${(statsFull.stakingMultiplier || 0) / 1000}`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )

    return new ImageResponse(element, {
      width: 1200,
      height: 630,
      fonts: gameFont ? [{ name: 'GMeow', data: gameFont, weight: 400, style: 'normal' }] : undefined,
    })
  } catch {
    return new Response('Failed to render card', { status: 500 })
  }
}