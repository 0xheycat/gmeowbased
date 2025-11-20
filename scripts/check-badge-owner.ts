#!/usr/bin/env tsx
/**
 * Check Badge Contract Ownership
 * Verifies who owns the badge contract and if oracle can mint
 */

import { createPublicClient, http, parseAbi } from 'viem'
import { base } from 'viem/chains'

const BADGE_CONTRACT = '0xF13d6f70Af6cf6C47Cd3aFb545d906309eebD1b9' as `0x${string}`
const RPC_URL = process.env.RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/A6u4vxXFMPMk07zeChjbziq1Ch0Wcrjg'
const ORACLE_WALLET = '0x8870C155666809609176260F2B65a626C000D773'

const abi = parseAbi([
  'function owner() view returns (address)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
])

async function main() {
  const client = createPublicClient({
    chain: base,
    transport: http(RPC_URL),
  })

  console.log('🔍 Checking Badge Contract Configuration\n')
  console.log('Contract Address:', BADGE_CONTRACT)
  console.log('Chain: Base Mainnet\n')

  try {
    const [owner, name, symbol] = await Promise.all([
      client.readContract({ address: BADGE_CONTRACT, abi, functionName: 'owner' }),
      client.readContract({ address: BADGE_CONTRACT, abi, functionName: 'name' }),
      client.readContract({ address: BADGE_CONTRACT, abi, functionName: 'symbol' }),
    ])

    console.log('📋 Contract Info:')
    console.log('  Name:', name)
    console.log('  Symbol:', symbol)
    console.log('  Owner:', owner)
    console.log('')
    console.log('🔑 Oracle Wallet:', ORACLE_WALLET)
    console.log('')
    
    console.log('📖 Contract Architecture:')
    console.log('  - SoulboundBadge.sol uses OpenZeppelin Ownable')
    console.log('  - mint() function has onlyOwner modifier')
    console.log('  - Only the owner address can mint badges')
    console.log('  - No AccessControl, no MINTER_ROLE')
    console.log('')
    
    if (owner.toLowerCase() === ORACLE_WALLET.toLowerCase()) {
      console.log('✅ SUCCESS: Oracle IS the owner!')
      console.log('   Minting will work correctly.')
    } else {
      console.log('❌ ISSUE: Oracle is NOT the owner')
      console.log(`   Current owner: ${owner}`)
      console.log(`   Oracle wallet: ${ORACLE_WALLET}`)
      console.log('')
      console.log('💡 Solutions:')
      console.log('   1. Transfer ownership to oracle:')
      console.log('      badgeContract.transferOwnership("' + ORACLE_WALLET + '")')
      console.log('')
      console.log('   2. OR: Check if owner is GmeowMultichain contract')
      console.log('      If yes, badge is minted through main contract, not directly')
    }
  } catch (error) {
    console.error('❌ Error checking contract:', error)
    throw error
  }
}

main().catch((error) => {
  console.error('Script failed:', error)
  process.exit(1)
})
