// Live notifications system - Event-based architecture
// Reference: planning/template/music/common/resources/client/ui/toast/
'use client'

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { saveNotification } from '@/lib/notification-history'
import NotificationCard from './notification-card'
import { ToastTimer } from './toast-timer'

// Event-based notification system (Farcaster standard + Contract Events)
export type NotificationEvent = 
  // Social Events
  | 'tip_received'
  | 'tip_sent'
  | 'mention_received'
  | 'friend_joined'
  | 'guild_invite'
  | 'referral_reward'
  | 'referral_code_registered'
  // Achievement Events
  | 'badge_minted'
  | 'badge_eligible'
  | 'badge_tier_upgrade'
  | 'quest_completed'
  | 'quest_progress'
  | 'quest_reward_claimed'
  | 'quest_added'
  | 'quest_closed'
  | 'level_up'
  | 'rank_changed'
  | 'points_milestone'
  | 'points_staked'
  | 'points_unstaked'
  // GM Events
  | 'gm_sent'
  | 'gm_streak_continue'
  | 'gm_streak_milestone'
  | 'gm_streak_broken'
  | 'gm_leaderboard_rank'
  // Guild Events
  | 'guild_created'
  | 'guild_joined'
  | 'guild_left'
  | 'guild_level_up'
  | 'guild_quest_created'
  | 'guild_reward_claimed'
  // Profile & Identity Events
  | 'fid_linked'
  | 'profile_updated'
  // NFT Events
  | 'nft_minted'
  | 'nft_payment_received'
  // Onchain Quest Events
  | 'onchain_quest_completed'
  | 'onchain_quest_added'
  // Frame Events
  | 'frame_action_success'
  | 'frame_action_failed'
  | 'frame_share_reward'
  // Loading States (Phase 1.5)
  | 'loading_transaction'
  | 'loading_data'
  | 'loading_profile'
  // Legacy (kept for backwards compatibility)
  | 'achievement' | 'reward'

export type ToastPosition = 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center'

export type NotificationCategory = 'gm' | 'quest' | 'badge' | 'level' | 'streak' | 'tip' | 'achievement' | 'reward' | 'guild' | 'system' | 'social'

export interface RichTextSegment {
  type: 'text' | 'username' | 'points' | 'icon' | 'bold'
  content: string
  metadata?: {
    color?: string
    icon?: React.ReactNode
    onClick?: () => void
  }
}

export interface NotificationItem {
  id: string
  message: string
  title?: string
  richText?: RichTextSegment[]
  event: NotificationEvent  // Primary field
  category?: NotificationCategory
  duration?: number
  position?: ToastPosition
  timer?: ToastTimer | null
  actor?: {
    name?: string
    avatar?: string
    fid?: number
  }
  metadata?: Record<string, any>
  timestamp?: number
}

/**
 * Parse message text into rich text segments
 * Automatically detects: @usernames, points (100 pts), emojis
 */
export function parseRichText(message: string): RichTextSegment[] {
  const segments: RichTextSegment[] = []
  const regex = /(@\w+)|(\d+\s*pts?)|(🎉|🏆|🎁|💰|✨|🔥|⚡️|🌟|💎|🎊|🎈)/gi
  
  let lastIndex = 0
  let match
  
  while ((match = regex.exec(message)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: message.slice(lastIndex, match.index)
      })
    }
    
    // Add matched segment with formatting
    if (match[1]) {
      // Username (@mention)
      segments.push({
        type: 'username',
        content: match[1],
        metadata: { color: 'text-blue-400 dark:text-blue-300 font-bold' }
      })
    } else if (match[2]) {
      // Points
      segments.push({
        type: 'points',
        content: match[2],
        metadata: { color: 'text-gold font-bold' }
      })
    } else if (match[3]) {
      // Icon/Emoji
      segments.push({
        type: 'icon',
        content: match[3]
      })
    }
    
    lastIndex = regex.lastIndex
  }
  
  // Add remaining text
  if (lastIndex < message.length) {
    segments.push({
      type: 'text',
      content: message.slice(lastIndex)
    })
  }
  
  return segments
}

interface Notification {
  id: string
  message: string
  event: NotificationEvent
  category?: NotificationCategory
  duration?: number
  position?: ToastPosition
  timer?: ToastTimer | null
  richText?: RichTextSegment[]
  actor?: {
    name?: string
    avatar?: string
    fid?: number
  }
  metadata?: Record<string, any>
}

interface NotificationContextType {
  showNotification: (
    message: string, 
    event: NotificationEvent,  // Required: no default
    duration?: number,
    category?: NotificationCategory,
    metadata?: Record<string, any>
  ) => void
  clearNotifications: () => void
  items: NotificationItem[]
  dismiss: (id: string) => void
  push: (notification: Partial<NotificationItem> & { event: NotificationEvent }) => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)

// Maximum visible toasts (Phase 1.5.1 - Queue Management)
const MAXIMUM_VISIBLE = 3

/**
 * Smart duration defaults based on event type (Phase 1.5.2 - Task 5)
 * Reference: planning/template/music toast-store.ts
 */
function getDefaultDuration(event: NotificationEvent): number {
  const eventStr = event.toString()
  
  // Errors/failures need more time to read
  if (eventStr.includes('failed') || eventStr.includes('error') || event === 'frame_action_failed') {
    return 8000
  }
  
  // Loading states don't auto-dismiss
  if (eventStr.includes('loading') || event.startsWith('loading_')) {
    return 0
  }
  
  // Success/info auto-dismiss quickly
  return 3000
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const showNotification = useCallback((
    message: string,
    event: NotificationEvent,
    duration?: number,
    category?: NotificationCategory,
    metadata?: Record<string, any>
  ) => {
    const id = Math.random().toString(36).substring(7)
    
    // Smart duration (Phase 1.5.2 - Task 5)
    const finalDuration = duration ?? getDefaultDuration(event)
    
    // Queue management (Phase 1.5.1 - Task 2)
    setNotifications(prev => {
      const amountToRemove = prev.length + 1 - MAXIMUM_VISIBLE
      const cleaned = amountToRemove > 0 ? prev.slice(amountToRemove) : prev
      
      // Clear timers for removed notifications
      if (amountToRemove > 0) {
        prev.slice(0, amountToRemove).forEach(n => n.timer?.clear())
      }
      
      return cleaned
    })
    
    // Create notification with timer (Phase 1.5.1 - Task 1)
    const notification: Notification = {
      id,
      message,
      event,
      category,
      duration: finalDuration,
      position: 'top-right', // User requested: keep top-right for mobile
      timer: finalDuration > 0
        ? new ToastTimer(() => {
            setNotifications(prev => prev.filter(n => n.id !== id))
          }, finalDuration)
        : null,
      metadata
    }

    setNotifications(prev => [...prev, notification])

    // Save to history (non-blocking)
    if (category) {
      saveNotification({
        category,
        title: message,
        tone: event as any, // Legacy field
        metadata,
      }).catch(() => {
        // Silent fail - don't block UI
      })
    }
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications(prev => {
      // Clear all timers before clearing notifications
      prev.forEach(n => n.timer?.clear())
      return []
    })
  }, [])

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id)
      notification?.timer?.clear()
      return prev.filter(n => n.id !== id)
    })
  }, [])

  const push = useCallback((notification: Partial<NotificationItem> & { event: NotificationEvent }) => {
    const id = notification.id || Math.random().toString(36).substring(7)
    const finalDuration = notification.duration ?? getDefaultDuration(notification.event)
    
    // Auto-parse rich text if not provided
    const richText = notification.richText || (notification.message ? parseRichText(notification.message) : [])
    
    // Queue management
    setNotifications(prev => {
      const amountToRemove = prev.length + 1 - MAXIMUM_VISIBLE
      const cleaned = amountToRemove > 0 ? prev.slice(amountToRemove) : prev
      
      if (amountToRemove > 0) {
        prev.slice(0, amountToRemove).forEach(n => n.timer?.clear())
      }
      
      return cleaned
    })
    
    const fullNotification: Notification = {
      id,
      message: notification.message || '',
      event: notification.event,
      category: notification.category,
      duration: finalDuration,
      position: notification.position || 'top-right',
      timer: finalDuration > 0
        ? new ToastTimer(() => {
            setNotifications(prev => prev.filter(n => n.id !== id))
          }, finalDuration)
        : null,
      actor: notification.actor,
      metadata: notification.metadata,
      richText,
    }
    
    setNotifications(prev => [...prev, fullNotification])
  }, [])

  const items: NotificationItem[] = notifications.map(n => ({
    ...n,
    timestamp: Date.now(),
  }))

  // Framer Motion animation config (Phase 1.5.1 - Task 3)
  const initial = { opacity: 0, y: 50, scale: 0.3 }
  const animate = { opacity: 1, y: 0, scale: 1 }
  const exit = { opacity: 0, scale: 0.5, transition: { duration: 0.2 } }

  return (
    <NotificationContext.Provider value={{ showNotification, clearNotifications, items, dismiss, push }}>
      {children}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md pointer-events-none">
          <AnimatePresence>
            {notifications.map(notification => (
              <m.div
                key={notification.id}
                initial={initial}
                animate={animate}
                exit={exit}
                transition={{ duration: 0.2 }}
                onPointerEnter={() => notification.timer?.pause()}
                onPointerLeave={() => notification.timer?.resume()}
                className="pointer-events-auto"
              >
                <NotificationCard
                  id={notification.id}
                  event={notification.event}
                  category={notification.category as any}
                  message={notification.message}
                  richText={notification.richText}
                  actor={notification.actor}
                  dismissible={true}
                  onDismiss={(id) => {
                    const n = notifications.find(n => n.id === id)
                    n?.timer?.clear()
                    setNotifications(prev => prev.filter(n => n.id !== id))
                  }}
                />
              </m.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}


