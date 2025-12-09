/**
 * GuildTreasuryPanel Component
 * 
 * Purpose: Comprehensive treasury management with deposits, claims, and transaction history
 * Template: trezoadmin-41/treasury (40%) + gmeowbased0.6 layout (15%)
 * 
 * Features:
 * - Treasury balance with gradient display
 * - Deposit form with validation
 * - Claim request form (members can request rewards)
 * - Pending claims list (admins can approve/reject)
 * - Transaction history with filters
 * - Real-time updates
 * 
 * Usage:
 * <GuildTreasuryPanel guildId="123" userAddress="0x..." isAdmin={true} />
 */

'use client'

import { useState, useEffect } from 'react'
import type { Address } from 'viem'
import { 
  MonetizationOnIcon, 
  KeyboardArrowUpIcon, 
  KeyboardArrowDownIcon, 
  AccessTimeIcon,
  TrendingUpIcon,
  GroupIcon
} from '@/components/icons'

export interface TreasuryTransaction {
  id: string
  type: 'deposit' | 'claim' | 'reward'
  amount: number
  from: string
  to?: string
  username: string
  timestamp: string
  status: 'completed' | 'pending' | 'rejected'
  note?: string
}

export interface GuildTreasuryPanelProps {
  /** Guild ID */
  guildId: string
  /** User's wallet address */
  userAddress: Address
  /** Is user admin (owner or officer) */
  isAdmin?: boolean
  /** Custom CSS class */
  className?: string
}

export function GuildTreasuryPanel({ 
  guildId, 
  userAddress,
  isAdmin = false,
  className = '' 
}: GuildTreasuryPanelProps) {
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<TreasuryTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Deposit state
  const [depositAmount, setDepositAmount] = useState('')
  const [isDepositing, setIsDepositing] = useState(false)
  
  // Claim state
  const [claimAmount, setClaimAmount] = useState('')
  const [claimNote, setClaimNote] = useState('')
  const [isClaiming, setIsClaiming] = useState(false)

  useEffect(() => {
    loadTreasuryData()
  }, [guildId])

  const loadTreasuryData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/guild/${guildId}/treasury`)
      if (!response.ok) throw new Error('Failed to load treasury')
      
      const data = await response.json()
      setBalance(data.balance || 0)
      setTransactions(data.transactions || [])
    } catch (err) {
      console.error('Failed to load treasury:', err)
      setError('Failed to load treasury. Please refresh the page.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeposit = async () => {
    const amount = parseInt(depositAmount)
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount')
      return
    }

    setIsDepositing(true)
    try {
      const response = await fetch(`/api/guild/${guildId}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: userAddress,
          amount
        })
      })

      if (!response.ok) throw new Error('Failed to deposit')
      
      setDepositAmount('')
      await loadTreasuryData()
    } catch (err) {
      console.error('Failed to deposit:', err)
      alert('Failed to deposit. Please try again.')
    } finally {
      setIsDepositing(false)
    }
  }

  const handleClaim = async () => {
    const amount = parseInt(claimAmount)
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount')
      return
    }

    setIsClaiming(true)
    try {
      const response = await fetch(`/api/guild/${guildId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: userAddress,
          amount,
          note: claimNote.trim() || undefined
        })
      })

      if (!response.ok) throw new Error('Failed to submit claim')
      
      setClaimAmount('')
      setClaimNote('')
      await loadTreasuryData()
      alert('Claim request submitted! Waiting for admin approval.')
    } catch (err) {
      console.error('Failed to submit claim:', err)
      alert('Failed to submit claim. Please try again.')
    } finally {
      setIsClaiming(false)
    }
  }

  const handleApproveClaim = async (transactionId: string) => {
    if (!confirm('Approve this claim request?')) return

    try {
      const response = await fetch(`/api/guild/${guildId}/claim/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId })
      })

      if (!response.ok) throw new Error('Failed to approve claim')
      await loadTreasuryData()
    } catch (err) {
      console.error('Failed to approve claim:', err)
      alert('Failed to approve claim. Please try again.')
    }
  }

  const pendingClaims = transactions.filter(t => t.type === 'claim' && t.status === 'pending')

  if (isLoading) {
    return (
      <div className={`animate-pulse space-y-6 ${className}`}>
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg h-32" />
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg h-64" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 ${className}`}>
        <p className="text-red-700 dark:text-red-300">{error}</p>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
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

      {/* Forms Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deposit Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Deposit Points
          </h3>
          <div className="space-y-4">
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Amount"
              min="1"
              disabled={isDepositing}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
            />
            <button
              onClick={handleDeposit}
              disabled={isDepositing || !depositAmount}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors min-h-[44px] focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              {isDepositing ? 'Depositing...' : 'Deposit'}
            </button>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Contribute points from your balance to the guild treasury
            </p>
          </div>
        </div>

        {/* Claim Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Request Claim
          </h3>
          <div className="space-y-4">
            <input
              type="number"
              value={claimAmount}
              onChange={(e) => setClaimAmount(e.target.value)}
              placeholder="Amount"
              min="1"
              disabled={isClaiming}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
            />
            <textarea
              value={claimNote}
              onChange={(e) => setClaimNote(e.target.value)}
              placeholder="Reason for claim (optional)"
              disabled={isClaiming}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleClaim}
              disabled={isClaiming || !claimAmount}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors min-h-[44px] focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isClaiming ? 'Submitting...' : 'Request Claim'}
            </button>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Submit a claim request for admin approval
            </p>
          </div>
        </div>
      </div>

      {/* Pending Claims (Admin Only) */}
      {isAdmin && pendingClaims.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AccessTimeIcon className="w-5 h-5" />
            Pending Claims ({pendingClaims.length})
          </h3>
          <div className="space-y-3">
            {pendingClaims.map(claim => (
              <div
                key={claim.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {claim.username}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Requesting {claim.amount.toLocaleString()} points
                  </div>
                  {claim.note && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      "{claim.note}"
                    </div>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(claim.timestamp).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => handleApproveClaim(claim.id)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors min-h-[44px] focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Approve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Transaction History
        </h3>
        {transactions.length === 0 ? (
          <p className="text-center py-8 text-gray-600 dark:text-gray-400">
            No transactions yet
          </p>
        ) : (
          <div className="space-y-3">
            {transactions.map(tx => (
              <div
                key={tx.id}
                className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
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
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {tx.username}
                    </span>
                    {tx.status === 'pending' && (
                      <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs font-medium rounded">
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {tx.type === 'deposit' ? 'Deposited' : 'Claimed'} {tx.amount.toLocaleString()} points
                  </div>
                  {tx.note && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      "{tx.note}"
                    </div>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(tx.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className={`text-right font-bold ${
                  tx.type === 'deposit'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-blue-600 dark:text-blue-400'
                }`}>
                  {tx.type === 'deposit' ? '+' : '-'}{tx.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default GuildTreasuryPanel
