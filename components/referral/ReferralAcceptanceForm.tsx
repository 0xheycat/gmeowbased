/**
 * ReferralAcceptanceForm Component
 * 
 * UI for accepting referral codes from other users
 * Handles transaction flow, loading states, and XP celebration
 * 
 * Features:
 * - Display referral code and owner info
 * - Show reward breakdown (Referrer +50 pts, You +25 pts)
 * - Handle wallet connection
 * - Submit setReferrer transaction
 * - Show XP celebration on success
 * - Error handling with retry
 * 
 * Usage:
 * <ReferralAcceptanceForm 
 *   code="MEOW123"
 *   ownerAddress="0x..."
 *   onSuccess={() => console.log('Accepted!')}
 * />
 */

'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import type { Address } from 'viem'
import { motion } from 'framer-motion'
import { buildSetReferrerTx } from '@/lib/contracts/referral-contract'
import { XPEventOverlay, type XpEventPayload } from '@/components/XPEventOverlay'
import { CheckCircleIcon, RefreshIcon, ExternalLinkIcon } from '@/components/icons'

export interface ReferralAcceptanceFormProps {
  /** Referral code to accept */
  code: string
  /** Owner address of the referral code */
  ownerAddress: Address
  /** Callback on successful acceptance */
  onSuccess?: () => void
  /** Callback on error */
  onError?: (error: Error) => void
  /** Custom CSS class */
  className?: string
}

export function ReferralAcceptanceForm({
  code,
  ownerAddress,
  onSuccess,
  onError,
  className = '',
}: ReferralAcceptanceFormProps) {
  const { address, isConnected } = useAccount()
  const { writeContract, data: hash, error: writeError, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const [xpOverlayOpen, setXpOverlayOpen] = useState(false)
  const [xpPayload, setXpPayload] = useState<XpEventPayload | null>(null)

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed) {
      // Show XP celebration (+25 points for referee)
      setXpPayload({
        event: 'referral-register',
        chainKey: 'base',
        xpEarned: 25,
        headline: 'Referral Accepted! 🎉',
        tierTagline: `You've joined with code ${code.toUpperCase()}`,
      })
      setXpOverlayOpen(true)

      // Call success callback
      onSuccess?.()
    }
  }, [isConfirmed, code, onSuccess])

  // Handle transaction errors
  useEffect(() => {
    if (writeError) {
      console.error('[ReferralAcceptanceForm] Transaction error:', writeError)
      onError?.(writeError)
    }
  }, [writeError, onError])

  const handleAccept = async () => {
    if (!address) {
      console.error('[ReferralAcceptanceForm] No wallet connected')
      return
    }

    try {
      const tx = buildSetReferrerTx(code.toUpperCase(), 'base')

      await writeContract({
        address: tx.address,
        abi: tx.abi,
        functionName: tx.functionName,
        args: tx.args,
      })
    } catch (error) {
      console.error('[ReferralAcceptanceForm] Failed to submit transaction:', error)
      onError?.(error instanceof Error ? error : new Error('Transaction failed'))
    }
  }

  const isProcessing = isPending || isConfirming
  const canSubmit = isConnected && !isProcessing

  return (
    <>
      <div className={`space-y-6 ${className}`}>
        {/* Referral Code Display */}
        <div className="text-center space-y-2">
          <h3 className="text-sm font-medium text-white/60">
            Referral Code
          </h3>
          <div className="inline-block px-8 py-4 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-3xl font-bold text-white font-mono tracking-wider">
              {code.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Rewards Breakdown */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 space-y-4">
          <h4 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5" />
            Rewards
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white/80">You receive:</span>
              <span className="text-xl font-bold text-emerald-400">+25 points</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/80">Referrer receives:</span>
              <span className="text-xl font-bold text-blue-400">+50 points</span>
            </div>
          </div>
          <p className="text-sm text-white/50 pt-2 border-t border-white/10">
            Rewards are distributed automatically when you accept this referral
          </p>
        </div>

        {/* Accept Button */}
        <motion.button
          onClick={handleAccept}
          disabled={!canSubmit}
          whileHover={canSubmit ? { scale: 1.02 } : {}}
          whileTap={canSubmit ? { scale: 0.98 } : {}}
          transition={{ duration: 0.15 }}
          className={`
            w-full px-6 py-4 min-h-[56px] rounded-xl font-semibold text-lg
            transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:outline-none
            ${
              canSubmit
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/25'
                : 'bg-white/10 text-white/40 cursor-not-allowed'
            }
          `}
        >
          {!isConnected ? (
            'Connect Wallet to Accept'
          ) : isPending ? (
            <span className="flex items-center justify-center gap-2">
              <RefreshIcon className="h-5 w-5 animate-spin" />
              Submitting Transaction...
            </span>
          ) : isConfirming ? (
            <span className="flex items-center justify-center gap-2">
              <RefreshIcon className="h-5 w-5 animate-spin" />
              Confirming on Base...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <CheckCircleIcon className="h-5 w-5" />
              Accept Referral Code
            </span>
          )}
        </motion.button>

        {/* Transaction Link */}
        {hash && (
          <div className="text-center">
            <a
              href={`https://basescan.org/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              View transaction on BaseScan
              <ExternalLinkIcon className="w-4 h-4" />
            </a>
          </div>
        )}

        {/* Error Display */}
        {writeError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/20 rounded-lg p-4"
          >
            <p className="text-sm text-red-400">
              {writeError.message || 'Failed to accept referral. Please try again.'}
            </p>
            <button
              onClick={handleAccept}
              className="mt-2 text-sm text-red-300 hover:text-red-200 underline"
            >
              Retry
            </button>
          </motion.div>
        )}

        {/* Info Note */}
        <div className="text-center text-sm text-white/50 space-y-1">
          <p>• You can only set a referrer once</p>
          <p>• Points are awarded automatically on confirmation</p>
          <p>• Transaction requires a small gas fee on Base</p>
        </div>
      </div>

      {/* XP Celebration Overlay */}
      <XPEventOverlay
        open={xpOverlayOpen}
        payload={xpPayload}
        onClose={() => {
          setXpOverlayOpen(false)
          // Wait a bit before calling success to let animation finish
          setTimeout(() => onSuccess?.(), 500)
        }}
      />
    </>
  )
}
