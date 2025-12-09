'use client'

import dynamic from 'next/dynamic'
import { HeroWalletFirst } from '@/components/home/HeroWalletFirst'
import { PlatformStats } from '@/components/home/PlatformStats'

// Below-fold sections - dynamically loaded to improve initial page load
const OnchainHub = dynamic(() => import('@/components/home/OnchainHub').then(mod => ({ default: mod.OnchainHub })), {
  loading: () => <div className="animate-pulse bg-slate-100/5 dark:bg-white/5 rounded-lg h-96 mx-auto max-w-6xl my-16" />,
})

const HowItWorks = dynamic(() => import('@/components/home/HowItWorks').then(mod => ({ default: mod.HowItWorks })), {
  loading: () => <div className="animate-pulse bg-slate-100/5 dark:bg-white/5 rounded-lg h-96 mx-auto max-w-6xl my-16" />,
})

const LiveQuests = dynamic(() => import('@/components/home/LiveQuests').then(mod => ({ default: mod.LiveQuests })), {
  loading: () => <div className="animate-pulse bg-slate-100/5 dark:bg-white/5 rounded-lg h-96 mx-auto max-w-6xl my-16" />,
})

const GuildsShowcase = dynamic(() => import('@/components/home/GuildsShowcase').then(mod => ({ default: mod.GuildsShowcase })), {
  loading: () => <div className="animate-pulse bg-slate-100/5 dark:bg-white/5 rounded-lg h-96 mx-auto max-w-6xl my-16" />,
})

const LeaderboardSection = dynamic(() => import('@/components/home/LeaderboardSection').then(mod => ({ default: mod.LeaderboardSection })), {
  loading: () => <div className="animate-pulse bg-slate-100/5 dark:bg-white/5 rounded-lg h-96 mx-auto max-w-6xl my-16" />,
})

const FAQSection = dynamic(() => import('@/components/home/FAQSection').then(mod => ({ default: mod.FAQSection })), {
  loading: () => <div className="animate-pulse bg-slate-100/5 dark:bg-white/5 rounded-lg h-96 mx-auto max-w-6xl my-16" />,
})

const FAQ_ITEMS = [
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

function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <main>
        {/* Hero - Wallet-first with dual CTAs */}
        <HeroWalletFirst />

        {/* Platform Stats - Live data with animated counters */}
        <PlatformStats />

        {/* OnchainHub - Multi-chain wallet analytics */}
        <OnchainHub />

        {/* How It Works - 3 steps with SVG icons */}
        <HowItWorks />

        {/* Live Quests - Featured quests with filters */}
        <LiveQuests />

        {/* Top Guilds - Live guild leaderboard */}
        <GuildsShowcase />

        {/* Leaderboard - Top 5 users preview */}
        <LeaderboardSection />

        {/* FAQ - Common questions */}
        <FAQSection items={FAQ_ITEMS} />
      </main>
    </div>
  )
}

export default HomePage

