'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { QuestCard } from '@/components/quests'
import type { QuestFilterKey } from './types'
import { formatQuestTypeLabel } from '@/lib/formatters'

const QUEST_FILTERS: { key: QuestFilterKey; label: string }[] = [
  { key: 'all', label: 'ALL' },
  { key: 'FARCASTER_CAST', label: 'CAST' },
  { key: 'FARCASTER_FRAME_INTERACT', label: 'FRAME' },
  { key: 'GENERIC', label: 'UTILITY' },
]

interface Quest {
  id: string
  slug: string
  title: string
  questType: string
  xpReward: number
}

export function LiveQuests() {
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<QuestFilterKey>('all')

  useEffect(() => {
    async function fetchQuests() {
      try {
        const res = await fetch('/api/quests?featured=true&limit=6')
        if (!res.ok) throw new Error('Failed to fetch quests')
        const data = await res.json()
        setQuests(data.quests || [])
      } catch (error) {
        console.error('Failed to load quests:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchQuests()
  }, [])

  const filtered = useMemo(() => {
    if (activeTab === 'all') return quests
    return quests.filter((quest) => quest.questType === activeTab)
  }, [activeTab, quests])

  if (loading) {
    return <LiveQuestsSkeleton />
  }

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Live Quests</h2>
        
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-8" role="tablist">
          {QUEST_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 min-h-[44px] ${
                activeTab === key
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
              onClick={() => setActiveTab(key)}
              role="tab"
              aria-selected={activeTab === key}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Professional Quest Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filtered.map((quest, index) => (
            <QuestCard
              key={quest.id}
              id={quest.id}
              title={quest.title}
              slug={quest.slug}
              category={formatQuestTypeLabel(quest.questType)}
              coverImage="/images/quest-placeholder.jpg"
              xpReward={quest.xpReward}
              creator={{
                name: 'GMEOW',
                fid: 0,
                avatar: '/logo.png'
              }}
              participantCount={0}
              estimatedTime="~5 min"
              priority={index < 3}
            />
          ))}
        </div>

        {/* Browse All CTA */}
        <div className="flex justify-center">
          <Link
            href="/quests"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold text-lg transition-colors shadow-lg hover:shadow-xl min-h-[56px]"
          >
            Browse All Quests
          </Link>
        </div>
      </div>
    </section>
  )
}

function LiveQuestsSkeleton() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-8" />
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
              <div className="animate-pulse">
                <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
