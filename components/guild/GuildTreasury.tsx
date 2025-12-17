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
import { MonetizationOnIcon, KeyboardArrowUpIcon, KeyboardArrowDownIcon, AccessTimeIcon } from '@/components/icons'
import { Dialog, DialogBackdrop, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/dialogs'
import Loader from '@/components/ui/gmeow-loader'
import { Skeleton } from '@/components/ui/skeleton/Skeleton'
import { createKeyboardHandler, FOCUS_STYLES, WCAG_CLASSES, BUTTON_SIZES, LOADING_ARIA, ERROR_ARIA } from '@/lib/utils/accessibility'
import { XPEventOverlay, type XpEventPayload } from '@/components/XPEventOverlay'

export interface TreasuryTransaction {
  id: string
  type: 'deposit' | 'claim'
  amount: number
  from: string
  username: string
  timestamp: string
  status: 'completed' | 'pending'
}

export interface GuildTreasuryProps {
  guildId: string
  canManage?: boolean
}

export function GuildTreasury({ guildId, canManage = false }: GuildTreasuryProps) {
  const { address } = useAccount()
  const { writeContract, data: hash, error: writeError, isPending: isWriting } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash })
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<TreasuryTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [isDepositing, setIsDepositing] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMessage, setDialogMessage] = useState('')
  const [isMember, setIsMember] = useState(false)
  
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
        // Membership check failed
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
        if (!response.ok) throw new Error('Failed to load treasury')
        const data = await response.json()
        setBalance(data.balance || 0)
        setTransactions(data.transactions || [])
      } catch (err) {
        setError('Failed to load treasury. Please refresh the page.')
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
        setDialogMessage(data.message || 'Unable to process deposit. Please check your wallet and try again.')
        setDialogOpen(true)
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
      setDialogMessage('Deposit failed. Please check your connection and try again.')
      setDialogOpen(true)
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
      
      // Trigger XP celebration for treasury contribution
      const payload: XpEventPayload = {
        event: 'guild',
        chainKey: 'base',
        xpEarned: 20,
        totalPoints: 0, // Will be calculated by overlay
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
      setDialogMessage('Transaction failed. Please try again.')
      setDialogOpen(true)
      setIsDepositing(false)
    }
  }, [writeError])

  const handleClaim = async (transactionId: string) => {
    if (!canManage) return

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
          }
        } catch (err) {
        }
      }, 2000)
    } catch (err) {
      setDialogMessage('Claim approval failed. Please check your connection and try again.')
      setDialogOpen(true)
    }
  }

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
          {balance.toLocaleString()}
        </div>
        <div className="text-sm opacity-75">
          BASE POINTS
        </div>
      </div>

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
              className={`px-6 py-3 bg-wcag-info-light hover:bg-wcag-info-dark disabled:bg-gray-400 text-white font-semibold rounded-lg transition-smooth ${BUTTON_SIZES.md} ${FOCUS_STYLES.ring} flex items-center gap-2`}
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
                    aria-label={`Approve ${claim.username}'s claim for ${claim.amount.toLocaleString()} points`}
                    className={`px-4 py-2 bg-wcag-success-light hover:bg-wcag-success-dark text-white font-semibold rounded-lg transition-smooth ${BUTTON_SIZES.md} ${FOCUS_STYLES.ring}`}
                  >
                    Approve
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
