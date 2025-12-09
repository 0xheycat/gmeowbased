/**
 * Quick Fix: Deposit Points to Guild Contract (Owner Call)
 * 
 * Since both wallets have 0 points in Guild contract, 
 * the owner needs to deposit points there first.
 */

import { createWalletClient, createPublicClient, http, parseAbiItem } from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

const GUILD_CONTRACT = '0x967457be45facE07c22c0374dAfBeF7b2f7cd059'

// You can deposit to either address:
const ORACLE_ADDRESS = '0x8870C155666809609176260F2b65a626C000D773' // Has 1 trillion in Core
const USER_ADDRESS = '0x8a3094e44577579d6f41F6214a86C250b7dBDC4e' // Has 100 billion in Core

// Choose which one:
const TARGET = process.argv[2] || ORACLE_ADDRESS
const AMOUNT = BigInt(process.argv[3] || '1000000000000') // Default: 1 trillion (match oracle's Core balance)

// Owner private key
const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY

if (!OWNER_PRIVATE_KEY) {
  console.error('❌ OWNER_PRIVATE_KEY environment variable not set!')
  console.log('\nUsage:')
  console.log('  OWNER_PRIVATE_KEY=0x... npx tsx scripts/quick-deposit.ts [address] [amount]')
  console.log('\nExamples:')
  console.log(`  # Deposit to oracle (default):`)
  console.log(`  OWNER_PRIVATE_KEY=0x... npx tsx scripts/quick-deposit.ts`)
  console.log(`\n  # Deposit to user:`)
  console.log(`  OWNER_PRIVATE_KEY=0x... npx tsx scripts/quick-deposit.ts ${USER_ADDRESS} 100000000020`)
  process.exit(1)
}

const GUILD_ABI = [
  parseAbiItem('function depositTo(address to, uint256 amount) external'),
  parseAbiItem('function pointsBalance(address) view returns (uint256)'),
  parseAbiItem('function owner() view returns (address)'),
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

  console.log('💰 Quick Deposit to Guild Contract\n')
  console.log(`Owner wallet: ${account.address}`)
  console.log(`Target: ${TARGET}`)
  console.log(`Amount: ${AMOUNT}`)
  console.log(`Guild Contract: ${GUILD_CONTRACT}\n`)
  
  // Verify owner
  console.log('1️⃣ Verifying owner...')
  const owner = await publicClient.readContract({
    address: GUILD_CONTRACT,
    abi: GUILD_ABI,
    functionName: 'owner',
  })
  console.log(`   Contract owner: ${owner}`)
  
  if (owner.toLowerCase() !== account.address.toLowerCase()) {
    console.error(`\n❌ ERROR: You are not the owner!`)
    console.error(`   Your address: ${account.address}`)
    console.error(`   Owner address: ${owner}`)
    process.exit(1)
  }
  console.log('   ✅ You are the owner!\n')
  
  // Check current balance
  console.log('2️⃣ Checking current balance...')
  const currentBalance = await publicClient.readContract({
    address: GUILD_CONTRACT,
    abi: GUILD_ABI,
    functionName: 'pointsBalance',
    args: [TARGET as `0x${string}`],
  })
  console.log(`   Current: ${currentBalance}\n`)
  
  // Deposit
  console.log('3️⃣ Depositing points...')
  try {
    const hash = await walletClient.writeContract({
      address: GUILD_CONTRACT,
      abi: GUILD_ABI,
      functionName: 'depositTo',
      args: [TARGET as `0x${string}`, AMOUNT],
    })
    
    console.log(`   📤 Transaction: ${hash}`)
    console.log(`   🔗 Basescan: https://basescan.org/tx/${hash}`)
    console.log('   ⏳ Waiting for confirmation...')
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log(`   ✅ Confirmed in block ${receipt.blockNumber}\n`)
    
    // Check new balance
    console.log('4️⃣ Verifying new balance...')
    const newBalance = await publicClient.readContract({
      address: GUILD_CONTRACT,
      abi: GUILD_ABI,
      functionName: 'pointsBalance',
      args: [TARGET as `0x${string}`],
    })
    console.log(`   New balance: ${newBalance}`)
    console.log(`   Increase: +${newBalance - currentBalance}\n`)
    
    console.log('✅ SUCCESS! Points deposited!\n')
    console.log('🎉 Now you can create guilds with this address!')
    console.log(`\n   Address: ${TARGET}`)
    console.log(`   Points in Guild contract: ${newBalance}`)
    
  } catch (error: any) {
    console.error('\n❌ Transaction failed!')
    console.error('Error:', error.message || error)
    
    if (error.message?.includes('InsufficientReserve')) {
      console.error('\n⚠️  Guild contract has insufficient reserve!')
      console.error('   The contract needs points in its reserve to deposit to users')
    } else if (error.message?.includes('onlyOwner')) {
      console.error('\n⚠️  Only the contract owner can call depositTo()')
    }
    
    console.error('\n💡 Tip: The Guild contract needs its own point reserve!')
    console.error('   Consider transferring points to the Guild contract first.')
  }
}

main().catch(console.error)
