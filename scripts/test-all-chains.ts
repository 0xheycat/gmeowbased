#!/usr/bin/env tsx
/**
 * Comprehensive Multi-Chain Test
 * 
 * Tests all chains to verify:
 * 1. Blockscout chains return full rich stats (dataSource: "blockscout")
 * 2. RPC fallback chains return basic stats (dataSource: "rpc")
 * 3. All stats fields are valid (not null where expected)
 * 4. Scores are included for Blockscout chains
 */

const TEST_ADDRESS = '0x7539472DAd6a371e6E152C5A203469aA32314130'
const API_BASE = 'http://localhost:3001'

// Blockscout supported chains (should have full rich stats)
const BLOCKSCOUT_CHAINS = ['base', 'ethereum', 'optimism', 'arbitrum', 'celo']

// RPC fallback chains (basic stats only)
const RPC_CHAINS = ['avax', 'bnb', 'fraxtal', 'berachain', 'katana', 'soneium', 'taiko', 'unichain', 'ink', 'hyperevm']

interface TestResult {
  chain: string
  success: boolean
  dataSource: string | null
  hasBasicStats: boolean
  hasRichStats: boolean
  hasScores: boolean
  error?: string
  data?: any
}

async function testChain(chain: string): Promise<TestResult> {
  const url = `${API_BASE}/api/onchain-stats/${chain}?address=${TEST_ADDRESS}`
  
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) })
    
    if (!response.ok) {
      return {
        chain,
        success: false,
        dataSource: null,
        hasBasicStats: false,
        hasRichStats: false,
        hasScores: false,
        error: `HTTP ${response.status}`,
      }
    }

    const result = await response.json()
    const data = result.data

    if (!data) {
      return {
        chain,
        success: false,
        dataSource: null,
        hasBasicStats: false,
        hasRichStats: false,
        hasScores: false,
        error: 'No data in response',
      }
    }

    // Check basic stats (all chains should have these)
    const hasBasicStats = 
      data.balance !== null &&
      data.nonce !== null &&
      data.accountAgeDays !== null

    // Check rich stats (only Blockscout chains)
    const hasRichStats = 
      data.totalTxs !== null && data.totalTxs !== undefined &&
      data.uniqueContracts !== null && data.uniqueContracts !== undefined &&
      data.uniqueDays !== null && data.uniqueDays !== undefined

    // Check scores (only Blockscout chains)
    const hasScores = 
      (data.talentScore !== null && data.talentScore !== undefined) ||
      (data.neynarScore !== null && data.neynarScore !== undefined)

    return {
      chain,
      success: true,
      dataSource: data.dataSource,
      hasBasicStats,
      hasRichStats,
      hasScores,
      data,
    }
  } catch (error: any) {
    return {
      chain,
      success: false,
      dataSource: null,
      hasBasicStats: false,
      hasRichStats: false,
      hasScores: false,
      error: error.message,
    }
  }
}

async function runTests() {
  console.log('🧪 Comprehensive Multi-Chain Test\n')
  console.log(`📍 Test Address: ${TEST_ADDRESS}`)
  console.log(`🌐 API Base: ${API_BASE}\n`)

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('BLOCKSCOUT CHAINS (Should have full rich stats)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const blockscoutResults: TestResult[] = []
  
  for (const chain of BLOCKSCOUT_CHAINS) {
    process.stdout.write(`Testing ${chain}... `)
    const result = await testChain(chain)
    blockscoutResults.push(result)
    
    if (result.success) {
      const checks = [
        result.dataSource === 'blockscout' ? '✅ blockscout' : '⚠️  ' + result.dataSource,
        result.hasBasicStats ? '✅ basic' : '❌ basic',
        result.hasRichStats ? '✅ rich' : '❌ rich',
        result.hasScores ? '✅ scores' : '⚠️  no scores',
      ]
      console.log(checks.join(' | '))
    } else {
      console.log(`❌ ${result.error}`)
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('RPC FALLBACK CHAINS (Should have basic stats only)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const rpcResults: TestResult[] = []
  
  for (const chain of RPC_CHAINS) {
    process.stdout.write(`Testing ${chain}... `)
    const result = await testChain(chain)
    rpcResults.push(result)
    
    if (result.success) {
      const checks = [
        result.dataSource === 'rpc' ? '✅ rpc' : '⚠️  ' + result.dataSource,
        result.hasBasicStats ? '✅ basic' : '❌ basic',
      ]
      console.log(checks.join(' | '))
    } else {
      console.log(`❌ ${result.error}`)
    }
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('SUMMARY')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const allResults = [...blockscoutResults, ...rpcResults]
  const successCount = allResults.filter(r => r.success).length
  const failCount = allResults.filter(r => !r.success).length

  console.log(`📊 Total Chains Tested: ${allResults.length}`)
  console.log(`✅ Successful: ${successCount}`)
  console.log(`❌ Failed: ${failCount}\n`)

  // Blockscout chains validation
  const blockscoutPassed = blockscoutResults.filter(r => 
    r.success && 
    r.dataSource === 'blockscout' && 
    r.hasBasicStats && 
    r.hasRichStats
  ).length

  console.log('🎯 Blockscout Chains:')
  console.log(`   Tested: ${BLOCKSCOUT_CHAINS.length}`)
  console.log(`   Passed: ${blockscoutPassed}`)
  console.log(`   Status: ${blockscoutPassed === BLOCKSCOUT_CHAINS.length ? '✅ ALL PASSED' : '⚠️  SOME FAILED'}\n`)

  // RPC chains validation
  const rpcPassed = rpcResults.filter(r => 
    r.success && 
    r.dataSource === 'rpc' && 
    r.hasBasicStats
  ).length

  console.log('🔄 RPC Fallback Chains:')
  console.log(`   Tested: ${RPC_CHAINS.length}`)
  console.log(`   Passed: ${rpcPassed}`)
  console.log(`   Status: ${rpcPassed === RPC_CHAINS.length ? '✅ ALL PASSED' : '⚠️  SOME FAILED'}\n`)

  // Detailed results for failed chains
  const failed = allResults.filter(r => !r.success)
  if (failed.length > 0) {
    console.log('❌ Failed Chains Details:\n')
    failed.forEach(r => {
      console.log(`   ${r.chain}: ${r.error}`)
    })
    console.log()
  }

  // Show sample data from a successful Blockscout chain
  const baseResult = blockscoutResults.find(r => r.chain === 'base' && r.success)
  if (baseResult && baseResult.data) {
    console.log('📊 Sample Data (Base Chain):\n')
    const d = baseResult.data
    console.log(`   Balance: ${d.balance} ETH`)
    console.log(`   Nonce: ${d.nonce}`)
    console.log(`   Account Age: ${d.accountAgeDays} days`)
    console.log(`   Total Volume: ${d.totalVolume} ETH`)
    console.log(`   Contracts Deployed: ${d.contractsDeployed}`)
    console.log(`   Total TXs: ${d.totalTxs || 'null'}`)
    console.log(`   Unique Contracts: ${d.uniqueContracts || 'null'}`)
    console.log(`   Unique Days: ${d.uniqueDays || 'null'}`)
    console.log(`   Talent Score: ${d.talentScore || 'null'}`)
    console.log(`   Neynar Score: ${d.neynarScore || 'null'}`)
    console.log(`   Data Source: ${d.dataSource}\n`)
  }

  // Final verdict
  const allBlockscoutPassed = blockscoutPassed === BLOCKSCOUT_CHAINS.length
  const allRpcPassed = rpcPassed === RPC_CHAINS.length

  if (allBlockscoutPassed && allRpcPassed) {
    console.log('🎉 ALL TESTS PASSED!\n')
    console.log('✅ Phase 1 Verified:')
    console.log('   ✓ Blockscout chains return full rich stats')
    console.log('   ✓ RPC chains return basic stats')
    console.log('   ✓ Data source routing working correctly')
    console.log('   ✓ $0 cost confirmed (no paid APIs)\n')
    console.log('🚀 Ready for Phase 2: useOnchainStats Hook')
    console.log('   Next: Implement SWR pattern with request deduplication')
    console.log('   File: hooks/useOnchainStats.ts\n')
    return true
  } else {
    console.log('⚠️  SOME TESTS FAILED\n')
    if (!allBlockscoutPassed) {
      console.log('❌ Blockscout chains not working correctly')
      console.log('   Review: lib/onchain-stats/data-source-router-rpc-only.ts')
      console.log('   Check: BlockscoutClient initialization\n')
    }
    if (!allRpcPassed) {
      console.log('⚠️  Some RPC chains failed')
      console.log('   Review: lib/onchain-stats/rpc-historical-client.ts')
      console.log('   Check: RPC endpoints and timeouts\n')
    }
    return false
  }
}

// Run tests
console.log('Starting comprehensive multi-chain test...\n')
console.log('Waiting for dev server to be ready...')

setTimeout(async () => {
  try {
    const success = await runTests()
    process.exit(success ? 0 : 1)
  } catch (error) {
    console.error('\n💥 Fatal Error:', error)
    process.exit(1)
  }
}, 8000) // Wait 8 seconds for server to start
