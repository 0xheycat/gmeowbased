'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardBody, StatsCard, Button, Badge } from '@/components/ui/tailwick-primitives'
import { AppLayout } from '@/components/layouts/AppLayout'
import { useMiniapp } from '@/hooks/useMiniapp'
import { OnchainStatsCard } from '@/components/features/OnchainStatsCard'

export default function AppPage() {
  const { isMiniapp, isFarcaster, isBase } = useMiniapp()
  const [isFirstTime, setIsFirstTime] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userStats, setUserStats] = useState({
    gmStreak: 0,
    totalXP: 0,
    badgesEarned: 0,
    rank: 0
  })

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const response = await fetch('/api/user/onboarding-status')
        const data = await response.json()
        
        // Show first-time experience if just onboarded in last 24 hours
        if (data.onboardedAt) {
          const onboardedTime = new Date(data.onboardedAt).getTime()
          const now = Date.now()
          const hoursSinceOnboarding = (now - onboardedTime) / (1000 * 60 * 60)
          
          setIsFirstTime(hoursSinceOnboarding < 24)
        }

        // Fetch real user stats if FID available
        if (data.fid) {
          const statsResponse = await fetch(`/api/user/stats?fid=${data.fid}`)
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
        }
      } catch (error) {
        console.error('Failed to check onboarding:', error)
      } finally {
        setLoading(false)
      }
    }

    checkOnboardingStatus()
  }, [])
  return (
    <AppLayout>
      <div className="container mx-auto max-w-7xl p-4 md:p-8">
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
                {isMiniapp && (
                  <Badge variant="primary">
                    {isFarcaster && '✨ Farcaster Miniapp'}
                    {isBase && '✨ Base.dev Miniapp'}
                  </Badge>
                )}
              </div>
            </CardBody>
          </Card>
        )}

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

                <Link href="/app/quest-marketplace" className="group">
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
