import Link from 'next/link'
import clsx from 'clsx'

export type AdminHeroMetric = {
  key: string
  label: string
  value: string
  delta: number
  deltaLabel: string
  accent: string
}

type AdminHeroProps = {
  metrics: AdminHeroMetric[]
  refreshing: boolean
  lastUpdatedLabel: string
  onRefresh: () => void
}

export default function AdminHero({ metrics, refreshing, lastUpdatedLabel, onRefresh }: AdminHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-r from-[#0c1b2f] via-[#081d26] to-[#111533] px-6 py-8 text-white shadow-[0_0_80px_-40px_rgba(14,212,255,0.8)] sm:px-10 sm:py-10">
      <div className="pointer-events-none absolute -left-24 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-emerald-400/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-28 -top-16 h-72 w-72 rounded-full bg-sky-500/30 blur-3xl" aria-hidden />
      <div className="relative z-10 grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
        <div className="space-y-6">
          <div>
            <span className="pixel-pill border-white/20 bg-white/10 text-[10px] uppercase tracking-[0.22em] text-white/70">
              Gmeow Operations Command Deck
            </span>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
              Admin panel fuelled by live telemetry &amp; bot insights
            </h1>
            <p className="mt-3 max-w-xl text-sm text-white/80 sm:text-base">
              Monitor mission health, orchestrate automation, and keep the Gmeow bot purring. Tap into analytics, run manual ops,
              and review high-signal alerts from a single command surface.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/70">
            <button
              type="button"
              onClick={onRefresh}
              className="pixel-button btn-sm border-white/20 bg-white/10 text-white hover:border-emerald-300/40 hover:bg-emerald-500/10 hover:text-emerald-100"
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing…' : 'Refresh analytics'}
            </button>
            <Link
              href="#ops-analytics"
              className="pixel-button btn-sm border-emerald-400/40 bg-emerald-500/10 text-emerald-100 hover:border-emerald-300/60 hover:bg-emerald-400/20"
            >
              View analytics ↘
            </Link>
            <Link
              href="#bot-operations"
              className="pixel-button btn-sm border-sky-400/40 bg-sky-500/10 text-sky-100 hover:border-sky-300/60 hover:bg-sky-400/20"
            >
              Bot operations ↘
            </Link>
            <span className="block text-[11px] text-white/60 lg:ml-4">
              Updated {lastUpdatedLabel}
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {metrics.map((metric) => (
            <div
              key={metric.key}
              className={clsx(
                'group relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.04] p-4 transition duration-300',
                'before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-white/5 before:via-transparent before:to-transparent before:opacity-0 before:transition before:duration-300 group-hover:before:opacity-100'
              )}
              style={{ borderColor: metric.accent, boxShadow: `0 20px 40px -32px ${metric.accent}` }}
            >
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/60">{metric.label}</div>
              <div className="mt-3 text-2xl font-bold text-white sm:text-3xl">{metric.value}</div>
              <div className="mt-2 text-[12px] text-white/70">
                <span className={clsx(metric.delta >= 0 ? 'text-emerald-200' : 'text-red-300', 'font-semibold')}>
                  {metric.deltaLabel}
                </span>{' '}
                vs previous period
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
