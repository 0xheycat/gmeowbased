/**
 * LeaderboardPreview Component
 * 
 * Displays top 5 players on landing page
 * Uses /api/leaderboard endpoint with production-ready caching
 * 
 * Template Compliance:
 * - Uses Card, Badge, EmptyState from tailwick-primitives (Tailwick v2.0)
 * - Uses Gmeowbased v0.1 SVG icons (no emoji)
 * - Proper component composition
 */

import Image from 'next/image'
import { Card, CardBody, Badge, EmptyState } from '@/components/ui/tailwick-primitives'

// ========================================
// TYPES
// ========================================

type LeaderboardEntry = {
  rank: number
  address: string
  name: string
  pfpUrl: string
  points: number
  completed: number
  farcasterFid: number
}

type LeaderboardResponse = {
  ok: boolean
  top: LeaderboardEntry[]
  total: number
  updatedAt: number
}

// ========================================
// DATA FETCHING
// ========================================

async function getTopPlayers(): Promise<LeaderboardResponse> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/leaderboard?limit=5&global=true`, {
      next: { revalidate: 60 }, // Cache for 1 minute
    })
    
    if (!res.ok) {
      console.error('Leaderboard API error:', res.status)
      return { ok: false, top: [], total: 0, updatedAt: Date.now() }
    }
    
    const data = await res.json()
    return data
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error)
    return { ok: false, top: [], total: 0, updatedAt: Date.now() }
  }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function formatPoints(points: number): string {
  if (points >= 1000000) return `${(points / 1000000).toFixed(1)}M`
  if (points >= 1000) return `${(points / 1000).toFixed(1)}K`
  return points.toString()
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function getRankBadge(rank: number): { icon: string; color: string } {
  if (rank === 1) return { icon: '/assets/icons/Trophy Icon.svg', color: 'gold' }
  if (rank === 2) return { icon: '/assets/icons/Trophy Icon.svg', color: 'silver' }
  if (rank === 3) return { icon: '/assets/icons/Trophy Icon.svg', color: 'bronze' }
  return { icon: '/assets/icons/Rank Icon.svg', color: 'default' }
}

function getRankGradient(rank: number): string {
  if (rank === 1) return 'from-yellow-600 to-yellow-400'
  if (rank === 2) return 'from-gray-400 to-gray-300'
  if (rank === 3) return 'from-orange-600 to-orange-400'
  return 'from-purple-600 to-purple-400'
}

// ========================================
// PLAYER CARD COMPONENT
// ========================================

interface PlayerCardProps {
  entry: LeaderboardEntry
}

function PlayerCard({ entry }: PlayerCardProps) {
  const { rank, name, pfpUrl, points, address } = entry
  const displayName = name || formatAddress(address)
  const rankBadge = getRankBadge(rank)
  const gradient = getRankGradient(rank)

  return (
    <div className="group relative rounded-2xl bg-gradient-to-br from-purple-800/30 to-purple-900/30 p-6 border border-purple-700/50 hover:border-purple-500/70 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/20">
      {/* Rank Badge */}
      <div className="absolute -top-3 -left-3 w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-xl font-bold border-4 border-purple-900 shadow-lg shadow-purple-600/50 z-10">
        {rank}
      </div>

      {/* Top 3 Glow Effect */}
      {rank <= 3 && (
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-20 transition-opacity blur-xl`}></div>
      )}

      <div className="flex items-center gap-4 relative">
        {/* Avatar */}
        <div className="relative">
          <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${gradient} p-1 shadow-lg`}>
            {pfpUrl ? (
              <Image
                src={pfpUrl}
                alt={displayName}
                width={64}
                height={64}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <Image
                src="/assets/gmeow-illustrations/Avatars/01- Default Avatar.png"
                alt="Default Avatar"
                width={64}
                height={64}
                className="w-full h-full rounded-full object-cover"
              />
            )}
          </div>
          {/* Rank Badge Overlay */}
          {rank <= 3 && (
            <div className="absolute -top-2 -right-2 w-8 h-8 drop-shadow-lg">
              <Image
                src={rankBadge.icon}
                alt={`Rank ${rank}`}
                width={32}
                height={32}
                className="w-full h-full"
              />
            </div>
          )}
        </div>

        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-white truncate">
              {displayName}
            </h3>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-purple-300">
              <Image
                src="/assets/icons/Thumbs Up Icon.svg"
                alt="Points"
                width={16}
                height={16}
                className="w-4 h-4 brightness-0 invert opacity-80"
              />
              <span className="font-semibold text-white">{formatPoints(points)}</span>
              <span>pts</span>
            </div>
            {entry.completed > 0 && (
              <div className="flex items-center gap-1 text-purple-300">
                <Image
                  src="/assets/icons/Thumbs Up Icon.svg"
                  alt="Completed"
                  width={16}
                  height={16}
                  className="w-4 h-4 brightness-0 invert opacity-80"
                />
                <span>{entry.completed}</span>
                <span>quests</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ========================================
// LEADERBOARD PREVIEW (SERVER COMPONENT)
// ========================================

export async function LeaderboardPreview() {
  const leaderboard = await getTopPlayers()

  if (!leaderboard.ok || leaderboard.top.length === 0) {
    return (
      <EmptyState
        icon="/assets/icons/Trophy Icon.svg"
        iconAlt="Trophy"
        title="No Players Yet"
        description="Be the first to join the leaderboard and start earning points!"
        action={
          <a
            href="/app/daily-gm"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            Start Playing
          </a>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      {leaderboard.top.map((entry) => (
        <PlayerCard key={entry.address} entry={entry} />
      ))}
      
      {/* View All Link */}
      <div className="text-center pt-4">
        <a
          href="/leaderboard"
          className="inline-flex items-center gap-2 text-purple-300 hover:text-purple-100 transition-colors group"
        >
          <span>View Full Leaderboard</span>
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </a>
      </div>
    </div>
  )
}

// ========================================
// LOADING SKELETON
// ========================================

export function LeaderboardLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="rounded-2xl bg-purple-800/20 p-6 border border-purple-700/30"
        >
          <div className="flex items-center gap-4">
            {/* Avatar skeleton */}
            <div className="w-16 h-16 rounded-full bg-purple-700/30"></div>
            
            {/* Info skeleton */}
            <div className="flex-1 space-y-2">
              <div className="h-5 w-32 bg-purple-700/30 rounded"></div>
              <div className="h-4 w-24 bg-purple-700/30 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ========================================
// SECTION WRAPPER (for landing page)
// ========================================

export function LeaderboardSection() {
  return (
    <section className="py-20 px-4 bg-black/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 font-gmeow">
            Top Players
          </h2>
          <p className="text-purple-300 text-lg max-w-2xl mx-auto">
            Compete with the best players in the Gmeowbased universe
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <LeaderboardPreview />
        </div>
      </div>
    </section>
  )
}
