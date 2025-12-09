/**
 * Badge Minted Webhook
 * 
 * Receives notifications when badges are successfully minted on-chain.
 * Can be used by external systems to track minting status and trigger
 * downstream actions (notifications, analytics, etc.)
 * 
 * Endpoint: POST /api/webhooks/badge-minted
 * 
 * Security:
 * - Verifies WEBHOOK_SECRET to prevent unauthorized submissions
 * - Rate limited via webhookLimiter (500 req/5min)
 * - Idempotency prevents duplicate XP awards on retry
 * 
 * Idempotency: Event-based key (webhook-badge-minted-{fid}-{txHash})
 * Critical: Prevents duplicate XP if webhook retries on 5xx error
 * 
 * Payload Schema:
 * {
 *   fid: number,
 *   badgeId: string,
 *   badgeType: string,
 *   tier: string,
 *   txHash: string,
 *   tokenId: number,
 *   chain: string,
 *   contractAddress: string,
 *   mintedAt: string (ISO timestamp)
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, webhookLimiter } from '@/lib/rate-limit'
import { z } from 'zod'
import { checkIdempotency, storeIdempotency, returnCachedResponse } from '@/lib/idempotency'
import { generateRequestId } from '@/lib/request-id'

export const runtime = 'nodejs'

/**
 * Badge minted webhook payload schema
 */
const BadgeMintedPayloadSchema = z.object({
  fid: z.number().positive(),
  badgeId: z.string(),
  badgeType: z.string(),
  tier: z.enum(['common', 'rare', 'epic', 'legendary', 'mythic']),
  txHash: z.string(),
  tokenId: z.number().nonnegative(),
  chain: z.enum(['base', 'ink', 'unichain', 'optimism']),
  contractAddress: z.string(),
  mintedAt: z.string(),
})

type BadgeMintedPayload = z.infer<typeof BadgeMintedPayloadSchema>

/**
 * POST handler for badge minted webhook
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
    const { success: rateLimitSuccess } = await rateLimit(ip, webhookLimiter)
    
    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: { 'X-Request-ID': requestId }
        }
      )
    }
    
    // Verify webhook secret
    const authHeader = request.headers.get('authorization')
    const webhookSecret = process.env.WEBHOOK_SECRET
    
    if (!webhookSecret) {
      console.error('[Webhook] WEBHOOK_SECRET not configured')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { 
          status: 500,
          headers: { 'X-Request-ID': requestId }
        }
      )
    }
    
    if (authHeader !== `Bearer ${webhookSecret}`) {
      console.error('[Webhook] Unauthorized request from IP:', ip)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { 
          status: 401,
          headers: { 'X-Request-ID': requestId }
        }
      )
    }
    
    // Parse and validate payload
    const body = await request.json()
    const payload = BadgeMintedPayloadSchema.parse(body)
    
    // Idempotency check (prevents duplicate XP if webhook retries)
    const idempotencyKey = `webhook-badge-minted-${payload.fid}-${payload.txHash}`
    const idempotencyResult = await checkIdempotency(idempotencyKey)
    if (idempotencyResult.exists) {
      console.log(`[Webhook] Replaying cached response for key: ${idempotencyKey} (prevented duplicate XP)`);
      return returnCachedResponse(idempotencyResult);
    }
    
    console.log('[Webhook] Badge minted notification received:', {
      fid: payload.fid,
      badgeId: payload.badgeId,
      tier: payload.tier,
      chain: payload.chain,
      txHash: payload.txHash,
    })
    
    // Process webhook payload
    await processBadgeMintedWebhook(payload)
    
    const response = {
      success: true,
      message: 'Badge minted webhook processed',
      timestamp: new Date().toISOString(),
    }
    
    // Store result for idempotency (24h cache TTL, prevents duplicate XP)
    await storeIdempotency(idempotencyKey, response, 200)
    
    return NextResponse.json(response, {
      headers: { 'X-Request-ID': requestId }
    })
  } catch (error) {
    console.error('[Webhook] Error processing badge minted webhook:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid payload',
          details: error.issues,
        },
        { 
          status: 400,
          headers: { 'X-Request-ID': requestId }
        }
      )
    }
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { 
        status: 500,
        headers: { 'X-Request-ID': requestId }
      }
    )
  }
}

/**
 * Process badge minted webhook
 * 
 * This is where you can add custom logic for handling badge mints:
 * - Send notifications to users via Miniapp notifications
 * - Update analytics/metrics
 * - Trigger social sharing prompts
 * - Award bonus XP for first mint
 * - etc.
 */
async function processBadgeMintedWebhook(payload: BadgeMintedPayload) {
  try {
    // TODO: Add your custom webhook processing logic here
    
    // Example 1: Send Miniapp notification
    // await sendMiniappNotification({
    //   fid: payload.fid,
    //   title: 'Badge Minted! 🎉',
    //   body: `Your ${payload.tier} badge "${payload.badgeId}" has been minted on-chain!`,
    //   url: `https://gmeowhq.art/profile/${payload.fid}/badges`,
    // })
    
    // Example 2: Track analytics event
    // await trackEvent({
    //   event: 'badge_minted',
    //   fid: payload.fid,
    //   properties: {
    //     badgeId: payload.badgeId,
    //     tier: payload.tier,
    //     chain: payload.chain,
    //   },
    // })
    
    // Example 3: Award bonus XP for first mythic/legendary mint
    // if (payload.tier === 'mythic' || payload.tier === 'legendary') {
    //   await awardBonusXP(payload.fid, 100, 'First rare badge minted')
    // }
    
    console.log('[Webhook] Badge minted webhook processed successfully:', payload.badgeId)
  } catch (error) {
    console.error('[Webhook] Error in processBadgeMintedWebhook:', error)
    throw error
  }
}

/**
 * GET handler for webhook status check
 */
export async function GET() {
  const requestId = generateRequestId()
  
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/webhooks/badge-minted',
    method: 'POST',
    description: 'Receives notifications when badges are minted on-chain',
    payload: {
      fid: 'number',
      badgeId: 'string',
      badgeType: 'string',
      tier: 'common|rare|epic|legendary|mythic',
      txHash: 'string',
      tokenId: 'number',
      chain: 'base|ink|unichain|optimism',
      contractAddress: 'string',
      mintedAt: 'ISO timestamp',
    },
  }, {
    headers: { 'X-Request-ID': requestId }
  })
}
