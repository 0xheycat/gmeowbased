/**
 * App Layout
 * Wraps all app routes with UserProvider
 */

import { UserProvider } from '@/contexts/UserContext'
import type { ReactNode } from 'react'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <div className="page-bg-app-layout">
        {children}
      </div>
    </UserProvider>
  )
}
