/**
 * TierUpgradeFeed Component
 * 
 * Real-time feed of viral tier upgrades (active → viral → mega_viral).
 * Shows user avatar, username, tier transition, XP bonus, and timestamp.
 * 
 * Source: Phase 5.2 Admin Dashboard
 * MCP Verified: November 17, 2025
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'

type TierUpgrade = {
  id: string
  fid: number
  cast_hash: string
  old_tier: string
  new_tier: string
  xp_bonus_awarded: number
  changed_at: string
  username?: string
  display_name?: string
  avatar_url?: string
}

type TierUpgradeFeedProps = {
  limit?: number
  autoRefresh?: boolean
  refreshInterval?: number
}

const TIER_COLORS: Record<string, string> = {
  none: 'bg-gray-500/20 text-gray-300 border-gray-400/30',
  active: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
  popular: 'bg-blue-500/20 text-blue-300 border-blue-400/40',
  engaging: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
  viral: 'bg-purple-500/30 text-purple-200 border-purple-400/60',
  mega_viral: 'bg-yellow-500/30 text-yellow-200 border-yellow-400/60',
}

const TIER_LABELS: Record<string, string> = {
  none: 'None',
  active: 'Active',
  popular: 'Popular',
  engaging: 'Engaging',
  viral: 'Viral',
  mega_viral: 'Mega Viral',
}

export default function TierUpgradeFeed({
  limit = 50,
  autoRefresh = true,
  refreshInterval = 10000,
}: TierUpgradeFeedProps) {
  const [upgrades, setUpgrades] = useState<TierUpgrade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tierFilter, setTierFilter] = useState<string>('all')

  const fetchUpgrades = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: '0',
      })

      if (tierFilter !== 'all') {
        params.set('tier_filter', tierFilter)
      }

      const response = await fetch(`/api/admin/viral/tier-upgrades?${params}`)
      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'Failed to fetch tier upgrades')
      }

      setUpgrades(data.upgrades)
      setError(null)
    } catch (err) {
      console.error('[TierUpgradeFeed] Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [tierFilter, limit])

  useEffect(() => {
    void fetchUpgrades()
  }, [fetchUpgrades])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      void fetchUpgrades()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchUpgrades])

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return `${Math.floor(diffMins / 1440)}d ago`
  }

  return (
    <div className="rounded-3xl border border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5 p-5 shadow-lg backdrop-blur">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="pixel-section-title text-base">🔄 Viral Tier Upgrades</h3>
          <p className="text-[11px] text-[var(--px-sub)]">
            Real-time feed of users leveling up their viral tier
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="rounded-lg border border-white dark:border-slate-700/20 bg-slate-100/10 dark:bg-slate-100/90 dark:bg-white/5 px-3 py-1.5 text-[11px] text-slate-950 dark:text-slate-950 dark:text-white backdrop-blur focus:border-emerald-400/40 focus:outline-none"
            aria-label="Filter tier upgrades by tier"
          >
            <option value="all">All Tiers</option>
            <option value="viral">Viral</option>
            <option value="mega_viral">Mega Viral</option>
            <option value="popular">Popular</option>
            <option value="engaging">Engaging</option>
          </select>

          <button
            onClick={() => fetchUpgrades()}
            disabled={loading}
            className="pixel-button btn-sm disabled:opacity-50"
            type="button"
          >
            {loading ? '⏳' : '🔄'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/15 p-4 text-[12px] text-rose-100">
          <div className="mb-1 font-semibold">Failed to load tier upgrades</div>
          <p>{error}</p>
        </div>
      ) : loading && upgrades.length === 0 ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5"
            />
          ))}
        </div>
      ) : upgrades.length === 0 ? (
        <div className="rounded-2xl border border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5 p-6 text-center text-[12px] text-[var(--px-sub)]">
          No tier upgrades yet. When users reach viral status, they&apos;ll appear here.
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
          {upgrades.map((upgrade) => (
            <div
              key={upgrade.id}
              className="group flex items-center gap-3 rounded-xl border border-white dark:border-slate-700/10 bg-white dark:bg-slate-900/[0.04] p-3 transition hover:border-emerald-400/30 hover:bg-slate-100/10 dark:bg-slate-100/90 dark:bg-white/5"
            >
              {/* User Avatar */}
              <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-white dark:border-slate-700/20">
                {upgrade.avatar_url ? (
                  <Image
                    src={upgrade.avatar_url}
                    alt={upgrade.username ?? `FID ${upgrade.fid}`}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500/30 to-purple-500/30 text-sm font-bold text-slate-950 dark:text-white">
                    {upgrade.username?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-semibold text-slate-950 dark:text-white">
                    {upgrade.display_name ?? upgrade.username ?? `FID ${upgrade.fid}`}
                  </span>
                  {upgrade.username && (
                    <span className="truncate text-[11px] text-slate-950 dark:text-white/50">
                      @{upgrade.username}
                    </span>
                  )}
                </div>

                {/* Tier Transition */}
                <div className="mt-1 flex items-center gap-2 text-[11px]">
                  <span
                    className={`rounded-md border px-2 py-0.5 font-medium ${
                      TIER_COLORS[upgrade.old_tier] ?? TIER_COLORS.none
                    }`}
                  >
                    {TIER_LABELS[upgrade.old_tier] ?? upgrade.old_tier}
                  </span>
                  <span className="text-slate-950 dark:text-white/40">→</span>
                  <span
                    className={`rounded-md border px-2 py-0.5 font-medium ${
                      TIER_COLORS[upgrade.new_tier] ?? TIER_COLORS.viral
                    }`}
                  >
                    {TIER_LABELS[upgrade.new_tier] ?? upgrade.new_tier}
                  </span>
                </div>
              </div>

              {/* XP Bonus */}
              <div className="flex flex-col items-end gap-1">
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                  +{upgrade.xp_bonus_awarded} XP
                </span>
                <span className="text-[10px] text-slate-950 dark:text-white/40">
                  {formatTimestamp(upgrade.changed_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
