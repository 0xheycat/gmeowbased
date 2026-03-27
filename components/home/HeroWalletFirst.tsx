'use client'

import { ConnectWallet } from '@/components/ConnectWallet'
import { ArrowRight } from '@/components/icons/arrow-right'
import Link from 'next/link'

interface HeroWalletFirstProps {
  stats?: {
    activeCats: number
    badgesEarned: number
  }
}

export function HeroWalletFirst({ stats }: HeroWalletFirstProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-gray-200/50 dark:bg-grid-gray-700/20" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-200/30 dark:bg-primary-900/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-accent-200/30 dark:bg-accent-900/20 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="text-center max-w-4xl mx-auto">
          {/* Main headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
            Earn rewards for being{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-accent-600">
              onchain
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            Connect wallet, complete quests, earn soulbound badges on Base L2
          </p>

          {/* Primary CTA - Connect Wallet */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <div className="w-full sm:w-auto">
              <ConnectWallet />
            </div>

            {/* Secondary CTA - Try Frame */}
            <Link
              href="/frames"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-xl border-2 border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 min-h-[56px]"
            >
              Try Frame in Warpcast
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="font-medium">
                {stats?.activeCats?.toLocaleString() || '2,840'} active cats
              </span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-gray-300 dark:bg-gray-600" />
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {stats?.badgesEarned?.toLocaleString() || '18,200'} badges earned
              </span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-gray-300 dark:bg-gray-600" />
            <div className="flex items-center gap-2">
              <span className="font-medium text-primary-600 dark:text-primary-400">
                Built on Base
              </span>
            </div>
          </div>

          {/* Value props */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-3">
                <svg
                  className="w-6 h-6 text-primary-600 dark:text-primary-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">No gas fees</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Quest rewards sponsored on Base L2
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 rounded-xl bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center mb-3">
                <svg
                  className="w-6 h-6 text-accent-600 dark:text-accent-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Earn daily</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                GM daily to maintain your streak
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
                <svg
                  className="w-6 h-6 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Guild competition</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Join teams and compete together
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
