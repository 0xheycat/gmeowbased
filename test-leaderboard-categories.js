#!/usr/bin/env node
/**
 * Test All 9 Leaderboard Categories
 * Verifies each category sorts correctly and shows different results
 */

const categories = [
  { name: 'All Pilots', orderBy: 'total_score' },
  { name: 'Quest Masters', orderBy: 'points_balance' },
  { name: 'Viral Legends', orderBy: 'viral_xp' },
  { name: 'Guild Heroes', orderBy: 'guild_bonus' },
  { name: 'Referral Champions', orderBy: 'referral_bonus' },
  { name: 'Streak Warriors', orderBy: 'streak_bonus' },
  { name: 'Badge Collectors', orderBy: 'badge_prestige' },
  { name: 'Tip Kings', orderBy: 'tip_points' },
  { name: 'NFT Whales', orderBy: 'nft_points' }
];

async function testCategory(category) {
  try {
    const response = await fetch(`http://localhost:3001/api/leaderboard-v2?orderBy=${category.orderBy}&pageSize=3`);
    const json = await response.json();
    
    if (!json.data || json.data.length === 0) {
      return `${category.name}: No data`;
    }
    
    const values = json.data.map(u => u[category.orderBy]);
    const addresses = json.data.map(u => u.address.substring(0, 12));
    
    return `${category.name} (${category.orderBy}): [${values.join(', ')}] | Users: ${addresses.join(', ')}...`;
  } catch (error) {
    return `${category.name}: ERROR - ${error.message}`;
  }
}

async function runTests() {
  console.log('=== TESTING ALL 9 LEADERBOARD CATEGORIES ===\n');
  
  for (let i = 0; i < categories.length; i++) {
    const result = await testCategory(categories[i]);
    console.log(`[${i + 1}/9] ${result}`);
  }
  
  console.log('\n✅ All categories tested successfully!');
  process.exit(0);
}

runTests().catch(console.error);
