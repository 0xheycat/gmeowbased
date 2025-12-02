#!/usr/bin/env tsx

/**
 * Seed Leaderboard Mock Data
 * 
 * Purpose: Generate realistic mock data for visual review of leaderboard UI
 * Status: TEMPORARY - Will be reset when moving to production
 * 
 * Usage:
 *   pnpm tsx scripts/seed-leaderboard-mock.ts
 * 
 * This script creates 25 mock users with varied scores to test:
 * - Trophy icons for top 3
 * - 12-tier rank system display
 * - Rank change indicators (up/down arrows)
 * - Pagination (page 1: ranks 1-15, page 2: ranks 16-25)
 * - Score breakdowns (viral XP, guild, referral, badges)
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const mockUsers = [
  // Top 3 (Trophy winners)
  {
    address: '0x1234567890123456789012345678901234567890',
    farcaster_fid: 18139,
    viral_xp: 450000,
    guild_bonus: 5000,
    referral_bonus: 25000,
    badge_prestige: 7500,
    rank_tier: 'Omniversal Being',
    global_rank: 1,
    rank_change: 0,
  },
  {
    address: '0x2345678901234567890123456789012345678902',
    farcaster_fid: 12345,
    viral_xp: 320000,
    guild_bonus: 4500,
    referral_bonus: 18000,
    badge_prestige: 6000,
    rank_tier: 'Infinite GM',
    global_rank: 2,
    rank_change: 1,
  },
  {
    address: '0x3456789012345678901234567890123456789013',
    farcaster_fid: 45678,
    viral_xp: 185000,
    guild_bonus: 3800,
    referral_bonus: 12000,
    badge_prestige: 4500,
    rank_tier: 'Singularity Prime',
    global_rank: 3,
    rank_change: -1,
  },
  
  // Top 10 (High performers)
  {
    address: '0x4567890123456789012345678901234567890124',
    farcaster_fid: 23456,
    viral_xp: 92000,
    guild_bonus: 3200,
    referral_bonus: 9500,
    badge_prestige: 3200,
    rank_tier: 'Void Walker',
    global_rank: 4,
    rank_change: 2,
  },
  {
    address: '0x5678901234567890123456789012345678901235',
    farcaster_fid: 34567,
    viral_xp: 78000,
    guild_bonus: 2800,
    referral_bonus: 7500,
    badge_prestige: 2800,
    rank_tier: 'Cosmic Architect',
    global_rank: 5,
    rank_change: 0,
  },
  {
    address: '0x6789012345678901234567890123456789012346',
    farcaster_fid: 56789,
    viral_xp: 52000,
    guild_bonus: 2200,
    referral_bonus: 5500,
    badge_prestige: 2000,
    rank_tier: 'Quantum Navigator',
    global_rank: 6,
    rank_change: -2,
  },
  {
    address: '0x7890123456789012345678901234567890123457',
    farcaster_fid: 67890,
    viral_xp: 48000,
    guild_bonus: 2000,
    referral_bonus: 5000,
    badge_prestige: 1800,
    rank_tier: 'Quantum Navigator',
    global_rank: 7,
    rank_change: 1,
  },
  {
    address: '0x8901234567890123456789012345678901234568',
    farcaster_fid: 78901,
    viral_xp: 45000,
    guild_bonus: 1900,
    referral_bonus: 4800,
    badge_prestige: 1700,
    rank_tier: 'Quantum Navigator',
    global_rank: 8,
    rank_change: 0,
  },
  {
    address: '0x9012345678901234567890123456789012345679',
    farcaster_fid: 89012,
    viral_xp: 42000,
    guild_bonus: 1800,
    referral_bonus: 4500,
    badge_prestige: 1600,
    rank_tier: 'Quantum Navigator',
    global_rank: 9,
    rank_change: -1,
  },
  {
    address: '0xa123456789012345678901234567890123456780',
    farcaster_fid: 90123,
    viral_xp: 39000,
    guild_bonus: 1700,
    referral_bonus: 4200,
    badge_prestige: 1500,
    rank_tier: 'Quantum Navigator',
    global_rank: 10,
    rank_change: 3,
  },
  
  // Mid-tier (Rank 11-15) - Page 1 bottom
  {
    address: '0xb234567890123456789012345678901234567891',
    farcaster_fid: 91234,
    viral_xp: 22000,
    guild_bonus: 1200,
    referral_bonus: 2800,
    badge_prestige: 1000,
    rank_tier: 'Nebula Commander',
    global_rank: 11,
    rank_change: 0,
  },
  {
    address: '0xc345678901234567890123456789012345678902',
    farcaster_fid: 92345,
    viral_xp: 18500,
    guild_bonus: 1100,
    referral_bonus: 2400,
    badge_prestige: 900,
    rank_tier: 'Nebula Commander',
    global_rank: 12,
    rank_change: -2,
  },
  {
    address: '0xd456789012345678901234567890123456789013',
    farcaster_fid: 93456,
    viral_xp: 16000,
    guild_bonus: 1000,
    referral_bonus: 2200,
    badge_prestige: 850,
    rank_tier: 'Star Captain',
    global_rank: 13,
    rank_change: 1,
  },
  {
    address: '0xe567890123456789012345678901234567890124',
    farcaster_fid: 94567,
    viral_xp: 14500,
    guild_bonus: 900,
    referral_bonus: 2000,
    badge_prestige: 800,
    rank_tier: 'Star Captain',
    global_rank: 14,
    rank_change: 0,
  },
  {
    address: '0xf678901234567890123456789012345678901235',
    farcaster_fid: 95678,
    viral_xp: 13000,
    guild_bonus: 850,
    referral_bonus: 1900,
    badge_prestige: 750,
    rank_tier: 'Star Captain',
    global_rank: 15,
    rank_change: 2,
  },
  
  // Lower-tier (Rank 16-25) - Page 2
  {
    address: '0x0789012345678901234567890123456789012346',
    farcaster_fid: 96789,
    viral_xp: 6500,
    guild_bonus: 500,
    referral_bonus: 1000,
    badge_prestige: 500,
    rank_tier: 'Night Operator',
    global_rank: 16,
    rank_change: -1,
  },
  {
    address: '0x1890123456789012345678901234567890123457',
    farcaster_fid: 97890,
    viral_xp: 5800,
    guild_bonus: 450,
    referral_bonus: 900,
    badge_prestige: 450,
    rank_tier: 'Night Operator',
    global_rank: 17,
    rank_change: 0,
  },
  {
    address: '0x2901234567890123456789012345678901234568',
    farcaster_fid: 98901,
    viral_xp: 4200,
    guild_bonus: 300,
    referral_bonus: 650,
    badge_prestige: 300,
    rank_tier: 'Beacon Runner',
    global_rank: 18,
    rank_change: 1,
  },
  {
    address: '0x3012345678901234567890123456789012345679',
    farcaster_fid: 99012,
    viral_xp: 3800,
    guild_bonus: 280,
    referral_bonus: 600,
    badge_prestige: 280,
    rank_tier: 'Beacon Runner',
    global_rank: 19,
    rank_change: -3,
  },
  {
    address: '0x4123456789012345678901234567890123456780',
    farcaster_fid: 99123,
    viral_xp: 3200,
    guild_bonus: 250,
    referral_bonus: 550,
    badge_prestige: 250,
    rank_tier: 'Beacon Runner',
    global_rank: 20,
    rank_change: 0,
  },
  {
    address: '0x5234567890123456789012345678901234567891',
    farcaster_fid: 99234,
    viral_xp: 1800,
    guild_bonus: 150,
    referral_bonus: 350,
    badge_prestige: 150,
    rank_tier: 'Warp Scout',
    global_rank: 21,
    rank_change: 2,
  },
  {
    address: '0x6345678901234567890123456789012345678902',
    farcaster_fid: 99345,
    viral_xp: 1500,
    guild_bonus: 120,
    referral_bonus: 300,
    badge_prestige: 125,
    rank_tier: 'Warp Scout',
    global_rank: 22,
    rank_change: 0,
  },
  {
    address: '0x7456789012345678901234567890123456789013',
    farcaster_fid: 99456,
    viral_xp: 1200,
    guild_bonus: 100,
    referral_bonus: 250,
    badge_prestige: 100,
    rank_tier: 'Warp Scout',
    global_rank: 23,
    rank_change: -1,
  },
  {
    address: '0x8567890123456789012345678901234567890124',
    farcaster_fid: 99567,
    viral_xp: 800,
    guild_bonus: 50,
    referral_bonus: 150,
    badge_prestige: 75,
    rank_tier: 'Signal Kitten',
    global_rank: 24,
    rank_change: 1,
  },
  {
    address: '0x9678901234567890123456789012345678901235',
    farcaster_fid: 99678,
    viral_xp: 600,
    guild_bonus: 30,
    referral_bonus: 100,
    badge_prestige: 50,
    rank_tier: 'Signal Kitten',
    global_rank: 25,
    rank_change: 0,
  },
]

async function seedMockData() {
  console.log('🌱 Seeding leaderboard mock data...\n')
  
  // Clean existing mock data
  console.log('🧹 Cleaning existing data...')
  const { error: deleteError } = await supabase
    .from('leaderboard_calculations')
    .delete()
    .eq('period', 'all_time')
  
  if (deleteError) {
    console.error('❌ Error cleaning data:', deleteError.message)
    process.exit(1)
  }
  
  console.log('✅ Cleaned existing data\n')
  
  // Insert mock users
  console.log('📝 Inserting 25 mock users...')
  
  const records = mockUsers.map(user => ({
    address: user.address,
    farcaster_fid: user.farcaster_fid,
    base_points: 0, // Contract integration pending
    viral_xp: user.viral_xp,
    guild_bonus: user.guild_bonus,
    referral_bonus: user.referral_bonus,
    streak_bonus: 0, // Contract integration pending
    badge_prestige: user.badge_prestige,
    rank_tier: user.rank_tier,
    global_rank: user.global_rank,
    rank_change: user.rank_change,
    period: 'all_time',
  }))
  
  const { data, error: insertError } = await supabase
    .from('leaderboard_calculations')
    .insert(records)
    .select()
  
  if (insertError) {
    console.error('❌ Error inserting data:', insertError.message)
    process.exit(1)
  }
  
  console.log(`✅ Inserted ${data?.length || 0} records\n`)
  
  // Verify and show top 10
  console.log('🏆 Top 10 Leaderboard:')
  console.log('─'.repeat(80))
  
  const { data: top10 } = await supabase
    .from('leaderboard_calculations')
    .select('global_rank, rank_tier, total_score, rank_change')
    .eq('period', 'all_time')
    .order('global_rank', { ascending: true })
    .limit(10)
  
  top10?.forEach(entry => {
    const arrow = entry.rank_change > 0 ? '↑' : entry.rank_change < 0 ? '↓' : '—'
    const change = entry.rank_change !== 0 ? ` (${arrow} ${Math.abs(entry.rank_change)})` : ''
    console.log(
      `  ${entry.global_rank.toString().padStart(2)}. ${entry.rank_tier.padEnd(25)} ${entry.total_score.toLocaleString().padStart(8)} pts${change}`
    )
  })
  
  console.log('─'.repeat(80))
  console.log('\n📊 Summary Statistics:')
  
  const { count } = await supabase
    .from('leaderboard_calculations')
    .select('*', { count: 'exact', head: true })
    .eq('period', 'all_time')
  
  console.log(`  Total entries: ${count}`)
  console.log(`  Unique tiers: 8 (Signal Kitten → Omniversal Being)`)
  console.log(`  Score range: 780 → 487,500`)
  
  console.log('\n✅ Mock data seeded successfully!')
  console.log('\n🔍 Test the leaderboard:')
  console.log('  1. Start dev server: pnpm dev')
  console.log('  2. Visit: http://localhost:3000/leaderboard')
  console.log('  3. Test pagination (page 1: ranks 1-15, page 2: ranks 16-25)')
  console.log('  4. Test search by FID or address')
  console.log('\n⚠️  NOTE: basePoints and streakBonus are 0 (contract integration pending)')
  console.log('  Real data will come from QuestCompleted and GMEvent contract reads\n')
}

seedMockData().catch(console.error)
