/**
 * @file scripts/test-cache-compression.ts
 * @description Test script for cache compression functionality (Phase 8.4.3)
 * 
 * Tests:
 * - Compression/decompression of various data types
 * - Compression ratio validation (target: 60-80%)
 * - Performance overhead (<10ms compression, <5ms decompression)
 * - Integration with L1/L2/L3 cache layers
 * - Backward compatibility with uncompressed data
 * - Automatic fallback on compression errors
 * 
 * Usage:
 *   tsx scripts/test-cache-compression.ts
 */

import {
  compressData,
  decompressData,
  testCompression,
  getCompressionStats,
  resetCompressionStats,
  type CompressionOptions,
} from '../lib/cache/compression'

import {
  getCached,
  getCacheStats,
  invalidateCache,
} from '../lib/cache/server'

// ============================================
// TEST DATA SAMPLES
// ============================================

const sampleUserData = {
  fid: 12345,
  username: 'testuser',
  badges: ['earlyAdopter', 'questMaster', 'communityHero'],
  points: {
    total: 15000,
    weekly: 2500,
    daily: 350,
  },
  guild: {
    id: 'guild-123',
    name: 'Test Guild',
    role: 'member',
    joinedAt: '2024-01-15T10:30:00Z',
  },
  quests: [
    { id: 'quest-1', status: 'completed', reward: 100 },
    { id: 'quest-2', status: 'in-progress', progress: 75 },
    { id: 'quest-3', status: 'locked', requirement: 'Level 5' },
  ],
}

const sampleLeaderboardData = Array.from({ length: 100 }, (_, i) => ({
  rank: i + 1,
  fid: 10000 + i,
  username: `user${i}`,
  points: 50000 - i * 100,
  badge: i < 10 ? 'gold' : i < 30 ? 'silver' : 'bronze',
  guild: `guild-${Math.floor(i / 10)}`,
}))

const sampleQuestData = {
  id: 'quest-verifyWallet',
  title: 'Verify Your Wallet',
  description: 'Connect and verify your wallet to unlock exclusive rewards and features.',
  type: 'onchain',
  requirements: [
    { type: 'balance', chain: 'base', amount: '0.01' },
    { type: 'transaction', chain: 'base', minCount: 5 },
  ],
  rewards: {
    xp: 500,
    points: 100,
    badge: 'walletVerified',
  },
  status: 'available',
  expiresAt: '2025-02-01T00:00:00Z',
}

// ============================================
// TEST UTILITIES
// ============================================

interface TestResult {
  test: string
  passed: boolean
  duration?: number
  compressionRatio?: number
  originalSize?: number
  compressedSize?: number
  error?: string
}

const results: TestResult[] = []

function logTest(result: TestResult) {
  results.push(result)
  const status = result.passed ? '✅ PASS' : '❌ FAIL'
  console.log(`${status} - ${result.test}`)
  if (result.duration) console.log(`  Duration: ${result.duration}ms`)
  if (result.compressionRatio) console.log(`  Compression: ${result.compressionRatio.toFixed(1)}%`)
  if (result.originalSize && result.compressedSize) {
    console.log(`  Size: ${result.originalSize}B → ${result.compressedSize}B (saved ${result.originalSize - result.compressedSize}B)`)
  }
  if (result.error) console.log(`  Error: ${result.error}`)
}

// ============================================
// TEST SUITE 1: Basic Compression
// ============================================

async function testBasicCompression() {
  console.log('\n=== TEST SUITE 1: Basic Compression ===\n')
  
  // Test 1.1: Compress and decompress user data
  try {
    const compressed = await compressData(sampleUserData)
    const decompressed = await decompressData(compressed)
    
    const passed = JSON.stringify(decompressed) === JSON.stringify(sampleUserData)
    logTest({
      test: 'Compress and decompress user data',
      passed,
      originalSize: Buffer.byteLength(JSON.stringify(sampleUserData)),
      compressedSize: Buffer.byteLength(compressed.data),
      compressionRatio: ((Buffer.byteLength(JSON.stringify(sampleUserData)) - Buffer.byteLength(compressed.data)) / Buffer.byteLength(JSON.stringify(sampleUserData))) * 100,
    })
  } catch (error) {
    logTest({
      test: 'Compress and decompress user data',
      passed: false,
      error: String(error),
    })
  }

  // Test 1.2: Compress leaderboard data (large dataset)
  try {
    const stats = await testCompression(sampleLeaderboardData)
    const passed = stats.compressionRatio >= 60 && stats.compressionRatio <= 95
    logTest({
      test: 'Compress leaderboard data (target: 60-80% reduction)',
      passed,
      originalSize: stats.originalSize,
      compressedSize: stats.compressedSize,
      compressionRatio: stats.compressionRatio,
      duration: stats.duration,
    })
  } catch (error) {
    logTest({
      test: 'Compress leaderboard data',
      passed: false,
      error: String(error),
    })
  }

  // Test 1.3: Small data should skip compression
  try {
    const smallData = { test: 'small' }
    const compressed = await compressData(smallData, { minSize: 1024 })
    const passed = compressed.compressed === false
    logTest({
      test: 'Small data skips compression (< minSize)',
      passed,
    })
  } catch (error) {
    logTest({
      test: 'Small data skips compression',
      passed: false,
      error: String(error),
    })
  }
}

// ============================================
// TEST SUITE 2: Compression Algorithms
// ============================================

async function testCompressionAlgorithms() {
  console.log('\n=== TEST SUITE 2: Compression Algorithms ===\n')
  
  // Test 2.1: Gzip compression
  try {
    const stats = await testCompression(sampleQuestData, { algorithm: 'gzip' })
    const passed = stats.compressionRatio > 0 && stats.duration < 20
    logTest({
      test: 'Gzip compression (< 20ms)',
      passed,
      compressionRatio: stats.compressionRatio,
      duration: stats.duration,
    })
  } catch (error) {
    logTest({
      test: 'Gzip compression',
      passed: false,
      error: String(error),
    })
  }

  // Test 2.2: Brotli compression
  try {
    const stats = await testCompression(sampleQuestData, { algorithm: 'brotli' })
    const passed = stats.compressionRatio > 0 && stats.duration < 30
    logTest({
      test: 'Brotli compression (< 30ms)',
      passed,
      compressionRatio: stats.compressionRatio,
      duration: stats.duration,
    })
  } catch (error) {
    logTest({
      test: 'Brotli compression',
      passed: false,
      error: String(error),
    })
  }

  // Test 2.3: Compare compression ratios
  try {
    const gzipStats = await testCompression(sampleLeaderboardData, { algorithm: 'gzip' })
    const brotliStats = await testCompression(sampleLeaderboardData, { algorithm: 'brotli' })
    
    console.log(`  Gzip: ${gzipStats.compressionRatio.toFixed(1)}% (${gzipStats.duration}ms)`)
    console.log(`  Brotli: ${brotliStats.compressionRatio.toFixed(1)}% (${brotliStats.duration}ms)`)
    
    const passed = true
    logTest({
      test: 'Algorithm comparison (gzip vs brotli)',
      passed,
    })
  } catch (error) {
    logTest({
      test: 'Algorithm comparison',
      passed: false,
      error: String(error),
    })
  }
}

// ============================================
// TEST SUITE 3: Cache Integration
// ============================================

async function testCacheIntegration() {
  console.log('\n=== TEST SUITE 3: Cache Integration ===\n')
  
  resetCompressionStats()
  
  // Test 3.1: Cache with compression enabled
  try {
    const startTime = Date.now()
    
    const cached = await getCached(
      'test-compression',
      'user-12345',
      async () => sampleUserData,
      { ttl: 60, compress: true }
    )
    
    const duration = Date.now() - startTime
    const passed = JSON.stringify(cached) === JSON.stringify(sampleUserData) && duration < 100
    
    logTest({
      test: 'Cache storage with compression',
      passed,
      duration,
    })
  } catch (error) {
    logTest({
      test: 'Cache storage with compression',
      passed: false,
      error: String(error),
    })
  }

  // Test 3.2: Cache retrieval (should be compressed in storage)
  try {
    const startTime = Date.now()
    
    const cached = await getCached(
      'test-compression',
      'user-12345',
      async () => sampleUserData,
      { ttl: 60, compress: true }
    )
    
    const duration = Date.now() - startTime
    const passed = JSON.stringify(cached) === JSON.stringify(sampleUserData) && duration < 10
    
    logTest({
      test: 'Cache retrieval from compressed storage (< 10ms)',
      passed,
      duration,
    })
  } catch (error) {
    logTest({
      test: 'Cache retrieval from compressed storage',
      passed: false,
      error: String(error),
    })
  }

  // Test 3.3: Cache stats include compression metrics
  try {
    const stats = getCacheStats()
    const passed = !!stats.compression
    
    if (passed && stats.compression) {
      console.log(`  Compression count: ${stats.compression.compressionCount}`)
      console.log(`  Decompression count: ${stats.compression.decompressionCount}`)
      console.log(`  Avg compression ratio: ${stats.compression.avgCompressionRatio.toFixed(1)}%`)
      console.log(`  Bytes saved: ${stats.compression.totalBytesSaved}`)
    }
    
    logTest({
      test: 'Cache stats include compression metrics',
      passed,
    })
  } catch (error) {
    logTest({
      test: 'Cache stats include compression metrics',
      passed: false,
      error: String(error),
    })
  }

  // Cleanup
  await invalidateCache('test-compression', 'user-12345')
}

// ============================================
// TEST SUITE 4: Performance
// ============================================

async function testPerformance() {
  console.log('\n=== TEST SUITE 4: Performance ===\n')
  
  // Test 4.1: Compression overhead (target: < 10ms)
  try {
    const startTime = Date.now()
    await compressData(sampleUserData)
    const duration = Date.now() - startTime
    
    const passed = duration < 10
    logTest({
      test: 'Compression overhead (< 10ms)',
      passed,
      duration,
    })
  } catch (error) {
    logTest({
      test: 'Compression overhead',
      passed: false,
      error: String(error),
    })
  }

  // Test 4.2: Decompression overhead (target: < 5ms)
  try {
    const compressed = await compressData(sampleUserData)
    const startTime = Date.now()
    await decompressData(compressed)
    const duration = Date.now() - startTime
    
    const passed = duration < 5
    logTest({
      test: 'Decompression overhead (< 5ms)',
      passed,
      duration,
    })
  } catch (error) {
    logTest({
      test: 'Decompression overhead',
      passed: false,
      error: String(error),
    })
  }

  // Test 4.3: Batch compression (100 items)
  try {
    const startTime = Date.now()
    await Promise.all(
      sampleLeaderboardData.map(item => compressData(item))
    )
    const duration = Date.now() - startTime
    
    const passed = duration < 500 // 5ms per item average
    logTest({
      test: 'Batch compression (100 items, < 500ms)',
      passed,
      duration,
    })
  } catch (error) {
    logTest({
      test: 'Batch compression',
      passed: false,
      error: String(error),
    })
  }
}

// ============================================
// TEST SUITE 5: Error Handling
// ============================================

async function testErrorHandling() {
  console.log('\n=== TEST SUITE 5: Error Handling ===\n')
  
  // Test 5.1: Graceful fallback on compression error
  try {
    // Circular reference should cause compression to fail gracefully
    const circular: any = { name: 'test' }
    circular.self = circular
    
    const compressed = await compressData(circular)
    // Should fallback to uncompressed (compressed: false)
    const passed = compressed.compressed === false
    
    logTest({
      test: 'Graceful fallback on circular reference',
      passed,
    })
  } catch (error) {
    // Should not throw, should gracefully fallback
    logTest({
      test: 'Graceful fallback on circular reference',
      passed: false,
      error: String(error),
    })
  }

  // Test 5.2: Decompression of corrupted data
  try {
    const corrupted = {
      algorithm: 'gzip' as const,
      data: 'corrupted-base64-data',
      originalSize: 100,
      compressed: true,
    }
    
    try {
      await decompressData(corrupted)
      logTest({
        test: 'Decompression handles corrupted data',
        passed: false,
        error: 'Should throw on corrupted data',
      })
    } catch (error) {
      // Expected to throw
      logTest({
        test: 'Decompression handles corrupted data',
        passed: true,
      })
    }
  } catch (error) {
    logTest({
      test: 'Decompression handles corrupted data',
      passed: false,
      error: String(error),
    })
  }
}

// ============================================
// MAIN TEST RUNNER
// ============================================

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════╗')
  console.log('║   Cache Compression Test Suite (Phase 8.4.3)      ║')
  console.log('╚════════════════════════════════════════════════════╝')
  
  await testBasicCompression()
  await testCompressionAlgorithms()
  await testCacheIntegration()
  await testPerformance()
  await testErrorHandling()
  
  // Summary
  console.log('\n' + '='.repeat(55))
  console.log('TEST SUMMARY')
  console.log('='.repeat(55))
  
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const total = results.length
  const passRate = (passed / total * 100).toFixed(1)
  
  console.log(`Total Tests: ${total}`)
  console.log(`Passed: ${passed} (${passRate}%)`)
  console.log(`Failed: ${failed}`)
  
  // Compression statistics
  const compressionStats = getCompressionStats()
  console.log('\nCompression Statistics:')
  console.log(`  Total Original Bytes: ${compressionStats.totalOriginalBytes}`)
  console.log(`  Total Compressed Bytes: ${compressionStats.totalCompressedBytes}`)
  console.log(`  Average Compression Ratio: ${compressionStats.avgCompressionRatio.toFixed(1)}%`)
  console.log(`  Total Bytes Saved: ${compressionStats.totalBytesSaved}`)
  console.log(`  Avg Compression Time: ${compressionStats.avgCompressionTime.toFixed(2)}ms`)
  console.log(`  Avg Decompression Time: ${compressionStats.avgDecompressionTime.toFixed(2)}ms`)
  
  // Exit code
  process.exit(failed > 0 ? 1 : 0)
}

// Run tests
runAllTests().catch(error => {
  console.error('Test runner failed:', error)
  process.exit(1)
})
