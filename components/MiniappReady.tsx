'use client'

import { useEffect, useState } from 'react'
import { fireMiniappReady } from '@/lib/miniappEnv'

export function MiniappReady() {
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    let mounted = true
    let retryTimeout: NodeJS.Timeout

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
              if (mounted && attempts < 3) {
                const delay = Math.min(1000 * Math.pow(2, attempts), 4000)
                console.log(`[MiniappReady] Retrying in ${delay}ms... (attempt ${attempts + 1}/3)`)
                
                retryTimeout = setTimeout(() => {
                  setAttempts(prev => prev + 1)
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
        attemptReady()
      }
    }
    
    const onFocus = () => {
      if (mounted) {
        console.log('[MiniappReady] Window focused, re-firing ready')
        attemptReady()
      }
    }

    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onFocus)

    return () => {
      mounted = false
      clearTimeout(retryTimeout)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onFocus)
    }
  }, [attempts])

  // Don't render anything visible
  return null
}