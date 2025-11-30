// @edit-start 2025-11-11 — Rank telemetry client helper
import type { RankTelemetryEventKind } from '@/lib/telemetry'
import type { ChainKey } from '@/lib/gmeow-utils'

export type RankTelemetryClientPayload = {
  event: RankTelemetryEventKind
  chain: ChainKey
  walletAddress: `0x${string}` | string
  fid?: number | null
  questId?: number | null
  delta: number
  totalPoints: number
  previousTotal?: number | null
  level: number
  tierName: string
  tierPercent: number
  metadata?: Record<string, unknown> | null
}

type EmitOptions = {
  signal?: AbortSignal
  keepalive?: boolean
}

const ENDPOINT = '/api/telemetry/rank'

function toFinite(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'string' && value.trim().length) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function normalizePayload(input: RankTelemetryClientPayload): RankTelemetryClientPayload | null {
  if (!input || typeof input !== 'object') return null
  const delta = toFinite(input.delta)
  const totalPoints = toFinite(input.totalPoints)
  const previousTotal = input.previousTotal !== undefined ? toFinite(input.previousTotal) : null
  const level = toFinite(input.level)
  const tierPercent = toFinite(input.tierPercent)

  if (
    !input.event ||
    !input.chain ||
    typeof input.walletAddress !== 'string' || !input.walletAddress.trim() ||
    delta == null ||
    totalPoints == null ||
    level == null ||
    tierPercent == null ||
    !input.tierName
  ) {
    return null
  }

  const fid = input.fid !== undefined ? toFinite(input.fid) : null
  const questId = input.questId !== undefined ? toFinite(input.questId) : null

  return {
    event: input.event,
    chain: input.chain,
    walletAddress: input.walletAddress.trim().toLowerCase(),
    fid: fid != null ? Math.trunc(fid) : null,
    questId: questId != null ? Math.trunc(questId) : null,
    delta: Math.trunc(delta),
    totalPoints: Math.trunc(totalPoints),
    previousTotal: previousTotal != null ? Math.trunc(previousTotal) : null,
    level: Math.trunc(level),
    tierName: input.tierName,
    tierPercent: Math.max(0, Math.min(100, Number(tierPercent.toFixed(2)))),
    metadata: input.metadata ?? null,
  }
}

export async function emitRankTelemetryEvent(payload: RankTelemetryClientPayload, options: EmitOptions = {}): Promise<boolean> {
  if (typeof window === 'undefined') return false
  const normalized = normalizePayload(payload)
  if (!normalized) return false

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalized),
      keepalive: options.keepalive ?? true,
      signal: options.signal,
      cache: 'no-store',
    })
    if (!response.ok) {
      const reason = await response.text().catch(() => '')
      console.warn('[rank-telemetry] emit failed', { status: response.status, reason })
      return false
    }
    return true
  } catch (error) {
    console.warn('[rank-telemetry] emit error', (error as Error)?.message || error)
    return false
  }
}
// @edit-end
