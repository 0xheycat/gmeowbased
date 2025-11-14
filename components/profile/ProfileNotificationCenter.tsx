'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { useNotificationCenter } from '@/hooks/useNotificationCenter'
import type { NotificationCategory, NotificationItem } from '@/components/ui/live-notifications'

const FILTER_LABELS: Record<'all' | NotificationCategory, string> = {
  all: 'All',
  system: 'System',
  quest: 'Quests',
  badge: 'Badges',
  guild: 'Guilds',
  reward: 'Rewards',
  tip: 'Tips',
  level: 'Level Ups',
  reminder: 'Reminders',
  mention: 'Mentions',
  streak: 'Streaks',
}

const CATEGORY_ICONS: Partial<Record<NotificationCategory, string>> = {
  system: '🛰️',
  quest: '🧭',
  badge: '🎖️',
  guild: '🏰',
  reward: '💎',
  tip: '⚡',
  level: '🚀',
  reminder: '⏰',
  mention: '💬',
  streak: '🔥',
}

function formatTimeAgo(timestamp: number): string {
  const delta = Math.max(0, Date.now() - timestamp)
  const seconds = Math.floor(delta / 1000)
  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

type ProfileNotificationCenterProps = {
  className?: string
}

export function ProfileNotificationCenter({ className }: ProfileNotificationCenterProps) {
  const { notifications, categories, dismiss, dismissAll } = useNotificationCenter()
  const [activeFilter, setActiveFilter] = useState<'all' | NotificationCategory>('all')
  const [isExpanded, setIsExpanded] = useState(false)

  const filterOptions = useMemo(() => {
    const set = new Set<NotificationCategory>(categories)
    return (['all', ...Array.from(set)] as const).filter((key) => key === 'all' || set.has(key))
  }, [categories])

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return notifications
    return notifications.filter((note) => note.category === activeFilter)
  }, [notifications, activeFilter])

  const unreadCount = notifications.length

  const handleDismiss = (note: NotificationItem) => {
    dismiss(note.id)
  }

  const handlePrimaryAction = (note: NotificationItem) => {
    if (note.onAction) {
      note.onAction()
    } else if (note.href) {
      if (/^https?:/i.test(note.href)) {
        window.open(note.href, '_blank', 'noopener,noreferrer')
      }
    }
    dismiss(note.id)
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-emerald-300/40 hover:bg-white/8"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="text-xl" aria-hidden>
              🔔
            </span>
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow-[0_0_12px_rgba(16,185,129,0.6)]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            <p className="text-[11px] text-[var(--px-sub)]">
              {unreadCount === 0 ? 'No new notifications' : `${unreadCount} unread ${unreadCount === 1 ? 'notification' : 'notifications'}`}
            </p>
          </div>
        </div>
        <svg
          className={`h-5 w-5 text-white/60 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
          {/* Header with clear all button */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-white">Activity Feed</h4>
            <button
              type="button"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/80 transition hover:border-rose-300/40 hover:text-white disabled:opacity-30"
              onClick={() => dismissAll()}
              disabled={!notifications.length}
            >
              Clear All
            </button>
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => setActiveFilter(option)}
                className={cn(
                  'pixel-pill border px-3 py-1 text-[10px] uppercase tracking-[0.22em] transition',
                  activeFilter === option
                    ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.35)]'
                    : 'border-white/10 bg-white/5 text-white/70 hover:border-emerald-300/40 hover:text-white',
                )}
              >
                {FILTER_LABELS[option]}
              </button>
            ))}
          </div>

          {/* Notifications list */}
          <div className="space-y-3">
            {filtered.length ? (
              filtered.slice(0, 10).map((note) => {
                const icon = note.category ? CATEGORY_ICONS[note.category] ?? '✨' : '✨'
                const primaryActionLabel = note.actionLabel ?? (note.href ? 'View' : null)
                return (
                  <article
                    key={note.id}
                    className="rounded-xl border border-white/10 bg-white/5 p-3 shadow-[0_12px_28px_rgba(8,19,45,0.3)] backdrop-blur transition hover:border-white/20 hover:bg-white/8"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-lg">
                        <span aria-hidden>{icon}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h5 className="text-[13px] font-semibold text-white">{note.title}</h5>
                            {note.description ? (
                              <p className="mt-1 text-[11px] leading-relaxed text-[var(--px-sub)]">{note.description}</p>
                            ) : null}
                            <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.26em] text-[var(--px-sub)]">
                              <span>{formatTimeAgo(note.createdAt)}</span>
                              {note.category && (
                                <>
                                  <span className="text-white/30">•</span>
                                  <span>{FILTER_LABELS[note.category]}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="flex-shrink-0 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.26em] text-white/80 transition hover:border-rose-300/40 hover:text-white"
                            onClick={() => handleDismiss(note)}
                            aria-label="Dismiss notification"
                          >
                            Dismiss
                          </button>
                        </div>
                        {primaryActionLabel ? (
                          <div className="mt-3">
                            <button
                              type="button"
                              className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-[11px] uppercase tracking-[0.26em] text-emerald-100 transition hover:bg-emerald-500/25"
                              onClick={() => handlePrimaryAction(note)}
                            >
                              {primaryActionLabel}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                )
              })
            ) : (
              <div className="rounded-xl border border-dashed border-white/15 bg-white/3 p-8 text-center">
                <div className="mb-2 text-3xl" aria-hidden>
                  🎉
                </div>
                <p className="text-[12px] text-[var(--px-sub)]">
                  {activeFilter === 'all'
                    ? 'All clear! No notifications right now.'
                    : `No ${FILTER_LABELS[activeFilter].toLowerCase()} notifications.`}
                </p>
              </div>
            )}
          </div>

          {/* Show more indicator */}
          {filtered.length > 10 && (
            <div className="rounded-lg border border-white/10 bg-white/3 px-3 py-2 text-center text-[11px] text-[var(--px-sub)]">
              Showing 10 of {filtered.length} notifications
            </div>
          )}
        </div>
      )}
    </div>
  )
}
