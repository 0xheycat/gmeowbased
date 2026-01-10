'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import LockIcon from '@mui/icons-material/Lock'
import { useAccount } from 'wagmi'
import { useDialog, ErrorDialog } from '@/components/dialogs'
import { Tooltip } from '@/components/ui/tooltip'
import { XPEventOverlay, type XpEventPayload } from '@/components/XPEventOverlay'
import { ICON_SIZES } from '@/lib/utils/icons'

export type UserBadge = {
  id: string
  fid: number
  badgeId: string
  badgeType: string
  tier: TierType
  assignedAt: string
  minted: boolean
  mintedAt?: string | null
  txHash?: string | null
  chain?: string | null
  contractAddress?: string | null
  tokenId?: number | null
  metadata?: {
    name?: string
    description?: string
    imageUrl?: string
    tierLabel?: string
    [key: string]: unknown
  }
}

type TierType = 'mythic' | 'legendary' | 'epic' | 'rare' | 'common'

const TIER_CONFIG: Record<TierType, { color: string; label: string; glow: string }> = {
  mythic: { 
    color: 'rgb(168 85 247)', 
    label: 'Mythic',
    glow: '0 0 20px rgba(156, 39, 255, 0.6), 0 0 40px rgba(156, 39, 255, 0.4)'
  },
  legendary: { 
    color: 'rgb(251 191 36)', 
    label: 'Legendary',
    glow: '0 0 20px rgba(255, 217, 102, 0.6), 0 0 40px rgba(255, 217, 102, 0.4)'
  },
  epic: { 
    color: 'rgb(6 182 212)', 
    label: 'Epic',
    glow: '0 0 15px rgba(97, 223, 255, 0.5), 0 0 30px rgba(97, 223, 255, 0.3)'
  },
  rare: { 
    color: 'rgb(139 92 246)', 
    label: 'Rare',
    glow: '0 0 15px rgba(161, 140, 255, 0.5), 0 0 30px rgba(161, 140, 255, 0.3)'
  },
  common: { 
    color: 'rgb(156 163 175)', 
    label: 'Common',
    glow: '0 0 10px rgba(211, 215, 220, 0.3)'
  }
}

interface BadgeInventoryProps {
  badges: UserBadge[]
  compact?: boolean
  maxDisplay?: number
  onBadgeClick?: (badge: UserBadge) => void
}

export function BadgeInventory({ 
  badges, 
  compact = false, 
  maxDisplay,
  onBadgeClick 
}: BadgeInventoryProps) {
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null)
  const [claimingBadge, setClaimingBadge] = useState<string | null>(null)
  const { address } = useAccount()
  const { isOpen: errorOpen, open: openError, close: closeError } = useDialog()
  const [errorMessage, setErrorMessage] = useState('')
  const [xpOverlayOpen, setXpOverlayOpen] = useState(false)
  const [xpPayload, setXpPayload] = useState<XpEventPayload | null>(null)

  const displayBadges = useMemo(() => {
    if (maxDisplay) return badges.slice(0, maxDisplay)
    return badges
  }, [badges, maxDisplay])

  const handleBadgeClick = (badge: UserBadge) => {
    onBadgeClick?.(badge)
  }

  const handleClaimBadge = async (badge: UserBadge, e: React.MouseEvent) => {
    e.stopPropagation() // Don't trigger badge click

    if (!address) {
      setErrorMessage('Please connect your wallet to claim badges')
      openError()
      return
    }

    setClaimingBadge(badge.badgeId)

    try {
      const response = await fetch('/api/badges/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid: badge.fid,
          badgeId: badge.badgeId,
          walletAddress: address,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to claim badge')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to claim badge')
      }

      // Show XPEventOverlay celebration (professional UI pattern)
      setXpPayload({
        event: 'badge-claim',
        chainKey: (result.badge.chain || 'base') as any,
        xpEarned: 100, // Standard badge claim XP
        headline: `${result.badge.name} claimed!`,
        shareLabel: 'Share your new badge',
        visitUrl: `/badges`,
        visitLabel: 'View collection',
      })
      setXpOverlayOpen(true)
      
      // Refresh to show minted status after celebration
      setTimeout(() => window.location.reload(), 3000)
    } catch (error: any) {
      console.error('Claim failed:', error)
      setErrorMessage(error.message || 'Failed to claim badge')
      openError()
    } finally {
      setClaimingBadge(null)
    }
  }

  if (badges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <LockIcon sx={{ fontSize: 48 }} className="text-slate-900 dark:text-white/20 mb-4" />
        <p className="text-lg font-bold text-slate-900 dark:text-white/60 mb-2">No Badges Yet</p>
        <p className="text-sm text-slate-900 dark:text-white/40">
          Complete onboarding or join quests to earn your first badge!
        </p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Fortnite-style Grid */}
      <div className={`grid gap-4 ${compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'}`}>
        {displayBadges.map((badge) => {
          const tier = badge.tier as TierType
          const tierConfig = TIER_CONFIG[tier]
          const isHovered = hoveredBadge === badge.id
          const hasHolographicFoil = tier === 'mythic' || tier === 'legendary'

          return (
            <div
              key={badge.id}
              onClick={() => handleBadgeClick(badge)}
              onMouseEnter={() => setHoveredBadge(badge.id)}
              onMouseLeave={() => setHoveredBadge(null)}
              className="relative group cursor-pointer badge-card-hover"
              style={{ ['--badge-scale' as string]: isHovered ? 'scale(1.05)' : 'scale(1)' } as React.CSSProperties}
            >
              {/* Badge Card Container */}
              <div
                className="relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-black/80 via-black/60 to-black/80 backdrop-blur-sm border-2 badge-card-border"
                style={{
                  ['--tier-color' as string]: tierConfig.color,
                  ['--tier-glow' as string]: isHovered ? tierConfig.glow : '0 0 0 rgba(0,0,0,0)',
                } as React.CSSProperties}
              >
                {/* Holographic Foil Effect (Mythic & Legendary only) */}
                {hasHolographicFoil && (
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none badge-holographic"
                    style={{
                      ['--holographic-gradient' as string]: `linear-gradient(135deg, transparent 20%, ${tierConfig.color}40 40%, ${tierConfig.color}80 50%, ${tierConfig.color}40 60%, transparent 80%)`,
                    } as React.CSSProperties}
                  />
                )}

                {/* Badge Image */}
                <div className="relative w-full h-full p-4 flex items-center justify-center">
                  {badge.metadata?.imageUrl ? (
                    <Image
                      src={badge.metadata.imageUrl as string}
                      alt={badge.metadata.name || badge.badgeType}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <WorkspacePremiumIcon 
                        sx={{ fontSize: 64 }} 
                        style={{ color: tierConfig.color }}
                      />
                    </div>
                  )}
                </div>

                {/* Tier Badge Overlay */}
                <div 
                  className="absolute top-2 right-2 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm badge-tier-label"
                  style={{
                    ['--tier-color' as string]: tierConfig.color,
                    ['--tier-color-alpha' as string]: `${tierConfig.color}40`,
                  } as React.CSSProperties}
                >
                  {tierConfig.label}
                </div>

                {/* Minted Status */}
                {badge.minted && (
                  <div className="absolute top-2 left-2 flex items-center gap-2 px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-500/80 text-slate-900 dark:text-white backdrop-blur-sm">
                    <AutoAwesomeIcon sx={{ fontSize: ICON_SIZES.xs }} />
                    Minted
                  </div>
                )}

                {/* Claim Button with Tooltip */}
                {address && (
                  badge.minted ? (
                    <Tooltip content="This badge is already minted on-chain" side="bottom">
                      <button
                        disabled
                        className="absolute top-2 right-2 flex items-center gap-2 px-3 py-2 min-h-6 rounded-lg text-[10px] font-bold bg-emerald-500/30 text-white/60 cursor-not-allowed"
                      >
                        <AutoAwesomeIcon sx={{ fontSize: ICON_SIZES.xs }} />
                        Minted
                      </button>
                    </Tooltip>
                  ) : (
                    <button
                      onClick={(e) => handleClaimBadge(badge, e)}
                      disabled={claimingBadge === badge.badgeId}
                      className="absolute top-2 right-2 flex items-center gap-2 px-3 py-2 min-h-6 rounded-lg text-[10px] font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-900 dark:text-white shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {claimingBadge === badge.badgeId ? (
                        <>Claiming...</>
                      ) : (
                        <>
                          <AutoAwesomeIcon sx={{ fontSize: ICON_SIZES.xs }} />
                          Claim
                        </>
                      )}
                    </button>
                  )
                )}

                {/* Bottom Info Bar */}
                <div 
                  className="absolute bottom-0 left-0 right-0 px-3 py-2 backdrop-blur-md badge-bottom-bar"
                  style={{
                    ['--tier-color' as string]: tierConfig.color,
                  } as React.CSSProperties}
                >
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {badge.metadata?.name || badge.badgeType}
                  </p>
                  {!badge.minted && (
                    <p className="text-[10px] text-slate-900 dark:text-white/70">Mint Pending</p>
                  )}
                </div>
              </div>

              {/* Hover Tooltip */}
              {isHovered && (
                <div 
                  className="absolute z-50 left-1/2 -translate-x-1/2 -top-2 -translate-y-full w-64 p-4 rounded-xl shadow-2xl pointer-events-none badge-tooltip"
                  style={{
                    ['--tier-color' as string]: tierConfig.color,
                    ['--tier-glow' as string]: tierConfig.glow,
                  } as React.CSSProperties}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span 
                      className="px-2 py-1 rounded text-[10px] font-bold uppercase badge-tier-label"
                      style={{
                        ['--tier-color' as string]: tierConfig.color,
                        ['--tier-color-alpha' as string]: `${tierConfig.color}40`,
                      } as React.CSSProperties}
                    >
                      {tierConfig.label}
                    </span>
                    {badge.minted && (
                      <span className="flex items-center gap-2 px-2 py-1 rounded text-[10px] font-bold bg-emerald-500/80 text-slate-900 dark:text-white">
                        <AutoAwesomeIcon sx={{ fontSize: 10 }} />
                        Minted
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                    {badge.metadata?.name || badge.badgeType}
                  </h4>

                  {badge.metadata?.description && (
                    <p className="text-xs text-slate-900 dark:text-white/70 mb-2">
                      {String(badge.metadata.description)}
                    </p>
                  )}

                  <div className="space-y-1 text-[10px] text-slate-900 dark:text-white/50">
                    <p>Assigned: {new Date(badge.assignedAt).toLocaleDateString()}</p>
                    {badge.minted && badge.mintedAt && (
                      <p>Minted: {new Date(badge.mintedAt).toLocaleDateString()}</p>
                    )}
                    {badge.txHash && (
                      <p className="truncate">TX: {badge.txHash.slice(0, 10)}...</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Show More Indicator */}
      {maxDisplay && badges.length > maxDisplay && (
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-900 dark:text-white/50">
            Showing {maxDisplay} of {badges.length} badges
          </p>
        </div>
      )}

      {/* Holographic Animation Keyframes nice */}
      <style jsx>{`
        @keyframes holographic-shift {
          0%, 100% {
            background-position: 0% 0%;
          }
          50% {
            background-position: 100% 100%;
          }
        }
      `}</style>

      <ErrorDialog
        isOpen={errorOpen}
        onClose={closeError}
        title="Badge Error"
        message={errorMessage}
      />

      <XPEventOverlay
        open={xpOverlayOpen}
        payload={xpPayload}
        onClose={() => setXpOverlayOpen(false)}
      />
    </div>
  )
}
