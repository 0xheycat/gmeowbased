'use client'

import { useRouter } from 'next/navigation'
import { ContractGMButton } from '@/components/ContractGMButton'
import { GMCountdown } from '@/components/GMCountdown'

/**
 * GM Ritual Page
 * Dedicated page for daily GM claiming
 * Accessed via Warpcast frame button
 */
export default function GMPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-purple-950/20 to-black">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-4">
            GM Ritual ☀️
          </h1>
          <p className="text-xl text-white dark:text-slate-950 dark:text-slate-700 dark:text-white/70">
            Log your daily GM • Unlock multipliers + hidden boosts
          </p>
        </div>

        {/* GM Button Section */}
        <div className="bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5/5 backdrop-blur-sm rounded-2xl border border-white dark:border-slate-700/10 p-8 mb-8">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-white dark:text-slate-950 dark:text-white mb-4">
                Send Your Daily GM
              </h2>
              <p className="text-white dark:text-slate-950 dark:text-slate-700 dark:text-white/60 mb-6">
                Claim your GM on any supported chain
              </p>
            </div>
            
            {/* GM Countdown */}
            <GMCountdown />
            
            {/* Multi-chain GM Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ContractGMButton chain="base" />
              <ContractGMButton chain="op" />
              <ContractGMButton chain="celo" />
              <ContractGMButton chain="unichain" />
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-sm rounded-2xl border border-purple-500/30 p-8 mb-8">
          <h3 className="text-xl font-semibold text-white dark:text-slate-950 dark:text-white mb-4">
            🎯 Daily GM Benefits
          </h3>
          <ul className="space-y-3 text-white dark:text-slate-950 dark:text-slate-700 dark:text-white/80">
            <li>✅ Earn points for every GM</li>
            <li>🔥 Build your streak for multiplier boosts</li>
            <li>🎁 Unlock hidden rewards and achievements</li>
            <li>🌟 Climb the leaderboard</li>
          </ul>
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => router.push('/Dashboard')}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white dark:text-slate-950 dark:text-white rounded-lg transition-colors"
          >
            Dashboard
          </button>
          <button
            onClick={() => router.push('/leaderboard')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white dark:text-slate-950 dark:text-white rounded-lg transition-colors"
          >
            Leaderboard
          </button>
        </div>
      </div>
    </div>
  )
}
