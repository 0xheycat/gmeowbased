/**
 * GET /api/guild/[guildId]/events
 * 
 * Purpose: Fetch recent guild events for activity feed
 * Method: GET
 * Auth: Optional (public events)
 * Rate Limit: 60 requests/hour
 * 
 * Query Parameters:
 * - limit?: number (default: 50, max: 100)
 * - type?: GuildEventType (filter by event type)
 * 
 * Response:
 * {
 *   "success": boolean,
 *   "events": GuildEventRecord[],
 *   "total": number,
 *   "timestamp": number
 * }
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

    // Fetch events
    let events = await getGuildEvents(guildId, limit)

    // Filter by type if specified
    if (eventType) {
      events = events.filter((event) => event.event_type === eventType)
    }

    // Format events for display
    const formattedEvents = events.map((event) => ({
      ...event,
      formatted_message: formatEventMessage(event),
    }))

    return NextResponse.json(
      {
        success: true,
        events: formattedEvents,
        total: events.length,
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
