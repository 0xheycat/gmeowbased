'use client'

import { useMemo, useState } from 'react'

import {
  CONTRACT_EVENT_CATEGORY_LABEL,
  type ContractEventCategory,
  listContractEvents,
} from '@/lib/contract-events'

const CATEGORY_ORDER: ContractEventCategory[] = [
  'gm',
  'quests',
  'economy',
  'erc20',
  'badges',
  'referrals',
  'guilds',
  'admin',
  'misc',
]

const ALL_EVENTS = listContractEvents()

export default function EventMatrixPanel() {
  const [query, setQuery] = useState('')

  const filteredEvents = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return ALL_EVENTS
    return ALL_EVENTS.filter((event) => {
      const haystack = [
        event.name,
        event.signature,
        event.description,
        event.recommendedAutomations.join(' '),
        event.inputs.map((input) => `${input.type} ${input.name}`).join(' '),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(trimmed)
    })
  }, [query])

  const grouped = useMemo(() => {
    return CATEGORY_ORDER.map((category) => ({
      category,
      label: CONTRACT_EVENT_CATEGORY_LABEL[category],
      events: filteredEvents.filter((event) => event.category === category),
    })).filter((group) => group.events.length > 0)
  }, [filteredEvents])

  const totalMatches = filteredEvents.length
  const totalEvents = ALL_EVENTS.length

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-white/5 p-5 shadow-lg shadow-emerald-500/5 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="pixel-section-title text-lg">On-chain event matrix</h2>
            <p className="text-[12px] text-[var(--px-sub)]">
              Reference every emitted contract event, the matching gm-utils helper, and recommended automation
              hooks. Use the search bar to filter by event name, signature, or context.
            </p>
          </div>
          <div className="min-w-[220px] max-w-xs">
            <label className="flex items-center gap-2 rounded-2xl border border-white dark:border-slate-700/12 bg-slate-100/10 dark:bg-white/5 px-3 py-2 text-[12px] text-slate-950 dark:text-white/70 focus-within:border-emerald-400/60 focus-within:text-slate-950 dark:text-white/90">
              <span className="text-[11px] uppercase tracking-[0.12em] text-slate-950 dark:text-white/60">Search</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter events…"
                className="w-full bg-transparent text-[13px] text-slate-950 dark:text-white placeholder:text-slate-950 dark:text-white/40 focus:outline-none"
                type="search"
              />
            </label>
            <p className="mt-2 text-right text-[11px] text-slate-950 dark:text-white/50">
              Showing {totalMatches} of {totalEvents} events
            </p>
          </div>
        </div>
      </header>

      {grouped.length === 0 ? (
        <div className="rounded-3xl border border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-white/5 p-6 text-center text-[13px] text-slate-950 dark:text-white/70">
          No events match your filter. Try adjusting the search query.
        </div>
      ) : null}

      {grouped.map((group) => (
        <section key={group.category} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="pixel-section-title text-base">{group.label}</h3>
            <span className="text-[11px] text-slate-950 dark:text-white/50">{group.events.length} event(s)</span>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {group.events.map((event) => (
              <article
                key={event.signature}
                className="group relative overflow-hidden rounded-3xl border border-white dark:border-slate-700/12 bg-slate-100/5 dark:bg-white/5 p-5 shadow-sm shadow-emerald-500/5 transition hover:border-emerald-300/50"
              >
                <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 admin-event-highlight"
                  aria-hidden
                />
                <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xl font-semibold text-slate-950 dark:text-white">{event.name}</h4>
                    <p className="mt-1 break-all font-mono text-[11px] text-slate-950 dark:text-white/60">{event.signature}</p>
                  </div>
                  <span className="pixel-pill text-[10px] uppercase tracking-[0.16em] text-emerald-200/90">
                    {CONTRACT_EVENT_CATEGORY_LABEL[event.category]}
                  </span>
                </div>

                <p className="relative z-10 mt-4 text-[13px] text-slate-950 dark:text-white/75">{event.description}</p>

                <div className="relative z-10 mt-4 rounded-2xl border border-white dark:border-slate-700/10 bg-white dark:bg-slate-900/[0.04] p-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-950 dark:text-white/50">Inputs</div>
                  {event.inputs.length ? (
                    <ul className="mt-3 space-y-1 text-[12px] text-slate-950 dark:text-white/70">
                      {event.inputs.map((input, idx) => (
                        <li key={`${event.name}-input-${idx}`} className="flex flex-wrap items-center gap-2 font-mono">
                          <span className="text-emerald-300">{input.type}</span>
                          <span>{input.name || '(anonymous)'}</span>
                          {input.indexed ? (
                            <span className="text-[10px] uppercase tracking-[0.14em] text-slate-950 dark:text-white/40">indexed</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-[12px] text-slate-950 dark:text-white/50">No indexed parameters.</p>
                  )}
                </div>

                {event.recommendedAutomations.length ? (
                  <div className="relative z-10 mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-emerald-200">Automation ideas</div>
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-[12px] text-emerald-100/90 marker:text-emerald-300">
                      {event.recommendedAutomations.map((idea, idx) => (
                        <li key={`${event.name}-automation-${idx}`}>{idea}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {event.notification ? (
                  <div className="relative z-10 mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-amber-200">Notification template</div>
                    <p className="mt-3 text-sm font-semibold text-slate-950 dark:text-white">{event.notification.title}</p>
                    <pre className="mt-2 whitespace-pre-wrap rounded-2xl border border-white dark:border-slate-700/10 bg-black dark:bg-slate-950/40 p-3 text-[12px] text-amber-100/90">{event.notification.body}</pre>
                    {event.notification.placeholders.length ? (
                      <div className="mt-3 text-[11px] uppercase tracking-[0.14em] text-amber-200/80">Placeholders</div>
                    ) : null}
                    {event.notification.placeholders.length ? (
                      <ul className="mt-1 flex flex-wrap gap-2 text-[11px] text-amber-100/80">
                        {event.notification.placeholders.map((placeholder) => (
                          <li
                            key={`${event.name}-placeholder-${placeholder}`}
                            className="rounded-full border border-amber-300/40 bg-amber-500/20 px-3 py-1 font-mono text-[11px]"
                          >
                            {'{'}{placeholder}{'}'}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {event.notification.preview ? (
                      <div className="mt-3 rounded-2xl border border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-white/5 p-3 text-[12px] text-slate-950 dark:text-white/80">
                        <span className="font-semibold text-slate-950 dark:text-white/90">Preview:</span> {event.notification.preview}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="relative z-10 mt-4 border-t border-white dark:border-slate-700/10 pt-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-950 dark:text-white/50">References</div>
                  <ul className="mt-2 space-y-1 text-[12px] text-slate-950 dark:text-white/60">
                    {event.references.map((ref) => (
                      <li key={`${event.name}-${ref.path}-${ref.symbol ?? 'ref'}`}>
                        <span className="font-semibold text-slate-950 dark:text-white/80">{ref.label}</span>
                        <span className="ml-2 text-slate-950 dark:text-white/50">{ref.path}</span>
                        {ref.symbol ? (
                          <span className="ml-1 text-slate-950 dark:text-white/40">({ref.symbol})</span>
                        ) : null}
                        {ref.note ? <span className="ml-1 text-slate-950 dark:text-white/50">— {ref.note}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
