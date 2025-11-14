// @edit-start 2025-11-13 — Agent auto-reply engine
import { computeBotUserStats, type BotUserStats } from '@/lib/bot-stats'
import type { BotStatsConfig } from '@/lib/bot-config-types'
import { type CommunityEventType } from '@/lib/community-event-types'
import { normalizeAddress } from '@/lib/profile-data'
import { fetchUserByFid, type FarcasterUser } from '@/lib/neynar'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase-server'
import { 
  getCachedStats, 
  setCachedStats, 
  getCachedEvents, 
  setCachedEvents,
  checkRateLimit,
  getConversationContext,
  addConversationInteraction,
} from '@/lib/bot-cache'
import { detectLanguage, getTranslations } from '@/lib/bot-i18n'
import { generateQuestRecommendations, formatQuestRecommendations } from '@/lib/bot-quest-recommendations'

const CAST_CHARACTER_LIMIT = 320
const DEFAULT_STATS_WINDOW_DAYS = 7
const DEFAULT_QUEST_WINDOW_DAYS = 14
const MAX_EVENT_ROWS = 240

export type AgentIntentType =
  | 'stats'
  | 'tips'
  | 'streak'
  | 'quests'
  | 'quest-recommendations'
  | 'leaderboard'
  | 'gm'
  | 'help'
  | 'rate-limited'

export type TimeframeSpec = {
  label: string
  shortLabel: string
  since: Date
}

export type AgentAutoReplyInput = {
  fid: number | null
  text: string
  username?: string | null
  displayName?: string | null
}

export type AgentAutoReplySuccess = {
  ok: true
  intent: AgentIntentType
  text: string
  meta: Record<string, unknown>
}

export type AgentAutoReplyFailure = {
  ok: false
  reason: 'missing-fid' | 'low-score' | 'missing-wallet' | 'stats-unavailable' | 'unsupported'
  detail?: string
}

export type AgentAutoReplyResult = AgentAutoReplySuccess | AgentAutoReplyFailure

type SummarisedEvents = {
  totalDelta: number
  totalEvents: number
  lastEventAt: Date | null
}

type IntentDetection = {
  type: AgentIntentType
  timeframe: TimeframeSpec | null
}

const TIMEFRAME_PATTERNS: Array<{
  regex: RegExp
  resolve(now: Date): TimeframeSpec
}> = [
  {
    regex: /last\s+(?:24\s*hours|day)/i,
    resolve(now) {
      const since = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      return { label: 'the last 24 hours', shortLabel: 'last 24h', since }
    },
  },
  {
    regex: /yesterday/i,
    resolve(now) {
      const start = startOfUtcDay(new Date(now.getTime() - 24 * 60 * 60 * 1000))
      return { label: 'yesterday', shortLabel: 'yesterday', since: start }
    },
  },
  {
    regex: /today|right now/i,
    resolve(now) {
      const start = startOfUtcDay(now)
      return { label: 'today', shortLabel: 'today', since: start }
    },
  },
  {
    regex: /this\s+week/i,
    resolve(now) {
      const start = startOfUtcWeek(now)
      return { label: 'this week', shortLabel: 'this week', since: start }
    },
  },
  {
    regex: /last\s+week/i,
    resolve(now) {
      const start = startOfUtcWeek(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
      return { label: 'last week', shortLabel: 'last week', since: start }
    },
  },
  {
    regex: /last\s+(?:7|seven)\s+days/i,
    resolve(now) {
      const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return { label: 'the last 7 days', shortLabel: 'last 7d', since }
    },
  },
  {
    regex: /last\s+(?:30|thirty)\s+days/i,
    resolve(now) {
      const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return { label: 'the last 30 days', shortLabel: 'last 30d', since }
    },
  },
  {
    regex: /this\s+month/i,
    resolve(now) {
      const start = startOfUtcMonth(now)
      return { label: 'this month', shortLabel: 'this month', since: start }
    },
  },
  {
    regex: /last\s+month/i,
    resolve(now) {
      const currentMonthStart = startOfUtcMonth(now)
      const lastMonthStart = new Date(Date.UTC(currentMonthStart.getUTCFullYear(), currentMonthStart.getUTCMonth() - 1, 1))
      return { label: 'last month', shortLabel: 'last month', since: lastMonthStart }
    },
  },
  {
    regex: /past\s+week/i,
    resolve(now) {
      const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return { label: 'the past week', shortLabel: 'past week', since }
    },
  },
  {
    regex: /past\s+month/i,
    resolve(now) {
      const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return { label: 'the past month', shortLabel: 'past month', since }
    },
  },
]

export async function buildAgentAutoReply(input: AgentAutoReplyInput, config: BotStatsConfig): Promise<AgentAutoReplyResult> {
  const normalizedText = (input.text || '').trim()
  if (!normalizedText) {
    return { ok: false, reason: 'unsupported', detail: 'empty-text' }
  }

  if (!input.fid || !Number.isFinite(input.fid) || input.fid <= 0) {
    return { ok: false, reason: 'missing-fid' }
  }

  // 🔒 RATE LIMITING - Check if user exceeded request limit
  const rateLimit = checkRateLimit(input.fid)
  if (!rateLimit.allowed) {
    const secondsUntilReset = Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
    const minutesRemaining = Math.ceil(secondsUntilReset / 60)
    const handle = formatHandle(input.username, input.displayName)
    const rateLimitText = `gm ${handle}! 🚦 Slow down there! You've reached the limit of 5 requests per minute. Try again in ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}.`
    return { ok: true, intent: 'rate-limited', text: trimToLimit(rateLimitText), meta: { reason: 'rate-limited', resetAt: rateLimit.resetAt } }
  }

  // 🌍 LANGUAGE DETECTION
  const detectedLang = detectLanguage(normalizedText)
  const t = getTranslations(detectedLang)

  // 💬 CONVERSATION CONTEXT - Check if user has previous interactions
  const context = getConversationContext(input.fid)
  const hasContext = context && context.interactions.length > 0

  const intent = detectIntent(normalizedText)
  const handle = formatHandle(input.username, input.displayName)

  // Store interaction in context
  addConversationInteraction(input.fid, normalizedText, intent.type)

  const author = await fetchUserByFid(input.fid)
  const neynarScore = typeof author?.neynarScore === 'number' ? author.neynarScore : null
  
  // More lenient score check - allow anyone with 0.3+ score or if they have a verified wallet
  // This helps legitimate new users while still filtering spam
  const minScore = Math.max(0, config.minNeynarScore)
  const scoreMet = neynarScore != null && neynarScore >= Math.min(minScore, 0.3)
  
  if (!scoreMet) {
    // For low score, provide helpful message instead of silent failure
    const helpText = `${t.greeting} ${handle}! 👋 ${t.needHigherScore} Current: ${neynarScore?.toFixed(2) ?? 'unknown'}`
    return { ok: true, intent: 'help', text: trimToLimit(helpText), meta: { reason: 'low-score', neynarScore, minRequired: minScore, lang: detectedLang } }
  }

  const address = resolveAddress(author)
  
  // If no wallet, provide helpful guidance without blocking the response
  if (!address) {
    const text = trimToLimit(`${t.greeting} ${handle}! 👋 ${t.linkWallet}`)
    return { ok: true, intent: 'help', text, meta: { reason: 'missing-wallet', handle, fid: input.fid, lang: detectedLang } }
  }

  // ⚡ CACHED STATS - Try cache first for faster response
  let stats: BotUserStats | null = getCachedStats(address) ?? null
  
  if (stats === null) {
    // Cache miss - fetch from DB
    try {
      stats = await computeStats(address)
      // Cache the result
      if (stats) {
        setCachedStats(address, stats)
      }
    } catch (err) {
      console.warn('[agent-auto-reply] Failed to compute stats:', err)
    }
  }
  
  if (!stats) {
    // Provide helpful response even without stats
    const text = trimToLimit(`${t.greeting} ${handle}! 🔄 ${t.syncingStats}`)
    return { ok: true, intent: 'help', text, meta: { reason: 'stats-unavailable', handle, fid: input.fid, address, lang: detectedLang } }
  }

  const summaryMeta: Record<string, unknown> = {
    fid: input.fid,
    handle,
    intent: intent.type,
    timeframe: intent.timeframe?.shortLabel ?? null,
    neynarScore,
    address,
    minNeynarScore: config.minNeynarScore,
    lang: detectedLang,
    hasContext,
    cachedResponse: getCachedStats(address) !== undefined,
  }

  let replyText: string | null = null
  switch (intent.type) {
    case 'tips': {
      const timeframe = intent.timeframe ?? buildDefaultTimeframe(DEFAULT_STATS_WINDOW_DAYS, 'the last 7 days', 'last 7d')
      const summary = await summariseUserEvents({ fid: input.fid, address, eventTypes: ['tip'], since: timeframe.since })
      summaryMeta.events = summary
      replyText = buildTipsMessage(handle, stats, timeframe, summary)
      break
    }
    case 'streak': {
      replyText = buildStreakMessage(handle, stats)
      break
    }
    case 'quests': {
      const timeframe = intent.timeframe ?? buildDefaultTimeframe(DEFAULT_QUEST_WINDOW_DAYS, 'the last 14 days', 'last 14d')
      const summary = await summariseUserEvents({ fid: input.fid, address, eventTypes: ['quest-verify'], since: timeframe.since })
      summaryMeta.events = summary
      replyText = buildQuestMessage(handle, stats, timeframe, summary)
      break
    }
    case 'quest-recommendations': {
      // 🎯 SMART QUEST RECOMMENDATIONS
      const recommendations = await generateQuestRecommendations(address, 3)
      summaryMeta.recommendations = recommendations
      replyText = `${t.greeting} ${handle}! ${formatQuestRecommendations(recommendations)}`
      break
    }
    case 'leaderboard': {
      const timeframe = intent.timeframe ?? buildDefaultTimeframe(DEFAULT_STATS_WINDOW_DAYS, 'the last 7 days', 'last 7d')
      const summary = await summariseUserEvents({ fid: input.fid, address, eventTypes: ['gm', 'quest-verify', 'tip', 'stake', 'unstake'], since: timeframe.since })
      summaryMeta.events = summary
      replyText = buildLeaderboardMessage(handle, stats, timeframe, summary)
      break
    }
    case 'gm': {
      const timeframe = buildDefaultTimeframe(DEFAULT_STATS_WINDOW_DAYS, 'the last 7 days', 'last 7d')
      const summary = await summariseUserEvents({ fid: input.fid, address, eventTypes: ['gm'], since: timeframe.since })
      summaryMeta.events = summary
      replyText = buildGreetingMessage(handle, stats, summary)
      break
    }
    case 'help': {
      replyText = buildHelpMessage(handle)
      break
    }
    case 'stats':
    default: {
      const timeframe = intent.timeframe ?? buildDefaultTimeframe(DEFAULT_STATS_WINDOW_DAYS, 'the last 7 days', 'last 7d')
      const summary = await summariseUserEvents({ fid: input.fid, address, eventTypes: ['gm', 'quest-verify', 'tip', 'stake', 'unstake'], since: timeframe.since })
      summaryMeta.events = summary
      replyText = buildStatsMessage(handle, stats, timeframe, summary)
      break
    }
  }

  if (!replyText) {
    return { ok: false, reason: 'unsupported', detail: 'empty-reply' }
  }

  return {
    ok: true,
    intent: intent.type,
    text: trimToLimit(replyText),
    meta: summaryMeta,
  }
}

function detectIntent(text: string): IntentDetection {
  const lower = text.toLowerCase()
  const timeframe = parseTimeframe(lower)

  // Help/Command patterns - check first for explicit help requests
  if (
    /\bhelp\b/.test(lower) || 
    /what\s+can\s+you\s+(do|tell|show)/.test(lower) ||
    /how\s+(do|can)\s+i\s+use/.test(lower) ||
    /\bcommands?\b/.test(lower)
  ) {
    return { type: 'help', timeframe }
  }

  // Tips patterns - broader matching
  if (
    /\btips?\b/.test(lower) || 
    /\bboosts?\b/.test(lower) || 
    /\bgrants?\b/.test(lower) ||
    /\brewards?\b/.test(lower) ||
    /\bearned?\b/.test(lower) ||
    /\breceived?\b/.test(lower)
  ) {
    return { type: 'tips', timeframe }
  }

  // Streak patterns
  if (
    /\bstreak\b/.test(lower) || 
    /good\s+morning/.test(lower) ||
    /\bgm\s+(count|days)/.test(lower) ||
    /how\s+many\s+days/.test(lower)
  ) {
    return { type: 'streak', timeframe }
  }

  // Quest patterns - split into recommendations vs status
  if (
    /\brecommend(ed)?\s+quests?\b/.test(lower) ||
    /\bsuggest(ed)?\s+quests?\b/.test(lower) ||
    /what\s+quests?\s+(should|can)\s+i\s+(do|try)/.test(lower) ||
    /\bbest\s+quests?\b/.test(lower) ||
    /\bquests?\s+for\s+me\b/.test(lower)
  ) {
    return { type: 'quest-recommendations', timeframe }
  }

  if (
    /\bquests?\b/.test(lower) || 
    /\bmissions?\b/.test(lower) ||
    /\bcompleted?\b/.test(lower) ||
    /\btasks?\b/.test(lower)
  ) {
    return { type: 'quests', timeframe }
  }

  // Leaderboard/Rank patterns
  if (
    /\bleaderboards?\b/.test(lower) || 
    /\branks?\b/.test(lower) ||
    /\bpositions?\b/.test(lower) ||
    /\bstanding\b/.test(lower) ||
    /where\s+(am\s+i|do\s+i\s+stand)/.test(lower)
  ) {
    return { type: 'leaderboard', timeframe }
  }

  // Stats/XP patterns - most specific stats keywords
  if (
    /\bxp\b/.test(lower) || 
    /\bpoints?\b/.test(lower) || 
    /\blevel\b/.test(lower) || 
    /\bscore\b/.test(lower) ||
    /\bstats?\b/.test(lower) ||
    /\bprogress\b/.test(lower) ||
    /\binsights?\b/.test(lower) ||
    /\bdashboard\b/.test(lower) ||
    /how\s+(am\s+i|\'m\s+i)\s+doing/.test(lower)
  ) {
    return { type: 'stats', timeframe }
  }

  // GM pattern - simple greeting
  if (/\bgm\b/.test(lower) || /\bgood\s+morning\b/.test(lower)) {
    return { type: 'gm', timeframe }
  }

  // Default to stats for any other query
  return { type: 'stats', timeframe }
}

function parseTimeframe(text: string): TimeframeSpec | null {
  const now = new Date()
  for (const pattern of TIMEFRAME_PATTERNS) {
    if (pattern.regex.test(text)) {
      return pattern.resolve(now)
    }
  }
  return null
}

function buildDefaultTimeframe(days: number, label: string, shortLabel: string): TimeframeSpec {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return { label, shortLabel, since }
}

async function computeStats(address: `0x${string}`): Promise<BotUserStats | null> {
  try {
    return await computeBotUserStats(address)
  } catch (error) {
    console.warn('[agent-auto-reply] compute stats failed', (error as Error)?.message || error)
    return null
  }
}

function resolveAddress(author: FarcasterUser | null): `0x${string}` | null {
  if (!author) return null
  const verified = Array.isArray(author.verifications)
    ? author.verifications
        .map((value) => normalizeAddress(value))
        .find((value): value is `0x${string}` => Boolean(value))
    : null

  if (verified) return verified

  const custody = normalizeAddress(author.custodyAddress || author.walletAddress)
  return custody ?? null
}

async function summariseUserEvents(options: {
  fid: number
  address: `0x${string}`
  eventTypes: CommunityEventType[]
  since: Date
}): Promise<SummarisedEvents> {
  if (!isSupabaseConfigured()) {
    return { totalDelta: 0, totalEvents: 0, lastEventAt: null }
  }

  // ⚡ CHECK CACHE FIRST
  const cachedResult = getCachedEvents(options.fid, options.address, options.eventTypes, options.since.getTime())
  if (cachedResult !== undefined) {
    return cachedResult
  }

  const client = getSupabaseServerClient()
  if (!client) {
    return { totalDelta: 0, totalEvents: 0, lastEventAt: null }
  }

  try {
    let query = client
      .from('gmeow_rank_events')
      .select('delta,created_at', { count: 'exact' })
      .eq('fid', options.fid)
      .eq('wallet_address', options.address)
      .gte('created_at', options.since.toISOString())
      .order('created_at', { ascending: false })
      .limit(MAX_EVENT_ROWS)

    if (options.eventTypes.length) {
      query = query.in('event_type', options.eventTypes as unknown as string[])
    }

    const { data, count, error } = await query

    if (error) {
      console.warn('[agent-auto-reply] summarise query failed', error.message)
      return { totalDelta: 0, totalEvents: 0, lastEventAt: null }
    }

    const rows = Array.isArray(data) ? data : []
    let totalDelta = 0
    let lastEventAt: Date | null = null

    for (const row of rows) {
      const delta = Number((row as any)?.delta ?? 0)
      if (Number.isFinite(delta)) totalDelta += delta
      const createdAtIso = typeof (row as any)?.created_at === 'string' ? (row as any).created_at : null
      if (createdAtIso) {
        const createdAt = new Date(createdAtIso)
        if (!lastEventAt || createdAt > lastEventAt) {
          lastEventAt = createdAt
        }
      }
    }

    const result = {
      totalDelta,
      totalEvents: typeof count === 'number' && Number.isFinite(count) ? count : rows.length,
      lastEventAt,
    }

    // ⚡ CACHE THE RESULT
    setCachedEvents(options.fid, options.address, options.eventTypes, options.since.getTime(), result)

    return result
  } catch (error) {
    console.warn('[agent-auto-reply] summarise events failed', (error as Error)?.message || error)
    return { totalDelta: 0, totalEvents: 0, lastEventAt: null }
  }
}

function buildStatsMessage(handle: string, stats: BotUserStats, timeframe: TimeframeSpec, summary: SummarisedEvents): string {
  const deltaLabel = summary.totalDelta > 0 ? ` +${formatPoints(summary.totalDelta)} pts ${timeframe.shortLabel}.` : ''
  const streakLabel = stats.streak > 0 ? ` Streak ${stats.streak}d.` : ''
  const lastGmLabel = stats.lastGM ? ` Last GM ${formatRelativeTime(stats.lastGM)}.` : ''
  const core = `gm ${handle} 🐾 Level ${stats.level} ${stats.tierName} on deck with ${formatPoints(stats.totalPoints)} pts.${deltaLabel}${streakLabel}${lastGmLabel}`
  return `${core} Profile → https://gmeowhq.art/profile`
}

function buildTipsMessage(handle: string, stats: BotUserStats, timeframe: TimeframeSpec, summary: SummarisedEvents): string {
  const windowPoints = summary.totalDelta > 0 ? formatPoints(summary.totalDelta) : '0'
  const windowEvents = summary.totalEvents > 0 ? ` across ${summary.totalEvents} boosts` : ''
  const allTime = stats.tipsAll != null ? formatPoints(stats.tipsAll) : '—'
  const body = `gm ${handle}! Tips ${timeframe.shortLabel}: ${windowPoints} pts${windowEvents}. All-time tips ${allTime} pts.`
  return `${body} Leaderboard → https://gmeowhq.art/leaderboard`
}

function buildStreakMessage(handle: string, stats: BotUserStats): string {
  if (stats.streak <= 0) {
    return `gm ${handle}! No streak detected yet, but your ledger shows ${formatPoints(stats.totalPoints)} pts. Log a GM to ignite it → https://gmeowhq.art/Quest`
  }

  const lastGm = stats.lastGM ? ` Last GM ${formatRelativeTime(stats.lastGM)}.` : ''
  return `gm ${handle}! ${stats.streak}-day streak active with ${formatPoints(stats.totalPoints)} pts.${lastGm} Keep it rolling → https://gmeowhq.art/Quest`
}

function buildQuestMessage(handle: string, stats: BotUserStats, timeframe: TimeframeSpec, summary: SummarisedEvents): string {
  const completions = summary.totalEvents > 0
    ? `${summary.totalEvents} verified quests ${timeframe.shortLabel}`
    : 'No verified quests in this window'
  const delta = summary.totalDelta > 0 ? ` worth ${formatPoints(summary.totalDelta)} pts` : ''
  const tier = `Level ${stats.level} ${stats.tierName}`
  return `gm ${handle}! ${completions}${delta}. ${tier} is ready for the next contract → https://gmeowhq.art/Quest`
}

function buildLeaderboardMessage(handle: string, stats: BotUserStats, timeframe: TimeframeSpec, summary: SummarisedEvents): string {
  const delta = summary.totalDelta > 0 ? ` +${formatPoints(summary.totalDelta)} pts ${timeframe.shortLabel}` : ''
  return `gm ${handle}! ${stats.tierName} shell with ${formatPoints(stats.totalPoints)} pts.${delta} Scope your rank → https://gmeowhq.art/leaderboard`
}

function buildGreetingMessage(handle: string, stats: BotUserStats, summary: SummarisedEvents): string {
  const gmCount = summary.totalEvents > 0 ? `${summary.totalEvents} GMs logged this week` : 'Let’s log your next GM'
  return `gm ${handle}! ${gmCount}. Ledger: ${formatPoints(stats.totalPoints)} pts. Dive in → https://gmeowhq.art/Quest`
}

function buildHelpMessage(handle: string): string {
  return `gm ${handle}! Ask things like "how many tips this week?", "what's my streak?", or "show my XP" and I'll pull the receipts. Command deck → https://gmeowhq.art/Agent`
}

function formatHandle(username?: string | null, displayName?: string | null): string {
  if (username && username.trim().length > 0) {
    const trimmed = username.trim().replace(/^@+/, '')
    return `@${trimmed}`
  }

  if (displayName && displayName.trim().length > 0) {
    return displayName.trim()
  }

  return 'friend'
}

function trimToLimit(message: string): string {
  if (message.length <= CAST_CHARACTER_LIMIT) return message
  return `${message.slice(0, CAST_CHARACTER_LIMIT - 1)}…`
}

function formatPoints(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '0'
  return Math.round(value).toLocaleString('en-US')
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diffMs = Math.max(0, now - timestamp)
  const minutes = Math.floor(diffMs / (60 * 1000))

  if (minutes < 1) return 'just now'
  if (minutes === 1) return '1 min ago'
  if (minutes < 60) return `${minutes} mins ago`

  const hours = Math.floor(minutes / 60)
  if (hours === 1) return '1 hour ago'
  if (hours < 24) return `${hours} hours ago`

  const days = Math.floor(hours / 24)
  if (days === 1) return '1 day ago'
  if (days < 7) return `${days} days ago`

  const weeks = Math.floor(days / 7)
  if (weeks === 1) return '1 week ago'
  return `${weeks} weeks ago`
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0))
}

function startOfUtcWeek(date: Date): Date {
  const dayIndex = date.getUTCDay() || 7
  const start = new Date(date.getTime() - (dayIndex - 1) * 24 * 60 * 60 * 1000)
  return startOfUtcDay(start)
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0))
}
// @edit-end
