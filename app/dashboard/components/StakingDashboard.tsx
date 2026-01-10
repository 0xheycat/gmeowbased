/**
 * StakingDashboard - Badge Staking Interface
 * Phase 8.1.5: UI Components - Staking UI
 * 
 * Features:
 * - Display staked badges with stats
 * - Available badges to stake
 * - Staking actions (Stake/Unstake)
 * - Staking stats (total staked, rewards, APY)
 * 
 * Note: Backend integration requires Phase 8.3 (Staking Events)
 * Current: UI shell with placeholder data
 */

'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useStakeBadge, useUnstakeBadge } from '@/lib/contracts'
import Image from 'next/image'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import LockIcon from '@mui/icons-material/Lock'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import { cn } from '@/lib/utils'

interface StakedBadge {
  id: string
  name: string
  image: string
  stakedAmount: number
  rewardsEarned: number
  apy: number
  stakedAt: Date
}

export function StakingDashboard({ userWallet }: { userWallet?: string }) {
  const { address } = useAccount()
  const { unstakeBadge, isPending: isUnstaking, isConfirming: isUnstakeConfirming, isSuccess: unstakeSuccess } = useUnstakeBadge()
  const { stakeBadge, isPending: isStaking, isConfirming: isStakeConfirming, isSuccess: stakeSuccess } = useStakeBadge()
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [stakedBadges, setStakedBadges] = useState<StakedBadge[]>([])
  const [availableBadges, setAvailableBadges] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalStaked: 0,
    totalRewards: 0,
    avgApy: 0,
  })

  // Use provided wallet or connected wallet
  const walletAddress = userWallet || address

  // Load staking data from API
  useEffect(() => {
    if (!walletAddress || isLoading) return

    setIsLoading(true)

    // Fetch staked badges and stats
    Promise.all([
      fetch(`/api/staking/stakes?user=${walletAddress}`).then(r => r.json()),
      fetch(`/api/staking/badges?user=${walletAddress}`).then(r => r.json()),
    ])
      .then(([stakesData, badgesData]) => {
        // Map staked badges
        if (stakesData.stakes) {
          const mapped = stakesData.stakes.map((s: any) => ({
            id: s.badgeId,
            name: s.badge.name,
            image: s.badge.imageUrl,
            stakedAmount: 1,
            rewardsEarned: parseFloat(s.rewardsEarned) / 1e18, // Convert from wei
            apy: 15.2, // TODO: Calculate from contract
            stakedAt: new Date(s.stakedAt),
          }))
          setStakedBadges(mapped)
        }

        // Update stats
        if (stakesData.stats) {
          setStats({
            totalStaked: stakesData.stats.activeBadges,
            totalRewards: parseFloat(stakesData.stats.totalRewards) / 1e18,
            avgApy: 15.2, // TODO: Calculate weighted average
          })
        }

        // Map available badges
        if (badgesData.badges) {
          setAvailableBadges(badgesData.badges.filter((b: any) => b.canStake))
        }
      })
      .catch(err => {
        console.error('Failed to load staking data:', err)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [walletAddress])

  // Reload data on successful transactions
  useEffect(() => {
    if (stakeSuccess || unstakeSuccess) {
      // Reload staking data after 2 seconds (allow indexer to catch up)
      setTimeout(() => {
        setIsLoading(true)
        Promise.all([
          fetch(`/api/staking/stakes?user=${walletAddress}`).then(r => r.json()),
          fetch(`/api/staking/badges?user=${walletAddress}`).then(r => r.json()),
        ])
          .then(([stakesData, badgesData]) => {
            if (stakesData.stakes) {
              const mapped = stakesData.stakes.map((s: any) => ({
                id: s.badgeId,
                name: s.badge.name,
                image: s.badge.imageUrl,
                stakedAmount: 1,
                rewardsEarned: parseFloat(s.rewardsEarned) / 1e18,
                apy: 15.2,
                stakedAt: new Date(s.stakedAt),
              }))
              setStakedBadges(mapped)
            }
            if (stakesData.stats) {
              setStats({
                totalStaked: stakesData.stats.activeBadges,
                totalRewards: parseFloat(stakesData.stats.totalRewards) / 1e18,
                avgApy: 15.2,
              })
            }
            if (badgesData.badges) {
              setAvailableBadges(badgesData.badges.filter((b: any) => b.canStake))
            }
          })
          .finally(() => setIsLoading(false))
      }, 2000)
    }
  }, [stakeSuccess, unstakeSuccess, walletAddress])

  const totalStaked = stats.totalStaked
  const totalRewards = stats.totalRewards
  const avgApy = stats.avgApy

  // Show connect wallet message if no wallet
  if (!walletAddress) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 border border-gray-200 dark:border-gray-700 text-center">
        <AccountBalanceWalletIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Connect Your Wallet
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Connect your wallet to view and manage your staked badges
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Staked */}
        <div className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-2xl p-6 border border-primary-200 dark:border-primary-800">
          <div className="flex items-center gap-2 mb-2">
            <LockIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <span className="text-sm font-semibold text-primary-700 dark:text-primary-300 uppercase">
              Total Staked
            </span>
          </div>
          <p className="text-4xl font-bold text-primary-600 dark:text-primary-400">
            {totalStaked}
          </p>
          <p className="text-sm text-primary-600/70 dark:text-primary-400/70 mt-1">
            Badge{totalStaked !== 1 ? 's' : ''} locked
          </p>
        </div>

        {/* Total Rewards */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-2xl p-6 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <EmojiEventsIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-semibold text-green-700 dark:text-green-300 uppercase">
              Rewards Earned
            </span>
          </div>
          <p className="text-4xl font-bold text-green-600 dark:text-green-400">
            {totalRewards.toFixed(1)}
          </p>
          <p className="text-sm text-green-600/70 dark:text-green-400/70 mt-1">
            Points accumulated
          </p>
        </div>

        {/* Average APY */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUpIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase">
              Average APY
            </span>
          </div>
          <p className="text-4xl font-bold text-gray-900 dark:text-white">
            {avgApy.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Annual yield rate
          </p>
        </div>
      </div>

      {/* Staked Badges */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <LockIcon className="w-6 h-6" />
          Staked Badges
        </h2>

        {stakedBadges.length === 0 ? (
          <div className="text-center py-12">
            <LockIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-lg text-gray-500 dark:text-gray-400">
              No badges staked yet
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Stake your badges below to earn rewards
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stakedBadges.map((badge) => (
              <div
                key={badge.id}
                className="relative group bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 rounded-xl p-6 border-2 border-primary-200 dark:border-primary-800 hover:border-primary-400 dark:hover:border-primary-600 transition-all"
              >
                {/* Badge Image Placeholder */}
                <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center text-white text-4xl font-bold">
                  {badge.name[0]}
                </div>

                <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-2">
                  {badge.name}
                </h3>

                {/* Stats */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Staked:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {badge.stakedAmount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Rewards:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      +{badge.rewardsEarned.toFixed(1)} pts
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">APY:</span>
                    <span className="font-semibold text-primary-600 dark:text-primary-400">
                      {badge.apy}%
                    </span>
                  </div>
                </div>

                {/* Unstake Button */}
                <button
                  className="w-full mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => unstakeBadge(BigInt(badge.id))}
                  disabled={isUnstaking || isUnstakeConfirming}
                >
                  {isUnstaking || isUnstakeConfirming ? 'Unstaking...' : 'Unstake'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Badges to Stake */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <AccountBalanceWalletIcon className="w-6 h-6" />
          Available to Stake
        </h2>

        {availableBadges.length === 0 ? (
          <div className="text-center py-12">
            <AccountBalanceWalletIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-lg text-gray-500 dark:text-gray-400">
              No badges available
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Complete quests to earn badges
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableBadges.map((badge) => (
              <div
                key={badge.id}
                className={cn(
                  'relative group bg-white dark:bg-gray-700 rounded-xl p-6 border-2 transition-all cursor-pointer',
                  selectedBadge === badge.id
                    ? 'border-primary-500 dark:border-primary-400 ring-2 ring-primary-200 dark:ring-primary-800'
                    : 'border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-700'
                )}
                onClick={() => setSelectedBadge(badge.id)}
              >
                {/* Badge Image Placeholder */}
                <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-gray-300 to-gray-400 rounded-2xl flex items-center justify-center text-white text-4xl font-bold">
                  {badge.name[0]}
                </div>

                <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-2">
                  {badge.name}
                </h3>

                <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
                  Owned: {badge.owned}
                </p>

                {/* Stake Button */}
                <button
                  className="w-full px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => stakeBadge(BigInt(badge.id))}
                  disabled={isStaking || isStakeConfirming}
                >
                  {isStaking || isStakeConfirming ? 'Staking...' : 'Stake'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
