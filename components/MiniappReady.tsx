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
              }
            })
            .catch((error) => {
              console.warn('[MiniappReady] Error firing ready:', error)
              
              // Retry up to 3 times with exponential backoff
              if (mounted && attemptsRef.current < 3) {
                const delay = Math.min(1000 * Math.pow(2, attemptsRef.current), 4000)
                console.log(`[MiniappReady] Retrying in ${delay}ms... (attempt ${attemptsRef.current + 1}/3)`)
                
                retryTimeoutRef.current = setTimeout(() => {
                  attemptsRef.current += 1
                  attemptReady()
                }, delay)
              }
            })
        }

        if ('requestIdleCallback' in window) {
          requestIdleCallback(runReady, { timeout: 500 })
        } else {
          // Fallback for browsers without requestIdleCallback
          setTimeout(runReady, 100)
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