/**
 * NotificationAnalytics Component
 * 
 * Charts and metrics for viral notification delivery analytics.
 * Shows success rate, failure breakdown (pie chart), daily trends (line chart).
 * 
 * Source: Phase 5.2 Admin Dashboard
 * MCP Verified: November 17, 2025
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

type NotificationStats = {
  total_sent: number
  total_failed: number
  success_rate: number
  failure_breakdown: {
    no_tokens: number
    rate_limited: number
    api_errors: number
    other: number
  }
  daily_trends: Array<{
    date: string
    sent: number
    failed: number
  }>
  avg_delivery_time_ms: number | null
}

const FAILURE_COLORS = {
  no_tokens: '#f59e0b', // amber
  rate_limited: '#ef4444', // red
  api_errors: '#ec4899', // pink
  other: '#6b7280', // gray
}

const TIMEFRAME_OPTIONS = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
]

export default function NotificationAnalytics() {
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState('7d')

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/viral/notification-stats?timeframe=${timeframe}`)
      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'Failed to fetch notification stats')
      }

      setStats(data.stats)
      setError(null)
    } catch (err) {
      console.error('[NotificationAnalytics] Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [timeframe])

  useEffect(() => {
    void fetchStats()
  }, [fetchStats])

  const getStatusColor = (successRate: number) => {
    if (successRate >= 95) return 'text-emerald-300 border-emerald-400/40 bg-emerald-500/15'
    if (successRate >= 85) return 'text-amber-300 border-amber-400/40 bg-amber-500/15'
    return 'text-rose-300 border-rose-400/40 bg-rose-500/15'
  }

  const pieData = stats
    ? [
        { name: 'No Tokens', value: stats.failure_breakdown.no_tokens, color: FAILURE_COLORS.no_tokens },
        { name: 'Rate Limited', value: stats.failure_breakdown.rate_limited, color: FAILURE_COLORS.rate_limited },
        { name: 'API Errors', value: stats.failure_breakdown.api_errors, color: FAILURE_COLORS.api_errors },
        { name: 'Other', value: stats.failure_breakdown.other, color: FAILURE_COLORS.other },
      ].filter((item) => item.value > 0)
    : []

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="pixel-section-title text-base">📊 Notification Delivery</h3>
          <p className="text-[11px] text-[var(--px-sub)]">
            Analytics for viral notification success rates and failures
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] text-white backdrop-blur focus:border-emerald-400/40 focus:outline-none"
          >
            {TIMEFRAME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => fetchStats()}
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
          <div className="mb-1 font-semibold">Failed to load notification stats</div>
          <p>{error}</p>
        </div>
      ) : loading ? (
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-xl border border-white/10 bg-white/5" />
          <div className="h-64 animate-pulse rounded-xl border border-white/10 bg-white/5" />
        </div>
      ) : stats ? (
        <>
          {/* Metrics Grid */}
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div
              className={`rounded-xl border p-3 ${getStatusColor(stats.success_rate)}`}
            >
              <div className="text-[10px] uppercase tracking-wider opacity-80">
                Success Rate
              </div>
              <div className="mt-1 text-2xl font-bold">{stats.success_rate}%</div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] uppercase tracking-wider text-white/60">
                Total Sent
              </div>
              <div className="mt-1 text-2xl font-bold text-emerald-300">
                {stats.total_sent.toLocaleString()}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] uppercase tracking-wider text-white/60">
                Total Failed
              </div>
              <div className="mt-1 text-2xl font-bold text-rose-300">
                {stats.total_failed.toLocaleString()}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] uppercase tracking-wider text-white/60">
                Avg Delivery
              </div>
              <div className="mt-1 text-2xl font-bold text-white">
                {stats.avg_delivery_time_ms
                  ? `${stats.avg_delivery_time_ms}ms`
                  : 'N/A'}
              </div>
            </div>
          </div>

          {/* Daily Trends Line Chart */}
          {stats.daily_trends.length > 0 && (
            <div className="mb-6">
              <h4 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-white/70">
                Daily Trends
              </h4>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats.daily_trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="date"
                    stroke="rgba(255,255,255,0.4)"
                    fontSize={10}
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
                    wrapperStyle={{ fontSize: '11px' }}
                    iconType="line"
                  />
                  <Line
                    type="monotone"
                    dataKey="sent"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Sent"
                    dot={{ fill: '#10b981', r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="failed"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Failed"
                    dot={{ fill: '#ef4444', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Failure Breakdown Pie Chart */}
          {pieData.length > 0 && stats.total_failed > 0 && (
            <div>
              <h4 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-white/70">
                Failure Breakdown
              </h4>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {stats.total_sent === 0 && stats.total_failed === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-[12px] text-[var(--px-sub)]">
              No notification data yet for this timeframe.
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
