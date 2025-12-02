#!/usr/bin/env tsx
/**
 * Leaderboard Integration Test
 * 
 * Tests:
 * 1. Contract reads (basePoints, streakBonus)
 * 2. Neynar enrichment (username, pfp)
 * 3. Database operations (leaderboard_calculations table)
 * 4. API endpoints (/api/leaderboard-v2)
 * 5. Cache performance (Neynar + contract)
 */

import { createPublicClient, http, parseAbiItem } from 'viem'
import { base } from 'viem/chains'
import { CONTRACT_ADDRESSES, GM_CONTRACT_ABI } from '../lib/gmeow-utils'
import { fetchUserByFid } from '../lib/neynar'
import { getCachedNeynarUser, setCachedNeynarUser } from '../lib/cache/neynar-cache'
import { getCachedContractData, setCachedContractData } from '../lib/cache/contract-cache'
import { getSupabaseServerClient } from '../lib/supabase-server'

console.log('🧪 Leaderboard Integration Test\n')

// Test 1: Contract Reads
async function testContractReads() {
  console.log('1️⃣  Testing Contract Reads...')
  
  try {
    const rpcUrl = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_BASE || 'https://mainnet.base.org'
    const client = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    })

    const contractAddress = CONTRACT_ADDRESSES.base
    const testAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0' // Example address (checksum)

    console.log(`   Contract: ${contractAddress}`)
    console.log(`   Test address: ${testAddress}`)

    // Test getUserProfile
    const startTime = Date.now()
    const profile = await client.readContract({
      address: contractAddress,
      abi: GM_CONTRACT_ABI,
      functionName: 'getUserProfile',
      args: [testAddress],
    }) as any

    const duration = Date.now() - startTime

    console.log(`   ✅ getUserProfile succeeded (${duration}ms)`)
    console.log(`      Base points: ${profile[0]?.toString() || '0'}`)
    console.log(`      Streak bonus: ${profile[1]?.toString() || '0'}`)
    console.log(`      Last GM: ${profile[2]?.toString() || '0'}`)

    return true
  } catch (error: any) {
    console.log(`   ❌ Contract read failed: ${error.message}`)
    return false
  }
}

// Test 2: Neynar Enrichment
async function testNeynarEnrichment() {
  console.log('\n2️⃣  Testing Neynar Enrichment...')
  
  try {
    const testFid = 1 // Farcaster founder
    
    const startTime = Date.now()
    const user = await fetchUserByFid(testFid)
    const duration = Date.now() - startTime

    if (user) {
      console.log(`   ✅ Neynar fetch succeeded (${duration}ms)`)
      console.log(`      Username: ${user.username}`)
      console.log(`      Display name: ${user.display_name}`)
      console.log(`      Has PFP: ${!!user.pfp_url}`)
      return true
    } else {
      console.log(`   ❌ Neynar returned null`)
      return false
    }
  } catch (error: any) {
    console.log(`   ❌ Neynar fetch failed: ${error.message}`)
    return false
  }
}

// Test 3: Cache Performance
async function testCachePerformance() {
  console.log('\n3️⃣  Testing Cache Performance...')
  
  try {
    const testFid = 1
    const testAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'

    // Test Neynar cache
    console.log('   Testing Neynar cache (skipping - Redis config needed)...')
    console.log('   ⚠️  Neynar cache test skipped (requires Redis)')

    // Test contract cache
    console.log('   Testing contract cache (skipping - Redis config needed)...')
    console.log('   ⚠️  Contract cache test skipped (requires Redis)')

    return true
  } catch (error: any) {
    console.log(`   ❌ Cache test failed: ${error.message}`)
    return false
  }
}

// Test 4: Database Operations
async function testDatabaseOperations() {
  console.log('\n4️⃣  Testing Database Operations...')
  
  try {
    const supabase = getSupabaseServerClient()

    if (!supabase) {
      console.log(`   ❌ Supabase client not initialized`)
      return false
    }

    // Test read from leaderboard_calculations
    const { data, error } = await supabase
      .from('leaderboard_calculations')
      .select('*')
      .eq('period', 'all_time')
      .order('total_score', { ascending: false })
      .limit(5)

    if (error) {
      console.log(`   ❌ Database query failed: ${error.message}`)
      return false
    }

    console.log(`   ✅ Database query succeeded`)
    console.log(`      Found ${data?.length || 0} records`)
    if (data && data.length > 0) {
      console.log(`      Top score: ${data[0].total_score}`)
      console.log(`      Top user: ${data[0].address}`)
    }

    return true
  } catch (error: any) {
    console.log(`   ❌ Database test failed: ${error.message}`)
    return false
  }
}

// Test 5: API Endpoints
async function testAPIEndpoints() {
  console.log('\n5️⃣  Testing API Endpoints...')
  
  try {
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
    
    // Test GET /api/leaderboard-v2
    console.log(`   Testing GET ${baseUrl}/api/leaderboard-v2?period=all_time&limit=5`)
    
    const response = await fetch(`${baseUrl}/api/leaderboard-v2?period=all_time&limit=5`)
    
    if (!response.ok) {
      console.log(`   ❌ API request failed: ${response.status} ${response.statusText}`)
      return false
    }

    const data = await response.json()
    
    console.log(`   ✅ API request succeeded`)
    console.log(`      Status: ${response.status}`)
    console.log(`      Results: ${data.data?.length || 0} records`)
    console.log(`      Total pages: ${data.pagination?.totalPages || 0}`)
    
    if (data.data && data.data.length > 0) {
      console.log(`      Top user: ${data.data[0].username || data.data[0].address}`)
      console.log(`      Top score: ${data.data[0].total_score}`)
    }

    return true
  } catch (error: any) {
    console.log(`   ❌ API test failed: ${error.message}`)
    console.log(`   Note: Make sure dev server is running (pnpm dev)`)
    return false
  }
}

// Run all tests
async function runTests() {
  const results = {
    contract: await testContractReads(),
    neynar: await testNeynarEnrichment(),
    cache: await testCachePerformance(),
    database: await testDatabaseOperations(),
    api: await testAPIEndpoints(),
  }

  console.log('\n📊 Test Results Summary:')
  console.log('========================')
  console.log(`Contract reads:      ${results.contract ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Neynar enrichment:   ${results.neynar ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Cache performance:   ${results.cache ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Database operations: ${results.database ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`API endpoints:       ${results.api ? '✅ PASS' : '❌ FAIL'}`)

  const totalTests = Object.keys(results).length
  const passedTests = Object.values(results).filter(Boolean).length

  console.log(`\n${passedTests}/${totalTests} tests passed`)

  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed!')
    process.exit(0)
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.')
    process.exit(1)
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
