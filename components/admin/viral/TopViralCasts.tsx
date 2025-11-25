/**
 * TopViralCasts Component
 * 
 * Leaderboard table of highest-scoring viral casts within a timeframe.
 * Shows viral tier, score, engagement metrics, and user info.
 * 
 * Source: Phase 5.2 Admin Dashboard
 * MCP Verified: November 17, 2025
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'

type ViralCast = {
  cast_hash: string
  fid: number
  viral_score: number
  viral_tier: string
  likes_count: number
  recasts_count: number
  replies_count: number
  created_at: string
  username?: string
  display_name?: string
  avatar_url?: string
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

const TIMEFRAME_OPTIONS = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
]

export default function TopViralCasts() {
  const [casts, setCasts] = useState<ViralCast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('24h')

  const fetchCasts = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/viral/top-casts?timeframe=${timeframe}&limit=20`)
      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'Failed to fetch top viral casts')
      }

      setCasts(data.casts)
      setError(null)
    } catch (err) {
      console.error('[TopViralCasts] Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [timeframe])

  useEffect(() => {
    void fetchCasts()
  }, [fetchCasts])

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getTotalEngagement = (cast: ViralCast) => {
    return cast.likes_count + cast.recasts_count + cast.replies_count
  }

  return (
    <div className="rounded-3xl border border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5/5 p-5 shadow-lg backdrop-blur">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="pixel-section-title text-base">🏆 Top Viral Casts</h3>
          <p className="text-[11px] text-[var(--px-sub)]">
            Highest-scoring viral casts by viral score
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as '24h' | '7d' | '30d')}
            className="rounded-lg border border-white dark:border-slate-700/20 bg-slate-100/10 dark:bg-slate-100/90 dark:bg-white/5/5 px-3 py-1.5 text-[11px] text-white dark:text-slate-950 dark:text-white backdrop-blur focus:border-emerald-400/40 focus:outline-none"
            aria-label="Select timeframe"
          >
            {TIMEFRAME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => fetchCasts()}
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
          <div className="mb-1 font-semibold">Failed to load top viral casts</div>
          <p>{error}</p>
        </div>
      ) : loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5/5"
            />
          ))}
        </div>
      ) : casts.length === 0 ? (
        <div className="rounded-2xl border border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5/5 p-6 text-center text-[12px] text-[var(--px-sub)]">
          No viral casts yet for this timeframe.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white dark:border-slate-700/10 text-left text-[10px] uppercase tracking-wider text-white dark:text-slate-950 dark:text-slate-700 dark:text-white/60">
                <th className="pb-2 pr-3 font-medium">#</th>
                <th className="pb-2 pr-3 font-medium">User</th>
                <th className="pb-2 pr-3 font-medium">Tier</th>
                <th className="pb-2 pr-3 font-medium text-right">Score</th>
                <th className="pb-2 pr-3 font-medium text-right">Engagement</th>
                <th className="pb-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {casts.map((cast, index) => (
                <tr
                  key={cast.cast_hash}
                  className="group border-b border-white dark:border-slate-700/5 transition hover:bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5/5"
                >
                  {/* Rank */}
                  <td className="py-3 pr-3 text-[12px] font-bold text-white dark:text-slate-950 dark:text-slate-700 dark:text-white/40">
                    {index + 1}
                  </td>

                  {/* User */}
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-white dark:border-slate-700/20">
                        {cast.avatar_url ? (
                          <Image
                            src={cast.avatar_url}
                            alt={cast.username ?? `FID ${cast.fid}`}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500/30 to-purple-500/30 text-[10px] font-bold text-white dark:text-slate-950 dark:text-white">
                            {cast.username?.[0]?.toUpperCase() ?? '?'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[12px] font-semibold text-white dark:text-slate-950 dark:text-white">
                          {cast.display_name ?? cast.username ?? `FID ${cast.fid}`}
                        </div>
                        {cast.username && (
                          <div className="truncate text-[10px] text-white dark:text-slate-950 dark:text-slate-700 dark:text-white/50">
                            @{cast.username}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Tier */}
                  <td className="py-3 pr-3">
                    <span
                      className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-medium ${
                        TIER_COLORS[cast.viral_tier] ?? TIER_COLORS.viral
                      }`}
                    >
                      {TIER_LABELS[cast.viral_tier] ?? cast.viral_tier}
                    </span>
                  </td>

                  {/* Viral Score */}
                  <td className="py-3 pr-3 text-right">
                    <span className="text-[13px] font-bold text-purple-300">
                      {cast.viral_score.toFixed(2)}
                    </span>
                  </td>

                  {/* Engagement */}
                  <td className="py-3 pr-3">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[13px] font-bold text-white dark:text-slate-950 dark:text-white">
                        {getTotalEngagement(cast).toLocaleString()}
                      </span>
                      <div className="flex gap-1.5 text-[9px] text-white dark:text-slate-950 dark:text-slate-700 dark:text-white/50">
                        <span title="Likes">❤️ {cast.likes_count}</span>
                        <span title="Recasts">🔁 {cast.recasts_count}</span>
                        <span title="Replies">💬 {cast.replies_count}</span>
                      </div>
                    </div>
                  </td>

                  {/* Date */}
                  <td className="py-3">
                    <span className="text-[10px] text-white dark:text-slate-950 dark:text-slate-700 dark:text-white/50">
                      {formatDate(cast.created_at)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
