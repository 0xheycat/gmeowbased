'use client'

import { useState, useEffect, useRef } from 'react'
import { getTimeUntilMidnight, getTimeUntilNextGM } from '@/lib/gm-utils'
import { useLegacyNotificationAdapter } from '@/components/ui/live-notifications'

interface CountdownProps {
  className?: string
  lastGMTimestamp?: number // if provided, countdown from last GM + 24h instead of midnight
  notifyOnReady?: boolean // show a toast when GM becomes available
}

export function GMCountdown({ className = '', lastGMTimestamp, notifyOnReady = true }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, total: 0 })
  const notifiedRef = useRef(false)
  const pushNotification = useLegacyNotificationAdapter()

  // Reset notification when reference timestamp changes
  useEffect(() => {
    notifiedRef.current = false
  }, [lastGMTimestamp])

  useEffect(() => {
    const updateCountdown = () => {
      const totalMsRaw = lastGMTimestamp ? getTimeUntilNextGM(lastGMTimestamp) : getTimeUntilMidnight()
      const totalMs = Math.max(0, totalMsRaw)

      const hours = Math.floor(totalMs / (1000 * 60 * 60))
      const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((totalMs % (1000 * 60)) / 1000)

      setTimeLeft({ hours, minutes, seconds, total: totalMs })

      if (notifyOnReady && totalMs === 0 && !notifiedRef.current) {
        pushNotification({ type: 'success', title: 'It’s GM time!', message: 'You can send your next GM now.' })
        notifiedRef.current = true
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [lastGMTimestamp, notifyOnReady, pushNotification])

  const formatNumber = (num: number) => num.toString().padStart(2, '0')

  // Progress percentage for a 24h window
  const totalSecondsInPeriod = 24 * 60 * 60
  const secondsRemaining = Math.floor(timeLeft.total / 1000)
  const progressPercentage = Math.min(100, Math.max(0, ((totalSecondsInPeriod - secondsRemaining) / totalSecondsInPeriod) * 100))

  return (
    <div className={`relative site-font ${className}`}>
      <div className="relative w-32 h-32 mx-auto mb-3">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100" aria-label="GM countdown progress">
          {/* Track */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="var(--px-inner)"
            strokeWidth="6"
            fill="transparent"
          />
          {/* Progress */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="var(--px-accent)"
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progressPercentage / 100)}`}
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center text-center">
          <div>
            <div className="text-[10px] text-[var(--px-sub)] mb-1">Next GM</div>
            <div className="text-lg font-bold" style={{ textShadow: '0 1px 0 var(--px-outer)' }}>
              {timeLeft.hours > 0
                ? `${formatNumber(timeLeft.hours)}:${formatNumber(timeLeft.minutes)}`
                : `${formatNumber(timeLeft.minutes)}:${formatNumber(timeLeft.seconds)}`
              }
            </div>
          </div>
        </div>
      </div>

      {/* Digital countdown boxes */}
      <div className="flex justify-center gap-2 mb-2">
        <div className="pixel-pill px-3 py-2 min-w-[60px] text-center">
          <div className="text-xl font-bold">{formatNumber(timeLeft.hours)}</div>
          <div className="text-[10px] text-[var(--px-sub)]">Hours</div>
        </div>
        <div className="pixel-pill px-3 py-2 min-w-[60px] text-center">
          <div className="text-xl font-bold">{formatNumber(timeLeft.minutes)}</div>
          <div className="text-[10px] text-[var(--px-sub)]">Minutes</div>
        </div>
        <div className="pixel-pill px-3 py-2 min-w-[60px] text-center">
          <div className="text-xl font-bold">{formatNumber(timeLeft.seconds)}</div>
          <div className="text-[10px] text-[var(--px-sub)]">Seconds</div>
        </div>
      </div>

      <p className="text-xs text-[var(--px-sub)] text-center">Until next GM opportunity ⏰</p>
    </div>
  )
}