'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'

interface AdminLoginFormProps {
  totpRequired: boolean
  nextPath: string
}

export function AdminLoginForm({ totpRequired, nextPath }: AdminLoginFormProps) {
  const router = useRouter()
  const [passcode, setPasscode] = useState('')
  const [totp, setTotp] = useState('')
  const [remember, setRemember] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(async () => {
    if (!passcode.trim()) {
      setError('Enter the admin passphrase to continue.')
      return
    }
    if (totpRequired && totp.trim().length < 6) {
      setError('Enter the 6-digit code from your authenticator app.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode, totp, remember }),
      })
      const json = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Unable to authenticate')
      }
      router.replace(nextPath)
      router.refresh()
    } catch (err) {
      setError((err as Error)?.message ?? 'Authentication failed')
    } finally {
      setSubmitting(false)
    }
  }, [passcode, totp, remember, totpRequired, router, nextPath])

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        void handleSubmit()
      }}
    >
      <label className="flex flex-col gap-1 text-[12px] text-slate-950 dark:text-white/80">
        Admin passphrase
        <input
          className="rounded-lg border border-white dark:border-slate-700/15 bg-black dark:bg-slate-950/40 px-3 py-2 text-sm text-slate-950 dark:text-slate-950 dark:text-white focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          type="password"
          autoComplete="current-password"
          value={passcode}
          onChange={(event) => setPasscode(event.target.value)}
          placeholder="Enter shared passphrase"
        />
      </label>

      <label className="flex flex-col gap-1 text-[12px] text-slate-950 dark:text-white/80">
        One-time code {totpRequired ? '(required)' : '(optional)'}
        <input
          className="rounded-lg border border-white dark:border-slate-700/15 bg-black dark:bg-slate-950/40 px-3 py-2 text-sm text-slate-950 dark:text-slate-950 dark:text-white focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          value={totp}
          onChange={(event) => setTotp(event.target.value)}
          placeholder="123 456"
        />
      </label>

      <label className="flex items-center gap-2 text-[12px] text-slate-950 dark:text-white/70">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-white dark:border-slate-700/30 bg-black dark:bg-slate-950/40 text-emerald-400 focus:ring-emerald-400"
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
        />
        Keep me signed in for 7 days
      </label>

      {error ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-200">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        className="pixel-button w-full justify-center py-2 text-sm disabled:opacity-50"
        disabled={submitting}
      >
        {submitting ? 'Signing in…' : 'Unlock control center'}
      </button>
    </form>
  )
}
