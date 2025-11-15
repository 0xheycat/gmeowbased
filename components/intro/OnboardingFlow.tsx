'use client'

import { useState, useEffect } from 'react'
import { X, ArrowRight, Sparkle, Users, Lightning, Gift, Shield, Crown } from '@phosphor-icons/react'
import Image from 'next/image'
import '@/app/styles/quest-card-yugioh.css'

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
  tier?: 'common' | 'rare' | 'epic' | 'legendary'
  showMintButton?: boolean
  rewardStat?: string
  participantsStat?: string
}

const ONBOARDING_STAGES: OnboardingStage[] = [
  {
    id: 1,
    title: 'Quest Card Hunter',
    subtitle: 'Collect Yu-Gi-Oh Style Quest Cards',
    description:
      'Hunt legendary quest cards across Base, Celo, Optimism, Unichain, and Ink. Each quest is a collectible trading card with unique artwork, stats, and on-chain rewards.',
    points: 10,
    bonusPoints: 5,
    icon: Sparkle,
    features: [
      'Browse quest cards in Yu-Gi-Oh inspired design',
      'Check ATK (rewards) and DEF (difficulty) stats',
      'Claim NFT badges for completed quests',
      'No wallet required to start hunting',
    ],
    contractFeature: 'Quest Card System + NFT Minting',
    cardArtwork: '/logo.png',
    tier: 'common',
    showMintButton: false,
    rewardStat: '100 XP',
    participantsStat: '∞',
  },
  {
    id: 2,
    title: 'Power Badge [NFT]',
    subtitle: 'Mint Your First Soulbound NFT',
    description:
      'Build your daily GM streak to unlock powerful multipliers. Mint exclusive Power Badge NFTs to boost all quest rewards and unlock partner-exclusive cards.',
    points: 10,
    bonusPoints: 5,
    icon: Lightning,
    features: [
      '7-day streak: +10% bonus (11 XP per GM)',
      '30-day streak: +25% bonus (12.5 XP per GM)',
      '100-day streak: +50% bonus (15 XP per GM)',
      'Power Badge NFT: +10% on ALL quest rewards',
    ],
    contractFeature: 'Soulbound Power Badge (ERC-721)',
    cardArtwork: '/logo.png',
    tier: 'rare',
    showMintButton: true,
    rewardStat: '+10%',
    participantsStat: 'OG Only',
  },
  {
    id: 3,
    title: 'Achievement Collector',
    subtitle: 'Turn Victories into Collectibles',
    description:
      'Every milestone becomes a mintable NFT badge. Claim soulbound achievements for streaks, leaderboard ranks, and legendary quest completions. Flex your collection across Farcaster.',
    points: 0,
    bonusPoints: 10,
    icon: Shield,
    features: [
      'Mint Soulbound Badge NFTs for achievements',
      'OG Caster badge: FID < 10,000 auto-mint',
      'Leaderboard badges: Top 10 each season',
      'Guild Victory NFTs: Shared team rewards',
    ],
    contractFeature: 'SoulboundBadge.sol (Non-transferable)',
    cardArtwork: '/logo.png',
    tier: 'epic',
    showMintButton: true,
    rewardStat: 'NFT Badge',
    participantsStat: 'Top 10',
  },
  {
    id: 4,
    title: 'Guild Treasury Master',
    subtitle: 'Pool Resources, Share NFTs',
    description:
      'Create guilds with shared treasuries. Complete team quests for rare cards. Top guilds mint exclusive Guild Victory NFTs that all members can claim.',
    points: 100,
    bonusPoints: 50,
    icon: Users,
    features: [
      'Create guild: 100 XP cost (one-time)',
      'Shared treasury for team rewards',
      'Guild-exclusive quest cards',
      'Mint Guild Victory NFTs for top 3 teams',
    ],
    contractFeature: 'Guild Treasury + Shared NFT Claims',
    cardArtwork: '/logo.png',
    tier: 'epic',
    showMintButton: true,
    rewardStat: '500 XP',
    participantsStat: '5 Members',
  },
  {
    id: 5,
    title: 'Legendary Recruiter',
    subtitle: 'Grow Your Squad, Earn Collectibles',
    description:
      'Share your referral code to mint Recruiter Badge NFTs. Each tier unlocks new card packs and exclusive quest access. Build your recruiting empire.',
    points: 50,
    bonusPoints: 25,
    icon: Gift,
    features: [
      'Earn 50 XP per referral + mint progress',
      '1 referral: Bronze Recruiter NFT',
      '5 referrals: Silver Recruiter NFT',
      '10 referrals: Gold Recruiter NFT (Legendary)',
    ],
    contractFeature: 'Recruiter Badge NFTs (Tiered Minting)',
    cardArtwork: '/logo.png',
    tier: 'legendary',
    showMintButton: true,
    rewardStat: '50 XP/ea',
    participantsStat: '10+ Refs',
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

  const currentStage = ONBOARDING_STAGES[stage]
  const Icon = currentStage.icon
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
        <article className="quest-card-yugioh" data-tier={currentStage.tier}>
          <div className="quest-card-yugioh__body">
            
            {/* Title bar with card name */}
            <div className="quest-card-yugioh__title-bar">
              <h3 className="quest-card-yugioh__name">{currentStage.title}</h3>
              <span className="quest-card-yugioh__serial">#{currentStage.id.toString().padStart(3, '0')}</span>
            </div>

            {/* Attribute corner (Stage icon) */}
            <div className="quest-card-yugioh__attribute-corner">
              <div className="quest-card-yugioh__chain-icon">
                <Icon size={32} weight="bold" />
              </div>
              <div className="quest-card-yugioh__level-stars">
                {Array.from({ length: currentStage.id }).map((_, i) => (
                  <span key={i}>★</span>
                ))}
              </div>
            </div>

            {/* Artwork frame */}
            <div className="quest-card-yugioh__artwork-frame">
              {currentStage.cardArtwork ? (
                <>
                  <Image
                    src={currentStage.cardArtwork}
                    alt={currentStage.title}
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
                {currentStage.showMintButton ? '🎴 NFT MINTABLE' : '⚔️ QUEST CARD'} • {currentStage.subtitle}
              </span>
            </div>

            {/* Description box */}
            <div className="quest-card-yugioh__description-box">
              <p className="quest-card-yugioh__description-headline">
                {currentStage.subtitle}
              </p>
              <p className="quest-card-yugioh__description-text">
                {currentStage.description}
              </p>
              
              <div className="quest-card-yugioh__meta-list">
                {currentStage.features.map((feature, idx) => (
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
                <span className="quest-card-yugioh__stat-value">{currentStage.rewardStat || `${currentStage.points} XP`}</span>
              </div>

              {currentStage.bonusPoints && currentStage.bonusPoints > 0 && (
                <div className="quest-card-yugioh__stat">
                  <span className="quest-card-yugioh__stat-label">Bonus</span>
                  <span className="quest-card-yugioh__stat-value">+{currentStage.bonusPoints}</span>
                </div>
              )}

              <div className="quest-card-yugioh__stat quest-card-yugioh__stat--participants">
                <span className="quest-card-yugioh__stat-label">Players</span>
                <span className="quest-card-yugioh__stat-value">{currentStage.participantsStat || '∞'}</span>
              </div>
            </div>

            {/* Contract reference */}
            {currentStage.contractFeature && (
              <div className="quest-card-yugioh__action-footer">
                <span className="text-[0.65rem] text-[#d4af37]">
                  🎴 {currentStage.contractFeature}
                </span>
              </div>
            )}
          </div>
        </article>

        {/* Action buttons below card */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {currentStage.showMintButton && (
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
              Start Collecting Cards
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
