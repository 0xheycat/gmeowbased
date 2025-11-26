'use client'

import { useEffect, useRef } from 'react'
import { fireMiniappReady } from '@/lib/miniappEnv'

export function MiniappReady() {
  const firedRef = useRef(false)

  useEffect(() => {
    let mounted = true

    const attemptReady = async () => {
      if (!mounted || firedRef.current) return
      
      console.log('[MiniappReady] 🚀 Starting miniapp initialization...')
      
      try {
        // Always fire the ready function (it handles errors internally)
        await fireMiniappReady()
        
        if (mounted) {
          console.log('[MiniappReady] ✅ Miniapp initialization complete')
          firedRef.current = true
          // ALWAYS emit success - app should work regardless of SDK state
          window.dispatchEvent(new CustomEvent('miniapp:ready', { detail: { success: true } }))
        }
      } catch (error) {
        // This should never happen since fireMiniappReady catches everything
        console.error('[MiniappReady] ❌ Unexpected error (emitting success anyway):', error)
        if (mounted) {
          firedRef.current = true
          // Still emit success - don't block the app
          window.dispatchEvent(new CustomEvent('miniapp:ready', { detail: { success: true, hadError: true } }))
        }
      }
    }

    const runReady = () => {
      if (!mounted) return

      // Run immediately for fastest loading
      attemptReady()
    }
    
    // Start initialization immediately
    runReady()

    return () => {
      mounted = false
    }
  }, []) // Empty deps - only run once on mount

  // Don't render anything visible
  return null
}