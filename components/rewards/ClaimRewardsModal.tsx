/**
 * Claim Rewards Modal Component
 * 
 * Gaming Platform Pattern: Pending Rewards Claim Flow
 * 
 * Flow:
 * 1. Show pending rewards breakdown
 * 2. User clicks "Sign & Claim"
 * 3. Request wallet signature
 * 4. Submit to API
 * 5. Oracle deposits on-chain
 * 6. Show success + tx hash
 * 
 * Created: December 20, 2025
 * Reference: GAMING-PLATFORM-PATTERN.md
 */

'use client'

import { useState } from 'react'
import { useSignMessage } from 'wagmi'
import { useAccount } from 'wagmi'
import { formatNumber } from '@/lib/utils/formatters'

interface ClaimRewardsModalProps {
  isOpen: boolean
  onClose: () => void
  pendingRewards: number
  viralPoints: number
  guildBonus: number
  referralBonus: number
  streakBonus: number
  badgePrestige: number
  onSuccess: () => void
}

export function ClaimRewardsModal({
  isOpen,
  onClose,
  pendingRewards,
  viralPoints,
  guildBonus,
  referralBonus,
  streakBonus,
  badgePrestige,
  onSuccess,
}: ClaimRewardsModalProps) {
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [claiming, setClaiming] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  
  if (!isOpen) return null
  
  const handleClaim = async () => {
    if (!address) {
      console.error('Please connect your wallet')
      return
    }
    
    setClaiming(true)
    setTxHash(null)
    
    try {
      // Step 1: Request signature
      const message = `Claim ${pendingRewards} rewards at ${new Date().toISOString()}`
      
      console.log('Sign message to claim rewards...')
      const signature = await signMessageAsync({ message })
      
      // Step 2: Submit claim
      console.log('Processing claim...')
      const response = await fetch('/api/rewards/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          message,
          signature,
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setTxHash(data.tx_hash)
        console.log(`Claimed ${formatNumber(data.claimed)} points!`)
        
        // Wait 2 seconds to show success, then callback
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 2000)
      } else {
        console.error(data.error || 'Failed to claim rewards')
      }
    } catch (error: any) {
      console.error('[Claim] Error:', error)
      if (error.message?.includes('User rejected')) {
        console.error('Signature rejected')
      } else {
        console.error('Failed to claim rewards')
      }
    } finally {
      setClaiming(false)
    }
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={!claiming ? onClose : undefined}
      />
      
      {/* Modal */}
      <div className="relative bg-gradient-to-br from-purple-900 to-blue-900 rounded-2xl border border-purple-500/30 shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🎁</div>
          <h2 className="text-2xl font-bold text-white mb-1">
            Claim Pending Rewards
          </h2>
          <p className="text-gray-400 text-sm">
            Add rewards to your spendable balance
          </p>
        </div>
        
        {/* Total Amount */}
        <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 mb-6 text-center">
          <div className="text-sm text-yellow-400 mb-1">Total Rewards</div>
          <div className="text-4xl font-bold text-yellow-400">
            +{formatNumber(pendingRewards)}
          </div>
          <div className="text-xs text-gray-400 mt-1">points</div>
        </div>
        
        {/* Breakdown */}
        <div className="space-y-2 mb-6">
          <div className="text-sm font-medium text-gray-400 mb-2">Breakdown:</div>
          
          {viralPoints > 0 && (
            <div className="flex justify-between items-center px-3 py-2 bg-purple-500/10 rounded-lg">
              <span className="text-purple-400 text-sm">🚀 Viral XP</span>
              <span className="font-bold text-purple-400">+{formatNumber(viralPoints)}</span>
            </div>
          )}
          {guildBonus > 0 && (
            <div className="flex justify-between items-center px-3 py-2 bg-blue-500/10 rounded-lg">
              <span className="text-blue-400 text-sm">⚔️ Guild Bonus</span>
              <span className="font-bold text-blue-400">+{formatNumber(guildBonus)}</span>
            </div>
          )}
          {referralBonus > 0 && (
            <div className="flex justify-between items-center px-3 py-2 bg-green-500/10 rounded-lg">
              <span className="text-green-400 text-sm">👥 Referral Bonus</span>
              <span className="font-bold text-green-400">+{formatNumber(referralBonus)}</span>
            </div>
          )}
          {streakBonus > 0 && (
            <div className="flex justify-between items-center px-3 py-2 bg-orange-500/10 rounded-lg">
              <span className="text-orange-400 text-sm">🔥 Streak Bonus</span>
              <span className="font-bold text-orange-400">+{formatNumber(streakBonus)}</span>
            </div>
          )}
          {badgePrestige > 0 && (
            <div className="flex justify-between items-center px-3 py-2 bg-yellow-500/10 rounded-lg">
              <span className="text-yellow-400 text-sm">🏆 Badge Prestige</span>
              <span className="font-bold text-yellow-400">+{formatNumber(badgePrestige)}</span>
            </div>
          )}
        </div>
        
        {/* Info */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-6 text-xs text-gray-300 space-y-1">
          <p>✅ Rewards added to spendable balance</p>
          <p>⏱️ 24 hour cooldown between claims</p>
          <p>💰 Minimum claim: 100 points</p>
        </div>
        
        {/* Transaction Hash */}
        {txHash && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4 text-center">
            <div className="text-xs text-green-400 mb-1">Transaction Hash:</div>
            <a
              href={`https://basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-green-400 hover:text-green-300 underline break-all"
            >
              {txHash}
            </a>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={claiming}
            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
          >
            {txHash ? 'Close' : 'Cancel'}
          </button>
          
          {!txHash && (
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-xl disabled:shadow-none"
            >
              {claiming ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Claiming...
                </span>
              ) : (
                'Sign & Claim'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
