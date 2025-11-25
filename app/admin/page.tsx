'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import QuestLoadingDeck from '@/components/Quest/QuestLoadingDeck'
import { clearStorageCache, readStorageCache, writeStorageCache } from '@/lib/utils'
import { useLegacyNotificationAdapter } from '@/components/ui/live-notifications'
import { useDashboardTelemetry } from '@/lib/dashboard-hooks'
import { useTelemetryAlertNotifications } from '@/hooks/useTelemetryAlerts'
import AdminHero from '@/components/admin/AdminHero'

// Heavy admin panels - dynamically loaded to reduce initial bundle
const OpsSnapshot = dynamic(() => import('@/components/dashboard/OpsSnapshot'), {
  loading: () => <div className="animate-pulse rounded-lg bg-white/5 p-6 h-64" />,
})

const BotManagerPanel = dynamic(() => import('@/components/admin/BotManagerPanel'), {
  loading: () => <div className="animate-pulse rounded-lg bg-white/5 p-6 h-96" />,
})

const TipScoringPanel = dynamic(() => import('@/components/admin/TipScoringPanel'), {
  loading: () => <div className="animate-pulse rounded-lg bg-white/5 p-6 h-96" />,
})

const BadgeManagerPanel = dynamic(() => import('@/components/admin/BadgeManagerPanel'), {
  loading: () => <div className="animate-pulse rounded-lg bg-white/5 p-6 h-96" />,
})

const EventMatrixPanel = dynamic(() => import('@/components/admin/EventMatrixPanel'), {
  loading: () => <div className="animate-pulse rounded-lg bg-white/5 p-6 h-96" />,
})

const PartnerSnapshotPanel = dynamic(() => import('@/components/admin/PartnerSnapshotPanel'), {
  loading: () => <div className="animate-pulse rounded-lg bg-white/5 p-6 h-96" />,
})

const BotStatsConfigPanel = dynamic(() => import('@/components/admin/BotStatsConfigPanel'), {
  loading: () => <div className="animate-pulse rounded-lg bg-white/5 p-6 h-96" />,
})

const CACHE_KEY = 'gmeowAdminAnalytics_v1'
const CACHE_TTL_MS = 60_000
const DASHBOARD_CACHE_KEY = 'gmeowDashboardTelemetry_v1'

const FALLBACK_SUMMARY = {
  tips: { value: 12450, delta: 12.4 },
  quests: { value: 328, delta: 4.1 },
  guilds: { value: 58, delta: 2.6 },
  badges: { value: 143, delta: 0.0 },
}

const FALLBACK_TRENDS = {
  tips: [420, 640, 580, 760, 910, 840, 1200],
  quests: [12, 18, 22, 26, 24, 28, 32],
  guilds: [2, 3, 4, 5, 6, 6, 7],
}

function createFallbackAnalytics(): AdminAnalytics {
  return {
    refreshedAt: 0,
    summary: {
      tips: { ...FALLBACK_SUMMARY.tips },
      quests: { ...FALLBACK_SUMMARY.quests },
      guilds: { ...FALLBACK_SUMMARY.guilds },
      badges: { ...FALLBACK_SUMMARY.badges },
    },
    trends: {
      tips: [...FALLBACK_TRENDS.tips],
      quests: [...FALLBACK_TRENDS.quests],
      guilds: [...FALLBACK_TRENDS.guilds],
    },
    alerts: [],
  }
}

function formatRefreshedLabel(timestamp: number | null | undefined): string {
  if (!timestamp) return 'pending'
  const normalized = Number(timestamp)
  if (!Number.isFinite(normalized) || normalized <= 0) return 'pending'
  const date = new Date(normalized)
  if (!Number.isFinite(date.getTime())) return 'pending'
  return date.toISOString().replace('T', ' ').replace('Z', ' UTC')
}

type AdminAnalytics = {
  refreshedAt: number
  summary: {
    tips: { value: number; delta: number }
    quests: { value: number; delta: number }
    guilds: { value: number; delta: number }
    badges: { value: number; delta: number }
  }
  trends: {
    tips: number[]
    quests: number[]
    guilds: number[]
  }
  alerts: Array<{
    id: string
    label: string
    detail: string
    occurredAt: number
  }>
}

function formatNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 10_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

function deltaLabel(delta: number): string {
  if (!Number.isFinite(delta) || delta === 0) return '0%'
  const prefix = delta > 0 ? '+' : ''
  return `${prefix}${delta.toFixed(1)}%`
}

const TAB_CONFIG = [
  { id: 'operations', label: 'Operational intelligence', icon: '📊', shortcut: '⌘1' },
  { id: 'snapshots', label: 'Snapshot control', icon: '🗂️', shortcut: '⌘2' },
  { id: 'events', label: 'On-chain events', icon: '🛰️', shortcut: '⌘3' },
  { id: 'bot', label: 'Bot operations', icon: '🤖', shortcut: '⌘4' },
  { id: 'badges', label: 'Badge pipeline', icon: '🎖️', shortcut: '⌘5' },
] as const

type AdminTab = (typeof TAB_CONFIG)[number]['id']

type TabStatusTone = 'ok' | 'warn' | 'error'

type TabStatus = {
  tone: TabStatusTone
  label: string
}

type StatusTone = TabStatusTone | 'neutral'

type StatusItem = {
  id: string
  label: string
  value: string
  tone: StatusTone
  hint?: string
}

const TAB_STATUS_CLASSES: Record<TabStatusTone, string> = {
  ok: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100',
  warn: 'border-amber-400/40 bg-amber-500/20 text-amber-100',
  error: 'border-rose-400/50 bg-rose-500/25 text-rose-100',
}

const STATUS_ITEM_CLASSES: Record<StatusTone, string> = {
  ok: 'border-emerald-400/30 bg-emerald-500/10',
  warn: 'border-amber-400/30 bg-amber-500/15',
  error: 'border-rose-400/40 bg-rose-500/20',
  neutral: 'border-white/12 bg-white/[0.04]',
}

type QuickActionTone = 'primary' | 'neutral' | 'aux'

type QuickAction = {
  id: string
  label: string
  description: string
  icon: string
  onClick?: () => void
  href?: string
  disabled?: boolean
  external?: boolean
  tone?: QuickActionTone
}

const QUICK_ACTION_CLASSES: Record<QuickActionTone, string> = {
  primary: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100 hover:border-emerald-300/60 hover:bg-emerald-500/20',
  neutral: 'border-white/12 bg-white/5 text-white/80 hover:border-emerald-300/30 hover:text-emerald-100',
  aux: 'border-sky-400/30 bg-sky-500/15 text-sky-100 hover:border-sky-300/50 hover:bg-sky-500/20',
}

const DOC_LINKS = {
  telemetry: 'https://github.com/0xheycat/gmeow-adventure/blob/main/planning/reference/telemetry.md',
  partnerSnapshots: 'https://github.com/0xheycat/gmeow-adventure/blob/main/README.md#partner-snapshot-service',
  botStats: 'https://github.com/0xheycat/gmeow-adventure/blob/main/README.md#bot-stats-configuration-console',
  eventMatrix: 'https://github.com/0xheycat/gmeow-adventure/blob/main/planning/reference/farcaster.md#event-matrix',
  badgePipeline: 'https://github.com/0xheycat/gmeow-adventure/blob/main/planning/reference/badges.md',
} satisfies Record<string, string>

export default function AdminAnalyticsPage() {
  const notify = useLegacyNotificationAdapter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(() => {
    const cached = readStorageCache<AdminAnalytics>(CACHE_KEY, CACHE_TTL_MS)
    if (cached) return cached
    return createFallbackAnalytics()
  })
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [leaderboardSnapshotting, setLeaderboardSnapshotting] = useState(false)
  const [leaderboardSnapshot, setLeaderboardSnapshot] = useState<{ updatedAtIso: string; totalRows: number } | null>(null)
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null)
  const {
    data: opsTelemetry,
    loading: opsTelemetryLoading,
    error: opsTelemetryError,
    stale: opsTelemetryStale,
    lastUpdated: opsTelemetryUpdatedAt,
    refresh: refreshOpsTelemetry,
  } = useDashboardTelemetry()

  useTelemetryAlertNotifications(analytics?.alerts)

  const handleAnalyticsRefresh = useCallback(() => {
    setRefreshNonce((n) => n + 1)
  }, [])

  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const tabParam = searchParams.get('tab')
  const defaultTab: AdminTab = 'operations'
  const activeTab: AdminTab = TAB_CONFIG.some((tab) => tab.id === tabParam)
    ? (tabParam as AdminTab)
    : defaultTab

  const searchParamsString = searchParams.toString()

  const handleTabSelect = useCallback((nextTab: AdminTab) => {
    const params = new URLSearchParams(searchParamsString)
    if (nextTab === 'operations') {
      params.delete('tab')
    } else {
      params.set('tab', nextTab)
    }
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [pathname, router, searchParamsString])

  const handleClearCaches = useCallback(() => {
    clearStorageCache(CACHE_KEY)
    clearStorageCache(DASHBOARD_CACHE_KEY)
    setAnalytics(createFallbackAnalytics())
    setRefreshNonce((n) => n + 1)
    notify({ type: 'success', title: 'Cache reset', message: 'Local analytics + telemetry caches cleared.' })
    void refreshOpsTelemetry()
  }, [notify, refreshOpsTelemetry])

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.repeat) return
      const target = event.target as HTMLElement | null
      if (target) {
        const tagName = target.tagName
        if (tagName === 'INPUT' || tagName === 'TEXTAREA' || target.getAttribute('contenteditable') === 'true') {
          return
        }
      }
      let nextTab: AdminTab | null = null
      switch (event.key) {
        case '1':
          nextTab = 'operations'
          break
        case '2':
          nextTab = 'snapshots'
          break
        case '3':
          nextTab = 'events'
          break
        case '4':
          nextTab = 'bot'
          break
        case '5':
          nextTab = 'badges'
          break
        default:
          break
      }
      if (nextTab) {
        event.preventDefault()
        handleTabSelect(nextTab)
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [handleTabSelect])

  const handleLeaderboardSnapshot = useCallback(async () => {
    if (leaderboardSnapshotting) return
    setLeaderboardSnapshotting(true)
    setLeaderboardError(null)
    notify({ type: 'info', title: 'Snapshot started', message: 'Building a fresh Supabase leaderboard snapshot…' })
    try {
      const response = await fetch('/api/admin/leaderboard/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.ok) {
        const message = payload?.message || `Snapshot failed (HTTP ${response.status})`
        throw new Error(message)
      }

      const snapshot = payload.result ?? {}
      const updatedAtIso = typeof snapshot?.updatedAtIso === 'string' ? snapshot.updatedAtIso : new Date().toISOString()
      const totalRows = Number(snapshot?.totalRows ?? 0)
      setLeaderboardSnapshot({ updatedAtIso, totalRows })
      notify({
        type: 'success',
        title: 'Leaderboard snapshot saved',
        message: `Stored ${totalRows.toLocaleString()} rows at ${new Date(updatedAtIso).toLocaleString()}.`,
      })
    } catch (err) {
      const message = (err as Error)?.message ?? 'Unable to capture leaderboard snapshot'
      setLeaderboardError(message)
      notify({ type: 'error', title: 'Snapshot failed', message })
    } finally {
      setLeaderboardSnapshotting(false)
    }
  }, [leaderboardSnapshotting, notify])

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/analytics/summary', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as AdminAnalytics
      const refreshedAtInput = Number(json?.refreshedAt)
      const refreshedAt = Number.isFinite(refreshedAtInput) && refreshedAtInput > 0 ? refreshedAtInput : Date.now()
      const payload: AdminAnalytics = {
        refreshedAt,
        summary: {
          tips: json?.summary?.tips ?? FALLBACK_SUMMARY.tips,
          quests: json?.summary?.quests ?? FALLBACK_SUMMARY.quests,
          guilds: json?.summary?.guilds ?? FALLBACK_SUMMARY.guilds,
          badges: json?.summary?.badges ?? FALLBACK_SUMMARY.badges,
        },
        trends: {
          tips: json?.trends?.tips?.length ? json.trends.tips : FALLBACK_TRENDS.tips,
          quests: json?.trends?.quests?.length ? json.trends.quests : FALLBACK_TRENDS.quests,
          guilds: json?.trends?.guilds?.length ? json.trends.guilds : FALLBACK_TRENDS.guilds,
        },
        alerts: Array.isArray(json?.alerts) ? json.alerts.slice(0, 6) : [],
      }
      setAnalytics(payload)
      writeStorageCache(CACHE_KEY, payload)
      notify({ type: 'success', title: 'Analytics refreshed', message: 'Pulled latest metrics for admin view.' })
    } catch (err) {
      const message = (err as Error)?.message ?? 'Unable to refresh analytics'
      setError(message)
      notify({ type: 'error', title: 'Refresh failed', message })
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    if (refreshNonce === 0) {
      // initial load only if cache was empty
      const hasCache = readStorageCache<AdminAnalytics>(CACHE_KEY, CACHE_TTL_MS)
      if (!hasCache) void fetchAnalytics()
    } else {
      void fetchAnalytics()
    }
  }, [fetchAnalytics, refreshNonce])

  const summaryCards = useMemo(() => {
    return [
      { key: 'tips', title: 'Tip Volume (24h)', accent: 'var(--shell-success)' },
      { key: 'quests', title: 'Quests Completed (24h)', accent: 'var(--shell-info)' },
      { key: 'guilds', title: 'Guild Deposits (24h)', accent: 'var(--shell-warning)' },
      { key: 'badges', title: 'Badges Minted (7d)', accent: 'var(--shell-heading)' },
    ] as const
  }, [])

  const trendSeries = useMemo(() => (
    [
      {
        key: 'tips',
        title: 'Tip Inflow Trend',
        description: 'Tracks daily on-chain and Warpcast tips across networks.',
      },
      {
        key: 'quests',
        title: 'Quest Completions',
        description: 'Shows verified quest completions including streak resets.',
      },
      {
        key: 'guilds',
        title: 'Guild Treasury Deposits',
        description: 'Highlights guild deposits routed through Gmeow contracts.',
      },
    ] as const
  ), [])

  const lastRefreshedLabel = useMemo(() => (
    formatRefreshedLabel(analytics?.refreshedAt ?? null)
  ), [analytics?.refreshedAt])

  const heroMetrics = useMemo(
    () =>
      summaryCards.map((card) => {
        const metric = analytics?.summary?.[card.key]
        const fallback = FALLBACK_SUMMARY[card.key as keyof typeof FALLBACK_SUMMARY]
        const deltaValue = metric?.delta ?? fallback.delta
        return {
          key: card.key,
          label: card.title,
          value: formatNumber(metric?.value ?? fallback.value),
          delta: deltaValue,
          deltaLabel: deltaLabel(deltaValue),
          accent: card.accent,
        }
      }),
    [analytics, summaryCards]
  )

  const leaderboardSnapshotLabel = useMemo(() => {
    if (!leaderboardSnapshot?.updatedAtIso) return null
    try {
      return new Date(leaderboardSnapshot.updatedAtIso).toLocaleString()
    } catch {
      return leaderboardSnapshot.updatedAtIso
    }
  }, [leaderboardSnapshot])

  const opsTelemetryUpdatedLabel = useMemo(() => {
    if (!opsTelemetryUpdatedAt) return 'pending'
    try {
      return new Date(opsTelemetryUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return 'pending'
    }
  }, [opsTelemetryUpdatedAt])

  const tabStatuses = useMemo<Record<AdminTab, TabStatus>>(() => {
    const operationsStatus: TabStatus = (() => {
      if (opsTelemetryError) return { tone: 'error', label: 'Error' }
      if (opsTelemetryLoading) return { tone: 'warn', label: 'Syncing' }
      if (opsTelemetryStale) return { tone: 'warn', label: 'Stale' }
      return { tone: 'ok', label: 'Live' }
    })()

    const snapshotsStatus: TabStatus = (() => {
      if (leaderboardSnapshotting) return { tone: 'warn', label: 'Running' }
      if (leaderboardError) return { tone: 'error', label: 'Error' }
      if (leaderboardSnapshot) return { tone: 'ok', label: 'Fresh' }
      return { tone: 'ok', label: 'Idle' }
    })()

    const alertCount = analytics?.alerts?.length ?? 0
    const botStatus: TabStatus = alertCount > 0
      ? { tone: 'warn', label: `${Math.min(alertCount, 99)} alert${alertCount === 1 ? '' : 's'}` }
      : { tone: 'ok', label: 'Ready' }

    return {
      operations: operationsStatus,
      snapshots: snapshotsStatus,
      events: { tone: 'ok', label: 'Matrix' },
      bot: botStatus,
      badges: { tone: 'ok', label: 'Ready' },
    }
  }, [analytics?.alerts?.length, leaderboardError, leaderboardSnapshot, leaderboardSnapshotting, opsTelemetryError, opsTelemetryLoading, opsTelemetryStale])

  const statusItems = useMemo<StatusItem[]>(() => {
    const items: StatusItem[] = []

    const telemetryState: StatusItem = (() => {
      if (opsTelemetryError) {
        return { id: 'telemetry', label: 'Telemetry feed', value: 'API error', tone: 'error', hint: opsTelemetryError }
      }
      if (opsTelemetryLoading) {
        return { id: 'telemetry', label: 'Telemetry feed', value: 'Syncing…', tone: 'warn', hint: 'Fetching live chain + Supabase signals' }
      }
      if (opsTelemetryStale) {
        return { id: 'telemetry', label: 'Telemetry feed', value: 'Stale cache', tone: 'warn', hint: 'Awaiting next auto-refresh window' }
      }
      return { id: 'telemetry', label: 'Telemetry feed', value: 'Live feed', tone: 'ok', hint: `Last pull ${opsTelemetryUpdatedLabel}` }
    })()
    items.push(telemetryState)

    const analyticsState: StatusItem = (() => {
      if (error) return { id: 'analytics', label: 'Analytics cache', value: 'Fallback data', tone: 'error', hint: error }
      if (loading) return { id: 'analytics', label: 'Analytics cache', value: 'Refreshing…', tone: 'warn', hint: 'Rebuilding dashboard snapshot' }
      return { id: 'analytics', label: 'Analytics cache', value: 'Fresh', tone: 'ok', hint: `Updated ${lastRefreshedLabel}` }
    })()
    items.push(analyticsState)

    const ttlSeconds = opsTelemetry?.ttl
    if (typeof ttlSeconds === 'number' && Number.isFinite(ttlSeconds) && ttlSeconds > 0) {
      items.push({
        id: 'ttl',
        label: 'Cache TTL',
        value: `${ttlSeconds}s`,
        tone: opsTelemetryStale ? 'warn' : 'neutral',
        hint: `Auto-refresh cadence every ${ttlSeconds}s`,
      })
    }

    const latencyMs = opsTelemetry?.latencyMs
    if (typeof latencyMs === 'number' && Number.isFinite(latencyMs) && latencyMs >= 0) {
      items.push({
        id: 'latency',
        label: 'API latency',
        value: `${latencyMs.toLocaleString()} ms`,
        tone: latencyMs > 800 ? 'warn' : 'neutral',
        hint: 'Measured from latest telemetry scrape',
      })
    }

    const version = opsTelemetry?.version
    if (typeof version === 'string' && version.trim()) {
      items.push({
        id: 'version',
        label: 'Telemetry build',
        value: version.trim(),
        tone: 'neutral',
        hint: 'Compare with deployed automation build',
      })
    }

    return items.slice(0, 4)
  }, [error, lastRefreshedLabel, loading, opsTelemetry, opsTelemetryError, opsTelemetryLoading, opsTelemetryStale, opsTelemetryUpdatedLabel])

  const quickActions = useMemo<QuickAction[]>(() => {
    switch (activeTab) {
      case 'operations':
        return [
          {
            id: 'refresh-analytics',
            label: 'Refresh analytics',
            description: 'Pull the latest metrics snapshot from the analytics service.',
            icon: '🔄',
            onClick: handleAnalyticsRefresh,
            disabled: loading,
            tone: 'primary',
          },
          {
            id: 'reset-cache',
            label: 'Reset admin cache',
            description: 'Clear cached analytics and telemetry payloads from local storage.',
            icon: '🧹',
            onClick: handleClearCaches,
            disabled: loading || opsTelemetryLoading,
            tone: 'neutral',
          },
          {
            id: 'telemetry-docs',
            label: 'Telemetry runbook',
            description: 'Open the telemetry reference for API + alert tuning notes.',
            icon: '📘',
            href: DOC_LINKS.telemetry,
            external: true,
            tone: 'aux',
          },
        ]
      case 'snapshots':
        return [
          {
            id: 'snapshot-leaderboard',
            label: 'Snapshot leaderboard',
            description: 'Persist the latest standings to Supabase for exports.',
            icon: '📸',
            onClick: handleLeaderboardSnapshot,
            disabled: leaderboardSnapshotting,
            tone: 'primary',
          },
          {
            id: 'snapshot-docs',
            label: 'Partner snapshot docs',
            description: 'Review eligibility builder flows and SQL schema.',
            icon: '📚',
            href: DOC_LINKS.partnerSnapshots,
            external: true,
            tone: 'aux',
          },
        ]
      case 'events':
        return [
          {
            id: 'event-docs',
            label: 'Event matrix reference',
            description: 'Inspect contract event mapping + notification copy.',
            icon: '🗂️',
            href: DOC_LINKS.eventMatrix,
            external: true,
            tone: 'aux',
          },
        ]
      case 'bot':
        return [
          {
            id: 'bot-docs',
            label: 'Stats response guide',
            description: 'View the bot config workflow and fallback overrides.',
            icon: '🤖',
            href: DOC_LINKS.botStats,
            external: true,
            tone: 'aux',
          },
        ]
      case 'badges':
        return [
          {
            id: 'badge-docs',
            label: 'Badge pipeline notes',
            description: 'Read the badge upload + mint playbook.',
            icon: '🎖️',
            href: DOC_LINKS.badgePipeline,
            external: true,
            tone: 'aux',
          },
        ]
      default:
        return []
    }
  }, [activeTab, handleAnalyticsRefresh, handleClearCaches, handleLeaderboardSnapshot, leaderboardSnapshotting, loading, opsTelemetryLoading])

  return (
    <div className="dash-root relative mx-auto w-full max-w-6xl px-3 sm:px-4 md:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[11px] uppercase tracking-[0.32em] text-[var(--px-sub)]">Gmeow Admin</span>
        <Link
          className="pixel-button btn-sm border-white/20 bg-white/10 text-white hover:border-emerald-300/40 hover:bg-emerald-500/10 hover:text-emerald-100"
          href="/Dashboard"
        >
          Back to dashboard ↗
        </Link>
      </div>

      <nav className="mb-6 flex flex-wrap items-center gap-2">
        {TAB_CONFIG.map((tab) => {
          const status = tabStatuses[tab.id]
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabSelect(tab.id)}
              className={clsx(
                'pixel-pill group flex items-center gap-3 border px-4 py-2 text-[11px] uppercase tracking-[0.16em] transition',
                activeTab === tab.id
                  ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.35)]'
                  : 'border-white/12 bg-white/5 text-white/70 hover:border-emerald-300/40 hover:text-white'
              )}
            >
              <span className="flex items-center gap-2 text-left">
                <span className="text-lg leading-none" aria-hidden>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </span>
              <span className="ml-auto flex items-center gap-2">
                {tab.shortcut ? (
                  <span className="hidden rounded-md border border-white/10 bg-white/5 px-2 py-[2px] text-[10px] font-medium text-white/60 sm:inline">
                    {tab.shortcut}
                  </span>
                ) : null}
                {status ? (
                  <span
                    className={clsx(
                      'rounded-full border px-2 py-[2px] text-[10px] font-semibold tracking-[0.12em]',
                      TAB_STATUS_CLASSES[status.tone]
                    )}
                  >
                    {status.label}
                  </span>
                ) : null}
              </span>
            </button>
          )
        })}
      </nav>

      {quickActions.length ? (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {quickActions.map((action) => {
            const toneClass = QUICK_ACTION_CLASSES[action.tone ?? 'neutral']
            const sharedClasses = clsx(
              'group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border p-4 text-left shadow-sm backdrop-blur transition duration-300',
              'before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/15 before:via-transparent before:to-transparent before:opacity-0 before:transition before:duration-300 group-hover:before:opacity-100',
              toneClass,
              action.disabled ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-0.5'
            )

            const content = (
              <>
                <div className="relative z-10 flex items-center gap-2 text-sm font-semibold tracking-wide text-white">
                  <span className="text-lg" aria-hidden>
                    {action.icon}
                  </span>
                  <span>{action.label}</span>
                </div>
                <p className="relative z-10 mt-2 text-[11px] text-white/70">
                  {action.description}
                </p>
                {action.external ? (
                  <span className="relative z-10 mt-3 flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-white/60">
                    Open
                    <span aria-hidden>↗</span>
                  </span>
                ) : null}
              </>
            )

            if (action.onClick) {
              return (
                <button
                  key={action.id}
                  type="button"
                  className={sharedClasses}
                  onClick={action.disabled ? undefined : action.onClick}
                  disabled={Boolean(action.disabled)}
                >
                  {content}
                </button>
              )
            }

            if (action.href) {
              return (
                <Link
                  key={action.id}
                  href={action.href}
                  target={action.external ? '_blank' : undefined}
                  rel={action.external ? 'noopener noreferrer' : undefined}
                  className={clsx(sharedClasses, action.disabled ? 'pointer-events-none' : '')}
                >
                  {content}
                </Link>
              )
            }

            return null
          })}
        </div>
      ) : null}

      {activeTab === 'operations' && statusItems.length ? (
        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statusItems.map((item) => (
            <div
              key={item.id}
              className={clsx(
                'relative overflow-hidden rounded-2xl border p-4 shadow-sm backdrop-blur transition duration-300',
                'before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/10 before:via-transparent before:to-transparent before:opacity-0 before:transition before:duration-300 hover:before:opacity-100',
                STATUS_ITEM_CLASSES[item.tone]
              )}
            >
              <div className="relative z-10 text-[11px] uppercase tracking-[0.18em] text-white/70">
                {item.label}
              </div>
              <div className="relative z-10 mt-2 text-lg font-semibold text-white">
                {item.value}
              </div>
              {item.hint ? (
                <div className="relative z-10 mt-2 text-[11px] text-white/60">
                  {item.hint}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {activeTab === 'operations' ? (
        <>
          <AdminHero
            metrics={heroMetrics}
            refreshing={loading}
            lastUpdatedLabel={lastRefreshedLabel}
            onRefresh={handleAnalyticsRefresh}
          />

          <section id="ops-analytics" className="mt-10 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="pixel-section-title text-lg">Operational intelligence</h2>
                <p className="text-[11px] text-[var(--px-sub)]">
                  Telemetry covering tips, quests, guild treasuries, and badge drops. Data snapshots cache every 60 seconds.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="pixel-button btn-sm disabled:opacity-50"
                  disabled={loading}
                  onClick={handleAnalyticsRefresh}
                  type="button"
                >
                  {loading ? 'Refreshing…' : 'Refresh analytics'}
                </button>
                <span className="text-[11px] text-[var(--px-sub)]">Analytics refreshed at {lastRefreshedLabel}.</span>
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
                <div className="mb-1 font-semibold">Refresh failed</div>
                <p className="text-sm">{error}</p>
                <p className="mt-2 text-[11px] text-red-300">
                  Using cached or fallback data. Try again after confirming the telemetry API is online.
                </p>
              </div>
            ) : null}

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-emerald-500/5 backdrop-blur">
              <OpsSnapshot
                data={opsTelemetry}
                loading={opsTelemetryLoading}
                error={opsTelemetryError}
                stale={opsTelemetryStale}
                lastUpdated={opsTelemetryUpdatedAt}
                onRefresh={refreshOpsTelemetry}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => {
                const metric = analytics?.summary?.[card.key]
                const value = metric?.value ?? FALLBACK_SUMMARY[card.key as keyof typeof FALLBACK_SUMMARY].value
                const delta = metric?.delta ?? FALLBACK_SUMMARY[card.key as keyof typeof FALLBACK_SUMMARY].delta
                return (
                  <div
                    key={card.key}
                    className="group relative overflow-hidden rounded-2xl border border-white/12 bg-white/[0.04] p-4 shadow-[0_18px_40px_-28px_rgba(45,212,191,0.45)] backdrop-blur transition hover:border-emerald-400/40 hover:bg-white/10"
                    style={{ borderColor: card.accent }}
                  >
                    <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: 'linear-gradient(135deg, rgba(94,234,212,0.12), transparent 60%)' }} aria-hidden />
                    <div className="relative z-10 text-[11px] uppercase tracking-[0.16em] text-white/60">{card.title}</div>
                    <div className="relative z-10 mt-3 text-3xl font-extrabold" style={{ color: card.accent }}>
                      {formatNumber(value)}
                    </div>
                    <div className="relative z-10 mt-2 text-sm text-white/70">
                      <span className={delta >= 0 ? 'text-emerald-300 font-semibold' : 'text-red-300 font-semibold'}>{deltaLabel(delta)}</span>{' '}
                      vs previous period
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {trendSeries.map((series) => {
                const points = analytics?.trends?.[series.key]
                const data = points?.length ? points : FALLBACK_TRENDS[series.key as keyof typeof FALLBACK_TRENDS]
                const maxValue = data.reduce((acc, val) => (val > acc ? val : acc), 1)
                return (
                  <div key={series.key} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="pixel-section-title text-base">{series.title}</h3>
                      <span className="pixel-pill text-[10px]">Last 7 days</span>
                    </div>
                    <p className="mb-3 text-[11px] text-[var(--px-sub)]">{series.description}</p>
                    <div className="dash-progress-track h-28">
                      <div className="grid h-full w-full grid-cols-7 gap-2">
                        {data.map((val, idx) => {
                          const heightPct = Math.max(8, Math.round((val / maxValue) * 100))
                          return (
                            <div key={idx} className="flex flex-col items-center justify-end gap-1 text-[10px] text-[var(--px-sub)]">
                              <div
                                className="w-full rounded-md bg-gradient-to-t from-emerald-400/70 to-sky-400/70"
                                style={{ height: `${heightPct}%`, minHeight: '12%' }}
                                aria-hidden
                              />
                              <span>{val}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="pixel-section-title text-base">Recent alerts</h3>
                  <span className="pixel-pill text-[10px]">Telemetry</span>
                </div>
                {loading && !analytics?.alerts?.length ? (
                  <QuestLoadingDeck columns="single" count={4} dense />
                ) : analytics?.alerts?.length ? (
                  <ul className="divide-y divide-white/10 text-sm">
                    {analytics.alerts.map((alert) => (
                      <li key={alert.id} className="py-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-emerald-200">{alert.label}</span>
                          <span className="text-[11px] text-[var(--px-sub)]">
                            {new Date(alert.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-[var(--px-sub)]">{alert.detail}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[var(--px-sub)]">
                    No alerts yet. When the telemetry service is live, high-signal events will stream here and into the notification belt.
                  </p>
                )}
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="pixel-section-title text-base">Next steps</h3>
                  <span className="pixel-pill text-[10px]">Phase 2</span>
                </div>
                <ul className="space-y-2 text-sm text-[var(--px-sub)]">
                  <li>➤ Wire telemetry API to Supabase and on-chain aggregators.</li>
                  <li>➤ Swap placeholder bars with sparkline charts once data bindings land.</li>
                  <li>➤ Push high-priority alerts into the live notification belt.</li>
                  <li>➤ Add admin filters for network, date range, and quest type.</li>
                </ul>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <TipScoringPanel />
            </div>
          </section>
        </>
      ) : null}

      {activeTab === 'snapshots' ? (
        <section id="snapshot-control" className="space-y-6">
          <div className="rounded-3xl border border-emerald-400/30 bg-emerald-500/5 p-5 shadow-[0_20px_60px_-40px_rgba(16,185,129,0.45)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="pixel-section-title text-lg">Snapshot command center</h2>
                <p className="text-[11px] text-[var(--px-sub)]">
                  Configure partner eligibility requirements, trigger leaderboard exports, and audit history without leaving the admin surface.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleTabSelect('operations')}
                className="pixel-button btn-sm border-emerald-400/40 bg-emerald-500/10 text-emerald-100 hover:border-emerald-300/60 hover:bg-emerald-400/20"
              >
                View analytics ↺
              </button>
            </div>
            <ul className="mt-3 grid list-disc gap-1 pl-5 text-sm text-white/80 marker:text-emerald-300">
              <li>Generate fresh leaderboard snapshots stored in Supabase.</li>
              <li>Load recent partner snapshot history with eligibility metrics across supported chains.</li>
              <li>Quickly select or clear eligible chains using bulk actions.</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-emerald-500/5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="pixel-section-title text-base">Leaderboard snapshot</h3>
                <p className="text-[11px] text-[var(--px-sub)]">
                  Capture the latest leaderboard standings into Supabase for downstream analytics and exports.
                </p>
              </div>
              <button
                className="pixel-button btn-sm border-emerald-400/60 bg-emerald-500/15 text-emerald-100 hover:border-emerald-300/60 hover:bg-emerald-400/20 disabled:opacity-60"
                disabled={leaderboardSnapshotting}
                onClick={handleLeaderboardSnapshot}
                type="button"
              >
                {leaderboardSnapshotting ? 'Taking snapshot…' : 'Snapshot leaderboard'}
              </button>
            </div>

            {leaderboardError ? (
              <div className="mt-3 rounded-2xl border border-rose-500/40 bg-rose-500/15 p-3 text-sm text-rose-100">
                {leaderboardError}
              </div>
            ) : null}

            {leaderboardSnapshot ? (
              <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="uppercase tracking-[0.24em] text-emerald-200/80">Snapshot stored</span>
                  <span className="font-mono text-[11px] text-emerald-100/80">{leaderboardSnapshotLabel}</span>
                </div>
                <div className="mt-2 text-[13px]">
                  {leaderboardSnapshot.totalRows.toLocaleString()} rows synced to Supabase.
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[var(--px-sub)]">Run the snapshot to collect the latest leaderboard rows.</p>
            )}
          </div>

          <PartnerSnapshotPanel />
        </section>
      ) : null}

      {activeTab === 'events' ? (
        <section id="event-matrix" className="space-y-6">
          <EventMatrixPanel />
        </section>
      ) : null}

      {activeTab === 'bot' ? (
        <section id="bot-operations" className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="pixel-section-title text-lg">Bot command center</h2>
                <p className="text-[11px] text-[var(--px-sub)]">
                  Audit Neynar signer health, verify environment secrets, review community interactions, and ship manual casts when needed.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleTabSelect('operations')}
                className="pixel-button btn-sm border-emerald-400/40 bg-emerald-500/10 text-emerald-100 hover:border-emerald-300/60 hover:bg-emerald-400/20"
              >
                View analytics ↺
              </button>
            </div>
            <ul className="mt-3 grid list-disc gap-1 pl-5 text-sm text-white/80 marker:text-emerald-300">
              <li>Live signer status with approval links and permission visibility.</li>
              <li>Environment secret checks with masked previews and mismatch detection.</li>
              <li>Community interaction telemetry with mentions, replies, recasts, follows, and keyword pulse.</li>
              <li>Manual casting console with channel, reply, and idempotency support.</li>
            </ul>
          </div>

          <BotManagerPanel />
          <BotStatsConfigPanel />
        </section>
      ) : null}

      {activeTab === 'badges' ? (
        <section id="badge-management" className="space-y-6">
          <BadgeManagerPanel />
        </section>
      ) : null}
    </div>
  )
}
