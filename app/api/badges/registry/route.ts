import { NextResponse } from 'next/server'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { loadBadgeRegistry } from '@/lib/badges'

export const dynamic = 'force-dynamic'

/**
 * GET /api/badges/registry
 * Get the complete badge registry with all tiers and badges
 */
export async function GET(request: Request) {
  const ip = getClientIp(request)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  try {
    const registry = loadBadgeRegistry()
    
    return NextResponse.json({
      success: true,
      registry,
    })
  } catch (error) {
    console.error('Error loading badge registry:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to load badge registry' 
      },
      { status: 500 }
    )
  }
}
