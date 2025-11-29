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
  normalizeToGMChain,
  type NormalizedQuest,
  type ChainKey,
  type GMChainKey,
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
  'access-control-allow-methods': 'GET, OPTIONS',
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
  // Normalize the chain string to GMChainKey (handles 'optimism' → 'op')
  const candidateChainKey = normalizeToGMChain(normalizedChain as ChainKey) || 'base'
  const chainKey = isGlobal ? 'base' : candidateChainKey
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
        const chainResolved = normalizeToGMChain(chainValue as ChainKey) || chainKey
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
  headers.set('access-control-allow-methods', 'GET, OPTIONS')
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
      const gmChain = normalizeToGMChain(chainKey as ChainKey) || 'base'
      const address = CONTRACT_ADDRESSES[gmChain]
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
    const gmChain = normalizeToGMChain(chainKey) || 'base'
    const contract = CONTRACT_ADDRESSES[gmChain] as Address
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
function getComposeText(frameType?: string, context?: { 
  title?: string; 
  chain?: string; 
  username?: string; 
  streak?: number; 
  gmCount?: number;
  level?: number;
  tier?: string;
  xp?: number;
  badgeCount?: number;
  progress?: number;
  reward?: number;
}): string {
  const { title, chain, username, streak, gmCount, level, tier, xp, badgeCount, progress, reward } = context || {}
  
  // Helper: Format XP for share text (K/M notation)
  const formatXpForShare = (xpValue: number): string => {
    if (xpValue >= 1_000_000) return `${(xpValue / 1_000_000).toFixed(1)}M`
    if (xpValue >= 10_000) return `${(xpValue / 1000).toFixed(1)}K`
    return xpValue.toLocaleString()
  }
  
  // Helper: Get chain emoji
  const getChainEmoji = (chainName: string): string => {
    const chains: Record<string, string> = {
      base: '🔵', ethereum: '⟠', optimism: '🔴',
      arbitrum: '🔷', polygon: '🟣', avalanche: '🔺',
      celo: '🌿', bnb: '🟡', avax: '🔺'
    }
    return chains[chainName.toLowerCase()] || '🌐'
  }
  
  switch (frameType) {
    case 'gm': {
      // Phase 1F Task 11: Enhanced compose text with XP/level/tier context
      const hour = new Date().getHours()
      let timeEmoji = '🌅'
      let timeGreeting = 'GM'
      
      if (hour >= 5 && hour < 12) {
        timeEmoji = '☀️'
        timeGreeting = 'Good morning'
      } else if (hour >= 12 && hour < 17) {
        timeEmoji = '🌤️'
        timeGreeting = 'Good afternoon'
      } else if (hour >= 17 && hour < 21) {
        timeEmoji = '🌆'
        timeGreeting = 'Good evening'
      } else {
        timeEmoji = '🌙'
        timeGreeting = 'Good night'
      }
      
      // Elite tier: 30+ streak + Level 20+ + Mythic/Star Captain
      if (streak && streak >= 30 && level && level >= 20 && tier && (tier.includes('Mythic') || tier.includes('Star Captain'))) {
        return `${timeEmoji} ${timeGreeting}! 🔥 ${streak}-day streak + Lvl ${level} ${tier}! Unstoppable @gmeowbased`
      }
      
      // Mythic tier unlock
      if (tier && tier.includes('Mythic')) {
        return `${timeEmoji} ${timeGreeting}! 👑 Mythic GM unlocked! ${gmCount || 0} GMs • Join the elite @gmeowbased`
      }
      
      // Great tier: 30+ day streak
      if (streak && streak >= 30) {
        const levelSuffix = level && level >= 10 ? ` • Lvl ${level}` : ''
        return `${timeEmoji} ${timeGreeting}! 🔥 ${streak}-day streak${levelSuffix}! Legendary dedication @gmeowbased`
      }
      
      // Good tier: 7+ day streak
      if (streak && streak >= 7) {
        const levelSuffix = level && level >= 5 ? ` • Lvl ${level}` : ''
        return `${timeEmoji} ${timeGreeting}! ⚡ ${streak}-day streak${levelSuffix}! Hot streak @gmeowbased`
      }
      
      // High count with level
      if (gmCount && gmCount > 100 && level && level >= 10) {
        return `${timeEmoji} ${timeGreeting}! 🌅 ${gmCount} GMs • Lvl ${level}! Join the ritual @gmeowbased`
      }
      
      // High count only
      if (gmCount && gmCount > 100) {
        return `${timeEmoji} ${timeGreeting}! 🌅 ${gmCount} GMs and counting! Join the ritual @gmeowbased`
      }
      
      // Default with level
      if (level && level >= 5) {
        return `${timeEmoji} ${timeGreeting}! Just stacked my daily GM • Lvl ${level}! Join @gmeowbased`
      }
      
      return `${timeEmoji} ${timeGreeting}! Just stacked my daily GM ritual! Join the meow squad @gmeowbased`
    }
    
    case 'quest': {
      // Phase 1F Task 11: Add progress % and XP reward context
      const chainEmoji = chain ? getChainEmoji(chain) : ''
      const chainPrefix = chain ? `${chainEmoji} ` : ''
      
      // High progress (80%+)
      if (progress && progress >= 80) {
        const xpSuffix = reward ? ` • +${reward} XP` : ''
        return `⚔️ Almost done with "${title}"! ${progress}% complete${xpSuffix} ${chainPrefix}@gmeowbased`
      }
      
      // With XP reward
      if (reward && reward > 0) {
        return `⚔️ Quest active: "${title || 'Check it out'}" • Earn +${reward} XP ${chainPrefix}@gmeowbased`
      }
      
      // With chain context
      if (chain) {
        return `⚔️ New quest unlocked ${chainPrefix}on ${chain}! ${title || 'Check it out'} @gmeowbased`
      }
      
      return `⚔️ New quest unlocked! ${title || 'Check it out'} @gmeowbased`
    }
    
    case 'badge': {
      // Phase 1F Task 11: Add badge count and XP from badges
      // High badge count (15+) with XP
      if (badgeCount && badgeCount >= 15 && xp && xp > 0) {
        return `🏆 ${badgeCount} badges collected! +${formatXpForShare(xp)} total XP earned! Badge hunter @gmeowbased`
      }
      
      // High badge count (10+)
      if (badgeCount && badgeCount >= 10) {
        const xpSuffix = xp && xp > 0 ? ` • +${formatXpForShare(xp)} XP` : ''
        return `🏆 ${badgeCount} badges collected${xpSuffix}! Badge master @gmeowbased`
      }
      
      // Medium badge count (5+)
      if (badgeCount && badgeCount >= 5) {
        return `🎖️ ${badgeCount} badges earned${username ? ` by @${username}` : ''}! Growing collection @gmeowbased`
      }
      
      // With XP earned
      if (xp && xp > 0) {
        return `🎖️ New badge unlocked! +${formatXpForShare(xp)} XP earned${username ? ` by @${username}` : ''} @gmeowbased`
      }
      
      return `🎖️ New badge earned${username ? ` by @${username}` : ''}! View the collection @gmeowbased`
    }
    
    case 'points': {
      // Phase 1F Task 11: Add level/tier flex with XP amount
      // Elite tier (Mythic/Star Captain, Level 20+)
      if (tier && (tier.includes('Mythic') || tier.includes('Star Captain')) && level && level >= 20) {
        const xpText = xp ? `${formatXpForShare(xp)} XP` : `Lvl ${level}`
        return `🎯 ${tier} status! ${xpText} earned${username ? ` by @${username}` : ''} • Elite player @gmeowbased`
      }
      
      // High level (15+) with tier
      if (level && level >= 15 && tier) {
        const xpText = xp ? ` • ${formatXpForShare(xp)} XP` : ''
        return `🎯 Lvl ${level} ${tier}${xpText}${username ? ` by @${username}` : ''}! Climbing the ranks @gmeowbased`
      }
      
      // Level milestone (divisible by 5)
      if (level && level >= 10 && level % 5 === 0) {
        return `🎯 Level ${level} milestone${username ? ` by @${username}` : ''}! Keep grinding @gmeowbased`
      }
      
      // With level
      if (level && level >= 5) {
        return `💰 Lvl ${level} Points${username ? ` by @${username}` : ''}! Check my balance @gmeowbased`
      }
      
      return `💰 Check out ${username ? `@${username}'s` : 'my'} gmeowbased Points balance @gmeowbased`
    }
    
    case 'onchainstats': {
      // Phase 1F Task 11: Add level badge and multichain context
      const chainEmoji = chain ? getChainEmoji(chain) : ''
      
      // With level badge
      if (level && level >= 10) {
        const chainSuffix = chain ? ` ${chainEmoji} on ${chain}` : ''
        return `📊 Lvl ${level} onchain stats${chainSuffix}${username ? ` by @${username}` : ''}! View profile @gmeowbased`
      }
      
      // With chain context
      if (chain) {
        return `📊 Flexing onchain stats ${chainEmoji} on ${chain}${username ? ` by @${username}` : ''}! @gmeowbased`
      }
      
      return `📊 Flexing onchain stats${username ? ` by @${username}` : ''}! View my profile @gmeowbased`
    }
    
    case 'leaderboards': {
      // Phase 1F Task 11: Add chain emoji and potential rank mention
      const chainEmoji = chain ? getChainEmoji(chain) : ''
      const chainSuffix = chain ? ` ${chainEmoji} on ${chain}` : ''
      
      return `🏆 Climbing the ranks${chainSuffix}! Check the leaderboard @gmeowbased`
    }
    
    case 'guild':
      return '🛡️ Guild quests are live! Rally your squad @gmeowbased'
    
    case 'referral':
      return '🎁 Join me on gmeowbased! Share quests, earn rewards together @gmeowbased'
    
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
  // Phase 1F Task 11: Additional compose text context
  level?: number // User's XP level
  tier?: string // User's rank tier (Mythic GM, Star Captain, etc.)
  xp?: number // Total XP earned
  badgeCount?: number // Total badges collected
  progress?: number // Quest completion percentage
  reward?: number // Quest XP reward
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
    // Phase 1F Task 11: Additional compose text context
    level,
    tier,
    xp,
    badgeCount,
    progress,
    reward,
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
  // Phase 1F Task 11: Pass all available context for achievement-based messaging
  const composeText = getComposeText(frameType, {
    title: pageTitle,
    chain: chainLabel || undefined,
    username: profile?.username || undefined,
    streak: streak || undefined,
    gmCount: gmCount || undefined,
    level: level || undefined,
    tier: tier || undefined,
    xp: xp || undefined,
    badgeCount: badgeCount || undefined,
    progress: progress || undefined,
    reward: reward || undefined,
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
        /* Use dynamic viewport height for iOS Safari address bar handling */
        min-height: 100dvh;
      }
      /* Fallback for browsers without dvh support */
      @supports not (height: 100dvh) {
        body {
          min-height: 100vh;
        }
      }
      .container {
        max-width: 768px;
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
        color: rgb(226 231 255);
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

      // Phase 1F: Resolve username via Neynar if FID provided
      const fidParam = params.fid || params.userFid
      const fid = fidParam ? sanitizeFID(fidParam) : null
      let username: string | null = null
      let displayName: string | null = null
      if (fid && Ne && typeof (Ne as any).fetchUserByFid === 'function') {
        try {
          const fcUser = await (Ne as any).fetchUserByFid(Number(fid))
          if (fcUser) {
            username = typeof fcUser.username === 'string' && fcUser.username.trim() ? fcUser.username.trim() : null
            displayName = typeof fcUser.displayName === 'string' && fcUser.displayName.trim() ? fcUser.displayName.trim() : null
            tracePush(traces, 'quest-profile-resolved', { fid, username })
          }
        } catch (error: any) {
          tracePush(traces, 'quest-profile-error', String(error?.message || error))
        }
      }

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
      // Phase 1F: Include username and displayName for identity display
      const imageUrl = buildDynamicFrameImageUrl({
        type: 'quest',
        questId: questIdNum,
        chain: chainKey as ChainKey,
        extra: {
          questName,
          reward: rewardSummary || undefined,
          expires: expiresText || undefined,
          progress: completionPercent?.toString() || undefined,
          username,
          displayName,
          fid: fid ? String(fid) : undefined,
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
        // Phase 1F Task 11: Pass quest context for compose text
        progress: completionPercent || undefined,
        reward: quest.rewardPoints || undefined,
      })
      return createHtmlResponse(html)
    }

    if (type === 'verify') {
      // help user start verification: accepts fid and cast or questId
      const fidParam = params.fid || 0
      const fid = Number(fidParam)
      const cast = params.cast || ''
      const questId = params.questId || params.id
      tracePush(traces, 'verify-start', { fid, cast, questId })
      
      // Phase 1F: Resolve Farcaster username for display
      let username: string | null = null
      let displayName: string | null = null
      
      if (fid > 0 && Ne && typeof (Ne as any).fetchUserByFid === 'function') {
        try {
          const fcUser = await (Ne as any).fetchUserByFid(fid)
          if (fcUser) {
            username = fcUser.username?.trim() || null
            displayName = fcUser.displayName?.trim() || null
            tracePush(traces, 'verify-profile-resolved', { fid, username })
          }
        } catch (error: any) {
          tracePush(traces, 'verify-profile-error', String(error?.message || error))
        }
      }
      
      // Phase 1D: Clear verification status messages
      let title = 'Verify Quest • GMEOW'
      let description = ''
      const userDisplay = username ? `@${username}` : displayName || (fid > 0 ? `FID ${fid}` : null)
      
      if (questId) {
        title = `Verify Quest #${questId}`
        description = fid 
          ? `✅ Ready to verify • ${userDisplay} • Quest #${questId} • — @gmeowbased`
          : `⚠️ Connect Farcaster to verify • Quest #${questId} • — @gmeowbased`
      } else if (cast) {
        title = 'Verify Cast'
        description = fid
          ? `✅ Ready to verify cast • ${userDisplay} • — @gmeowbased`
          : `⚠️ Connect Farcaster to verify cast • — @gmeowbased`
      } else {
        title = 'Quest Verification'
        description = fid
          ? `✅ Connected • ${userDisplay} • Ready to verify • — @gmeowbased`
          : `⚠️ Provide quest ID or cast hash to verify • — @gmeowbased`
      }
      
      // Phase 1F: Build dynamic image URL with username
      const imageUrl = buildDynamicFrameImageUrl({
        type: 'verify',
        fid: fid > 0 ? fid : undefined,
        extra: { username, displayName, questId: String(questId || '') }
      }, origin)
      
      if (asJson) {
        return respondJson({ ok: true, type: 'verify', fid, cast, questId, traces })
      }
      const frameBtnUrl = `${origin}/api/quests/verify?debug=1&fid=${fid}${cast ? `&cast=${encodeURIComponent(String(cast))}` : ''}`
      const fcMeta = { [frameKey('entity')]: 'verify' }
      
      // DEPRECATED: Interactive POST buttons no longer supported (removed Phase 1E)
      const html = buildFrameHtml({
        title,
        description,
        image: imageUrl,
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
      
      // Phase 1F: Resolve Farcaster username for display
      const fidParam = params.fid || params.user
      const fid = fidParam ? sanitizeFID(fidParam) : null
      let username: string | null = null
      let displayName: string | null = null
      
      if (fid && Ne && typeof (Ne as any).fetchUserByFid === 'function') {
        try {
          const fcUser = await (Ne as any).fetchUserByFid(Number(fid))
          if (fcUser) {
            username = fcUser.username?.trim() || null
            displayName = fcUser.displayName?.trim() || null
            tracePush(traces, 'guild-profile-resolved', { fid, username })
          }
        } catch (error: any) {
          tracePush(traces, 'guild-profile-error', String(error?.message || error))
        }
      }
      
      // For brevity, we fetch guild info via contract getter if present (createGetGuildCall not implemented by default)
      // We'll fallback to simple frame with join button pointing to your site's guild page
      const title = guildId ? `Guild #${guildId}` : 'Guild'
      const description = guildId ? `Open guild ${guildId} on @gmeowbased` : '@gmeowbased guild preview'
      const guildUrl = `${origin}/guild/${guildId}`
      
      // Phase 1F: Build dynamic image URL with username
      const imageUrl = buildDynamicFrameImageUrl({
        type: 'guild',
        fid: fid || undefined,
        extra: { username, displayName, guildId: String(guildId) }
      }, origin)
      
      if (asJson) return respondJson({ ok: true, type: 'guild', guildId, guildUrl, traces })
      
      // DEPRECATED: Interactive POST buttons no longer supported (removed Phase 1E)
      const guildButtons: FrameButton[] = [
        { label: 'Open Guild', target: guildUrl, action: 'link' },
      ]
      const html = buildFrameHtml({
        title,
        description,
        image: imageUrl,
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
      const code = params.code || params.ref || ''
      const referrerFid = params.referrerFid || params.fid || ''
      const referrerUsername = params.referrerUsername || params.username || ''
      const referralCount = params.referralCount || params.count || '0'
      const rewardAmount = params.rewardAmount || params.rewards || '0'
      
      tracePush(traces, 'referral', { user, code, referrerFid, referrerUsername, referralCount, rewardAmount })
      
      const shareUrl = `${origin}/referral${code ? `?code=${encodeURIComponent(String(code))}` : ''}`
      const title = code ? `Summon Frens • Code ${String(code).toUpperCase()}` : 'Summon Frens • Referral'
      const descriptionPieces: string[] = []
      if (code) descriptionPieces.push(`Share code ${String(code).toUpperCase()} to split gmeowbased Points with frens.`)
      descriptionPieces.push('Each completed quest powers up the guild streaks.')
      if (user) descriptionPieces.push(`Tracked to ${shortenHex(String(user))}`)
      descriptionPieces.push('— @gmeowbased')
      const description = descriptionPieces.join(' • ')
      
      // Build dynamic image URL for referral frame
      const imageUrl = buildDynamicFrameImageUrl({
        type: 'referral',
        chain: params.chain as any,
        user,
        fid: referrerFid ? Number(referrerFid) : undefined,
        referral: code,
        extra: {
          referrerFid,
          referrerUsername,
          referralCount,
          rewardAmount,
          inviteCode: code,
        }
      }, origin)
      
      const fcMeta: Record<string, string> = { [frameKey('entity')]: 'referral' }
      if (code) fcMeta[frameKey('referral_code')] = String(code)
      if (user) fcMeta[frameKey('referral_owner')] = String(user)
      if (asJson) return respondJson({ ok: true, type: 'referral', user, code, shareUrl, description, imageUrl, traces })
      
      // DEPRECATED: Interactive POST buttons no longer supported (removed Phase 1E)
      const referralButtons: FrameButton[] = [
        { label: code ? `Share ${String(code).toUpperCase()}` : 'Open Referral Hub', target: shareUrl, action: 'link' },
      ]
      const html = buildFrameHtml({
        title,
        description,
        image: imageUrl,
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
          username: resolvedProfile?.username || undefined,
          displayName: resolvedProfile?.displayName || undefined,
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
          username: profile?.username || undefined,
          displayName: profile?.displayName || undefined,
          level: levelValue?.toString() || undefined,
          xp: xpCurrentValue?.toString() || undefined,
          xpMax: xpMaxValue?.toString() || undefined,
          tier: tierName || undefined,
          tierPercent: tierPercentValue?.toString() || undefined,
          availablePoints: availableFormatted || undefined,
          lockedPoints: lockedFormatted || undefined,
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
        // Phase 1F Task 11: Pass achievement context for compose text
        level: levelValue || undefined,
        tier: tierName || undefined,
        xp: xpCurrentValue || undefined,
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
      // Phase 1F: Also resolve username for identity display
      let username: string | null = null
      let displayName: string | null = null
      try {
        const userData = await Ne.fetchUserByFid(fid)
        
        // Phase 1F: Extract username and displayName
        if (userData) {
          username = typeof userData.username === 'string' && userData.username.trim() ? userData.username.trim() : null
          displayName = typeof userData.displayName === 'string' && userData.displayName.trim() ? userData.displayName.trim() : null
          tracePush(traces, 'badge-profile-resolved', { fid, username, displayName })
        }
        
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
      let earnedBadgeIcons = '' // Phase 2.1 Task 2.1.1: Store badge icons for collection display
      
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
          
          // Phase 2.1 Task 2.1.1: Extract badge IDs for collection display (up to 9 badges)
          // Pass badge IDs so image route can load actual badge images
          earnedBadgeIcons = userBadges
            .slice(0, 9)
            .map(ub => ub.badge_id)
            .join(',')
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
      
      // Phase 1F: Pass username and displayName to image
      // Phase 2.1: Added earnedBadges for collection display
      const imageUrl = buildDynamicFrameImageUrl({ 
        type: 'badge', 
        fid,
        extra: { 
          username, 
          displayName, 
          earnedCount: String(earnedCount), 
          eligibleCount: String(eligibleCount),
          earnedBadges: earnedBadgeIcons
        }
      }, origin)
      
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
        // Phase 1F Task 11: Pass badge context for compose text
        badgeCount: earnedCount || undefined,
      })
      return createHtmlResponse(html)
    }

    if (type === 'gm') {
      tracePush(traces, 'gm-start')
      
      // Phase 1D: Query real GM data for streak milestone display
      const fidParam = params.fid || params.user
      const fid = fidParam ? sanitizeFID(fidParam) : null
      
      // Phase 1F: Resolve username via Neynar
      let username: string | null = null
      let displayName: string | null = null
      if (fid && Ne && typeof (Ne as any).fetchUserByFid === 'function') {
        try {
          const fcUser = await (Ne as any).fetchUserByFid(Number(fid))
          if (fcUser) {
            username = typeof fcUser.username === 'string' && fcUser.username.trim() ? fcUser.username.trim() : null
            displayName = typeof fcUser.displayName === 'string' && fcUser.displayName.trim() ? fcUser.displayName.trim() : null
            tracePush(traces, 'gm-profile-resolved', { fid, username, displayName })
          }
        } catch (error: any) {
          tracePush(traces, 'gm-profile-error', String(error?.message || error))
        }
      }
      
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
      // Phase 1F: Include username and displayName for proper identity display
      const imageUrl = fid ? buildDynamicFrameImageUrl({ 
        type: 'gm', 
        fid, 
        extra: { gmCount, streak, username, displayName } 
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
        // Phase 1F Task 11: Pass GM context for compose text
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
 * - Phase 1F Task 6: Removed POST handler entirely (moved to backups/deprecated-post-handler-phase1e.tsx)
 * ==================================================================================
 */

/* POST handler removed in Phase 1F Task 6 (November 23, 2025)
 * Reason: Farcaster deprecated POST buttons in 2024, all frames use 'link' actions
 * Backup location: backups/deprecated-post-handler-phase1e.tsx
 * For future reference if POST buttons are re-enabled by Farcaster
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
