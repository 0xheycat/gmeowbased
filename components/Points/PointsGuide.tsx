import React, { useCallback, useEffect, useState } from 'react'

export default function PointsGuide() {
  const items: { emoji: string; title: string; body: string; delay?: string }[] = [
    {
      emoji: '🎮',
      title: 'What are Points?',
      body:
        'Points are the core virtual currency of the app. They track your engagement, unlock rewards, and place you on leaderboards. Think of them as your season score: the more you play, the higher you rank.',
    },
    {
      emoji: '☀️',
      title: 'Daily GM',
      body:
        'Check in daily with a GM to earn points and build a streak. Longer streaks mean better bonuses. Miss a day? Your streak may reset, so come back tomorrow.',
      delay: '120ms',
    },
    {
      emoji: '🗺️',
      title: 'Quests',
      body:
        'Complete quests to earn chunkier point rewards. Examples include social actions, simple tasks, or community events. Each quest shows how many points it grants once completed.',
      delay: '240ms',
    },
    {
      emoji: '👥',
      title: 'Teams & Leaderboards',
      body:
        'Join a team to compete together. Team activity and collaboration can unlock extra bonuses and help you climb the rankings faster.',
      delay: '360ms',
    },
    {
      emoji: '💎',
      title: 'Stake Boost',
      body:
        'You can stake some of your points to activate a boost. While staked, certain rewards may be multiplied, helping you progress faster. Staked points can have a brief lock before you can unstake.',
      delay: '480ms',
    },
    {
      emoji: '🔒',
      title: 'No Direct Transfers',
      body:
        'Points are not meant to be transferred between users. This keeps the game fair, prevents farming, and protects the integrity of leaderboards.',
      delay: '600ms',
    },
    {
      emoji: '🏆',
      title: 'Season Rewards',
      body:
        'At season end, top performers may receive special rewards. Points determine eligibility and share, but they are not a direct 1:1 token. Keep grinding to secure your spot.',
      delay: '720ms',
    },
    {
      emoji: '🧭',
      title: 'How to Progress',
      body:
        'Do your daily GM, finish quests, join a team, and consider staking for a multiplier. Consistency beats everything—small wins daily compound into big gains.',
      delay: '840ms',
    },
    {
      emoji: '💡',
      title: 'Tips',
      body:
        'Set reminders for GM. Prioritize quests with higher point rewards. Coordinate with your team. Stake when you can stay active to maximize the boost.',
      delay: '960ms',
    },
  ]
  const [activeIndex, setActiveIndex] = useState(0)
  const total = items.length

  const goTo = useCallback(
    (idx: number) => {
      if (total === 0) return
      const next = ((idx % total) + total) % total
      setActiveIndex(next)
    },
    [total]
  )

  const goPrev = useCallback(() => {
    goTo(activeIndex - 1)
  }, [activeIndex, goTo])

  const goNext = useCallback(() => {
    goTo(activeIndex + 1)
  }, [activeIndex, goTo])

  useEffect(() => {
    if (total <= 1) return
    const id = window.setTimeout(() => {
      setActiveIndex((idx) => ((idx + 1) % total + total) % total)
    }, 6500)
    return () => window.clearTimeout(id)
  }, [activeIndex, total])

  // detail: points accent palette blends shell-heading tones via color-mix in app styles
  return (
    <div className="pixel-card overflow-hidden site-font">
      <div className="flex items-center justify-between mb-2">
        <h3 className="pixel-section-title">How Points Work</h3>
        <span className="pixel-pill text-[10px]">Guide</span>
      </div>

      <p className="text-sm text-[var(--px-sub)] mb-3">
        Points measure your activity across the app. Earn them from daily check‑ins, quests, and teamwork; boost them by staking; and climb the
        leaderboards to qualify for season rewards.
      </p>

      <div className="pxg-slider" aria-live="polite">
        <div className="pxg-track" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
          {items.map((it, i) => (
            <div key={i} className="pxg-slide">
              <div className="pxg-card">
                <div className="pxg-emoji">{it.emoji}</div>
                <div className="pxg-title">{it.title}</div>
                <div className="pxg-body">{it.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pxg-nav">
        <button type="button" onClick={goPrev} className="pxg-arrow" aria-label="Previous point" disabled={total <= 1}>
          &lt;
        </button>
        <div className="pxg-dots">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`pxg-dot ${i === activeIndex ? 'active' : ''}`}
              onClick={() => goTo(i)}
              aria-label={`Show guide item ${i + 1}`}
              aria-pressed={i === activeIndex}
              disabled={total <= 1}
            />
          ))}
        </div>
        <button type="button" onClick={goNext} className="pxg-arrow" aria-label="Next point" disabled={total <= 1}>
          &gt;
        </button>
      </div>

    </div>
  )
}