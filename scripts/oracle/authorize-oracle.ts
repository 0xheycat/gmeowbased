#!/usr/bin/env tsx
/**
 * Authorize Oracle Wallet
 * 
 * Authorizes the oracle wallet to call scoring functions in ScoringModule.
 * Must be run by the contract owner.
 * 
 * Usage:
 *   OWNER_PRIVATE_KEY=0x... pnpm tsx scripts/oracle/authorize-oracle.ts
 * 
 * Created: January 11, 2026
 */

import { config } from 'dotenv'
config({ path: process.env.DOTENV_PATH || '.env.local', override: true })

import { createPublicClient, createWalletClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'

const SCORING_MODULE_ADDRESS = process.env.NEXT_PUBLIC_GM_BASE_SCORING as `0x${string}`
const ORACLE_WALLET = '0x8870C155666809609176260F2B65a626C000D773' as `0x${string}`

const SCORING_ABI = parseAbi([
  'function setAuthorizedOracle(address oracle, bool authorized) external',
  'function authorizedOracles(address oracle) view returns (bool)',
  'function owner() view returns (address)',
])

async function main() {
  const ownerKey = process.env.OWNER_PRIVATE_KEY
  
  if (!ownerKey) {
    console.error('❌ OWNER_PRIVATE_KEY environment variable required')
    console.error('This must be the private key of the ScoringModule owner')
    process.exit(1)
  }

  if (!SCORING_MODULE_ADDRESS) {
    throw new Error('NEXT_PUBLIC_GM_BASE_SCORING not configured')
  }

  console.log('🔐 Authorizing Oracle Wallet')
  console.log(`ScoringModule: ${SCORING_MODULE_ADDRESS}`)
  console.log(`Oracle Wallet: ${ORACLE_WALLET}`)
  console.log('─'.repeat(60))

  const ownerAccount = privateKeyToAccount(ownerKey as `0x${string}`)
  console.log(`Owner Account: ${ownerAccount.address}\n`)

  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  })

  const walletClient = createWalletClient({
    account: ownerAccount,
    chain: base,
    transport: http(),
  })

  // Verify we are the owner
  const contractOwner = await publicClient.readContract({
    address: SCORING_MODULE_ADDRESS,
    abi: SCORING_ABI,
    functionName: 'owner',
  })

  if (contractOwner.toLowerCase() !== ownerAccount.address.toLowerCase()) {
    console.error(`❌ Account ${ownerAccount.address} is not the contract owner!`)
    console.error(`Contract owner is: ${contractOwner}`)
    process.exit(1)
  }

  console.log('✅ Verified as contract owner\n')

  // Check current authorization
  const currentlyAuthorized = await publicClient.readContract({
    address: SCORING_MODULE_ADDRESS,
    abi: SCORING_ABI,
    functionName: 'authorizedOracles',
    args: [ORACLE_WALLET],
  })

  if (currentlyAuthorized) {
    console.log('✅ Oracle is already authorized!')
    return
  }

  console.log('Authorizing oracle...')

  // Simulate transaction
  const { request } = await publicClient.simulateContract({
    address: SCORING_MODULE_ADDRESS,
    abi: SCORING_ABI,
    functionName: 'setAuthorizedOracle',
    args: [ORACLE_WALLET, true],
    account: ownerAccount,
  })

  // Execute transaction
  const txHash = await walletClient.writeContract(request)
  console.log(`Transaction hash: ${txHash}`)

  // Wait for confirmation
  console.log('Waiting for confirmation...')
  await publicClient.waitForTransactionReceipt({ hash: txHash })

  // Verify authorization
  const isNowAuthorized = await publicClient.readContract({
    address: SCORING_MODULE_ADDRESS,
    abi: SCORING_ABI,
    functionName: 'authorizedOracles',
    args: [ORACLE_WALLET],
  })

  if (isNowAuthorized) {
    console.log('\n✅ Oracle wallet successfully authorized!')
    console.log('You can now run: pnpm tsx scripts/oracle/deposit-viral-points.ts')
  } else {
    console.error('\n❌ Authorization failed - oracle still not authorized')
    process.exit(1)
  }
}

main().catch(error => {
  console.error('❌ Error:', error)
  process.exit(1)
})
