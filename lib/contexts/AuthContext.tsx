'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { useAccount } from 'wagmi'
import { fetchUserByFid, fetchUserByAddress, type FarcasterUser } from '@/lib/integrations/neynar-client'
import { getMiniappContext } from '@/lib/miniapp/miniappEnv'

// DO NOT import server-side Supabase functions - use API routes instead
// import { getAllWalletsForFID, syncWalletsFromNeynar } from '@/lib/integrations/neynar-wallet-sync'

/**
 * Unified Authentication Context
 * 
 * Combines Farcaster miniapp auth + wallet auth into single source of truth.
 * Based on Coinbase MCP best practices (Dec 2025).
 * 
 * Priority order:
 * 1. Farcaster miniapp context (if in Warpcast/base.dev)
 * 2. Wallet address (main app)
 * 3. Not authenticated
 * 
 * @see https://docs.cdp.coinbase.com/x402/miniapps - Miniapp SDK patterns
 * @see https://docs.cdp.coinbase.com/embedded-wallets/best-practices - State management
 */
export interface AuthContextType {
  // User identity
  fid: number | null
  address: `0x${string}` | undefined
  profile: FarcasterUser | null
  
  // Multi-wallet cache (3-layer hybrid system)
  cachedWallets: string[]
  
  // Auth state
  isAuthenticated: boolean
  authMethod: 'miniapp' | 'wallet' | null
  
  // Miniapp context
  miniappContext: any | null
  isMiniappSession: boolean
  
  // Actions
  authenticate: () => Promise<void>
  logout: () => void
  
  // Loading states
  isLoading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export { AuthContext }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [fid, setFid] = useState<number | null>(null)
  const [profile, setProfile] = useState<FarcasterUser | null>(null)
  const [miniappContext, setMiniappContext] = useState<any>(null)
  const [isMiniappSession, setIsMiniappSession] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cachedWallets, setCachedWallets] = useState<string[]>([])
  
  // Wagmi wallet state
  const { address, isConnected } = useAccount()
  
  // Debug: Log wallet state changes
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log('[AuthContext] Wallet state:', { 
        connected: isConnected, 
        address,
        fid
      })
    }
  }, [isConnected, address, fid])
  
  /**
   * Detect if we're in a miniapp context
   * Based on MCP best practice: Check referrer + iframe
   */
  const checkMiniappContext = useCallback(async () => {
    try {
      // Check if embedded in iframe
      if (typeof window === 'undefined' || window.self === window.top) {
        return false
      }
      
      // Check if referrer is allowed (Warpcast or base.dev)
      const referrer = document.referrer
      if (!referrer) return false
      
      const hostname = new URL(referrer).hostname
      const isAllowed = 
        hostname.endsWith('.farcaster.xyz') ||
        hostname.endsWith('.warpcast.com') ||
        hostname.endsWith('.base.dev') ||
        hostname === 'farcaster.xyz' ||
        hostname === 'warpcast.com' ||
        hostname === 'base.dev'
      
      if (!isAllowed) return false
      
      // Try to load Farcaster miniapp SDK
      const { sdk } = await import('@farcaster/miniapp-sdk')
      
      // MCP best practice: Always call ready() first
      await sdk.actions.ready()
      
      // Get context with 10s timeout (MCP recommendation for mobile)
      const contextPromise = sdk.context
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Context timeout after 10s')), 10000)
      )
      
      const context = await Promise.race([contextPromise, timeoutPromise])
      
      return context
    } catch (err) {
      console.warn('[AuthProvider] Miniapp context check failed:', err)
      return false
    }
  }, [])
  
  /**
   * Auto-authenticate on mount and when dependencies change
   * MCP best practice: Check auth state before starting flows
   * 
   * MULTI-WALLET CACHING:
   * When user connects wallet or miniapp context changes, this automatically:
   * 1. Syncs wallet data from Neynar API
   * 2. Caches all wallets (primary + custody + verified) in AuthContext
   * 3. Makes wallets available via cachedWallets or useWallets() hook
   * 
   * Used by 3-layer hybrid system:
   * - Real-time: Auto-sync on wallet connection (here)
   * - On-demand: Profile fetch triggers background sync
   * - Batch: Cron job syncs active users every 6 hours
   */
  useEffect(() => {
    authenticate()
  }, [address, isConnected])
  
  /**
   * Initialize miniapp context on mount
   */
  useEffect(() => {
    let mounted = true
    
    const initMiniapp = async () => {
      const context = await checkMiniappContext()
      
      if (mounted) {
        if (context) {
          setMiniappContext(context)
          setIsMiniappSession(true)
          console.log('[AuthProvider] ✅ Miniapp context loaded:', {
            fid: (context as any)?.user?.fid,
            username: (context as any)?.user?.username
          })
        } else {
          setIsMiniappSession(false)
          console.log('[AuthProvider] Not in miniapp context')
        }
      }
    }
    
    initMiniapp()
    
    return () => {
      mounted = false
    }
  }, [checkMiniappContext])
  
  /**
   * Main authentication flow
   * Priority: Miniapp FID > Wallet address > Not authenticated
   */
  const authenticate = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Priority 1: Farcaster miniapp context (if available)
      if (isMiniappSession && miniappContext?.user?.fid) {
        const contextFid = Number(miniappContext.user.fid)
        
        console.log('[AuthProvider] Authenticating via miniapp FID:', contextFid)
        
        setFid(contextFid)
        
        // Fetch full profile from Neynar
        const profileData = await fetchUserByFid(contextFid)
        setProfile(profileData)
        
        // Sync multi-wallet cache (3-layer hybrid system) via API
        // NEVER call Supabase directly from client - use API routes
        try {
          const syncResponse = await fetch('/api/user/wallets/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fid: contextFid }),
          })
          
          if (syncResponse.ok) {
            const syncResult = await syncResponse.json()
            if (syncResult.success && syncResult.data?.wallets) {
              setCachedWallets(syncResult.data.wallets)
              console.log('[AuthProvider] Cached', syncResult.data.wallets.length, 'wallets for FID', contextFid)
            }
          }
        } catch (err) {
          console.warn('[AuthProvider] Multi-wallet sync failed:', err)
        }
        
        setIsLoading(false)
        return
      }
      
      // Priority 2: Wallet address (main app)
      if (isConnected && address) {
        console.log('[AuthProvider] Authenticating via wallet address:', address)
        console.log('[AuthProvider] Wallet connection state:', { isConnected, address })
        
        // Fetch profile by wallet address
        const profileData = await fetchUserByAddress(address)
        
        console.log('[AuthProvider] Profile fetch result:', {
          success: !!profileData,
          fid: profileData?.fid,
          username: profileData?.username,
          displayName: profileData?.displayName,
        })
        
        if (profileData?.fid) {
          setFid(profileData.fid)
          setProfile(profileData)
          console.log('[AuthProvider] ✅ Successfully authenticated:', {
            fid: profileData.fid,
            username: profileData.username,
            address,
          })
          
          // Sync multi-wallet cache (3-layer hybrid system) via API
          // Pass connected wallet address to use as primary
          // NEVER call Supabase directly from client - use API routes
          try {
            const syncResponse = await fetch('/api/user/wallets/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                fid: profileData.fid, 
                connectedAddress: address,
              }),
            })
            
            if (syncResponse.ok) {
              const syncResult = await syncResponse.json()
              if (syncResult.success && syncResult.data?.wallets) {
                setCachedWallets(syncResult.data.wallets)
                console.log('[AuthProvider] Cached', syncResult.data.wallets.length, 'wallets for FID', profileData.fid)
              }
            }
          } catch (err) {
            console.warn('[AuthProvider] Multi-wallet sync failed:', err)
          }
        } else {
          // Wallet connected but no Farcaster profile found
          setFid(null)
          setProfile(null)
          console.warn('[AuthProvider] ⚠️ No Farcaster profile found for address:', address)
          console.warn('[AuthProvider] This wallet may not be linked to Farcaster')
        }
        
        setIsLoading(false)
        return
      }
      
      // Priority 3: Not authenticated
      console.log('[AuthProvider] No authentication method available')
      setFid(null)
      setProfile(null)
      setIsLoading(false)
    } catch (err) {
      console.error('[AuthProvider] Authentication failed:', err)
      setError(err instanceof Error ? err.message : 'Authentication failed')
      setFid(null)
      setProfile(null)
      setIsLoading(false)
    }
  }, [address, isConnected, miniappContext, isMiniappSession])
  
  /**
   * Clear all auth state
   * MCP best practice: Provide clear sign-out functionality
   */
  const logout = useCallback(() => {
    console.log('[AuthProvider] Logging out')
    setFid(null)
    setProfile(null)
    setError(null)
    setCachedWallets([])
    
    // Note: Don't clear miniappContext (it's read-only from SDK)
    // Wallet disconnect handled by Wagmi
  }, [])
    // Auto-trigger authenticate when wallet connects or miniapp context changes
  useEffect(() => {
    if ((isConnected && address) || (isMiniappSession && miniappContext)) {
      authenticate()
    }
  }, [address, isConnected, miniappContext, isMiniappSession, authenticate])
  const value: AuthContextType = {
    fid,
    address,
    profile,
    cachedWallets,
    isAuthenticated: !!fid, // Only authenticated if we have a FID
    authMethod: fid && isMiniappSession ? 'miniapp' : isConnected ? 'wallet' : null,
    miniappContext,
    isMiniappSession,
    authenticate,
    logout,
    isLoading,
    error,
  }
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook to access authentication context
 * 
 * @throws {Error} If used outside AuthProvider
 * 
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { fid, profile, isAuthenticated } = useAuthContext()
 *   
 *   if (!isAuthenticated) {
 *     return <ConnectWallet />
 *   }
 *   
 *   return <div>Welcome {profile?.displayName}!</div>
 * }
 * ```
 */
export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}

/**
 * Convenience hook to access cached wallet addresses
 * 
 * Returns all wallet addresses for authenticated user (primary + custody + verified).
 * Automatically synced from Neynar via 3-layer hybrid system.
 * 
 * @returns {string[]} Array of lowercase wallet addresses
 * 
 * @example
 * ```tsx
 * function ActivityFeed() {
 *   const wallets = useWallets()
 *   
 *   // Use cached wallets for Subsquid queries
 *   const activities = await Promise.all(
 *     wallets.map(wallet => getPointsTransactions(wallet))
 *   )
 *   
 *   return <ActivityList items={activities.flat()} />
 * }
 * ```
 */
export function useWallets(): string[] {
  const { cachedWallets } = useAuthContext()
  return cachedWallets
}
