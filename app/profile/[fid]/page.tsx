'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/lib/hooks/use-auth'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ProfileStats } from '@/components/profile/ProfileStats'
import { SocialLinks } from '@/components/profile/SocialLinks'
import { ProfileTabs } from '@/components/profile/ProfileTabs'
import { QuestActivity } from '@/components/profile/QuestActivity'
import { BadgeCollection } from '@/components/profile/BadgeCollection'
import { ActivityTimeline } from '@/components/profile/ActivityTimeline'
import { ProfileEditModal } from '@/components/profile/ProfileEditModal'
import { profileSectionVariants, profileSectionTransition } from '@/components/profile/animations'
import type { ProfileData } from '@/lib/profile/types'
import type { Badge } from '@/components/profile/BadgeCollection'
import type { QuestCompletion } from '@/components/profile/QuestActivity'
import type { ActivityItem } from '@/components/profile/ActivityTimeline'

type TabKey = 'overview' | 'quests' | 'badges' | 'activity'

/**
 * ProfilePage Component
 * 
 * Dynamic profile page for viewing user profiles
 * Route: /profile/[fid]
 * 
 * Phase 3 Integration:
 * - Fetches profile data from API
 * - Displays all 7 profile components
 * - Tab-based navigation
 * - Mobile-responsive layout
 * 
 * Features:
 * - Overview tab: Stats + Social links
 * - Quests tab: Quest completion history
 * - Badges tab: Badge collection gallery
 * - Activity tab: Activity timeline
 * 
 * @example
 * ```tsx
 * // Route: /profile/123456
 * <ProfilePage />
 * ```
 */
export default function ProfilePage() {
  const params = useParams()
  const fid = params.fid as string
  const { fid: currentUserFid } = useAuth()

  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Phase 4: Real data with loading states
  const [badges, setBadges] = useState<Badge[]>([])
  const [quests, setQuests] = useState<QuestCompletion[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [badgesLoading, setBadgesLoading] = useState(false)
  const [questsLoading, setQuestsLoading] = useState(false)
  const [activitiesLoading, setActivitiesLoading] = useState(false)

  // Memoize tab configs for performance (LinkedIn pattern)
  const tabConfigs = useMemo(() => [
    { id: 'overview' as const, label: 'Overview', icon: '📊', badge: undefined, key: '1' },
    { id: 'quests' as const, label: 'Quests', icon: '⚔️', badge: quests.length, key: '2' },
    { id: 'badges' as const, label: 'Badges', icon: '🏅', badge: badges.length, key: '3' },
    { id: 'activity' as const, label: 'Activity', icon: '📈', badge: undefined, key: '4' },
  ], [quests.length, badges.length])

  // Keyboard shortcuts (Twitter/GitHub pattern): Cmd/Ctrl + 1-4 to switch tabs
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '4') {
        e.preventDefault()
        const tabIndex = parseInt(e.key) - 1
        if (tabConfigs[tabIndex]) {
          setActiveTab(tabConfigs[tabIndex].id)
        }
      }
      // Arrow keys for tab navigation (accessibility)
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const currentIndex = tabConfigs.findIndex(t => t.id === activeTab)
        if (e.key === 'ArrowRight' && currentIndex < tabConfigs.length - 1) {
          e.preventDefault()
          setActiveTab(tabConfigs[currentIndex + 1].id)
        } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
          e.preventDefault()
          setActiveTab(tabConfigs[currentIndex - 1].id)
        }
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [activeTab, tabConfigs])

  // Fetch profile data
  useEffect(() => {
    async function fetchProfile() {
      if (!fid) return

      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/user/profile/${fid}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('Profile not found')
          } else {
            setError('Failed to load profile')
          }
          return
        }

        const data = await response.json()
        if (data.success && data.data) {
          setProfile(data.data)
        } else {
          setError('Invalid profile data')
        }
      } catch (err) {
        console.error('Profile fetch error:', err)
        setError('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    void fetchProfile()
  }, [fid])

  // Fetch quest completions when quests tab is active
  useEffect(() => {
    async function fetchQuests() {
      if (activeTab !== 'quests' || !fid) return

      try {
        setQuestsLoading(true)
        const response = await fetch(`/api/user/quests/${fid}?status=all&sort=recent&limit=20`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.quests) {
            setQuests(data.quests)
          }
        }
      } catch (err) {
        console.error('Quest fetch error:', err)
      } finally {
        setQuestsLoading(false)
      }
    }

    void fetchQuests()
  }, [fid, activeTab])

  // Fetch badges when badges tab is active
  useEffect(() => {
    async function fetchBadges() {
      if (activeTab !== 'badges' || !fid) return

      try {
        setBadgesLoading(true)
        const response = await fetch(`/api/user/badges/${fid}?tier=all`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.badges) {
            setBadges(data.badges)
          }
        }
      } catch (err) {
        console.error('Badge fetch error:', err)
      } finally {
        setBadgesLoading(false)
      }
    }

    void fetchBadges()
  }, [fid, activeTab])

  // Fetch activity when activity tab is active
  useEffect(() => {
    async function fetchActivity() {
      if (activeTab !== 'activity' || !fid) return

      try {
        setActivitiesLoading(true)
        const response = await fetch(`/api/user/activity/${fid}?limit=20&offset=0`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.activities) {
            setActivities(data.activities)
          }
        }
      } catch (err) {
        console.error('Activity fetch error:', err)
      } finally {
        setActivitiesLoading(false)
      }
    }

    void fetchActivity()
  }, [fid, activeTab])

  // Render tab content with useCallback for performance (LinkedIn pattern)
  // MUST be before early returns to maintain hook order
  const renderTabContent = useCallback(() => {
    if (!profile) return null

    switch (activeTab) {
      case 'overview':
        return (
          <motion.div
            key="overview"
            variants={profileSectionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={profileSectionTransition}
            className="space-y-6"
          >
            <ProfileStats stats={profile.stats} />
            <SocialLinks
              socialLinks={profile.social_links}
              wallet={profile.wallet}
            />
          </motion.div>
        )

      case 'quests':
        return (
          <motion.div
            key="quests"
            variants={profileSectionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={profileSectionTransition}
          >
            <QuestActivity quests={quests} loading={questsLoading} />
          </motion.div>
        )

      case 'badges':
        return (
          <motion.div
            key="badges"
            variants={profileSectionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={profileSectionTransition}
          >
            <BadgeCollection badges={badges} loading={badgesLoading} />
          </motion.div>
        )

      case 'activity':
        return (
          <motion.div
            key="activity"
            variants={profileSectionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={profileSectionTransition}
          >
            <ActivityTimeline activities={activities} loading={activitiesLoading} />
          </motion.div>
        )

      default:
        return null
    }
  }, [activeTab, profile, quests, questsLoading, badges, badgesLoading, activities, activitiesLoading])

  // Handle profile save from edit modal
  const handleProfileSave = useCallback(async (data: any) => {
    try {
      const response = await fetch(`/api/user/profile/${fid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update profile')
      }

      const result = await response.json()
      if (result.success && result.data) {
        setProfile(result.data)
        setIsEditModalOpen(false)
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
      alert('Failed to update profile. Please try again.')
    }
  }, [fid])

  // Loading state
  if (loading) {
    return (
      <div className="mx-auto min-h-screen max-w-6xl px-4 py-8">
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="h-64 w-full animate-pulse rounded-2xl bg-white/5" />
          {/* Stats skeleton */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
          {/* Tabs skeleton */}
          <div className="h-12 w-full animate-pulse rounded-xl bg-white/5" />
        </div>
      </div>
    )
  }

  // Error state
  if (error || !profile) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 mx-auto">
            <svg className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">
            {error || 'Profile Not Found'}
          </h1>
          <p className="text-sm text-white/60">
            The profile you're looking for doesn't exist or has been removed.
          </p>
          <a
            href="/Dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-white/10"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-8">
      {/* Skip to content link (Accessibility - WCAG 2.1) */}
      <a
        href="#profile-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        Skip to profile content
      </a>

      <div className="space-y-6">
        {/* Profile Header */}
        <ProfileHeader
          profile={profile}
          isOwner={currentUserFid === profile.fid}
          onEditClick={() => setIsEditModalOpen(true)}
        />

        {/* Edit Profile Modal */}
        {profile && (
          <ProfileEditModal
            profile={profile}
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSave={handleProfileSave}
          />
        )}

        {/* Keyboard shortcuts hint (Twitter/GitHub pattern) */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-white/40">
            <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono">⌘</kbd> +{' '}
            <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono">1-4</kbd> to switch tabs
          </div>
        </div>

        {/* Tab Navigation with ARIA */}
        <nav aria-label="Profile sections" role="tablist">
          <ProfileTabs
            tabs={tabConfigs}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as TabKey)}
          />
        </nav>

        {/* Tab Content with ARIA and AnimatePresence for smooth transitions */}
        <main
          id="profile-content"
          role="tabpanel"
          aria-label={`${activeTab} content`}
          className="min-h-[400px]"
        >
          <AnimatePresence mode="wait">
            {renderTabContent()}
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
