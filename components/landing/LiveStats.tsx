/**
 * LiveStats Component - Gmeowbased Landing Page
 * Fetches and displays real-time platform statistics
 * Server Component - fetches data at build/request time
 * 
 * Template Compliance:
 * - Uses StatsCard from tailwick-primitives (Tailwick v2.0 pattern)
 * - Uses Gmeowbased v0.1 SVG icons
 * - No inline styles, proper component composition
 */

import { StatsCard, LoadingSkeleton } from '@/components/ui/tailwick-primitives'

interface PlatformStats {
  totalUsers: number
  totalGMs: number
  activeQuests: number
  totalGuilds: number
}

async function getStats(): Promise<PlatformStats> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/stats`, {
      next: { revalidate: 300 }, // Revalidate every 5 minutes
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch stats')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error fetching stats:', error)
    // Return fallback stats
    return {
      totalUsers: 10000,
      totalGMs: 1000000,
      activeQuests: 500,
      totalGuilds: 50,
    }
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M+`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(0)}K+`
  }
  return num.toString()
}

export async function LiveStats() {
  const stats = await getStats()

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      <StatsCard
        icon="/assets/icons/Profile Icon.svg"
        iconAlt="Users"
        label="Active Players"
        value={formatNumber(stats.totalUsers)}
        gradient="purple"
      />
      <StatsCard
        icon="/assets/icons/Notifications Icon.svg"
        iconAlt="GMs"
        label="GMs Said"
        value={formatNumber(stats.totalGMs)}
        gradient="blue"
      />
      <StatsCard
        icon="/assets/icons/Quests Icon.svg"
        iconAlt="Quests"
        label="Live Quests"
        value={formatNumber(stats.activeQuests)}
        gradient="orange"
      />
      <StatsCard
        icon="/assets/icons/Trophy Icon.svg"
        iconAlt="Guilds"
        label="Active Guilds"
        value={formatNumber(stats.totalGuilds)}
        gradient="green"
      />
    </div>
  )
}

// Loading fallback
export function LiveStatsLoading() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <StatsCard
          key={i}
          icon="/assets/icons/Profile Icon.svg"
          iconAlt="Loading"
          label="Loading..."
          value="---"
          gradient="purple"
          loading={true}
        />
      ))}
    </div>
  )
}
