'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useUnifiedFarcasterAuth } from '@/hooks/useUnifiedFarcasterAuth'
import { WalletConnect } from '@/components/features/WalletConnect'
import { Button } from '@/components/ui/tailwick-primitives'

interface ProfileDropdownProps {
  isMobile?: boolean
  onClose?: () => void
  miniKitContext?: any
  isFrameReady?: boolean
  isMiniAppSession?: boolean
  signInWithMiniKit?: () => Promise<any>
}

/**
 * Profile Dropdown Component with Unified Farcaster Auth
 * 
 * NEW UI: Tailwick v2.0 design with Gmeowbased icons
 * IMPROVED LOGIC: Unified auth from old foundation + new session system
 * 
 * Features:
 * - Sign in with Farcaster (MiniKit/Frame/Session/Query)
 * - Profile display with Neynar data
 * - Auth source indicator
 * - Wallet connection
 * - Navigation links
 * - Sign out
 */
export function ProfileDropdown({
  isMobile = false,
  onClose,
  miniKitContext,
  isFrameReady,
  isMiniAppSession,
  signInWithMiniKit,
}: ProfileDropdownProps) {
  const {
    fid,
    username,
    displayName,
    pfpUrl,
    isAuthenticated,
    authSource,
    profile,
    profileLoading,
    signIn,
    signOut,
  } = useUnifiedFarcasterAuth({
    miniKitEnabled: Boolean(signInWithMiniKit),
    miniKitContext,
    isFrameReady,
    isMiniAppSession,
    signInWithMiniKit,
    autoSignIn: false, // Don't auto sign-in in dropdown
  })

  const [signingIn, setSigningIn] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const handleSignIn = useCallback(async () => {
    if (!signInWithMiniKit) return
    
    setSigningIn(true)
    try {
      await signIn()
    } finally {
      setSigningIn(false)
    }
  }, [signIn, signInWithMiniKit])

  const handleSignOut = useCallback(async () => {
    setSigningOut(true)
    try {
      await signOut()
      onClose?.()
    } finally {
      setSigningOut(false)
    }
  }, [signOut, onClose])

  const getTierColor = (tier?: string) => {
    if (!tier) return 'from-slate-400 to-slate-500'
    const colors: Record<string, string> = {
      legendary: 'from-yellow-400 to-orange-500',
      epic: 'from-purple-400 to-pink-500',
      rare: 'from-blue-400 to-cyan-500',
      uncommon: 'from-green-400 to-emerald-500',
      common: 'from-gray-400 to-slate-500',
    }
    return colors[tier.toLowerCase()] || colors.common
  }

  const getAuthSourceBadge = () => {
    if (!authSource) return null
    
    const badges: Record<string, { label: string; color: string }> = {
      minikit: { label: 'MiniKit', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
      frame: { label: 'Frame', color: 'bg-gradient-to-r from-blue-500 to-cyan-500' },
      session: { label: 'Session', color: 'bg-gradient-to-r from-green-500 to-emerald-500' },
      query: { label: 'Query', color: 'bg-gradient-to-r from-yellow-500 to-orange-500' },
    }
    
    const badge = badges[authSource]
    if (!badge) return null
    
    return (
      <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold text-white ${badge.color}`}>
        {badge.label}
      </div>
    )
  }

  // Not authenticated - show sign-in prompt
  if (!isAuthenticated || !fid) {
    return (
      <div className={`${isMobile ? 'p-4' : 'px-4 py-3'}`}>
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full theme-bg-subtle flex items-center justify-center">
            <Image
              src="/assets/gmeow-icons/Profile Icon.svg"
              alt="Sign in"
              width={32}
              height={32}
              className="opacity-50"
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold theme-text-primary mb-1">
              Not signed in
            </h3>
            <p className="text-xs theme-text-tertiary">
              Connect with Farcaster to access your profile
            </p>
          </div>
          
          {signInWithMiniKit ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSignIn}
              disabled={signingIn}
              className="w-full"
            >
              {signingIn ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign in with Farcaster'
              )}
            </Button>
          ) : (
            <p className="text-xs theme-text-tertiary italic">
              Open in Farcaster frame or miniapp to sign in
            </p>
          )}
        </div>
      </div>
    )
  }

  // Authenticated - show profile
  return (
    <div>
      {/* Profile Header */}
      <div className={`${isMobile ? 'p-4' : 'px-4 py-3'} border-b theme-border-subtle`}>
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            {profileLoading ? (
              <div className="w-12 h-12 rounded-full theme-bg-subtle animate-pulse" />
            ) : (
              <>
                <Image
                  src={pfpUrl || '/logo.png'}
                  alt={displayName || username || 'Profile'}
                  width={isMobile ? 48 : 40}
                  height={isMobile ? 48 : 40}
                  className="rounded-full object-cover"
                />
                {profile?.neynarScore && profile.neynarScore > 0.5 && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 theme-border-default bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                )}
              </>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            {profileLoading ? (
              <div className="space-y-2">
                <div className="h-4 theme-bg-subtle rounded animate-pulse w-24" />
                <div className="h-3 theme-bg-subtle rounded animate-pulse w-16" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold theme-text-primary truncate">
                    {displayName || username || `User ${fid}`}
                  </div>
                  {profile?.powerBadge && (
                    <div className="flex-shrink-0">
                      <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="text-xs theme-text-tertiary">
                    @{username || `fid:${fid}`}
                  </div>
                  {getAuthSourceBadge()}
                </div>
                {profile?.followerCount !== undefined && (
                  <div className="text-[10px] theme-text-tertiary mt-1">
                    {profile.followerCount.toLocaleString()} followers
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className={`${isMobile ? 'p-2 space-y-1' : 'py-2'}`}>
        <Link
          href={`/profile/${fid}`}
          className={`flex items-center gap-3 ${isMobile ? 'px-4 py-3 rounded-lg' : 'px-4 py-3'} theme-hover-bg-subtle transition-all`}
          onClick={onClose}
        >
          <Image 
            src="/assets/gmeow-icons/Profile Icon.svg" 
            alt="Profile" 
            width={20} 
            height={20} 
            className="opacity-70 flex-shrink-0" 
          />
          <span className="text-sm theme-text-primary">View Profile</span>
        </Link>
        
        <Link
          href="/app/badges"
          className={`flex items-center gap-3 ${isMobile ? 'px-4 py-3 rounded-lg' : 'px-4 py-3'} theme-hover-bg-subtle transition-all`}
          onClick={onClose}
        >
          <Image 
            src="/assets/gmeow-icons/Badges Icon.svg" 
            alt="Badges" 
            width={20} 
            height={20} 
            className="opacity-70 flex-shrink-0" 
          />
          <span className="text-sm theme-text-primary">My Badges</span>
        </Link>
        
        <Link
          href="/app/settings"
          className={`flex items-center gap-3 ${isMobile ? 'px-4 py-3 rounded-lg' : 'px-4 py-3'} theme-hover-bg-subtle transition-all`}
          onClick={onClose}
        >
          <Image 
            src="/assets/gmeow-icons/Settings Icon.svg" 
            alt="Settings" 
            width={20} 
            height={20} 
            className="opacity-70 flex-shrink-0" 
          />
          <span className="text-sm theme-text-primary">Settings</span>
        </Link>
        
        {/* Wallet Connection Section */}
        <div className={`border-t theme-border-subtle ${isMobile ? 'mt-2 pt-2' : 'mt-2 pt-2'}`}>
          <div className={`${isMobile ? 'px-4 py-2' : 'px-4 py-2'}`}>
            <div className="text-xs font-semibold theme-text-muted mb-2">WALLET</div>
            <WalletConnect />
          </div>
        </div>
        
        {/* Sign Out */}
        <div className={`border-t theme-border-subtle ${isMobile ? 'mt-2 pt-2' : 'mt-2 pt-2'}`}>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className={`flex items-center gap-3 ${isMobile ? 'px-4 py-3 rounded-lg' : 'px-4 py-3'} hover:bg-danger/10 w-full text-left transition-all disabled:opacity-50`}
          >
            <Image 
              src="/assets/gmeow-icons/Return Icon.svg" 
              alt="Sign out" 
              width={20} 
              height={20} 
              className="opacity-70 flex-shrink-0" 
            />
            <span className="text-sm text-danger">
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
