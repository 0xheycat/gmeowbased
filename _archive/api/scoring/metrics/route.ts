import { NextResponse } from 'next/server'
import { getScoringPerformanceMetrics } from '@/lib/scoring/unified-calculator'

/**
 * GET /api/scoring/metrics
 * 
 * Returns real-time performance metrics for the scoring cache system
 * 
 * Phase: 8.4 - Cache Optimization Monitoring
 * 
 * Metrics:
 * - rpcCalls: Total RPC calls made to blockchain
 * - cacheHits: Number of cache hits (data served from cache)
 * - cacheMisses: Number of cache misses (data fetched from blockchain)
 * - avgLatency: Average RPC call latency in milliseconds
 * - cacheHitRate: Percentage of requests served from cache
 * - uptime: How long metrics have been collecting
 * 
 * Expected values (after Phase 8.4 optimization):
 * - cacheHitRate: >95%
 * - rpcCalls: <10/min
 * - avgLatency: <50ms
 * 
 * @example
 * GET /api/scoring/metrics
 * Response:
 * {
 *   "metrics": {
 *     "rpcCalls": 8,
 *     "cacheHits": 152,
 *     "cacheMisses": 8,
 *     "avgLatency": 42,
 *     "cacheHitRate": "95.00%",
 *     "uptime": "23.4 minutes"
 *   },
 *   "status": "healthy",
 *   "timestamp": "2026-01-03T12:34:56.789Z"
 * }
 */
export async function GET() {
  try {
    const metrics = getScoringPerformanceMetrics()
    
    // Determine health status based on metrics
    const cacheHitRateNum = parseFloat(metrics.cacheHitRate)
    const status = cacheHitRateNum >= 95 ? 'healthy' : 
                   cacheHitRateNum >= 80 ? 'warning' : 
                   'degraded'
    
    return NextResponse.json({
      metrics,
      status,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[API /api/scoring/metrics] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to retrieve metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
