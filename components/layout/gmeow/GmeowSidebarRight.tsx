'use client'

import Link from 'next/link'

const statusMetrics: Array<{ label: string; value: string; tone: string }> = [
  { label: 'Daily GMs', value: '18,420', tone: 'theme-text-success' },
  { label: 'Active Quests', value: '36', tone: 'theme-text-warning' },
  { label: 'Guild Crews', value: '128', tone: 'theme-text-info' },
]

const timeline: Array<{ title: string; subtitle: string; href: string }> = [
  { title: 'Sync Leaderboard', subtitle: 'Frame upgrade queued', href: '/leaderboard' },
  { title: 'Gmeow Hero Concepts', subtitle: 'Design pass in progress', href: '/Dashboard' },
  { title: 'Automation Queue', subtitle: 'Run nightly scripts', href: '/Quest' },
]

export function GmeowSidebarRight() {
  return (
    <aside className="gmeow-sidebar-right theme-shell theme-shell-elevated hidden w-[320px] shrink-0 flex-col border-l px-6 py-8 site-font 2xl:flex">
      <section className="theme-shell-card theme-shell-card--soft rounded-2xl border p-5">
        <h3 className="theme-shell-heading text-xs">Flight Metrics</h3>
        <div className="mt-5 space-y-4">
          {statusMetrics.map((item) => (
            <div key={item.label} className="theme-shell-card theme-shell-card--soft rounded-xl border p-4">
              <p className="theme-shell-label text-[11px] uppercase tracking-[0.35em]">{item.label}</p>
              <p className={`mt-2 text-2xl font-semibold ${item.tone}`}>{item.value}</p>
            </div>
          ))}
        </div>
        <Link
          href="/profile"
          className="theme-shell-cta mt-6 inline-flex w-full items-center justify-center rounded-full border px-4 py-3 text-xs font-semibold uppercase tracking-[0.25em]"
        >
          View Cadet Profile
        </Link>
      </section>
      <section className="theme-shell-card theme-shell-card--soft mt-8 rounded-2xl border p-5">
        <h3 className="theme-shell-heading text-xs">Ops Timeline</h3>
        <ul className="mt-4 space-y-3 text-sm">
          {timeline.map((item) => (
            <li key={item.title}>
              <Link
                href={item.href}
                className="theme-shell-nav theme-shell-nav--idle block rounded-xl border px-4 py-3"
              >
                <p className="theme-shell-title font-semibold">{item.title}</p>
                <p className="theme-shell-label text-xs uppercase tracking-[0.28em]">{item.subtitle}</p>
              </Link>
            </li>
          ))}
        </ul>
        <div className="theme-shell-card theme-shell-card--muted mt-6 rounded-xl border p-4 text-[11px] uppercase tracking-[0.3em]">
          <p className="theme-shell-title text-sm font-semibold normal-case tracking-normal">Share your GM streak</p>
          <p className="theme-shell-copy mt-2 leading-relaxed">
            Generate a flex frame and schedule a Warpcast drop straight from the command deck.
          </p>
          <Link
            href="/api/frame?type=gm"
            className="theme-shell-cta mt-4 inline-flex w-full items-center justify-center rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em]"
          >
            Launch Frame
          </Link>
        </div>
      </section>
    </aside>
  )
}
