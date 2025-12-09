#!/usr/bin/env npx tsx
/**
 * Test Blockscout API - FREE Etherscan Alternative
 */

import { BlockscoutClient } from '../lib/onchain-stats/blockscout-client'
import type { Address } from 'viem'

const TEST_ADDRESS = '0x7539472DAd6a371e6E152C5A203469aA32314130' as Address

async function testBlockscout(chain: string) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Testing ${chain.toUpperCase()} via Blockscout API`)
  console.log('='.repeat(60))
  
  try {
    const client = new BlockscoutClient(chain as any)
    const stats = await client.getRichStats(TEST_ADDRESS)
    
    console.log(`✅ Total Transactions: ${stats.totalTxs}`)
    console.log(`✅ Token Transfers: ${stats.totalTokenTxs}`)
    console.log(`✅ First TX: Block ${stats.firstTx?.blockNumber} at ${new Date(stats.firstTx?.timestamp! * 1000).toISOString()}`)
    console.log(`✅ Last TX: Block ${stats.lastTx?.blockNumber} at ${new Date(stats.lastTx?.timestamp! * 1000).toISOString()}`)
    console.log(`✅ Account Age: ${stats.accountAgeDays} days (${stats.accountAgeSeconds} seconds)`)
    console.log(`✅ Total Volume: ${(Number(stats.totalVolume) / 1e18).toFixed(4)} ETH`)
    console.log(`✅ Contracts Deployed: ${stats.contractsDeployed}`)
    console.log(`✅ Unique Contracts: ${stats.uniqueContracts}`)
    console.log(`✅ Unique Days Active: ${stats.uniqueDays}`)
    console.log(`✅ Unique Weeks Active: ${stats.uniqueWeeks}`)
    console.log(`✅ Unique Months Active: ${stats.uniqueMonths}`)
    console.log(`✅ Talent Score (Builder): ${stats.talentScore ?? '—'}`)
    console.log(`✅ Neynar Score: ${stats.neynarScore ?? '—'}`)
    
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`)
  }
}

async function main() {
  console.log('Testing BLOCKSCOUT API (FREE Etherscan Alternative)')
  console.log(`Address: ${TEST_ADDRESS}`)
  console.log('Discovery: Wenser.xyz uses this for FREE transaction history')
  
  await testBlockscout('base')
  
  console.log(`\n${'='.repeat(60)}`)
  console.log('✅ Test Complete - ALL DATA FROM BLOCKSCOUT')
  console.log('Cost: $0 (600 req/10min per chain)')
  console.log('API: Etherscan-compatible, NO KEY REQUIRED')
  console.log('Scores: Talent Protocol + Neynar (if keys configured)')
  console.log('='.repeat(60))
}

main().catch(console.error)
