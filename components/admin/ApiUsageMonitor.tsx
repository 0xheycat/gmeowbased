/**
 * API Usage Monitor - Track FREE tier usage
 * 
 * Purpose: Monitor Etherscan API calls, cache hit rates, ensure we stay within FREE limits
 * 
 * FREE Tier Limits:
 * - Etherscan API: 5 calls/sec = 432k calls/day
 * - Target usage: <10% (43k calls/day)
 * - Alert threshold: >50% (216k calls/day)
 */

'use client'

import { useState, useEffect } from 'react'

type UsageMetrics = {
  // API calls
  totalApiCalls: number
  apiCallsByChain: Record<string, number>
  
  // Cache metrics
  cacheHitRate: number
  cacheHits: number
  cacheMisses: number
  
  // Cost tracking
  estimatedCost: number
  
  // Top users
  topUsers: Array<{ address: string; calls: number }>
  
  // Time range
  timeRange: '1h' | '24h' | '7d' | '30d'
  
  // Etherscan FREE tier usage
  etherscanCallsToday: number
  etherscanLimit: number
  etherscanUsagePercent: number
}

type AlertLevel = 'success' | 'warning' | 'danger'

export function ApiUsageMonitor() {
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null)
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h')
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch(`/api/admin/usage-metrics?range=${timeRange}`)
        const data = await res.json()
        setMetrics(data)
      } catch (err) {
        console.error('Failed to fetch metrics:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()

    // Auto-refresh every 30 seconds
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 30000)
      return () => clearInterval(interval)
    }
  }, [timeRange, autoRefresh])

  const getAlertLevel = (usagePercent: number): AlertLevel => {
    if (usagePercent < 30) return 'success'
    if (usagePercent < 70) return 'warning'
    return 'danger'
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  if (loading) {
    return (
      <div className="usage-monitor-loading">
        <div className="spinner" />
        <p>Loading metrics...</p>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="usage-monitor-error">
        <p>⚠️ Failed to load metrics</p>
      </div>
    )
  }

  const alertLevel = getAlertLevel(metrics.etherscanUsagePercent)

  return (
    <div className="usage-monitor">
      {/* Header */}
      <div className="monitor-header">
        <h2>API Usage Monitor</h2>
        <div className="header-controls">
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as any)}>
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span>Auto-refresh</span>
          </label>
        </div>
      </div>

      {/* Etherscan FREE Tier Usage Alert */}
      <div className={`usage-alert usage-alert-${alertLevel}`}>
        <div className="alert-header">
          <span className="alert-icon">
            {alertLevel === 'success' && '✅'}
            {alertLevel === 'warning' && '⚠️'}
            {alertLevel === 'danger' && '🚨'}
          </span>
          <h3>Etherscan FREE Tier Usage</h3>
        </div>
        
        <div className="usage-progress">
          <div className="progress-bar">
            <div
              className={`progress-fill progress-fill-${alertLevel}`}
              style={{ width: `${Math.min(100, metrics.etherscanUsagePercent)}%` }}
            />
          </div>
          <div className="progress-text">
            {formatNumber(metrics.etherscanCallsToday)} / {formatNumber(metrics.etherscanLimit)} calls today
            ({metrics.etherscanUsagePercent.toFixed(1)}%)
          </div>
        </div>
        
        {alertLevel === 'danger' && (
          <p className="alert-message">
            🚨 Warning: Approaching FREE tier limit! Consider implementing request caching or upgrading to paid tier.
          </p>
        )}
        {alertLevel === 'warning' && (
          <p className="alert-message">
            ⚠️ Usage is moderate. Monitor closely to avoid hitting FREE tier limits.
          </p>
        )}
        {alertLevel === 'success' && (
          <p className="alert-message">
            ✅ Usage is healthy. Well within FREE tier limits.
          </p>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        {/* Total API Calls */}
        <div className="metric-card">
          <div className="metric-label">Total API Calls</div>
          <div className="metric-value">{formatNumber(metrics.totalApiCalls)}</div>
          <div className="metric-subtitle">{timeRange}</div>
        </div>

        {/* Cache Hit Rate */}
        <div className="metric-card">
          <div className="metric-label">Cache Hit Rate</div>
          <div className="metric-value">{metrics.cacheHitRate.toFixed(1)}%</div>
          <div className="metric-subtitle">
            {formatNumber(metrics.cacheHits)} hits / {formatNumber(metrics.cacheMisses)} misses
          </div>
        </div>

        {/* Estimated Cost */}
        <div className="metric-card">
          <div className="metric-label">Estimated Cost</div>
          <div className="metric-value">${metrics.estimatedCost.toFixed(2)}</div>
          <div className="metric-subtitle">{timeRange}</div>
        </div>
      </div>

      {/* API Calls by Chain */}
      <div className="section">
        <h3>API Calls by Chain</h3>
        <div className="chain-usage-bars">
          {Object.entries(metrics.apiCallsByChain)
            .sort(([, a], [, b]) => b - a)
            .map(([chain, calls]) => {
              const percent = (calls / metrics.totalApiCalls) * 100
              return (
                <div key={chain} className="chain-bar">
                  <div className="chain-label">
                    <span className="chain-name">{chain}</span>
                    <span className="chain-count">{formatNumber(calls)}</span>
                  </div>
                  <div className="bar-background">
                    <div className="bar-fill" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* Top Users */}
      <div className="section">
        <h3>Top Users by API Calls</h3>
        <table className="top-users-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Address</th>
              <th>Calls</th>
              <th>% of Total</th>
            </tr>
          </thead>
          <tbody>
            {metrics.topUsers.map((user, idx) => {
              const percent = (user.calls / metrics.totalApiCalls) * 100
              return (
                <tr key={user.address}>
                  <td>{idx + 1}</td>
                  <td className="address-cell">
                    {user.address.slice(0, 6)}...{user.address.slice(-4)}
                  </td>
                  <td>{formatNumber(user.calls)}</td>
                  <td>{percent.toFixed(1)}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .usage-monitor {
          padding: 24px;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px;
          color: #e0e0e0;
        }

        .monitor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .monitor-header h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
        }

        .header-controls {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .header-controls select {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #333;
          background: #2a2a3e;
          color: #e0e0e0;
          font-size: 14px;
          cursor: pointer;
        }

        .auto-refresh-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 14px;
        }

        .auto-refresh-toggle input {
          cursor: pointer;
        }

        /* Usage Alert */
        .usage-alert {
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 24px;
        }

        .usage-alert-success {
          background: linear-gradient(135deg, #1e4620 0%, #2d5f30 100%);
          border: 1px solid #4caf50;
        }

        .usage-alert-warning {
          background: linear-gradient(135deg, #5a4620 0%, #6b5520 100%);
          border: 1px solid #ff9800;
        }

        .usage-alert-danger {
          background: linear-gradient(135deg, #5a2020 0%, #6b2020 100%);
          border: 1px solid #f44336;
        }

        .alert-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .alert-icon {
          font-size: 24px;
        }

        .alert-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .usage-progress {
          margin-bottom: 12px;
        }

        .progress-bar {
          height: 24px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .progress-fill-success {
          background: linear-gradient(90deg, #4caf50 0%, #66bb6a 100%);
        }

        .progress-fill-warning {
          background: linear-gradient(90deg, #ff9800 0%, #ffa726 100%);
        }

        .progress-fill-danger {
          background: linear-gradient(90deg, #f44336 0%, #ef5350 100%);
        }

        .progress-text {
          font-size: 14px;
          text-align: center;
        }

        .alert-message {
          margin: 12px 0 0 0;
          font-size: 14px;
          line-height: 1.5;
        }

        /* Metrics Grid */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }

        .metric-card {
          background: rgba(255, 255, 255, 0.05);
          padding: 20px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .metric-label {
          font-size: 12px;
          text-transform: uppercase;
          color: #888;
          margin-bottom: 8px;
        }

        .metric-value {
          font-size: 32px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 4px;
        }

        .metric-subtitle {
          font-size: 12px;
          color: #aaa;
        }

        /* Sections */
        .section {
          margin-bottom: 32px;
        }

        .section h3 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
        }

        /* Chain Usage Bars */
        .chain-usage-bars {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .chain-bar {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .chain-label {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
        }

        .chain-name {
          font-weight: 600;
          text-transform: capitalize;
        }

        .bar-background {
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
        }

        .bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #00d4ff 0%, #0099cc 100%);
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        /* Top Users Table */
        .top-users-table {
          width: 100%;
          border-collapse: collapse;
        }

        .top-users-table th {
          text-align: left;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 12px;
          text-transform: uppercase;
          color: #888;
        }

        .top-users-table td {
          padding: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .address-cell {
          font-family: monospace;
        }

        /* Loading/Error States */
        .usage-monitor-loading,
        .usage-monitor-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px;
          text-align: center;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255, 255, 255, 0.1);
          border-top-color: #00d4ff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .monitor-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }

          .metrics-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
