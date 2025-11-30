/**
 * Profile Components - Gmeowbased
 * User profile dashboard with stats and activity feed
 * Integrated with Gmeowbased avatars
 */

'use client'

import React from 'react'
import Image from 'next/image'
import { Icon } from 'components(old)/ui/Icon'
import { stoneCredits } from '@/utils/assets'

export interface UserProfile {
  id: string
  username: string
  avatar?: string
  level: number
  xp: number
  xpToNextLevel: number
  rank: number
  totalUsers?: number
  streak: number
  badgesEarned: number
  questsCompleted: number
  guildsJoined: number
}

export interface Activity {
  id: string
  type: 'quest' | 'badge' | 'guild' | 'gm' | 'level'
  title: string
  description: string
  timestamp: string
  icon?: string
}

interface ProfileHeaderProps {
  profile: UserProfile
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  const xpPercentage = (profile.xp / profile.xpToNextLevel) * 100

  return (
    <div className="card mb-6">
      <div className="card-body">
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Avatar and basic info */}
          <div className="lg:col-span-4">
            <div className="flex flex-col items-center text-center">
              <Image
                src={profile.avatar || '/assets/gmeow-illustrations/Avatars/Avatar_001.png'}
                alt={profile.username}
                width={120}
                height={120}
                className="rounded-full mb-4 ring-4 ring-purple-500/20"
              />
              <h3 className="text-2xl font-bold text-default-800 mb-1">{profile.username}</h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 theme-bg-brand-subtle text-purple-700 rounded-full text-sm font-semibold">
                  Level {profile.level}
                </span>
                {profile.totalUsers && (
                  <span className="px-3 py-1 theme-bg-warning-subtle text-orange-700 rounded-full text-sm font-semibold">
                    Rank #{profile.rank}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* XP Progress and stats */}
          <div className="lg:col-span-8">
            {/* XP Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-default-700">Experience Points</span>
                <span className="text-sm font-semibold text-purple-600">
                  {profile.xp} / {profile.xpToNextLevel} XP
                </span>
              </div>
              <div className="w-full bg-default-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-purple-600 to-purple-400 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${xpPercentage}%` }}
                />
              </div>
              <p className="text-xs text-default-500 mt-1">
                {profile.xpToNextLevel - profile.xp} XP until Level {profile.level + 1}
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg theme-bg-warning-subtle">
                <Image src={stoneCredits.ruby} alt="Streak" width={32} height={32} className="mx-auto mb-2" />
                <p className="text-2xl font-bold text-default-800">{profile.streak}</p>
                <p className="text-xs text-default-600">Day Streak</p>
              </div>

              <div className="text-center p-4 rounded-lg theme-bg-warning-subtle">
                <Icon name="badges" size={32} className="mx-auto mb-2" />
                <p className="text-2xl font-bold text-default-800">{profile.badgesEarned}</p>
                <p className="text-xs text-default-600">Badges</p>
              </div>

              <div className="text-center p-4 rounded-lg theme-bg-brand-subtle">
                <Icon name="quests" size={32} className="mx-auto mb-2" />
                <p className="text-2xl font-bold text-default-800">{profile.questsCompleted}</p>
                <p className="text-xs text-default-600">Quests</p>
              </div>

              <div className="text-center p-4 rounded-lg theme-bg-success-subtle">
                <Icon name="groups" size={32} className="mx-auto mb-2" />
                <p className="text-2xl font-bold text-default-800">{profile.guildsJoined}</p>
                <p className="text-xs text-default-600">Guilds</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ActivityFeedProps {
  activities: Activity[]
}

const activityIcons = {
  quest: { icon: '🎯', color: 'theme-bg-brand-subtle text-purple-600' },
  badge: { icon: '🏅', color: 'theme-bg-warning-subtle text-yellow-600' },
  guild: { icon: '⚔️', color: 'theme-bg-success-subtle text-green-600' },
  gm: { icon: '☀️', color: 'theme-bg-warning-subtle text-orange-600' },
  level: { icon: '⭐', color: 'theme-bg-info-subtle text-blue-600' },
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title mb-4">Recent Activity</h5>
        
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-center text-default-500 py-8">No recent activity</p>
          ) : (
            activities.map(activity => {
              const config = activityIcons[activity.type]
              const timeAgo = getTimeAgo(activity.timestamp)

              return (
                <div key={activity.id} className="flex gap-4 items-start p-3 rounded-lg theme-hover-bg-subtle transition-colors">
                  <div className={`p-3 rounded-lg ${config.color} flex-shrink-0`}>
                    <span className="text-2xl">{config.icon}</span>
                  </div>
                  <div className="flex-grow min-w-0">
                    <h6 className="font-semibold text-default-800 text-sm mb-1">{activity.title}</h6>
                    <p className="text-xs text-default-600 mb-1">{activity.description}</p>
                    <p className="text-xs text-default-500">{timeAgo}</p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

function getTimeAgo(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`
  return then.toLocaleDateString()
}
