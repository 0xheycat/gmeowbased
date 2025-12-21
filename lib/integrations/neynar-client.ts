/**
 * Neynar Client-Safe API Wrapper
 * 
 * This file provides client-safe functions to fetch Farcaster data
 * by calling existing API routes instead of directly using the Neynar SDK.
 * 
 * ⚠️ IMPORTANT: Never import from './neynar' in client components.
 * The Neynar SDK uses Node.js APIs and will break in the browser.
 * 
 * Uses existing API infrastructure (with server-side caching):
 * - /api/farcaster/fid - Get FID by address (5 min cache)
 * - /api/farcaster/bulk - Bulk fetch users by addresses (60s cache)
 * - /api/user/profile/[fid] - Get user profile by FID
 * 
 * No client-side caching - relies on server-side cache infrastructure
 * and browser HTTP caching (Cache-Control headers from API routes)
 * 
 * Created: December 21, 2025
 */

export interface FarcasterUser {
  fid: number
  username?: string
  displayName?: string
  pfpUrl?: string
  bio?: string
  followerCount?: number
  followingCount?: number
  verifications?: string[]
  powerBadge?: boolean
  custodyAddress?: string
  activeStatus?: string
  neynarScore?: number | null
  contractData?: {
    currentStreak: number
    longestStreak: number
    totalGMs: number
    lastGMTimestamp: number
    canGMToday: boolean
    isRegistered: boolean
    points?: number
    rank?: number
  }
  walletAddress?: `0x${string}`
}

/**
 * Fetch FID by wallet address (uses existing /api/farcaster/fid)
 * Server-side cached for 5 minutes
 */
export async function fetchFidByAddress(address: string): Promise<number | null> {
  try {
    const response = await fetch(`/api/farcaster/fid?address=${encodeURIComponent(address)}`)
    
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`Failed to fetch FID: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.fid || null
  } catch (error) {
    console.error('[neynar-client] fetchFidByAddress error:', error)
    return null
  }
}

/**
 * Fetch Farcaster user by wallet address (uses existing /api/farcaster/bulk)
 * Server-side cached with stale-while-revalidate
 */
export async function fetchUserByAddress(address: string): Promise<FarcasterUser | null> {
  try {
    const response = await fetch('/api/farcaster/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addresses: [address] })
    })
    
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`Failed to fetch user: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data[address.toLowerCase()] || null
  } catch (error) {
    console.error('[neynar-client] fetchUserByAddress error:', error)
    return null
  }
}

/**
 * Fetch Farcaster user by FID (uses existing /api/user/profile/[fid])
 * Server-side cached via profile service
 */
export async function fetchUserByFid(fid: number | string): Promise<FarcasterUser | null> {
  try {
    const fidNum = typeof fid === 'string' ? parseInt(fid, 10) : fid
    if (isNaN(fidNum) || fidNum <= 0) return null

    const response = await fetch(`/api/user/profile/${fidNum}`)
    
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`Failed to fetch user: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.profile || data // Handle different response formats
  } catch (error) {
    console.error('[neynar-client] fetchUserByFid error:', error)
    return null
  }
}

/**
 * Bulk fetch users by addresses (uses existing /api/farcaster/bulk)
 * Server-side cached with stale-while-revalidate
 */
export async function fetchUsersByAddresses(addresses: string[]): Promise<Record<string, FarcasterUser>> {
  try {
    if (!addresses.length) return {}

    const response = await fetch('/api/farcaster/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addresses })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('[neynar-client] fetchUsersByAddresses error:', error)
    return {}
  }
}

// Re-export type for convenience
export type { FarcasterUser as NeynarUser }
