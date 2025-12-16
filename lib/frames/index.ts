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
