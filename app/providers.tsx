'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { useState } from 'react'

import { NotificationProvider } from '@/components/ui/live-notifications'
import { LayoutModeProvider } from '@/components/ui/layout-mode-context'
import { LiveEventBridge } from '@/components/ui/LiveEventBridge'
import { config } from '@/lib/wagmi'
import { MiniappReady } from '@/components/MiniappReady'

export function MiniAppProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <LayoutModeProvider>
          <MiniappReady />
          <NotificationProvider>
            <LiveEventBridge />
            {children}
          </NotificationProvider>
        </LayoutModeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}