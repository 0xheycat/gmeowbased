/**
 * Guild Event Logging System
 * 
 * Tracks all guild activities for analytics, activity feed, and audit trails.
 * Uses Supabase for persistence, graceful degradation on errors.
 * 
 * Event Types:
 * - MEMBER_JOINED: User joins guild
 * - MEMBER_LEFT: User leaves guild
 * - MEMBER_PROMOTED: Member promoted to officer
 * - MEMBER_DEMOTED: Officer demoted to member
 * - POINTS_DEPOSITED: Points deposited into guild treasury
 * - POINTS_CLAIMED: Guild owner claims points
 * - GUILD_CREATED: New guild created
 * - GUILD_UPDATED: Guild settings changed
 */

import { createClient } from '@supabase/supabase-js'

export type GuildEventType =
  | 'MEMBER_JOINED'
  | 'MEMBER_LEFT'
  | 'MEMBER_PROMOTED'
  | 'MEMBER_DEMOTED'
  | 'POINTS_DEPOSITED'
  | 'POINTS_CLAIMED'
  | 'GUILD_CREATED'
  | 'GUILD_UPDATED'

export interface GuildEvent {
  guild_id: string
  event_type: GuildEventType
  actor_address: string
  target_address?: string
  amount?: number
  metadata?: Record<string, any>
}

export interface GuildEventRecord extends GuildEvent {
  id: number
  created_at: string
}

/**
 * Log a guild event to Supabase
 * 
 * @param event - Event data to log
 * @returns Promise<boolean> - true if logged successfully, false on error
 */
export async function logGuildEvent(event: GuildEvent): Promise<boolean> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('[guild-event-logger] Missing Supabase credentials')
      return false
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { error } = await supabase.from('guild_events').insert({
      guild_id: event.guild_id,
      event_type: event.event_type,
      actor_address: event.actor_address,
      target_address: event.target_address,
      amount: event.amount,
      metadata: event.metadata,
    })

    if (error) {
      console.error('[guild-event-logger] Failed to log event:', error)
      return false
    }

    console.log(`[guild-event-logger] Logged ${event.event_type} for guild ${event.guild_id}`)
    return true
  } catch (error) {
    console.error('[guild-event-logger] Unexpected error:', error)
    return false
  }
}

/**
 * Fetch recent guild events
 * 
 * @param guildId - Guild ID to fetch events for
 * @param limit - Max events to return (default: 50)
 * @returns Promise<GuildEventRecord[]>
 */
export async function getGuildEvents(
  guildId: string,
  limit: number = 50
): Promise<GuildEventRecord[]> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('[guild-event-logger] Missing Supabase credentials')
      return []
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase
      .from('guild_events')
      .select('*')
      .eq('guild_id', guildId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[guild-event-logger] Failed to fetch events:', error)
      return []
    }

    return data as GuildEventRecord[]
  } catch (error) {
    console.error('[guild-event-logger] Unexpected error:', error)
    return []
  }
}

/**
 * Format event for display in activity feed
 * 
 * @param event - Event record from database
 * @returns Formatted message string
 */
export function formatEventMessage(event: GuildEventRecord): string {
  const actorShort = `${event.actor_address.slice(0, 6)}...${event.actor_address.slice(-4)}`
  const targetShort = event.target_address
    ? `${event.target_address.slice(0, 6)}...${event.target_address.slice(-4)}`
    : null

  switch (event.event_type) {
    case 'MEMBER_JOINED':
      return `${actorShort} joined the guild`
    case 'MEMBER_LEFT':
      return `${actorShort} left the guild`
    case 'MEMBER_PROMOTED':
      return `${actorShort} promoted ${targetShort} to officer`
    case 'MEMBER_DEMOTED':
      return `${actorShort} demoted ${targetShort} to member`
    case 'POINTS_DEPOSITED':
      return `${actorShort} deposited ${event.amount?.toLocaleString()} points`
    case 'POINTS_CLAIMED':
      return `${actorShort} claimed ${event.amount?.toLocaleString()} points`
    case 'GUILD_CREATED':
      return `${actorShort} created the guild`
    case 'GUILD_UPDATED':
      return `${actorShort} updated guild settings`
    default:
      return `${actorShort} performed an action`
  }
}
