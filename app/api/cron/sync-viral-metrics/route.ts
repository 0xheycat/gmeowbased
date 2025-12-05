/**
 * Viral Metrics Sync - Cron API Route
 * 
 * Syncs engagement metrics from Neynar for badge casts:
 * - Fetches likes, recasts, replies counts
 * - Calculates viral_score and viral_tier
 * - Awards bonus XP for tier upgrades
 * - Tracks viral achievements and share events
 * 
 * Endpoint: POST /api/cron/sync-viral-metrics
 * Schedule: Every 6 hours (via GitHub Actions)
 * Security: CRON_SECRET + rate limiting + IP tracking
 * 
 * @see scripts/automation/sync-viral-metrics.ts for core sync logic
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, strictLimiter } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes max execution time

/**
 * Verify CRON_SECRET from request headers
 */
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (!cronSecret || !authHeader) {
    return false
  }
  
  const token = authHeader.replace('Bearer ', '')
  return token === cronSecret
}

/**
 * POST handler for viral metrics sync cron job
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const ip = getClientIp(request)
  
  try {
    // Layer 1: Rate limiting (10 req/min per IP)
    const rateLimitResult = await rateLimit(ip, strictLimiter)
    if (!rateLimitResult.success) {
      const { limit, remaining, reset } = rateLimitResult
      console.warn(`[Viral Metrics] Rate limit exceeded from IP: ${ip}`)
      return NextResponse.json(
        { 
          error: 'Too many requests',
          limit,
          remaining,
          reset: reset ? new Date(reset).toISOString() : new Date(Date.now() + 60000).toISOString()
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': String(reset || Date.now() + 60000),
          }
        }
      )
    }
    
    // Layer 2: CRON_SECRET verification
    if (!verifyCronSecret(request)) {
      console.error(`[Viral Metrics] Unauthorized request from IP: ${ip}`)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Layer 3: Log authorized request with IP tracking
    console.log(`[Viral Metrics] Starting sync from IP: ${ip}`)
    
    // Import and run sync logic
    const { syncViralMetrics } = await import('@/scripts/automation/sync-viral-metrics')
    const result = await syncViralMetrics({ dryRun: false })
    
    const duration = Date.now() - startTime
    console.log(`[Viral Metrics] Sync complete in ${duration}ms`)
    console.log(`[Viral Metrics] Result:`, result)
    
    return NextResponse.json({
      success: true,
      result,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      source_ip: ip, // Audit trail
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`❌ [Viral Metrics] Sync failed from IP ${ip}:`, error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        source_ip: ip, // Audit trail
      },
      { status: 500 }
    )
  }
}

/**
 * GET handler for health check (development only)
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  
  // Rate limiting on health check too
  const rateLimitResult = await rateLimit(ip, strictLimiter)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  }
  
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'GET method not allowed in production. Use POST with cron secret.' },
      { status: 405 }
    )
  }
  
  // In development, allow health check
  return NextResponse.json({
    status: 'healthy',
    endpoint: '/api/cron/sync-viral-metrics',
    method: 'POST',
    authentication: 'Bearer CRON_SECRET',
    schedule: 'Every 6 hours',
    timestamp: new Date().toISOString(),
  })
}
