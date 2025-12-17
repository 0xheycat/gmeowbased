/**
 * Bot Module - Main Entry Point
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
