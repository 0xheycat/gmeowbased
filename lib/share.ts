import type { ChainKey } from '@/lib/gm-utils'

type Primitive = string | number | boolean

export type FrameShareInput = {
  type: 'guild' | 'quest' | 'leaderboard' | 'referral' | 'points' | 'gm' | 'verify' | 'onchainstats' | 'badge'
  chain?: ChainKey | 'all'
  id?: number | string
  questId?: number | string
  user?: string
  fid?: number | string
  referral?: string
  badgeId?: string
  extra?: Record<string, Primitive | null | undefined>
}

const DEFAULT_FRAME_PATH = '/api/frame'

function normalizeOrigin(raw?: string | null): string {
  if (!raw) return ''
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const hasProtocol = /^https?:\/\//i.test(trimmed)
  const value = hasProtocol ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(value)
    url.pathname = ''
    url.search = ''
    url.hash = ''
    return url.origin
  } catch {
    return ''
  }
}

const FALLBACK_ORIGIN = (() => {
  if (typeof process === 'undefined') return ''
  const candidates = [
    process.env.NEXT_PUBLIC_FRAME_ORIGIN,
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_VERCEL_URL,
    process.env.VERCEL_URL,
  ]
  for (const raw of candidates) {
    const normalized = normalizeOrigin(raw)
    if (normalized) return normalized
  }
  return ''
})()

export function resolveOrigin(custom?: string | null): string {
  if (custom) {
    const normalized = normalizeOrigin(custom)
    if (normalized) return normalized
  }
  if (FALLBACK_ORIGIN) return FALLBACK_ORIGIN
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin
  return ''
}

export function buildFrameShareUrl(input: FrameShareInput, originOverride?: string | null): string {
  const origin = resolveOrigin(originOverride)
  if (!origin) return ''
  
  // Use user-facing /frame/* routes (GI-11/FM-3 compliant)
  // NEVER expose /api/frame directly to users
  
  if (input.type === 'quest' && input.questId != null) {
    // Route: /frame/quest/[questId]?chain=...
    const params = new URLSearchParams()
    if (input.chain) params.set('chain', String(input.chain))
    if (input.extra) {
      for (const [key, value] of Object.entries(input.extra)) {
        if (value === undefined || value === null) continue
        params.set(key, String(value))
      }
    }
    const query = params.toString()
    return `${origin}/frame/quest/${input.questId}${query ? `?${query}` : ''}`
  }
  
  if (input.type === 'badge' && input.fid != null) {
    // Route: /frame/badge/[fid]?badgeId=...
    const params = new URLSearchParams()
    if (input.badgeId) params.set('badgeId', input.badgeId)
    if (input.extra) {
      for (const [key, value] of Object.entries(input.extra)) {
        if (value === undefined || value === null) continue
        params.set(key, String(value))
      }
    }
    const query = params.toString()
    return `${origin}/frame/badge/${input.fid}${query ? `?${query}` : ''}`
  }
  
  if (input.type === 'onchainstats' && input.fid != null) {
    // Route: /frame/stats/[fid]?chain=...
    const params = new URLSearchParams()
    if (input.chain) params.set('chain', String(input.chain))
    if (input.user) params.set('user', input.user)
    if (input.extra) {
      for (const [key, value] of Object.entries(input.extra)) {
        if (value === undefined || value === null) continue
        params.set(key, String(value))
      }
    }
    const query = params.toString()
    return `${origin}/frame/stats/${input.fid}${query ? `?${query}` : ''}`
  }
  
  if (input.type === 'leaderboard') {
    // Route: /frame/leaderboard?chain=...
    const params = new URLSearchParams()
    if (input.chain) params.set('chain', String(input.chain))
    if (input.extra) {
      for (const [key, value] of Object.entries(input.extra)) {
        if (value === undefined || value === null) continue
        params.set(key, String(value))
      }
    }
    const query = params.toString()
    return `${origin}/frame/leaderboard${query ? `?${query}` : ''}`
  }
  
  // Fallback for other types (referral, guild, points, gm, verify)
  // These still use /api/frame until specific routes are created
  // TODO: Create dedicated routes for remaining frame types
  const params = new URLSearchParams()
  params.set('type', input.type)
  if (input.chain) params.set('chain', String(input.chain))
  if (input.id != null) params.set('id', String(input.id))
  if (input.questId != null) params.set('questId', String(input.questId))
  if (input.user) params.set('user', input.user)
  if (input.fid != null) params.set('fid', String(input.fid))
  if (input.referral) params.set('ref', input.referral)
  if (input.extra) {
    for (const [key, value] of Object.entries(input.extra)) {
      if (value === undefined || value === null) continue
      params.set(key, String(value))
    }
  }
  return `${origin}${DEFAULT_FRAME_PATH}?${params.toString()}`
}

export function buildWarpcastComposerUrl(text: string, embed?: string): string {
  const params = new URLSearchParams()
  params.set('text', text)
  if (embed) params.append('embeds[]', embed)
  return `https://warpcast.com/~/compose?${params.toString()}`
}

function getReferrerHost(): string {
  try {
    const ref = typeof document !== 'undefined' ? document.referrer : ''
    return ref ? new URL(ref).hostname : ''
  } catch {
    return ''
  }
}

function isMiniappContext(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const inIframe = window.self !== window.top
    if (!inIframe) return false
    const host = getReferrerHost()
    if (!host) return false
    return host.endsWith('.farcaster.xyz') || host.endsWith('.warpcast.com') || host === 'farcaster.xyz' || host === 'warpcast.com'
  } catch {
    return false
  }
}

export async function openWarpcastComposer(text: string, embed?: string): Promise<'miniapp' | 'web' | 'noop'> {
  if (typeof window === 'undefined') return 'noop'

  if (isMiniappContext()) {
    try {
      const mod = await import('@farcaster/miniapp-sdk').catch(() => null)
      const sdk = (mod as any)?.sdk
      if (sdk?.actions?.composeCast) {
        const payload: { text: string; embeds?: string[] } = { text }
        if (embed) payload.embeds = [embed]
        await sdk.actions.composeCast(payload)
        return 'miniapp'
      }
    } catch {
      /* fall back to web composer */
    }
  }

  const url = buildWarpcastComposerUrl(text, embed)
  window.open(url, '_blank', 'noopener,noreferrer')
  return 'web'
}

export async function copyToClipboardSafe(value: string): Promise<boolean> {
  if (!value) return false
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

/**
 * Build dynamic frame image URL with query parameters
 * Generates personalized image URLs for /api/frame/image endpoint
 * 
 * @param input - Frame share input with type and parameters
 * @param originOverride - Optional origin override
 * @returns Dynamic image URL with query parameters, or fallback static image
 */
export function buildDynamicFrameImageUrl(input: FrameShareInput, originOverride?: string | null): string {
  const origin = resolveOrigin(originOverride)
  if (!origin) return `${origin || ''}/frame-image.png`
  
  const params = new URLSearchParams()
  params.set('type', input.type)
  if (input.chain) params.set('chain', String(input.chain))
  if (input.user) params.set('user', input.user)
  if (input.fid != null) params.set('fid', String(input.fid))
  
  if (input.type === 'quest' && input.questId != null) {
    params.set('questId', String(input.questId))
  }
  if (input.type === 'badge' && input.badgeId) {
    params.set('badgeId', input.badgeId)
  }
  if (input.type === 'leaderboard' && input.extra) {
    if (input.extra.limit) params.set('limit', String(input.extra.limit))
    if (input.extra.season) params.set('season', String(input.extra.season))
    if (input.extra.global) params.set('global', String(input.extra.global))
  }
  if (input.type === 'guild' && input.id != null) {
    params.set('guildId', String(input.id))
  }
  if (input.type === 'referral' && input.referral) {
    params.set('ref', input.referral)
  }
  if (input.extra) {
    for (const [key, value] of Object.entries(input.extra)) {
      if (value === undefined || value === null) continue
      if (['limit', 'season', 'global'].includes(key) && input.type === 'leaderboard') continue
      params.set(key, String(value))
    }
  }
  
  return `${origin}/api/frame/image?${params.toString()}`
}
