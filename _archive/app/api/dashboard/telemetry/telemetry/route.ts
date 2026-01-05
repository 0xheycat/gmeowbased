import { NextResponse } from 'next/server'
import { getDashboardTelemetry } from '@/lib/utils/telemetry'
import { withErrorHandler } from '@/lib/middleware/error-handler'
import { withTiming } from '@/lib/middleware/timing'
import { getCached } from '@/lib/cache/server'
import { generateRequestId } from '@/lib/middleware/request-id'

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
