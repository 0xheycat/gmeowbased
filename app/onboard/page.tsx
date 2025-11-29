'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardBody, Button, Badge, SectionHeading } from '@/components/ui/tailwick-primitives'
import { useMiniapp } from '@/hooks/useMiniapp'

// Onboarding step types
type OnboardingStep = 'welcome' | 'daily-gm' | 'quests' | 'profile' | 'complete'

export default function OnboardingPage() {
  const router = useRouter()
  const { isMiniapp, isFarcaster, isBase } = useMiniapp()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome')
  const [loading, setLoading] = useState(false)
  const [rewards, setRewards] = useState<{ xp: number; message: string } | null>(null)

  // Check if already onboarded
  useEffect(() => {
    const checkOnboarded = async () => {
      try {
        const response = await fetch('/api/user/onboarding-status')
        const data = await response.json()
        
        if (data.onboarded) {
          router.push('/app/app')
        }
      } catch (error) {
        console.error('Failed to check onboarding status:', error)
      }
    }
    
    checkOnboarded()
  }, [router])

  // Handle step navigation
  const nextStep = () => {
    const steps: OnboardingStep[] = ['welcome', 'daily-gm', 'quests', 'profile', 'complete']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    }
  }

  const prevStep = () => {
    const steps: OnboardingStep[] = ['welcome', 'daily-gm', 'quests', 'profile', 'complete']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    }
  }

  // Complete onboarding
  const completeOnboarding = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/user/complete-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      const data = await response.json()
      
      if (data.success && data.rewards) {
        setRewards(data.rewards)
        
        // Show rewards for 2 seconds before redirecting
        setTimeout(() => {
          router.push('/app/app')
        }, 2000)
      } else {
        router.push('/app/app')
      }
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
      setLoading(false)
    }
  }

  // Skip onboarding
  const skipOnboarding = async () => {
    await completeOnboarding()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-info/20 rounded-full blur-3xl" />

      <div className="relative z-10 container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-screen">
        {/* Progress indicator */}
        {currentStep !== 'welcome' && currentStep !== 'complete' && (
          <div className="mb-8 flex gap-2">
            {['daily-gm', 'quests', 'profile'].map((step, index) => (
              <Badge
                key={step}
                variant={currentStep === step ? 'primary' : 'info'}
                className="px-4 py-2"
              >
                Step {index + 1}
              </Badge>
            ))}
          </div>
        )}

        {/* Welcome Screen */}
        {currentStep === 'welcome' && (
          <div className="max-w-2xl w-full">
            <Card gradient="purple" className="text-center">
              <CardBody className="p-12">
                <div className="mb-8">
                  <Image
                    src="/logo.png"
                    alt="Gmeowbased"
                    width={120}
                    height={120}
                    className="mx-auto mb-6"
                  />
                  <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-4">
                    Welcome to Gmeowbased!
                  </h1>
                  <p className="text-xl text-white/80">
                    Your multi-chain quest game adventure starts here
                  </p>
                </div>

                {isMiniapp && (
                  <Badge variant="success" className="mb-6">
                    {isFarcaster && '✨ Running in Farcaster'}
                    {isBase && '✨ Running in Base.dev'}
                  </Badge>
                )}

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-4 text-left">
                    <Image
                      src="/assets/gmeow-icons/Quests Icon.svg"
                      alt="Quests"
                      width={48}
                      height={48}
                    />
                    <div>
                      <h3 className="text-lg font-bold text-white">Epic Quests</h3>
                      <p className="text-white/70">Complete challenges across multiple chains</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-left">
                    <Image
                      src="/assets/gmeow-icons/Trophy Icon.svg"
                      alt="Rewards"
                      width={48}
                      height={48}
                    />
                    <div>
                      <h3 className="text-lg font-bold text-white">Exclusive Rewards</h3>
                      <p className="text-white/70">Earn badges, XP, and on-chain achievements</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-left">
                    <Image
                      src="/assets/gmeow-icons/Groups Icon.svg"
                      alt="Guilds"
                      width={48}
                      height={48}
                    />
                    <div>
                      <h3 className="text-lg font-bold text-white">Join Guilds</h3>
                      <p className="text-white/70">Team up with others for epic battles</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button onClick={nextStep} variant="primary" size="lg" className="flex-1">
                    Start Tutorial
                  </Button>
                  <Button onClick={skipOnboarding} variant="ghost" size="lg">
                    Skip
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Step 1: Daily GM */}
        {currentStep === 'daily-gm' && (
          <div className="max-w-2xl w-full">
            <Card gradient="blue" className="text-center">
              <CardBody className="p-12">
                <Image
                  src="/assets/gmeow-icons/Success Box Icon.svg"
                  alt="Daily GM"
                  width={120}
                  height={120}
                  className="mx-auto mb-6"
                />

                <SectionHeading
                  title="Daily GM Streak"
                  subtitle="Say GM every day to build your streak and earn rewards"
                />

                <div className="bg-white/5 rounded-xl p-6 mb-8">
                  <p className="text-white/80 text-lg mb-4">
                    🌅 Visit <strong>/daily-gm</strong> every day
                  </p>
                  <p className="text-white/80 text-lg mb-4">
                    🔥 Build your streak for bonus XP
                  </p>
                  <p className="text-white/80 text-lg">
                    🏆 Reach 100-day streak for legendary rewards
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button onClick={prevStep} variant="secondary" size="lg">
                    Back
                  </Button>
                  <Button onClick={nextStep} variant="primary" size="lg" className="flex-1">
                    Next
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Step 2: Quests */}
        {currentStep === 'quests' && (
          <div className="max-w-2xl w-full">
            <Card gradient="orange" className="text-center">
              <CardBody className="p-12">
                <Image
                  src="/assets/gmeow-icons/Quests Icon.svg"
                  alt="Quests"
                  width={120}
                  height={120}
                  className="mx-auto mb-6"
                />

                <SectionHeading
                  title="Complete Quests"
                  subtitle="Explore cross-chain challenges and earn rewards"
                />

                <div className="bg-white/5 rounded-xl p-6 mb-8">
                  <p className="text-white/80 text-lg mb-4">
                    ⚔️ Choose from <strong>Daily</strong>, <strong>Weekly</strong>, and <strong>Legendary</strong> quests
                  </p>
                  <p className="text-white/80 text-lg mb-4">
                    🌐 Complete challenges across Base, Optimism, and more
                  </p>
                  <p className="text-white/80 text-lg">
                    💎 Earn badges, XP, and on-chain achievements
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button onClick={prevStep} variant="secondary" size="lg">
                    Back
                  </Button>
                  <Button onClick={nextStep} variant="primary" size="lg" className="flex-1">
                    Next
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Step 3: Profile */}
        {currentStep === 'profile' && (
          <div className="max-w-2xl w-full">
            <Card gradient="green" className="text-center">
              <CardBody className="p-12">
                <Image
                  src="/assets/gmeow-icons/Profile Icon.svg"
                  alt="Profile"
                  width={120}
                  height={120}
                  className="mx-auto mb-6"
                />

                <SectionHeading
                  title="Your Profile"
                  subtitle="Track your progress and showcase your achievements"
                />

                <div className="bg-white/5 rounded-xl p-6 mb-8">
                  <p className="text-white/80 text-lg mb-4">
                    👤 View your <strong>stats</strong>, <strong>badges</strong>, and <strong>leaderboard rank</strong>
                  </p>
                  <p className="text-white/80 text-lg mb-4">
                    🎖️ Display your on-chain achievements
                  </p>
                  <p className="text-white/80 text-lg">
                    🤝 Join guilds and team up with others
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button onClick={prevStep} variant="secondary" size="lg">
                    Back
                  </Button>
                  <Button
                    onClick={() => setCurrentStep('complete')}
                    variant="success"
                    size="lg"
                    className="flex-1"
                  >
                    Finish Tutorial
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Complete Screen */}
        {currentStep === 'complete' && (
          <div className="max-w-2xl w-full">
            <Card gradient="pink" className="text-center">
              <CardBody className="p-12">
                <Image
                  src="/assets/gmeow-icons/Trophy Icon.svg"
                  alt="Complete"
                  width={120}
                  height={120}
                  className="mx-auto mb-6"
                />

                <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent mb-4">
                  You're Ready! 🎉
                </h1>

                <p className="text-xl text-white/80 mb-8">
                  Time to start your Gmeowbased adventure!
                </p>

                <Button
                  onClick={completeOnboarding}
                  variant="success"
                  size="lg"
                  loading={loading}
                  className="w-full"
                >
                  {loading ? (rewards ? rewards.message : 'Preparing your dashboard...') : 'Go to Dashboard'}
                </Button>

                {rewards && (
                  <div className="mt-4 text-center">
                    <Badge variant="success" className="text-lg px-4 py-2">
                      🎉 {rewards.message}
                    </Badge>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
