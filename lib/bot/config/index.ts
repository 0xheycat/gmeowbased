/**
 * @file lib/bot/config/index.ts
 * @description Bot runtime configuration management with caching
 * 
 * PHASE: Phase 7.2 - Bot (December 17, 2025)
 * 
 * FEATURES:
 *   - Runtime configuration loading from database
 *   - Configuration caching (3 min TTL)
 *   - Default configuration fallbacks
 *   - Configuration validation and sanitization
 *   - Environment variable overrides
 *   - Type-safe configuration structure
 * 
 * REFERENCE DOCUMENTATION:
 *   - Config types: lib/bot/config/types.ts
 *   - Bot behavior: lib/bot/core/auto-reply.ts
 *   - Database: supabase/migrations (app_settings table)
 * 
 * REQUIREMENTS:
 *   - Configuration must have sensible defaults
 *   - Cache must expire to allow updates
 *   - All numeric values must be validated (positive, max limits)
 *   - String arrays must be normalized (lowercase, trimmed)
 * 
 * TODO:
 *   - [ ] Add configuration versioning
 *   - [ ] Add configuration change notifications
 *   - [ ] Add A/B testing support
 *   - [ ] Add per-user configuration overrides
 *   - [ ] Add configuration validation UI
 *   - [ ] Add configuration backup/restore
 * 
 * CRITICAL:
 *   - Cache must expire to allow config updates (3min TTL)
 *   - Default config must always be valid
 *   - Validation must prevent invalid values
 *   - Configuration changes require cache invalidation
 *   - No destructive defaults (preserve user settings)
 * 
 * SUGGESTIONS:
 *   - Add configuration change audit log
 *   - Add configuration diff visualization
 *   - Cache configuration per request context
 *   - Add configuration presets (strict, relaxed, etc.)
 *   - Add configuration health checks
 * 
 * AVOID:
 *   - Caching configuration indefinitely
 *   - Allowing invalid configuration values
 *   - Hardcoding configuration in code
 *   - Breaking changes to configuration schema
 *   - Exposing sensitive config to client
 */

// @edit-start 2025-11-12 — Bot runtime configuration helpers
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { BotStatsConfig } from './types'
import { DEFAULT_BOT_STATS_CONFIG } from './types'

export type { BotStatsConfig } from './types'
export { DEFAULT_BOT_STATS_CONFIG } from './types'

const CONFIG_KEY = 'app.bot_stats_config'
const CACHE_TTL_MS = Number(process.env.BOT_STATS_CONFIG_CACHE_MS ?? 180_000)
const MINUTE_MS = 60_000

type ConfigCache = {
  value: BotStatsConfig
  expiresAt: number
}

let cache: ConfigCache | null = null

function normaliseStringArray(input: unknown, fallback: string[]): string[] {
  if (!Array.isArray(input)) return [...fallback]
  const mapped = input
    .map(entry => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(entry => entry.length > 0)
  return mapped.length ? Array.from(new Set(mapped.map(item => item.toLowerCase()))) : [...fallback]
}

function toPositiveNumber(value: unknown, fallback: number, { allowZero = true, max }: { allowZero?: boolean; max?: number } = {}): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (!allowZero && value === 0) return fallback
    const clamped = value < 0 ? fallback : value
    if (typeof max === 'number' && clamped > max) return max
    return clamped
  }
  if (typeof value === 'string' && value.trim().length) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      if (!allowZero && parsed === 0) return fallback
      if (parsed < 0) return fallback
      if (typeof max === 'number' && parsed > max) return max
      return parsed
    }
  }
  return fallback
}

function sanitiseConfig(input: unknown): BotStatsConfig | null {
  if (!input || typeof input !== 'object') return null
  const base = { ...DEFAULT_BOT_STATS_CONFIG }

  const mentionMatchers = normaliseStringArray((input as Record<string, unknown>).mentionMatchers, base.mentionMatchers)
  const signalKeywords = normaliseStringArray((input as Record<string, unknown>).signalKeywords, base.signalKeywords)
  const questionStarters = normaliseStringArray((input as Record<string, unknown>).questionStarters, base.questionStarters)
  const requireQuestionMark = Boolean((input as Record<string, unknown>).requireQuestionMark ?? base.requireQuestionMark)
  const cooldownMinutes = toPositiveNumber((input as Record<string, unknown>).cooldownMinutes, base.cooldownMinutes, {
    allowZero: false,
    max: 240,
  })
  const repeatCooldownMinutes = toPositiveNumber(
    (input as Record<string, unknown>).repeatCooldownMinutes,
    base.repeatCooldownMinutes,
    { allowZero: false, max: 120 },
  )
  const minDeltaPoints = toPositiveNumber((input as Record<string, unknown>).minDeltaPoints, base.minDeltaPoints, {
    allowZero: true,
    max: 5_000,
  })
  // @edit-start 2025-02-15 — Add Neynar score threshold to config sanitiser
  const minNeynarScore = toPositiveNumber((input as Record<string, unknown>).minNeynarScore, base.minNeynarScore, {
    allowZero: true,
    max: 1,
  })
  // @edit-end
  const responseVariantsRaw = normaliseStringArray(
    (input as Record<string, unknown>).responseVariants,
    base.responseVariants ?? [],
  )
  const responseVariants = responseVariantsRaw.length ? responseVariantsRaw : base.responseVariants

  return {
    mentionMatchers,
    signalKeywords,
    questionStarters,
    requireQuestionMark,
    cooldownMinutes,
    repeatCooldownMinutes,
    minDeltaPoints,
    // @edit-start 2025-02-15 — Persist Neynar score threshold
    minNeynarScore,
    // @edit-end
    responseVariants,
  }
}

function mergeConfigs(configs: BotStatsConfig[]): BotStatsConfig {
  return configs.reduce<BotStatsConfig>((acc, cfg) => ({
    mentionMatchers: cfg.mentionMatchers?.length ? cfg.mentionMatchers : acc.mentionMatchers,
    signalKeywords: cfg.signalKeywords?.length ? cfg.signalKeywords : acc.signalKeywords,
    questionStarters: cfg.questionStarters?.length ? cfg.questionStarters : acc.questionStarters,
    requireQuestionMark: cfg.requireQuestionMark,
    cooldownMinutes: cfg.cooldownMinutes,
    repeatCooldownMinutes: cfg.repeatCooldownMinutes,
    minDeltaPoints: cfg.minDeltaPoints,
    // @edit-start 2025-02-15 — Merge Neynar score threshold safely
    minNeynarScore: typeof cfg.minNeynarScore === 'number' ? cfg.minNeynarScore : acc.minNeynarScore,
    // @edit-end
    responseVariants: cfg.responseVariants?.length ? cfg.responseVariants : acc.responseVariants,
  }), DEFAULT_BOT_STATS_CONFIG)
}

type HttpGetConfigResponse = string | { value?: string | null } | null

function extractConfigValue(payload: HttpGetConfigResponse): string | null {
  if (!payload) return null
  if (typeof payload === 'string') return payload
  if (typeof payload === 'object' && 'value' in payload) {
    const maybeValue = payload.value
    return typeof maybeValue === 'string' ? maybeValue : null
  }
  return null
}

async function fetchConfigFromSupabase(): Promise<BotStatsConfig | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase.rpc('http_get_config', { name: CONFIG_KEY })

    if (error) {
      console.warn('[bot-config] failed to load config via http_get_config:', error.message)
      return null
    }

    const rawValue = extractConfigValue(data as HttpGetConfigResponse)
    if (!rawValue) return null

    try {
      const parsed = JSON.parse(rawValue)
      return sanitiseConfig(parsed)
    } catch (error) {
      console.warn('[bot-config] failed to parse stored config:', (error as Error)?.message || error)
      return null
    }
  } catch (error) {
    console.warn('[bot-config] config fetch error:', (error as Error)?.message || error)
    return null
  }
}

function configFromEnv(): BotStatsConfig | null {
  const raw = process.env.BOT_STATS_CONFIG
  if (!raw || !raw.trim()) return null
  try {
    const parsed = JSON.parse(raw)
    return sanitiseConfig(parsed)
  } catch (error) {
    console.warn('[bot-config] BOT_STATS_CONFIG parse error:', (error as Error)?.message || error)
    return null
  }
}

function setCache(value: BotStatsConfig) {
  cache = {
    value,
    expiresAt: Date.now() + (CACHE_TTL_MS > MINUTE_MS ? CACHE_TTL_MS : 120_000),
  }
}

export async function loadBotStatsConfig(options: { refresh?: boolean } = {}): Promise<BotStatsConfig> {
  const now = Date.now()
  if (!options.refresh && cache && cache.expiresAt > now) {
    return cache.value
  }

  const envConfig = configFromEnv()
  const supabaseConfig = await fetchConfigFromSupabase()
  const merged = mergeConfigs([
    DEFAULT_BOT_STATS_CONFIG,
    ...(envConfig ? [envConfig] : []),
    ...(supabaseConfig ? [supabaseConfig] : []),
  ])

  setCache(merged)
  return merged
}

export async function saveBotStatsConfig(config: BotStatsConfig): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured; cannot persist bot settings.')
  }
  const supabase = getSupabaseServerClient()
  if (!supabase) {
    throw new Error('Failed to initialise Supabase client for bot settings.')
  }

  const payload = JSON.stringify(config)
  const { error } = await supabase.rpc('http_set_config', { name: CONFIG_KEY, value: payload })
  if (error) {
    throw new Error(`Failed to persist bot stats config: ${error.message}`)
  }
  setCache(config)
}

export function resetBotStatsConfigCache() {
  cache = null
}

export function sanitiseBotStatsConfigInput(input: unknown): BotStatsConfig {
  const parsed = sanitiseConfig(input)
  return parsed ?? { ...DEFAULT_BOT_STATS_CONFIG }
}
// @edit-end
