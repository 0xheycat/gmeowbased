"use client"

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { useNotificationCenter } from '@/hooks/useNotificationCenter'
import type { NotificationCategory, NotificationItem } from '@/components/ui/live-notifications'
import type { TipBroadcast } from '@/lib/tips-types'

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

function formatTipSender(tip: TipBroadcast): string {
  if (tip.fromDisplay && tip.fromDisplay.trim()) return tip.fromDisplay.trim()
  if (tip.fromUsername && tip.fromUsername.trim()) return `@${tip.fromUsername.replace(/^@/, '').trim()}`
  if (tip.fromAddress) return formatAddress(tip.fromAddress)
  if (typeof tip.fromFid === 'number' && Number.isFinite(tip.fromFid)) return `fid:${tip.fromFid}`
  return 'Someone'
}

function formatTipRecipient(tip: TipBroadcast): string {
  if (tip.toDisplay && tip.toDisplay.trim()) return tip.toDisplay.trim()
  if (tip.toUsername && tip.toUsername.trim()) return `@${tip.toUsername.replace(/^@/, '').trim()}`
  if (tip.toAddress) return formatAddress(tip.toAddress)
  if (typeof tip.toFid === 'number' && Number.isFinite(tip.toFid)) return `fid:${tip.toFid}`
  return 'the squad'
}

function formatTipValue(tip: TipBroadcast): string | null {
  if (typeof tip.amount === 'number' && Number.isFinite(tip.amount)) {
    const amount = tip.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })
    return tip.symbol ? `${amount} ${tip.symbol}` : amount
  }
  if (typeof tip.points === 'number' && Number.isFinite(tip.points)) {
    return `+${tip.points.toLocaleString()} pts`
  }
  if (typeof tip.usdValue === 'number' && Number.isFinite(tip.usdValue)) {
    return `$${tip.usdValue.toFixed(2)}`
  }
  if ((tip.kind ?? 'tip') === 'mention') return 'Shout-out'
  return null
}

function formatTipKindLabel(tip: TipBroadcast): string {
  switch (tip.kind) {
    case 'mention':
      return 'Mention'
    case 'activity':
      return 'Activity'
    default:
      return 'Tip'
  }
}

function formatAddress(raw: string): string {
  if (!raw) return '—'
  if (raw.length <= 10) return raw
  return `${raw.slice(0, 6)}...${raw.slice(-4)}`
}

type DashboardNotificationCenterProps = {
  tipOptIn: boolean
  onTipOptInChange: (value: boolean) => void
  tipStatusLabel: string
  tipFeed: TipBroadcast[]
}

export function DashboardNotificationCenter({ tipOptIn, onTipOptInChange, tipStatusLabel, tipFeed }: DashboardNotificationCenterProps) {
  const { notifications, categories, dismiss, dismissAll } = useNotificationCenter()
  const [activeFilter, setActiveFilter] = useState<'all' | NotificationCategory>('all')

  const filterOptions = useMemo(() => {
    const set = new Set<NotificationCategory>(categories)
    return (['all', ...Array.from(set)] as const).filter((key) => key === 'all' || set.has(key))
  }, [categories])

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return notifications
    return notifications.filter((note) => note.category === activeFilter)
  }, [notifications, activeFilter])

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
    <div className="pixel-card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="pixel-section-title">Notification Center</h3>
          <p className="text-[11px] text-[var(--px-sub)]">
            Filter live alerts from quests, badges, guilds, rewards, and system nudges.
          </p>
        </div>
        <button
          type="button"
          className="pixel-button btn-sm border-white/12 bg-white/5 text-white/80 hover:border-emerald-300/40 hover:text-white"
          onClick={() => dismissAll()}
          disabled={!notifications.length}
        >
          Clear all
        </button>
      </div>

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

      <div className="space-y-3">
        {filtered.length ? (
          filtered.map((note) => {
            const icon = note.category ? CATEGORY_ICONS[note.category] ?? '✨' : '✨'
            const primaryActionLabel = note.actionLabel ?? (note.href ? 'Open' : null)
            return (
              <article
                key={note.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_18px_40px_rgba(8,19,45,0.35)] backdrop-blur"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-1 gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-xl">
                      <span aria-hidden>{icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold text-white">{note.title}</h4>
                        {note.category ? (
                          <span className="pixel-pill bg-white/10 text-[9px] text-white/70">
                            {FILTER_LABELS[note.category]}
                          </span>
                        ) : null}
                      </div>
                      {note.description ? (
                        <p className="mt-1 text-[12px] text-[var(--px-sub)] leading-relaxed">{note.description}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.26em] text-[var(--px-sub)]">
                        <span>{formatTimeAgo(note.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary btn-xs text-[10px] uppercase tracking-[0.28em]"
                    onClick={() => handleDismiss(note)}
                    aria-label="Dismiss notification"
                  >
                    Dismiss
                  </button>
                </div>
                {primaryActionLabel ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className={cn(buttonVariants({ variant: 'ghost', color: 'primary', size: 'small' }), 'px-5 text-[11px] uppercase tracking-[0.28em]')}
                      onClick={() => handlePrimaryAction(note)}
                    >
                      {primaryActionLabel}
                    </button>
                    {note.href && /^https?:/i.test(note.href) ? (
                      <Link
                        href={note.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] uppercase tracking-[0.26em] text-emerald-200 underline"
                      >
                        Open in new tab ↗
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </article>
            )
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-8 text-center text-[12px] text-[var(--px-sub)]">
            No notifications in this channel yet. Keep playing—alerts land here as soon as quests, guilds, tips, or badges fire.
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-white">Tip Stream</h4>
            <p className="text-[11px] text-[var(--px-sub)]">
              Stay on this page to capture live Warpcast tips. Status: {tipStatusLabel}
            </p>
          </div>
          <label className="flex items-center gap-2 text-[11px] text-[var(--px-sub)] cursor-pointer">
            <input
              type="checkbox"
              checked={tipOptIn}
              onChange={(event) => onTipOptInChange(event.target.checked)}
            />
            <span>Enable stream</span>
          </label>
        </div>
        {tipFeed.length ? (
          <ul className="mt-3 space-y-2">
            {tipFeed.slice(0, 4).map((tip) => {
              const valueLabel = formatTipValue(tip)
              return (
                <li key={tip.id} className="rounded-xl border border-white/10 bg-[#081223]/70 px-3 py-2 text-[11px] text-white/80">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">
                    {formatTipSender(tip)}
                    <span className="ml-2 text-[10px] text-[var(--px-sub)]">→ {formatTipRecipient(tip)}</span>
                  </span>
                  {valueLabel ? <span className="text-emerald-200">{valueLabel}</span> : null}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-[var(--px-sub)]">
                  <span className="pixel-pill bg-white/10 px-2 py-[2px] text-[9px] uppercase tracking-[0.22em] text-white/70">
                    {formatTipKindLabel(tip)}
                  </span>
                  <span>{formatTimeAgo(tip.createdAt)}</span>
                </div>
                {tip.message ? <div className="mt-1 text-[11px] text-slate-200 line-clamp-2">{tip.message}</div> : null}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-3 text-[11px] text-[var(--px-sub)]">
            No tips yet. Enable the stream and keep this page open to celebrate incoming boosts in real time.
          </p>
        )}
      </div>
    </div>
  )
}
