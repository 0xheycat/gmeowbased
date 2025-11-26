'use client'

import Link from 'next/link'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { saveNotification } from '@/lib/notification-history'
import { userContextCache } from '@/lib/cache-storage'

export type NotificationCategory =
  | 'system'
  | 'quest'
  | 'badge'
  | 'guild'
  | 'reward'
  | 'tip'
  | 'level'
  | 'reminder'
  | 'mention'
  | 'streak'

export type NotificationTone = 'info' | 'success' | 'warning' | 'error'

type NotificationInput = {
  tone: NotificationTone
  title: string
  description?: string
  actionLabel?: string
  href?: string
  onAction?: () => void
  duration?: number
  category?: NotificationCategory
  mentionedUser?: string | null
  rewardAmount?: number | null
  streakCount?: number | null
}

export type NotificationItem = NotificationInput & {
  id: number
  createdAt: number
}

type NotificationContextValue = {
  push: (input: NotificationInput) => number
  dismiss: (id: number) => void
  dismissAll: () => void
  items: NotificationItem[]
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return ctx
}

type ToneVisual = {
  icon: string
  border: string
  glow: string
  textAccent: string
  progress: string
  beacon: string
}

/* detail: tonal variants consumed by NotificationCard + NotificationBelt */
const toneVisuals: Record<NotificationTone, ToneVisual> = {
  info: {
    icon: 'ℹ️',
    border: 'border-cyan-300/60',
    glow: 'from-cyan-300/25 via-cyan-500/12 to-slate-950/80',
    textAccent: 'text-cyan-100',
    progress: 'bg-cyan-400/80',
    beacon: 'shadow-[0_0_0_0_rgba(126,243,199,0.38)]',
  },
  success: {
    icon: '✅',
    border: 'border-emerald-300/60',
    glow: 'from-emerald-300/28 via-emerald-500/12 to-slate-950/80',
    textAccent: 'text-emerald-100',
    progress: 'bg-emerald-400/80',
    beacon: 'shadow-[0_0_0_0_rgba(94,253,210,0.42)]',
  },
  warning: {
    icon: '⚠️',
    border: 'border-amber-300/60',
    glow: 'from-amber-400/30 via-amber-500/12 to-slate-950/80',
    textAccent: 'text-amber-100',
    progress: 'bg-amber-400/80',
    beacon: 'shadow-[0_0_0_0_rgba(255,208,112,0.42)]',
  },
  error: {
    icon: '⛔',
    border: 'border-rose-300/60',
    glow: 'from-rose-400/25 via-rose-500/10 to-slate-950/80',
    textAccent: 'text-rose-100',
    progress: 'bg-rose-400/80',
    beacon: 'shadow-[0_0_0_0_rgba(255,170,190,0.42)]',
  },
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const timersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({})
  const idRef = useRef(1)
  const savedIdsRef = useRef<Set<number>>(new Set())

  const dismiss = useCallback((id: number) => {
    clearTimeout(timersRef.current[id])
    delete timersRef.current[id]
    setNotifications((prev) => prev.filter((note) => note.id !== id))
  }, [])

  const push = useCallback(
    (input: NotificationInput) => {
      const id = idRef.current++
      const next: NotificationItem = { id, createdAt: Date.now(), ...input }
      setNotifications((prev) => [next, ...prev].slice(0, 6))
      const duration = typeof input.duration === 'number' ? input.duration : 5200
      if (duration > 0) {
        timersRef.current[id] = setTimeout(() => dismiss(id), duration)
      }
      return id
    },
    [dismiss],
  )

  const dismissAll = useCallback(() => {
    Object.values(timersRef.current).forEach(clearTimeout)
    timersRef.current = {}
    setNotifications([])
  }, [])

  useEffect(() => () => {
    Object.values(timersRef.current).forEach(clearTimeout)
    timersRef.current = {}
  }, [])

  // Auto-save notifications to history
  useEffect(() => {
    if (notifications.length === 0) return

    const latest = notifications[0]

    // Only save each notification once
    if (savedIdsRef.current.has(latest.id)) return
    savedIdsRef.current.add(latest.id)

    // Get user context for saving
    const userContext = userContextCache.get('current') as { fid?: number; walletAddress?: string } | null
    if (!userContext?.fid && !userContext?.walletAddress) return

    // Save to Supabase (fire and forget)
    saveNotification({
      fid: userContext.fid,
      walletAddress: userContext.walletAddress,
      category: latest.category || 'system',
      title: latest.title,
      description: latest.description || null,
      tone: latest.tone,
      metadata: {
        mentionedUser: latest.mentionedUser,
        rewardAmount: latest.rewardAmount,
        streakCount: latest.streakCount,
      },
      actionLabel: latest.actionLabel || null,
      actionHref: latest.href || null,
    }).catch(err => {
      // Silent fail - don't block UI
      console.debug('[NotificationProvider] Failed to save notification:', err.message)
    })
  }, [notifications])

  const value = useMemo<NotificationContextValue>(
    () => ({ push, dismiss, dismissAll, items: notifications }),
    [push, dismiss, dismissAll, notifications],
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <LiveNotificationSurface notifications={notifications} onDismiss={dismiss} />
    </NotificationContext.Provider>
  )
}

function LiveNotificationSurface({
  notifications,
  onDismiss,
}: {
  notifications: NotificationItem[]
  onDismiss: (id: number) => void
}) {
  const headlineTone = notifications[0]?.tone ?? 'info'
  const stackAnchorClass =
    'pointer-events-none fixed right-3 sm:right-4 top-20 sm:top-24 z-50 flex justify-end lg:right-10'
  const stackWrapperClass = 'flex w-full max-w-[360px] sm:max-w-sm flex-col gap-2 sm:gap-3'

  return (
    <>
      <NotificationBelt count={notifications.length} tone={headlineTone} />
      {notifications.length ? (
        <div className={stackAnchorClass}>
          <div className={stackWrapperClass}>
            {notifications.map((note, index) => (
              <NotificationCard key={note.id} note={note} onDismiss={onDismiss} index={index} />
            ))}
          </div>
        </div>
      ) : null}
      {/* detail: animation keyframes + beacon styling live in app/styles.css → LIVE NOTIFICATION SURFACE */}
    </>
  )
}

function NotificationBelt({ count, tone }: { count: number; tone: NotificationTone }) {
  const { icon, beacon } = toneVisuals[tone]
  const active = count > 0
  const displayCount = count > 9 ? '9+' : count.toString()
  const anchorClass = 'pointer-events-none fixed right-4 sm:right-5 top-4 sm:top-5 z-50 lg:right-10'
  const labelClass = 'pointer-events-none mt-1.5 sm:mt-2 block text-center text-[9px] sm:text-[10px] uppercase tracking-[0.28em] sm:tracking-[0.32em] text-slate-400'

  return (
    <div className={anchorClass}>
      <div
        className={cn(
          'relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border border-slate-200 dark:border-white/10 bg-[#040f1d]/80 text-base sm:text-lg text-cyan-100 shadow-[0_18px_52px_rgba(4,14,28,0.6)] backdrop-blur-xl',
          active ? 'animate-[gmeow-beacon_2800ms_ease-in-out_infinite]' : 'opacity-80',
          active ? beacon : '',
        )}
        aria-live="polite"
        role="status"
      >
        <span aria-hidden>{icon}</span>
        {active ? (
          <span
            className="pointer-events-none absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 flex min-h-[1.4rem] min-w-[1.5rem] sm:min-h-[1.5rem] sm:min-w-[1.6rem] items-center justify-center rounded-full bg-gradient-to-br from-[#5df3d0] to-[#4fd1ff] px-0.5 sm:px-1 text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.22em] sm:tracking-[0.26em] text-[#062033] shadow-[0_10px_30px_rgba(6,26,44,0.55)]"
            style={{ animation: 'gmeow-badge-pop 240ms ease-out forwards' }}
          >
            {displayCount}
          </span>
        ) : null}
        <span className="pointer-events-none absolute inset-0 rounded-full border border-cyan-200/40" aria-hidden />
        <span
          className="pointer-events-none absolute inset-0 rounded-full border border-cyan-300/20"
          style={{ animation: active ? 'gmeow-orbit-sheen 3200ms linear infinite' : undefined }}
          aria-hidden
        />
      </div>
      <span className={labelClass}>Live</span>
    </div>
  )
}

function NotificationCard({ note, onDismiss, index }: { note: NotificationItem; onDismiss: (id: number) => void; index: number }) {
  const { icon, border, glow, textAccent, progress } = toneVisuals[note.tone]
  const duration = typeof note.duration === 'number' ? note.duration : 5200
  const isPolite = note.tone === 'info' || note.tone === 'success'
  const isExternal = note.href ? /^https?:/i.test(note.href) : false
  const categoryLabel = note.category
    ? categoryLabels[note.category] ?? note.category
    : null

  // Staggered animation delay
  const animationDelay = `${index * 80}ms`
  const slideDistance = 20 + (index * 5)

  return (
    <article
      role={note.tone === 'error' || note.tone === 'warning' ? 'alert' : 'status'}
      aria-live={isPolite ? 'polite' : 'assertive'}
      className={cn(
        'pointer-events-auto overflow-hidden rounded-2xl sm:rounded-3xl border bg-[#080f21]/95 px-4 py-3 sm:px-5 sm:py-4 text-sm shadow-[0_24px_80px_rgba(5,10,34,0.55)] backdrop-blur',
        border,
      )}
      style={{
        animation: `gmeow-slide-in-notification 320ms cubic-bezier(0.22,1,0.36,1) ${animationDelay} both`,
        '--slide-distance': `${slideDistance}px`,
      } as React.CSSProperties}
    >
      <div className={cn('absolute inset-0 -z-10 bg-gradient-to-br opacity-90', glow)} />
      <div className="flex items-start gap-2 sm:gap-3">
        <span className="text-base sm:text-lg" aria-hidden>
          {icon}
        </span>
        <div className="min-w-0 flex-1 text-slate-200">
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.3em] sm:tracking-[0.34em] text-slate-400">Live Update</p>
          <h3 className={cn('mt-1 text-sm font-semibold text-slate-100 leading-tight', textAccent)}>{note.title}</h3>
          
          {/* Mention support */}
          {note.mentionedUser ? (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="text-xs text-slate-400">@</span>
              <span className={cn('text-xs font-medium', textAccent)}>{note.mentionedUser}</span>
            </div>
          ) : null}

          {/* Reward amount */}
          {note.rewardAmount != null && note.rewardAmount > 0 ? (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="text-base" aria-hidden>🎁</span>
              <span className={cn('text-sm font-bold', textAccent)}>+{note.rewardAmount.toLocaleString()} XP</span>
            </div>
          ) : null}

          {/* Streak count */}
          {note.streakCount != null && note.streakCount > 0 ? (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="text-base" aria-hidden>🔥</span>
              <span className={cn('text-sm font-bold', textAccent)}>{note.streakCount} day streak!</span>
            </div>
          ) : null}

          {categoryLabel ? (
            <span className="mt-1.5 inline-flex items-center rounded-full border border-white dark:border-slate-700/10 bg-slate-100/10 dark:bg-white/5 px-2 py-[2px] text-[9px] uppercase tracking-[0.22em] text-slate-900 dark:text-white/80">
              {categoryLabel}
            </span>
          ) : null}
          {note.description ? (
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{note.description}</p>
          ) : null}
          <div className="mt-2.5 sm:mt-3 flex flex-wrap items-center gap-2 text-[10px] sm:text-[11px] uppercase tracking-[0.24em] sm:tracking-[0.28em]">
            {note.href && note.actionLabel ? (
              isExternal ? (
                <a
                  href={note.href}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ variant: 'ghost', color: 'primary', size: 'small' }), 'px-4 sm:px-5')}
                >
                  {note.actionLabel}
                </a>
              ) : (
                <Link href={note.href} className={cn(buttonVariants({ variant: 'ghost', color: 'primary', size: 'small' }), 'px-4 sm:px-5')}>
                  {note.actionLabel}
                </Link>
              )
            ) : null}
            {note.onAction && note.actionLabel ? (
              <button
                type="button"
                onClick={note.onAction}
                className={cn(buttonVariants({ variant: 'ghost', color: 'primary', size: 'small' }), 'px-4 sm:px-5')}
              >
                {note.actionLabel}
              </button>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss notification"
          className={cn(buttonVariants({ variant: 'ghost', color: 'gray', size: 'small' }), 'px-2 sm:px-3 text-[10px]')}
          onClick={() => onDismiss(note.id)}
        >
          ✕
        </button>
      </div>
      {duration > 0 ? (
        <div className="mt-3 sm:mt-4 h-[2px] sm:h-[3px] w-full overflow-hidden rounded-full bg-slate-100/10 dark:bg-white/5" aria-hidden>
          <span
            className={cn('block h-full w-[200%]', progress)}
            style={{ animation: `gmeow-progress ${duration}ms linear forwards` }}
          />
        </div>
      ) : null}
    </article>
  )
}

const categoryLabels: Partial<Record<NotificationCategory, string>> = {
  system: 'System',
  quest: 'Quest',
  badge: 'Badge',
  guild: 'Guild',
  reward: 'Reward',
  tip: 'Tip',
  level: 'Level Up',
  reminder: 'Reminder',
  mention: 'Mention',
  streak: 'Streak',
}

export function useLegacyNotificationAdapter() {
  const { push } = useNotifications()
  return useCallback(
    (toast: {
      type: 'success' | 'error' | 'info' | 'warn'
      title: string
      message?: string
      linkHref?: string
      linkLabel?: string
      duration?: number
      category?: NotificationCategory
    }) => {
      const tone: NotificationTone = toast.type === 'warn' ? 'warning' : (toast.type as NotificationTone)
      return push({
        tone,
        title: toast.title,
        description: toast.message,
        href: toast.linkHref,
        actionLabel: toast.linkLabel,
        duration: toast.duration,
        category: toast.category,
      })
    },
    [push],
  )
}
