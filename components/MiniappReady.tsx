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
        // Use requestIdleCallback to avoid blocking initial render
        const runReady = () => {
          if (!mounted) return
          fireMiniappReady()
            .then(() => {
              if (mounted) {
                console.log('[MiniappReady] Successfully fired ready signal')
                // Emit custom event for other components to listen
                window.dispatchEvent(new CustomEvent('miniapp:ready', { detail: { success: true } }))
              }
            })
            .catch((error) => {
              console.warn('[MiniappReady] Error firing ready:', error)
              
              // Retry up to 5 times with exponential backoff (increased for mobile)
              if (mounted && attemptsRef.current < 5) {
                const delay = Math.min(2000 * Math.pow(1.5, attemptsRef.current), 10000)
                console.log(`[MiniappReady] Retrying in ${delay}ms... (attempt ${attemptsRef.current + 1}/5)`)
                
                retryTimeoutRef.current = setTimeout(() => {
                  attemptsRef.current += 1
                  attemptReady()
                }, delay)
              } else if (mounted) {
                // Emit failure event after all retries exhausted
                window.dispatchEvent(new CustomEvent('miniapp:ready', { detail: { success: false, error } }))
              }
            })
        }

        if ('requestIdleCallback' in window) {
          requestIdleCallback(runReady, { timeout: 1000 })
        } else {
          // Fallback for browsers without requestIdleCallback
          setTimeout(runReady, 200)
        }
      } catch (error) {
        console.warn('[MiniappReady] Unexpected error:', error)
      }
    }

    // Initial attempt
    attemptReady()

    // Re-fire when app regains focus/visibility (miniapp can re-show splash)
    const onVis = () => {
      if (document.visibilityState === 'visible' && mounted) {
        console.log('[MiniappReady] Visibility changed, re-firing ready')
        attemptsRef.current = 0 // Reset attempts on visibility change
        attemptReady()
      }
    }
    
    const onFocus = () => {
      if (mounted) {
        console.log('[MiniappReady] Window focused, re-firing ready')
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