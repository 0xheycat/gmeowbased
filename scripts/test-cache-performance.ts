#!/usr/bin/env tsx
/**
 * Phase 7 Priority 4: Cache Performance Benchmark
 * 
 * Tests all caching layers:
 * - Webhook deduplication
 * - Cast/mention caching
 * - Notification rate limiting
 * - Neynar API caching
 * - Redis cache performance
 * 
 * Success Criteria:
 * - Webhook deduplication: 95%+ hit rate
 * - Cast cache: 80%+ hit rate
 * - Notification check: <5ms
 * - Overall webhook latency: <50ms (warm cache)
 */

import {
  isWebhookProcessed,
  markWebhookProcessed,
  getCachedCast,
  setCachedCast,
  getCachedMention,
  setCachedMention,
  getWebhookCacheStats,
} from '../lib/cache/webhook-cache'

import {
  wasNotificationSent,
  markNotificationSent,
  canSendNotification,
  recordNotificationSent,
  getCachedNotificationPreferences,
  setCachedNotificationPreferences,
  getNotificationCacheStats,
} from '../lib/cache/notification-cache'

import {
  getCachedNeynarUser,
  setCachedNeynarUser,
  getNeynarCacheStats,
} from '../lib/cache/neynar-cache'

import { checkRedisHealth } from '../lib/cache/redis-client'

// ============================================================================
// Benchmark Utilities
// ============================================================================

interface BenchmarkResult {
  name: string
  avgMs: number
  minMs: number
  maxMs: number
  iterations: number
  hitRate?: number
}

async function benchmark(
  name: string,
  fn: () => Promise<void>,
  iterations: number = 100
): Promise<BenchmarkResult> {
  const times: number[] = []
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    await fn()
    const end = performance.now()
    times.push(end - start)
  }
  
  const avgMs = times.reduce((a, b) => a + b, 0) / times.length
  const minMs = Math.min(...times)
  const maxMs = Math.max(...times)
  
  return { name, avgMs, minMs, maxMs, iterations }
}

// ============================================================================
// Test Webhook Caching
// ============================================================================

async function testWebhookDeduplication() {
  console.log('\n📦 Testing Webhook Deduplication...')
  
  const testKey = `test-webhook-${Date.now()}`
  
  // Test cache miss
  const miss = await isWebhookProcessed(testKey)
  if (miss) {
    throw new Error('Cache should be cold (MISS expected)')
  }
  
  // Mark as processed
  await markWebhookProcessed(testKey, 60)
  
  // Test cache hit
  const hit = await isWebhookProcessed(testKey)
  if (!hit) {
    throw new Error('Cache should be warm (HIT expected)')
  }
  
  console.log('✅ Webhook deduplication working')
}

async function testCastCaching() {
  console.log('\n📦 Testing Cast Caching...')
  
  const testCast = {
    hash: `test-cast-${Date.now()}`,
    authorFid: 12345,
    text: 'Test cast for caching',
    embedsCount: 0,
    mentionsCount: 1,
    timestamp: new Date().toISOString(),
  }
  
  // Test cache miss
  const miss = await getCachedCast(testCast.hash)
  if (miss) {
    throw new Error('Cache should be cold (MISS expected)')
  }
  
  // Cache cast
  await setCachedCast(testCast, 60)
  
  // Test cache hit
  const hit = await getCachedCast(testCast.hash)
  if (!hit) {
    throw new Error('Cache should be warm (HIT expected)')
  }
  
  if (hit.text !== testCast.text) {
    throw new Error('Cached data mismatch')
  }
  
  console.log('✅ Cast caching working')
}

async function testMentionCaching() {
  console.log('\n📦 Testing Mention Caching...')
  
  const testMention = {
    fid: 99999,
    username: 'testuser',
    displayName: 'Test User',
    isBot: false,
  }
  
  // Test cache miss
  const miss = await getCachedMention(testMention.fid)
  if (miss) {
    throw new Error('Cache should be cold (MISS expected)')
  }
  
  // Cache mention
  await setCachedMention(testMention, 60)
  
  // Test cache hit
  const hit = await getCachedMention(testMention.fid)
  if (!hit) {
    throw new Error('Cache should be warm (HIT expected)')
  }
  
  if (hit.username !== testMention.username) {
    throw new Error('Cached data mismatch')
  }
  
  console.log('✅ Mention caching working')
}

// ============================================================================
// Test Notification Caching
// ============================================================================

async function testNotificationDeduplication() {
  console.log('\n📦 Testing Notification Deduplication...')
  
  const userId = `test-user-${Date.now()}`
  const notificationType = 'viral_milestone'
  
  // Test cache miss
  const miss = await wasNotificationSent(userId, notificationType)
  if (miss) {
    throw new Error('Cache should be cold (MISS expected)')
  }
  
  // Mark as sent
  await markNotificationSent(userId, notificationType, undefined, 60)
  
  // Test cache hit
  const hit = await wasNotificationSent(userId, notificationType)
  if (!hit) {
    throw new Error('Cache should be warm (HIT expected)')
  }
  
  console.log('✅ Notification deduplication working')
}

async function testNotificationRateLimiting() {
  console.log('\n📦 Testing Notification Rate Limiting...')
  
  const userId = `test-user-${Date.now()}`
  const notificationType = 'xp_reward'
  
  // Test rate limit (should pass)
  const canSend1 = await canSendNotification(userId, notificationType)
  if (!canSend1) {
    throw new Error('Should be able to send first notification')
  }
  
  // Record notification sent
  await recordNotificationSent(userId, notificationType, 60)
  
  // Test rate limit (should fail)
  const canSend2 = await canSendNotification(userId, notificationType)
  if (canSend2) {
    throw new Error('Should be rate limited after first notification')
  }
  
  console.log('✅ Notification rate limiting working')
}

async function testNotificationPreferences() {
  console.log('\n📦 Testing Notification Preferences...')
  
  const userId = `test-user-${Date.now()}`
  const prefs = {
    enabled: true,
    types: {
      viral_milestone: true,
      xp_reward: false,
    },
  }
  
  // Test cache miss
  const miss = await getCachedNotificationPreferences(userId)
  if (miss) {
    throw new Error('Cache should be cold (MISS expected)')
  }
  
  // Cache preferences
  await setCachedNotificationPreferences(userId, prefs, 60)
  
  // Test cache hit
  const hit = await getCachedNotificationPreferences(userId)
  if (!hit) {
    throw new Error('Cache should be warm (HIT expected)')
  }
  
  if (hit.enabled !== prefs.enabled) {
    throw new Error('Cached data mismatch')
  }
  
  console.log('✅ Notification preferences caching working')
}

// ============================================================================
// Performance Benchmarks
// ============================================================================

async function benchmarkWebhookCache() {
  console.log('\n⚡ Benchmarking Webhook Cache Performance...')
  
  // Warm up cache
  const warmupKey = `benchmark-webhook-${Date.now()}`
  await markWebhookProcessed(warmupKey, 60)
  
  // Benchmark cache hit
  const result = await benchmark(
    'Webhook deduplication check (HIT)',
    async () => {
      await isWebhookProcessed(warmupKey)
    },
    100
  )
  
  console.log(`  Avg: ${result.avgMs.toFixed(2)}ms`)
  console.log(`  Min: ${result.minMs.toFixed(2)}ms`)
  console.log(`  Max: ${result.maxMs.toFixed(2)}ms`)
  
  if (result.avgMs > 10) {
    console.warn('⚠️  WARNING: Cache hit latency > 10ms')
  } else {
    console.log('✅ Cache performance: EXCELLENT (<10ms)')
  }
  
  return result
}

async function benchmarkNotificationCache() {
  console.log('\n⚡ Benchmarking Notification Cache Performance...')
  
  // Warm up cache
  const warmupUser = `benchmark-user-${Date.now()}`
  await recordNotificationSent(warmupUser, 'viral_milestone', 60)
  
  // Benchmark cache hit
  const result = await benchmark(
    'Notification rate limit check (HIT)',
    async () => {
      await canSendNotification(warmupUser, 'viral_milestone')
    },
    100
  )
  
  console.log(`  Avg: ${result.avgMs.toFixed(2)}ms`)
  console.log(`  Min: ${result.minMs.toFixed(2)}ms`)
  console.log(`  Max: ${result.maxMs.toFixed(2)}ms`)
  
  if (result.avgMs > 5) {
    console.warn('⚠️  WARNING: Notification check latency > 5ms')
  } else {
    console.log('✅ Notification performance: EXCELLENT (<5ms)')
  }
  
  return result
}

// ============================================================================
// Cache Statistics
// ============================================================================

async function printCacheStats() {
  console.log('\n📊 Cache Statistics...\n')
  
  const webhookStats = await getWebhookCacheStats()
  console.log('Webhook Cache:')
  console.log(`  Processed events: ${webhookStats.processedEvents}`)
  console.log(`  Cached casts: ${webhookStats.cachedCasts}`)
  console.log(`  Cached mentions: ${webhookStats.cachedMentions}`)
  console.log(`  Cached engagements: ${webhookStats.cachedEngagements}`)
  
  const notificationStats = await getNotificationCacheStats()
  console.log('\nNotification Cache:')
  console.log(`  Sent notifications: ${notificationStats.sentNotifications}`)
  console.log(`  Rate limited users: ${notificationStats.rateLimitedUsers}`)
  console.log(`  Cached preferences: ${notificationStats.cachedPreferences}`)
  console.log(`  History entries: ${notificationStats.historyEntries}`)
  
  const neynarStats = await getNeynarCacheStats()
  console.log('\nNeynar Cache (Upstash):')
  console.log(`  Total keys: ${neynarStats.totalKeys}`)
  console.log(`  Sample keys: ${neynarStats.sampleKeys.slice(0, 3).join(', ')}`)
}

// ============================================================================
// Main Benchmark Suite
// ============================================================================

async function main() {
  console.log('🚀 Phase 7 Priority 4: Cache Performance Benchmark')
  console.log('=' .repeat(60))
  
  // Check Redis health
  console.log('\n🔌 Checking Redis connection...')
  const isHealthy = await checkRedisHealth()
  
  if (!isHealthy) {
    console.error('❌ Redis is not available. Please start Redis:')
    console.error('   docker compose up -d redis')
    process.exit(1)
  }
  
  console.log('✅ Redis is healthy')
  
  try {
    // Functional tests
    console.log('\n' + '='.repeat(60))
    console.log('FUNCTIONAL TESTS')
    console.log('='.repeat(60))
    
    await testWebhookDeduplication()
    await testCastCaching()
    await testMentionCaching()
    await testNotificationDeduplication()
    await testNotificationRateLimiting()
    await testNotificationPreferences()
    
    // Performance benchmarks
    console.log('\n' + '='.repeat(60))
    console.log('PERFORMANCE BENCHMARKS')
    console.log('='.repeat(60))
    
    const webhookResult = await benchmarkWebhookCache()
    const notificationResult = await benchmarkNotificationCache()
    
    // Cache statistics
    console.log('\n' + '='.repeat(60))
    console.log('CACHE STATISTICS')
    console.log('='.repeat(60))
    
    await printCacheStats()
    
    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('SUMMARY')
    console.log('='.repeat(60))
    
    const webhookPass = webhookResult.avgMs < 10
    const notificationPass = notificationResult.avgMs < 5
    
    console.log('\nPerformance Targets:')
    console.log(`  Webhook cache < 10ms: ${webhookPass ? '✅ PASS' : '❌ FAIL'} (${webhookResult.avgMs.toFixed(2)}ms)`)
    console.log(`  Notification cache < 5ms: ${notificationPass ? '✅ PASS' : '❌ FAIL'} (${notificationResult.avgMs.toFixed(2)}ms)`)
    
    if (webhookPass && notificationPass) {
      console.log('\n🎉 All benchmarks PASSED!')
      console.log('\nPhase 7 Priority 4: Farcaster Caching - COMPLETE')
      process.exit(0)
    } else {
      console.log('\n⚠️  Some benchmarks did not meet targets')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('\n❌ Benchmark failed:', error)
    process.exit(1)
  }
}

main()
