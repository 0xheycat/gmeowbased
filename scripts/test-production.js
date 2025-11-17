#!/usr/bin/env node
/**
 * Real-Time Production API Testing
 * Tests actual gmeowhq.art endpoints with evidence-based verification
 */

const PROD_URL = process.env.PROD_URL || 'https://gmeowhq.art'
const TEST_FID = 3 // Valid test FID

// Test results
const results = {
  passed: [],
  failed: [],
  skipped: []
}

async function testEndpoint(name, method, path, options = {}) {
  const url = `${PROD_URL}${path}`
  const startTime = Date.now()
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    })
    
    const duration = Date.now() - startTime
    const status = response.status
    const expectedStatus = options.expectedStatus || 200
    
    // Get response data
    let data
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
    }
    
    // Check if test passed
    const passed = status === expectedStatus
    
    const result = {
      name,
      method,
      path,
      status,
      expectedStatus,
      duration,
      passed,
      data: typeof data === 'string' ? data.substring(0, 200) : data,
      timestamp: new Date().toISOString()
    }
    
    if (passed) {
      results.passed.push(result)
      console.log(`✅ ${name}: ${status} (${duration}ms)`)
    } else {
      results.failed.push(result)
      console.log(`❌ ${name}: Expected ${expectedStatus}, got ${status} (${duration}ms)`)
      if (data.error) console.log(`   Error: ${data.error}`)
    }
    
    return result
  } catch (error) {
    const result = {
      name,
      method,
      path,
      error: error.message,
      passed: false,
      timestamp: new Date().toISOString()
    }
    results.failed.push(result)
    console.log(`❌ ${name}: ${error.message}`)
    return result
  }
}

async function runTests() {
  console.log('🧪 Starting real-time production testing...')
  console.log(`Target: ${PROD_URL}\n`)
  console.log('=' .repeat(80))
  
  // ========== CATEGORY 1: PUBLIC GET ROUTES ==========
  console.log('\n📋 Testing PUBLIC GET routes...\n')
  
  await testEndpoint('Leaderboard', 'GET', '/api/leaderboard')
  await testEndpoint('User Profile', 'GET', `/api/user/profile?fid=${TEST_FID}`)
  await testEndpoint('Viral Stats', 'GET', `/api/viral/stats?fid=${TEST_FID}`)
  await testEndpoint('Analytics Summary', 'GET', '/api/analytics/summary')
  await testEndpoint('Frame Identify', 'GET', `/api/frame/identify?fid=${TEST_FID}`)
  
  // ========== CATEGORY 2: INVALID INPUT TESTS ==========
  console.log('\n📋 Testing INPUT VALIDATION (should return 400)...\n')
  
  await testEndpoint('Invalid FID (negative)', 'GET', '/api/user/profile?fid=-1', { expectedStatus: 400 })
  await testEndpoint('Invalid FID (string)', 'GET', '/api/user/profile?fid=abc', { expectedStatus: 400 })
  await testEndpoint('Invalid FID (zero)', 'GET', '/api/user/profile?fid=0', { expectedStatus: 400 })
  
  // ========== CATEGORY 3: ADMIN ROUTES (should require auth) ==========
  console.log('\n📋 Testing ADMIN routes (should return 401/403)...\n')
  
  await testEndpoint('Admin Webhook Health', 'GET', '/api/admin/viral/webhook-health', { expectedStatus: 401 })
  await testEndpoint('Admin Badges List', 'GET', '/api/admin/badges', { expectedStatus: 401 })
  await testEndpoint('Admin Bot Cast', 'POST', '/api/admin/bot/cast', { expectedStatus: 401 })
  
  // ========== CATEGORY 4: RATE LIMITING TEST ==========
  console.log('\n📋 Testing RATE LIMITING (should get 429)...\n')
  
  console.log('Making 65 rapid requests to trigger rate limit...')
  let rateLimitTriggered = false
  for (let i = 1; i <= 65; i++) {
    const result = await testEndpoint(`Rate Limit Test ${i}`, 'GET', '/api/leaderboard', { expectedStatus: i <= 60 ? 200 : 429 })
    if (result.status === 429) {
      rateLimitTriggered = true
      console.log(`✅ Rate limit triggered after ${i} requests`)
      break
    }
    if (i % 10 === 0) console.log(`   Progress: ${i}/65 requests...`)
  }
  
  if (!rateLimitTriggered) {
    console.log('⚠️ WARNING: Rate limit NOT triggered after 65 requests!')
    results.failed.push({
      name: 'Rate Limiting',
      passed: false,
      error: 'Rate limit not enforced after 65 requests'
    })
  }
  
  // Wait for rate limit to reset
  console.log('\nWaiting 5 seconds for rate limit to reset...\n')
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  // ========== CATEGORY 5: ERROR HANDLING ==========
  console.log('📋 Testing ERROR HANDLING...\n')
  
  await testEndpoint('Malformed JSON', 'POST', '/api/onboard/complete', {
    body: 'invalid json',
    headers: { 'Content-Type': 'text/plain' },
    expectedStatus: 400
  })
  
  // ========== RESULTS SUMMARY ==========
  console.log('\n' + '='.repeat(80))
  console.log('📊 TEST RESULTS SUMMARY')
  console.log('='.repeat(80) + '\n')
  
  const total = results.passed.length + results.failed.length
  const passRate = total > 0 ? Math.round((results.passed.length / total) * 100) : 0
  
  console.log(`Total Tests: ${total}`)
  console.log(`✅ Passed: ${results.passed.length} (${passRate}%)`)
  console.log(`❌ Failed: ${results.failed.length} (${100 - passRate}%)`)
  console.log()
  
  // Show failures
  if (results.failed.length > 0) {
    console.log('❌ FAILED TESTS:\n')
    results.failed.forEach(f => {
      console.log(`  ${f.name}`)
      console.log(`    Path: ${f.method} ${f.path}`)
      console.log(`    Status: ${f.status || 'N/A'} (expected ${f.expectedStatus || 'N/A'})`)
      if (f.error) console.log(`    Error: ${f.error}`)
      if (f.data?.error) console.log(`    API Error: ${f.data.error}`)
      console.log()
    })
  }
  
  // Performance stats
  const successfulTests = results.passed.filter(r => r.duration)
  if (successfulTests.length > 0) {
    const avgDuration = Math.round(
      successfulTests.reduce((sum, r) => sum + r.duration, 0) / successfulTests.length
    )
    const slowest = successfulTests.sort((a, b) => b.duration - a.duration).slice(0, 3)
    
    console.log(`⚡ PERFORMANCE:\n`)
    console.log(`  Average response time: ${avgDuration}ms`)
    console.log(`  Slowest routes:`)
    slowest.forEach(r => {
      console.log(`    - ${r.name}: ${r.duration}ms`)
    })
    console.log()
  }
  
  // Export results
  const fs = await import('fs/promises')
  await fs.writeFile('./production-test-results.json', JSON.stringify(results, null, 2), 'utf-8')
  console.log('📄 Full results exported to: production-test-results.json\n')
  
  // Exit code
  process.exit(results.failed.length > 0 ? 1 : 0)
}

runTests().catch(console.error)
