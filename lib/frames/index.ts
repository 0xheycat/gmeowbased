/**
 * @file lib/frames/index.ts
 * @description Frame system barrel export with handler registry
 * 
 * PHASE: Phase 7.3 - Frames (December 17, 2025)
 * 
 * FEATURES:
 *   - Centralized frame handler exports
 *   - Handler registry for dynamic lookup
 *   - Type definitions export
 *   - Utility functions export
 *   - 11 frame handler types (leaderboards, gm, guild, points, quest, badge, referral, onchainstats, nft, badgecollection, verify)
 *   - Handler resolution by frame type
 * 
 * REFERENCE DOCUMENTATION:
 *   - Frame handlers: lib/frames/handlers/
 *   - Frame types: lib/frames/types.ts
 *   - Frame routes: app/api/frame/
 * 
 * REQUIREMENTS:
 *   - All frame types must have handlers
 *   - Handler registry must be complete
 *   - Types must be exported
 * 
 * TODO:
 *   - [ ] Add handler versioning
 *   - [ ] Add handler health checks
 *   - [ ] Add handler analytics
 *   - [ ] Add handler middleware support
 *   - [ ] Add dynamic handler loading
 * 
 * CRITICAL:
 *   - All handlers must be registered
 *   - Handler registry must match FrameType enum
 *   - Breaking changes require version management
 *   - All exports must be typed
 * 
 * SUGGESTIONS:
 *   - Add handler capability discovery
 *   - Generate handler documentation
 *   - Add handler performance metrics
 *   - Implement handler hot-reloading
 * 
 * AVOID:
 *   - Missing handler registrations
 *   - Circular dependencies
 *   - Mixing default and named exports
 *   - Exporting internal implementation details
 */

/**
 * Frame System Index
 * Main entry point for modular frame handlers
 */

export * from './types'
export * from './utils'
export * from './hybrid-data'

// Frame handlers
export { handleLeaderboardFrame } from './handlers/leaderboard'
export { handleGMFrame } from './handlers/gm'
export { handleGuildFrame } from './handlers/guild'
export { handlePointsFrame } from './handlers/points'
export { handleQuestFrame } from './handlers/quest'
export { handleBadgeFrame } from './handlers/badge'
export { handleReferralFrame } from './handlers/referral'
export { handleOnchainStatsFrame } from './handlers/onchainstats'
export { handleNFTFrame } from './handlers/nft'
export { handleBadgeCollectionFrame } from './handlers/badgecollection'
export { handleVerifyFrame } from './handlers/verify'

// Handler registry
import type { FrameType, FrameHandler } from './types'
import { handleLeaderboardFrame } from './handlers/leaderboard'
import { handleGMFrame } from './handlers/gm'
import { handleGuildFrame } from './handlers/guild'
import { handlePointsFrame } from './handlers/points'
import { handleQuestFrame } from './handlers/quest'
import { handleBadgeFrame } from './handlers/badge'
import { handleReferralFrame } from './handlers/referral'
import { handleOnchainStatsFrame } from './handlers/onchainstats'
import { handleNFTFrame } from './handlers/nft'
import { handleBadgeCollectionFrame } from './handlers/badgecollection'
import { handleVerifyFrame } from './handlers/verify'

export const FRAME_HANDLERS: Partial<Record<FrameType, FrameHandler>> = {
  leaderboards: handleLeaderboardFrame,
  gm: handleGMFrame,
  guild: handleGuildFrame,
  points: handlePointsFrame,
  quest: handleQuestFrame,
  badge: handleBadgeFrame,
  referral: handleReferralFrame,
  onchainstats: handleOnchainStatsFrame,
  nft: handleNFTFrame,
  badgecollection: handleBadgeCollectionFrame,
  verify: handleVerifyFrame,
}

export function getFrameHandler(type: FrameType): FrameHandler | undefined {
  return FRAME_HANDLERS[type]
}
