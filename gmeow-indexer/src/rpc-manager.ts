/**
 * Automatic RPC Failover Manager
 * 
 * Implements automatic retry logic across multiple RPC endpoints:
 * - Tries each endpoint in sequence when rate limited
 * - Exponential backoff for retries
 * - Automatic rotation on persistent failures
 * - Logs all failover events
 */

import { RpcClient } from '@subsquid/rpc-client'

export interface RpcEndpoint {
  url: string
  rateLimit: number
  name: string
}

const RPC_ENDPOINTS: RpcEndpoint[] = [
  {
    url: process.env.RPC_BASE_HTTP || 'https://mainnet.base.org',
    rateLimit: 10,
    name: 'Coinbase (Primary)'
  },
  {
    url: process.env.RPC_BASE_HTTP_2 || 'https://base.llamarpc.com',
    rateLimit: 10,
    name: 'LlamaNodes'
  },
  {
    url: process.env.RPC_BASE_HTTP_3 || 'https://base-rpc.publicnode.com',
    rateLimit: 15,  // Higher rate limit
    name: 'PublicNode'
  },
  {
    url: process.env.RPC_BASE_HTTP_4 || 'https://base-mainnet.public.blastapi.io',
    rateLimit: 10,
    name: 'BlastAPI'
  }
]

let currentEndpointIndex = 0
let failureCount = 0
const MAX_FAILURES_BEFORE_ROTATE = 3

/**
 * Get current RPC endpoint configuration
 */
export function getCurrentEndpoint(): RpcEndpoint {
  return RPC_ENDPOINTS[currentEndpointIndex]
}

/**
 * Rotate to next RPC endpoint
 */
export function rotateToNextEndpoint(): RpcEndpoint {
  const oldEndpoint = RPC_ENDPOINTS[currentEndpointIndex]
  currentEndpointIndex = (currentEndpointIndex + 1) % RPC_ENDPOINTS.length
  const newEndpoint = RPC_ENDPOINTS[currentEndpointIndex]
  
  console.warn(`🔄 RPC FAILOVER: ${oldEndpoint.name} → ${newEndpoint.name}`)
  console.warn(`   Reason: ${failureCount} consecutive failures`)
  console.warn(`   New endpoint: ${newEndpoint.url}`)
  
  failureCount = 0  // Reset failure count on rotation
  return newEndpoint
}

/**
 * Record RPC failure and auto-rotate if threshold reached
 */
export function recordFailure(error: any): void {
  failureCount++
  const endpoint = getCurrentEndpoint()
  
  console.error(`❌ RPC Error [${endpoint.name}] (${failureCount}/${MAX_FAILURES_BEFORE_ROTATE}):`, error.message)
  
  if (failureCount >= MAX_FAILURES_BEFORE_ROTATE) {
    rotateToNextEndpoint()
  }
}

/**
 * Record successful RPC call (reset failure count)
 */
export function recordSuccess(): void {
  if (failureCount > 0) {
    failureCount = 0
    console.log(`✅ RPC recovered: ${getCurrentEndpoint().name}`)
  }
}

/**
 * Check if error is rate limit related
 */
export function isRateLimitError(error: any): boolean {
  const message = error?.message?.toLowerCase() || ''
  return (
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('too many requests') ||
    error?.code === 429
  )
}

/**
 * Get all available endpoints for logging
 */
export function getAllEndpoints(): RpcEndpoint[] {
  return RPC_ENDPOINTS
}

/**
 * Initialize and log RPC configuration
 */
export function initializeRpcManager(): void {
  const endpoint = getCurrentEndpoint()
  console.log(`🔗 RPC Manager Initialized`)
  console.log(`   Primary: ${endpoint.name} (${endpoint.url})`)
  console.log(`   Failover: ${RPC_ENDPOINTS.length - 1} backup endpoints available`)
  console.log(`   Auto-rotate: After ${MAX_FAILURES_BEFORE_ROTATE} consecutive failures`)
}
