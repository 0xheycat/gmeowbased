'use client'

import { useEffect, useState } from 'react'
import clsx from 'clsx'
import QuestLoadingDeck from '@/components/Quest/QuestLoadingDeck'
import type { DashboardTelemetryPayload } from '@/lib/telemetry'

const METRIC_DEFINITIONS = [
  {
    key: 'activePilots24h' as const,
    label: 'Active Pilots (24h)',
    accent: 'text-emerald-300',
  },
  {
    key: 'activePilots7d' as const,
    label: 'Active Pilots (7d)',
    accent: 'text-emerald-200',
  },
  {
    key: 'questCompletions24h' as const,
    label: 'Quest Completions',
    accent: 'text-sky-300',
  },
  {
    key: 'tipsVolume24h' as const,
    label: 'Tips Volume (pts)',
    accent: 'text-purple-300',
  },
  {
    key: 'guildDeposits24h' as const,
    label: 'Guild Deposits',
    accent: 'text-cyan-200',
  },
  {
    key: 'badgeMints24h' as const,
    label: 'Badge Mints',
    accent: 'text-amber-200',
  },
  {
    key: 'streakBreaks24h' as const,
    label: 'Streak Breaks',
    accent: 'text-rose-200',
  },
]

type MetricKey = (typeof METRIC_DEFINITIONS)[number]['key']

type OpsSnapshotProps = {
  data: DashboardTelemetryPayload | null
  loading: boolean
  error: string | null
  stale?: boolean
  lastUpdated?: number | null
  onRefresh: () => Promise<void> | void
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0'
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 10_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

export default function OpsSnapshot({ data, loading, error, stale = false, lastUpdated, onRefresh }: OpsSnapshotProps) {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  const totals = data?.totals ?? null
  const chains = data?.chains ?? []
  const notes = data?.notes ?? []
  const ttlSeconds = data?.ttl ?? 60
  const buttonDisabled = !hydrated ? true : loading
  const buttonLabel = !hydrated || loading ? 'Updating…' : 'Refresh'

  return (
    <div className="pixel-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="pixel-section-title">Operations Snapshot</h3>
          <p className="text-[11px] text-[var(--px-sub)]">
            Cached for {ttlSeconds}s • {stale ? 'Refreshing…' : 'Live feed'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stale ? <span className="pixel-pill text-[10px] bg-yellow-500/20 text-yellow-200">STALE</span> : null}
          <button
            className="pixel-button btn-sm disabled:opacity-50"
            onClick={() => void onRefresh()}
            disabled={buttonDisabled}
          >
            {buttonLabel}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-200">
          {error}
        </div>
      ) : null}

      {loading && !totals ? (
        <div className="mt-4">
          <QuestLoadingDeck columns="single" count={3} dense />
        </div>
      ) : null}

      {totals ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {METRIC_DEFINITIONS.map((metric) => {
            const value = totals[metric.key as MetricKey] ?? 0
            return (
              <div key={metric.key} className="rounded-xl border border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5/5 px-3 py-3">
                <div className="text-[11px] text-[var(--px-sub)]">{metric.label}</div>
                <div className={clsx('mt-1 text-xl font-extrabold', metric.accent)}>
                  {formatNumber(value)}
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {chains.length ? (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="pixel-section-title text-base">Chain Breakdown</h4>
            <span className="pixel-pill text-[10px]">{chains.length} chains</span>
          </div>
          <div className="overflow-hidden rounded-xl border border-white dark:border-slate-700/10">
            <table className="w-full text-left text-[11px] sm:text-[12px]">
              <thead className="bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5/5 text-[var(--px-sub)]">
                <tr>
                  <th className="px-3 py-2 font-semibold">Chain</th>
                  <th className="px-3 py-2 font-semibold text-right">Pilots</th>
                  <th className="px-3 py-2 font-semibold text-right">Quests</th>
                  <th className="px-3 py-2 font-semibold text-right">Tips</th>
                  <th className="px-3 py-2 font-semibold text-right">Guild</th>
                  <th className="px-3 py-2 font-semibold text-right">Badges</th>
                  <th className="px-3 py-2 font-semibold text-right">Streak breaks</th>
                </tr>
              </thead>
              <tbody>
                {chains.map((chain) => (
                  <tr key={chain.chain} className="odd:bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5/5">
                    <td className="px-3 py-2 font-semibold uppercase tracking-wide text-[var(--px-sub)]">{chain.chain}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(chain.activePilots24h)}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(chain.questCompletions24h)}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(chain.tipsVolume24h)}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(chain.guildDeposits24h)}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(chain.badgeMints24h)}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(chain.streakBreaks24h)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--px-sub)]">
        <div>
          Last updated:{' '}
          {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'pending'}
        </div>
        {notes.length ? (
          <div className="flex flex-wrap items-center gap-2">
            {notes.slice(0, 3).map((note, idx) => (
              <span key={`${note}-${idx}`} className="pixel-pill bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5/5 text-[10px]">
                {note}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
