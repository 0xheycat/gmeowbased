#!/usr/bin/env tsx
/**
 * Seed test data for gmeow_rank_events using Supabase client
 * Run: pnpm dlx tsx scripts/seed-test-data.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TEST_FID = 18139;
const TEST_WALLET = '0x7539472dad6a371e6e152c5a203469aa32314130'; // Actual verified address from Neynar

const testEvents = [
  // Week 1: Consistent GM streak
  {
    fid: TEST_FID,
    wallet_address: TEST_WALLET,
    chain: 'base',
    event_type: 'gm',
    delta: 10,
    total_points: 10,
    previous_points: 0,
    level: 1,
    tier_name: 'Bronze',
    tier_percent: 10.0,
    quest_id: null,
    created_at: '2025-11-01T08:00:00Z',
    metadata: { streak: 1, time: 'morning' },
  },
  {
    fid: TEST_FID,
    wallet_address: TEST_WALLET,
    chain: 'base',
    event_type: 'gm',
    delta: 10,
    total_points: 20,
    previous_points: 10,
    level: 1,
    tier_name: 'Bronze',
    tier_percent: 20.0,
    quest_id: null,
    created_at: '2025-11-02T09:00:00Z',
    metadata: { streak: 2, time: 'morning' },
  },
  {
    fid: TEST_FID,
    wallet_address: TEST_WALLET,
    chain: 'base',
    event_type: 'gm',
    delta: 10,
    total_points: 30,
    previous_points: 20,
    level: 1,
    tier_name: 'Bronze',
    tier_percent: 30.0,
    quest_id: null,
    created_at: '2025-11-03T10:00:00Z',
    metadata: { streak: 3, time: 'morning' },
  },
  {
    fid: TEST_FID,
    wallet_address: TEST_WALLET,
    chain: 'base',
    event_type: 'gm',
    delta: 10,
    total_points: 40,
    previous_points: 30,
    level: 1,
    tier_name: 'Bronze',
    tier_percent: 40.0,
    quest_id: null,
    created_at: '2025-11-04T08:30:00Z',
    metadata: { streak: 4, time: 'morning' },
  },
  {
    fid: TEST_FID,
    wallet_address: TEST_WALLET,
    chain: 'base',
    event_type: 'gm',
    delta: 10,
    total_points: 50,
    previous_points: 40,
    level: 1,
    tier_name: 'Bronze',
    tier_percent: 50.0,
    quest_id: null,
    created_at: '2025-11-05T07:45:00Z',
    metadata: { streak: 5, time: 'morning' },
  },

  // Quest completion events
  {
    fid: TEST_FID,
    wallet_address: TEST_WALLET,
    chain: 'base',
    event_type: 'quest-verify',
    delta: 50,
    total_points: 100,
    previous_points: 50,
    level: 2,
    tier_name: 'Silver',
    tier_percent: 15.0,
    quest_id: 1001,
    created_at: '2025-11-06T14:00:00Z',
    metadata: { quest_id: 'intro-quest', quest_name: 'Welcome Aboard' },
  },
  {
    fid: TEST_FID,
    wallet_address: TEST_WALLET,
    chain: 'base',
    event_type: 'quest-verify',
    delta: 100,
    total_points: 200,
    previous_points: 100,
    level: 2,
    tier_name: 'Silver',
    tier_percent: 40.0,
    quest_id: 1002,
    created_at: '2025-11-07T16:30:00Z',
    metadata: { quest_id: 'first-cast', quest_name: 'First Cast' },
  },

  // More GM events after level up
  {
    fid: TEST_FID,
    wallet_address: TEST_WALLET,
    chain: 'base',
    event_type: 'gm',
    delta: 15,
    total_points: 215,
    previous_points: 200,
    level: 2,
    tier_name: 'Silver',
    tier_percent: 45.0,
    quest_id: null,
    created_at: '2025-11-08T08:15:00Z',
    metadata: { streak: 6, time: 'morning' },
  },
  {
    fid: TEST_FID,
    wallet_address: TEST_WALLET,
    chain: 'base',
    event_type: 'gm',
    delta: 15,
    total_points: 230,
    previous_points: 215,
    level: 2,
    tier_name: 'Silver',
    tier_percent: 48.0,
    quest_id: null,
    created_at: '2025-11-09T09:20:00Z',
    metadata: { streak: 7, time: 'morning' },
  },

  // Tip events (giving and receiving)
  {
    fid: TEST_FID,
    wallet_address: TEST_WALLET,
    chain: 'base',
    event_type: 'tip',
    delta: 25,
    total_points: 255,
    previous_points: 230,
    level: 2,
    tier_name: 'Silver',
    tier_percent: 55.0,
    quest_id: null,
    created_at: '2025-11-10T12:00:00Z',
    metadata: { tip_type: 'received', from_fid: 12345, amount: 10 },
  },
  {
    fid: TEST_FID,
    wallet_address: TEST_WALLET,
    chain: 'base',
    event_type: 'tip',
    delta: 10,
    total_points: 265,
    previous_points: 255,
    level: 2,
    tier_name: 'Silver',
    tier_percent: 58.0,
    quest_id: null,
    created_at: '2025-11-10T15:00:00Z',
    metadata: { tip_type: 'sent', to_fid: 67890, amount: 5 },
  },

  // More recent activity
  {
    fid: TEST_FID,
    wallet_address: TEST_WALLET,
    chain: 'base',
    event_type: 'gm',
    delta: 15,
    total_points: 280,
    previous_points: 265,
    level: 2,
    tier_name: 'Silver',
    tier_percent: 62.0,
    quest_id: null,
    created_at: '2025-11-11T07:30:00Z',
    metadata: { streak: 8, time: 'morning' },
  },
  {
    fid: TEST_FID,
    wallet_address: TEST_WALLET,
    chain: 'base',
    event_type: 'quest-verify',
    delta: 150,
    total_points: 430,
    previous_points: 280,
    level: 3,
    tier_name: 'Gold',
    tier_percent: 12.0,
    quest_id: 1003,
    created_at: '2025-11-11T18:00:00Z',
    metadata: { quest_id: 'power-user', quest_name: 'Power User' },
  },
  {
    fid: TEST_FID,
    wallet_address: TEST_WALLET,
    chain: 'base',
    event_type: 'gm',
    delta: 20,
    total_points: 450,
    previous_points: 430,
    level: 3,
    tier_name: 'Gold',
    tier_percent: 15.0,
    quest_id: null,
    created_at: '2025-11-12T08:00:00Z',
    metadata: { streak: 9, time: 'morning' },
  },
  {
    fid: TEST_FID,
    wallet_address: TEST_WALLET,
    chain: 'base',
    event_type: 'gm',
    delta: 20,
    total_points: 470,
    previous_points: 450,
    level: 3,
    tier_name: 'Gold',
    tier_percent: 18.0,
    quest_id: null,
    created_at: '2025-11-13T08:05:00Z',
    metadata: { streak: 10, time: 'morning' },
  },

  // Multi-chain activity
  {
    fid: TEST_FID,
    wallet_address: TEST_WALLET,
    chain: 'optimism',
    event_type: 'gm',
    delta: 10,
    total_points: 480,
    previous_points: 470,
    level: 3,
    tier_name: 'Gold',
    tier_percent: 20.0,
    quest_id: null,
    created_at: '2025-11-13T09:00:00Z',
    metadata: { streak: 1, time: 'morning', chain: 'optimism' },
  },
  {
    fid: TEST_FID,
    wallet_address: TEST_WALLET,
    chain: 'optimism',
    event_type: 'quest-verify',
    delta: 75,
    total_points: 555,
    previous_points: 480,
    level: 3,
    tier_name: 'Gold',
    tier_percent: 28.0,
    quest_id: 1004,
    created_at: '2025-11-13T11:00:00Z',
    metadata: { quest_id: 'cross-chain', quest_name: 'Cross-Chain Explorer' },
  },
];

async function seedTestData() {
  console.log('🌱 Seeding test data for fid', TEST_FID);

  // Clear existing test data
  const { error: deleteError } = await supabase
    .from('gmeow_rank_events')
    .delete()
    .eq('fid', TEST_FID);

  if (deleteError) {
    console.warn('⚠️ Delete error (may not exist):', deleteError.message);
  } else {
    console.log('✅ Cleared existing test data');
  }

  // Insert test events
  const { data, error } = await supabase
    .from('gmeow_rank_events')
    .insert(testEvents)
    .select();

  if (error) {
    console.error('❌ Insert error:', error);
    process.exit(1);
  }

  console.log(`✅ Inserted ${data?.length || 0} test events`);

  // Summary
  const stats = {
    totalPoints: 555,
    currentLevel: 3,
    tierName: 'Gold',
    gmStreak: 10,
    questsCompleted: 4,
    tipsActivity: 2,
    chains: ['base', 'optimism'],
  };

  console.log('\n📊 Test Data Summary:');
  console.log(`   Total Points: ${stats.totalPoints}`);
  console.log(`   Current Level: ${stats.currentLevel} (${stats.tierName})`);
  console.log(`   GM Streak: ${stats.gmStreak} days`);
  console.log(`   Quests Completed: ${stats.questsCompleted}`);
  console.log(`   Tips Activity: ${stats.tipsActivity} events`);
  console.log(`   Chains: ${stats.chains.join(', ')}`);
  console.log('\n✨ Ready to test auto-reply with stats!');
}

seedTestData().catch(console.error);
