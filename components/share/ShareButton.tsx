/**
 * Phase 5.5-5.7: Share Button Component
 * 
 * Dual sharing methods:
 * 1. Warpcast deep link (Phase 5.5) - manual compose with pre-filled text
 * 2. Cast API publish (Phase 5.7) - automated posting with OG image embed
 * 
 * Positioned below Stage 5 badge reveal with glass morphism styling
 */

'use client'

import ShareIcon from '@mui/icons-material/Share'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { useState } from 'react'
import { trackEvent } from '@/lib/utils/analytics'

type TierType = 'mythic' | 'legendary' | 'epic' | 'rare' | 'common'

interface ShareButtonProps {
  fid: string
  tier: TierType
  badgeId: string
  badgeName?: string
  className?: string
  variant?: 'deeplink' | 'cast-api' // Default: 'deeplink'
}

const TIER_CONFIG = {
  mythic: { 
    color: 'rgb(168 85 247)', 
    label: 'Mythic',
    icon: 'stars',
    gradient: 'from-purple-500/20 via-violet-500/10 to-purple-500/20',
    borderGradient: 'from-purple-500 via-violet-400 to-purple-500'
  },
  legendary: { 
    color: 'rgb(251 191 36)', 
    label: 'Legendary',
    icon: 'workspace_premium',
    gradient: 'from-yellow-500/20 via-amber-500/10 to-yellow-500/20',
    borderGradient: 'from-yellow-500 via-amber-400 to-yellow-500'
  },
  epic: { 
    color: 'rgb(6 182 212)', 
    label: 'Epic',
    icon: 'diamond',
    gradient: 'from-cyan-500/20 via-blue-500/10 to-cyan-500/20',
    borderGradient: 'from-cyan-500 via-blue-400 to-cyan-500'
  },
  rare: { 
    color: 'rgb(139 92 246)', 
    label: 'Rare',
    icon: 'bolt',
    gradient: 'from-indigo-500/20 via-purple-500/10 to-indigo-500/20',
    borderGradient: 'from-indigo-500 via-purple-400 to-indigo-500'
  },
  common: { 
    color: 'rgb(156 163 175)', 
    label: 'Common',
    icon: 'auto_awesome',
    gradient: 'from-gray-500/20 via-slate-500/10 to-gray-500/20',
    borderGradient: 'from-gray-500 via-slate-400 to-gray-500'
  }
}

export default function ShareButton({ 
  fid, 
  tier, 
  badgeId,
  badgeName, 
  className = '',
  variant = 'deeplink' 
}: ShareButtonProps) {
  const [shared, setShared] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [castUrl, setCastUrl] = useState<string | null>(null)
  const tierConfig = TIER_CONFIG[tier]

  const generateShareText = () => {
    const tierLabel = tierConfig.label
    const badge = badgeName || `${tierLabel} Badge`
    
    // Use text representation for share text since we can't embed icon components
    const iconText = tierConfig.icon === 'stars' ? '🌟' : tierConfig.icon === 'workspace_premium' ? '👑' : tierConfig.icon === 'diamond' ? '💎' : tierConfig.icon === 'bolt' ? '⚡' : '✨'
    return `${iconText} Just unlocked ${badge} on @gmeowbased! 🎯\n\nFID: ${fid} | Tier: ${tierLabel}\n\nJoin the adventure: gmeowhq.art`
  }

  const handleDeeplinkShare = () => {
    const text = generateShareText()
    
    // Build badge frame URL for embedding
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const badgeFrameUrl = `${baseUrl}/api/frame/badgeShare?fid=${fid}&badgeId=${badgeId}`
    
    // Build Warpcast compose URL with text and frame embed
    const params = new URLSearchParams()
    params.set('text', text)
    params.append('embeds[]', badgeFrameUrl)
    const warpcastUrl = `https://warpcast.com/~/compose?${params.toString()}`
    
    // Track share button click
    trackEvent('badge_shared', {
      fid,
      tier,
      badgeName,
      shareMethod: 'warpcast_deeplink',
      timestamp: new Date().toISOString()
    })
    
    // Open Warpcast compose with pre-filled text and frame
    window.open(warpcastUrl, '_blank', 'noopener,noreferrer')
    
    // Show success state
    setShared(true)
    setTimeout(() => setShared(false), 3000)
  }

  const handleCastAPIShare = async () => {
    setPublishing(true)
    setError(null)
    setCastUrl(null)

    try {
      const response = await fetch('/api/cast/badge-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid,
          badgeId,
          tier,
          badgeName,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to publish cast')
      }

      // Track cast published event
      trackEvent('cast_published', {
        fid,
        tier,
        badgeName,
        castHash: data.cast?.hash,
        castUrl: data.cast?.url,
        timestamp: new Date().toISOString(),
      })

      // Show success state with cast URL
      setCastUrl(data.cast?.url || null)
      setShared(true)
      setTimeout(() => {
        setShared(false)
        setCastUrl(null)
      }, 5000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to publish cast'
      setError(errorMessage)
      
      // Track error
      trackEvent('cast_publish_error', {
        fid,
        tier,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      })
      
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000)
    } finally {
      setPublishing(false)
    }
  }

  const handleShare = () => {
    if (variant === 'cast-api') {
      handleCastAPIShare()
    } else {
      handleDeeplinkShare()
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={shared || publishing}
      className={`
        group relative w-full overflow-hidden
        rounded-xl
        transition-all duration-300
        motion-reduce:transition-none
        ${shared ? 'scale-95' : 'hover:scale-[1.02] active:scale-98'}
        ${publishing ? 'opacity-75 cursor-wait' : ''}
        motion-reduce:transform-none
        ${className}
      `}
      aria-label={
        variant === 'cast-api'
          ? `Post your ${tierConfig.label} badge to Warpcast`
          : `Share your ${tierConfig.label} badge on Warpcast`
      }
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
      <div 
        className="
          relative px-6 py-4
          flex items-center justify-center gap-3
        "
        role="status"
        aria-live="polite"
      >
        {error ? (
          <>
            <span 
              className="font-bold text-sm tracking-wide text-red-400"
            >
              {error}
            </span>
          </>
        ) : publishing ? (
          <>
            <AutoAwesomeIcon 
              sx={{ fontSize: 24 }}
              style={{ color: tierConfig.color }}
              className="animate-spin"
            />
            <span 
              className="font-bold text-lg tracking-wide"
              style={{ color: tierConfig.color }}
            >
              Publishing...
            </span>
          </>
        ) : shared && castUrl ? (
          <>
            <CheckCircleIcon 
              sx={{ fontSize: 24 }}
              style={{ color: tierConfig.color }}
              className="animate-in zoom-in duration-200"
            />
            <a
              href={castUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-lg tracking-wide underline"
              style={{ color: tierConfig.color }}
              onClick={(e) => e.stopPropagation()}
            >
              View Cast
            </a>
          </>
        ) : shared ? (
          <>
            <CheckCircleIcon 
              sx={{ fontSize: 24 }}
              style={{ color: tierConfig.color }}
              className="animate-in zoom-in duration-200"
            />
            <span 
              className="font-bold text-lg tracking-wide"
              style={{ color: tierConfig.color }}
            >
              {variant === 'cast-api' ? 'Posted to Warpcast!' : 'Shared on Warpcast!'}
            </span>
          </>
        ) : (
          <>
            <ShareIcon 
              sx={{ fontSize: 24 }}
              style={{ color: tierConfig.color }}
              className="
                transition-transform duration-300
                motion-reduce:transition-none
                group-hover:scale-110 group-hover:rotate-12
                motion-reduce:transform-none
              "
            />
            <span 
              className="font-bold text-lg tracking-wide"
              style={{ color: tierConfig.color }}
            >
              {variant === 'cast-api' ? 'Post to Warpcast' : 'Share on Warpcast'}
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
