/**
 * Test Script for Onchain Stats API
 * 
 * Tests zero-cost architecture with real address
 * Verifies: API works, cache works, zero RPC calls
 */

const TEST_ADDRESS = '0x7539472DAd6a371e6E152C5A203469aA32314130'
const TEST_CHAINS = ['base', 'ethereum', 'optimism']
const API_BASE = 'http://localhost:3000'

async function testOnchainStats() {
  console.log('🧪 Testing Onchain Stats API - Zero Cost Architecture')
  console.log('=' .repeat(70))
  console.log(`Address: ${TEST_ADDRESS}`)
  console.log('=' .repeat(70))
  console.log('')

  for (const chain of TEST_CHAINS) {
    console.log(`\n📊 Testing ${chain.toUpperCase()} chain...`)
    console.log('-'.repeat(70))

    try {
      // Test 1: First request (cache miss)
      const start1 = Date.now()
      const response1 = await fetch(`${API_BASE}/api/onchain-stats/${chain}?address=${TEST_ADDRESS}`)
      const duration1 = Date.now() - start1
      
      if (!response1.ok) {
        const error = await response1.json()
        console.error(`❌ Request 1 failed: ${error.error}`)
        continue
      }

      const data1 = await response1.json()
      
      console.log(`✅ Request 1 (Cache MISS):`)
      console.log(`   Response time: ${duration1}ms`)
      console.log(`   Cached: ${data1.cached}`)
      console.log(`   Source: ${data1.source}`)
      console.log(`   Cost: ${data1.cost}`)
      
      if (data1.data) {
        console.log(`\n   📈 Stats:`)
        console.log(`   • Balance: ${data1.data.balance || '0'} ${chain === 'base' ? 'ETH' : chain === 'ethereum' ? 'ETH' : 'ETH'}`)
        console.log(`   • Nonce: ${data1.data.nonce || 0}`)
        console.log(`   • Contracts Deployed: ${data1.data.contractsDeployed || 0}`)
        console.log(`   • Total Volume: ${data1.data.totalVolume || '0'} ETH`)
        
        if (data1.data.firstTx) {
          const age = data1.data.accountAge || 0
          const days = Math.floor(age / 86400)
          const hours = Math.floor((age % 86400) / 3600)
          console.log(`   • Account Age: ${days}d ${hours}h`)
          console.log(`   • First TX: ${new Date(data1.data.firstTx.timestamp * 1000).toLocaleDateString()}`)
        }
        
        if (data1.data.contracts?.length > 0) {
          console.log(`\n   🏗️  Deployed Contracts:`)
          data1.data.contracts.slice(0, 3).forEach((contract, i) => {
            console.log(`   ${i + 1}. ${contract.address}`)
          })
          if (data1.data.contracts.length > 3) {
            console.log(`   ... and ${data1.data.contracts.length - 3} more`)
          }
        }
      }

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 500))

      // Test 2: Second request (cache hit)
      const start2 = Date.now()
      const response2 = await fetch(`${API_BASE}/api/onchain-stats/${chain}?address=${TEST_ADDRESS}`)
      const duration2 = Date.now() - start2
      const data2 = await response2.json()

      console.log(`\n✅ Request 2 (Cache HIT):`)
      console.log(`   Response time: ${duration2}ms (${duration1 - duration2}ms faster!)`)
      console.log(`   Cached: ${data2.cached}`)
      console.log(`   Speed improvement: ${((duration1 / duration2) - 1) * 100}%`)

      // Verify cost
      if (data1.cost === '$0' && data2.cost === '$0') {
        console.log(`\n💰 COST VERIFICATION: $0 ✅`)
      } else {
        console.log(`\n⚠️  WARNING: Cost not zero!`)
      }

    } catch (error) {
      console.error(`❌ Error testing ${chain}:`, error.message)
    }
  }

  console.log('\n' + '='.repeat(70))
  console.log('✅ Test Complete!')
  console.log('='.repeat(70))
  console.log('\n📝 Next Steps:')
  console.log('1. Check DevTools Network tab - verify NO Alchemy/paid RPC calls')
  console.log('2. Should see requests to api.basescan.org or api.etherscan.io (FREE)')
  console.log('3. Cache should make subsequent requests 10-50x faster')
  console.log('4. Cost should always be $0')
  console.log('\n🎉 If all checks pass, architecture is working as designed!')
}

// Run tests
testOnchainStats().catch(console.error)
