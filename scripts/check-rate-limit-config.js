#!/usr/bin/env node

/**
 * Check rate limiting configuration in production
 * Tests if Upstash Redis is properly configured and working
 */

const PROD_URL = process.env.PROD_URL || 'https://gmeowhq.art'

async function checkRateLimitConfig() {
  console.log('🔍 Checking Rate Limit Configuration...')
  console.log(`Target: ${PROD_URL}\n`)
  console.log('=' .repeat(80))
  
  // Test 1: Make a request and check rate limit headers
  console.log('\n📋 Test 1: Checking rate limit response headers...\n')
  
  try {
    const response = await fetch(`${PROD_URL}/api/leaderboard`)
    const headers = {
      'x-ratelimit-limit': response.headers.get('x-ratelimit-limit'),
      'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining'),
      'x-ratelimit-reset': response.headers.get('x-ratelimit-reset'),
      'retry-after': response.headers.get('retry-after')
    }
    
    console.log('Response headers:')
    Object.entries(headers).forEach(([key, value]) => {
      if (value !== null) {
        console.log(`  ✅ ${key}: ${value}`)
      } else {
        console.log(`  ❌ ${key}: NOT SET`)
      }
    })
    
    const hasRateLimitHeaders = Object.values(headers).some(v => v !== null)
    if (!hasRateLimitHeaders) {
      console.log('\n⚠️ WARNING: No rate limit headers found!')
      console.log('This suggests rate limiting might not be configured in production.')
    }
    
    console.log(`\nStatus: ${response.status}`)
  } catch (error) {
    console.error('❌ Request failed:', error.message)
  }
  
  // Test 2: Rapid requests to trigger rate limit
  console.log('\n📋 Test 2: Attempting to trigger rate limit...\n')
  console.log('Making 61 rapid requests (limit is 60/min)...')
  
  let triggered = false
  for (let i = 1; i <= 61; i++) {
    try {
      const start = Date.now()
      const response = await fetch(`${PROD_URL}/api/leaderboard`)
      const duration = Date.now() - start
      
      if (response.status === 429) {
        console.log(`\n✅ Rate limit triggered on request #${i}`)
        console.log(`   Status: 429 Too Many Requests`)
        
        const data = await response.json()
        console.log(`   Response: ${JSON.stringify(data, null, 2)}`)
        
        const retryAfter = response.headers.get('retry-after')
        if (retryAfter) {
          console.log(`   Retry-After: ${retryAfter} seconds`)
        }
        
        triggered = true
        break
      }
      
      if (i % 10 === 0) {
        console.log(`   Request ${i}/61: ${response.status} (${duration}ms)`)
      }
    } catch (error) {
      console.error(`   Request ${i} failed:`, error.message)
    }
  }
  
  if (!triggered) {
    console.log('\n❌ CRITICAL: Rate limit NOT triggered after 61 requests!')
    console.log('\nPossible causes:')
    console.log('1. UPSTASH_REDIS_REST_URL not set in Vercel environment')
    console.log('2. UPSTASH_REDIS_REST_TOKEN not set in Vercel environment')
    console.log('3. Redis connection failing silently (check Upstash dashboard)')
    console.log('4. Rate limiter falling back to "success: true" (fail-open behavior)')
    console.log('\nCheck Vercel dashboard > Project Settings > Environment Variables')
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('\n📊 DIAGNOSIS:')
  
  if (triggered) {
    console.log('✅ Rate limiting is WORKING')
  } else {
    console.log('❌ Rate limiting is NOT WORKING')
    console.log('\nIMPORTANT: Go to Vercel dashboard and verify:')
    console.log('  • UPSTASH_REDIS_REST_URL is set')
    console.log('  • UPSTASH_REDIS_REST_TOKEN is set')
    console.log('  • Both are set for Production environment')
    console.log('  • Redeploy after adding env vars')
  }
}

checkRateLimitConfig().catch(console.error)
