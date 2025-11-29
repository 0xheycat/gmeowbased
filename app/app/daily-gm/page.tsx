'use client'

import { Suspense, useEffect, useState, useMemo, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAccount, useReadContract, useSwitchChain } from 'wagmi'
import {
  GM_CONTRACT_ABI,
  getContractAddress,
  CHAIN_IDS,
  type GMChainKey,
  formatTimeUntilNextGM,
  canGMBasedOnTimestamp,
} from '@/lib/gmeow-utils'
import type { Abi } from 'viem'
import { buildFrameShareUrl, openWarpcastComposer } from '@/lib/share'
import {
  Card,
  CardBody,
  StatsCard,
  Button,
  SectionHeading,
  IconWithBadge,
  EmptyState,
} from '@/components/ui/tailwick-primitives'
import { AppLayout } from '@/components/layouts/AppLayout'
import { PostGMButton } from '@/components/base'

/**
 * Phase C - Daily GM Route Page
 * Architecture: Tailwick v2.0 patterns + Gmeowbased v0.1 assets
 * 
 * Template Strategy (5 templates):
 * 1. Tailwick v2.0: Card, Button, Stats components (PRIMARY STRUCTURE)
 * 2. Gmeowbased v0.1: SVG icons, illustrations (PRIMARY ASSETS)
 * 3-5. ProKit templates: UI/UX inspiration only (NOT CODE)
 * 
 * Backend: Reused from old foundation
 * - GM contract ABI and utilities (gmeow-utils.ts)
 * - wagmi hooks for blockchain interaction
 * - Frame sharing logic
 * 
 * UI: 100% NEW (no old foundation patterns)
 * - Tailwick card patterns
 * - Glassmorphism effects
 * - SVG icon system (no emoji)
 * - Responsive grid layouts
 */

type UserStatsTuple = readonly [
  bigint,          // lastGMTime
  bigint,          // streak
  bigint,          // totalPoints
  bigint,          // frozenUntil
  `0x${string}`,   // referrer
  bigint,          // teamId
  bigint,          // stakedPoints
  bigint,          // stakingMultiplier
  boolean          // registered
]

const SUPPORTED_CHAINS: GMChainKey[] = ['base', 'unichain', 'celo', 'ink', 'op', 'arbitrum']
const CHAIN_LABEL: Record<GMChainKey, string> = {
  base: 'Base',
  unichain: 'Unichain',
  celo: 'Celo',
  ink: 'Ink',
  op: 'Optimism',
  arbitrum: 'Arbitrum',
}
const CHAIN_COLORS: Record<GMChainKey, { from: string; to: string; accent: string }> = {
  base: { from: 'from-blue-900/80', to: 'to-blue-800/60', accent: 'border-blue-600/50' },
  unichain: { from: 'from-purple-900/80', to: 'to-purple-800/60', accent: 'border-purple-600/50' },
  celo: { from: 'from-green-900/80', to: 'to-green-800/60', accent: 'border-green-600/50' },
  ink: { from: 'from-pink-900/80', to: 'to-pink-800/60', accent: 'border-pink-600/50' },
  op: { from: 'from-red-900/80', to: 'to-red-800/60', accent: 'border-red-600/50' },
  arbitrum: { from: 'from-cyan-900/80', to: 'to-cyan-800/60', accent: 'border-cyan-600/50' },
}
const EXPLORER_TX: Partial<Record<GMChainKey, (hash: `0x${string}`) => string>> = {
  base: (h) => `https://basescan.org/tx/${h}`,
  celo: (h) => `https://celoscan.io/tx/${h}`,
  unichain: (h) => `#/${h}`,
  ink: (h) => `#/${h}`,
  op: (h) => `https://optimistic.etherscan.io/tx/${h}`,
  arbitrum: (h) => `https://arbiscan.io/tx/${h}`,
}

function GMCountdownTimer({ lastGMTimestamp }: { lastGMTimestamp: number }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, total: 0 })

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now()
      const nextGM = (lastGMTimestamp * 1000) + (24 * 60 * 60 * 1000) // +24h
      const totalMs = Math.max(0, nextGM - now)

      const hours = Math.floor(totalMs / (1000 * 60 * 60))
      const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((totalMs % (1000 * 60)) / 1000)

      setTimeLeft({ hours, minutes, seconds, total: totalMs })
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [lastGMTimestamp])

  const formatNumber = (num: number) => num.toString().padStart(2, '0')

  // Progress percentage for 24h window
  const totalSecondsInPeriod = 24 * 60 * 60
  const secondsRemaining = Math.floor(timeLeft.total / 1000)
  const progressPercentage = Math.min(100, Math.max(0, ((totalSecondsInPeriod - secondsRemaining) / totalSecondsInPeriod) * 100))

  return (
    <div className="flex items-center justify-center gap-8">
      {/* Circular Progress */}
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="transparent" />
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="url(#gradient-gm)"
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progressPercentage / 100)}`}
            className="transition-all duration-1000"
          />
          <defs>
            <linearGradient id="gradient-gm" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-xs theme-text-tertiary mb-1">Next GM</div>
            <div className="text-lg font-bold theme-text-primary">
              {timeLeft.hours > 0
                ? `${formatNumber(timeLeft.hours)}:${formatNumber(timeLeft.minutes)}`
                : `${formatNumber(timeLeft.minutes)}:${formatNumber(timeLeft.seconds)}`
              }
            </div>
          </div>
        </div>
      </div>

      {/* Digital Boxes */}
      <div className="flex gap-3">
        <div className="banner-gm-timer">
          <div className="text-2xl font-bold text-warning">{formatNumber(timeLeft.hours)}</div>
          <div className="text-xs theme-text-muted">Hours</div>
        </div>
        <div className="banner-gm-timer">
          <div className="text-2xl font-bold text-warning">{formatNumber(timeLeft.minutes)}</div>
          <div className="text-xs theme-text-muted">Minutes</div>
        </div>
        <div className="banner-gm-timer">
          <div className="text-2xl font-bold text-warning">{formatNumber(timeLeft.seconds)}</div>
          <div className="text-xs theme-text-muted">Seconds</div>
        </div>
      </div>
    </div>
  )
}

/**
 * ChainGMCard Component
 * Enhanced version using Base.dev PostGMButton with sponsored transactions
 * Maintains old foundation logic (streak tracking, cooldown) + NEW Tailwick UI
 */
function ChainGMCard({ chain, onSuccess }: { chain: GMChainKey; onSuccess: () => void }) {
  const { address } = useAccount()
  const targetChainId = CHAIN_IDS[chain]
  const contractAddress = getContractAddress(chain)

  const [streak, setStreak] = useState(0)
  const [canGM, setCanGM] = useState(false)
  const [lastGMTimestamp, setLastGMTimestamp] = useState(0)
  const [successMessage, setSuccessMessage] = useState('')

  const {
    data: userData,
    refetch: refetchUserData,
  } = useReadContract({
    address: contractAddress,
    abi: GM_CONTRACT_ABI as unknown as Abi,
    functionName: 'getUserStats',
    args: address ? [address] : undefined,
    chainId: targetChainId,
    query: { enabled: !!address, retry: 0, refetchOnWindowFocus: false },
  })

  const parsed = useMemo(() => {
    if (!userData) return null
    try {
      const [lastGMTimeBn, streakBn] = userData as UserStatsTuple
      const lastGMTime = Number(lastGMTimeBn ?? 0n)
      const currentStreak = Number(streakBn ?? 0n)
      return {
        currentStreak,
        lastGMTimestamp: lastGMTime,
        canGMToday: canGMBasedOnTimestamp(lastGMTime),
      }
    } catch {
      return null
    }
  }, [userData])

  useEffect(() => {
    if (!parsed) return
    setStreak(parsed.currentStreak)
    setLastGMTimestamp(parsed.lastGMTimestamp)
    setCanGM(Boolean(parsed.canGMToday))
  }, [parsed])

  const handleSuccess = (txHash: string) => {
    console.log(`✅ GM sent on ${chain}! Tx:`, txHash)
    setSuccessMessage(`GM sent! New streak: ${streak + 1} 🔥`)
    refetchUserData?.()
    onSuccess()
    
    // Clear success message after 5s
    setTimeout(() => setSuccessMessage(''), 5000)
  }

  const handleError = (error: string) => {
    console.error(`❌ GM failed on ${chain}:`, error)
  }

  const colors = CHAIN_COLORS[chain]

  if (!address) {
    return (
      <Card className={`bg-gradient-to-br ${colors.from} ${colors.to} backdrop-blur-sm border ${colors.accent}`}>
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold theme-text-primary mb-1">{CHAIN_LABEL[chain]}</div>
              <div className="text-sm theme-text-tertiary">Connect wallet to send GM</div>
            </div>
            <Image 
              src="/assets/icons/Notifications Icon.svg" 
              alt="GM" 
              width={40} 
              height={40} 
              className="w-10 h-10 opacity-50" 
            />
          </div>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className={`bg-gradient-to-br ${colors.from} ${colors.to} backdrop-blur-sm border ${colors.accent}`}>
      <CardBody>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-lg font-bold theme-text-primary mb-1">{CHAIN_LABEL[chain]}</div>
            {streak > 0 && (
              <div className="flex items-center gap-2 text-sm theme-text-secondary">
                <span>Streak: {streak}</span>
                <span className="text-warning">🔥</span>
              </div>
            )}
            {!canGM && lastGMTimestamp > 0 && (
              <div className="text-xs theme-text-tertiary mt-1">
                {formatTimeUntilNextGM(lastGMTimestamp)}
              </div>
            )}
          </div>
          <Image 
            src="/assets/icons/Notifications Icon.svg" 
            alt="GM" 
            width={40} 
            height={40} 
            className="w-10 h-10" 
          />
        </div>

        {successMessage && (
          <div className="mb-4 p-3 bg-success/20 border border-success/50 rounded-lg text-success text-sm">
            {successMessage}
          </div>
        )}

        <PostGMButton
          chain={chain}
          message="GM! ☀️"
          sponsored={canGM} // Enable sponsorship only when can GM
          buttonText={canGM ? 'Send GM (Free!)' : 'Already Sent Today'}
          onSuccess={handleSuccess}
          onError={handleError}
          className={`w-full ${!canGM ? 'opacity-50 cursor-not-allowed' : ''}`}
        />

        {canGM && (
          <div className="mt-2 text-xs theme-text-tertiary text-center">
            Gas sponsored by Coinbase Paymaster 💜
          </div>
        )}
      </CardBody>
    </Card>
  )
}

function DailyGMPageContent() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const [refreshKey, setRefreshKey] = useState(0)

  const gmFrameUrl = useMemo(() => {
    if (!address) return ''
    return buildFrameShareUrl({ type: 'gm', user: address })
  }, [address])

  const handleShare = useCallback(() => {
    if (!gmFrameUrl) return
    openWarpcastComposer(
      `Just sent my daily GM on Gmeowbased! 🌅\n\nKeep the streak alive!`,
      gmFrameUrl
    )
  }, [gmFrameUrl])

  const handleSuccess = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  return (
    <AppLayout fullPage>
      <div className="page-bg-daily-gm">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <IconWithBadge
                icon="/assets/icons/Notifications Icon.svg"
                iconAlt="Daily GM"
                iconSize={80}
                badge={{ content: '☀️', variant: 'warning' }}
              />
            </div>
          <SectionHeading
            title="Daily GM Ritual"
            subtitle="Send your daily GM across chains • Build your streak • Unlock multipliers"
            centered
          />
        </div>

        {/* Stats Overview */}
        {isConnected && address && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <StatsCard
              icon="/assets/icons/Trophy Icon.svg"
              iconAlt="Streak"
              label="Current Streak"
              value="Loading..."
              gradient="purple"
              loading={true}
            />
            <StatsCard
              icon="/assets/icons/Credits Icon.svg"
              iconAlt="Points"
              label="Total Points"
              value="Loading..."
              gradient="blue"
              loading={true}
            />
            <StatsCard
              icon="/assets/icons/Quests Icon.svg"
              iconAlt="Total GMs"
              label="Total GMs"
              value="Loading..."
              gradient="orange"
              loading={true}
            />
          </div>
        )}

        {/* Main GM Section */}
        <Card gradient="orange" border>
          <CardBody>
            <h2 className="text-2xl font-bold theme-text-primary text-center mb-8">
              Send Your Daily GM
            </h2>

            {!isConnected ? (
              <EmptyState
                icon="/assets/icons/Profile Icon.svg"
                iconAlt="Connect Wallet"
                title="Connect Wallet"
                description="Connect your wallet to start your GM streak"
                action={
                  <button
                    onClick={() => console.log('Open connect modal')}
                    className="px-6 py-3 rounded-xl gradient-btn-primary"
                  >
                    Connect Wallet
                  </button>
                }
              />
            ) : (
              <div key={refreshKey} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SUPPORTED_CHAINS.map((chain) => (
                  <ChainGMCard key={chain} chain={chain} onSuccess={handleSuccess} />
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Benefits Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card gradient="purple" border>
            <CardBody>
              <div className="flex items-center gap-3 mb-4">
                <Image src="/assets/icons/Thumbs Up Icon.svg" alt="Benefits" width={32} height={32} className="w-8 h-8" />
                <h3 className="text-xl font-bold theme-text-primary">GM Benefits</h3>
              </div>
              <ul className="space-y-3 theme-text-secondary">
                <li className="flex items-start gap-3">
                  <Image src="/assets/icons/Trophy Icon.svg" alt="Check" width={16} height={16} className="w-4 h-4 mt-1" />
                  <span>Earn points for every GM (base reward + streak bonus)</span>
                </li>
                <li className="flex items-start gap-3">
                  <Image src="/assets/icons/Trophy Icon.svg" alt="Check" width={16} height={16} className="w-4 h-4 mt-1" />
                  <span>Build your streak for multiplier boosts (7, 30, 100+ days)</span>
                </li>
                <li className="flex items-start gap-3">
                  <Image src="/assets/icons/Trophy Icon.svg" alt="Check" width={16} height={16} className="w-4 h-4 mt-1" />
                  <span>Unlock hidden rewards and prestige achievements</span>
                </li>
                <li className="flex items-start gap-3">
                  <Image src="/assets/icons/Trophy Icon.svg" alt="Check" width={16} height={16} className="w-4 h-4 mt-1" />
                  <span>Climb the global leaderboard rankings</span>
                </li>
                <li className="flex items-start gap-3">
                  <Image src="/assets/icons/Trophy Icon.svg" alt="Check" width={16} height={16} className="w-4 h-4 mt-1" />
                  <span>Multi-chain support: Base, Unichain, Celo, Ink, Optimism</span>
                </li>
              </ul>
            </CardBody>
          </Card>

          <Card gradient="cyan" border>
            <CardBody>
              <div className="flex items-center gap-3 mb-4">
                <Image src="/assets/icons/Badges Icon.svg" alt="Streak Milestones" width={32} height={32} className="w-8 h-8" />
                <h3 className="text-xl font-bold theme-text-primary">Streak Milestones</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 theme-bg-subtle rounded-xl border theme-border-subtle">
                  <div className="flex items-center gap-3">
                    <Image src="/assets/icons/Trophy Icon.svg" alt="Fire" width={24} height={24} className="w-6 h-6" />
                    <div>
                      <div className="theme-text-primary font-bold">7-Day Streak</div>
                      <div className="text-xs theme-text-tertiary">+10% bonus points</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 theme-bg-subtle rounded-xl border theme-border-subtle">
                  <div className="flex items-center gap-3">
                    <Image src="/assets/icons/Badges Icon.svg" alt="Diamond" width={24} height={24} className="w-6 h-6" />
                    <div>
                      <div className="theme-text-primary font-bold">30-Day Streak</div>
                      <div className="text-xs theme-text-tertiary">+25% bonus points</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 theme-bg-subtle rounded-xl border theme-border-subtle">
                  <div className="flex items-center gap-3">
                    <Image src="/assets/icons/Rank Icon.svg" alt="Crown" width={24} height={24} className="w-6 h-6" />
                    <div>
                      <div className="theme-text-primary font-bold">100-Day Streak</div>
                      <div className="text-xs theme-text-tertiary">+50% bonus points (LEGEND)</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 justify-center">
          {gmFrameUrl && (
            <Button
              variant="primary"
              size="lg"
              icon="/assets/icons/Share Icon.svg"
              onClick={handleShare}
            >
              Share My GM
            </Button>
          )}
          <Button
            variant="secondary"
            size="lg"
            onClick={() => router.push('/app')}
          >
            ← Back to Dashboard
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => router.push('/app/leaderboard')}
          >
            View Leaderboard →
          </Button>
        </div>
      </div>
    </div>
    </AppLayout>
  )
}

export default function DailyGMPage() {
  return (
    <Suspense fallback={
      <div className="page-bg-daily-gm flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="theme-text-tertiary">Loading Daily GM...</p>
        </div>
      </div>
    }>
      <DailyGMPageContent />
    </Suspense>
  )
}
