/**
 * GuildBanner Component
 * 
 * Purpose: Discord-style banner image display for guild profiles
 * Features:
 * - 960x540px recommended banner (Discord standard)
 * - Gradient fallback for guilds without banners
 * - Guild tag display (top left corner)
 * - Boost level indicator (top right corner)
 * - Banner upload moved to Settings tab
 * 
 * Task 3.0: Guild Banner System
 * 
 * Usage:
 * <GuildBanner 
 *   guildId="123"
 *   banner="/banners/guild-123.jpg"
 *   guildTag="GMEOW"
 * />
 */

'use client'

import { AutoAwesomeIcon as SparklesIcon } from '@/components/icons'

export interface GuildBannerProps {
  guildId: string
  banner?: string
  isOwner?: boolean
  guildTag?: string
  boostLevel?: number
}

export function GuildBanner({ 
  guildId, 
  banner, 
  isOwner = false, 
  guildTag, 
  boostLevel = 0 
}: GuildBannerProps) {
  
  return (
    <div className="relative w-full max-w-full aspect-[16/9] max-h-[540px] min-h-0 bg-gray-900 overflow-hidden rounded-t-xl">
      {/* Banner Image or Gradient Fallback */}
      {banner ? (
        <img 
          src={banner}
          className="w-full h-full object-cover"
          alt="Guild banner"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600">
          {/* Animated gradient overlay for visual interest */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-purple-500/20 to-pink-500/20 animate-pulse" />
        </div>
      )}
      
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
      
      {/* Guild Tag (Top Left) */}
      {guildTag && (
        <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full border border-white/10">
          <span className="text-white font-bold text-sm tracking-wider">
            [{guildTag.toUpperCase()}]
          </span>
        </div>
      )}
      
      {/* Boost Level Indicator (Top Right) */}
      {boostLevel > 0 && (
        <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-purple-600 backdrop-blur-sm rounded-full border border-white/20 shadow-lg">
          <SparklesIcon className="w-4 h-4 text-white" />
          <span className="text-white font-bold text-sm">
            Level {boostLevel}
          </span>
        </div>
      )}
      
      {/* Banner Upload moved to Settings tab - Upload only available in Settings */}
    </div>
  )
}
