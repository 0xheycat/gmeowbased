// app/api/frame/route.ts



import { NextResponse } from 'next/server'
import {
  createPublicClient,
  http,
  type Address,
} from 'viem'

// Import your gm-utils. Adjust path if your gm-utils export is different.
import gm, {
  CONTRACT_ADDRESSES,
  GM_CONTRACT_ABI,
  createGetQuestCall,
  createGetUserStatsCall,
  CHAIN_KEYS,
  CHAIN_LABEL,
  normalizeQuestStruct,
  sanitizeExpiresAt,
  type NormalizedQuest,
  type ChainKey,
} from '@/lib/gm-utils'
import { calculateRankProgress } from '@/lib/rank'
import { getChainIconUrl } from '@/lib/chain-icons'
import { buildDynamicFrameImageUrl } from '@/lib/share'
import {
  sanitizeFID,
  sanitizeQuestId,
  sanitizeChainKey as validateChainKey,
  sanitizeFrameType,
  sanitizeButtons,
} from '@/lib/frame-validation'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { checkAndAwardNewUserRewards } from '@/lib/user-rewards'
export const runtime = 'nodejs'
export const revalidate = 500
// If you maintain a neynar helper module, use it; otherwise this file contains
// lightweight neynar helpers (below) that behave reasonably for embedded use.
import * as Ne from '@/lib/neynar' // optional — wrapped in try/catch at runtime

// -------------------- Config & Defaults --------------------
const DEFAULT_RPCS: Record<string, string> = {
  base: process.env.NEXT_PUBLIC_RPC_BASE || process.env.RPC_BASE || 'https://base-rpc.publicnode.com',
  op: process.env.NEXT_PUBLIC_RPC_OP || process.env.RPC_OP || 'https://mainnet.optimism.io',
  celo: process.env.NEXT_PUBLIC_RPC_CELO || process.env.RPC_CELO || 'https://forno.celo.org',
  unichain: process.env.NEXT_PUBLIC_RPC_UNICHAIN || process.env.RPC_UNICHAIN || 'https://rpc.unichain.org',
  ink: process.env.NEXT_PUBLIC_RPC_INK || process.env.RPC_INK || 'https://rpc.ink.example', // placeholder
}

// Small static defaults to avoid uncaught missing envs; encourage override in env
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY || ''

const FRAME_VERSION = '1.2'

// Standard Farcaster Frame meta tag prefix (used even with vNext)
const FRAME_PREFIX = 'fc:frame'

function frameKey(...parts: Array<string | number>): string {
  if (parts.length === 0) return FRAME_PREFIX
  return `${FRAME_PREFIX}:${parts.join(':')}`
}

// NOTE: frameButtonKey is no longer used with the new JSON frame format
// Keeping for backwards compatibility if needed
// function frameButtonKey(index: number, ...parts: Array<string | number>): string {
//   const suffix = parts.length ? `:${parts.join(':')}` : ''
//   return `${FRAME_PREFIX}:button:${index}${suffix}`
// }

const DEFAULT_HTML_HEADERS: Record<string, string> = {
  'content-type': 'text/html; charset=utf-8',
  'content-security-policy': "frame-ancestors *; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://privy.farcaster.xyz https://wallet.farcaster.xyz https://*.farcaster.xyz https://*.base.dev; connect-src 'self' https://privy.farcaster.xyz https://wallet.farcaster.xyz https://*.farcaster.xyz https://api.neynar.com https://*.base.dev wss://*.farcaster.xyz; img-src 'self' data: https: blob:;",
  'x-frame-options': 'ALLOWALL',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization, X-Requested-With',
  'cache-control': 'public, max-age=300, stale-while-revalidate=60',
  'referrer-policy': 'same-origin',
}

// -------------------- Types --------------------
type FrameType = 'quest' | 'guild' | 'points' | 'referral' | 'leaderboards' | 'gm' | 'verify' | 'onchainstats' | 'badge' | 'generic'

type TraceItem = { ts: number; step: string; info?: any }
type Trace = TraceItem[]

type FrameRequest = {
  type?: FrameType
  id?: string // generic id
  chain?: string
  questId?: string | number
  fid?: number | string
  user?: string
  json?: boolean | string | number
  debug?: boolean | string | number
  action?: string
  [k: string]: any
}

type QuestFetchSuccess = { ok: true; quest: NormalizedQuest; raw: unknown; traces: Trace }
type QuestFetchError = { ok: false; error: string; traces: Trace }
type QuestFetchResult = QuestFetchSuccess | QuestFetchError

type UserStats = { available: bigint; locked: bigint; total: bigint }
type UserStatsSuccess = { ok: true; stats: UserStats; raw: unknown; traces: Trace }
type UserStatsError = { ok: false; error: string; traces: Trace }
type UserStatsResult = UserStatsSuccess | UserStatsError

type ReferralCacheEntry = { code: string | null; at: number }

const REFERRAL_CACHE_TTL = 5 * 60 * 1000
const referralCache = new Map<string, ReferralCacheEntry>()

type FrameHandlerContext = {
  req: Request
  url: URL
  params: FrameRequest
  traces: Trace
  debugPayload?: Trace
  origin: string
  defaultFrameImage: string
  asJson: boolean
}

type FrameHandler = (ctx: FrameHandlerContext) => Promise<Response>

const FRAME_HANDLERS: Partial<Record<FrameType, FrameHandler>> = {
  leaderboards: handleLeaderboardFrame,
}

async function handleLeaderboardFrame(ctx: FrameHandlerContext): Promise<Response> {
  const { params, traces, origin, defaultFrameImage, asJson, debugPayload } = ctx

  const rawChain = typeof params.chain === 'string' ? params.chain.trim() : ''
  const rawMode = typeof params.mode === 'string' ? params.mode.trim() : ''
  const rawSeason = typeof params.season === 'string' ? params.season.trim() : ''
  const limitParam = params.limit ?? params.top ?? params.size
  const normalizedChain = rawChain ? rawChain.toLowerCase() : ''
  const isGlobal = toBooleanFlag(params.global) || ['all', 'global', 'combined'].includes(normalizedChain) || rawMode.toLowerCase() === 'global'
  const candidateChain = CHAIN_KEYS.includes(normalizedChain as ChainKey) ? (normalizedChain as ChainKey) : 'base'
  const chainKey = isGlobal && !CHAIN_KEYS.includes(normalizedChain as ChainKey) ? 'base' : candidateChain
  const chainDisplay = isGlobal ? 'All Chains' : getChainDisplayName(chainKey)
  const chainIcon = isGlobal ? null : getChainIconUrl(chainKey)
  const limit = (() => {
    const num = Number(limitParam)
    if (!Number.isFinite(num)) return 5
    return Math.max(3, Math.min(10, Math.floor(num)))
  })()

  tracePush(traces, 'leaderboard-start', { chain: rawChain || chainKey, global: isGlobal, season: rawSeason, limit })

  const query = new URLSearchParams()
  query.set('limit', String(limit))
  query.set('offset', '0')
  query.set('chain', chainKey)
  if (isGlobal) query.set('global', '1')
  if (rawSeason) query.set('season', rawSeason)

  const leaderboardUrl = `${origin}/api/leaderboard?${query.toString()}`
  let leaderboardPayload: any = null
  try {
    const lbRes = await fetch(leaderboardUrl, { headers: { 'cache-control': 'no-store' } })
    if (lbRes.ok) {
      leaderboardPayload = await lbRes.json().catch(() => null)
      tracePush(traces, 'leaderboard-fetch-ok', {
        status: lbRes.status,
        total: leaderboardPayload?.total ?? null,
        entryCount: Array.isArray(leaderboardPayload?.top) ? leaderboardPayload.top.length : null,
      })
    } else {
      tracePush(traces, 'leaderboard-fetch-failed', { status: lbRes.status })
    }
  } catch (error: any) {
    tracePush(traces, 'leaderboard-fetch-error', String(error?.message || error))
  }

  type FrameLeaderboardEntry = {
    rank: number
    address: `0x${string}`
    name: string
    pfpUrl: string
    chain: ChainKey
    points: number
    completed: number
    rewards: number
    farcasterFid: number
  }

  const topEntries: FrameLeaderboardEntry[] = Array.isArray(leaderboardPayload?.top)
    ? (leaderboardPayload.top as any[]).map((entry, index) => {
        const rankNumber = Number(entry?.rank ?? index + 1)
        const addressRaw = typeof entry?.address === 'string' ? entry.address : ''
        const address = (addressRaw.startsWith('0x') ? addressRaw : '0x0000000000000000000000000000000000000000') as `0x${string}`
        const name = typeof entry?.name === 'string' ? entry.name : ''
        const chainValue = typeof entry?.chain === 'string' ? entry.chain.toLowerCase() : chainKey
        const chainResolved = CHAIN_KEYS.includes(chainValue as ChainKey) ? (chainValue as ChainKey) : chainKey
        const pointsNumber = Number(entry?.points ?? 0)
        const completedNumber = Number(entry?.completed ?? 0)
        const rewardsNumber = Number(entry?.rewards ?? Math.floor(pointsNumber / 20))
        const fidNumber = Number(entry?.farcasterFid ?? entry?.farcaster_fid ?? 0)
        const pfpUrl = typeof entry?.pfpUrl === 'string' ? entry.pfpUrl : typeof entry?.pfp_url === 'string' ? entry.pfp_url : ''
        return {
          rank: Number.isFinite(rankNumber) && rankNumber > 0 ? rankNumber : index + 1,
          address,
          name,
          chain: chainResolved,
          points: Number.isFinite(pointsNumber) ? pointsNumber : 0,
          completed: Number.isFinite(completedNumber) && completedNumber > 0 ? completedNumber : 0,
          rewards: Number.isFinite(rewardsNumber) && rewardsNumber >= 0 ? rewardsNumber : 0,
          farcasterFid: Number.isFinite(fidNumber) && fidNumber > 0 ? fidNumber : 0,
          pfpUrl: typeof pfpUrl === 'string' ? pfpUrl.trim() : '',
        }
      })
    : []

  const displayEntries = topEntries.slice(0, Math.min(limit, topEntries.length))
  const totalPointsEarned = topEntries.reduce((sum, entry) => sum + (Number.isFinite(entry.points) ? entry.points : 0), 0)
  const totalQuestsCompleted = topEntries.reduce((sum, entry) => sum + (Number.isFinite(entry.completed) ? entry.completed : 0), 0)
  const totalPilotsRaw = Number(leaderboardPayload?.total ?? topEntries.length)
  const totalPilots = Number.isFinite(totalPilotsRaw) && totalPilotsRaw > 0 ? totalPilotsRaw : topEntries.length
  const updatedAtMs = (() => {
    const num = Number(leaderboardPayload?.updatedAt ?? Date.now())
    return Number.isFinite(num) && num > 0 ? num : Date.now()
  })()
  const updatedIso = new Date(updatedAtMs).toISOString()
  const updatedHuman = Number.isNaN(new Date(updatedAtMs).getTime())
    ? ''
    : updatedIso.replace('T', ' ').replace(/\.\d+Z$/, ' UTC')
  const seasonSupportedFlag = leaderboardPayload?.seasonSupported
  const seasonLabel = rawSeason
    ? rawSeason === 'current'
      ? 'Current season'
      : `Season ${rawSeason}`
    : seasonSupportedFlag === false
      ? ''
      : 'All seasons'

  const formatPilotName = (entry: FrameLeaderboardEntry) => {
    const trimmed = entry.name.trim()
    if (trimmed) return trimmed
    return shortenHex(entry.address)
  }

  const avgXpPerQuest = totalQuestsCompleted > 0 ? totalPointsEarned / totalQuestsCompleted : 0
  const avgXpString = avgXpPerQuest > 0 ? `${formatInteger(Math.round(avgXpPerQuest)) ?? Math.round(avgXpPerQuest)} XP / quest` : null

  const leaderNarrative = displayEntries.length
    ? (() => {
        const leader = displayEntries[0]
        const leaderName = formatPilotName(leader)
        const xpText = `${formatInteger(leader.points) ?? leader.points} XP`
        const questText = leader.completed > 0 ? `${formatInteger(leader.completed) ?? leader.completed} ${leader.completed === 1 ? 'quest' : 'quests'}` : 'fresh run'
        const chainText = isGlobal ? ` on ${getChainDisplayName(leader.chain)}` : ''
        return `${leaderName} holds #${leader.rank} with ${xpText} from ${questText}${chainText}.`
      })()
    : `Roster is open — first pilot to GM here locks the #1 badge.`

  const squadNarrative = totalPilots > 1
    ? `${formatInteger(totalPilots) ?? totalPilots} pilots active, ${formatInteger(totalQuestsCompleted) ?? totalQuestsCompleted} quest clears.`
    : totalPilots === 1
      ? `Solo sortie in progress — time to challenge the lead.`
      : `No pilots logged yet. Rally your crew.`

  const xpNarrative = totalPointsEarned > 0
    ? `${formatInteger(totalPointsEarned) ?? totalPointsEarned} XP banked${avgXpString ? ` (${avgXpString})` : ''}.`
    : `XP vault waiting for first deposit.`

  const seasonNarrative = seasonLabel ? `${seasonLabel}.` : ''
  const syncNarrative = updatedHuman ? `Synced ${updatedHuman}.` : ''

  const descriptionSegments = [leaderNarrative, xpNarrative, squadNarrative, seasonNarrative, isGlobal ? 'All chains combined.' : `${chainDisplay} leaderboard.`, syncNarrative, '— @gmeowbased']
  const description = descriptionSegments
    .map(segment => segment?.trim())
    .filter(Boolean)
    .join(' ')

  const topEntry = displayEntries[0]
  const badgeLabel = topEntry
    ? `#${topEntry.rank} ${formatPilotName(topEntry)}`
    : isGlobal
      ? 'Global Command Roster'
      : `${chainDisplay} Command Roster`
  const heroBadge: { label: string; tone: 'violet' | 'blue'; icon: string } = {
    label: badgeLabel,
    tone: isGlobal ? 'violet' : 'blue',
    icon: topEntry ? '🏆' : isGlobal ? '🌐' : '🛰️',
  }

  const referralCode = topEntry ? await fetchReferralCodeForUser(topEntry.chain, topEntry.address) : null
  const referralIdentifier = topEntry ? (referralCode && referralCode.length ? referralCode : topEntry.address) : null

  const heroStatsData: Array<{ label: string; value: string; accent?: boolean }> = []
  const squadValue = totalPilots > 1 ? `${formatInteger(totalPilots) ?? totalPilots} Pilots` : totalPilots === 1 ? 'Solo Run' : 'Empty Deck'
  heroStatsData.push({ label: 'Squad', value: squadValue, accent: true })
  heroStatsData.push({ label: 'XP Banked', value: totalPointsEarned > 0 ? `${formatInteger(totalPointsEarned) ?? totalPointsEarned} XP` : 'Awaiting XP' })
  heroStatsData.push({ label: 'Quest Clears', value: totalQuestsCompleted > 0 ? `${formatInteger(totalQuestsCompleted) ?? totalQuestsCompleted}` : '—' })
  if (avgXpString) {
    heroStatsData.push({ label: 'Efficiency', value: avgXpString })
  }
  if (seasonLabel) {
    heroStatsData.push({ label: 'Season', value: seasonLabel })
  }
  if (updatedHuman) {
    const updatedShort = (() => {
      try {
        const iso = new Date(updatedAtMs)
        const time = iso.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false })
        const date = iso.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        return `${date} · ${time} UTC`
      } catch {
        return updatedHuman
      }
    })()
    heroStatsData.push({ label: 'Synced', value: updatedShort })
  }

  const heroListItems: Array<{ icon?: string; primary: string; secondary?: string }> = []
  displayEntries.slice(0, 3).forEach((entry, index) => {
    const icon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👾'
    const primary = `#${entry.rank} ${formatPilotName(entry)} · ${formatInteger(entry.points) ?? entry.points} XP`
    const secondarySegments: string[] = []
    if (entry.completed > 0) secondarySegments.push(`${formatInteger(entry.completed) ?? entry.completed} quests`)
    if (isGlobal) secondarySegments.push(getChainDisplayName(entry.chain))
    if (entry.rewards > 0) secondarySegments.push(`${formatInteger(entry.rewards) ?? entry.rewards} drops`)
    heroListItems.push({
      icon,
      primary,
      secondary: secondarySegments.join(' · ') || undefined,
    })
  })

  if (referralIdentifier && topEntry) {
    const referralTag = referralCode ? `@${referralCode}` : shortenHex(topEntry.address)
    heroListItems.unshift({
      icon: '🎟️',
      primary: `Join ${referralTag}'s crew`,
      secondary: referralCode
        ? 'Use their referral to earn bonus multipliers.'
        : 'No code yet — enlist and mint your invite.',
    })
  }

  if (heroListItems.length === 0) {
    heroListItems.push({
      icon: '🚀',
      primary: 'No pilots logged yet',
      secondary: 'Claim the first command slot and mint the leaderboard.',
    })
  }

  const trimmedTopName = topEntry?.name?.trim() ?? ''
  const topUsername = trimmedTopName.startsWith('@') ? trimmedTopName.replace(/^@+/, '') : ''
  const topDisplayName = trimmedTopName && !trimmedTopName.startsWith('@') ? trimmedTopName : ''
  const resolvedProfile: OverlayProfile | null = topEntry
    ? {
        username: topUsername || null,
        displayName: topDisplayName || null,
        pfpUrl: topEntry.pfpUrl || null,
      }
    : null

  if (resolvedProfile && resolvedProfile.displayName && resolvedProfile.username && resolvedProfile.displayName.toLowerCase() === resolvedProfile.username.toLowerCase()) {
    resolvedProfile.displayName = null
  }

  const title = `Command Roster — ${chainDisplay}`
  const hrefUrl = new URL('/leaderboard', origin)
  if (!isGlobal) hrefUrl.searchParams.set('chain', chainKey)
  if (isGlobal) hrefUrl.searchParams.set('global', '1')
  if (rawSeason) hrefUrl.searchParams.set('season', rawSeason)
  const href = hrefUrl.toString()

  const fcMeta: Record<string, string> = {
    [frameKey('entity')]: 'leaderboard',
    [frameKey('chain')]: isGlobal ? 'all' : chainKey,
    [frameKey('chain_name')]: chainDisplay,
    [frameKey('leaderboard', 'mode')]: isGlobal ? 'global' : 'chain',
    [frameKey('leaderboard', 'total')]: String(totalPilots),
    [frameKey('leaderboard', 'updated_at')]: updatedIso,
  }
  if (chainIcon) fcMeta[frameKey('chain_icon')] = chainIcon
  if (seasonLabel) fcMeta[frameKey('leaderboard', 'season')] = seasonLabel
  if (rawSeason) fcMeta[frameKey('leaderboard', 'season_key')] = rawSeason
  if (seasonSupportedFlag === false) fcMeta[frameKey('leaderboard', 'season_supported')] = 'false'
  if (leaderboardPayload?.profileSupported === false) fcMeta[frameKey('leaderboard', 'profile_supported')] = 'false'
  if (topEntry) {
    fcMeta[frameKey('leaderboard', 'leader_address')] = topEntry.address
    if (topEntry.farcasterFid > 0) fcMeta[frameKey('leaderboard', 'leader_fid')] = String(topEntry.farcasterFid)
  }
  if (referralCode) {
    fcMeta[frameKey('leaderboard', 'referral_code')] = referralCode
  }
  displayEntries.forEach((entry, idx) => {
    const slot = idx + 1
    const displayName = formatPilotName(entry)
    const slotKey = String(slot)
    fcMeta[frameKey('leaderboard', slotKey, 'rank')] = String(entry.rank)
    fcMeta[frameKey('leaderboard', slotKey, 'name')] = displayName
    fcMeta[frameKey('leaderboard', slotKey, 'points')] = String(entry.points)
    if (entry.completed > 0) fcMeta[frameKey('leaderboard', slotKey, 'completed')] = String(entry.completed)
    fcMeta[frameKey('leaderboard', slotKey, 'chain')] = entry.chain
    if (entry.farcasterFid > 0) fcMeta[frameKey('leaderboard', slotKey, 'fid')] = String(entry.farcasterFid)
    fcMeta[frameKey('leaderboard', slotKey, 'address')] = entry.address
    if (entry.pfpUrl) fcMeta[frameKey('leaderboard', slotKey, 'pfp')] = entry.pfpUrl
  })

  const jsonPayload = {
    ok: Boolean(leaderboardPayload?.ok),
    type: 'leaderboards' as const,
    chain: isGlobal ? 'all' : chainKey,
    chainName: chainDisplay,
    global: isGlobal,
    season: rawSeason || null,
    seasonLabel,
    limit,
    total: totalPilots,
    updatedAt: updatedAtMs,
    descriptionSegments,
    entries: displayEntries,
    href,
    traces,
  }

  if (asJson) return respondJson(jsonPayload)

  // DEPRECATED: Interactive POST buttons no longer supported (removed Phase 1E)
  const leaderboardButtons: FrameButton[] = [
    { label: 'Open Leaderboard', target: href, action: 'link' },
  ]

  const html = buildFrameHtml({
    title,
    description,
    image: defaultFrameImage,
    url: href,
    buttons: leaderboardButtons,
    fcMeta,
    debug: debugPayload,
    profile: resolvedProfile,
    kicker: chainDisplay,
    chainIcon,
    chainLabel: chainDisplay,
    heroBadge,
    heroStats: heroStatsData,
    heroList: heroListItems,
    chainKey: isGlobal ? 'all' : chainKey,
    frameOrigin: origin,
    frameVersion: FRAME_VERSION,
    frameType: 'leaderboards',
  })
  return createHtmlResponse(html)
}

// -------------------- Utilities --------------------
const nowTs = () => Date.now()

function tracePush(traces: Trace, step: string, info?: any) {
  traces.push({ ts: nowTs(), step, info })
  return traces
}

/**
 * Choose RPC url for given chain key (fall back to DEFAULT_RPCS)
 */
function getRpcForChain(chainKey?: string) {
  if (!chainKey) return DEFAULT_RPCS.base
  // try gm utils addresses mapping
  const key = String(chainKey)
  if (DEFAULT_RPCS[key]) return DEFAULT_RPCS[key]
  return DEFAULT_RPCS.base
}

/**
 * Normalize Accept header or query param to determine JSON response.
 */
function wantsJson(req: Request, url: URL) {
  if (url.searchParams.get('json') === '1') return true
  const accept = req.headers.get('accept') || ''
  return accept.includes('application/json')
}

function toBooleanFlag(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized === '1' || normalized === 'true' || normalized === 'yes'
  }
  return false
}

// DEPRECATED Phase 1E: toAbsoluteUrl no longer used (POST button params removed)
/* function toAbsoluteUrl(raw: string | null | undefined, origin: string): string | null {
  if (!raw) return null
  try {
    return new URL(raw, origin).toString()
  } catch {
    return null
  }
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}
*/

/**
 * Basic HTML escape
 */
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m))
}

function resolveRequestOrigin(req: Request, url: URL) {
  const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const forwardedHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  if (forwardedProto && forwardedHost) return `${forwardedProto}://${forwardedHost}`

  const host = req.headers.get('host')?.split(',')[0]?.trim()
  if (host) {
    const protocol = url.protocol.replace(/:$/, '') || 'https'
    return `${protocol}://${host}`
  }

  return url.origin
}

const integerFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

function formatBigInt(value: bigint) {
  const sign = value < 0n ? '-' : ''
  const digits = (value < 0n ? -value : value).toString()
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function formatInteger(value: number | bigint | string | null | undefined) {
  if (value === null || value === undefined) return null
  if (typeof value === 'bigint') return formatBigInt(value)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const parsed = Number(trimmed)
    if (Number.isFinite(parsed)) return integerFormatter.format(Math.round(parsed))
    return trimmed
  }
  if (!Number.isFinite(value)) return null
  return integerFormatter.format(Math.round(value))
}

function formatUtcDate(seconds?: number | null) {
  if (!seconds || Number.isNaN(seconds)) return null
  if (seconds <= 0) return null
  const date = new Date(seconds * 1000)
  if (Number.isNaN(date.getTime())) return null
  return date.toUTCString().replace('GMT', 'UTC')
}

function getChainDisplayName(chainKey?: string | null) {
  if (!chainKey) return 'Base'
  const lower = chainKey.toLowerCase()
  if (lower === 'all') return 'All Chains'
  const label = (CHAIN_LABEL as Record<string, string>)[lower]
  if (label) return label
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function shortenHex(value: string, size = 4) {
  if (!value) return ''
  const trimmed = value.trim()
  if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) return trimmed
  return `${trimmed.slice(0, 2 + size)}…${trimmed.slice(-size)}`
}

function toJsonSafe<T>(value: T): any {
  if (typeof value === 'bigint') return value.toString()
  if (Array.isArray(value)) return value.map((item) => toJsonSafe(item))
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {}
    for (const [key, val] of Object.entries(value as Record<string, any>)) {
      out[key] = toJsonSafe(val)
    }
    return out
  }
  return value
}

function respondJson(data: any, init?: ResponseInit) {
  const headers = new Headers(init?.headers)
  headers.set('access-control-allow-origin', '*')
  headers.set('access-control-allow-methods', 'GET, POST, OPTIONS')
  headers.set('access-control-allow-headers', 'Content-Type, Authorization, X-Requested-With')
  return NextResponse.json(toJsonSafe(data), { ...init, headers })
}

function createHtmlResponse(html: string, init?: { status?: number; headers?: Record<string, string | undefined> }) {
  const headers = new Headers(DEFAULT_HTML_HEADERS)
  const extraHeaders = init?.headers || {}
  for (const [key, value] of Object.entries(extraHeaders)) {
    if (value === undefined) continue
    headers.set(key, value)
  }
  const status = init?.status
  return new NextResponse(html, { status, headers })
}

/* ---------------- NEYNAR helpers (light fallback version)
   If you already have a full neynar helper module, feel free to replace these.
   We'll use neynar endpoints minimally (cast and user interactions).
*/
async function neynarFetchRaw(url: string, apiKey?: string) {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (apiKey) headers['x-api-key'] = apiKey
  const res = await fetch(url, { method: 'GET', headers })
  const raw = await res.text().catch(() => '')
  let parsed: any = null
  try { parsed = raw ? JSON.parse(raw) : null } catch { parsed = raw }
  return { ok: res.ok, status: res.status, parsed, raw, url }
}

type NeynarProfileResolved = { profile: OverlayProfile | null; fid: number | null }

function mapNeynarUserToOverlay(raw: any): NeynarProfileResolved {
  if (!raw || typeof raw !== 'object') return { profile: null, fid: null }
  const fromResult = (raw.result && typeof raw.result === 'object') ? raw.result : null
  const candidate = fromResult?.user || raw.user || raw
  if (!candidate || typeof candidate !== 'object') return { profile: null, fid: null }
  const username = typeof candidate.username === 'string' && candidate.username.trim()
    ? candidate.username.trim()
    : null
  const displayName = typeof candidate.displayName === 'string' && candidate.displayName.trim()
    ? candidate.displayName.trim()
    : typeof candidate.display_name === 'string' && candidate.display_name.trim()
      ? candidate.display_name.trim()
      : null
  const pictureCandidate =
    typeof candidate.pfpUrl === 'string' && candidate.pfpUrl.trim()
      ? candidate.pfpUrl.trim()
      : typeof candidate.pfp_url === 'string' && candidate.pfp_url.trim()
        ? candidate.pfp_url.trim()
        : typeof candidate.profile?.picture_url === 'string' && candidate.profile.picture_url.trim()
          ? candidate.profile.picture_url.trim()
          : typeof candidate.pfp?.url === 'string' && candidate.pfp.url.trim()
            ? candidate.pfp.url.trim()
            : null
  const pfpUrl = pictureCandidate && /^https?:\/\//i.test(pictureCandidate) ? pictureCandidate : null
  const fidRaw = candidate.fid ?? candidate.profile?.fid ?? fromResult?.fid
  const fid = Number(fidRaw)
  const normalizedFid = Number.isFinite(fid) && fid > 0 ? fid : null
  const overlay: OverlayProfile | null = username || displayName || pfpUrl
    ? { username, displayName, pfpUrl }
    : null
  return { profile: overlay, fid: normalizedFid }
}

async function fallbackResolveNeynarProfile(options: { address?: string; fid?: number | null; username?: string | null }): Promise<NeynarProfileResolved> {
  const { address, fid, username } = options
  try {
    if (address) {
      const addr = address.toLowerCase()
      const url = `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${encodeURIComponent(addr)}&address_types=custody_address,verified_address`
      const res = await neynarFetchRaw(url, NEYNAR_API_KEY)
      const parsed = (res.parsed as Record<string, any[]>) || {}
      const entry = parsed[addr] || parsed[address] || []
      if (Array.isArray(entry) && entry.length) {
        const mapped = mapNeynarUserToOverlay(entry[0])
        if (mapped.profile || mapped.fid) return mapped
      }
    }
    if (fid && fid > 0) {
      const url = `https://api.neynar.com/v2/farcaster/user/bulk?fids=${encodeURIComponent(String(fid))}`
      const res = await neynarFetchRaw(url, NEYNAR_API_KEY)
      const users = Array.isArray((res.parsed as any)?.users) ? (res.parsed as any).users : []
      if (users.length) {
        const mapped = mapNeynarUserToOverlay(users[0])
        if (mapped.profile || mapped.fid) return mapped
      }
    }
    if (username) {
      const cleaned = username.replace(/^@+/, '').trim().toLowerCase()
      if (cleaned) {
        const url = `https://api.neynar.com/v2/farcaster/user/by-username?username=${encodeURIComponent(cleaned)}`
        const res = await neynarFetchRaw(url, NEYNAR_API_KEY)
        const mapped = mapNeynarUserToOverlay(res.parsed)
        if (mapped.profile || mapped.fid) return mapped
      }
    }
  } catch (err) {
    const message = (err as Error)?.message || String(err)
    console.warn('neynar fallback lookup failed:', message)
  }
  return { profile: null, fid: null }
}

/**
 * Fetch quest data from chain using gm-utils' createGetQuestCall wrapper.
 * This expects the gm-utils call object to be an argument for read contract.
 */
async function fetchQuestOnChain(
  questId: number | string,
  chainKey: string = 'base',
  traces: Trace = [],
): Promise<QuestFetchResult> {
  tracePush(traces, 'fetchQuestOnChain-start', { questId, chain: chainKey })
  try {
    const rpc = getRpcForChain(chainKey)
    const client = createPublicClient({ transport: http(rpc) })
    // Try to use getQuest call builder if present
    try {
      // gm.createGetQuestCall returns { address, abi, functionName, args }
      // We will call client.readContract
      const call = createGetQuestCall(Number(questId), chainKey as any)
      const res = await client.readContract({
        address: call.address as Address,
        abi: call.abi,
        functionName: call.functionName as any,
        args: call.args as any,
      })
      tracePush(traces, 'fetchQuestOnChain-readContract-ok')
      const normalized = normalizeQuestStruct(res)
      tracePush(traces, 'fetchQuestOnChain-normalized', normalized)
      const success: QuestFetchSuccess = { ok: true, quest: normalized, raw: res, traces }
      return success
    } catch (inner) {
      tracePush(traces, 'fetchQuestOnChain-readContract-failed', String(inner))
      // fallback: try directly calling contract via ABI getQuest name
      const client2 = createPublicClient({ transport: http(rpc) })
      const address = CONTRACT_ADDRESSES[chainKey as keyof typeof CONTRACT_ADDRESSES] || CONTRACT_ADDRESSES.base
      const res2 = await client2.readContract({ address, abi: GM_CONTRACT_ABI as any, functionName: 'getQuest', args: [BigInt(questId)] })
      const normalized2 = normalizeQuestStruct(res2)
      tracePush(traces, 'fetchQuestOnChain-fallback-ok', normalized2)
      const success: QuestFetchSuccess = { ok: true, quest: normalized2, raw: res2, traces }
      return success
    }
  } catch (e: any) {
    tracePush(traces, 'fetchQuestOnChain-error', String(e?.message || e))
    const failure: QuestFetchError = { ok: false, error: String(e?.message || e), traces }
    return failure
  }
}

/**
 * Fetch user stats (points) from contract
 */
async function fetchUserStatsOnChain(
  userAddr: string,
  chainKey: string = 'base',
  traces: Trace = [],
): Promise<UserStatsResult> {
  tracePush(traces, 'fetchUserStats-start', { user: userAddr, chain: chainKey })
  try {
    const rpc = getRpcForChain(chainKey)
    const client = createPublicClient({ transport: http(rpc) })
    const call = createGetUserStatsCall(userAddr as Address, chainKey as any)
    const res = await client.readContract({
      address: call.address as Address,
      abi: call.abi,
      functionName: call.functionName as any,
      args: call.args as any,
    })
    tracePush(traces, 'fetchUserStats-ok', res)
    // adapt to a simple shape:
    const available = BigInt((res as any)?.[0] ?? 0)
    const locked = BigInt((res as any)?.[1] ?? 0)
    const total = BigInt((res as any)?.[2] ?? 0)
    const success: UserStatsSuccess = { ok: true, stats: { available, locked, total }, raw: res, traces }
    return success
  } catch (e: any) {
    tracePush(traces, 'fetchUserStats-error', String(e?.message || e))
    const failure: UserStatsError = { ok: false, error: String(e?.message || e), traces }
    return failure
  }
}

async function fetchReferralCodeForUser(chainKey: ChainKey, userAddr: `0x${string}`): Promise<string | null> {
  const cacheKey = `${chainKey}:${userAddr.toLowerCase()}`
  const cached = referralCache.get(cacheKey)
  const now = Date.now()
  if (cached && now - cached.at < REFERRAL_CACHE_TTL) {
    return cached.code
  }

  try {
    const rpc = getRpcForChain(chainKey)
    const client = createPublicClient({ transport: http(rpc) })
    const contract = (CONTRACT_ADDRESSES[chainKey] ?? CONTRACT_ADDRESSES.base) as Address
    const code = await client
      .readContract({ address: contract, abi: GM_CONTRACT_ABI, functionName: 'referralCodeOf', args: [userAddr] })
      .catch(() => '')
    const normalized = typeof code === 'string' ? code.trim() : ''
    const payload = normalized.length ? normalized : null
    referralCache.set(cacheKey, { code: payload, at: now })
    return payload
  } catch {
    referralCache.set(cacheKey, { code: null, at: now })
    return null
  }
}

/* -------------------- HTML builders -------------------- */
type FrameButton = {
  label: string
  target?: string
  action?: 'link' | 'post' | 'post_redirect'
}

// DEPRECATED Phase 1E: Button plan types no longer used (POST buttons removed)
/* type QuestButtonPlan = {
  completed?: boolean
  verifyUrl?: string | null
  verifyLabel?: string | null
  claimUrl?: string | null
  claimLabel?: string | null
  detailUrl?: string | null
  detailLabel?: string | null
  flexUrl?: string | null
  flexLabel?: string | null
  shareUrl?: string | null
  shareLabel?: string | null
  mintUrl?: string | null
  mintLabel?: string | null
}

type GuildButtonPlan = {
  isMember?: boolean
  joinUrl?: string | null
  joinLabel?: string | null
  hubUrl?: string | null
  hubLabel?: string | null
  leaderboardUrl?: string | null
  leaderboardLabel?: string | null
  mintUrl?: string | null
  mintLabel?: string | null
}

type ReferralButtonPlan = {
  shareUrl?: string | null
  shareLabel?: string | null
  copyUrl?: string | null
  copyLabel?: string | null
  hubUrl?: string | null
  hubLabel?: string | null
}

type PointsButtonPlan = {
  mergeUrl?: string | null
  mergeLabel?: string | null
  openUrl?: string | null
  openLabel?: string | null
  leaderboardUrl?: string | null
  leaderboardLabel?: string | null
}

type LeaderboardButtonPlan = {
  openUrl?: string | null
  openLabel?: string | null
  referralUrl?: string | null
  referralLabel?: string | null
  challengeUrl?: string | null
  challengeLabel?: string | null
  mintUrl?: string | null
  mintLabel?: string | null
}
*/

// DEPRECATED Phase 1E: ContextualButtonPlan no longer used (POST buttons removed)
/* type ContextualButtonPlan = {
  type: FrameType
  fallback: FrameButton[]
  quest?: QuestButtonPlan
  guild?: GuildButtonPlan
  referral?: ReferralButtonPlan
  points?: PointsButtonPlan
  leaderboard?: LeaderboardButtonPlan
}
*/

// DEPRECATED Phase 1E: buildContextualButtons no longer used (POST buttons removed)
/* function buildContextualButtons(plan: ContextualButtonPlan): FrameButton[] {
  const { type, fallback } = plan
  const deduped: FrameButton[] = []
  const push = (btn: FrameButton | null | undefined) => {
    if (!btn) return
    if (!btn.target || !btn.label) return
    const exists = deduped.some((existing) => existing.label === btn.label && existing.target === btn.target && existing.action === (btn.action ?? 'link'))
    if (!exists) deduped.push(btn)
  }

  if (type === 'quest' && plan.quest) {
    const {
      completed,
      verifyUrl,
      verifyLabel,
      claimUrl,
      claimLabel,
      detailUrl,
      detailLabel,
      flexUrl,
      flexLabel,
      shareUrl,
      shareLabel,
      mintUrl,
      mintLabel,
    } = plan.quest
    if (completed) {
      push(mintUrl ? { label: mintLabel || '🎴 Mint Achievement', target: mintUrl } : null)
      push(flexUrl ? { label: flexLabel || 'Share Your Flex', target: flexUrl } : null)
      push(shareUrl ? { label: shareLabel || 'Share to Warpcast', target: shareUrl } : null)
      push(detailUrl ? { label: detailLabel || 'View Quest Briefing', target: detailUrl } : null)
    } else {
      push(verifyUrl ? { label: verifyLabel || 'Verify & Claim', target: verifyUrl } : null)
      push(claimUrl ? { label: claimLabel || 'Claim Reward', target: claimUrl } : null)
      push(detailUrl ? { label: detailLabel || 'View Mission Briefing', target: detailUrl } : null)
    }
  } else if (type === 'guild' && plan.guild) {
    const { isMember, joinUrl, joinLabel, hubUrl, hubLabel, leaderboardUrl, leaderboardLabel, mintUrl, mintLabel } = plan.guild
    if (isMember) {
      push(mintUrl ? { label: mintLabel || '🎴 Mint Badge', target: mintUrl } : null)
      push(hubUrl ? { label: hubLabel || 'Open Guild HQ', target: hubUrl } : null)
      push(leaderboardUrl ? { label: leaderboardLabel || 'View Leaderboard', target: leaderboardUrl } : null)
    } else {
      push(joinUrl ? { label: joinLabel || 'Join Guild', target: joinUrl } : null)
      push(hubUrl ? { label: hubLabel || 'View Guild Roster', target: hubUrl } : null)
    }
  } else if (type === 'referral' && plan.referral) {
    const { shareUrl, shareLabel, copyUrl, copyLabel, hubUrl, hubLabel } = plan.referral
    push(shareUrl ? { label: shareLabel || 'Share Referral', target: shareUrl } : null)
    push(copyUrl ? { label: copyLabel || 'Copy Referral', target: copyUrl } : null)
    push(hubUrl ? { label: hubLabel || 'Open Referral Hub', target: hubUrl } : null)
  } else if (type === 'points' && plan.points) {
    const { mergeUrl, mergeLabel, openUrl, openLabel, leaderboardUrl, leaderboardLabel } = plan.points
    push(mergeUrl ? { label: mergeLabel || 'Merge Points', target: mergeUrl } : null)
    push(openUrl ? { label: openLabel || 'Open Points HQ', target: openUrl } : null)
    push(leaderboardUrl ? { label: leaderboardLabel || 'View Leaderboard', target: leaderboardUrl } : null)
  } else if (type === 'leaderboards' && plan.leaderboard) {
    const { openUrl, openLabel, referralUrl, referralLabel, challengeUrl, challengeLabel, mintUrl, mintLabel } = plan.leaderboard
    push(mintUrl ? { label: mintLabel || '🎴 Mint Rank Card', target: mintUrl } : null)
    push(openUrl ? { label: openLabel || 'Open Leaderboard', target: openUrl } : null)
    push(challengeUrl ? { label: challengeLabel || 'Challenge The Lead', target: challengeUrl } : null)
    push(referralUrl ? { label: referralLabel || 'Join Crew', target: referralUrl } : null)
  }

  return deduped.length ? deduped : fallback
}
*/

export interface OverlayProfile {
  username: string | null
  displayName: string | null
  pfpUrl: string | null
}

/**
 * Generate rich compose text for frame sharing based on frame type
 * Used in fc:frame:text meta tag for pre-filled cast composer
 */
function getComposeText(frameType?: string, context?: { title?: string; chain?: string; username?: string; streak?: number; gmCount?: number }): string {
  const { title, chain, username, streak, gmCount } = context || {}
  
  switch (frameType) {
    case 'gm':
      // Phase 1D: Dynamic compose text with streak bragging
      if (streak && streak >= 30) {
        return `🔥 ${streak}-day GM streak! Legendary dedication! Join the meow squad @gmeowbased`
      } else if (streak && streak >= 7) {
        return `⚡ ${streak}-day GM streak! Hot streak! Stack your daily ritual @gmeowbased`
      } else if (gmCount && gmCount > 0) {
        return `🌅 Just stacked my daily GM ritual! ${gmCount} total GMs! Join @gmeowbased`
      }
      return '🌅 Just stacked my daily GM ritual! Join the meow squad @gmeowbased'
    case 'quest':
      return `⚔️ New quest unlocked${chain ? ` on ${chain}` : ''}! ${title || 'Check it out'} @gmeowbased`
    case 'leaderboards':
      return `🏆 Climbing the ranks${chain ? ` on ${chain}` : ''}! Check the leaderboard @gmeowbased`
    case 'badge':
      return `🎖️ New badge earned${username ? ` by @${username}` : ''}! View the collection @gmeowbased`
    case 'guild':
      return '🛡️ Guild quests are live! Rally your squad @gmeowbased'
    case 'referral':
      return '🎁 Join me on gmeowbased! Share quests, earn rewards together @gmeowbased'
    case 'points':
      return `💰 Check out ${username ? `@${username}'s` : 'my'} gmeowbased Points balance @gmeowbased`
    case 'onchainstats':
      return `📊 Flexing onchain stats${chain ? ` on ${chain}` : ''}! View my profile @gmeowbased`
    case 'verify':
      return '✅ Verify your quests and unlock rewards @gmeowbased'
    default:
      return '🎮 Explore quests, guilds, and onchain adventures @gmeowbased'
  }
}

function buildFrameHtml(params: {
  title: string
  description: string
  image?: string
  url?: string
  buttons?: FrameButton[]
  fcMeta?: Record<string, string> | null
  debug?: any
  profile?: OverlayProfile | null
  kicker?: string | null
  chainIcon?: string | null
  chainLabel?: string | null
  chainKey?: string | null
  frameOrigin?: string | null
  frameVersion?: string | null
  hideOverlay?: boolean
  heroBadge?: { label: string; tone?: 'emerald' | 'violet' | 'gold' | 'blue' | 'pink'; icon?: string } | null
  heroStats?: Array<{ label: string; value: string; accent?: boolean }>
  heroList?: Array<{ primary: string; secondary?: string; icon?: string }>
  defaultFrameImage?: string | null
  frameType?: string // ! frame type (quest, guild, leaderboards, etc.)
  streak?: number // Phase 1D: For GM frame compose text
  gmCount?: number // Phase 1D: For GM frame compose text
}) {
  const {
    title,
    description,
    image,
    url,
    buttons = [],
    // fcMeta: _fcMeta, // No longer used with JSON frame format
    debug, // eslint-disable-line @typescript-eslint/no-unused-vars
    profile,
    kicker,
    chainIcon,
    chainLabel,
    frameOrigin,
    // frameVersion: _frameVersion, // No longer used with JSON frame format
    hideOverlay,
    heroBadge,
    heroStats = [],
    heroList = [],
    frameType, // Yu-Gi-Oh! frame type
    streak, // Phase 1D: For GM frame compose text
    gmCount, // Phase 1D: For GM frame compose text
  } = params
  const pageTitle = escapeHtml(title)
  const rawDescription = description || ''
  const desc = escapeHtml(rawDescription)
  const urlEsc = escapeHtml(url || '')
  // CRITICAL: Farcaster requires fc:frame:image tag with 3:2 aspect ratio
  // Use frame-image.png (1200x800) for correct frame spec, not og-image.png (1200x630)
  const resolvedImage = image || (frameOrigin ? `${frameOrigin}/frame-image.png` : '')
  const imageEsc = resolvedImage ? escapeHtml(resolvedImage) : ''
  const overlayHidden = Boolean(hideOverlay) // eslint-disable-line @typescript-eslint/no-unused-vars
  const descriptionSegments = rawDescription
    .split(' • ')
    .map((segment) => segment.trim())
    .filter(Boolean)
  const primaryOverlaySegment = descriptionSegments[0] || ''
  const overlaySecondarySegments = descriptionSegments.slice(1)
  const overlayPrimaryHtml = primaryOverlaySegment ? escapeHtml(primaryOverlaySegment) : pageTitle
  const renderOverlayList = (segments: string[]) => `<ul class="overlay-list">${segments.map((segment) => `<li>${escapeHtml(segment)}</li>`).join('')}</ul>`
  const chunkSegments = (segments: string[], size: number) => {
    const chunks: string[][] = []
    for (let i = 0; i < segments.length; i += size) {
      chunks.push(segments.slice(i, i + size))
    }
    return chunks
  }
  let overlaySecondaryHtml = ''

  // Generate compose text for frame sharing
  const composeText = getComposeText(frameType, {
    title: pageTitle,
    chain: chainLabel || undefined,
    username: profile?.username || undefined,
    streak: streak || undefined, // Phase 1D: Pass streak for GM frame
    gmCount: gmCount || undefined, // Phase 1D: Pass gmCount for GM frame
  })
  const composeTextEsc = escapeHtml(composeText)

  if (overlaySecondarySegments.length) {
    if (overlaySecondarySegments.length >= 6) {
        const chunks = chunkSegments(overlaySecondarySegments, 3)
        overlaySecondaryHtml = `<div class="overlay-list-grid overlay-list-grid-card">${chunks.map((group) => renderOverlayList(group)).join('')}</div>`
    } else {
      overlaySecondaryHtml = renderOverlayList(overlaySecondarySegments)
    }
  }
  const normalizedProfile = profile && (profile.username || profile.displayName || profile.pfpUrl)
    ? {
        username: profile.username ? String(profile.username).replace(/^@+/, '') : null,
        displayName: profile.displayName ? String(profile.displayName).trim() : null,
        pfpUrl: profile.pfpUrl ? String(profile.pfpUrl) : null,
      }
    : null
  const profileHandle = normalizedProfile?.username ? `@${normalizedProfile.username}` : ''
  const normalizedDisplay = normalizedProfile?.displayName || ''
  const handleComparable = normalizedProfile?.username ? normalizedProfile.username.toLowerCase() : ''
  const displayComparable = normalizedDisplay.replace(/^@+/, '').toLowerCase()
  const showDisplayName = Boolean(normalizedDisplay && displayComparable && displayComparable !== handleComparable)
  const profileAlt = profileHandle || normalizedDisplay || 'User avatar'
  const fallbackInitial = ((profileHandle || normalizedDisplay || pageTitle).replace(/^@/, '').trim().charAt(0) || 'G').toUpperCase()
  const chainIconClean = typeof chainIcon === 'string' && chainIcon.trim() ? chainIcon.trim() : null
  const kickerRaw = typeof kicker === 'string' && kicker.trim() ? kicker.trim() : title
  const kickerEsc = escapeHtml(kickerRaw)
  const chainLabelRaw = typeof chainLabel === 'string' && chainLabel.trim() ? chainLabel.trim() : kickerRaw
  const chainLabelEsc = escapeHtml(chainLabelRaw)
  const overlayKickerHtml = `
    <div class="overlay-kicker${chainIconClean ? ' overlay-kicker-chain' : ''}">
      ${chainIconClean ? `<img class="overlay-chain-icon" src="${escapeHtml(chainIconClean)}" alt="${chainLabelEsc} icon" />` : ''}
      <span>${kickerEsc}</span>
    </div>
  `
  const badgeHtml = heroBadge
    ? `<div class="overlay-badge overlay-badge-${heroBadge.tone || 'emerald'}">${heroBadge.icon ? `<span class="overlay-badge-icon">${escapeHtml(heroBadge.icon)}</span>` : ''}<span>${escapeHtml(heroBadge.label)}</span></div>`
    : ''
  const statsHtml = heroStats.length
    ? `<div class="overlay-metrics">${heroStats
        .map(stat => `<div class="overlay-metric${stat.accent ? ' overlay-metric-accent' : ''}"><span class="overlay-metric-label">${escapeHtml(stat.label)}</span><strong>${escapeHtml(stat.value)}</strong></div>`)
        .join('')}</div>`
    : ''
  const identityBadgeHtml = normalizedProfile ? badgeHtml : ''
  const headingBadgeHtml = normalizedProfile ? '' : badgeHtml
  const identityKickerHtml = normalizedProfile ? overlayKickerHtml : ''
  const headingKickerHtml = normalizedProfile ? '' : overlayKickerHtml
  const overlayTitleHtml = primaryOverlaySegment ? '' : `<div class="overlay-title">${overlayPrimaryHtml}</div>`
  const overlayHeadingInner = `${headingBadgeHtml}${headingKickerHtml}${overlayTitleHtml}${statsHtml}`
  const overlayProfileHtml = normalizedProfile
    ? `<div class="overlay-profile identity-card">
        <span class="identity-card-glow"></span>
        <div class="identity-card-body">
          <div class="identity-avatar-shell">
            ${normalizedProfile.pfpUrl ? `<img class="identity-avatar" src="${escapeHtml(normalizedProfile.pfpUrl)}" alt="${escapeHtml(profileAlt)}" />` : `<div class="identity-avatar identity-avatar-fallback">${escapeHtml(fallbackInitial)}</div>`}
            <span class="identity-avatar-ring"></span>
          </div>
          <div class="overlay-profile-text identity-card-text">
            ${identityBadgeHtml ? `<div class="identity-badge-wrap">${identityBadgeHtml}</div>` : ''}
            ${profileHandle ? `<div class="overlay-handle identity-handle">${escapeHtml(profileHandle)}</div>` : ''}
            ${showDisplayName ? `<div class="overlay-name identity-name">${escapeHtml(normalizedDisplay)}</div>` : ''}
            ${identityKickerHtml ? `<div class="identity-card-kicker">${identityKickerHtml}</div>` : ''}
          </div>
        </div>
      </div>`
    : ''
  const listHtml = heroList.length
    ? `<div class="overlay-hierarchy">${heroList
        .map(item => `<div class="overlay-hierarchy-item">${item.icon ? `<span class="overlay-hierarchy-icon">${escapeHtml(item.icon)}</span>` : ''}<div><div class="overlay-hierarchy-primary">${escapeHtml(item.primary)}</div>${item.secondary ? `<div class="overlay-hierarchy-secondary">${escapeHtml(item.secondary)}</div>` : ''}</div></div>`)
        .join('')}</div>`
    : ''
  const overlayTopHtml = normalizedProfile // eslint-disable-line @typescript-eslint/no-unused-vars
    ? `<div class="overlay-top">${overlayProfileHtml}<div class="overlay-heading">${overlayHeadingInner}</div></div>`
    : `<div class="overlay-heading">${overlayHeadingInner}</div>`
  const overlayDetailsFallback = !primaryOverlaySegment ? `<div class="overlay-text">${desc}</div>` : ''
  const overlayDetailsHtml = overlaySecondaryHtml || overlayDetailsFallback // eslint-disable-line @typescript-eslint/no-unused-vars
  const overlayFooterHtml = listHtml // eslint-disable-line @typescript-eslint/no-unused-vars
  
  // Enforce 4-button limit per Farcaster vNext spec
  const { buttons: validatedButtons, truncated, originalCount, invalidTitles } = sanitizeButtons(buttons)
  if (truncated) {
    console.warn(`[buildFrameHtml] Button limit exceeded: ${originalCount} buttons provided, truncated to 4`)
  }
  if (invalidTitles && invalidTitles.length > 0) {
    console.warn(`[buildFrameHtml] Button title length violations:`, invalidTitles)
  }
  
  // Build Frame metadata (Farcaster vNext format)
  // Reference: https://miniapps.farcaster.xyz/docs/specification
  // VERIFIED: Based on working Farville implementation (https://farville.farm)
  // Use 'launch_frame' to launch mini app within Warpcast (not external browser)
  // Use version: 'next' (Farville production-verified, November 19, 2025)
  const primaryButton = validatedButtons[0]
  const launchUrl = primaryButton?.target || frameOrigin
  const splashUrl = frameOrigin ? `${frameOrigin}/splash.png` : undefined
  
  // Yu-Gi-Oh! Rich Frame Palette (dynamic colors based on frame type)
  const getFramePalette = (type?: string) => {
    const palettes: Record<string, { primary: string; secondary: string; background: string; accent: string; label: string }> = {
      quest: { primary: '#8e7cff', secondary: '#a78bff', background: '#0a0520', accent: '#5ad2ff', label: 'QUEST' },
      guild: { primary: '#4da3ff', secondary: '#6bb5ff', background: '#050a20', accent: '#7CFF7A', label: 'GUILD' },
      leaderboards: { primary: '#ffd700', secondary: '#ffed4e', background: '#201a05', accent: '#ff6b6b', label: 'LEADERBOARD' },
      verify: { primary: '#7CFF7A', secondary: '#9bffaa', background: '#052010', accent: '#5ad2ff', label: 'VERIFY' },
      referral: { primary: '#ff6b9d', secondary: '#ff8db4', background: '#200510', accent: '#ffd700', label: 'REFERRAL' },
      onchainstats: { primary: '#00d4ff', secondary: '#5ae4ff', background: '#051520', accent: '#ffd700', label: 'ONCHAIN' },
      points: { primary: '#ffb700', secondary: '#ffc840', background: '#201405', accent: '#8e7cff', label: 'POINTS' },
      gm: { primary: '#ff9500', secondary: '#ffab40', background: '#201005', accent: '#7CFF7A', label: 'GM' },
      badge: { primary: '#ff00ff', secondary: '#ff69ff', background: '#200520', accent: '#00d4ff', label: 'BADGE' },
    }
    return palettes[type || ''] || { primary: '#8e7cff', secondary: '#a78bff', background: '#0a0e22', accent: '#5ad2ff', label: 'FRAME' }
  }
  
  const framePalette = getFramePalette(frameType)
  
  // Generate vNext JSON frame meta tag (single tag format for validator compatibility)
  // Reference: https://docs.farcaster.xyz/reference/frames/spec
  // CRITICAL: Match Farville format - use double quotes with &quot; encoding, not single quotes
  const frameMetaTags = primaryButton && frameOrigin && resolvedImage ? `
    <meta name="fc:frame" content="${JSON.stringify({
      version: 'next',
      imageUrl: resolvedImage,
      button: {
        title: primaryButton.label,
        action: {
          type: 'launch_frame',
          name: 'Gmeowbased',
          url: launchUrl,
          splashImageUrl: splashUrl,
          splashBackgroundColor: '#000000'
        }
      }
    }).replace(/"/g, '&quot;')}" />` : ''
  
  // Phase 1B.2: Generate classic Frames v1 button meta tags for POST actions
  // Reference: https://docs.farcaster.xyz/reference/frames/v1/spec
  // Supports multiple interactive POST buttons alongside vNext launch_frame
  // CRITICAL: Use post_url to point POST actions to this frame endpoint
  const postUrl = frameOrigin ? `${frameOrigin}/api/frame` : ''
  
  // Add frame state to track frame type for POST handler button mapping (Phase 1B.2)
  const frameStateTags = frameType ? `
    <meta property="fc:frame:state" content="${escapeHtml(JSON.stringify({ frameType }))}" />
    <meta property="fc:frame:post_url" content="${escapeHtml(postUrl)}" />` : ''
  
  const classicButtonTags = validatedButtons.length && postUrl ? validatedButtons.map((btn, idx) => {
    const buttonNumber = idx + 1
    const buttonAction = btn.action || 'link' // default to 'link' if action not specified
    
    // Only generate classic tags for POST action buttons (Phase 1B.2)
    if (buttonAction === 'post' || buttonAction === 'post_redirect') {
      return `
    <meta property="fc:frame:button:${buttonNumber}" content="${escapeHtml(btn.label)}" />
    <meta property="fc:frame:button:${buttonNumber}:action" content="${buttonAction}" />`
    }
    
    // For link buttons, still generate classic tags for compatibility
    if (buttonAction === 'link' && btn.target) {
      return `
    <meta property="fc:frame:button:${buttonNumber}" content="${escapeHtml(btn.label)}" />
    <meta property="fc:frame:button:${buttonNumber}:action" content="link" />
    <meta property="fc:frame:button:${buttonNumber}:target" content="${escapeHtml(btn.target)}" />`
    }
    
    return '' // skip if no valid action
  }).join('') : ''
  
  // Yu-Gi-Oh! Rich Template (November 21, 2025)
  // Enhanced card-style structure with dynamic palette, type badges, and rich visual effects
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${pageTitle}</title>
    <meta name="description" content="${desc}" />
    ${frameMetaTags}${frameStateTags}${classicButtonTags}
    <meta property="og:title" content="${pageTitle}" />
    <meta property="og:description" content="${desc}" />
    ${imageEsc ? `<meta property="og:image" content="${imageEsc}" />` : ''}
    ${imageEsc ? `<meta property="og:image:width" content="600" />` : ''}
    ${imageEsc ? `<meta property="og:image:height" content="400" />` : ''}
    <meta property="og:url" content="${urlEsc}" />
    <meta name="fc:frame:text" content="${composeTextEsc}" />
    
    <style>
      body {
        margin: 0;
        padding: 20px;
        background: linear-gradient(135deg, ${framePalette.background}, ${framePalette.secondary}20);
        font-family: system-ui, -apple-system, sans-serif;
        color: white;
        min-height: 100vh;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 30px;
        background: rgba(0, 0, 0, 0.6);
        border-radius: 20px;
        border: 2px solid ${framePalette.primary};
        box-shadow: 0 0 40px ${framePalette.primary}40;
        position: relative;
        overflow: hidden;
      }
      .container::before {
        content: '';
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        background: linear-gradient(135deg, ${framePalette.primary}20, ${framePalette.secondary}10);
        border-radius: 20px;
        z-index: -1;
      }
      .frame-badge {
        display: inline-block;
        padding: 6px 14px;
        background: ${framePalette.primary}40;
        border: 1px solid ${framePalette.primary};
        border-radius: 6px;
        font-size: 11px;
        font-weight: bold;
        text-transform: uppercase;
        color: ${framePalette.primary};
        letter-spacing: 0.5px;
        margin-bottom: 12px;
      }
      h1 {
        color: ${framePalette.primary};
        margin: 0 0 16px 0;
        font-size: 24px;
        font-weight: 700;
        text-shadow: 0 2px 8px ${framePalette.primary}40;
      }
      p {
        line-height: 1.7;
        color: #e2e7ff;
        margin: 12px 0;
        font-size: 15px;
      }
      .meta-info {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin: 16px 0;
        padding: 16px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 12px;
        border: 1px solid ${framePalette.primary}20;
      }
      .meta-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .meta-label {
        font-size: 11px;
        text-transform: uppercase;
        color: ${framePalette.secondary};
        letter-spacing: 0.5px;
        font-weight: 600;
      }
      .meta-value {
        font-size: 16px;
        color: ${framePalette.accent};
        font-weight: 700;
      }
      a {
        color: ${framePalette.accent};
        text-decoration: none;
        font-weight: 600;
        transition: all 0.2s;
      }
      a:hover {
        text-decoration: underline;
        text-shadow: 0 0 8px ${framePalette.accent}60;
      }
      .powered-by {
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid ${framePalette.primary}20;
        font-size: 12px;
        color: ${framePalette.secondary}80;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <span class="frame-badge">${framePalette.label}</span>
      <h1>${pageTitle}</h1>
      <p>${desc}</p>
      <div class="powered-by">Powered by @gmeowbased</div>
    </div>
  </body>
</html>`
}

/* -------------------- Main GET / POST handlers -------------------- */

/**
 * GET: Build frame for preview
 * Query params:
 * - type=quest|guild|points|referral|leaderboard|gm|verify|onchainstats|generic
 * - questId / id / user / fid / chain / debug / json
 */
export async function GET(req: Request) {
  // Rate limiting (GI-8 security requirement)
  const clientIp = getClientIp(req)
  const { success } = await rateLimit(clientIp, apiLimiter)
  if (!success) {
    return new NextResponse('Rate limit exceeded', { 
      status: 429,
      headers: {
        'retry-after': '60',
        'x-ratelimit-limit': '60',
        'x-ratelimit-remaining': '0',
      }
    })
  }

  const url = new URL(req.url)
  const traces: Trace = []
  try {
    const params: FrameRequest = Object.fromEntries(url.searchParams.entries())
    tracePush(traces, 'request-received', params)
    
    // Input validation per GI-8 security requirements
    if (params.fid) {
      const validFid = sanitizeFID(params.fid)
      if (!validFid) {
        tracePush(traces, 'validation-failed', { field: 'fid', value: params.fid })
        return new NextResponse('Invalid FID parameter', { status: 400 })
      }
      params.fid = validFid
    }
    
    if (params.questId) {
      const validQuestId = sanitizeQuestId(params.questId)
      if (validQuestId === null) {
        tracePush(traces, 'validation-failed', { field: 'questId', value: params.questId })
        return new NextResponse('Invalid questId parameter', { status: 400 })
      }
      params.questId = validQuestId
    }
    
    if (params.chain) {
      // Special handling for 'all' chain parameter in leaderboards
      const chainStr = String(params.chain).toLowerCase().trim()
      if (chainStr === 'all' || chainStr === 'global' || chainStr === 'combined') {
        params.chain = 'all'
      } else {
        const validChain = validateChainKey(params.chain)
        if (!validChain) {
          tracePush(traces, 'validation-failed', { field: 'chain', value: params.chain })
          return new NextResponse(`Invalid chain parameter. Must be one of: ${CHAIN_KEYS.join(', ')}`, { status: 400 })
        }
        params.chain = validChain
      }
    }
    
    if (params.type) {
      const validType = sanitizeFrameType(params.type)
      if (!validType) {
        tracePush(traces, 'validation-failed', { field: 'type', value: params.type })
        return new NextResponse('Invalid frame type parameter', { status: 400 })
      }
      params.type = validType
    }

    const type: FrameType = (params.type || 'generic') as FrameType
    const asJson = wantsJson(req, url) || toBooleanFlag(params.json)
    tracePush(traces, 'resolved-type', { type })
    const debugMode = toBooleanFlag(params.debug)
    const debugPayload = debugMode ? traces : undefined
    const origin = resolveRequestOrigin(req, url)
    // Use frame-image.png (3:2 ratio) for Farcaster frames, not og-image.png (1.91:1)
    // Build extra parameters object with all relevant data for dynamic image generation
    const extraParams: Record<string, any> = {
      limit: params.limit,
      season: params.season,
      global: params.global,
      // Onchainstats parameters
      statsChain: params.statsChain,
      chainName: params.chainName,
      explorer: params.explorer,
      txs: params.txs,
      contracts: params.contracts,
      volume: params.volume,
      balance: params.balance,
      age: params.age,
      builder: params.builder,
      neynar: params.neynar,
      power: params.power,
      firstTx: params.firstTx,
      lastTx: params.lastTx,
      // Quest parameters
      questName: params.questName,
      reward: params.reward,
      expires: params.expires,
      progress: params.progress,
      // GM parameters
      gmCount: params.gmCount,
      streak: params.streak,
      rank: params.rank,
    }
    const dynamicImageUrl = buildDynamicFrameImageUrl({ type: type as any, chain: params.chain as any, questId: params.questId, badgeId: params.badgeId, user: params.user, fid: params.fid, id: params.id, referral: params.ref, extra: extraParams }, origin)
    const defaultFrameImage = dynamicImageUrl || `${origin}/frame-image.png`

    const handler = FRAME_HANDLERS[type]
    if (handler) {
      return handler({ req, url, params, traces, debugPayload, origin, defaultFrameImage, asJson })
    }

    // route to specialized handlers
    if (type === 'quest') {
      const rawQuestId = params.questId || params.id || params.q || ''
      if (!rawQuestId) {
        tracePush(traces, 'error-no-questId')
        const payload = { ok: false, reason: 'missing questId', traces }
        return respondJson(payload, { status: 400 })
      }
      const questIdNum = Number(rawQuestId)
      tracePush(traces, 'quest-id-parsed', questIdNum)

      // If chain param present, use it, otherwise attempt to auto-detect from storage/metadata.
      const chainKey = (params.chain as string) || 'base'

      // fetch quest on-chain
      const qres = await fetchQuestOnChain(questIdNum, chainKey, traces)
      if (!qres.ok) {
        tracePush(traces, 'quest-fetch-failed', qres.error)
        const payload = { ok: false, reason: 'quest-not-found', traces }
        return respondJson(payload, { status: 404 })
      }

      const quest = qres.quest

      const questName = quest.name && quest.name.trim().length > 0 ? quest.name.trim() : `Quest #${questIdNum}`
      const questChainName = getChainDisplayName(chainKey)
      const questChainIcon = getChainIconUrl(chainKey)

      const rawMeta = quest.meta
      let questMeta: any = null
      let questMetaCopy = ''
      if (rawMeta) {
        if (typeof rawMeta === 'string') {
          const trimmed = rawMeta.trim()
          if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try { questMeta = JSON.parse(trimmed) } catch { questMeta = null }
          } else {
            questMetaCopy = trimmed
          }
        } else if (typeof rawMeta === 'object') {
          questMeta = rawMeta
        }
      }
      if (questMeta && typeof questMeta === 'object') {
        const copyFields = ['description', 'summary', 'tagline', 'copy']
        for (const field of copyFields) {
          const val = questMeta[field]
          if (typeof val === 'string' && val.trim()) {
            questMetaCopy = val.trim()
            break
          }
        }
      }

      const qt = Number(quest.questType || 0)
      const qtypeKey = (gm.QUEST_TYPES_BY_CODE?.[qt] ?? 'GENERIC') as string
      const questTypeLabel = qtypeKey
        .split('_')
        .map((chunk) => chunk.charAt(0) + chunk.slice(1).toLowerCase())
        .join(' ')

      const expires = sanitizeExpiresAt(quest.expiresAt)
      const expiresText = formatUtcDate(expires)

      const rewardParts: string[] = []
      if (quest.rewardPoints && quest.rewardPoints > 0) {
        const formatted = formatInteger(quest.rewardPoints)
        rewardParts.push(`${formatted ?? quest.rewardPoints} gmeowbased Points`)
      }
      if (quest.rewardTokenPerUser && quest.rewardTokenPerUser > 0) {
        const formatted = formatInteger(quest.rewardTokenPerUser)
        rewardParts.push(`${formatted ?? quest.rewardTokenPerUser} Token Reward`)
      }
      const rewardSummary = rewardParts.join(' + ')

      let spotsLeft: number | null = null
      if (typeof quest.maxCompletions === 'number' && quest.maxCompletions > 0) {
        const claimed = typeof quest.claimedCount === 'number' ? quest.claimedCount : 0
        spotsLeft = Math.max(quest.maxCompletions - claimed, 0)
      }

      // Phase 1D: Add quest status badges
      const now = new Date()
      const expiresDate = new Date(expires)
      const isExpired = expiresDate < now
      const isFull = spotsLeft === 0
      const isHot = spotsLeft !== null && spotsLeft <= 10 && spotsLeft > 0
      const completionPercent = spotsLeft !== null && quest.maxCompletions
        ? Math.round(((quest.maxCompletions - spotsLeft) / quest.maxCompletions) * 100)
        : null
      
      let questStatusBadge = ''
      let questStatusLabel = ''
      
      if (isExpired) {
        questStatusBadge = '⏰ EXPIRED'
        questStatusLabel = 'EXPIRED'
      } else if (isFull) {
        questStatusBadge = '🔴 FULL'
        questStatusLabel = 'FULL'
      } else if (isHot) {
        questStatusBadge = `🔥 HOT • ${spotsLeft} left!`
        questStatusLabel = 'HOT'
      } else {
        questStatusBadge = '✅ ACTIVE'
        questStatusLabel = 'ACTIVE'
      }

      const descriptionPieces: string[] = []
      
      // Phase 1D: Add status badge to description
      descriptionPieces.push(questStatusBadge)
      
      if (rewardSummary) {
        descriptionPieces.push(`Claim ${rewardSummary} by clearing this ${questTypeLabel.toLowerCase()} mission on ${questChainName}.`)
      } else {
        descriptionPieces.push(`Clear this ${questTypeLabel.toLowerCase()} mission on ${questChainName} to climb the ranks.`)
      }
      if (questMetaCopy) descriptionPieces.push(questMetaCopy)
      if (spotsLeft !== null && !isFull && !isHot) {
        const formattedSpots = formatInteger(spotsLeft) ?? String(spotsLeft)
        descriptionPieces.push(`${formattedSpots} spots left`)
      }
      if (completionPercent !== null) {
        descriptionPieces.push(`${completionPercent}% complete`)
      }
      if (expiresText && !isExpired) descriptionPieces.push(`Ends ${expiresText}`)
      descriptionPieces.push('— by @gmeowbased')
      const description = descriptionPieces.filter(Boolean).join(' • ')

      // Phase 1D: Enhanced title with status
      let title = `${questName} • ${questChainName}`
      if (questStatusLabel !== 'ACTIVE') {
        title = `[${questStatusLabel}] ${questName} • ${questChainName}`
      }
      
      // Generate dynamic OG image for quest
      const questImageParams = new URLSearchParams()
      questImageParams.set('title', questName)
      questImageParams.set('subtitle', questTypeLabel)
      questImageParams.set('chain', questChainName)
      questImageParams.set('footer', `gmeowhq.art • Quest #${questIdNum}`)
      
      // Add quest metrics
      if (rewardSummary) {
        questImageParams.set('metric1Label', 'Reward')
        questImageParams.set('metric1Value', rewardSummary)
      }
      if (spotsLeft !== null) {
        const spotLabel = spotsLeft === 0 ? 'FULL' : `${formatInteger(spotsLeft) ?? spotsLeft} Left`
        questImageParams.set('metric2Label', 'Spots')
        questImageParams.set('metric2Value', spotLabel)
      }
      if (expiresText) {
        questImageParams.set('metric3Label', 'Expires')
        questImageParams.set('metric3Value', expiresText)
      }
      
      // Add badge for quest type
      questImageParams.set('badgeLabel', questTypeLabel)
      questImageParams.set('badgeTone', 'violet')
      
      // Phase 1E: Build dynamic image URL with real quest data
      const imageUrl = buildDynamicFrameImageUrl({
        type: 'quest',
        questId: questIdNum,
        chain: chainKey as ChainKey,
        extra: {
          questName,
          reward: rewardSummary || undefined,
          expires: expiresText || undefined,
          progress: completionPercent?.toString() || undefined,
        }
      }, origin)
      
      const frameBtnUrl = `${origin}/Quest/${encodeURIComponent(chainKey)}/${encodeURIComponent(String(questIdNum))}`
      const primaryLabel = questMeta && typeof questMeta === 'object' && typeof questMeta.cta === 'string' && questMeta.cta.trim()
        ? questMeta.cta.trim()
        : `Start Quest on ${questChainName}`
      const fcMeta: Record<string, string> = {
        [frameKey('entity')]: 'quest',
        [frameKey('questId')]: String(questIdNum),
        [frameKey('chain')]: chainKey,
        [frameKey('requirement')]: qtypeKey,
        [frameKey('chain_name')]: questChainName,
        [frameKey('brand')]: 'GMEOWBASED ADVENTURE',
      }
      if (rewardSummary) fcMeta[frameKey('quest_reward')] = rewardSummary
      if (spotsLeft !== null) fcMeta[frameKey('quest_spots_left')] = String(spotsLeft)
      if (expiresText) fcMeta[frameKey('quest_expires')] = expiresText
      if (questChainIcon) fcMeta[frameKey('chain_icon')] = questChainIcon
      const out = { ok: true, type: 'quest', quest, title, description, chain: chainKey, chainName: questChainName, chainIcon: questChainIcon, traces }
      if (asJson) return respondJson(out)

      // DEPRECATED: Interactive POST buttons no longer supported (removed Phase 1E)
      const questButtons: FrameButton[] = [
        { label: primaryLabel, target: frameBtnUrl, action: 'link' },
      ]

      const html = buildFrameHtml({
        title,
        description,
        image: imageUrl,
        url: frameBtnUrl,
        buttons: questButtons,
        fcMeta,
        debug: debugPayload,
        kicker: questChainName,
        chainIcon: questChainIcon,
        chainLabel: questChainName,
        chainKey,
        frameOrigin: origin,
        frameVersion: FRAME_VERSION,
        frameType: type,
        heroBadge: { label: questName, tone: 'violet' }, // Task 5: Display quest name prominently
      })
      return createHtmlResponse(html)
    }

    if (type === 'verify') {
      // help user start verification: accepts fid and cast or questId
      const fid = Number(params.fid || 0)
      const cast = params.cast || ''
      const questId = params.questId || params.id
      tracePush(traces, 'verify-start', { fid, cast, questId })
      
      // Phase 1D: Clear verification status messages
      let title = 'Verify Quest • GMEOW'
      let description = ''
      
      if (questId) {
        title = `Verify Quest #${questId}`
        description = fid 
          ? `✅ Ready to verify • FID ${fid} • Quest #${questId} • — @gmeowbased`
          : `⚠️ Connect Farcaster to verify • Quest #${questId} • — @gmeowbased`
      } else if (cast) {
        title = 'Verify Cast'
        description = fid
          ? `✅ Ready to verify cast • FID ${fid} • — @gmeowbased`
          : `⚠️ Connect Farcaster to verify cast • — @gmeowbased`
      } else {
        title = 'Quest Verification'
        description = fid
          ? `✅ Connected • FID ${fid} • Ready to verify • — @gmeowbased`
          : `⚠️ Provide quest ID or cast hash to verify • — @gmeowbased`
      }
      
      if (asJson) {
        return respondJson({ ok: true, type: 'verify', fid, cast, questId, traces })
      }
      const frameBtnUrl = `${origin}/api/quests/verify?debug=1&fid=${fid}${cast ? `&cast=${encodeURIComponent(String(cast))}` : ''}`
      const fcMeta = { [frameKey('entity')]: 'verify' }
      
      // DEPRECATED: Interactive POST buttons no longer supported (removed Phase 1E)
      const html = buildFrameHtml({
        title,
        description,
        image: defaultFrameImage,
        url: frameBtnUrl,
        buttons: [
          { label: 'Run Verification', target: frameBtnUrl, action: 'link' },
        ],
        fcMeta,
        debug: debugPayload,
        frameOrigin: origin,
        frameVersion: FRAME_VERSION,
        frameType: type,
      })
      return createHtmlResponse(html)
    }

    if (type === 'guild') {
      // show guild preview — try to fetch on-chain if id provided
      const guildId = Number(params.id || params.guildId || 0)
      tracePush(traces, 'guild-start', { guildId })
      // For brevity, we fetch guild info via contract getter if present (createGetGuildCall not implemented by default)
      // We'll fallback to simple frame with join button pointing to your site's guild page
      const title = guildId ? `Guild #${guildId}` : 'Guild'
      const description = guildId ? `Open guild ${guildId} on @gmeowbased` : '@gmeowbased guild preview'
      const guildUrl = `${origin}/guild/${guildId}`
      if (asJson) return respondJson({ ok: true, type: 'guild', guildId, guildUrl, traces })
      
      // DEPRECATED: Interactive POST buttons no longer supported (removed Phase 1E)
      const guildButtons: FrameButton[] = [
        { label: 'Open Guild', target: guildUrl, action: 'link' },
      ]
      const html = buildFrameHtml({
        title,
        description,
        image: defaultFrameImage,
        url: guildUrl,
        buttons: guildButtons,
        fcMeta: {
          [frameKey('entity')]: 'guild',
          [frameKey('guildId')]: String(guildId),
        },
        debug: debugPayload,
        frameOrigin: origin,
        frameVersion: FRAME_VERSION,
        chainKey: (params.chain as string) || null,
        frameType: type,
      })
      return createHtmlResponse(html)
    }

    if (type === 'referral') {
      const user = params.user || params.addr || ''
      const code = params.code || ''
      tracePush(traces, 'referral', { user, code })
      const shareUrl = `${origin}/referral${code ? `?code=${encodeURIComponent(String(code))}` : ''}`
      const title = code ? `Summon Frens • Code ${String(code).toUpperCase()}` : 'Summon Frens • Referral'
      const descriptionPieces: string[] = []
      if (code) descriptionPieces.push(`Share code ${String(code).toUpperCase()} to split gmeowbased Points with frens.`)
      descriptionPieces.push('Each completed quest powers up the guild streaks.')
      if (user) descriptionPieces.push(`Tracked to ${shortenHex(String(user))}`)
      descriptionPieces.push('— @gmeowbased')
      const description = descriptionPieces.join(' • ')
      const fcMeta: Record<string, string> = { [frameKey('entity')]: 'referral' }
      if (code) fcMeta[frameKey('referral_code')] = String(code)
      if (user) fcMeta[frameKey('referral_owner')] = String(user)
      if (asJson) return respondJson({ ok: true, type: 'referral', user, code, shareUrl, description, traces })
      
      // DEPRECATED: Interactive POST buttons no longer supported (removed Phase 1E)
      const referralButtons: FrameButton[] = [
        { label: code ? `Share ${String(code).toUpperCase()}` : 'Open Referral Hub', target: shareUrl, action: 'link' },
      ]
      const html = buildFrameHtml({
        title,
        description,
        image: defaultFrameImage,
        url: shareUrl,
        buttons: referralButtons,
        fcMeta,
        debug: debugPayload,
        frameOrigin: origin,
        frameVersion: FRAME_VERSION,
        chainKey: (params.chain as string) || null,
        frameType: type,
      })
      return createHtmlResponse(html)
    }

    if (type === 'onchainstats') {
      const user = params.user || params.addr || ''
      const chainParam = params.chain || params.statsChain || 'base'
      const chainKey = String(chainParam)
      const chainNameRaw = params.chainName ? String(params.chainName) : ''
      const chainDisplay = chainNameRaw || getChainDisplayName(chainKey)
      const chainIcon = getChainIconUrl(chainKey)
      const explorerRaw = params.explorer ? String(params.explorer) : ''
      const readField = (key: string) => {
        const raw = params[key]
        if (raw === undefined || raw === null) return ''
        const value = String(raw).trim()
        if (!value) return ''
        const lower = value.toLowerCase()
        if (lower === 'undefined' || lower === 'null') return ''
        return value
      }
      const metrics = {
        txs: readField('txs'),
        contracts: readField('contracts'),
        volume: readField('volume'),
        balance: readField('balance'),
        age: readField('age'),
        builder: readField('builder'),
        neynar: readField('neynar'),
        power: readField('power'),
        firstTx: readField('firstTx'),
        lastTx: readField('lastTx'),
      }
      tracePush(traces, 'onchainstats-request', { user, chain: chainKey, metrics })
      const neHelpers = Ne as any
      const userParam = typeof user === 'string' ? user.trim() : ''
      const fidParamRaw = params.fid ?? params.userFid
      const usernameParamRaw = params.username ?? params.handle ?? params.userHandle
      const parsedFid = (() => {
        if (fidParamRaw === undefined || fidParamRaw === null) return null
        const num = Number(fidParamRaw)
        return Number.isFinite(num) && num > 0 ? num : null
      })()
      const parsedUsername = typeof usernameParamRaw === 'string' ? usernameParamRaw.replace(/^@+/, '').trim() : ''
      let profile: OverlayProfile | null = null
      let resolvedFid: number | null = parsedFid
      const resolveProfile = (fcUser: any, source: string) => {
        if (!fcUser) return false
        const username = typeof fcUser.username === 'string' && fcUser.username.trim() ? fcUser.username.trim() : null
        const displayName = typeof fcUser.displayName === 'string' && fcUser.displayName.trim() ? fcUser.displayName.trim() : null
        const rawPfp = typeof fcUser.pfpUrl === 'string' && fcUser.pfpUrl.trim()
          ? fcUser.pfpUrl.trim()
          : typeof fcUser.pfp_url === 'string' && fcUser.pfp_url.trim()
            ? fcUser.pfp_url.trim()
            : null
        const pfpUrl = rawPfp && /^https?:\/\//i.test(rawPfp) ? rawPfp : rawPfp
        const fidVal = typeof fcUser.fid === 'number' && Number.isFinite(fcUser.fid) && fcUser.fid > 0 ? fcUser.fid : null
        if (fidVal) resolvedFid = fidVal
        if (!username && !displayName && !pfpUrl) return false
        profile = { username, displayName, pfpUrl }
        tracePush(traces, 'onchainstats-profile-resolved', { source, fid: fidVal, username })
        return true
      }
      const hasAddrLookup = !!neHelpers && typeof neHelpers.fetchUserByAddress === 'function'
      const hasFidLookup = !!neHelpers && typeof neHelpers.fetchUserByFid === 'function'
      const hasUsernameLookup = !!neHelpers && typeof neHelpers.fetchUserByUsername === 'function'
      const isAddress = /^0x[0-9a-fA-F]{40}$/.test(userParam)
      if (!profile && isAddress && hasAddrLookup) {
        try {
          const fcUser = await neHelpers.fetchUserByAddress(userParam)
          resolveProfile(fcUser, 'address')
        } catch (error: any) {
          tracePush(traces, 'onchainstats-profile-address-error', String(error?.message || error))
        }
      }
      if (!profile && resolvedFid && hasFidLookup) {
        try {
          const fcUser = await neHelpers.fetchUserByFid(resolvedFid)
          resolveProfile(fcUser, 'fid')
        } catch (error: any) {
          tracePush(traces, 'onchainstats-profile-fid-error', String(error?.message || error))
        }
      }
      if (!profile && parsedUsername && hasUsernameLookup) {
        try {
          const fcUser = await neHelpers.fetchUserByUsername(parsedUsername)
          resolveProfile(fcUser, 'username')
        } catch (error: any) {
          tracePush(traces, 'onchainstats-profile-username-error', String(error?.message || error))
        }
      }

      if (!profile) {
        const fallback = await fallbackResolveNeynarProfile({
          address: isAddress ? userParam : undefined,
          fid: resolvedFid,
          username: parsedUsername || null,
        })
        if (fallback.profile) {
          profile = fallback.profile
          tracePush(traces, 'onchainstats-profile-fallback', { source: 'neynar-rest', username: fallback.profile.username, fid: fallback.fid })
        }
        if (!resolvedFid && fallback.fid) resolvedFid = fallback.fid
      }

      const summaryPairs: Array<[string, string]> = [
        ['Txs', metrics.txs],
        ['Contracts', metrics.contracts],
        ['Volume', metrics.volume],
        ['Balance', metrics.balance],
        ['Age', metrics.age],
        ['Builder Score', metrics.builder],
        ['Neynar Score', metrics.neynar],
        ['Power Badge', metrics.power],
        ['First TX', metrics.firstTx],
        ['Last TX', metrics.lastTx],
      ]
      const summaryParts = summaryPairs
        .filter(([, value]) => value && value !== '—')
        .map(([label, value]) => `${label} ${value}`)
      const resolvedProfile = (profile ?? null) as OverlayProfile | null
      const identitySegment = resolvedProfile?.username
        ? `@${resolvedProfile.username}`
        : resolvedProfile?.displayName
          ? resolvedProfile.displayName
          : isAddress
            ? shortenHex(userParam)
            : userParam || null
      const descriptionSegments: string[] = []
      if (identitySegment) descriptionSegments.push(identitySegment)
      descriptionSegments.push(`Chain ${chainDisplay}`)
      if (summaryParts.length) {
        descriptionSegments.push(...summaryParts)
      } else {
        descriptionSegments.push(`Flex your onchain stats on ${chainDisplay}.`)
      }
      descriptionSegments.push('— @gmeowbased')
      const description = descriptionSegments.join(' • ')
      const hubUrl = `${origin}/#onchain-hub`
      const explorer = explorerRaw.replace(/\/$/, '')
      const fcMeta: Record<string, string> = {
        [frameKey('entity')]: 'onchainstats',
        [frameKey('chain')]: chainKey,
        [frameKey('chain_name')]: chainDisplay,
      }
      if (chainIcon) fcMeta[frameKey('chain_icon')] = chainIcon
      if (userParam) fcMeta[frameKey('onchain', 'user')] = userParam
      if (resolvedProfile?.username) fcMeta[frameKey('onchain', 'username')] = `@${resolvedProfile.username}`
      if (resolvedProfile?.displayName) fcMeta[frameKey('onchain', 'display_name')] = resolvedProfile.displayName
      if (resolvedProfile?.pfpUrl) fcMeta[frameKey('onchain', 'pfp')] = resolvedProfile.pfpUrl
      if (resolvedFid) fcMeta[frameKey('onchain', 'fid')] = String(resolvedFid)
      if (isAddress && userParam) fcMeta[frameKey('onchain', 'user_address')] = userParam
      for (const [key, value] of Object.entries(metrics)) {
        if (!value || value === '—') continue
        fcMeta[frameKey('onchain', key)] = value
      }
      // Generate dynamic OG image URL with stats
      const imageParams = new URLSearchParams()
      imageParams.set('title', `Onchain Stats — ${chainDisplay}`)
      imageParams.set('subtitle', identitySegment || 'Wallet Analytics')
      imageParams.set('chain', chainDisplay)
      imageParams.set('footer', `gmeowhq.art • ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`)
      
      // Add up to 4 metrics for the OG image
      const metricPairs: Array<[string, string]> = [
        ['Transactions', metrics.txs],
        ['Volume', metrics.volume],
        ['Builder Score', metrics.builder],
        ['Neynar Score', metrics.neynar],
      ].filter((pair): pair is [string, string] => pair[1] != null && pair[1] !== '—')
      
      metricPairs.slice(0, 4).forEach(([label, value], index) => {
        imageParams.set(`metric${index + 1}Label`, label)
        imageParams.set(`metric${index + 1}Value`, value)
      })
      
      // Add badge if user has power badge
      if (metrics.power && metrics.power.toLowerCase() === 'yes') {
        imageParams.set('badgeLabel', 'Power Badge')
        imageParams.set('badgeTone', 'gold')
        imageParams.set('badgeIcon', '⚡')
      }
      
      // Phase 1E: Build dynamic image URL with real onchain stats
      const imageUrl = buildDynamicFrameImageUrl({
        type: 'onchainstats',
        chain: chainKey as ChainKey,
        user: userParam || undefined,
        fid: resolvedFid || undefined,
        extra: {
          statsChain: chainKey,
          chainName: chainDisplay,
          explorer: explorerRaw,
          txs: metrics.txs || undefined,
          contracts: metrics.contracts || undefined,
          volume: metrics.volume || undefined,
          balance: metrics.balance || undefined,
          age: metrics.age || undefined,
          builder: metrics.builder || undefined,
          neynar: metrics.neynar || undefined,
          power: metrics.power || undefined,
          firstTx: metrics.firstTx || undefined,
          lastTx: metrics.lastTx || undefined,
        }
      }, origin)
      
      const identityForJson = resolvedProfile || userParam
        ? {
            username: resolvedProfile?.username || null,
            displayName: resolvedProfile?.displayName || null,
            pfpUrl: resolvedProfile?.pfpUrl || null,
            fid: resolvedFid,
            address: userParam || null,
          }
        : null
      if (asJson) {
        return respondJson({ ok: true, type: 'onchainstats', chain: chainKey, chainName: chainDisplay, chainIcon, metrics, url: hubUrl, image: imageUrl, description, identity: identityForJson, traces })
      }
      // DEPRECATED: Interactive POST buttons no longer supported (removed Phase 1E)
      const buttons: FrameButton[] = [
        { label: 'Open Onchain Hub', target: hubUrl, action: 'link' }, // Button 1 - miniapp launch
      ]
      if (userParam && explorer && isAddress) {
        buttons.push({ label: 'View Explorer', target: `${explorer}/address/${encodeURIComponent(userParam)}`, action: 'link' })
      }
      const html = buildFrameHtml({
        title: `Onchain Stats — ${chainDisplay}`,
        description,
        image: imageUrl,
        url: hubUrl,
        buttons,
        fcMeta,
        debug: debugPayload,
        profile: resolvedProfile,
        kicker: chainDisplay,
        chainIcon,
        chainLabel: chainDisplay,
        chainKey,
        frameOrigin: origin,
        frameVersion: FRAME_VERSION,
        frameType: type,
      })
      return createHtmlResponse(html)
    }

    if (type === 'points') {
      // preview points & optionally points merge
      const user = params.user || params.addr || ''
      const chainKey = params.chain || 'base'
      const chainDisplay = getChainDisplayName(String(chainKey))
      const chainIcon = getChainIconUrl(chainKey)
      tracePush(traces, 'points-preview', { user, chainKey })
      let stats = null
      if (user) {
        const sres = await fetchUserStatsOnChain(String(user), chainKey, traces)
        if (sres.ok) stats = sres.stats
      }
      
      // Resolve username for display (Task 4: Phase 1C)
      let profile: OverlayProfile | null = null
      let resolvedFid: number | null = null
      if (user && typeof user === 'string') {
        const userStr = String(user).trim()
        const isAddress = /^0x[0-9a-fA-F]{40}$/.test(userStr)
        const fidParam = params.fid || params.userFid
        const parsedFid = fidParam ? (() => {
          const num = Number(fidParam)
          return Number.isFinite(num) && num > 0 ? num : null
        })() : null
        
        if (parsedFid) resolvedFid = parsedFid
        
        // Try to resolve Neynar profile
        const fallback = await fallbackResolveNeynarProfile({
          address: isAddress ? userStr : undefined,
          fid: parsedFid,
          username: null,
        })
        if (fallback.profile) {
          profile = fallback.profile
          tracePush(traces, 'points-profile-resolved', { username: fallback.profile.username, fid: fallback.fid })
        }
        if (!resolvedFid && fallback.fid) resolvedFid = fallback.fid
      }
      
      const userDisplay = profile?.username
        ? `@${profile.username}`
        : user
          ? shortenHex(String(user))
          : 'gmeowbased Points'
      const title = `${userDisplay} • gmeowbased Points`
      const parseNumeric = (value: unknown) => {
        if (value === undefined || value === null || value === '') return null
        const num = Number(value)
        return Number.isFinite(num) ? num : null
      }
      let levelValue = parseNumeric(params.level ?? params.lvl)
      let xpCurrentValue = parseNumeric(params.xpCurrent ?? params.xpcurrent ?? params.xp)
      let xpMaxValue = parseNumeric(params.xpMax ?? params.xpmax ?? params.xpRequired)
      let xpToNextValue = parseNumeric(params.xpToNext ?? params.xptonext ?? params.xpRemaining)
      let tierName = typeof params.tier === 'string' && params.tier.trim()
        ? params.tier.trim()
        : typeof params.rankTier === 'string' && params.rankTier.trim()
          ? params.rankTier.trim()
          : ''
      let tierTagline = typeof params.tierTagline === 'string' && params.tierTagline.trim()
        ? params.tierTagline.trim()
        : ''
      let tierPercentValue = parseNumeric(params.tierPercent ?? params.rankPercent)

      let availableFormatted: string | null = null
      let lockedFormatted: string | null = null
      let totalFormatted: string | null = null

      if (stats) {
        const totalBig = (() => {
          const direct = stats.total ?? 0n
          if (direct > 0n) return direct
          return (stats.available ?? 0n) + (stats.locked ?? 0n)
        })()
        const totalPoints = Number(totalBig)
        if (
          levelValue == null ||
          xpCurrentValue == null ||
          xpMaxValue == null ||
          xpToNextValue == null ||
          !tierName ||
          tierPercentValue == null ||
          !tierTagline
        ) {
          const progress = calculateRankProgress(Number.isFinite(totalPoints) ? totalPoints : 0)
          if (levelValue == null) levelValue = progress.level
          if (xpCurrentValue == null) xpCurrentValue = progress.xpIntoLevel
          if (xpMaxValue == null) xpMaxValue = progress.xpForLevel
          if (xpToNextValue == null) xpToNextValue = progress.xpToNextLevel
          if (!tierName) tierName = progress.currentTier.name
          if (tierPercentValue == null) tierPercentValue = Math.round(progress.percent * 100)
          if (!tierTagline) tierTagline = progress.currentTier.tagline
        }
        availableFormatted = formatBigInt(stats.available)
        lockedFormatted = formatBigInt(stats.locked)
        totalFormatted = formatBigInt(stats.total)
      }
      const levelDisplay = levelValue != null && levelValue > 0 ? formatInteger(levelValue) : null
      const xpCurrentDisplay = xpCurrentValue != null ? formatInteger(xpCurrentValue) : null
      const xpMaxDisplay = xpMaxValue != null ? formatInteger(xpMaxValue) : null
      const xpToNextDisplay = xpToNextValue != null ? formatInteger(xpToNextValue) : null
      const tierPercentDisplay = tierPercentValue != null ? formatInteger(tierPercentValue) : null

      const descriptionPieces: string[] = []
      if (levelDisplay && xpCurrentDisplay && xpMaxDisplay) {
        descriptionPieces.push(`Level ${levelDisplay} • ${xpCurrentDisplay} / ${xpMaxDisplay} XP`)
      } else if (levelDisplay) {
        descriptionPieces.push(`Level ${levelDisplay}`)
      }
      if (xpToNextDisplay) descriptionPieces.push(`${xpToNextDisplay} XP to next level`)
      if (tierName) descriptionPieces.push(`Tier ${tierName}`)
      if (tierPercentDisplay) descriptionPieces.push(`Tier progress ${tierPercentDisplay}%`)
      if (tierTagline) descriptionPieces.push(tierTagline)

      if (availableFormatted) descriptionPieces.push(`Available ${availableFormatted}`)
      if (lockedFormatted) descriptionPieces.push(`Locked ${lockedFormatted}`)
      if (totalFormatted) descriptionPieces.push(`Lifetime ${totalFormatted}`)
      if (!stats) {
        descriptionPieces.push('Connect your wallet or Farcaster profile to preview gmeowbased Points balance.')
      }
      descriptionPieces.push(`Chain ${chainDisplay}`)
      descriptionPieces.push('— @gmeowbased')
      const description = descriptionPieces.filter(Boolean).join(' • ')
      const urlOpen = `${origin}/points${user ? `?user=${encodeURIComponent(String(user))}` : ''}`
      const fcMeta: Record<string, string> = {
        [frameKey('entity')]: 'points',
        [frameKey('chain')]: String(chainKey),
        [frameKey('chain_name')]: chainDisplay,
      }
      if (chainIcon) fcMeta[frameKey('chain_icon')] = chainIcon
      if (user) fcMeta[frameKey('points_user')] = String(user)
      if (stats) {
        fcMeta[frameKey('points_available')] = formatBigInt(stats.available)
        fcMeta[frameKey('points_locked')] = formatBigInt(stats.locked)
        fcMeta[frameKey('points_total')] = formatBigInt(stats.total)
      }
      if (levelValue != null && levelValue > 0) {
        fcMeta[frameKey('points_level')] = String(Math.round(levelValue))
      }
      if (xpCurrentValue != null) {
        fcMeta[frameKey('points_xp_current')] = String(Math.round(xpCurrentValue))
      }
      if (xpMaxValue != null) {
        fcMeta[frameKey('points_xp_max')] = String(Math.round(xpMaxValue))
      }
      if (xpToNextValue != null) {
        fcMeta[frameKey('points_xp_to_next')] = String(Math.round(xpToNextValue))
      }
      if (tierName) fcMeta[frameKey('points_tier')] = tierName
      if (tierPercentValue != null) {
        fcMeta[frameKey('points_tier_percent')] = String(Math.round(tierPercentValue))
      }
      if (tierTagline) fcMeta[frameKey('points_tier_tagline')] = tierTagline
      const jsonPayload = {
        ok: true,
        type: 'points' as const,
        user,
        chain: chainKey,
        stats: stats ? toJsonSafe(stats) : null,
        description,
        level: levelValue != null ? Math.round(levelValue) : null,
        xpCurrent: xpCurrentValue != null ? Math.round(xpCurrentValue) : null,
        xpMax: xpMaxValue != null ? Math.round(xpMaxValue) : null,
        xpToNext: xpToNextValue != null ? Math.round(xpToNextValue) : null,
        tier: tierName || null,
        tierPercent: tierPercentValue != null ? Math.round(tierPercentValue) : null,
        tierTagline: tierTagline || null,
        chainName: chainDisplay,
        chainIcon,
        traces,
      }
      if (asJson) return respondJson(jsonPayload)
      
      // Phase 1E: Build dynamic image URL with real points data
      const imageUrl = stats ? buildDynamicFrameImageUrl({
        type: 'points',
        chain: chainKey as ChainKey,
        user: user || undefined,
        fid: resolvedFid || undefined,
        extra: {
          level: levelValue?.toString() || undefined,
          xp: xpCurrentValue?.toString() || undefined,
          xpMax: xpMaxValue?.toString() || undefined,
          tier: tierName || undefined,
          tierPercent: tierPercentValue?.toString() || undefined,
          available: availableFormatted || undefined,
          total: totalFormatted || undefined,
        }
      }, origin) : defaultFrameImage
      
      // Phase 1B.2: Add interactive POST action buttons
      const html = buildFrameHtml({
        title,
        description,
        image: imageUrl,
        url: urlOpen,
        buttons: [
          { label: 'Open Points HQ', target: urlOpen, action: 'link' },
        ],
        fcMeta,
        debug: debugPayload,
        kicker: chainDisplay,
        chainIcon,
        chainLabel: chainDisplay,
        chainKey,
        frameOrigin: origin,
        frameVersion: FRAME_VERSION,
        frameType: type,
        profile, // Task 4: Pass resolved profile for username display
      })
      return createHtmlResponse(html)
    }

    if (type === 'badge') {
      tracePush(traces, 'badge-start')
      const fidParam = params.fid || params.user
      const fid = sanitizeFID(fidParam)
      
      if (!fid) {
        const errorMsg = 'Badge frame requires valid FID parameter'
        tracePush(traces, 'badge-error-no-fid')
        if (asJson) return respondJson({ ok: false, reason: errorMsg, traces }, { status: 400 })
        const html = buildFrameHtml({
          title: 'Badge Error',
          description: errorMsg,
          image: defaultFrameImage,
          url: origin,
          buttons: [{ label: 'Open gmeowbased', target: origin }],
          fcMeta: { [frameKey('entity')]: 'error' },
          debug: debugPayload,
          frameOrigin: origin,
          frameVersion: FRAME_VERSION,
          frameType: type,
        })
        return createHtmlResponse(html, { status: 400 })
      }

      // Phase 0: Check and award new user rewards
      try {
        const userData = await Ne.fetchUserByFid(fid)
        const rewardResult = await checkAndAwardNewUserRewards(fid, userData?.neynarScore)
        tracePush(traces, 'badge-rewards', {
          awarded: rewardResult.awarded,
          isFirstView: rewardResult.isFirstView,
          isOG: rewardResult.isOG,
          points: rewardResult.points,
          xp: rewardResult.xp,
          reason: rewardResult.reason,
        })
        if (rewardResult.awarded) {
          console.log(`[Frame] Awarded rewards to FID ${fid}:`, rewardResult)
        }
      } catch (rewardErr) {
        console.warn('[Frame] Reward system error:', rewardErr)
        tracePush(traces, 'badge-rewards-error', { error: String(rewardErr) })
        // Continue with frame generation even if rewards fail
      }

      // Phase 1D: Query badge counts for visual hierarchy
      let earnedCount = 0
      let eligibleCount = 0
      let hasLegendary = false
      
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        
        // Get earned badge count
        const { data: userBadges, error: badgesError } = await supabase
          .from('user_badges')
          .select('badge_id, tier, badge_type')
          .eq('fid', Number(fid))
        
        if (!badgesError && userBadges) {
          earnedCount = userBadges.length
          // Check for legendary tier badges
          hasLegendary = userBadges.some(b => b.tier === 'legendary' || b.badge_type === 'legendary')
        }
        
        // Get total active badge templates
        const { data: allBadges, error: allBadgesError } = await supabase
          .from('badge_templates')
          .select('id')
          .eq('active', true)
        
        if (!allBadgesError && allBadges) {
          eligibleCount = allBadges.length - earnedCount
        }
      } catch (err) {
        tracePush(traces, 'badge-query-error', { error: String(err) })
        // Continue with default counts
      }

      // Phase 1D: Dynamic title with badge stats
      let title = `Badge Collection • GMEOW`
      let heroBadge: { label: string; tone: 'emerald' | 'violet' | 'gold' | 'blue' | 'pink'; icon?: string } | null = null
      
      if (hasLegendary) {
        title = `🌟 Legendary Collector! • ${earnedCount} Badges`
        heroBadge = { label: 'LEGENDARY', tone: 'gold', icon: '🌟' }
      } else if (earnedCount >= 5) {
        title = `🏆 Badge Master! • ${earnedCount} Badges`
        heroBadge = { label: 'COLLECTOR', tone: 'violet', icon: '🏆' }
      } else if (earnedCount > 0) {
        title = `Badge Collection • ${earnedCount} Earned`
      }
      
      // Phase 1D: Show earned vs eligible in description
      const desc = earnedCount > 0
        ? `🏅 ${earnedCount} earned • ${eligibleCount} available • FID ${fid} • — @gmeowbased`
        : `Start your badge collection • ${eligibleCount} available • FID ${fid} • — @gmeowbased`
      
      const href = `${origin}/profile/${fid}/badges`
      const imageUrl = buildDynamicFrameImageUrl({ type: 'badge', fid }, origin)
      
      tracePush(traces, 'badge-generated', { fid, href, earnedCount, eligibleCount })
      
      if (asJson) return respondJson({ ok: true, type: 'badge', fid, href, description: desc, imageUrl, earnedCount, eligibleCount, traces })
      
      // DEPRECATED: Interactive POST buttons no longer supported (removed Phase 1E)
      const html = buildFrameHtml({
        title,
        description: desc,
        image: imageUrl,
        url: href,
        buttons: [
          { label: 'View Badges', target: href, action: 'link' }, // Button 1 - miniapp launch
        ],
        fcMeta: { [frameKey('entity')]: 'badge', [frameKey('fid')]: String(fid) },
        debug: debugPayload,
        frameOrigin: origin,
        frameVersion: FRAME_VERSION,
        frameType: type,
        heroBadge, // Phase 1D: Add collector badge
      })
      return createHtmlResponse(html)
    }

    if (type === 'gm') {
      tracePush(traces, 'gm-start')
      
      // Phase 1D: Query real GM data for streak milestone display
      const fidParam = params.fid || params.user
      const fid = fidParam ? sanitizeFID(fidParam) : null
      
      let gmCount = 0
      let streak = 0
      let lastGMDate: Date | null = null
      
      if (fid) {
        try {
          const { createClient } = await import('@supabase/supabase-js')
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          )
          
          // Get all GM events for this user
          const { data: gmEvents, error } = await supabase
            .from('gmeow_rank_events')
            .select('created_at, chain')
            .eq('fid', Number(fid))
            .eq('event_type', 'gm')
            .order('created_at', { ascending: false })
          
          if (!error && gmEvents && gmEvents.length > 0) {
            gmCount = gmEvents.length
            lastGMDate = new Date(gmEvents[0].created_at)
            
            // Calculate streak: count consecutive days with GM events
            // Group events by date (YYYY-MM-DD) since users can GM multiple times per day
            const uniqueDates = Array.from(
              new Set(
                gmEvents.map(event => {
                  const d = new Date(event.created_at)
                  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                })
              )
            ).sort().reverse() // Sort descending (most recent first)
            
            // Count consecutive days starting from the most recent
            streak = 1 // At least 1 if they have any GMs
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            
            for (let i = 0; i < uniqueDates.length - 1; i++) {
              const currentDate = new Date(uniqueDates[i] + 'T00:00:00')
              const nextDate = new Date(uniqueDates[i + 1] + 'T00:00:00')
              
              const dayDiff = Math.floor((currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24))
              
              if (dayDiff === 1) {
                streak++
              } else {
                break // Streak broken
              }
            }
          }
        } catch (err) {
          tracePush(traces, 'gm-query-error', { error: String(err) })
          // Continue with default values if query fails
        }
      }
      
      // Phase 1D: Dynamic title with streak milestones
      let title = 'GM Ritual • GMEOW'
      let heroBadge: { label: string; tone: 'emerald' | 'violet' | 'gold' | 'blue' | 'pink'; icon?: string } | null = null
      
      if (streak >= 30) {
        title = `🔥 ${streak}-Day Streak! Legendary!`
        heroBadge = { label: 'LEGEND', tone: 'gold', icon: '🔥' }
      } else if (streak >= 7) {
        title = `⚡ ${streak}-Day Streak! Amazing!`
        heroBadge = { label: 'HOT STREAK', tone: 'violet', icon: '⚡' }
      } else if (gmCount > 0) {
        title = `☀️ Good Morning! GM Count: ${gmCount}`
      }
      
      // Phase 1D: Daily status in description
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const isToday = lastGMDate && lastGMDate.getTime() >= today.getTime()
      
      let desc: string
      if (isToday && streak > 0) {
        desc = `✅ GM sent today! Keep your ${streak}-day streak alive • ⚡ Unlock multipliers + hidden boosts • — @gmeowbased`
      } else if (streak > 0) {
        desc = `☀️ Send your GM now to continue your ${streak}-day streak! • ⚡ Unlock multipliers + hidden boosts • — @gmeowbased`
      } else {
        desc = '🌅 Log your GM streak • ⚡ Unlock multipliers + hidden boosts • — @gmeowbased'
      }
      
      const href = `${origin}/gm`
      
      // Phase 1D: Build dynamic image URL with real GM data
      const imageUrl = fid ? buildDynamicFrameImageUrl({ 
        type: 'gm', 
        fid, 
        extra: { gmCount, streak } 
      }, origin) : defaultFrameImage
      
      if (asJson) return respondJson({ ok: true, type: 'gm', href, description: desc, gmCount, streak, traces })
      
      // DEPRECATED: Interactive POST buttons no longer supported by Farcaster (removed Phase 1E)
      const html = buildFrameHtml({
        title,
        description: desc,
        image: imageUrl, // Phase 1D: Use dynamic image with GM data
        url: href,
        buttons: [
          { label: 'Open GM Ritual', target: href, action: 'link' }, // Main miniapp launch button
        ],
        fcMeta: { [frameKey('entity')]: 'gm' },
        debug: debugPayload,
        frameOrigin: origin,
        frameVersion: FRAME_VERSION,
        frameType: type,
        heroBadge, // Phase 1D: Add streak milestone badge
        streak, // Phase 1D: Pass streak for compose text
        gmCount, // Phase 1D: Pass gmCount for compose text
      })
      return createHtmlResponse(html)
    }

    // Default generic frame
    tracePush(traces, 'generic-frame')
    const title = 'gmeowbased Frame'
    const description = ['🎮 Universal gmeowbased hub', '⚔️ Browse quests, guilds, and onchain flex'].join(' • ')
    const href = `${origin}`
    if (asJson) return respondJson({ ok: true, type: 'generic', href, traces })
    const html = buildFrameHtml({
      title,
      description,
      image: defaultFrameImage,
      url: href,
      buttons: [{ label: 'Open gmeowbased', target: href }],
      fcMeta: { [frameKey('entity')]: 'gmeow' },
      debug: debugPayload,
      frameOrigin: origin,
      frameVersion: FRAME_VERSION,
      frameType: 'generic',
    })
    return createHtmlResponse(html)
  } catch (err: any) {
    const message = String(err?.message || err)
    tracePush(traces, 'handler-error', { error: message })
    if (wantsJson(req, url)) {
      return respondJson({ ok: false, reason: message, traces }, { status: 500 })
    }
    const fallbackOrigin = resolveRequestOrigin(req, url)
    const debugParam = url.searchParams.get('debug')
    const debugMode = toBooleanFlag(debugParam || '')
    const html = buildFrameHtml({
      title: 'Frame Offline',
      description: message,
      image: `${fallbackOrigin}/og-image.png`,
      url: fallbackOrigin,
      buttons: [{ label: 'Open gmeowbased', target: fallbackOrigin }],
      fcMeta: { [frameKey('entity')]: 'error' },
      debug: debugMode ? traces : undefined,
      frameOrigin: fallbackOrigin,
      frameVersion: FRAME_VERSION,
      frameType: 'generic',
    })
    return createHtmlResponse(html, { status: 500 })
  }
}

/**
/*
 * ==================================================================================
 * DEPRECATED: POST HANDLER (Phase 1E - November 2025)
 * ==================================================================================
 * 
 * This POST handler is NO LONGER FUNCTIONAL as all interactive POST buttons
 * have been removed from Farcaster frames (POST actions deprecated by Farcaster).
 * 
 * All frames now use link-only buttons that open the miniapp directly.
 * 
 * REMOVAL PLAN:
 * - Phase 1E: Comment out POST handler (preserve for reference)
 * - Phase 1F: Delete entire POST handler (1000+ lines)
 * 
 * MIGRATION:
 * - Frame rendering: GET /api/frame?type=X
 * - User interactions: Miniapp routes (/gm, /Quest/[chain]/[id], etc.)
 * 
 * RELATED:
 * - Phase 1B.2: Added POST actions (deprecated same release)
 * - Phase 1E: Removed all POST buttons, deprecated POST handler
 * ==================================================================================
 */

/*
 * POST: interactive actions
 * Body:
 *  - action: "verifyQuest" | "claimSig" | "joinGuild" | "createReferral" | "proxyVerify"
 *  - payload: depends on action
 *
 * This endpoint is a convenience proxy to perform server-side operations, produce
 * signed messages, and return JSON. It does not mutate chain state (no tx sent).
 
export async function POST(req: Request) {
  // Rate limiting (GI-8 security requirement)
  const clientIp = getClientIp(req)
  const { success } = await rateLimit(clientIp, apiLimiter)
  if (!success) {
    return new NextResponse('Rate limit exceeded', { 
      status: 429,
      headers: {
        'retry-after': '60',
        'x-ratelimit-limit': '60',
        'x-ratelimit-remaining': '0',
      }
    })
  }

  const traces: Trace = []
  const started = nowTs()
  try {
    const contentType = req.headers.get('content-type') || ''
    let body: any = {}
    if (contentType.includes('application/json')) body = await req.json().catch(() => ({}))
    else {
      // fallback: parse urlencoded if needed
      const txt = await req.text().catch(() => '')
      try { body = txt ? JSON.parse(txt) : {} } catch { body = Object.fromEntries(new URLSearchParams(txt)) }
    }
    tracePush(traces, 'post-received', { body })

    // Phase 1B.2: Extract buttonIndex from Farcaster frame POST request
    // Farcaster sends untrustedData.buttonIndex (1-indexed) when a frame button is clicked
    const buttonIndex = body.untrustedData?.buttonIndex || body.buttonIndex
    const fid = body.untrustedData?.fid || body.fid
    const frameType = body.untrustedData?.state?.frameType || body.frameType || ''
    const payload = body.payload || {}
    
    // Map buttonIndex to action based on frame type (Phase 1B.2)
    let action = (body.action || body.type || '').toString()
    
    if (buttonIndex && !action) {
      // Define button mappings for each frame type
      const buttonMappings: Record<string, Record<number, string>> = {
        gm: { 1: '', 2: 'recordGM', 3: 'getGMStats' }, // Button 1 = miniapp launch (link), 2 = Record GM, 3 = View Stats
        points: { 1: '', 2: 'viewBalance', 3: 'tipUser' },
        leaderboards: { 1: '', 2: 'refreshRank' },
        badge: { 1: '', 2: 'checkBadges', 3: 'mintBadge' },
        onchainstats: { 1: '', 2: 'refreshStats' },
        guild: { 1: '', 2: 'viewGuild' },
        referral: { 1: '', 2: 'viewReferrals' },
        quest: { 1: '', 2: 'questProgress' }, // Button 1 = miniapp, 2 = Progress check
        verify: { 1: '', 2: 'verifyFrame' },
      }
      
      const mapping = buttonMappings[frameType]
      if (mapping && mapping[buttonIndex]) {
        action = mapping[buttonIndex]
        tracePush(traces, 'button-action-mapped', { buttonIndex, frameType, action })
      }
    }
    
    tracePush(traces, 'action-resolved', { action, buttonIndex, frameType, fid })

    // QUICK PROXY: forward verifyQuest to your /api/quests/verify route if that's still your canonical verify handler
    if (action === 'proxyVerify' || action === 'verifyQuest') {
      // build a POST proxy to /api/quests/verify (server side)
      tracePush(traces, 'proxyVerify-start', { payload })

      const verifyUrl = `${req.url.replace(/\/api\/frame\/?$/, '')}/api/quests/verify`
      // but above might result in wrong url in development; build from origin instead:
      const forwardedHost = req.headers.get('x-forwarded-host')
      const origin = forwardedHost ? `https://${forwardedHost}` : (process.env.NEXT_PUBLIC_BASE_URL || '')
      const dest = origin ? `${origin.replace(/\/$/, '')}/api/quests/verify` : verifyUrl
      tracePush(traces, 'proxyVerify-dest', { dest, fallback: verifyUrl })
      // forward the payload
      const res = await fetch(dest, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const raw = await res.text().catch(() => '')
      let json: any = null
      try { json = raw ? JSON.parse(raw) : null } catch { json = raw }
      tracePush(traces, 'proxyVerify-res', { ok: res.ok, status: res.status, parsed: json })
      // safe JSON response
      return respondJson({ ok: true, proxied: true, dest, fallbackUrl: verifyUrl, status: res.status, body: json, traces, durationMs: nowTs() - started })
    }

    if (action === 'claimSig') {
      // Accepts payload: { chain, questId, user, fid, actionCode, deadline, nonce, sig }
      const { chain, questId, user, fid, actionCode, deadline, nonce, sig } = payload
      tracePush(traces, 'claimSig', { chain, questId, user, fid })
      if (!chain || !questId || !user || !sig) return respondJson({ ok: false, reason: 'missing fields for claimSig', traces }, { status: 400 })
      // We don't send the tx here; just return the call object (viem style) that frontend can feed into writeContract
      const callObj = gm.createCompleteQuestWithSigTx(questId, user, fid || 0, Number(actionCode || 0), deadline || 0, nonce || 0, sig, chain)
      tracePush(traces, 'claimSig-callobj', callObj)
      return respondJson({ ok: true, callObj: safeJson(callObj), traces, durationMs: nowTs() - started })
    }

    if (action === 'joinGuild') {
      const guildId = Number(payload.guildId || payload.id || 0)
      const chain = payload.chain || 'base'
      if (!guildId) return respondJson({ ok: false, reason: 'missing guildId', traces }, { status: 400 })
      const callObj = gm.createJoinGuildTx(guildId, chain)
      tracePush(traces, 'joinGuild-build', callObj)
      return respondJson({ ok: true, callObj: safeJson(callObj), traces, durationMs: nowTs() - started })
    }

    if (action === 'createReferral') {
      const code = payload.code || payload.referral || ''
      if (!code) return respondJson({ ok: false, reason: 'missing referral code', traces }, { status: 400 })
      const callObj = gm.createRegisterReferralCodeTx(String(code))
      tracePush(traces, 'createReferral', callObj)
      return respondJson({ ok: true, callObj: safeJson(callObj), traces, durationMs: nowTs() - started })
    }

    // points merge preview: build pseudo-flow showing merged points across chains (read-only)
    if (action === 'pointsMergePreview') {
      const user = payload.user || payload.addr || ''
      if (!user) return respondJson({ ok: false, reason: 'missing user address', traces }, { status: 400 })
      const chains = CHAIN_KEYS
      const results: any = {}
      for (const c of chains) {
        const s = await fetchUserStatsOnChain(user, c, traces)
        if (s.ok) {
          results[c] = {
            available: String(s.stats.available),
            locked: String(s.stats.locked),
            total: String(s.stats.total),
          }
        } else {
          results[c] = { error: s.error }
        }
      }
      // simple aggregated total
      let aggAvailable = 0n
      for (const c of chains) {
        const item = results[c]
        if (item && item.available) aggAvailable += BigInt(item.available)
      }
      tracePush(traces, 'points-merged', { aggAvailable: String(aggAvailable) })
      return respondJson({ ok: true, user, perChain: results, aggregatedAvailable: String(aggAvailable), traces, durationMs: nowTs() - started })
    }

    // Phase 1B: recordGM - Track GM button clicks in frames
    if (action === 'recordGM') {
      const { generateSessionId, saveFrameState } = await import('@/lib/frame-state')
      const { buildGMSuccessMessage } = await import('@/lib/frame-messages')
      const { invalidateUserFrames } = await import('@/lib/frame-cache')
      
      const fid = payload.fid || payload.untrustedData?.fid
      if (!fid) return respondJson({ ok: false, reason: 'missing fid', traces }, { status: 400 })
      
      // Create session for state tracking
      const sessionId = generateSessionId()
      const now = Date.now()
      
      // Query real GM data from gmeow_rank_events
      let gmCount = 0
      let streak = 0
      
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        
        // Get all GM events for this user
        const { data: gmEvents, error } = await supabase
          .from('gmeow_rank_events')
          .select('created_at, chain')
          .eq('fid', Number(fid))
          .eq('event_type', 'gm')
          .order('created_at', { ascending: false })
        
        if (!error && gmEvents) {
          gmCount = gmEvents.length
          
          // Calculate streak: count consecutive days with GM events
          if (gmEvents.length > 0) {
            streak = 1 // At least 1 if they have any GMs
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            
            for (let i = 0; i < gmEvents.length - 1; i++) {
              const currentDate = new Date(gmEvents[i].created_at)
              currentDate.setHours(0, 0, 0, 0)
              const nextDate = new Date(gmEvents[i + 1].created_at)
              nextDate.setHours(0, 0, 0, 0)
              
              const dayDiff = Math.floor((currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24))
              
              if (dayDiff === 1) {
                streak++
              } else {
                break // Streak broken
              }
            }
          }
        }
      } catch (err) {
        tracePush(traces, 'recordGM-query-error', { error: String(err) })
        // Continue with gmCount=0, streak=0 if query fails
      }
      
      // Save state
      const saved = await saveFrameState(sessionId, Number(fid), {
        gmCount,
        streak,
        lastAction: 'recordGM',
        metadata: { timestamp: now },
      })
      
      if (!saved) {
        return respondJson({ ok: false, reason: 'failed to save state', traces }, { status: 500 })
      }
      
      // Invalidate all frame caches for this user
      await invalidateUserFrames(Number(fid))
      
      // Build success message
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gmeowhq.art'
      const message = buildGMSuccessMessage({ fid: Number(fid), streak, gmCount, baseUrl })
      
      // Return updated frame URL with session
      const nextFrameUrl = `${baseUrl}/api/frame?type=gm&fid=${fid}&session=${sessionId}`
      
      tracePush(traces, 'recordGM', { fid, sessionId, gmCount, streak })
      return respondJson({ 
        ok: true, 
        message, 
        frameUrl: nextFrameUrl, 
        sessionId,
        gmCount,
        streak,
        traces, 
        durationMs: nowTs() - started 
      })
    }

    // Phase 1B.1: getGMStats - Retrieve user's GM statistics
    if (action === 'getGMStats') {
      const fid = payload.fid || payload.untrustedData?.fid
      if (!fid) return respondJson({ ok: false, reason: 'missing fid', traces }, { status: 400 })
      
      tracePush(traces, 'getGMStats-start', { fid })
      
      // Query Supabase for latest GM session for this user
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        
        const { data: sessions, error } = await supabase
          .from('frame_sessions')
          .select('session_id, fid, state, created_at, updated_at')
          .eq('fid', Number(fid))
          .contains('state', { lastAction: 'recordGM' })
          .order('updated_at', { ascending: false })
          .limit(1)
        
        if (error) {
          tracePush(traces, 'getGMStats-db-error', { error: error.message })
          return respondJson({ ok: false, reason: 'database error', error: error.message, traces }, { status: 500 })
        }
        
        if (!sessions || sessions.length === 0) {
          tracePush(traces, 'getGMStats-no-data', { fid })
          return respondJson({ 
            ok: true, 
            fid: Number(fid),
            gmCount: 0,
            streak: 0,
            lastGM: null,
            message: 'No GM activity recorded yet. Send your first GM!',
            traces,
            durationMs: nowTs() - started
          })
        }
        
        const latestSession = sessions[0]
        const state = latestSession.state || {}
        const gmCount = Number(state.gmCount || 0)
        const streak = Number(state.streak || 0)
        const lastGMTimestamp = state.metadata?.timestamp || null
        const lastGM = lastGMTimestamp ? new Date(lastGMTimestamp).toISOString() : null
        
        tracePush(traces, 'getGMStats-success', { fid, gmCount, streak, lastGM })
        
        const message = `🌅 GM Stats for FID ${fid}:\n\n` +
                       `Total GMs: ${gmCount}\n` +
                       `Current Streak: ${streak} ${streak === 1 ? 'day' : 'days'}\n` +
                       `Last GM: ${lastGM ? new Date(lastGM).toLocaleDateString() : 'Never'}\n\n` +
                       `Keep the streak alive! 🚀`
        
        return respondJson({
          ok: true,
          fid: Number(fid),
          gmCount,
          streak,
          lastGM,
          message,
          traces,
          durationMs: nowTs() - started
        })
      } catch (err: any) {
        tracePush(traces, 'getGMStats-error', { error: String(err.message || err) })
        return respondJson({ 
          ok: false, 
          reason: 'failed to fetch GM stats', 
          error: String(err.message || err),
          traces 
        }, { status: 500 })
      }
    }

    // Phase 1B: questProgress - Track multi-step quest progress
    if (action === 'questProgress') {
      const { generateSessionId, saveFrameState, loadFrameState } = await import('@/lib/frame-state')
      const { buildQuestProgressMessage, buildQuestCompleteMessage } = await import('@/lib/frame-messages')
      
      const fid = payload.fid || payload.untrustedData?.fid
      const questId = payload.questId || payload.quest_id
      const sessionId = payload.session || payload.sessionId
      
      if (!fid || !questId) {
        return respondJson({ ok: false, reason: 'missing fid or questId', traces }, { status: 400 })
      }
      
      // Load existing session or create new
      const currentSession = sessionId ? await loadFrameState(sessionId) : null
      const newSessionId = currentSession?.session_id || generateSessionId()
      
      // Get current step from session or start at 1
      const currentStep = (currentSession?.state.currentStep || 0) + 1
      const totalSteps = 3 // Default quest steps
      
      // Update quest progress
      const questProgress = currentSession?.state.questProgress || {}
      questProgress[`step_${currentStep}`] = true
      
      const newState = {
        currentStep,
        questProgress,
        lastAction: 'questProgress',
        metadata: { questId, timestamp: Date.now() },
      }
      
      const saved = await saveFrameState(newSessionId, Number(fid), newState)
      
      if (!saved) {
        return respondJson({ ok: false, reason: 'failed to save state', traces }, { status: 500 })
      }
      
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gmeowhq.art'
      
      // Check if quest is complete
      const isComplete = currentStep >= totalSteps
      const message = isComplete
        ? buildQuestCompleteMessage({ questTitle: `Quest ${questId}`, points: 100, baseUrl })
        : buildQuestProgressMessage({ questTitle: `Quest ${questId}`, currentStep, totalSteps, baseUrl })
      
      const nextFrameUrl = `${baseUrl}/api/frame?type=quest&questId=${questId}&session=${newSessionId}`
      
      tracePush(traces, 'questProgress', { fid, questId, sessionId: newSessionId, currentStep, isComplete })
      return respondJson({ 
        ok: true, 
        message, 
        frameUrl: nextFrameUrl, 
        sessionId: newSessionId,
        currentStep,
        isComplete,
        traces, 
        durationMs: nowTs() - started 
      })
    }

    // Phase 1B.1: viewBalance - Retrieve user's points balance
    if (action === 'viewBalance') {
      const fid = payload.fid || payload.untrustedData?.fid
      const userAddr = payload.user || payload.addr || payload.address
      const chainKey = payload.chain || 'base'
      
      if (!fid && !userAddr) {
        return respondJson({ ok: false, reason: 'missing fid or user address', traces }, { status: 400 })
      }
      
      tracePush(traces, 'viewBalance-start', { fid, userAddr, chainKey })
      
      try {
        // If we have userAddr, fetch from contract
        const address = userAddr
        
        // If only FID provided, try to resolve to address (for now, return error)
        if (!address && fid) {
          tracePush(traces, 'viewBalance-fid-only', { fid })
          return respondJson({
            ok: false,
            reason: 'address required for balance lookup',
            message: 'Please provide your wallet address to view balance.',
            traces,
            durationMs: nowTs() - started
          }, { status: 400 })
        }
        
        // Fetch on-chain stats
        const statsResult = await fetchUserStatsOnChain(String(address), String(chainKey), traces)
        
        if (!statsResult.ok) {
          tracePush(traces, 'viewBalance-fetch-error', { error: statsResult.error })
          return respondJson({
            ok: false,
            reason: 'failed to fetch balance',
            error: statsResult.error,
            traces,
            durationMs: nowTs() - started
          }, { status: 500 })
        }
        
        const stats = statsResult.stats
        
        // Format balance data
        const available = Number(stats.available)
        const locked = Number(stats.locked)
        const total = Number(stats.total)
        
        const chainDisplay = getChainDisplayName(String(chainKey))
        
        // Calculate rank progress from total points
        const progress = calculateRankProgress(total)
        
        const message = `💰 Points Balance on ${chainDisplay}:\n\n` +
                       `Available: ${formatInteger(available)} points\n` +
                       `Locked: ${formatInteger(locked)} points\n` +
                       `Total: ${formatInteger(total)} points\n\n` +
                       `Level ${progress.level} • ${progress.currentTier.name}\n` +
                       `${progress.xpIntoLevel}/${progress.xpForLevel} XP\n\n` +
                       `Keep earning! 🚀`
        
        tracePush(traces, 'viewBalance-success', { address, chainKey, available, locked, total })
        
        return respondJson({
          ok: true,
          user: address,
          chain: chainKey,
          balance: {
            available: String(stats.available),
            locked: String(stats.locked),
            total: String(stats.total),
          },
          rank: {
            level: progress.level,
            tier: progress.currentTier.name,
            xpIntoLevel: progress.xpIntoLevel,
            xpForLevel: progress.xpForLevel,
            xpToNextLevel: progress.xpToNextLevel,
          },
          message,
          traces,
          durationMs: nowTs() - started
        })
      } catch (err: any) {
        tracePush(traces, 'viewBalance-error', { error: String(err.message || err) })
        return respondJson({ 
          ok: false, 
          reason: 'failed to fetch balance', 
          error: String(err.message || err),
          traces 
        }, { status: 500 })
      }
    }

    // Phase 1B.1: refreshRank - Retrieve user's leaderboard rank and stats
    if (action === 'refreshRank') {
      const fid = payload.fid || payload.untrustedData?.fid
      const userAddr = payload.user || payload.addr || payload.address
      const chainKey = payload.chain || 'base'
      
      if (!fid && !userAddr) {
        return respondJson({ ok: false, reason: 'missing fid or user address', traces }, { status: 400 })
      }
      
      tracePush(traces, 'refreshRank-start', { fid, userAddr, chainKey })
      
      try {
        const address = userAddr
        
        // If only FID provided, return error (for now)
        if (!address && fid) {
          tracePush(traces, 'refreshRank-fid-only', { fid })
          return respondJson({
            ok: false,
            reason: 'address required for rank lookup',
            message: 'Please provide your wallet address to check your rank.',
            traces,
            durationMs: nowTs() - started
          }, { status: 400 })
        }
        
        // Fetch on-chain stats to get total points
        const statsResult = await fetchUserStatsOnChain(String(address), String(chainKey), traces)
        
        if (!statsResult.ok) {
          tracePush(traces, 'refreshRank-fetch-error', { error: statsResult.error })
          return respondJson({
            ok: false,
            reason: 'failed to fetch stats',
            error: statsResult.error,
            traces,
            durationMs: nowTs() - started
          }, { status: 500 })
        }
        
        const stats = statsResult.stats
        const total = Number(stats.total)
        
        // Calculate rank progress
        const progress = calculateRankProgress(total)
        const chainDisplay = getChainDisplayName(String(chainKey))
        
        // Query real rank from leaderboard_snapshots
        let actualRank = 9999
        try {
          const { createClient } = await import('@supabase/supabase-js')
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          )
          
          const { data: leaderboardEntry, error } = await supabase
            .from('leaderboard_snapshots')
            .select('rank')
            .eq('address', address)
            .eq('chain', String(chainKey))
            .single()
          
          if (!error && leaderboardEntry && leaderboardEntry.rank) {
            actualRank = Number(leaderboardEntry.rank)
          } else if (total > 0) {
            // Fallback: calculate rank by counting users with more points
            const { count, error: countError } = await supabase
              .from('leaderboard_snapshots')
              .select('*', { count: 'exact', head: true })
              .eq('chain', String(chainKey))
              .gt('points', total)
            
            if (!countError && count !== null) {
              actualRank = count + 1
            }
          }
        } catch (err) {
          tracePush(traces, 'refreshRank-query-error', { error: String(err) })
          // Use fallback rank if query fails
        }
        
        // Phase 1D: Add rank milestone badges
        let rankDisplay = `#${formatInteger(actualRank)}`
        let rankBadge = ''
        
        if (actualRank === 1) {
          rankDisplay = `👑 #1 • Champion!`
          rankBadge = '👑'
        } else if (actualRank === 2) {
          rankDisplay = `🥈 #2 • Runner-up!`
          rankBadge = '🥈'
        } else if (actualRank === 3) {
          rankDisplay = `🥉 #3 • Bronze Medal!`
          rankBadge = '🥉'
        } else if (actualRank <= 10) {
          rankDisplay = `⭐ #${actualRank} • Top 10!`
          rankBadge = '⭐'
        } else if (actualRank <= 100) {
          rankDisplay = `🔥 #${actualRank} • Top 100!`
          rankBadge = '🔥'
        }
        
        const message = `🏆 Leaderboard Rank on ${chainDisplay}:\n\n` +
                       `Rank: ${rankDisplay}\n` +
                       `Total Points: ${formatInteger(total)}\n\n` +
                       `Level ${progress.level} • ${progress.currentTier.name}\n` +
                       `${progress.xpIntoLevel}/${progress.xpForLevel} XP (${Math.round(progress.percent * 100)}%)\n\n` +
                       `${total === 0 ? 'Start earning to climb the ranks! 🚀' : 'Keep grinding! 💪'}`
        
        tracePush(traces, 'refreshRank-success', { address, chainKey, rank: actualRank, total, rankBadge })
        
        return respondJson({
          ok: true,
          user: address,
          chain: chainKey,
          rank: actualRank,
          points: String(stats.total),
          level: progress.level,
          tier: progress.currentTier.name,
          xp: {
            current: progress.xpIntoLevel,
            max: progress.xpForLevel,
            toNext: progress.xpToNextLevel,
            percent: Math.round(progress.percent * 100),
          },
          message,
          traces,
          durationMs: nowTs() - started
        })
      } catch (err: any) {
        tracePush(traces, 'refreshRank-error', { error: String(err.message || err) })
        return respondJson({ 
          ok: false, 
          reason: 'failed to refresh rank', 
          error: String(err.message || err),
          traces 
        }, { status: 500 })
      }
    }

    // Phase 1B.1: checkBadges - Check user's badge eligibility
    if (action === 'checkBadges') {
      const fid = payload.fid || payload.untrustedData?.fid
      
      if (!fid) {
        return respondJson({ ok: false, reason: 'missing fid', traces }, { status: 400 })
      }
      
      tracePush(traces, 'checkBadges-start', { fid })
      
      try {
        // Query real badge data from user_badges and badge_templates
        let earnedBadges: any[] = []
        let eligibleBadges: any[] = []
        
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        
        // Get user's earned badges
        const { data: userBadges, error: badgesError } = await supabase
          .from('user_badges')
          .select('badge_id, assigned_at, badge_type, tier')
          .eq('fid', Number(fid))
        
        if (!badgesError && userBadges) {
          // Fetch badge templates for earned badges
          const badgeIds = userBadges.map(b => b.badge_id)
          if (badgeIds.length > 0) {
            const { data: templates, error: templatesError } = await supabase
              .from('badge_templates')
              .select('id, name, description, image_url')
              .in('id', badgeIds)
            
            if (!templatesError && templates) {
              earnedBadges = userBadges.map(ub => {
                const template = templates.find(t => t.id === ub.badge_id)
                let badgeName = template?.name || ub.badge_id
                
                // Phase 1D: Add rarity indicators
                if (ub.tier === 'legendary' || ub.badge_type === 'legendary') {
                  badgeName = `🌟 ${badgeName} (LEGENDARY)`
                } else if (ub.tier === 'rare' || ub.badge_type === 'rare') {
                  badgeName = `💎 ${badgeName} (RARE)`
                } else if (ub.tier === 'epic' || ub.badge_type === 'epic') {
                  badgeName = `⚡ ${badgeName} (EPIC)`
                }
                
                return {
                  id: ub.badge_id,
                  name: badgeName,
                  earned: true,
                  timestamp: ub.assigned_at,
                  tier: ub.tier,
                }
              })
            }
          }
        }
        
        // Get eligible badges (all active badges not yet earned)
        const { data: allBadges, error: allBadgesError } = await supabase
          .from('badge_templates')
          .select('id, name, description, points_cost')
          .eq('active', true)
        
        if (!allBadgesError && allBadges) {
          const earnedBadgeIds = new Set(userBadges?.map(b => b.badge_id) || [])
          eligibleBadges = allBadges
            .filter(b => !earnedBadgeIds.has(b.id))
            .map(b => ({
              id: b.id,
              name: b.name,
              requirement: b.description || `Cost: ${b.points_cost} points`,
              progress: b.points_cost ? `Available for ${b.points_cost} points` : 'Available',
            }))
            .slice(0, 5) // Limit to 5 eligible badges
        }
        
        // Phase 1D: Format message with visual hierarchy (earned vs eligible sections)
        const earnedSection = earnedBadges.length > 0
          ? `🏆 EARNED BADGES (${earnedBadges.length}):\n${earnedBadges.map(b => `✅ ${b.name}`).join('\n')}`
          : `🏅 No badges earned yet`
        
        const eligibleSection = eligibleBadges.length > 0
          ? `\n\n🎯 AVAILABLE BADGES (${eligibleBadges.length}):\n${eligibleBadges.map(b => `• ${b.name}`).join('\n')}`
          : ``
        
        const message = `🏅 Badge Collection for FID ${fid}:\n\n${earnedSection}${eligibleSection}\n\n🚀 Keep earning!`
        
        tracePush(traces, 'checkBadges-success', { fid, earned: earnedBadges.length, eligible: eligibleBadges.length })
        
        return respondJson({
          ok: true,
          fid: Number(fid),
          badges: {
            earned: earnedBadges,
            eligible: eligibleBadges,
            total: earnedBadges.length,
          },
          message,
          traces,
          durationMs: nowTs() - started
        })
      } catch (err: any) {
        tracePush(traces, 'checkBadges-error', { error: String(err.message || err) })
        return respondJson({ 
          ok: false, 
          reason: 'failed to check badges', 
          error: String(err.message || err),
          traces 
        }, { status: 500 })
      }
    }

    // Phase 1B.1: mintBadge - Mint a badge NFT
    if (action === 'mintBadge') {
      const fid = payload.fid || payload.untrustedData?.fid
      const badgeId = payload.badgeId || payload.badge_id
      
      if (!fid) {
        return respondJson({ ok: false, reason: 'missing fid', traces }, { status: 400 })
      }
      
      if (!badgeId) {
        return respondJson({ ok: false, reason: 'missing badgeId', traces }, { status: 400 })
      }
      
      tracePush(traces, 'mintBadge-start', { fid, badgeId })
      
      try {
        // Mock mint (in production, create transaction call object)
        const message = `🎴 Badge Mint Initiated!\n\n` +
                       `Badge ID: ${badgeId}\n` +
                       `FID: ${fid}\n\n` +
                       `Check your wallet to complete the mint transaction.\n\n` +
                       `Congrats! 🎉`
        
        tracePush(traces, 'mintBadge-success', { fid, badgeId })
        
        return respondJson({
          ok: true,
          fid: Number(fid),
          badgeId: Number(badgeId),
          message,
          traces,
          durationMs: nowTs() - started
        })
      } catch (err: any) {
        tracePush(traces, 'mintBadge-error', { error: String(err.message || err) })
        return respondJson({ 
          ok: false, 
          reason: 'failed to mint badge', 
          error: String(err.message || err),
          traces 
        }, { status: 500 })
      }
    }

    // Phase 1B.1: refreshStats - Refresh onchain statistics
    if (action === 'refreshStats') {
      const userAddr = payload.user || payload.addr || payload.address
      const chainKey = payload.chain || 'base'
      
      if (!userAddr) {
        return respondJson({ ok: false, reason: 'missing user address', traces }, { status: 400 })
      }
      
      tracePush(traces, 'refreshStats-start', { userAddr, chainKey })
      
      try {
        const chainDisplay = getChainDisplayName(String(chainKey))
        
        // Mock stats refresh (in production, query Neynar/Explorer APIs)
        const stats = {
          transactions: 1247,
          contracts: 23,
          volume: '2.45 ETH',
          age: '542 days',
          lastActivity: '2 hours ago',
        }
        
        const message = `📊 Stats Refreshed on ${chainDisplay}:\n\n` +
                       `Transactions: ${stats.transactions}\n` +
                       `Contracts: ${stats.contracts}\n` +
                       `Volume: ${stats.volume}\n` +
                       `Age: ${stats.age}\n` +
                       `Last Activity: ${stats.lastActivity}\n\n` +
                       `Data updated! ✨`
        
        tracePush(traces, 'refreshStats-success', { userAddr, chainKey, stats })
        
        return respondJson({
          ok: true,
          user: userAddr,
          chain: chainKey,
          stats,
          message,
          traces,
          durationMs: nowTs() - started
        })
      } catch (err: any) {
        tracePush(traces, 'refreshStats-error', { error: String(err.message || err) })
        return respondJson({ 
          ok: false, 
          reason: 'failed to refresh stats', 
          error: String(err.message || err),
          traces 
        }, { status: 500 })
      }
    }

    // Phase 1B.1: viewGuild - View guild details
    if (action === 'viewGuild') {
      const guildId = payload.guildId || payload.guild_id || payload.teamname
      const chainKey = payload.chain || 'base'
      
      if (!guildId) {
        return respondJson({ ok: false, reason: 'missing guildId', traces }, { status: 400 })
      }
      
      tracePush(traces, 'viewGuild-start', { guildId, chainKey })
      
      try {
        const chainDisplay = getChainDisplayName(String(chainKey))
        
        // TODO: Implement real guild data once guilds table is created
        // Schema needed: guilds (id, name, chain, created_at), guild_members (guild_id, fid, joined_at, role)
        // For now, using placeholder data - guild system not yet implemented in database
        const guild = {
          id: guildId,
          name: `Guild ${guildId}`,
          members: 42,
          totalPoints: 125000,
          rank: 7,
          chain: chainDisplay,
        }
        
        const message = `⚔️ Guild Info:\n\n` +
                       `Name: ${guild.name}\n` +
                       `Members: ${guild.members}\n` +
                       `Total Points: ${formatInteger(guild.totalPoints)}\n` +
                       `Rank: #${guild.rank}\n` +
                       `Chain: ${guild.chain}\n\n` +
                       `Join the crew! 🛡️`
        
        tracePush(traces, 'viewGuild-success', { guildId, chainKey, guild })
        
        return respondJson({
          ok: true,
          guild,
          message,
          traces,
          durationMs: nowTs() - started
        })
      } catch (err: any) {
        tracePush(traces, 'viewGuild-error', { error: String(err.message || err) })
        return respondJson({ 
          ok: false, 
          reason: 'failed to view guild', 
          error: String(err.message || err),
          traces 
        }, { status: 500 })
      }
    }

    // Phase 1B.1: viewReferrals - View referral statistics
    if (action === 'viewReferrals') {
      const fid = payload.fid || payload.untrustedData?.fid
      const userAddr = payload.user || payload.addr || payload.address
      
      if (!fid && !userAddr) {
        return respondJson({ ok: false, reason: 'missing fid or user address', traces }, { status: 400 })
      }
      
      tracePush(traces, 'viewReferrals-start', { fid, userAddr })
      
      try {
        // TODO: Implement real referral data once referrals table is created
        // Schema needed: referrals (id, referrer_fid, referred_fid, code, created_at, points_earned)
        // For now, using placeholder data - referral system not yet implemented in database
        const referralCode = 'MEOW42'
        const stats = {
          code: referralCode,
          referrals: 15,
          activeReferrals: 12,
          totalPoints: 3750,
          rank: 23,
        }
        
        const message = `🎁 Your Referral Stats:\n\n` +
                       `Code: ${stats.code}\n` +
                       `Total Referrals: ${stats.referrals}\n` +
                       `Active: ${stats.activeReferrals}\n` +
                       `Points Earned: ${formatInteger(stats.totalPoints)}\n` +
                       `Referrer Rank: #${stats.rank}\n\n` +
                       `Share your code! 🚀`
        
        tracePush(traces, 'viewReferrals-success', { fid, userAddr, stats })
        
        return respondJson({
          ok: true,
          fid: fid ? Number(fid) : null,
          user: userAddr,
          referrals: stats,
          message,
          traces,
          durationMs: nowTs() - started
        })
      } catch (err: any) {
        tracePush(traces, 'viewReferrals-error', { error: String(err.message || err) })
        return respondJson({ 
          ok: false, 
          reason: 'failed to view referrals', 
          error: String(err.message || err),
          traces 
        }, { status: 500 })
      }
    }

    // Phase 1B.1: tipUser - Tip points to another user
    if (action === 'tipUser') {
      const fromFid = payload.fid || payload.untrustedData?.fid || payload.fromFid
      const toFid = payload.toFid || payload.to_fid || payload.recipient
      const amount = payload.amount || payload.points || 10
      
      if (!fromFid) {
        return respondJson({ ok: false, reason: 'missing sender fid', traces }, { status: 400 })
      }
      
      if (!toFid) {
        return respondJson({ ok: false, reason: 'missing recipient fid', traces }, { status: 400 })
      }
      
      tracePush(traces, 'tipUser-start', { fromFid, toFid, amount })
      
      try {
        // Mock tip (in production, update database and create transaction)
        const message = `💸 Tip Sent!\n\n` +
                       `From: FID ${fromFid}\n` +
                       `To: FID ${toFid}\n` +
                       `Amount: ${amount} points\n\n` +
                       `Generosity is the way! 🤝`
        
        tracePush(traces, 'tipUser-success', { fromFid, toFid, amount })
        
        return respondJson({
          ok: true,
          from: Number(fromFid),
          to: Number(toFid),
          amount: Number(amount),
          message,
          traces,
          durationMs: nowTs() - started
        })
      } catch (err: any) {
        tracePush(traces, 'tipUser-error', { error: String(err.message || err) })
        return respondJson({ 
          ok: false, 
          reason: 'failed to tip user', 
          error: String(err.message || err),
          traces 
        }, { status: 500 })
      }
    }

    // fallback: echo
    tracePush(traces, 'post-unknown-action', { action, payload })
    return respondJson({ ok: true, message: 'unknown action; no-op', action, payload, traces })
  } catch (e: any) {
    const msg = String(e?.message || e)
    return respondJson({ ok: false, reason: msg, traces: [{ ts: nowTs(), step: 'post-unhandled', info: msg }] }, { status: 500 })
  }
}
*/

/* -------------------- NOTES & ADVICE (for maintainers) --------------------
- This handler intentionally keeps logic in one place to provide a universal
  frame endpoint. For heavy production usage, split responsibilities into
  smaller files (quest/*, guild/*, points/*).
- The route uses gm-utils call creators to create call objects suitable for
  viem/wagmi writeContract/readContract patterns.
- If you have a richer Neynar helper library, import it and replace neynarFetchRaw
  with more advanced utilities for better behavior / retries / billing detection.
- Be cautious about exposing raw traces in production (remove or gate behind debug flag).
- The HTML template is intentionally minimal and mobile-friendly. Replace styles
  with your pixel-art assets/CSS module as needed.
-------------------------------------------------------------------------- */
