import { clamp } from '@/lib/utils/utils'

export type RankTier = {
  name: string
  minPoints: number
  maxPoints?: number
  tagline: string
  tier?: 'beginner' | 'intermediate' | 'advanced' | 'legendary' | 'mythic'
  icon?: string // Icon reference (components/icons or assets/gmeow-icons)
  colorClass?: string // Tailwind text color class
  bgClass?: string // Tailwind background class
  reward?: {
    type: 'badge' | 'multiplier' | 'exclusive'
    name?: string
    value?: number
    label?: string
  }
}

export type RankProgress = {
  currentTier: RankTier
  nextTier?: RankTier
  percent: number
  currentFloor: number
  nextTarget: number
  pointsIntoTier: number
  pointsToNext: number
  level: number
  levelFloor: number
  nextLevelTarget: number
  xpIntoLevel: number
  xpForLevel: number
  xpToNextLevel: number
  levelPercent: number
}

const LEVEL_XP_BASE = 300
const LEVEL_XP_INCREMENT = 200

function getXpForLevel(level: number) {
  const normalized = Math.max(1, Math.floor(level))
  return LEVEL_XP_BASE + (normalized - 1) * LEVEL_XP_INCREMENT
}

function getTotalXpToReachLevel(level: number) {
  const normalized = Math.max(0, Math.floor(level) - 1)
  if (normalized <= 0) return 0
  const n = normalized
  const a = LEVEL_XP_INCREMENT / 2
  const b = (2 * LEVEL_XP_BASE - LEVEL_XP_INCREMENT) / 2
  return a * n * n + b * n
}

export function calculateLevelProgress(points: number) {
  const normalized = Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0
  if (normalized <= 0) {
    const xpForLevel = getXpForLevel(1)
    return {
      level: 1,
      levelFloor: 0,
      nextLevelTarget: xpForLevel,
      xpIntoLevel: 0,
      xpForLevel,
      xpToNextLevel: xpForLevel,
      levelPercent: 0,
    }
  }

  const a = LEVEL_XP_INCREMENT / 2
  const b = (2 * LEVEL_XP_BASE - LEVEL_XP_INCREMENT) / 2
  const c = -normalized
  const discriminant = Math.max(0, b * b - 4 * a * c)
  const raw = (-b + Math.sqrt(discriminant)) / (2 * a)
  let n = Math.floor(raw)
  if (n < 0) n = 0

  while (getTotalXpToReachLevel(n + 1) <= normalized) n += 1
  while (n > 0 && getTotalXpToReachLevel(n) > normalized) n -= 1

  const level = n + 1
  const levelFloor = getTotalXpToReachLevel(level)
  const nextLevelTarget = getTotalXpToReachLevel(level + 1)
  const xpIntoLevel = normalized - levelFloor
  const xpForLevel = nextLevelTarget - levelFloor || getXpForLevel(level)
  const xpToNextLevel = Math.max(0, nextLevelTarget - normalized)
  const levelPercent = xpForLevel > 0 ? clampPercent(xpIntoLevel / xpForLevel) : 1

  return {
    level,
    levelFloor,
    nextLevelTarget,
    xpIntoLevel,
    xpForLevel,
    xpToNextLevel,
    levelPercent,
  }
}

// Legacy 6-tier system (for backward compatibility)
export const RANK_TIERS: RankTier[] = [
  { name: 'Signal Kitten', minPoints: 0, tagline: 'First pings onchain.' },
  { name: 'Warp Scout', minPoints: 500, tagline: 'Finding the daily signals.' },
  { name: 'Beacon Runner', minPoints: 1500, tagline: 'Guiding the GM relay.' },
  { name: 'Night Operator', minPoints: 4000, tagline: 'Keeping streaks alive across chains.' },
  { name: 'Star Captain', minPoints: 8000, tagline: 'Leading squads across the nebula.' },
  { name: 'Mythic GM', minPoints: 15000, tagline: 'Peak broadcast mastery.' },
]

/**
 * IMPROVED 12-TIER RANK SYSTEM
 * Reference: https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/customizing-your-profile/personalizing-your-profile
 * Inspired by: GitHub Achievements + Gaming RPG Systems
 * 
 * CRITICAL: NO EMOJIS - Uses icon references only
 * - components/icons/* for React components
 * - assets/gmeow-icons/* for SVG assets
 */
export const IMPROVED_RANK_TIERS: RankTier[] = [
  // Beginner Tiers (0-5K)
  {
    name: 'Signal Kitten',
    minPoints: 0,
    maxPoints: 500,
    tagline: 'First pings onchain.',
    tier: 'beginner',
    icon: 'star', // components/icons/star.tsx
    colorClass: 'text-gray-400',
    bgClass: 'bg-gray-900/50',
    reward: { type: 'badge', name: 'First Steps', label: 'First Steps Badge' },
  },
  {
    name: 'Warp Scout',
    minPoints: 500,
    maxPoints: 1500,
    tagline: 'Finding the daily signals.',
    tier: 'beginner',
    icon: 'compass', // components/icons/compass.tsx
    colorClass: 'text-blue-400',
    bgClass: 'bg-blue-900/50',
    reward: { type: 'badge', name: 'Explorer', label: 'Explorer Badge' },
  },
  {
    name: 'Beacon Runner',
    minPoints: 1500,
    maxPoints: 4000,
    tagline: 'Guiding the GM relay.',
    tier: 'beginner',
    icon: 'flash', // components/icons/flash.tsx
    colorClass: 'text-accent-green',
    bgClass: 'bg-green-900/50',
    reward: { type: 'multiplier', value: 1.1, label: '+10% Quest XP' },
  },

  // Intermediate Tiers (4K-20K)
  {
    name: 'Night Operator',
    minPoints: 4000,
    maxPoints: 8000,
    tagline: 'Keeping streaks alive across chains.',
    tier: 'intermediate',
    icon: 'moon', // components/icons/moon.tsx
    colorClass: 'text-purple-400',
    bgClass: 'bg-purple-900/50',
    reward: { type: 'badge', name: 'Streak Master', label: 'Streak Master Badge' },
  },
  {
    name: 'Star Captain',
    minPoints: 8000,
    maxPoints: 15000,
    tagline: 'Leading squads across the nebula.',
    tier: 'intermediate',
    icon: 'star-fill', // components/icons/star-fill.tsx
    colorClass: 'text-gold',
    bgClass: 'bg-yellow-900/50',
    reward: { type: 'multiplier', value: 1.2, label: '+20% Quest XP' },
  },
  {
    name: 'Nebula Commander',
    minPoints: 15000,
    maxPoints: 25000,
    tagline: 'Coordinating fleet maneuvers.',
    tier: 'intermediate',
    icon: 'verified', // components/icons/verified.tsx
    colorClass: 'text-pink-400',
    bgClass: 'bg-pink-900/50',
    reward: { type: 'badge', name: 'Guild Founder', label: 'Guild Founder Badge' },
  },

  // Advanced Tiers (25K-100K)
  {
    name: 'Quantum Navigator',
    minPoints: 25000,
    maxPoints: 40000,
    tagline: 'Bending spacetime protocols.',
    tier: 'advanced',
    icon: 'level-icon', // components/icons/level-icon.tsx
    colorClass: 'text-violet-400',
    bgClass: 'bg-violet-900/50',
    reward: { type: 'multiplier', value: 1.3, label: '+30% Quest XP' },
  },
  {
    name: 'Cosmic Architect',
    minPoints: 40000,
    maxPoints: 60000,
    tagline: 'Building cross-chain infrastructure.',
    tier: 'advanced',
    icon: 'verified-icon', // components/icons/verified-icon.tsx
    colorClass: 'text-red-400',
    bgClass: 'bg-red-900/50',
    reward: { type: 'badge', name: 'System Builder', label: 'System Builder Badge' },
  },
  {
    name: 'Void Walker',
    minPoints: 60000,
    maxPoints: 100000,
    tagline: 'Transcending the known networks.',
    tier: 'advanced',
    icon: 'power', // components/icons/power.tsx
    colorClass: 'text-emerald-400',
    bgClass: 'bg-emerald-900/50',
    reward: { type: 'multiplier', value: 1.5, label: '+50% Quest XP' },
  },

  // Legendary Tiers (100K+)
  {
    name: 'Singularity Prime',
    minPoints: 100000,
    maxPoints: 250000,
    tagline: 'Legendary broadcast mastery.',
    tier: 'legendary',
    icon: 'star-fill', // components/icons/star-fill.tsx (with gradient)
    colorClass: 'text-orange-400',
    bgClass: 'bg-orange-900/50',
    reward: { type: 'badge', name: 'Legendary Pilot', label: 'Legendary Pilot Badge' },
  },
  {
    name: 'Infinite GM',
    minPoints: 250000,
    maxPoints: 500000,
    tagline: 'Eternal presence across all chains.',
    tier: 'legendary',
    icon: 'loop-icon', // components/icons/loop-icon.tsx
    colorClass: 'text-cyan-400',
    bgClass: 'bg-cyan-900/50',
    reward: { type: 'multiplier', value: 2.0, label: '+100% Quest XP' },
  },
  {
    name: 'Omniversal Being',
    minPoints: 500000,
    maxPoints: Infinity,
    tagline: 'Peak existence beyond comprehension.',
    tier: 'mythic',
    icon: 'star-fill', // components/icons/star-fill.tsx (premium variant)
    colorClass: 'text-brand', // Farcaster purple from tailwind.config.ts
    bgClass: 'bg-brand/20',
    reward: { type: 'exclusive', label: 'Custom Role + Discord Access' },
  },
]

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0
  return clamp(value, 0, 1)
}

export function getRankTierByPoints(points: number): RankTier {
  if (!Number.isFinite(points) || points < 0) return RANK_TIERS[0]
  let candidate = RANK_TIERS[0]
  for (const tier of RANK_TIERS) {
    if (points >= tier.minPoints) {
      candidate = tier
    } else {
      break
    }
  }
  return candidate
}

export function calculateRankProgress(points: number): RankProgress {
  const normalized = Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0
  const currentTier = getRankTierByPoints(normalized)
  const currentIndex = RANK_TIERS.findIndex((tier) => tier.name === currentTier.name)
  const nextTier = currentIndex >= 0 && currentIndex < RANK_TIERS.length - 1 ? RANK_TIERS[currentIndex + 1] : undefined
  const currentFloor = currentTier.minPoints
  const nextTarget = nextTier ? nextTier.minPoints : currentFloor + 2000
  const span = nextTarget - currentFloor
  const pointsIntoTier = normalized - currentFloor
  const pointsToNext = nextTier ? Math.max(0, nextTarget - normalized) : 0
  const percent = span > 0 ? clampPercent(pointsIntoTier / span) : 1
  const levelSnapshot = calculateLevelProgress(normalized)

  return {
    currentTier,
    nextTier,
    percent,
    currentFloor,
    nextTarget,
    pointsIntoTier,
    pointsToNext,
    level: levelSnapshot.level,
    levelFloor: levelSnapshot.levelFloor,
    nextLevelTarget: levelSnapshot.nextLevelTarget,
    xpIntoLevel: levelSnapshot.xpIntoLevel,
    xpForLevel: levelSnapshot.xpForLevel,
    xpToNextLevel: levelSnapshot.xpToNextLevel,
    levelPercent: levelSnapshot.levelPercent,
  }
}

export function formatPoints(points: number): string {
  if (!Number.isFinite(points)) return '0'
  if (Math.abs(points) >= 1_000_000) return `${(points / 1_000_000).toFixed(1)}M`
  if (Math.abs(points) >= 1000) return `${(points / 1000).toFixed(1)}k`
  return points.toLocaleString('en-US')
}

const INTL_INTEGER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

export function formatXp(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return INTL_INTEGER.format(Math.max(0, Math.floor(value)))
}

/**
 * Get next tier reward info for a given point value
 * @param currentPoints - User's current point total
 * @param useLegacyTiers - Use 6-tier system (default: false, use 12-tier)
 * @returns Next tier info with reward details
 */
export function getNextTierReward(
  currentPoints: number,
  useLegacyTiers = false
): {
  nextTier: RankTier | null
  pointsNeeded: number
  reward: RankTier['reward'] | null
} {
  const tiers = useLegacyTiers ? RANK_TIERS : IMPROVED_RANK_TIERS
  const normalized = Number.isFinite(currentPoints) ? Math.max(0, Math.floor(currentPoints)) : 0

  // Find current tier
  const currentTier = tiers.find(
    (tier) =>
      normalized >= tier.minPoints &&
      (tier.maxPoints === undefined || normalized < tier.maxPoints)
  )

  if (!currentTier) {
    // Fallback to first tier
    const firstTier = tiers[0]
    return {
      nextTier: firstTier,
      pointsNeeded: firstTier.minPoints - normalized,
      reward: firstTier.reward || null,
    }
  }

  // Find next tier index
  const currentIndex = tiers.findIndex((t) => t.name === currentTier.name)
  if (currentIndex === -1 || currentIndex >= tiers.length - 1) {
    // Already at max tier
    return {
      nextTier: null,
      pointsNeeded: 0,
      reward: null,
    }
  }

  const nextTier = tiers[currentIndex + 1]
  const pointsNeeded = nextTier.minPoints - normalized

  return {
    nextTier,
    pointsNeeded: Math.max(0, pointsNeeded),
    reward: nextTier.reward || null,
  }
}

/**
 * Apply rank multiplier to XP earnings
 * @param baseXP - Base XP amount
 * @param currentPoints - User's current points (determines tier)
 * @param useLegacyTiers - Use 6-tier system (default: false, use 12-tier)
 * @returns Multiplied XP amount
 */
export function applyRankMultiplier(
  baseXP: number,
  currentPoints: number,
  useLegacyTiers = false
): number {
  if (!Number.isFinite(baseXP) || baseXP <= 0) return 0

  const tiers = useLegacyTiers ? RANK_TIERS : IMPROVED_RANK_TIERS
  const normalized = Number.isFinite(currentPoints) ? Math.max(0, Math.floor(currentPoints)) : 0

  // Find current tier
  const currentTier = tiers.find(
    (tier) =>
      normalized >= tier.minPoints &&
      (tier.maxPoints === undefined || normalized < tier.maxPoints)
  )

  // Check if tier has multiplier reward
  if (currentTier?.reward?.type === 'multiplier' && currentTier.reward.value) {
    return Math.floor(baseXP * currentTier.reward.value)
  }

  // No multiplier, return base XP
  return Math.floor(baseXP)
}

/**
 * Get improved rank tier by points (uses 12-tier system)
 * @param points - User's current points
 * @returns Tier object with icon, colors, rewards
 */
export function getImprovedRankTierByPoints(points: number): RankTier {
  if (!Number.isFinite(points) || points < 0) return IMPROVED_RANK_TIERS[0]
  
  let candidate = IMPROVED_RANK_TIERS[0]
  for (const tier of IMPROVED_RANK_TIERS) {
    if (points >= tier.minPoints && (tier.maxPoints === undefined || points < tier.maxPoints)) {
      candidate = tier
      break
    }
  }
  return candidate
}
