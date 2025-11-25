'use client'

import React from 'react'
import { NeynarContextProvider, Theme } from '@neynar/react'
import '@neynar/react/dist/style.css'
const clientId =
  process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID ||
  process.env.NEXT_PUBLIC_NEYNAR_GLOBAL_API ||
  ''

if (!clientId && typeof window !== 'undefined') {
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
            // Auth successful
          },
          onSignout: () => {
            // Signed out
          },
        },
      }}
    >
      {children}
    </NeynarContextProvider>
  )
}
