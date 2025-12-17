/**
 * Tip Bot Auto-Reply Helpers
 * Created: December 9, 2025
 * Research Source: REBUILD-PHASE-AUDIT.md Phase 1
 * 
 * Generates celebration casts for tip milestones
 * 
 * NOTE: Legacy file - will be refactored for mention-based tip system
 * See: docs/features/TIP-SYSTEM-PROFESSIONAL-ARCHITECTURE.md
 */

import { NeynarAPIClient } from '@neynar/nodejs-sdk'

// Legacy types - will be replaced with mention-based schema
export type TipBotMessageType = 
  | 'tip_received'
  | 'milestone_100'
  | 'milestone_500'
  | 'milestone_1000'
  | 'streak_3'
  | 'streak_7'
  | 'streak_30'
  | 'top_supporter'

export interface TipBotMessage {
  type: TipBotMessageType
  senderUsername: string
  receiverUsername: string
  amount: string
  milestone?: number
  streak?: number
  message?: string
}

const neynar = new NeynarAPIClient({
  apiKey: process.env.NEXT_PUBLIC_NEYNAR_GLOBAL_API!,
} as any)

/**
 * Generate tip celebration message
 * Patterns: Patreon/Ko-fi style celebrations
 */
export function generateTipMessage(params: TipBotMessage): string {
  const { type, senderUsername, receiverUsername, amount, milestone, streak, message } = params

  switch (type) {
    case 'tip_received':
      return `@${senderUsername} just tipped @${receiverUsername} ${amount} USDC!${message ? `\n\n"${message}"` : ''}\n\n#TipGmeow #BaseTips`

    case 'milestone_100':
      return `MILESTONE! @${receiverUsername} just crossed 100 USDC in total tips!\n\nTop supporters, you rock!\n\n#TipMilestone #Community`

    case 'milestone_500':
      return `AMAZING! @${receiverUsername} reached 500 USDC in tips!\n\nYour supporters believe in you! Keep creating!\n\n#TipMilestone #Creator`

    case 'milestone_1000':
      return `LEGENDARY STATUS! @${receiverUsername} hit 1,000 USDC in tips!\n\nThat's what we call community support!\n\n#TipMilestone #Legendary`

    case 'streak_3':
      return `@${receiverUsername} got tipped 3 days in a row!\n\nStreak game strong! Keep creating valuable content!\n\n#TipStreak`

    case 'streak_7':
      return `@${receiverUsername} maintained a 7-day tip streak!\n\nConsistent quality = consistent support!\n\n#TipStreak #WeeklyWin`

    case 'streak_30':
      return `LEGENDARY STREAK! @${receiverUsername} got tipped for 30 days straight!\n\nYour supporters are LOYAL! Keep it up!\n\n#TipStreak #Monthly`

    case 'top_supporter':
      return `@${senderUsername} is a TOP SUPPORTER of @${receiverUsername}!\n\nTotal support: ${amount} USDC\n\nThe community appreciates you!\n\n#TopSupporter #Community`

    default:
      return `@${senderUsername} tipped @${receiverUsername} ${amount} USDC!`
  }
}

/**
 * Check if milestone reached
 */
export function checkTipMilestone(totalReceived: number): TipBotMessageType | null {
  if (totalReceived >= 1000 && totalReceived < 1001) return 'milestone_1000'
  if (totalReceived >= 500 && totalReceived < 501) return 'milestone_500'
  if (totalReceived >= 100 && totalReceived < 101) return 'milestone_100'
  return null
}

/**
 * Check if streak milestone reached
 */
export function checkStreakMilestone(streakDays: number): TipBotMessageType | null {
  if (streakDays >= 30) return 'streak_30'
  if (streakDays >= 7) return 'streak_7'
  if (streakDays >= 3) return 'streak_3'
  return null
}

/**
 * Post tip celebration cast
 */
export async function postTipCelebration(params: {
  type: TipBotMessageType
  senderUsername: string
  receiverUsername: string
  amount: number
  milestone?: number
  streak?: number
  message?: string
  botSignerUuid: string
}): Promise<{ castHash: string; success: boolean }> {
  try {
    const messageText = generateTipMessage({
      ...params,
      amount: params.amount.toString(),
    })

    const response = await neynar.publishCast({
      signerUuid: params.botSignerUuid,
      text: messageText,
    } as any)

    return {
      castHash: response.cast.hash,
      success: true,
    }
  } catch (error) {
    console.error('[Tip Bot] Failed to post celebration:', error)
    return {
      castHash: '',
      success: false,
    }
  }
}

/**
 * Calculate tip tier based on amount
 */
export function getTipTier(amount: number): 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' {
  if (amount >= 50) return 'diamond'
  if (amount >= 25) return 'platinum'
  if (amount >= 10) return 'gold'
  if (amount >= 5) return 'silver'
  return 'bronze'
}
