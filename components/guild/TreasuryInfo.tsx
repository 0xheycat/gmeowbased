/**
 * TreasuryInfo Component
 * 
 * Template: music (card structure 40%) + gmeowbased0.6 (Web3 styling 30%)
 * Adaptation: 30% (professional info cards + crypto theme)
 * 
 * Purpose: Explain guild treasury system and benefits
 * Pattern: InfoCard grid with icons, sections, and clear hierarchy
 * 
 * Usage:
 * <TreasuryInfo />
 */

'use client'

import { MonetizationOnIcon, GroupIcon, EmojiEventsIcon, TrendingUpIcon, CheckCircleIcon } from '@/components/icons'

export function TreasuryInfo() {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-3">
          <MonetizationOnIcon className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Guild Treasury System
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          A shared pool of BASE POINTS that powers your guild's growth and rewards your community's contributions
        </p>
      </div>

      {/* Core Concept */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          What is Guild Treasury?
        </h3>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
          The treasury is a collective resource pool where members deposit their personal points to build a shared fund. 
          This creates a community-owned economy that benefits the entire guild through rewards, progression, and strategic initiatives.
        </p>
      </div>

      {/* Benefits Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Member Benefits */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <GroupIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              For Members
            </h3>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Earn Rewards:</strong> Request claims for your contributions and active participation
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Support Community:</strong> Pool resources for shared goals and collective growth
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Guild Progression:</strong> Help your guild level up and rank higher on leaderboards
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Track Recognition:</strong> Your deposits are tracked as pointsContributed
              </span>
            </li>
          </ul>
        </div>

        {/* Leader Benefits */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <EmojiEventsIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              For Leaders
            </h3>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Distribute Rewards:</strong> Approve claims to reward active members and contributors
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Incentivize Behavior:</strong> Reward quest completions, referrals, and guild activity
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Track Contributions:</strong> See who's depositing points and recognize top contributors
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Manage Economy:</strong> Balance deposits and distributions for healthy guild growth
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <TrendingUpIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            How It Works
          </h3>
        </div>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Deposit Points</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Members deposit their personal BASE POINTS into the guild treasury. Your contribution is tracked permanently.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Request Claim</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                When you've earned rewards, submit a claim request with the amount you'd like to receive.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
              3
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Leader Approval</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Guild leaders review pending claims and approve legitimate rewards based on contributions.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
              4
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Receive Rewards</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Once approved, points are transferred from the treasury to your personal balance.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Strategic Uses */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Strategic Uses
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="flex items-start gap-2 text-sm">
            <span className="text-blue-500 mt-1">•</span>
            <span className="text-gray-700 dark:text-gray-300"><strong>Event Prizes:</strong> Pool funds for tournaments and competitions</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <span className="text-blue-500 mt-1">•</span>
            <span className="text-gray-700 dark:text-gray-300"><strong>Recruitment Bonuses:</strong> Reward members who bring in new recruits</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <span className="text-blue-500 mt-1">•</span>
            <span className="text-gray-700 dark:text-gray-300"><strong>Achievement Rewards:</strong> Compensate for completing guild objectives</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <span className="text-blue-500 mt-1">•</span>
            <span className="text-gray-700 dark:text-gray-300"><strong>Community Goals:</strong> Set shared targets like "reach 10,000 treasury points"</span>
          </div>
        </div>
      </div>
    </div>
  )
}
