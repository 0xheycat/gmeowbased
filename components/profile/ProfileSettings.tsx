'use client'

import { useCallback, useEffect, useState } from 'react'
import { notificationPreferencesCache } from '@/lib/cache-storage'
import type { NotificationCategory } from '@/components/ui/live-notifications'

export type NotificationPreferences = {
  enabled: boolean
  sound: boolean
  categories: Record<NotificationCategory, boolean>
  pushEnabled: boolean
  pushTokenRegistered: boolean
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  sound: false,
  categories: {
    system: true,
    quest: true,
    badge: true,
    guild: true,
    reward: true,
    tip: true,
    level: true,
    reminder: true,
    mention: true,
    streak: true,
  },
  pushEnabled: false,
  pushTokenRegistered: false,
}

const CATEGORY_LABELS: Record<NotificationCategory, { label: string; icon: string; description: string }> = {
  system: { label: 'System', icon: '🛰️', description: 'Important app updates and alerts' },
  quest: { label: 'Quests', icon: '🧭', description: 'Quest completions and updates' },
  badge: { label: 'Badges', icon: '🎖️', description: 'Badge achievements and unlocks' },
  guild: { label: 'Guilds', icon: '🏰', description: 'Guild activity and invites' },
  reward: { label: 'Rewards', icon: '💎', description: 'Points and reward notifications' },
  tip: { label: 'Tips', icon: '⚡', description: 'Incoming tips and mentions' },
  level: { label: 'Level Ups', icon: '🚀', description: 'Level progression milestones' },
  reminder: { label: 'Reminders', icon: '⏰', description: 'Daily GM and activity reminders' },
  mention: { label: 'Mentions', icon: '💬', description: 'When someone mentions you' },
  streak: { label: 'Streaks', icon: '🔥', description: 'Streak achievements and warnings' },
}

type ProfileSettingsProps = {
  fid?: number | null
  onPushRegistrationRequest?: () => Promise<boolean>
  className?: string
}

export function ProfileSettings({ fid, onPushRegistrationRequest, className }: ProfileSettingsProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES)
  const [isExpanded, setIsExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const cacheKey = fid ? `user:${fid}` : 'default'

  // Load preferences from cache on mount
  useEffect(() => {
    const cached = notificationPreferencesCache.get(cacheKey)
    if (cached) {
      setPreferences({ ...DEFAULT_PREFERENCES, ...cached })
    }
  }, [cacheKey])

  // Save preferences to cache
  const savePreferences = useCallback(
    (updated: NotificationPreferences) => {
      notificationPreferencesCache.set(cacheKey, updated)
      setPreferences(updated)
      setSaveMessage('Saved')
      setTimeout(() => setSaveMessage(null), 2000)
    },
    [cacheKey],
  )

  const toggleEnabled = useCallback(() => {
    savePreferences({ ...preferences, enabled: !preferences.enabled })
  }, [preferences, savePreferences])

  const toggleSound = useCallback(() => {
    savePreferences({ ...preferences, sound: !preferences.sound })
  }, [preferences, savePreferences])

  const toggleCategory = useCallback(
    (category: NotificationCategory) => {
      savePreferences({
        ...preferences,
        categories: {
          ...preferences.categories,
          [category]: !preferences.categories[category],
        },
      })
    },
    [preferences, savePreferences],
  )

  const togglePushEnabled = useCallback(async () => {
    if (!preferences.pushEnabled && onPushRegistrationRequest) {
      setLoading(true)
      try {
        const success = await onPushRegistrationRequest()
        if (success) {
          savePreferences({
            ...preferences,
            pushEnabled: true,
            pushTokenRegistered: true,
          })
        } else {
          setSaveMessage('Push registration failed')
          setTimeout(() => setSaveMessage(null), 3000)
        }
      } catch (error) {
        console.error('Push registration error:', error)
        setSaveMessage('Error enabling push notifications')
        setTimeout(() => setSaveMessage(null), 3000)
      } finally {
        setLoading(false)
      }
    } else {
      savePreferences({ ...preferences, pushEnabled: !preferences.pushEnabled })
    }
  }, [preferences, savePreferences, onPushRegistrationRequest])

  const resetToDefaults = useCallback(() => {
    savePreferences(DEFAULT_PREFERENCES)
    setSaveMessage('Reset to defaults')
    setTimeout(() => setSaveMessage(null), 2000)
  }, [savePreferences])

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between rounded-xl border border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5/5 px-4 py-3 text-left transition hover:border-emerald-300/40 hover:bg-slate-100/8 dark:bg-slate-100/90 dark:bg-white/5/5"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl" aria-hidden>
            ⚙️
          </span>
          <div>
            <h3 className="text-sm font-semibold text-white dark:text-slate-950 dark:text-white">Notification Settings</h3>
            <p className="text-sm text-[var(--px-sub)]">
              Configure your notification preferences
            </p>
          </div>
        </div>
        <svg
          className={`h-5 w-5 text-slate-900 dark:text-slate-950 dark:text-slate-700 dark:text-white/60 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-4 rounded-xl border border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5/5 p-4">
          {/* Save message */}
          {saveMessage && (
            <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-center text-sm text-emerald-100">
              {saveMessage}
            </div>
          )}

          {/* Master toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-950 dark:text-white">Enable Notifications</h4>
              <p className="text-sm text-[var(--px-sub)]">Master toggle for all notifications</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={preferences.enabled}
                onChange={toggleEnabled}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-slate-100/90 dark:bg-white/5 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-700/20 dark:border-white after:bg-slate-900 dark:after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/50"></div>
            </label>
          </div>

          {/* Sound toggle */}
          <div className="flex items-center justify-between border-t border-white dark:border-slate-700/10 pt-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-950 dark:text-white">Sound Effects</h4>
              <p className="text-sm text-[var(--px-sub)]">Play sounds for notifications</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={preferences.sound}
                onChange={toggleSound}
                disabled={!preferences.enabled}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-slate-100/90 dark:bg-white/5 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-700/20 dark:border-white after:bg-slate-900 dark:after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-disabled:opacity-30 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/50"></div>
            </label>
          </div>

          {/* Push notifications */}
          <div className="flex items-center justify-between border-t border-white dark:border-slate-700/10 pt-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-950 dark:text-white">Push Notifications</h4>
              <p className="text-sm text-[var(--px-sub)]">
                {preferences.pushTokenRegistered
                  ? 'Token registered for push alerts'
                  : 'Enable miniapp push notifications'}
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={preferences.pushEnabled}
                onChange={togglePushEnabled}
                disabled={!preferences.enabled || loading}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-slate-100/90 dark:bg-white/5 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-700/20 dark:border-white after:bg-slate-900 dark:after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-disabled:opacity-30 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/50"></div>
            </label>
          </div>

          {/* Category filters */}
          <div className="border-t border-white dark:border-slate-700/10 pt-3">
            <h4 className="mb-3 text-sm font-semibold text-slate-950 dark:text-white">Notification Categories</h4>
            <div className="space-y-2">
              {(Object.keys(CATEGORY_LABELS) as NotificationCategory[]).map((category) => {
                const { label, icon, description } = CATEGORY_LABELS[category]
                return (
                  <div
                    key={category}
                    className="flex items-start justify-between gap-3 rounded-lg border border-slate-700/5 dark:border-white/10 bg-slate-100/90 dark:bg-white/5 p-3"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg" aria-hidden>
                        {icon}
                      </span>
                      <div>
                        <h5 className="text-sm font-semibold text-slate-950 dark:text-white">{label}</h5>
                        <p className="text-[10px] text-[var(--px-sub)]">{description}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={preferences.categories[category]}
                        onChange={() => toggleCategory(category)}
                        disabled={!preferences.enabled}
                        className="peer sr-only"
                      />
                      <div className="peer h-5 w-9 rounded-full bg-slate-100/90 dark:bg-white/5 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-slate-700/20 dark:border-white after:bg-slate-900 dark:after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-disabled:opacity-30 peer-focus:outline-none peer-focus:ring-1 peer-focus:ring-emerald-500/50"></div>
                    </label>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Reset button */}
          <div className="flex justify-end border-t border-white dark:border-slate-700/10 pt-3">
            <button
              type="button"
              onClick={resetToDefaults}
              className="rounded-lg border border-slate-700/10 dark:border-white/20 bg-slate-100/90 dark:bg-white/5 px-4 py-2 text-sm uppercase tracking-[0.22em] text-slate-950 dark:text-white/80 transition hover:border-amber-300/40 hover:text-slate-950 dark:hover:text-white"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
