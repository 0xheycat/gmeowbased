/**
 * Farcaster Frame SDK Context - Official Implementation
 * 
 * Based on official Farcaster Frame SDK spec:
 * https://docs.farcaster.xyz/developers/frames/v2/spec
 * 
 * This provides the correct way to get user context in Farcaster frames.
 */

'use client'

import { useEffect, useState } from 'react'

export interface FrameContext {
  user?: {
    fid: number
    username?: string
    displayName?: string
    pfpUrl?: string
  }
}

/**
 * Hook to get Farcaster frame context using official SDK
 */
export function useFarcasterFrame() {
  const [context, setContext] = useState<FrameContext | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true

    async function initializeFrame() {
      try {
        // Dynamically import Farcaster miniapp SDK
        const { sdk } = await import('@farcaster/miniapp-sdk')
        
        // Wait for SDK to be ready
        await sdk.actions.ready()
        
        if (!mounted) return

        // Get context from SDK
        const frameContext = await sdk.context
        
        if (!mounted) return

        // Extract user data
        const user = frameContext?.user
        
        if (user) {
          setContext({
            user: {
              fid: user.fid,
              username: user.username,
              displayName: user.displayName,
              pfpUrl: user.pfpUrl,
            }
          })
        }
        
        setIsReady(true)
      } catch (err) {
        if (mounted) {
          console.error('[useFarcasterFrame] Initialization error:', err)
          setError(err instanceof Error ? err : new Error('Unknown error'))
          setIsReady(false)
        }
      }
    }

    initializeFrame()

    return () => {
      mounted = false
    }
  }, [])

  return {
    context,
    isReady,
    error,
    fid: context?.user?.fid || null,
    username: context?.user?.username || null,
    displayName: context?.user?.displayName || null,
    pfpUrl: context?.user?.pfpUrl || null,
  }
}
