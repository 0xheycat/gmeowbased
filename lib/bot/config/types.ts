/**
 * @file lib/bot/config/types.ts
 * @description Type definitions for bot runtime configuration
 * 
 * PHASE: Phase 7.2 - Bot (December 17, 2025)
 * 
 * FEATURES:
 *   - BotStatsConfig type definition
 *   - Default configuration constants
 *   - Mention matcher patterns
 *   - Signal keyword definitions
 *   - Cooldown and rate limit settings
 *   - Neynar score thresholds
 * 
 * REFERENCE DOCUMENTATION:
 *   - Config loader: lib/bot/config/index.ts
 *   - Bot behavior: lib/bot/core/auto-reply.ts
 * 
 * REQUIREMENTS:
 *   - All fields must have sensible defaults
 *   - Types must be strict (no optional fields without defaults)
 *   - Configuration must be serializable to JSON
 * 
 * TODO:
 *   - [ ] Add configuration validation schemas (zod)
 *   - [ ] Add configuration migration system
 *   - [ ] Add per-field documentation
 *   - [ ] Add configuration presets
 * 
 * CRITICAL:
 *   - Default config must be production-safe
 *   - Cooldowns prevent spam (15min/5min)
 *   - Neynar score threshold prevents low-quality interactions
 *   - All arrays must be lowercase for matching
 * 
 * SUGGESTIONS:
 *   - Add configuration templates for different use cases
 *   - Add field-level validation rules
 *   - Document each field's impact on bot behavior
 * 
 * AVOID:
 *   - Adding optional fields without defaults
 *   - Setting cooldowns too low (spam risk)
 *   - Setting Neynar threshold too high (excludes users)
 *   - Breaking changes to type structure
 */

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
