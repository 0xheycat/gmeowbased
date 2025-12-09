'use client'

/**
 * Guild Profile Page Route
 * Path: /guild/[guildId]
 * Features: Guild profile with analytics, member list, treasury
 */

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import GuildProfilePage from '@/components/guild/GuildProfilePage'
import Loader from '@/components/ui/loader'

export default function GuildDetailPage() {
  const params = useParams()
  const guildId = Array.isArray(params.guildId) ? params.guildId[0] : params.guildId

  if (!guildId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Guild Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Invalid guild ID
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader />
        </div>
      }>
        <GuildProfilePage guildId={guildId} />
      </Suspense>
    </div>
  )
}
