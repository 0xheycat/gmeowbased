/**
 * ReferralStatsCards Component - Phase 5: Hybrid Architecture Migration
 * 
 * Purpose: Display referral statistics in a responsive grid layout
 * Template: music/* loading states + ProfileStats.tsx pattern
 * 
 * @architecture Hybrid Data Layer
 * - Referral stats: Subsquid GraphQL (useReferralStatsByOwner + useReferralCodesByOwner)
 * - Aggregations: Client-side calculations from Subsquid data
 * - Tier badges: Contract call (getReferralTier)
 * 
 * Features:
 * - 4 stat cards: Code count, Total uses, Total rewards, Tier badge
 * - Real-time data from Subsquid (60s polling)
 * - Skeleton wave loading states
 * - Responsive 2x2 grid
 * 
 * Usage:
 * <ReferralStatsCards address="0x..." />
 */

'use client'

import { useState, useEffect } from 'react'
import type { Address } from 'viem'
import { PeopleIcon, TrendingUpIcon, Calendar, EmojiEventsIcon } from '@/components/icons'
import { useReferralStatsByOwner, useReferralCodesByOwner } from '@/hooks/useReferralSubsquid'
import { getReferralTier } from '@/lib/contracts/referral-contract'
import { Skeleton } from '@/components/ui/skeleton/Skeleton'

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
  // Fetch stats from Subsquid (real-time GraphQL with 60s polling)
  const { totalUses, totalRewards, codeCount, loading: statsLoading } = useReferralStatsByOwner(
    address?.toLowerCase()
  )
  const { codes, loading: codesLoading } = useReferralCodesByOwner(
    address?.toLowerCase(),
    1
  )
  
  // Fetch tier from contract (tier logic not in Subsquid)
  const [tier, setTier] = useState<number>(0)
  const [tierLoading, setTierLoading] = useState(true)

  useEffect(() => {
    const fetchTier = async () => {
      if (!address) return
      try {
        const userTier = await getReferralTier(address)
        setTier(userTier)
      } catch (err) {
        console.error('Failed to fetch tier:', err)
      } finally {
        setTierLoading(false)
      }
    }
    fetchTier()
  }, [address])

  const isLoading = statsLoading || codesLoading || tierLoading
  const referralCode = codes?.[0]?.id || null

  if (isLoading) {
    return (
      <div 
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}
        role="status"
        aria-live="polite"
        aria-label="Loading referral statistics"
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-white/10 bg-white/5 p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <Skeleton variant="rect" className="h-10 w-10 rounded-lg" animation="wave" />
              <Skeleton variant="text" className="h-4 w-16" animation="wave" />
            </div>
            <Skeleton variant="text" className="h-8 w-20 mb-2" animation="wave" />
            <Skeleton variant="text" className="h-4 w-24" animation="wave" />
          </div>
        ))}
      </div>
    )
  }

  const statCards = [
    {
      icon: PeopleIcon,
      label: 'Total uses',
      value: totalUses.toString(),
      description: 'All-time referrals',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: TrendingUpIcon,
      label: 'Points earned',
      value: Number(totalRewards).toLocaleString(),
      description: 'From referrals',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      icon: EmojiEventsIcon,
      label: 'Referral tier',
      value: TIER_NAMES[tier],
      description: tier === 3 ? 'Max tier!' : `${totalUses}/10 to Gold`,
      color: TIER_COLORS[tier as keyof typeof TIER_COLORS] || 'text-gray-400',
      bgColor: 'bg-yellow-500/10',
    },
    {
      icon: Calendar,
      label: 'Your code',
      value: referralCode || 'Not set',
      description: referralCode ? 'Share to earn' : 'Register a code',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
  ]

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
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
