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
 * 
 * @see scripts/automation/mint-badge-queue.ts for core minting logic
 */

import { NextRequest, NextResponse } from 'next/server'
import { processBatch } from '@/scripts/automation/mint-badge-queue'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes max execution time

/**
 * POST handler for Vercel Cron job
 * Verifies cron secret and triggers mint batch processing
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret) {
      console.error('[Cron] CRON_SECRET not configured')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron] Unauthorized request')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    console.log('[Cron] Starting badge mint batch processing...')
    
    // Process the batch
    const result = await processBatch()
    
    const duration = Date.now() - startTime
    console.log(`[Cron] Batch processing complete in ${duration}ms`)
    console.log(`[Cron] Result:`, result)
    
    return NextResponse.json({
      success: true,
      result,
      duration,
      timestamp: new Date().toISOString(),
    })
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
      { status: 500 }
    )
  }
}

/**
 * GET handler for manual testing
 * Only works in development mode
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'GET method not allowed in production. Use POST with cron secret.' },
      { status: 405 }
    )
  }
  
  console.log('[Cron] Manual test execution (dev mode)')
  return POST(request)
}
