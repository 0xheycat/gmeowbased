import { NextResponse } from 'next/server'
import { getTelemetrySummary } from '@/lib/telemetry'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  // Apply rate limiting
  const ip = getClientIp(request)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  try {
    const payload = await getTelemetrySummary()
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    })
  } catch (error) {
    console.error('[telemetry] summary endpoint failed:', (error as Error)?.message || error)
    return NextResponse.json(
      { error: 'telemetry-unavailable' },
      { status: 500 },
    )
  }
}
