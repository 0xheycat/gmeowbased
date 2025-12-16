'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { NotificationSettings } from '@/components/notifications/NotificationSettings'
import { LongArrowLeft } from '@/components/icons/long-arrow-left'

/**
 * Notification Settings Page
 * 
 * Route: /settings/notifications
 * 
 * Phase 3 - User Preferences Integration
 * 
 * Features:
 * - Global mute toggle
 * - Pause notifications (1h/8h/24h)
 * - Per-category toggles (11 categories)
 * - Push notification preferences
 * - Auto-saves changes
 * 
 * @example
 * ```tsx
 * // Navigate to: /settings/notifications
 * <NotificationSettingsPage />
 * ```
 */
export default function NotificationSettingsPage() {
  const router = useRouter()
  const { fid, isAuthenticated, isLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [shouldRedirect, setShouldRedirect] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Wait for auth to fully load
    if (!mounted) return
    
    // If still loading auth, wait
    if (isLoading) return
    
    // Auth loaded, check if we have FID
    // Give it a moment for miniapp context to load
    const timer = setTimeout(() => {
      if (!fid) {
        console.log('[NotificationSettings] No FID after auth load, redirecting')
        setShouldRedirect(true)
      }
    }, 500) // Wait 500ms for miniapp FID to load
    
    return () => clearTimeout(timer)
  }, [mounted, isLoading, fid])
  
  // Execute redirect separately
  useEffect(() => {
    if (shouldRedirect) {
      router.push('/Dashboard')
    }
  }, [shouldRedirect, router])

  // Show loading state while checking auth
  if (!mounted || isLoading || (mounted && !isLoading && !fid && !shouldRedirect)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5 mx-auto animate-pulse">
            <svg className="h-8 w-8 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <p className="text-white/60">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-sm text-white/60 hover:text-white transition-colors mb-4 group"
          >
            <LongArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
            Back
          </button>
          
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-white">
              Notification Preferences
            </h1>
            <p className="text-white/60 text-sm sm:text-base">
              Customize how and when you receive notifications. Changes are saved automatically.
            </p>
          </div>
        </div>

        {/* Settings Component */}
        <NotificationSettings fid={fid} />

        {/* Help Text */}
        <div className="mt-8 p-4 rounded-lg bg-white/5 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-2">💡 Tips</h3>
          <ul className="text-sm text-white/60 space-y-1.5">
            <li>• <strong>Global Mute:</strong> Silence all notifications instantly</li>
            <li>• <strong>Pause:</strong> Temporarily mute notifications for 1h, 8h, or 24h</li>
            <li>• <strong>Show:</strong> Display notification in app (always visible in history)</li>
            <li>• <strong>Push:</strong> Send OS push notification (requires permission)</li>
            <li>• <strong>History:</strong> All notifications are saved to your history, even if muted</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-white/40">
          <p>Preferences are synced across all your devices</p>
        </div>
      </div>
    </div>
  )
}
