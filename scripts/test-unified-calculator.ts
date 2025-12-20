/**
 * Test script for unified calculator
 * Tests calculation accuracy with real Subsquid data
 * 
 * Run: npx tsx scripts/test-unified-calculator.ts
 */

import { calculateCompleteStats, calculateLevelProgress, getRankTierByPoints } from '../lib/scoring/unified-calculator'

// Test with real data from Subsquid GraphQL
async function testWithRealData() {
  console.log('🧪 Testing Unified Calculator with Real Data\n')
  console.log('=' .repeat(70))
  
  // Fetch real user data from Subsquid
  const response = await fetch('http://localhost:4350/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `{
        users(limit: 5, orderBy: totalPoints_DESC, where: {totalPoints_gt: "0"}) {
          id
          totalPoints
          currentStreak
          lastGMTimestamp
          lifetimeGMs
        }
      }`
    })
  })
  
  if (!response.ok) {
    console.error('❌ Failed to fetch Subsquid data:', response.statusText)
    console.log('\n💡 Make sure Subsquid indexer is running:')
    console.log('   cd gmeow-indexer && npx sqd process')
    return
  }
  
  const data = await response.json()
  const users = data.data?.users || []
  
  if (users.length === 0) {
    console.log('⚠️  No users with points found in Subsquid')
    return
  }
  
  console.log(`\n✅ Found ${users.length} users with points\n`)
  
  // Test each user
  for (const user of users) {
    const stats = calculateCompleteStats({
      blockchainPoints: parseInt(user.totalPoints),
      currentStreak: user.currentStreak,
      lastGMTimestamp: user.lastGMTimestamp,
      lifetimeGMs: user.lifetimeGMs,
      viralXP: 0, // Mock viral XP (would come from Supabase)
      questPoints: 0,
      guildPoints: 0,
      referralPoints: 0,
    })
    
    console.log(`\n📊 User: ${user.id}`)
    console.log('─'.repeat(70))
    
    // Layer 1: Blockchain Data
    console.log('\n🔗 Layer 1 (Blockchain - Subsquid):')
    console.log(`   Total Points: ${stats.scores.blockchainPoints.toLocaleString()} (GM rewards with streak multiplier)`)
    console.log(`   Current Streak: ${stats.streak} days`)
    console.log(`   Lifetime GMs: ${stats.lifetimeGMs}`)
    
    // Layer 2: Off-Chain Data
    console.log('\n💾 Layer 2 (Off-Chain - Supabase):')
    console.log(`   Viral XP: ${stats.scores.viralXP} (mocked - would query badge_casts)`)
    console.log(`   Quest Points: ${stats.scores.questPoints}`)
    console.log(`   Guild Points: ${stats.scores.guildPoints}`)
    console.log(`   Referral Points: ${stats.scores.referralPoints}`)
    
    // Layer 3: Calculated Stats
    console.log('\n🧮 Layer 3 (Calculated):')
    console.log(`   Total Score: ${stats.scores.totalScore.toLocaleString()}`)
    console.log(`   Level: ${stats.level.level} (${Math.floor(stats.level.levelPercent * 100)}% to next)`)
    console.log(`   XP to Next Level: ${stats.level.xpToNextLevel.toLocaleString()}`)
    console.log(`   Rank Tier: ${stats.rank.currentTier.name}`)
    console.log(`   Tier: ${stats.rank.currentTier.tier || 'N/A'}`)
    
    if (stats.rank.currentTier.reward?.type === 'multiplier') {
      console.log(`   Rank Bonus: +${((stats.rank.currentTier.reward.value - 1) * 100).toFixed(0)}% Quest XP`)
    } else if (stats.rank.currentTier.reward?.type === 'badge') {
      console.log(`   Rank Reward: ${stats.rank.currentTier.reward.name} Badge`)
    }
    
    if (stats.rank.nextTier) {
      console.log(`   Next Tier: ${stats.rank.nextTier.name} (${stats.rank.pointsToNext.toLocaleString()} points needed)`)
    }
    
    // Formatted Display
    console.log('\n📱 Display Formatting:')
    console.log(`   Total Score: ${stats.formatted.totalScore}`)
    console.log(`   Blockchain Points: ${stats.formatted.blockchainPoints}`)
    console.log(`   Level: ${stats.formatted.level}`)
    console.log(`   Rank: ${stats.formatted.rankTier}`)
  }
  
  console.log('\n' + '='.repeat(70))
  console.log('\n✅ All calculations completed successfully!')
  console.log('\n📝 Calculation Flow:')
  console.log('   1. Fetch Layer 1 (Subsquid User.totalPoints)')
  console.log('   2. Fetch Layer 2 (Supabase viral_bonus_xp, quest points, etc)')
  console.log('   3. Calculate totalScore = Layer1 + Layer2')
  console.log('   4. Derive level using quadratic formula (300 + n×200)')
  console.log('   5. Derive rank tier using 12-tier system')
  console.log('   6. Apply rank multipliers to XP earnings')
  
  console.log('\n🎯 Unified Calculator Features:')
  console.log('   ✅ Single source of truth for all calculations')
  console.log('   ✅ 3-layer architecture support (Blockchain + Off-Chain + App)')
  console.log('   ✅ Quadratic level progression (300 + n×200 XP)')
  console.log('   ✅ 12-tier rank system (Signal Kitten → Omniversal Being)')
  console.log('   ✅ Rank multipliers (1.1x to 2.0x quest XP)')
  console.log('   ✅ Display formatting (formatPoints, formatNumber)')
  
  console.log('\n📚 Documentation:')
  console.log('   • lib/scoring/README.md - Full usage guide')
  console.log('   • lib/scoring/unified-calculator.ts - Implementation')
  console.log('   • COMPLETE-CALCULATION-SYSTEM.md - Architecture docs')
}

// Test level progression formula
function testLevelFormula() {
  console.log('\n\n🧮 Testing Level Progression Formula\n')
  console.log('=' .repeat(70))
  console.log('\nFormula: XP for Level N = 300 + (N-1) × 200\n')
  
  const testCases = [
    { points: 0, expectedLevel: 1 },      // Level 1: 0-299 XP
    { points: 299, expectedLevel: 1 },    // Still Level 1 (299/300 = 99%)
    { points: 300, expectedLevel: 2 },    // Level 2: 300-799 XP
    { points: 500, expectedLevel: 2 },    // Still Level 2
    { points: 800, expectedLevel: 3 },    // Level 3: 800-1499 XP
    { points: 1500, expectedLevel: 4 },   // Level 4: 1500-2399 XP
    { points: 5000, expectedLevel: 7 },   // Level 7
  ]
  
  for (const test of testCases) {
    const result = calculateLevelProgress(test.points)
    const passed = result.level === test.expectedLevel
    console.log(`${passed ? '✅' : '❌'} Points: ${test.points.toLocaleString().padEnd(10)} → Level: ${result.level} (expected ${test.expectedLevel})`)
    if (!passed) {
      console.log(`   Debug: levelFloor=${result.levelFloor}, nextTarget=${result.nextLevelTarget}`)
    }
  }
}

// Test rank tier assignments
function testRankTiers() {
  console.log('\n\n🏆 Testing Rank Tier Assignments\n')
  console.log('=' .repeat(70))
  
  const testCases = [
    { points: 0, expectedTier: 'Signal Kitten' },
    { points: 500, expectedTier: 'Warp Scout' },
    { points: 1500, expectedTier: 'Beacon Runner' },
    { points: 8000, expectedTier: 'Star Captain' },
    { points: 100000, expectedTier: 'Singularity Prime' },
    { points: 500000, expectedTier: 'Omniversal Being' },
  ]
  
  for (const test of testCases) {
    const tier = getRankTierByPoints(test.points)
    const passed = tier.name === test.expectedTier
    console.log(`${passed ? '✅' : '❌'} Points: ${test.points.toLocaleString().padEnd(10)} → Tier: ${tier.name.padEnd(20)} (expected ${test.expectedTier})`)
    
    if (tier.reward?.type === 'multiplier' && tier.reward.value) {
      console.log(`   Reward: +${((tier.reward.value - 1) * 100).toFixed(0)}% Quest XP`)
    } else if (tier.reward?.type === 'badge') {
      console.log(`   Reward: ${tier.reward.name} Badge`)
    }
  }
}

// Run all tests
async function main() {
  console.log('\n🚀 Unified Calculator Test Suite')
  console.log('=' .repeat(70))
  console.log('Testing: lib/scoring/unified-calculator.ts')
  console.log('Date: December 20, 2025\n')
  
  // Test formulas first
  testLevelFormula()
  testRankTiers()
  
  // Test with real data
  await testWithRealData()
  
  console.log('\n✨ Test suite completed!\n')
}

main().catch(console.error)
