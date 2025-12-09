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
    <section id="onchain-hub" className="hub">
      <div className="hub-header">
        <span className="hub-eyebrow">Onchain Storytelling</span>
        <h2>Command your multichain dossier</h2>
        <p>
          We stitch Base, Celo, Optimism, Unichain, Ink, and more into a single mission panel. Explore streaks, quest
          history, guild boosts, and Frame-ready stats.
        </p>
      </div>
      <div className="hub-card">
        <OnchainStats onLoadingChange={handleLoadingChange} />
        {loading ? <span className="hub-loading">Syncing onchain data…</span> : null}
      </div>
    </section>
  )
}
