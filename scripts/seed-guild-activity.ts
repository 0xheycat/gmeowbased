/**
 * Seed Guild Activity Script
 * 
 * Purpose: Create sample guild activity events for testing
 * Usage: tsx scripts/seed-guild-activity.ts
 */

import { getSupabaseAdminClient } from '@/lib/supabase/edge'

interface EventData {
  guild_id: string
  event_type: 'MEMBER_JOINED' | 'MEMBER_LEFT' | 'POINTS_DEPOSITED' | 'POINTS_CLAIMED' | 'GUILD_CREATED'
  actor_address: string
  target_address?: string
  amount?: number
  metadata?: Record<string, any>
  created_at: string // ISO 8601 string for Supabase
}

async function seedGuildActivity() {
  const supabase = getSupabaseAdminClient()
  
  if (!supabase) {
    console.error('❌ Supabase admin client not configured')
    process.exit(1)
  }

  console.log('🌱 Seeding guild activity events...')

  // Sample addresses
  const addresses = [
    '0x8a3094e44577579d6f41F6214a86C250b7dBDC4e', // Your address
    '0x8870c155666809609176260f2b65a626c000d773',
    '0x1234567890123456789012345678901234567890',
    '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  ]

  const now = new Date()
  const events: EventData[] = []

  // Guild 1 events (last 7 days)
  events.push({
    guild_id: '1',
    event_type: 'GUILD_CREATED',
    actor_address: addresses[1],
    created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    metadata: { guild_name: 'Test Guild' },
  })

  // Member joins (6 days ago to 1 hour ago)
  events.push({
    guild_id: '1',
    event_type: 'MEMBER_JOINED',
    actor_address: addresses[0],
    created_at: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days ago
    metadata: { guild_name: 'Test Guild', username: 'heycat' },
  })

  events.push({
    guild_id: '1',
    event_type: 'MEMBER_JOINED',
    actor_address: addresses[1],
    created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    metadata: { guild_name: 'Test Guild', username: 'member2' },
  })

  events.push({
    guild_id: '1',
    event_type: 'MEMBER_JOINED',
    actor_address: addresses[2],
    created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    metadata: { guild_name: 'Test Guild', username: 'newbie123' },
  })

  // Deposits (4 days ago to 2 hours ago)
  events.push({
    guild_id: '1',
    event_type: 'POINTS_DEPOSITED',
    actor_address: addresses[0],
    amount: 1000,
    created_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
    metadata: { guild_name: 'Test Guild' },
  })

  events.push({
    guild_id: '1',
    event_type: 'POINTS_DEPOSITED',
    actor_address: addresses[1],
    amount: 2500,
    created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    metadata: { guild_name: 'Test Guild' },
  })

  events.push({
    guild_id: '1',
    event_type: 'POINTS_DEPOSITED',
    actor_address: addresses[0],
    amount: 500,
    created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    metadata: { guild_name: 'Test Guild' },
  })

  // Claims (1 day ago)
  events.push({
    guild_id: '1',
    event_type: 'POINTS_CLAIMED',
    actor_address: addresses[2],
    amount: 250,
    created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    metadata: { guild_name: 'Test Guild' },
  })

  // Recent activity (last few hours)
  events.push({
    guild_id: '1',
    event_type: 'MEMBER_JOINED',
    actor_address: addresses[3],
    created_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    metadata: { guild_name: 'Test Guild', username: 'latest_member' },
  })

  events.push({
    guild_id: '1',
    event_type: 'POINTS_DEPOSITED',
    actor_address: addresses[3],
    amount: 100,
    created_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30 mins ago
    metadata: { guild_name: 'Test Guild' },
  })

  // Insert all events
  const { data, error } = await supabase
    .from('guild_events')
    .insert(events)
    .select()

  if (error) {
    console.error('❌ Failed to seed events:', error)
    process.exit(1)
  }

  console.log(`✅ Seeded ${data?.length || 0} guild events`)
  console.log('\n📊 Event Summary:')
  const summary = events.reduce((acc, event) => {
    acc[event.event_type] = (acc[event.event_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  Object.entries(summary).forEach(([type, count]) => {
    console.log(`  - ${type}: ${count}`)
  })

  console.log('\n✅ Done! Check activity feed at /guild/1')
}

seedGuildActivity().catch(console.error)
