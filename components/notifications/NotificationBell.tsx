/**
 * Notification Bell Component - Phase 6 Enhanced
 * 
 * TODO:
 * - [x] Selection mode with checkboxes (Week 1 Day 3) ✅
 * - [x] Bulk action bar (Mark Read, Delete) ✅
 * - [x] Filter tabs (All, Unread) ✅ (Week 1 Day 4) - Category filtering in Settings
 * - [x] Read/unread visual indicators (Week 1 Day 5) ✅
 * - [x] Auto-mark as read on click (Week 1 Day 5) ✅
 * - Note: Clear All moved to NotificationSettings.tsx (Week 1 Day 4)
 * 
 * FEATURES:
 * - Real-time notifications dropdown in header
 * - Auto-refresh when dropdown opens
 * - Manual refresh button with spinner
 * - XP badge display (+X XP green badge)
 * - Category icons (11 types)
 * - Selection mode for bulk operations (NEW - Phase 6)
 * - Bulk mark as read/delete actions (NEW - Phase 6)
 * 
 * PHASE: Phase 6.1 - Advanced Notification Management (Week 1 Day 3)
 * DATE: December 15, 2025
 * 
 * REFERENCE DOCUMENTATION:
 * - Core Plan: NOTIFICATION-PRIORITY-ENHANCEMENT-PLAN.md (Phase 6.1)
 * - Gap Analysis: Lines 1300-1500 (Selection system UI)
 * - Platform Research: Gmail (select all), Slack (shift+click), Discord (bulk delete)
 * 
 * SUGGESTIONS:
 * - Add shift+click range selection (Week 1 Day 4)
 * - Add keyboard shortcuts (Cmd+A for select all) (Week 2)
 * - Add confirmation dialog for bulk delete (Week 1 Day 3)
 * - Add undo functionality for destructive actions (Week 1 Day 4)
 * 
 * CRITICAL FOUND:
 * - Must use Set<string> for selectedIds (efficient lookups)
 * - Checkboxes only visible in selection mode
 * - Bulk actions appear when 1+ items selected
 * - Must clear selection after bulk operation
 * 
 * AVOID (from farcaster.instructions.md):
 * - ❌ NO emojis in code (use SVG icons from components/icons/)
 * - ❌ NO missing error handling for API calls
 * - ❌ NO partial state updates (use atomic operations)
 * - ❌ NO missing null-safety checks
 * 
 * REQUIREMENTS (from farcaster.instructions.md):
 * - ✅ TypeScript strict mode (0 errors)
 * - ✅ Null-safety checks before operations
 * - ✅ Professional UI patterns (from trezoadmin templates)
 * - ✅ Accessibility (WCAG AA contrast, keyboard nav)
 * 
 * WEBSITE: https://gmeowhq.art
 * NETWORK: Base (8453)
 * 
 * @see NOTIFICATION-PRIORITY-ENHANCEMENT-PLAN.md - Phase 6.1 Bulk Actions
 * @see app/api/notifications/bulk/route.ts - Bulk actions API
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import NotificationsIcon from '@mui/icons-material/Notifications'
import SettingsIcon from '@mui/icons-material/Settings'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import DeleteIcon from '@mui/icons-material/Delete'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import CloseIcon from '@mui/icons-material/Close'
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
import { useAuth } from '@/lib/hooks/use-auth'
import { trackError } from '@/lib/notifications/error-tracking'
import { getSupabaseBrowserClient } from '@/lib/supabase/edge'
import { NotificationSkeleton } from '@/components/ui/skeleton'
import ConfirmDialog from '@/components/dialogs/confirmation/confirm-dialog'
import type { NotificationHistoryItem } from '@/lib/notifications'

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

export function NotificationBell() {
  const { fid } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Phase 6: Selection mode state (Week 1 Day 3)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  // Phase 6: Filter state (Week 1 Day 4) - Only All/Unread (category filtering in Settings)
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all')
  
  // Confirm dialog state for bulk delete
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'delete' | null>(null)
  
  // Week 3 Day 4: Bell shake animation state
  const [bellShake, setBellShake] = useState(false)
  const prevCountRef = useRef(0)

  // Load notifications function (extracted so it can be called manually)
  const loadNotifications = useCallback(async () => {
    if (!fid) {
      return
    }

    setLoading(true)
    
    try {
      // Use singleton browser client
      const supabase = getSupabaseBrowserClient()
      
      if (!supabase) {
        console.error('[NotificationBell] Supabase client not available')
        trackError('supabase_client_unavailable', new Error('Supabase client not initialized'), { fid })
        return
      }
      
      // Phase 6: Build query with filters (Day 4 - Simplified: All/Unread only)
      let query = supabase
        .from('user_notification_history')
        .select('*')
        .eq('fid', fid)
        .is('dismissed_at', null)

      // Apply unread filter (if selected)
      if (filterTab === 'unread') {
        query = query.is('read_at', null)
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (error) {
        console.error('[NotificationBell] Query error:', error)
        trackError('notification_fetch_failed', error, { fid })
      } else {
        console.log('[NotificationBell] Found notifications:', data?.length || 0, data)
        setNotifications((data as NotificationHistoryItem[]) || [])
      }
    } catch (error) {
      trackError('notification_fetch_error', error, { fid })
    } finally {
      setLoading(false)
    }
  }, [fid])

  // Fetch notifications when FID is available or filter changes (Phase 6 Day 4)
  useEffect(() => {
    loadNotifications()
  }, [loadNotifications, filterTab])

  // Auto-refresh when dropdown opens
  useEffect(() => {
    if (isOpen && fid) {
      loadNotifications()
    }
  }, [isOpen, fid, loadNotifications])

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

  // Phase 6 Week 3: Keyboard shortcut for Cmd+A Select All (Day 1)
  // TODO: Consider adding Cmd+X for clear selection, Escape for exit selection mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only activate when dropdown is open AND in selection mode
      if (!isOpen || !selectionMode) return
      
      // Cmd+A (Mac) or Ctrl+A (Windows) to select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault() // Prevent browser default select all
        selectAll()
        console.log('[NotificationBell] Cmd+A: Selected all notifications')
      }
    }

    // Only add listener when dropdown is open and in selection mode
    if (isOpen && selectionMode) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, selectionMode, notifications]) // CRITICAL: Include notifications to ensure selectAll has current data

  // Week 3 Day 4: Bell shake animation on new notification
  // RECOMMENDATION: Could add sound playback here as well (Day 4 optional feature)
  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.read_at && !n.dismissed_at).length
    
    // Trigger shake only when:
    // 1. Count increased (new notification arrived)
    // 2. Dropdown is closed (avoid annoying shake while viewing)
    if (unreadCount > prevCountRef.current && !isOpen) {
      setBellShake(true)
      setTimeout(() => setBellShake(false), 500) // Match animation duration
    }
    
    prevCountRef.current = unreadCount
  }, [notifications, isOpen])

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  // Phase 6: Selection mode handlers (Week 1 Day 3)
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode)
    setSelectedIds(new Set()) // Clear selection when toggling mode
  }

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(notifications.map(n => n.id)))
  }

  const deselectAll = () => {
    setSelectedIds(new Set())
  }

  // Phase 6: Auto-mark as read on click (Week 1 Day 5)
  const handleNotificationClick = async (notification: NotificationHistoryItem) => {
    // Skip if already read
    if (notification.read_at) return

    try {
      // Optimistically update UI
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n)
      )

      // Call API to mark as read
      const response = await fetch(`/api/notifications/${notification.id}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true, fid }),
      })

      if (!response.ok) {
        // Revert on error
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, read_at: null } : n)
        )
        throw new Error('Failed to mark as read')
      }
    } catch (error) {
      trackError('mark_as_read_click_failed', error, { fid, notificationId: notification.id })
    }
  }

  // Phase 6: Bulk mark as read (Week 1 Day 3)
  const handleBulkMarkRead = async () => {
    if (selectedIds.size === 0 || !fid) return
    
    setBulkActionLoading(true)
    try {
      const response = await fetch('/api/notifications/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_read',
          ids: Array.from(selectedIds),
          fid,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to mark notifications as read')
      }

      // Refresh notifications and clear selection
      await loadNotifications()
      setSelectedIds(new Set())
      setSelectionMode(false)
    } catch (error) {
      console.error('Bulk mark read failed:', error)
      trackError('bulk_mark_read_failed', error, { fid, count: selectedIds.size })
    } finally {
      setBulkActionLoading(false)
    }
  }

  // Phase 6: Bulk delete (Week 1 Day 3)
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || !fid) return
    
    // Show confirmation dialog
    setConfirmAction('delete')
    setShowConfirmDialog(true)
  }
  
  // Execute bulk delete after confirmation
  const executeBulkDelete = async () => {
    
    setBulkActionLoading(true)
    try {
      const response = await fetch('/api/notifications/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          ids: Array.from(selectedIds),
          fid,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete notifications')
      }

      // Refresh notifications and clear selection
      await loadNotifications()
      setSelectedIds(new Set())
      setSelectionMode(false)
    } catch (error) {
      console.error('Bulk delete failed:', error)
      trackError('bulk_delete_failed', error, { fid, count: selectedIds.size })
    } finally {
      setBulkActionLoading(false)
    }
  }

  // Calculate unread count dynamically from notifications (Phase 6: Only count unread, not just non-dismissed)
  const unreadCount = notifications.filter(n => !n.read_at && !n.dismissed_at).length
  
  // Show max 5 notifications in dropdown
  const recentNotifications = notifications.slice(0, 5)
  const hasUnread = unreadCount > 0

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Button - Week 3 Day 4: Shake animation on new notification */}
      <button
        onClick={handleToggle}
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow ${
          bellShake ? 'animate-shake' : ''
        }`}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <NotificationsIcon sx={{ fontSize: 18 }} className="text-gray-700 dark:text-gray-300" />
        
        {/* Badge with count (if more than 0) */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white shadow-md"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
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
              <div className="flex items-center gap-2">
                {/* Selection Mode Toggle */}
                <button
                  onClick={toggleSelectionMode}
                  disabled={loading}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 transition-colors disabled:opacity-50"
                  title={selectionMode ? 'Cancel selection' : 'Select notifications'}
                >
                  <CheckBoxOutlineBlankIcon sx={{ fontSize: 16 }} />
                  {selectionMode ? 'Cancel' : 'Select'}
                </button>
                <button
                  onClick={() => loadNotifications()}
                  disabled={loading}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 transition-colors disabled:opacity-50"
                  title="Refresh notifications"
                >
                  <svg 
                    className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <Link
                  href="/notifications"
                  className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <SettingsIcon sx={{ fontSize: 16 }} />
                  Settings
                </Link>
              </div>
            </div>

            {/* Filter Tabs - Phase 6 Day 4 (Simplified: All + Unread only) */}
            {/* Category filtering is in NotificationSettings.tsx */}
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterTab('all')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    filterTab === 'all'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterTab('unread')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    filterTab === 'unread'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  Unread
                </button>
              </div>
            </div>

            {/* Bulk Action Bar - Phase 6 Day 3 */}
            {selectionMode && selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="sticky top-0 z-10 px-5 py-2 bg-primary-50 dark:bg-primary-900/20 border-b border-primary-100 dark:border-primary-800"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-primary-900 dark:text-primary-100">
                      {selectedIds.size} selected
                    </span>
                    <button
                      onClick={selectAll}
                      disabled={bulkActionLoading || selectedIds.size === recentNotifications.length}
                      className="text-xs text-primary-600 hover:text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Select All
                    </button>
                    <button
                      onClick={deselectAll}
                      disabled={bulkActionLoading}
                      className="text-xs text-primary-600 hover:text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {bulkActionLoading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={handleBulkMarkRead}
                          disabled={bulkActionLoading}
                          className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <DoneAllIcon sx={{ fontSize: 14 }} />
                          Mark {selectedIds.size} as Read
                        </button>
                        <button
                          onClick={handleBulkDelete}
                          disabled={bulkActionLoading}
                          className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <DeleteIcon sx={{ fontSize: 14 }} />
                          Delete {selectedIds.size}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Notification List */}
            <div className="max-h-[400px] overflow-y-auto compact-scrollbar">
              {loading ? (
                <div className="space-y-2 p-2">
                  <NotificationSkeleton />
                  <NotificationSkeleton />
                  <NotificationSkeleton />
                </div>
              ) : recentNotifications.length > 0 ? (
                <AnimatePresence mode="sync">
                  <ul>
                    {recentNotifications.map((notification: NotificationHistoryItem, index: number) => {
                      const IconComponent = getCategoryIcon(notification.category)
                      return (
                        <motion.li
                          key={notification.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ 
                            duration: 0.2,
                            ease: "easeOut",
                            delay: index * 0.05
                          }}
                          className={`relative border-b border-gray-100 dark:border-gray-800 py-3 px-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all last:border-b-0 ${
                            notification.read_at ? 'opacity-60' : ''
                          } ${
                            selectionMode ? 'cursor-default' : 'cursor-pointer'
                          }`}
                          onClick={() => {
                            if (!selectionMode) {
                              handleNotificationClick(notification)
                            }
                          }}
                        >
                        <div className="flex gap-3">
                          {/* Checkbox - Phase 6 Day 3 */}
                          {selectionMode && (
                            <div className="flex-shrink-0 flex items-center pt-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleSelection(notification.id)
                                }}
                                className="text-gray-400 hover:text-blue-500 transition-colors"
                              >
                                {selectedIds.has(notification.id) ? (
                                  <CheckBoxIcon sx={{ fontSize: 24 }} className="text-blue-500" />
                                ) : (
                                  <CheckBoxOutlineBlankIcon sx={{ fontSize: 24 }} />
                                )}
                              </button>
                            </div>
                          )}

                          {/* Unread Blue Dot - Phase 6 Day 5 */}
                          {!notification.read_at && (
                            <div className="flex-shrink-0 flex items-center pt-1">
                              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            </div>
                          )}

                          {/* Icon */}
                          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getToneColor(notification.tone)} bg-gray-100 dark:bg-gray-800`}>
                            <IconComponent sx={{ fontSize: 20 }} />
                          </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {/* Phase 6 Day 5: Bold title for unread */}
                            <p className={`text-sm text-gray-900 dark:text-white truncate ${
                              notification.read_at ? 'font-normal' : 'font-bold'
                            }`}>
                              {notification.title}
                            </p>
                            {/* XP Badge */}
                            {notification.metadata?.xp && (
                              <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-semibold bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30">
                                +{notification.metadata.xp} XP
                              </span>
                            )}
                          </div>
                          {notification.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-0.5">
                              {notification.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    </motion.li>
                  )
                })}
                </ul>
                </AnimatePresence>
              ) : (
                <div className="py-12 text-center">
                  <NotificationsIcon sx={{ fontSize: 48 }} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No notifications yet
                  </p>
                </div>
              )}
            </div>

            {/* Footer - Phase 6 Week 3: Quick Access Links (Day 1) */}
            {notifications.length > 0 && (
              <div className="pt-3 px-5 border-t border-gray-100 dark:border-gray-800">
                <div className="flex flex-col gap-2">
                  <Link
                    href="/notifications"
                    className="block text-center text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors py-1"
                    onClick={() => setIsOpen(false)}
                  >
                    View All Notifications
                  </Link>
                  {/* RECOMMENDATION: Add quick access to notification settings for better UX */}
                  <Link
                    href="/notifications?tab=settings"
                    className="flex items-center justify-center gap-1 text-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors py-1"
                    onClick={() => setIsOpen(false)}
                  >
                    <SettingsIcon sx={{ fontSize: 16 }} />
                    Notification Settings
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Confirm Dialog for Bulk Delete */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => {
          setShowConfirmDialog(false)
          setConfirmAction(null)
        }}
        onConfirm={async () => {
          if (confirmAction === 'delete') {
            await executeBulkDelete()
          }
          setShowConfirmDialog(false)
          setConfirmAction(null)
        }}
        title="Delete Notifications"
        message={`Are you sure you want to delete ${selectedIds.size} notification${selectedIds.size > 1 ? 's' : ''}? This action cannot be undone.`}
        variant="destructive"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={bulkActionLoading}
      />
    </div>
  )
}
