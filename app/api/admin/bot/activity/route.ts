import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { getNeynarServerClient } from '@/lib/neynar-server'
import { resolveBotFid } from '@/lib/neynar-bot'
import { fetchFidByUsername, fetchUserByFid, type FarcasterUser } from '@/lib/neynar'
import { extractHttpErrorMessage } from '@/lib/http-error'
import { validateAdminRequest } from '@/lib/admin-auth'
import { rateLimit, getClientIp, strictLimiter } from '@/lib/rate-limit'
import { withErrorHandler } from '@/lib/error-handler'

export const runtime = 'nodejs'

const MAX_RECENT_CASTS = 12
const INTERACTION_TYPES = ['mentions', 'replies', 'recasts', 'follows'] as const
type InteractionType = (typeof INTERACTION_TYPES)[number]

const WATCHER_HANDLE_CONFIG = [
  {
    label: '@gmeowbased',
    username: 'gmeowbased',
    envFidKeys: ['NEYNAR_BOT_FID', 'FARCASTER_BOT_FID', 'NEXT_PUBLIC_FARCASTER_BOT_FID'] as const,
  },
  {
    label: '@heycat',
    username: 'heycat',
    envFidKeys: ['NEYNAR_HEYCAT_FID', 'NEYNAR_OWNER_FID', 'OWNER_FID', 'HEY_CAT_FID'] as const,
  },
] as const

const KEYWORD_CONFIG = [
  { id: 'gmeowbased', label: 'gmeowbased', regex: /[#$@]?gmeowbased/i },
  { id: 'heycat', label: 'heycat', regex: /[#$@]?heycat/i },
] as const

const KEYWORD_LOOKBACK_DAYS = 7
const MAX_INTERACTION_RECENT = 6
const MAX_KEYWORD_SAMPLES = 6

type ActorSummary = {
  fid: number | null
  username: string | null
  displayName: string | null
  pfpUrl: string | null
}

type CastSummary = {
  hash: string | null
  url: string | null
  text: string
  preview: string
  timestamp: string | null
}

type InteractionEntry = {
  type: InteractionType
  actor: ActorSummary
  cast: CastSummary | null
  timestamp: string | null
  count: number
}

type InteractionCategorySummary = {
  total: number
  recent: InteractionEntry[]
}

type WatcherInteractionSummary = {
  label: string
  username: string | null
  fid: number | null
  displayName: string | null
  avatarUrl: string | null
  categories: Record<InteractionType, InteractionCategorySummary>
  error?: string | null
}

type KeywordSample = {
  variant: string
  text: string
  preview: string
  hash: string | null
  url: string | null
  timestamp: string | null
  author: ActorSummary
}

type KeywordInsight = {
  keyword: string
  matches: number
  samples: KeywordSample[]
}

type InteractionsPayload = {
  watchers: WatcherInteractionSummary[]
  totals: Record<InteractionType, number>
  keywords: KeywordInsight[]
}

type WatcherResolution = {
  label: string
  username: string | null
  fid: number | null
  profile: FarcasterUser | null
}

function extractChannelId(channel: unknown): string | null {
  if (!channel || typeof channel !== 'object') return null
  if ('id' in channel && typeof channel.id === 'string') return channel.id
  if ('channel_id' in channel && typeof channel.channel_id === 'string') return channel.channel_id
  if ('name' in channel && typeof channel.name === 'string') return channel.name
  return null
}

function extractChannelName(channel: unknown): string | null {
  if (!channel || typeof channel !== 'object') return null
  if ('name' in channel && typeof channel.name === 'string') return channel.name
  if ('display_name' in channel && typeof channel.display_name === 'string') return channel.display_name
  if ('title' in channel && typeof channel.title === 'string') return channel.title
  return null
}

function createCastUrl(hash?: string | null, username?: string | null): string | null {
  if (!hash) return null
  if (username && username.trim().length > 0) {
    return `https://warpcast.com/${username.replace(/^@/, '')}/${hash}`
  }
  return `https://warpcast.com/~/cast/${hash}`
}

function truncateText(text: string, maxLength = 160): string {
  if (!text) return ''
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`
}

function coerceTimestamp(value: unknown): string | null {
  return typeof value === 'string' && value.length ? value : null
}

function buildActorSummary(user: any): ActorSummary {
  if (!user || typeof user !== 'object') {
    return { fid: null, username: null, displayName: null, pfpUrl: null }
  }
  const rawFid = (user as any).fid
  const fid = typeof rawFid === 'number' && Number.isFinite(rawFid)
    ? rawFid
    : typeof rawFid === 'string' && rawFid.trim().length
      ? Number(rawFid)
      : null
  return {
    fid: Number.isFinite(fid) ? (fid as number) : null,
    username:
      typeof user.username === 'string'
        ? user.username
        : typeof user.user_name === 'string'
          ? user.user_name
          : null,
    displayName:
      typeof user.displayName === 'string'
        ? user.displayName
        : typeof user.display_name === 'string'
          ? user.display_name
          : null,
    pfpUrl:
      typeof user.pfpUrl === 'string'
        ? user.pfpUrl
        : typeof user.pfp_url === 'string'
          ? user.pfp_url
          : null,
  }
}

function buildCastSummary(cast: any): CastSummary | null {
  if (!cast || typeof cast !== 'object') return null
  const hash = typeof cast.hash === 'string' ? cast.hash : null
  const text = typeof cast.text === 'string' ? cast.text : ''
  const author = (cast as any).author
  const username = author && typeof author === 'object' && typeof author.username === 'string'
    ? author.username
    : null
  return {
    hash,
    url: createCastUrl(hash ?? undefined, username ?? undefined),
    text,
    preview: truncateText(text, 150),
    timestamp: coerceTimestamp((cast as any).timestamp),
  }
}

function createEmptyCategories(): Record<InteractionType, InteractionCategorySummary> {
  return {
    mentions: { total: 0, recent: [] },
    replies: { total: 0, recent: [] },
    recasts: { total: 0, recent: [] },
    follows: { total: 0, recent: [] },
  }
}

function addRecentEntry(category: InteractionCategorySummary, entry: InteractionEntry) {
  if (category.recent.length >= MAX_INTERACTION_RECENT) return
  category.recent.push(entry)
}

function mapNotificationType(type: unknown): InteractionType | null {
  switch (type) {
    case 'mention':
      return 'mentions'
    case 'reply':
      return 'replies'
    case 'recasts':
      return 'recasts'
    case 'follows':
      return 'follows'
    default:
      return null
  }
}

function pickFidFromEnv(keys: readonly string[] | undefined): number | null {
  if (!keys) return null
  for (const key of keys) {
    const value = process.env[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value.trim())
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed
      }
    }
  }
  return null
}

async function resolveWatchers(botFid: number | null, botProfile: FarcasterUser | null): Promise<WatcherResolution[]> {
  const resolutions: WatcherResolution[] = []

  for (const config of WATCHER_HANDLE_CONFIG) {
    let fid: number | null = null
    if (config.label === '@gmeowbased') {
      fid = botFid ?? pickFidFromEnv(config.envFidKeys)
    } else {
      fid = pickFidFromEnv(config.envFidKeys)
    }

    if ((!fid || !Number.isFinite(fid)) && config.username) {
      try {
        const resolved = await fetchFidByUsername(config.username)
        if (resolved) fid = resolved
      } catch {
        // ignore; handled below
      }
    }

    let profile: FarcasterUser | null = null
    if (config.label === '@gmeowbased' && botProfile) {
      profile = botProfile
    } else if (fid) {
      try {
        profile = await fetchUserByFid(fid)
      } catch {
        profile = null
      }
    }

    resolutions.push({
      label: config.label,
      username: config.username ?? null,
      fid: fid ?? null,
      profile,
    })
  }

  return resolutions
}

async function buildWatcherSummary(client: any, watcher: WatcherResolution): Promise<WatcherInteractionSummary> {
  const categories = createEmptyCategories()
  const displayName = watcher.profile?.displayName ?? watcher.profile?.username ?? watcher.label
  const avatarUrl = watcher.profile?.pfpUrl ?? null

  if (!watcher.fid) {
    return {
      label: watcher.label,
      username: watcher.username,
      fid: null,
      displayName,
      avatarUrl,
      categories,
      error: 'Farcaster FID is not configured or resolvable for this handle.',
    }
  }

  try {
    const response = await client.fetchAllNotifications({
      fid: watcher.fid,
      type: ['follows', 'recasts', 'mentions', 'replies'],
      limit: 25,
    })

    const notifications = Array.isArray(response?.notifications) ? response.notifications : []
    for (const notification of notifications) {
      const category = mapNotificationType(notification?.type)
      if (!category) continue
      const baseTimestamp = coerceTimestamp(notification?.most_recent_timestamp)
      const notificationCount = typeof notification?.count === 'number' && notification.count > 0
        ? notification.count
        : 1

      if (category === 'mentions' || category === 'replies') {
        const castSummary = buildCastSummary(notification?.cast)
        const actor = buildActorSummary(notification?.cast?.author)
        categories[category].total += notificationCount
        if (castSummary) {
          addRecentEntry(categories[category], {
            type: category,
            actor,
            cast: castSummary,
            timestamp: castSummary.timestamp ?? baseTimestamp,
            count: notificationCount,
          })
        }
        continue
      }

      if (category === 'recasts') {
        const reactions = Array.isArray(notification?.reactions) ? notification.reactions : []
        const recastCount = typeof notification?.count === 'number' && notification.count > 0
          ? notification.count
          : reactions.length || 1
        categories.recasts.total += recastCount

        if (reactions.length) {
          for (const reaction of reactions) {
            if (categories.recasts.recent.length >= MAX_INTERACTION_RECENT) break
            const actor = buildActorSummary(reaction?.user)
            const castHash = reaction?.cast?.hash ?? null
            const castAuthor = reaction?.cast?.author
            addRecentEntry(categories.recasts, {
              type: 'recasts',
              actor,
              cast: castHash
                ? {
                    hash: castHash,
                    url: createCastUrl(castHash, castAuthor?.username ?? castAuthor?.user_name),
                    text: '',
                    preview: '',
                    timestamp: baseTimestamp,
                  }
                : null,
              timestamp: baseTimestamp,
              count: 1,
            })
          }
        }

        continue
      }

      if (category === 'follows') {
        const follows = Array.isArray(notification?.follows) ? notification.follows : []
        const followCount = typeof notification?.count === 'number' && notification.count > 0
          ? notification.count
          : follows.length || 1
        categories.follows.total += followCount

        if (follows.length) {
          for (const follower of follows) {
            if (categories.follows.recent.length >= MAX_INTERACTION_RECENT) break
            const actor = buildActorSummary(follower?.user)
            addRecentEntry(categories.follows, {
              type: 'follows',
              actor,
              cast: null,
              timestamp: baseTimestamp,
              count: 1,
            })
          }
        }

        continue
      }
    }
  } catch (error) {
    return {
      label: watcher.label,
      username: watcher.username,
      fid: watcher.fid,
      displayName,
      avatarUrl,
      categories,
      error: extractHttpErrorMessage(error, `Failed to fetch notifications for ${watcher.label}`),
    }
  }

  return {
    label: watcher.label,
    username: watcher.username,
    fid: watcher.fid,
    displayName,
    avatarUrl,
    categories,
  }
}

async function gatherKeywordInsights(client: any, warnings: string[]): Promise<KeywordInsight[]> {
  const terms = KEYWORD_CONFIG.map((item) => item.label).join(' OR ')
  const afterDate = new Date(Date.now() - KEYWORD_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
  const afterClause = `after:${afterDate.toISOString().slice(0, 10)}`
  const query = `(${terms}) ${afterClause}`

  try {
    const response = await client.searchCasts({ q: query, sortType: 'desc_chron', limit: 60 })
    const casts = Array.isArray(response?.result?.casts) ? response.result.casts : []

    const insightMap = new Map<string, KeywordInsight>()
    for (const config of KEYWORD_CONFIG) {
      insightMap.set(config.id, { keyword: config.label, matches: 0, samples: [] })
    }

    for (const cast of casts) {
      const text = typeof cast?.text === 'string' ? cast.text : ''
      if (!text) continue

      for (const config of KEYWORD_CONFIG) {
        const match = text.match(config.regex)
        if (!match) continue

        const insight = insightMap.get(config.id)
        if (!insight) continue
        insight.matches += 1

        if (insight.samples.length < MAX_KEYWORD_SAMPLES) {
          insight.samples.push({
            variant: match[0],
            text,
            preview: truncateText(text, 150),
            hash: typeof cast.hash === 'string' ? cast.hash : null,
            url: createCastUrl(cast.hash, cast.author?.username ?? cast.author?.user_name),
            timestamp: coerceTimestamp(cast.timestamp),
            author: buildActorSummary(cast.author),
          })
        }
      }
    }

    return Array.from(insightMap.values()).filter((item) => item.matches > 0)
  } catch (error) {
    warnings.push(extractHttpErrorMessage(error, 'Failed to search for brand keywords'))
    return []
  }
}

async function gatherInteractions(
  client: any,
  botFid: number | null,
  botProfile: FarcasterUser | null,
  warnings: string[]
): Promise<InteractionsPayload> {
  const summaries: WatcherInteractionSummary[] = []
  const totals: Record<InteractionType, number> = {
    mentions: 0,
    replies: 0,
    recasts: 0,
    follows: 0,
  }

  const watchers = await resolveWatchers(botFid, botProfile)

  for (const watcher of watchers) {
    const summary = await buildWatcherSummary(client, watcher)
    summaries.push(summary)
    for (const type of INTERACTION_TYPES) {
      totals[type] += summary.categories[type].total
    }
    if (summary.error) {
      warnings.push(`${summary.label}: ${summary.error}`)
    }
  }

  const keywords = await gatherKeywordInsights(client, warnings)

  return {
    watchers: summaries,
    totals,
    keywords,
  }
}

type CastDigest = {
  hash: string
  url: string | null
  text: string
  preview: string
  timestamp: string | null
  parentHash: string | null
  parentUrl: string | null
  channelId: string | null
  channelName: string | null
  metrics: {
    likes: number
    recasts: number
    replies: number
    embeds: number
  }
}

type ActivityPayload = {
  ok: boolean
  fetchedAt: string
  bot: {
    fid: number | null
    username: string | null
    displayName: string | null
    followerCount: number | null
    followingCount: number | null
    powerBadge: boolean
    activeStatus: string | null
    lastCastAt: string | null
    totalRecentCasts: number
    aggregates: {
      likes: number
      recasts: number
      replies: number
      embeds: number
    }
  }
  recentCasts: CastDigest[]
  interactions: InteractionsPayload | null
  warnings: string[]
  userError: string | null
  feedError: string | null
}

function buildCastDigest(raw: any): CastDigest | null {
  if (!raw || typeof raw !== 'object') return null
  const hash = typeof raw.hash === 'string' ? raw.hash : ''
  if (!hash) return null
  const text = typeof raw.text === 'string' ? raw.text : ''
  const authorUsername = raw.author && typeof raw.author === 'object' && typeof raw.author.username === 'string'
    ? raw.author.username
    : null
  const preview = text.length > 160 ? `${text.slice(0, 157)}…` : text
  const timestamp = typeof raw.timestamp === 'string' ? raw.timestamp : null
  const parentHash = typeof raw.parent_hash === 'string' ? raw.parent_hash : null
  const parentUrl = typeof raw.parent_url === 'string' ? raw.parent_url : null
  const channelId = extractChannelId(raw.channel ?? null)
  const channelName = extractChannelName(raw.channel ?? null)
  const likes = raw.reactions && typeof raw.reactions === 'object' && typeof raw.reactions.likes_count === 'number'
    ? raw.reactions.likes_count
    : 0
  const recasts = raw.reactions && typeof raw.reactions === 'object' && typeof raw.reactions.recasts_count === 'number'
    ? raw.reactions.recasts_count
    : 0
  const replies = raw.replies && typeof raw.replies === 'object' && typeof raw.replies.count === 'number'
    ? raw.replies.count
    : 0
  const embeds = Array.isArray(raw.embeds) ? raw.embeds.length : 0

  return {
    hash,
    url: createCastUrl(hash, authorUsername),
    text,
    preview,
    timestamp,
    parentHash,
    parentUrl,
    channelId,
    channelName,
    metrics: { likes, recasts, replies, embeds },
  }
}

export const GET = withErrorHandler(async (req: NextRequest) => {
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, strictLimiter)
  
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const auth = await validateAdminRequest(req)
  if (!auth.ok && auth.reason !== 'admin_security_disabled') {
    return NextResponse.json({ ok: false, error: 'admin_auth_required', reason: auth.reason }, { status: 401 })
  }

  const fetchedAt = new Date().toISOString()
  const botFid = resolveBotFid()
  const warnings: string[] = []

  if (!botFid) {
    warnings.push('Bot FID is not configured. Set NEYNAR_BOT_FID in the environment to enable diagnostics.')
    const payload: ActivityPayload = {
      ok: false,
      fetchedAt,
      bot: {
        fid: null,
        username: null,
        displayName: null,
        followerCount: null,
        followingCount: null,
        powerBadge: false,
        activeStatus: null,
        lastCastAt: null,
        totalRecentCasts: 0,
        aggregates: { likes: 0, recasts: 0, replies: 0, embeds: 0 },
      },
      recentCasts: [],
      interactions: null,
      warnings,
      userError: 'Missing bot FID',
      feedError: null,
    }
    return NextResponse.json(payload, { status: 200 })
  }

  let user = null
  let userError: string | null = null
  try {
    user = await fetchUserByFid(botFid)
  } catch (error) {
    userError = (error as Error)?.message ?? 'Unexpected error fetching bot profile'
  }

  if (!user) {
    warnings.push('Unable to load bot profile metadata from Neynar.')
  } else if (typeof user.activeStatus === 'string' && user.activeStatus !== 'active') {
    warnings.push(`Bot profile is marked as ${user.activeStatus}. Review custody keys if automation fails.`)
  }

  let feed = null
  let feedError: string | null = null
  let client: any = null
  try {
    client = getNeynarServerClient()
  } catch (error) {
    feedError = extractHttpErrorMessage(error, 'Unable to initialize Neynar API client')
    warnings.push('Unable to initialize Neynar API client. Check API key configuration for diagnostics access.')
  }

  if (client) {
    try {
      feed = await client.fetchCastsForUser({ fid: botFid, limit: MAX_RECENT_CASTS, includeReplies: true })
    } catch (error) {
      feedError = extractHttpErrorMessage(error, 'Failed to fetch recent casts from Neynar API')
      warnings.push('Failed to retrieve recent casts. Check Neynar API quotas and connectivity.')
    }
  }

  const digests: CastDigest[] = []
  if (feed && Array.isArray((feed as any)?.casts)) {
    for (const item of (feed as any).casts) {
      const digest = buildCastDigest(item)
      if (digest) {
        digests.push(digest)
      }
    }
  }

  if (!digests.length && !feedError) {
    warnings.push('No recent casts returned for the bot. Verify scheduled jobs or manual posts are running.')
  }

  const lastCastAt = digests[0]?.timestamp ?? null
  if (lastCastAt) {
    const ageMs = Date.now() - new Date(lastCastAt).getTime()
    if (Number.isFinite(ageMs) && ageMs > 1000 * 60 * 60 * 72) {
      warnings.push('Bot has not posted in over 72 hours. Confirm routine automation is active.')
    }
  }

  const aggregates = digests.reduce(
    (acc, cast) => {
      acc.likes += cast.metrics.likes
      acc.recasts += cast.metrics.recasts
      acc.replies += cast.metrics.replies
      acc.embeds += cast.metrics.embeds
      return acc
    },
    { likes: 0, recasts: 0, replies: 0, embeds: 0 }
  )

  let interactions: InteractionsPayload | null = null
  if (client) {
    try {
      interactions = await gatherInteractions(client, botFid, user, warnings)
    } catch (error) {
      warnings.push(extractHttpErrorMessage(error, 'Failed to compile interaction insights'))
    }
  }

  const payload: ActivityPayload = {
    ok: !feedError,
    fetchedAt,
    bot: {
      fid: botFid,
      username: user?.username ?? null,
      displayName: user?.displayName ?? null,
      followerCount: user?.followerCount ?? null,
      followingCount: user?.followingCount ?? null,
      powerBadge: Boolean(user?.powerBadge),
      activeStatus: user?.activeStatus ?? null,
      lastCastAt,
      totalRecentCasts: digests.length,
      aggregates,
    },
    recentCasts: digests,
    interactions,
    warnings,
    userError,
    feedError,
  }

  return NextResponse.json(payload, { status: 200 })
})
