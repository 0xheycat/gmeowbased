/**
 * Tier Icon Component - Maps Rank Tiers to Shield Icons
 * 
 * TODO:
 * - [ ] Add animated tier transitions (scale + fade when tier changes) - Phase 3 enhancement
 * - [ ] Add tier unlock celebrations (confetti burst on new tier) - Phase 3 enhancement
 * - [ ] Add SVG optimization (reduce file sizes if needed) - Post-launch optimization
 * 
 * FEATURES:
 * - Maps 12 IMPROVED_RANK_TIERS to 6 shield rank images (2:1 strategy)
 * - Responsive sizing (default 80px, customizable via props)
 * - Proper alt text for accessibility (tier name)
 * - Optimized image loading (next/image with priority)
 * - Type-safe tier name validation
 * 
 * PHASE: Phase 2 - UI Enhancement (Week 2)
 * DATE: December 14, 2025
 * 
 * REFERENCE DOCUMENTATION:
 * - XP-SYSTEM-COMPREHENSIVE-GUIDE-PART-1.md (Section: Rank & Tier System - 12-tier structure)
 * - lib/rank.ts (IMPROVED_RANK_TIERS constant - 12 tiers with minPoints/maxPoints)
 * - components/icons/assets/gmeow-illustrations/Ranks/Shield Ranks/Rank 1-6.png
 * 
 * TIER TO SHIELD MAPPING (2:1 Strategy):
 * - Tier 1-2 (Signal Kitten, Warp Scout) → Rank 1.png (0-1.5K points)
 * - Tier 3-4 (Beacon Runner, Night Operator) → Rank 2.png (1.5K-8K points)
 * - Tier 5-6 (Star Captain, Nebula Commander) → Rank 3.png (8K-25K points)
 * - Tier 7-8 (Quantum Navigator, Cosmic Architect) → Rank 4.png (25K-60K points)
 * - Tier 9-10 (Void Walker, Singularity Prime) → Rank 5.png (60K-250K points)
 * - Tier 11-12 (Infinite GM, Omniversal Being) → Rank 6.png (250K+ points)
 * 
 * SUGGESTIONS:
 * - [x] Add animated glow effects for mythic tiers (Rank 5-6 purple/pink dual glow)
 * - [ ] Include hover tooltips with tier requirements - Phase 3 enhancement
 * - [ ] Add tier progression preview (show next tier icon faded) - Phase 3 enhancement
 * 
 * CRITICAL:
 * - MUST use exact tier names from IMPROVED_RANK_TIERS
 * - Image paths must match Shield Ranks directory structure
 * - WCAG AAA: Alt text required for screen readers
 * - GPU-optimized: Use transform for animations, not width/height
 * 
 * REQUIREMENTS (farcaster.instructions.md):
 * - Base network: Chain ID 8453
 * - NO emojis: Use shield images only
 * - TypeScript strict mode: No `any` types
 * - Accessibility: WCAG AAA compliance (alt text, focus states)
 * 
 * AVOID:
 * - Hardcoded image paths (use dynamic mapping)
 * - Missing alt text (accessibility violation)
 * - Non-existent tier names (type safety violation)
 * - Blocking image loads (use next/image optimization)
 * 
 * Website: https://gmeowhq.art
 * Network: Base (Chain ID: 8453)
 */

'use client'

import Image from 'next/image'

/**
 * Tier names from IMPROVED_RANK_TIERS (lib/rank.ts)
 * 12 tiers total: Beginner (1-3), Intermediate (4-6), Advanced (7-9), Mythic (10-12)
 */
type TierName =
  | 'Signal Kitten'     // Tier 1: 0-500 pts
  | 'Warp Scout'        // Tier 2: 500-1.5K pts
  | 'Beacon Runner'     // Tier 3: 1.5K-4K pts
  | 'Night Operator'    // Tier 4: 4K-8K pts
  | 'Star Captain'      // Tier 5: 8K-15K pts
  | 'Nebula Commander'  // Tier 6: 15K-25K pts
  | 'Quantum Navigator' // Tier 7: 25K-40K pts
  | 'Cosmic Architect'  // Tier 8: 40K-60K pts
  | 'Void Walker'       // Tier 9: 60K-100K pts
  | 'Singularity Prime' // Tier 10: 100K-250K pts
  | 'Infinite GM'       // Tier 11: 250K-500K pts
  | 'Omniversal Being'  // Tier 12: 500K+ pts

/**
 * Maps tier names to shield rank images (2 tiers per shield)
 * Strategy: Group tiers by progression stage (beginner → mythic)
 */
const TIER_TO_SHIELD_MAP: Record<TierName, number> = {
  // Beginner Tiers → Rank 1-2
  'Signal Kitten': 1,      // 0-500 pts
  'Warp Scout': 1,         // 500-1.5K pts
  'Beacon Runner': 2,      // 1.5K-4K pts
  
  // Intermediate Tiers → Rank 2-3
  'Night Operator': 2,     // 4K-8K pts
  'Star Captain': 3,       // 8K-15K pts
  'Nebula Commander': 3,   // 15K-25K pts
  
  // Advanced Tiers → Rank 4-5
  'Quantum Navigator': 4,  // 25K-40K pts
  'Cosmic Architect': 4,   // 40K-60K pts
  'Void Walker': 5,        // 60K-100K pts
  
  // Mythic Tiers → Rank 5-6
  'Singularity Prime': 5,  // 100K-250K pts
  'Infinite GM': 6,        // 250K-500K pts
  'Omniversal Being': 6,   // 500K+ pts
}

interface TierIconProps {
  /** Tier name from IMPROVED_RANK_TIERS (must match exactly) */
  tierName: TierName
  
  /** Icon size in pixels (default: 80px) */
  size?: number
  
  /** Optional CSS class for styling */
  className?: string
  
  /** Priority loading for above-the-fold icons */
  priority?: boolean
}

/**
 * TierIcon Component
 * Renders tier-specific shield icon from Shield Ranks directory
 * 
 * @example
 * ```tsx
 * <TierIcon tierName="Star Captain" size={80} />
 * <TierIcon tierName="Omniversal Being" size={120} priority />
 * ```
 */
export function TierIcon({
  tierName,
  size = 80,
  className = '',
  priority = false,
}: TierIconProps) {
  // Get shield rank number (1-6) from tier name
  const shieldRank = TIER_TO_SHIELD_MAP[tierName]
  const isMythic = shieldRank >= 5 // Rank 5-6 are mythic tiers
  
  // Construct image path
  const imagePath = `/icons/assets/gmeow-illustrations/Ranks/Shield Ranks/Rank ${shieldRank}.png`
  
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      <Image
        src={imagePath}
        alt={`${tierName} tier icon`}
        width={size}
        height={size}
        priority={priority}
        className="object-contain"
        style={{
          // Enhanced glow for mythic tiers (Rank 5-6)
          filter: isMythic 
            ? 'drop-shadow(0 0 20px rgba(139, 92, 246, 0.6)) drop-shadow(0 0 40px rgba(236, 72, 153, 0.4))' 
            : 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.2))',
        }}
      />
    </div>
  )
}

/**
 * Get shield rank number for a tier name (utility function)
 * Useful for conditional styling or external logic
 */
export function getShieldRank(tierName: TierName): number {
  return TIER_TO_SHIELD_MAP[tierName]
}

/**
 * Check if tier is mythic (Rank 5-6 shields)
 * Useful for applying special effects (glow, shimmer)
 */
export function isMythicTier(tierName: TierName): boolean {
  const rank = TIER_TO_SHIELD_MAP[tierName]
  return rank >= 5
}
