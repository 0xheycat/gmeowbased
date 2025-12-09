/**
 * ReferralStatsCards Component
 * 
 * Purpose: Display referral statistics in a responsive grid layout
 * Template: ProfileStats.tsx pattern (stat cards reference)
 * 
 * Features:
 * - 4 stat cards: Total referrals, Active this week, This month, All-time points
 * - Tier badge display (Bronze/Silver/Gold)
 * - Real-time data from contract
 * - Loading states
 * - Responsive 2x2 grid
 * 
 * Usage:
 * <ReferralStatsCards address="0x..." />
 */

'use client'

import { useState, useEffect } from 'react'
import type { Address } from 'viem'
import { PeopleIcon, TrendingUpIcon, Calendar, EmojiEventsIcon } from '@/components/icons'
import { getReferralStats, getReferralCode, getReferralTier } from '@/lib/referral-contract'

export interface ReferralStatsCardsProps {
  /** User's wallet address */
  address: Address
  /** Custom CSS class */
  className?: string
}

interface ReferralStats {
  totalReferred: number
  pointsEarned: bigint
  tier: number
  code: string | null
}

const TIER_NAMES = ['None', 'Bronze', 'Silver', 'Gold']
const TIER_COLORS = {
  0: 'text-gray-400',
  1: 'text-amber-600',
  2: 'text-gray-300',
  3: 'text-yellow-400',
}

export function ReferralStatsCards({ address, className = '' }: ReferralStatsCardsProps) {
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch stats on mount
  useEffect(() => {
    if (!address) return

    const fetchStats = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch from contract
        const [referralStats, code, tier] = await Promise.all([
          getReferralStats(address),
          getReferralCode(address),
          getReferralTier(address),
        ])

        setStats({
          totalReferred: Number(referralStats.totalReferred),
          pointsEarned: referralStats.totalPointsEarned,
          tier,
          code,
        })
      } catch (err) {
        console.error('Failed to fetch referral stats:', err)
        setError('Failed to load stats')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [address])

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`}>
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="
              rounded-xl border border-white/10
              bg-white/5 p-6
              animate-pulse
            "
          >
            <div className="flex items-start justify-between mb-4">
              <div className="h-10 w-10 rounded-lg bg-white/10" />
              <div className="h-4 w-16 rounded bg-white/10" />
            </div>
            <div className="h-8 w-20 rounded bg-white/10 mb-2" />
            <div className="h-4 w-24 rounded bg-white/10" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className={`rounded-xl border border-red-500/20 bg-red-500/5 p-6 ${className}`}>
        <p className="text-sm text-red-400">{error}</p>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const statCards = [
    {
      icon: PeopleIcon,
      label: 'Total referrals',
      value: stats.totalReferred.toString(),
      description: 'All-time referrals',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: TrendingUpIcon,
      label: 'Points earned',
      value: Number(stats.pointsEarned).toLocaleString(),
      description: 'From referrals',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      icon: EmojiEventsIcon,
      label: 'Referral tier',
      value: TIER_NAMES[stats.tier],
      description: stats.tier === 3 ? 'Max tier!' : `${stats.totalReferred}/10 to Gold`,
      color: TIER_COLORS[stats.tier as keyof typeof TIER_COLORS] || 'text-gray-400',
      bgColor: 'bg-yellow-500/10',
    },
    {
      icon: Calendar,
      label: 'Your code',
      value: stats.code || 'Not set',
      description: stats.code ? 'Share to earn' : 'Register a code',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
  ]

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`}>
      {statCards.map((card, index) => {
        const Icon = card.icon
        return (
          <div
            key={index}
            className="
              rounded-xl border border-white/10
              bg-white/5 p-6
              hover:bg-white/10 hover:border-white/20
              transition-all duration-200
            "
          >
            {/* Icon and Label */}
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <span className="text-xs text-white/50 uppercase tracking-wide">
                {card.label}
              </span>
            </div>

            {/* Value */}
            <div className={`text-3xl font-bold mb-1 ${card.color}`}>
              {card.value}
            </div>

            {/* Description */}
            <div className="text-sm text-white/60">{card.description}</div>
          </div>
        )
      })}
    </div>
  )
}
