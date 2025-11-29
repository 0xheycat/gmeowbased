/**
 * MiniappReady Component - Gmeowbased
 * 
 * Fires miniapp ready event on mount
 * Initializes Farcaster SDK for miniapp context
 * 
 * Reused from old foundation (100% working)
 */

'use client'

import { useEffect } from 'react'
import { fireMiniappReady } from '@/lib/miniapp-detection'

export function MiniappReady() {
  useEffect(() => {
    let mounted = true

    const init = async () => {
      if (mounted) {
        await fireMiniappReady()
      }
    }

    init()

    return () => {
      mounted = false
    }
  }, [])

  return null
}
