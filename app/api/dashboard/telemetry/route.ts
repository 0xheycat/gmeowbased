import { NextResponse } from 'next/server'
import { getDashboardTelemetry } from '@/lib/telemetry'
import { withErrorHandler } from '@/lib/error-handler'
import { withTiming } from '@/lib/middleware/timing'
import { getCached } from '@/lib/cache'
import { generateRequestId } from '@/lib/request-id'

export const runtime = 'nodejs'

export const GET = withTiming(withErrorHandler(async () => {
  const requestId = generateRequestId()
  const payload = await getCached(
    'dashboard-telemetry',
    'current',
    () => getDashboardTelemetry(),
    { ttl: 45 }
  )
  
  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'public, s-maxage=45, stale-while-revalidate=60',
      'X-Request-ID': requestId
    },
  })
}))
