// app/api/frame/route.ts



import { NextResponse } from 'next/server'
import { type Address } from 'viem'

// Import your gmeow-utils. Adjust path if your gmeow-utils export is different.
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
} from '@/lib/contracts/gmeow-utils'
import { getReferralCode } from '@/lib/contracts/referral-contract'
import { getChainIconUrl } from '@/lib/utils/icons'
import { buildDynamicFrameImageUrl } from '@/lib/api/share'
import {
  sanitizeFID,
  sanitizeQuestId,
  sanitizeChainKey as validateChainKey,
  sanitizeFrameType,
  sanitizeButtons,
} from '@/lib/frames/frame-validation'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/middleware/rate-limit'
import { checkAndAwardNewUserRewards } from '@/lib/profile/user-rewards'

// ✅ NEW: Import modular frame handlers
import { getFrameHandler } from '@/lib/frames'
import { getComposeText } from '@/lib/frames/compose-text'
import { buildFrameHtml, type OverlayProfile } from '@/lib/frames/html-builder'

export const runtime = 'nodejs'
export const revalidate = 500
// If you maintain a neynar helper module, use it; otherwise this file contains
// lightweight neynar helpers (below) that behave reasonably for embedded use.
import * as Ne from '@/lib/integrations/neynar' // optional — wrapped in try/catch at runtime

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
type FrameType = 'quest' | 'guild' | 'points' | 'referral' | 'leaderboards' | 'gm' | 'verify' | 'onchainstats' | 'badge' | 'nft' | 'badgecollection' | 'generic'

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

// ✅ REMOVED: Unused Neynar functions (327 lines) - NOT USED (handlers use lib/neynar.ts)
// ✅ REMOVED: fetchQuestOnChain (83 lines) - REPLACED by lib/frames/hybrid-data.ts

async function fetchReferralCodeForUser(chainKey: ChainKey, userAddr: `0x${string}`): Promise<string | null> {
  const cacheKey = `${chainKey}:${userAddr.toLowerCase()}`
  const cached = referralCache.get(cacheKey)
  const now = Date.now()
  if (cached && now - cached.at < REFERRAL_CACHE_TTL) {
    return cached.code
  }

  try {
    const code = await getReferralCode(userAddr).catch(() => null)
    const payload = code || null
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

// ✅ MOVED: OverlayProfile, getComposeText → lib/frames/compose-text.ts
// ✅ MOVED: buildFrameHtml → lib/frames/html-builder.ts

/* -------------------- Main GET handler -------------------- */

export async function GET(req: Request) {
  // Rate limiting check
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'retry-after': '60',
          'x-ratelimit-limit': '60',
          'x-ratelimit-remaining': '0',
        }
      }
    )
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

    // ✅ Use modular handler system (all 11 handlers complete as of Dec 12, 2025)
    const modularHandler = getFrameHandler(type)
    if (modularHandler) {
      tracePush(traces, 'using-modular-handler', { type })
      try {
        return await modularHandler({ req, url, params, traces, origin, defaultFrameImage, asJson })
      } catch (error: any) {
        tracePush(traces, 'modular-handler-error', { type, error: error.message })
        
        // Return error frame
        const errorHtml = buildFrameHtml({
          title: 'Error',
          description: 'Failed to load frame data',
          image: defaultFrameImage,
          url: origin,
          frameOrigin: origin,
        })
        return createHtmlResponse(errorHtml)
      }
    }

    // Fallback for unknown frame types
    tracePush(traces, 'unknown-frame-type', { type })
    const fallbackHtml = buildFrameHtml({
      title: 'Gmeowbased',
      description: 'Explore quests, guilds, and onchain adventures',
      image: defaultFrameImage,
      url: origin,
      frameOrigin: origin,
      buttons: [
        { label: '🎮 Explore', action: 'link', target: origin },
      ],
    })
    return createHtmlResponse(fallbackHtml)
  } catch (globalError: any) {
    const message = String(globalError?.message || globalError)
    tracePush(traces, 'handler-error', { error: message })
    
    // Fallback error handling - reconstruct needed variables
    const errorUrl = new URL(req.url)
    const wantsJsonResponse = wantsJson(req, errorUrl) || errorUrl.searchParams.has('json')
    const errorOrigin = resolveRequestOrigin(req, errorUrl)
    
    if (wantsJsonResponse) {
      return respondJson({ ok: false, reason: message, traces }, { status: 500 })
    }
    
    const html = buildFrameHtml({
      title: 'Frame Offline',
      description: message,
      image: `${errorOrigin}/frame-image.png`,
      url: errorOrigin,
      buttons: [{ label: 'Open gmeowbased', target: errorOrigin }],
      frameOrigin: errorOrigin,
      frameType: 'generic',
    })
    return createHtmlResponse(html, { status: 500 })
  }
}
