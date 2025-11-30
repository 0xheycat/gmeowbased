'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function MaintenancePage() {
  return (
    <Suspense fallback={<MaintenanceSkeleton />}>
      <MaintenanceContent />
    </Suspense>
  )
}

function MaintenanceSkeleton() {
  return (
    <div
      className="fixed inset-0"
      style={{
        zIndex: 50,
        background:
          'radial-gradient(1200px 800px at 50% 20%, rgba(255,255,255,0.08), rgba(0,0,0,0.85)), linear-gradient(180deg, #0b0f18, #070a12)',
        fontFamily: 'var(--site-font)',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '100% 3px',
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        }}
      />
      <div className="h-full w-full flex flex-col items-center justify-center text-center px-6 relative z-10">
        <div style={{ fontSize: 72, filter: 'drop-shadow(0 6px 0 rgba(0,0,0,0.35))' }}>😺</div>
        <h1 className="pixel-heading mt-1 mb-2">GMEOW Maintenance</h1>
        <div className="pixel-pill text-[10px] mb-4">LOADING…</div>
      </div>
    </div>
  )
}

function MaintenanceContent() {
  const router = useRouter()
  const sp = useSearchParams()
  const nextUrl = sp.get('next') || '/'
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [typed, setTyped] = useState('')

  const text = 'We are upgrading GMEOW. Enter the access password to continue.'
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    startRef.current = performance.now()
    const step = (now: number) => {
      if (!startRef.current) return
      const elapsed = now - startRef.current
      const chars = Math.min(text.length, Math.ceil((elapsed / 2200) * text.length))
      setTyped(text.slice(0, chars))
      if (chars < text.length) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/maintenance/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || 'Unauthorized')
      }
      router.replace(nextUrl)
    } catch (err: any) {
      setError(err?.message || 'Unauthorized')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0"
      style={{
        zIndex: 50,
        background:
          'radial-gradient(1200px 800px at 50% 20%, rgba(255,255,255,0.08), rgba(0,0,0,0.85)), linear-gradient(180deg, #0b0f18, #070a12)',
        fontFamily: 'var(--site-font)',
      }}
    >
      {/* animated scanlines */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '100% 3px',
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        }}
      />
      <div className="h-full w-full flex flex-col items-center justify-center text-center px-6 relative z-10">
        <div style={{ fontSize: 72, filter: 'drop-shadow(0 6px 0 rgba(0,0,0,0.35))' }}>😺</div>
        <h1 className="pixel-heading mt-1 mb-2">GMEOW Maintenance</h1>
        <div className="pixel-pill text-[10px] mb-4">ACCESS REQUIRED</div>

        <p
          className="text-[var(--px-sub)] max-w-2xl mb-5"
          style={{ fontSize: 14, lineHeight: '20px', whiteSpace: 'pre-wrap', textShadow: '0 2px 0 var(--px-outer)' }}
        >
          {typed}
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: 8,
              height: 14,
              marginLeft: 2,
              background: 'currentColor',
              opacity: 0.8,
              animation: 'blink 1s steps(1) infinite',
              verticalAlign: '-2px',
            }}
          />
        </p>

        <form
          onSubmit={submit}
          className="pixel-card w-full max-w-sm text-left p-4 sm:p-6"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))' }}
        >
          <label className="block text-[11px] mb-2">Password</label>
          <input
            type="password"
            className="w-full mb-3"
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              outline: 'none',
              boxShadow: '0 0 0 3px var(--px-outer), inset 0 0 0 3px var(--px-inner)',
              background: '#0e1220',
              minHeight: '3rem',
            }}
            placeholder="Enter access password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
          <button
            type="submit"
            className="pixel-button w-full min-h-6 disabled:opacity-60"
            disabled={loading || !password}
            title="Unlock"
          >
            {loading ? 'Verifying…' : 'Unlock'}
          </button>
          {error && <p className="text-xs text-red-400 mt-2">Error: {error}</p>}
          <p className="text-[10px] text-[var(--px-sub)] mt-3">
            If you reached this by mistake, try again later while we upgrade the experience by @heycat
          </p>
        </form>
      </div>

      <style jsx>{`
        @keyframes blink {
          0%, 49% { opacity: 0.0 }
          50%, 100% { opacity: 1 }
        }
      `}</style>
    </div>
  )
}