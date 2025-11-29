/**
 * NFT Contract Mint Utilities - Phase 17
 * Handles NFT minting via viem + NFTModule contract
 * 
 * Architecture:
 * - GmeowMultichain contract includes NFTModule
 * - NFTModule.mintNFT() mints NFTs with type ID + metadata
 * - Supports paid mints (ETH payment) and allowlist gating
 * - Multi-chain support (Base, OP, Celo, Ink, Unichain)
 * 
 * Reused from:
 * - lib/contract-mint.ts (badge minting logic - 100% working)
 * - contract/modules/NFTModule.sol (NFT minting contract)
 */

import { createPublicClient, createWalletClient, http, parseAbi, decodeEventLog } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base, optimism, celo } from 'viem/chains'
import type { ChainKey } from '@/lib/gmeow-utils'
import { getRpcUrl } from '@/lib/rpc'

// Chain configurations (reused from contract-mint.ts)
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

// GmeowMultichain contract addresses per chain (includes NFTModule)
// Only chains we actively support for NFT minting
const GM_CONTRACT_ADDRESSES: Partial<Record<ChainKey, `0x${string}`>> = {
  base: (process.env.NEXT_PUBLIC_GM_BASE_ADDRESS as `0x${string}`) || '0x3ad420B8C2Be19ff8EBAdB484Ed839Ae9254bf2F',
  unichain: (process.env.NEXT_PUBLIC_GM_UNICHAIN_ADDRESS as `0x${string}`) || '0xD8b4190c87d86E28f6B583984cf0C89FCf9C2a0f',
  celo: (process.env.NEXT_PUBLIC_GM_CELO_ADDRESS as `0x${string}`) || '0xa68BfB4BB6F7D612182A3274E7C555B7b0b27a52',
  ink: (process.env.NEXT_PUBLIC_GM_INK_ADDRESS as `0x${string}`) || '0x6081a70c2F33329E49cD2aC673bF1ae838617d26',
  op: (process.env.NEXT_PUBLIC_GM_OP_ADDRESS as `0x${string}`) || '0xF670d5387DF68f258C4D5aEBE67924D85e3C6db6',
}

// NFTModule ABI - for NFT minting via mintNFT()
const NFT_MODULE_ABI = parseAbi([
  'function mintNFT(string calldata nftTypeId, string calldata reason) external payable returns (uint256)',
  'function hasMinedNFT(string calldata nftTypeId, address user) external view returns (bool)',
  'event NFTMinted(address indexed to, uint256 indexed tokenId, string nftTypeId, string metadataURI, string reason)',
])

/**
 * Get wallet account from environment private key
 * (Oracle wallet for automated minting)
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
  const supportedChains: Record<string, any> = CHAIN_CONFIG
  const config = supportedChains[chain]
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
 * NFT Mint Request
 */
export type NFTMintRequest = {
  nftTypeId: string        // NFT type identifier (e.g., 'mythic_user_badge')
  recipientAddress: string // User's wallet address
  chain: ChainKey          // Target blockchain
  reason: string           // Mint reason (e.g., 'quest_completion', 'guild_join')
  paymentWei?: string      // Optional payment amount in wei (for paid NFTs)
}

/**
 * Mint NFT on-chain via NFTModule.mintNFT()
 * 
 * Flow:
 * 1. Oracle wallet calls mintNFT(nftTypeId, reason) with optional payment
 * 2. Contract checks: not paused, supply available, not already minted, allowlist (if required)
 * 3. Contract mints NFT to user via GmeowNFT contract
 * 4. Emits NFTMinted event with tokenId + metadata URI
 * 
 * @param request - NFT mint request
 * @returns Transaction hash and token ID
 */
export async function mintNFTOnChain(request: NFTMintRequest): Promise<{
  txHash: string
  tokenId: number
}> {
  const { nftTypeId, recipientAddress, chain, reason, paymentWei } = request

  const account = getOracleAccount()
  const chainConfig = getChainConfig(chain)
  const gmContractAddress = getGMContractAddress(chain)
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

  try {
    // Check if user already minted this NFT type
    const alreadyMinted = await publicClient.readContract({
      address: gmContractAddress,
      abi: NFT_MODULE_ABI,
      functionName: 'hasMinedNFT',
      args: [nftTypeId, recipientAddress as `0x${string}`],
    }) as boolean

    if (alreadyMinted) {
      throw new Error(`User ${recipientAddress} already minted NFT type: ${nftTypeId}`)
    }

    // Prepare payment value (0 for free mints)
    const value = paymentWei ? BigInt(paymentWei) : BigInt(0)

    // Simulate the transaction first
    const { request: txRequest } = await publicClient.simulateContract({
      address: gmContractAddress,
      abi: NFT_MODULE_ABI,
      functionName: 'mintNFT',
      args: [nftTypeId, reason],
      account,
      value,
    })

    // Execute the mint
    const hash = await walletClient.writeContract(txRequest)

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      timeout: 120_000, // 2 minutes
    })

    if (receipt.status !== 'success') {
      throw new Error(`Transaction reverted: ${hash}`)
    }

    // Extract tokenId from NFTMinted event logs
    let tokenId = 0
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: NFT_MODULE_ABI,
          data: log.data,
          topics: log.topics,
        }) as { 
          eventName: string
          args: { 
            to?: `0x${string}`
            tokenId?: bigint
            nftTypeId?: string
            metadataURI?: string
            reason?: string
          } 
        }
        
        if (decoded.eventName === 'NFTMinted' && decoded.args.tokenId) {
          tokenId = Number(decoded.args.tokenId)
          console.log('[NFT Mint] Success:', {
            to: decoded.args.to,
            tokenId,
            nftTypeId: decoded.args.nftTypeId,
            metadataURI: decoded.args.metadataURI,
            reason: decoded.args.reason,
            txHash: hash,
          })
          break
        }
      } catch {
        // Log might not be from our contract
        continue
      }
    }

    if (tokenId === 0) {
      throw new Error('Failed to extract tokenId from transaction logs')
    }

    return {
      txHash: hash,
      tokenId,
    }
  } catch (error: any) {
    console.error('[NFT Mint] Error:', {
      nftTypeId,
      recipientAddress,
      chain,
      error: error.message,
    })
    throw new Error(`NFT mint failed: ${error.message}`)
  }
}

/**
 * Check if user has already minted a specific NFT type
 * @param nftTypeId - NFT type identifier
 * @param userAddress - User's wallet address
 * @param chain - Target blockchain
 * @returns True if user has minted this NFT type
 */
export async function hasUserMintedNFT(
  nftTypeId: string,
  userAddress: string,
  chain: ChainKey
): Promise<boolean> {
  try {
    const chainConfig = getChainConfig(chain)
    const gmContractAddress = getGMContractAddress(chain)
    const rpcUrl = getRpcUrl(chain)

    const publicClient = createPublicClient({
      chain: chainConfig,
      transport: http(rpcUrl),
    })

    const alreadyMinted = await publicClient.readContract({
      address: gmContractAddress,
      abi: NFT_MODULE_ABI,
      functionName: 'hasMinedNFT',
      args: [nftTypeId, userAddress as `0x${string}`],
    }) as boolean

    return alreadyMinted
  } catch (error: any) {
    console.error('[NFT Check] Error:', {
      nftTypeId,
      userAddress,
      chain,
      error: error.message,
    })
    return false // Default to false on error (allow mint attempt)
  }
}

/**
 * Batch mint NFTs to multiple recipients (owner only)
 * Note: This requires owner wallet, not oracle wallet
 * Use for airdrops, events, or bulk distribution
 */
export async function batchMintNFTs(
  recipients: string[],
  nftTypeId: string,
  chain: ChainKey,
  reason: string
): Promise<{
  txHash: string
  tokenIds: number[]
}> {
  // Implementation requires OWNER_PRIVATE_KEY
  // Similar to batchMintNFT in NFTModule.sol
  // Not implemented in this phase (manual airdrops only)
  throw new Error('Batch minting not implemented - use owner wallet directly')
}
