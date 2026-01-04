#!/usr/bin/env tsx
/**
 * Comprehensive Quest Creation Test - ALL TYPES
 * Tests that ESCROW POINTS are required for ALL quest types (onchain AND offchain)
 * Uses Oracle Bot FID (999999) with oracle private key address
 */

const API_URL = 'http://localhost:3000'
const ORACLE_FID = 999999
const ORACLE_ADDRESS = '0x8870C155666809609176260F2B65a626C000D773'

interface QuestResult {
  questType: string
  success: boolean
  questId?: number
  slug?: string
  pointsEscrowed?: number
  error?: string
}

const results: QuestResult[] = []

async function createQuest(
  questType: string,
  category: 'social' | 'onchain' | 'creative' | 'learn' | 'hybrid',
  points: number,
  tasks: any[]
) {
  const quest = {
    title: `${questType} Quest - Test ${new Date().toISOString().slice(0, 10)}`,
    description: `This is a ${category} quest to test escrow points requirement. All quests should require points to be escrowed, whether onchain or offchain.`,
    category,
    difficulty: 'beginner',
    estimated_time: '10 minutes',
    reward_points_awarded: points,
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    max_participants: 100,
    tasks,
    creator_fid: ORACLE_FID,
    creator_address: ORACLE_ADDRESS,
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`🧪 Testing: ${questType} (${category.toUpperCase()})`)
  console.log(`   Reward: ${points} POINTS`)
  console.log(`   Tasks: ${tasks.length}`)
  console.log(`${'='.repeat(60)}`)
  
  try {
    const response = await fetch(`${API_URL}/api/quests/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quest),
    })

    const result = await response.json()

    if (!response.ok) {
      console.log(`❌ FAILED: ${response.status}`)
      console.log(JSON.stringify(result, null, 2))
      results.push({
        questType,
        success: false,
        error: JSON.stringify(result),
      })
      return null
    }

    const questId = result.data?.quest?.id || result.quest?.id || result.id
    const slug = result.data?.quest?.slug || result.quest?.slug || result.slug
    const escrowCost = result.data?.escrow?.cost_breakdown?.total || result.escrow?.cost_breakdown?.total

    console.log(`✅ SUCCESS!`)
    console.log(`   Quest ID: ${questId}`)
    console.log(`   Slug: ${slug}`)
    console.log(`   Escrow Cost: ${escrowCost} POINTS`)
    console.log(`   URL: http://localhost:3000/quests/${slug}`)
    
    results.push({
      questType,
      success: true,
      questId,
      slug,
      pointsEscrowed: escrowCost,
    })

    return result
  } catch (error) {
    console.log(`❌ ERROR:`, error)
    results.push({
      questType,
      success: false,
      error: String(error),
    })
    return null
  }
}

async function main() {
  console.log('\n' + '═'.repeat(70))
  console.log('🚀 COMPREHENSIVE QUEST CREATION TEST - ALL TYPES')
  console.log('   Testing that ESCROW POINTS required for ALL quest types')
  console.log('   Oracle FID:', ORACLE_FID)
  console.log('   Oracle Address:', ORACLE_ADDRESS)
  console.log('═'.repeat(70))

  // Test 1: SOCIAL Quest (offchain)
  await createQuest(
    'Social Quest',
    'social',
    50,
    [
      {
        type: 'social',
        title: 'Follow @gmeowbased',
        description: 'Follow the official account',
        verification_data: { target_fid: 123456 },
        required: true,
        order: 0,
      },
      {
        type: 'social',
        title: 'Cast about the project',
        description: 'Share your thoughts',
        verification_data: { contains_text: 'gmeowbased' },
        required: true,
        order: 1,
      },
    ]
  )

  await new Promise(resolve => setTimeout(resolve, 2000))

  // Test 2: ONCHAIN Quest
  await createQuest(
    'Onchain Quest',
    'onchain',
    500,
    [
      {
        type: 'onchain',
        title: 'Complete 7-day GM streak',
        description: 'Call GM for 7 consecutive days',
        verification_data: {
          contract_address: '0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73',
          min_streak: 7,
        },
        required: true,
        order: 0,
      },
    ]
  )

  await new Promise(resolve => setTimeout(resolve, 2000))

  // Test 3: CREATIVE Quest (offchain)
  await createQuest(
    'Creative Quest',
    'creative',
    200,
    [
      {
        type: 'manual',
        title: 'Create artwork',
        description: 'Submit your creative work',
        verification_data: { submission_type: 'image' },
        required: true,
        order: 0,
      },
    ]
  )

  await new Promise(resolve => setTimeout(resolve, 2000))

  // Test 4: LEARN Quest (offchain)
  await createQuest(
    'Learn Quest',
    'learn',
    100,
    [
      {
        type: 'manual',
        title: 'Complete tutorial',
        description: 'Learn about the platform',
        verification_data: { tutorial_id: 'basics-101' },
        required: true,
        order: 0,
      },
    ]
  )

  await new Promise(resolve => setTimeout(resolve, 2000))

  // Test 5: HYBRID Quest (onchain + offchain)
  await createQuest(
    'Hybrid Quest',
    'hybrid',
    300,
    [
      {
        type: 'onchain',
        title: 'Make onchain transaction',
        description: 'Interact with smart contract',
        verification_data: {
          contract_address: '0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73',
        },
        required: true,
        order: 0,
      },
      {
        type: 'social',
        title: 'Share your achievement',
        description: 'Cast about completing the quest',
        verification_data: { contains_text: 'completed' },
        required: true,
        order: 1,
      },
    ]
  )

  // Summary Report
  console.log('\n' + '═'.repeat(70))
  console.log('📊 TEST RESULTS SUMMARY')
  console.log('═'.repeat(70))
  
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)

  console.log(`\n✅ Successful: ${successful.length}/${results.length}`)
  successful.forEach(r => {
    console.log(`   • ${r.questType}: Quest #${r.questId}, Escrowed ${r.pointsEscrowed} points`)
  })

  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}/${results.length}`)
    failed.forEach(r => {
      console.log(`   • ${r.questType}: ${r.error?.substring(0, 100)}...`)
    })
  }

  // Verify escrow from database
  console.log('\n' + '═'.repeat(70))
  console.log('🔍 VERIFYING ESCROW IN DATABASE')
  console.log('═'.repeat(70))

  const dotenv = await import('dotenv')
  dotenv.config({ path: '.env.local' })

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check points balance
  const { data: balance } = await supabase
    .from('user_points_balances')
    .select('points_balance, total_score')
    .eq('fid', ORACLE_FID)
    .single()

  console.log(`\n📊 Oracle Bot Points Balance:`)
  console.log(`   Starting: 10,000 points`)
  console.log(`   Current: ${balance?.points_balance || 0} points`)
  console.log(`   Escrowed: ${10000 - (balance?.points_balance || 0)} points`)

  // Check escrow records
  const { data: escrows } = await supabase
    .from('quest_creation_costs')
    .select('quest_id, points_escrowed, total_cost, created_at')
    .eq('creator_fid', ORACLE_FID)
    .order('created_at', { ascending: false })
    .limit(10)

  console.log(`\n💰 Escrow Records (last 10):`)
  if (escrows && escrows.length > 0) {
    escrows.forEach((e, i) => {
      console.log(`   ${i + 1}. Quest #${e.quest_id}: ${e.points_escrowed} points (Cost: ${e.total_cost})`)
    })
  } else {
    console.log('   No escrow records found!')
  }

  // Check created quests
  const { data: quests } = await supabase
    .from('unified_quests')
    .select('id, title, category, reward_points_awarded, status')
    .eq('creator_fid', ORACLE_FID)
    .order('created_at', { ascending: false })
    .limit(10)

  console.log(`\n🎯 Created Quests:`)
  if (quests && quests.length > 0) {
    quests.forEach((q, i) => {
      console.log(`   ${i + 1}. [${q.category.toUpperCase()}] ${q.title} (${q.reward_points_awarded} points, ${q.status})`)
    })
  } else {
    console.log('   No quests found!')
  }

  console.log('\n' + '═'.repeat(70))
  console.log('✅ TEST COMPLETE')
  console.log('═'.repeat(70))
  console.log(`\nConclusion: ${successful.length === results.length ? '🎉 ALL QUEST TYPES WORKING!' : '⚠️  Some quest types failed'}`)
  console.log(`Escrow Verified: ${escrows && escrows.length >= successful.length ? '✅ YES' : '❌ NO'}`)
  console.log('\n')
}

main().catch(console.error)
