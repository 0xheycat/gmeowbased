/**
 * GuildTreasury Component
 * 
 * Purpose: Treasury management with deposits and claims
 * Template: trezoadmin-41/treasury (35%) + gmeowbased0.6 layout (10%)
 * 
 * Features:
 * - Treasury balance display
 * - Deposit BASE POINTS form
 * - Claim rewards (for admins)
 * - Transaction history
 * - Pending claims list
 * 
 * Usage:
 * <GuildTreasury guildId="123" canManage={true} />
 */

'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { MonetizationOnIcon, KeyboardArrowUpIcon, KeyboardArrowDownIcon, AccessTimeIcon, ErrorIcon } from '@/components/icons'
import { Dialog, DialogBackdrop, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/dialogs'
import Loader from '@/components/ui/gmeow-loader'
import { Skeleton } from '@/components/ui/skeleton/Skeleton'
import { createKeyboardHandler, FOCUS_STYLES, WCAG_CLASSES, BUTTON_SIZES, LOADING_ARIA, ERROR_ARIA } from '@/lib/utils/accessibility'
import { XPEventOverlay, type XpEventPayload } from '@/components/XPEventOverlay'
import { TreasuryResponseSchema, TreasuryErrorSchema, type TreasuryTransaction } from '@/types/api/guild-treasury'
import { TreasuryInfo } from './TreasuryInfo'
import { HelpCircle } from 'lucide-react'

export interface GuildTreasuryProps {
  guildId: string
  canManage?: boolean
}

export function GuildTreasury({ guildId, canManage = false }: GuildTreasuryProps) {
  const { address } = useAccount()
  const { writeContract, data: hash, error: writeError, isPending: isWriting } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash })
  const [balance, setBalance] = useState<string>('0') // Store as string for BigInt precision safety
  const [transactions, setTransactions] = useState<TreasuryTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [isDepositing, setIsDepositing] = useState(false)
  const [claimingId, setClaimingId] = useState<string | null>(null) // Track which claim is being processed
  const [claimAmount, setClaimAmount] = useState('') // Track claim request amount
  const [isRequestingClaim, setIsRequestingClaim] = useState(false) // Track claim request state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMessage, setDialogMessage] = useState('')
  const [persistentError, setPersistentError] = useState<string | null>(null) // Persistent error banner
  const [isMember, setIsMember] = useState(false)
  const [showInfo, setShowInfo] = useState(false) // Treasury info section
  
  // Leader direct claim state
  const [isClaimingDirect, setIsClaimingDirect] = useState(false)
  const [rankTier, setRankTier] = useState<string>('Rookie')
  const [rankMultiplier, setRankMultiplier] = useState<number>(1.0)
  const [estimatedBonus, setEstimatedBonus] = useState<number>(0)
  
  // XP celebration state
  const [xpOverlayOpen, setXpOverlayOpen] = useState(false)
  const [xpPayload, setXpPayload] = useState<XpEventPayload | null>(null)

  // Check membership when wallet changes
  useEffect(() => {
    const checkMembership = async () => {
      if (!address) {
        setIsMember(false)
        return
      }

      try {
        const response = await fetch(`/api/guild/${guildId}/is-member?address=${address}`)
        const data = await response.json()
        setIsMember(data.isMember)
      } catch (err) {
        setIsMember(false)
      }
    }

    checkMembership()
  }, [guildId, address])

  useEffect(() => {
    const loadTreasury = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch(`/api/guild/${guildId}/treasury?page=1&limit=50`)
        
        if (!response.ok) {
          const errorData = await response.json()
          const validatedError = TreasuryErrorSchema.safeParse(errorData)
          throw new Error(
            validatedError.success 
              ? validatedError.data.message 
              : 'Failed to load treasury'
          )
        }
        
        const rawData = await response.json()
        
        // Runtime validation with Zod
        const validationResult = TreasuryResponseSchema.safeParse(rawData)
        
        if (!validationResult.success) {
          console.error('[GuildTreasury] Schema validation failed:', validationResult.error)
          throw new Error('Invalid response format from server')
        }
        
        const data = validationResult.data
        setBalance(data.balance || '0') // Keep as string for precision
        setTransactions(data.transactions)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load treasury'
        setError(`${errorMessage}. Please refresh the page.`)
      } finally {
        setIsLoading(false)
      }
    }

    loadTreasury()
  }, [guildId])

  const handleDeposit = async () => {
    const amount = parseInt(depositAmount)
    if (!address || !amount || amount <= 0) {
      setDialogMessage('Please enter a valid amount to deposit.')
      setDialogOpen(true)
      return
    }

    // Check membership first
    if (!isMember) {
      setDialogMessage('Only guild members can deposit points. Please join the guild first.')
      setDialogOpen(true)
      return
    }

    try {
      setIsDepositing(true)
      
      // Step 1: Get contract call instructions from API
      const response = await fetch(`/api/guild/${guildId}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, amount })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        const errorMsg = data.message || 'Unable to process deposit. Please check your wallet and try again.'
        setDialogMessage(errorMsg)
        setDialogOpen(true)
        setPersistentError(errorMsg) // Persist error after dialog closes
        setIsDepositing(false)
        return
      }
      
      // Step 2: Execute contract call with user's wallet
      const { contractCall } = data
      writeContract({
        address: contractCall.address,
        abi: contractCall.abi,
        functionName: contractCall.functionName,
        args: contractCall.args,
      })
      
      // Note: Transaction confirmation is handled by useWaitForTransactionReceipt hook
    } catch (err) {
      const errorMsg = 'Deposit failed. Please check your connection and try again.'
      setDialogMessage(errorMsg)
      setDialogOpen(true)
      setPersistentError(errorMsg) // Persist error after dialog closes
      setIsDepositing(false)
    }
  }
  
  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed) {
      setDialogMessage(`💰 Successfully deposited ${depositAmount} points! Your guild grows stronger!`)
      setDialogOpen(true)
      setDepositAmount('')
      setIsDepositing(false)
      setPersistentError(null) // Clear error on success
      
      // Trigger XP celebration for treasury contribution
      const payload: XpEventPayload = {
        event: 'guild',
        chainKey: 'base',
        xpEarned: 20,
        headline: `Treasury Contribution! 💰`,
        tierTagline: '+20 XP Earned',
        shareLabel: 'Share',
        visitLabel: 'View Guild',
        visitUrl: `/guild/${guildId}`,
      }
      setXpPayload(payload)
      setTimeout(() => setXpOverlayOpen(true), 100)
      
      // Reload treasury data after a short delay
      setTimeout(async () => {
        try {
          const res = await fetch(`/api/guild/${guildId}/treasury`)
          if (res.ok) {
            const data = await res.json()
            setBalance(data.balance || '0')
          }
        } catch (err) {
        }
      }, 2000)
    }
  }, [isConfirmed, depositAmount, guildId])
  
  // Handle write errors
  useEffect(() => {
    if (writeError) {
      const errorMsg = 'Transaction failed. Please try again.'
      setDialogMessage(errorMsg)
      setDialogOpen(true)
      setPersistentError(errorMsg) // Persist error after dialog closes
      setIsDepositing(false)
    }
  }, [writeError])

  const handleClaim = async (transactionId: string) => {
    if (!canManage) return

    setClaimingId(transactionId)
    try {
      const response = await fetch(`/api/guild/${guildId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setDialogMessage(data.message || 'Unable to approve claim. Please check your permissions and try again.')
        setDialogOpen(true)
        return
      }
      
      setDialogMessage('🏆 Claim approved successfully! Contribution recorded!')
      setDialogOpen(true)
      setTimeout(async () => {
        try {
          const res = await fetch(`/api/guild/${guildId}/treasury`)
          if (res.ok) {
            const data = await res.json()
            setBalance(data.balance || '0')
            setTransactions(data.transactions)
          }
        } catch (err) {
        }
      }, 2000)
    } catch (err) {
      setDialogMessage('Claim approval failed. Please check your connection and try again.')
      setDialogOpen(true)
    } finally {
      setClaimingId(null)
    }
  }

  const handleRequestClaim = async () => {
    const amount = parseInt(claimAmount)
    if (!address || !amount || amount <= 0) {
      setDialogMessage('Please enter a valid amount to claim.')
      setDialogOpen(true)
      return
    }

    if (!isMember) {
      setDialogMessage('Only guild members can request claims.')
      setDialogOpen(true)
      return
    }

    try {
      setIsRequestingClaim(true)
      
      const response = await fetch(`/api/guild/${guildId}/request-claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, amount })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setDialogMessage(data.message || 'Unable to submit claim request. Please try again.')
        setDialogOpen(true)
        setIsRequestingClaim(false)
        return
      }
      
      setDialogMessage('📝 Claim request submitted! Waiting for guild leader approval.')
      setDialogOpen(true)
      setClaimAmount('')
      setIsRequestingClaim(false)
      
      // Reload treasury data
      setTimeout(async () => {
        try {
          const res = await fetch(`/api/guild/${guildId}/treasury`)
          if (res.ok) {
            const data = await res.json()
            setBalance(data.balance || '0')
            setTransactions(data.transactions)
          }
        } catch (err) {
        }
      }, 2000)
    } catch (err) {
      setDialogMessage('Claim request failed. Please check your connection and try again.')
      setDialogOpen(true)
      setIsRequestingClaim(false)
    }
  }

  const handleDirectClaim = async () => {
    const amount = parseInt(claimAmount)
    if (!address || !amount || amount <= 0) {
      setDialogMessage('Please enter a valid amount to claim.')
      setDialogOpen(true)
      return
    }

    if (amount > parseInt(balance)) {
      setDialogMessage(`Insufficient treasury balance. Available: ${parseInt(balance).toLocaleString()} points`)
      setDialogOpen(true)
      return
    }

    try {
      setIsClaimingDirect(true)
      
      // Step 1: Get contract call instructions from API
      const response = await fetch(`/api/guild/${guildId}/claim-direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, amount })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        const errorMsg = data.message || 'Unable to process claim. Please check permissions and try again.'
        setDialogMessage(errorMsg)
        setDialogOpen(true)
        setIsClaimingDirect(false)
        return
      }
      
      // Step 2: Execute blockchain transaction
      writeContract({
        address: data.contractCall.address,
        abi: data.contractCall.abi,
        functionName: data.contractCall.functionName,
        args: data.contractCall.args,
      })
      
      // Transaction will be handled by wagmi hooks (isWriting, isConfirming, isConfirmed)
      // Success message shown after transaction confirms
      setDialogMessage(`🎉 Claiming ${amount.toLocaleString()} points → You'll receive ${data.estimatedBonus.toLocaleString()} points with ${data.rankTier} bonus!`)
      setDialogOpen(true)
      setClaimAmount('')
      setEstimatedBonus(0)
      setIsClaimingDirect(false)
      
      // Reload treasury data after brief delay
      setTimeout(async () => {
        try {
          const res = await fetch(`/api/guild/${guildId}/treasury`)
          if (res.ok) {
            const treasuryData = await res.json()
            setBalance(treasuryData.balance || '0')
            setTransactions(treasuryData.transactions)
          }
        } catch (err) {
          console.error('Failed to reload treasury:', err)
        }
      }, 3000)
      
    } catch (err) {
      console.error('Direct claim error:', err)
      setDialogMessage('Claim failed. Please check your connection and try again.')
      setDialogOpen(true)
      setIsClaimingDirect(false)
    }
  }

  // Fetch user's rank tier on mount (for leader direct claim bonus display)
  useEffect(() => {
    const fetchRankTier = async () => {
      if (!address || !canManage) return
      
      try {
        const response = await fetch(`/api/user/${address}/rank-tier`)
        if (response.ok) {
          const data = await response.json()
          setRankTier(data.tierName || 'Rookie')
          setRankMultiplier(data.multiplier || 1.0)
        }
      } catch (err) {
        console.error('Failed to fetch rank tier:', err)
        // Keep defaults
      }
    }
    
    fetchRankTier()
  }, [address, canManage])

  if (isLoading) {
    return (
      <div className="space-y-6" role="status" aria-live="polite" aria-label="Loading treasury">
        <Skeleton variant="rect" className="h-32 rounded-lg" animation="wave" />
        <Skeleton variant="rect" className="h-64 rounded-lg" animation="wave" />
      </div>
    )
  }

  if (error) {
    return (
      <>\n        <Dialog isOpen={true} onClose={() => setError(null)}>
          <DialogBackdrop />
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Error Loading Treasury</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <p className="text-gray-700 dark:text-gray-300">{error}</p>
            </DialogBody>
            <DialogFooter>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setError(null)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors"
                  {...createKeyboardHandler(() => setError(null))}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setError(null)
                    window.location.reload()
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  {...createKeyboardHandler(() => {
                    setError(null)
                    window.location.reload()
                  })}
                >
                  Retry
                </button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  const pendingClaims = transactions.filter(t => t.type === 'claim' && t.status === 'pending')

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <MonetizationOnIcon className="w-6 h-6" />
          <span className="text-sm opacity-90">Treasury Balance</span>
        </div>
        <div className="text-4xl font-bold mb-1">
          {parseInt(balance || '0').toLocaleString()}
        </div>
        <div className="text-sm opacity-75">
          BASE POINTS
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="mt-4 w-full px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
          aria-expanded={showInfo}
          aria-label={showInfo ? 'Hide treasury information' : 'Show treasury information'}
        >
          <HelpCircle className="w-4 h-4" />
          {showInfo ? 'Hide Info' : 'Learn About Treasury'}
        </button>
      </div>

      {/* Treasury Info Section (Collapsible) */}
      {showInfo && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-in slide-in-from-top duration-300">
          <TreasuryInfo />
        </div>
      )}

      {/* Persistent Error Banner */}
      {persistentError && (
        <div className="bg-wcag-error-light/10 dark:bg-wcag-error-dark/10 border border-wcag-error-light dark:border-wcag-error-dark rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ErrorIcon className="w-5 h-5 text-wcag-error-light dark:text-wcag-error-dark flex-shrink-0 mt-0.5" />
            <p {...ERROR_ARIA} className={`flex-1 text-sm ${WCAG_CLASSES.text.semantic.error}`}>
              {persistentError}
            </p>
            <button
              onClick={() => setPersistentError(null)}
              aria-label="Dismiss error message"
              className={`text-wcag-error-light dark:text-wcag-error-dark hover:opacity-80 transition-fast ${FOCUS_STYLES.ring}`}
              {...createKeyboardHandler(() => setPersistentError(null))}
            >
              <span className="text-xl font-bold">×</span>
            </button>
          </div>
        </div>
      )}

      {/* Deposit Form */}
      {address && isMember && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className={`text-xl font-bold ${WCAG_CLASSES.text.onLight.primary} mb-4`}>
            Deposit Points
          </h2>
          <div className="flex gap-3">
            <label htmlFor="deposit-amount" className="sr-only">Amount to deposit in BASE POINTS</label>
            <input
              id="deposit-amount"
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Amount"
              min="1"
              aria-label="Amount to deposit in BASE POINTS"
              aria-describedby="deposit-hint"
              className={`flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 ${WCAG_CLASSES.text.onLight.primary} placeholder-gray-500 ${FOCUS_STYLES.ring} transition-fast ${BUTTON_SIZES.md}`}
            />
            <button
              onClick={handleDeposit}
              disabled={isDepositing || isWriting || isConfirming || !depositAmount}
              aria-busy={isDepositing || isWriting || isConfirming}
              aria-label={`Deposit ${depositAmount || '0'} points to guild treasury`}
              className={`px-6 py-3 bg-wcag-info-light hover:bg-wcag-info-dark disabled:bg-gray-400 text-white font-semibold rounded-lg transition-smooth ${BUTTON_SIZES.md} ${FOCUS_STYLES.ring} flex items-center gap-2 ${
                (isDepositing || isWriting || isConfirming) ? 'opacity-50 cursor-not-allowed' : 'opacity-100'
              }`}
            >
              {(isDepositing || isWriting || isConfirming) ? (
                <>
                  <span {...LOADING_ARIA}>
                    <Loader size="small" variant="minimal" />
                  </span>
                  {isWriting ? 'Sign Transaction...' : isConfirming ? 'Confirming...' : 'Validating...'}
                </>
              ) : (
                'Deposit'
              )}
            </button>
          </div>
          <p id="deposit-hint" className={`text-sm ${WCAG_CLASSES.text.onLight.secondary} mt-2`}>
            Contribute points from your balance to the guild treasury
          </p>
        </div>
      )}

      {/* Leader/Officer Direct Claim Form (Template: music/forms + gmeowbased0.6) */}
      {address && isMember && canManage && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-purple-900 dark:text-purple-100 flex items-center gap-2">
              <MonetizationOnIcon className="w-6 h-6" />
              Leader Claim (Direct)
            </h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-gray-800 rounded-lg border border-purple-300 dark:border-purple-700">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Rank Bonus:</span>
              <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{rankMultiplier}x</span>
            </div>
          </div>

          {/* Rank tier display */}
          <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Your Rank:</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">{rankTier}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              As a {rankTier} rank, you get {rankMultiplier}x multiplier on claimed points
            </p>
          </div>

          {/* Claim amount input */}
          <div className="space-y-4">
            <div>
              <label htmlFor="leader-claim-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount to Claim
              </label>
              <input
                id="leader-claim-amount"
                type="number"
                value={claimAmount}
                onChange={(e) => {
                  setClaimAmount(e.target.value)
                  // Calculate estimated bonus in real-time
                  const amount = parseInt(e.target.value) || 0
                  setEstimatedBonus(Math.floor(amount * rankMultiplier))
                }}
                placeholder="Enter amount"
                min="1"
                max={balance}
                aria-label="Amount to claim from treasury"
                aria-describedby="leader-claim-hint"
                className="w-full px-4 py-3 border border-purple-300 dark:border-purple-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all min-h-[44px]"
              />
            </div>

            {/* Estimated bonus display */}
            {claimAmount && parseInt(claimAmount) > 0 && (
              <div className="p-4 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 rounded-lg border border-purple-300 dark:border-purple-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Treasury Deduction:</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">-{parseInt(claimAmount).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">You Receive:</span>
                  <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">+{estimatedBonus.toLocaleString()}</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  Includes {rankMultiplier}x {rankTier} rank multiplier bonus
                </p>
              </div>
            )}

            {/* Claim button */}
            <button
              onClick={handleDirectClaim}
              disabled={isClaimingDirect || !claimAmount || parseInt(claimAmount) <= 0 || parseInt(claimAmount) > parseInt(balance)}
              aria-busy={isClaimingDirect}
              aria-label={`Claim ${claimAmount || '0'} points from treasury (receive ${estimatedBonus.toLocaleString()} with bonus)`}
              className={`w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl min-h-[48px] focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex items-center justify-center gap-2 ${
                isClaimingDirect ? 'opacity-50 cursor-not-allowed' : 'opacity-100'
              }`}
            >
              {isClaimingDirect ? (
                <>
                  <Loader size="small" variant="minimal" />
                  <span>Claiming...</span>
                </>
              ) : (
                <>
                  <MonetizationOnIcon className="w-5 h-5" />
                  <span>Claim Now</span>
                </>
              )}
            </button>

            <p id="leader-claim-hint" className="text-xs text-gray-600 dark:text-gray-400 text-center">
              Direct claim as guild leader/officer • Points credited instantly with rank multiplier
            </p>
          </div>
        </div>
      )}

      {/* Member View - Cannot Claim Directly */}
      {address && isMember && !canManage && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <MonetizationOnIcon className="w-6 h-6 text-gray-500" />
            Treasury Claim
          </h2>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100 mb-2">
              <strong>Members cannot claim directly from treasury.</strong>
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Only guild leaders and officers have permission to distribute treasury points. Contact your guild leader if you believe you've earned a reward.
            </p>
          </div>
          
          {/* Show how members can earn */}
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
              How to Earn Points:
            </p>
            <ul className="space-y-1 text-sm text-green-700 dark:text-green-300">
              <li>• Complete guild quests</li>
              <li>• Participate in guild activities</li>
              <li>• Contribute to guild treasury (deposit points)</li>
              <li>• Help recruit new members</li>
            </ul>
          </div>
        </div>
      )}

      {/* Non-member message */}
      {address && !isMember && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Join Guild to Deposit
          </h2>
          <p className="text-blue-700 dark:text-blue-300">
            You must be a member of this guild to deposit points. Go back to the guild profile and click "Join Guild" to become a member.
          </p>
        </div>
      )}

      {/* Pending Claims (Admin Only) */}
      {canManage && pendingClaims.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className={`text-xl font-bold ${WCAG_CLASSES.text.onLight.primary} mb-4 flex items-center gap-2`}>
            <AccessTimeIcon className="w-5 h-5 text-wcag-warning-light dark:text-wcag-warning-dark" aria-hidden="true" />
            Pending Claims ({pendingClaims.length})
          </h2>
          <div className="space-y-3" role="list" aria-label="Pending treasury claims">
            {pendingClaims.map(claim => {
              const ariaLabel = `${claim.username} requesting ${claim.amount.toLocaleString()} points on ${new Date(claim.timestamp).toLocaleString()}`
              const keyboardProps = createKeyboardHandler(() => handleClaim(claim.id))
              
              return (
                <div
                  key={claim.id}
                  className="flex items-center justify-between p-4 bg-wcag-warning-light/10 dark:bg-wcag-warning-dark/10 border border-wcag-warning-light dark:border-wcag-warning-dark rounded-lg"
                  role="listitem"
                  aria-label={ariaLabel}
                >
                  <div className="flex-1">
                    <div className={`font-semibold ${WCAG_CLASSES.text.onLight.primary}`}>
                      {claim.username}
                    </div>
                    <div className={`text-sm ${WCAG_CLASSES.text.onLight.secondary}`}>
                      Requesting {claim.amount.toLocaleString()} points
                    </div>
                    <div className={`text-xs ${WCAG_CLASSES.text.onLight.secondary} mt-1`}>
                      <time dateTime={claim.timestamp}>{new Date(claim.timestamp).toLocaleString()}</time>
                    </div>
                  </div>
                  <button
                    {...keyboardProps}
                    disabled={claimingId === claim.id}
                    aria-busy={claimingId === claim.id}
                    aria-label={`Approve ${claim.username}'s claim for ${claim.amount.toLocaleString()} points`}
                    className={`px-4 py-2 bg-wcag-success-light hover:bg-wcag-success-dark text-white font-semibold rounded-lg transition-smooth ${BUTTON_SIZES.md} ${FOCUS_STYLES.ring} ${
                      claimingId === claim.id ? 'opacity-50 cursor-not-allowed' : 'opacity-100'
                    }`}
                  >
                    {claimingId === claim.id ? (
                      <>
                        <Loader size="small" variant="minimal" />
                        Approving...
                      </>
                    ) : (
                      'Approve'
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className={`text-xl font-bold ${WCAG_CLASSES.text.onLight.primary} mb-4`}>
          Transaction History
        </h2>
        {transactions.length === 0 ? (
          <p className={`text-center py-8 ${WCAG_CLASSES.text.onLight.secondary}`}>
            No transactions yet
          </p>
        ) : (
          <div className="space-y-3" role="list" aria-label="Treasury transaction history">
            {transactions.map(tx => {
              const ariaLabel = `${tx.username} ${tx.type === 'deposit' ? 'deposited' : 'claimed'} ${tx.amount.toLocaleString()} points on ${new Date(tx.timestamp).toLocaleString()}${tx.status === 'pending' ? ', pending approval' : ''}`
              
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                  role="listitem"
                  aria-label={ariaLabel}
                >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  tx.type === 'deposit' 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                }`}>
                  {tx.type === 'deposit' ? (
                    <KeyboardArrowUpIcon className="w-5 h-5" />
                  ) : (
                    <KeyboardArrowDownIcon className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-semibold ${WCAG_CLASSES.text.onLight.primary}`}>
                      {tx.username}
                    </span>
                    {tx.status === 'pending' && (
                      <span className="px-2 py-0.5 bg-wcag-warning-light dark:bg-wcag-warning-dark text-white text-xs font-medium rounded" aria-label="Status: pending approval">
                        Pending
                      </span>
                    )}
                  </div>
                  <div className={`text-sm ${WCAG_CLASSES.text.onLight.secondary}`}>
                    {tx.type === 'deposit' ? 'Deposited' : 'Claimed'} {tx.amount.toLocaleString()} points
                  </div>
                  <div className={`text-xs ${WCAG_CLASSES.text.onLight.secondary} mt-1`}>
                    <time dateTime={tx.timestamp}>{new Date(tx.timestamp).toLocaleString()}</time>
                  </div>
                </div>
                <div className={`text-right font-bold ${
                  tx.type === 'deposit'
                    ? 'text-wcag-success-light dark:text-wcag-success-dark'
                    : 'text-wcag-info-light dark:text-wcag-info-dark'
                }`} aria-label={`${tx.type === 'deposit' ? 'Increase' : 'Decrease'} of ${tx.amount.toLocaleString()} points`}>
                  {tx.type === 'deposit' ? '+' : '-'}{tx.amount.toLocaleString()}
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Dialog for notifications */}
      <Dialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogBackdrop />
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Treasury Action</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-gray-700 dark:text-gray-300">{dialogMessage}</p>
          </DialogBody>
          <DialogFooter>
            <button
              onClick={() => setDialogOpen(false)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              OK
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* XP Celebration Overlay */}
      <XPEventOverlay
        open={xpOverlayOpen}
        payload={xpPayload}
        onClose={() => setXpOverlayOpen(false)}
      />
    </div>
  )
}

export default GuildTreasury
