/**
 * Test Idempotency Keys System
 * 
 * Tests:
 * 1. Duplicate requests with same idempotency key return cached response
 * 2. Different idempotency keys create separate operations
 * 3. Invalid idempotency keys are rejected
 * 4. Requests without idempotency keys work normally
 */

import { randomUUID } from 'crypto'

const API_URL = 'http://localhost:3000/api/guild/create'
const TEST_ADDRESS = '0x1234567890123456789012345678901234567890'

interface TestResult {
  test: string
  passed: boolean
  details?: any
  error?: string
}

const results: TestResult[] = []

/**
 * Test 1: Duplicate requests with same idempotency key
 */
async function testDuplicateIdempotencyKey() {
  console.log('\n[TEST 1] Duplicate requests with same idempotency key...')
  
  const idempotencyKey = randomUUID()
  const testData = {
    guildName: 'Test Guild Alpha',
    address: TEST_ADDRESS
  }
  
  try {
    // First request
    const response1 = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(testData)
    })
    
    const data1 = await response1.json()
    const replayed1 = response1.headers.get('X-Idempotency-Replayed')
    
    // Second request (should be cached)
    const response2 = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(testData)
    })
    
    const data2 = await response2.json()
    const replayed2 = response2.headers.get('X-Idempotency-Replayed')
    
    const passed = 
      replayed1 !== 'true' && 
      replayed2 === 'true' &&
      JSON.stringify(data1) === JSON.stringify(data2)
    
    results.push({
      test: 'Duplicate requests with same idempotency key',
      passed,
      details: {
        firstRequest: { replayed: replayed1, status: response1.status },
        secondRequest: { replayed: replayed2, status: response2.status },
        responsesMatch: JSON.stringify(data1) === JSON.stringify(data2)
      }
    })
    
    console.log(`✓ First request: replayed=${replayed1}`)
    console.log(`✓ Second request: replayed=${replayed2}`)
    console.log(`✓ Responses match: ${JSON.stringify(data1) === JSON.stringify(data2)}`)
    
  } catch (error: any) {
    results.push({
      test: 'Duplicate requests with same idempotency key',
      passed: false,
      error: error.message
    })
    console.error('✗ Test failed:', error.message)
  }
}

/**
 * Test 2: Different idempotency keys create separate operations
 */
async function testDifferentIdempotencyKeys() {
  console.log('\n[TEST 2] Different idempotency keys create separate operations...')
  
  const idempotencyKey1 = randomUUID()
  const idempotencyKey2 = randomUUID()
  const testData = {
    guildName: 'Test Guild Beta',
    address: TEST_ADDRESS
  }
  
  try {
    // First request
    const response1 = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey1
      },
      body: JSON.stringify(testData)
    })
    
    const replayed1 = response1.headers.get('X-Idempotency-Replayed')
    
    // Second request with different key
    const response2 = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey2
      },
      body: JSON.stringify(testData)
    })
    
    const replayed2 = response2.headers.get('X-Idempotency-Replayed')
    
    const passed = replayed1 !== 'true' && replayed2 !== 'true'
    
    results.push({
      test: 'Different idempotency keys create separate operations',
      passed,
      details: {
        firstRequest: { replayed: replayed1, status: response1.status },
        secondRequest: { replayed: replayed2, status: response2.status }
      }
    })
    
    console.log(`✓ First request: replayed=${replayed1}`)
    console.log(`✓ Second request: replayed=${replayed2}`)
    
  } catch (error: any) {
    results.push({
      test: 'Different idempotency keys create separate operations',
      passed: false,
      error: error.message
    })
    console.error('✗ Test failed:', error.message)
  }
}

/**
 * Test 3: Invalid idempotency keys are rejected
 */
async function testInvalidIdempotencyKey() {
  console.log('\n[TEST 3] Invalid idempotency keys are rejected...')
  
  const invalidKey = 'too-short'
  const testData = {
    guildName: 'Test Guild Gamma',
    address: TEST_ADDRESS
  }
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': invalidKey
      },
      body: JSON.stringify(testData)
    })
    
    const data = await response.json()
    
    const passed = response.status === 400 && 
                   data.message?.includes('Invalid idempotency key format')
    
    results.push({
      test: 'Invalid idempotency keys are rejected',
      passed,
      details: {
        status: response.status,
        message: data.message
      }
    })
    
    console.log(`✓ Status: ${response.status}`)
    console.log(`✓ Message: ${data.message}`)
    
  } catch (error: any) {
    results.push({
      test: 'Invalid idempotency keys are rejected',
      passed: false,
      error: error.message
    })
    console.error('✗ Test failed:', error.message)
  }
}

/**
 * Test 4: Requests without idempotency keys work normally
 */
async function testNoIdempotencyKey() {
  console.log('\n[TEST 4] Requests without idempotency keys work normally...')
  
  const testData = {
    guildName: 'Test Guild Delta',
    address: TEST_ADDRESS
  }
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    })
    
    const data = await response.json()
    const replayed = response.headers.get('X-Idempotency-Replayed')
    
    const passed = replayed !== 'true' && (response.status === 200 || response.status === 403)
    
    results.push({
      test: 'Requests without idempotency keys work normally',
      passed,
      details: {
        status: response.status,
        replayed: replayed,
        success: data.success
      }
    })
    
    console.log(`✓ Status: ${response.status}`)
    console.log(`✓ Replayed: ${replayed}`)
    
  } catch (error: any) {
    results.push({
      test: 'Requests without idempotency keys work normally',
      passed: false,
      error: error.message
    })
    console.error('✗ Test failed:', error.message)
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('='.repeat(60))
  console.log('IDEMPOTENCY KEYS SYSTEM TEST')
  console.log('='.repeat(60))
  
  await testDuplicateIdempotencyKey()
  await testDifferentIdempotencyKeys()
  await testInvalidIdempotencyKey()
  await testNoIdempotencyKey()
  
  console.log('\n' + '='.repeat(60))
  console.log('TEST RESULTS')
  console.log('='.repeat(60))
  
  let passedCount = 0
  results.forEach(result => {
    const status = result.passed ? '✓ PASS' : '✗ FAIL'
    console.log(`\n${status}: ${result.test}`)
    
    if (result.passed) {
      passedCount++
      if (result.details) {
        console.log('  Details:', JSON.stringify(result.details, null, 2))
      }
    } else {
      if (result.error) {
        console.log('  Error:', result.error)
      }
    }
  })
  
  console.log('\n' + '='.repeat(60))
  console.log(`SUMMARY: ${passedCount}/${results.length} tests passed`)
  console.log('='.repeat(60))
  
  process.exit(passedCount === results.length ? 0 : 1)
}

// Run tests
runTests().catch(console.error)
