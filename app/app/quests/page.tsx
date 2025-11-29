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
      <div className="page-bg-quests min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold theme-text-primary mb-2">Quest Marketplace</h1>
            <p className="theme-text-secondary text-lg">
              Discover on-chain & social quests. Create your own and earn from completions! 🚀
            </p>
          </div>

          {/* Stats Bar */}
          {profile && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="theme-card-bg-primary">
                <CardBody>
                  <div className="text-sm theme-text-secondary mb-1">Your Points</div>
                  <div className="text-2xl font-bold theme-text-primary">{stats.total_earnings || 0}</div>
                </CardBody>
              </Card>
              <Card className="theme-card-bg-primary">
                <CardBody>
                  <div className="text-sm theme-text-secondary mb-1">Quests Completed</div>
                  <div className="text-2xl font-bold theme-text-primary">{stats.quests_completed}</div>
                </CardBody>
              </Card>
              <Card className="theme-card-bg-primary">
                <CardBody>
                  <div className="text-sm theme-text-secondary mb-1">Quests Created</div>
                  <div className="text-2xl font-bold theme-text-primary">{stats.quests_created}</div>
                </CardBody>
              </Card>
              <Card className="theme-card-bg-primary">
                <CardBody>
                  <div className="text-sm theme-text-secondary mb-1">Total Earnings</div>
                  <div className="text-2xl font-bold theme-text-primary">{stats.total_earnings}</div>
                </CardBody>
              </Card>
            </div>
          )}

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveTab('discover')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'discover'
                  ? 'theme-bg-primary theme-text-primary-contrast'
                  : 'theme-surface-subtle theme-text-secondary hover:theme-surface-hover'
              }`}
            >
              🔍 Discover Quests
            </button>
            <button
              onClick={() => setActiveTab('my-quests')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'my-quests'
                  ? 'theme-bg-primary theme-text-primary-contrast'
                  : 'theme-surface-subtle theme-text-secondary hover:theme-surface-hover'
              }`}
            >
              ✅ My Quests
            </button>
            <button
              onClick={() => setActiveTab('my-created')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'my-created'
                  ? 'theme-bg-primary theme-text-primary-contrast'
                  : 'theme-surface-subtle theme-text-secondary hover:theme-surface-hover'
              }`}
            >
              🎨 My Created
            </button>
          </div>

          {/* Category Filter (only in Discover tab) */}
          {activeTab === 'discover' && (
            <div className="space-y-4 mb-6">
              <div className="flex flex-wrap gap-3">
                <Button
                  variant={categoryFilter === 'all' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setCategoryFilter('all')}
                >
                  All Quests
                </Button>
                <Button
                  variant={categoryFilter === 'onchain' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setCategoryFilter('onchain')}
                >
                  <QuestIcon type="onchain" size={16} />
                  On-Chain
                </Button>
                <Button
                  variant={categoryFilter === 'social' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setCategoryFilter('social')}
                >
                  <QuestIcon type="social" size={16} />
                  Social
                </Button>
              </div>

              {/* Search & Sort */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <input
                  type="text"
                  placeholder="Search quests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 rounded-lg theme-bg-overlay theme-border-default border theme-text-primary placeholder:theme-text-secondary"
                />

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="px-4 py-2 rounded-lg theme-bg-overlay theme-border-default border theme-text-primary"
                >
                  <option value="newest">Newest First</option>
                  <option value="popular">Most Popular</option>
                  <option value="reward">Highest Reward</option>
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as QuestStatus)}
                  className="px-4 py-2 rounded-lg theme-bg-overlay theme-border-default border theme-text-primary"
                >
                  <option value="active">Active Only</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>
          )}

          {/* Create Quest Button */}
          {activeTab === 'discover' && (
            <div className="mb-6">
              <Button
                variant="primary"
                size="lg"
                className="w-full md:w-auto"
                onClick={() => setShowCreateModal(true)}
                disabled={!profile || (stats.total_earnings || 0) < 100}
              >
                ✨ Create Quest (100+ pts required)
              </Button>
              {profile && (stats.total_earnings || 0) < 100 && (
                <p className="text-sm theme-text-danger mt-2">
                  You need at least 100 points to create a quest
                </p>
              )}
            </div>
          )}

          {/* Quest Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="theme-card-bg-primary">
                  <div className="h-48 theme-bg-subtle animate-pulse" />
                  <CardBody className="space-y-3">
                    <div className="h-6 theme-bg-subtle rounded animate-pulse" />
                    <div className="h-4 theme-bg-subtle rounded animate-pulse w-3/4" />
                    <div className="h-4 theme-bg-subtle rounded animate-pulse w-1/2" />
                    <div className="h-10 theme-bg-subtle rounded animate-pulse" />
                  </CardBody>
                </Card>
              ))}
            </div>
          ) : filteredQuests.length === 0 ? (
            <Card className="theme-card-bg-primary">
              <CardBody className="text-center py-12">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-xl font-semibold theme-text-primary mb-2">No quests found</h3>
                <p className="theme-text-secondary mb-4">
                  {activeTab === 'discover' && searchTerm.trim() && 'Try adjusting your search or filters'}
                  {activeTab === 'discover' && !searchTerm.trim() && 'Be the first to create a quest!'}
                  {activeTab === 'my-quests' && 'Complete your first quest to see it here'}
                  {activeTab === 'my-created' && 'Create your first quest to start earning'}
                </p>
                {activeTab === 'discover' && !searchTerm.trim() && (
                  <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                    Create Quest
                  </Button>
                )}
              </CardBody>
            </Card>
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
  const categoryColor = quest.category === 'onchain' 
    ? 'bg-purple-500/20 text-purple-300 dark:text-purple-400' 
    : 'bg-sky-500/20 text-sky-300 dark:text-sky-400'
  
  return (
    <Card className="theme-card-bg-primary hover:scale-105 transition-transform overflow-hidden">
      {/* Quest Image */}
      {quest.quest_image_url ? (
        <img
          src={quest.quest_image_url}
          alt={quest.title}
          className="w-full h-48 object-cover"
        />
      ) : (
        <div className={`w-full h-48 flex items-center justify-center ${quest.category === 'onchain' ? 'bg-gradient-to-br from-purple-500/10 to-purple-600/20 dark:from-purple-500/20 dark:to-purple-600/30' : 'bg-gradient-to-br from-sky-500/10 to-sky-600/20 dark:from-sky-500/20 dark:to-sky-600/30'}`}>
          <QuestIcon type={quest.category} size={64} className="opacity-40" />
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold theme-text-primary truncate mb-1">
              {quest.title}
            </h3>
            <p className="text-sm theme-text-secondary line-clamp-2">
              {quest.description}
            </p>
          </div>
          <Badge className={categoryColor} size="sm">
            <QuestIcon type={quest.category} size={14} className="mr-1" />
            {quest.category === 'onchain' ? 'On-Chain' : 'Social'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardBody className="space-y-3">
        {/* Quest Type */}
        <div className="flex items-center gap-2">
          <span className="text-xs theme-text-secondary">Type:</span>
          <Badge variant="info" size="sm" className="flex items-center gap-1.5">
            <QuestIcon type={quest.type} size={14} />
            {questTypeLabels[quest.type]}
          </Badge>
        </div>

        {/* Rewards */}
        <div className="flex items-center justify-between py-2 px-3 rounded-lg theme-card-bg-secondary">
          <span className="text-sm theme-text-secondary">Reward:</span>
          <span className="text-lg font-bold theme-text-primary">
            {quest.reward_points} pts
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="theme-text-secondary mb-1">Completions</div>
            <div className="font-semibold theme-text-primary">{quest.total_completions}</div>
          </div>
          <div>
            <div className="theme-text-secondary mb-1">Creator Share</div>
            <div className="font-semibold theme-text-primary">{quest.creator_earnings_percent}%</div>
          </div>
        </div>

        {/* Complete Button */}
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={() => onComplete(quest.id)}
        >
          Complete Quest
        </Button>
      </CardBody>
    </Card>
  )
}
