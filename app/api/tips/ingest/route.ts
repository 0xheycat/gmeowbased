import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp, webhookLimiter } from '@/lib/rate-limit'
import { publishTip } from '@/lib/tips-broker'
import { scoreTipMentionBroadcast } from '@/lib/tips-scoreboard'
import type { MutableTipBroadcast, TipMentionContext } from '@/lib/tips-types'
import { withErrorHandler } from '@/lib/error-handler'
import { generateRequestId } from '@/lib/request-id'

export const runtime = 'nodejs'

const REQUIRED_TOKEN = process.env.TIP_INGEST_KEY ?? ''

function unauthorized() {
  return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 })
}

function badRequest(reason: string) {
  return NextResponse.json({ ok: false, reason }, { status: 400 })
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim())
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function parseActorIdentifier(value: unknown): string | number | null | undefined {
  if (value === null) return null
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }
  return undefined
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  const requestId = generateRequestId()
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, webhookLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'X-Request-ID': requestId } }
    )
  }

  if (REQUIRED_TOKEN) {
    const auth = req.headers.get('authorization') || ''
    if (auth !== `Bearer ${REQUIRED_TOKEN}`) return unauthorized()
  }

  let payload: unknown
  try {
    payload = await req.json()
  } catch (error) {
    console.warn('Tip ingest JSON parse failed:', (error as Error)?.message || error)
    return badRequest('invalid-json')
  }

  if (!payload || typeof payload !== 'object') {
    return badRequest('invalid-payload')
  }

  const body = payload as Record<string, unknown>
  const toAddress = typeof body.toAddress === 'string' ? body.toAddress : undefined
  const toFidRaw = body.toFid
  const toFid =
    typeof toFidRaw === 'number'
      ? toFidRaw
      : typeof toFidRaw === 'string' && /^\d+$/.test(toFidRaw)
        ? Number(toFidRaw)
        : undefined

  if (!toAddress && !toFid) {
    return badRequest('missing-target')
  }

  const rawKind = typeof body.kind === 'string' ? body.kind.trim().toLowerCase() : ''
  const kind: MutableTipBroadcast['kind'] = rawKind === 'mention' || rawKind === 'activity' ? rawKind : 'tip'
  const toUsername = typeof body.toUsername === 'string' ? body.toUsername.trim().replace(/^@/, '') : undefined
  const toDisplay = typeof body.toDisplay === 'string' ? body.toDisplay.trim() : undefined
  const toAvatarUrl = typeof body.toAvatarUrl === 'string' ? body.toAvatarUrl.trim() : undefined
  const fromAvatarUrl = typeof body.fromAvatarUrl === 'string' ? body.fromAvatarUrl.trim() : undefined

  const event: MutableTipBroadcast = {
    id: typeof body.id === 'string' && body.id.trim() ? body.id.trim() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind,
    chain: typeof body.chain === 'string' ? body.chain.toLowerCase() : undefined,
    toAddress: toAddress?.toLowerCase(),
    toFid,
    toUsername: toUsername && toUsername.length ? toUsername : undefined,
    toDisplay: toDisplay && toDisplay.length ? toDisplay : undefined,
    toAvatarUrl: toAvatarUrl && toAvatarUrl.length ? toAvatarUrl : undefined,
    fromAddress: typeof body.fromAddress === 'string' ? body.fromAddress.toLowerCase() : undefined,
    fromFid: typeof body.fromFid === 'number'
      ? body.fromFid
      : typeof body.fromFid === 'string' && /^\d+$/.test(body.fromFid)
      ? Number(body.fromFid)
      : undefined,
    fromUsername: typeof body.fromUsername === 'string' ? body.fromUsername : undefined,
    fromDisplay: typeof body.fromDisplay === 'string' ? body.fromDisplay : undefined,
    fromAvatarUrl: fromAvatarUrl && fromAvatarUrl.length ? fromAvatarUrl : undefined,
    amount: typeof body.amount === 'number' ? body.amount : undefined,
    symbol: typeof body.symbol === 'string' ? body.symbol : undefined,
    usdValue: typeof body.usdValue === 'number' ? body.usdValue : undefined,
    points: typeof body.points === 'number' ? body.points : undefined,
    message: typeof body.message === 'string' ? body.message : undefined,
    txHash: typeof body.txHash === 'string' ? body.txHash : undefined,
    castHash: typeof body.castHash === 'string' ? body.castHash : undefined,
    frameUrl: typeof body.frameUrl === 'string' ? body.frameUrl : undefined,
    shareText: typeof body.shareText === 'string' ? body.shareText : undefined,
    createdAt: typeof body.createdAt === 'number' ? body.createdAt : Date.now(),
  }

  if (kind === 'mention') {
    const actorIdPrimary = parseActorIdentifier(body.mentionActorId ?? body.actorId)
    const actorIdFromFid =
      typeof body.actorFid === 'number'
        ? `fid:${body.actorFid}`
        : typeof body.actorFid === 'string' && /^fid:/i.test(body.actorFid)
          ? body.actorFid
          : undefined

    const mentionContext: TipMentionContext = {
      type: typeof body.mentionType === 'string' ? body.mentionType : undefined,
      intensity: parseNumber(body.mentionIntensity ?? body.intensity),
      actorId: actorIdPrimary ?? actorIdFromFid,
      actorLabel: typeof body.mentionActorLabel === 'string' ? body.mentionActorLabel : undefined,
      source: typeof body.mentionSource === 'string' ? body.mentionSource : undefined,
    }

    scoreTipMentionBroadcast(event, mentionContext)
  }

  publishTip(event)

  return NextResponse.json({ ok: true }, { headers: { 'X-Request-ID': requestId } })
})
