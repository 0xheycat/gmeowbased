// @edit-start 2025-11-12 — Shared bot stats configuration types
export type BotStatsConfig = {
  mentionMatchers: string[]
  signalKeywords: string[]
  questionStarters: string[]
  requireQuestionMark: boolean
  cooldownMinutes: number
  repeatCooldownMinutes: number
  minDeltaPoints: number
  minNeynarScore: number
  responseVariants?: string[]
}

export const DEFAULT_BOT_STATS_CONFIG: BotStatsConfig = {
  mentionMatchers: ['@gmeowbased', '#gmeowbased'],
  signalKeywords: ['stats', 'stat', 'rank', 'level', 'xp', 'points', 'progress', 'insights'],
  questionStarters: ['what', 'how', 'show', 'share', 'can', 'may'],
  requireQuestionMark: false,
  cooldownMinutes: 15,
  repeatCooldownMinutes: 5,
  minDeltaPoints: 5,
  minNeynarScore: 0.5,
  responseVariants: ['Signal sync complete', 'Telemetry uplink secure', 'Diagnostics fresh'],
}
// @edit-end
