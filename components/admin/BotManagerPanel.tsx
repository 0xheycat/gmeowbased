/**
 * @file components/admin/BotManagerPanel.tsx
 * 
 * Farcaster Bot Manager Admin Panel
 * Comprehensive dashboard for bot health monitoring, activity tracking, and manual cast publishing.
 * 
 * PHASE: Phase 1 - Week 1-2 (December 2025)
 * DATE: Updated December 16, 2025
 * STATUS: 🔨 IN PROGRESS (Analytics dashboard integration pending)
 * 
 * TODO:
 * - [x] Bot status display (env vars, signer, FID)
 * - [x] Bot activity tracking (recent casts, interactions)
 * - [x] Manual cast publishing form
 * - [ ] Add health metrics dashboard (webhook/reply success rates)
 * - [ ] Add response time percentiles (P50, P95, P99)
 * - [ ] Add real-time error log display
 * - [ ] Add user engagement metrics (top interactors)
 * - [ ] Add export metrics as CSV button
 * 
 * FEATURES:
 * - ✅ Environment variable validation
 * - ✅ Signer status check (approved/pending/revoked)
 * - ✅ Bot FID configuration
 * - ✅ Recent cast display (12 casts)
 * - ✅ Interaction tracking (mentions, replies, recasts, follows)
 * - ✅ Keyword insights (7-day lookback)
 * - ✅ Manual cast publishing (with parent, channel, idem support)
 * - ✅ Neynar client cache reset
 * - ⏳ Health metrics dashboard (PENDING - see lib/bot-analytics.ts)
 * 
 * REFERENCE DOCUMENTATION:
 * - FARCASTER-BOT-ENHANCEMENT-PLAN-PART-3.md (Section 9.1: Immediate Action Items)
 * - FARCASTER-BOT-ENHANCEMENT-PLAN-PART-3.md (Section 10.1: Bot Performance Metrics)
 * - FARCASTER-BOT-ENHANCEMENT-PLAN-PART-1.md (Section 3.1: Active Bot Review)
 * 
 * SUGGESTIONS:
 * - Integrate lib/bot-analytics.ts for health metrics display
 * - Add WebSocket for real-time metric updates
 * - Add "Health Score" badge (green/yellow/red based on targets)
 * - Add trend charts for 7-day/30-day comparisons
 * 
 * CRITICAL FINDINGS:
 * ⚠️ NO HEALTH MONITORING: Missing webhook/reply success rate tracking
 * ⚠️ NO ALERTING: Admin must manually check for degraded performance
 * ⚠️ COMPLEX UI: Hardcoded everywhere, needs component refactoring
 * 
 * REQUIREMENTS FROM farcaster.instructions.md:
 * - Admin-only access (session validation required)
 * - Network: Base (ChainID: 8453)
 * - Website: https://gmeowhq.art
 */

'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import clsx from 'clsx'
import Loader from '@/components/ui/loader' // Using unified Loader component

type EnvSummary = {
  apiKey: { present: boolean; preview: string | null }
  signerUuid: { present: boolean; value: string | null; preview: string | null }
  botFid: { present: boolean; value: number | null }
  webhookSecret: { present: boolean; preview: string | null }
}

type SignerSummary = {
  signerUuid: string | null
  status: string | null
  fid: number | null
  approvalUrl: string | null
  publicKey: string | null
  permissions: string[]
} | null

type BotStatusResponse = {
  ok: boolean
  checkedAt: string
  env: EnvSummary
  signer: SignerSummary
  botFid: number | null
  warnings: string[]
  signerError: string | null
}

type CastResponse = {
  ok: boolean
  cast?: {
    hash?: string | null
    url?: string | null
    text?: string | null
  } | null
  error?: string
  publishedAt?: string
}

type InteractionType = 'mentions' | 'replies' | 'recasts' | 'follows'

type ActorSummary = {
  fid: number | null
  username: string | null
  displayName: string | null
  pfpUrl: string | null
}

type CastSummary = {
  hash: string | null
  url: string | null
  text: string
  preview: string
  timestamp: string | null
}

type InteractionEntry = {
  type: InteractionType
  actor: ActorSummary
  cast: CastSummary | null
  timestamp: string | null
  count: number
}

type InteractionCategorySummary = {
  total: number
  recent: InteractionEntry[]
}

type WatcherInteractionSummary = {
  label: string
  username: string | null
  fid: number | null
  displayName: string | null
  avatarUrl: string | null
  categories: Record<InteractionType, InteractionCategorySummary>
  error?: string | null
}

type KeywordSample = {
  variant: string
  text: string
  preview: string
  hash: string | null
  url: string | null
  timestamp: string | null
  author: ActorSummary
}

type KeywordInsight = {
  keyword: string
  matches: number
  samples: KeywordSample[]
}

type InteractionInsights = {
  watchers: WatcherInteractionSummary[]
  totals: Record<InteractionType, number>
  keywords: KeywordInsight[]
}

type BotActivityResponse = {
  ok: boolean
  fetchedAt: string
  bot: {
    fid: number | null
    username: string | null
    displayName: string | null
    followerCount: number | null
    followingCount: number | null
    powerBadge: boolean
    activeStatus: string | null
    lastCastAt: string | null
    totalRecentCasts: number
    aggregates: {
      likes: number
      recasts: number
      replies: number
      embeds: number
    }
  }
  recentCasts: Array<{
    hash: string
    url: string | null
    text: string
    preview: string
    timestamp: string | null
    parentHash: string | null
    parentUrl: string | null
    channelId: string | null
    channelName: string | null
    metrics: {
      likes: number
      recasts: number
      replies: number
      embeds: number
    }
  }>
  interactions: InteractionInsights | null
  warnings: string[]
  userError: string | null
  feedError: string | null
}

const STATUS_LABELS: Record<string, { label: string; tone: 'success' | 'warn' | 'danger' | 'info' }> = {
  approved: { label: 'Approved', tone: 'success' },
  pending_approval: { label: 'Pending approval', tone: 'warn' },
  generated: { label: 'Generated', tone: 'info' },
  revoked: { label: 'Revoked', tone: 'danger' },
}

function toneClass(tone: 'success' | 'warn' | 'danger' | 'info'): string {
  switch (tone) {
    case 'success':
      return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
    case 'warn':
      return 'border-amber-400/40 bg-amber-500/10 text-amber-200'
    case 'danger':
      return 'border-red-400/40 bg-red-500/10 text-red-200'
    case 'info':
    default:
      return 'border-sky-400/40 bg-sky-500/10 text-sky-200'
  }
}

function formatDate(dateIso?: string | null): string {
  if (!dateIso) return '—'
  const date = new Date(dateIso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, { hour12: false })
}

function formatRelativeTime(dateIso?: string | null): string {
  if (!dateIso) return '—'
  const date = new Date(dateIso)
  if (Number.isNaN(date.getTime())) return '—'
  const diffMs = Date.now() - date.getTime()
  if (!Number.isFinite(diffMs) || diffMs < 0) return date.toLocaleString()
  const minutes = Math.floor(diffMs / (1000 * 60))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

function formatMetric(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  if (value === 0) return '0'
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function labelForEnvPresence(present: boolean): string {
  return present ? 'Configured' : 'Missing'
}

function formatActorName(actor: ActorSummary): string {
  if (actor.displayName && actor.displayName.trim().length > 0) return actor.displayName.trim()
  if (actor.username && actor.username.trim().length > 0) return `@${actor.username.replace(/^@/, '')}`
  if (actor.fid !== null && actor.fid !== undefined) return `fid:${actor.fid}`
  return 'Unknown user'
}

function timestampValue(timestamp: string | null | undefined): number {
  if (!timestamp) return 0
  const ms = new Date(timestamp).getTime()
  return Number.isFinite(ms) ? ms : 0
}

const MAX_TEXT_LENGTH = 320
const SESSION_EXPIRED_MESSAGE = 'Admin session expired. Please sign in again.'
const KEYWORD_LOOKBACK_DAYS = 7

const INTERACTION_TYPE_ORDER: InteractionType[] = ['mentions', 'replies', 'recasts', 'follows']
const INTERACTION_TYPE_META: Record<InteractionType, { icon: string; label: string; verb: string; accent: string }> = {
  mentions: { icon: '🗣️', label: 'Mentions', verb: 'mentioned', accent: 'border-sky-400/40 bg-sky-500/10 text-sky-200' },
  replies: { icon: '💬', label: 'Replies', verb: 'replied to', accent: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200' },
  recasts: { icon: '🔁', label: 'Recasts', verb: 'recasted', accent: 'border-purple-400/40 bg-purple-500/10 text-purple-200' },
  follows: { icon: '➕', label: 'Follows', verb: 'followed', accent: 'border-amber-400/40 bg-amber-500/10 text-amber-200' },
}

export default function BotManagerPanel() {
  const [status, setStatus] = useState<BotStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [resetting, setResetting] = useState(false)
  const [warnings, setWarnings] = useState<string[]>([])
  const [insights, setInsights] = useState<BotActivityResponse | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(true)
  const [insightsError, setInsightsError] = useState<string | null>(null)

  const [castText, setCastText] = useState('')
  const [channelId, setChannelId] = useState('')
  const [parent, setParent] = useState('')
  const [parentAuthorFid, setParentAuthorFid] = useState('')
  const [idem, setIdem] = useState('')
  const [sendingCast, setSendingCast] = useState(false)
  const [castFeedback, setCastFeedback] = useState<{ type: 'success' | 'error'; message: string; link?: string } | null>(null)

  // Bot health metrics state
  const [healthMetrics, setHealthMetrics] = useState<{
    webhookSuccessRate: number
    replySuccessRate: number
    p50ResponseTimeMs: number
    p95ResponseTimeMs: number
    p99ResponseTimeMs: number
    neynarApiErrorRate: number
    rateLimitHitRate: number
  } | null>(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [healthError, setHealthError] = useState<string | null>(null)
  const [healthWindow, setHealthWindow] = useState<'1h' | '24h' | '7d' | '30d'>('24h')
  const [recentErrors, setRecentErrors] = useState<Array<{
    type: string
    error_message: string
    created_at: string
    fid?: number
    cast_hash?: string
  }>>([])

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/bot/status', { cache: 'no-store' })
      if (res.status === 401) {
        throw new Error(SESSION_EXPIRED_MESSAGE)
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const json = (await res.json()) as BotStatusResponse
      setStatus(json)
      setWarnings(Array.isArray(json.warnings) ? json.warnings : [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load bot status'
      setError(message)
      setStatus(null)
      setWarnings([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchInsights = useCallback(async () => {
    setInsightsLoading(true)
    setInsightsError(null)
    try {
      const res = await fetch('/api/admin/bot/activity', { cache: 'no-store' })
      if (res.status === 401) {
        throw new Error(SESSION_EXPIRED_MESSAGE)
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const json = (await res.json()) as BotActivityResponse
      setInsights(json)
      setWarnings((prev) => {
        const next = new Set(prev)
        if (Array.isArray(json.warnings)) {
          for (const item of json.warnings) {
            if (item) next.add(item)
          }
        }
        if (json.feedError) next.add('Recent activity feed failed to load. Retry after checking Neynar telemetry.')
        if (json.userError) next.add('Bot profile data unavailable. Confirm Neynar credentials and FID configuration.')
        return Array.from(next)
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch bot activity'
      setInsights(null)
      setInsightsError(message)
    } finally {
      setInsightsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchStatus()
  }, [fetchStatus, refreshNonce])

  useEffect(() => {
    void fetchInsights()
  }, [fetchInsights, refreshNonce])

  const fetchHealthMetrics = useCallback(async () => {
    setHealthLoading(true)
    setHealthError(null)
    try {
      const res = await fetch(`/api/admin/bot/health?window=${healthWindow}`, { cache: 'no-store' })
      if (res.status === 401) {
        throw new Error(SESSION_EXPIRED_MESSAGE)
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const json = await res.json()
      setHealthMetrics(json.metrics || null)
      setRecentErrors(json.recentErrors || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch health metrics'
      setHealthError(message)
      setHealthMetrics(null)
      setRecentErrors([])
    } finally {
      setHealthLoading(false)
    }
  }, [healthWindow])

  useEffect(() => {
    void fetchHealthMetrics()
  }, [fetchHealthMetrics, refreshNonce])

  const signerStatusDisplay = useMemo(() => {
    const rawStatus = status?.signer?.status?.toLowerCase()
    if (!rawStatus) return null
    const mapping = STATUS_LABELS[rawStatus]
    const label = mapping?.label ?? rawStatus
    const tone = mapping?.tone ?? 'info'
    return { label, tone }
  }, [status])

  const envRows = useMemo(() => {
    const env = status?.env
    if (!env) return []
    return [
      {
        key: 'Neynar API key',
        value: labelForEnvPresence(env.apiKey.present),
        hint: env.apiKey.preview ?? null,
      },
      {
        key: 'Signer UUID',
        value: labelForEnvPresence(env.signerUuid.present),
        hint: env.signerUuid.preview ?? null,
      },
      {
        key: 'Bot FID',
        value: env.botFid.present && typeof env.botFid.value === 'number' ? env.botFid.value.toString() : 'Missing',
        hint: env.botFid.present ? null : undefined,
      },
      {
        key: 'Webhook secret',
        value: labelForEnvPresence(env.webhookSecret.present),
        hint: env.webhookSecret.preview ?? null,
      },
    ]
  }, [status])

  const signerUuidMismatch = useMemo(() => {
    const configured = status?.env?.signerUuid?.value
    const actual = status?.signer?.signerUuid
    if (!configured || !actual) return false
    return configured !== actual
  }, [status])

  const interactionSummary = insights?.interactions ?? null

  const interactionTotals = useMemo(() => {
    if (!interactionSummary) return null
    return INTERACTION_TYPE_ORDER.map((type) => ({
      type,
      value: interactionSummary.totals?.[type] ?? 0,
    }))
  }, [interactionSummary])

  const watcherTimelines = useMemo(() => {
    if (!interactionSummary) return []
    return interactionSummary.watchers.map((watcher) => {
      const events = INTERACTION_TYPE_ORDER.flatMap((type) => {
        const category = watcher.categories?.[type]
        if (!category?.recent?.length) return []
        return category.recent.map((entry) => ({ type, entry }))
      })
      events.sort((a, b) => timestampValue(b.entry.timestamp) - timestampValue(a.entry.timestamp))
      return {
        watcher,
        events: events.slice(0, 6),
      }
    })
  }, [interactionSummary])

  const keywordInsights = interactionSummary?.keywords ?? []

  const hasAnyInteractions = useMemo(() => {
    if (!interactionSummary) return false
    return INTERACTION_TYPE_ORDER.some((type) => (interactionSummary.totals?.[type] ?? 0) > 0)
  }, [interactionSummary])

  const handleRefresh = useCallback(() => {
    setRefreshNonce((n) => n + 1)
  }, [])

  const handleResetCache = useCallback(async () => {
    setResetting(true)
    setCastFeedback(null)
    try {
      const res = await fetch('/api/admin/bot/reset-client', { method: 'POST' })
      if (res.status === 401) {
        throw new Error(SESSION_EXPIRED_MESSAGE)
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      await Promise.allSettled([fetchStatus(), fetchInsights()])
      setCastFeedback({ type: 'success', message: 'Neynar client cache cleared' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reset Neynar client cache'
      setCastFeedback({ type: 'error', message })
    } finally {
      setResetting(false)
    }
  }, [fetchStatus, fetchInsights])

  const handleSendCast = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!castText.trim()) {
      setCastFeedback({ type: 'error', message: 'Enter cast text before publishing' })
      return
    }
    setSendingCast(true)
    setCastFeedback(null)
    try {
      const res = await fetch('/api/admin/bot/cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: castText,
          channelId: channelId.trim() || undefined,
          parent: parent.trim() || undefined,
          parentAuthorFid: parentAuthorFid.trim() || undefined,
          idem: idem.trim() || undefined,
        }),
      })
      if (res.status === 401) {
        throw new Error(SESSION_EXPIRED_MESSAGE)
      }
      const json = (await res.json()) as CastResponse
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `HTTP ${res.status}`)
      }
      setCastFeedback({
        type: 'success',
        message: 'Cast published successfully',
        link: json.cast?.url ?? (json.cast?.hash ? `https://warpcast.com/~/compose?hash=${json.cast.hash}` : undefined),
      })
      await Promise.allSettled([fetchStatus(), fetchInsights()])
      setCastText('')
      setParent('')
      setParentAuthorFid('')
      setIdem('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to publish cast'
      setCastFeedback({ type: 'error', message })
    } finally {
      setSendingCast(false)
    }
  }, [castText, channelId, parent, parentAuthorFid, idem, fetchStatus, fetchInsights])

  const remainingChars = MAX_TEXT_LENGTH - castText.length
  const lastCastAt = insights?.bot?.lastCastAt ?? null

  const lastCastHealth = useMemo(() => {
    if (!lastCastAt) {
      return { label: 'No recent casts', tone: 'danger' as const }
    }
    const time = new Date(lastCastAt)
    const ageMs = Date.now() - time.getTime()
    if (!Number.isFinite(ageMs) || ageMs > 1000 * 60 * 60 * 72) {
      return { label: `Last cast ${formatRelativeTime(lastCastAt)}`, tone: 'warn' as const }
    }
    return { label: `Last cast ${formatRelativeTime(lastCastAt)}`, tone: 'success' as const }
  }, [lastCastAt])

  return (
    <div className="pixel-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="pixel-section-title text-base">Bot Control Center</h2>
          <p className="text-[11px] text-[var(--px-sub)]">
            Inspect the Neynar signer, confirm environment health, and send manual casts from the admin hub.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="pixel-button btn-sm disabled:opacity-50"
            disabled={loading}
            onClick={handleRefresh}
            type="button"
          >
            {loading ? 'Refreshing…' : 'Refresh status'}
          </button>
          <button
            className="pixel-button btn-sm disabled:opacity-50"
            disabled={resetting}
            onClick={handleResetCache}
            type="button"
          >
            {resetting ? 'Clearing cache…' : 'Reset Neynar cache'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          <div className="font-semibold">Unable to load bot status</div>
          <p className="text-[12px]">{error}</p>
        </div>
      ) : null}

      {warnings.length ? (
        <div className="mt-4 rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-[12px] text-amber-200">
          <div className="font-semibold text-[13px]">Warnings</div>
          <ul className="mt-2 space-y-1">
            {warnings.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                • {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/10 bg-slate-100/5 dark:bg-white/5 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <h3 className="pixel-section-title text-sm">Signer status</h3>
            {signerStatusDisplay ? (
              <span className={clsx('pixel-pill text-[10px]', toneClass(signerStatusDisplay.tone))}>
                {signerStatusDisplay.label}
              </span>
            ) : null}
          </div>
          <dl className="mt-3 space-y-2 text-[12px] text-[var(--px-sub)]">
            <div className="flex flex-col">
              <dt className="text-[11px] uppercase tracking-[0.16em] text-slate-950 dark:text-white/70">Signer UUID</dt>
              <dd className="font-mono text-[12px] text-slate-950 dark:text-white/80 break-all">
                {status?.signer?.signerUuid ?? '—'}
              </dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-[11px] uppercase tracking-[0.16em] text-slate-950 dark:text-white/70">Public key</dt>
              <dd className="font-mono text-[12px] text-slate-950 dark:text-white/80 break-all">
                {status?.signer?.publicKey ?? '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.16em] text-slate-950 dark:text-white/70">FID</dt>
                <dd className="text-slate-950 dark:text-white/80">
                  {status?.signer?.fid ?? '—'}
                </dd>
              </div>
              {status?.signer?.approvalUrl ? (
                <a
                  className="text-[11px] text-sky-300 underline"
                  href={status.signer.approvalUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open approval ↗
                </a>
              ) : null}
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.16em] text-slate-950 dark:text-white/70">Permissions</dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {status?.signer?.permissions?.length ? (
                  status.signer.permissions.map((perm) => (
                    <span key={perm} className="pixel-pill text-[10px]">
                      {perm}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-950 dark:text-white/60">—</span>
                )}
              </dd>
            </div>
          </dl>
          <div className="mt-3 text-[10px] text-[var(--px-sub)]">
            Last checked: {formatDate(status?.checkedAt)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700/10 bg-slate-100/5 dark:bg-white/5 p-4 backdrop-blur-sm">
          <h3 className="pixel-section-title text-sm">Environment overview</h3>
          <ul className="mt-3 space-y-2 text-[12px] text-[var(--px-sub)]">
            {envRows.map((row) => (
              <li key={row.key} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 dark:border-slate-700/5 bg-slate-100/5 dark:bg-white/5 px-3 py-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] uppercase tracking-[0.12em] text-slate-950 dark:text-white/70">{row.key}</span>
                  {row.hint ? (
                    <span className="font-mono text-[11px] text-slate-950 dark:text-white/60">{row.hint}</span>
                  ) : null}
                </div>
                <span
                  className={clsx(
                    'pixel-pill text-[10px]',
                    row.value === 'Configured' || /\d/.test(row.value)
                      ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                      : 'border-red-400/40 bg-red-500/10 text-red-200'
                  )}
                >
                  {row.value}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 text-[11px] text-[var(--px-sub)]">
            {signerUuidMismatch ? (
              <span className="text-amber-200">
                Note: Configured signer UUID differs from Neynar response.
              </span>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700/10 bg-slate-100/5 dark:bg-white/5 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <h3 className="pixel-section-title text-sm">Bot identity &amp; health</h3>
            {insightsLoading ? (
              <span className="pixel-pill text-[10px] border-white dark:border-slate-700/20 bg-slate-100/10 dark:bg-white/5 text-slate-950 dark:text-white/70">Loading…</span>
            ) : (
              <span className={clsx('pixel-pill text-[10px]', toneClass(lastCastHealth.tone))}>{lastCastHealth.label}</span>
            )}
          </div>

          {insightsLoading ? (
            <div className="mt-4 flex justify-center py-8">
              <Loader size="medium" variant="dots" />
            </div>
          ) : insightsError ? (
            <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-[12px] text-red-200">
              <div className="font-semibold">Diagnostics unavailable</div>
              <p>{insightsError}</p>
            </div>
          ) : insights ? (
            <div className="mt-3 space-y-3 text-[12px] text-slate-950 dark:text-white/80">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-950 dark:text-white/60">Identity</div>
                <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                  {insights.bot.displayName ?? insights.bot.username ?? 'Unknown bot'}
                </div>
                <div className="text-[11px] text-[var(--px-sub)]">
                  @{insights.bot.username ?? 'not-set'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px] text-[var(--px-sub)]">
                <div>
                  <div className="uppercase tracking-[0.16em] text-slate-950 dark:text-white/60">Followers</div>
                  <div className="mt-1 text-base font-semibold text-slate-950 dark:text-white/90">{formatMetric(insights.bot.followerCount)}</div>
                </div>
                <div>
                  <div className="uppercase tracking-[0.16em] text-slate-950 dark:text-white/60">Following</div>
                  <div className="mt-1 text-base font-semibold text-slate-950 dark:text-white/90">{formatMetric(insights.bot.followingCount)}</div>
                </div>
                <div>
                  <div className="uppercase tracking-[0.16em] text-slate-950 dark:text-white/60">Recent casts</div>
                  <div className="mt-1 text-base font-semibold text-slate-950 dark:text-white/90">{insights.bot.totalRecentCasts}</div>
                </div>
                <div>
                  <div className="uppercase tracking-[0.16em] text-slate-950 dark:text-white/60">Status</div>
                  <div className="mt-1 text-base font-semibold text-slate-950 dark:text-white/90">
                    {insights.bot.activeStatus ? insights.bot.activeStatus : 'unknown'}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] text-slate-950 dark:text-white/70">
                <span className={clsx('pixel-pill', insights.bot.powerBadge ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200' : 'border-slate-200 dark:border-white/10 bg-slate-100/90 dark:bg-white/5 text-slate-900 dark:text-white/70')}>
                  Power badge {insights.bot.powerBadge ? 'enabled' : 'missing'}
                </span>
                <span className="pixel-pill border-white dark:border-slate-700/15 bg-slate-100/5 dark:bg-white/5 text-slate-950 dark:text-white/70">
                  Likes {formatMetric(insights.bot.aggregates.likes)} • Recasts {formatMetric(insights.bot.aggregates.recasts)} • Replies {formatMetric(insights.bot.aggregates.replies)}
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-[12px] text-[var(--px-sub)]">
              Diagnostics not available yet. Refresh to load Farcaster activity once configured.
            </p>
          )}

          <div className="mt-3 text-[10px] text-[var(--px-sub)]">
            Diagnostics fetched: {formatDate(insights?.fetchedAt)}
          </div>
        </div>
      </div>

      {/* Bot Health Metrics Dashboard */}
      <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-700/10 bg-slate-100/5 dark:bg-white/5 p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <h3 className="pixel-section-title text-sm">Bot health metrics</h3>
          <div className="flex items-center gap-2">
            <select
              className="rounded-lg border border-slate-200 dark:border-slate-700/10 bg-black dark:bg-slate-950/20 px-2 py-1 text-[11px] text-slate-950 dark:text-white focus:border-sky-400 focus:outline-none"
              value={healthWindow}
              onChange={(e) => setHealthWindow(e.target.value as any)}
            >
              <option value="1h">Last hour</option>
              <option value="24h">Last 24h</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
            <button
              className="pixel-button btn-xs"
              onClick={() => setRefreshNonce((n) => n + 1)}
              disabled={healthLoading}
            >
              {healthLoading ? '…' : '↻'}
            </button>
          </div>
        </div>

        {healthLoading ? (
          <div className="mt-4 flex justify-center py-8">
            <Loader size="medium" variant="dots" />
          </div>
        ) : healthError ? (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-[12px] text-red-200">
            <div className="font-semibold">Health metrics unavailable</div>
            <p>{healthError}</p>
          </div>
        ) : healthMetrics ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {/* Webhook Success Rate */}
              <div className={clsx(
                'rounded-lg border p-3',
                healthMetrics.webhookSuccessRate >= 99
                  ? 'border-emerald-400/40 bg-emerald-500/10'
                  : healthMetrics.webhookSuccessRate >= 95
                  ? 'border-amber-400/40 bg-amber-500/10'
                  : 'border-red-400/40 bg-red-500/10'
              )}>
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-950 dark:text-white/60">Webhook Success</div>
                <div className={clsx(
                  'mt-1 text-xl font-bold',
                  healthMetrics.webhookSuccessRate >= 99
                    ? 'text-emerald-200'
                    : healthMetrics.webhookSuccessRate >= 95
                    ? 'text-amber-200'
                    : 'text-red-200'
                )}>
                  {healthMetrics.webhookSuccessRate.toFixed(1)}%
                </div>
                <div className="mt-1 text-[9px] text-slate-950 dark:text-white/60">Target: &gt;99%</div>
              </div>

              {/* Reply Success Rate */}
              <div className={clsx(
                'rounded-lg border p-3',
                healthMetrics.replySuccessRate >= 95
                  ? 'border-emerald-400/40 bg-emerald-500/10'
                  : healthMetrics.replySuccessRate >= 90
                  ? 'border-amber-400/40 bg-amber-500/10'
                  : 'border-red-400/40 bg-red-500/10'
              )}>
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-950 dark:text-white/60">Reply Success</div>
                <div className={clsx(
                  'mt-1 text-xl font-bold',
                  healthMetrics.replySuccessRate >= 95
                    ? 'text-emerald-200'
                    : healthMetrics.replySuccessRate >= 90
                    ? 'text-amber-200'
                    : 'text-red-200'
                )}>
                  {healthMetrics.replySuccessRate.toFixed(1)}%
                </div>
                <div className="mt-1 text-[9px] text-slate-950 dark:text-white/60">Target: &gt;95%</div>
              </div>

              {/* P95 Response Time */}
              <div className={clsx(
                'rounded-lg border p-3',
                healthMetrics.p95ResponseTimeMs < 2000
                  ? 'border-emerald-400/40 bg-emerald-500/10'
                  : healthMetrics.p95ResponseTimeMs < 3000
                  ? 'border-amber-400/40 bg-amber-500/10'
                  : 'border-red-400/40 bg-red-500/10'
              )}>
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-950 dark:text-white/60">P95 Response</div>
                <div className={clsx(
                  'mt-1 text-xl font-bold',
                  healthMetrics.p95ResponseTimeMs < 2000
                    ? 'text-emerald-200'
                    : healthMetrics.p95ResponseTimeMs < 3000
                    ? 'text-amber-200'
                    : 'text-red-200'
                )}>
                  {healthMetrics.p95ResponseTimeMs.toFixed(0)}ms
                </div>
                <div className="mt-1 text-[9px] text-slate-950 dark:text-white/60">Target: &lt;2000ms</div>
              </div>

              {/* API Error Rate */}
              <div className={clsx(
                'rounded-lg border p-3',
                healthMetrics.neynarApiErrorRate < 1
                  ? 'border-emerald-400/40 bg-emerald-500/10'
                  : healthMetrics.neynarApiErrorRate < 5
                  ? 'border-amber-400/40 bg-amber-500/10'
                  : 'border-red-400/40 bg-red-500/10'
              )}>
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-950 dark:text-white/60">API Errors</div>
                <div className={clsx(
                  'mt-1 text-xl font-bold',
                  healthMetrics.neynarApiErrorRate < 1
                    ? 'text-emerald-200'
                    : healthMetrics.neynarApiErrorRate < 5
                    ? 'text-amber-200'
                    : 'text-red-200'
                )}>
                  {healthMetrics.neynarApiErrorRate.toFixed(1)}%
                </div>
                <div className="mt-1 text-[9px] text-slate-950 dark:text-white/60">Target: &lt;1%</div>
              </div>
            </div>

            {/* Recent Errors */}
            {recentErrors.length > 0 && (
              <div className="mt-4">
                <div className="text-[11px] font-semibold text-slate-950 dark:text-white/80 mb-2">Recent errors ({recentErrors.length})</div>
                <div className="space-y-2">
                  {recentErrors.slice(0, 5).map((error, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-red-400/40 bg-red-500/10 p-2 text-[11px] text-red-200"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="font-semibold">{error.type}</div>
                          <div className="mt-1 text-[10px] opacity-90">{error.error_message}</div>
                          {error.cast_hash && (
                            <div className="mt-1 text-[9px] opacity-70">Cast: {error.cast_hash.slice(0, 10)}...</div>
                          )}
                        </div>
                        <div className="text-[9px] opacity-70 whitespace-nowrap">
                          {formatRelativeTime(error.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Metrics */}
            <div className="mt-4 grid grid-cols-3 gap-3 text-[11px]">
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-950 dark:text-white/60">P50 Response</div>
                <div className="mt-1 text-base font-semibold text-slate-950 dark:text-white/90">{healthMetrics.p50ResponseTimeMs.toFixed(0)}ms</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-950 dark:text-white/60">P99 Response</div>
                <div className="mt-1 text-base font-semibold text-slate-950 dark:text-white/90">{healthMetrics.p99ResponseTimeMs.toFixed(0)}ms</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-950 dark:text-white/60">Rate Limit Hits</div>
                <div className="mt-1 text-base font-semibold text-slate-950 dark:text-white/90">{healthMetrics.rateLimitHitRate.toFixed(1)}%</div>
              </div>
            </div>
          </>
        ) : (
          <p className="mt-3 text-[12px] text-[var(--px-sub)]">
            No health metrics available. Metrics will appear once the bot starts processing webhooks.
          </p>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-700/10 bg-slate-100/5 dark:bg-white/5 p-4 backdrop-blur-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="pixel-section-title text-sm">Recent Farcaster activity</h3>
            <p className="text-[11px] text-[var(--px-sub)]">
              Monitor outgoing casts to confirm automation is publishing on schedule.
            </p>
          </div>
          <div className="text-[10px] text-[var(--px-sub)]">
            Updated {insights ? formatRelativeTime(insights.fetchedAt) : '—'}
          </div>
        </div>

        {insightsLoading ? (
          <div className="mt-4">
            <div className="flex justify-center py-8"><Loader size="medium" variant="dots" /></div>
          </div>
        ) : insightsError ? (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-[12px] text-red-200">
            <div className="font-semibold">Unable to load activity</div>
            <p>{insightsError}</p>
          </div>
        ) : insights?.recentCasts?.length ? (
          <ul className="mt-4 space-y-3">
            {insights.recentCasts.slice(0, 8).map((cast) => {
              const key = cast.hash || `${cast.timestamp}-${cast.channelId}`
              return (
                <li key={key} className="rounded-lg border border-slate-200 dark:border-slate-700/10 bg-black dark:bg-slate-950/20 px-3 py-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-slate-950 dark:text-white/90">
                        {cast.preview?.length ? cast.preview : <span className="text-[var(--px-sub)]">(no text content)</span>}
                      </p>
                      {cast.url ? (
                        <a
                          className="pixel-pill text-[10px] border-white dark:border-slate-700/20 bg-slate-100/10 dark:bg-white/5 text-slate-950 dark:text-white/80 hover:border-emerald-300/40 hover:bg-emerald-500/10 hover:text-emerald-100"
                          href={cast.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open ↗
                        </a>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--px-sub)]">
                      <span>{formatRelativeTime(cast.timestamp)}</span>
                      {cast.channelId ? (
                        <span className="pixel-pill border-white dark:border-slate-700/15 bg-slate-100/5 dark:bg-white/5 text-slate-950 dark:text-white/70">
                          #{cast.channelId}
                        </span>
                      ) : null}
                      {cast.parentHash ? (
                        <span className="pixel-pill border-white dark:border-slate-700/15 bg-slate-100/5 dark:bg-white/5 text-slate-950 dark:text-white/70">Reply</span>
                      ) : (
                        <span className="pixel-pill border-white dark:border-slate-700/15 bg-slate-100/5 dark:bg-white/5 text-slate-950 dark:text-white/70">Original</span>
                      )}
                      {cast.channelName && cast.channelName !== cast.channelId ? (
                        <span className="text-slate-950 dark:text-white/60">{cast.channelName}</span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px] text-slate-950 dark:text-white/80">
                      <span className="pixel-pill border-white dark:border-slate-700/15 bg-slate-100/5 dark:bg-white/5 text-slate-950 dark:text-white/80">❤ {cast.metrics.likes}</span>
                      <span className="pixel-pill border-white dark:border-slate-700/15 bg-slate-100/5 dark:bg-white/5 text-slate-950 dark:text-white/80">🔁 {cast.metrics.recasts}</span>
                      <span className="pixel-pill border-white dark:border-slate-700/15 bg-slate-100/5 dark:bg-white/5 text-slate-950 dark:text-white/80">💬 {cast.metrics.replies}</span>
                      {cast.metrics.embeds ? (
                        <span className="pixel-pill border-white dark:border-slate-700/15 bg-slate-100/5 dark:bg-white/5 text-slate-950 dark:text-white/80">🖼️ {cast.metrics.embeds}</span>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-4 text-[12px] text-[var(--px-sub)]">
            No recent casts detected for this bot. Once automation posts, the latest activity will appear here.
          </p>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-700/10 bg-slate-100/5 dark:bg-white/5 p-4 backdrop-blur-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="pixel-section-title text-sm">Community interactions</h3>
            <p className="text-[11px] text-[var(--px-sub)]">
              Track mentions, replies, recasts, and follows directed at the bot crew, plus brand keyword chatter.
            </p>
          </div>
          <div className="text-[10px] text-[var(--px-sub)]">
            Updated {insights ? formatRelativeTime(insights.fetchedAt) : '—'}
          </div>
        </div>

        {insightsLoading ? (
          <div className="mt-4">
            <div className="flex justify-center py-8"><Loader size="medium" variant="dots" /></div>
          </div>
        ) : insightsError ? (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-[12px] text-red-200">
            <div className="font-semibold">Unable to load interactions</div>
            <p>{insightsError}</p>
          </div>
        ) : !interactionSummary ? (
          <p className="mt-4 text-[12px] text-[var(--px-sub)]">
            Interaction telemetry will appear once bot and owner FIDs are fully configured.
          </p>
        ) : (
          <div className="mt-4 space-y-4 text-[12px] text-slate-950 dark:text-white/85">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              {interactionTotals?.map((item) => {
                const meta = INTERACTION_TYPE_META[item.type]
                return (
                  <div
                    key={item.type}
                    className={clsx('rounded-lg border px-3 py-3 text-slate-900 dark:text-white/90 shadow-inner', meta.accent)}
                  >
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-slate-950 dark:text-white/70">
                      <span>{meta.label}</span>
                      <span>{meta.icon}</span>
                    </div>
                    <div className="mt-2 text-2xl font-semibold">{formatMetric(item.value)}</div>
                    <div className="text-[11px] text-slate-950 dark:text-white/70">Past few days</div>
                  </div>
                )
              })}
            </div>

            <div className="space-y-3">
              {watcherTimelines.map(({ watcher, events }) => (
                <div key={watcher.label} className="rounded-lg border border-slate-200 dark:border-slate-700/10 bg-black dark:bg-slate-950/25 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-950 dark:text-white">
                        {watcher.displayName ?? watcher.label}
                      </div>
                      <div className="text-[11px] text-[var(--px-sub)]">
                        {watcher.fid ? `fid:${watcher.fid}` : watcher.username ? `@${watcher.username}` : 'FID unresolved'}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px] text-slate-950 dark:text-white/70">
                      {INTERACTION_TYPE_ORDER.map((type) => {
                        const meta = INTERACTION_TYPE_META[type]
                        const value = watcher.categories[type]?.total ?? 0
                        return (
                          <span key={type} className={clsx('pixel-pill', value > 0 ? meta.accent : 'border-slate-200 dark:border-white/10 bg-slate-100/90 dark:bg-white/5 text-slate-900 dark:text-white/60')}>
                            {meta.icon} {formatMetric(value)}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                  {watcher.error ? (
                    <div className="mt-2 rounded-md border border-amber-400/30 bg-amber-500/10 p-2 text-[11px] text-amber-200">
                      {watcher.error}
                    </div>
                  ) : null}
                  {events.length ? (
                    <ul className="mt-3 space-y-2">
                      {events.map(({ type, entry }, idx) => {
                        const meta = INTERACTION_TYPE_META[type]
                        const key = `${watcher.label}-${type}-${idx}`
                        return (
                          <li key={key} className="rounded-lg border border-slate-200 dark:border-slate-700/10 bg-slate-100/5 dark:bg-white/5 px-3 py-2">
                            <div className="flex flex-col gap-1">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-950 dark:text-white/75">
                                <span>
                                  {meta.icon}{' '}
                                  <strong>{entry.count > 1 ? `${entry.count}× ` : ''}</strong>
                                  {formatActorName(entry.actor)} {meta.verb} {watcher.displayName ?? watcher.label}
                                </span>
                                <span className="text-[10px] text-[var(--px-sub)]">{formatRelativeTime(entry.timestamp)}</span>
                              </div>
                              {entry.cast?.preview ? (
                                <p className="text-[12px] text-slate-950 dark:text-white/85">
                                  “{entry.cast.preview}”
                                  {entry.cast.url ? (
                                    <>
                                      {' '}
                                      <a className="text-sky-200 underline" href={entry.cast.url} target="_blank" rel="noreferrer">
                                        View ↗
                                      </a>
                                    </>
                                  ) : null}
                                </p>
                              ) : entry.cast?.url ? (
                                <a className="text-[11px] text-sky-200 underline" href={entry.cast.url} target="_blank" rel="noreferrer">
                                  View cast ↗
                                </a>
                              ) : null}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  ) : hasAnyInteractions ? (
                    <p className="mt-3 text-[11px] text-[var(--px-sub)]">
                      No recent timeline events captured yet. Totals above include notifications outside the latest feed window.
                    </p>
                  ) : (
                    <p className="mt-3 text-[11px] text-[var(--px-sub)]">
                      No interactions recorded for this watcher so far.
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-700/10 bg-black dark:bg-slate-950/15 p-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">Brand keyword pulse</div>
                  <div className="text-[11px] text-[var(--px-sub)]">
                    Scanning casts from the last {KEYWORD_LOOKBACK_DAYS} days for gmeow mentions.
                  </div>
                </div>
              </div>
              {keywordInsights.length ? (
                <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {keywordInsights.map((insight) => (
                    <div key={insight.keyword} className="rounded-lg border border-slate-200 dark:border-slate-700/10 bg-slate-100/5 dark:bg-white/5 p-3">
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-slate-950 dark:text-white/70">
                        <span>{insight.keyword}</span>
                        <span className="pixel-pill border-sky-400/40 bg-sky-500/10 text-[10px] text-sky-200">
                          {formatMetric(insight.matches)} matches
                        </span>
                      </div>
                      <ul className="mt-2 space-y-2 text-[12px] text-slate-950 dark:text-white/85">
                        {insight.samples.slice(0, 4).map((sample, idx) => (
                          <li key={`${insight.keyword}-${idx}`} className="rounded-md border border-slate-200 dark:border-slate-700/10 bg-black dark:bg-slate-950/20 px-3 py-2">
                            <div className="text-[11px] text-[var(--px-sub)]">
                              {formatRelativeTime(sample.timestamp)} • {formatActorName(sample.author)}
                            </div>
                            <p className="mt-1 leading-relaxed">
                              “{sample.preview}”
                              {sample.url ? (
                                <>
                                  {' '}
                                  <a className="text-sky-200 underline" href={sample.url} target="_blank" rel="noreferrer">
                                    View ↗
                                  </a>
                                </>
                              ) : null}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-[11px] text-[var(--px-sub)]">
                  No brand keyword casts detected within the last {KEYWORD_LOOKBACK_DAYS} days.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <form className="mt-6 space-y-3" onSubmit={handleSendCast}>
        <div className="flex items-center justify-between">
          <h3 className="pixel-section-title text-sm">Manual cast</h3>
          <span className={clsx('pixel-pill text-[10px]', remainingChars >= 0 ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200' : 'border-red-400/40 bg-red-500/10 text-red-200')}>
            {remainingChars} chars left
          </span>
        </div>
        <textarea
          className="w-full min-h-[120px] rounded-xl border border-slate-200 dark:border-slate-700/10 bg-black dark:bg-slate-950/20 px-3 py-2 text-sm text-slate-950 dark:text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
          value={castText}
          onChange={(event) => setCastText(event.target.value.slice(0, MAX_TEXT_LENGTH + 10))}
          placeholder="Compose a manual cast or response…"
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-[11px] text-[var(--px-sub)]">
            Channel ID (optional)
            <input
              className="rounded-lg border border-slate-200 dark:border-slate-700/10 bg-black dark:bg-slate-950/20 px-3 py-2 text-sm text-slate-950 dark:text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
              value={channelId}
              onChange={(event) => setChannelId(event.target.value)}
              placeholder="e.g. neynar"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-[var(--px-sub)]">
            Parent hash / URL (optional)
            <input
              className="rounded-lg border border-slate-200 dark:border-slate-700/10 bg-black dark:bg-slate-950/20 px-3 py-2 text-sm text-slate-950 dark:text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
              value={parent}
              onChange={(event) => setParent(event.target.value)}
              placeholder="Reply target hash or URL"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-[var(--px-sub)]">
            Parent author FID (optional)
            <input
              className="rounded-lg border border-slate-200 dark:border-slate-700/10 bg-black dark:bg-slate-950/20 px-3 py-2 text-sm text-slate-950 dark:text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
              value={parentAuthorFid}
              onChange={(event) => setParentAuthorFid(event.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Numeric FID"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-[var(--px-sub)]">
            Idempotency key (optional)
            <input
              className="rounded-lg border border-slate-200 dark:border-slate-700/10 bg-black dark:bg-slate-950/20 px-3 py-2 text-sm text-slate-950 dark:text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
              value={idem}
              onChange={(event) => setIdem(event.target.value)}
              placeholder="Stable key to avoid duplicates"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="pixel-button btn-sm disabled:opacity-50" disabled={sendingCast} type="submit">
            {sendingCast ? 'Publishing…' : 'Publish cast'}
          </button>
          <span className="text-[11px] text-[var(--px-sub)]">
            The bot uses the configured signer UUID. Casts longer than 320 characters are automatically truncated.
          </span>
        </div>
      </form>

      {castFeedback ? (
        <div
          className={clsx(
            'mt-4 rounded-lg border p-3 text-[12px]',
            castFeedback.type === 'success'
              ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
              : 'border-red-400/40 bg-red-500/10 text-red-100'
          )}
        >
          <div className="font-semibold">
            {castFeedback.type === 'success' ? 'Action complete' : 'Action failed'}
          </div>
          <p className="mt-1 leading-relaxed">
            {castFeedback.message}
            {castFeedback.link ? (
              <>
                {' '}
                <a className="text-sky-200 underline" href={castFeedback.link} target="_blank" rel="noreferrer">
                  View cast ↗
                </a>
              </>
            ) : null}
          </p>
        </div>
      ) : null}

      {status?.signerError && !error ? (
        <div className="mt-4 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-[12px] text-red-200">
          <div className="font-semibold">Signer lookup warning</div>
          <p className="mt-1 leading-relaxed">{status.signerError}</p>
        </div>
      ) : null}
    </div>
  )
}
