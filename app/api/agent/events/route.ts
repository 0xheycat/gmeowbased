import { NextRequest, NextResponse } from 'next/server'

// @edit-start 2025-02-14 — Agent community events API
import { COMMUNITY_EVENT_TYPES, type CommunityEventType } from '@/lib/community-event-types'
import { fetchRecentCommunityEvents } from '@/lib/community-events'

export const runtime = 'nodejs'

function parseLimit(value: string | null): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function parseTypes(value: string | null): CommunityEventType[] | null {
  if (!value) return null
  const raw = value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)

  if (!raw.length) return null
  const allowed = new Set(COMMUNITY_EVENT_TYPES)
  return raw.filter((entry): entry is CommunityEventType => allowed.has(entry as CommunityEventType))
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const limitParam = parseLimit(url.searchParams.get('limit'))
  const sinceParam = url.searchParams.get('since')
  const typesParam = parseTypes(url.searchParams.get('types'))

  try {
    const result = await fetchRecentCommunityEvents({
      limit: limitParam,
      since: sinceParam,
      types: typesParam,
    })

    return NextResponse.json({
      ok: true,
      events: result.events,
      meta: result.meta,
      fetchedAt: result.fetchedAt,
      nextCursor: result.nextCursor,
    })
  } catch (error) {
    console.error('[agent-events] Failed to fetch community events', error)
    return NextResponse.json(
      {
        ok: false,
        error: 'community-events-failed',
        message: (error as Error)?.message ?? 'Unexpected error',
      },
      { status: 500 },
    )
  }
}
// @edit-end
