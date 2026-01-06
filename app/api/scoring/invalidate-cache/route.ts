/**
 * @file app/api/scoring/invalidate-cache/route.ts
 * @description API endpoint for client-side cache invalidation
 * 
 * Phase: Production Fix - January 6, 2026
 * Issue: Client components (GMButton) cannot directly import server-side cache utilities
 * Solution: Provide API endpoint for cache invalidation from client
 */

import { NextRequest, NextResponse } from 'next/server'
import { invalidateUserScoringCache } from '@/lib/scoring/unified-calculator'

/**
 * POST /api/scoring/invalidate-cache
 * 
 * Invalidate cached scoring data for a user
 * Called from client after GM transactions, quest completions, etc.
 * 
 * @body { address: `0x${string}` }
 * @returns { success: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address } = body

    if (!address || typeof address !== 'string' || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { success: false, error: 'Invalid address format' },
        { status: 400 }
      )
    }

    await invalidateUserScoringCache(address as `0x${string}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[invalidate-cache] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to invalidate cache' },
      { status: 500 }
    )
  }
}
