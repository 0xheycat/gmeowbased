'use client'

import { useEffect, useState } from 'react'
import { probeMiniappReady, isEmbedded, isAllowedReferrer, referrerHost } from '@/lib/miniapp/miniappEnv'

export default function DebugMiniappPage() {
  const [state, setState] = useState({
    embedded: false,
    referrerHost: null as string | null,
    allowedReferrer: false,
    miniappReady: false,
    loading: true,
  })

  useEffect(() => {
    ;(async () => {
      const embedded = isEmbedded()
      const refHost = referrerHost()
      const allowed = isAllowedReferrer()
      const ready = await probeMiniappReady()

      setState({
        embedded,
        referrerHost: refHost,
        allowedReferrer: allowed,
        miniappReady: ready,
        loading: false,
      })
    })()
  }, [])

  return (
    <div className="p-8 space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">Miniapp Debug Info</h1>

      <div className="border rounded p-4 space-y-2">
        <div>
          <label className="font-mono text-sm text-gray-600">isEmbedded()</label>
          <div className="text-lg">
            {state.loading ? '...' : state.embedded ? '✅ YES' : '❌ NO'}
          </div>
        </div>

        <div>
          <label className="font-mono text-sm text-gray-600">referrerHost()</label>
          <div className="text-lg font-mono">{state.loading ? '...' : state.referrerHost || 'null'}</div>
        </div>

        <div>
          <label className="font-mono text-sm text-gray-600">isAllowedReferrer()</label>
          <div className="text-lg">
            {state.loading ? '...' : state.allowedReferrer ? '✅ YES' : '❌ NO'}
          </div>
        </div>

        <div>
          <label className="font-mono text-sm text-gray-600">probeMiniappReady()</label>
          <div className="text-lg">
            {state.loading ? '...' : state.miniappReady ? '✅ YES' : '❌ NO'}
          </div>
        </div>
      </div>

      <div className="bg-gray-100 p-4 rounded text-sm font-mono whitespace-pre-wrap">
        {`document.referrer: ${document.referrer}
window.location: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}
window.top === window.self: ${typeof window !== 'undefined' ? window.top === window.self : 'N/A'}`}
      </div>

      <div className="text-xs text-gray-500">
        <p>Open browser DevTools (F12) → Console to see detailed logs</p>
      </div>
    </div>
  )
}
