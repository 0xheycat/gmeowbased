'use client'

import Link from 'next/link'
import { ProfileHeader, ActivityFeed, type UserProfile, type Activity } from '../../../components/features/ProfileComponents'
import { ReferralCard } from '@/components/features/ReferralCard'
import { useUser } from '@/contexts/UserContext'
import { useProfile, useActivities } from '@/hooks/useApi'
import { BaseIdentity } from '@/components/base'
import { Card, CardBody } from '@/components/ui/tailwick-primitives'
import { useAccount } from 'wagmi'

export default function ProfilePage() {
  const user = useUser()
  const { address } = useAccount()
  const { data: profileData, loading: profileLoading, error: profileError } = useProfile(user.fid)
  const { data: activitiesData, loading: activitiesLoading } = useActivities(user.fid, 7)

  // Loading state
  if (profileLoading) {
    return (
      <div className="page-bg-profile theme-text-primary p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <div className="foundation-spinner"></div>
            <p className="mt-4 foundation-text-muted">Loading profile...</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (profileError || !profileData) {
    return (
      <div className="page-bg-profile theme-text-primary p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <p className="text-red-400 mb-4">{profileError || 'Failed to load profile'}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="foundation-btn-primary"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Transform API data to component format
  const profile: UserProfile = {
    id: profileData.id,
    username: profileData.username,
    avatar: profileData.avatar || user.avatar,
    level: profileData.level,
    xp: profileData.xp,
    xpToNextLevel: profileData.xpToNextLevel,
    rank: profileData.rank,
    totalUsers: profileData.totalUsers,
    streak: profileData.streak,
    badgesEarned: profileData.badgesEarned,
    questsCompleted: profileData.questsCompleted,
    guildsJoined: profileData.guildsJoined,
  }

  const activities: Activity[] = activitiesData || [
    {
      id: '1',
    type: 'badge',
    title: 'New Badge Unlocked: Globe Trotter',
    description: 'Earned for completing cross-chain transactions',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  },
  {
    id: '3',
    type: 'guild',
    title: 'Joined Guild: Multi-Chain Maxis',
    description: 'Welcome to the multi-chain community!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
  },
  {
    id: '4',
    type: 'gm',
    title: 'Daily GM Completed',
    description: '23 day streak maintained! Keep it up! 🔥',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
  },
  {
    id: '5',
    type: 'level',
    title: 'Level Up! Now Level 12',
    description: 'You earned 500 bonus XP for reaching level 12',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  },
  {
    id: '6',
    type: 'quest',
    title: 'Quest Started: Deploy a Smart Contract',
    description: 'Begin your journey as a smart contract developer',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
  },
  {
    id: '7',
    type: 'badge',
    title: 'New Badge Unlocked: Week Warrior',
    description: 'Maintained a 7-day streak',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
  },
]

  return (
    <div className="page-bg-profile p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/app" 
            className="inline-flex items-center gap-2 theme-text-secondary hover:theme-text-primary transition-colors mb-4"
          >
            <span>←</span> Back to Home
          </Link>
        </div>

        {/* Profile Header */}
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Original Profile Header */}
          <div className="lg:col-span-2">
            <ProfileHeader profile={profile} />
          </div>

          {/* Right: Base Identity Card */}
          {address && (
            <div>
              <Card gradient="cyan" border>
                <CardBody>
                  <h3 className="text-lg font-bold theme-text-primary mb-4">Onchain Identity</h3>
                  <BaseIdentity address={address} variant="detailed" />
                  <div className="mt-4 pt-4 border-t theme-border-subtle">
                    <div className="text-xs theme-text-tertiary text-center">
                      Verified by Base 💙
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link 
            href="/app/quests"
            className="rounded-xl bg-purple-600/20 border border-purple-600/30 p-6 hover:bg-purple-600/30 transition-all hover:scale-105 cursor-pointer"
          >
            <div className="text-3xl mb-2">🎯</div>
            <div className="font-bold theme-text-primary">Quests</div>
            <div className="text-sm text-purple-300">{profile.questsCompleted} completed</div>
          </Link>

          <Link 
            href="/app/badges"
            className="rounded-xl bg-yellow-600/20 border border-yellow-600/30 p-6 hover:bg-yellow-600/30 transition-all hover:scale-105 cursor-pointer"
          >
            <div className="text-3xl mb-2">🏅</div>
            <div className="font-bold theme-text-primary">Badges</div>
            <div className="text-sm text-yellow-300">{profile.badgesEarned} earned</div>
          </Link>

          <Link 
            href="/app/guilds"
            className="rounded-xl bg-green-600/20 border border-green-600/30 p-6 hover:bg-green-600/30 transition-all hover:scale-105 cursor-pointer"
          >
            <div className="text-3xl mb-2">⚔️</div>
            <div className="font-bold theme-text-primary">Guilds</div>
            <div className="text-sm text-green-300">{profile.guildsJoined} joined</div>
          </Link>

          <Link 
            href="/app/leaderboard"
            className="rounded-xl bg-orange-600/20 border border-orange-600/30 p-6 hover:bg-orange-600/30 transition-all hover:scale-105 cursor-pointer"
          >
            <div className="text-3xl mb-2">🏆</div>
            <div className="font-bold theme-text-primary">Rank</div>
            <div className="text-sm text-orange-300">#{profile.rank}</div>
          </Link>
        </div>

        {/* Referral Card - Phase 16 */}
        <div className="mb-8">
          <ReferralCard />
        </div>

        {/* Activity Feed */}
        <ActivityFeed activities={activities} />
      </div>
    </div>
  )
}