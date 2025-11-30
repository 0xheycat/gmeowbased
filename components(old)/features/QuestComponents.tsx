/**
 * Quest Components - Gmeowbased
 * Card-based quest system with difficulty levels and progress tracking
 * Adapted for quest system with difficulty levels
 */

'use client'

import React from 'react'
import Image from 'next/image'
import { Icon } from 'components(old)/ui/Icon'
import { getQuestMedalByDifficulty, icons } from '@/utils/assets'

export type QuestDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Expert'
export type QuestStatus = 'active' | 'completed' | 'locked'

export interface Quest {
  id: string
  title: string
  description: string
  difficulty: QuestDifficulty
  reward: number
  chain: string
  category: string
  requirements: Array<{
    text: string
    completed: boolean
  }>
  progress?: {
    current: number
    total: number
  }
  status: QuestStatus
  featured?: boolean
}

interface QuestCardProps {
  quest: Quest
  onStart?: (questId: string) => void
  onClaim?: (questId: string) => void
  loading?: boolean
}

// Difficulty configurations with Gmeowbased icons
const difficultyConfig = {
  Easy: { color: 'text-green-600', bgColor: 'theme-bg-success-subtle', iconBg: 'bg-green-100' },
  Medium: { color: 'text-blue-600', bgColor: 'theme-bg-info-subtle', iconBg: 'bg-blue-100' },
  Hard: { color: 'text-orange-600', bgColor: 'theme-bg-warning-subtle', iconBg: 'bg-orange-100' },
  Expert: { color: 'text-purple-600', bgColor: 'theme-bg-brand-subtle', iconBg: 'bg-purple-100' },
}

export function QuestCard({ quest, onStart, onClaim, loading }: QuestCardProps) {
  const config = difficultyConfig[quest.difficulty]
  const medal = getQuestMedalByDifficulty(quest.difficulty)

  return (
    <div className={`card relative overflow-hidden hover:shadow-lg transition-shadow ${quest.status === 'completed' ? 'theme-bg-success-subtle' : ''}`}>
      <div className="card-body">
        {/* Featured badge */}
        {quest.featured && (
          <div className="size-16 absolute top-0 end-0">
            <div className="absolute bg-purple-600 text-center w-42.5 text-white py-1 transform rotate-45 top-6 -end-12 font-semibold text-xs">
              Featured
            </div>
          </div>
        )}

        {/* Header with icon and medal */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${config.bgColor}`}>
              <Icon name="quests" size={20} />
            </div>
            <div>
              <h5 className="text-lg font-semibold text-default-800">{quest.title}</h5>
              <span className={`text-xs font-medium ${config.color}`}>{quest.difficulty}</span>
            </div>
          </div>
          
          {medal && (
            <Image src={medal} alt={quest.difficulty} width={32} height={32} />
          )}
        </div>

        {/* Description */}
        <p className="mb-4 text-sm text-default-600">{quest.description}</p>

        {/* Reward */}
        <div className="mb-4">
          <h1 className="text-3xl text-default-800 font-semibold">
            <span className="text-purple-600">{quest.reward}</span>
            <small className="text-base text-default-500 ml-1">XP</small>
          </h1>
          <p className="text-xs text-default-500 mt-1">
            {quest.chain} • {quest.category}
          </p>
        </div>

        {/* Progress bar (if in progress) */}
        {quest.progress && quest.status === 'active' && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-default-600 mb-1">
              <span>Progress</span>
              <span>{quest.progress.current}/{quest.progress.total}</span>
            </div>
            <div className="w-full bg-default-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(quest.progress.current / quest.progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Action button */}
        {quest.status === 'completed' ? (
          <button
            type="button"
            className="btn w-full bg-green-600 text-white hover:bg-green-700"
            onClick={() => onClaim?.(quest.id)}
            disabled={loading}
          >
            {loading ? 'Claiming...' : '✅ Claim Reward'}
          </button>
        ) : quest.status === 'locked' ? (
          <button
            type="button"
            className="btn w-full border border-default-300 bg-default-100 text-default-500 cursor-not-allowed"
            disabled
          >
            🔒 Locked
          </button>
        ) : (
          <button
            type="button"
            className="btn w-full border border-dashed border-purple-600 bg-transparent text-purple-600 hover:bg-purple-600/10"
            onClick={() => onStart?.(quest.id)}
            disabled={loading}
          >
            {loading ? 'Starting...' : 'Start Quest'}
          </button>
        )}

        {/* Requirements list */}
        <ul className="mt-5 flex flex-col gap-2.5 text-sm">
          {quest.requirements.map((req, i) => (
            <li key={i} className="flex items-start gap-2">
              {req.completed ? (
                <span className="text-green-600 text-lg flex-shrink-0">✓</span>
              ) : (
                <span className="text-default-400 text-lg flex-shrink-0">✗</span>
              )}
              <span className={req.completed ? 'text-default-900' : 'text-default-500'}>
                {req.text}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

interface QuestGridProps {
  quests: Quest[]
  onStart?: (questId: string) => void
  onClaim?: (questId: string) => void
  loading?: boolean
}

export function QuestGrid({ quests, onStart, onClaim, loading }: QuestGridProps) {
  return (
    <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-5">
      {quests.map(quest => (
        <QuestCard
          key={quest.id}
          quest={quest}
          onStart={onStart}
          onClaim={onClaim}
          loading={loading}
        />
      ))}
    </div>
  )
}

interface QuestStatsProps {
  totalQuests: number
  completed: number
  inProgress: number
  totalXP: number
}

export function QuestStats({ totalQuests, completed, inProgress, totalXP }: QuestStatsProps) {
  return (
    <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-5 mb-6">
      <div className="card">
        <div className="card-body">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg theme-bg-brand-subtle">
                <Icon name="quests" size={24} />
            </div>
            <div>
              <p className="text-default-500 text-sm">Total Quests</p>
              <h4 className="text-2xl font-semibold text-default-800">{totalQuests}</h4>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg theme-bg-success-subtle">
                <span className="text-2xl">✓</span>
            </div>
            <div>
              <p className="text-default-500 text-sm">Completed</p>
              <h4 className="text-2xl font-semibold text-default-800">{completed}</h4>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg theme-bg-info-subtle">
                <Icon name="thumbsUp" size={24} />
            </div>
            <div>
              <p className="text-default-500 text-sm">In Progress</p>
              <h4 className="text-2xl font-semibold text-default-800">{inProgress}</h4>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg theme-bg-warning-subtle">
              <span className="text-2xl">⭐</span>
            </div>
            <div>
              <p className="text-default-500 text-sm">Total XP</p>
              <h4 className="text-2xl font-semibold text-default-800">{totalXP}</h4>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
