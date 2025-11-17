'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { CaretDown, Trophy, Lightning, User, SignOut } from '@phosphor-icons/react'
import { fetchUserByAddress, type FarcasterUser } from '@/lib/neynar'
import { formatNumber } from '@/lib/formatters'

export function ProfileDropdown() {
  const { address, isConnected } = useAccount()
  const [profile, setProfile] = useState<FarcasterUser | null>(null)
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
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    const loadProfile = async () => {
      try {
        const data = await fetchUserByAddress(address)
        if (!cancelled) {
          setProfile(data ?? null)
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setProfile(null)
          setLoading(false)
        }
      }
    }

    loadProfile()

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
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5">
        <div className="h-4 w-4 animate-pulse rounded-full bg-white/20" />
      </div>
    )
  }

  if (!isConnected || !address) {
    return (
      <Link
        href="/profile"
        className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-sm font-medium text-white/70 transition-colors hover:border-[#7CFF7A]/30 hover:bg-[#7CFF7A]/10 hover:text-white"
      >
        <User size={18} weight="bold" />
        <span className="hidden sm:inline">Connect</span>
      </Link>
    )
  }

  if (loading) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-[#7CFF7A]" />
      </div>
    )
  }

  const pfpUrl = profile?.pfpUrl || '/logo.png'
  const username = profile?.username || profile?.displayName || 'Anon'
  const points = profile?.contractData?.points ?? 0
  const streak = profile?.contractData?.currentStreak ?? 0
  const rank = profile?.contractData?.rank ?? null

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button - Mobile: PFP only (smaller), Desktop: PFP + username */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 transition-colors hover:border-[#7CFF7A]/30 hover:bg-[#7CFF7A]/10 sm:pr-3"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Profile menu for @${username}`}
      >
        {/* Mobile: 28px PFP only, Desktop: 32px PFP + username */}
        <div className="relative h-7 w-7 sm:h-8 sm:w-8 overflow-hidden rounded-full border-2 border-[#7CFF7A]/50">
          <Image 
            src={pfpUrl} 
            alt={username} 
            fill 
            className="object-cover" 
            sizes="(max-width: 640px) 28px, 32px" 
          />
          {profile?.powerBadge && (
            <div className="absolute -right-0.5 -top-0.5 sm:-right-1 sm:-top-1 flex h-3 w-3 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-yellow-500 text-[8px] sm:text-[10px]">
              ⚡
            </div>
          )}
        </div>
        {/* Desktop only: username + caret */}
        <span className="hidden text-sm font-medium text-white sm:inline">@{username}</span>
        <CaretDown
          size={14}
          weight="bold"
          className={`hidden sm:block text-white/60 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0B0A16]/95 shadow-2xl backdrop-blur-xl">
            {/* Profile header */}
            <div className="border-b border-white/10 p-4">
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-[#7CFF7A]/50">
                  <Image src={pfpUrl} alt={username} fill className="object-cover" sizes="48px" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">@{username}</p>
                  <p className="text-xs text-white/50">FID: {profile?.fid ?? '—'}</p>
                </div>
                {profile?.powerBadge && (
                  <div className="rounded-full bg-yellow-500/20 px-2 py-1 text-xs font-medium text-yellow-400">
                    ⚡ Power
                  </div>
                )}
              </div>
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-3 gap-2 border-b border-white/10 p-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-[#7CFF7A]">
                  <Trophy size={14} weight="fill" />
                  <span className="text-sm font-bold">{formatNumber(points)}</span>
                </div>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-white/40">Points</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-yellow-400">
                  <Lightning size={14} weight="fill" />
                  <span className="text-sm font-bold">{streak}</span>
                </div>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-white/40">Streak</p>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-white">{rank ? `#${rank}` : '—'}</div>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-white/40">Rank</p>
              </div>
            </div>

            {/* Menu items */}
            <div className="p-2">
              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <User size={18} weight="bold" />
                View Full Profile
              </Link>
              <Link
                href="/Dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Trophy size={18} weight="bold" />
                Dashboard
              </Link>
              <Link
                href="/leaderboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Lightning size={18} weight="bold" />
                Leaderboard
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  // Trigger wallet disconnect - you can add this logic
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <SignOut size={18} weight="bold" />
                Disconnect
              </button>
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">Wallet</span>
                <code className="rounded bg-white/5 px-2 py-1 text-white/60">
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
