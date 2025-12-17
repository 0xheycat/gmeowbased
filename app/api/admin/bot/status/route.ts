import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Signer } from '@neynar/nodejs-sdk/build/api/models/signer'

import { generateRequestId } from '@/lib/middleware/request-id'
import { rateLimit, getClientIp, strictLimiter } from '@/lib/middleware/rate-limit'
import { getNeynarServerClient } from '@/lib/integrations/neynar-server'
import {
  previewSecret,
  resolveBotFid,
  resolveBotSignerUuid,
  resolveNeynarApiKey,
  resolveWebhookSecret,
} from '@/lib/integrations/neynar-bot'
import { extractHttpErrorMessage } from '@/lib/middleware/http-error'
import { validateAdminRequest } from '@/lib/auth/admin'
import { withErrorHandler } from '@/lib/middleware/error-handler'

export const runtime = 'nodejs'

function normalizeSigner(signer: Signer | null | undefined) {
  if (!signer) return null
  return {
    signerUuid: signer.signer_uuid ?? null,
    status: signer.status ?? null,
    fid: signer.fid ?? null,
    approvalUrl: signer.signer_approval_url ?? null,
    publicKey: signer.public_key ?? null,
    permissions: Array.isArray(signer.permissions) ? signer.permissions : [],
  }
}

export const GET = withErrorHandler(async (req: NextRequest) => {
  const requestId = generateRequestId()
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, strictLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'X-Request-ID': requestId } }
    )
  }

  const auth = await validateAdminRequest(req)
  if (!auth.ok && auth.reason !== 'admin_security_disabled') {
    return NextResponse.json({ ok: false, error: 'admin_auth_required', reason: auth.reason }, { status: 401, headers: { 'X-Request-ID': requestId } })
  }

  const checkedAt = new Date().toISOString()
  const signerUuid = resolveBotSignerUuid()
  const botFid = resolveBotFid()
  const webhookSecret = resolveWebhookSecret()
  const apiKey = resolveNeynarApiKey()

  const envSummary = {
    apiKey: {
      present: Boolean(apiKey),
      preview: previewSecret(apiKey),
    },
    signerUuid: {
      present: Boolean(signerUuid),
      value: signerUuid,
      preview: previewSecret(signerUuid),
    },
    botFid: {
      present: Number.isFinite(botFid),
      value: botFid,
    },
    webhookSecret: {
      present: Boolean(webhookSecret),
      preview: previewSecret(webhookSecret),
    },
  }

  const warnings: string[] = []
  if (!envSummary.apiKey.present) warnings.push('Missing Neynar API key. Server casts will fail without it.')
  if (!envSummary.signerUuid.present) warnings.push('Missing signer UUID. Bot cannot publish casts until set.')
  if (!envSummary.botFid.present) warnings.push('Missing bot FID. Webhook auto-replies will not mention the bot user.')
  if (!envSummary.webhookSecret.present) warnings.push('Missing webhook secret. Incoming webhook validation is disabled.')

  let signer = null
  let signerError: string | null = null

  if (envSummary.signerUuid.present && envSummary.apiKey.present) {
    try {
      const client = getNeynarServerClient()
      const response = await client.lookupSigner({ signerUuid: signerUuid! })
      signer = normalizeSigner(response)
      if (signer?.status && signer.status !== 'approved') {
        warnings.push(`Signer status is currently '${signer.status}'. Approve the signer to enable publishing.`)
      }
      if (signer?.fid && botFid && signer.fid !== botFid) {
        warnings.push(`Signer FID (${signer.fid}) does not match configured bot FID (${botFid}).`)
      }
    } catch (error) {
      signerError = extractHttpErrorMessage(error, 'Unexpected failure while checking bot status')
      warnings.push('Unable to fetch signer status from Neynar API.')
    }
  } else if (!envSummary.signerUuid.present) {
    signerError = 'NEYNAR_BOT_SIGNER_UUID is not configured.'
  } else if (!envSummary.apiKey.present) {
    signerError = 'NEYNAR_API_KEY is not configured.'
  }

  return NextResponse.json({
    ok: true,
    checkedAt,
    env: envSummary,
    signer,
    botFid,
    warnings,
    signerError,
  }, {
    headers: { 'X-Request-ID': requestId }
  })
})
