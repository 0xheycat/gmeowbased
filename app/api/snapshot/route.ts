import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { validateAdminRequest } from '@/lib/auth/admin'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/edge'
import { extractHttpErrorMessage } from '@/lib/middleware/http-error'
import { withErrorHandler } from '@/lib/middleware/error-handler'
import { generateRequestId } from '@/lib/middleware/request-id'
import {
  buildRequirement,
  runPartnerSnapshot,
  serializePartnerSnapshotSummary,
  type PartnerRequirementKind,
  type PartnerSnapshotSummaryPayload,
} from '@/lib/profile/partner-snapshot'

const DEFAULT_TABLE = process.env.SUPABASE_PARTNER_SNAPSHOT_TABLE || 'partner_snapshots'

type SnapshotHistorySummary = {
  snapshotId: string
  partner: string
  computedAt: string
  requirement: {
    kind: PartnerRequirementKind
    minimum: string
    address?: string | null
    tokenId?: string | null
  }
  metadata: Record<string, unknown> | null
  totalAddresses: number
  eligibleCount: number
  ineligibleCount: number
  chains: Array<{
    chain: string
    total: number
    eligible: number
    ineligible: number
  }>
}

export const runtime = 'nodejs'

type SnapshotPayload = {
  partnerName?: string
  chains?: Array<string>
  requirement?: {
    kind?: string
    address?: string
    tokenId?: string | number
    minimum?: string | number
  }
  metadata?: Record<string, unknown>
  maxAddressesPerChain?: number
  snapshotId?: string
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  const requestId = generateRequestId()
  const auth = await validateAdminRequest(req)
  if (!auth.ok && auth.reason !== 'admin_security_disabled') {
    return NextResponse.json(
      { ok: false, error: 'admin_auth_required', reason: auth.reason },
      { status: 401, headers: { 'X-Request-ID': requestId } }
    )
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'supabase_not_configured', message: 'Supabase environment variables are not configured.' },
      { status: 500, headers: { 'X-Request-ID': requestId } },
    )
  }

  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: 'supabase_client_unavailable', message: 'Failed to initialise Supabase client.' },
      { status: 500, headers: { 'X-Request-ID': requestId } },
    )
  }

  let json: SnapshotPayload
  try {
    json = await req.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: 'invalid_json' },
      { status: 400, headers: { 'X-Request-ID': requestId } }
    )
  }

  const partnerName = (json.partnerName || '').trim()
  if (!partnerName) {
    return NextResponse.json(
      { ok: false, error: 'partner_name_required' },
      { status: 400, headers: { 'X-Request-ID': requestId } }
    )
  }

  const chains = Array.isArray(json.chains) ? json.chains.map(chain => `${chain}`.trim()).filter(Boolean) : []
  if (!chains.length) {
    return NextResponse.json(
      { ok: false, error: 'chains_required' },
      { status: 400, headers: { 'X-Request-ID': requestId } }
    )
  }

  const requirementInput = json.requirement || {}
  const kind = requirementInput.kind as PartnerRequirementKind | undefined
  if (!kind) {
    return NextResponse.json(
      { ok: false, error: 'requirement_kind_required' },
      { status: 400, headers: { 'X-Request-ID': requestId } }
    )
  }

  let requirement
  try {
    requirement = buildRequirement(kind, requirementInput)
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'invalid_requirement', message: (error as Error)?.message },
      { status: 400, headers: { 'X-Request-ID': requestId } }
    )
  }

  const maxCount =
    json.maxAddressesPerChain == null ? undefined : Number(json.maxAddressesPerChain)
  if (maxCount !== undefined && (!Number.isFinite(maxCount) || maxCount <= 0)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_max_addresses_per_chain' },
      { status: 400, headers: { 'X-Request-ID': requestId } }
    )
  }

  try {
    const { summary } = await runPartnerSnapshot({
      supabase,
      snapshotId: json.snapshotId,
      partnerName,
      chains,
      requirement,
      metadata: json.metadata,
      maxAddressesPerChain: maxCount,
    })

    const serializedSummary: PartnerSnapshotSummaryPayload = serializePartnerSnapshotSummary(summary)

    return NextResponse.json(
      { ok: true, summary: serializedSummary },
      { headers: { 'X-Request-ID': requestId } }
    )
  } catch (error) {
    const message = extractHttpErrorMessage(error, 'Failed to generate partner snapshot')
    return NextResponse.json(
      { ok: false, error: 'snapshot_failed', message },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }
})

export const GET = withErrorHandler(async (req: NextRequest) => {
  const requestId = generateRequestId()
  const auth = await validateAdminRequest(req)
  if (!auth.ok && auth.reason !== 'admin_security_disabled') {
    return NextResponse.json(
      { ok: false, error: 'admin_auth_required', reason: auth.reason },
      { status: 401, headers: { 'X-Request-ID': requestId } }
    )
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'supabase_not_configured', message: 'Supabase environment variables are not configured.' },
      { status: 500, headers: { 'X-Request-ID': requestId } },
    )
  }

  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: 'supabase_client_unavailable', message: 'Failed to initialise Supabase client.' },
      { status: 500, headers: { 'X-Request-ID': requestId } },
    )
  }

  const { searchParams } = new URL(req.url)
  const limitParam = Number.parseInt(searchParams.get('limit') ?? '', 10)
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 20) : 5

  const seedLimit = Math.max(limit * 6, 24)

  const { data: seedRows, error: seedError } = await (supabase as any)
    .from(DEFAULT_TABLE)
    .select('snapshot_id, partner, requirement_kind, requirement_address, requirement_token_id, requirement_minimum, computed_at, metadata')
    .order('computed_at', { ascending: false })
    .limit(seedLimit)

  if (seedError) {
    return NextResponse.json(
      { ok: false, error: 'history_fetch_failed', message: seedError.message },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }

  const distinctSnapshots = new Map<string, {
    snapshotId: string
    partner: string
    computedAt: string
    requirementKind: PartnerRequirementKind
    requirementAddress: string | null
    requirementTokenId: string | null
    requirementMinimum: string
    metadata: Record<string, unknown> | null
  }>()

  for (const row of seedRows ?? []) {
    const snapshotId = typeof row?.snapshot_id === 'string' ? row.snapshot_id.trim() : ''
    if (!snapshotId) continue
    if (distinctSnapshots.has(snapshotId)) continue

    const computedAtRaw = row?.computed_at
    const computedAt = typeof computedAtRaw === 'string' ? computedAtRaw : new Date().toISOString()
    const requirementKind = (row?.requirement_kind as PartnerRequirementKind | undefined) ?? 'points'
    const requirementMinimum = typeof row?.requirement_minimum === 'string'
      ? row.requirement_minimum
      : `${row?.requirement_minimum ?? '0'}`

    distinctSnapshots.set(snapshotId, {
      snapshotId,
      partner: typeof row?.partner === 'string' && row.partner.trim() ? row.partner.trim() : 'Unknown partner',
      computedAt,
      requirementKind,
      requirementAddress: typeof row?.requirement_address === 'string' ? row.requirement_address : null,
      requirementTokenId: row?.requirement_token_id == null ? null : `${row.requirement_token_id}`,
      requirementMinimum,
      metadata: (row?.metadata as Record<string, unknown> | null) ?? null,
    })
  }

  if (!distinctSnapshots.size) {
    return NextResponse.json(
      { ok: true, history: [] },
      { headers: { 'X-Request-ID': requestId } }
    )
  }

  const snapshotSummaries = Array.from(distinctSnapshots.values())
    .sort((a, b) => (a.computedAt > b.computedAt ? -1 : a.computedAt < b.computedAt ? 1 : 0))
    .slice(0, limit)

  const snapshotIds = snapshotSummaries.map(item => item.snapshotId)

  const { data: detailRows, error: detailError } = await (supabase as any)
    .from(DEFAULT_TABLE)
    .select('snapshot_id, chain, eligible')
    .in('snapshot_id', snapshotIds)
    .limit(Math.max(snapshotIds.length * 2_000, 1_000))

  if (detailError) {
    return NextResponse.json(
      { ok: false, error: 'history_detail_failed', message: detailError.message },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }

  const statsMap = new Map<string, SnapshotHistorySummary>()

  for (const summary of snapshotSummaries) {
    statsMap.set(summary.snapshotId, {
      snapshotId: summary.snapshotId,
      partner: summary.partner,
      computedAt: summary.computedAt,
      requirement: {
        kind: summary.requirementKind,
        minimum: summary.requirementMinimum,
        address: summary.requirementAddress,
        tokenId: summary.requirementTokenId,
      },
      metadata: summary.metadata,
      totalAddresses: 0,
      eligibleCount: 0,
      ineligibleCount: 0,
      chains: [],
    })
  }

  const chainAggregates = new Map<string, Map<string, { chain: string; total: number; eligible: number }>>()

  for (const row of detailRows ?? []) {
    const snapshotId = typeof row?.snapshot_id === 'string' ? row.snapshot_id : null
    if (!snapshotId) continue
    const snapshot = statsMap.get(snapshotId)
    if (!snapshot) continue

    const chainKey = typeof row?.chain === 'string' && row.chain.trim() ? row.chain.trim() : 'unknown'
    const chainMap = chainAggregates.get(snapshotId) ?? new Map<string, { chain: string; total: number; eligible: number }>()
    if (!chainAggregates.has(snapshotId)) {
      chainAggregates.set(snapshotId, chainMap)
    }

    const entry = chainMap.get(chainKey) ?? { chain: chainKey, total: 0, eligible: 0 }
    entry.total += 1
    if (row?.eligible) entry.eligible += 1
    chainMap.set(chainKey, entry)

    snapshot.totalAddresses += 1
    if (row?.eligible) snapshot.eligibleCount += 1
  }

  const history: SnapshotHistorySummary[] = snapshotSummaries.map((summary) => {
    const snapshot = statsMap.get(summary.snapshotId)!
    const chainMap = chainAggregates.get(summary.snapshotId)
    if (chainMap) {
      snapshot.chains = Array.from(chainMap.values()).map((entry) => ({
        chain: entry.chain,
        total: entry.total,
        eligible: entry.eligible,
        ineligible: entry.total - entry.eligible,
      }))
    }
    snapshot.ineligibleCount = Math.max(snapshot.totalAddresses - snapshot.eligibleCount, 0)
    snapshot.chains.sort((a, b) => (a.chain > b.chain ? 1 : a.chain < b.chain ? -1 : 0))
    return snapshot
  })

  return NextResponse.json(
    { ok: true, history },
    { headers: { 'X-Request-ID': requestId } }
  )
})
