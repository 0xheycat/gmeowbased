/**
 * Manual Badge Minting Trigger
 * 
 * Allows manual triggering of badge minting for immediate processing.
 * Use this when you need to mint badges without waiting for the daily cron.
 * 
 * Endpoint: POST /api/badges/mint-manual
 * 
 * Security:
 * - Requires ADMIN_ACCESS_CODE for authorization
 * - Rate limited via strictLimiter (10 req/min)
 * - Idempotency prevents double gas costs on retry
 * 
 * Idempotency: CRITICAL - Prevents double minting (2x gas costs)
 * Header-based (Idempotency-Key) or timestamp-based fallback
 * 
 * Usage:
 * curl -X POST https://gmeowhq.art/api/badges/mint-manual \
 *   -H "Authorization: Bearer YOUR_ADMIN_ACCESS_CODE" \
 *   -H "Idempotency-Key: unique-request-id" \
 *   -H "Content-Type: application/json" \
 *   -d '{"limit": 10}'
 */

import { NextRequest, NextResponse } from 'next/server'
import { processBatch } from '@/scripts/automation/mint-badge-queue'
import { rateLimit, strictLimiter } from '@/lib/rate-limit'
import { z } from 'zod'
import { checkIdempotency, storeIdempotency, returnCachedResponse, getIdempotencyKey } from '@/lib/idempotency'
import { generateRequestId } from '@/lib/request-id'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes max execution time

/**
 * Request schema
 */
const ManualMintSchema = z.object({
  limit: z.number().int().positive().max(50).optional().default(10),
  dryRun: z.boolean().optional().default(false),
})

/**
 * POST handler for manual badge minting
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  const startTime = Date.now()
  
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
    const { success: rateLimitSuccess } = await rateLimit(ip, strictLimiter)
    
    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'X-Request-ID': requestId } }
      )
    }
    
    // Verify admin authorization
    const authHeader = request.headers.get('authorization')
    const adminAccessCode = process.env.ADMIN_ACCESS_CODE
    
    if (!adminAccessCode) {
      console.error('[Manual Mint] ADMIN_ACCESS_CODE not configured')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500, headers: { 'X-Request-ID': requestId } }
      )
    }
    
    if (authHeader !== `Bearer ${adminAccessCode}`) {
      console.error('[Manual Mint] Unauthorized request from IP:', ip)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: { 'X-Request-ID': requestId } }
      )
    }
    
    // Parse and validate request body
    const body = await request.json().catch(() => ({}))
    const { limit, dryRun } = ManualMintSchema.parse(body)
    
    // Idempotency check (CRITICAL - prevents double gas costs)
    const baseKey = getIdempotencyKey(request)
    const idempotencyKey = baseKey || `mint-manual-${Date.now()}`
    
    const idempotencyResult = await checkIdempotency(idempotencyKey)
    if (idempotencyResult.exists) {
      console.log(`[Manual Mint] Replaying cached response for key: ${idempotencyKey} (prevented double mint)`);
      return returnCachedResponse(idempotencyResult);
    }
    
    console.log('[Manual Mint] Starting manual mint batch processing...')
    console.log('[Manual Mint] Limit:', limit)
    console.log('[Manual Mint] Dry run:', dryRun)
    
    if (dryRun) {
      return NextResponse.json({
        success: true,
        message: 'Dry run - no mints processed',
        limit,
        timestamp: new Date().toISOString(),
      }, { headers: { 'X-Request-ID': requestId } })
    }
    
    // Process the batch
    const result = await processBatch()
    
    const duration = Date.now() - startTime
    console.log(`[Manual Mint] Batch processing complete in ${duration}ms`)
    console.log(`[Manual Mint] Result:`, result)
    
    const response = {
      success: true,
      result,
      duration,
      limit,
      timestamp: new Date().toISOString(),
    }
    
    // Store result for idempotency (24h cache TTL, prevents double gas costs)
    await storeIdempotency(idempotencyKey, response, 200)
    
    return NextResponse.json(response, { headers: { 'X-Request-ID': requestId } })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[Manual Mint] Batch processing error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: error.issues,
          duration,
          timestamp: new Date().toISOString(),
        },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      )
    }
    
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
 * GET handler for status check
 */
export async function GET() {
  const requestId = generateRequestId()
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/badges/mint-manual',
    method: 'POST',
    description: 'Manually trigger badge minting batch processing',
    auth: 'Bearer ADMIN_ACCESS_CODE',
    body: {
      limit: 'number (optional, default: 10, max: 50)',
      dryRun: 'boolean (optional, default: false)',
    },
    rateLimit: '10 requests per minute (strictLimiter)',
  }, { headers: { 'X-Request-ID': requestId } })
}
