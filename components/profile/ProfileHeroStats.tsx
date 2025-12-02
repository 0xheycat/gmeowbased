'use client'

import { useMemo } from 'react'
import { calculateRankProgress, formatXp } from '@/lib/rank'

interface ProfileHeroStatsProps {
  totalPoints: number
  globalRank: number | null
  streak: number
}

function formatNumber(value: number | null | undefined) {
  if (!value || Number.isNaN(value)) return '0'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString('en-US')
}

export function ProfileHeroStats({ totalPoints, globalRank, streak }: ProfileHeroStatsProps) {
  const rankProgress = useMemo(() => {
    return calculateRankProgress(totalPoints)
  }, [totalPoints])

  return (
    <div className="sm:hidden mega-card mb-6 bg-gradient-to-br from-cyan-500/20 via-violet-500/15 to-violet-500/20 border-2 border-cyan-400/30">
      <div className="text-center py-6 px-4">
        {/* Main XP Display */}
        <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-accent-green to-emerald-400 leading-none">
          {formatNumber(totalPoints)}
        </div>
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400 mt-2 font-semibold">
          Total XP
        </div>

        {/* Level Badge */}
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30">
          <span className="text-2xl">⭐</span>
          <span className="text-sm font-bold text-purple-200">Level {rankProgress.level}</span>
        </div>

        {/* Quick Stats Grid */}
        <div className="flex items-center justify-center gap-6 mt-6 text-sm">
          {/* Rank */}
          <div className="flex flex-col items-center">
            <div className="text-2xl font-black text-amber-400">
              #{formatNumber(globalRank || 0)}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">
              Rank
            </div>
          </div>

          {/* Divider */}
          <div className="h-12 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />

          {/* Streak */}
          <div className="flex flex-col items-center">
            <div className="text-2xl font-black text-orange-400 flex items-center gap-1">
              <span>{formatNumber(streak)}</span>
              <span className="text-base">🔥</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">
              Streak
            </div>
          </div>

          {/* Divider */}
          <div className="h-12 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />

          {/* Progress to Next Level */}
          <div className="flex flex-col items-center">
            <div className="text-2xl font-black text-cyan-400">
              {rankProgress.levelPercent}%
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">
              To Lv {rankProgress.level + 1}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 px-2">
          <div className="h-2 rounded-full bg-slate-800/50 overflow-hidden border border-slate-700/50">
            <div 
              className="h-full bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 transition-all duration-500 ease-out profile-level-progress"
              style={{ ['--fill-width' as string]: `${rankProgress.levelPercent}%` } as React.CSSProperties}
            />
          </div>
          <div className="text-[10px] text-slate-500 mt-1.5 text-center">
            {formatXp(rankProgress.xpToNextLevel)} XP to next level
          </div>
        </div>
      </div>
    </div>
  )
}
