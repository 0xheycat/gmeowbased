'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ProfileStats } from '@/components/profile/ProfileStats'
import { SocialLinks } from '@/components/profile/SocialLinks'
import { ProfileTabs } from '@/components/profile/ProfileTabs'
import { QuestActivity } from '@/components/profile/QuestActivity'
import { BadgeCollection } from '@/components/profile/BadgeCollection'
import { ActivityTimeline } from '@/components/profile/ActivityTimeline'
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

  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Mock data (will be replaced with API calls in Phase 4)
  const [badges] = useState<Badge[]>([])
  const [quests] = useState<QuestCompletion[]>([])
  const [activities] = useState<ActivityItem[]>([])

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
        if (data.success && data.profile) {
          setProfile(data.profile)
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

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <ProfileStats stats={profile.stats} loading={loading} />
            <SocialLinks
              socialLinks={profile.social_links}
              walletData={profile.wallet_data}
              loading={loading}
            />
          </div>
        )

      case 'quests':
        return <QuestActivity quests={quests} loading={loading} />

      case 'badges':
        return <BadgeCollection badges={badges} loading={loading} />

      case 'activity':
        return <ActivityTimeline activities={activities} loading={loading} />

      default:
        return null
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-8">
      <div className="space-y-6">
        {/* Profile Header */}
        <ProfileHeader
          profile={profile}
          isOwner={false} // Will check against current user in Phase 4
          loading={loading}
        />

        {/* Tab Navigation */}
        <ProfileTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          showBadgeCounts
          badgeCount={badges.length}
        />

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}
