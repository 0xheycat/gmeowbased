/**
 * Quest Subsquid Hooks
 * Phase 4 - Quest Pages Migration (Jan 3, 2026)
 * 
 * React hooks for fetching quest completion data from Subsquid GraphQL
 * 
 * @architecture Hybrid Data Layer
 * - Quest definitions: Supabase (quest_definitions table)
 * - Quest completions: Subsquid GraphQL (QuestCompletion entity)
 * - Quest stats: Subsquid GraphQL (Quest entity with totalCompletions field)
 */

import { useQuery } from '@apollo/client'
import { 
  GET_QUEST_COMPLETIONS,
  GET_USER_QUEST_COMPLETIONS,
  GET_QUEST_STATS,
  GET_ACTIVE_QUESTS,
  GET_QUESTS_BY_CREATOR,
  CHECK_QUEST_COMPLETION,
  GET_QUEST_COMPLETION_COUNT,
  GET_RECENT_QUEST_COMPLETIONS,
  type GetQuestCompletionsVariables,
  type GetUserQuestCompletionsVariables,
  type GetQuestStatsVariables,
  type GetActiveQuestsVariables,
  type GetQuestsByCreatorVariables,
  type CheckQuestCompletionVariables,
  type GetQuestCompletionCountVariables,
  type GetRecentQuestCompletionsVariables,
  type QuestCompletionResponse,
  type QuestResponse,
} from '@/lib/graphql/queries/quests'

/**
 * Use Quest Completions
 * Fetch all completions for a specific quest
 * 
 * @param questId - On-chain quest ID (e.g., "1", "2", "3")
 * @param limit - Maximum completions to return (default: 100)
 * @param orderBy - Sort order (default: timestamp_DESC)
 * 
 * @example
 * const { completions, loading, error } = useQuestCompletions("1", 50)
 */
export function useQuestCompletions(
  questId: string | null,
  limit: number = 100,
  orderBy: Array<'timestamp_DESC' | 'timestamp_ASC'> = ['timestamp_DESC']
) {
  const { data, loading, error, refetch } = useQuery<
    { questCompletions: QuestCompletionResponse[] },
    GetQuestCompletionsVariables
  >(GET_QUEST_COMPLETIONS, {
    variables: { questId: questId || '', limit, orderBy },
    skip: !questId,
    pollInterval: 30000, // Poll every 30s for real-time updates
  })

  return {
    completions: data?.questCompletions || [],
    loading,
    error,
    refetch,
  }
}

/**
 * Use User Quest Completions
 * Fetch all quest completions for a specific user
 * 
 * @param userAddress - Wallet address (lowercase)
 * @param limit - Maximum completions to return
 * @param orderBy - Sort order (default: timestamp_DESC)
 * 
 * @example
 * const { completions, loading } = useUserQuestCompletions("0x123...", 20)
 */
export function useUserQuestCompletions(
  userAddress: string | null,
  limit: number = 20,
  orderBy: Array<'timestamp_DESC' | 'timestamp_ASC'> = ['timestamp_DESC']
) {
  const { data, loading, error, refetch } = useQuery<
    { questCompletions: QuestCompletionResponse[] },
    GetUserQuestCompletionsVariables
  >(GET_USER_QUEST_COMPLETIONS, {
    variables: { userAddress: userAddress || '', limit, orderBy },
    skip: !userAddress,
    pollInterval: 30000,
  })

  return {
    completions: data?.questCompletions || [],
    loading,
    error,
    refetch,
  }
}

/**
 * Use Quest Stats
 * Fetch quest entity with aggregate stats and recent completions
 * 
 * @param questId - On-chain quest ID
 * 
 * @example
 * const { quest, loading } = useQuestStats("1")
 * console.log(quest?.totalCompletions) // Cached count from entity
 */
export function useQuestStats(questId: string | null) {
  const { data, loading, error, refetch } = useQuery<
    { quests: QuestResponse[] },
    GetQuestStatsVariables
  >(GET_QUEST_STATS, {
    variables: { questId: questId || '' },
    skip: !questId,
    pollInterval: 60000, // Poll every 60s (stats update less frequently)
  })

  return {
    quest: data?.quests?.[0] || null,
    loading,
    error,
    refetch,
  }
}

/**
 * Use Active Quests
 * Fetch all active quests from Subsquid
 * 
 * @param limit - Maximum quests to return
 * 
 * @example
 * const { quests, loading } = useActiveQuests(50)
 */
export function useActiveQuests(limit: number = 50) {
  const { data, loading, error, refetch } = useQuery<
    { quests: QuestResponse[] },
    GetActiveQuestsVariables
  >(GET_ACTIVE_QUESTS, {
    variables: { limit },
    pollInterval: 60000,
  })

  return {
    quests: data?.quests || [],
    loading,
    error,
    refetch,
  }
}

/**
 * Use Quests by Creator
 * Fetch all quests created by a specific address
 * 
 * @param creatorAddress - Creator wallet address (lowercase)
 * @param limit - Maximum quests to return
 * 
 * @example
 * const { quests, loading } = useQuestsByCreator("0x123...", 20)
 */
export function useQuestsByCreator(
  creatorAddress: string | null,
  limit: number = 20
) {
  const { data, loading, error, refetch } = useQuery<
    { quests: QuestResponse[] },
    GetQuestsByCreatorVariables
  >(GET_QUESTS_BY_CREATOR, {
    variables: { creatorAddress: creatorAddress || '', limit },
    skip: !creatorAddress,
    pollInterval: 60000,
  })

  return {
    quests: data?.quests || [],
    loading,
    error,
    refetch,
  }
}

/**
 * Use Check Quest Completion
 * Check if user has completed a specific quest
 * 
 * @param userAddress - Wallet address
 * @param questId - On-chain quest ID
 * 
 * @example
 * const { completed, loading } = useCheckQuestCompletion("0x123...", "1")
 */
export function useCheckQuestCompletion(
  userAddress: string | null,
  questId: string | null
) {
  const { data, loading, error, refetch } = useQuery<
    { questCompletions: Array<{ id: string; pointsAwarded: string; timestamp: string; txHash: string }> },
    CheckQuestCompletionVariables
  >(CHECK_QUEST_COMPLETION, {
    variables: { userAddress: userAddress || '', questId: questId || '' },
    skip: !userAddress || !questId,
    pollInterval: 30000,
  })

  return {
    completed: (data?.questCompletions?.length || 0) > 0,
    completionData: data?.questCompletions?.[0] || null,
    loading,
    error,
    refetch,
  }
}

/**
 * Use Quest Completion Count
 * Get real-time completion count for a quest
 * 
 * Note: Prefer using quest.totalCompletions from useQuestStats for cached count.
 * This hook is for real-time verification.
 * 
 * @param questId - On-chain quest ID
 * 
 * @example
 * const { count, loading } = useQuestCompletionCount("1")
 */
export function useQuestCompletionCount(questId: string | null) {
  const { data, loading, error, refetch } = useQuery<
    { questCompletionsConnection: { totalCount: number } },
    GetQuestCompletionCountVariables
  >(GET_QUEST_COMPLETION_COUNT, {
    variables: { questId: questId || '' },
    skip: !questId,
    pollInterval: 60000,
  })

  return {
    count: data?.questCompletionsConnection?.totalCount || 0,
    loading,
    error,
    refetch,
  }
}

/**
 * Use Recent Quest Completions
 * Fetch recent completions across all quests (for activity feed)
 * 
 * @param limit - Maximum completions to return (default: 20)
 * 
 * @example
 * const { completions, loading } = useRecentQuestCompletions(10)
 */
export function useRecentQuestCompletions(limit: number = 20) {
  const { data, loading, error, refetch } = useQuery<
    { questCompletions: QuestCompletionResponse[] },
    GetRecentQuestCompletionsVariables
  >(GET_RECENT_QUEST_COMPLETIONS, {
    variables: { limit },
    pollInterval: 30000,
  })

  return {
    completions: data?.questCompletions || [],
    loading,
    error,
    refetch,
  }
}

/**
 * Helper: Format Quest Points
 * Convert BigInt string to formatted number
 * 
 * @param points - BigInt as string
 * @returns Formatted points (e.g., "1,250 XP")
 */
export function formatQuestPoints(points: string): string {
  const num = parseInt(points, 10)
  return `${num.toLocaleString()} XP`
}

/**
 * Helper: Format Quest Timestamp
 * Convert ISO string to relative time
 * 
 * @param timestamp - ISO timestamp string
 * @returns Relative time (e.g., "2 hours ago")
 */
export function formatQuestTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  
  const diffMonths = Math.floor(diffDays / 30)
  return `${diffMonths}mo ago`
}
