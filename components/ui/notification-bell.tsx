'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import NotificationsIcon from '@mui/icons-material/Notifications'
import WavingHandIcon from '@mui/icons-material/WavingHand'
import SportsEsportsIcon from '@mui/icons-material/SportsEsports'
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard'
import GroupIcon from '@mui/icons-material/Group'
import InfoIcon from '@mui/icons-material/Info'
import { motion, AnimatePresence } from 'framer-motion'
import type { NotificationHistoryItem } from '@/lib/notification-history'

interface NotificationBellProps {
  initialNotifications?: NotificationHistoryItem[]
  unreadCount?: number
}

// Format time ago (simple version)
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hr${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays === 1) return '1 day ago'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}

// Get MUI icon component for notification category
function getCategoryIcon(category: string) {
  switch (category) {
    case 'gm':
      return WavingHandIcon
    case 'quest':
      return SportsEsportsIcon
    case 'badge':
      return MilitaryTechIcon
    case 'level':
      return TrendingUpIcon
    case 'streak':
      return LocalFireDepartmentIcon
    case 'tip':
      return AttachMoneyIcon
    case 'achievement':
      return EmojiEventsIcon
    case 'reward':
      return CardGiftcardIcon
    case 'guild':
      return SportsEsportsIcon
    case 'social':
      return GroupIcon
    default:
      return InfoIcon
  }
}

// Get color for notification tone
function getToneColor(tone: string): string {
  switch (tone) {
    case 'success':
      return 'text-green-500'
    case 'error':
      return 'text-red-500'
    case 'warning':
      return 'text-yellow-500'
    case 'level_up':
      return 'text-purple-500'
    case 'badge_earned':
      return 'text-blue-500'
    case 'streak_milestone':
      return 'text-orange-500'
    default:
      return 'text-gray-500'
  }
}

export function NotificationBell({ initialNotifications = [], unreadCount = 0 }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState(initialNotifications)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Outside click detection (pattern from trezoadmin)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  const handleClearAll = async () => {
    // TODO: Implement clear all notifications API call
    setNotifications([])
    console.log('Clear all notifications')
  }

  // Show max 5 notifications in dropdown
  const recentNotifications = notifications.slice(0, 5)
  const hasUnread = unreadCount > 0

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Button */}
      <button
        onClick={handleToggle}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <NotificationsIcon sx={{ fontSize: 18 }} className="text-gray-700 dark:text-gray-300" />
        
        {/* Badge indicator (orange dot from trezoadmin pattern) */}
        {hasUnread && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-orange-500 shadow-sm"
          />
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-[290px] md:w-[350px] z-50 bg-white dark:bg-gray-900 rounded-lg shadow-xl dark:shadow-2xl border border-gray-200 dark:border-gray-800 py-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100 dark:border-gray-800">
              <span className="font-semibold text-gray-900 dark:text-white text-sm">
                Notifications{' '}
                <span className="text-gray-500 dark:text-gray-400 font-normal">
                  ({notifications.length})
                </span>
              </span>
              {notifications.length > 0 && (
                <button
                  type="button"
                  className="text-xs text-primary-500 hover:text-primary-600 transition-colors"
                  onClick={handleClearAll}
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Notification List */}
            <div className="max-h-[400px] overflow-y-auto compact-scrollbar">
              {recentNotifications.length > 0 ? (
                <ul>
                  {recentNotifications.map((notification) => {
                    const IconComponent = getCategoryIcon(notification.category)
                    return (
                      <li
                        key={notification.id}
                        className="relative border-b border-gray-100 dark:border-gray-800 py-3 px-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors last:border-b-0"
                      >
                        <div className="flex gap-3">
                          {/* Icon */}
                          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getToneColor(notification.tone)} bg-gray-100 dark:bg-gray-800`}>
                            <IconComponent sx={{ fontSize: 20 }} />
                          </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {notification.title}
                          </p>
                          {notification.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-0.5">
                              {notification.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                        </div>

                        {/* Unread indicator */}
                        {!notification.dismissed_at && (
                          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary-500 mt-2" />
                        )}
                      </div>
                    </li>
                  )
                })}
                </ul>
              ) : (
                <div className="py-12 text-center">
                  <NotificationsIcon sx={{ fontSize: 48 }} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No notifications yet
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="pt-3 px-5 border-t border-gray-100 dark:border-gray-800">
                <Link
                  href="/notifications"
                  className="block text-center text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  View All Notifications
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
