'use client'

import { useEffect } from 'react'
import { fireMiniappReady } from '@/lib/miniappEnv'

export function MiniappReady() {
  useEffect(() => {
    // fire immediately
    fireMiniappReady()
    // re-fire when app regains focus/visibility (miniapp can re-show splash)
    const onVis = () => {
      if (document.visibilityState === 'visible') fireMiniappReady()
    }
    const onFocus = () => fireMiniappReady()
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onFocus)
    }
  }, [])
  return null
}