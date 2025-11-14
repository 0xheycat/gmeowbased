import {
  DEFAULT_TIP_SCORING_CONFIG,
  createEmptyTipHistory,
  scoreMentionEvent,
  type TipMentionEvent,
  type TipMentionKind,
  type TipScoringConfig,
  type TipScoringHistory,
  type TipScoringOutcome,
  type TipScoringOutcomeReason,
  type TipScoringAwardEvent,
} from './tips-scoring'
import type {
  MutableTipBroadcast,
  TipMentionContext,
  TipMentionRecentEvent,
  TipMentionScoreboardEntry,
  TipMentionSummary,
} from './tips-types'

const WINDOW_MS = 24 * 60 * 60 * 1000
const MS_PER_MINUTE = 60_000

interface MentionTimelineEntry {
  id: string
  timestamp: number
  type: TipMentionKind
  actorId: string
  actorLabel: string
  outcome: TipScoringOutcome
  message?: string
  source?: string
}

let cachedConfig: TipScoringConfig | null = null
let configLoaded = false
let history: TipScoringHistory = createEmptyTipHistory()
let timeline: MentionTimelineEntry[] = []
const actorLabels = new Map<string, { label: string; updatedAt: number }>()

function sanitiseNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function sanitiseConfig(input: Partial<TipScoringConfig> | null | undefined): TipScoringConfig {
  const base = DEFAULT_TIP_SCORING_CONFIG
  if (!input) return { ...base }
  return {
    basePoints: Math.max(0, Math.round(sanitiseNumber(input.basePoints, base.basePoints))),
    directMentionMultiplier: Math.max(0, sanitiseNumber(input.directMentionMultiplier, base.directMentionMultiplier)),
    replyMentionMultiplier: Math.max(0, sanitiseNumber(input.replyMentionMultiplier, base.replyMentionMultiplier)),
    keywordMentionMultiplier: Math.max(0, sanitiseNumber(input.keywordMentionMultiplier, base.keywordMentionMultiplier)),
    mentionCooldownMinutes: Math.max(0, sanitiseNumber(input.mentionCooldownMinutes, base.mentionCooldownMinutes)),
    actorCooldownMinutes: Math.max(0, sanitiseNumber(input.actorCooldownMinutes, base.actorCooldownMinutes)),
    actorDailyCap: Math.max(0, Math.round(sanitiseNumber(input.actorDailyCap, base.actorDailyCap))),
    globalDailyCap: Math.max(0, Math.round(sanitiseNumber(input.globalDailyCap, base.globalDailyCap))),
  }
}

function loadConfigFromEnv(): TipScoringConfig | null {
  const raw = process.env.TIP_SCORING_CONFIG
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<TipScoringConfig>
    return sanitiseConfig(parsed)
  } catch (error) {
    console.warn('Failed to parse TIP_SCORING_CONFIG. Using defaults instead.', error)
    return null
  }
}

function getActiveConfig(): TipScoringConfig {
  if (!configLoaded || !cachedConfig) {
    cachedConfig = loadConfigFromEnv() ?? { ...DEFAULT_TIP_SCORING_CONFIG }
    configLoaded = true
  }
  return cachedConfig
}

function shortAddress(address: string | undefined): string {
  const value = (address || '').trim()
  if (!value) return 'anon'
  if (value.length <= 10) return value
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

function deriveActorId(event: MutableTipBroadcast, override: TipMentionContext['actorId']): string {
  if (override != null && override !== '') return String(override)
  if (typeof event.fromFid === 'number' && Number.isFinite(event.fromFid)) return `fid:${event.fromFid}`
  if (event.fromAddress) return `addr:${event.fromAddress.toLowerCase()}`
  if (typeof event.fromUsername === 'string' && event.fromUsername.trim())
    return `user:${event.fromUsername.trim().toLowerCase()}`
  if (typeof event.toFid === 'number' && Number.isFinite(event.toFid)) return `target:${event.toFid}`
  return `anon:${event.id}`
}

function deriveActorLabel(event: MutableTipBroadcast, context: TipMentionContext): string {
  const fromContext = typeof context.actorLabel === 'string' ? context.actorLabel.trim() : ''
  if (fromContext) return fromContext
  if (event.fromDisplay && event.fromDisplay.trim()) return event.fromDisplay.trim()
  if (event.fromUsername && event.fromUsername.trim()) return `@${event.fromUsername.replace(/^@/, '').trim()}`
  if (typeof event.fromFid === 'number' && Number.isFinite(event.fromFid)) return `fid:${event.fromFid}`
  if (event.fromAddress) return shortAddress(event.fromAddress)
  if (event.toUsername && event.toUsername.trim()) return `@${event.toUsername.replace(/^@/, '').trim()}`
  if (typeof event.toFid === 'number' && Number.isFinite(event.toFid)) return `fid:${event.toFid}`
  return 'Someone'
}

function normaliseMentionKind(input: TipMentionContext['type'] | TipMentionKind | undefined): TipMentionKind {
  const raw = typeof input === 'string' ? input.trim().toLowerCase() : ''
  switch (raw) {
    case 'direct':
    case 'direct-mention':
    case 'direct mention':
    case 'direct_mention':
      return 'direct_mention'
    case 'reply':
    case 'reply-mention':
    case 'reply mention':
    case 'reply_mention':
      return 'reply_mention'
    case 'keyword':
    case 'signal':
    case 'keyword-signal':
    case 'keyword signal':
    case 'keyword_signal':
      return 'keyword_signal'
    default:
      return 'keyword_signal'
  }
}

function normaliseIntensity(value: TipMentionContext['intensity'] | number | undefined): number | undefined {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return undefined
    return value > 0 ? value : undefined
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return undefined
}

function normaliseSource(value: TipMentionContext['source'] | string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}

function pruneTimeline(now: number) {
  if (!timeline.length) return
  const cutoff = now - WINDOW_MS
  if (timeline[timeline.length - 1]?.timestamp >= cutoff) {
    timeline = timeline.filter((entry) => entry.timestamp >= cutoff)
  } else {
    timeline = []
  }
}

function findLatestTimelineEntry(actorId: string): MentionTimelineEntry | null {
  for (let i = timeline.length - 1; i >= 0; i -= 1) {
    const entry = timeline[i]
    if (entry.actorId === actorId) return entry
  }
  return null
}

function lookupActorLabel(actorId: string): string {
  const meta = actorLabels.get(actorId)
  if (meta?.label) return meta.label
  const recent = findLatestTimelineEntry(actorId)
  if (recent) return recent.actorLabel
  return actorId
}

function sumAwardPoints(events: TipScoringAwardEvent[]): number {
  let total = 0
  for (const entry of events) total += entry.points
  return total
}

function earliestExpiry(events: TipScoringAwardEvent[]): number | null {
  if (!events.length) return null
  let min = events[0].timestamp
  for (const entry of events) {
    if (entry.timestamp < min) min = entry.timestamp
  }
  return min + WINDOW_MS
}

function computeGlobalCapResetsAt(config: TipScoringConfig): number | null {
  const awards = history.global
  if (!awards.length) return null
  if (config.globalDailyCap <= 0) return null
  const total = sumAwardPoints(awards)
  if (total < config.globalDailyCap) return null
  return earliestExpiry(awards)
}

function buildActorStats(now: number): TipMentionScoreboardEntry[] {
  const mentionStats = new Map<
    string,
    {
      mentions: number
      suppressed: number
      lastMentionAt: number | null
      lastReason?: TipScoringOutcomeReason
      nextEligibleAt: number | null
    }
  >()

  for (const entry of timeline) {
    const current = mentionStats.get(entry.actorId) ?? {
      mentions: 0,
      suppressed: 0,
      lastMentionAt: null,
      lastReason: undefined,
      nextEligibleAt: null,
    }
    current.mentions += 1
    if (entry.outcome.suppressed) current.suppressed += 1
    current.lastMentionAt = entry.timestamp
    current.lastReason = entry.outcome.reason
    current.nextEligibleAt = entry.outcome.nextEligibleAt ?? null
    mentionStats.set(entry.actorId, current)
  }

  const results: TipMentionScoreboardEntry[] = []
  const actorIds = new Set<string>()

  for (const [actorId, awards] of Object.entries(history.actors)) {
    if (!awards.length) continue
    const points = sumAwardPoints(awards)
    const lastAwardAt = awards.at(-1)?.timestamp ?? null
    const stats = mentionStats.get(actorId) ?? {
      mentions: awards.length,
      suppressed: 0,
      lastMentionAt: lastAwardAt,
      lastReason: undefined,
      nextEligibleAt: null,
    }
    actorIds.add(actorId)
    results.push({
      actorId,
      actorLabel: lookupActorLabel(actorId),
      points24h: points,
      awards24h: awards.length,
      mentions24h: stats.mentions,
      suppressed24h: stats.suppressed,
      lastAwardAt,
      lastMentionAt: stats.lastMentionAt,
      nextEligibleAt: stats.nextEligibleAt,
      lastReason: stats.lastReason,
    })
  }

  for (const [actorId, stats] of mentionStats.entries()) {
    if (actorIds.has(actorId)) continue
    results.push({
      actorId,
      actorLabel: lookupActorLabel(actorId),
      points24h: 0,
      awards24h: 0,
      mentions24h: stats.mentions,
      suppressed24h: stats.suppressed,
      lastAwardAt: null,
      lastMentionAt: stats.lastMentionAt,
      nextEligibleAt: stats.nextEligibleAt,
      lastReason: stats.lastReason,
    })
  }

  results.sort((a, b) => {
    if (b.points24h !== a.points24h) return b.points24h - a.points24h
    if (b.awards24h !== a.awards24h) return b.awards24h - a.awards24h
    const lastA = a.lastMentionAt ?? 0
    const lastB = b.lastMentionAt ?? 0
    return lastB - lastA
  })

  return results
}

function buildRecentEvents(limit: number): TipMentionRecentEvent[] {
  if (!timeline.length) return []
  const recent = timeline.slice(-limit).reverse()
  return recent.map((entry) => ({
    id: entry.id,
    timestamp: entry.timestamp,
    type: entry.type,
    actorId: entry.actorId,
    actorLabel: entry.actorLabel,
    points: entry.outcome.awardedPoints,
    suppressed: entry.outcome.suppressed,
    reason: entry.outcome.reason,
    multiplier: entry.outcome.multiplier,
    message: entry.message,
    source: entry.source,
    nextEligibleAt: entry.outcome.nextEligibleAt ?? null,
  }))
}

function ensureCreatedAt(event: MutableTipBroadcast): number {
  const timestamp = typeof event.createdAt === 'number' ? event.createdAt : Date.now()
  if (!Number.isFinite(timestamp)) {
    const now = Date.now()
    event.createdAt = now
    return now
  }
  return timestamp
}

export function scoreTipMentionBroadcast(
  event: MutableTipBroadcast,
  context: TipMentionContext = {}
): TipScoringOutcome | null {
  const kind = event.kind ?? 'tip'
  if (kind !== 'mention') return null

  const timestamp = ensureCreatedAt(event)
  const config = getActiveConfig()
  const type = normaliseMentionKind(context.type ?? event.mentionType)
  const intensity = normaliseIntensity(context.intensity ?? event.mentionIntensity)
  const actorId = deriveActorId(event, context.actorId)
  const actorLabel = deriveActorLabel(event, context)
  const source = normaliseSource(context.source ?? event.mentionSource)

  const scoringEvent: TipMentionEvent = {
    id: event.id,
    type,
    actorId,
    timestamp,
    intensity,
  }

  const outcome = scoreMentionEvent(scoringEvent, history, config)

  event.points = outcome.awardedPoints
  event.scoring = outcome
  event.mentionType = type
  event.mentionIntensity = intensity
  event.mentionActorId = outcome.actorId
  event.mentionActorLabel = actorLabel
  event.mentionSource = source
  event.mentionSuppressed = outcome.suppressed
  event.mentionReason = outcome.reason

  actorLabels.set(outcome.actorId, { label: actorLabel, updatedAt: timestamp })
  timeline.push({
    id: event.id,
    timestamp,
    type,
    actorId: outcome.actorId,
    actorLabel,
    outcome,
    message: typeof event.message === 'string' ? event.message : undefined,
    source,
  })
  pruneTimeline(timestamp)

  return outcome
}

export function getTipMentionSummary(): TipMentionSummary {
  const now = Date.now()
  pruneTimeline(now)

  const config = getActiveConfig()
  const globalAwards = history.global
  const points24h = sumAwardPoints(globalAwards)
  const mentions24h = timeline.length
  let suppressed24h = 0
  for (const entry of timeline) {
    if (entry.outcome.suppressed) suppressed24h += 1
  }
  const awarded24h = mentions24h - suppressed24h

  const topActors = buildActorStats(now).slice(0, 5)
  const recent = buildRecentEvents(10)

  const mentionCooldownMs = Math.max(0, config.mentionCooldownMinutes) * MS_PER_MINUTE
  const actorCooldownMinutes = Math.max(0, config.actorCooldownMinutes)
  const mentionCooldownMinutes = Math.max(0, config.mentionCooldownMinutes)
  const actorDailyCap = Math.max(0, config.actorDailyCap)
  const globalDailyCap = Math.max(0, config.globalDailyCap)

  let nextGlobalEligibleAt: number | null = null
  if (globalDailyCap > 0 && points24h >= globalDailyCap) {
    nextGlobalEligibleAt = computeGlobalCapResetsAt(config)
  } else if (mentionCooldownMs > 0) {
    const lastAward = globalAwards.at(-1)
    if (lastAward) nextGlobalEligibleAt = lastAward.timestamp + mentionCooldownMs
  }

  const globalCapResetsAt = globalDailyCap > 0 ? computeGlobalCapResetsAt(config) : null
  const globalCapRemaining = globalDailyCap > 0 ? Math.max(0, globalDailyCap - points24h) : null

  return {
    generatedAt: now,
    totals: {
      mentions24h,
      awarded24h,
      suppressed24h,
      points24h,
    },
    limits: {
      mentionCooldownMinutes,
      actorCooldownMinutes,
      actorDailyCap,
      globalDailyCap,
      globalCapRemaining,
      nextGlobalEligibleAt,
      globalCapResetsAt,
    },
    topActors,
    recent,
    config: { ...config },
  }
}

export function setTipScoringConfig(config: TipScoringConfig | null) {
  if (config) {
    cachedConfig = sanitiseConfig(config)
    configLoaded = true
  } else {
    cachedConfig = null
    configLoaded = false
  }
}

export function resetTipScoreboardState() {
  history = createEmptyTipHistory()
  timeline = []
  actorLabels.clear()
}
