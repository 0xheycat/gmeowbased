/**
 * GET /api/guild/[guildId]/events
 * 
 * Purpose: Fetch recent guild events for activity feed from Subsquid (on-chain data)
 * Method: GET
 * Auth: Optional (public events)
 * Data Source: Subsquid GraphQL (blockchain-indexed events)
 * 
 * Query Parameters:
 * - limit?: number (default: 50, max: 100)
 * 
 * Response:
 * {
 *   "success": boolean,
 *   "events": GuildEvent[],
 *   "total": number,
 *   "timestamp": number
 * }
 * 
 * Events Tracked:
 * - MEMBER_JOINED (user joins guild)
 * - POINTS_DEPOSITED (treasury deposits)
 * - POINTS_CLAIMED (treasury claims)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getApolloClient } from '@/lib/apollo-client'
import { gql } from '@apollo/client'

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

    // Fetch on-chain events from Subsquid
    const apolloClient = getApolloClient()
    const { data } = await apolloClient.query({
      query: gql`
        query GetGuildEvents($guildId: String!, $limit: Int!) {
          guildEvents(
            where: { guild: { id_eq: $guildId } }
            orderBy: timestamp_DESC
            limit: $limit
          ) {
            id
            eventType
            user
            amount
            timestamp
          }
        }
      `,
      variables: { 
        guildId: guildId.toString(),
        limit 
      },
      fetchPolicy: 'network-only',
    })

    // Transform Subsquid events to activity feed format
    const events = (data?.guildEvents || []).map((event: any) => {
      const userShort = event.user 
        ? `${event.user.slice(0, 6)}...${event.user.slice(-4)}`
        : 'Unknown'

      let eventType = 'UNKNOWN'
      let description = `${userShort} performed an action`

      // Map Subsquid event types to our format
      switch (event.eventType) {
        case 'JOINED':
          eventType = 'MEMBER_JOINED'
          description = `${userShort} joined the guild`
          break
        case 'LEFT':
          eventType = 'MEMBER_LEFT'
          description = `${userShort} left the guild`
          break
        case 'DEPOSITED':
          eventType = 'POINTS_DEPOSITED'
          const depositAmount = event.amount ? Number(event.amount).toLocaleString() : '0'
          description = `${userShort} deposited ${depositAmount} points`
          break
        case 'CLAIMED':
          eventType = 'POINTS_CLAIMED'
          const claimAmount = event.amount ? Number(event.amount).toLocaleString() : '0'
          description = `${userShort} claimed ${claimAmount} points`
          break
        case 'CREATED':
          eventType = 'GUILD_CREATED'
          description = `${userShort} created the guild`
          break
        case 'UPDATED':
          eventType = 'GUILD_UPDATED'
          description = `${userShort} updated guild settings`
          break
        default:
          eventType = event.eventType || 'UNKNOWN'
          description = `${userShort} ${event.eventType?.toLowerCase() || 'performed an action'}`
      }

      return {
        id: event.id,
        guild_id: guildId,
        event_type: eventType,
        actor_address: event.user,
        amount: event.amount ? event.amount.toString() : null,
        created_at: new Date(parseInt(event.timestamp) * 1000).toISOString(),
        formatted_message: description,
      }
    })

    return NextResponse.json(
      {
        success: true,
        events,
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
