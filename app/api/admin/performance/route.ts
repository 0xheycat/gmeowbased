import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/error-handler'
import { 
  generatePerformanceReport, 
  getPerformanceStats,
  getSlowRequests 
} from '@/lib/middleware/timing'
import { getCacheStats } from '@/lib/cache'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/performance
 * Get performance metrics and cache statistics
 * 
 * Returns:
 * - API request timing stats (p50, p95, p99)
 * - Cache hit rates (memory + external)
 * - Slow requests (last 10)
 * - Per-route statistics
 */
export const GET = withErrorHandler(async (request: Request) => {
  // TODO: Add admin auth check
  // const isAdmin = await checkAdminAuth(request)
  // if (!isAdmin) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // }

  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'json'

  // Gather performance metrics
  const perfReport = generatePerformanceReport()
  const perfStats = getPerformanceStats()
  const cacheStats = getCacheStats()
  const slowRequests = getSlowRequests()

  const report = {
    timestamp: new Date().toISOString(),
    performance: {
      totalRequests: perfStats.totalRequests,
      slowRequests: perfStats.slowRequests,
      slowRequestPercentage: perfStats.totalRequests > 0 
        ? ((perfStats.slowRequests / perfStats.totalRequests) * 100).toFixed(2) + '%'
        : '0%',
      averageDuration: Math.round(perfStats.averageDuration),
      percentiles: {
        p50: Math.round(perfStats.p50),
        p95: Math.round(perfStats.p95),
        p99: Math.round(perfStats.p99),
      },
    },
    cache: {
      totalHits: cacheStats.hits,
      totalMisses: cacheStats.misses,
      cacheSize: cacheStats.size,
      hitRate: (cacheStats.hits + cacheStats.misses) > 0
        ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(2) + '%'
        : '0%',
      memoryHitRate: (cacheStats.memoryHitRate * 100).toFixed(2) + '%',
      externalHitRate: (cacheStats.externalHitRate * 100).toFixed(2) + '%',
    },
    recentSlowRequests: slowRequests.slice(-10).map(req => ({
      route: req.route,
      method: req.method,
      duration: Math.round(req.duration),
      status: req.status,
      timestamp: new Date(req.timestamp).toISOString(),
    })),
    routeStats: Object.entries(perfReport.routeStats)
      .map(([route, stats]) => ({
        route,
        count: stats.count,
        avgDuration: Math.round(stats.avgDuration),
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 20), // Top 20 slowest routes
  }

  if (format === 'html') {
    // Return HTML dashboard
    const html = generateHtmlDashboard(report)
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  return NextResponse.json(report)
})

function generateHtmlDashboard(report: any): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Performance Dashboard - Gmeowbased</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #fff;
      padding: 2rem;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { 
      font-size: 2rem; 
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .timestamp {
      color: #888;
      font-size: 0.9rem;
      margin-bottom: 2rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .card {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 12px;
      padding: 1.5rem;
    }
    .card h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
      color: #667eea;
    }
    .metric {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem 0;
      border-bottom: 1px solid #2a2a2a;
    }
    .metric:last-child { border-bottom: none; }
    .metric-label { color: #aaa; }
    .metric-value { 
      font-weight: 600;
      color: #fff;
    }
    .metric-value.good { color: #4ade80; }
    .metric-value.warning { color: #fbbf24; }
    .metric-value.bad { color: #ef4444; }
    .table {
      width: 100%;
      margin-top: 1rem;
      border-collapse: collapse;
    }
    .table th {
      text-align: left;
      padding: 0.75rem;
      background: #2a2a2a;
      color: #aaa;
      font-weight: 500;
      font-size: 0.875rem;
    }
    .table td {
      padding: 0.75rem;
      border-bottom: 1px solid #2a2a2a;
    }
    .table tr:hover {
      background: #1a1a1a;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge.success { background: #4ade8020; color: #4ade80; }
    .badge.warning { background: #fbbf2420; color: #fbbf24; }
    .badge.error { background: #ef444420; color: #ef4444; }
  </style>
</head>
<body>
  <div class="container">
    <h1>⚡ Performance Dashboard</h1>
    <p class="timestamp">Last updated: ${report.timestamp}</p>
    
    <div class="grid">
      <div class="card">
        <h2>📊 Request Statistics</h2>
        <div class="metric">
          <span class="metric-label">Total Requests</span>
          <span class="metric-value">${report.performance.totalRequests}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Slow Requests</span>
          <span class="metric-value ${report.performance.slowRequests > 10 ? 'warning' : 'good'}">
            ${report.performance.slowRequests} (${report.performance.slowRequestPercentage})
          </span>
        </div>
        <div class="metric">
          <span class="metric-label">Average Duration</span>
          <span class="metric-value ${report.performance.averageDuration > 200 ? 'warning' : 'good'}">
            ${report.performance.averageDuration}ms
          </span>
        </div>
      </div>
      
      <div class="card">
        <h2>⏱️ Response Time Percentiles</h2>
        <div class="metric">
          <span class="metric-label">p50 (Median)</span>
          <span class="metric-value ${report.performance.percentiles.p50 > 150 ? 'warning' : 'good'}">
            ${report.performance.percentiles.p50}ms
          </span>
        </div>
        <div class="metric">
          <span class="metric-label">p95</span>
          <span class="metric-value ${report.performance.percentiles.p95 > 300 ? 'warning' : 'good'}">
            ${report.performance.percentiles.p95}ms
          </span>
        </div>
        <div class="metric">
          <span class="metric-label">p99</span>
          <span class="metric-value ${report.performance.percentiles.p99 > 500 ? 'bad' : 'warning'}">
            ${report.performance.percentiles.p99}ms
          </span>
        </div>
      </div>
      
      <div class="card">
        <h2>💾 Cache Performance</h2>
        <div class="metric">
          <span class="metric-label">Total Hits</span>
          <span class="metric-value good">${report.cache.totalHits}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Total Misses</span>
          <span class="metric-value">${report.cache.totalMisses}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Hit Rate</span>
          <span class="metric-value ${parseFloat(report.cache.hitRate) > 70 ? 'good' : 'warning'}">
            ${report.cache.hitRate}
          </span>
        </div>
        <div class="metric">
          <span class="metric-label">Cache Size</span>
          <span class="metric-value">${report.cache.cacheSize} entries</span>
        </div>
      </div>
    </div>
    
    <div class="card" style="margin-bottom: 2rem;">
      <h2>🐌 Recent Slow Requests</h2>
      <table class="table">
        <thead>
          <tr>
            <th>Route</th>
            <th>Method</th>
            <th>Duration</th>
            <th>Status</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          ${report.recentSlowRequests.length === 0 ? '<tr><td colspan="5" style="text-align: center; color: #4ade80;">No slow requests recorded! 🎉</td></tr>' : ''}
          ${report.recentSlowRequests.map((req: any) => `
            <tr>
              <td>${req.route}</td>
              <td><span class="badge success">${req.method}</span></td>
              <td style="color: ${req.duration > 1000 ? '#ef4444' : '#fbbf24'};">${req.duration}ms</td>
              <td><span class="badge ${req.status < 300 ? 'success' : req.status < 500 ? 'warning' : 'error'}">${req.status}</span></td>
              <td style="color: #888; font-size: 0.875rem;">${new Date(req.timestamp).toLocaleTimeString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="card">
      <h2>📈 Route Statistics (Top 20 Slowest)</h2>
      <table class="table">
        <thead>
          <tr>
            <th>Route</th>
            <th>Requests</th>
            <th>Avg Duration</th>
          </tr>
        </thead>
        <tbody>
          ${report.routeStats.map((stat: any) => `
            <tr>
              <td>${stat.route}</td>
              <td>${stat.count}</td>
              <td style="color: ${stat.avgDuration > 200 ? '#fbbf24' : '#4ade80'};">${stat.avgDuration}ms</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>
  `.trim()
}
