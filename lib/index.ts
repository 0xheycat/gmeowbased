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
 * import { getUserBadges } from '@/lib/badges/badges'
 * import { getSupabaseServerClient } from '@/lib/supabase/edge'
 * ```
 */

// ============================================================================
// Core Middleware & Error Handling (Most Common)
// ============================================================================

export * from './middleware/error-handler'
export * from './middleware/request-id'
export * from './middleware/rate-limit'

// ============================================================================
// Validation (Phase 8.5 - Centralized Sanitization)
// ============================================================================

export * from './validation/api-schemas'
// Phase 8.5: Centralized address/chain validation
export { sanitizeAddress, sanitizeChain, sanitizeString, validateInput } from './middleware/api-security'

// ============================================================================
// Core Systems (Selective Exports)
// ============================================================================

// Auth
export * from './auth'

// Cache
export * from './cache'

// Supabase
export { getSupabaseServerClient } from '@/lib/supabase/edge'
export { getSupabaseAdminClient, getSupabaseEdgeClient } from './supabase/edge'

// User Data Fetching (Phase 8.4 - Canonical Sources)
export { fetchUserByFid, fetchUserByAddress, fetchUsersByAddresses } from './integrations/neynar'
export { getUserProfile, getUserProfiles } from './supabase/queries/user'

// ============================================================================
// Contract Utilities
// ============================================================================

export * from './contracts'

// RPC Client Pool (Phase 8.2 - Centralized Connection Pooling)
export { getPublicClient, getClientByChainKey, resetClientPool } from './contracts/rpc-client-pool'
export type { GMChainKey, ChainKey } from './contracts/gmeow-utils'

// ============================================================================
// Common Types
// ============================================================================

export type { Database } from '../types/supabase'

// ============================================================================
// Utilities
// ============================================================================

export * from './utils/utils'
export * from './utils/formatters'

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
