/**
 * Leaderboard Snapshot Sync - Cron API Route
 * 
 * Syncs leaderboard data to Supabase snapshots table:
 * - Creates historical snapshots of leaderboard state
 * - Stores global and per-chain rankings
 * - Enables time-series analysis of player progress
 * 
 * NOTE: This is DIFFERENT from /api/cron/update-leaderboard:
 * - update-leaderboard: Recalculates scores and ranks (live data)
 * - sync-leaderboard: Stores snapshots for historical analysis
 * 
 * Endpoint: POST /api/cron/sync-leaderboard
 * Schedule: Daily at midnight (via GitHub Actions)
 * Security: CRON_SECRET + rate limiting + IP tracking + idempotency
 * 
 * Idempotency: Prevents duplicate snapshots on retry
 * Key format: cron-sync-leaderboard-YYYYMMDD-HH (24h cache TTL)
 * 
 * @see scripts/leaderboard/sync-supabase.ts for core sync logic
 * @see lib/leaderboard-sync.ts for syncSupabaseLeaderboard function
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, strictLimiter } from '@/lib/middleware/rate-limit'
import { getClientIp } from '@/lib/middleware/rate-limit'
import { checkIdempotency, storeIdempotency, returnCachedResponse } from '@/lib/middleware/idempotency'
import { generateRequestId } from '@/lib/middleware/request-id'

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
 * POST handler for leaderboard snapshot sync cron job
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  const startTime = Date.now()
  const ip = getClientIp(request)
  
  try {
    // Layer 1: Rate limiting (10 req/min per IP)
    const rateLimitResult = await rateLimit(ip, strictLimiter)
    if (!rateLimitResult.success) {
      const { limit, remaining, reset } = rateLimitResult
      console.warn(`[Leaderboard Sync] Rate limit exceeded from IP: ${ip}`)
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
            'X-Request-ID': requestId,
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': String(reset),
          }
        }
      )
    }
    
    // Layer 2: CRON_SECRET verification
    if (!verifyCronSecret(request)) {
      console.error(`[Leaderboard Sync] Unauthorized request from IP: ${ip}`)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: { 'X-Request-ID': requestId } }
      )
    }
    
    // Layer 3: Log authorized request with IP tracking
    console.log(`[Leaderboard Sync] Starting snapshot sync from IP: ${ip}`)
    
    // Layer 4: Idempotency check (prevents duplicate snapshots)
    const now = new Date()
    const dateKey = now.toISOString().slice(0, 13).replace(/[-:T]/g, '') // YYYYMMDDHH
    const idempotencyKey = `cron-sync-leaderboard-${dateKey}`
    
    const idempotencyResult = await checkIdempotency(idempotencyKey)
    if (idempotencyResult.exists) {
      console.log(`[Leaderboard Sync] Replaying cached result for key: ${idempotencyKey}`)
      return returnCachedResponse(idempotencyResult)
    }
    
    // Import dependencies
    const { getSupabaseServerClient, isSupabaseConfigured } = await import('@/lib/supabase/edge')
    const { syncSupabaseLeaderboard } = await import('@/lib/leaderboard/leaderboard-sync')
    
    // Verify Supabase configuration
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase environment variables not configured')
    }
    
    const supabase = getSupabaseServerClient()
    if (!supabase) {
      throw new Error('Failed to initialize Supabase client')
    }
    
    // Run sync with custom logger
    const logger = {
      info: (...args: unknown[]) => console.log('[Leaderboard Sync]', ...args),
      error: (...args: unknown[]) => console.error('[Leaderboard Sync]', ...args),
      warn: (...args: unknown[]) => console.warn('[Leaderboard Sync]', ...args),
      debug: (...args: unknown[]) => console.debug('[Leaderboard Sync]', ...args),
    }
    
    const result = await syncSupabaseLeaderboard({ supabase, logger })
    
    const duration = Date.now() - startTime
    console.log(`[Leaderboard Sync] Snapshot sync complete in ${duration}ms`)
    console.log(`[Leaderboard Sync] Result:`, result)
    
    const response = {
      success: true,
      result: {
        globalRows: result.globalRows,
        perChain: result.perChain,
        totalRows: result.totalRows,
        updatedAt: result.updatedAtIso,
      },
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      source_ip: ip, // Audit trail
    }
    
    // Store result for idempotency (24h cache TTL, prevents duplicate snapshots)
    await storeIdempotency(idempotencyKey, response, 200)

    return NextResponse.json(response, { headers: { 'X-Request-ID': requestId } })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`❌ [Leaderboard Sync] Snapshot sync failed from IP ${ip}:`, error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        source_ip: ip, // Audit trail
      },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }
}

/**
 * GET handler for health check (development only)
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  const ip = getClientIp(request)
  
  // Rate limiting on health check too
  const rateLimitResult = await rateLimit(ip, strictLimiter)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'X-Request-ID': requestId } }
    )
  }
  
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'GET method not allowed in production. Use POST with cron secret.' },
      { status: 405, headers: { 'X-Request-ID': requestId } }
    )
  }
  
  // In development, allow health check
  return NextResponse.json({
    status: 'healthy',
    endpoint: '/api/cron/sync-leaderboard',
    method: 'POST',
    authentication: 'Bearer CRON_SECRET',
    schedule: 'Daily at midnight UTC',
    note: 'Creates historical snapshots (different from update-leaderboard which recalculates scores)',
    timestamp: new Date().toISOString(),
  }, { headers: { 'X-Request-ID': requestId } })
}
