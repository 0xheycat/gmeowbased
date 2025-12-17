/**
 * Profile Stats Calculator
 * 
 * Calculates derived statistics for profile display:
 * - Level from total_score (lib/rank.ts)
 * - Rank tier from base_points
 * - Streak days from streak_bonus
 * - Progress percentages
 * 
 * Used By:
 * - ProfileStats component
 * - ProfileHeader component
 * - Leaderboard calculations
 * 
 * @module lib/profile/stats-calculator
 */

import { calculateLevelProgress, getRankTierByPoints } from '@/lib/leaderboard/rank'
import type { ProfileStats } from './types'
import type { RankProgress } from '@/lib/leaderboard/rank'

// ============================================================================
// TYPES
// ============================================================================

export interface StatsCalculationResult {
  level: number
  levelPercent: number
  xpToNextLevel: number
  rankTier: string
  streak: number
  totalScore: number
  formattedStats: {
    base_points: string
    viral_xp: string
    total_score: string
    quest_completions: string
    badge_count: string
  }
  rankProgress: RankProgress
}

// ============================================================================
// CALCULATIONS
// ============================================================================

/**
 * Calculate level and progress from total_score
 * 
 * Uses lib/rank.ts calculateLevelProgress function
 * Level formula: Based on total_score (auto-calculated in leaderboard_calculations)
 * 
 * @param totalScore - Total score from leaderboard_calculations.total_score
 * @returns Level number and progress data
 */
function calculateLevel(totalScore: number): {
  level: number
  percent: number
  xpToNext: number
  rankProgress: RankProgress
} {
  const levelData = calculateLevelProgress(totalScore)
  const tier = getRankTierByPoints(totalScore)
  
  // Combine level data with tier information to create full RankProgress
  const rankProgress: RankProgress = {
    ...levelData,
    currentTier: tier,
    percent: levelData.levelPercent,
    currentFloor: levelData.levelFloor,
    nextTarget: levelData.nextLevelTarget,
    pointsIntoTier: levelData.xpIntoLevel,
    pointsToNext: levelData.xpToNextLevel,
  }
  
  return {
    level: levelData.level,
    percent: levelData.levelPercent,
    xpToNext: levelData.xpToNextLevel,
    rankProgress,
  }
}

/**
 * Calculate rank tier from base_points
 * 
 * Uses lib/rank.ts getRankTierByPoints function
 * 
 * @param basePoints - Base points from leaderboard_calculations.base_points
 * @returns Rank tier name (e.g., 'Rookie', 'Elite GM', 'GM Legend')
 */
function calculateRankTier(basePoints: number): string {
  const tier = getRankTierByPoints(basePoints)
  return tier?.name || 'Rookie'
}

/**
 * Calculate streak days from streak_bonus
 * 
 * Assumption: 10 points per streak day (configurable)
 * 
 * @param streakBonus - Streak bonus from leaderboard_calculations.streak_bonus
 * @returns Number of consecutive days
 */
function calculateStreak(streakBonus: number): number {
  const POINTS_PER_DAY = 10
  return Math.floor(streakBonus / POINTS_PER_DAY)
}

/**
 * Format large numbers for display
 * 
 * Examples:
 * - 1234 → "1,234"
 * - 1234567 → "1,234,567"
 * 
 * @param value - Number to format
 * @returns Formatted string with commas
 */
function formatNumber(value: number): string {
  return value.toLocaleString('en-US')
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Calculate all profile statistics
 * 
 * Input Data (from leaderboard_calculations table):
 * - total_score: Auto-calculated total (GENERATED column)
 * - base_points: Quest completion points
 * - viral_xp: Social engagement XP
 * - streak_bonus: Daily streak bonus points
 * 
 * Additional Counts:
 * - questCount: Count from quest_completions table
 * - badgeCount: Count from user_badges table
 * 
 * Output:
 * - Calculated level and progress
 * - Rank tier name
 * - Streak days
 * - Formatted numbers for display
 * 
 * @param stats - ProfileStats from profile-service.ts
 * @returns Complete calculation result
 */
export function calculateStats(stats: ProfileStats): StatsCalculationResult {
  // Calculate level from total_score
  const levelData = calculateLevel(stats.total_score)
  
  // Calculate rank tier from base_points
  const rankTier = calculateRankTier(stats.base_points)
  
  // Calculate streak from streak_bonus
  const streak = calculateStreak(stats.streak_bonus)
  
  // Format numbers for display
  const formattedStats = {
    base_points: formatNumber(stats.base_points),
    viral_xp: formatNumber(stats.viral_xp),
    total_score: formatNumber(stats.total_score),
    quest_completions: formatNumber(stats.quest_completions),
    badge_count: formatNumber(stats.badge_count),
  }
  
  return {
    level: levelData.level,
    levelPercent: levelData.percent,
    xpToNextLevel: levelData.xpToNext,
    rankTier: stats.rank_tier || rankTier, // Use leaderboard tier if available
    streak,
    totalScore: stats.total_score,
    formattedStats,
    rankProgress: levelData.rankProgress,
  }
}

/**
 * Calculate member age in days
 * 
 * @param memberSince - ISO date string from user_profiles.onboarded_at
 * @returns Number of days since onboarding
 */
export function getMemberAgeDays(memberSince: string): number {
  const onboardedAt = new Date(memberSince)
  const now = new Date()
  const diffMs = now.getTime() - onboardedAt.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Format member age for display
 * 
 * Examples:
 * - 0-30 days: "X days"
 * - 31-365 days: "X months"
 * - 366+ days: "X years"
 * 
 * @param memberSince - ISO date string
 * @returns Human-readable age (e.g., "3 months", "2 years")
 */
export function formatMemberAge(memberSince: string): string {
  const days = getMemberAgeDays(memberSince)
  
  if (days < 31) {
    return `${days} day${days !== 1 ? 's' : ''}`
  }
  
  if (days < 366) {
    const months = Math.floor(days / 30)
    return `${months} month${months !== 1 ? 's' : ''}`
  }
  
  const years = Math.floor(days / 365)
  return `${years} year${years !== 1 ? 's' : ''}`
}

/**
 * Calculate activity rate (quests per day)
 * 
 * @param questCompletions - Total quests completed
 * @param memberSince - ISO date string
 * @returns Average quests per day
 */
export function calculateActivityRate(questCompletions: number, memberSince: string): number {
  const days = Math.max(1, getMemberAgeDays(memberSince))
  return questCompletions / days
}

/**
 * Format last active time
 * 
 * Examples:
 * - < 1 hour: "Just now"
 * - < 24 hours: "X hours ago"
 * - < 7 days: "X days ago"
 * - 7+ days: "Inactive"
 * 
 * @param lastActive - ISO date string from leaderboard_calculations.updated_at
 * @returns Human-readable time (e.g., "2 hours ago")
 */
export function formatLastActive(lastActive: string): string {
  const lastActiveAt = new Date(lastActive)
  const now = new Date()
  const diffMs = now.getTime() - lastActiveAt.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMinutes < 60) {
    return 'Just now'
  }
  
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  }
  
  if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  }
  
  return 'Inactive'
}
