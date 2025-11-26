'use client'

import { useEffect, useRef } from 'react'
import { fireMiniappReady } from '@/lib/miniappEnv'

export function MiniappReady() {
  const attemptsRef = useRef(0)
  const retryTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    let mounted = true

    const attemptReady = async () => {
      if (!mounted) return
      
      try {
        // Run immediately on first attempt for faster mobile loading
        const runReady = () => {
          if (!mounted) return
          
          console.log(`[MiniappReady] Attempt ${attemptsRef.current + 1} to fire miniapp ready`)
          
          fireMiniappReady()
            .then(() => {
              if (mounted) {
                console.log('[MiniappReady] ✅ Successfully fired miniapp ready')
                // Emit custom event for other components to listen
                window.dispatchEvent(new CustomEvent('miniapp:ready', { detail: { success: true } }))
              }
            })
            .catch((error) => {
              console.warn(`[MiniappReady] ❌ Attempt ${attemptsRef.current + 1} failed:`, error)
              
              // Retry up to 3 times with faster backoff for mobile
              if (mounted && attemptsRef.current < 3) {
                const delay = Math.min(500 * Math.pow(2, attemptsRef.current), 2000)
                console.log(`[MiniappReady] Retrying in ${delay}ms...`)
                
                retryTimeoutRef.current = setTimeout(() => {
                  attemptsRef.current += 1
                  attemptReady()
                }, delay)
              } else if (mounted) {
                console.warn('[MiniappReady] All retries exhausted, emitting failure event')
                // Emit failure event after all retries exhausted
                window.dispatchEvent(new CustomEvent('miniapp:ready', { detail: { success: false, error } }))
              }
            })
        }

        // On first attempt, run immediately for faster loading
        if (attemptsRef.current === 0) {
          runReady()
        } else if ('requestIdleCallback' in window) {
          requestIdleCallback(runReady, { timeout: 500 })
        } else {
          setTimeout(runReady, 100)
        }
      } catch (error) {
        console.warn('[MiniappReady] Unexpected error:', error)
        // Even on unexpected error, proceed with the app
        if (mounted) {
          window.dispatchEvent(new CustomEvent('miniapp:ready', { detail: { success: false, error } }))
        }
      }
    }

    // Initial attempt
    attemptReady()

    // Re-fire when app regains focus/visibility (miniapp can re-show splash)
    const onVis = () => {
      if (document.visibilityState === 'visible' && mounted) {
        attemptsRef.current = 0 // Reset attempts on visibility change
        attemptReady()
      }
    }
    
    const onFocus = () => {
      if (mounted) {
        attemptsRef.current = 0 // Reset attempts on focus
        attemptReady()
      }
    }

    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onFocus)

    return () => {
      mounted = false
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onFocus)
    }
  }, []) // Empty deps - only run once on mount

  // Don't render anything visible
  return null
}