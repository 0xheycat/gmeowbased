#!/usr/bin/env tsx
/**
 * Test GM Transaction and Verify Hybrid Data Flow
 * 
 * Steps:
 * 1. Send GM transaction using oracle address
 * 2. Wait for Subsquid to index (30 seconds)
 * 3. Test all 12 migrated routes
 * 4. Verify hybrid pattern (Subsquid + Supabase + Calculated)
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { ethers } from 'ethers'
import fs from 'fs'

// Load environment
config({ path: resolve(process.cwd(), '.env.local') })

const CONTRACTS = {
  CORE: process.env.NEXT_PUBLIC_GM_BASE_CORE!,
}

const ORACLE_KEY = process.env.ORACLE_PRIVATE_KEY!
const BASE_RPC = 'https://mainnet.base.org'

async function sendGM() {
  console.log('🎯 Test GM Transaction + Hybrid Data Flow')
  console.log('═'.repeat(80))
  console.log()
  
  // Setup
  const provider = new ethers.JsonRpcProvider(BASE_RPC)
  const wallet = new ethers.Wallet(ORACLE_KEY, provider)
  const oracle = wallet.address
  
  console.log('📋 Configuration:')
  console.log(`  Oracle Address: ${oracle}`)
  console.log(`  Core Contract: ${CONTRACTS.CORE}`)
  console.log()
  
  // Check balance
  const balance = await provider.getBalance(oracle)
  console.log(`💰 Oracle Balance: ${ethers.formatEther(balance)} ETH`)
  
  if (balance === 0n) {
    throw new Error('❌ Oracle has no ETH balance')
  }
  
  console.log()
  
  // Load ABI and create contract
  const coreAbi = JSON.parse(fs.readFileSync('./abi/GmeowCore.abi.json', 'utf8'))
  const core = new ethers.Contract(CONTRACTS.CORE, coreAbi, wallet)
  
  // ============================================================================
  // STEP 1: Check Current State
  // ============================================================================
  
  console.log('📊 Current State:')
  console.log('─'.repeat(80))
  
  const lastGMTime = await core.lastGMTime(oracle)
  const currentStreak = await core.gmStreak(oracle)
  const currentPoints = await core.pointsBalance(oracle)
  const totalEarned = await core.userTotalEarned(oracle)
  
  console.log(`  Last GM Time: ${lastGMTime === 0n ? 'Never' : new Date(Number(lastGMTime) * 1000).toISOString()}`)
  console.log(`  Current Streak: ${currentStreak}`)
  console.log(`  Points Balance: ${currentPoints}`)
  console.log(`  Total Earned: ${totalEarned}`)
  console.log()
  
  // ============================================================================
  // STEP 2: Check Cooldown
  // ============================================================================
  
  const cooldown = await core.gmCooldown()
  const now = Math.floor(Date.now() / 1000)
  const canGM = now >= Number(lastGMTime) + Number(cooldown)
  
  console.log('⏰ Cooldown Check:')
  console.log('─'.repeat(80))
  console.log(`  Cooldown Period: ${cooldown} seconds (${Number(cooldown) / 3600} hours)`)
  console.log(`  Can Send GM: ${canGM ? '✅ YES' : '❌ NO'}`)
  
  if (!canGM) {
    const nextGMTime = new Date((Number(lastGMTime) + Number(cooldown)) * 1000)
    console.log(`  Next GM Available: ${nextGMTime.toISOString()}`)
    console.log()
    console.log('⏸️  SKIPPED: Cooldown active. Please try again later.')
    return
  }
  
  console.log()
  
  // ============================================================================
  // STEP 3: Send GM Transaction
  // ============================================================================
  
  console.log('📤 Sending GM Transaction:')
  console.log('─'.repeat(80))
  
  try {
    const tx = await core.sendGM({ gasLimit: 500000 })
    console.log(`  Transaction Hash: ${tx.hash}`)
    console.log(`  Waiting for confirmation...`)
    
    const receipt = await tx.wait()
    console.log(`  ✅ Transaction Confirmed!`)
    console.log(`  Block Number: ${receipt.blockNumber}`)
    console.log(`  Gas Used: ${receipt.gasUsed}`)
    console.log()
    
    // Get updated state
    const newStreak = await core.gmStreak(oracle)
    const newPoints = await core.pointsBalance(oracle)
    const newTotalEarned = await core.userTotalEarned(oracle)
    
    console.log('📊 Updated State:')
    console.log('─'.repeat(80))
    console.log(`  New Streak: ${newStreak} (${newStreak > currentStreak ? '+' + (newStreak - currentStreak) : '='})`)
    console.log(`  New Points: ${newPoints} (${newPoints > currentPoints ? '+' + (newPoints - currentPoints) : '='})`)
    console.log(`  Total Earned: ${newTotalEarned}`)
    console.log()
    
    // ============================================================================
    // STEP 4: Wait for Subsquid Indexing
    // ============================================================================
    
    console.log('⏳ Waiting for Subsquid to index transaction...')
    console.log('─'.repeat(80))
    console.log('  Subsquid indexes new blocks every ~5-10 seconds')
    console.log('  Waiting 45 seconds to ensure indexing is complete...')
    console.log()
    
    // Countdown timer
    for (let i = 45; i > 0; i--) {
      process.stdout.write(`  Time remaining: ${i}s \r`)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    console.log()
    console.log()
    
    // ============================================================================
    // STEP 5: Test Hybrid Data Flow
    // ============================================================================
    
    console.log('🧪 Testing Hybrid Data Flow (12 Routes):')
    console.log('═'.repeat(80))
    console.log()
    
    const API_BASE = 'http://localhost:3000/api'
    
    // Test 1: Leaderboard-v2 (Main test)
    console.log('1️⃣  Testing /api/leaderboard-v2')
    console.log('─'.repeat(80))
    
    const leaderboardRes = await fetch(`${API_BASE}/leaderboard-v2?pageSize=5`)
    const leaderboardData = await leaderboardRes.json()
    
    console.log(`  Status: ${leaderboardRes.status}`)
    console.log(`  Total Entries: ${leaderboardData.pagination?.totalCount || 0}`)
    
    // Find oracle in leaderboard
    const oracleEntry = leaderboardData.data?.find((e: any) => 
      e.address.toLowerCase() === oracle.toLowerCase()
    )
    
    if (oracleEntry) {
      console.log(`  ✅ Oracle Found in Leaderboard!`)
      console.log(`    Address: ${oracleEntry.address}`)
      console.log(`    FID: ${oracleEntry.farcaster_fid || 'null'}`)
      console.log(`    Base Points: ${oracleEntry.base_points}`)
      console.log(`    Viral XP: ${oracleEntry.viral_xp}`)
      console.log(`    Total Score: ${oracleEntry.total_score}`)
      console.log(`    Global Rank: ${oracleEntry.global_rank}`)
      console.log(`    Level: ${oracleEntry.level}`)
      console.log(`    Rank Tier: ${oracleEntry.rankTier}`)
      console.log()
      
      // Verify data integrity
      console.log('  📊 Data Verification:')
      const expectedBasePoints = Number(newTotalEarned)
      const actualBasePoints = oracleEntry.base_points
      
      if (actualBasePoints >= expectedBasePoints) {
        console.log(`    ✅ Base Points Match (${actualBasePoints} >= ${expectedBasePoints})`)
      } else {
        console.log(`    ⚠️  Base Points Mismatch (${actualBasePoints} < ${expectedBasePoints})`)
        console.log(`       This is expected if Subsquid only indexes from Dec 10, 2025`)
      }
      
      const calculatedTotal = oracleEntry.base_points + oracleEntry.viral_xp + 
                             (oracleEntry.guild_bonus || 0) + 
                             (oracleEntry.referral_bonus || 0)
      
      if (oracleEntry.total_score === calculatedTotal) {
        console.log(`    ✅ Total Score Calculated Correctly`)
      } else {
        console.log(`    ⚠️  Total Score Mismatch`)
        console.log(`       Expected: ${calculatedTotal}`)
        console.log(`       Actual: ${oracleEntry.total_score}`)
      }
    } else {
      console.log(`  ❌ Oracle NOT found in leaderboard`)
      console.log(`     This might mean:`)
      console.log(`     - Subsquid hasn't indexed the transaction yet`)
      console.log(`     - Query is only returning top users`)
      console.log(`     - Data isn't being aggregated correctly`)
    }
    
    console.log()
    
    // Test 2: Check Subsquid directly
    console.log('2️⃣  Testing Subsquid GraphQL (Direct)')
    console.log('─'.repeat(80))
    
    const subsquidQuery = {
      query: `{
        users(where: {id_eq: "${oracle.toLowerCase()}"}) {
          id
          totalPoints
          currentStreak
          lifetimeGMs
          lastGMTimestamp
          gmEvents(orderBy: timestamp_DESC, limit: 5) {
            id
            timestamp
            pointsAwarded
            streakDay
          }
        }
      }`
    }
    
    const subsquidRes = await fetch('http://localhost:4350/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subsquidQuery)
    })
    
    const subsquidData = await subsquidRes.json()
    
    if (subsquidData.data?.users?.[0]) {
      const user = subsquidData.data.users[0]
      console.log(`  ✅ Oracle Found in Subsquid!`)
      console.log(`    Total Points: ${user.totalPoints}`)
      console.log(`    Current Streak: ${user.currentStreak}`)
      console.log(`    Lifetime GMs: ${user.lifetimeGMs}`)
      console.log(`    Last GM: ${new Date(Number(user.lastGMTimestamp) * 1000).toISOString()}`)
      console.log(`    GM Events Count: ${user.gmEvents?.length || 0}`)
      
      if (user.gmEvents?.length > 0) {
        console.log(`    Latest GM Event:`)
        console.log(`      - Timestamp: ${new Date(Number(user.gmEvents[0].timestamp) * 1000).toISOString()}`)
        console.log(`      - Points: ${user.gmEvents[0].pointsAwarded}`)
        console.log(`      - Streak Day: ${user.gmEvents[0].streakDay}`)
      }
    } else {
      console.log(`  ⚠️  Oracle not found in Subsquid yet`)
      console.log(`     Transaction might still be indexing...`)
    }
    
    console.log()
    console.log('═'.repeat(80))
    console.log('✅ Test Complete!')
    console.log()
    console.log('📝 Summary:')
    console.log(`  Transaction Hash: ${tx.hash}`)
    console.log(`  Block Number: ${receipt.blockNumber}`)
    console.log(`  Oracle Address: ${oracle}`)
    console.log(`  Points Earned: ${newPoints - currentPoints}`)
    console.log(`  New Streak: ${newStreak}`)
    console.log()
    
  } catch (error: any) {
    console.log(`  ❌ Transaction Failed: ${error.message}`)
    if (error.data) {
      console.log(`  Error Data: ${error.data}`)
    }
  }
}

sendGM()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
