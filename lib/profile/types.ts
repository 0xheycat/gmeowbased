/**
 * Profile Type System
 * 
 * Complete type definitions for profile data, stats, and activity.
 * Integrates with existing Supabase schema and Farcaster/Neynar API.
 * 
 * References:
 * - user_profiles table (Supabase)
 * - leaderboard_calculations table
 * - Farcaster API (via Neynar)
 * 
 * Quality Gates:
 * - GI-13: Complete type safety with strict interfaces
 * - GI-11: Safe default values for all nullable fields
 * 
 * @module lib/profile/types
 */

// ============================================================================
// FARCASTER INTEGRATION TYPES
// ============================================================================

/**
 * Farcaster user data from Neynar API
 * MCP Verified: November 17, 2025
 */
export interface FarcasterData {
  fid: number
  username: string
  display_name: string
  bio: string
  pfp_url: string
  verified: boolean
  follower_count: number
  following_count: number
  power_badge: boolean
  verified_addresses: string[]
  custody_address: string
}

// ============================================================================
// BASE CHAIN INTEGRATION TYPES (Base-only system)
// ============================================================================

/**
 * Base chain wallet information
 * 
 * NOTE: System is Base-only. All addresses are on Base chain.
 * user_profiles.wallet_address = primary wallet
 * leaderboard_calculations.address = wallet with points
 */
export interface WalletData {
  address: string              // Base chain address (0x...)
  ens_name?: string | null     // ENS if available
  is_verified: boolean         // Verified via Farcaster
}

// ============================================================================
// SOCIAL LINKS TYPES
// ============================================================================

/**
 * Social media connections
 */
export interface SocialLinks {
  warpcast?: string | null    // Warpcast profile URL
  twitter?: string | null      // Twitter/X profile URL
  github?: string | null       // GitHub profile URL
  website?: string | null      // Personal website
}

// ============================================================================
// PROFILE STATS TYPES
// ============================================================================

/**
 * User profile statistics from user_points_balances + Subsquid
 * 
 * Data Sources:
 * - points_balance: user_points_balances.points_balance (spendable points from activities)
 * - viral_points: user_points_balances.viral_points (engagement points from viral casts)
 * - guild_points_awarded: user_points_balances.guild_points_awarded (guild membership bonus)
 * - total_score: GENERATED column (points_balance + viral_points + guild_points_awarded)
 * - current_streak: Subsquid UserOnChainStats.currentStreak (on-chain)
 * - global_rank: points_leaderboard view (calculated from total_score)
 * - level: unified-calculator.calculateLevelProgress(total_score)
 * - rank_tier: unified-calculator.getRankTierByPoints(total_score)
 * - referral_bonus: Future feature (from referrals table)
 * - streak_bonus: Derived (current_streak * 10)
 * - badge_prestige: Derived (badge_count * 25)
 * - quest_completions: Count from quest_completions table
 * - badge_count: Count from user_badges table
 */
export interface ProfileStats {
  // Points (from user_points_balances - migrated Dec 22, 2025)
  points_balance: number        // Blockchain points (spendable currency)
  viral_points: number          // Social engagement points
  guild_points_awarded: number  // Guild contribution points  
  total_score: number           // Auto-calculated total (generated column)
  
  // Progression (calculated by unified-calculator)
  level: number                 // Current user level (1-100+)
  rank_tier: string             // Rank tier name (Signal Kitten, Star Captain, etc.)
  current_streak: number        // Current GM streak from Subsquid
  
  // Leaderboard position
  global_rank?: number          // Global leaderboard position (calculated on demand)
  
  // Legacy fields (for backward compatibility - TODO: migrate to new schema)
  referral_bonus?: number       // Referral rewards (deprecated - moving to separate table)
  streak_bonus?: number         // Streak rewards (deprecated - use current_streak * 10)
  badge_prestige?: number       // Badge collection prestige (deprecated - use badge_count * 25)
  
  // Activity Metrics (from Supabase)
  quest_completions: number     // Total quests completed
  badge_count: number           // Total badges earned
  viral_casts: number           // Total viral badge shares (deprecated)
  
  // Time-based
  member_since: string          // ISO date (user_profiles.onboarded_at)
  last_active: string           // ISO date (user_points_balances.last_synced_at)
}

// ============================================================================
// ACTIVITY TYPES
// ============================================================================

/**
 * Activity event types for timeline
 */
export type ActivityType = 
  | 'quest_completed'
  | 'badge_earned'
  | 'level_up'
  | 'rank_changed'
  | 'viral_milestone'
  | 'streak_milestone'
  | 'quest_created'
  | 'achievement_unlocked'

/**
 * Single activity item for timeline
 */
export interface ActivityItem {
  id: string
  type: ActivityType
  title: string
  description: string
  timestamp: string          // ISO date
  metadata?: {
    quest_id?: string
    badge_id?: string
    xp_earned?: number
    points_earned?: number
    old_rank?: number
    new_rank?: number
    old_level?: number
    new_level?: number
    cast_hash?: string
    tier?: string
  }
}

// ============================================================================
// SETTINGS TYPES
// ============================================================================

/**
 * User profile settings (privacy, notifications)
 */
export interface ProfileSettings {
  // Privacy
  profile_visibility: 'public' | 'private'
  show_wallet_address: boolean
  show_quest_history: boolean
  show_badge_collection: boolean
  show_stats: boolean
  
  // Notifications
  email_notifications: boolean
  quest_reminders: boolean
  badge_earned_alerts: boolean
  quest_invites: boolean
  leaderboard_updates: boolean
  weekly_summary: boolean
  
  // Display
  theme: 'light' | 'dark' | 'auto'
  language: 'en' | 'es' | 'fr' | 'ja' | 'ko' | 'zh'
}

/**
 * Default settings for new users
 */
export const DEFAULT_PROFILE_SETTINGS: ProfileSettings = {
  // Privacy (default: public)
  profile_visibility: 'public',
  show_wallet_address: true,
  show_quest_history: true,
  show_badge_collection: true,
  show_stats: true,
  
  // Notifications (default: all on except weekly summary)
  email_notifications: true,
  quest_reminders: true,
  badge_earned_alerts: true,
  quest_invites: true,
  leaderboard_updates: true,
  weekly_summary: false,
  
  // Display (default: auto theme, English)
  theme: 'auto',
  language: 'en',
}

// ============================================================================
// COMPLETE PROFILE DATA
// ============================================================================

/**
 * Complete user profile data structure
 * 
 * This is the primary data type for profile pages.
 * Combines Farcaster, wallet, stats, and settings.
 */
export interface ProfileData {
  // Core Identity (from user_profiles + Farcaster)
  fid: number
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  cover_image_url?: string | null
  
  // Wallet & Blockchain (Base chain only)
  wallet: WalletData
  
  // Social Connections
  social_links: SocialLinks
  
  // Profile Statistics (from leaderboard_calculations)
  stats: ProfileStats
  
  // Neynar Score (from user_profiles)
  neynar_score: number | null
  neynar_tier: string | null  // mythic | legendary | epic | rare | common
  
  // Metadata (from user_profiles.metadata JSONB)
  metadata: Record<string, unknown>
  
  // Timestamps
  created_at: string         // ISO date (profile creation)
  updated_at: string         // ISO date (last profile update)
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Profile update request payload
 * Only include fields that can be updated by user
 */
export interface ProfileUpdateRequest {
  // Basic Info
  display_name?: string
  bio?: string
  avatar_url?: string
  cover_image_url?: string
  
  // Social Links
  social_links?: Partial<SocialLinks>
  
  // Metadata (JSONB custom fields)
  metadata?: Record<string, unknown>
}

/**
 * Profile API response structure
 */
export interface ProfileApiResponse {
  profile: ProfileData
  activity?: ActivityItem[]
  cached?: boolean
  cached_at?: string
}

/**
 * Profile stats calculator result
 */
export interface StatsCalculationResult {
  stats: ProfileStats
  level_progress: {
    current_level: number
    next_level: number
    xp_in_level: number
    xp_for_level: number
    level_percent: number
  }
  rank_tier: {
    name: string
    min_points: number
    icon?: string
  }
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Profile field validation constraints
 */
export const PROFILE_CONSTRAINTS = {
  DISPLAY_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
  },
  BIO: {
    MIN_LENGTH: 0,
    MAX_LENGTH: 150,
  },
  SOCIAL_URL: {
    MAX_LENGTH: 200,
  },
} as const

/**
 * Type guard to check if profile data is valid
 */
export function isValidProfileData(data: unknown): data is ProfileData {
  if (!data || typeof data !== 'object') return false
  const profile = data as ProfileData
  
  return (
    typeof profile.fid === 'number' &&
    profile.fid > 0 &&
    typeof profile.username === 'string' &&
    profile.username.length > 0 &&
    typeof profile.display_name === 'string' &&
    profile.display_name.length > 0
  )
}

/**
 * Type guard to check if update request is valid
 */
export function isValidProfileUpdate(data: unknown): data is ProfileUpdateRequest {
  if (!data || typeof data !== 'object') return false
  const update = data as ProfileUpdateRequest
  
  // If display_name provided, must be valid length
  if (update.display_name !== undefined) {
    if (typeof update.display_name !== 'string') return false
    if (
      update.display_name.length < PROFILE_CONSTRAINTS.DISPLAY_NAME.MIN_LENGTH ||
      update.display_name.length > PROFILE_CONSTRAINTS.DISPLAY_NAME.MAX_LENGTH
    ) {
      return false
    }
  }
  
  // If bio provided, must be valid length
  if (update.bio !== undefined) {
    if (typeof update.bio !== 'string') return false
    if (update.bio.length > PROFILE_CONSTRAINTS.BIO.MAX_LENGTH) {
      return false
    }
  }
  
  return true
}
