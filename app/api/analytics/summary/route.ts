import { NextResponse } from 'next/server'
import { getTelemetrySummary } from '@/lib/telemetry'

export const runtime = 'nodejs'

export async function GET() {
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
