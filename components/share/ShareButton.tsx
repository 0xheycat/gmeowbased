/**
 * Phase 5.5: Share Button Component
 * 
 * Warpcast deep link integration for viral badge sharing
 * Positioned below Stage 5 badge reveal with glass morphism styling
 */

'use client'

import { ShareFat, CheckCircle } from '@phosphor-icons/react'
import { useState } from 'react'
import { trackEvent } from '@/lib/analytics'

type TierType = 'mythic' | 'legendary' | 'epic' | 'rare' | 'common'

interface ShareButtonProps {
  fid: string
  tier: TierType
  badgeName?: string
  className?: string
}

const TIER_CONFIG = {
  mythic: { 
    color: '#9C27FF', 
    label: 'Mythic',
    emoji: '🌟',
    gradient: 'from-purple-500/20 via-violet-500/10 to-purple-500/20',
    borderGradient: 'from-purple-500 via-violet-400 to-purple-500'
  },
  legendary: { 
    color: '#FFD966', 
    label: 'Legendary',
    emoji: '👑',
    gradient: 'from-yellow-500/20 via-amber-500/10 to-yellow-500/20',
    borderGradient: 'from-yellow-500 via-amber-400 to-yellow-500'
  },
  epic: { 
    color: '#61DFFF', 
    label: 'Epic',
    emoji: '💎',
    gradient: 'from-cyan-500/20 via-blue-500/10 to-cyan-500/20',
    borderGradient: 'from-cyan-500 via-blue-400 to-cyan-500'
  },
  rare: { 
    color: '#A18CFF', 
    label: 'Rare',
    emoji: '⚡',
    gradient: 'from-indigo-500/20 via-purple-500/10 to-indigo-500/20',
    borderGradient: 'from-indigo-500 via-purple-400 to-indigo-500'
  },
  common: { 
    color: '#D3D7DC', 
    label: 'Common',
    emoji: '✨',
    gradient: 'from-gray-500/20 via-slate-500/10 to-gray-500/20',
    borderGradient: 'from-gray-500 via-slate-400 to-gray-500'
  }
}

export default function ShareButton({ fid, tier, badgeName, className = '' }: ShareButtonProps) {
  const [shared, setShared] = useState(false)
  const tierConfig = TIER_CONFIG[tier]

  const generateShareText = () => {
    const emoji = tierConfig.emoji
    const tierLabel = tierConfig.label
    const badge = badgeName || `${tierLabel} Badge`
    
    return `${emoji} Just unlocked ${badge} on @gmeowbased! 🎯\n\nFID: ${fid} | Tier: ${tierLabel}\n\nJoin the adventure: gmeowhq.art`
  }

  const handleShare = () => {
    const text = generateShareText()
    const encodedText = encodeURIComponent(text)
    
    // Warpcast deep link format
    const warpcastUrl = `https://warpcast.com/~/compose?text=${encodedText}`
    
    // Track share button click
    trackEvent('badge_shared', {
      fid,
      tier,
      badgeName,
      shareMethod: 'warpcast_deeplink',
      timestamp: new Date().toISOString()
    })
    
    // Open Warpcast compose with pre-filled text
    window.open(warpcastUrl, '_blank', 'noopener,noreferrer')
    
    // Show success state
    setShared(true)
    setTimeout(() => setShared(false), 3000)
  }

  return (
    <button
      onClick={handleShare}
      disabled={shared}
      className={`
        group relative w-full overflow-hidden
        rounded-xl
        transition-all duration-300
        ${shared ? 'scale-95' : 'hover:scale-[1.02] active:scale-98'}
        ${className}
      `}
      aria-label={`Share your ${tierConfig.label} badge on Warpcast`}
    >
      {/* Glass morphism background */}
      <div className={`
        absolute inset-0 
        bg-gradient-to-br ${tierConfig.gradient}
        backdrop-blur-xl
        border-2 border-transparent
        bg-clip-padding
      `} />
      
      {/* Animated gradient border */}
      <div className={`
        absolute inset-0 
        bg-gradient-to-r ${tierConfig.borderGradient}
        opacity-50 group-hover:opacity-100
        transition-opacity duration-300
        -z-10 blur-sm
      `} />
      
      {/* Content */}
      <div className="
        relative px-6 py-4
        flex items-center justify-center gap-3
      ">
        {shared ? (
          <>
            <CheckCircle 
              size={24} 
              weight="fill" 
              style={{ color: tierConfig.color }}
              className="animate-in zoom-in duration-200"
            />
            <span 
              className="font-bold text-lg tracking-wide"
              style={{ color: tierConfig.color }}
            >
              Shared on Warpcast!
            </span>
          </>
        ) : (
          <>
            <ShareFat 
              size={24} 
              weight="fill"
              style={{ color: tierConfig.color }}
              className="
                transition-transform duration-300
                group-hover:scale-110 group-hover:rotate-12
              "
            />
            <span 
              className="font-bold text-lg tracking-wide"
              style={{ color: tierConfig.color }}
            >
              Share on Warpcast
            </span>
          </>
        )}
      </div>
      
      {/* Hover shimmer effect */}
      <div className={`
        absolute inset-0 
        bg-gradient-to-r from-transparent via-white/10 to-transparent
        translate-x-[-100%] group-hover:translate-x-[100%]
        transition-transform duration-700
        pointer-events-none
      `} />
    </button>
  )
}
