/**
 * Profile Balance Card Component
 * 
 * Gaming Platform Pattern: Display vs Spendable Balance
 * 
 * Shows:
 * - Total Score (display balance)
 * - Spendable Balance (on-chain)
 * - Pending Rewards (claimable)
 * - Breakdown of pending rewards
 * - Claim button
 * 
 * Created: December 20, 2025
 * Reference: GAMING-PLATFORM-PATTERN.md
 */

'use client'

import { useState } from 'react'
import { formatNumber } from '@/lib/utils/formatters'

interface BalanceCardProps {
  totalScore: number
  pointsBalance: number
  pendingRewards: number
  viralXp: number
  guildBonus: number
  referralBonus: number
  streakBonus: number
  badgePrestige: number
  canClaim: boolean
  hoursUntilClaim?: number
  onClaim: () => void
}

export function ProfileBalanceCard({
  totalScore,
  pointsBalance,
  pendingRewards,
  viralXp,
  guildBonus,
  referralBonus,
  streakBonus,
  badgePrestige,
  canClaim,
  hoursUntilClaim,
  onClaim,
}: BalanceCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  
  return (
    <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 backdrop-blur-sm rounded-xl border border-purple-500/20 p-6 shadow-xl">
      {/* Total Score (Display Balance) */}
      <div className="text-center mb-6">
        <div className="text-sm text-gray-400 uppercase tracking-wide mb-2">
          Total Score
        </div>
        <div className="text-5xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
          {formatNumber(totalScore)}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Display Balance (Leaderboard Ranking)
        </div>
      </div>
      
      {/* Balance Breakdown */}
      <div className="space-y-3 mb-6">
        {/* Spendable Balance */}
        <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
          <div>
            <div className="text-sm font-medium text-green-400">
              💰 Spendable Balance
            </div>
            <div className="text-xs text-gray-400">
              Can spend on badges, quests, tips
            </div>
          </div>
          <div className="text-2xl font-bold text-green-400">
            {formatNumber(pointsBalance)}
          </div>
        </div>
        
        {/* Pending Rewards */}
        <div className="flex justify-between items-center p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
          <div>
            <div className="text-sm font-medium text-yellow-400">
              🎁 Pending Rewards
            </div>
            <div className="text-xs text-gray-400">
              Claimable off-chain bonuses
            </div>
          </div>
          <div className="text-2xl font-bold text-yellow-400">
            {formatNumber(pendingRewards)}
          </div>
        </div>
      </div>
      
      {/* Claim Button */}
      {pendingRewards > 0 && (
        <button
          onClick={onClaim}
          disabled={!canClaim}
          className={`w-full py-3 px-4 rounded-lg font-bold text-lg transition-all ${
            canClaim
              ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          {canClaim ? (
            <>🎁 Claim {formatNumber(pendingRewards)} Rewards</>
          ) : (
            <>⏱️ Cooldown: {hoursUntilClaim}h remaining</>
          )}
        </button>
      )}
      
      {/* Reward Details Toggle */}
      {pendingRewards > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full text-sm text-gray-400 hover:text-gray-300 transition-colors flex items-center justify-center gap-2"
          >
            <span>{showDetails ? '▼' : '▶'} Reward Breakdown</span>
          </button>
          
          {showDetails && (
            <div className="mt-3 space-y-2 text-sm">
              {viralXp > 0 && (
                <div className="flex justify-between items-center px-3 py-2 bg-purple-500/10 rounded">
                  <span className="text-purple-400">🚀 Viral XP</span>
                  <span className="font-bold text-purple-400">+{formatNumber(viralXp)}</span>
                </div>
              )}
              {guildBonus > 0 && (
                <div className="flex justify-between items-center px-3 py-2 bg-blue-500/10 rounded">
                  <span className="text-blue-400">⚔️ Guild Bonus</span>
                  <span className="font-bold text-blue-400">+{formatNumber(guildBonus)}</span>
                </div>
              )}
              {referralBonus > 0 && (
                <div className="flex justify-between items-center px-3 py-2 bg-green-500/10 rounded">
                  <span className="text-green-400">👥 Referral Bonus</span>
                  <span className="font-bold text-green-400">+{formatNumber(referralBonus)}</span>
                </div>
              )}
              {streakBonus > 0 && (
                <div className="flex justify-between items-center px-3 py-2 bg-orange-500/10 rounded">
                  <span className="text-orange-400">🔥 Streak Bonus</span>
                  <span className="font-bold text-orange-400">+{formatNumber(streakBonus)}</span>
                </div>
              )}
              {badgePrestige > 0 && (
                <div className="flex justify-between items-center px-3 py-2 bg-yellow-500/10 rounded">
                  <span className="text-yellow-400">🏆 Badge Prestige</span>
                  <span className="font-bold text-yellow-400">+{formatNumber(badgePrestige)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Info Footer */}
      <div className="mt-4 pt-4 border-t border-gray-700/50 text-xs text-gray-500 text-center">
        <p>Total Score = Spendable + Pending</p>
        <p className="mt-1">Claim rewards to add them to your spendable balance</p>
      </div>
    </div>
  )
}
