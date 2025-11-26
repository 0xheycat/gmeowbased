import clsx from 'clsx'

import type { DashboardTelemetryPayload } from '@/lib/telemetry'

type AnalyticsHighlightsProps = {
  data: DashboardTelemetryPayload | null
  loading: boolean
  error: string | null
  stale?: boolean
  lastUpdated?: number | null
  onRefresh: () => Promise<void> | void
}

const HIGHLIGHT_METRICS: Array<{
  key: keyof DashboardTelemetryPayload['totals']
  label: string
  description: string
  accent: string
}> = [
  {
    key: 'activePilots24h',
    label: 'Active pilots',
    description: 'Pilots who GM’d or quested in the last 24h',
    accent: 'text-emerald-300',
  },
  {
    key: 'tipsVolume24h',
    label: 'Tip volume',
    description: 'Total on-chain tips scored in 24h (pts)',
    accent: 'text-purple-300',
  },
  {
    key: 'badgeMints24h',
    label: 'Badge mints',
    description: 'Badges minted or leveled in the last 24h',
    accent: 'text-amber-200',
  },
]

function formatQuantity(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0'
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 10_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

function formatTimestamp(timestamp: number | null | undefined): string {
  if (!timestamp) return 'pending'
  const date = new Date(timestamp)
  if (!Number.isFinite(date.getTime())) return 'pending'
  return date.toLocaleString()
}

export default function AnalyticsHighlights({
  data,
  loading,
  error,
  stale = false,
  lastUpdated,
  onRefresh,
}: AnalyticsHighlightsProps) {
  const totals = data?.totals ?? null
  const ttlSeconds = data?.ttl ?? 60

  return (
    <div className="pixel-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="pixel-section-title text-base">Analytics pulse</h3>
          <p className="text-[11px] text-[var(--px-sub)]">
            Cached for {ttlSeconds}s • {stale ? 'Refreshing…' : 'Live'} telemetry
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stale ? <span className="pixel-pill text-[10px] bg-yellow-500/20 text-yellow-200">STALE</span> : null}
          <button
            type="button"
            className="pixel-button btn-sm disabled:opacity-50"
            disabled={loading}
            onClick={() => void onRefresh()}
          >
            {loading ? 'Updating…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-200">
          {error}
        </div>
      ) : null}

      {loading && !totals ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: HIGHLIGHT_METRICS.length }).map((_, idx) => (
            <div key={idx} className="h-24 rounded-xl border border-white dark:border-slate-700/8 bg-slate-100/10 dark:bg-white/5">
              <div className="h-full w-full animate-pulse rounded-xl bg-slate-100/10 dark:bg-white/5" />
            </div>
          ))}
        </div>
      ) : null}

      {totals ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {HIGHLIGHT_METRICS.map((metric) => {
            const value = totals[metric.key] ?? 0
            return (
              <div key={metric.key} className="rounded-2xl border border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-950 dark:text-white/60">
                  {metric.label}
                </div>
                <div className={clsx('mt-2 text-2xl font-extrabold', metric.accent)}>
                  {formatQuantity(value)}
                </div>
                <div className="mt-2 text-[11px] text-[var(--px-sub)]">
                  {metric.description}
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      <div className="mt-4 text-[10px] text-[var(--px-sub)]">
        Last updated {formatTimestamp(lastUpdated ?? null)}.
      </div>
    </div>
  )
}
