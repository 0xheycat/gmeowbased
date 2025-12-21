/**
 * Reward Claims History Component
 * 
 * Shows history of all reward claims for a user
 * 
 * Created: December 20, 2025
 * Reference: GAMING-PLATFORM-PATTERN.md
 */

'use client'

import { useEffect, useState } from 'react'
import { formatNumber } from '@/lib/utils/formatters'
import { formatDistanceToNow } from 'date-fns'

interface RewardClaim {
  id: string
  total_claimed: number
  viral_xp_claimed: number
  guild_bonus_claimed: number
  referral_bonus_claimed: number
  streak_bonus_claimed: number
  badge_prestige_claimed: number
  tx_hash: string | null
  claimed_at: string
}

interface ClaimHistoryProps {
  walletAddress: string
}

export function ClaimHistory({ walletAddress }: ClaimHistoryProps) {
  const [claims, setClaims] = useState<RewardClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  useEffect(() => {
    fetchClaimHistory()
  }, [walletAddress])
  
  const fetchClaimHistory = async () => {
    try {
      const response = await fetch(`/api/rewards/history?address=${walletAddress}`)
      const data = await response.json()
      setClaims(data.claims || [])
    } catch (error) {
      console.error('[Claim History] Error:', error)
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) {
    return (
      <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-1/3"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }
  
  if (claims.length === 0) {
    return (
      <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 p-6 text-center">
        <div className="text-4xl mb-2">📋</div>
        <h3 className="text-lg font-medium text-gray-400 mb-1">No Claims Yet</h3>
        <p className="text-sm text-gray-500">
          Your reward claims will appear here
        </p>
      </div>
    )
  }
  
  const totalClaimed = claims.reduce((sum, claim) => sum + claim.total_claimed, 0)
  
  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white">Claim History</h3>
        <div className="text-sm text-gray-400">
          {claims.length} claim{claims.length !== 1 ? 's' : ''}
        </div>
      </div>
      
      {/* Total Claimed */}
      <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-lg p-4 mb-4">
        <div className="text-sm text-gray-400 mb-1">Total Claimed</div>
        <div className="text-3xl font-bold text-green-400">
          {formatNumber(totalClaimed)}
        </div>
        <div className="text-xs text-gray-500">points</div>
      </div>
      
      {/* Claims List */}
      <div className="space-y-3">
        {claims.map((claim) => (
          <div 
            key={claim.id}
            className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4 hover:border-gray-600/50 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-lg font-bold text-yellow-400">
                  +{formatNumber(claim.total_claimed)}
                </div>
                <div className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(claim.claimed_at), { addSuffix: true })}
                </div>
              </div>
              
              <button
                onClick={() => setExpandedId(expandedId === claim.id ? null : claim.id)}
                className="text-xs text-gray-400 hover:text-gray-300"
              >
                {expandedId === claim.id ? '▼ Hide' : '▶ Details'}
              </button>
            </div>
            
            {/* Transaction Hash */}
            {claim.tx_hash && (
              <div className="mb-2">
                <a
                  href={`https://basescan.org/tx/${claim.tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 underline font-mono"
                >
                  View on Basescan →
                </a>
              </div>
            )}
            
            {/* Breakdown (Expanded) */}
            {expandedId === claim.id && (
              <div className="mt-3 pt-3 border-t border-gray-700/50 space-y-2">
                {claim.viral_xp_claimed > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-purple-400">🚀 Viral XP</span>
                    <span className="font-bold text-purple-400">
                      +{formatNumber(claim.viral_xp_claimed)}
                    </span>
                  </div>
                )}
                {claim.guild_bonus_claimed > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-400">⚔️ Guild Bonus</span>
                    <span className="font-bold text-blue-400">
                      +{formatNumber(claim.guild_bonus_claimed)}
                    </span>
                  </div>
                )}
                {claim.referral_bonus_claimed > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-400">👥 Referral Bonus</span>
                    <span className="font-bold text-green-400">
                      +{formatNumber(claim.referral_bonus_claimed)}
                    </span>
                  </div>
                )}
                {claim.streak_bonus_claimed > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-orange-400">🔥 Streak Bonus</span>
                    <span className="font-bold text-orange-400">
                      +{formatNumber(claim.streak_bonus_claimed)}
                    </span>
                  </div>
                )}
                {claim.badge_prestige_claimed > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-yellow-400">🏆 Badge Prestige</span>
                    <span className="font-bold text-yellow-400">
                      +{formatNumber(claim.badge_prestige_claimed)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
