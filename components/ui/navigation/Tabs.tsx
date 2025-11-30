'use client'

import React, { type ReactNode } from 'react'
import clsx from 'clsx'

export interface TabItem {
  id: string
  label: string
  icon?: ReactNode
  disabled?: boolean
  badge?: string | number
}

export interface TabsProps {
  tabs: TabItem[]
  value: string
  onChange: (value: string) => void
  variant?: 'default' | 'pills' | 'underline'
  fullWidth?: boolean
  className?: string
}

/**
 * Tabs component for switching between views
 * Supports icons, badges, and disabled states
 * 
 * @example
 * <Tabs
 *   tabs={[
 *     { id: 'overview', label: 'Overview', icon: <HomeIcon /> },
 *     { id: 'quests', label: 'Quests', badge: 3 },
 *     { id: 'rewards', label: 'Rewards' }
 *   ]}
 *   value={activeTab}
 *   onChange={setActiveTab}
 * />
 */
export const Tabs: React.FC<TabsProps> = ({
  tabs,
  value,
  onChange,
  variant = 'default',
  fullWidth = false,
  className,
}) => {
  const containerStyles = clsx(
    'flex items-center',
    fullWidth ? 'w-full' : 'w-auto',
    {
      'gap-1 p-1 bg-white/5 rounded-lg': variant === 'default',
      'gap-2': variant === 'pills' || variant === 'underline',
      'border-b border-white/10': variant === 'underline',
    },
    className
  )

  const getTabStyles = (tab: TabItem, isActive: boolean) => {
    const baseStyles = clsx(
      'flex items-center justify-center gap-2',
      'px-4 py-2 text-sm font-medium',
      'transition-all duration-200',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      fullWidth && 'flex-1'
    )

    if (variant === 'default') {
      return clsx(
        baseStyles,
        'rounded-md',
        isActive
          ? 'bg-gmeow-purple text-white shadow-md'
          : 'text-white/60 hover:text-white hover:bg-white/5',
        !tab.disabled && 'cursor-pointer'
      )
    }

    if (variant === 'pills') {
      return clsx(
        baseStyles,
        'rounded-full',
        isActive
          ? 'bg-gmeow-purple text-white'
          : 'text-white/60 hover:text-white hover:bg-white/10',
        !tab.disabled && 'cursor-pointer'
      )
    }

    // underline variant
    return clsx(
      baseStyles,
      'border-b-2',
      isActive
        ? 'border-gmeow-purple text-white'
        : 'border-transparent text-white/60 hover:text-white hover:border-white/20',
      !tab.disabled && 'cursor-pointer'
    )
  }

  return (
    <div className={containerStyles} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === value

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-disabled={tab.disabled}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.id)}
            className={getTabStyles(tab, isActive)}
          >
            {tab.icon && (
              <span className="flex-shrink-0">{tab.icon}</span>
            )}
            <span>{tab.label}</span>
            {tab.badge && (
              <span className={clsx(
                'px-1.5 py-0.5 text-xs font-semibold rounded-full',
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-white/10 text-white/60'
              )}>
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export interface TabPanelProps {
  children: ReactNode
  value: string
  activeValue: string
  className?: string
}

/**
 * TabPanel component to show/hide content based on active tab
 * 
 * @example
 * <TabPanel value="overview" activeValue={activeTab}>
 *   <p>Overview content</p>
 * </TabPanel>
 */
export const TabPanel: React.FC<TabPanelProps> = ({
  children,
  value,
  activeValue,
  className,
}) => {
  if (value !== activeValue) return null

  return (
    <div
      role="tabpanel"
      className={clsx('animate-in fade-in-0 duration-200', className)}
    >
      {children}
    </div>
  )
}
