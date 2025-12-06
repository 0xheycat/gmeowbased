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
 *     { id: 'overview', label: 'Overview', icon: 'chart' },
 *     { id: 'quests', label: 'Quests', icon: 'sword', badge: 12 },
 *     { id: 'badges', label: 'Badges', icon: 'trophy', badge: 45 },
 *     { id: 'activity', label: 'Activity', icon: 'activity' },
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
        'hidden-scrollbar', // Professional pattern: hide scrollbar while keeping functionality
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
            {/* Icon (SVG for professional appearance) */}
            {tab.icon && (
              <span className="flex items-center justify-center" aria-hidden="true">
                {tab.icon === 'chart' && (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                )}
                {tab.icon === 'sword' && (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
                {tab.icon === 'trophy' && (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                )}
                {tab.icon === 'activity' && (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                )}
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
