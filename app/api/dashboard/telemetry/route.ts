import { NextResponse } from 'next/server'
import { getDashboardTelemetry } from '@/lib/telemetry'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const payload = await getDashboardTelemetry()
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=45, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    console.error('[telemetry] dashboard endpoint failed:', (error as Error)?.message || error)
    return NextResponse.json(
      { ok: false, reason: 'telemetry_unavailable' },
      { status: 503 },
    )
  }
}
