'use client'

import { useState, useCallback } from 'react'
import { Card, CardBody, CardHeader, Button } from 'components(old)/ui/tailwick-primitives'
import { useUnifiedFarcasterAuth, type AuthSource } from '@/hooks/useUnifiedFarcasterAuth'

interface FarcasterSignInProps {
  // MiniKit integration (optional)
  miniKitEnabled?: boolean
  miniKitContext?: any
  isFrameReady?: boolean
  isMiniAppSession?: boolean
  signInWithMiniKit?: () => Promise<any>
  
  // UI customization
  title?: string
  description?: string
  className?: string
  showProfile?: boolean
  autoSignIn?: boolean
  
  // Callbacks
  onSignIn?: (fid: number) => void
  onSignOut?: () => void
}

/**
 * Farcaster Sign-In Component
 * 
 * NEW UI: Tailwick v2.0 Card + Button components
 * OLD LOGIC: Reused unified auth hook with priority ordering
 * 
 * Features:
 * - MiniKit SDK integration (if enabled)
 * - Frame header auth (automatic)
 * - Session JWT auth (persistent)
 * - Query parameter fallback (legacy)
 * - Neynar profile loading
 * - "Remember me" option
 * 
 * @param props - Component props
 */
export function FarcasterSignIn({
  miniKitEnabled = false,
  miniKitContext,
  isFrameReady = false,
  isMiniAppSession = false,
  signInWithMiniKit,
  title = 'Sign in with Farcaster',
  description = 'Connect your Farcaster account to access Gmeowbased features',
  className = '',
  showProfile = true,
  autoSignIn = true,
  onSignIn,
  onSignOut,
}: FarcasterSignInProps) {
  const [rememberMe, setRememberMe] = useState(false)
  const [signingIn, setSigningIn] = useState(false)

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
    miniKitEnabled,
    miniKitContext,
    isFrameReady,
    isMiniAppSession,
    signInWithMiniKit,
    autoSignIn,
  })

  const handleSignIn = useCallback(async () => {
    if (!miniKitEnabled || !signInWithMiniKit) {
      console.warn('MiniKit sign-in not available')
      return
    }

    setSigningIn(true)
    try {
      const success = await signIn()
      if (success && fid) {
        onSignIn?.(fid)
      }
    } finally {
      setSigningIn(false)
    }
  }, [miniKitEnabled, signInWithMiniKit, signIn, fid, onSignIn])

  const handleSignOut = useCallback(() => {
    signOut()
    onSignOut?.()
  }, [signOut, onSignOut])

  const getAuthSourceLabel = (source: AuthSource): string => {
    switch (source) {
      case 'minikit':
        return 'MiniKit'
      case 'frame':
        return 'Frame'
      case 'session':
        return 'Session'
      case 'query':
        return 'Query'
      default:
        return 'Unknown'
    }
  }

  // Already authenticated - show profile card
  if (isAuthenticated && fid) {
    return (
      <Card className={className} border>
        {showProfile && (
          <>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="theme-text-primary text-lg font-semibold">
                  Connected Account
                </h3>
                <span className="text-xs theme-text-tertiary px-2 py-1 rounded-md theme-bg-subtle">
                  {getAuthSourceLabel(authSource)}
                </span>
              </div>
            </CardHeader>
            
            <CardBody>
              {profileLoading ? (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full theme-bg-subtle animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 theme-bg-subtle rounded animate-pulse w-32" />
                    <div className="h-3 theme-bg-subtle rounded animate-pulse w-24" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {pfpUrl && (
                    <img
                      src={pfpUrl}
                      alt={displayName || username || `FID ${fid}`}
                      className="w-12 h-12 rounded-full object-cover theme-border-default border-2"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="theme-text-primary font-semibold truncate">
                      {displayName || username || `User ${fid}`}
                    </p>
                    <p className="theme-text-secondary text-sm">
                      @{username || `fid:${fid}`}
                    </p>
                    {profile?.followerCount !== undefined && (
                      <p className="theme-text-tertiary text-xs mt-1">
                        {profile.followerCount.toLocaleString()} followers
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSignOut}
                className="mt-4 w-full"
              >
                Sign Out
              </Button>
            </CardBody>
          </>
        )}
      </Card>
    )
  }

  // Not authenticated - show sign-in card
  return (
    <Card className={className} border>
      <CardHeader>
        <h3 className="theme-text-primary text-lg font-semibold">{title}</h3>
        {description && (
          <p className="theme-text-secondary text-sm mt-1">{description}</p>
        )}
      </CardHeader>
      
      <CardBody>
        <div className="space-y-4">
          {miniKitEnabled && signInWithMiniKit ? (
            <>
              <Button
                variant="primary"
                size="lg"
                onClick={handleSignIn}
                disabled={signingIn}
                className="w-full"
              >
                {signingIn ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                    </svg>
                    Sign in with Farcaster
                  </>
                )}
              </Button>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 theme-border-default rounded focus:ring-2 focus:ring-offset-2 focus:theme-ring-primary"
                />
                <span className="theme-text-secondary text-sm">
                  Remember me for 90 days
                </span>
              </label>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="theme-text-tertiary text-sm">
                Sign-in not available. Please open in a Farcaster frame or miniapp.
              </p>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
