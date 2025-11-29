// Farcaster Feed API Utilities
// Provides feed fetching with pagination and caching

interface NeynarCast {
  hash: string
  thread_hash: string
  parent_hash?: string | null
  parent_url?: string | null
  root_parent_url?: string | null
  parent_author?: {
    fid: number
    username?: string
    display_name?: string
    pfp_url?: string
  } | null
  author: {
    fid: number
    username?: string
    display_name?: string
    pfp_url?: string
    power_badge?: boolean
    follower_count?: number
    following_count?: number
  }
  text: string
  timestamp: string
  embeds?: Array<{
    url?: string
    metadata?: {
      content_type?: string
      content_length?: number
      image?: {
        width_px?: number
        height_px?: number
      }
    }
  }>
  reactions?: {
    likes_count: number
    recasts_count: number
  }
  replies?: {
    count: number
  }
  viewer_context?: {
    liked?: boolean
    recasted?: boolean
  }
  channel?: {
    id: string
    name: string
    image_url?: string
  } | null
}

interface NeynarFeedResponse {
  casts: NeynarCast[]
  next?: {
    cursor?: string | null
  }
}

export interface FarcasterCast {
  hash: string
  threadHash: string
  parentHash?: string | null
  parentUrl?: string | null
  rootParentUrl?: string | null
  parentAuthor?: {
    fid: number
    username?: string
    displayName?: string
    pfpUrl?: string
  } | null
  author: {
    fid: number
    username?: string
    displayName?: string
    pfpUrl?: string
    powerBadge?: boolean
    followerCount?: number
    followingCount?: number
  }
  text: string
  timestamp: string
  embeds?: Array<{
    url?: string
    contentType?: string
    contentLength?: number
    imageWidth?: number
    imageHeight?: number
  }>
  reactions: {
    likes: number
    recasts: number
  }
  replies: {
    count: number
  }
  viewerContext?: {
    liked?: boolean
    recasted?: boolean
  }
  channel?: {
    id: string
    name: string
    imageUrl?: string
  } | null
}

export interface FeedResult {
  casts: FarcasterCast[]
  nextCursor?: string | null
}

const NEYNAR_API_BASE = 'https://api.neynar.com'

function getApiKey(): string | undefined {
  return (
    process.env.NEYNAR_API_KEY ||
    process.env.NEYNAR_GLOBAL_API ||
    process.env.NEXT_PUBLIC_NEYNAR_API_KEY ||
    undefined
  )
}

async function neynarFetch<T = any>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<T | null> {
  const apiKey = getApiKey()
  if (!apiKey) {
    console.error('[neynarFetch] No API key configured')
    return null
  }

  const url = new URL(path, NEYNAR_API_BASE)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && String(v).length > 0) {
        url.searchParams.set(k, String(v))
      }
    }
  }

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'x-api-key': apiKey,
        'x-neynar-experimental': 'false',
      },
      next: { revalidate: 120 }, // Cache for 2 minutes
    })

    if (!res.ok) {
      console.error(`[neynarFetch] ${path} failed:`, res.status, res.statusText)
      return null
    }

    return (await res.json()) as T
  } catch (err) {
    console.error('[neynarFetch] Error:', err)
    return null
  }
}

function mapCast(cast: NeynarCast): FarcasterCast {
  return {
    hash: cast.hash,
    threadHash: cast.thread_hash,
    parentHash: cast.parent_hash || null,
    parentUrl: cast.parent_url || null,
    rootParentUrl: cast.root_parent_url || null,
    parentAuthor: cast.parent_author
      ? {
          fid: cast.parent_author.fid,
          username: cast.parent_author.username,
          displayName: cast.parent_author.display_name,
          pfpUrl: cast.parent_author.pfp_url,
        }
      : null,
    author: {
      fid: cast.author.fid,
      username: cast.author.username,
      displayName: cast.author.display_name,
      pfpUrl: cast.author.pfp_url,
      powerBadge: cast.author.power_badge,
      followerCount: cast.author.follower_count,
      followingCount: cast.author.following_count,
    },
    text: cast.text,
    timestamp: cast.timestamp,
    embeds: cast.embeds?.map((e) => ({
      url: e.url,
      contentType: e.metadata?.content_type,
      contentLength: e.metadata?.content_length,
      imageWidth: e.metadata?.image?.width_px,
      imageHeight: e.metadata?.image?.height_px,
    })),
    reactions: {
      likes: cast.reactions?.likes_count || 0,
      recasts: cast.reactions?.recasts_count || 0,
    },
    replies: {
      count: cast.replies?.count || 0,
    },
    viewerContext: cast.viewer_context,
    channel: cast.channel
      ? {
          id: cast.channel.id,
          name: cast.channel.name,
          imageUrl: cast.channel.image_url,
        }
      : null,
  }
}

/**
 * Fetch a user's feed (casts by a specific FID)
 * @param fid - Farcaster FID
 * @param limit - Number of casts to fetch (default 25)
 * @param cursor - Pagination cursor
 */
export async function getUserFeed(
  fid: number,
  limit: number = 25,
  cursor?: string
): Promise<FeedResult | null> {
  const params: Record<string, string | number | undefined> = {
    fid: fid,
    limit: Math.min(limit, 100),
  }
  if (cursor) params.cursor = cursor

  const data = await neynarFetch<NeynarFeedResponse>('/v2/farcaster/feed/user', params)
  if (!data || !data.casts) return null

  return {
    casts: data.casts.map(mapCast),
    nextCursor: data.next?.cursor || null,
  }
}

/**
 * Fetch feed of users followed by a FID
 * @param fid - Farcaster FID of the viewer
 * @param limit - Number of casts to fetch (default 25)
 * @param cursor - Pagination cursor
 */
export async function getFollowingFeed(
  fid: number,
  limit: number = 25,
  cursor?: string
): Promise<FeedResult | null> {
  const params: Record<string, string | number | undefined> = {
    fid: fid,
    limit: Math.min(limit, 100),
    with_recasts: '1',
  }
  if (cursor) params.cursor = cursor

  const data = await neynarFetch<NeynarFeedResponse>('/v2/farcaster/feed', params)
  if (!data || !data.casts) return null

  return {
    casts: data.casts.map(mapCast),
    nextCursor: data.next?.cursor || null,
  }
}

/**
 * Fetch trending/popular casts
 * @param limit - Number of casts to fetch (default 25)
 * @param cursor - Pagination cursor
 */
export async function getTrendingFeed(
  limit: number = 25,
  cursor?: string
): Promise<FeedResult | null> {
  const params: Record<string, string | number | undefined> = {
    limit: Math.min(limit, 100),
    filter_type: 'global_trending',
  }
  if (cursor) params.cursor = cursor

  const data = await neynarFetch<NeynarFeedResponse>('/v2/farcaster/feed', params)
  if (!data || !data.casts) return null

  return {
    casts: data.casts.map(mapCast),
    nextCursor: data.next?.cursor || null,
  }
}

/**
 * Fetch a single cast by hash
 * @param hash - Cast hash
 * @param viewerFid - Optional viewer FID for context (liked/recasted)
 */
export async function getCast(
  hash: string,
  viewerFid?: number
): Promise<FarcasterCast | null> {
  const params: Record<string, string | number | undefined> = {
    identifier: hash,
    type: 'hash',
  }
  if (viewerFid) params.viewer_fid = viewerFid

  const data = await neynarFetch<{ cast: NeynarCast }>('/v2/farcaster/cast', params)
  if (!data?.cast) return null

  return mapCast(data.cast)
}

/**
 * Fetch channel feed
 * @param channelId - Channel ID (e.g. 'farcaster')
 * @param limit - Number of casts to fetch (default 25)
 * @param cursor - Pagination cursor
 */
export async function getChannelFeed(
  channelId: string,
  limit: number = 25,
  cursor?: string
): Promise<FeedResult | null> {
  const params: Record<string, string | number | undefined> = {
    channel_id: channelId,
    limit: Math.min(limit, 100),
    with_recasts: '1',
  }
  if (cursor) params.cursor = cursor

  const data = await neynarFetch<NeynarFeedResponse>('/v2/farcaster/feed/channels', params)
  if (!data || !data.casts) return null

  return {
    casts: data.casts.map(mapCast),
    nextCursor: data.next?.cursor || null,
  }
}
