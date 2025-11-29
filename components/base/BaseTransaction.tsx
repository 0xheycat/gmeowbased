/**
 * BaseTransaction Component
 * 
 * Transaction components with Tailwick v2.0 styling + Paymaster
 * Simplified to use wagmi hooks directly
 * 
 * Features:
 * - GM posting button with sponsored tx support
 * - Badge minting button with sponsored tx support
 * - Tailwick v2.0 Button styling
 * - Error handling with user-friendly messages
 * 
 * @example
 * <PostGMButton
 *   chain="base"
 *   message="GM!"
 *   sponsored
 * />
 */

'use client'

import { useState } from 'react'
import { type Address } from 'viem'
import { useAccount, useWriteContract } from 'wagmi'
import { Button } from '../ui/tailwick-primitives'
import {
  prepareSponsoredPostGM,
  prepareSponsoredMintBadge,
  preparePostGMTransaction,
  prepareMintBadgeTransaction,
  parseTransactionError,
  getBaseExplorerUrl,
  formatTxHash,
  type GMChainKey,
} from '@/lib/base-helpers'

// ========================================
// POST GM BUTTON
// ========================================

export type PostGMButtonProps = {
  /** Chain to post GM on */
  chain: GMChainKey
  /** GM message content */
  message: string
  /** Use sponsored transaction */
  sponsored?: boolean
  /** Custom button text */
  buttonText?: string
  /** Callback on success */
  onSuccess?: (txHash: string) => void
  /** Callback on error */
  onError?: (error: string) => void
  /** Custom className */
  className?: string
}

export function PostGMButton({
  chain,
  message,
  sponsored = false,
  buttonText = 'Post GM',
  onSuccess,
  onError,
  className = '',
}: PostGMButtonProps) {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState<string>()

  if (!address) {
    return (
      <Button variant="ghost" disabled className={className}>
        Connect Wallet
      </Button>
    )
  }

  const handleClick = async () => {
    setLoading(true)
    try {
      // Get transaction parameters
      const txParams = sponsored
        ? await prepareSponsoredPostGM(chain, address, message)
        : preparePostGMTransaction(chain, address, message)

      // Execute transaction
      const hash = await writeContractAsync({
        address: txParams.address,
        abi: txParams.abi,
        functionName: txParams.functionName as string,
        args: txParams.args as readonly unknown[],
      })

      setTxHash(hash)
      onSuccess?.(hash)
    } catch (error) {
      const parsedError = parseTransactionError(error)
      onError?.(parsedError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        variant="primary"
        onClick={handleClick}
        disabled={loading}
        loading={loading}
        className={className}
      >
        {loading ? 'Posting...' : buttonText}
      </Button>
      {txHash && (
        <div className="text-xs theme-text-secondary">
          <a
            href={getBaseExplorerUrl('tx', txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:theme-text-primary transition"
          >
            View on Basescan: {formatTxHash(txHash)}
          </a>
        </div>
      )}
    </div>
  )
}

// ========================================
// MINT BADGE BUTTON
// ========================================

export type MintBadgeButtonProps = {
  /** Chain to mint badge on */
  chain: GMChainKey
  /** Badge token ID */
  badgeId: bigint
  /** Use sponsored transaction */
  sponsored?: boolean
  /** Custom button text */
  buttonText?: string
  /** Callback on success */
  onSuccess?: (txHash: string) => void
  /** Callback on error */
  onError?: (error: string) => void
  /** Custom className */
  className?: string
}

export function MintBadgeButton({
  chain,
  badgeId,
  sponsored = false,
  buttonText = 'Mint Badge',
  onSuccess,
  onError,
  className = '',
}: MintBadgeButtonProps) {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState<string>()

  if (!address) {
    return (
      <Button variant="ghost" disabled className={className}>
        Connect Wallet
      </Button>
    )
  }

  const handleClick = async () => {
    setLoading(true)
    try {
      // Get transaction parameters
      const txParams = sponsored
        ? await prepareSponsoredMintBadge(chain, address, badgeId)
        : prepareMintBadgeTransaction(chain, address, badgeId)

      // Execute transaction
      const hash = await writeContractAsync({
        address: txParams.address,
        abi: txParams.abi,
        functionName: txParams.functionName as string,
        args: txParams.args as readonly unknown[],
      })

      setTxHash(hash)
      onSuccess?.(hash)
    } catch (error) {
      const parsedError = parseTransactionError(error)
      onError?.(parsedError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        variant="success"
        onClick={handleClick}
        disabled={loading}
        loading={loading}
        className={className}
      >
        {loading ? 'Minting...' : buttonText}
      </Button>
      {txHash && (
        <div className="text-xs theme-text-secondary">
          <a
            href={getBaseExplorerUrl('tx', txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:theme-text-primary transition"
          >
            View on Basescan: {formatTxHash(txHash)}
          </a>
        </div>
      )}
    </div>
  )
}

// Export default
export default PostGMButton
