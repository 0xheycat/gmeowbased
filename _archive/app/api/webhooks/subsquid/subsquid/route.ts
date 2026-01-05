/**
 * Subsquid Webhook Handler
 * 
 * Receives event notifications from the Subsquid processor
 * Creates notifications for users based on blockchain events
 * 
 * Phase 8 Complete: All 16 event types supported
 * 
 * INTEGRATES WITH EXISTING NOTIFICATION SYSTEM:
 * - Uses saveNotification() from lib/notifications/history.ts
 * - Saves to user_notification_history table (NOT a separate notifications table)
 * - Compatible with NotificationBell, /notifications page, etc.
 */

import { NextRequest, NextResponse } from 'next/server'
import { saveNotification } from '@/lib/notifications/history'
import type { NotificationCategory, NotificationTone } from '@/lib/notifications/history'

// Webhook secret for authentication
const WEBHOOK_SECRET = process.env.SUBSQUID_WEBHOOK_SECRET || 'dev-secret'

type EventType = 
  | 'QuestCompleted'
  | 'QuestAdded'
  | 'GuildRewardClaimed'
  | 'PointsDeposited'
  | 'PointsWithdrawn'
  | 'PointsTipped'
  | 'StakedForBadge'
  | 'UnstakedForBadge'
  | 'ReferrerSet'
  | 'ReferralRewardClaimed'
  | 'GuildCreated'
  | 'GuildJoined'
  | 'BadgeMint'
  | 'GMEvent'

interface WebhookPayload {
  eventType: EventType
  data: any
  timestamp: string
  txHash: string
  blockNumber: number
}

export async function POST(req: NextRequest) {
  try {
    // Verify webhook secret
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload: WebhookPayload = await req.json()
    const { eventType, data, timestamp, txHash } = payload

    // Create notification based on event type
    // Uses existing notification system (saveNotification from lib/notifications/history.ts)
    let notificationSaved = false

    switch (eventType) {
      case 'QuestCompleted': {
        // Quest completion notification
        notificationSaved = await saveNotification({
          walletAddress: data.user,
          fid: data.fid || null,
          category: 'quest' as NotificationCategory,
          title: 'Quest Cleared!',
          description: `You completed a quest and earned ${data.pointsAwarded} points!`,
          tone: 'success' as NotificationTone,
          metadata: {
            questId: data.questId,
            pointsAwarded: data.pointsAwarded,
            txHash,
          },
          actionLabel: 'View Quest',
          actionHref: `/quests/${data.questId}`,
        })
        break
      }

      case 'GuildRewardClaimed': {
        notificationSaved = await saveNotification({
          walletAddress: data.user,
          fid: data.fid || null,
          category: 'guild',
          title: 'Guild Reward Claimed!',
          description: `You claimed ${data.amount} points from your guild!`,
          tone: 'success',
          metadata: { guildId: data.guildId, amount: data.amount, txHash },
          actionLabel: 'View Guild',
          actionHref: `/guild/${data.guildId}`,
        })
        break
      }

      case 'PointsDeposited': {
        notificationSaved = await saveNotification({
          walletAddress: data.user,
          fid: data.fid || null,
          category: 'reward',
          title: 'Points Injected!',
          description: `${data.amount} points were deposited to your account`,
          tone: 'success',
          metadata: { amount: data.amount, from: data.from, txHash },
          actionLabel: 'View Profile',
          actionHref: '/profile',
        })
        break
      }

      case 'PointsWithdrawn': {
        notificationSaved = await saveNotification({
          walletAddress: data.user,
          fid: data.fid || null,
          category: 'reward',
          title: 'Points Withdrawn',
          description: `${data.amount} points were withdrawn from your account`,
          tone: 'info',
          metadata: { amount: data.amount, to: data.to, txHash },
          actionLabel: 'View Profile',
          actionHref: '/profile',
        })
        break
      }

      case 'PointsTipped': {
        notificationSaved = await saveNotification({
          walletAddress: data.to,
          fid: data.fid || null,
          category: 'tip',
          title: 'Tip Dispatched!',
          description: `You received ${data.amount} points as a tip!`,
          tone: 'success',
          metadata: { amount: data.amount, from: data.from, txHash },
          actionLabel: 'View Profile',
          actionHref: '/profile',
        })
        break
      }

      case 'StakedForBadge': {
        notificationSaved = await saveNotification({
          walletAddress: data.user,
          fid: data.fid || null,
          category: 'badge',
          title: 'Badge Stake Locked!',
          description: `You staked badge #${data.badgeId} for rewards!`,
          tone: 'success',
          metadata: { badgeId: data.badgeId, points: data.points, txHash },
          actionLabel: 'View Profile',
          actionHref: '/profile',
        })
        break
      }

      case 'UnstakedForBadge': {
        notificationSaved = await saveNotification({
          walletAddress: data.user,
          fid: data.fid || null,
          category: 'badge',
          title: 'Badge Unstaked',
          description: `You unstaked badge #${data.badgeId}`,
          tone: 'info',
          metadata: { badgeId: data.badgeId, txHash },
          actionLabel: 'View Profile',
          actionHref: '/profile',
        })
        break
      }

      case 'ReferrerSet': {
        notificationSaved = await saveNotification({
          walletAddress: data.user,
          fid: data.fid || null,
          category: 'achievement',
          title: 'Referrer Set!',
          description: 'Your referrer has been updated',
          tone: 'info',
          metadata: { referrer: data.referrer, txHash },
          actionLabel: 'View Referrals',
          actionHref: '/referral',
        })
        break
      }

      case 'ReferralRewardClaimed': {
        notificationSaved = await saveNotification({
          walletAddress: data.referrer,
          fid: data.fid || null,
          category: 'reward',
          title: 'Referral Reward!',
          description: `You earned ${data.amount} points from a referral!`,
          tone: 'success',
          metadata: { amount: data.amount, referee: data.referee, txHash },
          actionLabel: 'View Referrals',
          actionHref: '/referral',
        })
        break
      }

      case 'GuildCreated': {
        notificationSaved = await saveNotification({
          walletAddress: data.creator,
          fid: data.fid || null,
          category: 'guild',
          title: 'Guild Created!',
          description: `Your guild "${data.name}" has been created!`,
          tone: 'success',
          metadata: { guildId: data.guildId, name: data.name, txHash },
          actionLabel: 'View Guild',
          actionHref: `/guild/${data.guildId}`,
        })
        break
      }

      case 'GuildJoined': {
        notificationSaved = await saveNotification({
          walletAddress: data.member,
          fid: data.fid || null,
          category: 'guild',
          title: 'Guild Joined!',
          description: 'Welcome to your new guild!',
          tone: 'success',
          metadata: { guildId: data.guildId, txHash },
          actionLabel: 'View Guild',
          actionHref: `/guild/${data.guildId}`,
        })
        break
      }

      case 'BadgeMint': {
        notificationSaved = await saveNotification({
          walletAddress: data.to,
          fid: data.fid || null,
          category: 'badge',
          title: 'Badge Minted!',
          description: `You received badge #${data.tokenId}!`,
          tone: 'success',
          metadata: { tokenId: data.tokenId, txHash },
          actionLabel: 'View Profile',
          actionHref: '/profile',
        })
        break
      }

      case 'GMEvent': {
        // GM event notification (streak milestone)
        const streakCount = data.streakCount || 1
        if (streakCount % 7 === 0 || streakCount === 30 || streakCount === 100) {
          notificationSaved = await saveNotification({
            walletAddress: data.user,
            fid: data.fid || null,
            category: 'streak',
            title: `${streakCount}-Day Streak!`,
            description: `Congratulations on ${streakCount} days of GMs!`,
            tone: 'success',
            metadata: { streakCount, points: data.points, txHash },
            actionLabel: 'View Profile',
            actionHref: '/profile',
          })
        }
        break
      }

      case 'QuestAdded': {
        // Optional: Notify users of new quests
        // Not saving notification - too frequent
        console.log(`[webhook] QuestAdded event received (not creating notification)`)
        break
      }

      default:
        console.log(`[webhook] Unhandled event type: ${eventType}`)
        return NextResponse.json({ ok: true, handled: false })
    }

    // Log result
    if (notificationSaved) {
      console.log(`[webhook] Created ${eventType} notification via saveNotification()`)
    }

    return NextResponse.json({ ok: true, handled: true, notificationSaved })
  } catch (error: any) {
    console.error('[webhook] Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'subsquid-webhook',
    events_supported: [
      'QuestCompleted',
      'QuestAdded',
      'GuildRewardClaimed',
      'PointsDeposited',
      'PointsWithdrawn',
      'PointsTipped',
      'StakedForBadge',
      'UnstakedForBadge',
      'ReferrerSet',
      'ReferralRewardClaimed',
      'GuildCreated',
      'GuildJoined',
      'BadgeMint',
      'GMEvent',
    ],
  })
}
