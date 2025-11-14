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
        await fireMiniappReady()
        if (mounted) {
          console.log('[MiniappReady] Successfully fired ready signal')
        }
      } catch (error) {
        console.warn('[MiniappReady] Error firing ready:', error)
        
        // Retry up to 5 times with exponential backoff
        if (mounted && attempts < 5) {
          const delay = Math.min(1000 * Math.pow(2, attempts), 5000)
          console.log(`[MiniappReady] Retrying in ${delay}ms... (attempt ${attempts + 1}/5)`)
          
          retryTimeout = setTimeout(() => {
            setAttempts(prev => prev + 1)
          }, delay)
        }
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