'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { useState, useEffect } from 'react'
import { OnchainKitProvider } from '@coinbase/onchainkit'
import { base } from 'viem/chains'

import { ThemeProvider } from '@/components/providers/ThemeProvider'
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
  const [miniappChecked, setMiniappChecked] = useState(false)

  // Initialize performance monitoring
  useEffect(() => {
    initWebVitals()
    initPerformanceMonitoring()
  }, [])

  // Listen for miniapp ready status
  useEffect(() => {
    let mounted = true
    
    const handleMiniappReady = (e: CustomEvent) => {
      if (mounted) {
        setMiniappChecked(true)
      }
    }
    
    window.addEventListener('miniapp:ready', handleMiniappReady as EventListener)
    
    // After 3 seconds, assume we're not in a miniapp context and proceed
    const fallbackTimer = setTimeout(() => {
      if (mounted) {
        setMiniappChecked(true)
      }
    }, 3000)
    
    return () => {
      mounted = false
      window.removeEventListener('miniapp:ready', handleMiniappReady as EventListener)
      clearTimeout(fallbackTimer)
    }
  }, [])

  // Load miniapp context on mount (for logging/debugging)
  useEffect(() => {
    let mounted = true

    const loadContext = async () => {
      try {
        const context = await getMiniappContext()
        
        if (mounted && !context) {
          // Not in miniapp context, silent failure
        }
      } catch (error) {
        console.error('[MiniAppProvider] Error loading context:', error)
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
    <ThemeProvider>
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
              {/* Show loading overlay if we're checking miniapp status */}
              {!miniappChecked && typeof window !== 'undefined' && window.self !== window.top && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#060720]/95 backdrop-blur-lg">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5/5 shadow-[0_24px_80px_rgba(12,13,54,0.45)]">
                      <div className="absolute inset-0 rounded-3xl border border-white dark:border-slate-700/10" />
                      <div className="h-12 w-12 animate-spin rounded-full border-4 border-white dark:border-slate-700/20 border-t-[#fdbb2d]" />
                    </div>
                    <div>
                      <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-950 dark:text-white">Connecting to Farcaster...</h1>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        Initializing miniapp environment
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <NotificationProvider>
                <LiveEventBridge />
                {children}
              </NotificationProvider>
            </LayoutModeProvider>
          </OnchainKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  )
}