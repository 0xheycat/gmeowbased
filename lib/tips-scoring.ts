const MS_PER_MINUTE = 60_000
const WINDOW_MS = 24 * 60 * 60 * 1000

export type TipMentionKind = 'direct_mention' | 'reply_mention' | 'keyword_signal'

export interface TipScoringConfig {
  basePoints: number
  directMentionMultiplier: number
  replyMentionMultiplier: number
  keywordMentionMultiplier: number
  mentionCooldownMinutes: number
  actorCooldownMinutes: number
  actorDailyCap: number
  globalDailyCap: number
}

export const DEFAULT_TIP_SCORING_CONFIG: TipScoringConfig = {
  basePoints: 25,
  directMentionMultiplier: 1,
  replyMentionMultiplier: 1.5,
  keywordMentionMultiplier: 0.6,
  mentionCooldownMinutes: 2,
  actorCooldownMinutes: 10,
  actorDailyCap: 250,
  globalDailyCap: 5_000,
}

export type TipScoringOutcomeReason =
  | 'awarded'
  | 'cooldown_global'
  | 'cooldown_actor'
  | 'actor_cap'
  | 'global_cap'

export interface TipMentionEvent {
  id: string
  type: TipMentionKind
  actorId?: string | number | null
  timestamp: number
  intensity?: number
}

export interface TipScoringOutcome {
  awardedPoints: number
  suppressed: boolean
  reason: TipScoringOutcomeReason
  multiplier: number
  actorId: string
  nextEligibleAt: number | null
  globalPoints24h: number
  actorPoints24h: number
}

export interface TipScoringAwardEvent {
  id: string
  timestamp: number
  points: number
  type: TipMentionKind
}

export interface TipScoringHistory {
  global: TipScoringAwardEvent[]
  actors: Record<string, TipScoringAwardEvent[]>
}

export function createEmptyTipHistory(): TipScoringHistory {
  return {
    global: [],
    actors: {},
  }
}

function pruneAwards(events: TipScoringAwardEvent[], now: number, windowMs: number): TipScoringAwardEvent[] {
  if (!events.length) return events
  const cutoff = now - windowMs
  if (events[events.length - 1]?.timestamp >= cutoff) {
    const next = events.filter((entry) => entry.timestamp >= cutoff)
    return next
  }
  return []
}

function sumPoints(events: TipScoringAwardEvent[]): number {
  let total = 0
  for (const entry of events) {
    total += entry.points
  }
  return total
}

function resolveMultiplier(event: TipMentionEvent, config: TipScoringConfig): number {
  const intensity = typeof event.intensity === 'number' && event.intensity > 0 ? event.intensity : 1
  switch (event.type) {
    case 'direct_mention':
      return config.directMentionMultiplier * intensity
    case 'reply_mention':
      return config.replyMentionMultiplier * intensity
    case 'keyword_signal':
    default:
      return config.keywordMentionMultiplier * intensity
  }
}

function earliestExpiry(events: TipScoringAwardEvent[]): number | null {
  if (!events.length) return null
  let min = events[0].timestamp
  for (const entry of events) {
    if (entry.timestamp < min) min = entry.timestamp
  }
  return min + WINDOW_MS
}

export function scoreMentionEvent(
  event: TipMentionEvent,
  history: TipScoringHistory,
  config: TipScoringConfig
): TipScoringOutcome {
  const actorKey = event.actorId != null ? String(event.actorId) : 'anonymous'
  const now = event.timestamp
  const globalCooldownMs = Math.max(0, config.mentionCooldownMinutes) * MS_PER_MINUTE
  const actorCooldownMs = Math.max(0, config.actorCooldownMinutes) * MS_PER_MINUTE

  history.global = pruneAwards(history.global, now, WINDOW_MS)
  const actorAwards = history.actors[actorKey]
  if (actorAwards) {
    history.actors[actorKey] = pruneAwards(actorAwards, now, WINDOW_MS)
  }
  const scopedActorAwards = history.actors[actorKey] ?? []

  const lastGlobal = history.global.at(-1)
  if (globalCooldownMs > 0 && lastGlobal && now - lastGlobal.timestamp < globalCooldownMs) {
    return {
      awardedPoints: 0,
      suppressed: true,
      reason: 'cooldown_global',
      multiplier: resolveMultiplier(event, config),
      actorId: actorKey,
      nextEligibleAt: lastGlobal.timestamp + globalCooldownMs,
      globalPoints24h: sumPoints(history.global),
      actorPoints24h: sumPoints(scopedActorAwards),
    }
  }

  const lastActor = scopedActorAwards.at(-1)
  if (actorCooldownMs > 0 && lastActor && now - lastActor.timestamp < actorCooldownMs) {
    return {
      awardedPoints: 0,
      suppressed: true,
      reason: 'cooldown_actor',
      multiplier: resolveMultiplier(event, config),
      actorId: actorKey,
      nextEligibleAt: lastActor.timestamp + actorCooldownMs,
      globalPoints24h: sumPoints(history.global),
      actorPoints24h: sumPoints(scopedActorAwards),
    }
  }

  const globalPoints = sumPoints(history.global)
  if (config.globalDailyCap > 0 && globalPoints >= config.globalDailyCap) {
    return {
      awardedPoints: 0,
      suppressed: true,
      reason: 'global_cap',
      multiplier: resolveMultiplier(event, config),
      actorId: actorKey,
      nextEligibleAt: earliestExpiry(history.global),
      globalPoints24h: globalPoints,
      actorPoints24h: sumPoints(scopedActorAwards),
    }
  }

  const actorPoints = sumPoints(scopedActorAwards)
  if (config.actorDailyCap > 0 && actorPoints >= config.actorDailyCap) {
    return {
      awardedPoints: 0,
      suppressed: true,
      reason: 'actor_cap',
      multiplier: resolveMultiplier(event, config),
      actorId: actorKey,
      nextEligibleAt: earliestExpiry(scopedActorAwards),
      globalPoints24h: globalPoints,
      actorPoints24h: actorPoints,
    }
  }

  const multiplier = resolveMultiplier(event, config)
  const basePoints = Math.max(0, config.basePoints)
  const rawPoints = Math.round(basePoints * multiplier)
  const awardedPoints = Number.isFinite(rawPoints) ? rawPoints : 0

  const awardEvent: TipScoringAwardEvent = {
    id: event.id,
    timestamp: now,
    points: awardedPoints,
    type: event.type,
  }

  history.global.push(awardEvent)
  if (!history.actors[actorKey]) {
    history.actors[actorKey] = []
  }
  history.actors[actorKey]!.push(awardEvent)

  return {
    awardedPoints,
    suppressed: false,
    reason: 'awarded',
    multiplier,
    actorId: actorKey,
    nextEligibleAt: null,
    globalPoints24h: sumPoints(history.global),
    actorPoints24h: sumPoints(history.actors[actorKey]!),
  }
}

export interface TipScoreSimulationResult {
  totalAwarded: number
  suppressedCount: number
  timeline: Array<{ event: TipMentionEvent; outcome: TipScoringOutcome }>
}

export function simulateMentionSeries(
  events: TipMentionEvent[],
  config: TipScoringConfig
): TipScoreSimulationResult {
  const history = createEmptyTipHistory()
  const timeline = events.map((event) => ({
    event,
    outcome: scoreMentionEvent(event, history, config),
  }))
  const totalAwarded = timeline.reduce((sum, step) => sum + step.outcome.awardedPoints, 0)
  const suppressedCount = timeline.reduce((sum, step) => sum + (step.outcome.suppressed ? 1 : 0), 0)
  return {
    totalAwarded,
    suppressedCount,
    timeline,
  }
}
