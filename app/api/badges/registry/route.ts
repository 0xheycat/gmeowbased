import { NextResponse } from 'next/server'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { loadBadgeRegistry } from '@/lib/badges'
import { withErrorHandler } from '@/lib/error-handler'

export const dynamic = 'force-dynamic'

/**
 * GET /api/badges/registry
 * Get the complete badge registry with all tiers and badges
 */
export const GET = withErrorHandler(async (request: Request) => {
  const ip = getClientIp(request)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const registry = loadBadgeRegistry()
  
  return NextResponse.json({
    success: true,
    registry,
  })
})
