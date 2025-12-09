/**
 * DEPLOYMENT SCRIPT: Professional Solidity Master Fix
 * 
 * This script helps you deploy the fixed contracts with proper authorization
 * Run this AFTER deploying contracts manually in Remix
 */

import { createPublicClient, createWalletClient, http, parseAbi } from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

// ============ CONFIGURATION ============

// Get from environment or hardcode (NEVER commit private keys!)
const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY as `0x${string}`
const ORACLE_ADDRESS = '0x8870C155666809609176260F2b65a626C000D773' // Your oracle

// Contract addresses (UPDATE THESE after deployment!)
const ADDRESSES = {
  core: '0x_NEW_CORE_ADDRESS_HERE' as `0x${string}`,
  guild: '0x_NEW_GUILD_ADDRESS_HERE' as `0x${string}`,
  nft: '0x_NEW_NFT_ADDRESS_HERE' as `0x${string}`,
  // referral: '0x_NEW_REFERRAL_ADDRESS_HERE' as `0x${string}`, // if exists
}

// User addresses to give points
const TEST_USERS = [
  { address: '0x8870C155666809609176260F2b65a626C000D773', amount: 1000000000000n }, // Oracle: 1T
  { address: '0x8a3094e44577579d6f41F6214a86C250b7dBDC4e', amount: 100000000000n },  // User: 100B
]

// ============ SETUP ============

const account = privateKeyToAccount(OWNER_PRIVATE_KEY)

const publicClient = createPublicClient({
  chain: base,
  transport: http()
})

const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http()
})

// ============ ABIS ============

const CORE_ABI = parseAbi([
  'function authorizeContract(address contractAddr, bool status) external',
  'function depositTo(address to, uint256 amount) external',
  'function pointsBalance(address user) external view returns (uint256)',
  'function owner() external view returns (address)',
])

const GUILD_ABI = parseAbi([
  'function coreContract() external view returns (address)',
  'function owner() external view returns (address)',
])

// ============ DEPLOYMENT STEPS ============

async function main() {
  console.log('🚀 Starting Professional Solidity Master Fix Deployment')
  console.log('================================================\n')
  console.log(`Deploying from: ${account.address}\n`)

  // Step 1: Verify you're the owner
  console.log('Step 1: Verifying ownership...')
  const coreOwner = await publicClient.readContract({
    address: ADDRESSES.core,
    abi: CORE_ABI,
    functionName: 'owner',
  })
  
  if (coreOwner.toLowerCase() !== account.address.toLowerCase()) {
    throw new Error(`❌ You are not the owner! Owner is: ${coreOwner}`)
  }
  console.log('✅ Ownership verified!\n')

  // Step 2: Verify Guild contract is pointing to Core
  console.log('Step 2: Verifying Guild → Core reference...')
  const guildCore = await publicClient.readContract({
    address: ADDRESSES.guild,
    abi: GUILD_ABI,
    functionName: 'coreContract',
  })
  
  if (guildCore.toLowerCase() !== ADDRESSES.core.toLowerCase()) {
    throw new Error(`❌ Guild not pointing to Core! Points to: ${guildCore}`)
  }
  console.log('✅ Guild → Core reference correct!\n')

  // Step 3: Authorize Guild contract
  console.log('Step 3: Authorizing Guild contract...')
  const authGuildHash = await walletClient.writeContract({
    address: ADDRESSES.core,
    abi: CORE_ABI,
    functionName: 'authorizeContract',
    args: [ADDRESSES.guild, true],
  })
  await publicClient.waitForTransactionReceipt({ hash: authGuildHash })
  console.log(`✅ Guild authorized! Tx: ${authGuildHash}\n`)

  // Step 4: Authorize NFT contract (if exists)
  if (ADDRESSES.nft && ADDRESSES.nft !== '0x_NEW_NFT_ADDRESS_HERE') {
    console.log('Step 4: Authorizing NFT contract...')
    const authNftHash = await walletClient.writeContract({
      address: ADDRESSES.core,
      abi: CORE_ABI,
      functionName: 'authorizeContract',
      args: [ADDRESSES.nft, true],
    })
    await publicClient.waitForTransactionReceipt({ hash: authNftHash })
    console.log(`✅ NFT authorized! Tx: ${authNftHash}\n`)
  }

  // Step 5: Deposit points to test users
  console.log('Step 5: Depositing points to test users...')
  for (const user of TEST_USERS) {
    console.log(`Depositing ${user.amount} points to ${user.address}...`)
    const depositHash = await walletClient.writeContract({
      address: ADDRESSES.core,
      abi: CORE_ABI,
      functionName: 'depositTo',
      args: [user.address as `0x${string}`, user.amount],
    })
    await publicClient.waitForTransactionReceipt({ hash: depositHash })
    
    // Verify balance
    const balance = await publicClient.readContract({
      address: ADDRESSES.core,
      abi: CORE_ABI,
      functionName: 'pointsBalance',
      args: [user.address as `0x${string}`],
    })
    console.log(`✅ Balance confirmed: ${balance} points\n`)
  }

  // Step 6: Final verification
  console.log('Step 6: Final verification...')
  console.log('Testing oracle balance in Core contract...')
  const oracleBalance = await publicClient.readContract({
    address: ADDRESSES.core,
    abi: CORE_ABI,
    functionName: 'pointsBalance',
    args: [ORACLE_ADDRESS],
  })
  console.log(`Oracle balance: ${oracleBalance} points`)
  
  if (oracleBalance < 1000000000n) {
    console.warn('⚠️  Oracle has less than 1B points!')
  }

  console.log('\n================================================')
  console.log('🎉 DEPLOYMENT COMPLETE!')
  console.log('================================================\n')
  console.log('Next steps:')
  console.log('1. Update lib/gmeow-utils.ts with new addresses:')
  console.log(`   core: '${ADDRESSES.core}'`)
  console.log(`   guild: '${ADDRESSES.guild}'`)
  console.log(`   nft: '${ADDRESSES.nft}'`)
  console.log('\n2. Test guild creation:')
  console.log('   npx tsx scripts/test-guild-creation-fixed.ts')
  console.log('\n3. Verify contracts on Basescan')
  console.log('   https://basescan.org/address/' + ADDRESSES.core)
  console.log('   https://basescan.org/address/' + ADDRESSES.guild)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error)
    process.exit(1)
  })
