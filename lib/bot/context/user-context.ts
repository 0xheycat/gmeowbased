/**
 * Phase 2 P5: Dynamic Frame Selection - User Context Builder
 * 
 * Project: Gmeowbased (https://gmeowhq.art)
 * Network: Base (Chain ID 8453)
 * 
 * Purpose: Build comprehensive user context for intelligent frame selection
 * 
 * Features:
 * - Parallel queries for performance (<200ms target)
 * - Redis caching with 5-minute TTL
 * - Priority-based frame selection rules
 * - Safe fallbacks for missing data
 * 
 * Priority Rules:
 * 1. Active quest in progress → quest-progress frame
 * 2. New achievement unlocked → achievement-showcase frame
 * 3. Guild officer → guild-management frame
 * 4. Guild member → guild-leaderboard frame
 * 5. Beginner user (<500 XP) → beginner-quests frame
 * 6. Default intent-based frame
 * 
 * Usage:
 * ```typescript
 * import { buildUserContext, selectOptimalFrame } from '@/lib/bot-user-context'
 * 
 * const context = await buildUserContext(848516)
 * const frameType = selectOptimalFrame('quests', context)
 * ```
 * 
 * @see PHASE-2-ADVANCED-FEATURES-PLAN.md (P5 section)
 * @see farcaster.instructions.md (section 4.1: Always include file headers)
 */

import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase-server'
import { getCached } from '@/lib/cache'
import type { BotFrameType } from '@/lib/bot/frames/builder'

// ============================================================================
// Type Definitions
// ============================================================================

export type UserContext = {
  // Quest context
  hasActiveQuest: boolean
  activeQuestId?: number
  activeQuestName?: string
  questProgress?: number  // 0-100

  // Achievement context
  hasUnseenAchievement: boolean
  latestAchievementId?: string
  latestAchievementType?: string

  // Guild context
  isGuildMember: boolean
  isGuildOfficer: boolean
  guildId?: number
  guildName?: string
  guildRank?: number

  // User stats context
  totalXP: number
  level: number
  streak: number
  gmCount: number

  // Interaction history
  lastFrameType?: BotFrameType
  frameInteractionCount: number

  // Cache metadata
  cachedAt: Date
}

export type FrameSelectionResult = {
  frameType: BotFrameType
  reason: string
  priority: number
  context: Partial<UserContext>
}

// ============================================================================
// Constants
// ============================================================================

const CONTEXT_CACHE_TTL = 5 * 60  // 5 minutes in seconds
const BEGINNER_XP_THRESHOLD = 500
const QUERY_TIMEOUT = 2000  // 2 seconds max per query

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Build comprehensive user context with parallel queries
 * 
 * Quality Gates:
 * - P5-1: All queries run in parallel (Promise.all)
 * - P5-2: Redis caching with 5-minute TTL
 * - P5-3: Safe fallbacks for missing data
 * - P5-4: Total execution time <200ms (with cache hit)
 * 
 * @param fid - User's Farcaster ID
 * @returns Complete user context
 */
export async function buildUserContext(fid: number): Promise<UserContext> {
  // Try cache first
  const cached = await getCached<UserContext>(
    'user-context',
    `context:${fid}`,
    async () => buildUserContextFromDB(fid),
    { ttl: CONTEXT_CACHE_TTL }
  )

  if (cached) {
    return cached
  }

  // Build context from database
  const context = await buildUserContextFromDB(fid)

  // Cache result
  await getCached<UserContext>(
    'user-context',
    `context:${fid}`,
    async () => context,
    { ttl: CONTEXT_CACHE_TTL }
  )

  return context
}

/**
 * Build user context from database (no cache)
 * Uses parallel queries for performance
 * 
 * @param fid - User's Farcaster ID
 * @returns Fresh user context
 */
async function buildUserContextFromDB(fid: number): Promise<UserContext> {
  if (!isSupabaseConfigured()) {
    return getEmptyContext()
  }

  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return getEmptyContext()
  }

  try {
    // Run all queries in parallel with timeout protection
    const [
      profileData,
      questsData,
      achievementsData,
      guildData,
      interactionsData,
    ] = await Promise.all([
      // Query 1: User profile and XP stats
      Promise.race([
        supabase
          .from('gmeow_rank_events')
          .select('event_type, points_delta, created_at')
          .eq('fid', fid)
          .order('created_at', { ascending: false })
          .limit(100)
          .then(({ data, error }) => ({ data, error })),
        timeout(QUERY_TIMEOUT, { data: null, error: { message: 'Timeout' } }),
      ]),

      // Query 2: Active quests
      Promise.race([
        supabase
          .from('gmeow_rank_events')
          .select('event_type, event_detail, created_at')
          .eq('fid', fid)
          .eq('event_type', 'quest-start')
          .order('created_at', { ascending: false })
          .limit(10)
          .then(({ data, error }) => ({ data, error })),
        timeout(QUERY_TIMEOUT, { data: null, error: { message: 'Timeout' } }),
      ]),

      // Query 3: Unseen achievements
      Promise.race([
        supabase
          .from('viral_milestone_achievements')
          .select('id, achievement_type, achieved_at, seen')
          .eq('fid', fid)
          .eq('seen', false)
          .order('achieved_at', { ascending: false })
          .limit(5)
          .then(({ data, error }) => ({ data, error })),
        timeout(QUERY_TIMEOUT, { data: null, error: { message: 'Timeout' } }),
      ]),

      // Query 4: Guild membership (stub - implement when guilds DB ready)
      Promise.resolve({ data: null, error: null }),

      // Query 5: Frame interactions history
      Promise.race([
        supabase
          .from('bot_interactions')
          .select('interaction_type, metadata, created_at')
          .eq('fid', fid)
          .eq('interaction_type', 'frame-view')
          .order('created_at', { ascending: false })
          .limit(20)
          .then(({ data, error }) => ({ data, error })),
        timeout(QUERY_TIMEOUT, { data: null, error: { message: 'Timeout' } }),
      ]),
    ])

    // Process profile and XP data
    let totalXP = 0
    let gmCount = 0
    let streak = 0

    if (profileData.data && !profileData.error) {
      for (const event of profileData.data) {
        if (event.event_type === 'gm') gmCount++
        if (event.points_delta) totalXP += Number(event.points_delta) || 0
      }

      // Calculate streak (consecutive days)
      const gmEvents = profileData.data.filter((e: any) => e.event_type === 'gm')
      if (gmEvents.length > 0) {
        streak = calculateStreak(gmEvents.map((e: any) => new Date(e.created_at)))
      }
    }

    const level = calculateLevel(totalXP)

    // Process active quests
    let hasActiveQuest = false
    let activeQuestId: number | undefined
    let activeQuestName: string | undefined
    let questProgress: number | undefined

    if (questsData.data && !questsData.error && questsData.data.length > 0) {
      const latestQuest = questsData.data[0]
      try {
        const detail = typeof latestQuest.event_detail === 'string'
          ? JSON.parse(latestQuest.event_detail)
          : latestQuest.event_detail

        if (detail && detail.questId) {
          hasActiveQuest = true
          activeQuestId = detail.questId
          activeQuestName = detail.questName || `Quest #${detail.questId}`
          questProgress = detail.progress || 0
        }
      } catch {
        // Invalid JSON - ignore
      }
    }

    // Process achievements
    let hasUnseenAchievement = false
    let latestAchievementId: string | undefined
    let latestAchievementType: string | undefined

    if (achievementsData.data && !achievementsData.error && achievementsData.data.length > 0) {
      const latest = achievementsData.data[0]
      hasUnseenAchievement = true
      latestAchievementId = latest.id
      latestAchievementType = latest.achievement_type
    }

    // Process guild data (stub - implement when DB ready)
    const isGuildMember = false
    const isGuildOfficer = false

    // Process frame interactions
    let frameInteractionCount = 0
    let lastFrameType: BotFrameType | undefined

    if (interactionsData.data && !interactionsData.error) {
      frameInteractionCount = interactionsData.data.length

      if (interactionsData.data.length > 0) {
        const latest = interactionsData.data[0]
        try {
          const meta = typeof latest.metadata === 'string'
            ? JSON.parse(latest.metadata)
            : latest.metadata

          if (meta && meta.frameType) {
            lastFrameType = meta.frameType as BotFrameType
          }
        } catch {
          // Invalid JSON - ignore
        }
      }
    }

    return {
      hasActiveQuest,
      activeQuestId,
      activeQuestName,
      questProgress,
      hasUnseenAchievement,
      latestAchievementId,
      latestAchievementType,
      isGuildMember,
      isGuildOfficer,
      totalXP,
      level,
      streak,
      gmCount,
      lastFrameType,
      frameInteractionCount,
      cachedAt: new Date(),
    }
  } catch (error) {
    console.error('[UserContext] Error building context:', error)
    return getEmptyContext()
  }
}

/**
 * Select optimal frame based on user context and intent
 * 
 * Quality Gates:
 * - P5-5: Priority-based selection (active quest > achievement > guild > stats)
 * - P5-6: Safe fallbacks for all edge cases
 * - P5-7: Returns detailed reason for selection
 * 
 * @param intent - Detected user intent
 * @param context - User context from buildUserContext()
 * @returns Frame selection with reasoning
 */
export function selectOptimalFrame(
  intent: string,
  context: UserContext,
  conversationState?: {
    activeQuests?: Array<{ id: string | number, name: string, progress?: number }>
    lastGuildInfo?: { id: string | number, name: string, level: number, bonus: number }
    lastAchievements?: Array<{ id: string, name: string, unlocked: boolean }>
  }
): FrameSelectionResult {
  // P8: Priority 0: Multi-turn conversation context (highest priority)
  // If user asked follow-up question and we have context, use context-aware frame
  if (conversationState) {
    if (conversationState.activeQuests && conversationState.activeQuests.length > 0 && intent === 'quests') {
      return {
        frameType: 'quest-specific',
        reason: 'P8: Follow-up on previous quest query with stored context',
        priority: 0,
        context: {
          hasActiveQuest: true,
          activeQuestId: typeof conversationState.activeQuests[0].id === 'number' ? conversationState.activeQuests[0].id : undefined,
          activeQuestName: conversationState.activeQuests[0].name,
        },
      }
    }
    
    if (conversationState.lastGuildInfo && (intent === 'guild' || intent === 'leaderboards')) {
      return {
        frameType: 'leaderboards',
        reason: 'P8: Follow-up on guild context',
        priority: 0,
        context: {
          guildId: typeof conversationState.lastGuildInfo.id === 'number' ? conversationState.lastGuildInfo.id : undefined,
          guildName: conversationState.lastGuildInfo.name,
        },
      }
    }
    
    if (conversationState.lastAchievements && intent === 'achievements') {
      return {
        frameType: 'badge-showcase',
        reason: 'P8: Follow-up on achievements context',
        priority: 0,
        context: {
          hasUnseenAchievement: conversationState.lastAchievements.some(a => a.unlocked),
        },
      }
    }
  }
  
  // Priority 1: New achievement unlocked (override any intent)
  if (context.hasUnseenAchievement) {
    return {
      frameType: 'badge-showcase',
      reason: 'User has unseen achievement',
      priority: 1,
      context: {
        hasUnseenAchievement: true,
        latestAchievementId: context.latestAchievementId,
        latestAchievementType: context.latestAchievementType,
      },
    }
  }

  // Priority 2: Active quest in progress (override quests intent)
  if (context.hasActiveQuest && intent === 'quests') {
    return {
      frameType: 'quest-specific',
      reason: 'User has active quest in progress',
      priority: 2,
      context: {
        hasActiveQuest: true,
        activeQuestId: context.activeQuestId,
        activeQuestName: context.activeQuestName,
        questProgress: context.questProgress,
      },
    }
  }

  // Priority 3: Guild officer (override guild intent)
  if (context.isGuildOfficer && intent === 'guild') {
    return {
      frameType: 'guild-invite',
      reason: 'User is guild officer',
      priority: 3,
      context: {
        isGuildOfficer: true,
        guildId: context.guildId,
        guildName: context.guildName,
      },
    }
  }

  // Priority 4: Guild member (override guild intent)
  if (context.isGuildMember && intent === 'guild') {
    return {
      frameType: 'guild-invite',
      reason: 'User is guild member',
      priority: 4,
      context: {
        isGuildMember: true,
        guildId: context.guildId,
        guildRank: context.guildRank,
      },
    }
  }

  // Priority 5: Beginner user (<500 XP) - override quests intent
  if (context.totalXP < BEGINNER_XP_THRESHOLD && intent === 'quests') {
    return {
      frameType: 'quest-board',
      reason: 'Beginner user - show curated quest board',
      priority: 5,
      context: {
        totalXP: context.totalXP,
        level: context.level,
      },
    }
  }

  // Priority 6: Default intent-based frame
  return {
    frameType: getDefaultFrameForIntent(intent),
    reason: `Default frame for intent: ${intent}`,
    priority: 6,
    context: {},
  }
}

/**
 * Invalidate cached user context (call after data changes)
 * 
 * @param fid - User's Farcaster ID
 */
export async function invalidateUserContext(fid: number): Promise<void> {
  try {
    const { invalidateCache } = await import('@/lib/cache')
    await invalidateCache('user-context', `context:${fid}`)
  } catch (error) {
    console.error('[UserContext] Error invalidating cache:', error)
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get empty context (fallback for errors)
 */
function getEmptyContext(): UserContext {
  return {
    hasActiveQuest: false,
    hasUnseenAchievement: false,
    isGuildMember: false,
    isGuildOfficer: false,
    totalXP: 0,
    level: 1,
    streak: 0,
    gmCount: 0,
    frameInteractionCount: 0,
    cachedAt: new Date(),
  }
}

/**
 * Calculate user level from total XP
 * Formula: level = floor(sqrt(xp / 100)) + 1
 */
function calculateLevel(xp: number): number {
  if (xp < 0) return 1
  return Math.floor(Math.sqrt(xp / 100)) + 1
}

/**
 * Calculate consecutive day streak from GM events
 */
function calculateStreak(dates: Date[]): number {
  if (dates.length === 0) return 0

  // Sort dates descending (most recent first)
  const sorted = dates.sort((a, b) => b.getTime() - a.getTime())

  let streak = 1
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Check if most recent GM was today or yesterday
  const mostRecent = new Date(sorted[0])
  mostRecent.setHours(0, 0, 0, 0)

  const dayDiff = Math.floor((today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24))

  if (dayDiff > 1) {
    return 0  // Streak broken
  }

  // Count consecutive days
  for (let i = 1; i < sorted.length; i++) {
    const current = new Date(sorted[i])
    current.setHours(0, 0, 0, 0)

    const prev = new Date(sorted[i - 1])
    prev.setHours(0, 0, 0, 0)

    const diff = Math.floor((prev.getTime() - current.getTime()) / (1000 * 60 * 60 * 24))

    if (diff === 1) {
      streak++
    } else {
      break
    }
  }

  return streak
}

/**
 * Default frame type for each intent
 */
function getDefaultFrameForIntent(intent: string): BotFrameType {
  switch (intent) {
    case 'stats':
    case 'profile':
      return 'stats-summary'
    case 'quests':
    case 'quest-recommendations':
      return 'quest-board'
    case 'leaderboards':
    case 'rank':
      return 'leaderboards'
    case 'guild':
    case 'team':
      return 'guild-invite'
    case 'streak':
    case 'gm':
      return 'daily-streak'
    default:
      return 'stats-summary'
  }
}

/**
 * Timeout helper for Promise.race
 */
function timeout<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}
