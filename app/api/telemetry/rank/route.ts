import { NextResponse, type NextRequest } from 'next/server'

import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { CHAIN_KEYS, type ChainKey } from '@/lib/gmeow-utils'
import { recordRankEvent, type RankTelemetryEventInput, type RankTelemetryEventKind } from '@/lib/telemetry'
import { withErrorHandler } from '@/lib/error-handler'

export const runtime = 'nodejs'

const VALID_EVENTS = new Set<RankTelemetryEventKind>([
  'quest-create',
  'quest-verify',
  'gm',
  'tip',
  'stake',
  'unstake',
  'stats-query',
])

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function coerceChain(value: unknown): ChainKey | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  return (CHAIN_KEYS as readonly string[]).includes(normalized) ? (normalized as ChainKey) : null
}

// @edit-start 2025-11-11 — Strengthen event sanitization typing
function sanitizePayload(input: unknown): RankTelemetryEventInput | null {
  if (!isPlainObject(input)) return null

  const eventValue = typeof input.event === 'string' ? (input.event.trim() as RankTelemetryEventKind) : null
  if (!eventValue || !VALID_EVENTS.has(eventValue)) return null

  const chain = coerceChain(input.chain)
  if (!chain) return null

  const walletAddress = typeof input.walletAddress === 'string' ? input.walletAddress.trim() : ''
  if (!walletAddress) return null

  const delta = coerceNumber(input.delta)
  const totalPoints = coerceNumber(input.totalPoints)
  const level = coerceNumber(input.level)
  const tierPercent = coerceNumber(input.tierPercent)
  const previousTotal = input.previousTotal !== undefined ? coerceNumber(input.previousTotal) : null

  const tierName = typeof input.tierName === 'string' && input.tierName.trim().length ? input.tierName.trim() : null

  if (delta === null || totalPoints === null || level === null || tierPercent === null || !tierName) {
    return null
  }

  const fid = input.fid !== undefined ? coerceNumber(input.fid) : null
  const questId = input.questId !== undefined ? coerceNumber(input.questId) : null
  const metadata = isPlainObject(input.metadata) ? (input.metadata as Record<string, unknown>) : null

  return {
    event: eventValue,
    chain,
    walletAddress,
    fid: fid != null ? Math.trunc(fid) : null,
    questId: questId != null ? Math.trunc(questId) : null,
    delta,
    totalPoints,
    previousTotal,
    level,
    tierName,
    tierPercent,
    metadata,
  }
}
// @edit-end

export const POST = withErrorHandler(async (request: NextRequest) => {
  const ip = getClientIp(request)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const body = await request.json()
  const payload = sanitizePayload(body)

    if (!payload) {
      return NextResponse.json({ error: 'invalid-rank-telemetry' }, { status: 400 })
    }

  await recordRankEvent(payload)
  return NextResponse.json({ ok: true })
})
