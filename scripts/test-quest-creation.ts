#!/usr/bin/env tsx
/**
 * Quest Creation Test Script
 * 
 * Tests both onchain and offchain quest creation flows
 * Usage: npx tsx scripts/test-quest-creation.ts
 */

import 'dotenv/config'

const API_URL = 'http://localhost:3000'
const CREATOR_FID = 18139 // heycat FID

interface QuestPayload {
  title: string
  description: string
  category: 'social' | 'onchain' | 'creative' | 'learn' | 'hybrid'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimated_time: string
  reward_points_awarded: number
  reward_xp?: number
  max_participants?: number
  starts_at?: string
  ends_at?: string
  tasks: Array<{
    type: 'social' | 'onchain' | 'manual'
    title: string
    description?: string
    verification_data: Record<string, unknown>
    required: boolean
    order: number
  }>
  creator_fid: number
  creator_address?: string
  cover_image_url?: string
  announce_via_bot?: boolean
}

async function createQuest(quest: QuestPayload, questNumber: number) {
  console.log(`\n${'='.repeat(70)}`)
  console.log(`🎯 Creating Quest #${questNumber}: ${quest.title}`)
  console.log(`${'='.repeat(70)}`)
  console.log(`Category: ${quest.category}`)
  console.log(`Difficulty: ${quest.difficulty}`)
  console.log(`Reward Points: ${quest.reward_points_awarded}`)
  console.log(`Estimated Time: ${quest.estimated_time}`)
  console.log(`Tasks: ${quest.tasks.length}`)

  try {
    const response = await fetch(`${API_URL}/api/quests/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(quest),
    })

    const result = await response.json()

    if (!response.ok) {
      console.log(`\n❌ Failed to create quest:`)
      console.log(`Status: ${response.status}`)
      console.log(`Error:`, result)
      return
    }

    console.log(`\n✅ Quest created successfully!`)
    console.log(`Quest ID: ${result.quest?.id || result.id}`)
    console.log(`Slug: ${result.quest?.slug || result.slug}`)
    
    if (result.quest?.onchain_quest_id) {
      console.log(`🔗 Onchain Quest ID: ${result.quest.onchain_quest_id}`)
      console.log(`📜 Transaction Hash: ${result.quest.escrow_tx_hash}`)
      console.log(`⛓️  Onchain Status: ${result.quest.onchain_status}`)
    } else {
      console.log(`📝 Offchain Quest (database only)`)
    }

    console.log(`\n📊 Quest Details:`)
    console.log(JSON.stringify(result.quest || result, null, 2))

    return result
  } catch (error) {
    console.log(`\n❌ Error:`, error)
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════')
  console.log('🧪 QUEST CREATION TEST SUITE')
  console.log('═══════════════════════════════════════════════════════')
  console.log(`API URL: ${API_URL}`)
  console.log(`Creator FID: ${CREATOR_FID}`)
  console.log(`Timestamp: ${new Date().toISOString()}`)
  console.log('═══════════════════════════════════════════════════════')

  // Quest 1: Onchain Quest (High Points)
  const onchainQuest: QuestPayload = {
    title: 'Test Onchain Quest - GM Streak Builder',
    description: 'Complete a 7-day GM streak to earn onchain rewards! This quest tests the full onchain creation flow with escrow and contract interaction.',
    category: 'onchain',
    difficulty: 'intermediate',
    estimated_time: '7 days',
    reward_points_awarded: 500, // High points to test escrow
    reward_xp: 500, // Explicit XP (capped at 500 max)
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    tasks: [
      {
        type: 'onchain',
        title: 'Maintain a 7-day GM streak',
        description: 'Complete 7 consecutive days of GM posts',
        verification_data: {
          streak_days: 7,
          auto_verify: true,
        },
        required: true,
        order: 0,
      },
    ],
    creator_fid: CREATOR_FID,
  }

  // Quest 2: Offchain Quest (Low Points, Quick Test)
  const offchainQuest: QuestPayload = {
    title: 'Test Offchain Quest - Follow & Cast',
    description: 'Simple social quest for testing offchain flow. Follow @heycat and cast about $GMEOW!',
    category: 'social',
    difficulty: 'beginner',
    estimated_time: '5 minutes',
    reward_points_awarded: 50, // Low points (offchain test)
    // No explicit XP - will use category multiplier (50 × 1.0 = 50 XP)
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
    tasks: [
      {
        type: 'social',
        title: 'Follow @heycat on Farcaster',
        description: 'Follow the quest creator',
        verification_data: {
          target_fid: CREATOR_FID,
          auto_verify: true,
        },
        required: true,
        order: 0,
      },
      {
        type: 'social',
        title: 'Cast about $GMEOW',
        description: 'Make a post mentioning GMEOW',
        verification_data: {
          required_text: 'GMEOW',
          auto_verify: true,
        },
        required: true,
        order: 1,
      },
    ],
    creator_fid: CREATOR_FID,
  }

  // Create Quest 1 (Onchain)
  const quest1 = await createQuest(onchainQuest, 1)
  
  // Wait 2 seconds between requests
  console.log('\n⏳ Waiting 2 seconds before creating next quest...')
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Create Quest 2 (Offchain)
  const quest2 = await createQuest(offchainQuest, 2)

  // Summary
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('📋 TEST SUMMARY')
  console.log('═══════════════════════════════════════════════════════')
  console.log(`Quest 1 (Onchain): ${quest1 ? '✅ SUCCESS' : '❌ FAILED'}`)
  console.log(`Quest 2 (Offchain): ${quest2 ? '✅ SUCCESS' : '❌ FAILED'}`)
  console.log('═══════════════════════════════════════════════════════\n')

  // Instructions for verification
  console.log('🔍 VERIFICATION STEPS:')
  console.log('1. Check database: SELECT * FROM unified_quests ORDER BY created_at DESC LIMIT 2;')
  console.log('2. Check indexer logs (if running): Should see QuestAdded event for Quest #1')
  console.log('3. Visit quests page: http://localhost:3000/quests')
  console.log('4. View individual quests:')
  if (quest1?.quest?.slug) console.log(`   - Quest 1: http://localhost:3000/quests/${quest1.quest.slug}`)
  if (quest2?.quest?.slug) console.log(`   - Quest 2: http://localhost:3000/quests/${quest2.quest.slug}`)
  console.log('')
}

main()
  .then(() => {
    console.log('✅ Test script completed')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Test script failed:', error)
    process.exit(1)
  })
