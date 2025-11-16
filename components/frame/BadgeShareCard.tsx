'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { openWarpcastComposer } from '@/lib/share'
import { buildBadgeShareFrameUrl, buildBadgeShareText, formatBadgeDate } from '@/lib/frame-badge'
import type { UserBadge } from '@/lib/badges'

interface BadgeShareCardProps {
  badge: UserBadge
  fid: number | string
  username?: string
  onShare?: () => void
  className?: string
}

/**
 * Badge Share Card Component
 * 
 * Displays a single badge with share functionality.
 * Opens Warpcast composer with badgeShare frame embed.
 */
export function BadgeShareCard({
  badge,
  fid,
  username,
  onShare,
  className,
}: BadgeShareCardProps) {
  const [sharing, setSharing] = useState(false)

  const badgeName = (badge.metadata as { name?: string })?.name || badge.badgeType
  const badgeDescription = (badge.metadata as { description?: string })?.description || ''
  const badgeImageUrl = (badge.metadata as { imageUrl?: string })?.imageUrl
  const tierLabel = badge.tier.charAt(0).toUpperCase() + badge.tier.slice(1)

  // Tier color mapping
  const tierColors: Record<string, string> = {
    mythic: '#9C27FF',
    legendary: '#FFD966',
    epic: '#61DFFF',
    rare: '#A18CFF',
    common: '#D3D7DC',
  }

  const tierColor = tierColors[badge.tier] || tierColors.common

  const handleShare = async () => {
    if (sharing) return

    setSharing(true)

    try {
      const shareUrl = buildBadgeShareFrameUrl(fid, badge.badgeId)
      const shareText = buildBadgeShareText(badge, username)

      await openWarpcastComposer(shareText, shareUrl)

      if (onShare) {
        onShare()
      }
    } catch (error) {
      console.error('Failed to open composer:', error)
    } finally {
      setSharing(false)
    }
  }

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 transition-all hover:border-white/20 hover:bg-white/10',
        className
      )}
    >
      {/* Tier glow effect */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at top left, ${tierColor}40, transparent 60%)`,
        }}
      />

      <div className="relative flex items-start gap-4">
        {/* Badge image */}
        <div
          className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2"
          style={{
            borderColor: tierColor,
            boxShadow: `0 0 20px ${tierColor}40`,
          }}
        >
          {badgeImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={badgeImageUrl}
              alt={badgeName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-3xl"
              style={{ backgroundColor: `${tierColor}20` }}
            >
              🎖️
            </div>
          )}

          {/* Minted indicator */}
          {badge.minted && (
            <div className="absolute bottom-1 right-1 rounded-full bg-emerald-500/90 p-1">
              <svg
                className="h-3 w-3 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Badge info */}
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-white">{badgeName}</h3>

          {/* Tier pill */}
          <div className="mt-1 inline-flex items-center gap-2">
            <span
              className="pixel-pill text-[10px] font-semibold uppercase tracking-wider"
              style={{
                backgroundColor: `${tierColor}20`,
                color: tierColor,
                borderColor: `${tierColor}40`,
              }}
            >
              {tierLabel}
            </span>
            {badge.minted && (
              <span className="text-[10px] text-emerald-400">✓ Minted</span>
            )}
          </div>

          {/* Description */}
          {badgeDescription && (
            <p className="mt-2 text-xs text-white/60 line-clamp-2">
              {badgeDescription}
            </p>
          )}

          {/* Earned date */}
          <p className="mt-2 text-[10px] text-white/40">
            Earned: {formatBadgeDate(badge.assignedAt)}
          </p>
        </div>
      </div>

      {/* Share button */}
      <button
        type="button"
        onClick={handleShare}
        disabled={sharing}
        className={clsx(
          'mt-4 w-full rounded-xl px-4 py-2 text-sm font-semibold transition-all',
          'border border-white/20 bg-white/5 text-white hover:border-white/30 hover:bg-white/10',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        {sharing ? 'Opening Composer...' : 'Share on Warpcast'}
      </button>
    </div>
  )
}
