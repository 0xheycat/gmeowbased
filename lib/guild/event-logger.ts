/**
 * Guild Event Logging System
 * Phase 7.6: Comprehensive Headers + Pattern Consolidation
 * 
 * FEATURES:
 * - Tracks all guild activities (joins, leaves, promotions, treasury operations)
 * - Persists events to Supabase guild_events table
 * - Supports 8 event types (member lifecycle, points operations, guild management)
 * - Provides activity feed data for guild dashboard
 * - Audit trail for guild governance
 * - Graceful degradation on database errors
 * - Formatted event messages for UI display
 * - Chronological event ordering (newest first)
 * - Configurable event limits for pagination
 * 
 * TODO:
 * - Add event streaming via Supabase Realtime
 * - Implement event filtering by type/actor/date
 * - Add event aggregation for analytics (daily/weekly summaries)
 * - Support event pagination with cursors
 * - Add event retention policies (auto-delete old events)
 * - Implement event notifications (push/email for important events)
 * - Add event search with full-text indexing
 * 
 * CRITICAL:
 * - Must use Supabase Admin Client (Service Role Key) for writes
 * - Events are immutable (never update/delete existing events)
 * - Guild ID must be validated before logging
 * - Actor address must be valid Ethereum address
 * 
 * SUGGESTIONS:
 * - Consider event batching for high-volume guilds
 * - Add Redis caching for recent events (5-minute TTL)
 * - Implement event webhooks for external integrations
 * - Add event analytics dashboard (most active guilds, event trends)
 * 
 * AVOID:
 * - Logging sensitive data in metadata (private keys, passwords)
 * - Synchronous event logging (always async, fire-and-forget)
 * - Blocking guild operations on event logging failures
 * - Exposing Service Role Key in client-side code
 * 
 * Created: December 2025
 * Last Modified: December 17, 2025
 * Pattern: Event Sourcing (Audit Log)
 * Quality Gates: GI-13 (Transactional Integrity), GI-22 (Guild System)
 */

import { getSupabaseAdminClient } from '@/lib/supabase/edge'

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
    const supabase = getSupabaseAdminClient()
    
    if (!supabase) {
      console.error('[guild-event-logger] Supabase Admin client not configured')
      return false
    }

    // @ts-expect-error - guild_events table not yet in Database types (pending schema migration)
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
    const supabase = getSupabaseAdminClient()
    
    if (!supabase) {
      console.error('[guild-event-logger] Supabase Admin client not configured')
      return []
    }

    // Note: guild_events table not yet in Database types (pending schema migration)
    // Using type assertion until migration is run
    const { data, error} = await supabase
      .from('guild_events')
      .select('*')
      .eq('guild_id', guildId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[guild-event-logger] Failed to fetch events:', error)
      return []
    }

    return (data || []) as GuildEventRecord[]
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
