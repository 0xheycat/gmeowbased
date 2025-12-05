'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { QuestCard } from '@/components/quests'
import type { QuestFilterKey, QuestPreview } from './types'
import { formatQuestTypeLabel } from '@/lib/formatters'
import { CHAIN_LABEL } from '@/lib/gmeow-utils'

const QUEST_FILTERS: { key: QuestFilterKey; label: string }[] = [
  { key: 'all', label: 'ALL' },
  { key: 'FARCASTER_CAST', label: 'CAST' },
  { key: 'FARCASTER_FRAME_INTERACT', label: 'FRAME' },
  { key: 'GENERIC', label: 'UTILITY' },
]

type Props = {
  quests: QuestPreview[]
}

export function LiveQuests({ quests }: Props) {
  const [activeTab, setActiveTab] = useState<QuestFilterKey>('all')

  const filtered = useMemo(() => {
    if (activeTab === 'all') return quests
    return quests.filter((quest) => quest.questType === activeTab)
  }, [activeTab, quests])

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
              className={`px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
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
              key={quest.questId}
              id={quest.questId}
              title={quest.title}
              slug={quest.href.replace('/quests/', '')}
              category={formatQuestTypeLabel(quest.questType)}
              coverImage="/images/quest-placeholder.jpg"
              xpReward={quest.reward}
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
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold text-lg transition-colors shadow-lg hover:shadow-xl"
          >
            Browse All Quests
          </Link>
        </div>
      </div>
    </section>
  )
}
