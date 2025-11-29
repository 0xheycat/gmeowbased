/**
 * Onchain Stats Types
 * 
 * Source: Extracted from old foundation OnchainStats.tsx
 * Purpose: Type-safe onchain data structures
 */

import type { ChainKey } from './chain-registry'

/**
 * Complete onchain statistics for a wallet address
 */
export type OnchainStatsData = {
  // Transaction metrics
  totalOutgoingTxs: number | null
  contractsDeployed: number | null
  
  // Talent Protocol scores
  talentScore: number | null
  talentUpdatedAt: string | null
  
  // Activity timestamps
  firstTxAt: number | null // Unix timestamp
  lastTxAt: number | null // Unix timestamp
  baseAgeSeconds: number | null // Account age in seconds
  
  // Balance
  baseBalanceEth: string | null // Formatted balance with symbol
  
  // Featured contract (most recent deployment)
  featured?: {
    address: string
    creator: string | null
    creationTx: string | null
    firstTxHash: string | null
    firstTxTime: number | null
    lastTxHash: string | null
    lastTxTime: number | null
  } | null
  
  // Volume metrics
  totalVolumeEth?: string | null // Total inbound + outbound volume
  
  // Neynar/Farcaster metrics
  neynarScore: number | null
  powerBadge: boolean | null
}

/**
 * Fields available for sharing onchain stats
 */
export type OnchainShareFields = Partial<Record<
  | 'txs'
  | 'contracts'
  | 'age'
  | 'balance'
  | 'volume'
  | 'talent'
  | 'neynar'
  | 'power'
  | 'featured'
  | 'builder'
  | 'firstTx'
  | 'lastTx'
  | 'chainName'
  | 'explorer',
  string
>>

/**
 * Cached stats with timestamp
 */
export type CachedStats = {
  fetchedAt: number
  stats: OnchainStatsData
}

/**
 * API request parameters for fetching onchain stats
 */
export type FetchOnchainStatsParams = {
  address: string
  chainKey: ChainKey
  force?: boolean // Bypass cache
}

/**
 * API response for onchain stats endpoint
 */
export type OnchainStatsResponse = {
  ok: true
  data: OnchainStatsData
  cachedAt?: number
} | {
  ok: false
  error: string
}

/**
 * Create empty stats object (all null)
 */
export function createEmptyStats(): OnchainStatsData {
  return {
    totalOutgoingTxs: null,
    contractsDeployed: null,
    talentScore: null,
    talentUpdatedAt: null,
    firstTxAt: null,
    lastTxAt: null,
    baseAgeSeconds: null,
    baseBalanceEth: null,
    featured: null,
    totalVolumeEth: null,
    neynarScore: null,
    powerBadge: null,
  }
}

/**
 * Format account age from seconds to human-readable string
 * @param seconds - Account age in seconds
 * @returns Formatted string like "5d 12h" or "3h 45m"
 */
export function formatAccountAge(seconds: number | null): string {
  if (seconds == null || seconds < 0) return '—'
  
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (days > 0) {
    return `${days}d ${hours}h`
  }
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  
  return `${Math.max(0, Math.floor(seconds))}s`
}

/**
 * Format Unix timestamp to date string
 * @param timestamp - Unix timestamp in seconds
 * @returns Formatted date string like "Nov 15, 2024"
 */
export function formatTimestamp(timestamp: number | null): string {
  if (timestamp == null) return '—'
  
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format large numbers with commas
 * @param value - Number to format
 * @returns Formatted string like "1,234,567"
 */
export function formatNumber(value: number | null): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US').format(value)
}

/**
 * Format decimal numbers with fixed precision
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string like "1,234.56"
 */
export function formatDecimal(value: number | null, decimals: number = 2): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}
