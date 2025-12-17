import { NextResponse } from 'next/server'
import { getTelemetrySummary } from '@/lib/utils/telemetry'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/middleware/rate-limit'
import { withErrorHandler } from '@/lib/middleware/error-handler'
import { generateRequestId } from '@/lib/middleware/request-id'

export const runtime = 'nodejs'

export const GET = withErrorHandler(async (request: Request) => {
  const requestId = generateRequestId()
  
  // Apply rate limiting
  const ip = getClientIp(request)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'X-Request-ID': requestId } }
    )
  }

  const payload = await getTelemetrySummary()
  return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Request-ID': requestId,
      },
    })
})
