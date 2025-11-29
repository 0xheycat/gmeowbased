'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Card, 
  CardBody, 
  CardHeader,
  CardFooter,
  Badge, 
  Button, 
  StatsCard,
  SectionHeading,
  EmptyState,
  IconWithBadge
} from '@/components/ui/tailwick-primitives'
import { AppLayout } from '@/components/layouts/AppLayout'

type QuestType = 'daily' | 'weekly' | 'event' | 'milestone' | 'achievement'
type QuestCategory = 'social' | 'engagement' | 'guild' | 'gm' | 'onboarding'
type QuestDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert'
type QuestStatus = 'locked' | 'available' | 'in_progress' | 'completed' | 'claimed' | 'expired'

interface Quest {
  id: number
  quest_name: string
  quest_slug: string
  quest_type: QuestType
  category: QuestCategory
  description: string
  requirements: Record<string, any>
  reward_xp: number
  reward_points: number
  reward_badges: string[]
  difficulty: QuestDifficulty
  is_featured: boolean
  icon_path: string | null
  user_status?: QuestStatus
  user_progress?: Record<string, any> | null
  started_at?: string | null
  completed_at?: string | null
  claimed_at?: string | null
}

const difficultyColors = {
  beginner: 'bg-green-500/20 border-green-500/30 text-green-400',
  intermediate: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
  advanced: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
  expert: 'bg-red-500/20 border-red-500/30 text-red-400',
}

const statusColors = {
  locked: 'info',
  available: 'primary',
  in_progress: 'warning',
  completed: 'success',
  claimed: 'info',
  expired: 'danger',
} as const

const categoryIcons = {
  social: '/assets/gmeow-icons/Friends Icon.svg',
  engagement: '/assets/gmeow-icons/Thumbs Up Icon.svg',
  guild: '/assets/gmeow-icons/Groups Icon.svg',
  gm: '/assets/gmeow-icons/Newsfeed Icon.svg',
  onboarding: '/assets/gmeow-icons/Login Icon.svg',
}

export default function QuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const [claimingId, setClaimingId] = useState<number | null>(null)
  const [filterType, setFilterType] = useState<QuestType | 'all'>('all')
  const [filterCategory, setFilterCategory] = useState<QuestCategory | 'all'>('all')
  const [filterDifficulty, setFilterDifficulty] = useState<QuestDifficulty | 'all'>('all')

  useEffect(() => {
    fetchQuests()
  }, [filterType, filterCategory, filterDifficulty])

  const fetchQuests = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterType !== 'all') params.set('type', filterType)
      if (filterCategory !== 'all') params.set('category', filterCategory)
      if (filterDifficulty !== 'all') params.set('difficulty', filterDifficulty)

      const response = await fetch(`/api/quests?${params.toString()}`)
      const data = await response.json()

      if (data.quests) {
        setQuests(data.quests)
      }
    } catch (error) {
      console.error('Failed to fetch quests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClaimReward = async (questId: number) => {
    setClaimingId(questId)
    try {
      const response = await fetch('/api/quests/claim-rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quest_id: questId })
      })

      const data = await response.json()

      if (data.success) {
        // Refresh quests to update status
        await fetchQuests()
        // TODO: Show success toast with rewards earned
        console.log('Rewards claimed:', data.rewards)
      } else {
        console.error('Failed to claim rewards:', data.error)
      }
    } catch (error) {
      console.error('Failed to claim reward:', error)
    } finally {
      setClaimingId(null)
    }
  }

  const getProgressPercent = (quest: Quest): number => {
    if (!quest.user_progress) return 0
    const progress = quest.user_progress as any
    if (progress.current && progress.target) {
      return Math.min(100, Math.round((progress.current / progress.target) * 100))
    }
    return 0
  }

  const availableQuests = quests.filter(q => q.user_status === 'available' || q.user_status === 'in_progress')
  const completedQuests = quests.filter(q => q.user_status === 'completed')
  const claimedQuests = quests.filter(q => q.user_status === 'claimed')

  return (
    <AppLayout fullPage>
      <div className="page-bg-quests p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/app" 
            className="inline-flex items-center gap-2 theme-text-secondary hover:theme-text-primary transition-colors mb-4"
          >
            <span>←</span> Back to Home
          </Link>
          
          <IconWithBadge
            icon="/assets/gmeow-icons/Quests Icon.svg"
            iconAlt="Quest Hub"
            iconSize={60}
            badge={quests.length > 0 ? { content: quests.length, variant: 'primary' } : undefined}
          />

          <SectionHeading
            title="Quest Hub"
            subtitle="Complete challenges to earn XP, points, and exclusive badges across multiple chains"
            className="mb-6"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatsCard
            icon="/assets/gmeow-icons/Quests Icon.svg"
            iconAlt="Available"
            label="Available"
            value={availableQuests.length}
            gradient="purple"
            loading={loading}
          />
          <StatsCard
            icon="/assets/gmeow-icons/Success Box Icon.svg"
            iconAlt="Completed"
            label="Completed"
            value={completedQuests.length}
            gradient="green"
            loading={loading}
          />
          <StatsCard
            icon="/assets/gmeow-icons/Trophy Icon.svg"
            iconAlt="Claimed"
            label="Claimed"
            value={claimedQuests.length}
            gradient="orange"
            loading={loading}
          />
          <StatsCard
            icon="/assets/gmeow-icons/Rank Icon.svg"
            iconAlt="Total XP"
            label="Total XP"
            value={quests.reduce((sum, q) => sum + (q.user_status === 'claimed' ? q.reward_xp : 0), 0)}
            gradient="blue"
            loading={loading}
          />
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-2">Quest Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as QuestType | 'all')}
                  className="w-full px-4 py-2 theme-bg-subtle border theme-border-subtle rounded-lg theme-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Types</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="milestone">Milestone</option>
                  <option value="achievement">Achievement</option>
                  <option value="event">Event</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-2">Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value as QuestCategory | 'all')}
                  className="w-full px-4 py-2 theme-bg-subtle border theme-border-subtle rounded-lg theme-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Categories</option>
                  <option value="gm">Daily GM</option>
                  <option value="social">Social</option>
                  <option value="engagement">Engagement</option>
                  <option value="guild">Guild</option>
                  <option value="onboarding">Onboarding</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-2">Difficulty</label>
                <select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value as QuestDifficulty | 'all')}
                  className="w-full px-4 py-2 theme-bg-subtle border theme-border-subtle rounded-lg theme-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        )}

        {/* Empty State */}
        {!loading && quests.length === 0 && (
          <EmptyState
            icon="/assets/gmeow-icons/Quests Icon.svg"
            iconAlt="No Quests"
            title="No Quests Available"
            description="Check back later for new challenges or try adjusting your filters."
            action={
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setFilterType('all')
                  setFilterCategory('all')
                  setFilterDifficulty('all')
                }}
              >
                Clear Filters
              </Button>
            }
          />
        )}

        {/* Available & In Progress Quests */}
        {!loading && availableQuests.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold theme-text-primary mb-4">Available Quests</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableQuests.map((quest) => (
                <Card key={quest.id} hover className={difficultyColors[quest.difficulty]}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      {quest.icon_path && (
                        <Image
                          src={quest.icon_path}
                          alt={quest.quest_name}
                          width={48}
                          height={48}
                          className="rounded-lg"
                        />
                      )}
                      {!quest.icon_path && categoryIcons[quest.category] && (
                        <Image
                          src={categoryIcons[quest.category]}
                          alt={quest.category}
                          width={48}
                          height={48}
                          className="opacity-80"
                        />
                      )}
                      <div className="flex flex-col gap-2">
                        {quest.is_featured && (
                          <Badge variant="warning" size="sm">⭐ Featured</Badge>
                        )}
                        <Badge variant={statusColors[quest.user_status || 'available']} size="sm">
                          {quest.user_status === 'in_progress' ? '⏳ In Progress' : '✓ Available'}
                        </Badge>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold theme-text-primary mb-2">{quest.quest_name}</h3>
                    <p className="theme-text-secondary text-sm mb-4">{quest.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="info" size="sm">{quest.quest_type}</Badge>
                      <Badge variant="info" size="sm">{quest.category}</Badge>
                      <Badge variant="info" size="sm">{quest.difficulty}</Badge>
                    </div>
                  </CardHeader>

                  <CardBody>
                    {/* Progress Bar */}
                    {quest.user_status === 'in_progress' && quest.user_progress && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm theme-text-secondary mb-2">
                          <span>Progress</span>
                          <span>{getProgressPercent(quest)}%</span>
                        </div>
                        <div className="w-full theme-bg-subtle rounded-full h-2">
                          <div 
                            className="gradient-progress-bar"
                            style={{ width: `${getProgressPercent(quest)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Rewards */}
                    <div className="flex items-center gap-4 text-sm">
                      {quest.reward_xp > 0 && (
                        <div className="flex items-center gap-1 text-yellow-400">
                          <Image src="/assets/gmeow-icons/Rank Icon.svg" alt="XP" width={16} height={16} />
                          <span>{quest.reward_xp} XP</span>
                        </div>
                      )}
                      {quest.reward_points > 0 && (
                        <div className="flex items-center gap-1 text-blue-400">
                          <Image src="/assets/gmeow-icons/Credits Icon.svg" alt="Points" width={16} height={16} />
                          <span>{quest.reward_points} pts</span>
                        </div>
                      )}
                      {quest.reward_badges.length > 0 && (
                        <div className="flex items-center gap-1 text-purple-400">
                          <Image src="/assets/gmeow-icons/Badges Icon.svg" alt="Badges" width={16} height={16} />
                          <span>{quest.reward_badges.length} badge{quest.reward_badges.length > 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  </CardBody>

                  <CardFooter>
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full"
                      disabled={quest.user_status === 'locked'}
                    >
                      {quest.user_status === 'in_progress' ? 'Continue Quest' : 'Start Quest'}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Completed Quests (Ready to Claim) */}
        {!loading && completedQuests.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold theme-text-primary mb-4">Ready to Claim</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedQuests.map((quest) => (
                <Card key={quest.id} hover gradient="green">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      {quest.icon_path && (
                        <Image
                          src={quest.icon_path}
                          alt={quest.quest_name}
                          width={48}
                          height={48}
                          className="rounded-lg"
                        />
                      )}
                      {!quest.icon_path && categoryIcons[quest.category] && (
                        <Image
                          src={categoryIcons[quest.category]}
                          alt={quest.category}
                          width={48}
                          height={48}
                          className="opacity-80"
                        />
                      )}
                      <Badge variant="success" size="sm">✓ Completed</Badge>
                    </div>
                    <h3 className="text-xl font-bold theme-text-primary mb-2">{quest.quest_name}</h3>
                    <p className="theme-text-secondary text-sm mb-4">{quest.description}</p>
                  </CardHeader>

                  <CardBody>
                    {/* Rewards */}
                    <div className="flex items-center gap-4 text-sm mb-4">
                      {quest.reward_xp > 0 && (
                        <div className="flex items-center gap-1 text-yellow-400">
                          <Image src="/assets/gmeow-icons/Rank Icon.svg" alt="XP" width={16} height={16} />
                          <span>{quest.reward_xp} XP</span>
                        </div>
                      )}
                      {quest.reward_points > 0 && (
                        <div className="flex items-center gap-1 text-blue-400">
                          <Image src="/assets/gmeow-icons/Credits Icon.svg" alt="Points" width={16} height={16} />
                          <span>{quest.reward_points} pts</span>
                        </div>
                      )}
                      {quest.reward_badges.length > 0 && (
                        <div className="flex items-center gap-1 text-purple-400">
                          <Image src="/assets/gmeow-icons/Badges Icon.svg" alt="Badges" width={16} height={16} />
                          <span>{quest.reward_badges.length} badge{quest.reward_badges.length > 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  </CardBody>

                  <CardFooter>
                    <Button
                      variant="success"
                      size="md"
                      className="w-full"
                      loading={claimingId === quest.id}
                      onClick={() => handleClaimReward(quest.id)}
                    >
                      {claimingId === quest.id ? 'Claiming...' : '🎁 Claim Rewards'}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Claimed Quests */}
        {!loading && claimedQuests.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold theme-text-primary mb-4">Claimed Rewards</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {claimedQuests.map((quest) => (
                <Card key={quest.id} className="opacity-60">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      {quest.icon_path && (
                        <Image
                          src={quest.icon_path}
                          alt={quest.quest_name}
                          width={48}
                          height={48}
                          className="rounded-lg grayscale"
                        />
                      )}
                      {!quest.icon_path && categoryIcons[quest.category] && (
                        <Image
                          src={categoryIcons[quest.category]}
                          alt={quest.category}
                          width={48}
                          height={48}
                          className="opacity-50 grayscale"
                        />
                      )}
                      <Badge variant="info" size="sm">✓ Claimed</Badge>
                    </div>
                    <h3 className="text-lg font-bold theme-text-primary mb-2">{quest.quest_name}</h3>
                    <p className="theme-text-tertiary text-sm">{quest.description}</p>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    </AppLayout>
  )
}
