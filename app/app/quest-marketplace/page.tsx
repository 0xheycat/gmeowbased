'use client'

/**
 * Quest Marketplace - Unified On-Chain + Social Quests
 * Phase 13: User-generated quest marketplace
 * 
 * Features:
 * - Discover quests (on-chain + social)
 * - Create quests (spend points)
 * - Track completions
 * - Creator earnings dashboard
 * 
 * Design System:
 * - Tailwick v2.0 (Card, Button, Badge components)
 * - Gmeowbased v0.1 (55 SVG icons)
 * - Mobile-first responsive (1/2/3 columns)
 */

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { AppLayout } from '@/components/layouts/AppLayout'
import { 
  Card, 
  CardBody, 
  CardHeader,
  CardFooter,
  Badge, 
  Button,
  StatsCard
} from '@/components/ui/tailwick-primitives'
import { useAccount } from 'wagmi'
import { useUnifiedFarcasterAuth } from '@/hooks/useUnifiedFarcasterAuth'
import { QuestCreationWizard } from '@/components/features/QuestWizard'
import { QuestIcon, type QuestIconType } from '@/components/ui/QuestIcon'
import { XPEventOverlay, type XpEventPayload } from '@/components/XPEventOverlay'
import { calculateRankProgress } from '@/lib/rank'
import { emitRankTelemetryEvent } from '@/lib/rank-telemetry-client'
import { useDebounce } from '@/lib/hooks/useDebounce'

type QuestCategory = 'onchain' | 'social' | 'all'
type QuestStatus = 'active' | 'paused' | 'completed' | 'expired'
type SortBy = 'newest' | 'popular' | 'reward'
type QuestType = 
  | 'token_hold' | 'nft_own' | 'transaction_make' | 'multichain_gm' | 'contract_interact' | 'liquidity_provide' // On-chain
  | 'follow_user' | 'like_cast' | 'recast_cast' | 'reply_cast' | 'join_channel' | 'cast_mention' | 'cast_hashtag' // Social

interface UnifiedQuest {
  id: number
  title: string
  description: string
  category: 'onchain' | 'social'
  type: QuestType
  creator_fid: number
  creator_address: string
  reward_points: number
  reward_mode: 'points' | 'token' | 'nft'
  reward_token_address: string | null
  reward_token_amount: number | null
  reward_nft_address: string | null
  reward_nft_token_id: number | null
  creation_cost: number
  creator_earnings_percent: number
  total_completions: number
  total_earned_points: number
  verification_data: Record<string, any>
  status: QuestStatus
  max_completions: number | null
  expiry_date: string | null
  created_at: string
  updated_at: string
  quest_image_url: string | null
  quest_image_storage_path: string | null
}

const questTypeLabels: Record<QuestType, string> = {
  // On-chain
  token_hold: 'Hold Tokens',
  nft_own: 'Own NFT',
  transaction_make: 'Make Transaction',
  multichain_gm: 'Multi-Chain GM',
  contract_interact: 'Contract Interaction',
  liquidity_provide: 'Provide Liquidity',
  // Social
  follow_user: 'Follow User',
  like_cast: 'Like Cast',
  recast_cast: 'Recast Cast',
  reply_cast: 'Reply to Cast',
  join_channel: 'Join Channel',
  cast_mention: 'Mention User',
  cast_hashtag: 'Use Hashtag',
}

export default function QuestMarketplacePage() {
  const { address } = useAccount()
  const { profile, profileLoading, fid } = useUnifiedFarcasterAuth()
  
  const [activeTab, setActiveTab] = useState<'discover' | 'my-quests' | 'my-created'>('discover')
  const [categoryFilter, setCategoryFilter] = useState<QuestCategory>('all')
  const [statusFilter, setStatusFilter] = useState<QuestStatus>('active')
  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)
  
  const [quests, setQuests] = useState<UnifiedQuest[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  // XP celebration overlay
  const [xpCelebration, setXpCelebration] = useState<XpEventPayload | null>(null)
  
  // User stats
  const [stats, setStats] = useState({
    quests_completed: 0,
    quests_created: 0,
    total_earnings: 0
  })

  useEffect(() => {
    fetchQuests()
    if (profile?.fid) {
      fetchStats()
    }
  }, [categoryFilter, activeTab, profile?.fid])

  const fetchStats = async () => {
    if (!profile?.fid) return
    
    try {
      const response = await fetch(`/api/quests/marketplace/my?fid=${profile.fid}`)
      const data = await response.json()

      if (data.ok) {
        setStats({
          quests_completed: data.quests_completed || 0,
          quests_created: data.quests_created || 0,
          total_earnings: data.total_earnings || 0
        })
      }
    } catch (error) {
      console.error('[QuestMarketplace] Failed to fetch stats:', error)
    }
  }

  const fetchQuests = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      if (activeTab === 'my-quests' && address) params.set('completer', address)
      if (activeTab === 'my-created' && profile?.fid) params.set('creator_fid', String(profile.fid))
      params.set('status', statusFilter)

      const response = await fetch(`/api/quests/marketplace/list?${params.toString()}`)
      const data = await response.json()

      if (data.ok && data.quests) {
        setQuests(data.quests)
      }
    } catch (error) {
      console.error('[QuestMarketplace] Failed to fetch quests:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filtered & sorted quests (client-side for search & sort)
  const filteredQuests = useMemo(() => {
    let result = quests

    // Search filter
    if (debouncedSearch.trim()) {
      const needle = debouncedSearch.toLowerCase()
      result = result.filter(q =>
        q.title.toLowerCase().includes(needle) ||
        q.description.toLowerCase().includes(needle) ||
        questTypeLabels[q.type].toLowerCase().includes(needle)
      )
    }

    // Sort
    if (sortBy === 'newest') {
      result = [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (sortBy === 'popular') {
      result = [...result].sort((a, b) => b.total_completions - a.total_completions)
    } else if (sortBy === 'reward') {
      result = [...result].sort((a, b) => b.reward_points - a.reward_points)
    }

    return result
  }, [quests, debouncedSearch, sortBy])

  const handleCompleteQuest = async (questId: number) => {
    if (!address || !profile?.fid) {
      alert('Please connect wallet and sign in with Farcaster')
      return
    }

    // Find quest for metadata
    const quest = quests.find(q => q.id === questId)
    if (!quest) return

    try {
      const response = await fetch('/api/quests/marketplace/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quest_id: questId,
          completer_address: address,
          completer_fid: profile.fid
        })
      })

      const data = await response.json()

      if (data.ok) {
        // Show XP celebration overlay
        const progress = calculateRankProgress(data.total_points || stats.total_earnings + data.points_awarded)
        
        setXpCelebration({
          event: 'quest-claim',
          chainKey: 'base',
          xpEarned: data.points_awarded,
          totalPoints: data.total_points || stats.total_earnings + data.points_awarded,
          progress: progress,
          headline: `Quest Completed!`,
          visitUrl: null, // quest-claim has no visit button
          tierTagline: `+${data.points_awarded} points earned!`
        })

        // Refresh quest list & stats
        fetchQuests()
        if (profile?.fid) {
          fetchStats()
        }
      } else {
        alert(`Failed: ${data.error}`)
      }
    } catch (error) {
      console.error('[QuestMarketplace] Failed to complete quest:', error)
      alert('Failed to complete quest')
    }
  }

  return (
    <AppLayout fullPage>
      <div className="relative min-h-screen overflow-hidden">
        {/* Animated Background Gradients */}
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-sky-500/10 dark:from-purple-500/20 dark:to-sky-500/20 animate-gradient-shift" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 dark:bg-purple-500/30 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-sky-500/20 dark:bg-sky-500/30 rounded-full blur-3xl animate-float-delayed" />
        </div>

        <div className="relative p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Cinematic Header */}
            <div className="mb-12 text-center">
              <div className="inline-block mb-4 px-6 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-sky-500/20 dark:from-purple-500/30 dark:to-sky-500/30 border border-purple-500/30 dark:border-purple-500/40">
                <span className="text-sm font-semibold bg-gradient-to-r from-purple-400 to-sky-400 dark:from-purple-300 dark:to-sky-300 bg-clip-text text-transparent">
                  ✨ QUEST MARKETPLACE
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-pink-500 to-sky-500 dark:from-purple-400 dark:via-pink-400 dark:to-sky-400 bg-clip-text text-transparent animate-gradient-x">
                Command Your Adventure
              </h1>
              <p className="text-lg md:text-xl theme-text-secondary max-w-2xl mx-auto leading-relaxed">
                Discover cinematic on-chain & social quests. Create your own missions and earn from every completion. 🚀
              </p>
            </div>

            {/* Prestige Stats Dashboard */}
            {profile && (
              <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 via-transparent to-sky-500/10 dark:from-purple-500/20 dark:to-sky-500/20 backdrop-blur-sm border border-purple-500/20 dark:border-purple-500/30">
                <div className="text-center mb-6">
                  <div className="text-sm font-semibold theme-text-secondary mb-2">PILOT PRESTIGE</div>
                  <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-sky-400 dark:from-purple-300 dark:to-sky-300 bg-clip-text text-transparent">
                    {stats.total_earnings || 0} 🐾
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-xl bg-gradient-to-br from-purple-500/5 to-purple-600/10 dark:from-purple-500/10 dark:to-purple-600/20 border border-purple-500/20 dark:border-purple-500/30">
                    <div className="text-3xl mb-2">🎯</div>
                    <div className="text-2xl font-bold theme-text-primary mb-1">{stats.quests_completed}</div>
                    <div className="text-xs theme-text-secondary font-medium">MISSIONS COMPLETE</div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-gradient-to-br from-sky-500/5 to-sky-600/10 dark:from-sky-500/10 dark:to-sky-600/20 border border-sky-500/20 dark:border-sky-500/30">
                    <div className="text-3xl mb-2">✨</div>
                    <div className="text-2xl font-bold theme-text-primary mb-1">{stats.quests_created}</div>
                    <div className="text-xs theme-text-secondary font-medium">QUESTS DEPLOYED</div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-gradient-to-br from-pink-500/5 to-pink-600/10 dark:from-pink-500/10 dark:to-pink-600/20 border border-pink-500/20 dark:border-pink-500/30">
                    <div className="text-3xl mb-2">💎</div>
                    <div className="text-2xl font-bold theme-text-primary mb-1">{stats.total_earnings}</div>
                    <div className="text-xs theme-text-secondary font-medium">TOTAL EARNINGS</div>
                  </div>
                </div>
              </div>
            )}

            {/* Mission Control Tabs */}
            <div className="flex flex-wrap gap-3 mb-8 justify-center">
              <button
                onClick={() => setActiveTab('discover')}
                className={`group px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                  activeTab === 'discover'
                    ? 'bg-gradient-to-r from-purple-500 to-sky-500 text-white shadow-lg shadow-purple-500/50 dark:shadow-purple-500/30 scale-105'
                    : 'bg-white/50 dark:bg-gray-800/50 theme-text-secondary hover:bg-white/70 dark:hover:bg-gray-800/70 hover:scale-105 backdrop-blur-sm'
                }`}
              >
                <span className="flex items-center gap-2">
                  🔍 <span>DISCOVER MISSIONS</span>
                </span>
              </button>
              <button
                onClick={() => setActiveTab('my-quests')}
                className={`group px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                  activeTab === 'my-quests'
                    ? 'bg-gradient-to-r from-purple-500 to-sky-500 text-white shadow-lg shadow-purple-500/50 dark:shadow-purple-500/30 scale-105'
                    : 'bg-white/50 dark:bg-gray-800/50 theme-text-secondary hover:bg-white/70 dark:hover:bg-gray-800/70 hover:scale-105 backdrop-blur-sm'
                }`}
              >
                <span className="flex items-center gap-2">
                  ✅ <span>MY PROGRESS</span>
                </span>
              </button>
              <button
                onClick={() => setActiveTab('my-created')}
                className={`group px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                  activeTab === 'my-created'
                    ? 'bg-gradient-to-r from-purple-500 to-sky-500 text-white shadow-lg shadow-purple-500/50 dark:shadow-purple-500/30 scale-105'
                    : 'bg-white/50 dark:bg-gray-800/50 theme-text-secondary hover:bg-white/70 dark:hover:bg-gray-800/70 hover:scale-105 backdrop-blur-sm'
                }`}
              >
                <span className="flex items-center gap-2">
                  🎨 <span>MY CREATIONS</span>
                </span>
              </button>
            </div>

          {/* Category Filter (only in Discover tab) */}
          {activeTab === 'discover' && (
            <div className="space-y-6 mb-8">
              <div className="flex flex-wrap gap-3 justify-center">
                <Button
                  variant={categoryFilter === 'all' ? 'primary' : 'ghost'}
                  size="md"
                  onClick={() => setCategoryFilter('all')}
                  className="px-6 py-3 rounded-xl font-semibold hover:scale-105 transition-transform"
                >
                  ⚡ All Missions
                </Button>
                <Button
                  variant={categoryFilter === 'onchain' ? 'primary' : 'ghost'}
                  size="md"
                  onClick={() => setCategoryFilter('onchain')}
                  className="px-6 py-3 rounded-xl font-semibold hover:scale-105 transition-transform"
                >
                  <QuestIcon type="onchain" size={18} className="mr-2" />
                  On-Chain
                </Button>
                <Button
                  variant={categoryFilter === 'social' ? 'primary' : 'ghost'}
                  size="md"
                  onClick={() => setCategoryFilter('social')}
                  className="px-6 py-3 rounded-xl font-semibold hover:scale-105 transition-transform"
                >
                  <QuestIcon type="social" size={18} className="mr-2" />
                  Social
                </Button>
              </div>

              {/* Search & Sort */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="🔍 Search missions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-5 py-3 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-purple-500/20 dark:border-purple-500/30 theme-text-primary placeholder:theme-text-secondary focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all"
                  />
                </div>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="px-5 py-3 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-purple-500/20 dark:border-purple-500/30 theme-text-primary focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all"
                >
                  <option value="newest">⏰ Newest First</option>
                  <option value="popular">🔥 Most Popular</option>
                  <option value="reward">💎 Highest Reward</option>
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as QuestStatus)}
                  className="px-5 py-3 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-purple-500/20 dark:border-purple-500/30 theme-text-primary focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all"
                >
                  <option value="active">✅ Active Only</option>
                  <option value="paused">⏸️ Paused</option>
                  <option value="completed">🏆 Completed</option>
                  <option value="expired">⏱️ Expired</option>
                </select>
              </div>
            </div>
          )}

          {/* Create Quest Button */}
          {activeTab === 'discover' && (
            <div className="mb-8 text-center">
              <button
                onClick={() => setShowCreateModal(true)}
                disabled={!profile || (stats.total_earnings || 0) < 100}
                className={`group relative px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                  !profile || (stats.total_earnings || 0) < 100
                    ? 'bg-gray-400 dark:bg-gray-600 text-gray-200 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-500 to-sky-500 text-white shadow-lg shadow-purple-500/50 dark:shadow-purple-500/30 hover:scale-110 hover:shadow-xl hover:shadow-purple-500/60 dark:hover:shadow-purple-500/40'
                }`}
              >
                <span className="flex items-center gap-2">
                  ✨ <span>DEPLOY YOUR QUEST</span>
                </span>
                {(!profile || (stats.total_earnings || 0) < 100) && (
                  <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs theme-text-danger whitespace-nowrap">
                    Requires 100+ Paw Points 🐾
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Quest Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="group relative rounded-2xl overflow-hidden bg-gradient-to-br from-purple-500/10 to-sky-500/10 dark:from-purple-500/20 dark:to-sky-500/20 border border-purple-500/20 dark:border-purple-500/30 animate-pulse">
                  <div className="h-56 bg-gradient-to-br from-purple-500/20 to-sky-500/20" />
                  <div className="p-6 space-y-4">
                    <div className="h-7 bg-white/20 dark:bg-gray-700/20 rounded-lg" />
                    <div className="h-5 bg-white/15 dark:bg-gray-700/15 rounded-lg w-3/4" />
                    <div className="h-5 bg-white/15 dark:bg-gray-700/15 rounded-lg w-1/2" />
                    <div className="h-12 bg-white/20 dark:bg-gray-700/20 rounded-xl mt-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredQuests.length === 0 ? (
            <div className="text-center py-20 px-6 rounded-2xl bg-gradient-to-br from-purple-500/5 to-sky-500/5 dark:from-purple-500/10 dark:to-sky-500/10 border border-purple-500/20 dark:border-purple-500/30">
              <div className="text-8xl mb-6 animate-bounce">🎯</div>
              <h3 className="text-2xl font-bold theme-text-primary mb-3">No Missions Found</h3>
              <p className="text-lg theme-text-secondary mb-6 max-w-md mx-auto">
                {activeTab === 'discover' && searchTerm.trim() && 'Try adjusting your search parameters'}
                {activeTab === 'discover' && !searchTerm.trim() && 'Be the first pilot to deploy a quest!'}
                {activeTab === 'my-quests' && 'Complete your first mission to see your progress'}
                {activeTab === 'my-created' && 'Create your first quest to start earning'}
              </p>
              {activeTab === 'discover' && !searchTerm.trim() && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-8 py-4 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-sky-500 text-white shadow-lg shadow-purple-500/50 dark:shadow-purple-500/30 hover:scale-110 transition-transform"
                >
                  ✨ DEPLOY QUEST
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredQuests.map((quest) => (
                <QuestCard 
                  key={quest.id} 
                  quest={quest}
                  onComplete={handleCompleteQuest}
                />
              ))}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Quest Creation Wizard */}
      <QuestCreationWizard
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          // Refresh quest list after creation
          fetchQuests()
          if (profile?.fid) {
            fetchStats()
          }
        }}
        userBalance={stats.total_earnings}
        userFid={profile?.fid || 0}
      />

      {/* XP Celebration Overlay */}
      {xpCelebration && (
        <XPEventOverlay
          payload={xpCelebration}
          open={Boolean(xpCelebration)}
          onClose={() => setXpCelebration(null)}
        />
      )}
    </AppLayout>
  )
}

/**
 * QuestCard - Unified quest display component
 */
interface QuestCardProps {
  quest: UnifiedQuest
  onComplete: (questId: number) => void
}

function QuestCard({ quest, onComplete }: QuestCardProps) {
  const isOnchain = quest.category === 'onchain'
  
  return (
    <div className="group relative rounded-2xl overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-purple-500/20 dark:border-purple-500/30 hover:border-purple-500/50 dark:hover:border-purple-500/60 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/30 dark:hover:shadow-purple-500/20 transition-all duration-300">
      {/* Animated Gradient Overlay */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
        isOnchain 
          ? 'bg-gradient-to-br from-purple-500/10 via-transparent to-purple-600/10' 
          : 'bg-gradient-to-br from-sky-500/10 via-transparent to-sky-600/10'
      }`} />
      
      {/* Quest Banner Image */}
      <div className="relative h-56 overflow-hidden">
        {quest.quest_image_url ? (
          <img
            src={quest.quest_image_url}
            alt={quest.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${
            isOnchain 
              ? 'bg-gradient-to-br from-purple-500/20 via-purple-600/10 to-purple-700/20 dark:from-purple-500/30 dark:via-purple-600/20 dark:to-purple-700/30' 
              : 'bg-gradient-to-br from-sky-500/20 via-sky-600/10 to-sky-700/20 dark:from-sky-500/30 dark:via-sky-600/20 dark:to-sky-700/30'
          }`}>
            <QuestIcon type={quest.category} size={80} className="opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-300" />
          </div>
        )}
        
        {/* Category Badge Overlay */}
        <div className="absolute top-4 right-4">
          <div className={`px-4 py-2 rounded-xl backdrop-blur-md font-bold text-sm shadow-lg ${
            isOnchain
              ? 'bg-purple-500/90 text-white border border-purple-400/50'
              : 'bg-sky-500/90 text-white border border-sky-400/50'
          }`}>
            <span className="flex items-center gap-2">
              <QuestIcon type={quest.category} size={16} />
              {isOnchain ? 'ON-CHAIN' : 'SOCIAL'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Quest Details */}
      <div className="relative p-6 space-y-4">
        {/* Title & Description */}
        <div>
          <h3 className="text-xl font-bold theme-text-primary mb-2 line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
            {quest.title}
          </h3>
          <p className="text-sm theme-text-secondary line-clamp-2">
            {quest.description}
          </p>
        </div>

        {/* Quest Type Badge */}
        <div className="flex items-center gap-2">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${
            isOnchain
              ? 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 dark:border-purple-500/40'
              : 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30 dark:border-sky-500/40'
          }`}>
            <QuestIcon type={quest.type} size={14} />
            {questTypeLabels[quest.type]}
          </div>
        </div>

        {/* Reward Display */}
        <div className="relative p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-pink-500/10 dark:from-yellow-500/20 dark:via-orange-500/20 dark:to-pink-500/20 border border-yellow-500/30 dark:border-yellow-500/40 overflow-hidden">
          {/* Sparkle animation overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
          
          <div className="relative flex items-center justify-between">
            <span className="text-sm font-semibold theme-text-secondary">🎁 REWARD</span>
            <span className="text-2xl font-black bg-gradient-to-r from-yellow-600 via-orange-500 to-pink-600 dark:from-yellow-400 dark:via-orange-400 dark:to-pink-400 bg-clip-text text-transparent">
              +{quest.reward_points} 🐾
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="text-2xl font-bold theme-text-primary">{quest.total_completions}</div>
            <div className="text-xs theme-text-secondary font-medium">COMPLETIONS</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold theme-text-primary">{quest.creator_earnings_percent}%</div>
            <div className="text-xs theme-text-secondary font-medium">CREATOR SHARE</div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => onComplete(quest.id)}
          className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-500 to-sky-500 hover:from-purple-600 hover:to-sky-600 shadow-lg shadow-purple-500/30 dark:shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/50 dark:hover:shadow-purple-500/30 hover:scale-105 transition-all duration-300 group/btn"
        >
          <span className="flex items-center justify-center gap-2">
            <span>START MISSION</span>
            <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
          </span>
        </button>
      </div>
    </div>
  )
}
