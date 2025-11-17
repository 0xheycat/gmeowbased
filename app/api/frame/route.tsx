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
import { buildFrameShareUrl } from '@/lib/share'
import {
  sanitizeFID,
  sanitizeQuestId,
  sanitizeChainKey as validateChainKey,
  sanitizeFrameType,
  sanitizeButtons,
} from '@/lib/frame-validation'
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

function frameButtonKey(index: number, ...parts: Array<string | number>): string {
  const suffix = parts.length ? `:${parts.join(':')}` : ''
  return `${FRAME_PREFIX}:button:${index}${suffix}`
}

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
type FrameType = 'quest' | 'guild' | 'points' | 'referral' | 'leaderboard' | 'gm' | 'verify' | 'onchainstats' | 'generic'

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
  leaderboard: handleLeaderboardFrame,
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

  const descriptionSegments = [leaderNarrative, xpNarrative, squadNarrative, seasonNarrative, isGlobal ? 'All chains combined.' : `${chainDisplay} leaderboard.`, syncNarrative]
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
  const referralFrameUrl = referralIdentifier
    ? buildFrameShareUrl({ type: 'referral', chain: topEntry?.chain ?? chainKey, referral: referralIdentifier })
    : ''
  const referralLandingUrl = topEntry
    ? `${origin}/referral${referralCode ? `?code=${encodeURIComponent(referralCode)}` : `?addr=${encodeURIComponent(topEntry.address)}`}`
    : ''

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
    type: 'leaderboard' as const,
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

  const openUrlParam = toOptionalString(params.openUrl) ?? toOptionalString(params.openTarget)
  const openUrl = toAbsoluteUrl(openUrlParam, origin) ?? href
  const openLabelParam = toOptionalString(params.openLabel) ?? toOptionalString(params.openText)

  const challengeUrlParam = toOptionalString(params.challengeUrl) ?? toOptionalString(params.challengeTarget)
  const challengeUrl = toAbsoluteUrl(challengeUrlParam, origin)
  const challengeLabelParam = toOptionalString(params.challengeLabel) ?? toOptionalString(params.challengeText)

  const referralOverrideParam = toOptionalString(params.referralUrl) ?? toOptionalString(params.recruitUrl)
  const referralOverrideUrl = toAbsoluteUrl(referralOverrideParam, origin)
  const referralLabelParam = toOptionalString(params.referralLabel) ?? toOptionalString(params.recruitLabel)
  const referralFallbackLabel = referralCode ? `Join ${referralCode}` : 'Recruit a Pilot'
  const referralTarget = referralOverrideUrl || referralFrameUrl || referralLandingUrl || href

  const mintUrlParam = toOptionalString(params.mintUrl)
  const mintUrl = toAbsoluteUrl(mintUrlParam, origin) ?? `${origin}/api/nft/mint?type=leaderboard&chain=${isGlobal ? 'all' : chainKey}&season=${rawSeason || 'current'}`

  const leaderboardButtons = buildContextualButtons({
    type: 'leaderboard',
    fallback: [{ label: 'Open Leaderboard', target: href }],
    leaderboard: {
      openUrl,
      openLabel: openLabelParam,
      challengeUrl,
      challengeLabel: challengeLabelParam,
      referralUrl: referralIdentifier ? referralTarget : null,
      referralLabel: referralIdentifier ? (referralLabelParam || referralFallbackLabel) : null,
      mintUrl: mintUrl,
      mintLabel: toOptionalString(params.mintLabel),
    },
  })

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
  })
  return createHtmlResponse(html)
}

// -------------------- Utilities --------------------
const nowTs = () => Date.now()

function tracePush(traces: Trace, step: string, info?: any) {
  traces.push({ ts: nowTs(), step, info })
  return traces
}

function safeJson(obj: any) {
  // Avoid circular structures — use deterministic replacer
  const seen = new WeakSet()
  return JSON.parse(JSON.stringify(obj, (_k, v) => {
    if (typeof v === 'bigint') return v.toString()
    if (v && typeof v === 'object') {
      if (seen.has(v)) return '[Circular]'
      seen.add(v)
    }
    return v
  }))
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

function toAbsoluteUrl(raw: string | null | undefined, origin: string): string | null {
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

type QuestButtonPlan = {
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

type ContextualButtonPlan = {
  type: FrameType
  fallback: FrameButton[]
  quest?: QuestButtonPlan
  guild?: GuildButtonPlan
  referral?: ReferralButtonPlan
  points?: PointsButtonPlan
  leaderboard?: LeaderboardButtonPlan
}

function buildContextualButtons(plan: ContextualButtonPlan): FrameButton[] {
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
  } else if (type === 'leaderboard' && plan.leaderboard) {
    const { openUrl, openLabel, referralUrl, referralLabel, challengeUrl, challengeLabel, mintUrl, mintLabel } = plan.leaderboard
    push(mintUrl ? { label: mintLabel || '🎴 Mint Rank Card', target: mintUrl } : null)
    push(openUrl ? { label: openLabel || 'Open Leaderboard', target: openUrl } : null)
    push(challengeUrl ? { label: challengeLabel || 'Challenge The Lead', target: challengeUrl } : null)
    push(referralUrl ? { label: referralLabel || 'Join Crew', target: referralUrl } : null)
  }

  return deduped.length ? deduped : fallback
}

export interface OverlayProfile {
  username: string | null
  displayName: string | null
  pfpUrl: string | null
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
}) {
  const {
    title,
    description,
    image,
    url,
    buttons = [],
    fcMeta,
    debug,
    profile,
    kicker,
    chainIcon,
    chainLabel,
    chainKey,
    frameOrigin,
    frameVersion,
    hideOverlay,
    heroBadge,
    heroStats = [],
    heroList = [],
  } = params
  const pageTitle = escapeHtml(title)
  const rawDescription = description || ''
  const desc = escapeHtml(rawDescription)
  const urlEsc = escapeHtml(url || '')
  // CRITICAL: Farcaster requires fc:frame:image tag - fallback to gmeow.gif if no image provided
  // This preserves dynamic OG images but ensures frames always have an image
  const resolvedImage = image || (frameOrigin ? `${frameOrigin}/og-image.png` : '')
  const imageEsc = resolvedImage ? escapeHtml(resolvedImage) : ''
  const overlayHidden = Boolean(hideOverlay)
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
  const overlayTopHtml = normalizedProfile
    ? `<div class="overlay-top">${overlayProfileHtml}<div class="overlay-heading">${overlayHeadingInner}</div></div>`
    : `<div class="overlay-heading">${overlayHeadingInner}</div>`
  const overlayDetailsFallback = !primaryOverlaySegment ? `<div class="overlay-text">${desc}</div>` : ''
  const overlayDetailsHtml = overlaySecondaryHtml || overlayDetailsFallback
  const overlayFooterHtml = listHtml
  const overlayHtml = overlayHidden
    ? ''
    : `
    ${overlayTopHtml}
    ${overlayDetailsHtml}
    ${overlayFooterHtml}
  `
  const accessibleDescriptionHtml = `<p>${desc || pageTitle}</p>`
  
  // Enforce 4-button limit per Farcaster vNext spec
  const { buttons: validatedButtons, truncated, originalCount } = sanitizeButtons(buttons)
  if (truncated) {
    console.warn(`[buildFrameHtml] Button limit exceeded: ${originalCount} buttons provided, truncated to 4`)
  }
  
  const linkButtons = validatedButtons.filter((btn) => (btn.action ?? 'link') === 'link' && !!btn.target)
  const buttonHtml = validatedButtons
    .map((btn, idx) => {
      const index = idx + 1
      const action = btn.action ?? 'link'
      const label = escapeHtml(btn.label)
      const rawTarget = btn.target ?? ''
      const target = rawTarget ? escapeHtml(rawTarget) : ''
      const actionMeta = action === 'link' ? '' : `<meta property="${frameButtonKey(index, 'action')}" content="${action}" />`
      const targetMeta = target ? `\n<meta property="${frameButtonKey(index, 'target')}" content="${target}" />` : ''
      const joiner = actionMeta ? `\n${actionMeta}` : ''
      return `<meta property="${frameButtonKey(index)}" content="${label}" />${joiner}${targetMeta}`
    })
    .join('\n')
  const primaryLink = linkButtons[0]
  const primaryLinkHtml = primaryLink && primaryLink.target
    ? `<a class="btn" href="${escapeHtml(primaryLink.target)}">${escapeHtml(primaryLink.label)}</a>`
    : ''
  const metaDefaults: Record<string, string> = {
    [frameKey('version')]: String(frameVersion ?? '1.2'),
  }
  if (frameOrigin) metaDefaults[frameKey('origin')] = frameOrigin
  if (chainKey) metaDefaults[frameKey('chain_key')] = chainKey
  const mergedMeta: Record<string, string> = {
    ...metaDefaults,
    ...(fcMeta ?? {}),
  }
  const fcMetaTags = Object.entries(mergedMeta)
    .filter(([, value]) => value !== null && value !== undefined && `${value}`.length > 0)
    .map(([k, v]) => `<meta property="${escapeHtml(k)}" content="${escapeHtml(String(v))}" />`)
    .join('\n')
  const debugHtml = debug
    ? `<details class="debug-panel" open><summary>Debug payload</summary><pre>${escapeHtml(JSON.stringify(debug, null, 2))}</pre></details>`
    : ''
  const chainDataAttr = chainKey ? ` data-chain="${escapeHtml(chainKey)}"` : ''
  return `<!doctype html>
  <html lang="en"${chainDataAttr}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${pageTitle}</title>
    <meta name="description" content="${desc}" />
    <meta property="og:title" content="${pageTitle}" />
    <meta property="og:description" content="${desc}" />
    ${imageEsc ? `<meta property="og:image" content="${imageEsc}" />` : ''}
    <meta property="og:url" content="${urlEsc}" />
    <!-- Farcaster Frame v1.0 (inline rendering in feed) -->
    <meta property="fc:frame:manifest" content="${frameOrigin || ''}/.well-known/farcaster.json" />
    ${imageEsc ? `<meta property="fc:frame:image" content="${imageEsc}" />\n    <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />` : ''}
    ${buttonHtml}
    ${fcMetaTags}
    <style>
      :root {
        --bg:#040510;
        --bg-gradient:radial-gradient(120% 160% at 20% 20%,rgba(124,92,255,0.35) 0%,rgba(66,179,255,0.18) 45%,rgba(4,5,16,0.95) 92%);
        --card:rgba(10,14,34,0.78);
        --card-border:rgba(126,141,255,0.35);
        --card-shadow:0 18px 38px rgba(9,13,44,0.55);
        --muted:rgba(226,231,255,0.82);
        --muted-soft:rgba(165,178,216,0.7);
        --accent:#8e7cff;
        --accent-strong:#5ad2ff;
        --accent-shadow:0 12px 30px rgba(90,210,255,0.32);
        --grid-line:rgba(142,124,255,0.22);
        --glass:rgba(12,16,42,0.86);
        --glass-border:rgba(142,124,255,0.42);
        --halo:linear-gradient(120deg,rgba(94,113,255,0.75),rgba(90,210,255,0.28),rgba(255,255,255,0));
        --halo-bottom:radial-gradient(120% 80% at 50% 100%,rgba(90,210,255,0.25) 0%,rgba(8,18,58,0) 72%);
        --list-marker:linear-gradient(135deg,#8e7cff 0%,#5ad2ff 100%);
      }
      :root[data-chain="base"] {
        --accent:#0052ff;
        --accent-strong:#4da3ff;
        --accent-shadow:0 12px 30px rgba(77,163,255,0.32);
        --bg-gradient:radial-gradient(120% 160% at 15% 20%,rgba(0,82,255,0.32) 0%,rgba(5,25,72,0.92) 65%,rgba(4,5,16,0.96) 100%);
        --grid-line:rgba(77,163,255,0.22);
        --glass-border:rgba(96,154,255,0.48);
      }
      :root[data-chain="op"] {
        --accent:#ff0420;
        --accent-strong:#ff5a5a;
        --accent-shadow:0 12px 30px rgba(255,90,90,0.32);
        --bg-gradient:radial-gradient(110% 150% at 20% 15%,rgba(255,25,45,0.35) 0%,rgba(56,4,8,0.92) 60%,rgba(4,5,16,0.96) 100%);
        --grid-line:rgba(255,90,90,0.22);
        --glass-border:rgba(255,96,130,0.5);
      }
      :root[data-chain="celo"] {
        --accent:#35d07f;
        --accent-strong:#54e0a0;
        --accent-shadow:0 12px 30px rgba(84,224,160,0.32);
        --bg-gradient:radial-gradient(110% 160% at 20% 20%,rgba(53,208,127,0.32) 0%,rgba(5,48,24,0.92) 62%,rgba(4,5,16,0.96) 100%);
        --grid-line:rgba(84,224,160,0.24);
        --glass-border:rgba(84,224,160,0.46);
      }
      :root[data-chain="unichain"] {
        --accent:#ab78ff;
        --accent-strong:#c99aff;
        --accent-shadow:0 12px 30px rgba(201,154,255,0.34);
        --bg-gradient:radial-gradient(120% 150% at 25% 22%,rgba(171,120,255,0.34) 0%,rgba(36,12,66,0.9) 62%,rgba(4,5,16,0.96) 100%);
        --grid-line:rgba(171,120,255,0.24);
        --glass-border:rgba(190,150,255,0.48);
      }
      :root[data-chain="ink"] {
        --accent:#ffb700;
        --accent-strong:#ffd866;
        --accent-shadow:0 12px 30px rgba(255,216,102,0.32);
        --bg-gradient:radial-gradient(120% 150% at 18% 18%,rgba(255,183,0,0.32) 0%,rgba(60,38,0,0.9) 60%,rgba(4,5,16,0.96) 100%);
        --grid-line:rgba(255,214,102,0.24);
        --glass-border:rgba(255,214,102,0.48);
      }
      @keyframes floatCard {
        0%,100% { transform: translateY(0px) scale(1); }
        50% { transform: translateY(-4px) scale(1.005); }
      }
      @keyframes shimmer {
        0% { opacity: 0.65; }
        50% { opacity: 1; }
        100% { opacity: 0.65; }
      }
      @keyframes holoSweep {
        0% { transform: translateX(-40%) skewX(-12deg); opacity: 0; }
        45% { opacity: 0.35; }
        100% { transform: translateX(140%) skewX(-12deg); opacity: 0; }
      }
      @keyframes cardPulse {
        0%,100% { opacity: 0.15; }
        50% { opacity: 0.32; }
      }
      html,body{
        height:100%;
        margin:0;
        background:var(--bg);
        font-family:"Inter",ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,"Helvetica Neue",Arial,sans-serif;
        color:#f6f7ff;
      }
      body::before {
        content:"";
        position:fixed;
        inset:0;
        background:var(--bg-gradient);
        opacity:0.95;
        animation:shimmer 12s ease-in-out infinite;
        z-index:-2;
      }
      body::after {
        content:"";
        position:fixed;
        inset:0;
        background:radial-gradient(220% 220% at 80% 0%,rgba(94,113,255,0.22) 0%,rgba(4,5,16,0.25) 52%,rgba(4,5,16,0.92) 100%);
        z-index:-1;
      }
      .wrap{
        max-width:720px;
        margin:18px auto 24px;
        padding:0 16px;
      }
      .card{
        background:var(--card);
        border:1px solid var(--card-border);
        border-radius:22px;
        padding:20px;
        backdrop-filter:blur(22px);
        box-shadow:var(--card-shadow);
        animation:floatCard 10s ease-in-out infinite;
        position:relative;
        display:flex;
        flex-direction:column;
        gap:20px;
        transform-style:preserve-3d;
      }
      .card.card-3d{
        border:2px solid rgba(255,215,0,0.6);
        box-shadow:0 32px 60px rgba(9,14,44,0.68), 
                   inset 0 1px 0 rgba(255,255,255,0.15),
                   inset 0 0 60px rgba(255,215,0,0.1),
                   0 0 20px rgba(255,215,0,0.3);
        transform:perspective(1100px) rotateX(2deg) rotateY(-1.2deg);
        transition:transform 0.5s ease, box-shadow 0.5s ease;
        background:linear-gradient(135deg, rgba(10,14,34,0.95) 0%, rgba(20,24,44,0.92) 100%);
      }
      .card.card-3d:hover{
        transform:perspective(1100px) rotateX(0.6deg) rotateY(-0.4deg) translateY(-4px);
        box-shadow:0 36px 70px rgba(12,20,60,0.72), 
                   inset 0 1px 0 rgba(255,255,255,0.2),
                   inset 0 0 80px rgba(255,215,0,0.15),
                   0 0 30px rgba(255,215,0,0.5);
      }
      .card.card-3d::before {
        content:"";
        position:absolute;
        inset:-32% -58% auto;
        height:160px;
        background:linear-gradient(120deg,rgba(255,215,0,0.4),rgba(255,180,0,0.2),rgba(255,255,255,0));
        transform:rotate(6deg);
        opacity:0.4;
        pointer-events:none;
        filter:blur(1px);
      }
      .card.card-3d::after{
        content:"";
        position:absolute;
        inset:auto -40% -48px -40%;
        height:140px;
        background:radial-gradient(120% 80% at 50% 100%,rgba(90,210,255,0.22) 0%,rgba(8,18,58,0) 72%);
        pointer-events:none;
        transform:translateZ(-30px);
      }
      .holo-card{
        overflow:hidden;
        isolation:isolate;
      }
      .card-chrome{
        position:absolute;
        inset:-32% -60% auto;
        height:180px;
        background:var(--halo);
        opacity:0.25;
        filter:blur(18px);
        pointer-events:none;
        transform:rotate(8deg);
        mix-blend-mode:screen;
      }
      .card-chrome-bottom{
        inset:auto -48% -60% -48%;
        height:160px;
        background:var(--halo-bottom);
        opacity:0.4;
        transform:none;
      }
      .card-grid{
        position:absolute;
        inset:0;
        pointer-events:none;
        border-radius:inherit;
        background-image:linear-gradient(0deg,transparent 0%,transparent 88%,var(--grid-line) 92%),linear-gradient(90deg,transparent 0%,transparent 88%,var(--grid-line) 92%);
        background-size:120px 120px;
        opacity:0.18;
        mix-blend-mode:screen;
        animation:cardPulse 14s ease-in-out infinite;
      }
      .sr-only{
        position:absolute;
        width:1px;
        height:1px;
        padding:0;
        margin:-1px;
        overflow:hidden;
        clip:rect(0,0,0,0);
        white-space:nowrap;
        border:0;
      }
      .hero{
        position:relative;
        border-radius:16px;
        overflow:hidden;
        box-shadow:0 14px 28px rgba(8,18,58,0.55);
        min-height:200px;
      }
      .hero-holo .hero-img{
        filter:saturate(1.05) contrast(1.05);
      }
      .hero-glow,
      .hero-grid{
        position:absolute;
        inset:0;
        pointer-events:none;
      }
      .hero-glow{
        background:radial-gradient(140% 140% at 85% 20%,rgba(255,255,255,0.16) 0%,rgba(90,210,255,0.22) 32%,rgba(8,12,30,0.85) 72%);
        mix-blend-mode:screen;
        opacity:0.4;
      }
      .hero-grid{
        background-image:linear-gradient(0deg,rgba(255,255,255,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.06) 1px,transparent 1px);
        background-size:80px 80px;
        opacity:0.18;
        animation:cardPulse 12s ease-in-out infinite;
      }
      .hero-img{
        display:block;
        width:100%;
        height:100%;
        object-fit:cover;
      }
      .hero-overlay{
        position:absolute;
        inset:0;
        display:flex;
        flex-direction:column;
        justify-content:flex-start;
        align-items:stretch;
        padding:28px 30px;
        background:linear-gradient(18deg,rgba(4,7,22,0.82) 0%,rgba(4,5,16,0.28) 62%,rgba(4,5,16,0) 100%);
        gap:18px;
      }
      .overlay-top{
        display:flex;
        align-items:flex-start;
        gap:18px;
        flex-wrap:wrap;
      }
      .overlay-heading{
        display:flex;
        flex-direction:column;
        gap:10px;
        min-width:0;
        flex:1 1 320px;
      }
      .overlay-title{
        font-size:30px;
        font-weight:800;
        letter-spacing:0.02em;
        color:#f8f9ff;
      }
      .overlay-kicker{
        font-size:12px;
        font-weight:700;
        letter-spacing:0.26em;
        text-transform:uppercase;
        color:#ffd700;
        padding:8px 14px;
        border-radius:999px;
        display:inline-flex;
        align-items:center;
        gap:8px;
        background:linear-gradient(135deg, rgba(255,215,0,0.25), rgba(255,180,0,0.15));
        border:1.5px solid rgba(255,215,0,0.5);
        font-family:"GMeow", var(--site-font, system-ui, -apple-system, Segoe UI, sans-serif);
        text-shadow:0 0 10px rgba(255,215,0,0.8), 0 1px 3px rgba(0,0,0,0.8);
        box-shadow:0 4px 12px rgba(255,215,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2);
      }
      .overlay-kicker span{
        display:inline-flex;
        align-items:center;
        line-height:1;
        letter-spacing:inherit;
      }
      .overlay-kicker-chain{
        padding-right:16px;
      }
      .overlay-chain-icon{
        width:18px;
        height:18px;
        border-radius:6px;
        object-fit:contain;
        background:rgba(4,5,16,0.65);
        box-shadow:0 0 14px rgba(90,210,255,0.32);
      }
      .overlay-text{
        font-size:16px;
        font-weight:600;
        color:var(--muted);
        line-height:1.55;
        max-width:72%;
        text-shadow:0 8px 18px rgba(8,18,58,0.42);
        font-family:"GMeow", var(--site-font, system-ui, -apple-system, Segoe UI, sans-serif);
      }
      .overlay-list{
        padding:0;
        margin:0;
        list-style:none;
        display:flex;
        flex-direction:column;
        gap:9px;
        min-width:0;
        font-family:"GMeow", var(--site-font, system-ui, -apple-system, Segoe UI, sans-serif);
      }
      .overlay-list li{
        position:relative;
        padding-left:16px;
        font-size:15px;
        font-weight:600;
        color:#f4f5ff;
        line-height:1.6;
        font-family:"GMeow", var(--site-font, system-ui, -apple-system, Segoe UI, sans-serif);
      }
      .overlay-list li::before{
        content:"";
        position:absolute;
        left:0;
        top:8px;
        width:7px;
        height:7px;
        border-radius:999px;
        background:var(--list-marker);
        box-shadow:0 0 10px rgba(90,210,255,0.6);
      }
      .overlay-list-grid{
        display:flex;
        gap:20px;
        flex-wrap:wrap;
        width:100%;
      }
      .overlay-list-grid .overlay-list{
        flex:1 1 240px;
      }
      .overlay-list-grid-card{
        gap:18px;
      }
      .overlay-list-grid-card .overlay-list{
        flex:1 1 200px;
        padding:16px 18px;
        border-radius:18px;
        background:linear-gradient(135deg,var(--glass),rgba(18,28,72,0.6));
        border:1px solid var(--glass-border);
        box-shadow:0 20px 46px rgba(8,18,58,0.48), inset 0 1px 0 rgba(255,255,255,0.08);
      }
      .overlay-profile{
        position:relative;
        display:flex;
        align-items:center;
        gap:18px;
        padding:16px 20px;
        border-radius:20px;
        background:linear-gradient(140deg,var(--glass),rgba(26,38,88,0.58));
        border:1px solid var(--glass-border);
        backdrop-filter:blur(18px);
        box-shadow:0 26px 48px rgba(8,18,58,0.48), inset 0 1px 0 rgba(255,255,255,0.12);
        overflow:hidden;
        isolation:isolate;
      }
      .identity-card-glow{
        position:absolute;
        inset:-40% -60% auto;
        height:160%;
        background:linear-gradient(145deg,var(--accent) 0%,rgba(255,255,255,0.16) 45%,rgba(255,255,255,0));
        opacity:0.38;
        filter:blur(38px);
        transform:rotate(8deg);
        pointer-events:none;
      }
      .identity-card-body{
        position:relative;
        display:flex;
        align-items:center;
        gap:18px;
        z-index:1;
      }
      .identity-avatar-shell{
        position:relative;
        width:68px;
        height:68px;
        border-radius:22px;
        background:rgba(8,12,32,0.72);
        display:flex;
        align-items:center;
        justify-content:center;
        box-shadow:0 22px 42px rgba(8,18,58,0.55);
      }
      .identity-avatar{
        width:64px;
        height:64px;
        border-radius:20px;
        object-fit:cover;
        border:2px solid rgba(255,255,255,0.85);
        box-shadow:0 16px 30px rgba(8,18,58,0.55);
      }
      .identity-avatar-fallback{
        width:64px;
        height:64px;
        border-radius:20px;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:24px;
        font-weight:700;
        letter-spacing:0.02em;
        color:#0a1028;
        background:linear-gradient(135deg,rgba(255,255,255,0.96),rgba(200,215,255,0.88));
        border:2px solid rgba(255,255,255,0.85);
        box-shadow:0 16px 30px rgba(8,18,58,0.55);
      }
      .identity-avatar-ring{
        position:absolute;
        inset:-12px;
        border-radius:28px;
        border:1px solid rgba(255,255,255,0.24);
        box-shadow:0 0 30px rgba(142,124,255,0.45);
        opacity:0.7;
      }
      .overlay-profile-text{
        position:relative;
        display:flex;
        flex-direction:column;
        gap:6px;
        z-index:1;
      }
      .identity-card-text{
        gap:8px;
      }
      .identity-badge-wrap{
        display:flex;
        align-items:center;
        gap:8px;
      }
      .overlay-handle{
        font-size:17px;
        font-weight:700;
        color:#ffffff;
        letter-spacing:0.01em;
        font-family:"GMeow", var(--site-font, system-ui, -apple-system, Segoe UI, sans-serif);
      }
      .identity-handle{
        font-size:19px;
      }
      .overlay-name{
        font-size:14px;
        color:var(--muted);
        letter-spacing:0.015em;
        font-family:"GMeow", var(--site-font, system-ui, -apple-system, Segoe UI, sans-serif);
      }
      .identity-name{
        color:rgba(202,210,255,0.82);
      }
      .identity-card-kicker{
        margin-top:6px;
      }
      .identity-card-kicker .overlay-kicker{
        padding:6px 12px;
        font-size:11px;
        letter-spacing:0.22em;
      }
      .overlay-badge{
        display:inline-flex;
        align-items:center;
        gap:8px;
        align-self:flex-start;
        padding:6px 12px;
        border-radius:999px;
        font-size:13px;
        font-weight:600;
        letter-spacing:0.02em;
        background:rgba(126,243,199,0.18);
        color:#7ef3c7;
        border:1px solid rgba(126,243,199,0.38);
        box-shadow:0 0 18px rgba(126,243,199,0.28);
      }
      .overlay-badge-violet{background:rgba(124,92,255,0.22);color:#d0b9ff;border-color:rgba(124,92,255,0.4);box-shadow:0 0 18px rgba(124,92,255,0.28);}
      .overlay-badge-gold{background:rgba(255,214,102,0.2);color:#ffd766;border-color:rgba(255,214,102,0.42);box-shadow:0 0 22px rgba(255,214,102,0.3);}
      .overlay-badge-blue{background:rgba(64,186,255,0.22);color:#85dcff;border-color:rgba(64,186,255,0.38);box-shadow:0 0 20px rgba(64,186,255,0.26);}
      .overlay-badge-pink{background:rgba(255,143,200,0.22);color:#ffb2df;border-color:rgba(255,143,200,0.38);box-shadow:0 0 20px rgba(255,143,200,0.28);}
      .overlay-badge-icon{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        width:16px;
        height:16px;
        border-radius:999px;
        background:rgba(255,255,255,0.16);
        font-size:11px;
      }
      .overlay-metrics{
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(120px,1fr));
        gap:10px;
        margin-top:8px;
      }
      .overlay-metric{
        padding:10px 12px;
        border-radius:14px;
        background:rgba(12,15,28,0.62);
        border:1px solid rgba(126,141,255,0.26);
        display:flex;
        flex-direction:column;
        gap:4px;
      }
      .overlay-metric strong{
        font-size:17px;
        color:#f9fbff;
        letter-spacing:0.01em;
      }
      .overlay-metric-label{
        font-size:11px;
        text-transform:uppercase;
        color:rgba(187,196,255,0.72);
        letter-spacing:0.14em;
      }
      .overlay-metric.overlay-metric-accent{
        background:rgba(126,243,199,0.2);
        border-color:rgba(126,243,199,0.45);
      }
      .overlay-metric.overlay-metric-accent strong{color:#7ef3c7;}
      .overlay-hierarchy{
        margin-top:12px;
        display:flex;
        flex-direction:column;
        gap:10px;
      }
      .overlay-hierarchy-item{
        display:flex;
        align-items:flex-start;
        gap:10px;
        padding:10px 12px;
        border-radius:12px;
        background:rgba(9,13,36,0.72);
        border:1px solid rgba(83,109,255,0.26);
        box-shadow:0 10px 22px rgba(7,11,28,0.45);
      }
      .overlay-hierarchy-icon{font-size:16px;color:rgba(124,92,255,0.85);line-height:1;}
      .overlay-hierarchy-primary{font-weight:700;font-size:14px;color:#f6f7ff;}
      .overlay-hierarchy-secondary{font-size:12px;color:rgba(205,215,255,0.75);margin-top:2px;}
      .btn{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        gap:10px;
        padding:12px 20px;
        border-radius:12px;
        font-weight:700;
        font-size:15px;
        letter-spacing:0.01em;
        text-decoration:none;
        color:#ffd700;
        background:linear-gradient(135deg, rgba(255,215,0,0.3), rgba(255,180,0,0.2));
        box-shadow:0 8px 20px rgba(255,215,0,0.25), inset 0 1px 0 rgba(255,255,255,0.2);
        border:2px solid rgba(255,215,0,0.6);
        transition:transform 0.25s ease, box-shadow 0.25s ease;
        text-shadow:0 0 8px rgba(255,215,0,0.6), 0 1px 3px rgba(0,0,0,0.8);
      }
      .btn:hover{
        transform:translateY(-2px) scale(1.01);
        box-shadow:0 12px 28px rgba(255,215,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3);
        background:linear-gradient(135deg, rgba(255,215,0,0.4), rgba(255,180,0,0.3));
        border-color:rgba(255,215,0,0.8);
      }
      .btn:active{
        transform:translateY(1px) scale(0.99);
      }
      .button-group{
        display:flex;
        flex-wrap:wrap;
        gap:12px;
        margin:0 0 14px;
      }
      .meta-row{
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        align-items:center;
        margin-top:6px;
        color:var(--muted-soft);
        font-size:13px;
      }
      .debug{margin-top:18px}
      .debug-panel{margin-top:18px;background:#02040a;border-radius:14px;padding:12px 0;border:1px solid rgba(126,141,255,0.3);box-shadow:0 12px 30px rgba(5,11,42,0.35);}
      .debug-panel summary{padding:0 16px;font-weight:600;font-size:14px;color:#69ff94;cursor:pointer;}
      .debug-panel pre{margin:12px 16px;background:transparent;color:#69ff94;max-height:360px;overflow:auto;font-size:12px;line-height:1.6;}
      @media (max-width:640px){
        .wrap{max-width:100%;margin:16px auto 22px;padding:0 14px;}
        .card{padding:18px;gap:18px;}
        .hero{min-height:180px;}
        .hero-overlay{padding:18px 20px;gap:14px;}
        .overlay-heading{gap:8px;}
        .overlay-title{font-size:26px;}
        .overlay-text{max-width:100%;font-size:15px;}
        .overlay-list li{font-size:14px;}
        .overlay-metrics{gap:8px;}
        .overlay-metric strong{font-size:16px;}
        .button-group{flex-direction:column;gap:10px;}
      }
      @media (max-width:480px){
        .wrap{padding:0 10px;margin:14px auto 18px;}
        .card{padding:16px;border-radius:18px;gap:16px;}
        .card.card-3d{transform:none;box-shadow:0 20px 40px rgba(9,14,44,0.55);}
        .hero{min-height:160px;}
        .hero-overlay{padding:12px 14px;gap:10px;}
        .overlay-top{flex-direction:row;align-items:flex-start;gap:10px;}
        .overlay-heading{flex:1 1 100%;max-width:100%;gap:6px;}
        .overlay-profile{padding:12px 14px;gap:10px;}
        .identity-card-body{gap:10px;}
        .identity-avatar-shell{width:54px;height:54px;}
        .identity-avatar,
        .identity-avatar-fallback{width:50px;height:50px;border-radius:16px;}
        .identity-avatar-ring{inset:-9px;}
        .overlay-handle{font-size:15px;}
        .identity-handle{font-size:16px;}
        .overlay-name{font-size:11px;}
        .identity-card-kicker .overlay-kicker{font-size:10px;letter-spacing:0.2em;padding:6px 10px;justify-content:center;width:100%;}
        .overlay-kicker{font-size:10px;letter-spacing:0.18em;padding:6px 10px;}
        .overlay-kicker-chain{padding-right:10px;}
        .overlay-chain-icon{width:16px;height:16px;}
        .overlay-title{max-width:100%;font-size:20px;}
        .overlay-text{max-width:100%;font-size:14px;line-height:1.55;}
        .overlay-list{font-size:12px;}
        .overlay-list li{padding-left:14px;}
        .overlay-list-grid{flex-direction:column;gap:10px;}
        .overlay-list-grid-card .overlay-list{padding:10px 12px;border-radius:14px;}
        .overlay-metrics{grid-template-columns:repeat(2,minmax(120px,1fr));gap:6px;}
        .overlay-hierarchy-item{flex-direction:column;gap:6px;}
        .overlay-hierarchy-icon{font-size:17px;}
        .button-group{gap:10px;}
        .btn{width:100%;justify-content:center;padding:12px 16px;font-size:14px;}
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card card-3d holo-card">
        <span aria-hidden="true" class="card-chrome card-chrome-top"></span>
        <span aria-hidden="true" class="card-chrome card-chrome-bottom"></span>
        <span aria-hidden="true" class="card-grid"></span>
        <h1 class="sr-only">${pageTitle}</h1>
        ${imageEsc ? `<div class="hero hero-holo"><span aria-hidden="true" class="hero-glow"></span><span aria-hidden="true" class="hero-grid"></span><img class="hero-img" src="${imageEsc}" alt="frame image" />${overlayHidden ? '' : `<div class="hero-overlay">${overlayHtml}</div>`}</div>` : ''}
        <div class="sr-only">${accessibleDescriptionHtml}</div>
        ${linkButtons.length ? `<div class="button-group">${linkButtons.map((btn) => `<a class="btn" href="${escapeHtml(btn.target!)}">⚡ ${escapeHtml(btn.label)}</a>`).join('')}</div>` : primaryLinkHtml}
        <div class="meta-row" style="background:linear-gradient(90deg,rgba(255,215,0,0.15),rgba(255,180,0,0.1));border:1px solid rgba(255,215,0,0.3);border-radius:8px;padding:8px 12px;font-weight:600;letter-spacing:0.5px;text-shadow:0 1px 2px rgba(0,0,0,0.5);">⚡ Powered by GMEOWBASED ADVENTURE ⚡</div>
        ${debugHtml ? `<div class="debug">${debugHtml}</div>` : ''}
      </div>
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
      const validChain = validateChainKey(params.chain)
      if (!validChain) {
        tracePush(traces, 'validation-failed', { field: 'chain', value: params.chain })
        return new NextResponse(`Invalid chain parameter. Must be one of: ${CHAIN_KEYS.join(', ')}`, { status: 400 })
      }
      params.chain = validChain
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
    const defaultFrameImage = `${origin}/og-image.png`

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
        rewardParts.push(`${formatted ?? quest.rewardPoints} Gmeow Points`)
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

      const descriptionPieces: string[] = []
      if (rewardSummary) {
        descriptionPieces.push(`Claim ${rewardSummary} by clearing this ${questTypeLabel.toLowerCase()} mission on ${questChainName}.`)
      } else {
        descriptionPieces.push(`Clear this ${questTypeLabel.toLowerCase()} mission on ${questChainName} to climb the ranks.`)
      }
      if (questMetaCopy) descriptionPieces.push(questMetaCopy)
      if (spotsLeft !== null) {
        const formattedSpots = formatInteger(spotsLeft) ?? String(spotsLeft)
        descriptionPieces.push(`${formattedSpots} spots left`)
      }
      if (expiresText) descriptionPieces.push(`Ends ${expiresText}`)
      const description = descriptionPieces.filter(Boolean).join(' • ')

      const title = `${questName} • ${questChainName}`
      
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
      
      const image = `${origin}/api/frame/og?${questImageParams.toString()}`
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

      const questCompleted = toBooleanFlag(params.completed ?? params.questCompleted ?? params.done)
      const verifyUrlFallback = `${origin}/api/frame?type=verify&questId=${encodeURIComponent(String(questIdNum))}&chain=${encodeURIComponent(chainKey)}`
      const verifyUrlParam = toOptionalString(params.verifyUrl)
      const claimUrlParam = toOptionalString(params.claimUrl)
      const flexUrlParam = toOptionalString(params.flexUrl)
      const shareUrlParam = toOptionalString(params.shareUrl) ?? toOptionalString(params.inviteUrl)
      const mintUrlParam = toOptionalString(params.mintUrl)
      const verifyLabelParam = toOptionalString(params.verifyLabel)
      const claimLabelParam = toOptionalString(params.claimLabel)
      const flexLabelParam = toOptionalString(params.flexLabel)
      const shareLabelParam = toOptionalString(params.shareLabel)
      const mintLabelParam = toOptionalString(params.mintLabel)
      
      // Generate mint URL for completed quests
      const mintUrl = questCompleted 
        ? (toAbsoluteUrl(mintUrlParam, origin) ?? `${origin}/api/nft/mint?type=quest&questId=${encodeURIComponent(String(questIdNum))}&chain=${encodeURIComponent(chainKey)}`)
        : null
      
      const questButtons = buildContextualButtons({
        type: 'quest',
        fallback: [{ label: primaryLabel, target: frameBtnUrl }],
        quest: {
          completed: questCompleted,
          verifyUrl: toAbsoluteUrl(verifyUrlParam, origin) ?? verifyUrlFallback,
          verifyLabel: verifyLabelParam,
          claimUrl: toAbsoluteUrl(claimUrlParam, origin),
          claimLabel: claimLabelParam,
          detailUrl: frameBtnUrl,
          detailLabel: primaryLabel,
          flexUrl: questCompleted ? toAbsoluteUrl(flexUrlParam, origin) : null,
          flexLabel: flexLabelParam,
          shareUrl: toAbsoluteUrl(shareUrlParam, origin),
          shareLabel: shareLabelParam,
          mintUrl: mintUrl,
          mintLabel: mintLabelParam,
        },
      })

      const html = buildFrameHtml({
        title,
        description,
        image,
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
      })
      return createHtmlResponse(html)
    }

    if (type === 'verify') {
      // help user start verification: accepts fid and cast or questId
      const fid = Number(params.fid || 0)
      const cast = params.cast || ''
      const questId = params.questId || params.id
      tracePush(traces, 'verify-start', { fid, cast, questId })
      const title = 'Verify Quest / Cast'
      const description = fid ? `Viewer FID: ${fid}` : 'Provide your Farcaster FID to verify this quest/cast'
      if (asJson) {
        return respondJson({ ok: true, type: 'verify', fid, cast, questId, traces })
      }
      const frameBtnUrl = `${origin}/api/quests/verify?debug=1&fid=${fid}${cast ? `&cast=${encodeURIComponent(String(cast))}` : ''}`
      const fcMeta = { [frameKey('entity')]: 'verify' }
      const html = buildFrameHtml({
        title,
        description,
        image: defaultFrameImage,
        url: frameBtnUrl,
        buttons: [{ label: 'Run Verification', target: frameBtnUrl }],
        fcMeta,
        debug: debugPayload,
        frameOrigin: origin,
        frameVersion: FRAME_VERSION,
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
      const description = guildId ? `Open guild ${guildId} on GMEOW` : 'Guild preview'
      const guildUrl = `${origin}/guild/${guildId}`
      if (asJson) return respondJson({ ok: true, type: 'guild', guildId, guildUrl, traces })
      const isMember = toBooleanFlag(params.member ?? params.isMember ?? params.joined)
      const joinUrlParam = toOptionalString(params.joinUrl)
      const joinUrl = toAbsoluteUrl(joinUrlParam, origin) ?? (guildId ? `${guildUrl}?join=1` : `${origin}/guild?join=1`)
      const leaderboardTargetRaw = toOptionalString(params.guildLeaderboardUrl) ?? toOptionalString(params.leaderboardUrl)
      const leaderboardUrl = toAbsoluteUrl(leaderboardTargetRaw, origin) ?? (guildId ? `${origin}/leaderboard?guild=${guildId}` : null)
      const mintUrlParam = toOptionalString(params.mintUrl)
      
      // Generate mint URL for guild members
      const mintUrl = isMember 
        ? (toAbsoluteUrl(mintUrlParam, origin) ?? `${origin}/api/nft/mint?type=guild&guildId=${guildId}`)
        : null
      
      const guildButtons = buildContextualButtons({
        type: 'guild',
        fallback: [{ label: 'Open Guild', target: guildUrl }],
        guild: {
          isMember,
          joinUrl,
          joinLabel: toOptionalString(params.joinLabel),
          hubUrl: guildUrl,
          hubLabel: toOptionalString(params.hubLabel),
          leaderboardUrl,
          leaderboardLabel: toOptionalString(params.leaderboardLabel),
          mintUrl: mintUrl,
          mintLabel: toOptionalString(params.mintLabel),
        },
      })
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
      if (code) descriptionPieces.push(`Share code ${String(code).toUpperCase()} to split Gmeow Points with frens.`)
      descriptionPieces.push('Each completed quest powers up the guild streaks.')
      if (user) descriptionPieces.push(`Tracked to ${shortenHex(String(user))}`)
      const description = descriptionPieces.join(' • ')
      const fcMeta: Record<string, string> = { [frameKey('entity')]: 'referral' }
      if (code) fcMeta[frameKey('referral_code')] = String(code)
      if (user) fcMeta[frameKey('referral_owner')] = String(user)
      if (asJson) return respondJson({ ok: true, type: 'referral', user, code, shareUrl, description, traces })
      const shareUrlOverride = toAbsoluteUrl(toOptionalString(params.shareUrl), origin) ?? shareUrl
      const copyUrlParam = toAbsoluteUrl(toOptionalString(params.copyUrl), origin)
      const hubUrlParam = toAbsoluteUrl(toOptionalString(params.hubUrl), origin) ?? shareUrl
      const referralButtons = buildContextualButtons({
        type: 'referral',
        fallback: [{ label: code ? `Share ${String(code).toUpperCase()}` : 'Open Referral Hub', target: shareUrl }],
        referral: {
          shareUrl: shareUrlOverride,
          shareLabel: toOptionalString(params.shareLabel),
          copyUrl: copyUrlParam,
          copyLabel: toOptionalString(params.copyLabel),
          hubUrl: hubUrlParam,
          hubLabel: toOptionalString(params.hubLabel),
        },
      })
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
      
      const image = `${origin}/api/frame/og?${imageParams.toString()}`
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
        return respondJson({ ok: true, type: 'onchainstats', chain: chainKey, chainName: chainDisplay, chainIcon, metrics, url: hubUrl, image, description, identity: identityForJson, traces })
      }
      const buttons: FrameButton[] = [{ label: 'Open Onchain Hub', target: hubUrl }]
      if (userParam && explorer && isAddress) {
        buttons.push({ label: 'View Explorer', target: `${explorer}/address/${encodeURIComponent(userParam)}` })
      }
      const html = buildFrameHtml({
        title: `Onchain Stats — ${chainDisplay}`,
        description,
        image,
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
      const userDisplay = user ? shortenHex(String(user)) : 'Gmeow Points'
      const title = `${userDisplay} • Gmeow Points`
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
        descriptionPieces.push('Connect your wallet or Farcaster profile to preview Gmeow Points balance.')
      }
      descriptionPieces.push(`Chain ${chainDisplay}`)
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
      const html = buildFrameHtml({
        title,
        description,
        image: defaultFrameImage,
        url: urlOpen,
        buttons: [{ label: 'Open Points HQ', target: urlOpen }],
        fcMeta,
        debug: debugPayload,
        kicker: chainDisplay,
        chainIcon,
        chainLabel: chainDisplay,
        chainKey,
        frameOrigin: origin,
        frameVersion: FRAME_VERSION,
      })
      return createHtmlResponse(html)
    }

    if (type === 'gm') {
      tracePush(traces, 'gm-start')
      const title = 'GM Ritual • GMEOW'
      const desc = ['Log your GM streak', 'Unlock multipliers + hidden boosts'].join(' • ')
      const href = `${origin}/gm`
      if (asJson) return respondJson({ ok: true, type: 'gm', href, description: desc, traces })
      const html = buildFrameHtml({
        title,
        description: desc,
        image: defaultFrameImage,
        url: href,
        buttons: [{ label: 'Open GM Ritual', target: href }],
        fcMeta: { [frameKey('entity')]: 'gm' },
        debug: debugPayload,
        frameOrigin: origin,
        frameVersion: FRAME_VERSION,
      })
      return createHtmlResponse(html)
    }

    // Default generic frame
    tracePush(traces, 'generic-frame')
    const title = 'GMEOW Frame'
    const description = ['Universal GMEOW hub', 'Browse quests, guilds, and onchain flex'].join(' • ')
    const href = `${origin}`
    if (asJson) return respondJson({ ok: true, type: 'generic', href, traces })
    const html = buildFrameHtml({
      title,
      description,
      image: defaultFrameImage,
      url: href,
      buttons: [{ label: 'Open GMEOW', target: href }],
      fcMeta: { [frameKey('entity')]: 'gmeow' },
      debug: debugPayload,
      frameOrigin: origin,
      frameVersion: FRAME_VERSION,
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
      buttons: [{ label: 'Open GMEOW', target: fallbackOrigin }],
      fcMeta: { [frameKey('entity')]: 'error' },
      debug: debugMode ? traces : undefined,
      frameOrigin: fallbackOrigin,
      frameVersion: FRAME_VERSION,
    })
    return createHtmlResponse(html, { status: 500 })
  }
}

/**
 * POST: interactive actions
 * Body:
 *  - action: "verifyQuest" | "claimSig" | "joinGuild" | "createReferral" | "proxyVerify"
 *  - payload: depends on action
 *
 * This endpoint is a convenience proxy to perform server-side operations, produce
 * signed messages, and return JSON. It does not mutate chain state (no tx sent).
 */
export async function POST(req: Request) {
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

    const action = (body.action || body.type || '').toString()
    const payload = body.payload || {}
    tracePush(traces, 'action-resolved', { action })

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

    // fallback: echo
    tracePush(traces, 'post-unknown-action', { action, payload })
    return respondJson({ ok: true, message: 'unknown action; no-op', action, payload, traces })
  } catch (e: any) {
    const msg = String(e?.message || e)
    return respondJson({ ok: false, reason: msg, traces: [{ ts: nowTs(), step: 'post-unhandled', info: msg }] }, { status: 500 })
  }
}

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
