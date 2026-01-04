#!/usr/bin/env tsx
/**
 * Simple Quest Creation Test
 * Tests social quest creation (no role restrictions)
 */

import 'dotenv/config'

const API_URL = 'http://localhost:3000'
const CREATOR_FID = 18139
const CREATOR_ADDRESS = '0x7539472dad6a371e6e152c5a203469aa32314130'

async function createQuest(title: string, points: number) {
  const quest = {
    title,
    description: `Test quest created on ${new Date().toISOString()}. This is a simple social quest to verify the quest creation flow works correctly.`,
    category: 'social',
    difficulty: 'beginner',
    estimated_time: '5 minutes',
    reward_points_awarded: points,
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    tasks: [
      {
        type: 'social',
        title: 'Follow @heycat',
        description: 'Follow the quest creator on Farcaster',
        verification_data: {
          target_fid: CREATOR_FID,
        },
        required: true,
        order: 0,
      },
    ],
    creator_fid: CREATOR_FID,
    creator_address: CREATOR_ADDRESS,
  }

  console.log(`\n🎯 Creating: ${title} (${points} POINTS)`)
  
  try {
    const response = await fetch(`${API_URL}/api/quests/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quest),
    })

    const result = await response.json()

    if (!response.ok) {
      console.log(`❌ Failed: ${response.status}`)
      console.log(JSON.stringify(result, null, 2))
      return null
    }

    console.log(`✅ Success!`)
    console.log(`   ID: ${result.quest?.id || result.id}`)
    console.log(`   Slug: ${result.quest?.slug || result.slug}`)
    console.log(`   URL: http://localhost:3000/quests/${result.quest?.slug || result.slug}`)
    
    return result
  } catch (error) {
    console.log(`❌ Error:`, error)
    return null
  }
}

async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('🧪 Quest Creation Test')
  console.log('═══════════════════════════════════════════')
  
  // Test 1: Low points quest
  const q1 = await createQuest('Test Quest 1 - Low Points', 50)
  await new Promise(r => setTimeout(r, 2000))
  
  // Test 2: High points quest  
  const q2 = await createQuest('Test Quest 2 - High Points', 200)
  
  console.log('\n═══════════════════════════════════════════')
  console.log(`Results: ${q1 ? '✅' : '❌'} Quest 1, ${q2 ? '✅' : '❌'} Quest 2`)
  console.log('═══════════════════════════════════════════\n')
}

main().catch(console.error)
