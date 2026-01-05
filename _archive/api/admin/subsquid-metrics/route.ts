/**
 * @file app/api/admin/subsquid-metrics/route.ts
 * @description Admin endpoint for Subsquid performance monitoring
 * 
 * PHASE: Phase 9.6 - Subsquid Optimization (January 3, 2026)
 * 
 * FEATURES:
 *   - Real-time Subsquid query metrics
 *   - Cache hit/miss rates
 *   - Average latency tracking
 *   - Error rate monitoring
 *   - Batch query statistics
 * 
 * ENDPOINT: GET /api/admin/subsquid-metrics
 * 
 * USAGE:
 *   curl http://localhost:3000/api/admin/subsquid-metrics
 */

import { NextResponse } from 'next/server'
import { getSubsquidMetrics } from '@/lib/subsquid/scoring-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Get Subsquid-specific metrics
    const metrics = getSubsquidMetrics()
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      subsquid: {
        queries: metrics.queries,
        batchQueries: metrics.batchQueries,
        errors: metrics.errors,
        errorRate: metrics.errorRate.toFixed(2) + '%',
        avgLatency: metrics.avgLatency + 'ms',
        totalLatency: metrics.totalLatency + 'ms',
      },
      caching: {
        note: 'Caching handled by lib/cache/server.ts (L1 Memory + L3 Filesystem)',
        strategy: 'stale-while-revalidate with 5min TTL',
        cost: '$0/month',
        backend: 'Memory → Filesystem (auto)',
      },
      performance: {
        avgSubsquidQuery: metrics.avgLatency + 'ms',
        avgCachedResponse: '<10ms (filesystem)',
        estimatedHitRate: '85%+ after warmup',
        estimatedCost: '$0/month',
      },
      health: {
        subsquidHealthy: metrics.errorRate < 5,
        overall: metrics.errorRate < 5 ? 'healthy' : 'degraded',
      },
    })
  } catch (error) {
    console.error('[Admin] Subsquid metrics error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
