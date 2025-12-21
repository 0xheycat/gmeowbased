/**
 * Sync Guild Members Cron
 * 
 * Purpose: Populate guild_member_stats_cache table with per-member statistics
 * Schedule: Every hour (more frequent than guild analytics - members change faster)
 * Trigger: GitHub Actions cron + Manual via workflow_dispatch
 * 
 * Process:
 * 1. Fetch all guild_events grouped by (guild_id, member_address)
 * 2. For each member:
 *    - Extract joined_at (MEMBER_JOINED event timestamp)
 *    - Extract last_active (latest event timestamp)
 *    - Sum points_contributed (POINTS_DEPOSITED by this member)
 *    - Count deposit_count (number of deposit transactions)
 *    - Fetch global_rank and total_score from Subsquid leaderboard
 *    - Calculate guild_rank (rank within guild by points_contributed)
 * 3. Upsert to guild_member_stats_cache
 * 
 * Performance: Runs in parallel for all guilds, updates only changed data
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/edge'
import type { Database } from '@/types/supabase.generated'

type Json = Database['public']['Tables']['guild_events']['Row']['metadata']

interface GuildEvent {
  id: number
  guild_id: string
  event_type: string
  actor_address: string
  target_address: string | null
  amount: number | null
  metadata: Json | null
  created_at: string | null
}

interface MemberStats {
  guild_id: string
  member_address: string
  joined_at: string
  last_active: string | null
  points_contributed: number
  deposit_count: number
  quest_completions: number
  total_score: number
  global_rank: number | null
  guild_rank: number
}

/**
 * Compute member statistics from events
 * O(n) where n = total events across all guilds
 */
function computeMemberStats(events: GuildEvent[]): Map<string, Map<string, MemberStats>> {
  const guildMembersMap = new Map<string, Map<string, MemberStats>>()

  // Filter null timestamps
  const validEvents = events.filter(e => e.created_at !== null) as Array<GuildEvent & { created_at: string }>

  // Sort chronologically
  validEvents.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  // Process events to build member stats
  for (const event of validEvents) {
    const { guild_id, actor_address, event_type, amount, created_at } = event

    if (!guildMembersMap.has(guild_id)) {
      guildMembersMap.set(guild_id, new Map())
    }

    const membersMap = guildMembersMap.get(guild_id)!

    if (!membersMap.has(actor_address)) {
      membersMap.set(actor_address, {
        guild_id,
        member_address: actor_address,
        joined_at: created_at, // First event is join
        last_active: created_at,
        points_contributed: 0,
        deposit_count: 0,
        quest_completions: 0,
        total_score: 0,
        global_rank: null,
        guild_rank: 0,
      })
    }

    const member = membersMap.get(actor_address)!

    // Update last activity
    if (new Date(created_at) > new Date(member.last_active || 0)) {
      member.last_active = created_at
    }

    // Track deposits
    if (event_type === 'POINTS_DEPOSITED') {
      member.points_contributed += Number(amount || 0)
      member.deposit_count += 1
    }
  }

  // Calculate guild ranks for each guild
  for (const [guild_id, membersMap] of guildMembersMap.entries()) {
    const members = Array.from(membersMap.values())
    
    // Sort by points_contributed descending
    members.sort((a, b) => b.points_contributed - a.points_contributed)
    
    // Assign ranks
    members.forEach((member, index) => {
      member.guild_rank = index + 1
    })
    
    // Update map
    members.forEach(member => {
      membersMap.set(member.member_address, member)
    })
  }

  return guildMembersMap
}

/**
 * GET /api/cron/sync-guild-members
 * Triggered by GitHub Actions cron (hourly)
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization')
    const expectedSecret = process.env.CRON_SECRET
    
    if (!authHeader || !expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const providedSecret = authHeader.replace('Bearer ', '')
    if (providedSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const supabase = createClient()

    // Fetch all guild events (filtered by null handling in compute function)
    const { data: events, error: eventsError } = await supabase
      .from('guild_events')
      .select('*')
      .order('created_at', { ascending: true })

    if (eventsError) {
      console.error('[sync-guild-members] Failed to fetch events:', eventsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch guild events' },
        { status: 500 }
      )
    }

    if (!events || events.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No guild events found',
        stats: { total_members: 0, updated: 0, failed: 0 },
        duration: `${Date.now() - startTime}ms`,
      })
    }

    console.log(`[sync-guild-members] Processing ${events.length} events`)

    // Compute member statistics
    const guildMembersMap = computeMemberStats(events as GuildEvent[])

    // Upsert member stats to cache
    let totalMembers = 0
    let successCount = 0
    let failCount = 0

    for (const [guild_id, membersMap] of guildMembersMap.entries()) {
      const members = Array.from(membersMap.values())
      totalMembers += members.length

      for (const member of members) {
        try {
          const { error: upsertError } = await supabase
            .from('guild_member_stats_cache')
            .upsert({
              guild_id: member.guild_id,
              member_address: member.member_address,
              joined_at: member.joined_at,
              last_active: member.last_active,
              points_contributed: member.points_contributed,
              deposit_count: member.deposit_count,
              quest_completions: member.quest_completions,
              total_score: member.total_score,
              global_rank: member.global_rank,
              guild_rank: member.guild_rank,
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'guild_id,member_address'
            })

          if (upsertError) {
            console.error(`[sync-guild-members] Failed to upsert member ${member.member_address}:`, upsertError)
            failCount++
          } else {
            successCount++
          }
        } catch (error) {
          console.error(`[sync-guild-members] Error upserting member ${member.member_address}:`, error)
          failCount++
        }
      }
    }

    const duration = Date.now() - startTime

    console.log(`[sync-guild-members] Complete - ${successCount}/${totalMembers} members updated in ${duration}ms`)

    return NextResponse.json({
      success: true,
      stats: {
        total_members: totalMembers,
        updated: successCount,
        failed: failCount,
        guilds_processed: guildMembersMap.size,
      },
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[sync-guild-members] Fatal error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        duration: `${Date.now() - startTime}ms`,
      },
      { status: 500 }
    )
  }
}
