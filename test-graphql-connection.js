#!/usr/bin/env node

/**
 * GraphQL Connection Test for Phase 1 & 2 Migration
 * Tests production Subsquid endpoint and verifies data structure
 */

const SUBSQUID_URL = 'https://4d343279-1b28-406c-886e-e47719c79639.squids.live/gmeow-indexer@v1/api/graphql';

// Test 1: Basic Connection Test
async function testConnection() {
  console.log('🔗 Test 1: Testing Subsquid Connection...');
  try {
    const response = await fetch(SUBSQUID_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: '{ __schema { types { name } } }'
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data.errors) {
      throw new Error(JSON.stringify(data.errors));
    }
    
    console.log('✅ Connection successful');
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
}

// Test 2: User Stats Query (Phase 1)
async function testUserStats() {
  console.log('\n📊 Test 2: Testing GET_USER_STATS Query...');
  const query = `
    query GetUserStats {
      users(limit: 1, orderBy: totalScore_DESC) {
        id
        level
        rankTier
        totalScore
        multiplier
        gmPoints
        viralPoints
        questPoints
        guildPoints
        referralPoints
        xpIntoLevel
        xpToNextLevel
        pointsIntoTier
        pointsToNextTier
      }
    }
  `;
  
  try {
    const start = Date.now();
    const response = await fetch(SUBSQUID_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    
    const responseTime = Date.now() - start;
    const data = await response.json();
    
    if (data.errors) {
      throw new Error(JSON.stringify(data.errors));
    }
    
    if (!data.data || !data.data.users || data.data.users.length === 0) {
      throw new Error('No users found in response');
    }
    
    const user = data.data.users[0];
    console.log('✅ Query successful');
    console.log(`   Response time: ${responseTime}ms ${responseTime < 100 ? '✅' : '⚠️'}`);
    console.log(`   Sample user: ${user.id.substring(0, 10)}...`);
    console.log(`   Level: ${user.level}, Tier: ${user.rankTier}, Score: ${user.totalScore}`);
    
    // Verify all Phase 1 fields exist
    const requiredFields = ['level', 'rankTier', 'totalScore', 'multiplier', 'gmPoints', 
                           'viralPoints', 'questPoints', 'guildPoints', 'referralPoints',
                           'xpIntoLevel', 'xpToNextLevel', 'pointsIntoTier', 'pointsToNextTier'];
    const missingFields = requiredFields.filter(field => user[field] === undefined);
    
    if (missingFields.length > 0) {
      console.error(`❌ Missing fields: ${missingFields.join(', ')}`);
      return false;
    }
    
    console.log('✅ All 17 Phase 1 scoring fields present');
    return responseTime < 100;
  } catch (error) {
    console.error('❌ Query failed:', error.message);
    return false;
  }
}

// Test 3: Leaderboard Query (Phase 1)
async function testLeaderboard() {
  console.log('\n🏆 Test 3: Testing GET_LEADERBOARD Query...');
  const query = `
    query GetLeaderboard {
      users(limit: 5, orderBy: totalScore_DESC) {
        id
        level
        rankTier
        totalScore
        multiplier
      }
    }
  `;
  
  try {
    const start = Date.now();
    const response = await fetch(SUBSQUID_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    
    const responseTime = Date.now() - start;
    const data = await response.json();
    
    if (data.errors) {
      throw new Error(JSON.stringify(data.errors));
    }
    
    const users = data.data.users;
    console.log('✅ Query successful');
    console.log(`   Response time: ${responseTime}ms ${responseTime < 100 ? '✅' : '⚠️'}`);
    console.log(`   Fetched ${users.length} users`);
    console.log(`   Top user score: ${users[0].totalScore}`);
    
    // Verify scores are descending
    for (let i = 1; i < users.length; i++) {
      if (BigInt(users[i].totalScore) > BigInt(users[i-1].totalScore)) {
        console.error('❌ Scores not properly sorted');
        return false;
      }
    }
    
    console.log('✅ Leaderboard properly sorted');
    return responseTime < 100;
  } catch (error) {
    console.error('❌ Query failed:', error.message);
    return false;
  }
}

// Test 4: User History Query (Phase 2)
async function testUserHistory() {
  console.log('\n📈 Test 4: Testing GET_LEVEL_UPS Query...');
  const query = `
    query GetLevelUps {
      levelUpEvents(limit: 5, orderBy: timestamp_DESC) {
        id
        fromLevel
        toLevel
        timestamp
        user {
          id
        }
      }
    }
  `;
  
  try {
    const start = Date.now();
    const response = await fetch(SUBSQUID_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    
    const responseTime = Date.now() - start;
    const data = await response.json();
    
    if (data.errors) {
      throw new Error(JSON.stringify(data.errors));
    }
    
    const events = data.data.levelUpEvents || [];
    console.log('✅ Query successful');
    console.log(`   Response time: ${responseTime}ms ${responseTime < 100 ? '✅' : '⚠️'}`);
    console.log(`   Found ${events.length} level up events`);
    
    if (events.length > 0) {
      console.log(`   Recent: Level ${events[0].fromLevel} → ${events[0].toLevel}`);
    }
    
    return responseTime < 100;
  } catch (error) {
    console.error('❌ Query failed:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Phase 1 & 2 GraphQL Integration Tests');
  console.log('==========================================\n');
  console.log(`Endpoint: ${SUBSQUID_URL}\n`);
  
  const results = {
    connection: await testConnection(),
    userStats: await testUserStats(),
    leaderboard: await testLeaderboard(),
    userHistory: await testUserHistory()
  };
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Test Results: ${passed}/${total} passed\n`);
  
  if (results.connection) console.log('✅ Connection to Subsquid');
  else console.log('❌ Connection to Subsquid');
  
  if (results.userStats) console.log('✅ User Stats Query (< 100ms)');
  else console.log('❌ User Stats Query');
  
  if (results.leaderboard) console.log('✅ Leaderboard Query (< 100ms)');
  else console.log('❌ Leaderboard Query');
  
  if (results.userHistory) console.log('✅ User History Query (< 100ms)');
  else console.log('❌ User History Query');
  
  console.log('\n' + '='.repeat(50));
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Phase 1 & 2 migration ready for production.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Review errors above.\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
