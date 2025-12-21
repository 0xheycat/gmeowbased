/**
 * @file lib/contracts/rpc-client-pool.ts
 * @description Centralized RPC client pool for blockchain connections (Phase 8.2)
 * 
 * CONSOLIDATION: Phase 8.2 - RPC Client Consolidation (December 18, 2025)
 * 
 * PROBLEM SOLVED:
 *   - 15+ files created inline RPC clients with createPublicClient()
 *   - No shared connection pool (new HTTP transport per call)
 *   - Rate limit issues (hitting Alchemy/Infura limits faster)
 *   - Performance degradation (cold starts create 15+ transports)
 * 
 * SOLUTION:
 *   - Single centralized RPC client factory
 *   - Connection pooling (reuse clients by chainId)
 *   - Automatic cleanup and reset capabilities
 *   - Type-safe with viem PublicClient
 * 
 * USAGE:
 *   ```typescript
 *   import { getPublicClient } from '@/lib/contracts/rpc-client-pool'
 *   
 *   // Get client for Base (default)
 *   const client = getPublicClient()
 *   
 *   // Get client for specific chain
 *   const baseClient = getPublicClient(8453)
 *   
 *   // Read contract
 *   const balance = await client.readContract({
 *     address: '0x...',
 *     abi: MY_ABI,
 *     functionName: 'balanceOf',
 *     args: [userAddress]
 *   })
 *   ```
 * 
 * BENEFITS:
 *   - Shared connection pool (better performance)
 *   - Reduced memory footprint (reuse transports)
 *   - Better rate limit management (fewer connections)
 *   - Single point of RPC configuration
 *   - Easy to add monitoring/metrics
 * 
 * MIGRATION FROM INLINE:
 *   ```typescript
 *   // ❌ OLD (inline client creation)
 *   const rpc = getRpcUrl('base')
 *   const client = createPublicClient({ transport: http(rpc) })
 *   
 *   // ✅ NEW (use pool)
 *   import { getPublicClient } from '@/lib/contracts/rpc-client-pool'
 *   const client = getPublicClient(8453)
 *   ```
 * 
 * RELATED:
 *   - lib/contracts/rpc.ts - RPC URL configuration
 *   - lib/contracts/gmeow-utils.ts - Chain utilities
 *   - lib/integrations/wagmi.ts - Wallet-connected clients (different use case)
 */

import { createPublicClient, http, type PublicClient } from 'viem'
import { base, optimism, arbitrum, polygon, mainnet } from 'viem/chains'
import { CHAIN_IDS, type ChainKey } from './gmeow-utils'

/**
 * Get RPC URL for a specific chain
 * 
 * @param chain - Chain key (e.g., 'base', 'optimism')
 * @returns RPC URL string
 * @throws Error if chain is unknown or unsupported
 * 
 * @example
 * ```typescript
 * const rpcUrl = getRpcUrl('base')
 * // Returns: process.env.RPC_BASE or fallback public RPC
 * ```
 */
export function getRpcUrl(chain: ChainKey): string {
  // Prefer env, fallback to public RPCs if any
  if (!(chain in CHAIN_IDS)) {
    throw new Error(`Unknown chain: ${chain}`)
  }
  if (chain === 'base') {
    return (
      process.env.RPC_BASE ||
      process.env.BASE_RPC ||
      process.env.NEXT_PUBLIC_RPC_BASE ||
      process.env.RPC_BASE_HTTP) ?? 'https://mainnet.base.org'
  }
  throw new Error(`Unsupported chain configuration: ${chain}`)
}

/**
 * RPC client cache - Maps chainId to PublicClient instance
 * Keeps clients in memory for reuse across requests
 */
type RPCClientCache = Map<number, PublicClient>
const clientPool: RPCClientCache = new Map()

/**
 * Chain ID to viem chain mapping
 * Used for proper chain configuration in viem clients
 */
const CHAIN_MAP: Record<number, any> = {
  8453: base,       // Base
  10: optimism,     // Optimism
  42161: arbitrum,  // Arbitrum One
  137: polygon,     // Polygon
  1: mainnet,       // Ethereum
}

/**
 * Get or create a pooled PublicClient for blockchain RPC calls
 * 
 * Clients are cached by chainId and reused across requests.
 * This prevents creating new HTTP transports for every call.
 * 
 * @param chainId - Blockchain chain ID (default: 8453 for Base)
 * @returns PublicClient instance for the specified chain
 * @throws Error if chain is not supported
 * 
 * @example
 * ```typescript
 * // Get Base client (default)
 * const client = getPublicClient()
 * 
 * // Get specific chain client
 * const opClient = getPublicClient(10) // Optimism
 * ```
 */
export function getPublicClient(chainId: number = base.id): PublicClient {
  // Check cache first
  const cached = clientPool.get(chainId)
  if (cached) return cached

  // Validate chain is supported
  const chain = CHAIN_MAP[chainId]
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}. Supported: ${Object.keys(CHAIN_MAP).join(', ')}`)
  }

  // Get RPC URL from environment/config
  let rpcUrl: string
  try {
    // Try to map chainId to ChainKey for getRpcUrl
    const chainKeyEntry = Object.entries(CHAIN_IDS as Record<string, number>).find(([, id]) => id === chainId)
    const chainKey = chainKeyEntry?.[0] as ChainKey | undefined
    if (chainKey) {
      rpcUrl = getRpcUrl(chainKey)
    } else {
      // Fallback for chains not in ChainKey
      rpcUrl = process.env[`RPC_${chainId}`] || chain.rpcUrls.default.http[0]
    }
  } catch {
    // Use viem's default RPC as last resort
    rpcUrl = chain.rpcUrls.default.http[0]
  }

  // Create new client
  const client = createPublicClient({
    chain,
    transport: http(rpcUrl, {
      timeout: 30_000, // 30 second timeout
      retryCount: 3,   // Retry failed requests 3 times
      retryDelay: 1000, // 1 second between retries
    }),
  }) as PublicClient

  // Cache for reuse
  clientPool.set(chainId, client)
  return client
}

/**
 * Get a PublicClient by ChainKey (string name like 'base', 'optimism')
 * 
 * Convenience wrapper around getPublicClient for ChainKey-based access.
 * 
 * @param chainKey - Chain name (e.g., 'base', 'optimism', 'arbitrum')
 * @returns PublicClient instance for the specified chain
 * @throws Error if chain key is not recognized
 * 
 * @example
 * ```typescript
 * const client = getClientByChainKey('base')
 * const opClient = getClientByChainKey('optimism')
 * ```
 */
export function getClientByChainKey(chainKey: ChainKey): PublicClient {
  const chainId = (CHAIN_IDS as Record<string, number>)[chainKey]
  if (!chainId) {
    throw new Error(`Unknown chain key: ${chainKey}`)
  }
  return getPublicClient(chainId)
}

/**
 * Clear all cached RPC clients
 * 
 * Useful for testing or when RPC configuration changes.
 * Clients will be recreated on next getPublicClient call.
 * 
 * @example
 * ```typescript
 * // Change RPC configuration
 * process.env.RPC_BASE = 'https://new-rpc.example.com'
 * 
 * // Clear cache to use new RPC
 * resetClientPool()
 * 
 * // Next call will use new RPC
 * const client = getPublicClient()
 * ```
 */
export function resetClientPool(): void {
  clientPool.clear()
}

/**
 * Get statistics about the client pool
 * 
 * Useful for monitoring and debugging.
 * 
 * @returns Object with pool statistics
 * 
 * @example
 * ```typescript
 * const stats = getClientPoolStats()
 * console.log(`Cached clients: ${stats.size}`)
 * console.log(`Chains: ${stats.chains.join(', ')}`)
 * ```
 */
export function getClientPoolStats() {
  return {
    size: clientPool.size,
    chains: Array.from(clientPool.keys()),
    maxSize: Object.keys(CHAIN_MAP).length,
  }
}
