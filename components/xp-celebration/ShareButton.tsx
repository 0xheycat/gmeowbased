/**
 * XP Celebration System - Share Button (Warpcast)
 * 
 * Share XP celebration to Warpcast with pre-filled message and OG image.
 * 
 * FEATURES:
 * - Warpcast share intent integration
 * - OG image URL generation
 * - Share text formatting with event context
 * - Framer Motion hover/tap animations
 * - Warpcast icon from components/icons/
 * 
 * PHASE: Phase 1 - Component Creation (Week 1)
 * DATE: December 14, 2025
 * 
 * REFERENCE DOCUMENTATION:
 * - XP-SYSTEM-COMPREHENSIVE-GUIDE-PART-2.md (Warpcast Frame Share section)
 * - types.ts (ShareButtonProps, XpEventKind)
 * - animations.ts (buttonVariants)
 * 
 * SUGGESTIONS:
 * - Add copy-to-clipboard fallback for share failure
 * - Include share preview modal before opening Warpcast
 * - Add multiple share platform support (Twitter, etc.)
 * 
 * CRITICAL:
 * - MUST use Warpcast icon from components/icons/
 * - Share URLs must be production-ready (gmeowhq.art)
 * - WCAG AAA contrast ratios required
 * 
 * REQUIREMENTS (farcaster.instructions.md):
 * - Base network: Chain ID 8453
 * - Website: https://gmeowhq.art
 * - Icons from components/icons/ directory
 * - TypeScript strict mode: No `any` types
 * 
 * AVOID:
 * - Emojis instead of SVG icons
 * - Hardcoded localhost URLs
 * - Blocking UI during share action
 * 
 * Website: https://gmeowhq.art
 * Network: Base (Chain ID: 8453)
 */

'use client'

import { motion } from 'framer-motion'
import type { ShareButtonProps } from './types'
import { ACCESSIBLE_COLORS } from './types'
import { buttonVariants } from './animations'
import { WarpcastIcon } from '@/components/icons/brands/warpcast'

/**
 * Share icon (generic)
 */
function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8.59 13.51L15.42 17.49"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M15.41 6.51L8.59 10.49"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  )
}

/**
 * Format share text based on event type
 */
function formatShareText(
  xpEarned: number,
  tierName: string,
  event: string
): string {
  const baseUrl = 'https://gmeowhq.art'
  
  // Event-specific templates
  const templates: Record<string, string> = {
    gm: `Just earned +${xpEarned} XP on gmeow for saying gm! 🌅`,
    stake: `Staked and earned +${xpEarned} XP! Currently at ${tierName} tier 💎`,
    'quest-complete': `Completed a quest and earned +${xpEarned} XP! 🎯`,
    'guild-join': `Joined a guild and earned +${xpEarned} XP! Teamwork! 🤝`,
    'badge-claim': `Claimed a badge and earned +${xpEarned} XP! Badge collector! 🏆`,
    referral: `Earned +${xpEarned} XP from referrals! Join me on gmeow! 🎁`,
  }

  const shareText = templates[event] || `Just earned +${xpEarned} XP on gmeow! Currently at ${tierName} tier 🚀`

  return `${shareText}\n\n${baseUrl}`
}

/**
 * Generate Warpcast share URL
 */
function getWarpcastShareUrl(text: string, ogImageUrl?: string): string {
  const params = new URLSearchParams({ text })
  
  if (ogImageUrl) {
    params.append('embeds[]', ogImageUrl)
  }

  return `https://warpcast.com/~/compose?${params.toString()}`
}

/**
 * Share Button Component
 * Warpcast integration with professional styling
 */
export function ShareButton({
  xpEarned,
  tierName,
  event,
  shareUrl,
  onShare,
}: ShareButtonProps) {
  const handleShare = () => {
    // Format share text
    const shareText = formatShareText(xpEarned, tierName, event)

    // Generate OG image URL (production endpoint)
    const ogImageUrl = shareUrl || `https://gmeowhq.art/api/og/xp-celebration?xp=${xpEarned}&tier=${encodeURIComponent(tierName)}&event=${event}`

    // Generate Warpcast share URL
    const warpcastUrl = getWarpcastShareUrl(shareText, ogImageUrl)

    // Callback
    onShare?.()

    // Open Warpcast in new tab
    window.open(warpcastUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <motion.button
      onClick={handleShare}
      className="flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold transition-colors"
      style={{
        backgroundColor: `${ACCESSIBLE_COLORS.primary}20`,
        color: ACCESSIBLE_COLORS.primary,
        border: `1px solid ${ACCESSIBLE_COLORS.primary}40`,
      }}
      variants={buttonVariants}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      aria-label={`Share on Warpcast: Earned ${xpEarned} XP`}
    >
      {/* Warpcast icon */}
      <WarpcastIcon className="h-5 w-5" />

      {/* Button text */}
      <span>Share on Warpcast</span>

      {/* Share icon */}
      <ShareIcon className="h-4 w-4 opacity-60" />
    </motion.button>
  )
}
