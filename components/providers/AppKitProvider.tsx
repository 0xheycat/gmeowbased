'use client'

import { createAppKit } from '@reown/appkit/react'
import { appkitConfig } from '@/lib/integrations/appkit-config'

// Initialize AppKit modal
// This must be called once at the root of the app
createAppKit(appkitConfig)

export default function AppKitProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
