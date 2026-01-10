/**
 * ReferralCodeForm Component
 * 
 * Purpose: Register custom referral code with validation and blockchain transaction
 * Template: music forms (30%) + gmeowbased0.6 patterns (15%)
 * 
 * Features:
 * - Code validation (3-32 chars, alphanumeric + underscore)
 * - Real-time availability check
 * - Transaction execution with wagmi
 * - Loading states and error handling
 * - Mobile-responsive (375px → desktop)
 * 
 * Security:
 * - Client-side validation before transaction
 * - Format validation (regex)
 * - Contract-level duplicate check
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { 
  validateReferralCode, 
  isReferralCodeAvailable,
  buildRegisterReferralCodeTx 
} from '@/lib/contracts/referral-contract'
import { CheckCircleIcon, ErrorIcon, RefreshIcon } from '@/components/icons'
import { XPEventOverlay, type XpEventPayload } from '@/components/XPEventOverlay'

export interface ReferralCodeFormProps {
  /** Current referral code (if any) */
  currentCode?: string | null
  /** Callback after successful registration */
  onSuccess?: (code: string) => void
  /** Callback on error */
  onError?: (error: string) => void
  /** Custom CSS class */
  className?: string
}

export function ReferralCodeForm({
  currentCode,
  onSuccess,
  onError,
  className = '',
}: ReferralCodeFormProps) {
  const { address, isConnected } = useAccount()
  const { writeContract, data: hash, error: writeError, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  // Form state
  const [code, setCode] = useState('')
  const [touched, setTouched] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'taken' | null>(null)
  const [xpOverlayOpen, setXpOverlayOpen] = useState(false)
  const [xpPayload, setXpPayload] = useState<XpEventPayload | null>(null)

  // Validation
  const validation = validateReferralCode(code)
  const showError = touched && !validation.valid
  const canSubmit = validation.valid && availabilityStatus === 'available' && !isPending && !isConfirming

  // Check availability when code changes
  useEffect(() => {
    if (!validation.valid || code.length < 3) {
      setAvailabilityStatus(null)
      return
    }

    let cancelled = false
    setIsChecking(true)

    const checkAvailability = async () => {
      try {
        const available = await isReferralCodeAvailable(code)
        if (!cancelled) {
          setAvailabilityStatus(available ? 'available' : 'taken')
        }
      } catch (error) {
        if (!cancelled) {
          setAvailabilityStatus(null)
        }
      } finally {
        if (!cancelled) {
          setIsChecking(false)
        }
      }
    }

    // Debounce
    const timer = setTimeout(checkAvailability, 500)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [code, validation.valid])

  // Handle successful transaction
  useEffect(() => {
    if (isConfirmed && hash) {
      // Show XP celebration
      const payload: XpEventPayload = {
        event: 'referral-register',
        chainKey: 'base',
        xpEarned: 10, // Referral code registration reward
        headline: `Referral Code "${code}" Registered! 🔗`,
        tierTagline: '+10 XP Earned',
        shareLabel: 'Share Code',
        visitLabel: 'View Profile',
        visitUrl: '/profile',
      }
      setXpPayload(payload)
      setTimeout(() => setXpOverlayOpen(true), 100)
      
      onSuccess?.(code)
    }
  }, [isConfirmed, hash, code, onSuccess])

  // Handle errors
  useEffect(() => {
    if (writeError) {
      const errorMessage = writeError.message || 'Transaction failed'
      onError?.(errorMessage)
    }
  }, [writeError, onError])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!isConnected || !address) {
        onError?.('Please connect your wallet first')
        return
      }

      if (!canSubmit) return

      try {
        const tx = buildRegisterReferralCodeTx(code, 'base')
        writeContract({
          address: tx.address as `0x${string}`,
          abi: tx.abi,
          functionName: tx.functionName as any,
          args: tx.args as any,
        })
      } catch (error: any) {
        onError?.(error.message || 'Failed to submit transaction')
      }
    },
    [isConnected, address, canSubmit, code, writeContract, onError]
  )

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().trim()
    setCode(value)
    setTouched(true)
    setAvailabilityStatus(null)
  }

  // Status indicator
  const renderStatus = () => {
    if (!touched || code.length < 3) return null

    if (isChecking) {
      return (
        <div className="flex items-center gap-2 text-sm text-white/60">
          <RefreshIcon className="h-4 w-4 animate-spin" />
          <span>Checking availability...</span>
        </div>
      )
    }

    if (showError) {
      return (
        <div className="flex items-center gap-2 text-sm text-red-400">
          <ErrorIcon className="h-4 w-4" />
          <span>{validation.error}</span>
        </div>
      )
    }

    if (availabilityStatus === 'taken') {
      return (
        <div className="flex items-center gap-2 text-sm text-yellow-400">
          <ErrorIcon className="h-4 w-4" />
          <span>Code already taken</span>
        </div>
      )
    }

    if (availabilityStatus === 'available') {
      return (
        <div className="flex items-center gap-2 text-sm text-green-400">
          <CheckCircleIcon className="h-4 w-4" />
          <span>Code available!</span>
        </div>
      )
    }

    return null
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      {/* Current Code Display */}
      {currentCode && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="text-sm text-white/60 mb-1">Current code</div>
          <div className="text-lg font-semibold text-white">{currentCode}</div>
        </div>
      )}

      {/* Input Field */}
      <div className="space-y-2">
        <label htmlFor="referral-code" className="block text-sm font-medium text-white/80">
          {currentCode ? 'Update referral code' : 'Create referral code'}
        </label>
        <input
          id="referral-code"
          type="text"
          value={code}
          onChange={handleCodeChange}
          placeholder="mycode123"
          className={`
            w-full px-4 py-3 rounded-xl
            bg-white/5 border
            ${showError ? 'border-red-500/50' : availabilityStatus === 'available' ? 'border-green-500/50' : 'border-white/10'}
            text-white placeholder:text-white/30
            focus:outline-none focus:ring-2 focus:ring-blue-500/50
            transition-colors
          `}
          disabled={isPending || isConfirming}
          maxLength={32}
          autoComplete="off"
          spellCheck={false}
        />
        
        {/* Helper Text */}
        <p className="text-xs text-white/50">
          3-32 characters: letters, numbers, and underscores only
        </p>

        {/* Status */}
        {renderStatus()}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!canSubmit || !isConnected}
        className={`
          w-full px-6 py-3 min-h-[44px] rounded-xl font-semibold
          transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:outline-none
          ${
            canSubmit && isConnected
              ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25'
              : 'bg-white/10 text-white/40 cursor-not-allowed'
          }
        `}
      >
        {!isConnected ? (
          'Connect Wallet'
        ) : isPending ? (
          <span className="flex items-center justify-center gap-2">
            <RefreshIcon className="h-4 w-4 animate-spin" />
            Submitting...
          </span>
        ) : isConfirming ? (
          <span className="flex items-center justify-center gap-2">
            <RefreshIcon className="h-4 w-4 animate-spin" />
            Confirming...
          </span>
        ) : currentCode ? (
          'Update Code'
        ) : (
          'Register Code'
        )}
      </button>

      {/* Transaction Hash */}
      {hash && (
        <div className="text-xs text-white/50 text-center">
          <a
            href={`https://basescan.org/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white/80 underline"
          >
            View transaction →
          </a>
        </div>
      )}

      {/* XP Celebration Overlay */}
      <XPEventOverlay
        open={xpOverlayOpen}
        payload={xpPayload}
        onClose={() => setXpOverlayOpen(false)}
      />
    </form>
  )
}
