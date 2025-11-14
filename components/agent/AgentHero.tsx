// @edit-start 2025-02-14 — Agent hero banner
import { ArrowRight } from '@phosphor-icons/react/dist/ssr'

import { Card, CardDescription, CardSection, CardTitle } from '@/components/ui/button'

export function AgentHero() {
  return (
    <Card
      asChild
      tone="frosted"
      padding="md"
      className="relative overflow-hidden rounded-3xl border-white/12 pb-6 sm:pb-6"
    >
      <section>
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_55%)]"
          aria-hidden="true"
        />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs uppercase tracking-[0.34em] text-emerald-200/80">GMEOW Companion</p>
            <CardTitle asChild>
              <h1 className="site-font text-2xl font-semibold text-white sm:text-3xl">
                Pilot the community feed from your pocket.
              </h1>
            </CardTitle>
            <CardDescription className="text-sm text-[var(--px-sub)] sm:text-base">
              Stay ahead of quests, streaks, tips, and treasury moves. The agent refreshes live so you can congratulate
              pilots or trigger rewards right away — even on mobile.
            </CardDescription>
          </div>
          <CardSection
            tone="accent"
            padding="sm"
            className="flex w-full flex-col gap-2 text-xs text-emerald-100 shadow-[0_0_40px_rgba(16,185,129,0.15)] sm:max-w-xs"
          >
            <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-200/80">Live checklist</div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
                <span>Monitor quest verifications across chains</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
                <span>Celebrate GM streaks the moment they land</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
                <span>Spot tip momentum and treasury signals</span>
              </li>
            </ul>
            <a
              className="group inline-flex items-center gap-2 self-start rounded-full border border-emerald-200/40 bg-emerald-300/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-100 transition hover:border-emerald-100 hover:bg-emerald-300/20"
              href="/admin"
            >
              Open ops console
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" weight="bold" />
            </a>
          </CardSection>
        </div>
      </section>
    </Card>
  )
}
// @edit-end

