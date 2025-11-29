/**
 * useMiniapp Hook - Gmeowbased
 * 
 * Client-side hook for detecting miniapp context
 * Returns miniapp state and helper functions
 * 
 * Template Compliance: N/A (Logic only)
 */

'use client'

import { useState, useEffect } from 'react'
import { 
  isEmbedded, 
  isAllowedReferrer, 
  getMiniappContext,
  probeMiniappReady,
  safeComposeCast
} from '@/lib/miniapp-detection'

interface MiniappState {
  isEmbedded: boolean
  isAllowed: boolean
  isReady: boolean
  context: any | null
  isFarcaster: boolean
  isBase: boolean
}

export function useMiniapp() {
  const [state, setState] = useState<MiniappState>({
    isEmbedded: false,
    isAllowed: false,
    isReady: false,
    context: null,
    isFarcaster: false,
    isBase: false
  })

  useEffect(() => {
    let mounted = true

    const checkMiniapp = async () => {
      const embedded = isEmbedded()
      const allowed = isAllowedReferrer()
      const ready = await probeMiniappReady(1500)
      const context = allowed ? await getMiniappContext() : null

      if (mounted) {
        setState({
          isEmbedded: embedded,
          isAllowed: allowed,
          isReady: ready,
          context,
          isFarcaster: allowed && !!context,
          isBase: embedded && allowed && !context // Base miniapp doesn't provide context
        })
      }
    }

    // Check immediately
    checkMiniapp()

    // Listen for miniapp ready event
    const handleReady = () => {
      if (mounted) {
        checkMiniapp()
      }
    }

    window.addEventListener('miniapp:ready', handleReady)

    return () => {
      mounted = false
      window.removeEventListener('miniapp:ready', handleReady)
    }
  }, [])

  return {
    ...state,
    isMiniapp: state.isEmbedded && state.isAllowed,
    composeCast: safeComposeCast,
  }
}
