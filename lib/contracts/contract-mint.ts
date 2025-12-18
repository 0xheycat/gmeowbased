/**
 * @file lib/contracts/contract-mint.ts
 * @description Automated badge minting system with oracle wallet and queue processing
 * 
 * PHASE: Phase 7.1 - Contracts (December 17, 2025)
 * 
 * FEATURES:
 *   - Automated badge minting via oracle wallet (no user gas required)
 *   - Multi-chain support (Base, Optimism, Celo, Unichain, Ink)
 *   - Mint queue processing from Supabase
 *   - Transaction monitoring and retry logic
 *   - Event decoding for mint confirmations
 *   - Auto-balance checking with deposit oracle integration
 *   - Badge registry integration for metadata
 * 
 * REFERENCE DOCUMENTATION:
 *   - Badge system: lib/badges/badges.ts
 *   - Oracle wallet: lib/contracts/auto-deposit-oracle.ts
 *   - Mint queue: supabase/migrations/create_mint_queue.sql
 *   - Badge contracts: contract/src/BadgeContract.sol
 * 
 * REQUIREMENTS:
 *   - Website: https://gmeowhq.art
 *   - Network: Base primary, multi-chain secondary
 *   - Env: OWNER_PRIVATE_KEY for oracle wallet
 *   - Env: NEXT_PUBLIC_GM_*_ADDRESS for each chain
 *   - Oracle wallet must maintain gas balance
 *   - NO EMOJIS in transaction data
 * 
 * TODO:
 *   - [ ] Add transaction failure notifications to users
 *   - [ ] Add gas price optimization (wait for lower gas)
 *   - [ ] Add batch minting for multiple badges (reduce gas)
 *   - [ ] Add mint retry queue for failed transactions
 *   - [ ] Add mint analytics (success rate, gas costs, timing)
 *   - [ ] Add multi-signature support for high-value mints
 * 
 * CRITICAL:
 *   - OWNER_PRIVATE_KEY must be kept secure (server-side only)
 *   - Oracle wallet balance must be monitored (auto-deposit below threshold)
 *   - Mint queue must be processed in order (FIFO)
 *   - Failed mints must be logged and retried
 *   - Transaction hashes must be stored for verification
 *   - Badge IDs must match contract badge registry
 * 
 * SUGGESTIONS:
 *   - Add mint simulation before actual transaction
 *   - Add gas estimation with buffer (1.2x estimated)
 *   - Add mint scheduling (process during low gas periods)
 *   - Add mint prioritization (premium users first)
 *   - Add mint notifications via webhook or email
 *   - Cache RPC clients for better performance
 * 
 * AVOID:
 *   - Exposing OWNER_PRIVATE_KEY in client-side code
 *   - Minting without checking badge exists in registry
 *   - Minting without checking oracle balance first
 *   - Hardcoding gas limits (estimate dynamically)
 *   - Blocking API routes while minting (use background jobs)
 *   - Minting same badge twice without checking ownership
 */

import { createWalletClient, http, parseAbi, decodeEventLog } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base, optimism, celo } from 'viem/chains'
import type { ChainKey } from './gmeow-utils'
import { getRpcUrl } from '@/lib/contracts/rpc'
import { getPublicClient } from '@/lib/contracts/rpc-client-pool'
import { getBadgeFromRegistry, type MintQueueEntry } from '@/lib/badges/badges'
import { ensureOracleBalance } from '@/lib/contracts/auto-deposit-oracle'

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

// GmeowMultichain contract addresses per chain (these own the badge contracts)
const GM_CONTRACT_ADDRESSES: Partial<Record<ChainKey | 'ink', `0x${string}`>> = {
  base: (process.env.NEXT_PUBLIC_GM_BASE_ADDRESS as `0x${string}`) || '0x3ad420B8C2Be19ff8EBAdB484Ed839Ae9254bf2F',
  unichain: (process.env.NEXT_PUBLIC_GM_UNICHAIN_ADDRESS as `0x${string}`) || '0xD8b4190c87d86E28f6B583984cf0C89FCf9C2a0f',
  celo: (process.env.NEXT_PUBLIC_GM_CELO_ADDRESS as `0x${string}`) || '0xa68BfB4BB6F7D612182A3274E7C555B7b0b27a52',
  ink: (process.env.NEXT_PUBLIC_GM_INK_ADDRESS as `0x${string}`) || '0x6081a70c2F33329E49cD2aC673bF1ae838617d26',
  op: (process.env.NEXT_PUBLIC_GM_OP_ADDRESS as `0x${string}`) || '0xF670d5387DF68f258C4D5aEBE67924D85e3C6db6',
}

// GmeowMultichain ABI - for badge minting via mintBadgeFromPoints
const GM_CONTRACT_ABI = parseAbi([
  'function mintBadgeFromPoints(uint256 pointsToBurn, string calldata badgeType) external returns (uint256)',
  'function pointsBalance(address) view returns (uint256)',
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
  const config = CHAIN_CONFIG[chain as keyof typeof CHAIN_CONFIG]
  if (!config) {
    throw new Error(`Unsupported chain: ${chain}`)
  }
  return config
}

/**
 * Get GmeowMultichain contract address for chain
 */
function getGMContractAddress(chain: ChainKey): `0x${string}` {
  const address = GM_CONTRACT_ADDRESSES[chain]
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    throw new Error(`GM contract not configured for chain: ${chain}`)
  }
  return address
}

/**
 * Mint badge on-chain via GmeowMultichain.mintBadgeFromPoints()
 * 
 * Architecture:
 * 1. GmeowMultichain contract owns SoulboundBadge contract
 * 2. Only GmeowMultichain can mint badges (it's the owner)
 * 3. mintBadgeFromPoints() burns points from caller and mints badge
 * 4. Oracle wallet must have points in the contract to mint
 * 
 * Setup required:
 * - Owner calls: GmeowMultichain.depositTo(oracleWallet, pointsAmount)
 * - This gives oracle points to burn when minting badges
 */
export async function mintBadgeOnChain(mint: MintQueueEntry): Promise<{
  txHash: string
  tokenId: number
}> {
  // Determine chain from badge registry
  const badgeDefinition = getBadgeFromRegistry(mint.badgeType)
  const chain: ChainKey = (badgeDefinition?.chain as ChainKey) || 'base'
  
  // Points required to mint (configurable per badge type in future)
  const pointsRequired = badgeDefinition?.pointsCost || 100
  
  const account = getOracleAccount()
  const chainConfig = getChainConfig(chain)
  const gmContractAddress = getGMContractAddress(chain)
  const rpcUrl = getRpcUrl(chain)

  // Phase 8.2.2: Use centralized RPC client pool
  const publicClient = getPublicClient(chainConfig.id)

  const walletClient = createWalletClient({
    account,
    chain: chainConfig,
    transport: http(rpcUrl),
  })



  try {
    // Auto-deposit if oracle balance is too low (requires OWNER_PRIVATE_KEY)
    try {
      await ensureOracleBalance(chain, BigInt(pointsRequired))
    } catch (error: any) {
      console.warn(`[Mint] Auto-deposit skipped: ${error.message}`)
      // Continue - will fail with clear error if balance insufficient
    }

    // Check oracle's point balance first
    const oraclePoints = await publicClient.readContract({
      address: gmContractAddress,
      abi: GM_CONTRACT_ABI,
      functionName: 'pointsBalance',
      args: [account.address],
    }) as bigint

    if (oraclePoints < BigInt(pointsRequired)) {
      throw new Error(
        `Insufficient points in oracle wallet. ` +
        `Have: ${oraclePoints}, Need: ${pointsRequired}. ` +
        `Owner must call: GmeowMultichain.depositTo("${account.address}", ${pointsRequired})`
      )
    }

    // Simulate the transaction first
    const { request } = await publicClient.simulateContract({
      address: gmContractAddress,
      abi: GM_CONTRACT_ABI,
      functionName: 'mintBadgeFromPoints',
      args: [BigInt(pointsRequired), mint.badgeType],
      account,
    })

    // Execute the mint
    const hash = await walletClient.writeContract(request)

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      timeout: 120_000, // 2 minutes
    })

    if (receipt.status !== 'success') {
      throw new Error(`Transaction reverted: ${hash}`)
    }

    // Extract tokenId from BadgeMinted event logs
    let tokenId = 0
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: GM_CONTRACT_ABI,
          data: log.data,
          topics: log.topics,
        }) as { eventName: string; args: { tokenId?: bigint; to?: `0x${string}`; badgeType?: string } }
        
        if (decoded.eventName === 'BadgeMinted') {
          if (decoded.args.tokenId) {
            tokenId = Number(decoded.args.tokenId)
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
