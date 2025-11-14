import { NextResponse } from 'next/server'

import { listBadgeTemplates } from '@/lib/badges'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const templates = await listBadgeTemplates({ includeInactive: false })
    return NextResponse.json({ ok: true, templates }, {
      headers: { 'cache-control': 's-maxage=60, stale-while-revalidate=120' },
    })
  } catch (error) {
    const message = (error as Error)?.message || 'Failed to load badge templates'
    return NextResponse.json({ ok: false, error: message, templates: [] }, { status: 500 })
  }
}
