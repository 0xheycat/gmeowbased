/**
 * Warpcast Brand Icon
 * 
 * Official Warpcast/Farcaster protocol icon
 * Used for share buttons in XP celebration system
 * 
 * PHASE: Phase 2 - UI Enhancement (Week 2)
 * DATE: December 14, 2025
 * 
 * REFERENCE DOCUMENTATION:
 * - Warpcast Brand Guidelines: https://warpcast.com/~/press-kit
 * - XP-SYSTEM-COMPREHENSIVE-GUIDE-PART-2.md (ShareButton integration)
 * - components/xp-celebration/ShareButton.tsx (usage)
 * 
 * SUGGESTIONS:
 * - Add hover state color transitions
 * - Include animated variant for celebrations
 * 
 * CRITICAL:
 * - MUST match official Warpcast brand colors (#8A63D2 purple)
 * - SVG optimized for 24x24px standard size
 * - WCAG AAA contrast when used on dark backgrounds
 * 
 * REQUIREMENTS (farcaster.instructions.md):
 * - Base network: Chain ID 8453
 * - Website: https://gmeowhq.art
 * - TypeScript strict mode: No `any` types
 * 
 * AVOID:
 * - Using emojis instead of brand icon
 * - Non-standard colors (must use Warpcast purple)
 * - Overly complex SVG paths (performance)
 * 
 * Website: https://gmeowhq.art
 * Network: Base (Chain ID: 8453)
 */

import React from 'react'

interface WarpcastIconProps {
  className?: string
  size?: number
  color?: string
}

/**
 * Warpcast Icon Component
 * Official Farcaster protocol branding
 */
export function WarpcastIcon({ 
  className = '', 
  size = 24,
  color = 'currentColor' 
}: WarpcastIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Warpcast"
      role="img"
    >
      {/* Warpcast logo: Stylized "W" with protocol nodes */}
      <path
        d="M3 4.5L7.5 12L12 7.5L16.5 12L21 4.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 12V19.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16.5 12V19.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle
        cx="7.5"
        cy="19.5"
        r="1.5"
        fill={color}
      />
      <circle
        cx="16.5"
        cy="19.5"
        r="1.5"
        fill={color}
      />
      <circle
        cx="12"
        cy="7.5"
        r="1.5"
        fill={color}
      />
    </svg>
  )
}

export default WarpcastIcon
