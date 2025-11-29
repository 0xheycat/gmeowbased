import { useState, useEffect, useCallback, useMemo } from 'react'
import { fetchUserByFid, type FarcasterUser } from '@/lib/neynar'

/**
 * Auth sources in priority order:
 * 1. MiniKit SDK - Most trusted (cryptographic signature)
 * 2. Frame headers - Trusted by Farcaster (x-farcaster-fid)
 * 3. Session JWT - User session (persistent auth)
 * 4. Query params - Legacy fallback (least trusted)
 */
export type AuthSource = 'minikit' | 'frame' | 'session' | 'query' | null

export interface UnifiedAuthState {
  // Identity
  fid: number | null
  username: string | null
  address: `0x${string}` | null
  displayName: string | null
  pfpUrl: string | null

  // Auth state
  isAuthenticated: boolean
  authSource: AuthSource
  
  // Profile
  profile: FarcasterUser | null
  profileLoading: boolean
  
  // Methods
  signIn: () => Promise<boolean>
  signOut: () => void
  refreshProfile: () => Promise<void>
  hasPermission: (targetFid: number) => boolean
}

interface UseUnifiedFarcasterAuthOptions {
  // MiniKit integration (optional)
  miniKitEnabled?: boolean
  miniKitContext?: any
  isFrameReady?: boolean
  isMiniAppSession?: boolean
  signInWithMiniKit?: () => Promise<any>
  
  // Auto sign-in behavior
  autoSignIn?: boolean
  
  // Frame context (optional)
  frameContext?: {
    fid?: number | string
  }
  
  // Query params (optional)
  queryFid?: number | string
}

/**
 * Unified Farcaster authentication hook
 * 
 * Combines multiple auth sources with priority order:
 * 1. MiniKit SDK (if enabled and available)
 * 2. Frame headers (x-farcaster-fid)
 * 3. User session JWT
 * 4. Query parameters (legacy)
 * 
 * @param options - Configuration options
 * @returns Unified auth state and methods
 */
export function useUnifiedFarcasterAuth(
  options: UseUnifiedFarcasterAuthOptions = {}
): UnifiedAuthState {
  const {
    miniKitEnabled = false,
    miniKitContext = null,
    isFrameReady = false,
    isMiniAppSession = false,
    signInWithMiniKit,
    autoSignIn = true,
    frameContext,
    queryFid,
  } = options

  // State
  const [miniKitResult, setMiniKitResult] = useState<any>(null)
  const [sessionData, setSessionData] = useState<{
    fid: number
    username?: string
    address?: `0x${string}`
  } | null>(null)
  const [profile, setProfile] = useState<FarcasterUser | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [authPending, setAuthPending] = useState(false)

  // Parse FID from various sources
  const parseFid = (value: number | string | undefined | null): number | null => {
    if (value == null) return null
    const fid = typeof value === 'string' ? Number(value) : value
    return Number.isFinite(fid) && fid > 0 ? fid : null
  }

  // Extract FID from MiniKit result
  const miniKitFid = useMemo(() => {
    if (!miniKitResult) return null
    
    // Try to parse from message
    try {
      const msg = miniKitResult.message || miniKitResult
      if (typeof msg === 'string') {
        const fidMatch = msg.match(/fid:\s*(\d+)/i)
        if (fidMatch) return parseFid(fidMatch[1])
      }
    } catch {
      // Ignore parse errors
    }
    
    // Try context user
    if (miniKitContext?.user?.fid) {
      return parseFid(miniKitContext.user.fid)
    }
    
    return null
  }, [miniKitResult, miniKitContext])

  // Extract FID from frame context
  const frameFid = useMemo(() => {
    return frameContext?.fid ? parseFid(frameContext.fid) : null
  }, [frameContext])

  // Extract FID from query params
  const queryParsedFid = useMemo(() => {
    return queryFid ? parseFid(queryFid) : null
  }, [queryFid])

  // Resolve FID with priority order
  const resolvedFid = useMemo(() => {
    if (miniKitFid) return miniKitFid // Priority 1: MiniKit
    if (frameFid) return frameFid // Priority 2: Frame
    if (sessionData?.fid) return sessionData.fid // Priority 3: Session
    if (queryParsedFid) return queryParsedFid // Priority 4: Query
    return null
  }, [miniKitFid, frameFid, sessionData, queryParsedFid])

  // Determine auth source
  const authSource = useMemo((): AuthSource => {
    if (miniKitFid) return 'minikit'
    if (frameFid) return 'frame'
    if (sessionData?.fid) return 'session'
    if (queryParsedFid) return 'query'
    return null
  }, [miniKitFid, frameFid, sessionData, queryParsedFid])

  // Check if authenticated
  const isAuthenticated = resolvedFid !== null

  // Load user session from server on mount
  useEffect(() => {
    let cancelled = false
    
    const loadSession = async () => {
      try {
        const response = await fetch('/api/auth/session')
        if (!cancelled && response.ok) {
          const data = await response.json()
          if (data.authenticated && data.fid) {
            setSessionData({
              fid: data.fid,
              username: data.username,
              address: data.address,
            })
          }
        }
      } catch (error) {
        console.warn('Failed to load user session:', error)
      }
    }
    
    void loadSession()
    
    return () => {
      cancelled = true
    }
  }, [])

  // Load Neynar profile when FID changes
  useEffect(() => {
    if (!resolvedFid) {
      setProfile(null)
      setProfileLoading(false)
      return
    }

    let cancelled = false
    setProfileLoading(true)

    const loadProfile = async () => {
      try {
        const result = await fetchUserByFid(resolvedFid)
        if (!cancelled) {
          setProfile(result)
          setProfileLoading(false)
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('Failed to fetch Neynar profile:', error)
          setProfile(null)
          setProfileLoading(false)
        }
      }
    }

    void loadProfile()

    return () => {
      cancelled = true
    }
  }, [resolvedFid])

  // Sign in with MiniKit (if available)
  const signIn = useCallback(async (): Promise<boolean> => {
    if (!miniKitEnabled || !signInWithMiniKit) {
      console.warn('MiniKit sign-in not available')
      return false
    }

    try {
      setAuthPending(true)
      const result = await signInWithMiniKit()
      
      if (!result) {
        setAuthPending(false)
        return false
      }

      setMiniKitResult(result)
      
      // Create user session on server
      const fid = parseFid(result.fid || miniKitContext?.user?.fid)
      if (fid) {
        try {
          await fetch('/api/auth/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fid,
              username: miniKitContext?.user?.username,
              address: result.address,
            }),
          })
        } catch (error) {
          console.warn('Failed to create session:', error)
        }
      }
      
      setAuthPending(false)
      return true
    } catch (error) {
      console.error('MiniKit sign-in failed:', error)
      setAuthPending(false)
      return false
    }
  }, [miniKitEnabled, signInWithMiniKit, miniKitContext])

  // Sign out (clear session)
  const signOut = useCallback(() => {
    setMiniKitResult(null)
    setSessionData(null)
    setProfile(null)
    
    // Clear server session
    fetch('/api/auth/signout', { method: 'POST' }).catch((error) => {
      console.warn('Failed to clear session:', error)
    })
  }, [])

  // Refresh profile from Neynar
  const refreshProfile = useCallback(async () => {
    if (!resolvedFid) return
    
    setProfileLoading(true)
    try {
      const result = await fetchUserByFid(resolvedFid)
      setProfile(result)
    } catch (error) {
      console.warn('Failed to refresh profile:', error)
    } finally {
      setProfileLoading(false)
    }
  }, [resolvedFid])

  // Check if user has permission to access target FID's data
  const hasPermission = useCallback(
    (targetFid: number): boolean => {
      if (!isAuthenticated || !resolvedFid) return false
      return resolvedFid === targetFid
    },
    [isAuthenticated, resolvedFid]
  )

  // Auto sign-in with MiniKit when ready
  useEffect(() => {
    if (!autoSignIn) return
    if (!miniKitEnabled) return
    if (!isFrameReady) return
    if (!isMiniAppSession) return
    if (miniKitResult) return // Already signed in
    if (authPending) return // Sign-in in progress
    
    void signIn()
  }, [autoSignIn, miniKitEnabled, isFrameReady, isMiniAppSession, miniKitResult, authPending, signIn])

  return {
    // Identity
    fid: resolvedFid,
    username: profile?.username ?? sessionData?.username ?? null,
    address: profile?.walletAddress ?? sessionData?.address ?? null,
    displayName: profile?.displayName ?? null,
    pfpUrl: profile?.pfpUrl ?? null,

    // Auth state
    isAuthenticated,
    authSource,

    // Profile
    profile,
    profileLoading,

    // Methods
    signIn,
    signOut,
    refreshProfile,
    hasPermission,
  }
}
