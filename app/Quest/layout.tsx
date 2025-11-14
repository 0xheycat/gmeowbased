'use client'

import React from 'react'
import { NeynarContextProvider, Theme } from '@neynar/react'
import '@neynar/react/dist/style.css'
const clientId =
  process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID ||
  process.env.NEXT_PUBLIC_NEYNAR_GLOBAL_API ||
  ''

if (!clientId && typeof window !== 'undefined') {
  console.warn('⚠️ Missing NEXT_PUBLIC_NEYNAR_CLIENT_ID for Neynar context provider.')
}

export default function QuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <NeynarContextProvider
      key={clientId}
      settings={{
        clientId,
        defaultTheme: Theme.Dark,
        eventsCallbacks: {
          onAuthSuccess: () => {
            console.log('✅ Neynar auth success')
          },
          onSignout: () => {
            console.log('👋 Signed out of Neynar')
          },
        },
      }}
    >
      {children}
    </NeynarContextProvider>
  )
}
