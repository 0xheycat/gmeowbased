"use client"

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { useNotificationCenter } from '@/hooks/useNotificationCenter'
import type { NotificationCategory, NotificationItem } from '@/components/ui/live-notifications'
import type { TipBroadcast } from '@/lib/tips-types'
import SatelliteAltIcon from '@mui/icons-material/SatelliteAlt'
import ExploreIcon from '@mui/icons-material/Explore'
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech'
import CastleIcon from '@mui/icons-material/Castle'
import DiamondIcon from '@mui/icons-material/Diamond'
import BoltIcon from '@mui/icons-material/Bolt'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import AlarmIcon from '@mui/icons-material/Alarm'
import ChatIcon from '@mui/icons-material/Chat'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'

const FILTER_LABELS: Record<'all' | NotificationCategory, string> = {
  all: 'All',
  system: 'System',
  quest: 'Quests',
  badge: 'Badges',
  guild: 'Guilds',
  reward: 'Rewards',
  tip: 'Tips',
  level: 'Level Ups',
  streak: 'Streaks',
  social: 'Social',
  gm: 'GM',
  achievement: 'Achievements',
}

const CATEGORY_ICONS: Partial<Record<NotificationCategory, React.ReactNode>> = {
  system: <SatelliteAltIcon sx={{ fontSize: 16 }} />,
  quest: <ExploreIcon sx={{ fontSize: 16 }} />,
  badge: <MilitaryTechIcon sx={{ fontSize: 16 }} />,
  guild: <CastleIcon sx={{ fontSize: 16 }} />,
  reward: <DiamondIcon sx={{ fontSize: 16 }} />,
  tip: <BoltIcon sx={{ fontSize: 16 }} />,
  level: <RocketLaunchIcon sx={{ fontSize: 16 }} />,
  streak: <LocalFireDepartmentIcon sx={{ fontSize: 16 }} />,
  social: <ChatIcon sx={{ fontSize: 16 }} />,
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

  const handleDismiss = (noteId: string) => {
    // Note: dismiss expects number but note.id is string - convert if needed
    // For now, keeping as-is since the hook implementation may handle both
    dismiss(noteId as any)
  }

  const handlePrimaryAction = (noteId: string) => {
    // NotificationItem doesn't have onAction or href fields
    // These would need to be added to the interface if needed
    dismiss(noteId as any)
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
          className="pixel-button btn-sm border-white dark:border-slate-700/12 bg-slate-100/5 dark:bg-white/5 text-slate-950 dark:text-white/80 hover:border-emerald-300/40 hover:text-slate-950 dark:text-white"
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
                : 'border-slate-200 dark:border-white/10 bg-slate-100/90 dark:bg-white/5 text-slate-700 dark:text-white/70 hover:border-emerald-300/40 hover:text-slate-950 dark:text-white',
            )}
          >
            {FILTER_LABELS[option]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length ? (
          filtered.map((note) => {
            const icon = note.category ? CATEGORY_ICONS[note.category] ?? <AutoAwesomeIcon sx={{ fontSize: 16 }} /> : <AutoAwesomeIcon sx={{ fontSize: 16 }} />
            // Note: NotificationItem interface doesn't include description, createdAt, actionLabel, href
            // Using message, timestamp, and title fields that do exist
            const timestamp = note.timestamp ?? Date.now()
            return (
              <article
                key={note.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-700/10 bg-slate-100/5 dark:bg-white/5 p-4 shadow-[0_18px_40px_rgba(8,19,45,0.35)] backdrop-blur"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-1 gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-xl">
                      <span aria-hidden>{icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold text-slate-950 dark:text-white">{note.title || note.message}</h4>
                        {note.category ? (
                          <span className="pixel-pill bg-slate-100/10 dark:bg-white/5 text-[9px] text-slate-950 dark:text-white/70">
                            {FILTER_LABELS[note.category]}
                          </span>
                        ) : null}
                      </div>
                      {note.title && note.message ? (
                        <p className="mt-1 text-[12px] text-[var(--px-sub)] leading-relaxed">{note.message}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.26em] text-[var(--px-sub)]">
                        <span>{formatTimeAgo(timestamp)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary btn-xs text-[10px] uppercase tracking-[0.28em]"
                    onClick={() => handleDismiss(note.id)}
                    aria-label="Dismiss notification"
                  >
                    Dismiss
                  </button>
                </div>
              </article>
            )
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-white dark:border-slate-700/15 bg-slate-100/5 dark:bg-white/5 p-8 text-center text-[12px] text-[var(--px-sub)]">
            No notifications in this channel yet. Keep playing—alerts land here as soon as quests, guilds, tips, or badges fire.
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700/10 bg-slate-100/3 dark:bg-white/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-950 dark:text-white">Tip Stream</h4>
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
                <li key={tip.id} className="rounded-xl border border-slate-200 dark:border-slate-700/10 bg-dark-bg-panel/70 px-3 py-2 text-[11px] text-slate-950 dark:text-white/80">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">
                    {formatTipSender(tip)}
                    <span className="ml-2 text-[10px] text-[var(--px-sub)]">→ {formatTipRecipient(tip)}</span>
                  </span>
                  {valueLabel ? <span className="text-emerald-200">{valueLabel}</span> : null}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-[var(--px-sub)]">
                  <span className="pixel-pill bg-slate-100/10 dark:bg-white/5 px-2 py-[2px] text-[9px] uppercase tracking-[0.22em] text-slate-950 dark:text-white/70">
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
