'use client'

import dynamic from 'next/dynamic'

// Keep the page lean and client-only
const GuildTeamsPage = dynamic(() => import('@/components/Guild/GuildTeamsPage'), { ssr: false })

export default function Page() {
  return <GuildTeamsPage />
}