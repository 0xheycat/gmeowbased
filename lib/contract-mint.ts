/**
 * Contract mint utilities for badge minting
 * Handles blockchain minting via viem
 */

import { createPublicClient, createWalletClient, http, parseAbi, decodeEventLog } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base, optimism, celo } from 'viem/chains'
import type { ChainKey } from '@/lib/gm-utils'
import { getRpcUrl } from '@/lib/rpc'
import { getBadgeFromRegistry, type MintQueueEntry } from '@/lib/badges'

// Chain configurations
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

// Badge contract addresses per chain
const BADGE_CONTRACT_ADDRESSES: Record<ChainKey, `0x${string}`> = {
  base: (process.env.BADGE_CONTRACT_BASE as `0x${string}`) || '0x0000000000000000000000000000000000000000',
  unichain: (process.env.BADGE_CONTRACT_UNICHAIN as `0x${string}`) || '0x0000000000000000000000000000000000000000',
  celo: (process.env.BADGE_CONTRACT_CELO as `0x${string}`) || '0x0000000000000000000000000000000000000000',
  ink: (process.env.BADGE_CONTRACT_INK as `0x${string}`) || '0x0000000000000000000000000000000000000000',
  op: (process.env.BADGE_CONTRACT_OP as `0x${string}`) || '0x0000000000000000000000000000000000000000',
}

// SoulboundBadge ABI - minimal for minting
const BADGE_ABI = parseAbi([
  'function mint(address to, string calldata kind) external returns (uint256)',
  'event BadgeMinted(address indexed to, uint256 indexed tokenId, string badgeType)',
])

/**
 * Get wallet account from environment private key
 */
function getOracleAccount() {
  const privateKey = process.env.ORACLE_PRIVATE_KEY
  if (!privateKey) {
    throw new Error('ORACLE_PRIVATE_KEY not configured')
  }
  
  const normalized = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`
  return privateKeyToAccount(normalized as `0x${string}`)
}

/**
 * Get chain configuration
 */
function getChainConfig(chain: ChainKey) {
  const config = CHAIN_CONFIG[chain]
  if (!config) {
    throw new Error(`Unsupported chain: ${chain}`)
  }
  return config
}

/**
 * Get badge contract address for chain
 */
function getBadgeContractAddress(chain: ChainKey): `0x${string}` {
  const address = BADGE_CONTRACT_ADDRESSES[chain]
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    throw new Error(`Badge contract not configured for chain: ${chain}`)
  }
  return address
}

/**
 * Mint badge on-chain
 */
export async function mintBadgeOnChain(mint: MintQueueEntry): Promise<{
  txHash: string
  tokenId: number
}> {
  // Determine chain from badge registry
  const badgeDefinition = getBadgeFromRegistry(mint.badgeType)
  const chain: ChainKey = (badgeDefinition?.chain as ChainKey) || 'base' // Fallback to base if not found
  
  const account = getOracleAccount()
  const chainConfig = getChainConfig(chain)
  const contractAddress = getBadgeContractAddress(chain)
  const rpcUrl = getRpcUrl(chain)

  // Create clients
  const publicClient = createPublicClient({
    chain: chainConfig,
    transport: http(rpcUrl),
  })

  const walletClient = createWalletClient({
    account,
    chain: chainConfig,
    transport: http(rpcUrl),
  })

  // Validate wallet address
  const to = mint.walletAddress as `0x${string}`
  if (!to || !to.startsWith('0x')) {
    throw new Error(`Invalid wallet address: ${mint.walletAddress}`)
  }

  console.log(`[Mint] Starting mint for FID ${mint.fid}, badge ${mint.badgeType} on ${chain}`)
  console.log(`[Mint] To: ${to}`)
  console.log(`[Mint] Contract: ${contractAddress}`)

  try {
    // Simulate the transaction first
    const { request } = await publicClient.simulateContract({
      address: contractAddress,
      abi: BADGE_ABI,
      functionName: 'mint',
      args: [to, mint.badgeType],
      account,
    })

    // Execute the mint
    const hash = await walletClient.writeContract(request)
    console.log(`[Mint] Transaction submitted: ${hash}`)

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      timeout: 120_000, // 2 minutes
    })

    if (receipt.status !== 'success') {
      throw new Error(`Transaction reverted: ${hash}`)
    }

    console.log(`[Mint] Transaction confirmed in block ${receipt.blockNumber}`)

    // Extract tokenId from logs
    let tokenId = 0
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: BADGE_ABI,
          data: log.data,
          topics: log.topics,
        }) as { eventName: string; args: { tokenId?: bigint; to?: `0x${string}`; badgeType?: string } }
        
        if (decoded.eventName === 'BadgeMinted') {
          if (decoded.args.tokenId) {
            tokenId = Number(decoded.args.tokenId)
            console.log(`[Mint] Token ID: ${tokenId}`)
            break
          }
        }
      } catch {
        // Log might not be from our contract
        continue
      }
    }

    if (tokenId === 0) {
      console.warn(`[Mint] Could not extract tokenId from transaction ${hash}`)
    }

    return {
      txHash: hash,
      tokenId,
    }
  } catch (error) {
    console.error(`[Mint] Failed to mint badge:`, error)
    throw error
  }
}

/**
 * Batch mint badges (for future use)
 */
export async function batchMintBadges(mints: MintQueueEntry[]): Promise<Array<{
  queueId: string
  success: boolean
  txHash?: string
  tokenId?: number
  error?: string
}>> {
  const results = []

  for (const mint of mints) {
    try {
      const { txHash, tokenId } = await mintBadgeOnChain(mint)
      results.push({
        queueId: mint.id,
        success: true,
        txHash,
        tokenId,
      })
    } catch (error) {
      results.push({
        queueId: mint.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return results
}
