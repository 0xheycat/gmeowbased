import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/error-handler'
import { getFarcasterFid } from '@/lib/auth/farcaster'
import { fetchRecentCommunityEvents } from '@/lib/community-events'
import { type CommunityEventType } from '@/lib/community-event-types'

/**
 * User Notifications API
 * 
 * GET /api/notifications - Get user-specific activity notifications
 * 
 * Query params:
 * - limit: number (default: 20, max: 50)
 * - since: ISO timestamp
 * - types: comma-separated event types
 * - unreadOnly: boolean (future: filter by read status)
 * 
 * Returns community events relevant to the authenticated user:
 * - User's own activities
 * - Guild activities (when user is in guild)
 * - Quest completions
 * - Tips received
 * - Badge awards
 * 
 * Source: Reused from old foundation /api/agent/events
 * Updated: Nov 27, 2025 - Tailwick UI integration
 * MCP Ready: Uses community-events.ts
 */

export const runtime = 'nodejs'

function parseLimit(value: string | null): number {
  if (!value) return 20
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 50) : 20
}

function parseTypes(value: string | null): CommunityEventType[] | null {
  if (!value) return null
  const raw = value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)

  if (!raw.length) return null
  return raw as CommunityEventType[]
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  // Get authenticated user FID
  const fid = await getFarcasterFid()
  
  // Optional: Allow unauthenticated access to public feed
  // For now, we'll show all events if not authenticated
  
  const url = new URL(request.url)
  const limit = parseLimit(url.searchParams.get('limit'))
  const since = url.searchParams.get('since')
  const types = parseTypes(url.searchParams.get('types'))
  const unreadOnly = url.searchParams.get('unreadOnly') === 'true'

  // Fetch community events
  const result = await fetchRecentCommunityEvents({
    limit,
    since,
    types,
  })

  // TODO: Future enhancement - filter by user's FID and read status
  // For now, return all events as notifications
  
  return NextResponse.json({
    ok: true,
    notifications: result.events,
    meta: {
      ...result.meta,
      userFid: fid,
      unreadOnly,
      totalCount: result.events.length,
      unreadCount: result.events.length, // TODO: Track read status
    },
    fetchedAt: result.fetchedAt,
    nextCursor: result.nextCursor,
  })
})
