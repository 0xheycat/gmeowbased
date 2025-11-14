import { clamp } from '@/lib/utils'

export type RankTier = {
  name: string
  minPoints: number
  tagline: string
  icon?: string
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

export const RANK_TIERS: RankTier[] = [
  { name: 'Signal Kitten', minPoints: 0, tagline: 'First pings onchain.' },
  { name: 'Warp Scout', minPoints: 500, tagline: 'Finding the daily signals.' },
  { name: 'Beacon Runner', minPoints: 1500, tagline: 'Guiding the GM relay.' },
  { name: 'Night Operator', minPoints: 4000, tagline: 'Keeping streaks alive across chains.' },
  { name: 'Star Captain', minPoints: 8000, tagline: 'Leading squads across the nebula.' },
  { name: 'Mythic GM', minPoints: 15000, tagline: 'Peak broadcast mastery.' },
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
