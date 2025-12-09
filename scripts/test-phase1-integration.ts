#!/usr/bin/env tsx
/**
 * Phase 1 Integration Test - Base Proxy Contract
 * 
 * Tests ACTUAL integration of:
 * 1. /api/blockscout/contract-deployments (direct API)
 * 2. /api/onchain-stats/[chain] (full Phase 1 API)
 * 3. lib/onchain-stats/rpc-historical-client.ts (getRichStats)
 * 4. lib/onchain-stats/data-source-router-rpc-only.ts (fetchStats)
 * 
 * Using REAL Base proxy contract address:
 * 0x6A48B758ed42d7c934D387164E60aa58A92eD206
 */

const PHASE1_PROXY_ADDRESS = '0x6A48B758ed42d7c934D387164E60aa58A92eD206'
const PHASE1_CHAIN = 'base'
const PHASE1_API_BASE_URL = 'http://localhost:3000'

console.log('🧪 Phase 1 Integration Test - Base Proxy Contract\n')
console.log(`📍 Testing Address: ${PHASE1_PROXY_ADDRESS}`)
console.log(`⛓️  Chain: ${PHASE1_CHAIN}`)
console.log(`🌐 API Base: ${PHASE1_API_BASE_URL}\n`)

// Test 1: Blockscout Contract Deployments API
async function testBlockscoutAPI() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('TEST 1: Blockscout Contract Deployments API')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const url = `${PHASE1_API_BASE_URL}/api/blockscout/contract-deployments?address=${PHASE1_PROXY_ADDRESS}&chain=${PHASE1_CHAIN}`
  console.log(`📡 Calling: ${url}\n`)

  const startTime = Date.now()
  try {
    const response = await fetch(url)
    const elapsed = Date.now() - startTime

    console.log(`⏱️  Response Time: ${elapsed}ms`)
    console.log(`📊 Status: ${response.status} ${response.statusText}\n`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API Error:', errorText)
      return { success: false, error: errorText }
    }

    const data = await response.json()
    
    console.log('✅ Response Data:')
    console.log(`   Address: ${data.address}`)
    console.log(`   Chain: ${data.chain} (ID: ${data.chainId})`)
    console.log(`   Contracts Deployed: ${data.count}\n`)

    if (data.deployedContracts && data.deployedContracts.length > 0) {
      console.log(`📦 Deployed Contracts (first 5):`)
      data.deployedContracts.slice(0, 5).forEach((contract: any, i: number) => {
        console.log(`   ${i + 1}. ${contract.name || 'Unnamed'} (${contract.address})`)
        console.log(`      TX: ${contract.txHash}`)
        console.log(`      Time: ${new Date(contract.timestamp * 1000).toISOString()}`)
        console.log(`      Verified: ${contract.verified ? '✓' : '✗'}\n`)
      })
      
      if (data.deployedContracts.length > 5) {
        console.log(`   ... and ${data.deployedContracts.length - 5} more\n`)
      }
    }

    return { 
      success: true, 
      contractsDeployed: data.count,
      data 
    }
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    console.error(`❌ Request Failed (${elapsed}ms):`, error.message)
    return { success: false, error: error.message }
  }
}

// Test 2: Full Phase 1 OnchainStats API
async function testOnchainStatsAPI() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('TEST 2: Full Phase 1 OnchainStats API')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const url = `${PHASE1_API_BASE_URL}/api/onchain-stats/${PHASE1_CHAIN}?address=${PHASE1_PROXY_ADDRESS}`
  console.log(`📡 Calling: ${url}\n`)

  const startTime = Date.now()
  try {
    const response = await fetch(url)
    const elapsed = Date.now() - startTime

    console.log(`⏱️  Response Time: ${elapsed}ms`)
    console.log(`📊 Status: ${response.status} ${response.statusText}\n`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API Error:', errorText)
      return { success: false, error: errorText }
    }

    const result = await response.json()
    
    console.log('✅ Response Metadata:')
    console.log(`   OK: ${result.ok}`)
    console.log(`   Chain: ${result.chain}`)
    console.log(`   Address: ${result.address}`)
    console.log(`   Source: ${result.source}`)
    console.log(`   Cost: ${result.cost}`)
    console.log(`   Cached: ${result.cached}`)
    console.log(`   Response Time: ${result.responseTimeMs}ms\n`)

    const data = result.data
    console.log('📊 Rich Stats Data:')
    console.log(`   Balance: ${data.balance} ETH (${data.balanceWei} wei)`)
    console.log(`   Nonce: ${data.nonce}`)
    console.log(`   Contracts Deployed: ${data.contractsDeployed}`)
    console.log(`   Account Age: ${data.accountAgeDays} days`)
    console.log(`   Total Volume: ${data.totalVolume} ETH (${data.totalVolumeWei} wei)`)
    console.log(`   First TX Block: ${data.firstTx?.blockNumber}`)
    console.log(`   First TX Time: ${data.firstTx?.timestamp ? new Date(data.firstTx.timestamp * 1000).toISOString() : 'null'}`)
    console.log(`   Data Source: ${data.dataSource}`)
    console.log(`   Cost: ${data.cost}\n`)

    // Validate rich stats
    const validation = {
      hasBalance: data.balance !== null,
      hasNonce: data.nonce !== null,
      hasContractsDeployed: data.contractsDeployed !== null,
      hasFirstTx: data.firstTx !== null,
      hasAccountAge: data.accountAge !== null,
      hasTotalVolume: data.totalVolume !== null,
      isZeroCost: data.cost === '$0',
    }

    console.log('✅ Validation Results:')
    Object.entries(validation).forEach(([key, value]) => {
      console.log(`   ${value ? '✓' : '✗'} ${key}: ${value}`)
    })

    const allValid = Object.values(validation).every(v => v)
    console.log(`\n${allValid ? '✅ ALL CHECKS PASSED' : '⚠️  SOME CHECKS FAILED'}\n`)

    return { 
      success: allValid, 
      data: result.data,
      validation 
    }
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    console.error(`❌ Request Failed (${elapsed}ms):`, error.message)
    return { success: false, error: error.message }
  }
}

// Test 3: Compare Results
async function compareResults(blockscoutResult: any, statsResult: any) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('TEST 3: Integration Verification')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  if (!blockscoutResult.success || !statsResult.success) {
    console.log('⚠️  Cannot compare - one or more tests failed\n')
    return { success: false }
  }

  const blockscoutCount = blockscoutResult.contractsDeployed
  const statsCount = statsResult.data.contractsDeployed

  console.log('📊 Contract Deployment Count Comparison:')
  console.log(`   Blockscout API: ${blockscoutCount}`)
  console.log(`   OnchainStats API: ${statsCount}`)
  console.log(`   Match: ${blockscoutCount === statsCount ? '✅' : '❌'}\n`)

  const match = blockscoutCount === statsCount
  
  if (match) {
    console.log('✅ INTEGRATION VERIFIED')
    console.log('   ✓ Blockscout API working')
    console.log('   ✓ RPC Historical Client integrating Blockscout API')
    console.log('   ✓ Data Source Router passing through correct data')
    console.log('   ✓ OnchainStats API returning accurate rich stats\n')
  } else {
    console.log('❌ INTEGRATION ISSUE')
    console.log('   Contract deployment counts do not match!')
    console.log('   This indicates the RPC client may not be calling Blockscout API correctly.\n')
  }

  return { success: match, blockscoutCount, statsCount }
}

// Test 4: Phase 2 Readiness Check
function checkPhase2Readiness(statsResult: any) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('TEST 4: Phase 2 Readiness Check')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  if (!statsResult.success) {
    console.log('⚠️  Cannot check - onchain stats test failed\n')
    return { ready: false }
  }

  const requiredFields = {
    balance: statsResult.data.balance !== null,
    balanceWei: statsResult.data.balanceWei !== null,
    nonce: statsResult.data.nonce !== null,
    contractsDeployed: statsResult.data.contractsDeployed !== null,
    firstTx: statsResult.data.firstTx !== null,
    accountAge: statsResult.data.accountAge !== null,
    accountAgeDays: statsResult.data.accountAgeDays !== null,
    totalVolume: statsResult.data.totalVolume !== null,
    totalVolumeWei: statsResult.data.totalVolumeWei !== null,
  }

  console.log('📋 Phase 2 Hook Requirements:')
  console.log('   useOnchainStats(address, chainKey) expects:\n')
  
  Object.entries(requiredFields).forEach(([field, hasValue]) => {
    console.log(`   ${hasValue ? '✓' : '✗'} ${field}`)
  })

  const allFieldsPresent = Object.values(requiredFields).every(v => v)
  console.log(`\n${allFieldsPresent ? '✅' : '❌'} Phase 2 Readiness: ${allFieldsPresent ? 'READY' : 'NOT READY'}\n`)

  if (allFieldsPresent) {
    console.log('✅ PHASE 1 COMPLETE')
    console.log('   All rich stats fields implemented:')
    console.log('   ✓ Balance (formatted + wei)')
    console.log('   ✓ Nonce (transaction count)')
    console.log('   ✓ Contract deployments (Blockscout API integration)')
    console.log('   ✓ First transaction (block + timestamp)')
    console.log('   ✓ Account age (seconds + days)')
    console.log('   ✓ Total volume (formatted + wei)\n')
    
    console.log('🚀 READY FOR PHASE 2: Professional Data Fetching Hook')
    console.log('   Next: Implement useOnchainStats.ts with SWR pattern\n')
  } else {
    console.log('⚠️  PHASE 1 INCOMPLETE')
    console.log('   Some required fields are missing or null.\n')
  }

  return { ready: allFieldsPresent, requiredFields }
}

// Main execution
async function main() {
  console.log('Starting Phase 1 Integration Tests...\n')

  // Run tests sequentially
  const blockscoutResult = await testBlockscoutAPI()
  const statsResult = await testOnchainStatsAPI()
  const integrationResult = await compareResults(blockscoutResult, statsResult)
  const readinessResult = checkPhase2Readiness(statsResult)

  // Final summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('FINAL SUMMARY')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const results = {
    blockscoutAPI: blockscoutResult.success,
    onchainStatsAPI: statsResult.success,
    integration: integrationResult.success,
    phase2Ready: readinessResult.ready,
  }

  console.log('Test Results:')
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${test}`)
  })

  const allPassed = Object.values(results).every(v => v)
  console.log(`\n${allPassed ? '✅✅✅ ALL TESTS PASSED ✅✅✅' : '⚠️  SOME TESTS FAILED'}\n`)

  if (allPassed) {
    console.log('🎉 Phase 1 Implementation Complete!')
    console.log('🚀 Ready to proceed to Phase 2: useOnchainStats Hook\n')
  } else {
    console.log('⚠️  Please fix failing tests before proceeding to Phase 2.\n')
  }

  process.exit(allPassed ? 0 : 1)
}

main().catch(error => {
  console.error('\n💥 Fatal Error:', error)
  process.exit(1)
})
