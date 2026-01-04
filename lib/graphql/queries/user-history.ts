/**
 * User History GraphQL Queries
 * Phase 3.2G - Hybrid Architecture Migration (Jan 1, 2026)
 * 
 * Queries for fetching user historical data (level ups, rank ups, stats changes)
 */

import { gql } from '@apollo/client'
import {
  STATS_UPDATED_EVENT_FIELDS,
  LEVEL_UP_EVENT_FIELDS,
  RANK_UP_EVENT_FIELDS,
} from '../fragments'

/**
 * Get User Level Up History
 * Returns all level up events for a user
 */
export const GET_USER_LEVEL_UPS = gql`
  ${LEVEL_UP_EVENT_FIELDS}
  query GetUserLevelUps($address: String!, $limit: Int = 50, $offset: Int = 0) {
    levelUpEvents(
      where: { user: { id_eq: $address } }
      orderBy: timestamp_DESC
      limit: $limit
      offset: $offset
    ) {
      ...LevelUpEventFields
    }
  }
`

/**
 * Get User Rank Up History
 * Returns all rank up events for a user
 */
export const GET_USER_RANK_UPS = gql`
  ${RANK_UP_EVENT_FIELDS}
  query GetUserRankUps($address: String!, $limit: Int = 50, $offset: Int = 0) {
    rankUpEvents(
      where: { user: { id_eq: $address } }
      orderBy: timestamp_DESC
      limit: $limit
      offset: $offset
    ) {
      ...RankUpEventFields
    }
  }
`

/**
 * Get User Stats History
 * Returns all stats update events for a user
 */
export const GET_USER_STATS_HISTORY = gql`
  ${STATS_UPDATED_EVENT_FIELDS}
  query GetUserStatsHistory($address: String!, $limit: Int = 100, $offset: Int = 0) {
    statsUpdatedEvents(
      where: { user: { id_eq: $address } }
      orderBy: timestamp_DESC
      limit: $limit
      offset: $offset
    ) {
      ...StatsUpdatedEventFields
    }
  }
`

/**
 * Get User Complete History
 * Returns level ups + rank ups combined
 */
export const GET_USER_COMPLETE_HISTORY = gql`
  ${LEVEL_UP_EVENT_FIELDS}
  ${RANK_UP_EVENT_FIELDS}
  query GetUserCompleteHistory($address: String!, $limit: Int = 50) {
    levelUpEvents(
      where: { user: { id_eq: $address } }
      orderBy: timestamp_DESC
      limit: $limit
    ) {
      ...LevelUpEventFields
    }
    rankUpEvents(
      where: { user: { id_eq: $address } }
      orderBy: timestamp_DESC
      limit: $limit
    ) {
      ...RankUpEventFields
    }
  }
`

/**
 * Get Recent Level Ups (Global)
 * Returns recent level ups across all users
 */
export const GET_RECENT_LEVEL_UPS = gql`
  ${LEVEL_UP_EVENT_FIELDS}
  query GetRecentLevelUps($limit: Int = 20) {
    levelUpEvents(
      orderBy: timestamp_DESC
      limit: $limit
    ) {
      ...LevelUpEventFields
    }
  }
`

/**
 * Get Recent Rank Ups (Global)
 * Returns recent rank ups across all users
 */
export const GET_RECENT_RANK_UPS = gql`
  ${RANK_UP_EVENT_FIELDS}
  query GetRecentRankUps($limit: Int = 20) {
    rankUpEvents(
      orderBy: timestamp_DESC
      limit: $limit
    ) {
      ...RankUpEventFields
    }
  }
`

/**
 * Get Stats by Trigger Type
 * Returns stats updates filtered by trigger (GM, QUEST, GUILD, etc.)
 */
export const GET_STATS_BY_TRIGGER = gql`
  ${STATS_UPDATED_EVENT_FIELDS}
  query GetStatsByTrigger(
    $address: String!
    $triggerType: String!
    $limit: Int = 50
  ) {
    statsUpdatedEvents(
      where: {
        user: { id_eq: $address }
        triggerType_eq: $triggerType
      }
      orderBy: timestamp_DESC
      limit: $limit
    ) {
      ...StatsUpdatedEventFields
    }
  }
`
