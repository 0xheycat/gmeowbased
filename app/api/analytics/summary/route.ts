import { NextResponse } from 'next/server'
import { getTelemetrySummary } from '@/lib/telemetry'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { withErrorHandler } from '@/lib/error-handler'

export const runtime = 'nodejs'

export const GET = withErrorHandler(async (request: Request) => {
  // Apply rate limiting
  const ip = getClientIp(request)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const payload = await getTelemetrySummary()
  return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    })
})
