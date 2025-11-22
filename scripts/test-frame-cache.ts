#!/usr/bin/env tsx
/**
 * Frame Cache Test Script
 * Phase 1A: Verify Redis caching implementation
 * 
 * Tests:
 * 1. Redis connection
 * 2. Cache set/get operations
 * 3. Frame image caching (all types)
 * 4. Performance measurements (cache hit vs miss)
 * 5. Cache invalidation
 * 
 * Usage:
 *   npm run test:cache
 *   OR
 *   tsx scripts/test-frame-cache.ts
 */

// Load .env.local explicitly for tsx
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { testRedisConnection, getCacheStats, clearAllFrameCache } from '../lib/frame-cache'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3002'
const TEST_FID = 18139 // Legendary tier user

interface TestResult {
  name: string
  passed: boolean
  duration?: number
  details?: string
  error?: string
}

const results: TestResult[] = []

/**
 * Test 1: Redis Connection
 */
async function testRedisConnection_(): Promise<TestResult> {
  console.log('\n🧪 Test 1: Redis Connection')
  const start = Date.now()
  
  try {
    const connected = await testRedisConnection()
    const duration = Date.now() - start
    
    if (connected) {
      console.log(`✅ Redis connected (${duration}ms)`)
      return { name: 'Redis Connection', passed: true, duration, details: 'Connected successfully' }
    } else {
      console.log('❌ Redis connection failed')
      return { name: 'Redis Connection', passed: false, duration, error: 'Connection test returned false' }
    }
  } catch (err) {
    const duration = Date.now() - start
    console.log(`❌ Redis connection error: ${err}`)
    return { name: 'Redis Connection', passed: false, duration, error: String(err) }
  }
}

/**
 * Test 2: Cache Statistics
 */
async function testCacheStats(): Promise<TestResult> {
  console.log('\n🧪 Test 2: Cache Statistics')
  const start = Date.now()
  
  try {
    const stats = await getCacheStats()
    const duration = Date.now() - start
    
    if (stats.ok) {
      console.log(`✅ Cache stats retrieved (${duration}ms)`)
      console.log(`   Total keys: ${stats.totalKeys}`)
      return { 
        name: 'Cache Statistics', 
        passed: true, 
        duration, 
        details: `${stats.totalKeys} cached frames` 
      }
    } else {
      console.log(`❌ Cache stats failed: ${stats.error}`)
      return { name: 'Cache Statistics', passed: false, duration, error: stats.error }
    }
  } catch (err) {
    const duration = Date.now() - start
    console.log(`❌ Cache stats error: ${err}`)
    return { name: 'Cache Statistics', passed: false, duration, error: String(err) }
  }
}

/**
 * Test 3: Frame Image Generation (Cache MISS)
 */
async function testFrameImageMiss(frameType: string): Promise<TestResult> {
  console.log(`\n🧪 Test 3.${frameType}: Frame Image Cache MISS (${frameType})`)
  const start = Date.now()
  
  try {
    const url = `${BASE_URL}/api/frame/image?type=${frameType}&fid=${TEST_FID}`
    const response = await fetch(url)
    const duration = Date.now() - start
    
    if (!response.ok) {
      console.log(`❌ Frame request failed: ${response.status}`)
      return { 
        name: `${frameType} Cache MISS`, 
        passed: false, 
        duration, 
        error: `HTTP ${response.status}` 
      }
    }
    
    const cacheStatus = response.headers.get('X-Cache-Status')
    const contentType = response.headers.get('Content-Type')
    const renderTime = response.headers.get('X-Render-Time')
    
    console.log(`✅ Frame generated (${duration}ms)`)
    console.log(`   Cache: ${cacheStatus}`)
    console.log(`   Type: ${contentType}`)
    console.log(`   Render: ${renderTime}`)
    
    // Verify it's a PNG
    if (contentType !== 'image/png') {
      return { 
        name: `${frameType} Cache MISS`, 
        passed: false, 
        duration, 
        error: `Wrong content type: ${contentType}` 
      }
    }
    
    return { 
      name: `${frameType} Cache MISS`, 
      passed: true, 
      duration, 
      details: `${cacheStatus} in ${renderTime}` 
    }
  } catch (err) {
    const duration = Date.now() - start
    console.log(`❌ Frame request error: ${err}`)
    return { name: `${frameType} Cache MISS`, passed: false, duration, error: String(err) }
  }
}

/**
 * Test 4: Frame Image Cached (Cache HIT)
 */
async function testFrameImageHit(frameType: string): Promise<TestResult> {
  console.log(`\n🧪 Test 4.${frameType}: Frame Image Cache HIT (${frameType})`)
  const start = Date.now()
  
  try {
    const url = `${BASE_URL}/api/frame/image?type=${frameType}&fid=${TEST_FID}`
    const response = await fetch(url)
    const duration = Date.now() - start
    
    if (!response.ok) {
      console.log(`❌ Frame request failed: ${response.status}`)
      return { 
        name: `${frameType} Cache HIT`, 
        passed: false, 
        duration, 
        error: `HTTP ${response.status}` 
      }
    }
    
    const cacheStatus = response.headers.get('X-Cache-Status')
    const renderTime = response.headers.get('X-Render-Time')
    
    console.log(`✅ Frame retrieved (${duration}ms)`)
    console.log(`   Cache: ${cacheStatus}`)
    console.log(`   Render: ${renderTime}`)
    
    // Verify it's a cache hit
    if (cacheStatus !== 'HIT') {
      return { 
        name: `${frameType} Cache HIT`, 
        passed: false, 
        duration, 
        error: `Expected HIT, got ${cacheStatus}` 
      }
    }
    
    // Verify it's faster (cache should be <200ms)
    if (duration > 500) {
      console.log(`⚠️  Cache hit slower than expected: ${duration}ms`)
    }
    
    return { 
      name: `${frameType} Cache HIT`, 
      passed: true, 
      duration, 
      details: `${duration}ms (${renderTime})` 
    }
  } catch (err) {
    const duration = Date.now() - start
    console.log(`❌ Frame request error: ${err}`)
    return { name: `${frameType} Cache HIT`, passed: false, duration, error: String(err) }
  }
}

/**
 * Test 5: Cache Invalidation
 */
async function testCacheInvalidation(): Promise<TestResult> {
  console.log('\n🧪 Test 5: Cache Invalidation')
  const start = Date.now()
  
  try {
    const cleared = await clearAllFrameCache()
    const duration = Date.now() - start
    
    console.log(`✅ Cache cleared (${duration}ms)`)
    console.log(`   Removed: ${cleared} keys`)
    
    return { 
      name: 'Cache Invalidation', 
      passed: true, 
      duration, 
      details: `${cleared} keys cleared` 
    }
  } catch (err) {
    const duration = Date.now() - start
    console.log(`❌ Cache clear error: ${err}`)
    return { name: 'Cache Invalidation', passed: false, duration, error: String(err) }
  }
}

/**
 * Test 6: Performance Comparison
 */
async function testPerformanceComparison(frameType: string): Promise<TestResult> {
  console.log(`\n🧪 Test 6.${frameType}: Performance Comparison (${frameType})`)
  
  try {
    // Clear cache first
    await clearAllFrameCache()
    
    // Cold request (cache miss)
    const coldStart = Date.now()
    const coldUrl = `${BASE_URL}/api/frame/image?type=${frameType}&fid=${TEST_FID}`
    const coldResponse = await fetch(coldUrl)
    const coldDuration = Date.now() - coldStart
    
    if (!coldResponse.ok) {
      return { 
        name: `${frameType} Performance`, 
        passed: false, 
        error: `Cold request failed: ${coldResponse.status}` 
      }
    }
    
    // Warm request (cache hit)
    const warmStart = Date.now()
    const warmUrl = `${BASE_URL}/api/frame/image?type=${frameType}&fid=${TEST_FID}`
    const warmResponse = await fetch(warmUrl)
    const warmDuration = Date.now() - warmStart
    
    if (!warmResponse.ok) {
      return { 
        name: `${frameType} Performance`, 
        passed: false, 
        error: `Warm request failed: ${warmResponse.status}` 
      }
    }
    
    const improvement = ((coldDuration - warmDuration) / coldDuration * 100).toFixed(1)
    const speedup = (coldDuration / warmDuration).toFixed(1)
    
    console.log(`✅ Performance comparison:`)
    console.log(`   Cold (MISS): ${coldDuration}ms`)
    console.log(`   Warm (HIT):  ${warmDuration}ms`)
    console.log(`   Improvement: ${improvement}% faster (${speedup}x speedup)`)
    
    // Consider test passed if cache hit is faster
    const passed = warmDuration < coldDuration
    
    return { 
      name: `${frameType} Performance`, 
      passed, 
      details: `${improvement}% faster (${coldDuration}ms → ${warmDuration}ms)` 
    }
  } catch (err) {
    console.log(`❌ Performance test error: ${err}`)
    return { name: `${frameType} Performance`, passed: false, error: String(err) }
  }
}

/**
 * Print test summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(60))
  
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const total = results.length
  
  console.log(`\nTotal: ${total} tests`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`)
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:')
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.error || 'Unknown error'}`)
    })
  }
  
  console.log('\n' + '='.repeat(60))
  
  // Exit with error code if any tests failed
  if (failed > 0) {
    process.exit(1)
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Frame Cache Test Suite')
  console.log('Base URL:', BASE_URL)
  console.log('Test FID:', TEST_FID)
  
  // Test 1: Redis connection
  results.push(await testRedisConnection_())
  
  // Test 2: Cache stats
  results.push(await testCacheStats())
  
  // Test 3-6: Frame types to test
  const frameTypes = ['gm', 'quest', 'onchainstats', 'badge']
  
  for (const frameType of frameTypes) {
    // Test 3: Cache MISS (first request)
    results.push(await testFrameImageMiss(frameType))
    
    // Wait a bit for cache to be written
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Test 4: Cache HIT (second request)
    results.push(await testFrameImageHit(frameType))
    
    // Test 6: Performance comparison
    results.push(await testPerformanceComparison(frameType))
  }
  
  // Test 5: Cache invalidation
  results.push(await testCacheInvalidation())
  
  // Print summary
  printSummary()
}

// Run tests
runTests().catch(err => {
  console.error('💥 Test suite crashed:', err)
  process.exit(1)
})
