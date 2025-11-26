/**
 * AchievementDistribution Component
 * 
 * Bar chart and stats showing how many users have unlocked each achievement type.
 * Includes weekly timeline of achievement unlocks.
 * 
 * Source: Phase 5.2 Admin Dashboard
 * MCP Verified: November 17, 2025
 */

'use client'

import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'

type AchievementStat = {
  type: string
  count: number
  percentage: number
}

type AchievementTimeline = {
  date: string
  first_viral: number
  '10_viral_casts': number
  '100_shares': number
  mega_viral_master: number
}

type AchievementData = {
  achievements: AchievementStat[]
  total_users_with_achievements: number
  timeline: AchievementTimeline[]
}

const ACHIEVEMENT_LABELS: Record<string, string> = {
  first_viral: 'First Viral',
  '10_viral_casts': '10 Viral Casts',
  '100_shares': '100 Shares',
  mega_viral_master: 'Mega Viral Master',
}

const ACHIEVEMENT_ICONS: Record<string, string> = {
  first_viral: '🎯',
  '10_viral_casts': '🔥',
  '100_shares': '📢',
  mega_viral_master: '👑',
}

const ACHIEVEMENT_COLORS: Record<string, string> = {
  first_viral: '#10b981', // emerald
  '10_viral_casts': '#f59e0b', // amber
  '100_shares': '#3b82f6', // blue
  mega_viral_master: '#8b5cf6', // purple
}

export default function AchievementDistribution() {
  const [data, setData] = useState<AchievementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'distribution' | 'timeline'>('distribution')

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/viral/achievement-stats')
      const result = await response.json()

      if (!response.ok || !result.ok) {
        throw new Error(result.message || 'Failed to fetch achievement stats')
      }

      setData(result)
      setError(null)
    } catch (err) {
      console.error('[AchievementDistribution] Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [])

  const barChartData = data?.achievements.map((achievement) => ({
    name: ACHIEVEMENT_LABELS[achievement.type] ?? achievement.type,
    count: achievement.count,
    fill: ACHIEVEMENT_COLORS[achievement.type] ?? '#6b7280',
  }))

  const timelineData = data?.timeline
    .slice(0, 8) // Last 8 weeks
    .reverse()
    .map((week) => ({
      date: new Date(week.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      'First Viral': week.first_viral,
      '10 Viral Casts': week['10_viral_casts'],
      '100 Shares': week['100_shares'],
      'Mega Viral Master': week.mega_viral_master,
    }))

  return (
    <div className="rounded-3xl border border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5 p-5 shadow-lg backdrop-blur">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="pixel-section-title text-base">📈 Achievement Distribution</h3>
          <p className="text-[11px] text-[var(--px-sub)]">
            How many users have unlocked each achievement
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-white dark:border-slate-700/20 bg-slate-100/10 dark:bg-slate-100/90 dark:bg-white/5 p-1">
            <button
              onClick={() => setViewMode('distribution')}
              className={`rounded px-3 py-1 text-[10px] font-medium transition ${
                viewMode === 'distribution'
                  ? 'bg-emerald-500/30 text-emerald-200'
                  : 'text-slate-950 dark:text-slate-700 dark:text-white/60 hover:text-slate-950 dark:text-white'
              }`}
              type="button"
            >
              Distribution
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`rounded px-3 py-1 text-[10px] font-medium transition ${
                viewMode === 'timeline'
                  ? 'bg-emerald-500/30 text-emerald-200'
                  : 'text-slate-950 dark:text-slate-700 dark:text-white/60 hover:text-slate-950 dark:text-white'
              }`}
              type="button"
            >
              Timeline
            </button>
          </div>

          <button
            onClick={() => fetchData()}
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
          <div className="mb-1 font-semibold">Failed to load achievement stats</div>
          <p>{error}</p>
        </div>
      ) : loading ? (
        <div className="space-y-4">
          <div className="h-64 animate-pulse rounded-xl border border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5" />
        </div>
      ) : data ? (
        <>
          {/* Total Users Badge */}
          <div className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-center">
            <div className="text-[10px] uppercase tracking-wider text-emerald-300/80">
              Total Users with Achievements
            </div>
            <div className="mt-1 text-3xl font-bold text-emerald-200">
              {data.total_users_with_achievements.toLocaleString()}
            </div>
          </div>

          {viewMode === 'distribution' ? (
            <>
              {/* Bar Chart */}
              {barChartData && barChartData.length > 0 && (
                <div className="mb-6">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={barChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis
                        dataKey="name"
                        stroke="rgba(255,255,255,0.4)"
                        fontSize={10}
                      />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(0,0,0,0.8)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Achievement Cards */}
              <div className="grid grid-cols-2 gap-3">
                {data.achievements.map((achievement) => (
                  <div
                    key={achievement.type}
                    className="rounded-xl border border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5 p-3 transition hover:border-emerald-400/30"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {ACHIEVEMENT_ICONS[achievement.type] ?? '🏆'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[11px] font-semibold text-slate-950 dark:text-white">
                          {ACHIEVEMENT_LABELS[achievement.type] ?? achievement.type}
                        </div>
                        <div className="mt-0.5 text-[13px] font-bold text-emerald-300">
                          {achievement.count.toLocaleString()}
                        </div>
                      </div>
                      <div className="flex-shrink-0 rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-300">
                        {achievement.percentage}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Timeline Line Chart */}
              {timelineData && timelineData.length > 0 && (
                <div>
                  <h4 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-slate-950 dark:text-white/70">
                    Weekly Unlock Timeline (Last 8 Weeks)
                  </h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis
                        dataKey="date"
                        stroke="rgba(255,255,255,0.4)"
                        fontSize={10}
                      />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(0,0,0,0.8)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '10px' }}
                        iconType="line"
                      />
                      <Line
                        type="monotone"
                        dataKey="First Viral"
                        stroke={ACHIEVEMENT_COLORS.first_viral}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="10 Viral Casts"
                        stroke={ACHIEVEMENT_COLORS['10_viral_casts']}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="100 Shares"
                        stroke={ACHIEVEMENT_COLORS['100_shares']}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Mega Viral Master"
                        stroke={ACHIEVEMENT_COLORS.mega_viral_master}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}

          {data.achievements.length === 0 && (
            <div className="rounded-2xl border border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5 p-6 text-center text-[12px] text-[var(--px-sub)]">
              No achievements unlocked yet. Users will appear here once they start unlocking achievements.
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
