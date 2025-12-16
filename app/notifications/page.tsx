'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NotificationSettings } from '@/components/notifications/NotificationSettings'
import { NotificationHistory } from '@/components/notifications/NotificationHistory'
import { NotificationListSkeleton } from '@/components/ui/skeleton'
import { createClient } from '@supabase/supabase-js'
import { trackError } from '@/lib/notifications/error-tracking'
import type { NotificationHistoryItem } from '@/lib/notifications'
import NotificationsIcon from '@mui/icons-material/Notifications'
import SettingsIcon from '@mui/icons-material/Settings'
import HistoryIcon from '@mui/icons-material/History'
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

/**
 * Notifications Page - Professional Implementation
 * 
 * Route: /notifications
 * 
 * Features:
 * - Tab 1: History (all notifications with filters)
 * - Tab 2: Settings (preferences from Phase 3)
 * - Responsive layout
 * - Real-time updates
 * - Category filtering
 * 
 * @see NOTIFICATION-SYSTEM-AUDIT.md Phase 3 & 4
 */

// Get icon for category
function getCategoryIcon(category: string) {
  switch (category) {
    case 'gm': return WavingHandIcon
    case 'quest': return SportsEsportsIcon
    case 'badge': return MilitaryTechIcon
    case 'level': return TrendingUpIcon
    case 'streak': return LocalFireDepartmentIcon
    case 'tip': return AttachMoneyIcon
    case 'achievement': return EmojiEventsIcon
    case 'reward': return CardGiftcardIcon
    case 'guild': return GroupIcon
    default: return InfoIcon
  }
}

// Format time ago
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hr${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays === 1) return '1 day ago'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}

export default function NotificationsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { fid, isLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  
  // Phase 6 Week 3: Support URL tab parameter (Day 1)
  // Example: /notifications?tab=settings
  const defaultTab = searchParams.get('tab') || 'history'

  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect if no FID
  useEffect(() => {
    if (!mounted || isLoading) return
    
    if (!fid) {
      const timer = setTimeout(() => {
        router.push('/Dashboard')
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [mounted, isLoading, fid, router])

  if (!mounted || isLoading || !fid) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-8 w-8 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          </div>
          <NotificationListSkeleton count={5} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <NotificationsIcon sx={{ fontSize: 32 }} className="text-primary-500" />
          <h1 className="text-3xl font-bold">Notifications</h1>
        </div>

        {/* Tabs - Phase 6 Week 3: Support URL tab parameter (Day 1) */}
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="history" className="flex items-center gap-2">
              <HistoryIcon sx={{ fontSize: 18 }} />
              History
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <SettingsIcon sx={{ fontSize: 18 }} />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* History Tab - Phase 6 Week 1 & 2 Features */}
          <TabsContent value="history" className="space-y-4">
            <NotificationHistory fid={fid} />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <NotificationSettings fid={fid} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
