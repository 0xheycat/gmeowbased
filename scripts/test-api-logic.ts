#!/usr/bin/env npx tsx
/**
 * Test API Endpoint - Direct Test (without running server)
 */

import { DataSourceRouter } from '../lib/onchain-stats/data-source-router-rpc-only'
import type { Address } from 'viem'

const TEST_ADDRESS = '0x7539472DAd6a371e6E152C5A203469aA32314130' as Address

async function testAPI(chain: string) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Testing API Logic: ${chain.toUpperCase()}`)
  console.log('='.repeat(60))
  
  try {
    const router = new DataSourceRouter(chain as any)
    const stats = await router.fetchStats(TEST_ADDRESS)
    
    console.log('✅ API Response:')
    console.log(JSON.stringify(stats, null, 2))
    
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`)
  }
}

async function main() {
  console.log('Testing API Logic (PUBLIC RPC Strategy)')
  console.log(`Address: ${TEST_ADDRESS}`)
  
  await testAPI('base')
  await testAPI('optimism')
  
  console.log(`\n${'='.repeat(60)}`)
  console.log('✅ API Logic Test Complete')
  console.log('Cost: $0/month (no API keys)')
  console.log('='.repeat(60))
}

main().catch(console.error)
