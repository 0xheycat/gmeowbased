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
