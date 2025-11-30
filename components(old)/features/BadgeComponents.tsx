/**
 * Badge Components - Gmeowbased
 * Responsive grid with rarity system
 * Integrated with Gmeowbased badge illustrations
 */

'use client'

import React from 'react'
import Image from 'next/image'
import { badges } from '@/utils/assets'

export type BadgeRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic'

export interface Badge {
  id: string
  name: string
  description: string
  rarity: BadgeRarity
  image: string
  unlockedAt?: string
  isLocked?: boolean
}

interface BadgeCardProps {
  badge: Badge
}

const rarityConfig = {
  Common: { color: 'theme-text-secondary', bgColor: 'theme-bg-subtle', borderColor: 'theme-border-subtle' },
  Rare: { color: 'text-blue-600', bgColor: 'theme-bg-info-subtle', borderColor: 'border-blue-300' },
  Epic: { color: 'text-purple-600', bgColor: 'theme-bg-brand-subtle', borderColor: 'border-purple-300' },
  Legendary: { color: 'text-orange-600', bgColor: 'theme-bg-warning-subtle', borderColor: 'border-orange-300' },
  Mythic: { color: 'text-red-600', bgColor: 'theme-bg-danger-subtle', borderColor: 'border-red-300' },
}

export function BadgeCard({ badge }: BadgeCardProps) {
  const config = rarityConfig[badge.rarity]

  return (
    <div className={`card hover:shadow-lg transition-all ${badge.isLocked ? 'opacity-60' : ''} ${config.borderColor} border-2`}>
      <div className="card-body p-4 text-center">
        <div className="relative mb-3">
          <Image
            src={badge.image}
            alt={badge.name}
            width={80}
            height={80}
            className={`mx-auto ${badge.isLocked ? 'grayscale' : ''}`}
          />
          {badge.isLocked && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl">🔒</span>
            </div>
          )}
        </div>
        
        <h6 className="text-sm font-semibold text-default-800 mb-1">{badge.name}</h6>
        
        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${config.bgColor} ${config.color}`}>
          {badge.rarity}
        </span>
        
        {badge.unlockedAt && !badge.isLocked && (
          <p className="text-xs text-default-500 mt-2">
            Unlocked {new Date(badge.unlockedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  )
}

interface BadgeGridProps {
  badges: Badge[]
}

export function BadgeGrid({ badges }: BadgeGridProps) {
  return (
    <div className="grid lg:grid-cols-6 md:grid-cols-4 sm:grid-cols-3 grid-cols-2 gap-4">
      {badges.map(badge => (
        <BadgeCard key={badge.id} badge={badge} />
      ))}
    </div>
  )
}

interface BadgeStatsProps {
  totalBadges: number
  unlocked: number
  rare: number
  legendary: number
}

export function BadgeStats({ totalBadges, unlocked, rare, legendary }: BadgeStatsProps) {
  const percentage = Math.round((unlocked / totalBadges) * 100)

  return (
    <div className="card mb-6">
      <div className="card-body">
        <h5 className="card-title mb-4">Badge Collection Progress</h5>
        
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-1">{unlocked}/{totalBadges}</div>
            <p className="text-sm text-default-600">Badges Unlocked</p>
            <div className="w-full bg-default-200 rounded-full h-2 mt-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="text-xs text-default-500 mt-1">{percentage}% Complete</p>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">{rare}</div>
            <p className="text-sm text-default-600">Rare Badges</p>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-1">{legendary}</div>
            <p className="text-sm text-default-600">Legendary Badges</p>
          </div>

          <div className="text-center">
            <div className="text-3xl mb-1">🏆</div>
            <p className="text-sm text-default-600">Collector Status</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function BadgeRarityGuide() {
  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title mb-4">Rarity Guide</h5>
        <div className="grid lg:grid-cols-5 md:grid-cols-3 gap-3">
          {(Object.keys(rarityConfig) as BadgeRarity[]).map(rarity => {
            const config = rarityConfig[rarity]
            return (
              <div key={rarity} className={`p-3 rounded-lg text-center ${config.bgColor}`}>
                <span className={`font-semibold ${config.color}`}>{rarity}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/**
 * BadgeGallery - Wrapper component combining BadgeGrid with optional click handling
 */
interface BadgeGalleryProps {
  badges: Badge[]
  onBadgeClick?: (badgeId: string) => void
}

export function BadgeGallery({ badges, onBadgeClick }: BadgeGalleryProps) {
  return <BadgeGrid badges={badges} />
}
