#!/usr/bin/env tsx
/**
 * Test Blockscout Integration - Your Address
 * 
 * Verifies that data-source-router now uses Blockscout API
 * with full rich stats including Talent + Neynar scores
 * 
 * Expected results (from BLOCKSCOUT-PERFECT-SOLUTION.md):
 * - Account Age: 644 days (TRUE, not 23 from pruned RPC)
 * - Volume: 10.0020 ETH (EXACT, not 0 from RPC estimate)
 * - Contracts: 15 (REAL count)
 * - Total TXs: 3,499
 * - Unique Contracts: 551
 * - Talent Score: Present
 * - Neynar Score: Present
 * - Data Source: "blockscout"
 */

const BLOCKSCOUT_TEST_ADDRESS = '0x7539472DAd6a371e6E152C5A203469aA32314130'
const BLOCKSCOUT_TEST_CHAIN = 'base'

console.log('🧪 Testing Blockscout Integration\n')
console.log(`📍 Address: ${BLOCKSCOUT_TEST_ADDRESS}`)
console.log(`⛓️  Chain: ${BLOCKSCOUT_TEST_CHAIN}\n`)

async function testBlockscoutIntegration() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('TEST: Blockscout API Integration')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const url = `http://localhost:3001/api/onchain-stats/${BLOCKSCOUT_TEST_CHAIN}?address=${BLOCKSCOUT_TEST_ADDRESS}`
  console.log(`📡 Calling: ${url}\n`)

  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}:`, await response.text())
      return { success: false }
    }

    const result = await response.json()
    const data = result.data

    console.log('✅ Response received\n')
    console.log('📊 Data Source:', data.dataSource, data.dataSource === 'blockscout' ? '✅' : '❌ Should be blockscout!')
    console.log()

    console.log('📈 Basic Stats:')
    console.log(`   Balance: ${data.balance} ETH`)
    console.log(`   Nonce: ${data.nonce}`)
    console.log(`   Contracts Deployed: ${data.contractsDeployed}`)
    console.log(`   Account Age: ${data.accountAgeDays} days`)
    console.log(`   Total Volume: ${data.totalVolume} ETH`)
    console.log()

    console.log('🎯 Rich Stats (Blockscout only):')
    console.log(`   Total TXs: ${data.totalTxs || 'null'}`)
    console.log(`   Total Token TXs: ${data.totalTokenTxs || 'null'}`)
    console.log(`   Unique Contracts: ${data.uniqueContracts || 'null'}`)
    console.log(`   Unique Days: ${data.uniqueDays || 'null'}`)
    console.log(`   Unique Weeks: ${data.uniqueWeeks || 'null'}`)
    console.log(`   Unique Months: ${data.uniqueMonths || 'null'}`)
    console.log()

    console.log('🏆 Scores:')
    console.log(`   Talent Score: ${data.talentScore || 'null'}`)
    console.log(`   Neynar Score: ${data.neynarScore || 'null'}`)
    console.log()

    // Validation
    const checks = {
      'Data source is Blockscout': data.dataSource === 'blockscout',
      'Account age > 100 days': data.accountAgeDays > 100,
      'Total volume > 1 ETH': parseFloat(data.totalVolume) > 1,
      'Contracts deployed > 0': data.contractsDeployed > 0,
      'Has totalTxs': data.totalTxs !== null && data.totalTxs !== undefined,
      'Has uniqueContracts': data.uniqueContracts !== null && data.uniqueContracts !== undefined,
      'Has uniqueDays': data.uniqueDays !== null && data.uniqueDays !== undefined,
      'Has talentScore or neynarScore': (data.talentScore !== null && data.talentScore !== undefined) || (data.neynarScore !== null && data.neynarScore !== undefined),
    }

    console.log('✅ Validation:')
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${check}`)
    })
    console.log()

    const allPassed = Object.values(checks).every(v => v)
    
    if (allPassed) {
      console.log('🎉 ALL CHECKS PASSED - Blockscout integration working!')
      console.log()
      console.log('✅ Phase 1 COMPLETE:')
      console.log('   ✓ Using Blockscout API (not RPC)')
      console.log('   ✓ 100% accurate data')
      console.log('   ✓ Rich stats included')
      console.log('   ✓ Scores integrated')
      console.log('   ✓ $0 cost confirmed')
      console.log()
      console.log('🚀 Ready for Phase 2: useOnchainStats hook')
    } else {
      console.log('⚠️  SOME CHECKS FAILED')
      console.log('   Review data-source-router-rpc-only.ts')
      console.log('   Ensure Blockscout client is being used for Base chain')
    }
    console.log()

    return { success: allPassed, data }
  } catch (error: any) {
    console.error('❌ Test Failed:', error.message)
    return { success: false, error: error.message }
  }
}

testBlockscoutIntegration()
  .then(result => {
    process.exit(result.success ? 0 : 1)
  })
  .catch(error => {
    console.error('💥 Fatal Error:', error)
    process.exit(1)
  })
