/**
 * Contract Discovery Utilities
 * 
 * Dynamically fetch contract deployment blocks and badge addresses
 * from on-chain data instead of hardcoding them.
 * 
 * This ensures accuracy and makes updating easier when new contracts deploy.
 */

import { createPublicClient, http, type Address } from 'viem'
import { base, optimism, celo, arbitrum } from 'viem/chains'
import { unichain, ink } from '@/lib/custom-chains'
import type { GMChainKey } from '@/lib/gmeow-utils'

// Define custom chain type for type safety
const INK_CHAIN_ID = 57073
const UNICHAIN_CHAIN_ID = 1301

// Chain configuration map
const CHAIN_CONFIG = {
  base: {
    chain: base,
    rpcUrl: process.env.NEXT_PUBLIC_RPC_BASE || 'https://mainnet.base.org',
  },
  op: {
    chain: optimism,
    rpcUrl: process.env.NEXT_PUBLIC_RPC_OP || 'https://mainnet.optimism.io',
  },
  unichain: {
    chain: unichain,
    rpcUrl: process.env.NEXT_PUBLIC_RPC_UNICHAIN || 'https://mainnet.unichain.org',
  },
  celo: {
    chain: celo,
    rpcUrl: process.env.NEXT_PUBLIC_RPC_CELO || 'https://forno.celo.org',
  },
  ink: {
    chain: ink,
    rpcUrl: process.env.NEXT_PUBLIC_RPC_INK || 'https://rpc.inkonchain.com',
  },
  arbitrum: {
    chain: arbitrum,
    rpcUrl: process.env.NEXT_PUBLIC_RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
  },
} as const

// Contract addresses from environment (proxy-based architecture)
const CONTRACT_ADDRESSES = {
  base: {
    core: process.env.NEXT_PUBLIC_GM_BASE_CORE as Address,
    badge: process.env.NEXT_PUBLIC_BADGE_CONTRACT_BASE as Address,
  },
  op: {
    core: process.env.NEXT_PUBLIC_GM_OP_CORE as Address,
    badge: process.env.NEXT_PUBLIC_BADGE_CONTRACT_OP as Address,
  },
  unichain: {
    core: process.env.NEXT_PUBLIC_GM_UNICHAIN_CORE as Address,
    badge: process.env.NEXT_PUBLIC_BADGE_CONTRACT_UNICHAIN as Address,
  },
  celo: {
    core: process.env.NEXT_PUBLIC_GM_CELO_CORE as Address,
    badge: process.env.NEXT_PUBLIC_BADGE_CONTRACT_CELO as Address,
  },
  ink: {
    core: process.env.NEXT_PUBLIC_GM_INK_CORE as Address,
    badge: process.env.NEXT_PUBLIC_BADGE_CONTRACT_INK as Address,
  },
  arbitrum: {
    core: process.env.NEXT_PUBLIC_GM_ARBITRUM_CORE as Address,
    badge: process.env.NEXT_PUBLIC_BADGE_CONTRACT_ARBITRUM as Address,
  },
} as const

/**
 * Get the deployment block for a contract by finding its first transaction
 * 
 * This uses binary search on block ranges to efficiently find the deployment block.
 */
export async function getContractDeploymentBlock(
  chain: GMChainKey,
  contractAddress: Address
): Promise<number | null> {
  try {
    const config = CHAIN_CONFIG[chain]
    if (!config) {
      console.error(`[getContractDeploymentBlock] Unknown chain: ${chain}`)
      return null
    }

    const client = createPublicClient({
      chain: config.chain,
      transport: http(config.rpcUrl),
    })

    // Get contract bytecode to verify it exists
    const bytecode = await client.getBytecode({ address: contractAddress })
    if (!bytecode || bytecode === '0x') {
      console.error(`[getContractDeploymentBlock] No bytecode found for ${contractAddress} on ${chain}`)
      return null
    }

    // Get current block number
    const currentBlock = await client.getBlockNumber()

    // Binary search for deployment block
    // Start from a reasonable historical block (e.g., 6 months ago)
    const estimatedBlocksPerDay = chain === 'arbitrum' ? 28800 : 7200 // Arbitrum is faster
    const daysBack = 180 // 6 months
    const startBlock = currentBlock - BigInt(estimatedBlocksPerDay * daysBack)

    let left = Number(startBlock)
    let right = Number(currentBlock)
    let deploymentBlock: number | null = null

    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      
      try {
        const code = await client.getBytecode({ 
          address: contractAddress, 
          blockNumber: BigInt(mid) 
        })
        
        if (code && code !== '0x') {
          // Contract exists at this block, search earlier
          deploymentBlock = mid
          right = mid - 1
        } else {
          // Contract doesn't exist yet, search later
          left = mid + 1
        }
      } catch (error) {
        // If block doesn't exist or other error, adjust search
        left = mid + 1
      }
    }

    if (deploymentBlock) {
      console.log(`[getContractDeploymentBlock] Found deployment at block ${deploymentBlock} for ${contractAddress} on ${chain}`)
    }

    return deploymentBlock
  } catch (error) {
    console.error(`[getContractDeploymentBlock] Error for ${chain}:`, error)
    return null
  }
}

/**
 * Get badge contract address from Core contract (if Core has a getter)
 * Falls back to environment variable if on-chain lookup fails
 */
export async function getBadgeContractAddress(
  chain: GMChainKey
): Promise<Address | null> {
  try {
    // Try to get from Core contract first (if it has a badgeContract() getter)
    const config = CHAIN_CONFIG[chain]
    const addresses = CONTRACT_ADDRESSES[chain]
    
    if (!config || !addresses?.core) {
      console.error(`[getBadgeContractAddress] Missing config for ${chain}`)
      return null
    }

    const client = createPublicClient({
      chain: config.chain,
      transport: http(config.rpcUrl),
    })

    try {
      // Try to read badge contract from Core contract
      // This assumes Core has a public badgeContract() view function
      const badgeAddress = await client.readContract({
        address: addresses.core,
        abi: [
          {
            name: 'badgeContract',
            type: 'function',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ type: 'address' }],
          },
        ],
        functionName: 'badgeContract',
      }) as Address

      if (badgeAddress && badgeAddress !== '0x0000000000000000000000000000000000000000') {
        console.log(`[getBadgeContractAddress] Found badge contract ${badgeAddress} from Core on ${chain}`)
        return badgeAddress
      }
    } catch (readError) {
      // If Core doesn't have badgeContract() getter, fall back to env var
      console.log(`[getBadgeContractAddress] Core contract read failed, using env var for ${chain}`)
    }

    // Fallback to environment variable
    const envBadge = addresses.badge
    if (envBadge && envBadge !== '0x0000000000000000000000000000000000000000') {
      console.log(`[getBadgeContractAddress] Using env badge contract ${envBadge} for ${chain}`)
      return envBadge
    }

    return null
  } catch (error) {
    console.error(`[getBadgeContractAddress] Error for ${chain}:`, error)
    return null
  }
}

/**
 * Discover all contract information for a chain
 */
export async function discoverChainContracts(chain: GMChainKey) {
  const addresses = CONTRACT_ADDRESSES[chain]
  if (!addresses?.core) {
    return {
      chain,
      error: 'Missing core contract address',
    }
  }

  const [coreDeploymentBlock, badgeAddress] = await Promise.all([
    getContractDeploymentBlock(chain, addresses.core),
    getBadgeContractAddress(chain),
  ])

  let badgeDeploymentBlock: number | null = null
  if (badgeAddress && badgeAddress !== '0x0000000000000000000000000000000000000000') {
    badgeDeploymentBlock = await getContractDeploymentBlock(chain, badgeAddress)
  }

  return {
    chain,
    core: {
      address: addresses.core,
      deploymentBlock: coreDeploymentBlock,
    },
    badge: badgeAddress ? {
      address: badgeAddress,
      deploymentBlock: badgeDeploymentBlock,
    } : null,
  }
}

/**
 * Discover contracts for all chains
 */
export async function discoverAllContracts() {
  const chains: GMChainKey[] = ['base', 'op', 'unichain', 'celo', 'ink', 'arbitrum']
  
  const results = await Promise.all(
    chains.map(chain => discoverChainContracts(chain))
  )

  return results.reduce((acc, result) => {
    acc[result.chain] = result
    return acc
  }, {} as Record<GMChainKey, any>)
}

/**
 * Get start block with fallback to discovery
 * 
 * Priority:
 * 1. Environment variable (CHAIN_START_BLOCK_*)
 * 2. On-chain discovery (if env var is 0 or missing)
 * 3. Default fallback (current block - 6 months)
 */
export async function getStartBlockWithDiscovery(chain: GMChainKey): Promise<bigint> {
  // Try environment variable first
  const envKey = `CHAIN_START_BLOCK_${chain.toUpperCase()}`
  const envValue = process.env[envKey]
  
  if (envValue && envValue !== '0') {
    const parsed = BigInt(envValue)
    console.log(`[getStartBlockWithDiscovery] Using env var ${envKey}=${parsed} for ${chain}`)
    return parsed
  }

  // Try on-chain discovery
  console.log(`[getStartBlockWithDiscovery] Discovering deployment block for ${chain}...`)
  const addresses = CONTRACT_ADDRESSES[chain]
  if (addresses?.core) {
    const deploymentBlock = await getContractDeploymentBlock(chain, addresses.core)
    if (deploymentBlock) {
      console.log(`[getStartBlockWithDiscovery] Discovered block ${deploymentBlock} for ${chain}`)
      return BigInt(deploymentBlock)
    }
  }

  // Fallback: Use current block - 6 months
  console.warn(`[getStartBlockWithDiscovery] No deployment block found for ${chain}, using fallback`)
  const config = CHAIN_CONFIG[chain]
  const client = createPublicClient({
    chain: config.chain,
    transport: http(config.rpcUrl),
  })
  
  const currentBlock = await client.getBlockNumber()
  const estimatedBlocksPerDay = chain === 'arbitrum' ? 28800 : 7200
  const fallbackBlock = currentBlock - BigInt(estimatedBlocksPerDay * 180) // 6 months
  
  console.warn(`[getStartBlockWithDiscovery] Fallback to block ${fallbackBlock} for ${chain}`)
  return fallbackBlock
}
