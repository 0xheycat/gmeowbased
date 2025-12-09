'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ShieldIcon } from '@/components/icons/shield-icon'

interface Guild {
  id: string
  name: string
  chain: string
  leader: string
  totalPoints: string
  memberCount: string
  level: number
  active: boolean
}

export function GuildsShowcase() {
  const [guilds, setGuilds] = useState<Guild[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchGuilds() {
      try {
        const res = await fetch('/api/guild/list?chain=base&sortBy=points&limit=3&offset=0')
        if (!res.ok) throw new Error('Failed to fetch guilds')
        const data = await res.json()
        setGuilds(data.guilds || [])
      } catch (error) {
        console.error('Failed to load guilds:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchGuilds()
  }, [])

  if (loading) {
    return <GuildsShowcaseSkeleton />
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-gray-50 dark:bg-gray-900/50">
      <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">Top guilds</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {guilds.map((guild) => (
          <div key={guild.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/30 dark:to-accent-900/30">
              <ShieldIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-4">{guild.name}</h3>
            <div className="flex justify-around text-center mb-4">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{guild.memberCount}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Members</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{parseInt(guild.totalPoints).toLocaleString()}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Points</div>
              </div>
            </div>
            <Link
              href={`/guild/${guild.id}`}
              className="block w-full text-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
            >
              JOIN GUILD
            </Link>
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          className="inline-flex items-center justify-center px-8 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-semibold shadow-md hover:shadow-lg min-h-[44px]"
          href="/guild"
        >
          BROWSE ALL GUILDS
        </Link>
        <Link
          className="inline-flex items-center justify-center px-8 py-3 border-2 border-primary-600 text-primary-600 dark:text-primary-400 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors font-semibold min-h-[44px]"
          href="/guild"
        >
          CREATE YOUR GUILD
        </Link>
      </div>
    </section>
  )
}

function GuildsShowcaseSkeleton() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-gray-50 dark:bg-gray-900/50">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mx-auto mb-12" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
            <div className="animate-pulse">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4" />
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mx-auto mb-4" />
              <div className="flex justify-around mb-4">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16" />
              </div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
