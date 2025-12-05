#!/usr/bin/env tsx
/**
 * New Quest API Testing Script
 * 
 * Tests the NEW quest system APIs built during Foundation Rebuild
 * - Uses Supabase database (not on-chain contracts)
 * - Tests with REAL Farcaster data from @heycat (FID 18139)
 * 
 * APIs Tested:
 * 1. GET /api/quests - List all active quests
 * 2. GET /api/quests/[slug] - Get quest details with user progress
 * 3. POST /api/quests/[slug]/progress - Check quest completion
 * 
 * Run: pnpm tsx scripts/test-new-quest-api.ts
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// ===== REAL USER DATA (FID: 18139, @heycat) =====
const TEST_USER_FID = 18139; // Real FID from @heycat
const TEST_USER_ADDRESS = '0x8a3094e44577579d6f41F6214a86C250b7dBDC4e'; // Real wallet

// Real Farcaster activity data
const REAL_FARCASTER_DATA = {
  castWithMention: {
    hash: '0x29fd15a5',
    url: 'https://farcaster.xyz/heycat/0x29fd15a5',
    authorFid: 18139,
    mentionsFid: 1069798, // @gmeow bot
    text: 'tag', // Contains this word
  },
  quoteTarget: {
    hash: '0xd7bc2732',
    authorUsername: 'jesse.base.eth',
    quotedBy: '0xda7511e5', // heycat's quote cast
  },
  recastTarget: {
    hash: '0x3b7cfa06',
    authorUsername: 'joetir1',
    url: 'https://farcaster.xyz/joetir1/0x3b7cfa06',
    hasRecast: true, // @heycat has recast this
    hasLike: true,   // @heycat has liked this
  },
  replyFromUser: {
    hash: '0x75b6d196',
    authorFid: 346302, // @garrycrypto
    authorUsername: 'garrycrypto',
    url: 'https://farcaster.xyz/garrycrypto/0x75b6d196',
    parentHash: '0xda7511e5', // Replying to heycat's cast
  },
};

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  response?: any;
  error?: string;
}

const results: TestResult[] = [];

function printHeader(title: string) {
  console.log('\n' + '═'.repeat(60));
  console.log(`   ${title}`);
  console.log('═'.repeat(60));
}

function printResult(result: TestResult) {
  const icon = result.passed ? '✓' : '✗';
  const color = result.passed ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';
  
  console.log(`\n${color}${icon} ${result.name}${reset}`);
  console.log(`  Duration: ${result.duration}ms`);
  
  if (result.error) {
    console.log(`  Error: ${result.error}`);
  } else if (result.response) {
    console.log(`  Response:`, JSON.stringify(result.response, null, 2).split('\n').slice(0, 10).join('\n'));
  }
}

async function testApi(
  name: string,
  url: string,
  options: RequestInit = {}
): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    const duration = Date.now() - startTime;
    const data = await response.json();
    
    const passed = response.ok;
    
    return {
      name,
      passed,
      duration,
      response: data,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      name,
      passed: false,
      duration,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runTests() {
  printHeader('New Quest API Testing Suite');
  console.log(`API URL: ${API_BASE_URL}`);
  console.log(`Test User FID: ${TEST_USER_FID}`);
  console.log(`Test User Address: ${TEST_USER_ADDRESS}`);
  
  // ===== TEST 1: List All Quests =====
  printHeader('TEST 1: GET /api/quests (List All Active Quests)');
  
  const test1 = await testApi(
    'List all quests',
    `${API_BASE_URL}/api/quests`
  );
  results.push(test1);
  printResult(test1);
  
  // Extract quest IDs for next tests
  let questIds: number[] = [];
  if (test1.passed && test1.response?.data) {
    questIds = test1.response.data
      .slice(0, 3) // Test first 3 quests
      .map((q: any) => q.id)
      .filter(Boolean);
    
    console.log(`\n  Found ${test1.response.data.length} quests`);
    console.log(`  Testing with IDs: ${questIds.join(', ')}`);
  }
  
  // ===== TEST 2: Filter Quests by Category =====
  printHeader('TEST 2: GET /api/quests?category=social');
  
  const test2 = await testApi(
    'Filter quests (social category)',
    `${API_BASE_URL}/api/quests?category=social`
  );
  results.push(test2);
  printResult(test2);
  
  if (test2.passed && test2.response?.data) {
    console.log(`  Social quests: ${test2.response.data.length}`);
  }
  
  // ===== TEST 3: Filter Quests by Difficulty =====
  printHeader('TEST 3: GET /api/quests?difficulty=beginner');
  
  const test3 = await testApi(
    'Filter quests (beginner difficulty)',
    `${API_BASE_URL}/api/quests?difficulty=beginner`
  );
  results.push(test3);
  printResult(test3);
  
  if (test3.passed && test3.response?.data) {
    console.log(`  Beginner quests: ${test3.response.data.length}`);
  }
  
  // ===== TEST 4: Search Quests =====
  printHeader('TEST 4: GET /api/quests?search=follow');
  
  const test4 = await testApi(
    'Search quests (keyword: follow)',
    `${API_BASE_URL}/api/quests?search=follow`
  );
  results.push(test4);
  printResult(test4);
  
  if (test4.passed && test4.response?.data) {
    console.log(`  Search results: ${test4.response.data.length}`);
  }
  
  // ===== TEST 5: Get Quest Details (with user progress) =====
  if (questIds.length > 0) {
    printHeader(`TEST 5: GET /api/quests/${questIds[0]}?userFid=${TEST_USER_FID}`);
    
    const test5 = await testApi(
      'Get quest details with user progress',
      `${API_BASE_URL}/api/quests/${questIds[0]}?userFid=${TEST_USER_FID}`
    );
    results.push(test5);
    printResult(test5);
    
    if (test5.passed && test5.response) {
      const quest = test5.response;
      console.log(`\n  Quest: ${quest.title || quest.id}`);
      console.log(`  Type: ${quest.type}`);
      console.log(`  Category: ${quest.category}`);
      console.log(`  XP Reward: ${quest.reward_points || 0}`);
      console.log(`  User Progress: ${quest.user_progress?.status || 'not_started'}`);
    }
  }
  
  // ===== TEST 6: Check Quest Progress =====
  if (questIds.length > 0) {
    printHeader(`TEST 6: POST /api/quests/${questIds[0]}/progress`);
    
    const test6 = await testApi(
      'Check quest progress',
      `${API_BASE_URL}/api/quests/${questIds[0]}/progress`,
      {
        method: 'POST',
        body: JSON.stringify({
          userFid: TEST_USER_FID,
          walletAddress: TEST_USER_ADDRESS,
        }),
      }
    );
    results.push(test6);
    printResult(test6);
    
    if (test6.passed && test6.response) {
      console.log(`\n  Progress Status: ${test6.response.status || 'unknown'}`);
      console.log(`  Current Step: ${test6.response.current_step || 0}`);
      console.log(`  Completed: ${test6.response.is_completed ? 'Yes' : 'No'}`);
    }
  }
  
  // ===== TEST 7: Invalid Quest ID (Error Handling) =====
  printHeader('TEST 7: GET /api/quests/99999?userFid=18139');
  
  const test7 = await testApi(
    'Invalid quest ID (should return 404)',
    `${API_BASE_URL}/api/quests/99999?userFid=${TEST_USER_FID}`
  );
  results.push(test7);
  
  // For this test, 404 is expected (passed = false but expected)
  const expectedError = !test7.passed && test7.response?.error;
  console.log(`\n${expectedError ? '✓' : '✗'} Invalid quest ID handled correctly`);
  console.log(`  Duration: ${test7.duration}ms`);
  if (test7.response) {
    console.log(`  Error Type: ${test7.response.type || 'unknown'}`);
    console.log(`  Message: ${test7.response.message || 'N/A'}`);
  }
  
  // ===== TEST 8: Missing UserFid (Validation Error) =====
  if (questIds.length > 0) {
    printHeader(`TEST 8: GET /api/quests/${questIds[0]} (Missing userFid)`);
    
    const test8 = await testApi(
      'Missing userFid parameter (should return 400)',
      `${API_BASE_URL}/api/quests/${questIds[0]}`
    );
    results.push(test8);
    
    const expectedValidationError = !test8.passed && test8.response?.type === 'VALIDATION';
    console.log(`\n${expectedValidationError ? '✓' : '✗'} Validation error handled correctly`);
    console.log(`  Duration: ${test8.duration}ms`);
    if (test8.response) {
      console.log(`  Error Type: ${test8.response.type || 'unknown'}`);
      console.log(`  Message: ${test8.response.message || 'N/A'}`);
    }
  }
  
  // ===== SUMMARY =====
  printHeader('Test Summary');
  
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  const avgDuration = Math.round(
    results.reduce((sum, r) => sum + r.duration, 0) / results.length
  );
  
  console.log(`\nTotal Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Average Duration: ${avgDuration}ms`);
  
  console.log('\n' + '═'.repeat(60));
  
  if (passedTests === totalTests) {
    console.log('✓ ALL TESTS PASSED');
  } else if (passedTests > totalTests / 2) {
    console.log('⚠ MOST TESTS PASSED');
  } else {
    console.log('✗ TESTS FAILED');
    process.exit(1);
  }
  
  console.log('═'.repeat(60) + '\n');
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
