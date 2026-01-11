#!/usr/bin/env tsx
/**
 * Verify Oracle Authorization
 * 
 * Checks if the oracle wallet is authorized to call scoring functions:
 * - setViralPoints()
 * - addGuildPoints()
 * - addReferralPoints()
 * 
 * Usage:
 *   pnpm tsx scripts/oracle/verify-authorization.ts
 * 
 * Created: January 11, 2026
 */

import { config } from 'dotenv'
config({ path: process.env.DOTENV_PATH || '.env.local', override: true })

import { createPublicClient, http, parseAbi } from 'viem'
import { base } from 'viem/chains'

const SCORING_MODULE_ADDRESS = process.env.NEXT_PUBLIC_GM_BASE_SCORING as `0x${string}`
const ORACLE_WALLET = '0x8870C155666809609176260F2B65a626C000D773' as `0x${string}`

const SCORING_ABI = parseAbi([
  'function authorizedOracles(address oracle) view returns (bool)',
  'function owner() view returns (address)',
  'function viralPoints(address user) view returns (uint256)',
])

async function main() {
  if (!SCORING_MODULE_ADDRESS) {
    throw new Error('NEXT_PUBLIC_GM_BASE_SCORING not configured')
  }

  console.log('🔍 Oracle Authorization Check')
  console.log(`ScoringModule: ${SCORING_MODULE_ADDRESS}`)
  console.log(`Oracle Wallet: ${ORACLE_WALLET}`)
  console.log('─'.repeat(60))

  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  })

  // Check authorization
  const isAuthorized = await publicClient.readContract({
    address: SCORING_MODULE_ADDRESS,
    abi: SCORING_ABI,
    functionName: 'authorizedOracles',
    args: [ORACLE_WALLET],
  })

  console.log(`\nAuthorization Status: ${isAuthorized ? '✅ AUTHORIZED' : '❌ NOT AUTHORIZED'}`)

  if (!isAuthorized) {
    console.log('\n⚠️  Oracle wallet is NOT authorized!')
    console.log('The contract owner needs to run:')
    console.log(`\ncast send ${SCORING_MODULE_ADDRESS} "setAuthorizedOracle(address,bool)" ${ORACLE_WALLET} true --rpc-url base --private-key <OWNER_KEY>`)
    process.exit(1)
  }

  // Check owner
  const owner = await publicClient.readContract({
    address: SCORING_MODULE_ADDRESS,
    abi: SCORING_ABI,
    functionName: 'owner',
  })

  console.log(`\nContract Owner: ${owner}`)

  // Test reading viral points for a sample address
  const sampleAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
  const sampleViralPoints = await publicClient.readContract({
    address: SCORING_MODULE_ADDRESS,
    abi: SCORING_ABI,
    functionName: 'viralPoints',
    args: [sampleAddress],
  })

  console.log(`\n✅ Contract accessible`)
  console.log(`Sample viralPoints query: ${sampleViralPoints}`)
  console.log('\n✅ All checks passed! Oracle is ready to deposit viral points.')
}

main().catch(error => {
  console.error('❌ Error:', error)
  process.exit(1)
})
