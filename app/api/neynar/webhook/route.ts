/**
 * #file: app/api/neynar/webhook/route.ts
 * 
 * PHASE: Phase 1 Complete + Cast Deletion Handler (Dec 16, 2025)
 * DATE: December 16, 2025
 * WEBSITE: https://gmeowhq.art
 * NETWORK: Base (Chain ID 8453)
 * 
 * FEATURES:
 * - Neynar webhook endpoint for Farcaster events
 * - HMAC signature verification (sha512)
 * - Event routing (cast.created, cast.deleted, miniapp events)
 * - Auto-reply generation for targeted casts
 * - Viral engagement sync (Phase 5.1 background processing)
 * - MiniApp notification token management
 * - Bot analytics tracking (11 metric types)
 * - Rate limiting (100 req/min per IP)
 * - Frame embedding in replies
 * 
 * TODO:
 * - [ ] Add retry logic for transient Neynar API failures
 * - [ ] Monitor cast.deleted handler performance
 * - [ ] Add A/B testing for reply variations
 * - [ ] Optimize engagement sync frequency
 * 
 * REFERENCE DOCUMENTATION:
 * - FARCASTER-BOT-ENHANCEMENT-PLAN-PART-1.md (Bot architecture)
 * - FARCASTER-BOT-ENHANCEMENT-PLAN-PART-2.md (Event types, Section 5.3)
 * - PHASE-1-MISSING-EVENTS-AUDIT.md (Cast deletion handler spec)
 * - lib/agent-auto-reply.ts (Intent detection and reply generation)
 * - lib/viral-engagement-sync.ts (Phase 5.1 viral sync)
 * 
 * CRITICAL ISSUES & WARNINGS:
 * - HMAC verification REQUIRED (reject invalid signatures)
 * - Rate limit: 100 webhooks/min per IP (429 if exceeded)
 * - Viral sync is fire-and-forget (doesn't block webhook response)
 * - Cast deletion: Soft delete (marks deleted_at, preserves data)
 * - Self-cast prevention: Skip if author FID == bot FID
 * 
 * SUGGESTIONS & OPTIMIZATIONS:
 * - Consider batching badge_casts updates (reduce DB writes)
 * - Add webhook replay endpoint for failed events
 * - Monitor cast.deleted frequency (may indicate spam)
 * - Cache bot FID/signer UUID (reduce env lookups)
 * 
 * AVOID (from farcaster.instructions.md):
 * - NO emojis in code
 * - NO unhandled promise rejections
 * - NO mixing old/new patterns
 * - NO hardcoded FIDs or secrets
 * 
 * REQUIREMENTS (from farcaster.instructions.md):
 * - Update CURRENT-TASK.md after changes
 * - Professional response headers (rate limits, request ID)
 * - Zero TypeScript errors
 * - Comprehensive error logging
 * 
 * CHANGE LOG:
 * - 2025-12-16: Added cast.deleted handler (soft delete in badge_casts)
 * - 2025-12-16: Added comprehensive file header
 * - 2025-11-17: Phase 5.1 viral engagement sync integration
 * - 2025-11-16: Phase 4 priority system integration
 */
import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'

import { parseWebhookEvent, verifyAppKeyWithNeynar } from '@farcaster/miniapp-node'
import { rateLimit, getClientIp, webhookLimiter } from '@/lib/rate-limit'
import { withErrorHandler } from '@/lib/error-handler'
import { generateRequestId } from '@/lib/request-id'

import { loadBotStatsConfig } from '@/lib/bot/config'
import { buildAgentAutoReply } from '@/lib/bot'
import { getNeynarServerClient } from '@/lib/neynar-server'
import { resolveBotFid, resolveBotSignerUuid, resolveWebhookSecret } from '@/lib/neynar-bot'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { selectFrameForIntent, formatFrameEmbedForCast } from '@/lib/bot/frames/builder'
// Phase 5.1: Real-time Viral Notifications
// Source: lib/viral-engagement-sync.ts, lib/viral-achievements.ts
// MCP Verified: November 17, 2025
// Approved by: @heycat on November 17, 2025
import { syncCastEngagement } from '@/lib/viral-engagement-sync'
import { checkAndAwardAchievements } from '@/lib/viral-achievements'
// Phase 4: Priority System Integration - replaced dispatchViralNotification with notifyWithXPReward
import { notifyWithXPReward } from '@/lib/notifications'
// Phase 1: Bot Analytics - Track webhook metrics for health monitoring
import { recordBotMetric } from '@/lib/bot/analytics'

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
    // TODO: Implement notification token storage when miniapp-notifications module is available
    console.log('[neynar-webhook] Would store notification token:', {
      fid: resolvedFid,
      token: rawToken,
      status: statusForStore,
      eventType: eventName,
    })

    meta.tokenStored = false
    meta.status = statusForStore
    meta.skipped = 'miniapp-notifications-not-available'
    return { type: 'miniapp-event', meta }
  }

  if (eventName === 'miniapp_removed' || eventName === 'notifications_disabled') {
    if (!isSupabaseConfigured()) {
      meta.skipped = 'supabase-not-configured'
      return { type: 'miniapp-event', meta }
    }

    // TODO: Implement notification token disabling when miniapp-notifications module is available
    console.log('[neynar-webhook] Would disable notification token:', {
      token: rawToken,
      fid: eventFid,
      status: eventName === 'miniapp_removed' ? 'removed' : 'disabled',
      reason: eventName,
    })

    meta.tokenUpdated = false
    meta.status = eventName === 'miniapp_removed' ? 'removed' : 'disabled'
    meta.skipped = 'miniapp-notifications-not-available'
    return { type: 'miniapp-event', meta }
  }

  return null
}

async function tryHandleMiniAppEvent(parsedBody: unknown, requestId: string): Promise<NextResponse | null> {
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
          { status: 500, headers: { 'X-Request-ID': requestId } },
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

    return NextResponse.json({ ok: true, handled: result.type, meta: result.meta }, { headers: { 'X-Request-ID': requestId } })
  } catch (error) {
    console.error('[neynar-webhook] miniapp event handling failed', error)
    return NextResponse.json({ ok: false, error: 'miniapp-event-failed' }, { status: 500, headers: { 'X-Request-ID': requestId } })
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

  let callToAction = 'Log your gm streak & daily quests at https://gmeowhq.art/quests'
  if (lowerText.includes('leaderboard')) {
    callToAction = 'Leaderboard intel unlocked → https://gmeowhq.art/leaderboard'
  } else if (lowerText.includes('guild')) {
    callToAction = 'Recruiters await in HQ → https://gmeowhq.art/guild'
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

    // Phase 4: If tier upgraded, send notification with priority filtering
    if (syncResult.tierUpgrade && badgeCast.fid) {
      // Map viral tier to notification event type
      const tierToEventType: Record<string, string> = {
        mega_viral: 'tier_mega_viral',  // 200 XP - critical priority
        viral: 'tier_viral',              // 150 XP - critical priority
        popular: 'tier_popular',          // 100 XP - high priority
        engaging: 'tier_engaging',        // 50 XP - high priority
        active: 'tier_active',            // 25 XP - medium priority
      }
      
      const eventType = tierToEventType[syncResult.newTier] || 'tier_active'
      const tierEmojis: Record<string, string> = {
        mega_viral: '🔥',
        viral: '⚡',
        popular: '✨',
        engaging: '💫',
        active: '🌟',
      }
      const emoji = tierEmojis[syncResult.newTier] || '🎉'
      
      // BUG FIX: Use 'achievement' category instead of 'viral_tier'
      // DEFAULT_PRIORITY_MAP doesn't have 'viral_tier', causing all viral notifications to be filtered
      // Viral tier upgrades are achievements, so should use 'achievement' category
      await notifyWithXPReward({
        fid: badgeCast.fid,
        category: 'achievement',
        title: `${emoji} Viral Tier Upgrade!`,
        body: `Your cast reached "${syncResult.newTier}" tier!`,
        targetUrl: `https://warpcast.com/~/conversations/${castHash}`,
        eventType,
        metadata: { castHash, oldTier: syncResult.oldTier, newTier: syncResult.newTier },
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

export const POST = withErrorHandler(async (req: NextRequest) => {
  const requestId = generateRequestId()
  const startTime = Date.now()
  
  // Track webhook received
  recordBotMetric({
    type: 'webhook_received',
    timestamp: new Date(),
  }).catch(err => console.warn('[bot-analytics] Failed to record webhook_received:', err))
  
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, webhookLimiter)
  
  if (!success) {
    // Track rate limit hit
    recordBotMetric({
      type: 'rate_limit_hit',
      timestamp: new Date(),
      metadata: { ip },
    }).catch(err => console.warn('[bot-analytics] Failed to record rate_limit_hit:', err))
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'X-Request-ID': requestId } }
    )
  }

  const secret = resolveWebhookSecret()
  if (!secret) {
    console.error('[neynar-webhook] Missing NEYNAR_WEBHOOK_SECRET')
    return NextResponse.json({ ok: false, error: 'server not configured' }, { status: 500, headers: { 'X-Request-ID': requestId } })
  }

  const signature = req.headers.get(SIGNATURE_HEADER)
  if (!signature) {
    return NextResponse.json({ ok: false, error: 'missing signature header' }, { status: 400, headers: { 'X-Request-ID': requestId } })
  }

  const rawBody = await req.text()
  const expectedSignature = computeSignature(rawBody, secret)
  const signatureValid = safeCompareHex(signature, expectedSignature)
  if (!signatureValid) {
    return NextResponse.json({ ok: false, error: 'invalid signature' }, { status: 401, headers: { 'X-Request-ID': requestId } })
  }

  let parsedBody: unknown
  try {
    parsedBody = JSON.parse(rawBody)
  } catch (error) {
    console.warn('[neynar-webhook] Failed to parse payload', error)
    return NextResponse.json({ ok: false, error: 'invalid payload' }, { status: 400, headers: { 'X-Request-ID': requestId } })
  }

  const miniAppResponse = await tryHandleMiniAppEvent(parsedBody, requestId)
  if (miniAppResponse) {
    return miniAppResponse
  }

  if (!parsedBody || typeof parsedBody !== 'object') {
    return NextResponse.json({ ok: false, error: 'unsupported body' }, { status: 400, headers: { 'X-Request-ID': requestId } })
  }

  const event = parsedBody as NeynarWebhookEvent

  const eventType = event.type || event.event_type
  
  // ========================================================================
  // Handle cast.deleted event
  // ========================================================================
  // When a cast is deleted, mark it in badge_casts table (soft delete)
  // This prevents viral sync from processing deleted casts
  // Reference: PHASE-1-MISSING-EVENTS-AUDIT.md
  if (eventType === 'cast.deleted') {
    const castHash = event.data?.hash
    if (castHash) {
      try {
        const supabase = getSupabaseServerClient()
        if (supabase) {
          const { error } = await supabase
            .from('badge_casts')
            .update({ 
              deleted_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('cast_hash', castHash)
            .is('deleted_at', null)  // Only update if not already marked deleted
          
          if (error) {
            console.warn('[webhook] Failed to mark cast as deleted:', error)
          } else {
            console.log('[webhook] Cast marked as deleted:', castHash.slice(0, 10))
          }
          
          // Track cast deletion
          recordBotMetric({
            type: 'webhook_processed',
            timestamp: new Date(),
            metadata: { eventType: 'cast.deleted', castHash }
          }).catch(err => console.warn('[bot-analytics] Failed to record cast.deleted:', err))
        }
      } catch (error) {
        console.error('[webhook] Error handling cast.deleted:', error)
      }
    }
    
    return NextResponse.json({ 
      ok: true, 
      handled: 'cast-deleted',
      castHash: castHash?.slice(0, 10)
    }, { headers: { 'X-Request-ID': requestId } })
  }
  // ========================================================================
  
  if (eventType !== 'cast.created') {
    return NextResponse.json({ ok: true, skipped: `ignored:${eventType || 'unknown'}` }, { headers: { 'X-Request-ID': requestId } })
  }

  const data = event.data
  if (!data || !data.hash) {
    return NextResponse.json({ ok: false, error: 'missing cast data' }, { status: 400, headers: { 'X-Request-ID': requestId } })
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
    return NextResponse.json({ ok: true, skipped: 'missing-bot-fid' }, { headers: { 'X-Request-ID': requestId } })
  }

  if (authorIsBot(data, botFid)) {
    console.log('[bot-webhook] Skipping self-cast from bot FID:', botFid)
    return NextResponse.json({ ok: true, skipped: 'self-cast' }, { headers: { 'X-Request-ID': requestId } })
  }

  const signerUuid = resolveBotSignerUuid()
  if (!signerUuid) {
    console.warn('[neynar-webhook] Missing signer UUID; skipping reply')
    return NextResponse.json({ ok: true, skipped: 'missing-signer-uuid' }, { headers: { 'X-Request-ID': requestId } })
  }

  // Load config early - needed for targeting check
  const config = await loadBotStatsConfig()

  const isTargeted = isCastTargetedToBot(data, botFid, config)
  if (!isTargeted) {
    // Track targeting check failed
    recordBotMetric({
      type: 'targeting_check_failed',
      timestamp: new Date(),
      fid: data.author?.fid,
      castHash: data.hash,
    }).catch(err => console.warn('[bot-analytics] Failed to record targeting_check_failed:', err))
    
    console.log('[bot-webhook] Cast not targeted:', {
      author: data.author?.username,
      fid: data.author?.fid,
      text: data.text?.substring(0, 100),
      botFid,
      mentions: data.mentioned_profiles?.map(p => p.fid),
    })
    return NextResponse.json({ ok: true, skipped: 'bot-not-targeted' }, { headers: { 'X-Request-ID': requestId } })
  }
  
  // Track targeting check passed
  recordBotMetric({
    type: 'targeting_check_passed',
    timestamp: new Date(),
    fid: data.author?.fid,
    castHash: data.hash,
  }).catch(err => console.warn('[bot-analytics] Failed to record targeting_check_passed:', err))
  
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
      
      // Track reply generated
      const responseTime = Date.now() - startTime
      recordBotMetric({
        type: 'reply_generated',
        timestamp: new Date(),
        fid: data.author?.fid,
        castHash: data.hash,
        responseTimeMs: responseTime,
        metadata: { intent: autoReply.intent },
      }).catch(err => console.warn('[bot-analytics] Failed to record reply_generated:', err))

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
      // Track reply failed
      recordBotMetric({
        type: 'reply_failed',
        timestamp: new Date(),
        fid: data.author?.fid,
        castHash: data.hash,
        errorMessage: `${autoReply.reason}: ${autoReply.detail || 'no detail'}`,
      }).catch(err => console.warn('[bot-analytics] Failed to record reply_failed:', err))
      
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
      }, { headers: { 'X-Request-ID': requestId } })
    }
  } catch (error) {
    // Track reply failed on exception
    recordBotMetric({
      type: 'reply_failed',
      timestamp: new Date(),
      fid: data.author?.fid,
      castHash: data.hash,
      errorMessage: (error as Error)?.message || 'Unknown error',
    }).catch(err => console.warn('[bot-analytics] Failed to record reply_failed:', err))
    
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
    return NextResponse.json({ ok: true, skipped: 'empty-reply' }, { headers: { 'X-Request-ID': requestId } })
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
    
    // Track cast published
    const totalResponseTime = Date.now() - startTime
    recordBotMetric({
      type: 'cast_published',
      timestamp: new Date(),
      fid: data.author?.fid,
      castHash: response.cast?.hash ?? data.hash,
      responseTimeMs: totalResponseTime,
      metadata: { intent: detectedIntent, frameEmbedded: frameEmbeds.length > 0 },
    }).catch(err => console.warn('[bot-analytics] Failed to record cast_published:', err))
    
    // Track webhook processed (successful end-to-end)
    recordBotMetric({
      type: 'webhook_processed',
      timestamp: new Date(),
      fid: data.author?.fid,
      castHash: data.hash,
      responseTimeMs: totalResponseTime,
    }).catch(err => console.warn('[bot-analytics] Failed to record webhook_processed:', err))

    return NextResponse.json({ 
      ok: true, 
      hash: response.cast?.hash ?? null, 
      meta: replyMeta,
      frameEmbedded: frameEmbeds.length > 0
    }, { headers: { 'X-Request-ID': requestId } })
  } catch (error: any) {
    const isDuplicate = error?.status === 409 || error?.response?.status === 409
    
    // Track cast failed (unless duplicate)
    if (!isDuplicate) {
      recordBotMetric({
        type: 'cast_failed',
        timestamp: new Date(),
        fid: data.author?.fid,
        castHash: data.hash,
        errorMessage: error?.message || 'Unknown error',
        metadata: { status: error?.status ?? error?.response?.status },
      }).catch(err => console.warn('[bot-analytics] Failed to record cast_failed:', err))
      
      // Track neynar API error
      recordBotMetric({
        type: 'neynar_api_error',
        timestamp: new Date(),
        errorMessage: `publishCast failed: ${error?.message || 'Unknown'}`,
        metadata: { status: error?.status ?? error?.response?.status },
      }).catch(err => console.warn('[bot-analytics] Failed to record neynar_api_error:', err))
    }
    
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
      { status: isDuplicate ? 200 : 502, headers: { 'X-Request-ID': requestId } }
    )
  }
})
