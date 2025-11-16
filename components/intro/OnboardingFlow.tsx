'use client'

import { useState, useEffect } from 'react'
import { X, ArrowRight, Sparkle, Users, Lightning, Gift, Shield, Crown } from '@phosphor-icons/react'
import Image from 'next/image'
import { useAccount } from 'wagmi'
import { ConnectWallet } from '@/components/ConnectWallet'
import '@/app/styles/quest-card-yugioh.css'

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
    color: '#9C27FF', 
    label: 'Mythic', 
    points: 1000,
    bgGradient: 'from-purple-900/20 via-violet-800/15 to-purple-900/20'
  },
  legendary: { 
    min: 0.8, 
    max: 1.0, 
    color: '#FFD966', 
    label: 'Legendary', 
    points: 400,
    bgGradient: 'from-yellow-900/20 via-amber-800/15 to-yellow-900/20'
  },
  epic: { 
    min: 0.5, 
    max: 0.8, 
    color: '#61DFFF', 
    label: 'Epic', 
    points: 200,
    bgGradient: 'from-cyan-900/20 via-blue-800/15 to-cyan-900/20'
  },
  rare: { 
    min: 0.3, 
    max: 0.5, 
    color: '#A18CFF', 
    label: 'Rare', 
    points: 100,
    bgGradient: 'from-indigo-900/20 via-purple-800/15 to-indigo-900/20'
  },
  common: { 
    min: 0, 
    max: 0.3, 
    color: '#D3D7DC', 
    label: 'Common', 
    points: 0,
    bgGradient: 'from-gray-900/20 via-slate-800/15 to-gray-900/20'
  }
}

const BASELINE_REWARDS = {
  points: 50,
  xp: 30
}

const ONBOARDING_STAGES: OnboardingStage[] = [
  {
    id: 1,
    title: 'Welcome to Gmeowbased',
    subtitle: 'Your Daily Quest Hub',
    description:
      'Join thousands earning points across Base, Celo, Optimism, Unichain, and Ink. Complete quests, build streaks, and collect NFT badges.',
    points: 10,
    bonusPoints: 5,
    icon: Sparkle,
    features: [
      'Browse quests in inspired cards',
      'No wallet required to start',
      'Claim rewards on-chain later',
      'Connect via Farcaster for bonuses',
    ],
    contractFeature: 'Multi-Chain Quest System',
    cardArtwork: '/logo.png',
    tier: 'common',
    showMintButton: false,
    rewardStat: 'Start',
    participantsStat: 'Open',
  },
  {
    id: 2,
    title: 'Connect Your Identity',
    subtitle: 'Link Farcaster Profile',
    description:
      'Connect your Farcaster account to unlock tier-based rewards. Your Neynar score determines your starting tier and bonus points.',
    points: 50,
    bonusPoints: 10,
    icon: Users,
    features: [
      'Auto-detect Farcaster profile',
      'Calculate Neynar influence score',
      'Unlock tier-based rewards',
      'Display avatar and username',
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
    title: 'Streak & Power Badges',
    subtitle: 'Build Your Collection',
    description:
      'Build daily GM streaks for multipliers. Mint Power Badge NFTs to boost all quest rewards and access exclusive partner quests.',
    points: 10,
    bonusPoints: 5,
    icon: Lightning,
    features: [
      '7-day streak: +10% bonus',
      '30-day streak: +25% bonus',
      '100-day streak: +50% bonus',
      'Power Badge NFT: +10% forever',
    ],
    contractFeature: 'Soulbound Power Badge (ERC-721)',
    cardArtwork: '/logo.png',
    tier: 'epic',
    showMintButton: true,
    rewardStat: '+10%',
    participantsStat: 'Streakers',
  },
  {
    id: 4,
    title: 'Guild & Team Rewards',
    subtitle: 'Join Forces',
    description:
      'Create or join guilds with shared treasuries. Complete team quests for rare cards. Top guilds mint exclusive Victory NFTs.',
    points: 100,
    bonusPoints: 50,
    icon: Shield,
    features: [
      'Create guild: 100 XP cost',
      'Shared treasury for rewards',
      'Guild-exclusive quest cards',
      'Victory NFTs for top 3 teams',
    ],
    contractFeature: 'Guild Treasury System',
    cardArtwork: '/logo.png',
    tier: 'epic',
    showMintButton: true,
    rewardStat: '500 XP',
    participantsStat: '5+ Members',
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

export function OnboardingFlow({ forceShow = false, onComplete }: OnboardingFlowProps) {
  const [visible, setVisible] = useState(false)
  const [stage, setStage] = useState(0)
  const [closing, setClosing] = useState(false)
  const [farcasterProfile, setFarcasterProfile] = useState<FarcasterProfile | null>(null)
  const [isClaiming, setIsClaiming] = useState(false)
  const [hasOnboarded, setHasOnboarded] = useState(false)
  const [assignedBadge, setAssignedBadge] = useState<UserBadge | null>(null)
  const { address, isConnected } = useAccount()

  // Phase 4.7: Typewriter animation state
  const [revealStage, setRevealStage] = useState<'hidden' | 'tier' | 'rewards' | 'complete'>('hidden')
  const [typedTierText, setTypedTierText] = useState('')
  const [typedRewardsText, setTypedRewardsText] = useState('')

  // Helper function to calculate tier from Neynar score
  const getTierFromScore = (score: number): TierType => {
    if (score >= TIER_CONFIG.mythic.min) return 'mythic'
    if (score >= TIER_CONFIG.legendary.min) return 'legendary'
    if (score >= TIER_CONFIG.epic.min) return 'epic'
    if (score >= TIER_CONFIG.rare.min) return 'rare'
    return 'common'
  }

  // Load Farcaster profile on mount
  useEffect(() => {
    const loadFarcasterProfile = async () => {
      try {
        // Check if user already completed onboarding
        const statusRes = await fetch('/api/onboard/status')
        const statusData = await statusRes.json()
        if (statusData.onboarded) {
          setHasOnboarded(true)
          return
        }

        // Load Farcaster profile from current session
        const profileRes = await fetch('/api/user/profile')
        const profileData = await profileRes.json()
        
        if (profileData.fid) {
          // Fetch Neynar score
          const neynarRes = await fetch(`/api/neynar/score?fid=${profileData.fid}`)
          const neynarData = await neynarRes.json()
          
          const tier = getTierFromScore(neynarData.score || 0)
          
          setFarcasterProfile({
            fid: profileData.fid,
            displayName: profileData.displayName || profileData.username,
            username: profileData.username,
            pfpUrl: profileData.pfpUrl,
            neynarScore: neynarData.score,
            tier,
          })
        }
      } catch (error) {
        console.error('Failed to load Farcaster profile:', error)
      }
    }

    loadFarcasterProfile()
  }, [])

  // Phase 4.7: Typewriter animation effect for Stage 5 reveal
  useEffect(() => {
    if (stage !== 4 || !farcasterProfile || revealStage === 'complete') return

    const tierConfig = TIER_CONFIG[farcasterProfile.tier || 'common']
    const tierText = `${tierConfig.label} Rank`
    const tierPoints = tierConfig.points
    const totalPoints = BASELINE_REWARDS.points + tierPoints
    const rewardsText = `+${totalPoints} Points Unlocked`

    if (revealStage === 'hidden') {
      // Start tier text animation after 300ms
      const startTimeout = setTimeout(() => {
        setRevealStage('tier')
        let currentIndex = 0
        const tierInterval = setInterval(() => {
          if (currentIndex < tierText.length) {
            setTypedTierText(tierText.slice(0, currentIndex + 1))
            currentIndex++
          } else {
            clearInterval(tierInterval)
            // Start rewards animation after tier is complete
            setTimeout(() => {
              setRevealStage('rewards')
            }, 400)
          }
        }, 50) // 50ms per character
      }, 300)

      return () => clearTimeout(startTimeout)
    }

    if (revealStage === 'rewards') {
      // Animate rewards text
      let currentIndex = 0
      const rewardsInterval = setInterval(() => {
        if (currentIndex < rewardsText.length) {
          setTypedRewardsText(rewardsText.slice(0, currentIndex + 1))
          currentIndex++
        } else {
          clearInterval(rewardsInterval)
          // Mark complete after rewards are shown
          setTimeout(() => {
            setRevealStage('complete')
          }, 200)
        }
      }, 40) // 40ms per character (slightly faster)

      return () => clearInterval(rewardsInterval)
    }
  }, [stage, farcasterProfile, revealStage])

  // Handle claim rewards
  const handleClaimRewards = async () => {
    if (!farcasterProfile || hasOnboarded) return

    setIsClaiming(true)
    try {
      const response = await fetch('/api/onboard/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid: farcasterProfile.fid,
          address: address || null,
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        setHasOnboarded(true)
        
        // Phase 4.7: Start reveal animation
        setRevealStage('hidden')
        
        // Fetch assigned badge
        if (data.badge) {
          const badgesRes = await fetch(`/api/badges/list?fid=${farcasterProfile.fid}`)
          const badgesData = await badgesRes.json()
          
          if (badgesData.success && badgesData.badges.length > 0) {
            // Get the most recently assigned badge
            const latestBadge = badgesData.badges.sort(
              (a: UserBadge, b: UserBadge) => 
                new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()
            )[0]
            setAssignedBadge(latestBadge)
          }
        }
        
        // Phase 4.7: Show success notification with Phase 4 status
        if (data.phase4?.instantMinting) {
          console.log('🎉 Mythic badge minted instantly via Neynar!')
        }
        if (data.badge?.txHash) {
          console.log('Mint transaction:', data.badge.txHash)
        }
        console.log('Onboarding rewards claimed:', data)
      }
    } catch (error) {
      console.error('Failed to claim rewards:', error)
    } finally {
      setIsClaiming(false)
    }
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

  const handleNext = () => {
    if (stage < ONBOARDING_STAGES.length - 1) {
      setStage(stage + 1)
    } else {
      handleComplete()
    }
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

  if (!visible) return null

  // Prepare Stage 5 data with user profile
  const currentStage = ONBOARDING_STAGES[stage]
  const isFinalStage = currentStage.isFinal && farcasterProfile
  
  let displayStage = { ...currentStage }
  
  if (isFinalStage && farcasterProfile) {
    const tierConfig = TIER_CONFIG[farcasterProfile.tier || 'common']
    const tierPoints = tierConfig.points
    const totalPoints = BASELINE_REWARDS.points + tierPoints
    const isMythic = farcasterProfile.tier === 'mythic'
    
    displayStage = {
      ...currentStage,
      title: currentStage.title.replace('{username}', farcasterProfile.displayName),
      subtitle: currentStage.subtitle.replace('{tier}', tierConfig.label),
      description: currentStage.description
        .replace('{score}', (farcasterProfile.neynarScore || 0).toFixed(2))
        .replace('{tier}', tierConfig.label),
      tier: farcasterProfile.tier || 'common',
      cardArtwork: farcasterProfile.pfpUrl,
      showMintButton: isMythic,
      rewardStat: `+${totalPoints}`,
      participantsStat: `FID ${farcasterProfile.fid}`,
      features: [
        `Baseline: +${BASELINE_REWARDS.points} points, +${BASELINE_REWARDS.xp} XP`,
        `${tierConfig.label} Bonus: +${tierPoints} points`,
        `Total Rewards: ${totalPoints} points + ${BASELINE_REWARDS.xp} XP`,
        isMythic ? '🎉 OG NFT Badge eligible!' : `Keep growing to reach ${TIER_CONFIG.legendary.label}!`,
      ],
    }
  }

  const Icon = displayStage.icon
  const progress = ((stage + 1) / ONBOARDING_STAGES.length) * 100

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-lg transition-opacity duration-300 ${
        closing ? 'opacity-0' : 'opacity-100'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding flow"
    >
      <div
        className={`relative mx-4 w-full max-w-5xl transform transition-all duration-300 ${
          closing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={handleSkip}
          className="absolute -right-2 -top-2 z-50 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#d4af37] bg-gradient-to-br from-[#d4af37] to-[#8b7327] text-[#1a1410] shadow-lg transition-all hover:scale-110 hover:shadow-xl"
          aria-label="Close onboarding"
        >
          <X size={20} weight="bold" />
        </button>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#d4af37]">
              Card {stage + 1} of {ONBOARDING_STAGES.length}
            </span>
            <span className="text-xs font-bold text-[#d4af37]">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#1a1410] border-2 border-[#d4af37]/30">
            <div
              className="h-full bg-gradient-to-r from-[#d4af37] via-[#ffd700] to-[#d4af37] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Yu-Gi-Oh Style Quest Card */}
        <article className="quest-card-yugioh" data-tier={displayStage.tier}>
          <div className="quest-card-yugioh__body">
            
            {/* Title bar with card name */}
            <div className="quest-card-yugioh__title-bar">
              <h3 className="quest-card-yugioh__name">{displayStage.title}</h3>
              <span className="quest-card-yugioh__serial">#{displayStage.id.toString().padStart(3, '0')}</span>
            </div>

            {/* Attribute corner (Stage icon) */}
            <div className="quest-card-yugioh__attribute-corner">
              <div className="quest-card-yugioh__chain-icon">
                <Icon size={32} weight="bold" />
              </div>
              <div className="quest-card-yugioh__level-stars">
                {Array.from({ length: displayStage.id }).map((_, i) => (
                  <span key={i}>★</span>
                ))}
              </div>
            </div>

            {/* Artwork frame */}
            <div className="quest-card-yugioh__artwork-frame">
              {displayStage.cardArtwork ? (
                <>
                  <Image
                    src={displayStage.cardArtwork}
                    alt={displayStage.title}
                    fill
                    className="quest-card-yugioh__artwork"
                    sizes="400px"
                    priority
                  />
                  <div className="quest-card-yugioh__artwork-overlay" />
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
                {displayStage.showMintButton ? '🎴 NFT MINTABLE' : '⚔️ QUEST CARD'} • {displayStage.subtitle}
              </span>
            </div>

            {/* Description box */}
            <div className="quest-card-yugioh__description-box">
              <p className="quest-card-yugioh__description-headline">
                {displayStage.subtitle}
              </p>
              <p className="quest-card-yugioh__description-text">
                {displayStage.description}
              </p>
              
              {/* Display assigned badge for Stage 5 after claiming */}
              {isFinalStage && assignedBadge && (
                <div className="mt-4 p-4 rounded-lg bg-gradient-to-br from-[#d4af37]/20 via-[#ffd700]/10 to-[#d4af37]/20 border-2 border-[#d4af37]/50">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#d4af37] to-[#ffd700] flex items-center justify-center">
                      <Crown size={24} weight="fill" className="text-[#1a1410]" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#d4af37] uppercase tracking-wider">
                        Badge Unlocked!
                      </div>
                      <div className="text-lg font-bold text-white">
                        {assignedBadge.metadata.name || 'Tier Badge'}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-white/70 pl-15">
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
                      <span className="text-[0.65rem] text-white/50">
                        • Mint pending
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              <div className="quest-card-yugioh__meta-list">
                {displayStage.features.map((feature, idx) => (
                  <div key={idx} className="quest-card-yugioh__meta-item">
                    ✦ {feature}
                  </div>
                ))}
              </div>
            </div>

            {/* Stats footer (ATK/DEF style) */}
            <div className="quest-card-yugioh__stats-footer">
              <div className="quest-card-yugioh__stat quest-card-yugioh__stat--reward">
                <span className="quest-card-yugioh__stat-label">Rewards</span>
                <span className="quest-card-yugioh__stat-value">{displayStage.rewardStat || `${displayStage.points} XP`}</span>
              </div>

              {displayStage.bonusPoints && displayStage.bonusPoints > 0 && (
                <div className="quest-card-yugioh__stat">
                  <span className="quest-card-yugioh__stat-label">Bonus</span>
                  <span className="quest-card-yugioh__stat-value">+{displayStage.bonusPoints}</span>
                </div>
              )}

              <div className="quest-card-yugioh__stat quest-card-yugioh__stat--participants">
                <span className="quest-card-yugioh__stat-label">Players</span>
                <span className="quest-card-yugioh__stat-value">{displayStage.participantsStat || '∞'}</span>
              </div>
            </div>

            {/* Contract reference */}
            {displayStage.contractFeature && (
              <div className="quest-card-yugioh__action-footer">
                <span className="text-[0.65rem] text-[#d4af37]">
                  🎴 {displayStage.contractFeature}
                </span>
              </div>
            )}
          </div>
        </article>

        {/* Action buttons below card */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {/* Stage 5 specific buttons */}
          {isFinalStage ? (
            <>
              {/* Claim Rewards button for all users */}
              <button
                type="button"
                onClick={handleClaimRewards}
                disabled={isClaiming || hasOnboarded}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#7CFF7A] bg-gradient-to-r from-[#7CFF7A] to-[#4ADE80] px-6 py-3 font-bold text-black shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isClaiming ? (
                  <>Loading...</>
                ) : hasOnboarded ? (
                  <>✓ Rewards Claimed</>
                ) : (
                  <>
                    <Gift size={20} weight="fill" />
                    Claim Rewards
                  </>
                )}
              </button>

              {/* Mint OG NFT button - Mythic only */}
              {displayStage.showMintButton && (
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
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#d4af37] bg-gradient-to-r from-[#d4af37] to-[#ffd700] px-6 py-3 font-bold text-[#1a1410] shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
              {displayStage.showMintButton && (
                <button
                  type="button"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#d4af37] bg-gradient-to-r from-[#d4af37] to-[#ffd700] px-6 py-3 font-bold text-[#1a1410] shadow-lg transition-all hover:scale-105 hover:shadow-xl"
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
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#7CFF7A] bg-gradient-to-r from-[#7CFF7A] to-[#4ADE80] px-6 py-3 font-bold text-black shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                  >
                    Next Card
                    <ArrowRight size={20} weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="flex-shrink-0 rounded-xl border-2 border-white/20 bg-white/5 px-6 py-3 font-bold text-white/70 backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/10 hover:text-white sm:w-auto"
                  >
                    Skip Tour
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleComplete}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#7CFF7A] bg-gradient-to-r from-[#7CFF7A] to-[#4ADE80] px-6 py-3 font-bold text-black shadow-lg transition-all hover:scale-105 hover:shadow-xl"
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
