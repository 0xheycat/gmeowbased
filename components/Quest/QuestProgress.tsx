import { cn } from '@/lib/utils'
import type { CSSProperties } from 'react'

export type QuestProgressProps = {
  progressLabel: string | null
  progressBarPercent: number | null
  streakLabel: string | null
  completionPercent: number | null
  completions: number | null
}

export function QuestProgress({ progressLabel, progressBarPercent, streakLabel, completionPercent, completions }: QuestProgressProps) {
  const percent = typeof progressBarPercent === 'number' ? Math.max(0, Math.min(progressBarPercent, 100)) : null
  const showBadge = (completionPercent ?? 0) >= 50
  const isFull = (completionPercent ?? 0) >= 99

  return (
    <div className="quest-progress-block">
      <header className="quest-progress-block__header">
        <span className="quest-progress-block__title">Progress</span>
        {progressLabel ? <span className="quest-progress-block__value">{progressLabel}</span> : null}
      </header>
      <div className="quest-progress-block__bar" aria-hidden>
        <span
          className="quest-progress-block__fill"
          style={percent !== null ? ({ '--quest-progress-fill': `${percent}%` } as CSSProperties) : undefined}
        />
        {showBadge ? (
          <span className={cn('quest-progress-block__badge', isFull ? 'quest-progress-block__badge--gold' : undefined)}>
            {isFull ? '🥇' : '⭐'}
          </span>
        ) : null}
      </div>
      <footer className="quest-progress-block__footer">
        {streakLabel ? <span className="quest-progress-block__streak">🔥 {streakLabel}</span> : null}
        {typeof completions === 'number' ? (
          <span className="quest-progress-block__completions">{new Intl.NumberFormat('en-US').format(completions)} players</span>
        ) : null}
      </footer>
    </div>
  )
}
