'use client'

// @edit-start 2025-02-14 — Agent composer suggestions
import { useMemo, useState } from 'react'
import { CheckCircle, Copy, MagnifyingGlass } from '@phosphor-icons/react'

import { Card, CardDescription, CardSection, Input } from '@/components/ui/button'

const SUGGESTIONS = [
  {
    id: 'quest-celebrate',
    title: 'Congratulate quest finishers',
    prompt: "Send a celebratory cast to pilots who completed today's featured quest, tagging the quest title and attaching the reward link.",
    detail: 'Auto-tag quest channel and include reward CTA',
  },
  {
    id: 'streak-check',
    title: 'Ping streak risers',
    prompt: 'List the pilots who extended their GM streak in the last hour and craft a supportive reply including their current streak length.',
    detail: 'Encourage consistency and highlight streak counts',
  },
  {
    id: 'tip-report',
    title: 'Report tip surges',
    prompt: 'Summarize the biggest tip transactions from the last 6 hours and suggest which guild should amplify them.',
    detail: 'Blend social proof with guild routing',
  },
  {
    id: 'treasury-digest',
    title: 'Daily treasury digest',
    prompt: 'Draft a 3-bullet update covering new stakes, withdrawals, and total treasury movement for the day.',
    detail: 'Short digest for leadership updates',
  },
]

type AgentComposerProps = {
  className?: string
}

export function AgentComposer({ className }: AgentComposerProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const filteredSuggestions = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return SUGGESTIONS
    return SUGGESTIONS.filter((item) =>
      [item.title, item.detail, item.prompt].some((value) => value.toLowerCase().includes(trimmed)),
    )
  }, [query])

  const handleCopy = async (id: string, prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopiedId(id)
      setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev))
      }, 2500)
    } catch (error) {
      console.warn('[agent-composer] Failed to copy prompt', error)
    }
  }

  return (
    <aside className={className}>
      <Card tone="frosted" padding="sm" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Quick prompts</h2>
            <p className="text-xs text-slate-950 dark:text-white/60">Use these to jumpstart agent responses.</p>
          </div>
        </div>
        <div className="relative">
          <Input
            size="md"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search prompts…"
            aria-label="Search quick prompts"
            className="pl-9"
          />
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-950 dark:text-white/40" weight="bold" />
        </div>
        <ul className="space-y-3">
          {filteredSuggestions.length ? (
            filteredSuggestions.map((item) => {
              const isCopied = copiedId === item.id
              return (
                <li key={item.id}>
                  <CardSection tone="muted" padding="sm" className="space-y-3">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-slate-950 dark:text-white">{item.title}</div>
                      <CardDescription className="text-xs text-slate-950 dark:text-white/60">{item.detail}</CardDescription>
                    </div>
                    <p className="rounded-lg border border-white dark:border-slate-700/10 bg-black dark:bg-slate-950/30 p-3 text-[13px] text-slate-950 dark:text-white/80">{item.prompt}</p>
                    <button
                      type="button"
                      onClick={() => handleCopy(item.id, item.prompt)}
                      className="inline-flex items-center gap-2 self-start rounded-full border border-white dark:border-slate-700/15 bg-slate-100/5 dark:bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-950 dark:text-white/80 transition hover:border-emerald-300/40 hover:bg-emerald-400/10"
                    >
                      {isCopied ? (
                        <>
                          <CheckCircle className="size-4 text-emerald-300" weight="bold" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="size-4 text-slate-950 dark:text-white/70" weight="bold" />
                          Copy prompt
                        </>
                      )}
                    </button>
                  </CardSection>
                </li>
              )
            })
          ) : (
            <li>
              <CardSection tone="muted" padding="sm" className="text-sm text-slate-950 dark:text-white/65">
                No prompts match “{query}”.
              </CardSection>
            </li>
          )}
        </ul>
      </Card>
    </aside>
  )
}
// @edit-end

