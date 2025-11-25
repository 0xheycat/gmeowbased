import Link from 'next/link'

import { isAdminSecurityEnabled, isTotpRequired } from '@/lib/admin-auth'
import { AdminLoginForm } from '@/components/admin/AdminLoginForm'

type SearchParams = Record<string, string | string[] | undefined>

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const resolvedParams = (await searchParams) ?? {}
  const rawNext = resolvedParams.next
  const nextParam =
    typeof rawNext === 'string' && rawNext.length ? rawNext : Array.isArray(rawNext) ? rawNext[0] ?? '/admin' : '/admin'

  const totpRequired = isTotpRequired()
  const securityEnabled = isAdminSecurityEnabled()

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-white/10 bg-black/60 p-6 shadow-2xl shadow-emerald-500/10 backdrop-blur">
        <h1 className="pixel-section-title text-xl">Admin access</h1>
        <p className="mt-2 text-[12px] text-[var(--px-sub)]">
          Protected operations require the shared admin passphrase{totpRequired ? ' and a one-time code' : ''}.
        </p>

        {securityEnabled ? (
          <AdminLoginForm totpRequired={totpRequired} nextPath={nextParam} />
        ) : (
          <div className="mt-6 rounded-lg border border-amber-400/40 bg-amber-500/10 p-4 text-[12px] text-amber-200">
            <p className="font-semibold">Admin security is not configured.</p>
            <p className="mt-1">
              Set <code>ADMIN_ACCESS_CODE</code> and <code>ADMIN_JWT_SECRET</code> environment variables to enable the secure admin gate.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 text-center text-[12px] text-[var(--px-sub)]">
        <Link className="text-emerald-300 underline" href="/">
          ← Back to app
        </Link>
      </div>
    </div>
  )
}
