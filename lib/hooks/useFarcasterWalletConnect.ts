'use client'

import { useEffect, useRef } from 'react'
import { useAccount, useConnect } from 'wagmi'
import { probeMiniappReady, getMiniappContext } from '@/lib/miniapp/miniappEnv'

/**
 * Hook to handle Farcaster wallet auto-connect on miniapp
 * Attempts to connect using wagmi Farcaster connector if available,
 * or triggers connection via SDK signing
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
            console.log('[useFarcasterWalletConnect] Initiated Farcaster connector connection')
          } catch (err) {
            console.error('[useFarcasterWalletConnect] Connector connection failed:', err)
          }
        } else {
          console.warn('[useFarcasterWalletConnect] No Farcaster connector in list, trying SDK direct connection')
          
          // Try to dynamically import and instantiate the miniAppConnector
          try {
            console.log('[useFarcasterWalletConnect] Attempting dynamic import of farcasterMiniApp...')
            const farcasterModule = await import('@farcaster/miniapp-wagmi-connector')
            const farcasterMiniApp = farcasterModule.default || farcasterModule.farcasterMiniApp
            
            if (!farcasterMiniApp) {
              throw new Error('farcasterMiniApp not found in module')
            }
            
            // Create a new instance
            const directFarcasterConnector = farcasterMiniApp()
            console.log('[useFarcasterWalletConnect] ✅ Created farcasterMiniApp instance directly')
            
            // Try to connect with the directly created connector
            if (directFarcasterConnector) {
              attemptedRef.current = true
              connect({ connector: directFarcasterConnector })
              console.log('[useFarcasterWalletConnect] Initiated connection with direct connector')
              return
            }
          } catch (importErr) {
            console.log('[useFarcasterWalletConnect] Dynamic import of farcasterMiniApp failed (expected in some cases):', importErr)
          }
          
          // Fallback: Try to get context and trigger connection via SDK
          const context = await getMiniappContext()
          if (!context) {
            console.error('[useFarcasterWalletConnect] No SDK context available')
            attemptedRef.current = true
            return
          }

          const contextAny = context as any
          console.log('[useFarcasterWalletConnect] SDK context available:', {
            fid: contextAny.user?.fid,
            hasAccount: !!contextAny.account,
            accountKeys: contextAny.account ? Object.keys(contextAny.account) : [],
          })

          // Try to trigger a signing action which should initialize the connector
          try {
            const { sdk } = await import('@farcaster/miniapp-sdk')
            
            console.log('[useFarcasterWalletConnect] Attempting to initialize via SDK actions...')
            
            // Check what actions are available
            const availableActions = sdk.actions ? Object.keys(sdk.actions) : []
            console.log('[useFarcasterWalletConnect] Available SDK actions:', availableActions)

            // After SDK check, retry finding connector
            console.log('[useFarcasterWalletConnect] Retrying connector search after SDK check...')
            const updatedConnectors = connectors
            const retryFarcaster = updatedConnectors.find(
              (c: any) =>
                c?.id?.toString?.().toLowerCase().includes('farcaster') ||
                c?.name?.toLowerCase?.().includes('farcaster'),
            )

            if (retryFarcaster) {
              console.log('[useFarcasterWalletConnect] Found Farcaster connector after SDK check, connecting...')
              attemptedRef.current = true
              connect({ connector: retryFarcaster })
            } else {
              console.error('[useFarcasterWalletConnect] Still no Farcaster connector after SDK check')
              console.log('[useFarcasterWalletConnect] Available connectors:', connectors.map((c: any) => c.name))
              attemptedRef.current = true
            }
          } catch (sdkErr) {
            console.error('[useFarcasterWalletConnect] SDK check failed:', sdkErr)
            attemptedRef.current = true
          }
        }
      } catch (err) {
        console.error('[useFarcasterWalletConnect] Unexpected error:', err)
        attemptedRef.current = true
      }
    })()
  }, [isConnected, connectors, connect])
}
