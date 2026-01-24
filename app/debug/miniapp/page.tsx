'use client'

import { useEffect, useState } from 'react'
import { useAccount, useConnect } from 'wagmi'
import { probeMiniappReady, isEmbedded, isAllowedReferrer, referrerHost } from '@/lib/miniapp/miniappEnv'

export default function DebugMiniappPage() {
  const { address, isConnected } = useAccount()
  const { connectors } = useConnect()
  
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

  const [logs, setLogs] = useState<Array<{ time: string; message: string; level: 'log' | 'warn' | 'error' }>>([])

  // Capture console logs
  useEffect(() => {
    const originalLog = console.log
    const originalWarn = console.warn
    const originalError = console.error

    const addLog = (message: string, level: 'log' | 'warn' | 'error') => {
      const time = new Date().toLocaleTimeString()
      setLogs((prev) => [...prev.slice(-49), { time, message, level }]) // Keep last 50 logs
    }

    console.log = (...args) => {
      originalLog(...args)
      if (args[0]?.includes?.('[')) {
        addLog(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '), 'log')
      }
    }

    console.warn = (...args) => {
      originalWarn(...args)
      addLog(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '), 'warn')
    }

    console.error = (...args) => {
      originalError(...args)
      addLog(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '), 'error')
    }

    return () => {
      console.log = originalLog
      console.warn = originalWarn
      console.error = originalError
    }
  }, [])

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
    <div className="p-4 md:p-8 space-y-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">Miniapp Debug Info</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        <div className="bg-blue-50 p-3 rounded border border-blue-200">
          <div className="text-xs text-gray-600">Miniapp Ready</div>
          <div className="text-base font-bold">{state.loading ? '...' : state.miniappReady ? '🟢' : '🔴'}</div>
        </div>
        <div className="bg-green-50 p-3 rounded border border-green-200">
          <div className="text-xs text-gray-600">Connected</div>
          <div className="text-base font-bold">{isConnected ? '✅ YES' : '❌ NO'}</div>
        </div>
        <div className="bg-purple-50 p-3 rounded border border-purple-200">
          <div className="text-xs text-gray-600">Mobile</div>
          <div className="text-base font-bold">{state.isMobile ? '📱' : '🖥️'}</div>
        </div>
        <div className="bg-orange-50 p-3 rounded border border-orange-200">
          <div className="text-xs text-gray-600">Connectors</div>
          <div className="text-base font-bold">{connectors.length}</div>
        </div>
      </div>

      {isConnected && address && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <p className="font-bold">✅ Connected Successfully</p>
          <p className="text-sm font-mono">{address}</p>
        </div>
      )}

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
            <div className="text-base">{state.loading ? '...' : state.isMobile ? '📱 YES' : '🖥️ NO'}</div>
          </div>

          <div>
            <label className="font-mono text-xs text-gray-600">Embedded</label>
            <div className="text-base">{state.loading ? '...' : state.embedded ? '✅ YES' : '❌ NO'}</div>
          </div>

          <div>
            <label className="font-mono text-xs text-gray-600">SDK</label>
            <div className="text-base">{state.loading ? '...' : state.sdkAvailable ? '✅ YES' : '❌ NO'}</div>
          </div>

          <div>
            <label className="font-mono text-xs text-gray-600">Referrer</label>
            <div className="text-sm font-mono truncate">{state.loading ? '...' : state.referrerHost || '(empty)'}</div>
          </div>

          <div>
            <label className="font-mono text-xs text-gray-600">Allowed</label>
            <div className="text-base">{state.loading ? '...' : state.allowedReferrer ? '✅ YES' : '❌ NO'}</div>
          </div>

          <div>
            <label className="font-mono text-xs text-gray-600">Miniapp Ready</label>
            <div className="text-base">{state.loading ? '...' : state.miniappReady ? '🟢 YES' : '🔴 NO'}</div>
          </div>
        </div>

        <div>
          <label className="font-mono text-xs text-gray-600">Available Connectors</label>
          <div className="text-sm space-y-1 mt-1">
            {connectors.length === 0 ? (
              <div className="text-gray-500">No connectors available</div>
            ) : (
              connectors.map((c: any) => (
                <div key={c?.id} className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                  <span className={c?.name?.toLowerCase().includes('farcaster') ? 'font-bold text-blue-600' : ''}>
                    {c?.name || c?.id}
                  </span>
                  {typeof c?.ready === 'boolean' && (
                    <span className={c.ready ? 'text-green-600' : 'text-red-600'}>
                      {' '}({c.ready ? '✅' : '❌'})
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="border rounded p-4">
        <div className="flex items-center justify-between mb-2">
          <label className="font-mono text-sm font-bold">Console Logs</label>
          <button
            onClick={() => setLogs([])}
            className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            Clear
          </button>
        </div>
        <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs font-mono overflow-auto max-h-64">
          {logs.length === 0 ? (
            <div className="text-gray-500">Waiting for logs...</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className={log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-green-400'}>
                <span className="text-gray-600">[{log.time}]</span> {log.message}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 p-4 rounded text-sm">
        <p className="font-bold text-blue-900">📋 What to check:</p>
        <ul className="text-blue-800 text-xs mt-2 space-y-1 list-disc list-inside">
          <li>If <span className="font-mono">Connected = ❌ NO</span> but miniapp detected, check console logs for connection errors</li>
          <li>Look for Farcaster connector in the list below (should say ✅ if ready)</li>
          <li>Check the "Console Logs" section - connection errors will appear there in real-time</li>
          <li>If no logs appear, connection attempt isn't being made</li>
        </ul>
      </div>
    </div>
  )
}
