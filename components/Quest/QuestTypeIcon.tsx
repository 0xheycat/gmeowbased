import type { QuestTypeKey } from '@/lib/gm-utils'

export const QUEST_TYPE_VISUALS: Record<QuestTypeKey, { icon: string; label: string }> = {
  GENERIC: { icon: '🧩', label: 'Quest' },
  FARCASTER_FOLLOW: { icon: '👥', label: '' },
  FARCASTER_CAST: { icon: '💬', label: '' },
  FARCASTER_REPLY: { icon: '💭', label: '' },
  FARCASTER_LIKE: { icon: '❤️', label: '' },
  FARCASTER_RECAST: { icon: '🔁', label: '' },
  FARCASTER_MENTION: { icon: '📣', label: '' },
  FARCASTER_FRAME_INTERACT: { icon: '🖱️', label: '' },
  FARCASTER_CHANNEL_POST: { icon: '🛰️', label: '' },
  FARCASTER_VERIFIED_USER: { icon: '🪪', label: '' },
  HOLD_ERC20: { icon: '💎', label: '' },
  HOLD_ERC721: { icon: '🐾', label: '' },
}

export function getQuestTypeVisual(type: QuestTypeKey | null) {
  if (!type) return { icon: '🧩', label: 'Quest' }
  return QUEST_TYPE_VISUALS[type] ?? { icon: '⭐', label: 'Quest' }
}

export function QuestTypeIcon({ type }: { type: QuestTypeKey | null }) {
  const { icon, label } = getQuestTypeVisual(type)
  return (
    <span className="quest-type-icon" aria-label={label} title={label}>
      <span className="quest-type-icon__emoji">{icon}</span>
      <span className="quest-type-icon__label">{label}</span>
    </span>
  )
}
