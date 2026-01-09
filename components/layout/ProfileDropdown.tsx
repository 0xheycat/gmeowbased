'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import BoltIcon from '@mui/icons-material/Bolt'
import PersonIcon from '@mui/icons-material/Person'
import LogoutIcon from '@mui/icons-material/Logout'
import WalletIcon from '@mui/icons-material/AccountBalanceWallet'
import { fetchUserByAddress, type FarcasterUser } from '@/lib/integrations/neynar-client'
import { formatNumber } from '@/lib/utils/formatters'
import { useAuthContext } from '@/lib/contexts'

interface UserStats {
  totalScore: number
  currentStreak: number
  pointsBalance: number
  level: number
  rankTier: number
}

export function ProfileDropdown() {
  const { address, isConnected } = useAccount()
  const { cachedWallets } = useAuthContext()
  const [profile, setProfile] = useState<FarcasterUser | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fix hydration mismatch - only render after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!address || !isConnected) {
      setProfile(null)
      setStats(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    const loadData = async () => {
      try {
        // Fetch Farcaster profile
        const profileData = await fetchUserByAddress(address)
        
        // Fetch on-chain stats from Subsquid via Apollo Client
        const { getApolloClient } = await import('@/lib/apollo-client')
        const { gql } = await import('@apollo/client')
        const apolloClient = getApolloClient()
        
        const { data: subsquidData } = await apolloClient.query({
          query: gql`
            query GetUserStats($address: String!) {
              users(where: { id_eq: $address }, limit: 1) {
                id
                totalScore
                currentStreak
                pointsBalance
                level
                rankTier
              }
            }
          `,
          variables: { address: address.toLowerCase() },
          fetchPolicy: 'cache-first',
        })
        
        const userStats = subsquidData?.users?.[0]
        
        if (!cancelled) {
          setProfile(profileData ?? null)
          setStats(userStats ? {
            totalScore: Number(userStats.totalScore || 0),
            currentStreak: Number(userStats.currentStreak || 0),
            pointsBalance: Number(userStats.pointsBalance || 0),
            level: Number(userStats.level || 0),
            rankTier: Number(userStats.rankTier || 0),
          } : null)
          setLoading(false)
        }
      } catch (error) {
        console.error('[ProfileDropdown] Error loading data:', error)
        if (!cancelled) {
          setProfile(null)
          setStats(null)
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [address, isConnected])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  // Prevent hydration mismatch - wait for client mount
  if (!mounted) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 dark:border-white/10 bg-slate-100/90 dark:bg-white/5 backdrop-blur-xl backdrop-saturate-150">
        <div className="h-4 w-4 animate-pulse rounded-full bg-slate-900/20 dark:bg-white/5 backdrop-blur-xl backdrop-saturate-150" />
      </div>
    )
  }

  if (!isConnected || !address) {
    return (
      <div className="flex items-center gap-2">
        <appkit-button />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 dark:border-white/10 bg-slate-100/90 dark:bg-white/5 backdrop-blur-xl backdrop-saturate-150">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/20 dark:border-white/10 border-t-accent-green" />
      </div>
    )
  }

  const pfpUrl = profile?.pfpUrl || '/logo.png'
  const username = profile?.username || profile?.displayName || 'Anon'
  const points = stats?.pointsBalance ?? 0
  const streak = stats?.currentStreak ?? 0
  const rank = null // TODO: Get rank from leaderboard API

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button - Mobile: PFP only (smaller), Desktop: PFP + username */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100/90 dark:bg-white/5 p-1.5 transition-colors hover:border-accent-green/30 hover:bg-accent-green/10 sm:p-1 sm:pr-3 backdrop-blur-xl backdrop-saturate-150"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Profile menu for @${username}`}
      >
        {/* Mobile: 28px PFP only, Desktop: 32px PFP + username */}
        <div className="relative h-7 w-7 sm:h-8 sm:w-8 overflow-hidden rounded-full border-2 border-accent-green/50">
          <Image 
            src={pfpUrl} 
            alt={username} 
            fill 
            className="object-cover" 
            sizes="(max-width: 640px) 28px, 32px" 
          />
          {profile?.powerBadge && (
            <div className="absolute -right-0.5 -top-0.5 sm:-right-1 sm:-top-1 flex h-3 w-3 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-yellow-500">
              <BoltIcon sx={{ fontSize: 10 }} className="text-white" />
            </div>
          )}
        </div>
        {/* Desktop only: username + caret */}
        <span className="hidden text-sm font-medium text-slate-950 dark:text-white sm:inline">@{username}</span>
        <KeyboardArrowDownIcon
          sx={{ fontSize: 14 }}
          className={`hidden sm:block text-slate-600 dark:text-white/60 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] max-w-xs sm:w-72 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/98 dark:bg-slate-900/98 shadow-2xl backdrop-blur-xl">
            {/* Profile header */}
            <div className="border-b border-slate-200 dark:border-white/10 p-4">
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-accent-green/50">
                  <Image src={pfpUrl} alt={username} fill className="object-cover" sizes="48px" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 dark:text-white">@{username}</p>
                  <p className="text-xs text-slate-600 dark:text-white/60">FID: {profile?.fid ?? '—'}</p>
                </div>
                {profile?.powerBadge && (
                  <div className="rounded-full bg-yellow-500/20 px-2 py-1 text-xs font-medium text-yellow-400 flex items-center gap-1">
                    <BoltIcon sx={{ fontSize: 12 }} /> Power
                  </div>
                )}
              </div>
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-3 gap-2 border-b border-slate-200 dark:border-white/10 p-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-accent-green">
                  <EmojiEventsIcon sx={{ fontSize: 14 }} />
                  <span className="text-sm font-bold">{formatNumber(points)}</span>
                </div>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-700 dark:text-white/50">Points</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-yellow-400">
                  <BoltIcon sx={{ fontSize: 14 }} />
                  <span className="text-sm font-bold">{streak}</span>
                </div>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-700 dark:text-white/50">Streak</p>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-slate-900 dark:text-white">{rank ? `#${rank}` : '—'}</div>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-700 dark:text-white/50">Rank</p>
              </div>
            </div>

            {/* Menu items */}
            <div className="p-2">
              {/* Multi-Wallet Cache */}
              {cachedWallets.length > 1 && (
                <div className="mb-2 px-3 py-2 rounded-lg bg-slate-100/50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2 mb-2">
                    <WalletIcon sx={{ fontSize: 14 }} className="text-slate-600 dark:text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {cachedWallets.length} Wallets Connected
                    </span>
                  </div>
                  <div className="space-y-1">
                    {cachedWallets.map((wallet, i) => (
                      <div
                        key={wallet}
                        className={`text-xs font-mono px-2 py-1 rounded ${
                          wallet.toLowerCase() === address?.toLowerCase()
                            ? 'bg-accent-green/20 text-accent-green'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {wallet.slice(0, 6)}...{wallet.slice(-4)}
                        {wallet.toLowerCase() === address?.toLowerCase() && (
                          <span className="ml-2 text-[10px]">● Active</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Wallet Management */}
              <div className="mb-2 px-3 py-2">
                <appkit-button />
              </div>
              
              <div className="border-t border-slate-200 dark:border-white/10 my-2" />
              
              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-950 dark:text-white/80 transition-colors hover:bg-slate-50/90 dark:bg-slate-900/90 hover:text-slate-900 dark:text-white backdrop-blur-xl backdrop-saturate-150"
              >
                <PersonIcon sx={{ fontSize: 18 }} />
                View Full Profile
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-950 dark:text-white/80 transition-colors hover:bg-slate-50/90 dark:bg-slate-900/90 hover:text-slate-900 dark:text-white backdrop-blur-xl backdrop-saturate-150"
              >
                <EmojiEventsIcon sx={{ fontSize: 18 }} />
                Dashboard
              </Link>
              <Link
                href="/leaderboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-950 dark:text-white/80 transition-colors hover:bg-slate-50/90 dark:bg-slate-900/90 hover:text-slate-900 dark:text-white backdrop-blur-xl backdrop-saturate-150"
              >
                <BoltIcon sx={{ fontSize: 18 }} />
                Leaderboard
              </Link>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 dark:border-white/10 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-700 dark:text-white/50">Wallet</span>
                <code className="rounded bg-slate-100/90 dark:bg-white/5 px-2 py-1 text-slate-700 dark:text-white/70 backdrop-blur-xl backdrop-saturate-150">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </code>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
