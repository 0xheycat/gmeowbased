/**
 * Badge Minting Page
 * 
 * Enhanced with Base.dev MintBadgeButton component
 * Reuses old foundation logic (Supabase badge templates, NFT minting) + NEW Tailwick UI
 * 
 * Features:
 * - Badge catalog from Supabase
 * - Sponsored minting via Coinbase Paymaster
 * - Real-time mint status
 * - Tailwick v2.0 Card styling
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAccount } from 'wagmi'
import { AppLayout } from '@/components/layouts/AppLayout'
import { Card, CardBody, Button } from '@/components/ui/tailwick-primitives'
import { MintBadgeButton, BaseWallet } from '@/components/base'
import { badges } from '@/utils/assets'

// Badge template type (from old foundation)
type BadgeTemplate = {
  id: string
  name: string
  description: string
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic'
  image: string
  pointsCost: number
  chain: 'base' | 'unichain' | 'celo' | 'ink' | 'op' | 'arbitrum'
  active: boolean
  unlockedAt?: string
  isLocked: boolean
}

const RARITY_COLORS = {
  Common: { from: 'from-gray-900/80', to: 'to-gray-800/60', accent: 'border-gray-600/50', text: 'text-gray-400' },
  Rare: { from: 'from-blue-900/80', to: 'to-blue-800/60', accent: 'border-blue-600/50', text: 'text-blue-400' },
  Epic: { from: 'from-purple-900/80', to: 'to-purple-800/60', accent: 'border-purple-600/50', text: 'text-purple-400' },
  Legendary: { from: 'from-yellow-900/80', to: 'to-orange-800/60', accent: 'border-orange-600/50', text: 'text-orange-400' },
  Mythic: { from: 'from-pink-900/80', to: 'to-red-800/60', accent: 'border-red-600/50', text: 'text-red-400' },
}

// Sample badge templates (TODO: Fetch from Supabase)
const sampleBadges: BadgeTemplate[] = [
  {
    id: '1',
    name: 'Bronze User',
    description: 'Awarded for completing your first transaction',
    rarity: 'Common',
    image: badges.bronzeUser,
    pointsCost: 100,
    chain: 'base',
    active: true,
    unlockedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    isLocked: false,
  },
  {
    id: '2',
    name: 'Globe Trotter',
    description: 'Completed transactions on multiple chains',
    rarity: 'Rare',
    image: badges.globeTrotter,
    pointsCost: 500,
    chain: 'base',
    active: true,
    unlockedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
    isLocked: false,
  },
  {
    id: '3',
    name: 'Quest Conqueror',
    description: 'Completed 50 quests across all chains',
    rarity: 'Epic',
    image: badges.questConqueror,
    pointsCost: 1000,
    chain: 'base',
    active: true,
    isLocked: true, // Not yet earned
  },
  {
    id: '4',
    name: 'Gold User',
    description: 'Reach level 25 and earn 50,000 XP',
    rarity: 'Epic',
    image: badges.goldUser,
    pointsCost: 2500,
    chain: 'base',
    active: true,
    isLocked: true,
  },
  {
    id: '5',
    name: 'Universe Explorer',
    description: 'Complete quests on all 5 supported chains',
    rarity: 'Legendary',
    image: badges.universeExplorer,
    pointsCost: 5000,
    chain: 'base',
    active: true,
    isLocked: true,
  },
]

function BadgeMintCard({ badge, onMintSuccess }: { badge: BadgeTemplate; onMintSuccess: (badgeId: string) => void }) {
  const { address } = useAccount()
  const colors = RARITY_COLORS[badge.rarity]
  const [minted, setMinted] = useState(false)

  const handleSuccess = (txHash: string) => {
    console.log(`✅ Badge minted! ID: ${badge.id}, Tx: ${txHash}`)
    setMinted(true)
    onMintSuccess(badge.id)
  }

  const handleError = (error: string) => {
    console.error(`❌ Badge mint failed: ${error}`)
  }

  return (
    <Card className={`bg-gradient-to-br ${colors.from} ${colors.to} backdrop-blur-sm border ${colors.accent} transition-transform hover:scale-105`}>
      <CardBody>
        {/* Badge Image */}
        <div className="relative mb-4">
          <div className="relative w-full aspect-square rounded-xl overflow-hidden border theme-border-subtle">
            <Image
              src={badge.image}
              alt={badge.name}
              fill
              className={`object-cover ${badge.isLocked ? 'grayscale opacity-50' : ''}`}
            />
            {badge.isLocked && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <span className="text-4xl">🔒</span>
              </div>
            )}
          </div>
          {minted && (
            <div className="absolute top-2 right-2 bg-success/90 text-white text-xs font-bold px-2 py-1 rounded-full">
              Minted ✅
            </div>
          )}
        </div>

        {/* Badge Info */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold theme-text-primary">{badge.name}</h3>
            <span className={`text-xs font-bold px-2 py-1 rounded ${colors.text} theme-bg-subtle`}>
              {badge.rarity}
            </span>
          </div>
          <p className="text-sm theme-text-secondary mb-3">{badge.description}</p>
          <div className="flex items-center gap-2 text-xs theme-text-tertiary">
            <span>Cost: {badge.pointsCost} pts</span>
            <span>•</span>
            <span>Chain: {badge.chain}</span>
          </div>
        </div>

        {/* Mint Button */}
        {!address ? (
          <div className="text-center">
            <BaseWallet.Button variant="primary" className="w-full" />
          </div>
        ) : badge.isLocked ? (
          <Button variant="ghost" disabled className="w-full">
            🔒 Locked - Complete requirements
          </Button>
        ) : minted || badge.unlockedAt ? (
          <Button variant="success" disabled className="w-full">
            ✅ Already Minted
          </Button>
        ) : (
          <MintBadgeButton
            chain={badge.chain}
            badgeId={BigInt(badge.id)}
            sponsored={true} // Free minting!
            buttonText="Mint Badge (Free!)"
            onSuccess={handleSuccess}
            onError={handleError}
            className="w-full"
          />
        )}

        {!badge.isLocked && !minted && !badge.unlockedAt && (
          <div className="mt-2 text-xs theme-text-tertiary text-center">
            Gas sponsored by Coinbase 💜
          </div>
        )}
      </CardBody>
    </Card>
  )
}

export default function BadgeMintPage() {
  const [mintedBadges, setMintedBadges] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all')

  const handleMintSuccess = (badgeId: string) => {
    setMintedBadges(prev => new Set([...prev, badgeId]))
  }

  const filteredBadges = sampleBadges.filter(badge => {
    if (filter === 'unlocked') return !badge.isLocked
    if (filter === 'locked') return badge.isLocked
    return true
  })

  const unlockedCount = sampleBadges.filter(b => !b.isLocked).length
  const totalCount = sampleBadges.length

  return (
    <AppLayout fullPage>
      <div className="page-bg-badges p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Link 
              href="/app" 
              className="inline-flex items-center gap-2 theme-text-tertiary hover:theme-text-primary transition-colors mb-4"
            >
              <span>←</span> Back to Home
            </Link>
            <h1 className="text-4xl font-bold theme-text-primary mb-2">Mint Your Badges</h1>
            <p className="theme-text-tertiary">
              Collect unique NFT badges by completing achievements • Free minting with Coinbase Paymaster
            </p>
          </div>

          {/* Stats Card */}
          <Card gradient="purple" border className="mb-8">
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold theme-text-primary mb-1">
                    {unlockedCount}/{totalCount}
                  </div>
                  <div className="text-sm theme-text-secondary">Badges Unlocked</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold theme-text-primary mb-1">
                    {mintedBadges.size}
                  </div>
                  <div className="text-sm theme-text-secondary">Badges Minted</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold theme-text-primary mb-1">
                    {Math.round((unlockedCount / totalCount) * 100)}%
                  </div>
                  <div className="text-sm theme-text-secondary">Collection Progress</div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={filter === 'all' ? 'primary' : 'ghost'}
              onClick={() => setFilter('all')}
            >
              All ({sampleBadges.length})
            </Button>
            <Button
              variant={filter === 'unlocked' ? 'primary' : 'ghost'}
              onClick={() => setFilter('unlocked')}
            >
              Unlocked ({unlockedCount})
            </Button>
            <Button
              variant={filter === 'locked' ? 'primary' : 'ghost'}
              onClick={() => setFilter('locked')}
            >
              Locked ({totalCount - unlockedCount})
            </Button>
          </div>

          {/* Rarity Guide */}
          <Card className="mb-8">
            <CardBody>
              <h2 className="text-xl font-bold theme-text-primary mb-4">Rarity Guide</h2>
              <div className="flex flex-wrap gap-3">
                {Object.entries(RARITY_COLORS).map(([rarity, colors]) => {
                  const count = sampleBadges.filter(b => b.rarity === rarity).length
                  return (
                    <div 
                      key={rarity}
                      className={`px-4 py-2 rounded-lg bg-gradient-to-r ${colors.from} ${colors.to} border ${colors.accent}`}
                    >
                      <span className="font-semibold theme-text-primary">{rarity}</span>
                      <span className="theme-text-secondary ml-2">({count})</span>
                    </div>
                  )
                })}
              </div>
            </CardBody>
          </Card>

          {/* Badge Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBadges.map(badge => (
              <BadgeMintCard 
                key={badge.id} 
                badge={badge} 
                onMintSuccess={handleMintSuccess}
              />
            ))}
          </div>

          {filteredBadges.length === 0 && (
            <div className="text-center py-12">
              <p className="theme-text-tertiary text-lg">No badges found in this category</p>
            </div>
          )}

          {/* Tips */}
          <Card gradient="cyan" border className="mt-8">
            <CardBody>
              <h3 className="text-xl font-bold theme-text-primary mb-3">💡 How to Unlock More Badges</h3>
              <ul className="space-y-2 theme-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  <span>Complete quests across all difficulty levels</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  <span>Maintain daily GM streaks for consecutive days</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  <span>Join guilds and contribute to their treasuries</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  <span>Reach higher levels through consistent activity</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  <span>Explore all 6 supported blockchain networks</span>
                </li>
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
