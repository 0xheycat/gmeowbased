import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { getSupabaseServerClient } from '@/lib/supabase/edge'
import { WebhookPayloadSchema } from '@/lib/validation/api-schemas'
import {
  calculateViralBonus,
  hasMetricsIncreased,
  calculateIncrementalBonus,
  type EngagementMetrics,
} from '@/lib/viral/viral-bonus'
import { trackEvent } from '@/lib/utils/analytics'
import { checkIdempotency, storeIdempotency, returnCachedResponse } from '@/lib/middleware/idempotency'
import { generateRequestId } from '@/lib/middleware/request-id'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Neynar Webhook: Cast Engagement Updates
 * 
 * Receives cast engagement events from Neynar and awards viral bonus XP.
 * 
 * Quality Gates Applied:
 * - GI-7: Neynar webhook spec compliance
 * - GI-11: Signature verification, duplicate prevention, rate limiting
 * - GI-12: Secure webhook endpoint (POST only)
 * - GI-13: Clear error messages and logging
 * 
 * Route: POST /api/webhooks/neynar/cast-engagement
 */

// GI-11: Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100

// In-memory rate limiting (production should use Redis/Vercel KV)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

/**
 * Verify Neynar webhook signature
 * 
 * @param payload - Raw webhook payload
 * @param signature - Signature from x-neynar-signature header
 * @returns True if signature is valid
 * 
 * GI-11: Security - prevent webhook spoofing
 */
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const webhookSecret = process.env.NEYNAR_WEBHOOK_SECRET
  
  if (!webhookSecret) {
    console.error('[Webhook] NEYNAR_WEBHOOK_SECRET not configured')
    return false
  }
  
  try {
    // GI-11: HMAC-SHA256 signature verification
    const hmac = createHmac('sha256', webhookSecret)
    hmac.update(payload)
    const expectedSignature = hmac.digest('hex')
    
    // GI-11: Timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature, 'hex')
    const expectedBuffer = Buffer.from(expectedSignature, 'hex')
    
    if (signatureBuffer.length !== expectedBuffer.length) {
      return false
    }
    
    return timingSafeEqual(signatureBuffer, expectedBuffer)
  } catch (error) {
    console.error('[Webhook] Signature verification failed:', error)
    return false
  }
}

/**
 * Check rate limit for IP address
 * 
 * @param ip - Request IP address
 * @returns True if rate limit exceeded
 * 
 * GI-11: Rate limiting to prevent abuse
 */
function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)
  
  if (!record || now > record.resetAt) {
    // Reset counter
    rateLimitMap.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    })
    return false
  }
  
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true
  }
  
  record.count++
  return false
}

/**
 * Award viral bonus XP to user
 * 
 * @param fid - User's Farcaster ID
 * @param castHash - Cast hash
 * @param bonusXp - XP to award
 * @returns True if successful
 * 
 * GI-11: Idempotent XP awards with transaction safety
 */
async function awardViralBonus(
  fid: number,
  castHash: string,
  bonusXp: number
): Promise<boolean> {
  if (bonusXp <= 0) return true // Nothing to award
  
  const supabase = getSupabaseServerClient()
  
  if (!supabase) {
    console.error('[Webhook] Database connection failed')
    return false
  }
  
  try {
    // GI-11: Update user points atomically
    const { error: pointsError } = await supabase.rpc('increment_user_xp', {
      p_fid: fid,
      p_xp_amount: bonusXp,
      p_source: 'viral_bonus',
    })
    
    if (pointsError) {
      console.error('[Webhook] Failed to award XP:', pointsError)
      return false
    }
    
    // GI-13: Track analytics event
    await trackEvent('viral_bonus_awarded', {
      fid: fid.toString(),
      castHash,
      bonusXp,
      source: 'neynar_webhook',
    })
    
    return true
  } catch (error) {
    console.error('[Webhook] Error awarding viral bonus:', error)
    return false
  }
}

/**
 * Update cast metrics in database
 * 
 * @param castHash - Cast hash
 * @param metrics - New engagement metrics
 * @param bonusXp - Viral bonus XP
 * @returns Updated cast record or null
 * 
 * GI-11: Atomic database updates
 */
async function updateCastMetrics(
  castHash: string,
  metrics: EngagementMetrics,
  bonusXp: number
) {
  const supabase = getSupabaseServerClient()
  
  if (!supabase) {
    console.error('[Webhook] Database connection failed')
    return null
  }
  
  try {
    const { data, error } = await supabase
      .from('badge_casts')
      .update({
        likes_count: metrics.likes,
        recasts_count: metrics.recasts,
        replies_count: metrics.replies,
        viral_bonus_xp: bonusXp,
        last_metrics_update: new Date().toISOString(),
      })
      .eq('cast_hash', castHash)
      .select('id, fid, badge_id')
      .single()
    
    if (error) {
      console.error('[Webhook] Failed to update cast metrics:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('[Webhook] Error updating cast metrics:', error)
    return null
  }
}

/**
 * Process cast engagement webhook
 * 
 * @param request - Next.js request
 * @returns Response with success/error
 * 
 * GI-7: Neynar webhook spec compliance
 * GI-11: Security checks and error handling
 * GI-13: Clear response messages
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  try {
    // GI-11: Rate limiting check
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'
    
    if (isRateLimited(ip)) {
      console.warn(`[Webhook] Rate limit exceeded for IP: ${ip}`)
      return NextResponse.json(
        { error: 'Rate limit exceeded', message: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'X-Request-ID': requestId } }
      )
    }
    
    // GI-11: Signature verification
    const signature = request.headers.get('x-neynar-signature')
    
    if (!signature) {
      console.warn('[Webhook] Missing signature header')
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing webhook signature' },
        { status: 401, headers: { 'X-Request-ID': requestId } }
      )
    }
    
    // GI-7: Parse webhook payload
    const rawBody = await request.text()
    
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn('[Webhook] Invalid signature')
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid webhook signature' },
        { status: 401, headers: { 'X-Request-ID': requestId } }
      )
    }
    
    const payload = JSON.parse(rawBody)
    
    // GI-8: Validate webhook payload structure
    const validation = WebhookPayloadSchema.safeParse(payload)
    if (!validation.success) {
      console.error('[Webhook] Invalid payload structure:', validation.error.issues)
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid payload structure', issues: validation.error.issues },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      )
    }
    
    // GI-7: Validate webhook event type
    if (payload.type !== 'cast.engagement.updated') {
      console.log(`[Webhook] Ignoring event type: ${payload.type}`)
      return NextResponse.json({ success: true, message: 'Event type ignored' }, {
        headers: { 'X-Request-ID': requestId }
      })
    }
    
    // GI-7: Extract engagement data
    const { cast_hash, likes, recasts, replies } = payload.data || {}
    
    if (!cast_hash) {
      console.error('[Webhook] Missing cast_hash in payload')
      return NextResponse.json(
        { error: 'Bad Request', message: 'Missing cast_hash' },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      )
    }
    
    // Idempotency check (CRITICAL - prevents duplicate XP on Neynar retry)
    // Use event data as key since Neynar can retry webhooks on 5xx errors
    const idempotencyKey = `webhook-cast-engagement-${cast_hash}-${likes}-${recasts}-${replies}`
    const idempotencyResult = await checkIdempotency(idempotencyKey)
    if (idempotencyResult.exists) {
      console.log(`[Webhook] Replaying cached response for key: ${idempotencyKey} (prevented duplicate XP)`)
      return returnCachedResponse(idempotencyResult)
    }
    
    // GI-11: Get existing cast record
    const supabase = getSupabaseServerClient()
    
    if (!supabase) {
      console.error('[Webhook] Database connection failed')
      return NextResponse.json(
        { error: 'Internal Error', message: 'Database connection failed' },
        { status: 500, headers: { 'X-Request-ID': requestId } }
      )
    }
    
    const { data: existingCast, error: fetchError } = await supabase
      .from('badge_casts')
      .select('*')
      .eq('cast_hash', cast_hash)
      .single()
    
    if (fetchError || !existingCast) {
      console.warn(`[Webhook] Cast not found: ${cast_hash}`)
      return NextResponse.json(
        { error: 'Not Found', message: 'Cast not found in database' },
        { status: 404, headers: { 'X-Request-ID': requestId } }
      )
    }
    
    // GI-11: Check if metrics increased (prevent duplicate awards)
    const currentMetrics: EngagementMetrics = {
      likes: likes || 0,
      recasts: recasts || 0,
      replies: replies || 0,
    }
    
    const previousMetrics: EngagementMetrics = {
      likes: existingCast.likes_count || 0,
      recasts: existingCast.recasts_count || 0,
      replies: existingCast.replies_count || 0,
    }
    
    if (!hasMetricsIncreased(currentMetrics, previousMetrics)) {
      console.log(`[Webhook] No metrics increase for cast: ${cast_hash}`)
      return NextResponse.json({
        success: true,
        message: 'Metrics unchanged',
        viralBonusAwarded: 0,
      }, {
        headers: { 'X-Request-ID': requestId }
      })
    }
    
    // Calculate incremental bonus (only award for new engagement)
    const incrementalXP = calculateIncrementalBonus(currentMetrics, previousMetrics)
    
    // Calculate current viral bonus and tier
    const viralBonus = calculateViralBonus(currentMetrics)
    
    // Update cast metrics in database
    const updatedCast = await updateCastMetrics(
      cast_hash,
      currentMetrics,
      viralBonus.xp // Store total XP, not incremental
    )
    
    if (!updatedCast) {
      return NextResponse.json(
        { error: 'Internal Error', message: 'Failed to update cast metrics' },
        { status: 500, headers: { 'X-Request-ID': requestId } }
      )
    }
    
    // Award incremental XP to user
    const awarded = await awardViralBonus(
      existingCast.fid,
      cast_hash,
      incrementalXP
    )
    
    if (!awarded) {
      return NextResponse.json(
        { error: 'Internal Error', message: 'Failed to award viral bonus' },
        { status: 500, headers: { 'X-Request-ID': requestId } }
      )
    }
    
    // GI-13: Track milestone events
    if (viralBonus.tier.name !== 'None') {
      await trackEvent('cast_viral_milestone', {
        fid: existingCast.fid,
        castHash: cast_hash,
        tier: viralBonus.tier.name,
        totalXp: viralBonus.xp,
        incrementalXp: incrementalXP,
        score: viralBonus.score,
      })
    }
    
    // GI-13: Return clear success response
    const response = {
      success: true,
      viralBonusAwarded: incrementalXP,
      totalViralXp: viralBonus.xp,
      tier: viralBonus.tier.name,
      score: viralBonus.score,
      metrics: {
        likes: currentMetrics.likes,
        recasts: currentMetrics.recasts,
        replies: currentMetrics.replies,
      },
    }
    
    // Store result for idempotency (24h cache TTL, prevents duplicate XP on retry)
    await storeIdempotency(idempotencyKey, response, 200)
    
    return NextResponse.json(response, {
      headers: { 'X-Request-ID': requestId }
    })
  } catch (error) {
    console.error('[Webhook] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal Error', message: 'Failed to process webhook' },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }
}

// GI-12: Reject non-POST requests
export async function GET() {
  const requestId = generateRequestId()
  return NextResponse.json(
    { error: 'Method Not Allowed', message: 'Use POST to send webhook events' },
    { status: 405, headers: { 'X-Request-ID': requestId } }
  )
}

export async function PUT() {
  const requestId = generateRequestId()
  return NextResponse.json(
    { error: 'Method Not Allowed', message: 'Use POST to send webhook events' },
    { status: 405, headers: { 'X-Request-ID': requestId } }
  )
}

export async function DELETE() {
  const requestId = generateRequestId()
  return NextResponse.json(
    { error: 'Method Not Allowed', message: 'Use POST to send webhook events' },
    { status: 405, headers: { 'X-Request-ID': requestId } }
  )
}
