/**
 * Enhanced notification card with rich text support and modern animations
 * Adapted from gmeowbased0.6 template with Gmeowbased theming
 */

'use client'

import { 
  X, CurrencyCircleDollar, PaperPlaneTilt, Megaphone, HandWaving, Sword, Gift,
  Medal, Sparkle, ArrowUp, CheckCircle, ChartBar, Confetti, Trophy, HeartBreak,
  Ranking, Sun, Fire, TrendUp, Target, XCircle, Warning, Info, CircleNotch
} from '@phosphor-icons/react'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { ICON_SIZES } from '@/lib/icon-sizes'
import type { RichTextSegment, NotificationEvent, NotificationCategory } from './live-notifications'

export interface NotificationCardProps {
  id?: string
  event: NotificationEvent
  category?: NotificationCategory
  message: string
  richText?: RichTextSegment[]  // Rich text formatting support
  actor?: {
    name?: string
    avatar?: string
    fid?: number
  }
  time?: string
  icon?: React.ReactNode
  dismissible?: boolean
  onDismiss?: (id?: string) => void
  className?: string
}

const EVENT_CONFIG: Record<NotificationEvent, { icon: React.ReactNode; bgClass: string; borderClass: string; textClass: string }> = {
  // Social events
  tip_received: {
    icon: <CurrencyCircleDollar size={24} weight="fill" />,
    bgClass: 'bg-gold/10 dark:bg-gold/20',
    borderClass: 'border-gold/30',
    textClass: 'text-gold dark:text-gold',
  },
  tip_sent: {
    icon: <PaperPlaneTilt size={24} weight="fill" />,
    bgClass: 'bg-blue-500/10 dark:bg-blue-500/20',
    borderClass: 'border-blue-500/30',
    textClass: 'text-blue-700 dark:text-blue-300',
  },
  mention_received: {
    icon: <Megaphone size={24} weight="fill" />,
    bgClass: 'bg-purple-500/10 dark:bg-purple-500/20',
    borderClass: 'border-purple-500/30',
    textClass: 'text-purple-700 dark:text-purple-300',
  },
  friend_joined: {
    icon: <HandWaving size={24} weight="fill" />,
    bgClass: 'bg-green-500/10 dark:bg-green-500/20',
    borderClass: 'border-green-500/30',
    textClass: 'text-green-700 dark:text-green-300',
  },
  guild_invite: {
    icon: <Sword size={24} weight="fill" />,
    bgClass: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    borderClass: 'border-indigo-500/30',
    textClass: 'text-indigo-700 dark:text-indigo-300',
  },
  referral_reward: {
    icon: <Gift size={24} weight="fill" />,
    bgClass: 'bg-gold/10 dark:bg-gold/20',
    borderClass: 'border-gold/30',
    textClass: 'text-gold dark:text-gold',
  },
  
  // Achievement events
  badge_minted: {
    icon: <Medal size={24} weight="fill" />,
    bgClass: 'bg-purple-500/10 dark:bg-purple-500/20',
    borderClass: 'border-purple-500/30',
    textClass: 'text-purple-700 dark:text-purple-300',
  },
  badge_eligible: {
    icon: <Sparkle size={24} weight="fill" />,
    bgClass: 'bg-yellow-500/10 dark:bg-yellow-500/20',
    borderClass: 'border-yellow-500/30',
    textClass: 'text-yellow-700 dark:text-yellow-300',
  },
  badge_tier_upgrade: {
    icon: <ArrowUp size={24} weight="bold" />,
    bgClass: 'bg-purple-500/10 dark:bg-purple-500/20',
    borderClass: 'border-purple-500/30',
    textClass: 'text-purple-700 dark:text-purple-300',
  },
  quest_completed: {
    icon: <CheckCircle size={24} weight="fill" />,
    bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    borderClass: 'border-emerald-500/30',
    textClass: 'text-emerald-700 dark:text-emerald-300',
  },
  quest_progress: {
    icon: <ChartBar size={24} weight="fill" />,
    bgClass: 'bg-blue-500/10 dark:bg-blue-500/20',
    borderClass: 'border-blue-500/30',
    textClass: 'text-blue-700 dark:text-blue-300',
  },
  quest_reward_claimed: {
    icon: <Confetti size={24} weight="fill" />,
    bgClass: 'bg-gold/10 dark:bg-gold/20',
    borderClass: 'border-gold/30',
    textClass: 'text-gold dark:text-gold',
  },
  level_up: {
    icon: <ArrowUp size={24} weight="bold" />,
    bgClass: 'bg-gold/10 dark:bg-gold/20',
    borderClass: 'border-gold/30',
    textClass: 'text-gold dark:text-gold',
  },
  rank_changed: {
    icon: <TrendUp size={24} weight="fill" />,
    bgClass: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    borderClass: 'border-cyan-500/30',
    textClass: 'text-cyan-700 dark:text-cyan-300',
  },
  points_milestone: {
    icon: <Target size={24} weight="fill" />,
    bgClass: 'bg-orange-500/10 dark:bg-orange-500/20',
    borderClass: 'border-orange-500/30',
    textClass: 'text-orange-700 dark:text-orange-300',
  },
  
  // GM events
  gm_sent: {
    icon: <Sun size={24} weight="fill" />,
    bgClass: 'bg-yellow-500/10 dark:bg-yellow-500/20',
    borderClass: 'border-yellow-500/30',
    textClass: 'text-yellow-700 dark:text-yellow-300',
  },
  gm_streak_continue: {
    icon: <Fire size={24} weight="fill" />,
    bgClass: 'bg-orange-500/10 dark:bg-orange-500/20',
    borderClass: 'border-orange-500/30',
    textClass: 'text-orange-700 dark:text-orange-300',
  },
  gm_streak_milestone: {
    icon: <Trophy size={24} weight="fill" />,
    bgClass: 'bg-gold/10 dark:bg-gold/20',
    borderClass: 'border-gold/30',
    textClass: 'text-gold dark:text-gold',
  },
  gm_streak_broken: {
    icon: <HeartBreak size={24} weight="fill" />,
    bgClass: 'bg-red-500/10 dark:bg-red-500/20',
    borderClass: 'border-red-500/30',
    textClass: 'text-red-700 dark:text-red-300',
  },
  gm_leaderboard_rank: {
    icon: <Ranking size={24} weight="fill" />,
    bgClass: 'bg-purple-500/10 dark:bg-purple-500/20',
    borderClass: 'border-purple-500/30',
    textClass: 'text-purple-700 dark:text-purple-300',
  },
  
  // Frame events
  frame_action_success: {
    icon: <CheckCircle size={24} weight="fill" />,
    bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    borderClass: 'border-emerald-500/30',
    textClass: 'text-emerald-700 dark:text-emerald-300',
  },
  frame_action_failed: {
    icon: <XCircle size={24} weight="fill" />,
    bgClass: 'bg-red-500/10 dark:bg-red-500/20',
    borderClass: 'border-red-500/30',
    textClass: 'text-red-700 dark:text-red-300',
  },
  frame_share_reward: {
    icon: <Gift size={24} weight="fill" />,
    bgClass: 'bg-gold/10 dark:bg-gold/20',
    borderClass: 'border-gold/30',
    textClass: 'text-gold dark:text-gold',
  },
  
  // Legacy (will be removed)
  achievement: {
    icon: <Trophy size={24} weight="fill" />,
    bgClass: 'bg-purple-500/10 dark:bg-purple-500/20',
    borderClass: 'border-purple-500/30',
    textClass: 'text-purple-700 dark:text-purple-300',
  },
  reward: {
    icon: <Gift size={24} weight="fill" />,
    bgClass: 'bg-gold/10 dark:bg-gold/20',
    borderClass: 'border-gold/30',
    textClass: 'text-gold dark:text-gold',
  },
  
  // Contract Events (from proxy deployment)
  referral_code_registered: {
    icon: <Gift size={24} weight="fill" />,
    bgClass: 'bg-blue-500/10 dark:bg-blue-500/20',
    borderClass: 'border-blue-500/30',
    textClass: 'text-blue-700 dark:text-blue-300',
  },
  quest_added: {
    icon: <Target size={24} weight="fill" />,
    bgClass: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    borderClass: 'border-cyan-500/30',
    textClass: 'text-cyan-700 dark:text-cyan-300',
  },
  quest_closed: {
    icon: <CheckCircle size={24} weight="fill" />,
    bgClass: 'bg-gray-500/10 dark:bg-gray-500/20',
    borderClass: 'border-gray-500/30',
    textClass: 'text-gray-700 dark:text-gray-300',
  },
  points_staked: {
    icon: <ArrowUp size={24} weight="bold" />,
    bgClass: 'bg-purple-500/10 dark:bg-purple-500/20',
    borderClass: 'border-purple-500/30',
    textClass: 'text-purple-700 dark:text-purple-300',
  },
  points_unstaked: {
    icon: <TrendUp size={24} weight="fill" />,
    bgClass: 'bg-orange-500/10 dark:bg-orange-500/20',
    borderClass: 'border-orange-500/30',
    textClass: 'text-orange-700 dark:text-orange-300',
  },
  guild_created: {
    icon: <Sword size={24} weight="fill" />,
    bgClass: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    borderClass: 'border-indigo-500/30',
    textClass: 'text-indigo-700 dark:text-indigo-300',
  },
  guild_joined: {
    icon: <HandWaving size={24} weight="fill" />,
    bgClass: 'bg-green-500/10 dark:bg-green-500/20',
    borderClass: 'border-green-500/30',
    textClass: 'text-green-700 dark:text-green-300',
  },
  guild_left: {
    icon: <HeartBreak size={24} weight="fill" />,
    bgClass: 'bg-gray-500/10 dark:bg-gray-500/20',
    borderClass: 'border-gray-500/30',
    textClass: 'text-gray-700 dark:text-gray-300',
  },
  guild_level_up: {
    icon: <Trophy size={24} weight="fill" />,
    bgClass: 'bg-gold/10 dark:bg-gold/20',
    borderClass: 'border-gold/30',
    textClass: 'text-gold dark:text-gold',
  },
  guild_quest_created: {
    icon: <Target size={24} weight="fill" />,
    bgClass: 'bg-purple-500/10 dark:bg-purple-500/20',
    borderClass: 'border-purple-500/30',
    textClass: 'text-purple-700 dark:text-purple-300',
  },
  guild_reward_claimed: {
    icon: <Gift size={24} weight="fill" />,
    bgClass: 'bg-gold/10 dark:bg-gold/20',
    borderClass: 'border-gold/30',
    textClass: 'text-gold dark:text-gold',
  },
  
  // Profile & Identity Events
  fid_linked: {
    icon: <Sparkle size={24} weight="fill" />,
    bgClass: 'bg-blue-500/10 dark:bg-blue-500/20',
    borderClass: 'border-blue-500/30',
    textClass: 'text-blue-700 dark:text-blue-300',
  },
  profile_updated: {
    icon: <CheckCircle size={24} weight="fill" />,
    bgClass: 'bg-green-500/10 dark:bg-green-500/20',
    borderClass: 'border-green-500/30',
    textClass: 'text-green-700 dark:text-green-300',
  },
  
  // NFT Events
  nft_minted: {
    icon: <Medal size={24} weight="fill" />,
    bgClass: 'bg-purple-500/10 dark:bg-purple-500/20',
    borderClass: 'border-purple-500/30',
    textClass: 'text-purple-700 dark:text-purple-300',
  },
  nft_payment_received: {
    icon: <CurrencyCircleDollar size={24} weight="fill" />,
    bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    borderClass: 'border-emerald-500/30',
    textClass: 'text-emerald-700 dark:text-emerald-300',
  },
  
  // Onchain Quest Events
  onchain_quest_completed: {
    icon: <Trophy size={24} weight="fill" />,
    bgClass: 'bg-gold/10 dark:bg-gold/20',
    borderClass: 'border-gold/30',
    textClass: 'text-gold dark:text-gold',
  },
  onchain_quest_added: {
    icon: <Target size={24} weight="fill" />,
    bgClass: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    borderClass: 'border-cyan-500/30',
    textClass: 'text-cyan-700 dark:text-cyan-300',
  },
  
  // Loading States (Phase 1.5.2 - Task 6)
  loading_transaction: {
    icon: <CircleNotch size={24} weight="bold" className="animate-spin" />,
    bgClass: 'bg-blue-500/10 dark:bg-blue-500/20',
    borderClass: 'border-blue-500/30',
    textClass: 'text-blue-700 dark:text-blue-300',
  },
  loading_data: {
    icon: <CircleNotch size={24} weight="bold" className="animate-spin" />,
    bgClass: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    borderClass: 'border-cyan-500/30',
    textClass: 'text-cyan-700 dark:text-cyan-300',
  },
  loading_profile: {
    icon: <CircleNotch size={24} weight="bold" className="animate-spin" />,
    bgClass: 'bg-purple-500/10 dark:bg-purple-500/20',
    borderClass: 'border-purple-500/30',
    textClass: 'text-purple-700 dark:text-purple-300',
  },
}

export default function NotificationCard({
  id,
  event,
  category,
  message,
  richText,
  actor,
  time,
  icon,
  dismissible = true,
  onDismiss,
  className = '',
}: NotificationCardProps) {
  const [isHidden, setIsHidden] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const config = EVENT_CONFIG[event]

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => {
      setIsHidden(true)
      onDismiss?.(id)
    }, 200) // Match exit animation duration
  }

  if (isHidden) return null

  // Render rich text segments if provided
  const renderMessage = () => {
    if (richText && richText.length > 0) {
      return (
        <span>
          {richText.map((segment, index) => {
            if (segment.type === 'username') {
              return (
                <span
                  key={index}
                  className={segment.metadata?.color || 'text-blue-400 dark:text-blue-300 font-bold'}
                  onClick={segment.metadata?.onClick}
                  style={{ cursor: segment.metadata?.onClick ? 'pointer' : 'inherit' }}
                >
                  {segment.content}
                </span>
              )
            } else if (segment.type === 'points') {
              return (
                <span
                  key={index}
                  className={segment.metadata?.color || 'text-gold font-bold'}
                >
                  {segment.content}
                </span>
              )
            } else if (segment.type === 'icon') {
              return (
                <span key={index} className="inline-block text-base leading-none">
                  {segment.content}
                </span>
              )
            } else if (segment.type === 'bold') {
              return (
                <span key={index} className="font-bold">
                  {segment.content}
                </span>
              )
            } else {
              return <span key={index}>{segment.content}</span>
            }
          })}
        </span>
      )
    }
    return message
  }

  const animationClass = isExiting
    ? 'notification-exit'
    : 'animate-in slide-in-from-right-5 fade-in'

  return (
    <div
      className={`
        relative flex items-start gap-3 rounded-xl border-2 p-4
        shadow-lg backdrop-blur-sm transition-all duration-200
        hover:-translate-y-0.5 hover:shadow-xl
        ${config.bgClass} ${config.borderClass}
        ${animationClass}
        ${className}
      `}
      role="alert"
      aria-live="polite"
    >
      {/* Avatar or Icon */}
      {actor?.avatar ? (
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-white/20">
          <Image
            src={actor.avatar}
            alt={actor.name || 'User'}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      ) : (
        <div className="shrink-0 text-2xl leading-none">
          {icon || config.icon}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${config.textClass}`}>
          {renderMessage()}
        </div>
        {time && (
          <div className="mt-1 text-xs text-gray-400">
            {time}
          </div>
        )}
        {category && (
          <div className="mt-1">
            <span className="inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/80">
              {category}
            </span>
          </div>
        )}
      </div>

      {/* Dismiss button */}
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Dismiss notification"
        >
          <X size={ICON_SIZES.sm} weight="bold" />
        </button>
      )}
    </div>
  )
}
