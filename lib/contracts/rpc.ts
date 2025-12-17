/**
 * @file lib/contracts/rpc.ts
 * @description RPC URL configuration for blockchain network connections
 * 
 * PHASE: Phase 7.1 - Contracts (December 17, 2025)
 * 
 * FEATURES:
 *   - Centralized RPC URL management
 *   - Environment variable fallbacks
 *   - Chain validation
 *   - Base chain primary support
 * 
 * REFERENCE DOCUMENTATION:
 *   - Chain types: lib/contracts/gmeow-utils.ts (ChainKey type)
 *   - RPC providers: Alchemy, Infura, public RPCs
 * 
 * REQUIREMENTS:
 *   - Network: Base blockchain (8453) primary
 *   - Env: RPC_BASE, BASE_RPC, or NEXT_PUBLIC_RPC_BASE
 *   - Fallback to Alchemy public RPC if no env provided
 * 
 * TODO:
 *   - [ ] Add RPC health checking and automatic failover
 *   - [ ] Add support for multiple RPC providers per chain
 *   - [ ] Add RPC rate limiting and throttling
 *   - [ ] Add RPC response time monitoring
 *   - [ ] Add support for additional chains (Optimism, Arbitrum)
 *   - [ ] Add WebSocket RPC support for real-time events
 * 
 * CRITICAL:
 *   - Always check chain exists in CHAIN_IDS before returning URL
 *   - Provide fallback RPC to prevent service disruption
 *   - Use environment variables for paid RPC endpoints (security)
 *   - Base chain must always be supported (primary network)
 * 
 * SUGGESTIONS:
 *   - Add RPC load balancing across multiple providers
 *   - Add RPC caching layer for repeated calls
 *   - Add automatic RPC provider selection based on latency
 *   - Add RPC analytics (calls per provider, success rates)
 *   - Add custom RPC configuration per deployment environment
 * 
 * AVOID:
 *   - Hardcoding API keys in URLs (use environment variables)
 *   - Using single RPC without fallback (single point of failure)
 *   - Returning RPC for unsupported chains (validation required)
 *   - Exposing paid RPC URLs in client-side code
 */

import { CHAIN_IDS, type ChainKey } from './gmeow-utils'

export function getRpcUrl(chain: ChainKey): string {
  // Prefer env, fallback to public RPCs if any
  if (!(chain in CHAIN_IDS)) {
    throw new Error(`Unknown chain: ${chain}`)
  }
  if (chain === 'base') return process.env.RPC_BASE || process.env.BASE_RPC || process.env.NEXT_PUBLIC_RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/A6u4vxXFMPMk07zeChjbziq1Ch0Wcrjg'
  throw new Error(`Unsupported chain configuration: ${chain}`)
}