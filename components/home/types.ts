import type { ChainKey } from '@/lib/gm-utils'

export type QuestType = 'FARCASTER_CAST' | 'FARCASTER_FRAME_INTERACT' | 'GENERIC'

export type QuestFilterKey = 'all' | QuestType

export type QuestPreview = {
  questId: number
  title: string
  reward: number
  questType: QuestType
  chain: ChainKey
  href: string
}

export type GuildPreview = {
  id: string
  name: string
  members: number
  points: number
  href: string
}

export type LeaderboardEntry = {
  rank: number
  username: string
  points: number
  badgeCount: number
}

export type FAQItem = {
  question: string
  answer: string
}

export type HeroUser = {
  fid?: number | null
  username?: string | null
  streak?: number | null
  longestStreak?: number | null
  totalGMs?: number | null
  points?: number | null
  lastGMTimestamp?: number | null
  canGM?: boolean | undefined
  powerBadge?: boolean | null
}
