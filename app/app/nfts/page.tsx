'use client'

/**
 * NFT Gallery Page - Phase 17 NFT System
 * 
 * Features:
 * - Browse available NFTs (5 types: onboarding, quest, guild, achievement, event)
 * - Filter by rarity, category, status
 * - View minted NFTs + available to mint
 * - Mint NFTs with XPEventOverlay celebration (NO confetti)
 * - Stats dashboard (total, minted, pending, completion %)
 * - Mobile-first responsive (1→2→3 columns)
 * 
 * Design System:
 * - Tailwick v2.0 (Card, Button, Badge, StatsCard)
 * - Gmeowbased v0.1 (55 SVG icons via QuestIcon)
 * - XPEventOverlay for nft-mint celebration
 * - Reuse logic from old foundation (API patterns, eligibility checks)
 */

import { useState, useEffect, useMemo } from 'react'
import { AppLayout } from '@/components/layouts/AppLayout'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { useAccount } from 'wagmi'
import { useUnifiedFarcasterAuth } from '@/hooks/useUnifiedFarcasterAuth'
import type { NFTMetadata, NFTRarity, NFTCategory, NFTStats } from '@/lib/nfts'
import { NFT_REGISTRY } from '@/lib/nfts'
import { NFTCard } from '@/components/features/NFTCard'
import { NFTMintFlow } from '@/components/features/NFTMintFlow'
import { 
  NFTStatsBar,
  NFTFilters,
  NFTGrid,
  NFTEmptyState,
  NFTGridSkeleton,
} from '@/components/features/NFTComponents'
import { XPEventOverlay, type XpEventPayload } from '@/components/XPEventOverlay'

// User NFT with mint status
interface UserNFT extends NFTMetadata {
  nft_type_id: string
  is_minted: boolean
  is_pending: boolean
  is_eligible: boolean
  minted_at?: string
  token_id?: number
}

type StatusFilter = 'all' | 'minted' | 'available' | 'locked'

export default function NFTGalleryPage() {
  const { address } = useAccount()
  const { profile, profileLoading, fid } = useUnifiedFarcasterAuth()

  // Filters
  const [rarityFilter, setRarityFilter] = useState<NFTRarity | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<NFTCategory | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Data
  const [nfts, setNfts] = useState<UserNFT[]>([])
  const [stats, setStats] = useState<NFTStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Minting flow
  const [showMintFlow, setShowMintFlow] = useState(false)
  const [selectedNFT, setSelectedNFT] = useState<UserNFT | null>(null)
  const [mintingNFT, setMintingNFT] = useState<string | null>(null) // nft_type_id being minted

  // XP celebration
  const [xpCelebration, setXpCelebration] = useState<XpEventPayload | null>(null)

  // Fetch NFTs and stats on mount
  useEffect(() => {
    if (fid) {
      fetchNFTs()
      fetchStats()
    }
  }, [fid])

  const fetchNFTs = async () => {
    if (!fid) return

    setLoading(true)
    try {
      const response = await fetch(`/api/nfts?fid=${fid}`)
      const data = await response.json()

      if (data.ok && data.nfts) {
        setNfts(data.nfts)
      } else {
        console.error('[NFT Gallery] Failed to fetch NFTs:', data.error)
      }
    } catch (error) {
      console.error('[NFT Gallery] Error fetching NFTs:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    if (!fid) return

    try {
      const response = await fetch(`/api/nfts/stats?fid=${fid}`)
      const data = await response.json()

      if (data.ok && data.stats) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('[NFT Gallery] Error fetching stats:', error)
    }
  }

  // Filter NFTs
  const filteredNFTs = useMemo(() => {
    let filtered = [...nfts]

    // Rarity filter
    if (rarityFilter !== 'all') {
      filtered = filtered.filter((nft) => nft.rarity === rarityFilter)
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((nft) => nft.category === categoryFilter)
    }

    // Status filter
    if (statusFilter === 'minted') {
      filtered = filtered.filter((nft) => nft.is_minted)
    } else if (statusFilter === 'available') {
      filtered = filtered.filter((nft) => !nft.is_minted && nft.is_eligible)
    } else if (statusFilter === 'locked') {
      filtered = filtered.filter((nft) => !nft.is_minted && !nft.is_eligible)
    }

    return filtered
  }, [nfts, rarityFilter, categoryFilter, statusFilter])

  // Handle mint button click
  const handleMintClick = (nft: NFTMetadata) => {
    const userNFT = nft as UserNFT
    if (!userNFT.is_eligible || userNFT.is_minted || userNFT.is_pending) return

    setSelectedNFT(userNFT)
    setShowMintFlow(true)
  }

  // Handle view NFT (opens BaseScan or metadata page)
  const handleViewClick = (nft: NFTMetadata) => {
    const userNFT = nft as UserNFT
    if (!userNFT.is_minted || !userNFT.token_id) return

    // Open BaseScan NFT page (contract address from nft_metadata table)
    const basescanUrl = `https://basescan.org/nft/${userNFT.id}/${userNFT.token_id}`
    window.open(basescanUrl, '_blank')
  }

  // Handle mint NFT
  const handleMintNFT = async (nft: NFTMetadata) => {
    const userNFT = nft as UserNFT
    if (!fid || !address) {
      return {
        success: false,
        error: 'Wallet and Farcaster account required',
      }
    }

    setMintingNFT(userNFT.nft_type_id)

    try {
      const response = await fetch('/api/nfts/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid,
          address,
          nft_type_id: userNFT.nft_type_id,
          chain: userNFT.chain,
        }),
      })

      const data = await response.json()

      if (data.ok && data.txHash && data.tokenId) {
        // Refresh NFTs and stats
        await fetchNFTs()
        await fetchStats()

        setMintingNFT(null)

        return {
          success: true,
          txHash: data.txHash,
          tokenId: data.tokenId,
        }
      } else {
        setMintingNFT(null)
        return {
          success: false,
          error: data.error || 'Failed to mint NFT',
        }
      }
    } catch (error) {
      console.error('[NFT Gallery] Mint error:', error)
      setMintingNFT(null)
      return {
        success: false,
        error: 'Network error. Please try again.',
      }
    }
  }

  // Handle share NFT on Farcaster (Frame)
  const handleShareNFT = (nft: NFTMetadata, tokenId: number) => {
    const userNFT = nft as UserNFT
    if (!tokenId) return

    try {
      // Use existing Frame API (NEVER change, it's fully working)
      const shareUrl = `${window.location.origin}/frames/nft/${userNFT.nft_type_id}/${tokenId}`
      
      // Open Farcaster composer
      window.open(
        `https://warpcast.com/~/compose?text=Just minted ${userNFT.name}! 🎉&embeds[]=${encodeURIComponent(shareUrl)}`,
        '_blank'
      )
    } catch (error) {
      console.error('[NFT Gallery] Share error:', error)
    }
  }

  // Reset filters
  const handleResetFilters = () => {
    setRarityFilter('all')
    setCategoryFilter('all')
    setStatusFilter('all')
  }

  // Loading state
  if (profileLoading || loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          {/* Breadcrumb */}
          <PageBreadcrumb
            title="NFT Collection"
            subtitle="App"
          />

          {/* Stats Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 theme-card-bg-secondary rounded-lg animate-pulse" />
            ))}
          </div>

          {/* Gallery Skeleton */}
          <NFTGridSkeleton count={6} />
        </div>
      </AppLayout>
    )
  }

  // No wallet/profile state
  if (!address || !fid) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <PageBreadcrumb
            title="NFT Collection"
            subtitle="App"
          />

          <NFTEmptyState
            title="Connect Wallet Required"
            description="Connect your wallet and Farcaster account to view and mint NFTs"
            showResetButton={false}
          />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <PageBreadcrumb
          title="NFT Collection"
          subtitle="App"
        />

        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold theme-text-primary">
            NFT Collection
          </h1>
          <p className="text-sm md:text-base theme-text-secondary">
            Mint exclusive NFTs by completing quests, joining guilds, and participating in events.
          </p>
        </div>

        {/* Stats Dashboard */}
        <NFTStatsBar stats={stats} loading={!stats} />

        {/* Filters */}
        <NFTFilters
          rarityFilter={rarityFilter}
          categoryFilter={categoryFilter}
          statusFilter={statusFilter}
          onRarityChange={setRarityFilter}
          onCategoryChange={setCategoryFilter}
          onStatusChange={setStatusFilter}
        />

        {/* NFT Grid */}
        {filteredNFTs.length === 0 ? (
          <NFTEmptyState
            title="No NFTs Found"
            description="Try adjusting your filters or complete quests to unlock NFTs"
            showResetButton={rarityFilter !== 'all' || categoryFilter !== 'all' || statusFilter !== 'all'}
            onReset={handleResetFilters}
          />
        ) : (
          <NFTGrid>
            {filteredNFTs.map((nft) => (
              <NFTCard
                key={nft.nft_type_id}
                nft={nft}
                isMinted={nft.is_minted}
                isPending={nft.is_pending || mintingNFT === nft.nft_type_id}
                isEligible={nft.is_eligible}
                onMint={handleMintClick}
                onView={handleViewClick}
                loading={mintingNFT === nft.nft_type_id}
              />
            ))}
          </NFTGrid>
        )}
      </div>

      {/* NFT Mint Flow Modal */}
      {showMintFlow && selectedNFT && (
        <NFTMintFlow
          isOpen={showMintFlow}
          onClose={() => {
            setShowMintFlow(false)
            setSelectedNFT(null)
          }}
          nft={selectedNFT}
          onMint={handleMintNFT}
          onShare={handleShareNFT}
        />
      )}

      {/* XP Celebration Overlay */}
      {xpCelebration && (
        <XPEventOverlay
          open={true}
          payload={xpCelebration}
          onClose={() => setXpCelebration(null)}
        />
      )}
    </AppLayout>
  )
}
