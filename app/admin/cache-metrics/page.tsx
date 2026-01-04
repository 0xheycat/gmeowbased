'use client'

/**
 * @file app/admin/cache-metrics/page.tsx
 * @description Admin dashboard for cache performance monitoring
 * 
 * Phase: Phase 8.4.2 Cache Metrics Dashboard
 * 
 * Features:
 * - Real-time cache hit/miss rates
 * - RPC call tracking
 * - Average latency monitoring
 * - Historical trend charts
 * - Cache invalidation controls
 * - Performance alerts
 * 
 * @module admin/cache-metrics
 */

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts'

interface CacheMetrics {
  metrics: {
    rpcCalls: number
    cacheHits: number
    cacheMisses: number
    avgLatency: number
    lastReset: number
    cacheHitRate: string | number
    uptime: string
  }
  status: 'healthy' | 'warning' | 'degraded'
  timestamp: string
}

interface HistoricalDataPoint {
  timestamp: string
  cacheHitRate: number
  rpcCalls: number
  avgLatency: number
}

export default function CacheMetricsPage() {
  const [metrics, setMetrics] = useState<CacheMetrics | null>(null)
  const [historical, setHistorical] = useState<HistoricalDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Fetch current metrics
  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/scoring/metrics')
      if (!res.ok) throw new Error('Failed to fetch metrics')
      const data = await res.json()
      setMetrics(data)
      setError(null)

      // Add to historical data
      const hitRate = typeof data.metrics.cacheHitRate === 'string' 
        ? parseFloat(data.metrics.cacheHitRate) || 0
        : data.metrics.cacheHitRate

      setHistorical(prev => {
        const newPoint = {
          timestamp: new Date(data.timestamp).toLocaleTimeString(),
          cacheHitRate: hitRate,
          rpcCalls: data.metrics.rpcCalls,
          avgLatency: data.metrics.avgLatency
        }
        const updated = [...prev, newPoint].slice(-20) // Keep last 20 points
        return updated
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh every 5 seconds
  useEffect(() => {
    fetchMetrics()
    if (!autoRefresh) return

    const interval = setInterval(fetchMetrics, 5000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  // Invalidate cache for single address
  const invalidateSingle = async (address: string) => {
    try {
      const res = await fetch(`/api/admin/scoring?address=${address}`)
      if (!res.ok) throw new Error('Invalidation failed')
      alert(`Cache invalidated for ${address}`)
      fetchMetrics() // Refresh metrics
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Invalidation failed')
    }
  }

  // Get status color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500 bg-green-500/10'
      case 'warning': return 'text-yellow-500 bg-yellow-500/10'
      case 'degraded': return 'text-red-500 bg-red-500/10'
      default: return 'text-gray-500 bg-gray-500/10'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-gray-700 rounded-lg w-64" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-700 rounded-lg" />
              ))}
            </div>
            <div className="h-96 bg-gray-700 rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Cache Metrics Dashboard</h1>
            <p className="text-gray-400">Real-time performance monitoring</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                autoRefresh 
                  ? 'bg-green-500 text-white hover:bg-green-600' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {autoRefresh ? '🔄 Auto-Refresh ON' : '⏸️ Auto-Refresh OFF'}
            </button>
            <button
              onClick={fetchMetrics}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-all"
            >
              🔄 Refresh Now
            </button>
          </div>
        </motion.div>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-red-500/10 border border-red-500 rounded-lg p-4"
            >
              <p className="text-red-500 font-medium">⚠️ Error: {error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Overview */}
        {metrics && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className={`rounded-lg p-6 ${getStatusColor(metrics.status)}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  System Status: <span className="uppercase">{metrics.status}</span>
                </h2>
                <p className="text-sm opacity-80">
                  Uptime: {metrics.metrics.uptime} • Last updated: {new Date(metrics.timestamp).toLocaleString()}
                </p>
              </div>
              <div className="text-6xl">
                {metrics.status === 'healthy' ? '✅' : metrics.status === 'warning' ? '⚠️' : '🔴'}
              </div>
            </div>
          </motion.div>
        )}

        {/* Key Metrics Cards */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Cache Hit Rate"
              value={typeof metrics.metrics.cacheHitRate === 'number' 
                ? `${metrics.metrics.cacheHitRate.toFixed(2)}%` 
                : metrics.metrics.cacheHitRate}
              subtitle={`${metrics.metrics.cacheHits} hits / ${metrics.metrics.cacheMisses} misses`}
              icon="🎯"
              color="blue"
              delay={0.2}
            />
            <MetricCard
              title="RPC Calls"
              value={metrics.metrics.rpcCalls.toString()}
              subtitle="Total calls since reset"
              icon="📡"
              color="purple"
              delay={0.3}
            />
            <MetricCard
              title="Avg Latency"
              value={`${metrics.metrics.avgLatency}ms`}
              subtitle="Average response time"
              icon="⚡"
              color="green"
              delay={0.4}
            />
          </div>
        )}

        {/* Historical Charts */}
        {historical.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            className="bg-gray-800 rounded-lg p-6 border border-gray-700"
          >
            <h3 className="text-2xl font-bold text-white mb-6">Cache Hit Rate Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={historical}>
                <defs>
                  <linearGradient id="colorHitRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="timestamp" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#f3f4f6' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="cacheHitRate" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorHitRate)" 
                  name="Hit Rate (%)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {historical.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* RPC Calls Chart */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.6 }}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
            >
              <h3 className="text-xl font-bold text-white mb-4">RPC Calls</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={historical}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="timestamp" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  />
                  <Line type="monotone" dataKey="rpcCalls" stroke="#a855f7" strokeWidth={2} name="RPC Calls" />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Latency Chart */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.7 }}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
            >
              <h3 className="text-xl font-bold text-white mb-4">Average Latency</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={historical}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="timestamp" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  />
                  <Line type="monotone" dataKey="avgLatency" stroke="#10b981" strokeWidth={2} name="Latency (ms)" />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        )}

        {/* Cache Invalidation Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.8 }}
          className="bg-gray-800 rounded-lg p-6 border border-gray-700"
        >
          <h3 className="text-2xl font-bold text-white mb-4">Cache Invalidation</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="0x... (Ethereum address)"
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                id="invalidate-address"
              />
              <button
                onClick={() => {
                  const input = document.getElementById('invalidate-address') as HTMLInputElement
                  if (input?.value) invalidateSingle(input.value)
                }}
                className="px-6 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-all"
              >
                🗑️ Invalidate Cache
              </button>
            </div>
            <p className="text-sm text-gray-400">
              Enter an Ethereum address to invalidate its cached scoring data. Use after manual score adjustments.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// Metric Card Component
function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color, 
  delay 
}: { 
  title: string
  value: string
  subtitle: string
  icon: string
  color: 'blue' | 'purple' | 'green'
  delay: number
}) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/50',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/50',
    green: 'from-green-500/20 to-green-600/20 border-green-500/50'
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ scale: 1.02 }}
      className={`bg-gradient-to-br ${colorClasses[color]} rounded-lg p-6 border`}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-300">{title}</h3>
        <span className="text-3xl">{icon}</span>
      </div>
      <p className="text-4xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-gray-400">{subtitle}</p>
    </motion.div>
  )
}
