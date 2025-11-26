'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, User } from '@phosphor-icons/react'
import { BadgeInventory } from '@/components/badge/BadgeInventory'
import type { UserBadge } from '@/lib/badges'

interface FarcasterUser {
  fid: number
  username: string
  displayName: string
  pfpUrl: string
}

export default function UserBadgesPage() {
  const params = useParams()
  const fid = params.fid as string

  const [badges, setBadges] = useState<UserBadge[]>([])
  const [user, setUser] = useState<FarcasterUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadBadges() {
      if (!fid) return

      setLoading(true)
      setError(null)

      try {
        // Fetch badges
        const badgesRes = await fetch(`/api/badges/list?fid=${fid}`)
        const badgesData = await badgesRes.json()

        if (!badgesRes.ok || !badgesData.success) {
          throw new Error(badgesData.error || 'Failed to load badges')
        }

        setBadges(badgesData.badges || [])

        // Fetch user profile
        try {
          const userRes = await fetch(`/api/user/profile?fid=${fid}`)
          const userData = await userRes.json()

          if (userRes.ok && userData.fid) {
            setUser({
              fid: userData.fid,
              username: userData.username || `user-${fid}`,
              displayName: userData.displayName || userData.username || `User ${fid}`,
              pfpUrl: userData.pfpUrl || '/logo.png',
            })
          }
        } catch (err) {
          console.warn('Failed to load user profile:', err)
          // Continue with just FID
          setUser({
            fid: parseInt(fid),
            username: `user-${fid}`,
            displayName: `User ${fid}`,
            pfpUrl: '/logo.png',
          })
        }
      } catch (err) {
        console.error('Failed to load badges:', err)
        setError((err as Error).message || 'Failed to load badge collection')
      } finally {
        setLoading(false)
      }
    }

    loadBadges()
  }, [fid])

  // Badge tier statistics
  const badgeStats = badges.reduce(
    (acc, badge) => {
      acc[badge.tier] = (acc[badge.tier] || 0) + 1
      if (badge.minted) acc.minted++
      return acc
    },
    { mythic: 0, legendary: 0, epic: 0, rare: 0, common: 0, minted: 0 } as Record<string, number>
  )

  // Task 15: Handle individual badge click for sharing
  const handleBadgeClick = async (badge: UserBadge) => {
    try {
      // Use badgeShare route for individual badge frames
      const shareUrl = `https://gmeowhq.art/api/frame/badgeShare?fid=${fid}&badgeId=${badge.badgeId}`
      const shareText = `Just earned the ${badge.metadata?.name || badge.badgeType} badge! 🎮✨\n\n— via @gmeowbased`
      
      // Open Warpcast composer
      const warpcastUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(shareUrl)}`
      window.open(warpcastUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      console.error('Failed to share badge:', error)
    }
  }

  return (
    <div className="relative min-h-screen pixel-page">
      {/* Background */}
      <div className="pixel-bg-overlay" aria-hidden>
        <div className="pixel-grid-overlay" />
        <div className="pixel-dither-overlay" />
        <div className="pixel-scanlines-overlay" />
      </div>

      <main className="container relative z-10 mx-auto px-4 py-10 pb-24">
        {/* Back Button */}
        <Link
          href={`/profile/${fid}`}
          className="inline-flex items-center gap-2 mb-6 min-h-[44px] py-2 text-sm text-slate-950 dark:text-white/70 hover:text-slate-950 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} weight="bold" />
          Back to Profile
        </Link>

        {/* Header Card */}
        <div className="pixel-card mb-8">
          <div className="flex items-center gap-6">
            {/* User Avatar */}
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-gold-dark">
              {user?.pfpUrl ? (
                <Image
                  src={user.pfpUrl}
                  alt={user.displayName}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-900 to-purple-700 flex items-center justify-center">
                  <User size={32} weight="bold" className="text-slate-950 dark:text-white" />
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-950 dark:text-white mb-1">
                {user?.displayName || `User ${fid}`}&apos;s Badges
              </h1>
              <p className="text-sm text-slate-950 dark:text-white/60">
                @{user?.username || `fid-${fid}`} • FID {fid}
              </p>

              {/* Badge Count Stats */}
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-slate-950 dark:text-white">{badges.length}</span>
                  <span className="text-xs text-slate-950 dark:text-white/50 uppercase tracking-wider">
                    Total Badges
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-emerald-400">{badgeStats.minted}</span>
                  <span className="text-xs text-slate-950 dark:text-white/50 uppercase tracking-wider">
                    Minted
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tier Distribution */}
          {badges.length > 0 && (
            <div className="mt-6 pt-6 border-t border-white dark:border-slate-700/10">
              <h3 className="text-sm font-bold text-slate-950 dark:text-white/70 uppercase tracking-wider mb-3">
                Collection by Tier
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
                {[
                  { tier: 'mythic', label: 'Mythic', color: 'rgb(168 85 247)' },
                  { tier: 'legendary', label: 'Legendary', color: 'rgb(251 191 36)' },
                  { tier: 'epic', label: 'Epic', color: 'rgb(6 182 212)' },
                  { tier: 'rare', label: 'Rare', color: 'rgb(139 92 246)' },
                  { tier: 'common', label: 'Common', color: 'rgb(156 163 175)' },
                ].map(({ tier, label, color }) => (
                  <div
                    key={tier}
                    className="text-center p-3 rounded-lg border"
                    style={{
                      backgroundColor: `${color}10`,
                      borderColor: `${color}40`,
                    }}
                  >
                    <div className="text-2xl font-bold" style={{ color }}>
                      {badgeStats[tier] || 0}
                    </div>
                    <div className="text-xs text-slate-950 dark:text-white/60 mt-1">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="pixel-card">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-white dark:border-slate-700/20 border-t-white/80 rounded-full animate-spin mb-4" />
              <p className="text-sm text-slate-950 dark:text-white/60">Loading badge collection...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="pixel-card border-2 border-red-500/50 bg-red-500/10">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Badge Inventory */}
        {!loading && !error && (
          <div className="pixel-card">
            <div className="mb-6">
              <h2 className="pixel-section-title">Badge Collection</h2>
              <p className="text-sm text-slate-950 dark:text-white/50 mt-2">
                All badges earned by this user. Badges with glow effects are minted on-chain.
              </p>
            </div>

            <BadgeInventory badges={badges} onBadgeClick={handleBadgeClick} />
          </div>
        )}

        {/* Share Card */}
        {!loading && !error && badges.length > 0 && (
          <div className="pixel-card mt-6 text-center">
            <p className="text-sm text-slate-950 dark:text-white/60 mb-4">
              Share your latest badge on Farcaster
            </p>
            <button
              type="button"
              onClick={() => {
                // Share badge collection (all badges)
                const shareUrl = `https://gmeowhq.art/api/frame?type=badge&fid=${fid}`
                const shareText = `Check out my ${badges.length} badge collection on @gmeowbased! 🎮✨\n\nClick badges individually to share them!`
                
                // Open Warpcast composer
                const warpcastUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(shareUrl)}`
                window.open(warpcastUrl, '_blank', 'noopener,noreferrer')
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-slate-950 dark:text-white font-bold transition-all"
            >
              Share Collection on Warpcast
            </button>
            <p className="text-xs text-slate-950 dark:text-white/50 mt-2">
              💡 Tip: Click individual badges above to share them separately!
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
