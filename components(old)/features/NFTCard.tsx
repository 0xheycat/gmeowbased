/**
 * NFTCard Component - Phase 17
 * Displays individual NFT with rarity, category, and minting status
 * 
 * Design: Tailwick v2.0 + Gmeowbased v0.1 icons
 * Pattern: Reuses ReferralCard structure, NOT old foundation UI
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card, CardBody, CardFooter, Button, Badge } from 'components(old)/ui/tailwick-primitives'
import { QuestIcon } from 'components(old)/ui/QuestIcon'
import type { NFTMetadata, NFTRarity, NFTCategory } from '@/lib/nfts'
import { getRarityColor, getCategoryIcon, formatMintPrice } from '@/lib/nfts'

export type NFTCardProps = {
  nft: NFTMetadata
  isMinted?: boolean
  isPending?: boolean
  isEligible?: boolean
  onMint?: (nft: NFTMetadata) => void
  onView?: (nft: NFTMetadata) => void
  loading?: boolean
}

/**
 * Get Tailwick gradient variant from rarity
 */
function getRarityGradient(rarity: NFTRarity): 'purple' | 'blue' | 'orange' | 'pink' | 'cyan' {
  const gradientMap: Record<NFTRarity, 'purple' | 'blue' | 'orange' | 'pink' | 'cyan'> = {
    mythic: 'pink',      // Pink gradient for mythic
    legendary: 'orange', // Gold/orange for legendary
    epic: 'purple',      // Purple for epic
    rare: 'blue',        // Blue for rare
    common: 'cyan',      // Cyan for common
  }
  return gradientMap[rarity]
}

/**
 * Get badge variant from rarity
 */
function getRarityBadgeVariant(rarity: NFTRarity): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  const variantMap: Record<NFTRarity, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
    mythic: 'danger',    // Pink/red
    legendary: 'success', // Gold/yellow
    epic: 'primary',     // Purple
    rare: 'info',        // Blue
    common: 'warning',   // Orange/yellow
  }
  return variantMap[rarity]
}

export function NFTCard({
  nft,
  isMinted = false,
  isPending = false,
  isEligible = true,
  onMint,
  onView,
  loading = false,
}: NFTCardProps) {
  const [imageError, setImageError] = useState(false)

  return (
    <Card 
      className="theme-card-bg-primary overflow-hidden" 
      hover={!isMinted && isEligible}
      border
    >
      {/* NFT Image Section */}
      <div className="relative aspect-square bg-gradient-to-br from-slate-900 to-slate-800">
        {!imageError ? (
          <Image
            src={nft.image_url}
            alt={nft.name}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          // Fallback if image fails to load
          <div className="absolute inset-0 flex items-center justify-center">
            <QuestIcon type="nft_mint" size={64} className="opacity-30" />
          </div>
        )}

        {/* Rarity Badge (top-left) */}
        <div className="absolute top-3 left-3">
          <Badge variant={getRarityBadgeVariant(nft.rarity)} className="backdrop-blur-sm">
            {nft.rarity.charAt(0).toUpperCase() + nft.rarity.slice(1)}
          </Badge>
        </div>

        {/* Minted Badge (top-right) */}
        {isMinted && (
          <div className="absolute top-3 right-3">
            <Badge variant="success" className="backdrop-blur-sm">
              <span className="flex items-center gap-1">
                <QuestIcon type="quest_claim" size={14} />
                Minted
              </span>
            </Badge>
          </div>
        )}

        {/* Pending Badge (top-right) */}
        {isPending && !isMinted && (
          <div className="absolute top-3 right-3">
            <Badge variant="warning" className="backdrop-blur-sm animate-pulse">
              <span className="flex items-center gap-1">
                <QuestIcon type="quest_create" size={14} />
                Pending
              </span>
            </Badge>
          </div>
        )}

        {/* Supply Indicator (bottom-left) */}
        {nft.max_supply && nft.max_supply > 0 && (
          <div className="absolute bottom-3 left-3">
            <div className="backdrop-blur-sm bg-black/60 px-2.5 py-1.5 rounded text-xs font-medium text-white">
              {nft.current_supply || 0} / {nft.max_supply}
            </div>
          </div>
        )}
      </div>

      {/* NFT Details */}
      <CardBody className="space-y-3">
        {/* Name & Category Icon */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-bold theme-text-primary leading-tight flex-1">
            {nft.name}
          </h3>
          <QuestIcon 
            type={getCategoryIcon(nft.category) as any} 
            size={24} 
            className="flex-shrink-0 opacity-70"
          />
        </div>

        {/* Description */}
        <p className="text-sm theme-text-secondary line-clamp-2 min-h-[2.5rem]">
          {nft.description}
        </p>

        {/* Requirements (if not minted and not eligible) */}
        {!isMinted && !isEligible && nft.requirements && (
          <div className="space-y-1.5">
            <div className="text-xs font-semibold theme-text-secondary uppercase tracking-wide">
              Requirements
            </div>
            <div className="space-y-1">
              {nft.requirements.neynar_score && (
                <div className="flex items-center gap-2 text-xs theme-text-secondary">
                  <QuestIcon type="stats_shared" size={14} />
                  <span>Neynar Score: {nft.requirements.neynar_score}+</span>
                </div>
              )}
              {nft.requirements.min_xp && (
                <div className="flex items-center gap-2 text-xs theme-text-secondary">
                  <QuestIcon type="quest_claim" size={14} />
                  <span>Min XP: {nft.requirements.min_xp.toLocaleString()}</span>
                </div>
              )}
              {nft.requirements.min_level && (
                <div className="flex items-center gap-2 text-xs theme-text-secondary">
                  <QuestIcon type="badge_mint" size={14} />
                  <span>Level {nft.requirements.min_level}+</span>
                </div>
              )}
              {nft.requirements.allowlist_only && (
                <div className="flex items-center gap-2 text-xs theme-text-secondary">
                  <QuestIcon type="guild_join" size={14} />
                  <span>Allowlist Only</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats (Supply & Price) */}
        <div className="flex items-center justify-between text-sm theme-text-secondary pt-2 border-t theme-border-subtle">
          <span className="flex items-center gap-1.5">
            <QuestIcon type="onchain" size={16} />
            {nft.chain.toUpperCase()}
          </span>
          <span className="font-medium">
            {formatMintPrice(nft.mint_price_wei)}
          </span>
        </div>
      </CardBody>

      {/* Action Button */}
      <CardFooter>
        {/* Already Minted - View Button */}
        {isMinted && (
          <Button
            variant="ghost"
            size="lg"
            className="w-full"
            onClick={() => onView?.(nft)}
            disabled={loading}
          >
            View NFT
          </Button>
        )}

        {/* Pending Mint */}
        {isPending && !isMinted && (
          <Button
            variant="ghost"
            size="lg"
            className="w-full"
            disabled
          >
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              Minting...
            </span>
          </Button>
        )}

        {/* Eligible to Mint */}
        {!isMinted && !isPending && isEligible && (
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => onMint?.(nft)}
            disabled={loading || !nft.is_active}
            loading={loading}
          >
            {loading ? 'Processing...' : 'Mint NFT'}
          </Button>
        )}

        {/* Not Eligible (Locked) */}
        {!isMinted && !isPending && !isEligible && (
          <Button
            variant="ghost"
            size="lg"
            className="w-full"
            disabled
          >
            <span className="flex items-center gap-2">
              🔒 Requirements Not Met
            </span>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
