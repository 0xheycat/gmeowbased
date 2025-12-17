/**
 * ReferralDashboard Component
 * 
 * Purpose: Main referral system dashboard integrating all referral components
 * Template: trezoadmin-41/dashboard-analytics (35%) + gmeowbased0.6 layout patterns (15%)
 * 
 * Features:
 * - Integrated referral management (code, link, stats)
 * - Responsive 2-column desktop, 1-column mobile layout
 * - Section organization with proper spacing
 * - Loading states for async components
 * - Empty state for users without referral code
 * 
 * Usage:
 * <ReferralDashboard address="0x..." fid={12345} />
 */

'use client'

import { useState, useEffect } from 'react'
import type { Address } from 'viem'
import { ReferralCodeForm } from './ReferralCodeForm'
import { ReferralLinkGenerator } from './ReferralLinkGenerator'
import { ReferralStatsCards } from './ReferralStatsCards'
import { ErrorIcon, InfoIcon } from '@/components/icons'
import { getReferralCode } from '@/lib/contracts/referral-contract'

export interface ReferralDashboardProps {
  /** User's wallet address */
  address: Address
  /** User's Farcaster ID */
  fid: number
  /** Custom CSS class */
  className?: string
}

export function ReferralDashboard({ address, fid, className = '' }: ReferralDashboardProps) {
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadReferralCode = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const code = await getReferralCode(address)
        setReferralCode(code)
      } catch (err) {
        console.error('Failed to load referral code:', err)
        setError('Failed to load referral code. Please refresh the page.')
      } finally {
        setIsLoading(false)
      }
    }

    loadReferralCode()
  }, [fid])

  const handleCodeRegistered = (newCode: string) => {
    setReferralCode(newCode)
  }

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Loading Skeleton */}
        <div className="animate-pulse space-y-6">
          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg h-32" />
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg h-32" />
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg h-32" />
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg h-32" />
          </div>
          
          {/* Forms Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg h-64" />
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg h-64" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <ErrorIcon className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-1">
                Error Loading Dashboard
              </h3>
              <p className="text-red-700 dark:text-red-300 mb-4">
                {error}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 min-h-[44px] bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Referral Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Invite friends, earn rewards, and track your referral performance
        </p>
      </div>

      {/* Stats Overview */}
      <section aria-label="Referral statistics">
        <ReferralStatsCards address={address} />
      </section>

      {/* Referral Management */}
      {!referralCode ? (
        // No Code - Show Registration Form
        <section className="space-y-6" aria-label="Register referral code">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <InfoIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  No code registered yet
                </h3>
                <p className="text-blue-700 dark:text-blue-300 mb-4">
                  Register a custom referral code to start inviting friends. 
                  You'll earn 50 points for each successful referral, and your friends get 25 points!
                </p>
                <ul className="text-blue-700 dark:text-blue-300 space-y-1 mb-4">
                  <li>• Choose a memorable code (3-32 characters)</li>
                  <li>• Code must be unique (checked automatically)</li>
                  <li>• Once registered, you can generate shareable links</li>
                  <li>• Earn badges as you refer more friends</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="max-w-2xl">
            <ReferralCodeForm 
              onSuccess={handleCodeRegistered}
            />
          </div>
        </section>
      ) : (
        // Has Code - Show Link Generator and Management
        <section className="space-y-6" aria-label="Manage referral links">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Update Code */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Your Referral Code
              </h2>
              <ReferralCodeForm 
                currentCode={referralCode}
                onSuccess={handleCodeRegistered}
              />
            </div>

            {/* Generate Links */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Share Your Link
              </h2>
              <ReferralLinkGenerator 
                code={referralCode}
              />
            </div>
          </div>

          {/* Tips Section */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-3">
              💡 Maximize Your Referrals
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-purple-700 dark:text-purple-300">
              <div>
                <strong className="block mb-1">Share on Social Media</strong>
                <p>Post your QR code on Twitter, Discord, or Warpcast</p>
              </div>
              <div>
                <strong className="block mb-1">Personal Outreach</strong>
                <p>Send direct messages to friends with your unique link</p>
              </div>
              <div>
                <strong className="block mb-1">Content Creation</strong>
                <p>Include your code in blogs, videos, or livestreams</p>
              </div>
              <div>
                <strong className="block mb-1">Track Performance</strong>
                <p>Monitor your stats to see which channels work best</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Rewards Information */}
      <section className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-800" aria-label="Rewards information">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Referral Rewards
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Points */}
          <div className="space-y-2">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              50 + 25
            </div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Points Per Referral
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              You earn 50 points, your friend earns 25 points
            </p>
          </div>

          {/* Badges */}
          <div className="space-y-2">
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              3 Tiers
            </div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Achievement Badges
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Bronze (1), Silver (5), Gold (10) referrals
            </p>
          </div>

          {/* Leaderboard */}
          <div className="space-y-2">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              Top 100
            </div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Leaderboard Ranking
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Compete with top referrers for recognition
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
