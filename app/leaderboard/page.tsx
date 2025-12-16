'use client'

/**
 * Leaderboard Page
 * 
 * Features:
 * - 9 category tabs (All, Quest, Viral, Guild, Referral, Streak, Badge, Tip, NFT)
 * - 12-tier rank system with trophy icons
 * - Time period filtering (24h, 7d, all-time)
 * - Search by name/FID
 * - Pagination (15 per page)
 * - Mobile responsive
 * - Real-time updates from API
 */

import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable'
import { useLeaderboard } from '@/lib/hooks/useLeaderboard'
import { TierFilter, TIER_OPTIONS, type TierFilterOption } from '@/components/leaderboard/TierFilter'
import { StatsCard } from '@/components/leaderboard/StatsCard'
import { useLeaderboardStats } from '@/lib/hooks/useLeaderboardStats'
import { useLeaderboardRealtime, type RankChangePayload } from '@/lib/hooks/useLeaderboardRealtime'

// Option 1: Import from centralized icon index
import { 
  EmojiEventsIcon as Trophy,
  StarIcon as Star,
  BoltIcon as FlashIcon,
  PeopleIcon as ProfileIcon,
  AddIcon as Plus,
  LoopIcon,
  StarIcon as StarFill,
  SwapHorizIcon as ExchangeIcon,
  CurrencyBitcoinIcon as Bitcoin
} from '@/components/icons'
// Option 2: Direct MUI imports (also works!)
// import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
// import StarIcon from '@mui/icons-material/Star'
// import BoltIcon from '@mui/icons-material/Bolt'
import { motion, AnimatePresence } from 'framer-motion'
import { Tabs, Tab, TabList, TabPanels, TabPanel } from '@/components/ui/tab'
import { useState, useCallback } from 'react'

export default function LeaderboardPage() {
  const [selectedTier, setSelectedTier] = useState('all')
  
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-3 flex items-center gap-3">
          <Trophy className="size-10 text-yellow-500" />
          <h1 className="bg-gradient-to-r from-gold via-brand to-purple-500 bg-clip-text text-4xl font-bold text-transparent">
            Leaderboard
          </h1>
        </div>
        <p className="text-lg text-gray-900 dark:text-gray-300">
          Compete for the top spot and unlock exclusive rewards
        </p>
      </motion.div>
      
      {/* Category Tabs */}
      <Tabs className="mb-6" size="md" isLazy>
        <TabList className="border-gray-200 dark:border-gray-700">
          <Tab>
            <span className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              All Pilots
            </span>
          </Tab>
          <Tab>
            <span className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              Quest Masters
            </span>
          </Tab>
          <Tab>
            <span className="flex items-center gap-2">
              <FlashIcon className="w-4 h-4" />
              Viral Legends
            </span>
          </Tab>
          <Tab>
            <span className="flex items-center gap-2">
              <ProfileIcon className="w-4 h-4" />
              Guild Heroes
            </span>
          </Tab>
          <Tab>
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Referral Champions
            </span>
          </Tab>
          <Tab>
            <span className="flex items-center gap-2">
              <LoopIcon className="w-4 h-4" />
              Streak Warriors
            </span>
          </Tab>
          <Tab>
            <span className="flex items-center gap-2">
              <StarFill className="w-4 h-4" />
              Badge Collectors
            </span>
          </Tab>
          <Tab>
            <span className="flex items-center gap-2">
              <ExchangeIcon className="w-4 h-4" />
              Tip Kings
            </span>
          </Tab>
          <Tab>
            <span className="flex items-center gap-2">
              <Bitcoin className="w-4 h-4" />
              NFT Whales
            </span>
          </Tab>
        </TabList>
        
        <TabPanels className="mt-6">
          <TabPanel><CategoryLeaderboard orderBy="total_score" selectedTier={selectedTier} setSelectedTier={setSelectedTier} /></TabPanel>
          <TabPanel><CategoryLeaderboard orderBy="base_points" selectedTier={selectedTier} setSelectedTier={setSelectedTier} /></TabPanel>
          <TabPanel><CategoryLeaderboard orderBy="viral_xp" selectedTier={selectedTier} setSelectedTier={setSelectedTier} /></TabPanel>
          <TabPanel><CategoryLeaderboard orderBy="guild_bonus" selectedTier={selectedTier} setSelectedTier={setSelectedTier} /></TabPanel>
          <TabPanel><CategoryLeaderboard orderBy="referral_bonus" selectedTier={selectedTier} setSelectedTier={setSelectedTier} /></TabPanel>
          <TabPanel><CategoryLeaderboard orderBy="streak_bonus" selectedTier={selectedTier} setSelectedTier={setSelectedTier} /></TabPanel>
          <TabPanel><CategoryLeaderboard orderBy="badge_prestige" selectedTier={selectedTier} setSelectedTier={setSelectedTier} /></TabPanel>
          <TabPanel><CategoryLeaderboard orderBy="tip_points" selectedTier={selectedTier} setSelectedTier={setSelectedTier} /></TabPanel>
          <TabPanel><CategoryLeaderboard orderBy="nft_points" selectedTier={selectedTier} setSelectedTier={setSelectedTier} /></TabPanel>
        </TabPanels>
      </Tabs>
      
      {/* Info Section */}
      <motion.div 
        className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-dark-bg-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">How Rankings Work</h2>
        <div className="space-y-4 text-gray-700 dark:text-gray-300">
          <p className="text-base">
            <span className="font-semibold text-green-600 dark:text-accent-green">Total Score</span> = Quest Points + Viral XP + Guild Bonus + Referrals + Streak + Badges + Tips + NFTs
          </p>
          <p className="text-sm">
            Rankings update every 6 hours. Complete quests, earn badges, tip others, collect NFTs, and invite friends to climb the leaderboard!
          </p>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <motion.div 
              className="rounded-lg border border-gray-200 bg-gray-50 p-4 transition-shadow hover:shadow-md dark:border-gray-700/50 dark:bg-dark-bg-elevated"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <span className="mb-1 block text-sm font-medium text-gray-900 dark:text-gray-300">Quest Points</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">Base rewards from contracts</span>
            </motion.div>
            <motion.div 
              className="rounded-lg border border-gray-200 bg-gray-50 p-4 transition-shadow hover:shadow-md dark:border-gray-700/50 dark:bg-dark-bg-elevated"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <span className="mb-1 block text-sm font-medium text-gray-900 dark:text-gray-300">Viral XP</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">Popular casts & engagement</span>
            </motion.div>
            <motion.div 
              className="rounded-lg border border-gray-200 bg-gray-50 p-4 transition-shadow hover:shadow-md dark:border-gray-700/50 dark:bg-dark-bg-elevated"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <span className="mb-1 block text-sm font-medium text-gray-900 dark:text-gray-300">Guild Bonus</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">Level × 100 points</span>
            </motion.div>
            <motion.div 
              className="rounded-lg border border-gray-200 bg-gray-50 p-4 transition-shadow hover:shadow-md dark:border-gray-700/50 dark:bg-dark-bg-elevated"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <span className="mb-1 block text-sm font-medium text-gray-900 dark:text-gray-300">Referrals</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">Count × 50 points</span>
            </motion.div>
            <motion.div 
              className="rounded-lg border border-gray-200 bg-gray-50 p-4 transition-shadow hover:shadow-md dark:border-gray-700/50 dark:bg-dark-bg-elevated"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <span className="mb-1 block text-sm font-medium text-gray-900 dark:text-gray-300">Streak Bonus</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">GM streak × 10 points</span>
            </motion.div>
            <motion.div 
              className="rounded-lg border border-gray-200 bg-gray-50 p-4 transition-shadow hover:shadow-md dark:border-gray-700/50 dark:bg-dark-bg-elevated"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <span className="mb-1 block text-sm font-medium text-gray-900 dark:text-gray-300">Badge Prestige</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">Badge count × 25 points</span>
            </motion.div>
            <motion.div 
              className="rounded-lg border border-gray-200 bg-gray-50 p-4 transition-shadow hover:shadow-md dark:border-gray-700/50 dark:bg-dark-bg-elevated"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <span className="mb-1 block text-sm font-medium text-gray-900 dark:text-gray-300">Tip Points</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">Earning & giving tips</span>
            </motion.div>
            <motion.div 
              className="rounded-lg border border-gray-200 bg-gray-50 p-4 transition-shadow hover:shadow-md dark:border-gray-700/50 dark:bg-dark-bg-elevated"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <span className="mb-1 block text-sm font-medium text-gray-900 dark:text-gray-300">NFT Points</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">Quest NFT rewards</span>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/**
 * Category Leaderboard Component
 * Renders leaderboard with specific orderBy sorting
 */
function CategoryLeaderboard({ 
  orderBy,
  selectedTier,
  setSelectedTier 
}: { 
  orderBy: 'total_score' | 'base_points' | 'viral_xp' | 'guild_bonus' | 'referral_bonus' | 'streak_bonus' | 'badge_prestige' | 'tip_points' | 'nft_points'
  selectedTier: string
  setSelectedTier: (tier: string) => void
}) {
  const {
    data,
    loading,
    error,
    currentPage,
    totalPages,
    totalCount,
    period,
    search,
    setPage,
    setPeriod,
    setSearch,
    refresh,
  } = useLeaderboard('all_time', 15, orderBy)
  
  // Fetch stats
  const { stats, isLoading: statsLoading, refetch: refetchStats } = useLeaderboardStats({ 
    period: period as 'daily' | 'weekly' | 'all_time'
  })
  
  // Realtime rank change handler (backend only, no UI notifications)
  const handleRankChange = useCallback((payload: RankChangePayload) => {
    // Rank changes handled silently - users see updated leaderboard in real-time
    // No notification spam for every rank change
  }, [])
  
  // Subscribe to realtime updates
  useLeaderboardRealtime({
    period: period as 'daily' | 'weekly' | 'all_time',
    onUpdate: () => {
      // Refetch data and stats on any change
      refresh()
      refetchStats()
    },
    onRankChange: handleRankChange,
    enabled: true, // Always enabled for live competitive experience
  })
  
  // Apply tier filter to data
  const filteredData = selectedTier === 'all' 
    ? data 
    : data.filter(entry => {
        const tierOption = TIER_OPTIONS.find(t => t.value === selectedTier)
        if (!tierOption) return true
        
        const score = entry.total_score
        if (tierOption.maxPoints !== undefined) {
          return score >= tierOption.minPoints && score <= tierOption.maxPoints
        }
        return score >= tierOption.minPoints
      })
  
  return (
    <>
      {/* Stats Card */}
      <StatsCard 
        stats={stats || undefined} 
        isLoading={statsLoading} 
        className="mb-6" 
      />
      
      {/* Tier Filter */}
      <div className="mb-6">
        <TierFilter 
          value={selectedTier} 
          onChange={setSelectedTier} 
          className="w-48" 
        />
      </div>
      
      {/* Error State */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-700/50 bg-red-900/20 p-4">
          <p className="text-sm text-red-400">
            Failed to load leaderboard: {error}
          </p>
          <p className="mt-2 text-xs text-red-500/70">
            Please check your internet connection and try refreshing the page.
          </p>
        </div>
      )}
      
      {/* Leaderboard Table */}
      <LeaderboardTable
        data={filteredData}
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={filteredData.length}
        period={period}
        searchQuery={search}
        onPageChange={setPage}
        onPeriodChange={setPeriod}
        onSearch={setSearch}
      />
    </>
  )
}
