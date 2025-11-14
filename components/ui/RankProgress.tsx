'use client'

import { useMemo } from 'react'
import { AnimatedIcon } from '@/components/ui/AnimatedIcon'
import { Progress } from '@/components/ui/progress'
import { calculateRankProgress, formatPoints, formatXp } from '@/lib/rank'
import { cn } from '@/lib/utils'

const DEFAULT_ICON = '/lottie/rank-pulse.json'

type RankProgressProps = {
  points: number
  size?: 'sm' | 'md'
  variant?: 'card' | 'subtle' | 'plain'
  className?: string
  label?: string
  description?: string
  iconSrc?: string
  hideTotals?: boolean
  showIcon?: boolean
  levelIcon?: string
}

export function RankProgress({
  points,
  size = 'md',
  variant = 'card',
  className,
  label,
  description,
  iconSrc = DEFAULT_ICON,
  hideTotals = false,
  showIcon = true,
  levelIcon = '⚜️',
}: RankProgressProps) {
  const progress = useMemo(() => calculateRankProgress(points), [points])
  const levelPercent = Math.round(progress.levelPercent * 100)
  const tierPercent = Math.round(progress.percent * 100)
  const nextTierName = progress.nextTier?.name ?? 'Mythic GM'
  const headerLabel = label ?? progress.currentTier.name
  const subtitleParts: string[] = []
  if (!hideTotals) subtitleParts.push(`${formatPoints(points)} pts`)
  subtitleParts.push(`Tier ${tierPercent}%`)
  const subtitle = subtitleParts.join(' • ')
  const tierDetails = description
    ? description
    : progress.nextTier
      ? `${formatPoints(progress.pointsToNext)} pts to ${nextTierName}`
      : 'Mythic GM mastery unlocked.'
  const xpSummary = `${formatXp(progress.xpIntoLevel)} / ${formatXp(progress.xpForLevel)} XP`
  const xpNextLabel =
    progress.xpToNextLevel > 0
      ? `${formatXp(progress.xpToNextLevel)} XP to next level`
      : 'Maximum level reached'

  const containerClass =
    variant === 'plain'
      ? 'rank-progress--plain'
      : variant === 'subtle'
        ? 'rank-progress--subtle'
        : 'rank-progress--card'
  const iconSize = size === 'sm' ? 44 : 58

  return (
    <div className={cn('rank-progress', containerClass, className)} data-size={size} data-variant={variant}>
      <div className="rank-progress__top">
        <div className={cn('rank-progress__identity', !showIcon && 'rank-progress__identity--no-icon')}>
          <div className="rank-progress__level">
            <span className="rank-progress__level-icon" aria-hidden>{levelIcon}</span>
            <div className="rank-progress__level-copy">
              <span className="rank-progress__level-label">Level</span>
              <span className="rank-progress__level-value">{progress.level}</span>
            </div>
          </div>
          {showIcon ? (
            <AnimatedIcon src={iconSrc} size={iconSize} className="rank-progress__icon" ariaLabel="Rank progress" />
          ) : null}
          <div className="rank-progress__text">
            <div className="rank-progress__eyebrow">Current tier</div>
            <div className="rank-progress__title">{headerLabel}</div>
            <div className="rank-progress__subtitle">{subtitle}</div>
          </div>
        </div>
        <div className="rank-progress__pill" aria-label="Level progress percentage">
          <span className="rank-progress__pill-value">{levelPercent}%</span>
          <span className="rank-progress__pill-sub">XP</span>
        </div>
      </div>

      <div className="rank-progress__meter" role="presentation">
        <Progress
          value={levelPercent}
          className={cn('rank-progress__bar', size === 'sm' ? 'h-2.5' : 'h-3.5')}
          indicatorClassName="rank-progress__indicator"
        />
        <div className="rank-progress__labels">
          <span>{xpSummary}</span>
          <span>{xpNextLabel}</span>
        </div>
      </div>

      <div className="rank-progress__footer">
        <span className="rank-progress__footnote">{progress.currentTier.tagline}</span>
        <span className="rank-progress__footnote">{tierDetails}</span>
      </div>

      {/* detail: styling lives in app/styles.css → RANK PROGRESS CARD */}
    </div>
  )
}
