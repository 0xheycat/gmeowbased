#!/usr/bin/env tsx
/**
 * Deposit Points to Oracle Wallet
 * 
 * Deposits points from owner wallet to oracle wallet so oracle can mint badges.
 * Run this script with owner private key to fund the oracle.
 * 
 * Usage:
 *   OWNER_PRIVATE_KEY=0x... pnpm tsx scripts/deposit-oracle-points.ts <chain> <amount>
 * 
 * Example:
 *   OWNER_PRIVATE_KEY=0x123... pnpm tsx scripts/deposit-oracle-points.ts base 10000
 */

import { createPublicClient, createWalletClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base, optimism, celo } from 'viem/chains'

const CHAINS = {
  base,
  op: optimism,
  celo,
  unichain: {
    id: 130,
    name: 'Unichain',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://sepolia.unichain.org'] },
      public: { http: ['https://sepolia.unichain.org'] },
    },
  },
  ink: {
    id: 57073,
    name: 'Ink',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://rpc-gel-sepolia.inkonchain.com'] },
      public: { http: ['https://rpc-gel-sepolia.inkonchain.com'] },
    },
  },
} as const

const GM_CONTRACTS = {
  base: '0x3ad420B8C2Be19ff8EBAdB484Ed839Ae9254bf2F' as `0x${string}`,
  unichain: '0xD8b4190c87d86E28f6B583984cf0C89FCf9C2a0f' as `0x${string}`,
  celo: '0xa68BfB4BB6F7D612182A3274E7C555B7b0b27a52' as `0x${string}`,
  ink: '0x6081a70c2F33329E49cD2aC673bF1ae838617d26' as `0x${string}`,
  op: '0xF670d5387DF68f258C4D5aEBE67924D85e3C6db6' as `0x${string}`,
}

const ORACLE_WALLET = '0x8870C155666809609176260F2B65a626C000D773' as `0x${string}`

const ABI = parseAbi([
  'function depositTo(address to, uint256 amount) external',
  'function pointsBalance(address) view returns (uint256)',
  'function owner() view returns (address)',
])

async function main() {
  const args = process.argv.slice(2)
  
  if (args.length < 2) {
    console.error('Usage: OWNER_PRIVATE_KEY=0x... tsx scripts/deposit-oracle-points.ts <chain> <amount>')
    console.error('Chains: base, unichain, celo, ink, op')
    console.error('Example: tsx scripts/deposit-oracle-points.ts base 10000')
    process.exit(1)
  }

  const chainName = args[0].toLowerCase() as keyof typeof CHAINS
  const amount = args[1]
  
  if (!CHAINS[chainName]) {
    console.error(`Invalid chain: ${chainName}`)
    console.error('Valid chains: base, unichain, celo, ink, op')
    process.exit(1)
  }

  const ownerKey = process.env.OWNER_PRIVATE_KEY
  if (!ownerKey) {
    console.error('❌ OWNER_PRIVATE_KEY environment variable required')
    console.error('Set it to the private key of the GmeowMultichain owner wallet')
    process.exit(1)
  }

  const chain = CHAINS[chainName]
  const gmContract = GM_CONTRACTS[chainName]
  const ownerAccount = privateKeyToAccount(ownerKey as `0x${string}`)

  console.log(`\n🔍 Depositing points to oracle on ${chainName}`)
  console.log(`Contract: ${gmContract}`)
  console.log(`Owner: ${ownerAccount.address}`)
  console.log(`Oracle: ${ORACLE_WALLET}`)
  console.log(`Amount: ${amount} points\n`)

  const publicClient = createPublicClient({
    chain,
    transport: http(),
  })

  const walletClient = createWalletClient({
    account: ownerAccount,
    chain,
    transport: http(),
  })

  try {
    // Check if caller is owner
    const contractOwner = await publicClient.readContract({
      address: gmContract,
      abi: ABI,
      functionName: 'owner',
    }) as `0x${string}`

    if (contractOwner.toLowerCase() !== ownerAccount.address.toLowerCase()) {
      console.error(`❌ You are not the owner of this contract`)
      console.error(`   Contract owner: ${contractOwner}`)
      console.error(`   Your address: ${ownerAccount.address}`)
      process.exit(1)
    }

    // Check current oracle balance
    const currentBalance = await publicClient.readContract({
      address: gmContract,
      abi: ABI,
      functionName: 'pointsBalance',
      args: [ORACLE_WALLET],
    }) as bigint

    console.log(`📊 Current oracle balance: ${currentBalance} points`)

    // Simulate deposit
    const { request } = await publicClient.simulateContract({
      address: gmContract,
      abi: ABI,
      functionName: 'depositTo',
      args: [ORACLE_WALLET, BigInt(amount)],
      account: ownerAccount,
    })

    console.log(`✅ Simulation successful, executing transaction...`)

    // Execute deposit
    const hash = await walletClient.writeContract(request)
    console.log(`📤 Transaction submitted: ${hash}`)

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      timeout: 120_000,
    })

    if (receipt.status === 'success') {
      const newBalance = await publicClient.readContract({
        address: gmContract,
        abi: ABI,
        functionName: 'pointsBalance',
        args: [ORACLE_WALLET],
      }) as bigint

      console.log(`\n✅ SUCCESS!`)
      console.log(`   Transaction: ${hash}`)
      console.log(`   Block: ${receipt.blockNumber}`)
      console.log(`   Oracle balance: ${currentBalance} → ${newBalance} points`)
      console.log(`   Deposited: ${newBalance - currentBalance} points\n`)
    } else {
      console.error(`❌ Transaction failed: ${hash}`)
      process.exit(1)
    }
  } catch (error) {
    console.error(`❌ Error:`, error)
    throw error
  }
}

main().catch((error) => {
  console.error('Script failed:', error)
  process.exit(1)
})
