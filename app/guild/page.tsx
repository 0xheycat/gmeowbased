'use client'

/**
 * Guild Discovery Page Route
 * Path: /guild
 * Features: Browse guilds, search, filter by chain/sort, pagination
 */

import { Suspense } from 'react'
import GuildDiscoveryPage from '@/components/guild/GuildDiscoveryPage'
import Loader from '@/components/ui/loader'

export default function GuildPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader />
        </div>
      }>
        <GuildDiscoveryPage />
      </Suspense>
    </div>
  )
}
