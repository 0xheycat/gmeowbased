/**
 * Quest GraphQL Queries
 * Phase 4 - Quest Pages Migration (Jan 3, 2026)
 * 
 * Queries for fetching quest completion data from Subsquid
 * Quest definitions still come from Supabase (quest_definitions table)
 */

import { gql } from '@apollo/client'

/**
 * Quest Completion Fragment
 * Individual quest completion event
 */
export const QUEST_COMPLETION_FIELDS = gql`
  fragment QuestCompletionFields on QuestCompletion {
    id
    pointsAwarded
    tokenReward
    rewardToken
    fid
    timestamp
    blockNumber
    txHash
    user {
      id
      level
      rankTier
      totalScore
    }
    quest {
      id
      questType
      creator
      rewardPoints
      isActive
      createdAt
    }
  }
`

/**
 * Quest Entity Fragment
 * On-chain quest definition
 */
export const QUEST_FIELDS = gql`
  fragment QuestFields on Quest {
    id
    questType
    creator
    contractAddress
    rewardPoints
    rewardToken
    rewardTokenAmount
    onchainType
    targetAsset
    targetAmount
    targetData
    createdAt
    createdBlock
    closedAt
    closedBlock
    isActive
    totalCompletions
    pointsAwarded
    totalTokensAwarded
    txHash
  }
`

/**
 * Get Quest Completions by Quest ID
 * Returns all completions for a specific quest
 * 
 * @param questId - On-chain quest ID (e.g., "1", "2", "3")
 * @param limit - Maximum number of completions to return (default: 100)
 * @param orderBy - Sort by timestamp_DESC or timestamp_ASC
 */
export const GET_QUEST_COMPLETIONS = gql`
  ${QUEST_COMPLETION_FIELDS}
  query GetQuestCompletions($questId: String!, $limit: Int, $orderBy: [QuestCompletionOrderByInput!]) {
    questCompletions(
      where: { quest: { id_eq: $questId } }
      limit: $limit
      orderBy: $orderBy
    ) {
      ...QuestCompletionFields
    }
  }
`

/**
 * Get User Quest Completions
 * Returns all quest completions for a specific user
 * 
 * @param userAddress - Wallet address (lowercase)
 * @param limit - Maximum number of completions
 * @param orderBy - Sort by timestamp_DESC or timestamp_ASC
 */
export const GET_USER_QUEST_COMPLETIONS = gql`
  ${QUEST_COMPLETION_FIELDS}
  query GetUserQuestCompletions($userAddress: String!, $limit: Int, $orderBy: [QuestCompletionOrderByInput!]) {
    questCompletions(
      where: { user: { id_eq: $userAddress } }
      limit: $limit
      orderBy: $orderBy
    ) {
      ...QuestCompletionFields
    }
  }
`

/**
 * Get Quest Stats by ID
 * Returns quest entity with aggregate stats
 * 
 * @param questId - On-chain quest ID
 */
export const GET_QUEST_STATS = gql`
  ${QUEST_FIELDS}
  query GetQuestStats($questId: String!) {
    quests(where: { id_eq: $questId }, limit: 1) {
      ...QuestFields
      completions(limit: 10, orderBy: timestamp_DESC) {
        id
        pointsAwarded
        timestamp
        user {
          id
          level
        }
      }
    }
  }
`

/**
 * Get All Active Quests
 * Returns all quests with isActive = true
 * 
 * @param limit - Maximum number of quests
 */
export const GET_ACTIVE_QUESTS = gql`
  ${QUEST_FIELDS}
  query GetActiveQuests($limit: Int) {
    quests(
      where: { isActive_eq: true }
      orderBy: createdAt_DESC
      limit: $limit
    ) {
      ...QuestFields
    }
  }
`

/**
 * Get Quests by Creator
 * Returns all quests created by a specific address
 * 
 * @param creatorAddress - Creator wallet address (lowercase)
 * @param limit - Maximum number of quests
 */
export const GET_QUESTS_BY_CREATOR = gql`
  ${QUEST_FIELDS}
  query GetQuestsByCreator($creatorAddress: String!, $limit: Int) {
    quests(
      where: { creator_eq: $creatorAddress }
      orderBy: createdAt_DESC
      limit: $limit
    ) {
      ...QuestFields
    }
  }
`

/**
 * Get User Quest Completion Check
 * Check if user has completed a specific quest
 * 
 * @param userAddress - Wallet address
 * @param questId - On-chain quest ID
 */
export const CHECK_QUEST_COMPLETION = gql`
  query CheckQuestCompletion($userAddress: String!, $questId: String!) {
    questCompletions(
      where: { 
        user: { id_eq: $userAddress }
        quest: { id_eq: $questId }
      }
      limit: 1
    ) {
      id
      pointsAwarded
      timestamp
      txHash
    }
  }
`

/**
 * Get Quest Completion Count
 * Returns total completions count for a quest
 * 
 * Note: Use quest.totalCompletions field from Quest entity for cached count
 * This query is for real-time count verification
 * 
 * @param questId - On-chain quest ID
 */
export const GET_QUEST_COMPLETION_COUNT = gql`
  query GetQuestCompletionCount($questId: String!) {
    questCompletionsConnection(
      where: { quest: { id_eq: $questId } }
      orderBy: id_ASC
    ) {
      totalCount
    }
  }
`

/**
 * Get Recent Quest Completions (Global)
 * Returns recent completions across all quests
 * Useful for activity feed
 * 
 * @param limit - Maximum number of completions (default: 20)
 */
export const GET_RECENT_QUEST_COMPLETIONS = gql`
  ${QUEST_COMPLETION_FIELDS}
  query GetRecentQuestCompletions($limit: Int) {
    questCompletions(
      orderBy: timestamp_DESC
      limit: $limit
    ) {
      ...QuestCompletionFields
    }
  }
`

/**
 * TypeScript Types for Query Variables
 */

export interface GetQuestCompletionsVariables {
  questId: string
  limit?: number
  orderBy?: Array<'timestamp_DESC' | 'timestamp_ASC'>
}

export interface GetUserQuestCompletionsVariables {
  userAddress: string
  limit?: number
  orderBy?: Array<'timestamp_DESC' | 'timestamp_ASC'>
}

export interface GetQuestStatsVariables {
  questId: string
}

export interface GetActiveQuestsVariables {
  limit?: number
}

export interface GetQuestsByCreatorVariables {
  creatorAddress: string
  limit?: number
}

export interface CheckQuestCompletionVariables {
  userAddress: string
  questId: string
}

export interface GetQuestCompletionCountVariables {
  questId: string
}

export interface GetRecentQuestCompletionsVariables {
  limit?: number
}

/**
 * TypeScript Types for Query Responses
 */

export interface QuestCompletionResponse {
  id: string
  pointsAwarded: string // BigInt as string
  tokenReward: string | null // BigInt as string
  rewardToken: string | null
  fid: string // BigInt as string
  timestamp: string // DateTime as ISO string
  blockNumber: number
  txHash: string
  user: {
    id: string
    level: number
    rankTier: number
    totalScore: string
  }
  quest: {
    id: string
    questType: string
    creator: string
    rewardPoints: string
    isActive: boolean
    createdAt: string
  }
}

export interface QuestResponse {
  id: string
  questType: string
  creator: string
  contractAddress: string
  rewardPoints: string
  rewardToken: string | null
  rewardTokenAmount: string | null
  onchainType: number | null
  targetAsset: string | null
  targetAmount: string | null
  targetData: string | null
  createdAt: string
  createdBlock: number
  closedAt: string | null
  closedBlock: number | null
  isActive: boolean
  totalCompletions: number
  pointsAwarded: string
  totalTokensAwarded: string
  txHash: string
  completions?: Array<{
    id: string
    pointsAwarded: string
    timestamp: string
    user: {
      id: string
      level: number
    }
  }>
}
