'use client'

import { useEffect, useRef } from 'react'
import { useAccount, useConnect } from 'wagmi'
import { probeMiniappReady, getMiniappContext } from '@/lib/miniapp/miniappEnv'

/**
 * Hook to handle Farcaster wallet auto-connect on miniapp
 * Attempts to connect using wagmi Farcaster connector if available,
 * or falls back to manual connection by triggering the connector
 */
export function useFarcasterWalletConnect() {
  const { isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const attemptedRef = useRef(false)

  useEffect(() => {
    if (attemptedRef.current) return
    if (isConnected) return

    ;(async () => {
      try {
        // Check if miniapp is ready
        const miniappReady = await probeMiniappReady()
        if (!miniappReady) {
          console.log('[useFarcasterWalletConnect] Miniapp not ready, skipping')
          return
        }

        console.log('[useFarcasterWalletConnect] Miniapp detected, checking for Farcaster connector')

        // Find Farcaster connector
        const farcasterConnector = connectors.find(
          (c: any) =>
            c?.id?.toString?.().toLowerCase().includes('farcaster') ||
            c?.name?.toLowerCase?.().includes('farcaster'),
        )

        if (farcasterConnector) {
          console.log('[useFarcasterWalletConnect] Found Farcaster connector:', farcasterConnector.name)
          attemptedRef.current = true

          // Try to connect
          try {
            connect({ connector: farcasterConnector })
            console.log('[useFarcasterWalletConnect] Initiated Farcaster connection')
          } catch (err) {
            console.error('[useFarcasterWalletConnect] Connection failed:', err)
          }
        } else {
          console.warn('[useFarcasterWalletConnect] No Farcaster connector found')
          
          // Even if wagmi connector not available, get context to show as connected
          const context = await getMiniappContext()
          if (context) {
            const contextAny = context as any
            if (contextAny.user) {
              console.log('[useFarcasterWalletConnect] User detected in SDK context (FID:', contextAny.user?.fid, ')')
              console.log('[useFarcasterWalletConnect] SDK connection established (user context available)')
              attemptedRef.current = true
            }
          }
        }
      } catch (err) {
        console.error('[useFarcasterWalletConnect] Error:', err)
      }
    })()
  }, [isConnected, connectors, connect])
}
