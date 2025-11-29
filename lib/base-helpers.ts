/**
 * Base.dev Integration Helpers
 * 
 * Reused patterns from old foundation + enhanced with paymaster
 * Provides utilities for Base chain interactions, OnchainKit integration,
 * and sponsored transactions via Coinbase Paymaster.
 * 
 * CRITICAL: 100% working patterns from old foundation + new paymaster feature
 */

import { type Address, type Hex, encodeFunctionData, parseEther } from 'viem'
import { base } from 'viem/chains'
import type { WriteContractParameters } from 'wagmi/actions'
import { 
  getCoreAddress, 
  getGuildAddress, 
  getNFTAddress,
  getCoreABI,
  getGuildABI,
  getNFTABI,
  type GMChainKey,
} from './gmeow-utils'

// Re-export GMChainKey for use in components
export type { GMChainKey } from './gmeow-utils'

/**
 * Paymaster Configuration
 * Uses Coinbase Paymaster for sponsored transactions
 */
export const PAYMASTER_CONFIG = {
  // Coinbase Paymaster URL (Base mainnet)
  url: 'https://api.developer.coinbase.com/rpc/v1/base/paymaster',
  // API key from environment
  apiKey: process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY || '',
  // Supported chains
  supportedChains: [base.id] as const,
} as const

/**
 * Check if paymaster is available for a chain
 */
export function isPaymasterSupported(chainId: number): boolean {
  return PAYMASTER_CONFIG.supportedChains.includes(chainId as any)
}

/**
 * Paymaster Result Types
 */
export type PaymasterResult = {
  paymasterAndData: Hex
  preVerificationGas: bigint
  verificationGasLimit: bigint
  callGasLimit: bigint
}

export type SponsoredTransactionParams = {
  chainId: number
  from: Address
  to: Address
  data: Hex
  value?: bigint
}

/**
 * Request paymaster sponsorship for a transaction
 * 
 * @param params - Transaction parameters
 * @returns Paymaster data for sponsored transaction
 * 
 * @example
 * const paymaster = await requestPaymasterSponsorship({
 *   chainId: base.id,
 *   from: userAddress,
 *   to: contractAddress,
 *   data: encodedCall,
 * })
 */
export async function requestPaymasterSponsorship(
  params: SponsoredTransactionParams
): Promise<PaymasterResult | null> {
  const { chainId, from, to, data, value = 0n } = params

  // Check if paymaster is supported
  if (!isPaymasterSupported(chainId)) {
    console.warn('[Paymaster] Chain not supported:', chainId)
    return null
  }

  // Check if API key is configured
  if (!PAYMASTER_CONFIG.apiKey) {
    console.warn('[Paymaster] API key not configured')
    return null
  }

  try {
    // Request paymaster sponsorship from Coinbase API
    const response = await fetch(PAYMASTER_CONFIG.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PAYMASTER_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'pm_sponsorUserOperation',
        params: [{
          sender: from,
          callData: data,
          target: to,
          value: value.toString(),
        }],
      }),
    })

    if (!response.ok) {
      throw new Error(`Paymaster request failed: ${response.statusText}`)
    }

    const result = await response.json()

    if (result.error) {
      throw new Error(result.error.message || 'Paymaster error')
    }

    return {
      paymasterAndData: result.result.paymasterAndData as Hex,
      preVerificationGas: BigInt(result.result.preVerificationGas),
      verificationGasLimit: BigInt(result.result.verificationGasLimit),
      callGasLimit: BigInt(result.result.callGasLimit),
    }
  } catch (error) {
    console.error('[Paymaster] Sponsorship request failed:', error)
    return null
  }
}

/**
 * Contract Interaction Helpers
 * Reused from old foundation (100% working)
 */

/**
 * Prepare a GM post transaction
 * 
 * @param chain - GM chain key
 * @param userAddress - User wallet address
 * @param message - GM message content
 * @returns Write contract parameters
 */
export function preparePostGMTransaction(
  chain: GMChainKey,
  userAddress: Address,
  message: string
): WriteContractParameters {
  return {
    address: getCoreAddress(chain),
    abi: getCoreABI(),
    functionName: 'sendGM',
    args: [],
    account: userAddress,
  }
}

/**
 * Prepare a badge mint transaction
 * 
 * @param chain - GM chain key
 * @param userAddress - User wallet address
 * @param badgeId - Badge token ID
 * @returns Write contract parameters
 */
export function prepareMintBadgeTransaction(
  chain: GMChainKey,
  userAddress: Address,
  badgeId: bigint
): WriteContractParameters {
  return {
    address: getNFTAddress(chain),
    abi: getNFTABI(),
    functionName: 'mintNFT',
    args: [userAddress, badgeId],
    account: userAddress,
  }
}

/**
 * Prepare a guild join transaction
 * 
 * @param chain - GM chain key
 * @param userAddress - User wallet address
 * @param guildId - Guild ID to join
 * @returns Write contract parameters
 */
export function prepareJoinGuildTransaction(
  chain: GMChainKey,
  userAddress: Address,
  guildId: bigint
): WriteContractParameters {
  return {
    address: getGuildAddress(chain),
    abi: getGuildABI(),
    functionName: 'joinGuild',
    args: [guildId],
    account: userAddress,
  }
}

/**
 * Enhanced Transaction Helpers with Paymaster Support
 */

/**
 * Prepare sponsored GM post transaction
 * 
 * @param chain - GM chain key
 * @param userAddress - User wallet address
 * @param message - GM message content
 * @returns Transaction parameters with paymaster data
 */
export async function prepareSponsoredPostGM(
  chain: GMChainKey,
  userAddress: Address,
  message: string
) {
  // Get base transaction params
  const txParams = preparePostGMTransaction(chain, userAddress, message)
  
  // Encode function data
  const data = encodeFunctionData({
    abi: txParams.abi,
    functionName: txParams.functionName as string,
    args: txParams.args as readonly unknown[],
  })

  // Request paymaster sponsorship
  const paymaster = await requestPaymasterSponsorship({
    chainId: base.id,
    from: userAddress,
    to: txParams.address,
    data,
  })

  return {
    ...txParams,
    paymaster,
  }
}

/**
 * Prepare sponsored badge mint transaction
 * 
 * @param chain - GM chain key
 * @param userAddress - User wallet address
 * @param badgeId - Badge token ID
 * @returns Transaction parameters with paymaster data
 */
export async function prepareSponsoredMintBadge(
  chain: GMChainKey,
  userAddress: Address,
  badgeId: bigint
) {
  // Get base transaction params
  const txParams = prepareMintBadgeTransaction(chain, userAddress, badgeId)
  
  // Encode function data
  const data = encodeFunctionData({
    abi: txParams.abi,
    functionName: txParams.functionName as string,
    args: txParams.args as readonly unknown[],
  })

  // Request paymaster sponsorship
  const paymaster = await requestPaymasterSponsorship({
    chainId: base.id,
    from: userAddress,
    to: txParams.address,
    data,
  })

  return {
    ...txParams,
    paymaster,
  }
}

/**
 * Error Handling Utilities
 */

export type TransactionError = {
  code: string
  message: string
  details?: unknown
}

/**
 * Parse transaction error into user-friendly message
 * 
 * @param error - Raw error from transaction
 * @returns Parsed error object
 */
export function parseTransactionError(error: unknown): TransactionError {
  // Handle common error patterns
  if (error instanceof Error) {
    // User rejected transaction
    if (error.message.includes('User rejected')) {
      return {
        code: 'USER_REJECTED',
        message: 'Transaction was cancelled',
      }
    }

    // Insufficient funds
    if (error.message.includes('insufficient funds')) {
      return {
        code: 'INSUFFICIENT_FUNDS',
        message: 'Insufficient funds to complete transaction',
      }
    }

    // Gas estimation failed
    if (error.message.includes('gas')) {
      return {
        code: 'GAS_ERROR',
        message: 'Transaction gas estimation failed',
      }
    }

    // Paymaster error
    if (error.message.includes('paymaster')) {
      return {
        code: 'PAYMASTER_ERROR',
        message: 'Transaction sponsorship unavailable',
      }
    }

    // Generic error
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      details: error,
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred',
    details: error,
  }
}

/**
 * Chain Utilities
 */

/**
 * Get Base chain explorer URL
 * 
 * @param type - Type of entity (tx, address, block)
 * @param value - Entity value (hash, address, number)
 * @returns Explorer URL
 */
export function getBaseExplorerUrl(
  type: 'tx' | 'address' | 'block',
  value: string
): string {
  const baseUrl = 'https://basescan.org'
  
  switch (type) {
    case 'tx':
      return `${baseUrl}/tx/${value}`
    case 'address':
      return `${baseUrl}/address/${value}`
    case 'block':
      return `${baseUrl}/block/${value}`
    default:
      return baseUrl
  }
}

/**
 * Format transaction hash for display
 * 
 * @param hash - Transaction hash
 * @returns Formatted hash (0x1234...5678)
 */
export function formatTxHash(hash: string): string {
  if (hash.length < 10) return hash
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`
}

/**
 * Format address for display
 * 
 * @param address - Wallet address
 * @returns Formatted address (0x1234...5678)
 */
export function formatAddress(address: string): string {
  if (address.length < 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
