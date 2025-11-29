'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardBody, StatsCard, Button, Badge } from '@/components/ui/tailwick-primitives'
import { AppLayout } from '@/components/layouts/AppLayout'
import { useMiniapp } from '@/hooks/useMiniapp'
import { useUnifiedFarcasterAuth } from '@/hooks/useUnifiedFarcasterAuth'
import { OnchainStatsCard } from '@/components/features/OnchainStatsCard'
import { QuickActionsPanel } from '@/components/features/QuickActionsPanel'
import { FeaturedQuestCard } from '@/components/features/FeaturedQuestCard'
import { SocialActivity } from '@/components/features/SocialActivity'

export default function AppPage() {
  // Miniapp detection
  const { isMiniapp, context, isReady: miniappReady } = useMiniapp()
  
  // Unified auth with miniapp context
  const { fid, username, displayName, pfpUrl, isAuthenticated, authSource } = useUnifiedFarcasterAuth({
    frameContext: context,
    miniKitContext: context,
    isFrameReady: miniappReady,
    isMiniAppSession: isMiniapp,
  })
  
  const [isFirstTime, setIsFirstTime] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userStats, setUserStats] = useState({
    gmStreak: 0,
    totalXP: 0,
    badgesEarned: 0,
    rank: 0
  })

  // Quick Actions - Layer3 Style
  const quickActions = [
    {
      id: 'gm',
      icon: '⚡',
      label: 'Claim Daily GM',
      description: 'Keep your streak alive',
      href: '/app/daily-gm',
      reward: '+100 🐾',
      badge: 'Daily',
    },
    {
      id: 'quest',
      icon: '🎯',
      label: 'Random Quest',
      description: 'Try your luck',
      href: '/app/quests',
      badge: 'Hot',
      gradient: 'from-orange-500/20 to-red-500/20',
    },
    {
      id: 'share',
      icon: '📤',
      label: 'Share Progress',
      description: 'Earn bonus XP',
      onClick: () => {
        // TODO: Implement Farcaster share
        alert('Share to Farcaster coming soon!')
      },
      reward: '+50 XP',
    },
    {
      id: 'leaderboard',
      icon: '🏆',
      label: 'Leaderboard',
      description: 'Check your rank',
      href: '/app/leaderboard',
    },
  ]

  // Featured Quest - Layer3 Style
  const featuredQuest = {
    id: 'daily-challenge',
    title: "🎯 Complete 3 Quests Today",
    description: "Finish any 3 quests to earn triple XP bonus and a special badge",
    reward: {
      amount: 500,
      type: 'xp' as const,
      label: 'Paw Points',
    },
    difficulty: 'medium' as const,
    timeLeft: '18h 45m',
    participants: 1247,
    href: '/app/quests',
    tags: ['Daily', '3x Reward'],
  }

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        // Wait for FID to be available
        if (!fid) {
          console.log('Waiting for FID from Farcaster frame context...')
          setLoading(false)
          return
        }

        console.log('FID loaded from frame:', fid)

        const response = await fetch(`/api/user/onboarding-status?fid=${fid}`)
        const data = await response.json()
        
        // Show first-time experience if just onboarded in last 24 hours
        if (data.onboardedAt) {
          const onboardedTime = new Date(data.onboardedAt).getTime()
          const now = Date.now()
          const hoursSinceOnboarding = (now - onboardedTime) / (1000 * 60 * 60)
          
          setIsFirstTime(hoursSinceOnboarding < 24)
        }

        // Fetch real user stats
        const statsResponse = await fetch(`/api/user/stats?fid=${fid}`)
        const statsData = await statsResponse.json()
        
        if (!statsResponse.ok) {
          console.error('Failed to fetch stats:', statsData.error)
        } else {
          setUserStats({
            gmStreak: statsData.gmStreak || 0,
            totalXP: statsData.totalXP || 0,
            badgesEarned: statsData.badgesEarned || 0,
            rank: statsData.rank || 'Unranked'
          })
        }
      } catch (error) {
        console.error('Failed to check onboarding:', error)
      } finally {
        setLoading(false)
      }
    }

    checkOnboardingStatus()
  }, [fid]) // Re-run when FID becomes available

  return (
    <AppLayout>
      <div className="container mx-auto max-w-7xl p-4 md:p-8">
        {/* Auth Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="mb-4 theme-card-bg-secondary">
            <CardBody>
              <div className="text-xs font-mono theme-text-muted space-y-1">
                <div>🔐 Auth Debug:</div>
                <div>• In Miniapp: {isMiniapp ? 'Yes' : 'No'}</div>
                <div>• Miniapp Ready: {miniappReady ? 'Yes' : 'No'}</div>
                <div>• FID: {fid || 'null'}</div>
                <div>• Auth Source: {authSource || 'null'}</div>
                <div>• Authenticated: {isAuthenticated ? 'Yes' : 'No'}</div>
                <div>• Context FID: {context?.user?.fid || 'null'}</div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Not authenticated message */}
        {!isAuthenticated && miniappReady && (
          <Card className="mb-4 theme-card-bg-secondary">
            <CardBody>
              <div className="text-center py-8">
                <h3 className="text-xl font-bold mb-2">Not signed in</h3>
                <p className="theme-text-muted mb-4">
                  Connect with Farcaster to access your profile
                </p>
                <p className="text-sm theme-text-muted">
                  Open in Farcaster frame or miniapp to sign in
                </p>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Welcome Banner for First-Time Users */}
        {isFirstTime && (
          <Card gradient="purple" className="mb-8 animate-fade-in">
            <CardBody className="text-center">
              <h2 className="text-3xl font-bold mb-3 text-gradient-gm">
                🎉 Welcome to Your Dashboard!
              </h2>
              <p className="theme-text-secondary text-lg mb-6">
                You've completed the tutorial! Here's what you can do next:
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Badge variant="success">✓ Tutorial Complete</Badge>
                {fid && (
                  <Badge variant="primary">
                    ✨ Farcaster User #{fid}
                  </Badge>
                )}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Layer3-Inspired Quick Actions */}
        <QuickActionsPanel actions={quickActions} />

        {/* Featured Quest - Layer3 Style */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 theme-text-primary">⭐ Featured Quest</h2>
          <FeaturedQuestCard quest={featuredQuest} />
        </div>

        {/* Social Activity Feed */}
        <SocialActivity fid={fid} limit={5} />

        {/* Stats Overview */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatsCard
              icon="/assets/gmeow-icons/Success Box Icon.svg"
              iconAlt="GM Streak"
              label="GM Streak"
              value={userStats.gmStreak}
              gradient="orange"
            />
            <StatsCard
              icon="/assets/gmeow-icons/Trophy Icon.svg"
              iconAlt="Total XP"
              label="Total XP"
              value={userStats.totalXP}
              gradient="purple"
            />
            <StatsCard
              icon="/assets/gmeow-icons/Badges Icon.svg"
              iconAlt="Badges"
              label="Badges"
              value={userStats.badgesEarned}
              gradient="pink"
            />
            <StatsCard
              icon="/assets/gmeow-icons/Rank Icon.svg"
              iconAlt="Rank"
              label="Rank"
              value={userStats.rank || 'Unranked'}
              gradient="blue"
            />
          </div>
        )}

        {/* Quick Start Guide for First-Time Users */}
        {isFirstTime && (
          <Card gradient="green" className="mb-8">
            <CardBody>
              <h3 className="text-2xl font-bold mb-4 text-center">🚀 Quick Start Quests</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/app/daily-gm" className="group">
                  <div className="theme-bg-subtle rounded-xl p-6 border theme-border-default hover:theme-border-hover hover:theme-bg-hover transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <Image
                        src="/assets/gmeow-icons/Success Box Icon.svg"
                        alt="Say GM"
                        width={40}
                        height={40}
                      />
                      <div>
                        <h4 className="font-bold">Say Your First GM</h4>
                        <Badge variant="warning" size="sm">+10 XP</Badge>
                      </div>
                    </div>
                    <p className="theme-text-tertiary text-sm">
                      Start your daily streak and earn bonus XP
                    </p>
                  </div>
                </Link>

                <Link href="/app/quests" className="group">
                  <div className="theme-bg-subtle rounded-xl p-6 border theme-border-default hover:theme-border-hover hover:theme-bg-hover transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <Image
                        src="/assets/gmeow-icons/Quests Icon.svg"
                        alt="Complete Quest"
                        width={40}
                        height={40}
                      />
                      <div>
                        <h4 className="font-bold">Complete a Quest</h4>
                        <Badge variant="info" size="sm">+50 XP</Badge>
                      </div>
                    </div>
                    <p className="theme-text-secondary text-sm">
                      Take on your first on-chain challenge
                    </p>
                  </div>
                </Link>

                <Link href="/app/guilds" className="group">
                  <div className="theme-bg-subtle rounded-xl p-6 border theme-border-default hover:theme-border-hover hover:theme-bg-hover transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <Image
                        src="/assets/gmeow-icons/Groups Icon.svg"
                        alt="Join Guild"
                        width={40}
                        height={40}
                      />
                      <div>
                        <h4 className="font-bold">Join a Guild</h4>
                        <Badge variant="success" size="sm">+25 XP</Badge>
                      </div>
                    </div>
                    <p className="theme-text-secondary text-sm">
                      Team up with other players
                    </p>
                  </div>
                </Link>
              </div>
            </CardBody>
          </Card>
        )}

        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 font-gmeow">
            Gmeowbased App
          </h1>
          <p className="theme-text-secondary text-lg">
            Multi-chain quest game. Choose your adventure and start earning XP.
          </p>
        </div>

        {/* Onchain Stats Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6 theme-text-primary">
            Your Onchain Stats
          </h2>
          <OnchainStatsCard />
        </div>

        {/* Feature Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Daily GM Card */}
          <Link href="/app/daily-gm" className="group">
            <div className="quest-card-gm">
              <div className="mb-4 flex justify-center">
                <Image
                  src="/assets/icons/Notifications Icon.svg"
                  alt="Daily GM"
                  width={64}
                  height={64}
                  className="w-16 h-16"
                />
              </div>
              <h2 className="text-2xl font-bold mb-3 group-hover:opacity-80 transition-opacity">Daily GM</h2>
              <p className="theme-text-secondary mb-4">
                Start your day with GM and build your streak
              </p>
              <div className="min-h-[44px] w-full rounded-lg theme-bg-primary hover:opacity-90 px-6 py-3 font-semibold transition-all flex items-center justify-center theme-text-primary-contrast">
                Say GM →
              </div>
            </div>
          </Link>

          {/* Quests Card */}
          <Link href="/app/quests" className="group">
            <div className="quest-card-guild">
              <div className="mb-4 flex justify-center">
                <Image
                  src="/assets/icons/Quests Icon.svg"
                  alt="Quests"
                  width={64}
                  height={64}
                  className="w-16 h-16"
                />
              </div>
              <h2 className="text-2xl font-bold mb-3 group-hover:opacity-80 transition-opacity">Quests</h2>
              <p className="theme-text-secondary mb-4">
                Complete on-chain challenges and earn rewards
              </p>
              <div className="min-h-[44px] w-full rounded-lg theme-bg-primary hover:opacity-90 px-6 py-3 font-semibold transition-all flex items-center justify-center theme-text-primary-contrast">
                View Quests →
              </div>
            </div>
          </Link>

          {/* Guilds Card */}
          <Link href="/app/guilds" className="group">
            <div className="quest-card-social">
              <div className="mb-4 flex justify-center">
                <Image
                  src="/assets/icons/Groups Icon.svg"
                  alt="Guilds"
                  width={64}
                  height={64}
                  className="w-16 h-16"
                />
              </div>
              <h2 className="text-2xl font-bold mb-3 group-hover:opacity-80 transition-opacity">Guilds</h2>
              <p className="theme-text-secondary mb-4">
                Join a guild and compete together
              </p>
              <div className="min-h-[44px] w-full rounded-lg theme-bg-primary hover:opacity-90 px-6 py-3 font-semibold transition-all flex items-center justify-center theme-text-primary-contrast">
                Explore Guilds →
              </div>
            </div>
          </Link>

          {/* Profile Card */}
          <Link href="/app/profile" className="group">
            <div className="quest-card-badge">
              <div className="mb-4 flex justify-center">
                <Image
                  src="/assets/icons/Profile Icon.svg"
                  alt="Profile"
                  width={64}
                  height={64}
                  className="w-16 h-16"
                />
              </div>
              <h2 className="text-2xl font-bold mb-3 group-hover:opacity-80 transition-opacity">Profile</h2>
              <p className="theme-text-secondary mb-4">
                View your stats and achievements
              </p>
              <div className="min-h-[44px] w-full rounded-lg theme-bg-primary hover:opacity-90 px-6 py-3 font-semibold transition-all flex items-center justify-center theme-text-primary-contrast">
                My Profile →
              </div>
            </div>
          </Link>

          {/* Badges Card */}
          <Link href="/app/badges" className="group">
            <div className="quest-card-leaderboard">
              <div className="mb-4 flex justify-center">
                <Image
                  src="/assets/icons/Badges Icon.svg"
                  alt="Badges"
                  width={64}
                  height={64}
                  className="w-16 h-16"
                />
              </div>
              <h2 className="text-2xl font-bold mb-3 group-hover:opacity-80 transition-opacity">Badges</h2>
              <p className="theme-text-secondary mb-4">
                Unlock and collect achievement badges
              </p>
              <div className="min-h-[44px] w-full rounded-lg theme-bg-primary hover:opacity-90 px-6 py-3 font-semibold transition-all flex items-center justify-center theme-text-primary-contrast">
                View Collection →
              </div>
            </div>
          </Link>

          {/* Leaderboard Card */}
          <Link href="/app/leaderboard" className="group">
            <div className="quest-card-profile">
              <div className="mb-4 flex justify-center">
                <Image
                  src="/assets/icons/Trophy Icon.svg"
                  alt="Leaderboard"
                  width={64}
                  height={64}
                  className="w-16 h-16"
                />
              </div>
              <h2 className="text-2xl font-bold mb-3 group-hover:opacity-80 transition-opacity">Leaderboard</h2>
              <p className="theme-text-secondary mb-4">
                Compete with others and climb ranks
              </p>
              <div className="min-h-[44px] w-full rounded-lg theme-bg-primary hover:opacity-90 px-6 py-3 font-semibold transition-all flex items-center justify-center theme-text-primary-contrast">
                View Rankings →
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-8 p-6 rounded-2xl theme-card-bg-secondary theme-border-default border">
          <p className="text-center theme-text-secondary">
            <span className="inline-block rounded-full bg-success/20 px-3 py-1 text-success border border-success/50">
              ✅ Week 3-4: All Feature Routes Created with Rich Components
            </span>
          </p>
        </div>
      </div>
    </AppLayout>
  )
}
