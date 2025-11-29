'use client'

import type { ReactNode } from 'react'
import { AppNavigation } from '@/components/navigation/AppNavigation'

interface AppLayoutProps {
  children: ReactNode
  /**
   * Set fullPage to true for standalone pages that manage their own background
   * (e.g., leaderboard, guilds pages with custom gradients)
   */
  fullPage?: boolean
}

/**
 * AppLayout - Consistent layout wrapper for all /app routes
 * 
 * Based on Tailwick v2.0 layout structure:
 * - Desktop: Sidebar (left) + Content (right with margin)
 * - Mobile: Top bar + Content + Bottom nav
 * 
 * Provides:
 * - Navigation (desktop sidebar, mobile top/bottom)
 * - Consistent spacing for navigation
 * - Default gradient background (can be overridden with fullPage prop)
 * - Proper min-height for full-screen experience
 */
export function AppLayout({ children, fullPage = false }: AppLayoutProps) {
  return (
    <div className={fullPage ? "min-h-screen" : "min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950"}>
      <AppNavigation />
      
      {/* Main content area with proper spacing for navigation */}
      <div className="lg:ml-64">
        {/* Mobile top nav spacer */}
        <div className="lg:hidden h-14" />
        
        {/* Page content */}
        <main className="min-h-screen pb-24 lg:pb-8">
          {children}
        </main>
      </div>
    </div>
  )
}
