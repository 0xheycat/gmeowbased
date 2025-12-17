import type { ChainKey } from '@/lib/contracts/gmeow-utils'

type Primitive = string | number | boolean

export type FrameShareInput = {
  type: 'guild' | 'quest' | 'leaderboards' | 'referral' | 'points' | 'gm' | 'verify' | 'onchainstats' | 'badge'
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
  
  if (input.type === 'leaderboards') {
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
  
  if (input.type === 'gm') {
    // Route: /frame/gm?fid=...
    const params = new URLSearchParams()
    if (input.fid != null) params.set('fid', String(input.fid))
    if (input.chain) params.set('chain', String(input.chain))
    if (input.extra) {
      for (const [key, value] of Object.entries(input.extra)) {
        if (value === undefined || value === null) continue
        params.set(key, String(value))
      }
    }
    const query = params.toString()
    return `${origin}/frame/gm${query ? `?${query}` : ''}`
  }
  
  if (input.type === 'guild') {
    // Route: /frame/guild?id=...&fid=...
    const params = new URLSearchParams()
    if (input.id != null) params.set('id', String(input.id))
    if (input.fid != null) params.set('fid', String(input.fid))
    if (input.chain) params.set('chain', String(input.chain))
    if (input.extra) {
      for (const [key, value] of Object.entries(input.extra)) {
        if (value === undefined || value === null) continue
        params.set(key, String(value))
      }
    }
    const query = params.toString()
    return `${origin}/frame/guild${query ? `?${query}` : ''}`
  }
  
  if (input.type === 'points') {
    // Route: /frame/points?user=...&fid=...&chain=...
    const params = new URLSearchParams()
    if (input.user) params.set('user', input.user)
    if (input.fid != null) params.set('fid', String(input.fid))
    if (input.chain) params.set('chain', String(input.chain))
    if (input.extra) {
      for (const [key, value] of Object.entries(input.extra)) {
        if (value === undefined || value === null) continue
        params.set(key, String(value))
      }
    }
    const query = params.toString()
    return `${origin}/frame/points${query ? `?${query}` : ''}`
  }
  
  if (input.type === 'referral') {
    // Route: /frame/referral?code=...&user=...
    const params = new URLSearchParams()
    if (input.referral) params.set('code', input.referral)
    if (input.user) params.set('user', input.user)
    if (input.fid != null) params.set('fid', String(input.fid))
    if (input.extra) {
      for (const [key, value] of Object.entries(input.extra)) {
        if (value === undefined || value === null) continue
        params.set(key, String(value))
      }
    }
    const query = params.toString()
    return `${origin}/frame/referral${query ? `?${query}` : ''}`
  }
  
  if (input.type === 'verify') {
    // Route: /frame/verify?fid=...&questId=...&cast=...
    const params = new URLSearchParams()
    if (input.fid != null) params.set('fid', String(input.fid))
    if (input.questId != null) params.set('questId', String(input.questId))
    if (input.extra) {
      for (const [key, value] of Object.entries(input.extra)) {
        if (value === undefined || value === null) continue
        params.set(key, String(value))
      }
    }
    const query = params.toString()
    return `${origin}/frame/verify${query ? `?${query}` : ''}`
  }
  
  // Fallback: No more unmigrated types! All frames use dedicated routes
  // If we reach here, it's an unknown frame type - return generic frame
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
    // MCP best practice: Include base.dev for miniapp detection (Dec 2025)
    return (
      host.endsWith('.farcaster.xyz') ||
      host.endsWith('.warpcast.com') ||
      host.endsWith('.base.dev') ||
      host === 'farcaster.xyz' ||
      host === 'warpcast.com' ||
      host === 'base.dev'
    )
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
 * Generates personalized image URLs for modular /api/frame/image/* routes
 * Updated December 2025: Use modular routes matching lib/frames/handlers pattern
 * 
 * @param input - Frame share input with type and parameters
 * @param originOverride - Optional origin override
 * @returns Dynamic image URL with query parameters to modular route
 */
export function buildDynamicFrameImageUrl(input: FrameShareInput, originOverride?: string | null): string {
  const origin = resolveOrigin(originOverride)
  if (!origin) return `${origin || ''}/frame-image.png`
  
  const params = new URLSearchParams()
  if (input.chain) params.set('chain', String(input.chain))
  if (input.user) params.set('user', input.user)
  if (input.fid != null) params.set('fid', String(input.fid))
  
  // Badge handling (special case: separate route for single badge)
  if (input.type === 'badge') {
    if (input.badgeId) {
      // Single badge route
      params.set('badgeId', input.badgeId)
      params.set('v', '2')
      return `${origin}/api/frame/badgeShare/image?${params.toString()}`
    } else {
      // Badge collection route
      if (input.extra?.earnedBadges) params.set('earnedBadges', String(input.extra.earnedBadges))
      if (input.extra?.earnedCount) params.set('earnedCount', String(input.extra.earnedCount))
      if (input.extra?.eligibleCount) params.set('eligibleCount', String(input.extra.eligibleCount))
      if (input.extra?.username) params.set('username', String(input.extra.username))
      if (input.extra?.displayName) params.set('displayName', String(input.extra.displayName))
      return `${origin}/api/frame/image/badgecollection?${params.toString()}`
    }
  }
  
  // GM frame image
  if (input.type === 'gm') {
    if (input.extra?.gmCount) params.set('gmCount', String(input.extra.gmCount))
    if (input.extra?.streak) params.set('streak', String(input.extra.streak))
    if (input.extra?.rank) params.set('rank', String(input.extra.rank))
    if (input.extra?.lifetimeGMs) params.set('lifetimeGMs', String(input.extra.lifetimeGMs))
    if (input.extra?.xp) params.set('xp', String(input.extra.xp))
    if (input.extra?.username) params.set('username', String(input.extra.username))
    if (input.extra?.displayName) params.set('displayName', String(input.extra.displayName))
    return `${origin}/api/frame/image/gm?${params.toString()}`
  }
  
  // Quest frame image
  if (input.type === 'quest') {
    if (input.questId != null) params.set('questId', String(input.questId))
    if (input.extra?.questName) params.set('questName', String(input.extra.questName))
    if (input.extra?.reward) params.set('reward', String(input.extra.reward))
    if (input.extra?.expires) params.set('expires', String(input.extra.expires))
    if (input.extra?.progress) params.set('progress', String(input.extra.progress))
    if (input.extra?.difficulty) params.set('difficulty', String(input.extra.difficulty))
    return `${origin}/api/frame/image/quest?${params.toString()}`
  }
  
  // Guild frame image
  if (input.type === 'guild') {
    if (input.id != null) params.set('guildId', String(input.id))
    if (input.extra?.guildName) params.set('guildName', String(input.extra.guildName))
    if (input.extra?.members) params.set('members', String(input.extra.members))
    if (input.extra?.totalPoints) params.set('totalPoints', String(input.extra.totalPoints))
    if (input.extra?.rank) params.set('rank', String(input.extra.rank))
    return `${origin}/api/frame/image/guild?${params.toString()}`
  }
  
  // Leaderboard frame image
  if (input.type === 'leaderboards') {
    if (input.extra?.limit) params.set('limit', String(input.extra.limit))
    if (input.extra?.season) params.set('season', String(input.extra.season))
    if (input.extra?.global) params.set('global', String(input.extra.global))
    if (input.extra?.top3) params.set('top3', String(input.extra.top3))
    return `${origin}/api/frame/image/leaderboard?${params.toString()}`
  }
  
  // Points frame image
  if (input.type === 'points') {
    if (input.extra?.totalXP) params.set('totalXP', String(input.extra.totalXP))
    if (input.extra?.availableXP) params.set('availableXP', String(input.extra.availableXP))
    if (input.extra?.lockedXP) params.set('lockedXP', String(input.extra.lockedXP))
    if (input.extra?.rank) params.set('rank', String(input.extra.rank))
    if (input.extra?.username) params.set('username', String(input.extra.username))
    return `${origin}/api/frame/image/points?${params.toString()}`
  }
  
  // Referral frame image
  if (input.type === 'referral') {
    if (input.referral) params.set('ref', input.referral)
    if (input.extra?.referralCode) params.set('referralCode', String(input.extra.referralCode))
    if (input.extra?.referralCount) params.set('referralCount', String(input.extra.referralCount))
    if (input.extra?.referralXP) params.set('referralXP', String(input.extra.referralXP))
    return `${origin}/api/frame/image/referral?${params.toString()}`
  }
  
  // Onchain stats frame image
  if (input.type === 'onchainstats') {
    const onchainMetrics = ['statsChain', 'chainName', 'explorer', 'txs', 'contracts', 'volume', 'balance', 'age', 'builder', 'neynar', 'power', 'firstTx', 'lastTx']
    for (const key of onchainMetrics) {
      const value = input.extra?.[key]
      if (value !== undefined && value !== null) {
        params.set(key, String(value))
      }
    }
    if (input.extra?.username) params.set('username', String(input.extra.username))
    return `${origin}/api/frame/image/onchainstats?${params.toString()}`
  }
  
  // Verify frame image
  if (input.type === 'verify') {
    if (input.extra?.verified) params.set('verified', String(input.extra.verified))
    if (input.extra?.questId) params.set('questId', String(input.extra.questId))
    if (input.extra?.username) params.set('username', String(input.extra.username))
    return `${origin}/api/frame/image/verify?${params.toString()}`
  }
  
  // Fallback: generic frame image (should not be reached with proper types)
  return `${origin}/frame-image.png`
}
