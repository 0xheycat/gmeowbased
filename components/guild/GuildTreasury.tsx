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
import { useAccount } from 'wagmi'
import { MonetizationOnIcon, KeyboardArrowUpIcon, KeyboardArrowDownIcon, AccessTimeIcon } from '@/components/icons'

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
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<TreasuryTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [isDepositing, setIsDepositing] = useState(false)

  useEffect(() => {
    const loadTreasury = async () => {
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

    loadTreasury()
  }, [guildId])

  const handleDeposit = async () => {
    const amount = parseInt(depositAmount)
    if (!address || !amount || amount <= 0) {
      alert('Please enter a valid amount')
      return
    }

    try {
      setIsDepositing(true)
      const response = await fetch(`/api/guild/${guildId}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, amount })
      })
      if (!response.ok) throw new Error('Failed to deposit')
      
      // Reload treasury
      window.location.reload()
    } catch (err) {
      console.error('Failed to deposit:', err)
      alert('Failed to deposit. Please try again.')
    } finally {
      setIsDepositing(false)
    }
  }

  const handleClaim = async (transactionId: string) => {
    if (!canManage || !confirm('Approve this claim?')) return

    try {
      const response = await fetch(`/api/guild/${guildId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId })
      })
      if (!response.ok) throw new Error('Failed to approve claim')
      window.location.reload()
    } catch (err) {
      console.error('Failed to approve claim:', err)
      alert('Failed to approve claim. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg h-32" />
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg h-64" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <p className="text-red-700 dark:text-red-300">{error}</p>
      </div>
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
      {address && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Deposit Points
          </h2>
          <div className="flex gap-3">
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Amount"
              min="1"
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
            />
            <button
              onClick={handleDeposit}
              disabled={isDepositing || !depositAmount}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors min-h-[44px] focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isDepositing ? 'Depositing...' : 'Deposit'}
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Contribute points from your balance to the guild treasury
          </p>
        </div>
      )}

      {/* Pending Claims (Admin Only) */}
      {canManage && pendingClaims.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AccessTimeIcon className="w-5 h-5" />
            Pending Claims ({pendingClaims.length})
          </h2>
          <div className="space-y-3">
            {pendingClaims.map(claim => (
              <div
                key={claim.id}
                className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {claim.username}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Requesting {claim.amount.toLocaleString()} points
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(claim.timestamp).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => handleClaim(claim.id)}
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
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Transaction History
        </h2>
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

export default GuildTreasury
