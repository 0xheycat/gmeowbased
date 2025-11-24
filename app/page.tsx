'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import dynamic from 'next/dynamic'
import { OnboardingFlow } from '@/components/intro/OnboardingFlow'
import { OnchainHub } from '@/components/home/OnchainHub'
import type { FAQItem, GuildPreview, LeaderboardEntry, QuestPreview } from '@/components/home/types'

// Below-fold sections - dynamically loaded to improve initial page load
const HowItWorks = dynamic(() => import('@/components/home/HowItWorks').then(mod => ({ default: mod.HowItWorks })), {
  loading: () => <div className="animate-pulse bg-white/5 rounded-lg h-96 mx-auto max-w-6xl my-16" />,
})

const LiveQuests = dynamic(() => import('@/components/home/LiveQuests').then(mod => ({ default: mod.LiveQuests })), {
  loading: () => <div className="animate-pulse bg-white/5 rounded-lg h-96 mx-auto max-w-6xl my-16" />,
})

const GuildsShowcase = dynamic(() => import('@/components/home/GuildsShowcase').then(mod => ({ default: mod.GuildsShowcase })), {
  loading: () => <div className="animate-pulse bg-white/5 rounded-lg h-96 mx-auto max-w-6xl my-16" />,
})

const LeaderboardSection = dynamic(() => import('@/components/home/LeaderboardSection').then(mod => ({ default: mod.LeaderboardSection })), {
  loading: () => <div className="animate-pulse bg-white/5 rounded-lg h-96 mx-auto max-w-6xl my-16" />,
})

const FAQSection = dynamic(() => import('@/components/home/FAQSection').then(mod => ({ default: mod.FAQSection })), {
  loading: () => <div className="animate-pulse bg-white/5 rounded-lg h-96 mx-auto max-w-6xl my-16" />,
})

const ConnectWalletSection = dynamic(() => import('@/components/home/ConnectWalletSection').then(mod => ({ default: mod.ConnectWalletSection })), {
  loading: () => <div className="animate-pulse bg-white/5 rounded-lg h-64 mx-auto max-w-6xl my-16" />,
})

const QUEST_PREVIEWS: QuestPreview[] = [
  {
    questId: 101,
    title: 'Send your GM from Base',
    reward: 15,
    questType: 'FARCASTER_CAST',
    chain: 'base',
    href: '/Quest/base/101',
  },
  {
    questId: 202,
    title: 'Charge your guild vault',
    reward: 120,
    questType: 'GENERIC',
    chain: 'op',
    href: '/Quest/op/202',
  },
  {
    questId: 305,
    title: 'Share the Command Deck frame',
    reward: 40,
    questType: 'FARCASTER_FRAME_INTERACT',
    chain: 'unichain',
    href: '/Quest/unichain/305',
  },
]

const GUILD_PREVIEWS: GuildPreview[] = [
  { id: 'moon-cats', name: 'Moon Cats', members: 420, points: 18200, href: '/Guild' },
  { id: 'warp-rangers', name: 'Warp Rangers', members: 188, points: 15420, href: '/Guild' },
  { id: 'base-cadets', name: 'Base Cadets', members: 256, points: 13980, href: '/Guild' },
  { id: 'optimistic-paws', name: 'Optimistic Paws', members: 98, points: 9600, href: '/Guild' },
]

const LEADERBOARD_PREVIEW: LeaderboardEntry[] = [
  { rank: 1, username: 'gmeow', points: 48210, badgeCount: 9 },
  { rank: 2, username: 'moonshot', points: 43100, badgeCount: 7 },
  { rank: 3, username: 'warpqueen', points: 39880, badgeCount: 6 },
  { rank: 4, username: 'ceramic', points: 35220, badgeCount: 4 },
  { rank: 5, username: 'meowmatrix', points: 31840, badgeCount: 5 },
]

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'What are Gmeow Points?',
    answer:
      'Paw Points are earned by completing quests, daily GM check-ins, and guild boosts. Stack them to unlock badges, raffles, and future drops.',
  },
  {
    question: 'Do I need a wallet to start?',
    answer:
      'No wallet required to begin — you can start from Warpcast Frames or the miniapp. Connect later to claim rewards on-chain.',
  },
  {
    question: 'What are Soulbound Badges?',
    answer:
      'Soulbound badges memorialize your biggest GM streaks, top referrers, or guild victories. Flex them forever.',
  },
  {
    question: 'How do guilds work?',
    answer:
      'Guilds let you pool streaks and boosts. Join or create one, deposit Paw Points, and climb the command leaderboard together.',
  },
  {
    question: 'Is everything free?',
    answer: 'Yes. Some quests may ask for onchain actions, but there are no platform fees or subscriptions.',
  },
]

const INTRO_STORAGE_KEY = 'gmeow:onboarding.v1'

function HomePage() {
  const { address, isConnected } = useAccount()
  const [forceIntro, setForceIntro] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return

    try {
      const stored = window.localStorage.getItem(INTRO_STORAGE_KEY)
      const shouldShow = !stored
      setForceIntro(shouldShow)
      if (shouldShow) {
        window.localStorage.setItem(INTRO_STORAGE_KEY, '1')
      }
    } catch {
      setForceIntro(false)
    }
  }, [hydrated])

  const handleIntroFinish = useCallback(() => {
    setForceIntro(false)
    try {
      window.localStorage.setItem(INTRO_STORAGE_KEY, '1')
    } catch {
      // ignore storage write errors
    }
  }, [])

  const handleStatsLoading = useCallback((loading: boolean) => {
    setStatsLoading(loading)
  }, [])

  const isWalletConnected = Boolean(isConnected && address)

  return (
    <>
      <OnboardingFlow forceShow={forceIntro} onComplete={handleIntroFinish} />
      <div className="page-root">
        <main>
          <OnchainHub loading={statsLoading} onLoadingChange={handleStatsLoading} />
          <HowItWorks />
          <LiveQuests quests={QUEST_PREVIEWS} />
          <GuildsShowcase guilds={GUILD_PREVIEWS} />
          <LeaderboardSection leaders={LEADERBOARD_PREVIEW} />
          <FAQSection items={FAQ_ITEMS} />
          {hydrated ? <ConnectWalletSection connected={isWalletConnected} /> : null}
        </main>
      </div>
    </>
  )
}

export default HomePage
