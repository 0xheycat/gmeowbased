// Simple RankProgress component for quest pages
import React from 'react'

interface RankProgressProps {
  currentRank?: number
  nextRank?: number
  currentXP?: number
  nextRankXP?: number
  className?: string
}

export function RankProgress({
  currentRank = 1,
  nextRank = 2,
  currentXP = 0,
  nextRankXP = 100,
  className = '',
}: RankProgressProps) {
  const progress = Math.min(100, (currentXP / nextRankXP) * 100)

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between text-sm">
        <span>Rank {currentRank}</span>
        <span>{currentXP} / {nextRankXP} XP</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-xs text-gray-500 text-right">
        Next: Rank {nextRank}
      </div>
    </div>
  )
}
