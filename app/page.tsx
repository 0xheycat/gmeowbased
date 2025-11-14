'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { MiniappReady } from '@/components/MiniappReady'
import GmeowIntro from '@/components/intro/gmeowintro'
import { HeroSection } from '@/components/home/HeroSection'
import { OnchainHub } from '@/components/home/OnchainHub'
import { HowItWorks } from '@/components/home/HowItWorks'
import { LiveQuests } from '@/components/home/LiveQuests'
import { GuildsShowcase } from '@/components/home/GuildsShowcase'
import { LeaderboardSection } from '@/components/home/LeaderboardSection'
import { FAQSection } from '@/components/home/FAQSection'
import { ConnectWalletSection } from '@/components/home/ConnectWalletSection'
import type { FAQItem, GuildPreview, HeroUser, LeaderboardEntry, QuestPreview } from '@/components/home/types'
import { fetchUserByAddress, type FarcasterUser } from '@/lib/neynar'

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

const INTRO_STORAGE_KEY = 'gmeow:intro.cinema.v1'

function HomePage() {
  const { address, isConnected } = useAccount()
  const [userProfile, setUserProfile] = useState<FarcasterUser | null>(null)
  const [forceIntro, setForceIntro] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!address) {
      setUserProfile(null)
      return
    }

    let cancelled = false

    const loadProfile = async () => {
      try {
        const profile = await fetchUserByAddress(address)
        if (!cancelled) {
          setUserProfile(profile ?? null)
        }
      } catch {
        if (!cancelled) {
          setUserProfile(null)
        }
      }
    }

    loadProfile()

    return () => {
      cancelled = true
    }
  }, [address])

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

  const heroUser = useMemo<HeroUser>(() => {
    if (!userProfile) return {}
    return {
      fid: userProfile.fid ?? null,
      username: userProfile.username ?? userProfile.displayName ?? null,
      streak: userProfile.contractData?.currentStreak ?? 0,
      longestStreak: userProfile.contractData?.longestStreak ?? 0,
      totalGMs: userProfile.contractData?.totalGMs ?? 0,
      points: userProfile.contractData?.points ?? 0,
      lastGMTimestamp: userProfile.contractData?.lastGMTimestamp ?? null,
      canGM:
        typeof userProfile.contractData?.canGMToday === 'boolean' ? userProfile.contractData?.canGMToday : undefined,
      powerBadge: userProfile.powerBadge ?? null,
    }
  }, [userProfile])

  const scrollToStats = useCallback(() => {
    const target = document.getElementById('onchain-hub')
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const handleIntroFinish = useCallback(() => {
    setForceIntro(false)
    try {
      window.localStorage.setItem(INTRO_STORAGE_KEY, '1')
    } catch {
      // ignore storage write errors
    }
  }, [])

  const handleReplayIntro = useCallback(() => {
    try {
      window.localStorage.removeItem(INTRO_STORAGE_KEY)
    } catch {
      // ignore storage access issues
    }
    setForceIntro(true)
  }, [])

  const handleStatsLoading = useCallback((loading: boolean) => {
    setStatsLoading(loading)
  }, [])

  const isWalletConnected = Boolean(isConnected && address)

  return (
    <>
      <MiniappReady />
      <GmeowIntro forceShow={forceIntro} onFinish={handleIntroFinish} enableAudio />
      <div className="page-root">
        <main>
          <HeroSection
            user={heroUser}
            statsLoading={statsLoading}
            onRevealStats={scrollToStats}
            onReplayIntro={handleReplayIntro}
          />
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
