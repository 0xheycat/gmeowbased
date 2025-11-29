/**
 * Supabase Database Helpers - Phase 12: MCP Integration
 * 
 * Reuses patterns from old foundation:
 * - backups/pre-migration-20251126-213424/lib/badges.ts (ServerCache, table operations)
 * - backups/pre-migration-20251126-213424/lib/telemetry.ts (rank events, aggregation)
 * 
 * NEW: Type-safe helpers with MCP-generated types
 * NEVER: Use old foundation UI/UX
 */

import { getSupabaseServerClient, ServerCache } from '@/lib/supabase'
import type { Database, Tables, TablesInsert, TablesUpdate } from '@/types/supabase'

// ========================================
// Type Aliases (for convenience)
// ========================================

export type UserProfile = Tables<'user_profiles'>
export type UserBadge = Tables<'user_badges'>
export type UserQuest = Tables<'user_quests'>
export type QuestDefinition = Tables<'quest_definitions'>
export type BadgeTemplate = Tables<'badge_templates'>
export type MintQueueEntry = Tables<'mint_queue'>
export type FrameSession = Tables<'frame_sessions'>
export type GmeowRankEvent = Tables<'gmeow_rank_events'>

export type UserProfileInsert = TablesInsert<'user_profiles'>
export type UserBadgeInsert = TablesInsert<'user_badges'>
export type UserQuestInsert = TablesInsert<'user_quests'>

export type UserProfileUpdate = TablesUpdate<'user_profiles'>
export type UserBadgeUpdate = TablesUpdate<'user_badges'>
export type UserQuestUpdate = TablesUpdate<'user_quests'>

// ========================================
// Caching (from old foundation)
// ========================================

// 2 minutes cache for user profiles
const userProfileCache = new ServerCache<UserProfile>(2 * 60 * 1000)

// 5 minutes cache for badge templates
const badgeTemplateCache = new ServerCache<BadgeTemplate[]>(5 * 60 * 1000)

// 2 minutes cache for user badges
const userBadgesCache = new ServerCache<UserBadge[]>(2 * 60 * 1000)

// ========================================
// User Profile Operations
// ========================================

/**
 * Get user profile by FID with caching
 * 
 * @param fid - Farcaster ID
 * @returns User profile or null
 */
export async function getUserProfile(fid: number): Promise<UserProfile | null> {
  const cacheKey = `profile:${fid}`
  const cached = userProfileCache.get(cacheKey)
  if (cached) return cached

  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('fid', fid)
    .single()

  if (error || !data) return null

  userProfileCache.set(cacheKey, data)
  return data
}

/**
 * Create or update user profile (upsert pattern from old foundation)
 * 
 * @param profile - Profile data to upsert
 * @returns Updated profile or null
 */
export async function upsertUserProfile(
  profile: UserProfileInsert
): Promise<UserProfile | null> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(profile, {
      onConflict: 'fid', // Unique constraint on FID
      ignoreDuplicates: false,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('[Supabase] Failed to upsert user profile:', error)
    return null
  }

  // Clear cache
  userProfileCache.clear(`profile:${profile.fid}`)

  return data
}

/**
 * Update user XP and points (from old foundation telemetry pattern)
 * 
 * @param fid - Farcaster ID
 * @param xpDelta - XP change (can be negative)
 * @param pointsDelta - Points change (can be negative)
 * @returns Updated profile or null
 */
export async function updateUserProgress(
  fid: number,
  xpDelta: number,
  pointsDelta: number = 0
): Promise<UserProfile | null> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  // Get current profile
  const currentProfile = await getUserProfile(fid)
  if (!currentProfile) {
    console.error('[Supabase] User profile not found:', fid)
    return null
  }

  const newXp = (currentProfile.xp || 0) + xpDelta
  const newPoints = (currentProfile.points || 0) + pointsDelta

  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      xp: newXp,
      points: newPoints,
      updated_at: new Date().toISOString(),
    })
    .eq('fid', fid)
    .select()
    .single()

  if (error || !data) {
    console.error('[Supabase] Failed to update user progress:', error)
    return null
  }

  // Clear cache
  userProfileCache.clear(`profile:${fid}`)

  return data
}

// ========================================
// Badge Operations (from old foundation)
// ========================================

/**
 * Get all active badge templates with caching
 * 
 * @returns Array of badge templates
 */
export async function getBadgeTemplates(): Promise<BadgeTemplate[]> {
  const cacheKey = 'badge-templates:active'
  const cached = badgeTemplateCache.get(cacheKey)
  if (cached) return cached

  const supabase = getSupabaseServerClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('badge_templates')
    .select('*')
    .eq('active', true)
    .order('points_cost', { ascending: true })

  if (error || !data) {
    console.error('[Supabase] Failed to fetch badge templates:', error)
    return []
  }

  badgeTemplateCache.set(cacheKey, data)
  return data
}

/**
 * Get user badges by FID with caching
 * 
 * @param fid - Farcaster ID
 * @returns Array of user badges
 */
export async function getUserBadges(fid: number): Promise<UserBadge[]> {
  const cacheKey = `badges:${fid}`
  const cached = userBadgesCache.get(cacheKey)
  if (cached) return cached

  const supabase = getSupabaseServerClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('user_badges')
    .select('*')
    .eq('fid', fid)
    .order('assigned_at', { ascending: false })

  if (error || !data) {
    console.error('[Supabase] Failed to fetch user badges:', error)
    return []
  }

  userBadgesCache.set(cacheKey, data)
  return data
}

/**
 * Assign badge to user (from old foundation pattern)
 * 
 * @param fid - Farcaster ID
 * @param badgeId - Badge template ID
 * @param badgeType - Badge type
 * @param tier - Tier level
 * @returns Created badge or null
 */
export async function assignBadgeToUser(
  fid: number,
  badgeId: string,
  badgeType: string,
  tier: 'mythic' | 'legendary' | 'epic' | 'rare' | 'common'
): Promise<UserBadge | null> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  const badgeData: UserBadgeInsert = {
    fid,
    badge_id: badgeId,
    badge_type: badgeType,
    tier,
    minted: false,
  }

  const { data, error } = await supabase
    .from('user_badges')
    .insert(badgeData)
    .select()
    .single()

  if (error || !data) {
    console.error('[Supabase] Failed to assign badge:', error)
    return null
  }

  // Clear cache
  userBadgesCache.clear(`badges:${fid}`)

  return data
}

// ========================================
// Quest Operations
// ========================================

/**
 * Get active quest definitions
 * 
 * @returns Array of active quests
 */
export async function getActiveQuests(): Promise<QuestDefinition[]> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return []

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('quest_definitions')
    .select('*')
    .eq('is_active', true)
    .or(`end_date.is.null,end_date.gte.${now}`)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('[Supabase] Failed to fetch active quests:', error)
    return []
  }

  return data
}

/**
 * Get user quest progress
 * 
 * @param fid - Farcaster ID
 * @param questId - Quest definition ID (optional)
 * @returns Array of user quests
 */
export async function getUserQuests(
  fid: number,
  questId?: number
): Promise<UserQuest[]> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return []

  let query = supabase
    .from('user_quests')
    .select('*')
    .eq('fid', fid)
    .order('created_at', { ascending: false })

  if (questId) {
    query = query.eq('quest_id', questId)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error('[Supabase] Failed to fetch user quests:', error)
    return []
  }

  return data
}

/**
 * Update quest progress (from old foundation pattern)
 * 
 * @param fid - Farcaster ID
 * @param questId - Quest definition ID
 * @param progress - Progress object
 * @param status - Quest status
 * @returns Updated quest or null
 */
export async function updateQuestProgress(
  fid: number,
  questId: number,
  progress: Record<string, unknown>,
  status: 'available' | 'in_progress' | 'completed' | 'claimed' | 'expired'
): Promise<UserQuest | null> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  const updateData: UserQuestUpdate = {
    progress: progress as Database['public']['Tables']['user_quests']['Update']['progress'],
    status,
    updated_at: new Date().toISOString(),
  }

  // Set completion timestamp if completed
  if (status === 'completed' && !updateData.completed_at) {
    updateData.completed_at = new Date().toISOString()
  }

  // Set claimed timestamp if claimed
  if (status === 'claimed' && !updateData.claimed_at) {
    updateData.claimed_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('user_quests')
    .update(updateData)
    .eq('fid', fid)
    .eq('quest_id', questId)
    .select()
    .single()

  if (error || !data) {
    console.error('[Supabase] Failed to update quest progress:', error)
    return null
  }

  return data
}

// ========================================
// Frame Session Operations (Phase 1B)
// ========================================

/**
 * Get or create frame session
 * 
 * @param sessionId - Session identifier
 * @param fid - Farcaster ID
 * @returns Frame session or null
 */
export async function getOrCreateFrameSession(
  sessionId: string,
  fid: number
): Promise<FrameSession | null> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  // Try to get existing session
  const { data: existing } = await supabase
    .from('frame_sessions')
    .select('*')
    .eq('session_id', sessionId)
    .single()

  if (existing) return existing

  // Create new session
  const { data, error } = await supabase
    .from('frame_sessions')
    .insert({
      session_id: sessionId,
      fid,
      state: {},
    })
    .select()
    .single()

  if (error || !data) {
    console.error('[Supabase] Failed to create frame session:', error)
    return null
  }

  return data
}

/**
 * Update frame session state
 * 
 * @param sessionId - Session identifier
 * @param state - New state object
 * @returns Updated session or null
 */
export async function updateFrameSessionState(
  sessionId: string,
  state: Record<string, unknown>
): Promise<FrameSession | null> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('frame_sessions')
    .update({
      state: state as Database['public']['Tables']['frame_sessions']['Update']['state'],
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId)
    .select()
    .single()

  if (error || !data) {
    console.error('[Supabase] Failed to update frame session:', error)
    return null
  }

  return data
}

// ========================================
// Rank Events (from old foundation telemetry)
// ========================================

/**
 * Insert rank event for leaderboard tracking
 * 
 * @param event - Rank event data
 * @returns Created event or null
 */
export async function insertRankEvent(
  event: Omit<GmeowRankEvent, 'id' | 'created_at'>
): Promise<GmeowRankEvent | null> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('gmeow_rank_events')
    .insert(event)
    .select()
    .single()

  if (error || !data) {
    console.error('[Supabase] Failed to insert rank event:', error)
    return null
  }

  return data
}

// ========================================
// Cache Management
// ========================================

/**
 * Clear all Supabase caches
 * 
 * Useful for:
 * - Testing (reset state)
 * - Admin operations (force refresh)
 * - Data updates (invalidate cache)
 */
export function clearAllCaches(): void {
  userProfileCache.clear()
  badgeTemplateCache.clear()
  userBadgesCache.clear()
}

/**
 * Clear cache for specific user
 * 
 * @param fid - Farcaster ID
 */
export function clearUserCache(fid: number): void {
  userProfileCache.clear(`profile:${fid}`)
  userBadgesCache.clear(`badges:${fid}`)
}
