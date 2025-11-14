'use client'

import dynamic from 'next/dynamic'

type Props = {
  loading: boolean
  onLoadingChange: (loading: boolean) => void
}

type OnchainStatsComponentProps = {
  onLoadingChange?: (loading: boolean) => void
}

const OnchainStats = dynamic<OnchainStatsComponentProps>(
  () => import('@/components/OnchainStats').then((mod) => mod.OnchainStats),
  { ssr: false },
)

export function OnchainHub({ loading, onLoadingChange }: Props) {
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
        <OnchainStats onLoadingChange={onLoadingChange} />
        {loading ? <span className="hub-loading">Syncing onchain data…</span> : null}
      </div>
    </section>
  )
}
