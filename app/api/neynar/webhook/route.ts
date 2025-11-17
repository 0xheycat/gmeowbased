import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'

import { parseWebhookEvent, verifyAppKeyWithNeynar } from '@farcaster/miniapp-node'

import { loadBotStatsConfig } from '@/lib/bot-config'
import { buildAgentAutoReply } from '@/lib/agent-auto-reply'
import { getNeynarServerClient } from '@/lib/neynar-server'
import { resolveBotFid, resolveBotSignerUuid, resolveWebhookSecret } from '@/lib/neynar-bot'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase-server'
import { markNotificationTokenDisabled, upsertNotificationToken } from '@/lib/miniapp-notifications'
import { selectFrameForIntent, formatFrameEmbedForCast } from '@/lib/bot-frame-builder'
// Phase 5.1: Real-time Viral Notifications
// Source: lib/viral-engagement-sync.ts, lib/viral-achievements.ts
// MCP Verified: November 17, 2025
// Approved by: @heycat on November 17, 2025
import { syncCastEngagement } from '@/lib/viral-engagement-sync'
import { checkAndAwardAchievements } from '@/lib/viral-achievements'
import { dispatchViralNotification } from '@/lib/viral-notifications'

export const runtime = 'nodejs'

const SIGNATURE_HEADER = 'x-neynar-signature'
const DIGEST_ALGO = 'sha512'
const MAX_CAST_LENGTH = 320

interface NeynarProfile {
  fid?: number
  username?: string
  display_name?: string
}

interface NeynarCastEventData {
  hash?: string
  parent_hash?: string | null
  parent_url?: string | null
  author?: NeynarProfile
  text?: string
  embeds?: unknown[]
  mentioned_profiles?: NeynarProfile[]
}

interface NeynarWebhookEvent {
  type?: string
  event_type?: string
  created_at?: number
  data?: NeynarCastEventData
  idempotency_key?: string
}

type MiniAppNotificationDetails = {
  url?: string
  token?: string
}

type EncodedMiniAppEvent = {
  header?: unknown
  payload?: unknown
  signature?: unknown
}

type MiniAppEventPayload = {
  event: string
  notificationDetails?: MiniAppNotificationDetails
  fid?: number
  appFid?: number
  clientFid?: number
}

const MINI_APP_EVENT_NAMES = new Set([
  'miniapp_added',
  'miniapp_removed',
  'notifications_enabled',
  'notifications_disabled',
])

function isEncodedMiniAppEvent(payload: unknown): payload is EncodedMiniAppEvent {
  if (!payload || typeof payload !== 'object') return false
  const candidate = payload as EncodedMiniAppEvent
  return (
    typeof candidate.header === 'string' &&
    typeof candidate.payload === 'string' &&
    typeof candidate.signature === 'string'
  )
}

async function tryLookupNotificationToken(token: string | null | undefined): Promise<{
  fid: number | null
  url: string | null
  status: string | null
}> {
  if (!token) return { fid: null, url: null, status: null }
  try {
    const client = getNeynarServerClient()
    if (!client) return { fid: null, url: null, status: null }

    let cursor: string | undefined
    const limit = 100

    for (let page = 0; page < 10; page += 1) {
      const response: any = await client.fetchNotificationTokens({ limit, cursor })
      const tokens: any[] =
        response?.notificationTokens ?? response?.notification_tokens ?? []
      const match = tokens.find((entry) => entry?.token === token)
      if (match) {
        const fidValue = Number(match.fid)
        return {
          fid: Number.isFinite(fidValue) && fidValue > 0 ? fidValue : null,
          url: typeof match.url === 'string' ? match.url : null,
          status: typeof match.status === 'string' ? match.status : null,
        }
      }

      const nextCursor = response?.next?.cursor ?? response?.next ?? null
      if (!nextCursor || typeof nextCursor !== 'string') break
      cursor = nextCursor
    }
  } catch (error) {
    console.warn('[neynar-webhook] token lookup failed', error)
  }

  return { fid: null, url: null, status: null }
}

async function handleMiniAppNotificationEvent(
  event: MiniAppEventPayload,
  fidFromSignature: number | null,
  appFidFromSignature: number | null,
): Promise<{ type: string; meta: Record<string, unknown> } | null> {
  const eventName = event?.event
  if (!eventName || !MINI_APP_EVENT_NAMES.has(eventName)) {
    return null
  }

  const details = event.notificationDetails ?? {}
  const rawToken = typeof details.token === 'string' ? details.token.trim() : ''
  const rawUrl = typeof details.url === 'string' ? details.url.trim() : ''
  const fidCandidate = Number(event.fid)
  const eventFid = Number.isFinite(fidCandidate) && fidCandidate > 0 ? fidCandidate : fidFromSignature
  const appFidCandidate = Number(event.appFid ?? event.clientFid)
  const appFid = Number.isFinite(appFidCandidate) && appFidCandidate > 0 ? appFidCandidate : appFidFromSignature

  const meta: Record<string, unknown> = {
    event: eventName,
    fid: eventFid ?? null,
    appFid: appFid ?? null,
  }

  if (eventName === 'miniapp_added' || eventName === 'notifications_enabled') {
    if (!rawToken || !rawUrl) {
      meta.reason = 'missing-notification-details'
      return { type: 'miniapp-event', meta }
    }

    let resolvedFid = eventFid ?? null
    let resolvedUrl = rawUrl
    let resolvedStatus: string | null = null

    if (!resolvedFid || !resolvedUrl) {
      const lookup = await tryLookupNotificationToken(rawToken)
      resolvedFid = resolvedFid ?? lookup.fid
      if (!resolvedUrl && lookup.url) resolvedUrl = lookup.url
      resolvedStatus = lookup.status
    }

    meta.resolvedFid = resolvedFid ?? null
    meta.resolvedUrl = resolvedUrl
    meta.resolvedStatus = resolvedStatus ?? 'enabled'

    if (!isSupabaseConfigured()) {
      meta.skipped = 'supabase-not-configured'
      return { type: 'miniapp-event', meta }
    }

    if (!resolvedFid) {
      meta.skipped = 'missing-fid'
      return { type: 'miniapp-event', meta }
    }

    const statusForStore = resolvedStatus === 'disabled' ? 'disabled' : 'enabled'
    const stored = await upsertNotificationToken({
      fid: resolvedFid,
      token: rawToken,
      notificationUrl: resolvedUrl || rawUrl,
      status: statusForStore === 'disabled' ? 'disabled' : 'enabled',
      eventType: eventName,
      eventAt: new Date(),
      clientFid: appFid ?? null,
    })

    meta.tokenStored = stored
    meta.status = statusForStore
    return { type: 'miniapp-event', meta }
  }

  if (eventName === 'miniapp_removed' || eventName === 'notifications_disabled') {
    if (!isSupabaseConfigured()) {
      meta.skipped = 'supabase-not-configured'
      return { type: 'miniapp-event', meta }
    }

    const updated = await markNotificationTokenDisabled({
      token: rawToken || undefined,
      fid: eventFid ?? undefined,
      status: eventName === 'miniapp_removed' ? 'removed' : 'disabled',
      reason: eventName,
      eventAt: new Date(),
    })

    meta.tokenUpdated = updated
    meta.status = eventName === 'miniapp_removed' ? 'removed' : 'disabled'
    return { type: 'miniapp-event', meta }
  }

  return null
}

async function tryHandleMiniAppEvent(parsedBody: unknown): Promise<NextResponse | null> {
  try {
    const hasDirectEvent =
      parsedBody &&
      typeof parsedBody === 'object' &&
      typeof (parsedBody as MiniAppEventPayload)?.event === 'string'
    const maybeEventName = hasDirectEvent ? (parsedBody as MiniAppEventPayload).event : null
    const encoded = isEncodedMiniAppEvent(parsedBody)

    if (!encoded && (!maybeEventName || !MINI_APP_EVENT_NAMES.has(maybeEventName))) {
      return null
    }

    let payload: MiniAppEventPayload | null = null
    let fid: number | null = null
    let appFid: number | null = null

    if (encoded) {
      if (!process.env.NEYNAR_API_KEY) {
        console.warn('[neynar-webhook] Received encoded miniapp event but NEYNAR_API_KEY is not set')
        return NextResponse.json(
          { ok: false, error: 'miniapp-event-unverified', reason: 'missing-api-key' },
          { status: 500 },
        )
      }

      const decoded = await parseWebhookEvent(parsedBody as any, verifyAppKeyWithNeynar)
      payload = decoded.event as MiniAppEventPayload
      fid = Number.isFinite(decoded.fid) && decoded.fid > 0 ? decoded.fid : null
      appFid = Number.isFinite(decoded.appFid) && decoded.appFid > 0 ? decoded.appFid : null
    } else if (hasDirectEvent) {
      payload = parsedBody as MiniAppEventPayload
      const fidCandidate = Number(payload?.fid)
      fid = Number.isFinite(fidCandidate) && fidCandidate > 0 ? fidCandidate : null
      const appCandidate = Number(payload?.appFid ?? payload?.clientFid)
      appFid = Number.isFinite(appCandidate) && appCandidate > 0 ? appCandidate : null
    }

    if (!payload) return null

    const result = await handleMiniAppNotificationEvent(payload, fid, appFid)
    if (!result) return null

    return NextResponse.json({ ok: true, handled: result.type, meta: result.meta })
  } catch (error) {
    console.error('[neynar-webhook] miniapp event handling failed', error)
    return NextResponse.json({ ok: false, error: 'miniapp-event-failed' }, { status: 500 })
  }
}

function computeSignature(body: string, secret: string): string {
  const hmac = createHmac(DIGEST_ALGO, secret)
  hmac.update(body)
  return hmac.digest('hex')
}

function safeCompareHex(a: string, b: string): boolean {
  if (!a || !b) return false
  const cleanA = a.trim().toLowerCase()
  const cleanB = b.trim().toLowerCase()
  if (cleanA.length !== cleanB.length) return false
  try {
    const bufA = Buffer.from(cleanA, 'hex')
    const bufB = Buffer.from(cleanB, 'hex')
    if (bufA.length !== bufB.length) return false
    return timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

function isCastTargetedToBot(
  data: NeynarCastEventData, 
  botFid: number | null,
  config: { mentionMatchers: string[]; signalKeywords: string[]; questionStarters: string[]; requireQuestionMark: boolean }
): boolean {
  const text = (data.text || '').toLowerCase()
  
  // 1. Check direct mention in mentioned_profiles array - ALWAYS respond to direct @mentions
  const mentions = Array.isArray(data.mentioned_profiles) ? data.mentioned_profiles : []
  if (botFid && mentions.some(profile => Number(profile?.fid) === botFid)) {
    console.log('[bot-webhook] Direct @mention detected - will respond')
    return true
  }

  if (!text.trim()) return false

  // 2. Check text for mention matchers (@gmeowbased, #gmeowbased) - ALWAYS respond
  if (config.mentionMatchers.some(matcher => text.includes(matcher.toLowerCase()))) {
    console.log('[bot-webhook] Text mention/hashtag detected - will respond')
    return true
  }

  // 3. Check for signal keywords + question pattern (more flexible)
  const hasSignalKeyword = config.signalKeywords.some(keyword => 
    text.includes(keyword.toLowerCase())
  )
  
  if (hasSignalKeyword) {
    // Check if it's a question (starts with question word or has ?)
    const hasQuestionStarter = config.questionStarters.some(starter => {
      const lowerStarter = starter.toLowerCase()
      return text.startsWith(lowerStarter) || 
             text.includes(` ${lowerStarter} `) ||
             text.includes(`\n${lowerStarter} `)
    })
    const hasQuestionMark = text.includes('?')
    
    // MUST have either question starter OR question mark
    // requireQuestionMark config determines if BOTH are needed
    if (config.requireQuestionMark) {
      // Strict mode: need question starter AND ?
      return hasQuestionStarter && hasQuestionMark
    } else {
      // Relaxed mode: need question starter OR ?
      return hasQuestionStarter || hasQuestionMark
    }
  }

  return false
}

function authorIsBot(data: NeynarCastEventData, botFid: number | null): boolean {
  if (!botFid) return false
  const fid = Number(data.author?.fid)
  return Number.isFinite(fid) && fid === botFid
}

function trimToCastLimit(message: string): string {
  if (message.length <= MAX_CAST_LENGTH) return message
  return `${message.slice(0, MAX_CAST_LENGTH - 1)}…`
}

function buildReplyText(data: NeynarCastEventData): string {
  const username = data.author?.username?.trim()
  const fid = Number(data.author?.fid)
  const handle = username ? `@${username}` : fid ? `pilot #${fid}` : 'friend'
  const lowerText = data.text?.toLowerCase() || ''

  let callToAction = 'Log your gm streak & daily quests at https://gmeowhq.art/Quest'
  if (lowerText.includes('leaderboard')) {
    callToAction = 'Leaderboard intel unlocked → https://gmeowhq.art/leaderboard'
  } else if (lowerText.includes('guild')) {
    callToAction = 'Recruiters await in HQ → https://gmeowhq.art/Guild'
  } else if (lowerText.includes('profile')) {
    callToAction = 'Inspect your pilot card → https://gmeowhq.art/profile'
  }

  const base = `gm ${handle}! ${callToAction}`
  return trimToCastLimit(base)
}

// ============================================================================
// Phase 5.1: Viral Engagement Handler
// ============================================================================
/**
 * Handle viral engagement sync for badge casts
 * 
 * This runs async in the background without blocking webhook response.
 * It syncs engagement metrics, detects tier upgrades, awards achievements,
 * and dispatches push notifications.
 * 
 * Source: lib/viral-engagement-sync.ts, lib/viral-achievements.ts
 * Quality Gates:
 * - GI-10: Non-blocking async processing
 * - GI-7: Comprehensive error handling
 * 
 * @param castHash - Hash of cast to sync
 * @param authorFid - FID of cast author (optional)
 */
async function handleViralEngagementSync(
  castHash: string,
  authorFid: number | undefined
): Promise<void> {
  try {
    // Only process if cast is a badge cast (check database)
    const supabase = getSupabaseServerClient()
    if (!supabase) return

    const { data: badgeCast } = await supabase
      .from('badge_casts')
      .select('cast_hash, fid')
      .eq('cast_hash', castHash)
      .single()

    if (!badgeCast) {
      // Not a badge cast, skip
      return
    }

    // Sync engagement metrics from Neynar
    const syncResult = await syncCastEngagement(castHash)

    if (!syncResult.updated) {
      // No changes, skip
      return
    }

    console.log('[webhook] Viral engagement synced:', {
      castHash: castHash.slice(0, 10),
      tierUpgrade: syncResult.tierUpgrade,
      oldTier: syncResult.oldTier,
      newTier: syncResult.newTier,
      additionalXp: syncResult.additionalXp,
    })

    // If tier upgraded, send notification
    if (syncResult.tierUpgrade && badgeCast.fid) {
      await dispatchViralNotification({
        type: 'tier_upgrade',
        fid: badgeCast.fid,
        castHash,
        oldTier: syncResult.oldTier,
        newTier: syncResult.newTier,
        xpBonus: syncResult.additionalXp,
      })
    }

    // Check and award achievements
    if (badgeCast.fid) {
      const achievementsAwarded = await checkAndAwardAchievements(
        badgeCast.fid,
        castHash
      )

      if (achievementsAwarded > 0) {
        console.log('[webhook] Awarded achievements:', {
          fid: badgeCast.fid,
          count: achievementsAwarded,
        })
      }
    }
  } catch (error) {
    console.error('[webhook] Viral engagement sync error:', error)
    // Don't throw - this is background processing
  }
}
// ============================================================================

export async function POST(req: NextRequest) {
  const secret = resolveWebhookSecret()
  if (!secret) {
    console.error('[neynar-webhook] Missing NEYNAR_WEBHOOK_SECRET')
    return NextResponse.json({ ok: false, error: 'server not configured' }, { status: 500 })
  }

  const signature = req.headers.get(SIGNATURE_HEADER)
  if (!signature) {
    return NextResponse.json({ ok: false, error: 'missing signature header' }, { status: 400 })
  }

  const rawBody = await req.text()
  const expectedSignature = computeSignature(rawBody, secret)
  const signatureValid = safeCompareHex(signature, expectedSignature)
  if (!signatureValid) {
    return NextResponse.json({ ok: false, error: 'invalid signature' }, { status: 401 })
  }

  let parsedBody: unknown
  try {
    parsedBody = JSON.parse(rawBody)
  } catch (error) {
    console.warn('[neynar-webhook] Failed to parse payload', error)
    return NextResponse.json({ ok: false, error: 'invalid payload' }, { status: 400 })
  }

  const miniAppResponse = await tryHandleMiniAppEvent(parsedBody)
  if (miniAppResponse) {
    return miniAppResponse
  }

  if (!parsedBody || typeof parsedBody !== 'object') {
    return NextResponse.json({ ok: false, error: 'unsupported body' }, { status: 400 })
  }

  const event = parsedBody as NeynarWebhookEvent

  const eventType = event.type || event.event_type
  if (eventType !== 'cast.created') {
    return NextResponse.json({ ok: true, skipped: `ignored:${eventType || 'unknown'}` })
  }

  const data = event.data
  if (!data || !data.hash) {
    return NextResponse.json({ ok: false, error: 'missing cast data' }, { status: 400 })
  }

  // ========================================================================
  // Phase 5.1: Real-time Viral Engagement Sync
  // ========================================================================
  // When a cast is created or mentioned, check if it's a badge cast
  // and sync engagement metrics in the background
  // Source: lib/viral-engagement-sync.ts
  // Quality Gate: GI-10 (async processing, non-blocking)
  // ========================================================================
  if (data.hash) {
    // Fire and forget - don't block webhook response
    handleViralEngagementSync(data.hash, data.author?.fid).catch((err: unknown) => {
      console.error('[webhook] Viral engagement sync failed:', err)
    })
  }
  // ========================================================================

  const botFid = resolveBotFid()
  if (!botFid) {
    console.warn('[neynar-webhook] Missing bot FID; skipping reply')
    return NextResponse.json({ ok: true, skipped: 'missing-bot-fid' })
  }

  if (authorIsBot(data, botFid)) {
    console.log('[bot-webhook] Skipping self-cast from bot FID:', botFid)
    return NextResponse.json({ ok: true, skipped: 'self-cast' })
  }

  const signerUuid = resolveBotSignerUuid()
  if (!signerUuid) {
    console.warn('[neynar-webhook] Missing signer UUID; skipping reply')
    return NextResponse.json({ ok: true, skipped: 'missing-signer-uuid' })
  }

  // Load config early - needed for targeting check
  const config = await loadBotStatsConfig()

  const isTargeted = isCastTargetedToBot(data, botFid, config)
  if (!isTargeted) {
    console.log('[bot-webhook] Cast not targeted:', {
      author: data.author?.username,
      fid: data.author?.fid,
      text: data.text?.substring(0, 100),
      botFid,
      mentions: data.mentioned_profiles?.map(p => p.fid),
    })
    return NextResponse.json({ ok: true, skipped: 'bot-not-targeted' })
  }
  
  console.log('[bot-webhook] Cast IS targeted to bot:', {
    author: data.author?.username,
    fid: data.author?.fid,
    text: data.text?.substring(0, 100),
  })

  let replyText: string | null = null
  let replyMeta: Record<string, unknown> | null = null
  let frameEmbeds: string[] = []
  let detectedIntent: string = 'help'

  try {
    const autoReply = await buildAgentAutoReply({
      fid: Number.isFinite(Number(data.author?.fid)) ? Number(data.author?.fid) : null,
      text: data.text ?? '',
      username: data.author?.username,
      displayName: data.author?.display_name,
    }, config)

    if (autoReply.ok) {
      replyText = autoReply.text
      replyMeta = { intent: autoReply.intent, ...autoReply.meta }
      detectedIntent = autoReply.intent

      // Build frame embed based on intent
      const frameEmbed = selectFrameForIntent(autoReply.intent, {
        fid: Number.isFinite(Number(data.author?.fid)) ? Number(data.author?.fid) : undefined,
        username: data.author?.username || undefined,
        hasStats: !!autoReply.meta?.hasStats,
        hasStreak: !!autoReply.meta?.hasStreak,
      })

      if (frameEmbed) {
        frameEmbeds = formatFrameEmbedForCast(frameEmbed)
        if (replyMeta) {
          replyMeta.frameType = frameEmbed.type
          replyMeta.frameUrl = frameEmbed.url
        }
      }
    } else {
      // Log the reason but don't reply (truly can't help)
      console.log('[bot-webhook] Cannot generate reply:', {
        author: data.author?.username,
        fid: data.author?.fid,
        reason: autoReply.reason,
        detail: autoReply.detail,
      })
      return NextResponse.json({
        ok: true,
        skipped: autoReply.reason,
        detail: autoReply.detail ?? null,
      })
    }
  } catch (error) {
    console.warn('[neynar-webhook] auto reply pipeline failed, falling back', (error as Error)?.message || error)
  }

  if (!replyText) {
    replyText = buildReplyText(data)
    
    // Even for fallback replies, try to add a helpful frame
    const fallbackFrame = selectFrameForIntent(detectedIntent, {
      fid: Number.isFinite(Number(data.author?.fid)) ? Number(data.author?.fid) : undefined,
      username: data.author?.username || undefined,
    })
    
    if (fallbackFrame) {
      frameEmbeds = formatFrameEmbedForCast(fallbackFrame)
    }
  }

  if (!replyText) {
    return NextResponse.json({ ok: true, skipped: 'empty-reply' })
  }

  try {
    const client = getNeynarServerClient()
    
    // Prepare cast with frame embeds if available
    const castPayload: any = {
      signerUuid,
      text: replyText,
      parent: data.hash,
      parentAuthorFid: Number.isFinite(Number(data.author?.fid)) ? Number(data.author?.fid) : undefined,
      idem: event.idempotency_key || `gmeowbased:${data.hash}`,
    }
    
    // Add frame embeds to cast
    if (frameEmbeds.length > 0) {
      castPayload.embeds = frameEmbeds.map(url => ({ url }))
      console.log('[bot-webhook] Including frame embed in reply:', frameEmbeds[0])
    }

    const response = await client.publishCast(castPayload)

    return NextResponse.json({ 
      ok: true, 
      hash: response.cast?.hash ?? null, 
      meta: replyMeta,
      frameEmbedded: frameEmbeds.length > 0
    })
  } catch (error: any) {
    const isDuplicate = error?.status === 409 || error?.response?.status === 409
    console.error('[neynar-webhook] Failed to publish reply', {
      status: error?.status ?? error?.response?.status,
      message: error?.message,
      isDuplicate,
      hadFrameEmbed: frameEmbeds.length > 0,
    })
    
    // Return metadata even on failure (especially for duplicate/testing scenarios)
    return NextResponse.json(
      { 
        ok: false, 
        error: isDuplicate ? 'duplicate cast' : 'publish failed',
        meta: replyMeta,
        text: replyText,
        frameEmbeds: frameEmbeds.length > 0 ? frameEmbeds : undefined,
      }, 
      { status: isDuplicate ? 200 : 502 }
    )
  }
}
