'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

type Props = {
  loading?: boolean
  onLoadingChange?: (loading: boolean) => void
}

type OnchainStatsComponentProps = {
  onLoadingChange?: (loading: boolean) => void
}

const OnchainStats = dynamic<OnchainStatsComponentProps>(
  () => import('@/components/OnchainStatsV2').then((mod) => mod.OnchainStatsV2),
  { ssr: false },
)

export function OnchainHub({ loading: externalLoading, onLoadingChange }: Props) {
  const [internalLoading, setInternalLoading] = useState(false)
  const loading = externalLoading !== undefined ? externalLoading : internalLoading

  const handleLoadingChange = (isLoading: boolean) => {
    if (onLoadingChange) {
      onLoadingChange(isLoading)
    } else {
      setInternalLoading(isLoading)
    }
  }

  return (
    <section id="onchain-hub" className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto text-center mb-12">
        <span className="inline-block px-4 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-semibold mb-4">
          Onchain Storytelling
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Command your multichain dossier
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          We stitch Base, Celo, Optimism, Unichain, Ink, and more into a single mission panel. Explore streaks, quest
          history, guild boosts, and Frame-ready stats.
        </p>
      </div>
      <div className="max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 border border-gray-200 dark:border-gray-700">
        <OnchainStats onLoadingChange={handleLoadingChange} />
        {loading ? (
          <span className="block text-center mt-4 text-sm text-gray-500 dark:text-gray-400 animate-pulse">
            Syncing onchain data…
          </span>
        ) : null}
      </div>
    </section>
  )
}
