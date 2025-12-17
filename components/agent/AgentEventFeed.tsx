'use client'

// @edit-start 2025-02-14 — Agent event feed component
import clsx from 'clsx'
import { useMemo } from 'react'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'

import { Card, CardDescription, CardFooter, CardTitle, EmptyState, type CardProps } from '@/components/ui/button'
import type { CommunityEventSummary } from '@/lib/profile/community-event-types'

const dotStyles: Record<CommunityEventSummary['emphasis'], string> = {
  positive: 'bg-emerald-300',
  neutral: 'bg-slate-100/90 dark:bg-white/5',
  negative: 'bg-rose-300',
}

const toneByEmphasis: Record<CommunityEventSummary['emphasis'], CardProps['tone']> = {
  positive: 'accent',
  neutral: 'muted',
  negative: 'danger',
}

const NEW_EVENT_WINDOW_MS = 5 * 60 * 1000

function formatRelativeTime(isoDate: string): string {
  const target = new Date(isoDate).getTime()
  if (!Number.isFinite(target)) return 'just now'
  const deltaMs = target - Date.now()
  const absMs = Math.abs(deltaMs)

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (absMs < 60_000) {
    return rtf.format(Math.round(deltaMs / 1000), 'second')
  }
  if (absMs < 3_600_000) {
    return rtf.format(Math.round(deltaMs / 60_000), 'minute')
  }
  if (absMs < 86_400_000) {
    return rtf.format(Math.round(deltaMs / 3_600_000), 'hour')
  }
  return rtf.format(Math.round(deltaMs / 86_400_000), 'day')
}

function formatTierLabel(tierName: string | null, tierPercent: number | null): string | null {
  if (!tierName) return null
  if (tierPercent == null || !Number.isFinite(tierPercent)) return tierName
  return `${tierName} · ${tierPercent.toFixed(1)}%`
}

function formatChainLabel(chain: CommunityEventSummary['chain']): string | null {
  if (!chain) return null
  return chain.charAt(0).toUpperCase() + chain.slice(1)
}

function formatActor(actor: CommunityEventSummary['actor']): string {
  if (actor.displayName) return actor.displayName
  if (actor.username) return `@${actor.username}`
  if (actor.fid) return `pilot #${actor.fid}`
  if (typeof actor.walletAddress === 'string' && actor.walletAddress.length > 10) {
    return `${actor.walletAddress.slice(0, 6)}…${actor.walletAddress.slice(-4)}`
  }
  return 'A pilot'
}

type AgentEventFeedProps = {
  events: CommunityEventSummary[]
  emptyHint?: string
}

export function AgentEventFeed({ events, emptyHint }: AgentEventFeedProps) {
  const items = useMemo(() => events.slice(0, 64), [events])

  if (!items.length) {
    return (
      <EmptyState
        icon={<AutoAwesomeIcon className="size-8 text-slate-950 dark:text-white/60" />}
        title="Nothing yet — the agent is listening."
        description={emptyHint ?? 'Live events will stream in as soon as quests finish or streaks post.'}
        tone="muted"
        padding="sm"
      />
    )
  }

  return (
    <ul className="space-y-3">
      {items.map((event) => {
        const isNew = Date.now() - new Date(event.createdAt).getTime() <= NEW_EVENT_WINDOW_MS
        const tierLabel = formatTierLabel(event.tierName, event.tierPercent)
        const chainLabel = formatChainLabel(event.chain)
        const actorLabel = formatActor(event.actor)
        const tone = toneByEmphasis[event.emphasis] ?? 'muted'

        return (
          <li key={event.id}>
            <Card tone={tone} padding="sm" interactive className="group relative overflow-hidden">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-950 dark:text-white/60">
                    <span className="inline-flex items-center gap-2">
                      <span className={clsx('h-1.5 w-1.5 rounded-full', dotStyles[event.emphasis])} aria-hidden="true" />
                      {event.eventType.replace(/-/g, ' ')}
                    </span>
                    {chainLabel ? (
                      <span className="pixel-pill border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-white/5 text-[10px] text-slate-950 dark:text-white/70">{chainLabel}</span>
                    ) : null}
                    {isNew ? (
                      <span className="rounded-full border border-emerald-200/40 bg-emerald-400/10 px-2 py-[2px] text-[10px] text-emerald-100">
                        New
                      </span>
                    ) : null}
                  </div>
                  <CardTitle asChild>
                    <h3 className="text-lg font-semibold text-slate-950 dark:text-white sm:text-xl">{event.headline}</h3>
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-950 dark:text-white/80">
                    {event.context ?? 'Telemetry synced.'}
                    <span className="ml-2 text-xs text-slate-950 dark:text-white/60">{actorLabel}</span>
                  </CardDescription>
                  <CardFooter className="flex flex-wrap items-center gap-2 text-[11px] text-slate-950 dark:text-white/65">
                    <span className="inline-flex items-center gap-1">
                      <AccessTimeIcon className="size-3.5" />
                      {formatRelativeTime(event.createdAt)}
                    </span>
                    {event.delta != null ? (
                      <span className="pixel-pill border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-white/5 text-xs text-slate-950 dark:text-white/80">
                        Δ {event.delta > 0 ? '+' : ''}{event.delta.toLocaleString()} pts
                      </span>
                    ) : null}
                    {event.totalPoints != null ? (
                      <span className="pixel-pill border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-white/5 text-xs text-slate-950 dark:text-white/80">
                        {event.totalPoints.toLocaleString()} pts total
                      </span>
                    ) : null}
                    {tierLabel ? (
                      <span className="pixel-pill border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-white/5 text-xs text-slate-950 dark:text-white/80">{tierLabel}</span>
                    ) : null}
                  </CardFooter>
                </div>
                {event.cta ? (
                  <a
                    className="inline-flex items-center gap-2 self-start rounded-full border border-white dark:border-slate-700/20 bg-slate-100/5 dark:bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-950 dark:text-white/90 transition hover:border-emerald-200/60 hover:bg-emerald-400/10"
                    href={event.cta.href}
                  >
                    {event.cta.label}
                    <AutoAwesomeIcon className="size-4 text-emerald-200" />
                  </a>
                ) : null}
              </div>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
// @edit-end

