'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { useState, useEffect } from 'react'
import { OnchainKitProvider } from '@coinbase/onchainkit'
import { base } from 'viem/chains'

import { NotificationProvider } from '@/components/ui/live-notifications'
import { LayoutModeProvider } from '@/components/ui/layout-mode-context'
import { LiveEventBridge } from '@/components/ui/LiveEventBridge'
import { config as wagmiConfig } from '@/lib/wagmi'
import { MiniappReady } from '@/components/MiniappReady'
import { initWebVitals } from '@/lib/web-vitals'
import { initPerformanceMonitoring } from '@/lib/performance-monitor'
import { getMiniappContext } from '@/lib/miniappEnv'

export function MiniAppProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  // Initialize performance monitoring
  useEffect(() => {
    initWebVitals()
    initPerformanceMonitoring()
  }, [])

  // Load miniapp context on mount (for logging/debugging)
  useEffect(() => {
    let mounted = true

    const loadContext = async () => {
      try {
        console.log('[MiniAppProvider] Loading miniapp context...')
        const context = await getMiniappContext()
        
        if (mounted) {
          if (context) {
            console.log('[MiniAppProvider] ✅ Miniapp context loaded:', {
              fid: context.user?.fid,
              username: context.user?.username,
            })
          } else {
            console.log('[MiniAppProvider] ⚠️ Not in miniapp context')
          }
        }
      } catch (error) {
        console.error('[MiniAppProvider] ❌ Error loading context:', error)
      }
    }

    loadContext()

    return () => {
      mounted = false
    }
  }, [])

  // OnchainKit config with miniapp support
  const apiKey = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          chain={base}
          apiKey={apiKey}
          config={{
            appearance: {
              mode: 'dark',
              theme: 'base',
            },
          }}
          miniKit={{
            enabled: true,
            autoConnect: true,
          }}
        >
          <LayoutModeProvider>
            <MiniappReady />
            <NotificationProvider>
              <LiveEventBridge />
              {children}
            </NotificationProvider>
          </LayoutModeProvider>
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}