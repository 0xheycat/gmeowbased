/**
 * Phase 4: Performance Optimization - Timing Middleware
 * 
 * Tracks API request performance and logs slow queries.
 * Integrates with Vercel Analytics for monitoring.
 * 
 * Usage:
 * ```typescript
 * import { withTiming } from '@/lib/middleware/timing'
 * 
 * export const GET = withTiming(async (request: Request) => {
 *   // Your handler code
 *   return NextResponse.json({ data })
 * })
 * ```
 */

import type { NextRequest } from 'next/server'
import { trackError } from '@/lib/notifications/error-tracking'

// ========================================
// TYPES
// ========================================


type ApiHandler = (request: Request | NextRequest) => Promise<Response>

type TimingMetrics = {
  route: string
  method: string
  duration: number
  status: number
  timestamp: number
  slow: boolean
}

type PerformanceStats = {
  totalRequests: number
  slowRequests: number
  averageDuration: number
  p50: number
  p95: number
  p99: number
}

// ========================================
// CONFIGURATION
// ========================================

const SLOW_REQUEST_THRESHOLD_MS = Number(process.env.SLOW_REQUEST_THRESHOLD_MS ?? 500)
// const ENABLE_TIMING_LOGS = process.env.ENABLE_TIMING_LOGS !== 'false' // Reserved for future use
const ENABLE_SLOW_REQUEST_ALERTS = process.env.ENABLE_SLOW_REQUEST_ALERTS !== 'false'

// ========================================
// IN-MEMORY METRICS STORE
// ========================================

const metrics: TimingMetrics[] = []
const MAX_METRICS_SIZE = 1000

function recordMetric(metric: TimingMetrics): void {
  metrics.push(metric)
  
  // Keep only last N metrics
  if (metrics.length > MAX_METRICS_SIZE) {
    metrics.shift()
  }
}

// ========================================
// TIMING MIDDLEWARE
// ========================================

/**
 * Wrap API route handler with performance timing
 * 
 * @param handler - API route handler function
 * @returns Wrapped handler with timing
 */
function withTiming(handler: ApiHandler): ApiHandler {
  return async (request: Request | NextRequest) => {
    const startTime = performance.now()
    const startTimestamp = Date.now()
    
    try {
      // Execute handler
      const response = await handler(request)
      
      // Calculate duration
      const duration = performance.now() - startTime
      const isSlow = duration > SLOW_REQUEST_THRESHOLD_MS
      
      // Extract route info
      const url = new URL(request.url)
      const route = url.pathname
      const method = request.method
      const status = response.status
      
      // Record metrics
      const metric: TimingMetrics = {
        route,
        method,
        duration,
        status,
        timestamp: startTimestamp,
        slow: isSlow,
      }
      recordMetric(metric)
      
      // Alert on slow requests
      if (isSlow && ENABLE_SLOW_REQUEST_ALERTS) {
        // Send to analytics (if available)
        await logSlowRequest(route, method, duration, status)
      }
      
      // Add timing header (for debugging)
      const headers = new Headers(response.headers)
      headers.set('X-Response-Time', `${duration.toFixed(2)}ms`)
      headers.set('X-Slow-Request', isSlow ? 'true' : 'false')
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    } catch (error) {
      // Log error with timing
      const duration = performance.now() - startTime
      const url = new URL(request.url)
      
      trackError('timing_request_failed', error, {
        function: 'withTiming',
        method: request.method,
        pathname: url.pathname,
        duration: duration.toFixed(2),
      })
      
      throw error
    }
  }
}

// ========================================
// SLOW REQUEST LOGGING
// ========================================

/**
 * Log slow request to analytics service
 */
async function logSlowRequest(
  route: string,
  method: string,
  duration: number,
  status: number
): Promise<void> {
  // Send to Vercel Analytics (Web Vitals)
  if (typeof window !== 'undefined' && 'sendAnalytics' in window) {
    try {
      // @ts-ignore - Vercel Analytics global
      window.sendAnalytics({
        name: 'slow-api-request',
        value: duration,
        route,
        method,
        status,
      })
    } catch (error) {
      trackError('timing_analytics_failed', error, { function: 'logSlowRequest', route, method, duration })
    }
  }
  
  // Send to custom monitoring service (optional)
  const monitoringUrl = process.env.MONITORING_WEBHOOK_URL
  if (monitoringUrl) {
    try {
      await fetch(monitoringUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'slow_api_request',
          route,
          method,
          duration,
          status,
          timestamp: Date.now(),
          threshold: SLOW_REQUEST_THRESHOLD_MS,
        }),
      })
    } catch (error) {
      trackError('timing_monitoring_webhook_failed', error, { function: 'logSlowRequest', route, method, duration })
    }
  }
}

// ========================================
// PERFORMANCE STATISTICS
// ========================================

/**
 * Calculate performance statistics from recorded metrics
 */
function getPerformanceStats(): PerformanceStats {
  if (metrics.length === 0) {
    return {
      totalRequests: 0,
      slowRequests: 0,
      averageDuration: 0,
      p50: 0,
      p95: 0,
      p99: 0,
    }
  }
  
  const durations = metrics.map(m => m.duration).sort((a, b) => a - b)
  const slowCount = metrics.filter(m => m.slow).length
  
  const sum = durations.reduce((acc, d) => acc + d, 0)
  const avg = sum / durations.length
  
  const p50Index = Math.floor(durations.length * 0.5)
  const p95Index = Math.floor(durations.length * 0.95)
  const p99Index = Math.floor(durations.length * 0.99)
  
  return {
    totalRequests: metrics.length,
    slowRequests: slowCount,
    averageDuration: avg,
    p50: durations[p50Index],
    p95: durations[p95Index],
    p99: durations[p99Index],
  }
}

/**
 * Get metrics for specific route
 */
function getRouteMetrics(route: string): TimingMetrics[] {
  return metrics.filter(m => m.route === route)
}

/**
 * Get slow requests (above threshold)
 */
function getSlowRequests(): TimingMetrics[] {
  return metrics.filter(m => m.slow)
}

/**
 * Clear all metrics
 */
function clearMetrics(): void {
  metrics.length = 0
}

// ========================================
// PERFORMANCE REPORT
// ========================================

/**
 * Generate human-readable performance report
 */
function generatePerformanceReport(): {
  stats: PerformanceStats
  slowRequests: TimingMetrics[]
  routeStats: Record<string, { count: number; avgDuration: number }>
} {
  const stats = getPerformanceStats()
  const slowRequests = getSlowRequests()
  
  // Aggregate by route
  const routeMap = new Map<string, number[]>()
  for (const metric of metrics) {
    const existing = routeMap.get(metric.route) || []
    existing.push(metric.duration)
    routeMap.set(metric.route, existing)
  }
  
  const routeStats: Record<string, { count: number; avgDuration: number }> = {}
  for (const [route, durations] of routeMap.entries()) {
    const sum = durations.reduce((acc, d) => acc + d, 0)
    routeStats[route] = {
      count: durations.length,
      avgDuration: sum / durations.length,
    }
  }
  
  return {
    stats,
    slowRequests: slowRequests.slice(-10), // Last 10 slow requests
    routeStats,
  }
}

// ========================================
// EXPORTS
// ========================================

export {
  withTiming,
  getPerformanceStats,
  getRouteMetrics,
  getSlowRequests,
  clearMetrics,
  generatePerformanceReport,
}

export type { ApiHandler, TimingMetrics, PerformanceStats }
