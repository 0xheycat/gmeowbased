'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { X, ArrowRight, Sparkle, Users, Lightning, Gift, Shield, Crown } from '@phosphor-icons/react'
import Image from 'next/image'
import { useAccount } from 'wagmi'
import { ConnectWallet } from '@/components/ConnectWallet'
import ShareButton from '@/components/share/ShareButton'
import { getMiniappContext } from '@/lib/miniappEnv'
import { fetchFidByAddress } from '@/lib/neynar'
// GI-10: Confetti loaded dynamically for performance
import { getBadgeArtworkBackground } from '@/lib/badge-artwork'
import { useFocusTrap } from '@/components/quest-wizard/components/Accessibility'
import '@/app/styles/quest-card-yugioh.css'
import '@/app/styles/quest-card-glass.css'
import '@/app/styles/onboarding-mobile.css'
import '@/app/styles/gacha-animation.css'

type TierType = 'mythic' | 'legendary' | 'epic' | 'rare' | 'common'

type OnboardingStage = {
  id: number
  title: string
  subtitle: string
  description: string
  points: number
  bonusPoints?: number
  icon: React.ElementType
  features: string[]
  contractFeature?: string
  cardArtwork?: string
  tier?: TierType
  showMintButton?: boolean
  rewardStat?: string
  participantsStat?: string
  isFinal?: boolean
}

type FarcasterProfile = {
  fid: number
  displayName: string
  username: string
  pfpUrl: string
  neynarScore?: number
  tier?: TierType
}

type UserBadge = {
  id: string
  badge_id: string
  badge_type: string
  tier: TierType
  assigned_at: string
  minted: boolean
  metadata: {
    name?: string
    description?: string
    imageUrl?: string
    tierLabel?: string
  }
}

const TIER_CONFIG = {
  mythic: { 
    min: 1.0, 
    max: Infinity, 
    color: 'rgb(168 85 247)', 
    label: 'Mythic', 
    points: 1000,
    bgGradient: 'from-purple-900/20 via-violet-800/15 to-purple-900/20'
  },
  legendary: { 
    min: 0.8, 
    max: 1.0, 
    color: 'rgb(251 191 36)', 
    label: 'Legendary', 
    points: 400,
    bgGradient: 'from-yellow-900/20 via-amber-800/15 to-yellow-900/20'
  },
  epic: { 
    min: 0.5, 
    max: 0.8, 
    color: 'rgb(6 182 212)', 
    label: 'Epic', 
    points: 200,
    bgGradient: 'from-cyan-900/20 via-blue-800/15 to-cyan-900/20'
  },
  rare: { 
    min: 0.3, 
    max: 0.5, 
    color: 'rgb(139 92 246)', 
    label: 'Rare', 
    points: 100,
    bgGradient: 'from-indigo-900/20 via-purple-800/15 to-indigo-900/20'
  },
  common: { 
    min: 0, 
    max: 0.3, 
    color: 'rgb(156 163 175)', 
    label: 'Common', 
    points: 0,
    bgGradient: 'from-gray-900/20 via-slate-800/15 to-gray-900/20'
  }
}

const BASELINE_REWARDS = {
  points: 50,
  xp: 30
}

/**
 * Handles errors with categorization and user-friendly messages
 * GI-7: Comprehensive error handling with retry logic
 */
function handleError(
  error: unknown,
  context: string,
  setError: (msg: string) => void,
  setErrorType: (type: 'network' | 'api' | 'auth' | 'validation' | null) => void
) {
  console.error(`[OnboardingFlow Error - ${context}]:`, error)
  
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    setErrorType('network')
    setError('Network connection failed. Please check your internet and try again.')
    return
  }
  
  // API errors with response data
  if (error instanceof Response) {
    setErrorType('api')
    if (error.status === 401 || error.status === 403) {
      setErrorType('auth')
      setError('Authentication failed. Please reconnect your Farcaster account.')
      return
    }
    if (error.status >= 500) {
      setError('Server error. Our team has been notified. Please try again later.')
      return
    }
    setError(`API error (${error.status}): ${error.statusText}`)
    return
  }
  
  // Validation errors
  if (error instanceof Error && error.message.includes('Invalid')) {
    setErrorType('validation')
    setError(error.message)
    return
  }
  
  // Generic error fallback
  setErrorType('api')
  const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred'
  setError(`${context}: ${errorMsg}. Please try again or contact support.`)
}

/**
 * Validates and sanitizes Farcaster profile picture URL
 * @param pfpUrl - Raw profile picture URL from Farcaster API
 * @returns Validated URL string or fallback placeholder
 * 
 * GI-11 Security: Validates external URLs before rendering
 * GI-7 Error Handling: Provides fallback for invalid URLs
 */
function validatePfpUrl(pfpUrl: string | undefined | null): string {
  if (!pfpUrl || typeof pfpUrl !== 'string') {
    return '/logo.png' // Fallback to local logo
  }
  
  try {
    const url = new URL(pfpUrl)
    // Only allow https protocol for security
    if (url.protocol !== 'https:') {
      return '/logo.png'
    }
    return pfpUrl
  } catch {
    return '/logo.png'
  }
}

/**
 * Phase 5.4: Get tier-specific confetti colors for gacha reveal
 * @param tier - Badge tier (mythic, legendary, epic, rare, common)
 * @returns Array of hex color strings for particle burst animation
 */
function getTierConfettiColors(tier: TierType): string[] {
  const colorMap: Record<TierType, string[]> = {
    mythic: ['#9C27B0', '#E91E63', '#FF6B9D'],
    legendary: ['#FFC107', '#FFD966', '#FF6F00'],
    epic: ['#61DFFF', '#00BCD4', '#0097A7'],
    rare: ['#A18CFF', '#7E57C2', '#5E35B1'],
    common: ['#D3D7DC', '#9E9E9E', '#757575']
  }
  return colorMap[tier] || colorMap.common
}

/**
 * Skeleton loader component for profile loading state
 * GI-8: Loading state optimization
 */
const ProfileSkeleton = () => (
  <div className="quest-card-yugioh__artwork-placeholder animate-pulse">
    <div className="flex flex-col items-center gap-4">
      {/* Avatar skeleton */}
      <div className="relative">
        <div className="h-32 w-32 rounded-full bg-gradient-to-br from-[#d4af37]/30 to-[#ffd700]/10 animate-shimmer" />
        <div className="absolute inset-0 rounded-full border-4 border-gold-dark/20" />
      </div>
      
      {/* Username skeleton */}
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-40 rounded bg-gold-dark/30 animate-shimmer" />
        <div className="h-4 w-24 rounded bg-gold-dark/20 animate-shimmer" style={{ animationDelay: '0.2s' }} />
      </div>
      
      {/* Stats skeleton */}
      <div className="flex gap-3">
        <div className="h-8 w-16 rounded-full bg-gold-dark/20 animate-shimmer" style={{ animationDelay: '0.4s' }} />
        <div className="h-8 w-16 rounded-full bg-gold-dark/20 animate-shimmer" style={{ animationDelay: '0.6s' }} />
      </div>
    </div>
  </div>
)

const ONBOARDING_STAGES: OnboardingStage[] = [
  {
    id: 1,
    title: 'Welcome to Gmeowbased',
    subtitle: 'Your identity unlocks personalized rewards across Base.',
    description:
      'Verified participation earns points & XP across chains. Collect badges, build streaks, and enjoy miniapp-friendly onboarding.',
    points: 10,
    bonusPoints: 5,
    icon: Sparkle,
    features: [
      'Verified participation across chains',
      'Earn points & XP on Base ecosystem',
      'Collect badges & build daily streaks',
      'Miniapp-friendly onboarding flow',
    ],
    contractFeature: 'Identity-Based Rewards',
    cardArtwork: '/logo.png',
    tier: 'common',
    showMintButton: false,
    rewardStat: 'Start',
    participantsStat: 'Open',
  },
  {
    id: 2,
    title: 'Connect Farcaster',
    subtitle: "We'll calculate your tier and initialize your profile.",
    description:
      "App only requests Farcaster identity—no wallet required. This unlocks your tier, avatar, and username. Desktop users get custody + primary addresses auto-fetched.",
    points: 50,
    bonusPoints: 10,
    icon: Users,
    features: [
      'App only requests Farcaster identity',
      'No wallet required at this stage',
      'Unlocks tier, avatar, and username',
      'Desktop: Auto-fetch custody + verified addresses',
    ],
    contractFeature: 'Farcaster + Neynar Integration',
    cardArtwork: '/logo.png',
    tier: 'rare',
    showMintButton: false,
    rewardStat: '+50 Base',
    participantsStat: 'FC Users',
  },
  {
    id: 3,
    title: 'Your Badge & Streaks',
    subtitle: 'Automatic Progress Tracking',
    description:
      'Daily streaks boost rewards automatically. Your tier badge gives multipliers, and progress is tracked without manual input. Mythic users get instant mint eligibility.',
    points: 10,
    bonusPoints: 5,
    icon: Lightning,
    features: [
      'Daily streaks boost rewards automatically',
      'Tier badge gives multipliers',
      'Progress tracked automatically',
      'Mythic users get instant mint eligibility',
    ],
    contractFeature: 'Soulbound Power Badge (ERC-721)',
    cardArtwork: '/logo.png',
    tier: 'epic',
    showMintButton: false,
    rewardStat: 'Auto',
    participantsStat: 'Tracked',
  },
  {
    id: 4,
    title: 'Community & Teams',
    subtitle: 'Multiplied XP Through Teamwork',
    description:
      'Join or create teams to multiply your XP. Team quests offer bonus rewards, and leaderboards update daily to track top performers.',
    points: 100,
    bonusPoints: 50,
    icon: Shield,
    features: [
      'Join or create teams',
      'Team quests multiply your XP',
      'Leaderboards updated daily',
      'Top teams earn exclusive rewards',
    ],
    contractFeature: 'Team Quest System',
    cardArtwork: '/logo.png',
    tier: 'epic',
    showMintButton: false,
    rewardStat: 'Team XP',
    participantsStat: 'Daily Ranks',
  },
  {
    id: 5,
    title: 'Welcome, {username}',
    subtitle: '{tier} Rank Unlocked',
    description:
      "Your Farcaster profile is connected! Based on your Neynar score of {score}, you have earned {tier} rank with special bonuses.",
    points: 50, // Baseline
    bonusPoints: 0, // Calculated from tier
    icon: Gift,
    features: [
      'Baseline: +50 points, +30 XP',
      '{tier} Bonus: +{tierPoints} points',
      'Total Rewards: {totalPoints} points',
      '{mintEligible}',
    ],
    contractFeature: 'Farcaster + Neynar Integration',
    cardArtwork: '{pfpUrl}', // User's Farcaster profile pic
    tier: 'mythic' as TierType, // Will be overridden by actual tier
    showMintButton: false, // Will be true for Mythic only
    rewardStat: '+{totalPoints}',
    participantsStat: 'FID {fid}',
    isFinal: true,
  },
]

const STORAGE_KEY = 'gmeow:onboarding.v1'

type OnboardingFlowProps = {
  forceShow?: boolean
  onComplete?: () => void
}

/**
 * OnboardingFlow Component - Phase 4.8 Complete
 * 
 * 5-stage onboarding experience with Farcaster integration, Neynar tiering,
 * and blockchain reward claiming with celebration animations.
 * 
 * @component
 * @param {OnboardingFlowProps} props - Component props
 * @param {boolean} [props.forceShow=false] - Force show onboarding even if completed
 * @param {() => void} [props.onComplete] - Callback when onboarding completes
 * 
 * @returns {JSX.Element | null} Onboarding modal or null if hidden
 * 
 * @example
 * ```tsx
 * <OnboardingFlow 
 *   forceShow={searchParams.get('onboarding') === 'true'}
 *   onComplete={() => router.push('/dashboard')}
 * />
 * ```
 * 
 * Quality Gates Applied:
 * - GI-7: Error boundaries, try/catch on all async operations
 * - GI-8: Loading states (skeleton, spinner animations)
 * - GI-9: Accessibility (ARIA labels, keyboard navigation)
 * - GI-10: Performance (lazy confetti, optimized images)
 * - GI-11: Security (URL validation, sanitized inputs)
 * - GI-12: Testing (unit tests for validation helpers)
 * - GI-13 Lite: JSDoc comments, inline documentation
 * 
 * Phase 4.8 Features:
 * - ✅ Farcaster avatar as card artwork
 * - ✅ Neynar score badge with tier colors
 * - ✅ Confetti celebration on claim
 * - ✅ Error toast with retry button
 * - ✅ Mobile responsive (400px cards, 44px buttons)
 * - ✅ Stage navigation dots
 * - ✅ Skip to rewards option
 * 
 * @see /docs/onboarding/PHASE4.8-COMPLETED.md
 */
export function OnboardingFlow({ forceShow = false, onComplete }: OnboardingFlowProps) {
  const [visible, setVisible] = useState(false)
  const [stage, setStage] = useState(0)
  const [closing, setClosing] = useState(false)
  const [farcasterProfile, setFarcasterProfile] = useState<FarcasterProfile | null>(null)
  const [isClaiming, setIsClaiming] = useState(false)
  const [hasOnboarded, setHasOnboarded] = useState(false)
  const [assignedBadge, setAssignedBadge] = useState<UserBadge | null>(null)
  const { address, isConnected } = useAccount()

  // Manual FID input state
  const [userFid, setUserFid] = useState<number | null>(null)
  const [fidInputValue, setFidInputValue] = useState('')
  const [showFidInput, setShowFidInput] = useState(false)

  // Phase 4.7: Typewriter animation state
  const [revealStage, setRevealStage] = useState<'hidden' | 'tier' | 'rewards' | 'complete'>('hidden')

  // Phase 4.8: Reward calculation and success state
  const [claimedRewards, setClaimedRewards] = useState<{
    baselinePoints: number
    tierPoints: number
    totalPoints: number
    totalXP: number
  } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<'network' | 'api' | 'auth' | 'validation' | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showSuccessCelebration, setShowSuccessCelebration] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [isFetchingBadge, setIsFetchingBadge] = useState(false)

  // GI-10: Memoize tier calculation helper
  const getTierFromScore = useCallback((score: number): TierType => {
    if (score >= TIER_CONFIG.mythic.min) return 'mythic'
    if (score >= TIER_CONFIG.legendary.min) return 'legendary'
    if (score >= TIER_CONFIG.epic.min) return 'epic'
    if (score >= TIER_CONFIG.rare.min) return 'rare'
    return 'common'
  }, [])

  // Load Farcaster profile on mount
  useEffect(() => {
    const loadFarcasterProfile = async () => {
      try {
        setIsLoading(true)
        setErrorMessage(null)
        setErrorType(null)
        
        // AUTO-DETECT FID: Try multiple sources with improved timing
        let fid: number | null = userFid // Use manual input if provided
        
        // Priority 1: Check connected wallet address
        if (!fid && isConnected && address) {
          try {
            const walletFid = await fetchFidByAddress(address)
            if (walletFid) {
              fid = walletFid
            }
          } catch (walletError) {
            console.warn('[OnboardingFlow] Wallet FID lookup failed:', walletError)
          }
        }
        
        // Priority 2: Try URL parameter (fastest for shared links)
        if (!fid) {
          const urlParams = new URLSearchParams(window.location.search)
          const fidParam = urlParams.get('fid')
          if (fidParam) {
            const parsedFid = parseInt(fidParam, 10)
            if (!isNaN(parsedFid) && parsedFid > 0) {
              fid = parsedFid
            }
          }
        }
        
        // Priority 3: Try miniapp context with extended timeout for mobile
        if (!fid) {
          try {
            // Wait for miniapp:ready event or timeout after 8 seconds
            const miniappReady = await Promise.race([
              new Promise<boolean>((resolve) => {
                const handler = (e: CustomEvent) => {
                  if (e.detail?.success) {
                    window.removeEventListener('miniapp:ready', handler as EventListener)
                    resolve(true)
                  }
                }
                window.addEventListener('miniapp:ready', handler as EventListener)
              }),
              new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 8000))
            ])
            
            if (miniappReady) {
              // SDK is ready, now get context
              const miniappContext = await getMiniappContext()
              if (miniappContext?.user?.fid) {
                fid = miniappContext.user.fid
              }
            }
          } catch {
            // Miniapp context not available
          }
        }
        
        // If no FID found anywhere, show manual input option
        if (!fid) {
          setShowFidInput(true)
          setErrorMessage(
            isConnected 
              ? 'No Farcaster account linked to your wallet. Please enter your FID below or link your wallet to Farcaster first.'
              : 'Connect your wallet or enter your FID manually to continue.'
          )
          setErrorType('auth')
          setIsLoading(false)
          return
        }
        
        setUserFid(fid) // Store for later use
        
        // Check if user already completed onboarding
        const statusRes = await fetch(`/api/onboard/status?fid=${fid}`)
        if (!statusRes.ok) {
          throw new Error(`Onboarding status check failed: ${statusRes.statusText}`)
        }
        
        const statusData = await statusRes.json()
        if (statusData.onboarded) {
          setHasOnboarded(true)
          setIsLoading(false)
          return
        }

        // Load Farcaster profile with detected FID
        const profileRes = await fetch(`/api/user/profile?fid=${fid}`)
        if (!profileRes.ok) {
          throw new Error(`Profile fetch failed: ${profileRes.statusText}`)
        }
        
        const profileData = await profileRes.json()
        
        // Check for anonymous response
        if (profileData.anonymous) {
          throw new Error(
            'Failed to load your Farcaster profile. ' +
            'Please ensure you have a valid Farcaster account.'
          )
        }
        
        if (!profileData.fid) {
          throw new Error('No Farcaster ID in profile data')
        }
        
        // Fetch Neynar score with timeout
        const neynarController = new AbortController()
        const neynarTimeout = setTimeout(() => neynarController.abort(), 10000) // 10s timeout
        
        try {
          const neynarRes = await fetch(
            `/api/neynar/score?fid=${profileData.fid}`,
            { signal: neynarController.signal }
          )
          clearTimeout(neynarTimeout)
          
          if (!neynarRes.ok) {
            throw new Error(`Neynar score fetch failed: ${neynarRes.statusText}`)
          }
          
          const neynarData = await neynarRes.json()
          const tier = getTierFromScore(neynarData.score || 0)
          
          // Phase 5 Spec: Auto-fetch custody + verified addresses for desktop users
          // Desktop detection: window width > 768px AND not inside miniapp context
          const isDesktop = typeof window !== 'undefined' && window.innerWidth > 768
          const isMiniapp = typeof window !== 'undefined' && 
            (window.location.href.includes('warpcast.com') || 
             document.referrer.includes('warpcast.com'))
          
          if (isDesktop && !isMiniapp && profileData.fid) {
            try {
              // Fetch full Neynar user object with addresses
              const neynarUserRes = await fetch(`/api/neynar/user?fid=${profileData.fid}`)
              
              if (neynarUserRes.ok) {
                const neynarUserData = await neynarUserRes.json()
                
                if (neynarUserData.user) {
                  // Address data available for future use
                  // const custodyAddress = neynarUserData.user.custody_address
                  // const verifiedAddresses = neynarUserData.user.verified_addresses || []
                }
              }
            } catch (addressError) {
              console.warn('[OnboardingFlow] Failed to auto-fetch addresses:', addressError)
              // Non-blocking: continue with profile even if address fetch fails
            }
          }
          
          // Validate profile data before setting state
          if (!profileData.username || !profileData.pfpUrl) {
            throw new Error('Incomplete profile data received')
          }
          
          setFarcasterProfile({
            fid: profileData.fid,
            displayName: profileData.displayName || profileData.username,
            username: profileData.username,
            pfpUrl: validatePfpUrl(profileData.pfpUrl),
            neynarScore: neynarData.score,
            tier,
          })
        } catch (neynarError) {
          if (neynarError instanceof Error && neynarError.name === 'AbortError') {
            throw new Error('Neynar score request timed out. Please try again.')
          }
          throw neynarError
        }
      } catch (error) {
        handleError(error, 'Profile Loading', setErrorMessage, setErrorType)
      } finally {
        setIsLoading(false)
      }
    }

    loadFarcasterProfile()
  }, [getTierFromScore, userFid, isConnected, address]) // Re-run when wallet or FID changes

  // Phase 4.7: Typewriter animation effect for Stage 5 reveal (simplified)
  useEffect(() => {
    if (stage !== 4 || !farcasterProfile || revealStage === 'complete') return

    // Progressive reveal: hidden -> tier -> rewards -> complete
    if (revealStage === 'hidden') {
      const startTimeout = setTimeout(() => {
        setRevealStage('tier')
      }, 300)
      return () => clearTimeout(startTimeout)
    }

    if (revealStage === 'tier') {
      const rewardsTimeout = setTimeout(() => {
        setRevealStage('rewards')
      }, 800)
      return () => clearTimeout(rewardsTimeout)
    }

    if (revealStage === 'rewards') {
      const completeTimeout = setTimeout(() => {
        setRevealStage('complete')
      }, 600)
      return () => clearTimeout(completeTimeout)
    }
  }, [stage, farcasterProfile, revealStage])

  // Phase 4.8: Handle claim rewards with full integration
  const handleClaimRewards = async () => {
    if (!farcasterProfile || hasOnboarded) return

    setIsClaiming(true)
    setErrorMessage(null)
    setErrorType(null)
    
    try {
      // GI-7: Add request timeout
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000) // 15s timeout
      
      const response = await fetch('/api/onboard/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid: farcasterProfile.fid,
          address: address || null,
        }),
        signal: controller.signal,
      })
      
      clearTimeout(timeout)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to claim rewards: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to claim rewards')
      }
      
      // Validate response data
      if (!data.rewards || typeof data.rewards.totalPoints !== 'number') {
        throw new Error('Invalid reward data received from server')
      }

      // Store claimed rewards
      setClaimedRewards(data.rewards)
      setHasOnboarded(true)
      
      // Phase 4.7: Start reveal animation
      setRevealStage('hidden')
      
      // Fetch assigned badge
      if (data.badge) {
        setIsFetchingBadge(true)
        try {
          const badgesRes = await fetch(`/api/badges/list?fid=${farcasterProfile.fid}`)
          
          if (!badgesRes.ok) {
            setIsFetchingBadge(false)
            return // Non-blocking: continue without badge details
          }
          
          const badgesData = await badgesRes.json()
          
          if (badgesData.success && badgesData.badges.length > 0) {
            // Get the most recently assigned badge
            const latestBadge = badgesData.badges.sort(
              (a: UserBadge, b: UserBadge) => 
                new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()
            )[0]
            setAssignedBadge(latestBadge)
          }
        } catch (badgeError) {
          console.warn('Error fetching badge:', badgeError)
          // Non-blocking: badge fetch failure doesn't block success flow
        } finally {
          setIsFetchingBadge(false)
        }
      }
      
      // Phase 4.8: Success celebration with confetti
      setShowSuccessCelebration(true)
      
      // Phase 5.4: Get tier for confetti colors from assigned badge
      const badgeTier = (data.badge?.tier || 'common') as TierType
      const tierColors = getTierConfettiColors(badgeTier)
      
      // GI-10: Dynamically import and trigger confetti
      const triggerConfetti = async () => {
        const confettiModule = await import('canvas-confetti')
        const confettiFn = confettiModule.default
        
        const duration = 3000
        const animationEnd = Date.now() + duration
        const defaults = { 
          startVelocity: 30, 
          spread: 360, 
          ticks: 60, 
          zIndex: 50,
          colors: tierColors
        }

        function randomInRange(min: number, max: number) {
          return Math.random() * (max - min) + min
        }

        const interval: NodeJS.Timeout = setInterval(function() {
          const timeLeft = animationEnd - Date.now()

          if (timeLeft <= 0) {
            clearInterval(interval)
            // Auto-redirect after celebration
            setTimeout(() => {
              handleComplete()
            }, 2000)
            return
          }

          const particleCount = 50 * (timeLeft / duration)
          
          confettiFn({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
          })
          confettiFn({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
          })
        }, 250)
      }
      
      triggerConfetti()
      
    } catch (error) {
      // GI-7: Enhanced error handling with categorization
      if (error instanceof Error && error.name === 'AbortError') {
        setErrorType('network')
        setErrorMessage('Request timed out. The server is taking too long to respond. Please try again.')
      } else {
        handleError(error, 'Claim Rewards', setErrorMessage, setErrorType)
      }
      
      // Auto-increment retry count for analytics
      setRetryCount(prev => prev + 1)
      
      // Log error for monitoring
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'exception', {
          description: `Onboarding claim failed: ${error instanceof Error ? error.message : 'Unknown'}`,
          fatal: false,
        })
      }
    } finally {
      setIsClaiming(false)
    }
  }

  // Phase 4.8: Retry claim after error with exponential backoff
  const handleRetry = async () => {
    // GI-7: Limit retries to prevent abuse
    if (retryCount >= 3) {
      setErrorMessage('Maximum retry attempts reached. Please refresh the page or contact support.')
      setErrorType('validation')
      return
    }
    
    setErrorMessage(null)
    setErrorType(null)
    
    // Exponential backoff: wait 2^retryCount seconds
    const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 8000)
    
    if (backoffMs > 1000) {
      setErrorMessage(`Retrying in ${backoffMs / 1000} seconds...`)
      await new Promise(resolve => setTimeout(resolve, backoffMs))
    }
    
    handleClaimRewards()
  }

  useEffect(() => {
    if (forceShow) {
      setVisible(true)
      setStage(0)
      return
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        setVisible(true)
        setStage(0)
      }
    } catch {
      setVisible(true)
    }
  }, [forceShow])

  // GI-9: Keyboard navigation support
  useEffect(() => {
    if (!visible) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape') {
        // Inline handleSkip logic
        setClosing(true)
        try {
          window.localStorage.setItem(STORAGE_KEY, '1')
        } catch {
          // ignore
        }
        setTimeout(() => {
          setVisible(false)
          setClosing(false)
          onComplete?.()
        }, 300)
        return
      }

      // Arrow keys for navigation (not on final stage)
      if (stage < ONBOARDING_STAGES.length - 1) {
        if (e.key === 'ArrowRight') {
          // Inline handleNext logic
          if (stage < ONBOARDING_STAGES.length - 1) {
            setStage(stage + 1)
            const nextStage = ONBOARDING_STAGES[stage + 1]
            announceToScreenReader(`Now showing: ${nextStage.title}`)
          }
        } else if (e.key === 'ArrowLeft' && stage > 0) {
          setStage(stage - 1)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visible, stage, onComplete])

  const handleNext = () => {
    if (stage < ONBOARDING_STAGES.length - 1) {
      setStage(stage + 1)
      // GI-9: Announce stage change to screen readers
      const nextStage = ONBOARDING_STAGES[stage + 1]
      announceToScreenReader(`Now showing: ${nextStage.title}`)
    } else {
      handleComplete()
    }
  }

  /**
   * Announces message to screen readers using ARIA live region
   * GI-9: Accessibility helper for dynamic content updates
   */
  const announceToScreenReader = (message: string) => {
    const announcement = document.createElement('div')
    announcement.setAttribute('role', 'status')
    announcement.setAttribute('aria-live', 'polite')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message
    document.body.appendChild(announcement)
    setTimeout(() => document.body.removeChild(announcement), 1000)
  }

  const handleSkip = () => {
    handleComplete()
  }

  const handleComplete = () => {
    setClosing(true)
    try {
      window.localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // ignore
    }

    setTimeout(() => {
      setVisible(false)
      setClosing(false)
      onComplete?.()
    }, 300)
  }

  // GI-10: Memoize expensive display stage calculation (before early return to fix hooks rule)
  const displayStage = useMemo(() => {
    const currentStage = ONBOARDING_STAGES[stage]
    const isFinalStage = currentStage.isFinal && farcasterProfile
    
    let computed = { ...currentStage }
    
    if (isFinalStage && farcasterProfile) {
      const tierConfig = TIER_CONFIG[farcasterProfile.tier || 'common']
      const tierPoints = tierConfig.points
      const totalPoints = claimedRewards?.totalPoints || (BASELINE_REWARDS.points + tierPoints)
      const totalXP = claimedRewards?.totalXP || BASELINE_REWARDS.xp
      const isMythic = farcasterProfile.tier === 'mythic'
      
      computed = {
        ...currentStage,
        title: currentStage.title.replace('{username}', farcasterProfile.displayName),
        subtitle: currentStage.subtitle.replace('{tier}', tierConfig.label),
        description: currentStage.description
          .replace('{score}', (farcasterProfile.neynarScore || 0).toFixed(2))
          .replace('{tier}', tierConfig.label),
        tier: farcasterProfile.tier || 'common',
        cardArtwork: validatePfpUrl(farcasterProfile.pfpUrl),
        showMintButton: isMythic && hasOnboarded,
        rewardStat: `+${totalPoints}`,
        participantsStat: `FID ${farcasterProfile.fid}`,
        bonusPoints: tierPoints,
        features: [
          `Baseline: +${BASELINE_REWARDS.points} points, +${BASELINE_REWARDS.xp} XP`,
          `${tierConfig.label} Bonus: +${tierPoints} points`,
          `Total Rewards: ${totalPoints} points + ${totalXP} XP`,
          isMythic ? '🎉 OG NFT Badge eligible!' : `Keep growing to reach ${TIER_CONFIG.legendary.label}!`,
        ],
      }
    }
    
    return { currentStage, isFinalStage, displayStage: computed }
  }, [stage, farcasterProfile, claimedRewards, hasOnboarded])

  const { isFinalStage, displayStage: displayedStage } = displayStage

  const Icon = displayedStage.icon
  const progress = ((stage + 1) / ONBOARDING_STAGES.length) * 100

  // Category 11 Batch 3: Focus trap for modal accessibility
  const focusTrapRef = useFocusTrap(visible)

  if (!visible) return null

  return (
    <div
      ref={focusTrapRef}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg transition-opacity duration-300 ${
        closing ? 'opacity-0' : 'opacity-100'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-description"
      aria-live="polite"
    >
      <div
        className={`relative mx-4 w-full max-w-5xl transform transition-all duration-300 ${
          closing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        {/* Close button - GI-9: Enhanced accessibility */}
        <button
          type="button"
          onClick={handleSkip}
          className="absolute -right-2 -top-2 z-50 flex h-10 w-10 items-center justify-center rounded-full border-2 border-gold-dark bg-gradient-to-br from-gold-dark to-[#8b7327] text-[#1a1410] shadow-lg transition-all hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-gold-dark/50"
          aria-label={`Close onboarding (stage ${stage + 1} of ${ONBOARDING_STAGES.length})`}
          title="Close onboarding and skip tour"
        >
          <X size={20} weight="bold" aria-hidden="true" />
        </button>

        {/* Progress bar - GI-9: ARIA labels */}
        <div className="mb-6" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label={`Onboarding progress: ${Math.round(progress)}% complete`}>
          <div className="flex items-center justify-between mb-https://dequeuniversity.com/rules/axe/4.11/aria-valid-attr-value?application%3DaxeAPI2">
            <span className="text-xs font-bold uppercase tracking-wider text-gold-dark" id="onboarding-title">
              Card {stage + 1} of {ONBOARDING_STAGES.length}
            </span>
            <span className="text-xs font-bold text-gold-dark" aria-live="polite">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-dark-bg-neutral border-2 border-gold-dark/30">
            <div
              className="h-full bg-gradient-to-r from-gold-dark via-gold to-gold-dark transition-all duration-500"
              style={{ width: `${progress}%` }}
              role="presentation"
            />
          </div>
          
          {/* Phase 4.8: Stage navigation dots - GI-9: Accessibility */}
          <div 
            className="onboarding-stage-dots flex items-center justify-center gap-2 mt-3"
            role="tablist"
            aria-label="Onboarding stages"
          >
            {ONBOARDING_STAGES.map((stageItem, idx) => (
              <button
                key={idx}
                type="button"
                role="tab"
                onClick={() => setStage(idx)}
                aria-selected={idx === stage}
                aria-label={`${stageItem.title} (Stage ${idx + 1} of ${ONBOARDING_STAGES.length})`}
                aria-current={idx === stage ? 'step' : undefined}
                tabIndex={idx === stage ? 0 : -1}
                className={`h-2 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-gold-dark focus:ring-offset-2 focus:ring-offset-black ${
                  idx === stage 
                    ? 'w-8 bg-gold-dark' 
                    : idx < stage 
                    ? 'w-2 bg-green-400' 
                    : 'w-2 bg-slate-100/90 dark:bg-white/5/20 hover:bg-slate-100/90 dark:bg-white/5/40'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Phase 5.3: Conditional card design - Glass (stages 1-4) vs Yu-Gi-Oh (stage 5) */}
        {isFinalStage ? (
          /* Stage 5: Yu-Gi-Oh Style Quest Card with Phase 5.4 Gacha Animation */
          <div className={`gacha-reveal-container ${
            revealStage === 'hidden' ? 'gacha-reveal-hidden' : ''
          } ${
            revealStage === 'tier' ? 'gacha-reveal-appearing gacha-card-flip' : ''
          } ${
            revealStage === 'rewards' || revealStage === 'complete' ? 'gacha-float' : ''
          }`.trim()}>
            {/* Phase 5.4: Shimmer effect on reveal */}
            {revealStage === 'tier' && (
              <div className="gacha-shimmer" />
            )}
            
            <article 
              className={`quest-card-yugioh ${
                revealStage === 'tier' ? `gacha-glow-${farcasterProfile?.tier || 'common'}` : ''
              } ${
                revealStage !== 'hidden' ? 'gacha-scale-in' : ''
              }`.trim()} 
              data-tier={displayedStage.tier}
              role="article"
              aria-labelledby="stage-title"
              aria-describedby="stage-description"
            >
            <div className="quest-card-yugioh__body">
            
            {/* Title bar with card name */}
            <div className="quest-card-yugioh__title-bar">
              <h3 className="quest-card-yugioh__name" id="stage-title">{displayedStage.title}</h3>
              <span className="quest-card-yugioh__serial" aria-label={`Card number ${displayedStage.id.toString().padStart(3, '0')}`}>#{displayedStage.id.toString().padStart(3, '0')}</span>
            </div>

            {/* Attribute corner (Stage icon) */}
            <div className="quest-card-yugioh__attribute-corner" aria-label="Stage icon">
              <div className="quest-card-yugioh__chain-icon">
                <Icon size={32} weight="bold" aria-hidden="true" />
              </div>
              <div className="quest-card-yugioh__level-stars" role="img" aria-label={`Stage ${displayedStage.id} of ${ONBOARDING_STAGES.length}`}>
                {Array.from({ length: displayedStage.id }).map((_, i) => (
                  <span key={i}>★</span>
                ))}
              </div>
            </div>

            {/* Artwork frame - Phase 4.8: Add loading state and Neynar score display */}
            <div className="quest-card-yugioh__artwork-frame" role="img" aria-label={isFinalStage && farcasterProfile ? `${farcasterProfile.displayName}'s profile picture` : displayedStage.title}>
              {isLoading && isFinalStage ? (
                <ProfileSkeleton />
              ) : displayedStage.cardArtwork ? (
                <>
                  <div className="relative">
                    {/* Phase 5.2: Badge artwork as background layer */}
                    {isFinalStage && farcasterProfile?.tier && (
                      <div 
                        className="absolute inset-0 opacity-20 blur-sm"
                        style={{
                          background: getBadgeArtworkBackground(farcasterProfile.tier),
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                    )}
                    
                    {/* User's Farcaster avatar (foreground) */}
                    <Image
                      src={displayedStage.cardArtwork}
                      alt={displayedStage.title}
                      fill
                      className="quest-card-yugioh__artwork"
                      sizes="400px"
                      priority
                    />
                    <div className="quest-card-yugioh__artwork-overlay" />
                    
                    {/* Phase 4.8: Neynar score badge overlay for Stage 5 */}
                    {isFinalStage && farcasterProfile?.neynarScore !== undefined && (
                      <div className="absolute top-4 right-4 z-10" role="img" aria-label={`Neynar reputation score: ${farcasterProfile.neynarScore.toFixed(2)} out of 1.0`}>
                        <div 
                          className="flex flex-col items-center justify-center rounded-full border-4 bg-black dark:bg-slate-950/80 backdrop-blur-sm w-20 h-20 shadow-lg"
                          style={{ 
                            borderColor: TIER_CONFIG[farcasterProfile.tier || 'common'].color 
                          }}
                          title={`Neynar Score: ${farcasterProfile.neynarScore.toFixed(2)}`}
                          aria-hidden="false"
                        >
                          <div 
                            className="text-2xl font-bold"
                            style={{ color: TIER_CONFIG[farcasterProfile.tier || 'common'].color }}
                          >
                            {farcasterProfile.neynarScore.toFixed(1)}
                          </div>
                          <div className="text-[0.6rem] uppercase tracking-wider text-white dark:text-slate-950 dark:text-slate-700 dark:text-white/70">
                            Score
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="quest-card-yugioh__artwork-placeholder">
                  <Icon size={80} weight="bold" />
                </div>
              )}
            </div>

            {/* Type bar */}
            <div className="quest-card-yugioh__type-bar">
              <span className="quest-card-yugioh__type-text">
                {displayedStage.showMintButton ? '🎴 NFT MINTABLE' : '⚔️ QUEST CARD'} • {displayedStage.subtitle}
              </span>
            </div>

            {/* Description box */}
            <div className="quest-card-yugioh__description-box">
              <p className="quest-card-yugioh__description-headline" id="onboarding-description">
                {displayedStage.subtitle}
              </p>
              <p className="quest-card-yugioh__description-text">
                {displayedStage.description}
              </p>
              
              {/* Manual FID Input - Show when auto-detection fails */}
              {showFidInput && !isLoading && (
                <div className="mt-4 space-y-3">
                  {/* Wallet Connection Option - Shown if not connected */}
                  {!isConnected && (
                    <div className="p-4 rounded-lg bg-gradient-to-br from-blue-900/20 via-purple-800/15 to-blue-900/20 border-2 border-blue-500/30">
                      <p className="text-sm text-blue-200 mb-3 font-semibold">
                        ✨ Easiest Way: Connect Your Wallet
                      </p>
                      <p className="text-xs text-white dark:text-slate-950 dark:text-slate-700 dark:text-white/60 mb-3">
                        If your wallet is linked to Farcaster, we&apos;ll automatically detect your FID.
                      </p>
                      <ConnectWallet />
                    </div>
                  )}
                  
                  {/* Manual FID Input */}
                  <div className="p-4 rounded-lg bg-gradient-to-br from-purple-900/20 via-blue-800/15 to-purple-900/20 border-2 border-purple-500/30">
                    <div className="mb-3">
                      <label htmlFor="fid-input" className="block text-sm font-bold text-purple-300 mb-2">
                        {isConnected ? 'Or Enter Your FID Manually' : 'Enter Your Farcaster ID (FID)'}
                      </label>
                    <input
                      id="fid-input"
                      type="number"
                      value={fidInputValue}
                      onChange={(e) => setFidInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && fidInputValue) {
                          const fid = parseInt(fidInputValue, 10)
                          if (!isNaN(fid) && fid > 0) {
                            setUserFid(fid)
                            setShowFidInput(false)
                            setErrorMessage(null)
                            setErrorType(null)
                            // Trigger reload of profile
                            window.location.search = `?fid=${fid}`
                          }
                        }
                      }}
                      placeholder="Enter FID (e.g., 18139)"
                      className="w-full px-4 py-3 bg-black dark:bg-slate-950/40 border border-purple-400/30 rounded-lg text-white dark:text-slate-950 dark:text-white placeholder:text-white dark:text-slate-950 dark:text-slate-700 dark:text-white/40 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
                      aria-label="Farcaster ID input"
                      aria-describedby="fid-help-text"
                    />
                    <p id="fid-help-text" className="text-xs text-white dark:text-slate-950 dark:text-slate-700 dark:text-white/60 mt-2">
                      Find your FID at <a href="https://warpcast.com/~/settings" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">warpcast.com/~/settings</a>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const fid = parseInt(fidInputValue, 10)
                      if (!isNaN(fid) && fid > 0) {
                        setUserFid(fid)
                        setShowFidInput(false)
                        setErrorMessage(null)
                        setErrorType(null)
                        // Trigger reload of profile
                        window.location.search = `?fid=${fid}`
                      } else {
                        setErrorMessage('Please enter a valid FID (positive number)')
                        setErrorType('validation')
                      }
                    }}
                    disabled={!fidInputValue || parseInt(fidInputValue, 10) <= 0}
                    className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white dark:text-slate-950 dark:text-white font-bold rounded-lg transition-all transform hover:scale-105 active:scale-95 disabled:transform-none"
                  >
                    Continue with FID
                  </button>
                  </div>
                </div>
              )}
              
              {/* Phase 5.4: Badge unlock with pop animation */}
              {isFetchingBadge && (
                <div className="mt-4 p-4 rounded-lg bg-gradient-to-br from-gold-dark/10 via-gold/5 to-gold-dark/10 border-2 border-gold-dark/30">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold-dark/30 to-gold/20 flex items-center justify-center animate-pulse">
                      <Crown size={24} className="text-gold-dark animate-spin" style={{ animationDuration: '3s' }} />
                    </div>
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-gold-dark/20 rounded animate-pulse" />
                      <div className="h-3 w-48 bg-gold-dark/10 rounded animate-pulse mt-2" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
              {!isFetchingBadge && isFinalStage && assignedBadge && (
                <div className="mt-4 p-4 rounded-lg bg-gradient-to-br from-gold-dark/20 via-gold/10 to-gold-dark/20 border-2 border-gold-dark/50 gacha-badge-pop">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold-dark to-gold flex items-center justify-center">
                      <Crown size={24} weight="fill" className="text-[#1a1410]" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gold-dark uppercase tracking-wider">
                        Badge Unlocked!
                      </div>
                      <div className="text-lg font-bold text-white dark:text-slate-950 dark:text-white">
                        {assignedBadge.metadata.name || 'Tier Badge'}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-white dark:text-slate-950 dark:text-slate-700 dark:text-white/70 pl-15">
                    {assignedBadge.metadata.description || 'Your tier badge has been assigned.'}
                  </div>
                  <div className="mt-2 flex items-center gap-2 pl-15">
                    <span 
                      className="inline-block px-2 py-1 rounded text-[0.65rem] font-bold uppercase tracking-wider"
                      style={{ 
                        backgroundColor: TIER_CONFIG[assignedBadge.tier].color + '40',
                        color: TIER_CONFIG[assignedBadge.tier].color,
                        border: `1px solid ${TIER_CONFIG[assignedBadge.tier].color}`
                      }}
                    >
                      {TIER_CONFIG[assignedBadge.tier].label}
                    </span>
                    {!assignedBadge.minted && (
                      <span className="text-[0.65rem] text-white dark:text-slate-950 dark:text-slate-700 dark:text-white/50">
                        • Mint pending
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {/* Phase 5.4: Feature list with stagger animation */}
              <div className="quest-card-yugioh__meta-list">
                {displayedStage.features.map((feature, idx) => (
                  <div 
                    key={idx} 
                    className={`quest-card-yugioh__meta-item ${
                      revealStage === 'rewards' && idx < 3 ? `gacha-stagger-item gacha-stagger-item-${idx + 1}` : ''
                    }`.trim()}
                  >
                    ✦ {feature}
                  </div>
                ))}
              </div>
            </div>

            {/* Stats footer (ATK/DEF style) - Phase 4.8: Show actual rewards */}
            <div className="quest-card-yugioh__stats-footer">
              {isFinalStage && claimedRewards ? (
                <>
                  <div className="quest-card-yugioh__stat quest-card-yugioh__stat--reward">
                    <span className="quest-card-yugioh__stat-label">ATK/Points</span>
                    <span className="quest-card-yugioh__stat-value">{claimedRewards.totalPoints}</span>
                  </div>
                  <div className="quest-card-yugioh__stat quest-card-yugioh__stat--participants">
                    <span className="quest-card-yugioh__stat-label">DEF/XP</span>
                    <span className="quest-card-yugioh__stat-value">{claimedRewards.totalXP}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="quest-card-yugioh__stat quest-card-yugioh__stat--reward">
                    <span className="quest-card-yugioh__stat-label">Rewards</span>
                    <span className="quest-card-yugioh__stat-value">{displayedStage.rewardStat || `${displayedStage.points} XP`}</span>
                  </div>

                  {displayedStage.bonusPoints && displayedStage.bonusPoints > 0 && (
                    <div className="quest-card-yugioh__stat">
                      <span className="quest-card-yugioh__stat-label">Bonus</span>
                      <span className="quest-card-yugioh__stat-value">+{displayedStage.bonusPoints}</span>
                    </div>
                  )}

                  <div className="quest-card-yugioh__stat quest-card-yugioh__stat--participants">
                    <span className="quest-card-yugioh__stat-label">Players</span>
                    <span className="quest-card-yugioh__stat-value">{displayedStage.participantsStat || '∞'}</span>
                  </div>
                </>
              )}
            </div>

            {/* Contract reference */}
            {displayedStage.contractFeature && (
              <div className="quest-card-yugioh__action-footer">
                <span className="text-[0.65rem] text-gold-dark">
                  🎴 {displayedStage.contractFeature}
                </span>
              </div>
            )}
          </div>
        </article>
          </div>
        ) : (
          /* Stages 1-4: macOS Blue Glass Design */
          <article className="quest-card-glass">
            <div className="quest-card-glass__body">
              {/* Stage badge indicator */}
              <div className="quest-card-glass__stage-badge">
                {displayedStage.id}
              </div>

              {/* Header section */}
              <div className="quest-card-glass__header">
                <h3 className="quest-card-glass__title">{displayedStage.title}</h3>
                <p className="quest-card-glass__subtitle">{displayedStage.subtitle}</p>
              </div>

              {/* Icon display */}
              <div className="quest-card-glass__icon-container">
                <div className="quest-card-glass__icon-wrapper">
                  <Icon weight="bold" />
                </div>
              </div>

              {/* Description */}
              <div className="quest-card-glass__description">
                <p className="quest-card-glass__description-text">
                  {displayedStage.description}
                </p>

                {/* Features list */}
                <div className="quest-card-glass__features">
                  {displayedStage.features.map((feature, idx) => (
                    <div key={idx} className="quest-card-glass__feature-item">
                      <div className="quest-card-glass__feature-icon">✓</div>
                      <span className="quest-card-glass__feature-text">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rewards progress */}
              <div className="quest-card-glass__progress">
                <div className="quest-card-glass__progress-bar">
                  <div 
                    className="quest-card-glass__progress-fill" 
                    style={{ width: `${((displayedStage.id) / ONBOARDING_STAGES.length) * 100}%` }}
                  />
                </div>
                <span className="quest-card-glass__progress-text">
                  {displayedStage.points} XP
                </span>
              </div>
            </div>
          </article>
        )}

        {/* Phase 4.8: Error notification toast - GI-7: Enhanced with error types */}
        {errorMessage && (
          <div className="error-shake mt-4 rounded-xl border-2 border-red-500/50 bg-red-950/50 px-4 py-3 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">
                {errorType === 'network' && '📡'}
                {errorType === 'api' && '⚠️'}
                {errorType === 'auth' && '🔒'}
                {errorType === 'validation' && '❌'}
                {!errorType && '⚠️'}
              </span>
              <div className="flex-1">
                <p className="font-bold text-red-400">
                  {errorType === 'network' && 'Network Error'}
                  {errorType === 'api' && 'Server Error'}
                  {errorType === 'auth' && 'Authentication Error'}
                  {errorType === 'validation' && 'Validation Error'}
                  {!errorType && 'Error'}
                </p>
                <p className="text-sm text-red-300">{errorMessage}</p>
                {retryCount > 0 && retryCount < 3 && (
                  <p className="mt-1 text-xs text-red-400/70">
                    Attempt {retryCount} of 3
                  </p>
                )}
              </div>
              {retryCount < 3 && !errorMessage.includes('Maximum retry') && (
                <button
                  onClick={handleRetry}
                  disabled={errorMessage.includes('Retrying in')}
                  className="rounded-lg border border-red-500 bg-red-900/50 px-3 py-1 text-sm font-bold text-red-200 transition-all hover:bg-red-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        )}

        {/* Phase 4.8: Success celebration message */}
        {showSuccessCelebration && (
          <div className="success-celebration mt-4 rounded-xl border-2 border-accent-green bg-gradient-to-r from-accent-green/20 to-[#4ADE80]/20 px-6 py-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎉</span>
              <div>
                <p className="font-bold text-accent-green">Rewards Claimed Successfully!</p>
                <p className="text-sm text-white dark:text-slate-950 dark:text-slate-700 dark:text-white/80">
                  You earned {claimedRewards?.totalPoints} points and {claimedRewards?.totalXP} XP!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Phase 5.5-5.7: Share Button - Show after rewards claimed */}
        {isFinalStage && hasOnboarded && assignedBadge && (
          <div className="mt-4">
            <ShareButton
              fid={farcasterProfile?.fid?.toString() || '0'}
              badgeId={assignedBadge.badge_id}
              tier={assignedBadge.tier}
              badgeName={assignedBadge.metadata?.name}
              variant="cast-api"
            />
          </div>
        )}

        {/* Action buttons below card */}
        <div className="onboarding-action-buttons mt-6 flex flex-col gap-3 sm:flex-row">
          {/* Stage 5 specific buttons */}
          {isFinalStage ? (
            <>
              {/* Claim Rewards button for all users */}
              <button
                type="button"
                onClick={handleClaimRewards}
                disabled={isClaiming || hasOnboarded || isLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-accent-green bg-gradient-to-r from-accent-green to-accent-green-dark px-6 py-3 font-bold text-black dark:text-white dark:text-slate-950 dark:text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none focus:ring-4 focus:ring-accent-green/50"
                aria-label={isClaiming ? 'Claiming rewards, please wait' : hasOnboarded ? 'Rewards already claimed' : 'Claim your onboarding rewards'}
                aria-busy={isClaiming}
                aria-live="polite"
              >
                {isClaiming ? (
                  <>
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-3 border-black dark:border-slate-600/30 border-t-black" />
                    <span className="animate-pulse">Claiming Rewards...</span>
                  </>
                ) : hasOnboarded ? (
                  <>
                    <span className="animate-bounce">✓</span>
                    Rewards Claimed
                  </>
                ) : isLoading ? (
                  <>
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-3 border-black dark:border-slate-600/30 border-t-black" />
                    <span className="animate-pulse">Loading...</span>
                  </>
                ) : (
                  <>
                    <Gift size={20} weight="fill" />
                    Claim Rewards
                  </>
                )}
              </button>

              {/* Mint OG NFT button - Mythic only */}
              {displayedStage.showMintButton && (
                <>
                  {!isConnected && (
                    <div className="flex-1">
                      <ConnectWallet />
                    </div>
                  )}
                  {isConnected && (
                    <button
                      type="button"
                      disabled={!hasOnboarded}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-gold-dark bg-gradient-to-r from-gold-dark to-gold px-6 py-3 font-bold text-[#1a1410] shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Crown size={20} weight="fill" />
                      Mint OG Badge
                    </button>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              {/* Regular mint button for stages 2-4 */}
              {displayedStage.showMintButton && (
                <button
                  type="button"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-gold-dark bg-gradient-to-r from-gold-dark to-gold px-6 py-3 font-bold text-[#1a1410] shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                >
                  <Crown size={20} weight="fill" />
                  Mint NFT Badge
                </button>
              )}
              
              {stage < ONBOARDING_STAGES.length - 1 ? (
                <>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-accent-green bg-gradient-to-r from-accent-green to-accent-green-dark px-6 py-3 font-bold text-black dark:text-white dark:text-slate-950 dark:text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-accent-green/50"
                    aria-label={`Continue to stage ${stage + 2} of ${ONBOARDING_STAGES.length}`}
                  >
                    Next Card
                    <ArrowRight size={20} weight="bold" aria-hidden="true" />
                  </button>
                  
                  {/* Phase 4.8: Skip to rewards button for early stages */}
                  {stage < 3 && (
                    <button
                      type="button"
                      onClick={() => setStage(4)}
                      className="flex-shrink-0 rounded-xl border-2 border-gold-dark/30 bg-gradient-to-r from-gold-dark/10 to-gold/10 px-4 py-3 text-sm font-bold text-gold-dark backdrop-blur-sm transition-all hover:border-gold-dark/50 hover:from-gold-dark/20 hover:to-gold/20 sm:w-auto"
                    >
                      Skip to Rewards →
                    </button>
                  )}
                  
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="flex-shrink-0 rounded-xl border-2 border-white dark:border-slate-700/20 bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5/5 px-6 py-3 font-bold text-white dark:text-slate-950 dark:text-slate-700 dark:text-white/70 backdrop-blur-sm transition-all hover:border-white dark:border-slate-700/40 hover:bg-slate-100/10 dark:bg-slate-100/90 dark:bg-white/5/5 hover:text-white dark:text-slate-950 dark:text-white sm:w-auto"
                  >
                    Skip Tour
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleComplete}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-accent-green bg-gradient-to-r from-accent-green to-[#4ADE80] px-6 py-3 font-bold text-black dark:text-white dark:text-slate-950 dark:text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                >
                  <Sparkle size={20} weight="fill" />
                  Start Hunting
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
