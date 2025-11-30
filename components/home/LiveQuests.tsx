'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CHAIN_LABEL } from '@/lib/gmeow-utils'
import { buildFrameShareUrl, openWarpcastComposer } from '@/lib/share'
import { formatQuestTypeLabel } from '@/lib/formatters'
import type { QuestFilterKey, QuestPreview } from './types'

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
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<QuestFilterKey>('all')

  const filtered = useMemo(() => {
    if (activeTab === 'all') return quests
    return quests.filter((quest) => quest.questType === activeTab)
  }, [activeTab, quests])

  const handleShareQuest = useCallback(async (quest: QuestPreview) => {
    const share = buildFrameShareUrl({ type: 'quest', chain: quest.chain, questId: quest.questId })
    const embed = share && share.length > 0 ? share : undefined
    await openWarpcastComposer(`Join me on "${quest.title}" in GMEOW 🐱`, embed)
  }, [])

  return (
    <section className="live-quests">
      <h2>Live quests</h2>
      <div className="tabs" role="tablist">
        {QUEST_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={activeTab === key ? 'active' : ''}
            onClick={() => setActiveTab(key)}
            role="tab"
            aria-selected={activeTab === key}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="quests-grid">
        {filtered.map((quest) => (
          <div key={quest.questId} className="quest-card">
            <div className="quest-header">
              <span className="quest-type">{formatQuestTypeLabel(quest.questType)}</span>
              <span className="quest-chain">{CHAIN_LABEL[quest.chain] ?? quest.chain.toUpperCase()}</span>
            </div>
            <div className="quest-reward">+{quest.reward} 🐾</div>
            <h3>{quest.title}</h3>
            <div className="quest-card-actions">
              <button type="button" className="quest-start" onClick={() => router.push(quest.href)}>
                START QUEST
              </button>
              <button type="button" className="quest-share" onClick={() => handleShareQuest(quest)}>
                SHARE FRAME
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="quest-actions">
        <Link className="btn-primary" href="/Quest">
          BROWSE ALL QUESTS
        </Link>
      </div>
    </section>
  )
}
