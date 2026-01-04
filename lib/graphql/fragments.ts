/**
 * GraphQL Fragments for Subsquid Queries
 * Phase 3.2G - Hybrid Architecture Migration (Jan 1, 2026)
 * 
 * Reusable fragments for consistent data fetching
 */

import { gql } from '@apollo/client'

/**
 * User Scoring Fields Fragment
 * All on-chain scoring data for a user
 */
export const USER_SCORING_FIELDS = gql`
  fragment UserScoringFields on User {
    id
    level
    rankTier
    totalScore
    multiplier
    gmPoints
    viralPoints
    questPoints
    guildPoints
    referralPoints
    xpIntoLevel
    xpToNextLevel
    pointsIntoTier
    pointsToNextTier
    lastLevelUpAt
    lastRankUpAt
    totalLevelUps
    totalRankUps
    updatedAt
  }
`

/**
 * User Basic Fields Fragment
 * Minimal user data (legacy fields)
 */
export const USER_BASIC_FIELDS = gql`
  fragment UserBasicFields on User {
    id
    pointsBalance
    currentStreak
    lifetimeGMs
    createdAt
    updatedAt
  }
`

/**
 * User Complete Fields Fragment
 * Combines basic + scoring fields
 */
export const USER_COMPLETE_FIELDS = gql`
  ${USER_BASIC_FIELDS}
  ${USER_SCORING_FIELDS}
  fragment UserCompleteFields on User {
    ...UserBasicFields
    ...UserScoringFields
  }
`

/**
 * Leaderboard Entry Fragment
 * Pre-computed leaderboard rankings with scoring data
 */
export const LEADERBOARD_ENTRY_FIELDS = gql`
  fragment LeaderboardEntryFields on LeaderboardEntry {
    id
    rank
    totalPoints
    weeklyPoints
    monthlyPoints
    level
    rankTier
    multiplier
    previousRank
    rankChange
    updatedAt
    user {
      id
      currentStreak
      lifetimeGMs
    }
  }
`

/**
 * Stats Updated Event Fragment
 * Historical stats update tracking
 */
export const STATS_UPDATED_EVENT_FIELDS = gql`
  fragment StatsUpdatedEventFields on StatsUpdatedEvent {
    id
    totalScore
    level
    rankTier
    multiplier
    triggerType
    triggerAmount
    timestamp
    blockNumber
    txHash
    user {
      id
    }
  }
`

/**
 * Level Up Event Fragment
 * Level progression history
 */
export const LEVEL_UP_EVENT_FIELDS = gql`
  fragment LevelUpEventFields on LevelUpEvent {
    id
    oldLevel
    newLevel
    totalScore
    levelGap
    timestamp
    blockNumber
    txHash
    user {
      id
    }
  }
`

/**
 * Rank Up Event Fragment
 * Rank tier progression history
 */
export const RANK_UP_EVENT_FIELDS = gql`
  fragment RankUpEventFields on RankUpEvent {
    id
    oldTier
    newTier
    totalScore
    tierGap
    newMultiplier
    timestamp
    blockNumber
    txHash
    user {
      id
    }
  }
`

/**
 * Guild Fields Fragment
 * On-chain guild data from Subsquid
 */
export const GUILD_FIELDS = gql`
  fragment GuildFields on Guild {
    id
    name
    owner
    createdAt
    totalMembers
    level
    isActive
    treasuryPoints
  }
`

/**
 * Guild Member Scoring Fragment
 * Guild member with scoring data
 */
export const GUILD_MEMBER_SCORING_FIELDS = gql`
  ${USER_SCORING_FIELDS}
  fragment GuildMemberScoringFields on GuildMember {
    id
    joinedAt
    role
    pointsContributed
    isActive
    user {
      ...UserScoringFields
    }
  }
`
