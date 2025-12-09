/**
 * Referral System Integration Page
 * 
 * Purpose: Test and showcase all Phase 3 referral components
 * Template: trezoadmin-41/dashboard + gmeowbased0.6 layout
 * 
 * Features:
 * - Integrated referral dashboard
 * - Leaderboard with live data
 * - Activity feed
 * - Tab-based navigation
 * - Mobile-responsive layout
 * - Error boundaries
 * - Loading states
 * 
 * Tests:
 * - Contract integration (getReferralCode, getReferralStats)
 * - API endpoints (leaderboard, activity)
 * - Component rendering
 * - Error handling
 * - TypeScript types
 */

'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { ReferralDashboard } from '@/components/referral/ReferralDashboard'
import { ReferralLeaderboard } from '@/components/referral/ReferralLeaderboard'
import { ReferralActivityFeed } from '@/components/referral/ReferralActivityFeed'
import { ReferralAnalytics } from '@/components/referral/ReferralAnalytics'
import { ErrorIcon, PeopleIcon, EmojiEventsIcon, HistoryIcon, TrendingUpIcon } from '@/components/icons'
import { useAuth } from '@/lib/hooks/use-auth'

type TabType = 'dashboard' | 'leaderboard' | 'activity' | 'analytics'

export default function ReferralPage() {
  const { address } = useAccount()
  const { fid, profile, isLoading: isAuthLoading, isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [error, setError] = useState<string | null>(null)

  // Validate user authentication
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      setError('Please sign in to access the referral system')
    } else {
      setError(null)
    }
  }, [isAuthLoading, isAuthenticated])

  // Loading state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading referral system...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !address || !fid) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-8 max-w-md">
          <div className="flex items-start gap-3 mb-4">
            <ErrorIcon className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                Access Denied
              </h3>
              <p className="text-red-700 dark:text-red-300">
                {error || 'Please connect your wallet and sign in with Farcaster to access the referral system.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full px-4 py-2 min-h-[44px] bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors focus:ring-2 focus:ring-red-500 focus:outline-none"
          >
            Return to Home
          </button>
        </div>
      </div>
    )
  }

  const tabs: Array<{ id: TabType; label: string; icon: JSX.Element }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <PeopleIcon className="w-5 h-5" /> },
    { id: 'leaderboard', label: 'Leaderboard', icon: <EmojiEventsIcon className="w-5 h-5" /> },
    { id: 'activity', label: 'Activity', icon: <HistoryIcon className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <TrendingUpIcon className="w-5 h-5" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Referral System
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Invite friends and earn rewards together
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-6 py-4 min-h-[44px] border-b-2 font-medium transition-colors whitespace-nowrap focus:ring-2 focus:ring-blue-500 focus:outline-none
                  ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="animate-fadeIn">
            <ReferralDashboard 
              address={address} 
              fid={fid}
            />
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="animate-fadeIn">
            <ReferralLeaderboard 
              currentUserFid={fid}
            />
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="animate-fadeIn">
            <ReferralActivityFeed 
              fid={fid}
              limit={20}
            />
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="animate-fadeIn">
            <ReferralAnalytics 
              fid={fid}
            />
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="container mx-auto px-4 pb-8">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            How Referrals Work
          </h3>
          <ul className="space-y-2 text-blue-700 dark:text-blue-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              <span>Register a custom referral code (3-32 characters)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              <span>Share your referral link with friends</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              <span>Earn +50 points when someone uses your code</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              <span>Your friend earns +25 points as a welcome bonus</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              <span>Unlock badges: Bronze (1 referral), Silver (5), Gold (10)</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
