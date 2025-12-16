"use client"

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@supabase/supabase-js'
import type { NotificationCategory, NotificationHistoryItem } from '@/lib/notifications'
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

// Removed formatTipSender, formatTipRecipient, formatTipValue, formatTipKindLabel
// Will be rebuilt with mention-based tip system

function formatAddress(raw: string): string {
  if (!raw) return '—'
  if (raw.length <= 10) return raw
  return `${raw.slice(0, 6)}...${raw.slice(-4)}`
}

type DashboardNotificationCenterProps = {
  tipOptIn: boolean
  onTipOptInChange: (value: boolean) => void
  tipStatusLabel: string
  // Removed tipFeed - will be rebuilt with mention-based system
}

export function DashboardNotificationCenter({ tipOptIn, onTipOptInChange, tipStatusLabel }: DashboardNotificationCenterProps) {
  const { fid } = useAuth()
  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [activeFilter, setActiveFilter] = useState<'all' | NotificationCategory>('all')

  // Fetch notifications from database (Phase 1-6 system)
  useEffect(() => {
    if (!fid) return

    const loadNotifications = async () => {
      setLoading(true)
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        if (!supabaseUrl || !supabaseKey) return

        const supabase = createClient(supabaseUrl, supabaseKey)
        const { data, error } = await supabase
          .from('user_notification_history')
          .select('*')
          .eq('fid', fid)
          .is('dismissed_at', null)
          .order('created_at', { ascending: false })
          .limit(50)

        if (!error && data) {
          setNotifications(data as NotificationHistoryItem[])
        }
      } catch (error) {
        console.error('[DashboardNotificationCenter] Failed to load notifications:', error)
      } finally {
        setLoading(false)
      }
    }

    loadNotifications()
  }, [fid])

  // Extract unique categories from loaded notifications
  const categories = useMemo(() => {
    const set = new Set<NotificationCategory>()
    notifications.forEach(n => set.add(n.category))
    return Array.from(set)
  }, [notifications])

  const filterOptions = useMemo(() => {
    const set = new Set<NotificationCategory>(categories)
    return (['all', ...Array.from(set)] as const).filter((key) => key === 'all' || set.has(key))
  }, [categories])

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return notifications
    return notifications.filter((note) => note.category === activeFilter)
  }, [notifications, activeFilter])

  const handleDismiss = async (noteId: string) => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!supabaseUrl || !supabaseKey) return

      const supabase = createClient(supabaseUrl, supabaseKey)
      await supabase
        .from('user_notification_history')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', noteId)

      // Optimistically remove from UI
      setNotifications(prev => prev.filter(n => n.id !== noteId))
    } catch (error) {
      console.error('[DashboardNotificationCenter] Failed to dismiss notification:', error)
    }
  }

  const dismissAll = async () => {
    if (!fid) return
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!supabaseUrl || !supabaseKey) return

      const supabase = createClient(supabaseUrl, supabaseKey)
      await supabase
        .from('user_notification_history')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('fid', fid)
        .is('dismissed_at', null)

      // Clear UI
      setNotifications([])
    } catch (error) {
      console.error('[DashboardNotificationCenter] Failed to clear all:', error)
    }
  }

  const handlePrimaryAction = (noteId: string) => {
    // Dismiss after action
    handleDismiss(noteId)
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
            // NotificationHistoryItem has: title, description, created_at
            const timestamp = note.created_at ? new Date(note.created_at).getTime() : Date.now()
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
                        <h4 className="text-sm font-semibold text-slate-950 dark:text-white">{note.title}</h4>
                        {note.category ? (
                          <span className="pixel-pill bg-slate-100/10 dark:bg-white/5 text-[9px] text-slate-950 dark:text-white/70">
                            {FILTER_LABELS[note.category]}
                          </span>
                        ) : null}
                      </div>
                      {note.description ? (
                        <p className="mt-1 text-[12px] text-[var(--px-sub)] leading-relaxed">{note.description}</p>
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
        <p className="mt-3 text-[11px] text-[var(--px-sub)]">
          No tips yet. Enable the stream and keep this page open to celebrate incoming boosts in real time.
        </p>
      </div>
    </div>
  )
}
