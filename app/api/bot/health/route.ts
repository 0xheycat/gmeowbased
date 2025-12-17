import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { rateLimit, getClientIp, webhookLimiter } from '@/lib/middleware/rate-limit'
import { resolveBotFid, resolveBotSignerUuid } from '@/lib/integrations/neynar-bot'
import { withErrorHandler } from '@/lib/middleware/error-handler'
import { generateRequestId } from '@/lib/middleware/request-id'

export const runtime = 'nodejs'

/**
 * Public bot health check endpoint
 * No authentication required - provides basic operational status
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const requestId = generateRequestId()
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, webhookLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'X-Request-ID': requestId } }
    )
  }

  const botFid = resolveBotFid()
  const signerUuid = resolveBotSignerUuid()

  const health = {
    status: 'operational',
    timestamp: new Date().toISOString(),
    bot: {
      fid: botFid,
      username: 'gmeowbased',
      configured: Boolean(botFid && signerUuid),
    },
    webhook: {
      url: 'https://gmeowhq.art/api/neynar/webhook',
      status: 'listening',
    },
    features: {
      intents: 9,
      frameTypes: 6,
      rateLimit: '5 requests per minute',
      minNeynarScore: 0.5,
    },
    frames: {
      specification: 'Farcaster Mini App Embed v1',
      actionType: 'launch_frame',
      buttonLimit: 1,
      sdkBased: true,
    },
  }

  // Check if core configuration is present
  if (!botFid || !signerUuid) {
    return NextResponse.json(
      {
        ...health,
        status: 'degraded',
        warning: 'Bot configuration incomplete',
        missing: {
          fid: !botFid,
          signer: !signerUuid,
        },
      },
      { status: 503, headers: { 'X-Request-ID': requestId } }
    )
  }

  return NextResponse.json(health, { headers: { 'X-Request-ID': requestId } })
})
