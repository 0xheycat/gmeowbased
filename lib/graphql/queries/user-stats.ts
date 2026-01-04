/**
 * User Stats GraphQL Queries
 * Phase 3.2G - Hybrid Architecture Migration (Jan 1, 2026)
 * 
 * Queries for fetching user scoring data from Subsquid
 */

import { gql } from '@apollo/client'
import { USER_COMPLETE_FIELDS, USER_SCORING_FIELDS } from '../fragments'

/**
 * Get User Stats by Address
 * Returns complete user scoring data
 */
export const GET_USER_STATS = gql`
  ${USER_COMPLETE_FIELDS}
  query GetUserStats($address: String!) {
    users(where: { id_eq: $address }, limit: 1) {
      ...UserCompleteFields
    }
  }
`

/**
 * Get User Stats (Scoring Only)
 * Returns only on-chain scoring fields (optimized query)
 */
export const GET_USER_SCORING = gql`
  ${USER_SCORING_FIELDS}
  query GetUserScoring($address: String!) {
    users(where: { id_eq: $address }, limit: 1) {
      ...UserScoringFields
    }
  }
`

/**
 * Get Multiple Users Stats
 * Batch query for leaderboard or comparison
 */
export const GET_USERS_STATS = gql`
  ${USER_COMPLETE_FIELDS}
  query GetUsersStats($addresses: [String!]!) {
    users(where: { id_in: $addresses }) {
      ...UserCompleteFields
    }
  }
`

/**
 * Get User Point Breakdown
 * Returns detailed point breakdown
 */
export const GET_USER_POINT_BREAKDOWN = gql`
  query GetUserPointBreakdown($address: String!) {
    users(where: { id_eq: $address }, limit: 1) {
      id
      totalScore
      gmPoints
      viralPoints
      questPoints
      guildPoints
      referralPoints
      multiplier
    }
  }
`

/**
 * Get User Progression
 * Returns level and rank progression data
 */
export const GET_USER_PROGRESSION = gql`
  query GetUserProgression($address: String!) {
    users(where: { id_eq: $address }, limit: 1) {
      id
      level
      xpIntoLevel
      xpToNextLevel
      rankTier
      pointsIntoTier
      pointsToNextTier
      multiplier
    }
  }
`
