import { NextResponse } from 'next/server'
import { getDashboardTelemetry } from '@/lib/telemetry'
import { withErrorHandler } from '@/lib/error-handler'

export const runtime = 'nodejs'

export const GET = withErrorHandler(async () => {
  const payload = await getDashboardTelemetry()
  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'public, s-maxage=45, stale-while-revalidate=60',
    },
  })
})
