'use client'

/**
 * Guild Creation Page Route
 * Path: /guild/create
 * Features: Form to create a new guild (requires 100 BASE POINTS)
 */

import { Suspense } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import GuildCreationForm from '@/components/guild/GuildCreationForm'
import Loader from '@/components/ui/loader'

export default function GuildCreatePage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()

  const handleSuccess = (guildId: string, guildName: string) => {
    // Redirect to the new guild page after successful creation
    router.push(`/guild/${guildId}`)
  }

  const handleCancel = () => {
    // Go back to guild discovery
    router.push('/guild')
  }

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Wallet Not Connected
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please connect your wallet to create a guild
            </p>
            <button
              onClick={() => router.push('/guild')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Create Your Guild
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Start your own guild and invite others to join. Requires 100 BASE POINTS.
          </p>
        </div>

        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader />
          </div>
        }>
          <GuildCreationForm 
            address={address}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </Suspense>
      </div>
    </div>
  )
}
