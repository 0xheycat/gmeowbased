/**
 * Guild Stats Sync Cron Endpoint
 * 
 * PURPOSE:
 * Syncs guild stats from Subsquid indexer + guild_events to cache tables:
 * - guild_stats_cache: Basic stats for guild list API
 * - guild_analytics_cache: Advanced analytics for guild dashboard
 * 
 * DATA FLOW:
 * 1. Query Subsquid for on-chain stats (members, points from blockchain)
 * 2. Query guild_events for aggregated activity (MEMBER_JOINED/LEFT, POINTS_DEPOSITED/CLAIMED)
 * 3. Calculate level from total points (1000/2000/5000/10000 thresholds)
 * 4. Compute analytics: time-series, top contributors, growth rates
 * 5. Upsert to guild_stats_cache + guild_analytics_cache tables
 * 
 * ARCHITECTURE:
 * - On-chain data (Subsquid): memberCount, totalPoints, treasury from blockchain events
 * - Off-chain events (Supabase): guild_events table for activity tracking
 * - Cache layers (Supabase): 
 *   * guild_stats_cache for fast queries (basic stats)
 *   * guild_analytics_cache for analytics dashboard (time-series, charts)
 * 
 * Called by GitHub Actions workflow every 6 hours
 * Idempotency: Prevents double execution on retry
 * Key format: cron-sync-guilds-YYYYMMDD-HH (24h cache TTL)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/edge'
import { checkIdempotency, storeIdempotency, returnCachedResponse } from '@/lib/middleware/idempotency'
import { generateRequestId } from '@/lib/middleware/request-id'
import { getSubsquidClient } from '@/lib/subsquid-client'
import type { Database } from '@/types/supabase.generated'

type Json = Database['public']['Tables']['guild_events']['Row']['metadata']

interface GuildEvent {
  id: number
  guild_id: string
  event_type: string
  actor_address: string
  target_address: string | null
  amount: number | null
  metadata: Json
  created_at: string | null
}

interface GuildSyncResult {
  guildId: string
  hasMetadata: boolean
  memberCount: number
  totalPoints: number
  level: number
  treasuryBalance: number
  isActive: boolean
  leaderAddress?: string
  synced: boolean
}

// Calculate guild level from total points
function calculateGuildLevel(totalPoints: number): number {
  if (totalPoints >= 10000) return 4
  if (totalPoints >= 5000) return 3
  if (totalPoints >= 2000) return 2
  if (totalPoints >= 1000) return 1
  return 1
}

// Compute analytics from guild_events for guild_analytics_cache
interface GuildAnalytics {
  total_members: number
  total_deposits: number
  total_claims: number
  treasury_balance: number
  avg_points_per_member: number
  members_7d_growth: number
  points_7d_growth: number
  treasury_7d_growth: number
  top_contributors: Array<{ address: string; points: number; rank: number }>
  member_growth_series: Array<{ date: string; count: number }>
  treasury_flow_series: Array<{ date: string; deposits: number; claims: number; balance: number }>
  activity_timeline: Array<{ date: string; joins: number; deposits: number; claims: number }>
}

function computeGuildAnalytics(events: GuildEvent[]): GuildAnalytics {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Filter out events with null created_at
  const validEvents = events.filter(e => e.created_at !== null) as Array<GuildEvent & { created_at: string }>

  // 1. Aggregate totals
  let runningMemberCount = 0
  let totalDeposits = 0
  let totalClaims = 0
  
  const contributorMap = new Map<string, number>()
  const memberCountByDay = new Map<string, number>()
  const treasuryByDay = new Map<string, { deposits: number; claims: number }>()
  const activityByDay = new Map<string, { joins: number; deposits: number; claims: number }>()

  // Process events chronologically
  const sortedEvents = [...validEvents].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  for (const event of sortedEvents) {
    const eventDate = new Date(event.created_at)
    const dateStr = eventDate.toISOString().split('T')[0] // "2025-12-21"

    // Track member count
    if (event.event_type === 'MEMBER_JOINED') {
      runningMemberCount++
      const activity = activityByDay.get(dateStr) || { joins: 0, deposits: 0, claims: 0 }
      activity.joins++
      activityByDay.set(dateStr, activity)
    } else if (event.event_type === 'MEMBER_LEFT') {
      runningMemberCount--
    }
    
    // Store daily member count
    memberCountByDay.set(dateStr, Math.max(0, runningMemberCount))

    // Track deposits
    if (event.event_type === 'POINTS_DEPOSITED' && event.amount) {
      const amount = Number(event.amount)
      totalDeposits += amount
      
      // Top contributors
      contributorMap.set(
        event.actor_address,
        (contributorMap.get(event.actor_address) || 0) + amount
      )
      
      // Treasury flow
      const treasury = treasuryByDay.get(dateStr) || { deposits: 0, claims: 0 }
      treasury.deposits += amount
      treasuryByDay.set(dateStr, treasury)

      // Activity
      const activity = activityByDay.get(dateStr) || { joins: 0, deposits: 0, claims: 0 }
      activity.deposits++
      activityByDay.set(dateStr, activity)
    }

    // Track claims
    if (event.event_type === 'POINTS_CLAIMED' && event.amount) {
      const amount = Number(event.amount)
      totalClaims += amount
      
      // Treasury flow
      const treasury = treasuryByDay.get(dateStr) || { deposits: 0, claims: 0 }
      treasury.claims += amount
      treasuryByDay.set(dateStr, treasury)

      // Activity
      const activity = activityByDay.get(dateStr) || { joins: 0, deposits: 0, claims: 0 }
      activity.claims++
      activityByDay.set(dateStr, activity)
    }
  }

  // 2. Top contributors (top 10)
  const top_contributors = Array.from(contributorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([address, points], idx) => ({
      address,
      points,
      rank: idx + 1
    }))

  // 3. Member growth series (last 30 days)
  const member_growth_series = Array.from(memberCountByDay.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30) // Last 30 days

  // 4. Treasury flow series (last 30 days)
  let balance = 0
  const treasury_flow_series = Array.from(treasuryByDay.entries())
    .map(([date, { deposits, claims }]) => {
      balance += deposits - claims
      return { date, deposits, claims, balance }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30) // Last 30 days

  // 5. Activity timeline (last 30 days)
  const activity_timeline = Array.from(activityByDay.entries())
    .map(([date, { joins, deposits, claims }]) => ({
      date,
      joins,
      deposits,
      claims
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30) // Last 30 days

  // 6. Growth metrics (7-day)
  const members_7d_growth = sortedEvents
    .filter(e => {
      const eventDate = new Date(e.created_at)
      return eventDate >= sevenDaysAgo && ['MEMBER_JOINED', 'MEMBER_LEFT'].includes(e.event_type)
    })
    .reduce((sum, e) => sum + (e.event_type === 'MEMBER_JOINED' ? 1 : -1), 0)

  const points_7d_growth = sortedEvents
    .filter(e => {
      const eventDate = new Date(e.created_at)
      return eventDate >= sevenDaysAgo && e.event_type === 'POINTS_DEPOSITED'
    })
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)

  const treasury_7d_growth = sortedEvents
    .filter(e => {
      const eventDate = new Date(e.created_at)
      return eventDate >= sevenDaysAgo && ['POINTS_DEPOSITED', 'POINTS_CLAIMED'].includes(e.event_type)
    })
    .reduce((sum, e) => {
      const delta = e.event_type === 'POINTS_DEPOSITED' ? (Number(e.amount) || 0) : -(Number(e.amount) || 0)
      return sum + delta
    }, 0)

  const treasuryBalance = totalDeposits - totalClaims
  const avgPointsPerMember = runningMemberCount > 0 ? Math.floor(totalDeposits / runningMemberCount) : 0

  return {
    total_members: Math.max(0, runningMemberCount),
    total_deposits: totalDeposits,
    total_claims: totalClaims,
    treasury_balance: treasuryBalance,
    avg_points_per_member: avgPointsPerMember,
    members_7d_growth,
    points_7d_growth,
    treasury_7d_growth,
    top_contributors,
    member_growth_series,
    treasury_flow_series,
    activity_timeline
  }
}


export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  const startTime = Date.now()

  try {
    // 1. Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or missing cron secret' },
        { status: 401, headers: { 'X-Request-ID': requestId } }
      )
    }

    // 2. Idempotency check (prevents double execution)
    const now = new Date()
    const dateKey = now.toISOString().slice(0, 13).replace(/[-:T]/g, '') // YYYYMMDDHH
    const idempotencyKey = `cron-sync-guilds-${dateKey}`
    
    const idempotencyResult = await checkIdempotency(idempotencyKey)
    if (idempotencyResult.exists) {
      console.log(`[Guild Sync] Replaying cached result for key: ${idempotencyKey}`)
      return returnCachedResponse(idempotencyResult)
    }

    // 3. Initialize clients
    const subsquid = getSubsquidClient()
    const supabase = getSupabaseAdminClient()
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to initialize Supabase client' },
        { status: 500, headers: { 'X-Request-ID': requestId } }
      )
    }

    // 4. Get all guild metadata from Supabase (contains guild IDs)
    const { data: guildMetadata, error: metadataError } = await supabase
      .from('guild_metadata')
      .select('guild_id, name, description, banner')
      .order('guild_id', { ascending: true })

    if (metadataError) {
      console.error('[Guild Sync] Failed to fetch guild metadata:', metadataError)
      return NextResponse.json(
        { error: 'Database error', message: metadataError.message },
        { status: 500, headers: { 'X-Request-ID': requestId } }
      )
    }

    if (!guildMetadata || guildMetadata.length === 0) {
      const response = {
        success: true,
        message: 'No guilds to sync',
        stats: { total: 0, synced: 0, failed: 0 },
        duration: `${Date.now() - startTime}ms`,
      }
      
      await storeIdempotency(idempotencyKey, response, 200)
      return NextResponse.json(response, { headers: { 'X-Request-ID': requestId } })
    }

    // 5. Sync each guild's stats and populate cache
    const results: GuildSyncResult[] = []
    const errors: string[] = []

    for (const metadata of guildMetadata) {
      try {
        // Query Subsquid for on-chain guild stats
        const guildStats = await subsquid.getGuildStats(metadata.guild_id)

        if (!guildStats) {
          errors.push(`Guild ${metadata.guild_id}: No stats found in Subsquid indexer`)
          results.push({
            guildId: metadata.guild_id,
            hasMetadata: true,
            memberCount: 0,
            totalPoints: 0,
            level: 1,
            treasuryBalance: 0,
            isActive: false,
            synced: false,
          })
          continue
        }

        // Calculate additional stats from guild_events
        const { data: events } = await supabase
          .from('guild_events')
          .select('*')
          .eq('guild_id', metadata.guild_id)
          .order('created_at', { ascending: true })
          .returns<GuildEvent[]>()

        // Aggregate event-based stats
        let eventMemberCount = 0
        let eventTotalPoints = 0
        let leaderAddress: string | undefined

        if (events && events.length > 0) {
          // Compute analytics from events
          const analytics = computeGuildAnalytics(events as GuildEvent[])

          // Calculate event-based totals for fallback
          for (const event of events) {
            if (event.event_type === 'MEMBER_JOINED') eventMemberCount++
            if (event.event_type === 'MEMBER_LEFT') eventMemberCount--
            
            if (event.event_type === 'POINTS_DEPOSITED' && event.amount) {
              eventTotalPoints += Number(event.amount) || 0
            }
            if (event.event_type === 'POINTS_CLAIMED' && event.amount) {
              eventTotalPoints -= Number(event.amount) || 0
            }

            // Get leader from most recent GUILD_CREATED event
            const eventMeta = event.metadata as Record<string, any> | null
            if (event.event_type === 'GUILD_CREATED' && eventMeta?.leader_address) {
              leaderAddress = eventMeta.leader_address as string
            }
          }

          // Upsert analytics cache
          const { error: analyticsError } = await supabase
            .from('guild_analytics_cache')
            .upsert({
              guild_id: metadata.guild_id,
              total_members: analytics.total_members,
              total_deposits: analytics.total_deposits,
              total_claims: analytics.total_claims,
              treasury_balance: analytics.treasury_balance,
              avg_points_per_member: analytics.avg_points_per_member,
              members_7d_growth: analytics.members_7d_growth,
              points_7d_growth: analytics.points_7d_growth,
              treasury_7d_growth: analytics.treasury_7d_growth,
              top_contributors: JSON.stringify(analytics.top_contributors),
              member_growth_series: JSON.stringify(analytics.member_growth_series),
              treasury_flow_series: JSON.stringify(analytics.treasury_flow_series),
              activity_timeline: JSON.stringify(analytics.activity_timeline),
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'guild_id'
            })

          if (analyticsError) {
            console.error(`[Guild Sync] Analytics cache error for guild ${metadata.guild_id}:`, analyticsError)
          } else {
            console.log(`[Guild Sync] Analytics cached for guild ${metadata.guild_id}: ${analytics.total_members} members, ${analytics.top_contributors.length} contributors`)
          }
        }

        // Use Subsquid stats as primary source, fall back to events if needed
        const finalMemberCount = guildStats.totalMembers || eventMemberCount
        const finalTreasuryPoints = Number(guildStats.treasuryPoints) || eventTotalPoints
        const level = calculateGuildLevel(finalTreasuryPoints)
        const treasuryBalance = Number(guildStats.treasuryPoints) || 0
        const isActive = finalMemberCount > 0
        const finalLeaderAddress = guildStats.owner || leaderAddress

        // Upsert into guild_stats_cache
        const { error: cacheError } = await supabase
          .from('guild_stats_cache')
          .upsert({
            guild_id: metadata.guild_id,
            member_count: finalMemberCount,
            treasury_points: finalTreasuryPoints,
            level,
            treasury_balance: treasuryBalance,
            is_active: isActive,
            leader_address: finalLeaderAddress,
            last_synced_at: new Date().toISOString(),
          }, {
            onConflict: 'guild_id'
          })

        if (cacheError) {
          errors.push(`Guild ${metadata.guild_id}: Cache update failed - ${cacheError.message}`)
          console.error(`[Guild Sync] Cache error for guild ${metadata.guild_id}:`, cacheError)
        }

        console.log(`[Guild Sync] Guild ${metadata.guild_id}: ${finalMemberCount} members, ${finalTreasuryPoints} treasury points, level ${level}`)

        results.push({
          guildId: metadata.guild_id,
          hasMetadata: true,
          memberCount: finalMemberCount,
          totalPoints: finalTreasuryPoints,
          level,
          treasuryBalance,
          isActive,
          leaderAddress: finalLeaderAddress,
          synced: !cacheError,
        })

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Guild ${metadata.guild_id}: ${errorMsg}`)
        console.error(`[Guild Sync] Error syncing guild ${metadata.guild_id}:`, error)
        
        results.push({
          guildId: metadata.guild_id,
          hasMetadata: true,
          memberCount: 0,
          totalPoints: 0,
          level: 1,
          treasuryBalance: 0,
          isActive: false,
          synced: false,
        })
      }
    }

    const syncedCount = results.filter(r => r.synced).length
    const duration = Date.now() - startTime

    // 6. Return results
    const response = {
      success: true,
      message: 'Guild stats sync completed',
      stats: {
        total: guildMetadata.length,
        synced: syncedCount,
        failed: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      note: 'Guild stats are indexed by Subsquid (read-only). This sync verifies data availability.',
    }
    
    // Store result for idempotency (24h cache TTL)
    await storeIdempotency(idempotencyKey, response, 200)
    
    return NextResponse.json(response, { headers: { 'X-Request-ID': requestId } })
    
  } catch (error) {
    console.error('[Guild Sync] Fatal error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: `${Date.now() - startTime}ms`,
      },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }
}

// Prevent caching
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

