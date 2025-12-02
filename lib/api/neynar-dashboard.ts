/**
 * Neynar Dashboard API
 * All 5 data-fetching functions for 100% automated dashboard
 * NO manual token/NFT addresses required!
 */

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY!
const NEXT_PUBLIC_NEYNAR_API_KEY = process.env.NEXT_PUBLIC_NEYNAR_API_KEY!

const BASE_URL = 'https://api.neynar.com/v2'

// Cache for 5 minutes (300 seconds)
const CACHE_TTL = 300

// ===========================
// 1. TRENDING TOKENS (24h) ✅ TESTED
// ===========================

export interface TrendingToken {
  address: string
  name: string
  symbol: string
  decimals: number
  price: number // USD
  totalSupply: string
  change24h?: number // percentage (calculated if available)
  volume24h?: number // USD (calculated if available)
}

export async function getTrendingTokens(): Promise<TrendingToken[]> {
  try {
    const response = await fetch(
      `${BASE_URL}/farcaster/fungible/trending?network=base&time_window=24h&limit=10`,
      {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-api-key': NEYNAR_API_KEY,
        },
        next: { revalidate: CACHE_TTL },
      }
    )

    if (!response.ok) {
      throw new Error(`Neynar API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Transform Neynar response to our interface
    return data.trending.map((item: any) => ({
      address: item.fungible.address,
      name: item.fungible.name,
      symbol: item.fungible.symbol,
      decimals: item.fungible.decimals,
      price: parseFloat(item.fungible.price?.in_usd || '0'),
      totalSupply: item.fungible.total_supply,
      // Future: Calculate 24h change from historical data
      change24h: 0,
      volume24h: 0,
    }))
  } catch (error) {
    console.error('Error fetching trending tokens:', error)
    return []
  }
}

// ===========================
// 2. TOP CASTERS (7d Power Users)
// ===========================

export interface TopCaster {
  fid: number
  username: string
  displayName: string
  avatar: string
  followerCount: number
  followingCount: number
  powerBadge: boolean
}

export async function getTopCasters(limit: number = 12): Promise<TopCaster[]> {
  try {
    const response = await fetch(
      `${BASE_URL}/farcaster/user/power?limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-api-key': NEYNAR_API_KEY,
        },
        next: { revalidate: CACHE_TTL },
      }
    )

    if (!response.ok) {
      throw new Error(`Neynar API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    return data.users.map((user: any) => ({
      fid: user.fid,
      username: user.username,
      displayName: user.display_name || user.username,
      avatar: user.pfp_url,
      followerCount: user.follower_count,
      followingCount: user.following_count,
      powerBadge: user.power_badge || false,
    }))
  } catch (error) {
    console.error('Error fetching top casters:', error)
    return []
  }
}

// ===========================
// 3. TRENDING CHANNELS (24h)
// ===========================

export interface TrendingChannel {
  id: string
  name: string
  description: string
  image: string
  url: string
  memberCount: number
  leadFid: number
}

export async function getTrendingChannels(limit: number = 12): Promise<TrendingChannel[]> {
  try {
    const response = await fetch(
      `${BASE_URL}/farcaster/channel/trending?time_window=7d&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-api-key': NEYNAR_API_KEY,
        },
        next: { revalidate: CACHE_TTL },
      }
    )

    if (!response.ok) {
      throw new Error(`Neynar API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    return data.channels.map((item: any) => ({
      id: item.channel.id,
      name: item.channel.name,
      description: item.channel.description || '',
      image: item.channel.image_url,
      url: item.channel.url,
      memberCount: item.channel.follower_count || 0,
      leadFid: item.channel.lead?.fid,
    }))
  } catch (error) {
    console.error('Error fetching trending channels:', error)
    return []
  }
}

// ===========================
// 4. ACTIVITY FEED (Global Trending)
// ===========================

export interface ActivityCast {
  hash: string
  text: string
  timestamp: string
  author: {
    fid: number
    username: string
    displayName: string
    avatar: string
    powerBadge: boolean
  }
  replies: number
  likes: number
  recasts: number
  embeds: Array<{
    type: string
    url?: string
    castId?: any
  }>
}

export async function getActivityFeed(limit: number = 10): Promise<ActivityCast[]> {
  try {
    const response = await fetch(
      `${BASE_URL}/farcaster/feed?feed_type=filter&filter_type=global_trending&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-api-key': NEYNAR_API_KEY,
        },
        next: { revalidate: CACHE_TTL },
      }
    )

    if (!response.ok) {
      throw new Error(`Neynar API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    return data.casts.map((cast: any) => ({
      hash: cast.hash,
      text: cast.text,
      timestamp: cast.timestamp,
      author: {
        fid: cast.author.fid,
        username: cast.author.username,
        displayName: cast.author.display_name || cast.author.username,
        avatar: cast.author.pfp_url,
        powerBadge: cast.author.power_badge || false,
      },
      replies: cast.replies?.count || 0,
      likes: cast.reactions?.likes_count || 0,
      recasts: cast.reactions?.recasts_count || 0,
      embeds: cast.embeds || [],
    }))
  } catch (error) {
    console.error('Error fetching activity feed:', error)
    return []
  }
}

// ===========================
// 5. FEATURED FRAMES
// ===========================

export interface FeaturedFrame {
  id: string
  title: string
  description: string
  image: string
  creator: string
  creatorFid: number
  url: string
  interactions: number
  category?: string
}

export async function getFeaturedFrames(limit: number = 8): Promise<FeaturedFrame[]> {
  try {
    // Use existing frame API endpoint (already in codebase)
    const response = await fetch('/api/frames/featured', {
      method: 'GET',
      next: { revalidate: CACHE_TTL },
    })

    if (!response.ok) {
      throw new Error(`Frames API error: ${response.status}`)
    }

    const frames = await response.json()
    return frames.slice(0, limit)
  } catch (error) {
    console.error('Error fetching featured frames:', error)
    // Fallback: return empty array (don't break dashboard)
    return []
  }
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

/**
 * Format large numbers for display (1.2K, 45.3M)
 */
export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`
  }
  return num.toString()
}

/**
 * Format volume (USD) for display ($1.2K, $45.3M)
 */
export function formatVolume(volume: number): string {
  return formatNumber(volume)
}

/**
 * Format timestamp to relative time (2h ago, 1d ago)
 */
export function formatTimeAgo(timestamp: string): string {
  const now = new Date()
  const castTime = new Date(timestamp)
  const diffMs = now.getTime() - castTime.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffDay > 0) return `${diffDay}d ago`
  if (diffHour > 0) return `${diffHour}h ago`
  if (diffMin > 0) return `${diffMin}m ago`
  return 'just now'
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}
