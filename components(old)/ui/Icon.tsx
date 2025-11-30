/**
 * Icon Component - Gmeowbased
 * Wrapper for Gmeowbased v0.1 SVG icons
 * Replaces react-icons with native Gmeowbased assets
 */

import Image from 'next/image'
import { icons, type IconName } from '@/utils/assets'

interface IconProps {
  name: IconName
  size?: number
  className?: string
  alt?: string
}

export function Icon({ name, size = 24, className = '', alt }: IconProps) {
  return (
    <Image
      src={icons[name]}
      alt={alt || name}
      width={size}
      height={size}
      className={className}
    />
  )
}

// Predefined icon components for common use cases
export const TrophyIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <Icon name="trophy" size={size} className={className} />
)

export const BadgeIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <Icon name="badges" size={size} className={className} />
)

export const QuestIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <Icon name="quests" size={size} className={className} />
)

export const RankIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <Icon name="rank" size={size} className={className} />
)

export const CreditsIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <Icon name="credits" size={size} className={className} />
)

export const ThumbsUpIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <Icon name="thumbsUp" size={size} className={className} />
)

export const FavHeartIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <Icon name="favHeart" size={size} className={className} />
)

export const GroupsIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <Icon name="groups" size={size} className={className} />
)

export const MembersIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <Icon name="members" size={size} className={className} />
)

export const ShareIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <Icon name="share" size={size} className={className} />
)

export const SettingsIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <Icon name="settings" size={size} className={className} />
)

export const SearchIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <Icon name="search" size={size} className={className} />
)
