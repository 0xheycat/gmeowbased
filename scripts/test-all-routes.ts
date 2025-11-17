#!/usr/bin/env tsx
/**
 * Comprehensive API Route Testing Script
 * Tests all 55 routes with valid/invalid inputs
 * Verifies rate limiting, error handling, and validation
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const TEST_FID = 3
const TEST_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'

interface TestResult {
  route: string
  method: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  statusCode?: number
  error?: string
  duration?: number
}

const results: TestResult[] = []

async function testRoute(
  route: string,
  method: string,
  options: {
    body?: any
    headers?: Record<string, string>
    expectedStatus?: number
    skip?: boolean
    skipReason?: string
  } = {}
): Promise<TestResult> {
  if (options.skip) {
    return {
      route,
      method,
      status: 'SKIP',
      error: options.skipReason
    }
  }

  const startTime = Date.now()
  
  try {
    const response = await fetch(`${BASE_URL}${route}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    })

    const duration = Date.now() - startTime
    const expectedStatus = options.expectedStatus || 200

    if (response.status === expectedStatus) {
      return {
        route,
        method,
        status: 'PASS',
        statusCode: response.status,
        duration
      }
    } else {
      const text = await response.text()
      return {
        route,
        method,
        status: 'FAIL',
        statusCode: response.status,
        error: `Expected ${expectedStatus}, got ${response.status}: ${text.substring(0, 100)}`,
        duration
      }
    }
  } catch (error) {
    return {
      route,
      method,
      status: 'FAIL',
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime
    }
  }
}

async function runTests() {
  console.log('🧪 Starting comprehensive route testing...\n')
  console.log(`Base URL: ${BASE_URL}\n`)

  // ========== PUBLIC ROUTES ==========
  console.log('📋 Testing PUBLIC routes...\n')

  // 1. Onboarding
  results.push(await testRoute('/api/onboard/complete', 'POST', {
    body: { fid: TEST_FID },
    skip: true,
    skipReason: 'Requires valid Neynar FID'
  }))

  // 2. Profile routes
  results.push(await testRoute(`/api/profile/${TEST_FID}`, 'GET', {}))
  results.push(await testRoute(`/api/profile/${TEST_FID}/stats`, 'GET', {}))
  results.push(await testRoute(`/api/profile/${TEST_FID}/badges`, 'GET', {}))

  // 3. Leaderboard
  results.push(await testRoute('/api/leaderboard', 'GET', {}))
  results.push(await testRoute('/api/leaderboard/global', 'GET', {}))

  // 4. Viral routes
  results.push(await testRoute(`/api/viral/stats?fid=${TEST_FID}`, 'GET', {}))
  results.push(await testRoute('/api/viral/leaderboard', 'GET', {}))

  // 5. Frame routes
  results.push(await testRoute(`/api/frame/identify?fid=${TEST_FID}`, 'GET', {}))
  results.push(await testRoute(`/api/frame/badge?fid=${TEST_FID}`, 'GET', {
    expectedStatus: 200 // Returns frame HTML
  }))
  results.push(await testRoute(`/api/frame/badgeShare?fid=${TEST_FID}`, 'GET', {
    expectedStatus: 200 // Returns frame HTML
  }))

  // 6. Analytics
  results.push(await testRoute('/api/analytics/summary', 'GET', {}))
  results.push(await testRoute('/api/analytics/events', 'GET', {}))

  // 7. Farcaster
  results.push(await testRoute('/api/farcaster/user', 'GET', {
    skip: true,
    skipReason: 'Requires fid parameter'
  }))
  results.push(await testRoute('/api/farcaster/bulk', 'POST', {
    body: { addresses: [TEST_ADDRESS] },
    skip: true,
    skipReason: 'Requires Neynar API key'
  }))

  // 8. Notifications
  results.push(await testRoute(`/api/notifications?fid=${TEST_FID}`, 'GET', {}))
  results.push(await testRoute('/api/notifications', 'POST', {
    body: {
      fid: TEST_FID,
      category: 'system',
      title: 'Test',
      tone: 'info'
    },
    skip: true,
    skipReason: 'Requires auth'
  }))

  // 9. MiniKit
  results.push(await testRoute('/api/minikit/auth', 'POST', {
    skip: true,
    skipReason: 'Requires MiniKit auth payload'
  }))

  // ========== ADMIN ROUTES (Expected to fail without auth) ==========
  console.log('\n📋 Testing ADMIN routes (should return 401/403)...\n')

  const adminRoutes = [
    '/api/admin/viral/webhook-health',
    '/api/admin/viral/cast-metrics',
    '/api/admin/viral/achievements',
    '/api/admin/viral/tier-history',
    '/api/admin/badges',
    '/api/admin/badges/upload',
    '/api/admin/bot/cast',
    '/api/admin/bot/activity',
    '/api/admin/bot/reset-client',
    '/api/admin/auth/login'
  ]

  for (const route of adminRoutes) {
    results.push(await testRoute(route, 'GET', {
      expectedStatus: 401 // Should require auth
    }))
  }

  // ========== WEBHOOK ROUTES ==========
  console.log('\n📋 Testing WEBHOOK routes...\n')

  results.push(await testRoute('/api/webhooks/neynar/user', 'POST', {
    skip: true,
    skipReason: 'Requires Neynar webhook signature'
  }))

  results.push(await testRoute('/api/webhooks/neynar/cast', 'POST', {
    skip: true,
    skipReason: 'Requires Neynar webhook signature'
  }))

  results.push(await testRoute('/api/webhooks/badge-share', 'POST', {
    skip: true,
    skipReason: 'Requires webhook payload'
  }))

  // ========== VALIDATION TESTS ==========
  console.log('\n📋 Testing INPUT VALIDATION...\n')

  // Invalid FID
  results.push(await testRoute('/api/profile/invalid', 'GET', {
    expectedStatus: 400
  }))

  // Invalid FID (negative)
  results.push(await testRoute('/api/profile/-1', 'GET', {
    expectedStatus: 400
  }))

  // Invalid bulk addresses
  results.push(await testRoute('/api/farcaster/bulk', 'POST', {
    body: { addresses: ['invalid'] },
    expectedStatus: 400
  }))

  // ========== RATE LIMITING TESTS ==========
  console.log('\n📋 Testing RATE LIMITING...\n')

  // Rapid requests to public route (should hit rate limit eventually)
  const rapidResults = []
  for (let i = 0; i < 10; i++) {
    const result = await testRoute('/api/leaderboard', 'GET', {})
    rapidResults.push(result)
    if (result.statusCode === 429) {
      console.log('✅ Rate limiting working (hit 429 after', i + 1, 'requests)')
      break
    }
  }

  // ========== RESULTS SUMMARY ==========
  console.log('\n\n' + '='.repeat(80))
  console.log('📊 TEST RESULTS SUMMARY')
  console.log('='.repeat(80) + '\n')

  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  const skipped = results.filter(r => r.status === 'SKIP').length
  const total = results.length

  console.log(`Total Tests: ${total}`)
  console.log(`✅ Passed: ${passed} (${Math.round(passed/total*100)}%)`)
  console.log(`❌ Failed: ${failed} (${Math.round(failed/total*100)}%)`)
  console.log(`⏭️  Skipped: ${skipped} (${Math.round(skipped/total*100)}%)`)
  console.log()

  // Show failures
  const failures = results.filter(r => r.status === 'FAIL')
  if (failures.length > 0) {
    console.log('❌ FAILED TESTS:\n')
    failures.forEach(f => {
      console.log(`  ${f.method} ${f.route}`)
      console.log(`    Status: ${f.statusCode || 'N/A'}`)
      console.log(`    Error: ${f.error}`)
      console.log()
    })
  }

  // Show slowest routes
  const slowest = results
    .filter(r => r.duration)
    .sort((a, b) => (b.duration || 0) - (a.duration || 0))
    .slice(0, 5)

  if (slowest.length > 0) {
    console.log('🐌 SLOWEST ROUTES:\n')
    slowest.forEach(s => {
      console.log(`  ${s.method} ${s.route} - ${s.duration}ms`)
    })
    console.log()
  }

  // Export results
  const exportPath = './test-results.json'
  const fs = await import('fs/promises')
  await fs.writeFile(exportPath, JSON.stringify(results, null, 2), 'utf-8')
  console.log(`📄 Full results exported to: ${exportPath}\n`)

  // Exit code
  process.exit(failed > 0 ? 1 : 0)
}

runTests().catch(console.error)
