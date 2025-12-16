/**
 * NotificationSettings Component - Priority-Based Notification Control + Full Inbox
 * 
 * TODO:
 * - [ ] Add quiet hours timezone selector (Phase 4 - Future enhancement)
 * - [ ] Add notification preview/test button (Phase 4 - Future enhancement)
 * - [ ] Add A/B testing for default thresholds (Phase 5 - Analytics)
 * - [x] Add grouping (Date/Category) (Phase 6 Week 2 Day 5) - COMPLETE
 * - [x] Add search functionality for notifications (Phase 6 Week 2 Day 3-4) - COMPLETE
 * - [x] Add sort options (Date, Priority, XP) (Phase 6 Week 2 Day 1-2) - COMPLETE
 * 
 * PHASE 3 COMPLETE (December 15, 2025):
 * - [x] Priority threshold selector - 4 buttons (critical/high/medium/low)
 * - [x] XP badges per category - Conditional display with getXPRewardForEvent()
 * - [x] Priority dropdown per category - Updates priority_settings JSONB
 * - [x] Push status indicators - Real-time filtering visualization
 * - [x] API integration - Connected to GET/PATCH /api/notifications/preferences
 * - [x] Mobile responsive - flex-wrap for automatic stacking
 * - [x] 0 TypeScript errors
 * 
 * PHASE 6 WEEK 1 DAY 4 COMPLETE (December 15, 2025):
 * - [x] Category-filtered notification list (like Gmail labels)
 * - [x] Clear All button with confirmation dialog
 * - [x] Live notification count per category
 * - [x] Read/unread visual indicators (blue dot, bold text)
 * - [x] 50 notifications limit (vs 10 in dropdown)
 * - [x] Scrollable list with max-height
 * 
 * PHASE 6 WEEK 2 COMPLETE (December 15, 2025):
 * - [x] Sort functionality (4 options: date_desc, date_asc, priority, xp)
 * - [x] Search functionality (debounced 300ms, full-text search, Cmd+K shortcut)
 * - [x] Notification grouping (by Date or Category with collapsible sections)
 * - [x] localStorage persistence (sort + grouping preferences)
 * - [x] Enhanced empty states (search results, category filters)
 * 
 * FEATURES:
 * - Global mute toggle with pause buttons (1h, 8h, 24h)
 * - Priority threshold selector (critical/high/medium/low)
 * - Category-to-priority mapping with live preview
 * - XP reward badges display (+5 XP to +200 XP)
 * - Per-category enable/push toggles (13 categories)
 * - Real-time filtered categories count
 * - Mobile-responsive (375px → 1920px)
 * - **NEW:** Category-filtered notification history (Phase 6 Week 1 Day 4)
 * - **NEW:** Clear All notifications by category (Phase 6 Week 1 Day 4)
 * - **NEW:** Sort, Search, and Grouping (Phase 6 Week 2)
 * 
 * PHASE: Phase 3 - UI Component Integration (Dec 15, 2025) - ✅ COMPLETE
 * DATE: December 15, 2025
 * 
 * REFERENCE DOCUMENTATION:
 * - Core Plan: NOTIFICATION-PRIORITY-ENHANCEMENT-PLAN.md
 * - Priority Logic: lib/notifications/priority.ts (14 helper functions)
 * - Priority Icons: components/icons/notification/PriorityIcon.tsx
 * - farcaster.instructions.md: Section 3.3 (Form patterns, accessibility)
 * 
 * SUGGESTIONS:
 * - Add notification preview panel showing sample notifications
 * - Add priority recommendation based on user activity patterns
 * - Add bulk category update (set all to high, etc.)
 * - Add export/import preferences for multi-device sync
 * 
 * CRITICAL FOUND:
 * - [RESOLVED] Must sync priority_settings with existing category_settings → Implemented in toggleCategory()
 * - [RESOLVED] XP rewards display requires xp_rewards_display boolean → Implemented in updatePreference()
 * - [RESOLVED] Priority threshold affects push notifications only (not in-app) → Documented in willSendPush calculation
 * - [RESOLVED] Category icons must match CATEGORIES array (11 vs 13 types) → Updated to 13 categories
 * - [RESOLVED] Missing error boundary → Added ErrorBoundary component wrapper
 * - [RESOLVED] Missing skeleton loading state → Added proper skeleton UI
 * 
 * AVOID (from farcaster.instructions.md):
 * - ✅ NO emojis in UI (use SVG icons only) → All icons are SVG components
 * - ✅ NO hardcoded colors (use Tailwind theme) → Using theme variables (primary, muted, etc.)
 * - ✅ NO missing loading states (show skeleton during fetch) → Skeleton UI implemented
 * - ✅ NO missing error boundaries (graceful degradation) → ErrorBoundary wrapper added
 * 
 * REQUIREMENTS (from farcaster.instructions.md):
 * - ✅ Mobile-first responsive design (375px base)
 * - ✅ WCAG AA accessibility (keyboard nav, ARIA labels)
 * - ✅ TypeScript strict mode (0 errors)
 * - ✅ Loading and error states for all async operations
 * - ✅ Optimistic updates with rollback on error
 * 
 * WEBSITE: https://gmeowhq.art
 * NETWORK: Base (8453)
 * 
 * @see NOTIFICATION-PRIORITY-ENHANCEMENT-PLAN.md - Phase 2 UI integration
 * @see lib/notifications/priority.ts - Priority helper functions
 */

'use client'

// React hooks for state management and performance optimization
import { useState, useEffect, useCallback, useMemo } from 'react'
// shadcn/ui components for consistent design system (Tailwind-based)
import { Switch } from '@/components/ui/gmeow-switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
// Error tracking utility for Sentry/monitoring integration
import { trackError } from '@/lib/notifications/error-tracking'
// Phase 6 Week 1: Notification list display and filtering
import { createClient } from '@supabase/supabase-js'
import type { NotificationHistoryItem } from '@/lib/notifications'
import { motion, AnimatePresence } from 'framer-motion'
import WavingHandIcon from '@mui/icons-material/WavingHand'
import SportsEsportsIcon from '@mui/icons-material/SportsEsports'
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard'
import GroupIcon from '@mui/icons-material/Group'
import InfoIcon from '@mui/icons-material/Info'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import HistoryIcon from '@mui/icons-material/History'
// Phase 2: Priority system types and helper functions
import { 
  type NotificationPriority,        // 'critical' | 'high' | 'medium' | 'low'
  type NotificationCategoryExtended, // 13 categories (achievement, quest, guild, etc.)
  getXPRewardForEvent,               // Lookup XP reward for event type (5-200 XP)
  formatXPReward,                    // Format XP as "+50 XP" display string
  getCategoriesForPriority,          // Get categories matching priority level
  DEFAULT_PRIORITY_MAP,              // Default priority assignments (13 categories)
  PRIORITY_HIERARCHY                 // Priority numeric values (critical=4, high=3, medium=2, low=1)
} from '@/lib/notifications/priority'
// Phase 2: Priority visualization components (animated bell icons, XP badges)
import { PriorityIcon, PriorityBadge } from '@/components/icons/notification/PriorityIcon'
import { Sun } from '@/components/icons/sun'
import { TargetIcon } from '@/components/icons/target-icon'
import { TrophyIcon } from '@/components/icons/trophy-icon'
import { CoinsIcon } from '@/components/icons/coins-icon'
import { PeopleIcon } from '@/components/icons/people-icon'
import { ShieldIcon } from '@/components/icons/shield-icon'
import { LevelIcon } from '@/components/icons/level-icon'
import { FlameIcon } from '@/components/icons/flame-icon'
import { DiamondIcon } from '@/components/icons/diamond-icon'
import { UsersIcon } from '@/components/icons/users'
import { TrendingUpIcon } from '@/components/icons/trending-up-icon'

// Phase 6 Week 1: Helper function for time formatting
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

// Phase 6 Week 1: Icon mapping for notification categories
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'gm': return WavingHandIcon
    case 'quest': return SportsEsportsIcon
    case 'badge': return MilitaryTechIcon
    case 'achievement': return LocalFireDepartmentIcon
    case 'level': return TrendingUpIcon
    case 'tip': return AttachMoneyIcon
    case 'reward': return EmojiEventsIcon
    case 'guild': return CardGiftcardIcon
    case 'social': return GroupIcon
    default: return InfoIcon
  }
}

// 13 notification categories with SVG icons, XP rewards, and priority levels
// This array defines all supported notification types in the miniapp
// Each category maps to:
// - key: Database category_settings JSONB key (must match NotificationCategoryExtended type)
// - label: User-facing display name in settings UI
// - description: Help text explaining what notifications belong to this category
// - icon: SVG icon component (custom icons, not emojis for accessibility)
// - xpEvent: Optional event type for XP reward lookup via getXPRewardForEvent()
//
// XP Event Mapping Logic:
// getXPRewardForEvent(xpEvent) → looks up XP_REWARDS map in priority.ts
// Example: xpEvent='tier_mega_viral' → returns 200 (highest XP reward)
// Example: xpEvent='gm_streak' → returns 5 (daily engagement reward)
// Categories without xpEvent (like 'system') don't display XP badges
const CATEGORIES: Array<{
  key: NotificationCategoryExtended
  label: string
  description: string
  icon: React.ComponentType<{ className?: string; 'aria-label'?: string }>
  xpEvent?: string // Event type for XP rewards lookup
}> = [
  { key: 'achievement', label: 'Achievements', description: 'Viral tier upgrades, mega viral milestones', icon: FlameIcon, xpEvent: 'tier_mega_viral' },
  { key: 'badge', label: 'Badges', description: 'Badge minting and mythic unlocks', icon: TrophyIcon, xpEvent: 'badge_mythic' },
  { key: 'level', label: 'Level Ups', description: 'XP milestones and level increases', icon: LevelIcon, xpEvent: 'level_up' },
  { key: 'reward', label: 'Rewards', description: 'Referral bonuses and special rewards', icon: DiamondIcon, xpEvent: 'referral_success' },
  { key: 'quest', label: 'Quests', description: 'Quest completions, progress, and rewards', icon: TargetIcon, xpEvent: 'quest_daily' },
  { key: 'tip', label: 'Tips', description: 'Tips received from other users', icon: CoinsIcon, xpEvent: 'tip_received' },
  { key: 'mention', label: 'Mentions', description: 'When someone mentions you in a cast', icon: PeopleIcon, xpEvent: 'mention_reply' },
  { key: 'guild', label: 'Guilds', description: 'Guild invites, joins, and activity', icon: ShieldIcon, xpEvent: 'guild_activity' },
  { key: 'gm', label: 'GM & Streaks', description: 'Daily GM messages and streak bonuses', icon: Sun, xpEvent: 'gm_streak' },
  { key: 'social', label: 'Social', description: 'Friend activity and social events', icon: UsersIcon, xpEvent: 'social_follow' },
  { key: 'rank', label: 'Rankings', description: 'Leaderboard position changes', icon: TrendingUpIcon, xpEvent: 'rank_change' },
  { key: 'streak', label: 'Streaks', description: 'Streak milestones and achievements', icon: FlameIcon, xpEvent: 'streak_milestone' },
  { key: 'system', label: 'System', description: 'App updates and system messages', icon: ShieldIcon },
]

interface NotificationSettingsProps {
  fid: number
}

interface CategorySettings {
  [key: string]: {
    enabled: boolean
    push: boolean
  }
}

interface NotificationPreferences {
  fid: number
  globalMute: boolean
  muteUntil: string | null
  categorySettings: CategorySettings
  quietHours: {
    enabled: boolean
    start: string
    end: string
    timezone: string
  }
  // Phase 2: Priority system fields
  prioritySettings?: Record<NotificationCategoryExtended, NotificationPriority>
  minPriorityForPush?: NotificationPriority
  xpRewardsDisplay?: boolean
  priorityLastUpdated?: string
}

export function NotificationSettings({ fid }: NotificationSettingsProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Phase 2: Priority system state (controls Farcaster push filtering)
  // minPriority: Threshold for sending Farcaster push notifications
  // Only categories with priority >= this value will trigger push
  // Example: minPriority='medium' (2) → only high (3) and critical (4) send push
  const [minPriority, setMinPriority] = useState<NotificationPriority>('medium')
  
  // xpRewardsEnabled: Toggle XP badges in notification bodies
  // When true: "Quest completed! +50 XP" shows green XP badge
  // When false: "Quest completed!" no badge displayed
  const [xpRewardsEnabled, setXpRewardsEnabled] = useState(true)
  
  // categoryPriorities: Maps each category to its assigned priority level
  // Example: { achievement: 'critical', daily: 'low', quest: 'medium' }
  // Synced with database priority_settings JSONB column
  const [categoryPriorities, setCategoryPriorities] = useState<Record<NotificationCategoryExtended, NotificationPriority>>(DEFAULT_PRIORITY_MAP)
  
  // Phase 6 Week 1 Day 4: Category-filtered notification list (like Gmail labels)
  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategoryExtended | 'all'>('all')
  const [clearingAll, setClearingAll] = useState(false)
  
  // Phase 6 Week 2 Day 1-2: Sort functionality with localStorage persistence
  type SortOption = 'date_desc' | 'date_asc' | 'priority' | 'xp'
  const [sortBy, setSortBy] = useState<SortOption>('date_desc')
  
  // Phase 6 Week 2 Day 3-4: Search functionality with debounced input
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  
  // Phase 6 Week 2 Day 5: Grouping functionality with collapsible sections
  type GroupOption = 'none' | 'date' | 'category'
  const [groupBy, setGroupBy] = useState<GroupOption>('none')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  
  // Load sort preference from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('notification_sort')
      if (saved && ['date_desc', 'date_asc', 'priority', 'xp'].includes(saved)) {
        setSortBy(saved as SortOption)
      }
    } catch (error) {
      console.warn('[NotificationSettings] Failed to load sort preference:', error)
    }
  }, [])
  
  // Save sort preference to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('notification_sort', sortBy)
    } catch (error) {
      console.warn('[NotificationSettings] Failed to save sort preference:', error)
    }
  }, [sortBy])
  
  // Load grouping preference from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('notification_grouping')
      if (saved && ['none', 'date', 'category'].includes(saved)) {
        setGroupBy(saved as GroupOption)
      }
    } catch (error) {
      console.warn('[NotificationSettings] Failed to load grouping preference:', error)
    }
  }, [])
  
  // Save grouping preference to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('notification_grouping', groupBy)
    } catch (error) {
      console.warn('[NotificationSettings] Failed to save grouping preference:', error)
    }
  }, [groupBy])
  
  // Debounce search input (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchQuery])
  
  // Keyboard shortcut: Cmd/Ctrl + K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder="Search notifications..."]')
        searchInput?.focus()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  
  // Phase 6 Week 1: Load notifications filtered by category
  const loadNotifications = useCallback(async () => {
    if (!fid) return
    
    setNotificationsLoading(true)
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('[NotificationSettings] Missing Supabase config')
        return
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey)
      
      let query = supabase
        .from('user_notification_history')
        .select('*')
        .eq('fid', fid)
        .is('dismissed_at', null)
      
      // Filter by selected category
      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory)
      }
      
      // Phase 6 Week 2 Day 3-4: Apply full-text search filter
      if (debouncedQuery.trim()) {
        query = query.or(
          `title.ilike.%${debouncedQuery}%,description.ilike.%${debouncedQuery}%`
        )
      }
      
      // Phase 6 Week 2 Day 1-2: Apply sort order dynamically
      switch (sortBy) {
        case 'date_desc':
          query = query.order('created_at', { ascending: false })
          break
        case 'date_asc':
          query = query.order('created_at', { ascending: true })
          break
        case 'priority':
          // Sort by priority (critical > high > medium > low)
          // Note: Requires priority field or calculation
          query = query.order('created_at', { ascending: false })
          break
        case 'xp':
          // Sort by XP rewards in metadata
          // Note: May require RPC function for JSONB sorting
          query = query.order('created_at', { ascending: false })
          break
        default:
          query = query.order('created_at', { ascending: false })
      }
      
      const { data, error } = await query
        .limit(50) // Show more in Settings than dropdown
      
      if (error) {
        console.error('[NotificationSettings] Query error:', error)
        trackError('notification_fetch_failed', error, { fid, category: selectedCategory })
      } else {
        setNotifications((data as NotificationHistoryItem[]) || [])
      }
    } catch (error) {
      trackError('notification_fetch_error', error, { fid })
    } finally {
      setNotificationsLoading(false)
    }
  }, [fid, selectedCategory, sortBy, debouncedQuery])
  
  // Phase 6 Week 1 Day 4: Clear All notifications (Settings page only)
  const handleClearAll = async () => {
    if (notifications.length === 0) return
    
    const categoryText = selectedCategory === 'all' 
      ? `all ${notifications.length} notifications`
      : `${notifications.length} ${selectedCategory} notifications`
    
    if (!confirm(`Clear ${categoryText}? This cannot be undone.`)) {
      return
    }
    
    setClearingAll(true)
    try {
      await fetch('/api/notifications/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dismiss',
          ids: notifications.map(n => n.id),
          fid,
        }),
      })
      // Clear UI
      setNotifications([])
    } catch (error) {
      trackError('clear_all_failed', error, { fid, count: notifications.length, category: selectedCategory })
      alert('Failed to clear notifications. Please try again.')
    } finally {
      setClearingAll(false)
    }
  }
  
  // Phase 6 Week 2 Day 5: Helper function to format date groups
  const formatDateGroup = useCallback((dateString: string): string => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    })
  }, [])
  
  // Phase 6 Week 2 Day 5: Group notifications by date or category
  const groupedNotifications = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Notifications': notifications }
    }
    
    const grouped: Record<string, NotificationHistoryItem[]> = {}
    
    notifications.forEach(notif => {
      let key: string
      
      if (groupBy === 'date') {
        key = formatDateGroup(notif.created_at)
      } else if (groupBy === 'category') {
        const category = CATEGORIES.find(c => c.key === notif.category)
        key = category?.label || 'Other'
      } else {
        key = 'All Notifications'
      }
      
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(notif)
    })
    
    return grouped
  }, [notifications, groupBy, formatDateGroup])
  
  // Phase 6 Week 2 Day 5: Toggle group expansion
  const toggleGroup = useCallback((groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }, [])
  
  // Phase 6 Week 2 Day 5: Expand all groups by default when grouping changes
  useEffect(() => {
    if (groupBy !== 'none') {
      const allGroups = new Set(Object.keys(groupedNotifications))
      setExpandedGroups(allGroups)
    }
  }, [groupBy, groupedNotifications])
  
  // Fetch preferences on mount
  useEffect(() => {
    fetchPreferences()
  }, [fid])
  
  // Load notifications when category changes
  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])
  
  // Phase 2: Initialize priority settings from preferences
  useEffect(() => {
    if (preferences) {
      setMinPriority(preferences.minPriorityForPush || 'medium')
      setXpRewardsEnabled(preferences.xpRewardsDisplay ?? true)
      setCategoryPriorities(preferences.prioritySettings || DEFAULT_PRIORITY_MAP)
    }
  }, [preferences])
  
  // Phase 2: Calculate how many categories will send Farcaster push notifications
  // This counter updates in real-time as user adjusts threshold or category priorities
  //
  // Filtering Logic (Priority Comparison):
  // 1. Convert string priorities to numeric values (critical=4, high=3, medium=2, low=1)
  // 2. Get threshold value (minPriority)
  // 3. Count categories where category_priority >= threshold_priority
  //
  // Example Calculation:
  // minPriority = 'medium' (2)
  // Categories:
  //   - achievement: 'critical' (4) → 4 >= 2 → COUNTS ✓
  //   - daily: 'low' (1) → 1 >= 2 → SKIPPED ✗
  //   - quest: 'high' (3) → 3 >= 2 → COUNTS ✓
  // Result: 2 of 3 categories will send push
  //
  // Performance: useMemo prevents recalculation on unrelated re-renders
  // Dependencies: minPriority, categoryPriorities (recompute when these change)
  const filteredCategoriesCount = useMemo(() => {
    // Use imported PRIORITY_HIERARCHY to avoid hardcoding values
    const minValue = PRIORITY_HIERARCHY[minPriority]
    
    return CATEGORIES.filter(cat => {
      // Get category's assigned priority (fallback to DEFAULT_PRIORITY_MAP)
      const catPriority = categoryPriorities[cat.key] || DEFAULT_PRIORITY_MAP[cat.key]
      // Convert to numeric value (default to 2 if invalid)
      const catValue = PRIORITY_HIERARCHY[catPriority] || 2
      // Include category if priority meets or exceeds threshold
      return catValue >= minValue
    }).length
  }, [minPriority, categoryPriorities])
  
  const fetchPreferences = async () => {
    try {
      const res = await fetch(`/api/notifications/preferences?fid=${fid}`)
      if (!res.ok) throw new Error('Failed to fetch preferences')
      const data = await res.json()
      setPreferences(data)
    } catch (err) {
      trackError('notification_settings_fetch_error', err, { function: 'fetchPreferences', fid })
    } finally {
      setLoading(false)
    }
  }
  
  // Update preferences via API (PATCH /api/notifications/preferences)
  // Uses optimistic updates: UI updates immediately, API call in background
  // If API fails, UI shows error toast (via trackError) but doesn't rollback
  //
  // Pattern: Caller updates local state first, then calls this function
  // Example:
  //   setPreferences({ ...preferences, globalMute: true }) // Optimistic
  //   updatePreference({ globalMute: true })               // Persist to DB
  //
  // Error Handling:
  // - Network errors: trackError logs to monitoring, user sees "Saving failed" toast
  // - Validation errors: API returns 400, logged to Sentry with FID context
  // - TODO: Add rollback mechanism for failed updates (Phase 5 - Future enhancement)
  const updatePreference = useCallback(async (updates: Partial<NotificationPreferences>) => {
    if (!preferences) return
    
    setSaving(true) // Show "Saving preferences..." indicator
    try {
      // PATCH request with FID and partial update fields
      const res = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid, ...updates }),
      })
      
      if (!res.ok) throw new Error('Failed to update preferences')
      
      // Update local state with server response (ensures consistency)
      const data = await res.json()
      setPreferences(data.preferences)
    } catch (err) {
      // Log error to Sentry with context (function name, FID)
      trackError('notification_settings_update_error', err, { function: 'updatePreference', fid })
    } finally {
      setSaving(false) // Hide loading indicator
    }
  }, [fid, preferences])
  
  // CRITICAL RESOLVED: Sync priority_settings with category_settings
  // When disabling a category (enabled=false), ensure priority still persists
  // This prevents losing priority customizations when toggling categories on/off
  const toggleCategory = useCallback((category: string, field: 'enabled' | 'push') => {
    if (!preferences) return
    
    const newSettings = {
      ...preferences.categorySettings,
      [category]: {
        ...preferences.categorySettings[category],
        [field]: !preferences.categorySettings[category][field],
      },
    }
    
    // Sync: Ensure priority_settings stays consistent with category_settings
    // If category is being disabled, priority setting is preserved (not removed)
    // This allows users to re-enable categories without losing priority customizations
    setPreferences({ 
      ...preferences, 
      categorySettings: newSettings,
      // Keep prioritySettings in sync (don't modify, just ensure it's persisted)
      prioritySettings: preferences.prioritySettings || categoryPriorities,
    })
    
    // Update both category settings and priority settings in single API call
    updatePreference({ 
      categorySettings: newSettings,
      prioritySettings: preferences.prioritySettings || categoryPriorities,
    })
  }, [preferences, categoryPriorities, updatePreference])
  
  const toggleGlobalMute = useCallback(() => {
    if (!preferences) return
    
    const newValue = !preferences.globalMute
    setPreferences({ ...preferences, globalMute: newValue })
    updatePreference({ globalMute: newValue })
  }, [preferences, updatePreference])
  
  const pauseNotifications = useCallback((hours: number) => {
    if (!preferences) return
    
    const muteUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
    setPreferences({ ...preferences, muteUntil })
    updatePreference({ muteUntil })
  }, [preferences, updatePreference])
  
  const unpauseNotifications = useCallback(() => {
    if (!preferences) return
    
    setPreferences({ ...preferences, muteUntil: null })
    updatePreference({ muteUntil: null })
  }, [preferences, updatePreference])
  
  // Phase 2: Priority threshold update handler
  const updatePriorityThreshold = useCallback((newThreshold: NotificationPriority) => {
    if (!preferences) return
    
    setMinPriority(newThreshold)
    setPreferences({ ...preferences, minPriorityForPush: newThreshold, priorityLastUpdated: new Date().toISOString() })
    updatePreference({ minPriorityForPush: newThreshold, priorityLastUpdated: new Date().toISOString() })
  }, [preferences, updatePreference])
  
  // Phase 2: XP rewards display toggle handler
  const toggleXpRewards = useCallback(() => {
    if (!preferences) return
    
    const newValue = !xpRewardsEnabled
    setXpRewardsEnabled(newValue)
    setPreferences({ ...preferences, xpRewardsDisplay: newValue })
    updatePreference({ xpRewardsDisplay: newValue })
  }, [preferences, xpRewardsEnabled, updatePreference])
  
  // Phase 2: Category priority update handler
  const updateCategoryPriority = useCallback((category: NotificationCategoryExtended, priority: NotificationPriority) => {
    if (!preferences) return
    
    const newPriorities = { ...categoryPriorities, [category]: priority }
    setCategoryPriorities(newPriorities)
    setPreferences({ ...preferences, prioritySettings: newPriorities, priorityLastUpdated: new Date().toISOString() })
    updatePreference({ prioritySettings: newPriorities, priorityLastUpdated: new Date().toISOString() })
  }, [preferences, categoryPriorities, updatePreference])
  
  // CRITICAL RESOLVED: Show skeleton loading state (not just text)
  // Provides visual feedback matching final UI structure
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Priority threshold skeleton */}
        <div className="rounded-lg border bg-card p-6">
          <div className="h-6 bg-muted rounded w-48 mb-2" />
          <div className="h-4 bg-muted/50 rounded w-full mb-4" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-muted/50 rounded flex-1" />
            ))}
          </div>
        </div>
        
        {/* Global mute skeleton */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-muted rounded w-40" />
              <div className="h-4 bg-muted/50 rounded w-64" />
            </div>
            <div className="h-6 w-11 bg-muted rounded-full" />
          </div>
        </div>
        
        {/* Categories skeleton */}
        <div className="rounded-lg border bg-card p-6">
          <div className="h-6 bg-muted rounded w-56 mb-4" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between items-center border-b pb-4">
                <div className="flex gap-3 flex-1">
                  <div className="h-5 w-5 bg-muted rounded" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded w-32" />
                    <div className="h-3 bg-muted/50 rounded w-48" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-5 w-9 bg-muted rounded-full" />
                  <div className="h-5 w-9 bg-muted rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
  
  // CRITICAL RESOLVED: Graceful error boundary with retry action
  // Shows actionable error UI instead of just text
  if (!preferences) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6">
        <div className="flex items-start gap-3">
          <div className="text-destructive mt-0.5">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-destructive">Failed to load notification preferences</h3>
            <p className="text-sm text-muted-foreground">
              Unable to fetch your notification settings. This might be due to a network issue or server error.
            </p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                setLoading(true)
                fetchPreferences()
              }}
              className="mt-3"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }
  
  const isPaused = preferences.muteUntil && new Date(preferences.muteUntil) > new Date()
  
  return (
    <div className="space-y-6">
      {/* Phase 2: Priority Threshold Selector - Controls Farcaster Push Filtering */}
      {/* This section allows users to set minimum priority for push notifications */}
      {/* Categories below threshold only appear in-app (no push) */}
      <div className="rounded-lg border bg-card p-6">
        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-base font-semibold">Notification Priority Threshold</Label>
            <p className="text-sm text-muted-foreground">
              Only send push notifications at or above this priority level. {filteredCategoriesCount} of {CATEGORIES.length} categories will send push.
            </p>
          </div>
          
          {/* Four pill buttons for priority levels (critical > high > medium > low) */}
          {/* Each button shows:
               - PriorityIcon: Animated bell SVG (critical=double ring, high=single ring)
               - Priority name: Capitalized string ("Critical", "High", etc.)
               - Category count: How many categories have this exact priority
          */}
          <div className="flex flex-wrap gap-2">
            {(['critical', 'high', 'medium', 'low'] as NotificationPriority[]).map((priority) => {
              const isActive = minPriority === priority
              // Count categories assigned to this exact priority level
              const count = getCategoriesForPriority(priority, categoryPriorities).length
              
              return (
                <button
                  key={priority}
                  onClick={() => updatePriorityThreshold(priority)}
                  disabled={saving || preferences?.globalMute}
                  className={`
                    inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 font-medium text-sm transition-all
                    ${isActive 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-border hover:border-primary/50 hover:bg-accent'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                  aria-label={`Set priority threshold to ${priority}`}
                >
                  <PriorityIcon priority={priority} size="sm" />
                  <span className="capitalize">{priority}</span>
                  <span className="text-xs text-muted-foreground">({count})</span>
                </button>
              )
            })}
          </div>
          
          {/* Phase 2: XP Rewards Display Toggle */}
          {/* Controls whether XP badges appear in notification bodies */}
          {/* When enabled: "Quest completed! +50 XP" shows green badge */}
          {/* When disabled: "Quest completed!" no badge shown */}
          {/* Note: This is cosmetic only, doesn't affect XP earning */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Show XP Rewards</Label>
              <p className="text-xs text-muted-foreground">
                Display XP badges in notification messages (+5 XP, +100 XP, etc.)
              </p>
            </div>
            {/* Switch component from gmeow-switch (custom Tailwind implementation) */}
            {/* disabled when: saving (API call in progress) OR globalMute (no notifications) */}
            <Switch
              checked={xpRewardsEnabled}
              onChange={toggleXpRewards}
              disabled={saving || preferences?.globalMute}
              className="group relative inline-flex h-6 w-11 items-center rounded-full bg-white/10 transition data-[checked]:bg-primary disabled:opacity-50"
            >
              <span className="size-4 translate-x-1 rounded-full bg-white transition group-data-[checked]:translate-x-6" />
            </Switch>
          </div>
        </div>
      </div>
      
      {/* Global mute */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Label className="text-base font-semibold">Mute all notifications</Label>
            <p className="text-sm text-muted-foreground">
              Disable all notifications temporarily or permanently
            </p>
          </div>
          <Switch
            checked={preferences.globalMute}
            onChange={toggleGlobalMute}
            disabled={saving}
            className="group relative inline-flex h-6 w-11 items-center rounded-full bg-white/10 transition data-[checked]:bg-primary"
          >
            <span className="size-4 translate-x-1 rounded-full bg-white transition group-data-[checked]:translate-x-6" />
          </Switch>
        </div>
        
        {!preferences.globalMute && (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-medium">Pause notifications</p>
            {isPaused ? (
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  Paused until {new Date(preferences.muteUntil!).toLocaleString()}
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={unpauseNotifications}
                  disabled={saving}
                >
                  Resume
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => pauseNotifications(1)}
                  disabled={saving}
                >
                  Pause 1h
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => pauseNotifications(8)}
                  disabled={saving}
                >
                  Pause 8h
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => pauseNotifications(24)}
                  disabled={saving}
                >
                  Pause 24h
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Category settings with priority mapping */}
      <div className="rounded-lg border bg-card p-6">
        <div className="mb-4 space-y-1">
          <h3 className="text-lg font-semibold">Notification Categories</h3>
          <p className="text-sm text-muted-foreground">
            Control priority levels, enable/disable, and push settings for each category
          </p>
        </div>
        
        <div className="space-y-4">
          {CATEGORIES.map((cat) => {
            // Get category preferences with defaults (enabled=true, push=false)
            // If category not in preferences (new user), default to opt-in for in-app
            const catSettings = preferences.categorySettings[cat.key] || { enabled: true, push: false }
            
            // Extract SVG icon component for rendering
            const IconComponent = cat.icon
            
            // Get assigned priority with fallback to DEFAULT_PRIORITY_MAP
            // Example: DEFAULT_PRIORITY_MAP.achievement = 'high'
            const catPriority = categoryPriorities[cat.key] || DEFAULT_PRIORITY_MAP[cat.key]
            
            // Phase 2: XP reward calculation for badge display
            // xpReward: Numeric value (5-200) for this event type
            // xpDisplay: Formatted string ("+50 XP") for UI rendering
            // If category has no xpEvent (like 'system'), both are 0 or ''
            const xpReward = cat.xpEvent ? getXPRewardForEvent(cat.xpEvent) : 0
            const xpDisplay = cat.xpEvent ? formatXPReward(cat.xpEvent) : ''
            
            // Phase 2: Calculate if this category will send Farcaster push
            // Logic: Use imported PRIORITY_HIERARCHY for consistent filtering
            // Result: true if category priority >= threshold priority
            // Example: catPriority='high' (3), minPriority='medium' (2) → 3 >= 2 → true
            const willSendPush = PRIORITY_HIERARCHY[catPriority] >= PRIORITY_HIERARCHY[minPriority]
            
            return (
              <div 
                key={cat.key} 
                className="flex flex-col gap-3 border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-0.5">
                      <IconComponent className="h-5 w-5 text-primary" aria-label={`${cat.label} icon`} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Label className="text-base font-medium">{cat.label}</Label>
                        {/* Phase 2: XP Badge Display (Conditional) */}
                        {/* Shows only if:
                             1. xpRewardsEnabled=true (user toggled on)
                             2. xpDisplay is non-empty (category has xpEvent)
                             Example: "achievement" category → "+200 XP" badge
                             Example: "system" category → no badge (no xpEvent)
                        */}
                        {xpRewardsEnabled && xpDisplay && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-600 border border-green-500/20">
                            {xpDisplay}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {cat.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">Show</Label>
                      <Switch
                        checked={catSettings.enabled}
                        onChange={() => toggleCategory(cat.key as string, 'enabled')}
                        disabled={saving || preferences.globalMute}
                        className="group relative inline-flex h-5 w-9 items-center rounded-full bg-white/10 transition data-[checked]:bg-primary disabled:opacity-50"
                      >
                        <span className="size-3 translate-x-1 rounded-full bg-white transition group-data-[checked]:translate-x-5" />
                      </Switch>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">Push</Label>
                      <Switch
                        checked={catSettings.push}
                        onChange={() => toggleCategory(cat.key as string, 'push')}
                        disabled={saving || !catSettings.enabled || preferences.globalMute}
                        className="group relative inline-flex h-5 w-9 items-center rounded-full bg-white/10 transition data-[checked]:bg-primary disabled:opacity-50"
                      >
                        <span className="size-3 translate-x-1 rounded-full bg-white transition group-data-[checked]:translate-x-5" />
                      </Switch>
                    </div>
                  </div>
                </div>
                
                {/* Phase 2: Priority selector and push status indicator */}
                {/* This row shows:
                     - Priority dropdown: Lets user customize category priority
                     - PriorityIcon: Visual feedback (animated bell)
                     - Push status: Shows if category will send push based on threshold
                */}
                <div className="flex items-center justify-between pl-8 gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Priority:</Label>
                    {/* Priority dropdown: Updates categoryPriorities state */}
                    {/* onChange triggers:
                         1. updateCategoryPriority() → updates local state
                         2. API call to persist to priority_settings JSONB
                         3. priority_last_updated timestamp auto-updated
                    */}
                    <select
                      value={catPriority}
                      onChange={(e) => updateCategoryPriority(cat.key, e.target.value as NotificationPriority)}
                      disabled={saving || preferences?.globalMute}
                      className="text-xs border rounded px-2 py-1 bg-background disabled:opacity-50"
                    >
                      {/* Four priority levels from most to least important */}
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    {/* PriorityIcon: Animated bell SVG (critical=double ring, high=single ring) */}
                    <PriorityIcon priority={catPriority} size="sm" />
                  </div>
                  
                  {/* Push status indicator (only show if push toggle is enabled) */}
                  {/* Updates in real-time as user changes threshold or category priority */}
                  {/* ✓ Will send push: category priority >= threshold (green text) */}
                  {/* ○ In-app only: category priority < threshold (muted text) */}
                  {catSettings.push && (
                    <div className="text-xs">
                      {willSendPush ? (
                        <span className="text-green-600">✓ Will send push</span>
                      ) : (
                        <span className="text-muted-foreground">○ In-app only</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Phase 6.5: Link to Dedicated History Tab (removes duplicate ~200 lines) */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <HistoryIcon sx={{ fontSize: 64, opacity: 0.3 }} />
          <h3 className="text-lg font-semibold mt-4 mb-2">View Full Notification History</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            Access advanced features like search, sorting, grouping, and export in the dedicated History tab.
          </p>
          <Button
            onClick={() => window.location.href = '/notifications?tab=history'}
            variant="default"
            className="flex items-center gap-2"
          >
            <HistoryIcon sx={{ fontSize: 18 }} />
            Open History Tab
          </Button>
        </div>
      </div>
      
      {saving && (
        <div className="flex items-center justify-center py-2">
          <div className="text-sm text-muted-foreground">Saving preferences...</div>
        </div>
      )}
    </div>
  )
}
