#!/usr/bin/env tsx
/**
 * Guild Stats Sync - Standalone Script for GitHub Actions
 * 
 * Migrated from /api/cron/sync-guilds/route.ts to reduce Vercel CPU usage
 * Runs independently via GitHub Actions (no Vercel API overhead)
 */

// @ts-nocheck - Script uses dynamic Supabase types
import { getSupabaseAdminClient } from '../../lib/supabase/edge'

async function syncGuildStats() {
  console.log('🏰 Starting guild stats sync from Subsquid indexer...')
  const startTime = Date.now()
  
  try {
    const supabase = getSupabaseAdminClient()
    if (!supabase) throw new Error('Failed to initialize Supabase client')
    
    // Fetch all guilds
    const { data: guilds, error: guildError } = await supabase
      .from('guilds')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (guildError) throw guildError
    if (!guilds) throw new Error('No guilds found')
    
    console.log(`📊 Found ${guilds.length} guilds to sync`)
    
    let synced = 0
    let failed = 0
    
    for (const guild of guilds) {
      try {
        // Query guild events for stats
        const { data: events, error: eventsError } = await supabase
          .from('guild_events')
          .select('*')
          .eq('guild_id', guild.id)
        
        if (eventsError) throw eventsError
        if (!events) continue
        
        // Calculate stats from events
        const memberCount = events.filter(e => e.event_type === 'MEMBER_JOINED').length -
                           events.filter(e => e.event_type === 'MEMBER_LEFT').length
        
        const totalPoints = events
          .filter(e => e.event_type === 'POINTS_DEPOSITED')
          .reduce((sum, e) => sum + (e.points || 0), 0)
        
        // Calculate guild level
        let level = 1
        if (totalPoints >= 10000) level = 5
        else if (totalPoints >= 5000) level = 4
        else if (totalPoints >= 2000) level = 3
        else if (totalPoints >= 1000) level = 2
        
        // Upsert to cache
        const { error: cacheError } = await supabase
          .from('guild_stats_cache')
          .upsert({
            guild_id: guild.id,
            member_count: memberCount,
            total_points: totalPoints,
            level: level,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'guild_id'
          })
        
        if (cacheError) throw cacheError
        
        synced++
        console.log(`✅ Synced guild ${guild.id}: ${memberCount} members, ${totalPoints} points, level ${level}`)
        
      } catch (error) {
        failed++
        console.error(`❌ Failed to sync guild ${guild.id}:`, error)
      }
    }
    
    const duration = Date.now() - startTime
    console.log(`\n📈 Sync complete:`)
    console.log(`  Total: ${guilds.length}`)
    console.log(`  Synced: ${synced}`)
    console.log(`  Failed: ${failed}`)
    console.log(`  Duration: ${duration}ms`)
    
    process.exit(failed > 0 ? 1 : 0)
    
  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

// Run if executed directly
syncGuildStats()
