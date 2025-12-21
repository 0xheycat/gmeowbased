/**
 * Test Activity API with Oracle Wallet
 * 
 * Tests the TRUE HYBRID pattern:
 * - Layer 1 (Subsquid): On-chain points transactions and GM events
 * - Layer 2 (Supabase): Off-chain viral bonuses from badge_casts
 * - Layer 3: Merge and display with source metadata
 */

const ORACLE_WALLET = '0x8870C155666809609176260F2B65a626C000D773'
const FID_18139_WALLET = '0x7539472dad6a371e6e152c5a203469aa32314130'
const SUBSQUID_URL = 'http://localhost:4350/graphql'
const API_URL = 'http://localhost:3000'

async function testSubsquidData(wallet: string) {
  console.log(`\n📊 Layer 1 (Subsquid) - Blockchain Data for ${wallet}`)
  console.log('='.repeat(80))
  
  const query = {
    query: `{
      users(where: {id_eq: "${wallet.toLowerCase()}"}) {
        id
        pointsBalance
        totalEarnedFromGMs
        currentStreak
        lifetimeGMs
      }
      pointsTransactions(where: {user_eq: "${wallet.toLowerCase()}"}, orderBy: timestamp_DESC, limit: 5) {
        id
        transactionType
        amount
        timestamp
        txHash
        blockNumber
      }
      gmEvents(where: {user: {id_eq: "${wallet.toLowerCase()}"}}, orderBy: timestamp_DESC, limit: 5) {
        id
        pointsAwarded
        timestamp
        streakDay
        blockNumber
      }
    }`
  }

  const response = await fetch(SUBSQUID_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query)
  })

  const data = await response.json()
  
  if (data.data.users.length > 0) {
    console.log('\n✅ User Found:')
    console.log(JSON.stringify(data.data.users[0], null, 2))
  } else {
    console.log('\n❌ User not found in Subsquid')
  }

  if (data.data.pointsTransactions.length > 0) {
    console.log('\n✅ Points Transactions:')
    data.data.pointsTransactions.forEach((tx: any, i: number) => {
      console.log(`  ${i + 1}. ${tx.transactionType} ${tx.amount} points - Block ${tx.blockNumber}`)
    })
  } else {
    console.log('\n❌ No points transactions')
  }

  if (data.data.gmEvents.length > 0) {
    console.log('\n✅ GM Events:')
    data.data.gmEvents.forEach((gm: any, i: number) => {
      console.log(`  ${i + 1}. +${gm.pointsAwarded} points (Streak Day ${gm.streakDay}) - Block ${gm.blockNumber}`)
    })
  } else {
    console.log('\n❌ No GM events')
  }

  return data.data
}

async function testApiRoute(fid: number, wallet: string) {
  console.log(`\n\n🌐 Testing API Route: /api/user/activity/${fid}`)
  console.log('='.repeat(80))
  
  const response = await fetch(`${API_URL}/api/user/activity/${fid}?limit=20`)
  const data = await response.json()
  
  console.log(`\nStatus: ${response.status} ${response.ok ? '✅' : '❌'}`)
  console.log(`Activities Found: ${data.activities?.length || 0}`)
  
  if (data.activities && data.activities.length > 0) {
    console.log('\n📋 Activity Timeline:')
    data.activities.forEach((activity: any, i: number) => {
      const source = activity.metadata?.source || 'unknown'
      const sourceEmoji = source === 'on-chain' ? '⛓️' : '💬'
      console.log(`  ${i + 1}. ${sourceEmoji} [${source}] ${activity.type} - ${activity.metadata?.xp_amount || 0} XP`)
      console.log(`      ${activity.title}`)
      console.log(`      Time: ${activity.timestamp}`)
      if (activity.metadata?.txHash) {
        console.log(`      Tx: ${activity.metadata.txHash}`)
      }
    })
  } else {
    console.log('\n⚠️  No activities found')
    console.log('Response:', JSON.stringify(data, null, 2))
  }

  return data
}

async function main() {
  console.log('🧪 Activity API Testing - TRUE HYBRID Pattern')
  console.log('='.repeat(80))
  
  // Test 1: Oracle Wallet (has blockchain data)
  console.log('\n\n🔑 TEST 1: Oracle Wallet (0x8870...D773)')
  console.log('Expected: On-chain points transactions + GM events')
  console.log('-'.repeat(80))
  
  const oracleData = await testSubsquidData(ORACLE_WALLET)
  
  // Try to find FID for oracle wallet
  console.log('\n\n🔍 Checking if oracle wallet has FID mapping...')
  // Note: Oracle wallet may not have a Farcaster profile
  
  // Test 2: FID 18139 (heycat.base.eth)
  console.log('\n\n👤 TEST 2: FID 18139 (heycat.base.eth)')
  console.log(`Wallet: ${FID_18139_WALLET}`)
  console.log('Expected: No blockchain data yet (new user)')
  console.log('-'.repeat(80))
  
  const fid18139Data = await testSubsquidData(FID_18139_WALLET)
  await testApiRoute(18139, FID_18139_WALLET)
  
  // Summary
  console.log('\n\n📊 TEST SUMMARY')
  console.log('='.repeat(80))
  console.log(`Oracle Wallet: ${oracleData.users.length > 0 ? '✅ Has blockchain data' : '❌ No data'}`)
  console.log(`  - Points Balance: ${oracleData.users[0]?.pointsBalance || 0}`)
  console.log(`  - GM Events: ${oracleData.gmEvents?.length || 0}`)
  console.log(`  - Transactions: ${oracleData.pointsTransactions?.length || 0}`)
  
  console.log(`\nFID 18139: ${fid18139Data.users.length > 0 ? '✅ Has blockchain data' : '⚠️  No blockchain data (new user)'}`)
  console.log(`  - To test TRUE HYBRID: Either:`)
  console.log(`    1. Add viral_bonus_xp records to badge_casts for FID 18139`)
  console.log(`    2. Link oracle wallet to a FID with viral bonuses`)
  console.log(`    3. Create new blockchain transactions for FID 18139's wallet`)
  
  console.log('\n\n✅ Infrastructure Status:')
  console.log('  ⛓️  Subsquid Indexer: Running (port 4350)')
  console.log('  🌐 Next.js API: Running (port 3000)')
  console.log('  🎯 TRUE HYBRID Pattern: Implemented in /api/user/activity/[fid]')
}

main().catch(console.error)
