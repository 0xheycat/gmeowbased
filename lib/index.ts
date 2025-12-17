/**
 * Main lib exports
 * 
 * Re-exports most commonly used utilities for convenient importing.
 * Domain-specific imports should still use direct paths for clarity.
 * 
 * Usage:
 * ```typescript
 * // Common utilities (convenient)
 * import { withErrorHandler, generateRequestId } from '@/lib'
 * 
 * // Domain-specific (prefer direct paths)
 * import { getUserBadges } from '@/lib/badges'
 * import { getSupabaseServerClient } from '@/lib/supabase/client'
 * ```
 */

// ============================================================================
// Core Middleware & Error Handling (Most Common)
// ============================================================================

export * from './error-handler'
export * from './request-id'
export * from './rate-limit'

// ============================================================================
// Validation
// ============================================================================

export * from './validation/api-schemas'

// ============================================================================
// Core Systems (Selective Exports)
// ============================================================================

// Auth
export * from './auth'

// Cache
export * from './cache'

// Supabase
export { getSupabaseServerClient } from './supabase/client'
export { getSupabaseAdminClient, getSupabaseEdgeClient } from './supabase/edge'

// ============================================================================
// Contract Utilities
// ============================================================================

export * from './contracts'
export type { GMChainKey, ChainKey } from './gmeow-utils'

// ============================================================================
// Common Types
// ============================================================================

export type { Database } from '../types/supabase'

// ============================================================================
// Utilities
// ============================================================================

export * from './utils'

// ============================================================================
// Feature Modules (Type Exports Only - Use Direct Imports for Functions)
// ============================================================================

export type { BotUserStats } from './bot/analytics/stats'
export type { QuestTemplate, TaskConfig } from './quests/types'
export type { FrameType, FrameRequest, FrameHandlerContext } from './frames/types'

/**
 * Note: For feature-specific functionality, import directly:
 * - Bot: '@/lib/bot/*'
 * - Frames: '@/lib/frames/*'
 * - Quests: '@/lib/quests/*'
 * - Guild: '@/lib/guild/*'
 * - Profile: '@/lib/profile/*'
 * - Badges: '@/lib/badges'
 * - Notifications: '@/lib/notifications/*'
 */
