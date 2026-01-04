#!/usr/bin/env node
/**
 * @file scripts/test-batch-invalidation.js
 * @description Automated tests for batch invalidation utilities
 * 
 * Tests batchInvalidateUserCache, invalidateGuildMembersCache, invalidateTopLeaderboard
 * against running localhost server.
 */

const BASE_URL = 'http://localhost:3000';
const ADMIN_ENDPOINT = `${BASE_URL}/api/admin/scoring`;

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  RESET: '\x1b[0m',
};

let testsPassed = 0;
let testsFailed = 0;

function logTest(msg) {
  console.log(`${COLORS.YELLOW}[TEST]${COLORS.RESET} ${msg}`);
}

function logPass(msg) {
  console.log(`${COLORS.GREEN}[PASS]${COLORS.RESET} ${msg}`);
  testsPassed++;
}

function logFail(msg) {
  console.log(`${COLORS.RED}[FAIL]${COLORS.RESET} ${msg}`);
  testsFailed++;
}

async function testBatchInvalidation() {
  console.log('=== Test 1: Batch Invalidation (Small Batch) ===\n');

  const addresses = [
    '0x1111111111111111111111111111111111111111',
    '0x2222222222222222222222222222222222222222',
    '0x3333333333333333333333333333333333333333',
    '0x4444444444444444444444444444444444444444',
    '0x5555555555555555555555555555555555555555',
  ];

  logTest(`POST /api/admin/scoring (${addresses.length} addresses)`);

  const start = Date.now();
  const response = await fetch(ADMIN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      addresses,
      reason: 'Batch test - small batch',
    }),
  });
  const duration = Date.now() - start;

  if (!response.ok) {
    logFail(`Request failed with status ${response.status}`);
    return;
  }

  const data = await response.json();

  if (data.success === true) {
    logPass(`Batch invalidation successful`);
  } else {
    logFail(`Expected success=true, got success=${data.success}`);
  }

  if (data.invalidated === 5 && data.failed === 0) {
    logPass(`All 5 addresses invalidated (${data.invalidated}/${data.total})`);
  } else {
    logFail(`Expected 5/5, got ${data.invalidated}/${data.total} (failed: ${data.failed})`);
  }

  if (duration < 500) {
    logPass(`Completed in ${duration}ms (<500ms)`);
  } else {
    logFail(`Slow performance: ${duration}ms (expected <500ms)`);
  }

  console.log('');
}

async function testLargeBatchInvalidation() {
  console.log('=== Test 2: Batch Invalidation (Large Batch) ===\n');

  // Generate 100 addresses
  const addresses = Array.from({ length: 100 }, (_, i) => {
    const hex = i.toString(16).padStart(40, '0');
    return `0x${hex}`;
  });

  logTest(`POST /api/admin/scoring (${addresses.length} addresses)`);

  const start = Date.now();
  const response = await fetch(ADMIN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      addresses,
      reason: 'Batch test - large batch',
    }),
  });
  const duration = Date.now() - start;

  if (!response.ok) {
    logFail(`Request failed with status ${response.status}`);
    return;
  }

  const data = await response.json();

  if (data.success === true) {
    logPass(`Large batch invalidation successful`);
  } else {
    logFail(`Expected success=true, got success=${data.success}`);
  }

  if (data.invalidated === 100 && data.failed === 0) {
    logPass(`All 100 addresses invalidated (${data.invalidated}/${data.total})`);
  } else {
    logFail(`Expected 100/100, got ${data.invalidated}/${data.total} (failed: ${data.failed})`);
  }

  if (duration < 2000) {
    logPass(`Completed in ${duration}ms (<2s for 100 addresses)`);
  } else {
    logFail(`Slow performance: ${duration}ms (expected <2s)`);
  }

  console.log('');
}

async function testPartialFailureHandling() {
  console.log('=== Test 3: Partial Failure Handling ===\n');

  // Mix of valid and invalid addresses
  const addresses = [
    '0x1111111111111111111111111111111111111111',
    'invalid_address',
    '0x2222222222222222222222222222222222222222',
    '0x123', // Too short
    '0x3333333333333333333333333333333333333333',
  ];

  logTest(`POST /api/admin/scoring (mixed valid/invalid)`);

  const response = await fetch(ADMIN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      addresses,
      reason: 'Batch test - partial failure',
    }),
  });

  if (response.status === 400) {
    logPass(`Invalid addresses rejected with 400 status`);

    const data = await response.json();

    if (data.error === 'Invalid addresses') {
      logPass(`Correct error message: "${data.error}"`);
    } else {
      logFail(`Wrong error message: "${data.error}"`);
    }

    if (Array.isArray(data.invalidAddresses) && data.invalidAddresses.length === 2) {
      logPass(`Identified 2 invalid addresses`);
    } else {
      logFail(`Expected 2 invalid addresses, got ${data.invalidAddresses?.length || 0}`);
    }
  } else {
    logFail(`Expected 400 status, got ${response.status}`);
  }

  console.log('');
}

async function testPerformanceThreshold() {
  console.log('=== Test 4: Performance Threshold ===\n');

  // Test different batch sizes
  const batchSizes = [1, 10, 50];

  for (const size of batchSizes) {
    const addresses = Array.from({ length: size }, (_, i) => {
      const hex = (i + 1000).toString(16).padStart(40, '0');
      return `0x${hex}`;
    });

    logTest(`Testing batch size: ${size}`);

    const start = Date.now();
    const response = await fetch(ADMIN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        addresses,
        reason: `Performance test - ${size} addresses`,
      }),
    });
    const duration = Date.now() - start;

    if (!response.ok) {
      logFail(`Request failed for batch size ${size}`);
      continue;
    }

    const data = await response.json();

    // Performance expectations
    const threshold = size === 1 ? 200 : size === 10 ? 500 : 1500;

    if (duration < threshold) {
      logPass(`Batch ${size}: ${duration}ms (<${threshold}ms)`);
    } else {
      logFail(`Batch ${size}: ${duration}ms (expected <${threshold}ms)`);
    }
  }

  console.log('');
}

async function runAllTests() {
  console.log('=== Batch Invalidation Utility Tests ===\n');

  // Check if server is running
  try {
    const response = await fetch(BASE_URL);
    if (!response.ok) {
      throw new Error('Server not responding');
    }
    logPass(`Server is running at ${BASE_URL}`);
    console.log('');
  } catch (error) {
    logFail(`Server is not running at ${BASE_URL}`);
    console.log('Please start the dev server with: pnpm dev\n');
    process.exit(1);
  }

  // Run all tests
  await testBatchInvalidation();
  await testLargeBatchInvalidation();
  await testPartialFailureHandling();
  await testPerformanceThreshold();

  // Print summary
  console.log('=== Test Results Summary ===\n');
  console.log(`Tests Passed: ${testsPassed}`);
  console.log(`Tests Failed: ${testsFailed}`);
  console.log(`Total Tests: ${testsPassed + testsFailed}\n`);

  if (testsFailed === 0) {
    console.log(`${COLORS.GREEN}✓ All tests passed!${COLORS.RESET}`);
    process.exit(0);
  } else {
    console.log(`${COLORS.RED}✗ Some tests failed${COLORS.RESET}`);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error(`${COLORS.RED}[ERROR]${COLORS.RESET} ${error.message}`);
  process.exit(1);
});
