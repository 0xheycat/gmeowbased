'use client'

import clsx from 'clsx'
import { useState, useEffect } from 'react'

// Tab configuration type
export type ProfileTabConfig<Id extends string = string> = {
  id: Id
  label: string
  icon?: string
  badge?: number // Count badge (e.g., 12 quests, 45 badges)
}

export type ProfileTabsProps<Id extends string = string> = {
  tabs: ProfileTabConfig<Id>[]
  activeTab: Id
  onTabChange: (id: Id) => void
  className?: string
}

/**
 * ProfileTabs Component
 * 
 * Professional tab navigation for profile pages
 * Template: DashboardMobileTabs pattern (proven mobile-first design)
 * Adaptation: 30% (added badge counts, GitHub-style active states)
 * 
 * Features:
 * - Mobile: Horizontal scroll tabs (thumb-friendly)
 * - Desktop: Full tab bar with equal spacing
 * - Badge count indicators (optional)
 * - Smooth active state transitions
 * - Touch-friendly (44px min height)
 * 
 * @example
 * ```tsx
 * <ProfileTabs
 *   tabs={[
 *     { id: 'overview', label: 'Overview', icon: '📊' },
 *     { id: 'quests', label: 'Quests', icon: '⚔️', badge: 12 },
 *     { id: 'badges', label: 'Badges', icon: '🏅', badge: 45 },
 *     { id: 'activity', label: 'Activity', icon: '📈' },
 *   ]}
 *   activeTab={activeTab}
 *   onTabChange={setActiveTab}
 * />
 * ```
 */
export default function ProfileTabs<Id extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  className,
}: ProfileTabsProps<Id>) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div
      role="tablist"
      aria-label="Profile navigation tabs"
      className={clsx(
        'flex items-center gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-2',
        'scrollbar-hide', // Hide scrollbar for cleaner look
        className
      )}
    >
      {tabs.map((tab, index) => {
        const active = tab.id === activeTab
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={active ? 0 : -1}
            className={clsx(
              'relative flex min-w-[7.5rem] min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-medium tracking-wide transition-all duration-200',
              'touch-manipulation', // Optimize for touch
              'whitespace-nowrap', // Prevent text wrapping
              'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-black', // Focus styles (WCAG 2.1)
              active
                ? // Active state: Twitter/GitHub blue accent
                  'bg-blue-500/20 text-blue-100 shadow-[0_0_16px_rgba(59,130,246,0.35)] border border-blue-400/60 scale-105'
                : // Inactive state: Subtle hover effect
                  'bg-white/5 text-white/70 border border-transparent hover:border-white/20 hover:bg-white/10 hover:text-white/90',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            onClick={() => onTabChange(tab.id)}
            aria-current={active ? 'page' : undefined}
          >
            {/* Icon (optional) */}
            {tab.icon && (
              <span className="text-base" aria-hidden="true">
                {tab.icon}
              </span>
            )}

            {/* Label */}
            <span className="uppercase tracking-wider">{tab.label}</span>

            {/* Badge count (optional) */}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className={clsx(
                  'ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
                  active
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-white/60'
                )}
              >
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}

            {/* Active indicator line (desktop only) */}
            {active && !isMobile && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"
                aria-hidden="true"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

// Export named for consistency
export { ProfileTabs }
