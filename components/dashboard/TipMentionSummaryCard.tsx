'use client'

import type { TipMentionSummary } from '@/lib/tips-types'

type TipMentionSummaryCardProps = {
  summary: TipMentionSummary | null
  loading: boolean
  error: string | null
  onRefresh: () => void
}

const TYPE_LABELS: Record<string, string> = {
  direct_mention: 'Direct mention',
  reply_mention: 'Reply mention',
  keyword_signal: 'Keyword signal',
}

const REASON_LABELS: Record<string, string> = {
  awarded: 'Awarded',
  cooldown_global: 'Global cooldown',
  cooldown_actor: 'Actor cooldown',
  actor_cap: 'Actor cap reached',
  global_cap: 'Global cap reached',
}

function formatCompactNumber(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

function formatPoints(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '0'
  return `${value > 0 ? '+' : ''}${value.toLocaleString()}`
}

function formatTimeAgo(timestamp: number | null): string {
  if (!timestamp || !Number.isFinite(timestamp)) return '—'
  const delta = Math.max(0, Date.now() - timestamp)
  const seconds = Math.floor(delta / 1_000)
  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  const years = Math.floor(days / 365)
  return `${years}y ago`
}

function formatFuture(timestamp: number | null): string {
  if (!timestamp || !Number.isFinite(timestamp)) return 'now'
  const delta = timestamp - Date.now()
  if (delta <= 0) return 'now'
  const seconds = Math.floor(delta / 1_000)
  if (seconds < 60) return `in ${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `in ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `in ${hours}h`
  const days = Math.floor(hours / 24)
  return `in ${days}d`
}

function formatReason(reason: string | undefined): string {
  if (!reason) return '—'
  return REASON_LABELS[reason] ?? reason
}

function formatType(type: string): string {
  return TYPE_LABELS[type] ?? 'Mention'
}

export function TipMentionSummaryCard({ summary, loading, error, onRefresh }: TipMentionSummaryCardProps) {
  const totals = summary?.totals
  const limits = summary?.limits
  const topActors = summary?.topActors ?? []
  const recent = summary?.recent ?? []

  return (
    <div className="pixel-card">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="pixel-section-title">Mention scoring</h3>
        <button className="pixel-button btn-xs" type="button" onClick={onRefresh} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error ? (
        <div className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
          <div className="font-semibold">Failed to load mention stats</div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span>{error}</span>
            <button
              type="button"
              className="underline decoration-dotted underline-offset-2"
              onClick={onRefresh}
              disabled={loading}
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}

      {summary ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-slate-200 dark:border-slate-700/10 bg-slate-100/5 dark:bg-white/5 px-2 py-3">
              <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--px-sub)]">Points 24h</div>
              <div className="text-lg font-semibold text-slate-950 dark:text-white">{formatCompactNumber(totals?.points24h ?? 0)}</div>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700/10 bg-slate-100/5 dark:bg-white/5 px-2 py-3">
              <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--px-sub)]">Mentions</div>
              <div className="text-lg font-semibold text-slate-950 dark:text-white">{totals?.mentions24h ?? 0}</div>
              {totals?.suppressed24h ? (
                <div className="text-[10px] text-amber-200">{totals.suppressed24h} suppressed</div>
              ) : null}
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700/10 bg-slate-100/5 dark:bg-white/5 px-2 py-3">
              <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--px-sub)]">Awards</div>
              <div className="text-lg font-semibold text-slate-950 dark:text-white">{totals?.awarded24h ?? 0}</div>
              {limits?.globalCapRemaining != null ? (
                <div className="text-[10px] text-[var(--px-sub)]">
                  {limits.globalDailyCap > 0 ? `${formatCompactNumber(limits.globalCapRemaining)} pts left` : 'Unlimited'}
                </div>
              ) : null}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.26em] text-[var(--px-sub)]">
              <span>Top mentioners</span>
              <span>Last</span>
            </div>
            {topActors.length ? (
              <ul className="mt-2 space-y-2">
                {topActors.map((actor) => (
                  <li
                    key={actor.actorId}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-700/10 bg-dark-bg-surface/70 px-3 py-2 text-[11px] text-slate-950 dark:text-white/80"
                  >
                    <div>
                      <div className="font-semibold text-slate-950 dark:text-white">{actor.actorLabel}</div>
                      <div className="text-[10px] text-[var(--px-sub)]">
                        {actor.mentions24h} mentions · {actor.suppressed24h} suppressed
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-emerald-200">{formatPoints(actor.points24h)} pts</div>
                      <div className="text-[10px] text-[var(--px-sub)]">{formatTimeAgo(actor.lastMentionAt)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-2 text-[11px] text-[var(--px-sub)]">No mention activity in the last day.</div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.26em] text-[var(--px-sub)]">
              <span>Recent events</span>
              <span>Outcome</span>
            </div>
            {recent.length ? (
              <ul className="mt-2 space-y-2">
                {recent.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-700/10 bg-dark-bg-elevated/70 px-3 py-2 text-[11px] text-slate-950 dark:text-white/80"
                  >
                    <div>
                      <div className="font-semibold text-slate-950 dark:text-white">{entry.actorLabel}</div>
                      <div className="text-[10px] text-[var(--px-sub)]">
                        {formatType(entry.type)} · {formatTimeAgo(entry.timestamp)}
                      </div>
                      {entry.message ? (
                        <div className="mt-1 text-[10px] text-slate-200 line-clamp-2">{entry.message}</div>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <div
                        className={
                          entry.suppressed
                            ? 'font-semibold text-amber-200'
                            : 'font-semibold text-emerald-200'
                        }
                      >
                        {entry.suppressed ? 'Suppressed' : `${formatPoints(entry.points)} pts`}
                      </div>
                      <div className="text-[10px] text-[var(--px-sub)]">{formatReason(entry.reason)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-2 text-[11px] text-[var(--px-sub)]">No mention events yet.</div>
            )}
          </div>

          {limits ? (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700/5 bg-slate-100/5 dark:bg-white/5 px-3 py-2 text-[10px] text-[var(--px-sub)]">
              <div>
                Global cap:{' '}
                {limits.globalDailyCap > 0
                  ? `${limits.globalDailyCap.toLocaleString()} pts / 24h`
                  : 'Unlimited'}
              </div>
              <div>Actor cap: {limits.actorDailyCap > 0 ? `${limits.actorDailyCap.toLocaleString()} pts` : 'Unlimited'}</div>
              <div>Cooldowns: {limits.mentionCooldownMinutes}m global · {limits.actorCooldownMinutes}m actor</div>
              {limits.nextGlobalEligibleAt ? (
                <div>Next awards open {formatFuture(limits.nextGlobalEligibleAt)}</div>
              ) : null}
              {limits.globalCapResetsAt ? (
                <div>Cap resets {formatFuture(limits.globalCapResetsAt)}</div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="text-[var(--px-sub)] text-sm">
          {loading ? 'Loading mention stats…' : 'No mention data yet. Enable tip stream to start collecting mentions.'}
        </div>
      )}
    </div>
  )
}
