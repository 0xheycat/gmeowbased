/**
 * Referral GraphQL Queries
 * Phase 5 - Referral Pages Migration (Jan 3, 2026)
 * 
 * Queries for fetching referral data from Subsquid
 * 
 * @architecture Hybrid Data Layer
 * - Referral codes: Subsquid GraphQL (ReferralCode entity)
 * - Referral uses: Subsquid GraphQL (ReferralUse entity)
 * - Referrer sets: Subsquid GraphQL (ReferrerSet entity)
 * - Referral analytics: Supabase (referral_stats table - aggregations)
 */

import { gql } from '@apollo/client'

/**
 * Referral Code Fragment
 * On-chain referral code entity
 */
export const REFERRAL_CODE_FIELDS = gql`
  fragment ReferralCodeFields on ReferralCode {
    id
    owner
    createdAt
    totalUses
    totalRewards
  }
`

/**
 * Referral Use Fragment
 * Individual referral use event
 */
export const REFERRAL_USE_FIELDS = gql`
  fragment ReferralUseFields on ReferralUse {
    id
    referrer
    referee
    reward
    timestamp
    blockNumber
    txHash
    code {
      id
      owner
    }
  }
`

/**
 * Referrer Set Fragment
 * Referrer relationship tracking
 */
export const REFERRER_SET_FIELDS = gql`
  fragment ReferrerSetFields on ReferrerSet {
    id
    user
    referrer
    timestamp
    blockNumber
    txHash
  }
`

/**
 * Get Referral Code by ID
 * Returns referral code details with total uses and rewards
 * 
 * @param codeId - Referral code string (e.g., "GMEOW", "BASE2025")
 */
export const GET_REFERRAL_CODE = gql`
  ${REFERRAL_CODE_FIELDS}
  query GetReferralCode($codeId: String!) {
    referralCodes(where: { id_eq: $codeId }, limit: 1) {
      ...ReferralCodeFields
      referrals(limit: 10, orderBy: timestamp_DESC) {
        id
        referee
        reward
        timestamp
      }
    }
  }
`

/**
 * Get Referral Codes by Owner
 * Returns all referral codes created by a specific address
 * 
 * @param owner - Wallet address (lowercase)
 * @param limit - Maximum codes to return
 */
export const GET_REFERRAL_CODES_BY_OWNER = gql`
  ${REFERRAL_CODE_FIELDS}
  query GetReferralCodesByOwner($owner: String!, $limit: Int) {
    referralCodes(
      where: { owner_eq: $owner }
      orderBy: createdAt_DESC
      limit: $limit
    ) {
      ...ReferralCodeFields
    }
  }
`

/**
 * Get Referral Uses by Code
 * Returns all uses of a specific referral code
 * 
 * @param codeId - Referral code string
 * @param limit - Maximum uses to return
 * @param orderBy - Sort order (default: timestamp_DESC)
 */
export const GET_REFERRAL_USES_BY_CODE = gql`
  ${REFERRAL_USE_FIELDS}
  query GetReferralUsesByCode($codeId: String!, $limit: Int, $orderBy: [ReferralUseOrderByInput!]) {
    referralUses(
      where: { code: { id_eq: $codeId } }
      limit: $limit
      orderBy: $orderBy
    ) {
      ...ReferralUseFields
    }
  }
`

/**
 * Get Referral Uses by Referrer
 * Returns all successful referrals made by a specific address
 * 
 * @param referrer - Referrer wallet address (lowercase)
 * @param limit - Maximum uses to return
 */
export const GET_REFERRAL_USES_BY_REFERRER = gql`
  ${REFERRAL_USE_FIELDS}
  query GetReferralUsesByReferrer($referrer: String!, $limit: Int) {
    referralUses(
      where: { referrer_eq: $referrer }
      orderBy: timestamp_DESC
      limit: $limit
    ) {
      ...ReferralUseFields
    }
  }
`

/**
 * Get Referral Uses by Referee
 * Returns all referrals used by a specific address
 * 
 * @param referee - Referee wallet address (lowercase)
 * @param limit - Maximum uses to return
 */
export const GET_REFERRAL_USES_BY_REFEREE = gql`
  ${REFERRAL_USE_FIELDS}
  query GetReferralUsesByReferee($referee: String!, $limit: Int) {
    referralUses(
      where: { referee_eq: $referee }
      orderBy: timestamp_DESC
      limit: $limit
    ) {
      ...ReferralUseFields
    }
  }
`

/**
 * Get Referrer Set Events by User
 * Returns referrer relationship for a specific user
 * 
 * @param user - User wallet address (lowercase)
 */
export const GET_REFERRER_BY_USER = gql`
  ${REFERRER_SET_FIELDS}
  query GetReferrerByUser($user: String!) {
    referrerSets(
      where: { user_eq: $user }
      orderBy: timestamp_DESC
      limit: 1
    ) {
      ...ReferrerSetFields
    }
  }
`

/**
 * Get Referrals by Referrer
 * Returns all users who set a specific address as their referrer
 * 
 * @param referrer - Referrer wallet address (lowercase)
 * @param limit - Maximum referrals to return
 */
export const GET_REFERRALS_BY_REFERRER = gql`
  ${REFERRER_SET_FIELDS}
  query GetReferralsByReferrer($referrer: String!, $limit: Int) {
    referrerSets(
      where: { referrer_eq: $referrer }
      orderBy: timestamp_DESC
      limit: $limit
    ) {
      ...ReferrerSetFields
    }
  }
`

/**
 * Get Recent Referral Activity
 * Returns recent referral uses across all codes (for activity feed)
 * 
 * @param limit - Maximum uses to return (default: 20)
 */
export const GET_RECENT_REFERRAL_ACTIVITY = gql`
  ${REFERRAL_USE_FIELDS}
  query GetRecentReferralActivity($limit: Int) {
    referralUses(
      orderBy: timestamp_DESC
      limit: $limit
    ) {
      ...ReferralUseFields
    }
  }
`

/**
 * Get Referral Stats by Owner
 * Returns aggregate stats for all codes owned by an address
 * 
 * @param owner - Owner wallet address (lowercase)
 */
export const GET_REFERRAL_STATS_BY_OWNER = gql`
  query GetReferralStatsByOwner($owner: String!) {
    referralCodes(where: { owner_eq: $owner }) {
      id
      totalUses
      totalRewards
    }
  }
`

/**
 * TypeScript Types for Query Variables
 */

export interface GetReferralCodeVariables {
  codeId: string
}

export interface GetReferralCodesByOwnerVariables {
  owner: string
  limit?: number
}

export interface GetReferralUsesByCodeVariables {
  codeId: string
  limit?: number
  orderBy?: Array<'timestamp_DESC' | 'timestamp_ASC'>
}

export interface GetReferralUsesByReferrerVariables {
  referrer: string
  limit?: number
}

export interface GetReferralUsesByRefereeVariables {
  referee: string
  limit?: number
}

export interface GetReferrerByUserVariables {
  user: string
}

export interface GetReferralsByReferrerVariables {
  referrer: string
  limit?: number
}

export interface GetRecentReferralActivityVariables {
  limit?: number
}

export interface GetReferralStatsByOwnerVariables {
  owner: string
}

/**
 * TypeScript Types for Query Responses
 */

export interface ReferralCodeResponse {
  id: string
  owner: string
  createdAt: string // BigInt as string
  totalUses: number
  totalRewards: string // BigInt as string
  referrals?: Array<{
    id: string
    referee: string
    reward: string
    timestamp: string
  }>
}

export interface ReferralUseResponse {
  id: string
  referrer: string
  referee: string
  reward: string // BigInt as string
  timestamp: string // BigInt as string (Unix timestamp)
  blockNumber: number
  txHash: string
  code: {
    id: string
    owner: string
  }
}

export interface ReferrerSetResponse {
  id: string
  user: string
  referrer: string
  timestamp: string // BigInt as string
  blockNumber: number
  txHash: string
}

export interface ReferralStatsResponse {
  id: string
  totalUses: number
  totalRewards: string
}
