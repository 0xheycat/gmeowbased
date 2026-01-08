/**
 * Leaderboard GraphQL Queries
 * Phase 3.2G - Hybrid Architecture Migration (Jan 1, 2026)
 * 
 * Queries for fetching leaderboard data from Subsquid
 */

import { gql } from '@apollo/client'
import { LEADERBOARD_ENTRY_FIELDS, USER_SCORING_FIELDS } from '../fragments'

/**
 * Get Global Leaderboard
 * Returns top users ordered by total score
 */
export const GET_GLOBAL_LEADERBOARD = gql`
  ${LEADERBOARD_ENTRY_FIELDS}
  query GetGlobalLeaderboard($limit: Int = 50, $offset: Int = 0) {
    leaderboardEntries(
      orderBy: rank_ASC
      limit: $limit
      offset: $offset
    ) {
      ...LeaderboardEntryFields
    }
  }
`

/**
 * Get Leaderboard by Tier
 * Returns users filtered by rank tier
 */
export const GET_LEADERBOARD_BY_TIER = gql`
  ${LEADERBOARD_ENTRY_FIELDS}
  query GetLeaderboardByTier($tierIndex: Int!, $limit: Int = 50, $offset: Int = 0) {
    leaderboardEntries(
      where: { rankTier_eq: $tierIndex }
      orderBy: rank_ASC
      limit: $limit
      offset: $offset
    ) {
      ...LeaderboardEntryFields
    }
  }
`

/**
 * Get Top Users by Score
 * Alternative to leaderboard entries (uses Users directly)
 */
export const GET_TOP_USERS = gql`
  ${USER_SCORING_FIELDS}
  query GetTopUsers($limit: Int = 50, $offset: Int = 0) {
    users(
      orderBy: totalScore_DESC
      limit: $limit
      offset: $offset
    ) {
      ...UserScoringFields
      currentStreak
      lifetimeGMs
    }
  }
`

/**
 * Get User Leaderboard Position
 * Returns user's rank and nearby competitors
 */
export const GET_USER_LEADERBOARD_POSITION = gql`
  ${LEADERBOARD_ENTRY_FIELDS}
  query GetUserLeaderboardPosition($address: String!) {
    leaderboardEntries(where: { id_eq: $address }, limit: 1) {
      ...LeaderboardEntryFields
    }
  }
`

/**
 * Get Weekly Leaderboard
 * Returns top users by weekly points
 */
export const GET_WEEKLY_LEADERBOARD = gql`
  ${LEADERBOARD_ENTRY_FIELDS}
  query GetWeeklyLeaderboard($limit: Int = 50, $offset: Int = 0) {
    leaderboardEntries(
      orderBy: weeklyPoints_DESC
      limit: $limit
      offset: $offset
    ) {
      ...LeaderboardEntryFields
    }
  }
`

/**
 * Get Monthly Leaderboard
 * Returns top users by monthly points
 */
export const GET_MONTHLY_LEADERBOARD = gql`
  ${LEADERBOARD_ENTRY_FIELDS}
  query GetMonthlyLeaderboard($limit: Int = 50, $offset: Int = 0) {
    leaderboardEntries(
      orderBy: monthlyPoints_DESC
      limit: $limit
      offset: $offset
    ) {
      ...LeaderboardEntryFields
    }
  }
`
