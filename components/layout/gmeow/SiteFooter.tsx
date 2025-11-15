"use client"

import Link from 'next/link'

import { footerCallouts, navIconLinks } from './nav-data'

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-font border-t border-white/10 bg-white/5 px-4 py-12 backdrop-blur-md sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border text-xl">😺</span>
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] uppercase tracking-[0.32em] text-[var(--px-sub)]">Gmeowbased</span>
                <span className="text-lg font-semibold">Adventure Daily GM</span>
              </div>
            </div>
            <p className="max-w-md text-sm leading-6 text-[var(--px-sub)]">
              Automate rituals, unlock quests, and rally your guild across Base, Optimism, Unichain, Ink, and more. The lounge is always open for pilots chasing prestige.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {footerCallouts.map((callout) => {
                const Icon = callout.icon
                const external = callout.href.startsWith('http')
                return (
                  <Link
                    key={callout.id}
                    href={callout.href}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noreferrer' : undefined}
                    className="theme-shell-card theme-shell-card--soft flex items-center justify-between rounded-2xl border px-4 py-3 text-sm"
                  >
                    <span className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-xl border">
                        <Icon size={18} weight="bold" />
                      </span>
                      <span className="flex flex-col gap-1">
                        <span className="font-semibold tracking-wide">{callout.label}</span>
                        <span className="text-xs text-[var(--px-sub)]">{callout.description}</span>
                      </span>
                    </span>
                    <span className="text-xs uppercase tracking-[0.28em] text-[var(--px-sub)]">Go</span>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {navIconLinks.map((link) => {
              const Icon = link.icon
              const external = link.href.startsWith('http')
              return (
                <Link
                  key={link.id}
                  href={link.href}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noreferrer' : undefined}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-transparent px-4 py-5 text-center transition-colors hover:border-white/15 hover:bg-white/5"
                  aria-label={link.label}
                >
                  <span className="grid h-12 w-12 place-items-center rounded-full border">
                    <Icon size={20} weight="bold" />
                  </span>
                </Link>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 pt-6 text-sm text-[var(--px-sub)] sm:flex-row sm:items-center sm:justify-between">
          <span>© {year} Gmeowbased. All rights reserved.</span>
        </div>
      </div>
    </footer>
  )
}
