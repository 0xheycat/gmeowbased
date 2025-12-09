/**
 * Deposit Points to Guild Contract
 * 
 * The Guild contract needs points in its own storage to function.
 * This script helps the owner deposit points to a user's address in the Guild contract.
 */

import { createWalletClient, createPublicClient, http, parseAbiItem } from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

const GUILD_CONTRACT = '0x967457be45facE07c22c0374dAfBeF7b2f7cd059'
const YOUR_WALLET = '0x8a3094e44577579d6f41F6214a86C250b7dBDC4e'
const POINTS_TO_DEPOSIT = 100000000020n // Your current balance

// Owner private key (from env)
const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY

if (!OWNER_PRIVATE_KEY) {
  console.error('❌ OWNER_PRIVATE_KEY environment variable not set!')
  console.log('Usage: OWNER_PRIVATE_KEY=0x... npx tsx scripts/deposit-points-to-guild.ts')
  process.exit(1)
}

const GUILD_ABI = [
  parseAbiItem('function depositTo(address to, uint256 amount) external'),
  parseAbiItem('function pointsBalance(address) view returns (uint256)'),
]

async function main() {
  const account = privateKeyToAccount(OWNER_PRIVATE_KEY as `0x${string}`)
  
  const publicClient = createPublicClient({
    chain: base,
    transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'),
  })
  
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'),
  })

  console.log('🔧 Depositing points to Guild contract...\n')
  console.log(`Owner: ${account.address}`)
  console.log(`Target: ${YOUR_WALLET}`)
  console.log(`Amount: ${POINTS_TO_DEPOSIT}`)
  console.log(`Guild Contract: ${GUILD_CONTRACT}\n`)
  
  // Check current balance
  console.log('1️⃣ Checking current balance in Guild contract...')
  const currentBalance = await publicClient.readContract({
    address: GUILD_CONTRACT,
    abi: GUILD_ABI,
    functionName: 'pointsBalance',
    args: [YOUR_WALLET],
  })
  console.log(`   Current balance: ${currentBalance}\n`)
  
  if (currentBalance >= POINTS_TO_DEPOSIT) {
    console.log('✅ User already has sufficient points in Guild contract!')
    return
  }
  
  // Deposit points
  console.log('2️⃣ Depositing points...')
  try {
    const hash = await walletClient.writeContract({
      address: GUILD_CONTRACT,
      abi: GUILD_ABI,
      functionName: 'depositTo',
      args: [YOUR_WALLET, POINTS_TO_DEPOSIT],
    })
    
    console.log(`   Transaction hash: ${hash}`)
    console.log('   Waiting for confirmation...')
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`)
    
    // Check new balance
    console.log('\n3️⃣ Verifying new balance...')
    const newBalance = await publicClient.readContract({
      address: GUILD_CONTRACT,
      abi: GUILD_ABI,
      functionName: 'pointsBalance',
      args: [YOUR_WALLET],
    })
    console.log(`   New balance: ${newBalance}`)
    console.log('\n✅ Points deposited successfully!')
    console.log(`\n🎉 ${YOUR_WALLET} can now create guilds!`)
    
  } catch (error: any) {
    console.error('\n❌ Failed to deposit points!')
    console.error('Error:', error.message || error)
    
    if (error.message?.includes('onlyOwner')) {
      console.error('\n⚠️  Only the contract owner can call depositTo()')
      console.error('Make sure OWNER_PRIVATE_KEY is the owner\'s private key')
    }
  }
}

main().catch(console.error)
