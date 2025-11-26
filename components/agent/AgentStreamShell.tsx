'use client'

// @edit-start 2025-02-14 — Agent stream shell
import { ArrowClockwise, WarningCircle } from '@phosphor-icons/react'
import clsx from 'clsx'

import { AgentEventFeed } from '@/components/agent/AgentEventFeed'
import { AgentComposer } from '@/components/agent/AgentComposer'
import { CardSection } from '@/components/ui/button'
import { useCommunityEventStream } from '@/hooks/useCommunityEvents'

function EventSkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5 p-4 sm:p-5">
      <div className="h-3 w-24 rounded-full bg-slate-100/10 dark:bg-slate-100/90 dark:bg-white/5" />
      <div className="mt-4 h-4 w-3/4 rounded-full bg-slate-100/10 dark:bg-slate-100/90 dark:bg-white/5" />
      <div className="mt-2 h-3 w-full rounded-full bg-slate-100/10 dark:bg-slate-100/90 dark:bg-white/5" />
      <div className="mt-2 h-3 w-2/3 rounded-full bg-slate-100/10 dark:bg-slate-100/90 dark:bg-white/5" />
      <div className="mt-4 flex gap-2">
        <div className="h-3 w-20 rounded-full bg-slate-100/10 dark:bg-slate-100/90 dark:bg-white/5" />
        <div className="h-3 w-20 rounded-full bg-slate-100/10 dark:bg-slate-100/90 dark:bg-white/5" />
      </div>
    </div>
  )
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return 'never'
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return 'never'
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function AgentStreamShell() {
  const { events, status, error, isInitialLoading, refresh, lastUpdated } = useCommunityEventStream()

  const showSkeleton = isInitialLoading
  const errorMessage = status === 'error' ? error ?? 'Unable to load events' : null

  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <CardSection
          tone="muted"
          padding="xs"
          className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-950 dark:text-white/70"
        >
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                'inline-flex h-2 w-2 rounded-full',
                status === 'success'
                  ? 'bg-emerald-300'
                  : status === 'loading'
                    ? 'bg-amber-300 animate-pulse'
                    : status === 'error'
                      ? 'bg-rose-400'
                      : 'bg-slate-100/90 dark:bg-white/5',
              )}
              aria-hidden="true"
            />
            <span>
              {status === 'loading' && !isInitialLoading && 'Syncing latest telemetry…'}
              {status === 'loading' && isInitialLoading && 'Booting event stream…'}
              {status === 'success' && `Last synced at ${formatTimestamp(lastUpdated)}`}
              {status === 'idle' && 'Stream idle'}
              {status === 'error' && 'Connection stalled'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => refresh()}
            className="inline-flex items-center gap-1 rounded-full border border-white dark:border-slate-700/15 bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-950 dark:text-slate-950 dark:text-white/75 transition hover:border-emerald-300/40 hover:bg-emerald-400/10"
          >
            <ArrowClockwise className={clsx('size-4', status === 'loading' ? 'animate-spin' : undefined)} weight="bold" />
            Refresh
          </button>
        </CardSection>

        {errorMessage ? (
          <CardSection tone="danger" padding="sm" className="flex items-start gap-3 text-sm text-slate-950 dark:text-white">
            <WarningCircle className="size-5 flex-shrink-0" weight="bold" />
            <div>
              <p className="font-semibold">Live feed paused</p>
              <p>{errorMessage}</p>
            </div>
          </CardSection>
        ) : null}

        {showSkeleton ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <EventSkeletonCard key={index} />
            ))}
          </div>
        ) : (
          <AgentEventFeed events={events} />
        )}
      </div>

      <AgentComposer className="self-start lg:sticky lg:top-[88px]" />
    </section>
  )
}
// @edit-end

