/**
 * Test Fallback - Public RPC (No API Key)
 * Shows that balance/nonce still work at $0 cost
 */

import { createPublicClient, http, formatEther, type Address } from 'viem'
import { base } from 'viem/chains'

const TEST_ADDRESS = '0x7539472DAd6a371e6E152C5A203469aA32314130' as Address

async function testPublicRPC() {
  console.log('🧪 Testing Public RPC Fallback (No API Key)')
  console.log('='.repeat(70))
  console.log(`Address: ${TEST_ADDRESS}`)
  console.log('='.repeat(70))
  console.log('')

  try {
    // Create public client (FREE public RPC)
    const client = createPublicClient({
      chain: base,
      transport: http('https://mainnet.base.org'),
    })

    // 1. Get Balance
    console.log('📊 Fetching balance from public RPC...')
    const balance = await client.getBalance({ address: TEST_ADDRESS })
    const balanceEth = formatEther(balance)
    console.log(`✅ Balance: ${balanceEth} ETH`)

    // 2. Get Nonce
    console.log('\n📊 Fetching nonce from public RPC...')
    const nonce = await client.getTransactionCount({ address: TEST_ADDRESS })
    console.log(`✅ Nonce: ${nonce}`)

    // 3. Get Current Block
    console.log('\n📊 Fetching current block...')
    const block = await client.getBlockNumber()
    console.log(`✅ Current Block: ${block}`)

    console.log('\n' + '='.repeat(70))
    console.log('✅ WORKING: Balance & Nonce')
    console.log('='.repeat(70))
    console.log('Source: Public RPC (https://mainnet.base.org)')
    console.log('Cost: $0 (FREE public endpoint)')
    console.log('\n⚠️  LIMITATIONS (without Etherscan API V2):')
    console.log('• No transaction history')
    console.log('• No account age calculation')
    console.log('• No contract deployment list')
    console.log('• No volume calculation')
    console.log('\n💡 SOLUTION: Get Etherscan V2 API key (still $0 cost)')
    console.log('   → https://etherscan.io/myapikey')
    console.log('   → 432,000 FREE calls/day')
    console.log('   → Enables full stats (history, contracts, volume)')

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`)
  }
}

testPublicRPC().catch(console.error)
