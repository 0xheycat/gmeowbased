/**
 * WebhookHealthMonitor Component
 * 
 * Real-time webhook health dashboard showing last webhook timestamp,
 * success rate, processing time, and recent errors.
 * 
 * Source: Phase 5.2 Admin Dashboard
 * MCP Verified: November 17, 2025
 */

'use client'

import { useEffect, useState } from 'react'

type WebhookHealth = {
  last_webhook_at: string | null
  total_webhooks_today: number
  success_rate: number
  avg_processing_time_ms: number | null
  recent_errors: Array<{
    timestamp: string
    error_message: string
    cast_hash?: string
  }>
}

export default function WebhookHealthMonitor() {
  const [health, setHealth] = useState<WebhookHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/admin/viral/webhook-health')
      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'Failed to fetch webhook health')
      }

      setHealth(data.health)
      setError(null)
    } catch (err) {
      console.error('[WebhookHealthMonitor] Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchHealth()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      void fetchHealth()
    }, 15000) // Refresh every 15 seconds

    return () => clearInterval(interval)
  }, [autoRefresh])

  const getStatusColor = (successRate: number) => {
    if (successRate >= 95) return 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
    if (successRate >= 85) return 'border-amber-400/60 bg-amber-500/20 text-amber-200'
    return 'border-rose-400/60 bg-rose-500/20 text-rose-200'
  }

  const getStatusLabel = (successRate: number) => {
    if (successRate >= 95) return 'Healthy'
    if (successRate >= 85) return 'Degraded'
    return 'Down'
  }

  const formatRelativeTime = (timestamp: string | null) => {
    if (!timestamp) return 'Never'

    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return `${Math.floor(diffMins / 1440)}d ago`
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="pixel-section-title text-base">🛠️ Webhook Health</h3>
          <p className="text-[11px] text-[var(--px-sub)]">
            Real-time monitoring of viral webhook status and errors
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-[11px] text-white/70">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-white/20"
            />
            Auto-refresh
          </label>

          <button
            onClick={() => fetchHealth()}
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
          <div className="mb-1 font-semibold">Failed to load webhook health</div>
          <p>{error}</p>
        </div>
      ) : loading && !health ? (
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-xl border border-white/10 bg-white/5" />
          <div className="h-32 animate-pulse rounded-xl border border-white/10 bg-white/5" />
        </div>
      ) : health ? (
        <>
          {/* Status Badge */}
          <div
            className={`mb-4 flex items-center justify-between rounded-xl border p-4 ${getStatusColor(
              health.success_rate
            )}`}
          >
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-80">
                Webhook Status
              </div>
              <div className="mt-1 text-2xl font-bold">
                {getStatusLabel(health.success_rate)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider opacity-80">
                Success Rate
              </div>
              <div className="mt-1 text-2xl font-bold">{health.success_rate}%</div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] uppercase tracking-wider text-white/60">
                Last Webhook
              </div>
              <div className="mt-1 text-[13px] font-bold text-white">
                {formatRelativeTime(health.last_webhook_at)}
              </div>
              {health.last_webhook_at && (
                <div className="mt-0.5 text-[9px] text-white/40">
                  {formatTimestamp(health.last_webhook_at)}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] uppercase tracking-wider text-white/60">
                Today's Webhooks
              </div>
              <div className="mt-1 text-[13px] font-bold text-emerald-300">
                {health.total_webhooks_today.toLocaleString()}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] uppercase tracking-wider text-white/60">
                Avg Processing
              </div>
              <div className="mt-1 text-[13px] font-bold text-white">
                {health.avg_processing_time_ms
                  ? `${health.avg_processing_time_ms}ms`
                  : 'N/A'}
              </div>
            </div>
          </div>

          {/* Recent Errors */}
          <div>
            <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-white/70">
              Recent Errors (Last 24h)
            </h4>

            {health.recent_errors.length === 0 ? (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-center text-[12px] text-emerald-200">
                ✅ No errors in the last 24 hours!
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {health.recent_errors.map((error, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-semibold text-rose-200">
                          {error.error_message}
                        </div>
                        {error.cast_hash && (
                          <div className="mt-1 truncate font-mono text-[9px] text-rose-300/60">
                            Cast: {error.cast_hash}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right text-[9px] text-rose-300/60">
                        {formatTimestamp(error.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
