import { NextRequest, NextResponse } from 'next/server'

import { getNeynarServerClient } from '@/lib/neynar-server'
import { resolveBotSignerUuid } from '@/lib/neynar-bot'
import { extractHttpErrorMessage } from '@/lib/http-error'
import { validateAdminRequest } from '@/lib/admin-auth'
import { rateLimit, getClientIp, strictLimiter } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const MAX_CAST_LENGTH = 320

type PublishRequestBody = {
  text?: string
  channelId?: string | null
  parent?: string | null
  parentAuthorFid?: number | string | null
  idem?: string | null
}

function sanitizeCastText(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length <= MAX_CAST_LENGTH) return trimmed
  return `${trimmed.slice(0, MAX_CAST_LENGTH - 1)}…`
}

function parseParentAuthorFid(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined
  const parsed = typeof value === 'string' ? parseInt(value, 10) : value
  if (!Number.isFinite(parsed)) return undefined
  return parsed > 0 ? parsed : undefined
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, strictLimiter)
  
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const auth = await validateAdminRequest(req)
  if (!auth.ok && auth.reason !== 'admin_security_disabled') {
    return NextResponse.json({ ok: false, error: 'admin_auth_required', reason: auth.reason }, { status: 401 })
  }

  let body: PublishRequestBody
  try {
    body = (await req.json()) as PublishRequestBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload' }, { status: 400 })
  }

  const text = typeof body.text === 'string' ? body.text : ''
  if (!text.trim()) {
    return NextResponse.json({ ok: false, error: 'Cast text is required' }, { status: 400 })
  }

  const signerUuid = resolveBotSignerUuid()
  if (!signerUuid) {
    return NextResponse.json(
      { ok: false, error: 'Bot signer UUID is not configured on the server' },
      { status: 500 }
    )
  }

  const channelId = typeof body.channelId === 'string' ? body.channelId.trim() : undefined
  const parent = typeof body.parent === 'string' ? body.parent.trim() : undefined
  const parentAuthorFid = parseParentAuthorFid(body.parentAuthorFid)
  const idem = typeof body.idem === 'string' && body.idem.trim().length > 0 ? body.idem.trim() : undefined
  const payload = {
    signerUuid,
    text: sanitizeCastText(text),
    channelId: channelId ? channelId : undefined,
    parent: parent ? parent : undefined,
    parentAuthorFid,
    idem,
  }

  try {
    const client = getNeynarServerClient()
    const response = await client.publishCast(payload)
    return NextResponse.json({
      ok: true,
      cast: response.cast ?? null,
      publishedAt: new Date().toISOString(),
    })
  } catch (error) {
    const message = extractHttpErrorMessage(error, 'Failed to publish cast via Neynar API')
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}
