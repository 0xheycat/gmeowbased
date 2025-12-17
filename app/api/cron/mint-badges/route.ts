/**
 * Vercel Cron Job - Badge Minting Worker
 * 
 * Processes pending badge mints from the mint_queue table.
 * Scheduled to run daily via vercel.json cron configuration.
 * 
 * Endpoint: POST /api/cron/mint-badges
 * Schedule: 0 0 * * * (daily at midnight UTC)
 * 
 * Security:
 * - Verifies CRON_SECRET to prevent unauthorized execution
 * - Only processes pending mints (status: 'pending')
 * - Handles retries for failed mints (max 3 attempts)
 * - Idempotency prevents double gas costs on retry
 * 
 * Idempotency: CRITICAL - Prevents double minting (2x gas costs)
 * Key format: cron-mint-badges-YYYYMMDD-HH (24h cache TTL)
 * 
 * @see scripts/automation/mint-badge-queue.ts for core minting logic
 */

import { NextRequest, NextResponse } from 'next/server'
import { processBatch } from '@/scripts/automation/mint-badge-queue'
import { checkIdempotency, storeIdempotency, returnCachedResponse } from '@/lib/middleware/idempotency'
import { generateRequestId } from '@/lib/middleware/request-id'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes max execution time

/**
 * POST handler for Vercel Cron job
 * Verifies cron secret and triggers mint batch processing
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  const startTime = Date.now()
  
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret) {
      console.error('[Cron] CRON_SECRET not configured')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500, headers: { 'X-Request-ID': requestId } }
      )
    }
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron] Unauthorized request')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: { 'X-Request-ID': requestId } }
      )
    }
    
    console.log('[Cron] Starting badge mint batch processing...')
    
    // Idempotency check (CRITICAL - prevents double gas costs)
    const now = new Date()
    const dateKey = now.toISOString().slice(0, 13).replace(/[-:T]/g, '') // YYYYMMDDHH
    const idempotencyKey = `cron-mint-badges-${dateKey}`
    
    const idempotencyResult = await checkIdempotency(idempotencyKey)
    if (idempotencyResult.exists) {
      console.log(`[Cron] Replaying cached result for key: ${idempotencyKey} (prevented double mint)`)
      return returnCachedResponse(idempotencyResult)
    }
    
    // Process the batch
    const result = await processBatch()
    
    const duration = Date.now() - startTime
    console.log(`[Cron] Batch processing complete in ${duration}ms`)
    console.log(`[Cron] Result:`, result)
    
    const response = {
      success: true,
      result,
      duration,
      timestamp: new Date().toISOString(),
    }
    
    // Store result for idempotency (24h cache TTL, prevents double mint)
    await storeIdempotency(idempotencyKey, response, 200)
    
    return NextResponse.json(response, { headers: { 'X-Request-ID': requestId } })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[Cron] Batch processing error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        timestamp: new Date().toISOString(),
      },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }
}

/**
 * GET handler for manual testing
 * Only works in development mode
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'GET method not allowed in production. Use POST with cron secret.' },
      { status: 405, headers: { 'X-Request-ID': requestId } }
    )
  }
  
  console.log('[Cron] Manual test execution (dev mode)')
  return POST(request)
}
