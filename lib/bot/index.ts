/**
 * @file lib/bot/index.ts
 * @description Bot module barrel export - centralized access to all bot functionality
 * 
 * PHASE: Phase 7.2 - Bot (December 17, 2025)
 * ENHANCED: Existing documentation upgraded with comprehensive Phase 7 header
 * 
 * FEATURES:
 *   - Centralized bot exports (auto-reply, context, frames, analytics)
 *   - Type-safe imports for all bot modules
 *   - Configuration management exports
 *   - Cache and conversation state exports
 *   - Internationalization exports
 *   - Quest recommendation exports
 * 
 * REFERENCE DOCUMENTATION:
 *   - Auto-reply: lib/bot/core/auto-reply.ts
 *   - User context: lib/bot/context/user-context.ts
 *   - Frame building: lib/bot/frames/builder.ts
 *   - Analytics: lib/bot/analytics/
 *   - Configuration: lib/bot/config/
 * 
 * REQUIREMENTS:
 *   - All bot functionality must be exported here
 *   - Types must be exported alongside implementations
 *   - Re-exports must maintain type safety
 * 
 * TODO:
 *   - [ ] Add bot module documentation generator
 *   - [ ] Add bot health check exports
 *   - [ ] Add bot testing utilities exports
 *   - [ ] Add bot performance monitoring exports
 * 
 * CRITICAL:
 *   - All exports must be used via this barrel file
 *   - Breaking changes require careful coordination
 *   - Type exports must match implementation exports
 * 
 * SUGGESTIONS:
 *   - Add bot capability discovery utilities
 *   - Add bot version information export
 *   - Group exports by feature area
 * 
 * AVOID:
 *   - Exporting internal implementation details
 *   - Creating circular dependencies
 *   - Mixing default and named exports
 * 
 * Centralized exports for all bot functionality.
 * Use this file to import bot features: import { buildAgentAutoReply } from '@/lib/bot'
 */

// Core auto-reply functionality
export { buildAgentAutoReply, type AgentIntentType } from './core/auto-reply'

// Cache and conversation state
export {
  saveConversationState,
  getConversationState,
  getConversationContext,
} from './cache'

// User context and frame selection
export {
  buildUserContext,
  selectOptimalFrame,
  type UserContext,
} from './context/user-context'

// Frame building
export {
  selectFrameForIntent,
  formatFrameEmbedForCast,
  type BotFrameType,
  type BotFrameEmbed,
} from './frames/builder'

// Quest recommendations
export {
  generateQuestRecommendations,
  formatQuestRecommendations,
  type QuestRecommendation,
} from './recommendations'

// Analytics and stats
export {
  computeBotUserStats,
  type BotUserStats,
} from './analytics/stats'

export {
  recordBotMetric,
  getBotHealthMetrics,
  getRecentBotErrors,
  type BotMetricEvent,
  type MetricWindow,
} from './analytics'

// Configuration
export {
  loadBotStatsConfig,
  saveBotStatsConfig,
  sanitiseBotStatsConfigInput,
  type BotStatsConfig,
  DEFAULT_BOT_STATS_CONFIG,
} from './config'

export {
  detectLanguage,
  getTranslations,
} from './config/i18n'
