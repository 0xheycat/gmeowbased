#!/usr/bin/env npx tsx
/**
 * Test RPC-Only Implementation
 * Tests the new PUBLIC RPC strategy for rich onchain stats
 */

import { RpcHistoricalClient } from '../lib/onchain-stats/rpc-historical-client'
import type { Address } from 'viem'

const TEST_ADDRESS = '0x7539472DAd6a371e6E152C5A203469aA32314130' as Address

async function testChain(chain: string) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Testing ${chain.toUpperCase()}`)
  console.log('='.repeat(60))
  
  try {
    const client = new RpcHistoricalClient(chain as any)
    const stats = await client.getRichStats(TEST_ADDRESS)
    
    console.log(`✅ Balance: ${(Number(stats.balance) / 1e18).toFixed(6)} ETH`)
    console.log(`✅ Nonce: ${stats.nonce} transactions`)
    console.log(`✅ First TX Block: ${stats.firstTxBlock || 'N/A'}`)
    console.log(`✅ First TX Timestamp: ${stats.firstTxTimestamp ? new Date(stats.firstTxTimestamp * 1000).toISOString() : 'N/A'}`)
    console.log(`✅ Account Age: ${stats.accountAgeDays || 0} days`)
    console.log(`✅ Estimated Volume: ${(Number(stats.totalVolume) / 1e18).toFixed(4)} ETH`)
    console.log(`✅ Contracts Deployed: ${stats.contractsDeployed}`)
    
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`)
  }
}

async function main() {
  console.log('Testing PUBLIC RPC Strategy (Zero Cost)')
  console.log(`Address: ${TEST_ADDRESS}`)
  
  // Test top 4 chains
  await testChain('base')
  await testChain('ethereum')
  await testChain('optimism')
  await testChain('arbitrum')
  
  console.log(`\n${'='.repeat(60)}`)
  console.log('✅ Test Complete - All data from PUBLIC RPC')
  console.log('Cost: $0 (no API keys required)')
  console.log('='.repeat(60))
}

main().catch(console.error)
