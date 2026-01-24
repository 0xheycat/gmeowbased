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
    error: null as string | null,
    isMobile: false,
    userAgent: '',
    sdkAvailable: false,
  })

  useEffect(() => {
    ;(async () => {
      try {
        const embedded = isEmbedded()
        const refHost = referrerHost()
        const allowed = isAllowedReferrer()
        const ready = await probeMiniappReady()
        
        // Detect mobile
        const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          navigator.userAgent.toLowerCase()
        )
        
        // Check if SDK is available
        let sdkAvailable = false
        try {
          const { sdk } = await import('@farcaster/miniapp-sdk')
          sdkAvailable = !!sdk
        } catch {}

        setState({
          embedded,
          referrerHost: refHost,
          allowedReferrer: allowed,
          miniappReady: ready,
          loading: false,
          error: null,
          isMobile,
          userAgent: navigator.userAgent,
          sdkAvailable,
        })
      } catch (err) {
        setState((s) => ({
          ...s,
          loading: false,
          error: String(err),
        }))
      }
    })()
  }, [])

  return (
    <div className="p-4 md:p-8 space-y-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Miniapp Debug Info</h1>

      {state.error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error</p>
          <p className="text-sm font-mono">{state.error}</p>
        </div>
      )}

      <div className="border rounded p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          <div>
            <label className="font-mono text-xs text-gray-600">Mobile</label>
            <div className="text-base">
              {state.loading ? '...' : state.isMobile ? '📱 YES' : '🖥️ NO'}
            </div>
          </div>

          <div>
            <label className="font-mono text-xs text-gray-600">Embedded</label>
            <div className="text-base">
              {state.loading ? '...' : state.embedded ? '✅ YES' : '❌ NO'}
            </div>
          </div>

          <div>
            <label className="font-mono text-xs text-gray-600">SDK</label>
            <div className="text-base">
              {state.loading ? '...' : state.sdkAvailable ? '✅ YES' : '❌ NO'}
            </div>
          </div>

          <div>
            <label className="font-mono text-xs text-gray-600">Referrer</label>
            <div className="text-sm font-mono truncate">
              {state.loading ? '...' : state.referrerHost || '(empty)'}
            </div>
          </div>

          <div>
            <label className="font-mono text-xs text-gray-600">Allowed</label>
            <div className="text-base">
              {state.loading ? '...' : state.allowedReferrer ? '✅ YES' : '❌ NO'}
            </div>
          </div>

          <div>
            <label className="font-mono text-xs text-gray-600">Miniapp Ready</label>
            <div className="text-base">
              {state.loading ? '...' : state.miniappReady ? '🟢 YES' : '🔴 NO'}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 text-gray-100 p-4 rounded text-xs font-mono overflow-auto max-h-96">
        <div className="space-y-1">
          <div>
            <span className="text-cyan-400">referrer:</span> {document.referrer || '(empty)'}
          </div>
          <div>
            <span className="text-cyan-400">location:</span> {typeof window !== 'undefined' ? window.location.href : 'N/A'}
          </div>
          <div>
            <span className="text-cyan-400">embedded:</span> {typeof window !== 'undefined' ? (window.self !== window.top ? 'true' : 'false') : 'N/A'}
          </div>
          <div>
            <span className="text-cyan-400">userAgent:</span>
            <div className="text-gray-400 truncate">{state.userAgent}</div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 p-4 rounded text-sm">
        <p className="font-bold text-blue-900">📋 What to check:</p>
        <ul className="text-blue-800 text-xs mt-2 space-y-1 list-disc list-inside">
          <li>If <span className="font-mono">Miniapp Ready = 🔴 NO</span>, check the other checks</li>
          <li>If <span className="font-mono">Embedded = ❌ NO</span> on mobile Farcaster, app might not be in iframe</li>
          <li>If <span className="font-mono">Referrer = (empty)</span>, Farcaster might not be sending it</li>
          <li>If <span className="font-mono">SDK = ❌ NO</span>, package may not be installed correctly</li>
        </ul>
      </div>

      <div className="text-xs text-gray-500">
        <p>💡 Open browser DevTools (F12) → Console tab to see detailed logs from miniappEnv.ts</p>
      </div>
    </div>
  )
}
