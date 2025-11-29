'use client'

import { Suspense } from 'react'
import { FeedContainer } from '@/components/features/farcaster-feed'
import { useUser } from '@/contexts/UserContext'
import { Card, CardBody } from '@/components/ui/tailwick-primitives'
import Image from 'next/image'

export default function HomePage() {
  const user = useUser()

  // Show login prompt if not authenticated
  if (!user.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-black text-white px-4 py-20">
        <div className="container mx-auto max-w-2xl">
          <Card className="theme-border-default">
            <CardBody className="text-center py-16">
              <div className="flex justify-center mb-6">
                <Image
                  src="/assets/icons/User Icon.svg"
                  alt="Login"
                  width={80}
                  height={80}
                  className="w-20 h-20 opacity-60"
                />
              </div>
              <h2 className="text-3xl font-bold mb-4 theme-text-primary">
                Welcome to Gmeowbased
              </h2>
              <p className="theme-text-secondary mb-8 text-lg">
                Connect your wallet to see your personalized Farcaster feed and start your adventure
              </p>
              <a
                href="/app"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-500 hover:to-pink-500 transition-all transform hover:scale-105"
              >
                <Image
                  src="/assets/icons/Wallet Icon.svg"
                  alt="Connect"
                  width={20}
                  height={20}
                  className="w-5 h-5 brightness-0 invert"
                />
                Connect Wallet
              </a>
            </CardBody>
          </Card>
        </div>
      </div>
    )
  }

  // Show feed for authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-black text-white px-4 py-8">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 font-gmeow bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            Gmeowbased Feed
          </h1>
          <p className="theme-text-secondary text-lg">
            Stay connected with the Farcaster community
          </p>
        </div>

        {/* Feed */}
        <Suspense fallback={<div className="text-center py-12">Loading feed...</div>}>
          <FeedContainer defaultType="trending" />
        </Suspense>
      </div>
    </div>
  )
}
