/**
 * GET /api/guild/[guildId]/events
 * 
 * Purpose: Fetch recent guild events for activity feed with cursor-based pagination
 * Method: GET
 * Auth: Optional (public events)
 * Rate Limit: 60 requests/hour
 * 
 * Query Parameters:
 * - limit?: number (default: 50, max: 100)
 * - type?: GuildEventType (filter by event type)
 * - cursor?: string (ISO timestamp for pagination, fetch events older than this)
 * 
 * Response:
 * {
 *   "success": boolean,
 *   "events": GuildEventRecord[],
 *   "total": number,
 *   "nextCursor": string | null,
 *   "hasMore": boolean,
 *   "timestamp": number
 * }
 * 
 * Security Fix (BUG #5 - Dec 24, 2025):
 * - Cursor-based pagination prevents unbounded query DoS attacks
 * - Hard limit of 100 events per request enforced
 * - Follows notifications API pagination pattern
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGuildEvents, formatEventMessage, type GuildEventRecord } from '@/lib/guild/event-logger'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  try {
    const { guildId } = await params
    
    // Validate guild ID
    const guildIdNum = BigInt(guildId)
    if (guildIdNum <= 0n) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid guild ID',
          timestamp: Date.now(),
        },
        { status: 400 }
      )
    }

    // Parse query params
    const { searchParams } = new URL(req.url)
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '50'),
      100
    )
    const eventType = searchParams.get('type')
    const cursor = searchParams.get('cursor') ?? undefined // ISO timestamp for pagination

    // Fetch events with cursor-based pagination
    let events = await getGuildEvents(guildId, limit, cursor)

    // Filter by type if specified
    if (eventType) {
      events = events.filter((event) => event.event_type === eventType)
    }

    // Format events for display
    const formattedEvents = events.map((event) => ({
      ...event,
      formatted_message: formatEventMessage(event),
    }))

    // Calculate next cursor for pagination
    const nextCursor = formattedEvents.length > 0
      ? formattedEvents[formattedEvents.length - 1].created_at
      : null

    return NextResponse.json(
      {
        success: true,
        events: formattedEvents,
        total: events.length,
        nextCursor, // ISO timestamp for fetching next page
        hasMore: events.length === limit, // true if there might be more data
        timestamp: Date.now(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    )
  } catch (error) {
    console.error('[guild-events] Error fetching events:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch guild events',
        events: [],
        total: 0,
        timestamp: Date.now(),
      },
      { status: 500 }
    )
  }
}
