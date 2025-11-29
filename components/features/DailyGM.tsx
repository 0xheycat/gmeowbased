/**
 * Daily GM Component - Gmeowbased
 * Hero card pattern with gradient background and milestone tracking
 * Integrated with Gmeowbased v0.1 illustrations
 */

'use client'

import React from 'react'
import Image from 'next/image'
import { assets } from '@/utils/assets'

export interface GMStats {
  currentStreak: number
  totalGMs: number
  xpEarned: number
  nextMilestone: number
  canGM: boolean
  lastGM?: string
}

interface DailyGMHeroProps {
  stats: GMStats
  onGMClick?: () => void
  loading?: boolean
}

export function DailyGMHero({ stats, onGMClick, loading }: DailyGMHeroProps) {
  const milestones = [7, 30, 90, 365]
  const nextMilestone = milestones.find(m => m > stats.currentStreak) || 365

  return (
    <div className="card-body relative overflow-hidden bg-gradient-to-br from-purple-900 to-purple-700 rounded-lg mb-5">
      <div className="relative z-10 grid grid-cols-12 items-center gap-4">
        <div className="lg:col-span-8 col-span-12">
          <h5 className="mb-3 text-2xl font-bold text-white flex items-center gap-2">
            Daily GM Streak 🔥
            <span className="text-yellow-300">{stats.currentStreak} Days</span>
          </h5>
          <p className="mb-5 text-white/80 text-base">
            Keep your streak alive! Say GM every day to earn XP and climb the leaderboard.
            {stats.currentStreak > 0 && ` You're ${nextMilestone - stats.currentStreak} days away from the ${nextMilestone}-day milestone!`}
          </p>
          
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="theme-bg-subtle backdrop-blur-sm rounded-lg px-4 py-2">
              <p className="text-white/60 text-xs">Total GMs</p>
              <p className="text-white text-lg font-semibold">{stats.totalGMs}</p>
            </div>
            <div className="theme-bg-subtle backdrop-blur-sm rounded-lg px-4 py-2">
              <p className="text-white/60 text-xs">XP Earned</p>
              <p className="text-white text-lg font-semibold">{stats.xpEarned}</p>
            </div>
            <div className="theme-bg-subtle backdrop-blur-sm rounded-lg px-4 py-2">
              <p className="text-white/60 text-xs">Next Milestone</p>
              <p className="text-white text-lg font-semibold">{nextMilestone} days</p>
            </div>
          </div>

          <button
            type="button"
            className="btn bg-white text-purple-900 hover:bg-white/90 font-semibold px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onGMClick}
            disabled={!stats.canGM || loading}
          >
            {loading ? (
              <>
                <span className="inline-block size-4 border-2 border-purple-900/30 border-t-purple-900 rounded-full animate-spin" />
                Processing...
              </>
            ) : stats.canGM ? (
              'Say GM Today ☀️'
            ) : (
              '✅ GM Completed Today'
            )}
          </button>
        </div>

        <div className="col-span-4 ms-auto lg:block hidden">
          <Image
            src={assets.banners.accountHub}
            alt="Daily GM"
            width={200}
            height={200}
            className="drop-shadow-2xl"
          />
        </div>
      </div>

      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="size-full"
          viewBox="0 0 1440 560"
          preserveAspectRatio="none"
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="2" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
    </div>
  )
}

interface MilestoneCardProps {
  days: number
  reward: string
  achieved: boolean
  current?: boolean
}

export function MilestoneCard({ days, reward, achieved, current }: MilestoneCardProps) {
  return (
    <div className={`card ${current ? 'border-2 border-purple-500' : ''} ${achieved ? 'theme-bg-success-subtle' : ''}`}>
      <div className="card-body text-center">
        <div className="mb-3">
          {achieved ? (
            <span className="text-4xl">✅</span>
          ) : current ? (
            <span className="text-4xl">🎯</span>
          ) : (
            <span className="text-4xl opacity-30">🔒</span>
          )}
        </div>
        <h6 className="text-lg font-semibold text-default-800 mb-1">
          {days} Days
        </h6>
        <p className="text-sm text-default-600 mb-2">{reward}</p>
        {current && (
          <span className="inline-block px-2 py-1 text-xs font-medium theme-bg-brand-subtle text-purple-700 rounded-full">
            Next Milestone
          </span>
        )}
      </div>
    </div>
  )
}

interface GMStatsGridProps {
  stats: GMStats
}

export function GMStatsGrid({ stats }: GMStatsGridProps) {
  const milestones = [
    { days: 7, reward: '100 Bonus XP', achieved: stats.currentStreak >= 7 },
    { days: 30, reward: 'Week Warrior Badge', achieved: stats.currentStreak >= 30 },
    { days: 90, reward: 'Month Master Badge', achieved: stats.currentStreak >= 90 },
    { days: 365, reward: 'Year Legend Badge + NFT', achieved: stats.currentStreak >= 365 },
  ]

  const nextMilestone = milestones.findIndex(m => !m.achieved)

  return (
    <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-5">
      {milestones.map((milestone, index) => (
        <MilestoneCard
          key={milestone.days}
          days={milestone.days}
          reward={milestone.reward}
          achieved={milestone.achieved}
          current={index === nextMilestone}
        />
      ))}
    </div>
  )
}

/**
 * DailyGM - Wrapper component for simple page integration
 */
interface DailyGMProps {
  currentStreak: number
  onGMClick?: () => void
  disabled?: boolean
}

export function DailyGM({ currentStreak, onGMClick, disabled }: DailyGMProps) {
  const stats: GMStats = {
    currentStreak,
    totalGMs: currentStreak * 10, // Mock calculation
    xpEarned: currentStreak * 50,
    nextMilestone: [7, 30, 90, 365].find(m => m > currentStreak) || 365,
    canGM: !disabled,
  }

  return <DailyGMHero stats={stats} onGMClick={onGMClick} loading={disabled} />
}
