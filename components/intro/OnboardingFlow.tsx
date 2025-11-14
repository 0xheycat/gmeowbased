'use client'

import { useState, useEffect } from 'react'
import { X, ArrowRight, Sparkle, Trophy, Users, Lightning, Gift, Shield } from '@phosphor-icons/react'
import Image from 'next/image'

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
}

const ONBOARDING_STAGES: OnboardingStage[] = [
  {
    id: 1,
    title: 'Welcome to Gmeow Adventure',
    subtitle: 'Your Daily GM Quest Hub',
    description:
      'Join thousands of adventurers earning points, building streaks, and conquering quests across Base, Celo, Optimism, Unichain, and Ink chains.',
    points: 10,
    bonusPoints: 5,
    icon: Sparkle,
    features: [
      'Send daily GM to earn base reward',
      'Build streaks for multiplier bonuses',
      'Complete quests for extra rewards',
      'No wallet required to start',
    ],
    contractFeature: 'gmPointReward (10 XP base)',
  },
  {
    id: 2,
    title: 'Streak Bonuses Unleashed',
    subtitle: 'Consistency Pays Off',
    description:
      'The longer your GM streak, the bigger your rewards. Hit milestone streaks to unlock massive bonus multipliers.',
    points: 10,
    bonusPoints: 5,
    icon: Lightning,
    features: [
      '7-day streak: +10% bonus (11 XP per GM)',
      '30-day streak: +25% bonus (12.5 XP per GM)',
      '100-day streak: +50% bonus (15 XP per GM)',
      '48-hour grace period to maintain streak',
    ],
    contractFeature: 'streak7BonusPct, streak30BonusPct, streak100BonusPct',
  },
  {
    id: 3,
    title: 'Power Badge & Multipliers',
    subtitle: 'Elite Status Perks',
    description:
      'Power badge holders and early adopters (FID < 10,000) get exclusive perks, including quest reward multipliers.',
    points: 0,
    bonusPoints: 10,
    icon: Shield,
    features: [
      'Power badge: +10% on all quest rewards',
      'OG Caster badge: FID < 10,000 auto-mint',
      'Access to partner-exclusive quests',
      'Higher trust scores for quest creation',
    ],
    contractFeature: 'powerBadge bonus, OG_THRESHOLD (10k)',
  },
  {
    id: 4,
    title: 'Guild System & Team Rewards',
    subtitle: 'Rally Your Crew',
    description:
      'Create or join guilds to pool points, complete team quests, and climb the guild leaderboard together.',
    points: 100,
    bonusPoints: 50,
    icon: Users,
    features: [
      'Create guild: 100 XP cost (one-time)',
      'Pool treasury points for team rewards',
      'Guild levels: 1→2 (1k pts), 2→3 (2k pts), 3→4 (5k pts), 4→5 (10k pts)',
      'Guild quests with shared rewards',
    ],
    contractFeature: 'guildCreationCost, guild levels',
  },
  {
    id: 5,
    title: 'Referral Rewards & Badges',
    subtitle: 'Invite Friends, Earn More',
    description:
      'Share your referral code and earn 50 XP per friend who joins. Unlock recruiter badges at 1, 5, and 10 referrals.',
    points: 50,
    bonusPoints: 25,
    icon: Gift,
    features: [
      'Earn 50 XP per referral (referee gets 25 XP)',
      '1 referral: Bronze Recruiter badge',
      '5 referrals: Silver Recruiter badge',
      '10 referrals: Gold Recruiter badge',
    ],
    contractFeature: 'referralPointReward, referralTierClaimed',
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
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md transition-opacity duration-300 ${
        closing ? 'opacity-0' : 'opacity-100'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding flow"
    >
      <div
        className={`relative mx-4 w-full max-w-3xl transform rounded-2xl border border-white/10 bg-gradient-to-br from-[#0B0A16] via-[#1a1828] to-[#0B0A16] p-8 shadow-2xl transition-all duration-300 sm:p-10 ${
          closing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={handleSkip}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/60 transition-colors hover:border-white/30 hover:text-white"
          aria-label="Close onboarding"
        >
          <X size={20} weight="bold" />
        </button>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/50 uppercase tracking-wider">
              Stage {stage + 1} of {ONBOARDING_STAGES.length}
            </span>
            <span className="text-xs text-white/50">{Math.round(progress)}%</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-[#7CFF7A] to-[#4ADE80] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-[#7CFF7A]/30 bg-[#7CFF7A]/10 text-[#7CFF7A]">
            <Icon size={40} weight="bold" />
          </div>

          {/* Title & Subtitle */}
          <h2 className="mb-2 text-3xl font-bold text-white sm:text-4xl">{currentStage.title}</h2>
          <p className="mb-4 text-lg text-[#7CFF7A]">{currentStage.subtitle}</p>
          <p className="mb-8 max-w-2xl text-base text-white/70 leading-relaxed">{currentStage.description}</p>

          {/* Points display */}
          <div className="mb-8 flex items-center gap-4">
            {currentStage.points > 0 && (
              <div className="flex items-center gap-2 rounded-full border border-[#7CFF7A]/30 bg-[#7CFF7A]/10 px-4 py-2">
                <Trophy size={20} weight="fill" className="text-[#7CFF7A]" />
                <span className="text-sm font-semibold text-white">
                  {currentStage.points} XP Base Reward
                </span>
              </div>
            )}
            {currentStage.bonusPoints && currentStage.bonusPoints > 0 && (
              <div className="flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2">
                <Sparkle size={20} weight="fill" className="text-yellow-400" />
                <span className="text-sm font-semibold text-white">
                  +{currentStage.bonusPoints} XP Bonus
                </span>
              </div>
            )}
          </div>

          {/* Features grid */}
          <div className="mb-8 w-full max-w-2xl">
            <ul className="grid gap-3 sm:grid-cols-2">
              {currentStage.features.map((feature, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-left"
                >
                  <span className="mt-0.5 text-[#7CFF7A]">✓</span>
                  <span className="text-sm text-white/90">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contract reference */}
          {currentStage.contractFeature && (
            <div className="mb-8 rounded-lg border border-white/10 bg-white/5 px-4 py-2">
              <code className="text-xs text-white/60">
                📜 Smart Contract: <span className="text-[#7CFF7A]">{currentStage.contractFeature}</span>
              </code>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 w-full max-w-md sm:flex-row">
            {stage < ONBOARDING_STAGES.length - 1 ? (
              <>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7CFF7A] to-[#4ADE80] px-6 py-3 font-semibold text-black transition-transform hover:scale-105"
                >
                  Next Stage
                  <ArrowRight size={20} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  className="flex-shrink-0 rounded-full border border-white/20 px-6 py-3 font-semibold text-white/70 transition-colors hover:border-white/40 hover:text-white sm:w-auto"
                >
                  Skip
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7CFF7A] to-[#4ADE80] px-6 py-3 font-semibold text-black transition-transform hover:scale-105"
              >
                Start Your Adventure
                <Sparkle size={20} weight="fill" />
              </button>
            )}
          </div>
        </div>

        {/* Mascot decoration */}
        <div className="pointer-events-none absolute -bottom-10 -right-10 hidden opacity-20 lg:block">
          <Image src="/logo.png" alt="" width={200} height={200} />
        </div>
      </div>
    </div>
  )
}
