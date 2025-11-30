/**
 * Quest Icon Component - SVG Icons from Gmeowbased v0.1
 * Replaces emoji with proper SVG icons for quest types
 */

import Image from 'next/image'

export type QuestIconType =
  // On-chain
  | 'token_hold'
  | 'nft_own'
  | 'transaction_make'
  | 'multichain_gm'
  | 'contract_interact'
  | 'liquidity_provide'
  // Social
  | 'follow_user'
  | 'like_cast'
  | 'recast_cast'
  | 'reply_cast'
  | 'join_channel'
  | 'cast_mention'
  | 'cast_hashtag'
  // Categories
  | 'onchain'
  | 'social'
  // XP Event Types (celebration overlay)
  | 'quest_create'
  | 'quest_claim'
  | 'daily_gm'
  | 'tip_received'
  | 'badge_mint'
  | 'guild_join'
  | 'referral_success'
  | 'onboard_bonus'
  | 'stats_shared'
  | 'nft_mint'

interface QuestIconProps {
  type: QuestIconType
  size?: number
  className?: string
}

// Map quest types to Gmeowbased icon files
const iconMap: Record<QuestIconType, string> = {
  // On-chain
  token_hold: '/assets/gmeow-icons/Credits Icon.svg',
  nft_own: '/assets/gmeow-icons/Gallery Icon.svg',
  transaction_make: '/assets/gmeow-icons/Send Message Icon.svg',
  multichain_gm: '/assets/gmeow-icons/Groups Icon.svg',
  contract_interact: '/assets/gmeow-icons/Settings Icon.svg',
  liquidity_provide: '/assets/gmeow-icons/Trophy Icon.svg',
  
  // Social
  follow_user: '/assets/gmeow-icons/Add Friend Icon.svg',
  like_cast: '/assets/gmeow-icons/Fav Heart Icon.svg',
  recast_cast: '/assets/gmeow-icons/Share Icon.svg',
  reply_cast: '/assets/gmeow-icons/Comment Icon.svg',
  join_channel: '/assets/gmeow-icons/Join Group Icon.svg',
  cast_mention: '/assets/gmeow-icons/Send Message Icon.svg',
  cast_hashtag: '/assets/gmeow-icons/Link Icon.svg',
  
  // Categories
  onchain: '/assets/gmeow-icons/Settings Icon.svg',
  social: '/assets/gmeow-icons/Friends Icon.svg',
  
  // XP Event Types (celebration overlay)
  quest_create: '/assets/gmeow-icons/Quests Icon.svg',
  quest_claim: '/assets/gmeow-icons/Success Box Icon.svg',
  daily_gm: '/assets/gmeow-icons/Newsfeed Icon.svg',
  tip_received: '/assets/gmeow-icons/Credits Icon.svg',
  badge_mint: '/assets/gmeow-icons/Badges Icon.svg',
  guild_join: '/assets/gmeow-icons/Groups Icon.svg',
  referral_success: '/assets/gmeow-icons/Add Friend Icon.svg',
  onboard_bonus: '/assets/gmeow-icons/Login Icon.svg',
  stats_shared: '/assets/gmeow-icons/Rank Icon.svg',
  nft_mint: '/assets/gmeow-icons/Gallery Icon.svg',
}

export function QuestIcon({ type, size = 24, className = '' }: QuestIconProps) {
  const iconPath = iconMap[type]
  
  if (!iconPath) {
    console.warn(`[QuestIcon] Unknown quest type: ${type}`)
    return <div className={`w-${size/4} h-${size/4} ${className}`} />
  }

  return (
    <Image
      src={iconPath}
      alt={`${type} icon`}
      width={size}
      height={size}
      className={`inline-block ${className}`}
    />
  )
}

// Helper to get icon path directly (for background images, etc.)
export function getQuestIconPath(type: QuestIconType): string {
  return iconMap[type] || iconMap['onchain']
}
