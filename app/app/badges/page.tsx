'use client'

/**
 * Badge Gallery - User Badge Collection
 * Phase 14: Badge system with minting & Frame sharing
 * 
 * Features:
 * - View earned badges
 * - Instant badge minting (on-chain)
 * - XP celebration overlay (badge-mint event)
 * - Frame sharing on Farcaster
 * - Rarity & status filters
 * - Stats dashboard
 * 
 * Design System:
 * - Tailwick v2.0 (Card, Button, Badge components)
 * - Gmeowbased v0.1 (55 SVG icons)
 * - Mobile-first responsive (1/2/3 columns)
 */

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAccount } from 'wagmi'
import { AppLayout } from '@/components/layouts/AppLayout'
import { 
  Card, 
  CardBody, 
  CardHeader,
  CardFooter,
  Badge, 
  Button,
  StatsCard
} from '@/components/ui/tailwick-primitives'
import { QuestIcon } from '@/components/ui/QuestIcon'
import { XPEventOverlay, type XpEventPayload } from '@/components/XPEventOverlay'
import { useUnifiedFarcasterAuth } from '@/hooks/useUnifiedFarcasterAuth'
import { calculateRankProgress } from '@/lib/rank'
import { emitRankTelemetryEvent } from '@/lib/rank-telemetry-client'

// User badge type from database
type UserBadge = {
  id: number
  fid: number
  badge_id: string
  badge_type: string
  tier: 'mythic' | 'legendary' | 'epic' | 'rare' | 'common'
  assigned_at: string
  minted: boolean
  minted_at: string | null
  tx_hash: string | null
  chain: string | null
  contract_address: string | null
  token_id: number | null
  metadata: {
    name?: string
    description?: string
    imageUrl?: string
    tierLabel?: string
    xpReward?: number
    [key: string]: any
  } | null
}

// Tier colors (Tailwick palette)
const tierColors = {
  mythic: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0',
  legendary: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0',
  epic: 'bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0',
  rare: 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0',
  common: 'bg-slate-500/20 text-slate-300 border border-slate-500'
}

const tierGradients = {
  mythic: 'bg-gradient-to-br from-purple-500/20 to-pink-500/20',
  legendary: 'bg-gradient-to-br from-amber-500/20 to-orange-500/20',
  epic: 'bg-gradient-to-br from-violet-500/20 to-purple-500/20',
  rare: 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20',
  common: 'bg-gradient-to-br from-slate-500/20 to-slate-600/20'
}

const tierLabels = {
  mythic: 'Mythic',
  legendary: 'Legendary',
  epic: 'Epic',
  rare: 'Rare',
  common: 'Common'
}

const chainLabels: Record<string, string> = {
  base: 'Base',
  optimism: 'Optimism',
  celo: 'Celo',
  arbitrum: 'Arbitrum',
  ink: 'Ink',
  unichain: 'Unichain'
}

export default function BadgeGalleryPage() {
  const router = useRouter()
  const { address } = useAccount()
  const { profile } = useUnifiedFarcasterAuth()

  // State
  const [badges, setBadges] = useState<UserBadge[]>([])
  const [loading, setLoading] = useState(true)
  const [mintingBadge, setMintingBadge] = useState<number | null>(null)
  const [xpCelebration, setXpCelebration] = useState<XpEventPayload | null>(null)
  
  // Filters
  const [rarityFilter, setRarityFilter] = useState<'all' | 'mythic' | 'legendary' | 'epic' | 'rare' | 'common'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'minted' | 'pending'>('all')

  // Badge stats
  const badgeStats = useMemo(() => {
    const total = badges.length
    const minted = badges.filter(b => b.minted).length
    const pending = total - minted
    const percent = total > 0 ? Math.round((minted / total) * 100) : 0

    const byTier = badges.reduce((acc, badge) => {
      acc[badge.tier] = (acc[badge.tier] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return { total, minted, pending, percent, byTier }
  }, [badges])

  // Filtered badges
  const filteredBadges = useMemo(() => {
    let result = badges

    // Rarity filter
    if (rarityFilter !== 'all') {
      result = result.filter(b => b.tier === rarityFilter)
    }

    // Status filter
    if (statusFilter === 'minted') {
      result = result.filter(b => b.minted)
    } else if (statusFilter === 'pending') {
      result = result.filter(b => !b.minted)
    }

    return result
  }, [badges, rarityFilter, statusFilter])

  // Fetch badges
  const fetchBadges = async () => {
    if (!profile?.fid) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/badges/list?fid=${profile.fid}`)
      const data = await response.json()

      if (data.success && data.badges) {
        setBadges(data.badges)
      }
    } catch (error) {
      console.error('[BadgeGallery] Failed to fetch badges:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch user stats (for XP overlay total points)
  const fetchUserStats = async (fid: number): Promise<{ total_points: number }> => {
    try {
      const response = await fetch(`/api/users/stats?fid=${fid}`)
      const data = await response.json()
      return { total_points: data.total_points || 0 }
    } catch (error) {
      console.error('[BadgeGallery] Failed to fetch user stats:', error)
      return { total_points: 0 }
    }
  }

  // Handle badge mint
  const handleMintBadge = async (badge: UserBadge) => {
    if (!address) {
      alert('Please connect your wallet')
      return
    }

    if (!profile?.fid) {
      alert('Please sign in with Farcaster')
      return
    }

    setMintingBadge(badge.id)

    try {
      // Call instant mint API
      const response = await fetch('/api/badges/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid: profile.fid,
          badgeId: badge.badge_id,
          walletAddress: address
        })
      })

      const data = await response.json()

      if (data.success) {
        // Get user stats for total points
        const userStats = await fetchUserStats(profile.fid)
        const progress = calculateRankProgress(userStats.total_points)

        // Show XP celebration overlay
        setXpCelebration({
          event: 'badge-mint',
          chainKey: (badge.chain as any) || 'base',
          xpEarned: badge.metadata?.xpReward || 100,
          totalPoints: userStats.total_points,
          progress: progress,
          headline: `Badge Minted!`,
          visitUrl: null, // No visit button for badge-mint
          tierTagline: `${badge.metadata?.name || badge.badge_type} earned!`
        })

        // Emit telemetry event
        await emitRankTelemetryEvent({
          event: 'badge-mint',
          chain: (badge.chain as any) || 'base',
          walletAddress: address,
          fid: profile.fid,
          delta: badge.metadata?.xpReward || 100,
          totalPoints: userStats.total_points,
          level: progress.level,
          tierName: progress.currentTier.name,
          tierPercent: progress.percent,
          metadata: {
            badgeId: badge.badge_id,
            badgeName: badge.metadata?.name || badge.badge_type,
            tier: badge.tier,
            txHash: data.txHash,
            tokenId: data.tokenId
          }
        })

        // Refresh badge list
        fetchBadges()
      } else {
        alert(`Failed to mint badge: ${data.error}`)
      }
    } catch (error) {
      console.error('[BadgeGallery] Failed to mint badge:', error)
      alert('Failed to mint badge')
    } finally {
      setMintingBadge(null)
    }
  }

  // Handle badge share
  const handleShareBadge = async (badge: UserBadge) => {
    if (!profile?.fid) {
      alert('Please sign in with Farcaster')
      return
    }

    try {
      // Generate Frame URL
      const baseUrl = process.env.NEXT_PUBLIC_URL || window.location.origin
      const frameUrl = `${baseUrl}/api/frame/badgeShare?fid=${profile.fid}&badgeId=${badge.badge_id}`

      // Open Warpcast composer
      const castText = `Just earned the ${badge.metadata?.name || badge.badge_type} badge! 🎖️`
      const warpcastUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}&embeds[]=${encodeURIComponent(frameUrl)}`
      
      // Open in new tab
      window.open(warpcastUrl, '_blank')
    } catch (error) {
      console.error('[BadgeGallery] Failed to share badge:', error)
      alert('Failed to generate share link')
    }
  }

  // Fetch on mount
  useEffect(() => {
    fetchBadges()
  }, [profile?.fid])

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold theme-text-primary mb-2">Badge Collection</h1>
          <p className="theme-text-secondary">View your earned badges and mint them on-chain</p>
        </div>

        {/* Stats Dashboard */}
        {profile && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="theme-card-bg-primary">
              <CardBody>
                <div className="text-sm theme-text-secondary mb-1">Total Badges</div>
                <div className="text-2xl font-bold theme-text-primary">{badgeStats.total}</div>
              </CardBody>
            </Card>

            <Card className="theme-card-bg-primary">
              <CardBody>
                <div className="text-sm theme-text-secondary mb-1">Minted</div>
                <div className="text-2xl font-bold text-emerald-400">{badgeStats.minted}</div>
              </CardBody>
            </Card>

            <Card className="theme-card-bg-primary">
              <CardBody>
                <div className="text-sm theme-text-secondary mb-1">Pending</div>
                <div className="text-2xl font-bold text-amber-400">{badgeStats.pending}</div>
              </CardBody>
            </Card>

            <Card className="theme-card-bg-primary">
              <CardBody>
                <div className="text-sm theme-text-secondary mb-1">Completion</div>
                <div className="text-2xl font-bold theme-text-primary">{badgeStats.percent}%</div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {/* Rarity Filters */}
          <Button 
            variant={rarityFilter === 'all' ? 'primary' : 'ghost'} 
            size="sm" 
            onClick={() => setRarityFilter('all')}
          >
            All Badges
          </Button>
          <Button 
            variant={rarityFilter === 'mythic' ? 'primary' : 'ghost'} 
            size="sm" 
            onClick={() => setRarityFilter('mythic')}
          >
            Mythic
          </Button>
          <Button 
            variant={rarityFilter === 'legendary' ? 'primary' : 'ghost'} 
            size="sm" 
            onClick={() => setRarityFilter('legendary')}
          >
            Legendary
          </Button>
          <Button 
            variant={rarityFilter === 'epic' ? 'primary' : 'ghost'} 
            size="sm" 
            onClick={() => setRarityFilter('epic')}
          >
            Epic
          </Button>
          <Button 
            variant={rarityFilter === 'rare' ? 'primary' : 'ghost'} 
            size="sm" 
            onClick={() => setRarityFilter('rare')}
          >
            Rare
          </Button>
          <Button 
            variant={rarityFilter === 'common' ? 'primary' : 'ghost'} 
            size="sm" 
            onClick={() => setRarityFilter('common')}
          >
            Common
          </Button>

          {/* Status Filters */}
          <div className="ml-auto flex gap-2">
            <Button 
              variant={statusFilter === 'all' ? 'primary' : 'ghost'} 
              size="sm" 
              onClick={() => setStatusFilter('all')}
            >
              All
            </Button>
            <Button 
              variant={statusFilter === 'minted' ? 'primary' : 'ghost'} 
              size="sm" 
              onClick={() => setStatusFilter('minted')}
            >
              Minted
            </Button>
            <Button 
              variant={statusFilter === 'pending' ? 'primary' : 'ghost'} 
              size="sm" 
              onClick={() => setStatusFilter('pending')}
            >
              Pending
            </Button>
          </div>
        </div>

        {/* Badge Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="theme-card-bg-primary">
                <div className="aspect-square theme-bg-subtle animate-pulse" />
                <CardBody className="space-y-3">
                  <div className="h-6 theme-bg-subtle rounded animate-pulse" />
                  <div className="h-4 theme-bg-subtle rounded animate-pulse w-3/4" />
                  <div className="h-4 theme-bg-subtle rounded animate-pulse w-1/2" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-10 theme-bg-subtle rounded animate-pulse" />
                    <div className="h-10 theme-bg-subtle rounded animate-pulse" />
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        ) : !profile ? (
          <Card className="theme-card-bg-primary">
            <CardBody className="text-center py-12">
              <div className="text-6xl mb-4">🔐</div>
              <h3 className="text-xl font-semibold theme-text-primary mb-2">Sign in to view badges</h3>
              <p className="theme-text-secondary mb-4">Connect your Farcaster account to see your badge collection</p>
            </CardBody>
          </Card>
        ) : filteredBadges.length === 0 ? (
          <Card className="theme-card-bg-primary">
            <CardBody className="text-center py-12">
              <div className="text-6xl mb-4">🎖️</div>
              <h3 className="text-xl font-semibold theme-text-primary mb-2">No badges found</h3>
              <p className="theme-text-secondary mb-4">
                {rarityFilter !== 'all' && `No ${rarityFilter} badges in your collection`}
                {statusFilter === 'minted' && rarityFilter === 'all' && 'No minted badges yet'}
                {statusFilter === 'pending' && rarityFilter === 'all' && 'No pending badges'}
                {rarityFilter === 'all' && statusFilter === 'all' && 'Start completing quests and joining guilds to earn badges!'}
              </p>
              {rarityFilter === 'all' && statusFilter === 'all' && (
                <Button variant="primary" onClick={() => router.push('/app/quest-marketplace')}>
                  Explore Quests
                </Button>
              )}
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBadges.map((badge) => (
              <BadgeCard 
                key={badge.id} 
                badge={badge} 
                onMint={handleMintBadge}
                onShare={handleShareBadge}
                isMinting={mintingBadge === badge.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* XP Celebration Overlay */}
      {xpCelebration && (
        <XPEventOverlay
          payload={xpCelebration}
          open={Boolean(xpCelebration)}
          onClose={() => setXpCelebration(null)}
        />
      )}
    </AppLayout>
  )
}

// BadgeCard Component
function BadgeCard({ 
  badge, 
  onMint, 
  onShare,
  isMinting 
}: { 
  badge: UserBadge
  onMint: (badge: UserBadge) => void
  onShare: (badge: UserBadge) => void
  isMinting: boolean
}) {
  const { address } = useAccount()

  return (
    <Card hover className="theme-card-bg-primary overflow-hidden">
      {/* Badge Image */}
      <div className="relative aspect-square">
        {badge.metadata?.imageUrl ? (
          <Image
            src={badge.metadata.imageUrl}
            alt={badge.metadata?.name || badge.badge_type}
            fill
            className="object-cover"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${tierGradients[badge.tier]}`}>
            <QuestIcon type="badge_mint" size={64} className="opacity-40" />
          </div>
        )}
        
        {/* Tier Badge (Top-right) */}
        <Badge className={`absolute top-2 right-2 ${tierColors[badge.tier]}`} size="sm">
          {tierLabels[badge.tier]}
        </Badge>
        
        {/* Minted Status (Top-left) */}
        {badge.minted && (
          <Badge className="absolute top-2 left-2 bg-emerald-500/90 text-white" size="sm">
            ✓ Minted
          </Badge>
        )}
      </div>

      <CardHeader>
        <h3 className="text-lg font-semibold theme-text-primary truncate">
          {badge.metadata?.name || badge.badge_type}
        </h3>
        {badge.metadata?.description && (
          <p className="text-sm theme-text-secondary line-clamp-2 mt-1">
            {badge.metadata.description}
          </p>
        )}
      </CardHeader>

      <CardBody className="space-y-3">
        {/* Assigned Date */}
        <div className="text-xs theme-text-secondary">
          <span>Assigned: </span>
          <span className="font-semibold">{new Date(badge.assigned_at).toLocaleDateString()}</span>
        </div>

        {/* Minted Date */}
        {badge.minted && badge.minted_at && (
          <div className="text-xs theme-text-secondary">
            <span>Minted: </span>
            <span className="font-semibold text-emerald-400">{new Date(badge.minted_at).toLocaleDateString()}</span>
          </div>
        )}

        {/* Chain Badge */}
        {badge.chain && (
          <Badge variant="info" size="sm" className="flex items-center gap-1.5 w-fit">
            {chainLabels[badge.chain] || badge.chain}
          </Badge>
        )}
      </CardBody>

      <CardFooter className="grid grid-cols-2 gap-3">
        {/* Mint Button (if not minted) */}
        {!badge.minted && address && (
          <Button 
            variant="primary" 
            size="sm" 
            onClick={() => onMint(badge)}
            disabled={isMinting}
          >
            {isMinting ? 'Minting...' : 'Mint Badge'}
          </Button>
        )}

        {/* Share Button (always available) */}
        <Button 
          variant={badge.minted ? 'primary' : 'secondary'} 
          size="sm" 
          onClick={() => onShare(badge)}
          className={!badge.minted && address ? '' : 'col-span-2'}
        >
          Share on FC
        </Button>
      </CardFooter>
    </Card>
  )
}
