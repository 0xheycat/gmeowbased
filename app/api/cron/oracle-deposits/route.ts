/**
 * Vercel Cron: Automated Oracle Deposits
 * 
 * CRITICAL FIX: Automatically runs oracle deposits every 5 minutes
 * Solves production blocker where guild/viral/referral bonuses require manual execution
 * 
 * Setup in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/oracle-deposits",
 *     "schedule": "every 5 minutes"
 *   }]
 * }
 * 
 * Created: January 12, 2026
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds max execution

/**
 * Vercel Cron Handler
 * Triggered automatically every 5 minutes
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (prevents unauthorized access)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET || 'development-secret'
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error('[Cron] Unauthorized access attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  console.log('[Cron] Starting automated oracle deposits...')
  
  const results = {
    timestamp: new Date().toISOString(),
    pipelines: [] as { name: string; status: string; error?: string }[]
  }

  // Run Guild Bonus Pipeline
  try {
    console.log('[Cron] Running guild bonus deposits...')
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/internal/oracle/deposit-guild-points`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await response.json()
    results.pipelines.push({ 
      name: 'guild', 
      status: response.ok ? 'success' : 'failed',
      error: response.ok ? undefined : data.error 
    })
  } catch (error) {
    console.error('[Cron] Guild pipeline error:', error)
    results.pipelines.push({ 
      name: 'guild', 
      status: 'failed', 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  // Run Viral XP Pipeline
  try {
    console.log('[Cron] Running viral XP deposits...')
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/internal/oracle/deposit-viral-points`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await response.json()
    results.pipelines.push({ 
      name: 'viral', 
      status: response.ok ? 'success' : 'failed',
      error: response.ok ? undefined : data.error 
    })
  } catch (error) {
    console.error('[Cron] Viral pipeline error:', error)
    results.pipelines.push({ 
      name: 'viral', 
      status: 'failed', 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  // TODO: Add other pipelines (Referral, Streak, Badge) when implemented

  const duration = Date.now() - startTime
  console.log(`[Cron] Completed in ${duration}ms:`, results.pipelines)

  return NextResponse.json({
    success: true,
    duration,
    results
  })
}
