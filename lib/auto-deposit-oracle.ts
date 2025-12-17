/**
 * Auto-deposit oracle points when balance is low
 * Allows badge minting without manual owner deposits
 */

import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base, optimism, celo } from 'viem/chains'
import type { ChainKey } from './gmeow-utils'
import { getRpcUrl } from './rpc'

const CHAIN_CONFIG = {
  base: base,
  op: optimism,
  celo: celo,
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

const GM_CONTRACT_ADDRESSES: Partial<Record<ChainKey | 'ink', `0x${string}`>> = {
  base: (process.env.NEXT_PUBLIC_GM_BASE_ADDRESS as `0x${string}`) || '0x3ad420B8C2Be19ff8EBAdB484Ed839Ae9254bf2F',
  unichain: (process.env.NEXT_PUBLIC_GM_UNICHAIN_ADDRESS as `0x${string}`) || '0xD8b4190c87d86E28f6B583984cf0C89FCf9C2a0f',
  celo: (process.env.NEXT_PUBLIC_GM_CELO_ADDRESS as `0x${string}`) || '0xa68BfB4BB6F7D612182A3274E7C555B7b0b27a52',
  ink: (process.env.NEXT_PUBLIC_GM_INK_ADDRESS as `0x${string}`) || '0x6081a70c2F33329E49cD2aC673bF1ae838617d26',
  op: (process.env.NEXT_PUBLIC_GM_OP_ADDRESS as `0x${string}`) || '0xF670d5387DF68f258C4D5aEBE67924D85e3C6db6',
}

const ORACLE_WALLET = '0x8870C155666809609176260F2B65a626C000D773'
const DEPOSIT_AMOUNT = BigInt(100000) // Deposit 100k when low

/**
 * Check oracle balance and auto-deposit if below threshold
 * Requires OWNER_PRIVATE_KEY env var
 */
export async function ensureOracleBalance(chain: ChainKey, requiredPoints: bigint): Promise<void> {
  const ownerKey = process.env.OWNER_PRIVATE_KEY
  if (!ownerKey) {
    throw new Error('OWNER_PRIVATE_KEY not configured - cannot auto-deposit points')
  }

  const contractAddress = GM_CONTRACT_ADDRESSES[chain as keyof typeof GM_CONTRACT_ADDRESSES]
  const chainConfig = CHAIN_CONFIG[chain as keyof typeof CHAIN_CONFIG]
  
  if (!contractAddress) {
    throw new Error(`No contract address configured for chain: ${chain}`)
  }
  if (!chainConfig) {
    throw new Error(`No chain config for: ${chain}`)
  }
  
  const rpcUrl = getRpcUrl(chain)

  // Check current balance
  const publicClient = createPublicClient({
    chain: chainConfig,
    transport: http(rpcUrl),
  })

  const currentBalance = await publicClient.readContract({
    address: contractAddress,
    abi: [
      {
        name: 'pointsBalance',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
      },
    ],
    functionName: 'pointsBalance',
    args: [ORACLE_WALLET as `0x${string}`],
  }) as bigint

  console.log(`[Auto-Deposit] Oracle balance on ${chain}: ${currentBalance}`)

  // If balance is sufficient, return early
  if (currentBalance >= requiredPoints) {
    return
  }

  console.log(`[Auto-Deposit] Balance too low (${currentBalance} < ${requiredPoints}), depositing ${DEPOSIT_AMOUNT}...`)

  // Deposit points from owner to oracle
  const ownerAccount = privateKeyToAccount(ownerKey as `0x${string}`)
  
  const walletClient = createWalletClient({
    account: ownerAccount,
    chain: chainConfig,
    transport: http(rpcUrl),
  })

  const { request } = await publicClient.simulateContract({
    address: contractAddress,
    abi: [
      {
        name: 'depositTo',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        outputs: [],
      },
    ],
    functionName: 'depositTo',
    args: [ORACLE_WALLET as `0x${string}`, DEPOSIT_AMOUNT],
    account: ownerAccount,
  })

  const hash = await walletClient.writeContract(request)
  console.log(`[Auto-Deposit] Depositing ${DEPOSIT_AMOUNT} points: ${hash}`)

  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  
  if (receipt.status === 'success') {
    console.log(`[Auto-Deposit] ✓ Deposit confirmed on ${chain}`)
  } else {
    throw new Error(`Auto-deposit failed on ${chain}: ${hash}`)
  }
}
