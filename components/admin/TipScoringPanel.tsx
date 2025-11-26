'use client'

import { useCallback, useEffect, useMemo, useState, useRef, type ChangeEvent } from 'react'
import clsx from 'clsx'
import {
  DEFAULT_TIP_SCORING_CONFIG,
  type TipMentionEvent,
  type TipScoringConfig,
  type TipScoringOutcome,
  simulateMentionSeries,
} from '@/lib/tips-scoring'

const STORAGE_KEY = 'gmeow_tip_scoring_config_v1'

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
})

const pointFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
})

type ConfigKey = keyof TipScoringConfig

type ReasonLabel = {
  reason: TipScoringOutcome['reason']
  label: string
}

const REASON_LABELS: ReasonLabel[] = [
  { reason: 'awarded', label: 'Awarded' },
  { reason: 'cooldown_global', label: 'Global cooldown' },
  { reason: 'cooldown_actor', label: 'Actor cooldown' },
  { reason: 'actor_cap', label: 'Actor cap reached' },
  { reason: 'global_cap', label: 'Global cap reached' },
]

const MINIMUMS: Record<ConfigKey, number> = {
  basePoints: 0,
  directMentionMultiplier: 0,
  replyMentionMultiplier: 0,
  keywordMentionMultiplier: 0,
  mentionCooldownMinutes: 0,
  actorCooldownMinutes: 0,
  actorDailyCap: 0,
  globalDailyCap: 0,
}

function clampValue(key: ConfigKey, value: number, previous: number): number {
  if (!Number.isFinite(value)) return previous
  return Math.max(MINIMUMS[key], value)
}

function sanitiseStoredConfig(value: unknown): TipScoringConfig | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<TipScoringConfig>
  for (const key of Object.keys(DEFAULT_TIP_SCORING_CONFIG) as ConfigKey[]) {
    const raw = candidate[key]
    if (typeof raw !== 'number' || Number.isNaN(raw)) {
      return null
    }
  }
  return candidate as TipScoringConfig
}

function formatReason(reason: TipScoringOutcome['reason']): string {
  return REASON_LABELS.find((entry) => entry.reason === reason)?.label ?? reason
}

function formatRelative(target: number | null): string {
  if (!target || !Number.isFinite(target)) return '—'
  const diff = target - Date.now()
  if (diff <= 0) return 'ready'
  const minutes = Math.round(diff / 60_000)
  if (minutes < 1) return '<1 min'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.floor(hours / 24)
  return `${days} d`
}

function createPreviewEvents(config: TipScoringConfig): TipMentionEvent[] {
  const now = Date.now()
  const minute = 60_000
  const globalCooldownMs = Math.max(0, config.mentionCooldownMinutes) * minute
  const actorCooldownMs = Math.max(0, config.actorCooldownMinutes) * minute

  const earliestCooldown = (() => {
    const values = [globalCooldownMs, actorCooldownMs].filter((val) => val > 0)
    if (!values.length) return 0
    return Math.min(...values)
  })()

  const earlyGap = earliestCooldown > 0 ? Math.max(1_000, Math.round(earliestCooldown / 2)) : 30_000
  const actorUnlock = Math.max(globalCooldownMs, actorCooldownMs)
  const thirdGap = actorUnlock > 0 ? actorUnlock + Math.max(earlyGap, 60_000) : Math.max(earlyGap, 60_000)

  return [
    {
      id: 'preview-direct-initial',
      type: 'direct_mention',
      actorId: '4621',
      timestamp: now,
    },
    {
      id: 'preview-direct-repeat',
      type: 'direct_mention',
      actorId: '4621',
      timestamp: now + earlyGap,
    },
    {
      id: 'preview-reply-followup',
      type: 'reply_mention',
      actorId: '9001',
      timestamp: now + thirdGap,
    },
    {
      id: 'preview-keyword-ping',
      type: 'keyword_signal',
      actorId: '4621',
      timestamp: now + thirdGap + 30 * minute,
    },
  ]
}

export default function TipScoringPanel() {
  const [config, setConfig] = useState<TipScoringConfig>(DEFAULT_TIP_SCORING_CONFIG)
  const [loaded, setLoaded] = useState(false)
  const [copied, setCopied] = useState(false)
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        const normalised = sanitiseStoredConfig(parsed)
        if (normalised) {
          setConfig(normalised)
        }
      }
    } catch {
      // ignore
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!loaded || typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    } catch {
      // ignore persistence failures
    }
  }, [config, loaded])

  const handleNumberChange = useCallback((key: ConfigKey, value: number) => {
    setConfig((previous) => ({
      ...previous,
      [key]: clampValue(key, value, previous[key]),
    }))
  }, [])

  const handleInputChange = useCallback((key: ConfigKey) => (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value
    const parsed = raw === '' ? 0 : Number(raw)
    handleNumberChange(key, parsed)
  }, [handleNumberChange])

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_TIP_SCORING_CONFIG)
  }, [])

  const configJson = useMemo(() => JSON.stringify(config, null, 2), [config])

  const handleCopyConfig = useCallback(() => {
    if (typeof navigator === 'undefined' || typeof navigator.clipboard?.writeText !== 'function') {
      return
    }
    navigator.clipboard
      .writeText(configJson)
      .then(() => {
        if (copyResetRef.current) clearTimeout(copyResetRef.current)
        setCopied(true)
        copyResetRef.current = setTimeout(() => setCopied(false), 2000)
      })
      .catch(error => {
        console.warn('[tip-scoring] failed to copy config', error)
      })
  }, [configJson])

  useEffect(() => () => {
    if (copyResetRef.current) {
      clearTimeout(copyResetRef.current)
      copyResetRef.current = null
    }
  }, [])

  const preview = useMemo(() => {
    const events = createPreviewEvents(config)
    return simulateMentionSeries(events, config)
  }, [config])

  const totalAwarded = pointFormatter.format(preview.totalAwarded)
  const suppressedCount = preview.suppressedCount

  const formatCooldown = useCallback((minutes: number) => {
    if (!minutes || minutes <= 0) return 'Disabled'
    if (minutes < 60) return `${minutes} min`
    const hours = minutes / 60
    if (hours < 24) return `${numberFormatter.format(hours)} h`
    const days = hours / 24
    return `${numberFormatter.format(days)} d`
  }, [])

  const summaryHighlights = useMemo(() => {
    const basePoints = pointFormatter.format(config.basePoints)
    const directAward = pointFormatter.format(config.basePoints * config.directMentionMultiplier)
    const replyAward = pointFormatter.format(config.basePoints * config.replyMentionMultiplier)
    const keywordAward = pointFormatter.format(config.basePoints * config.keywordMentionMultiplier)
    return [
      {
        key: 'base',
        label: 'Base award',
        value: `${basePoints} pts`,
        hint: 'Granted before multipliers',
      },
      {
        key: 'direct',
        label: 'Direct mention',
        value: `${directAward} pts`,
        hint: `${numberFormatter.format(config.directMentionMultiplier)}× multiplier`,
      },
      {
        key: 'reply',
        label: 'Reply mention',
        value: `${replyAward} pts`,
        hint: `${numberFormatter.format(config.replyMentionMultiplier)}× multiplier`,
      },
      {
        key: 'keyword',
        label: 'Keyword ping',
        value: `${keywordAward} pts`,
        hint: `${numberFormatter.format(config.keywordMentionMultiplier)}× multiplier`,
      },
      {
        key: 'cooldown-global',
        label: 'Global cooldown',
        value: formatCooldown(config.mentionCooldownMinutes),
        hint: 'Minimum time between any awards',
      },
      {
        key: 'cooldown-actor',
        label: 'Actor cooldown',
        value: formatCooldown(config.actorCooldownMinutes),
        hint: 'Minimum time between awards for same actor',
      },
      {
        key: 'actor-cap',
        label: 'Actor daily cap',
        value: config.actorDailyCap > 0 ? `${pointFormatter.format(config.actorDailyCap)} pts` : 'Unlimited',
        hint: 'Rolling 24h cap per actor',
      },
      {
        key: 'global-cap',
        label: 'Global daily cap',
        value: config.globalDailyCap > 0 ? `${pointFormatter.format(config.globalDailyCap)} pts` : 'Unlimited',
        hint: 'Rolling 24h cap for all tips',
      },
    ]
  }, [config, formatCooldown])

  const configEntries: Array<{ key: ConfigKey; label: string; description: string; step?: number }> = [
    { key: 'basePoints', label: 'Base mention points', description: 'Starting points for any mention event.' },
    { key: 'directMentionMultiplier', label: 'Direct mention multiplier', description: 'Applied when the bot handle is mentioned in a standalone cast.', step: 0.1 },
    { key: 'replyMentionMultiplier', label: 'Reply multiplier', description: 'Applied when the bot is mentioned in a reply thread.', step: 0.1 },
    { key: 'keywordMentionMultiplier', label: 'Keyword ping multiplier', description: 'Applied when a keyword (e.g. $gmeowbased) triggers a tip.', step: 0.1 },
  ]

  const cooldownEntries: Array<{ key: ConfigKey; label: string; description: string; step?: number }> = [
    { key: 'mentionCooldownMinutes', label: 'Global cooldown (mins)', description: 'Minimum minutes between any two awarded mentions.' },
    { key: 'actorCooldownMinutes', label: 'Actor cooldown (mins)', description: 'Minimum minutes between awards for the same Farcaster actor.' },
    { key: 'actorDailyCap', label: 'Actor cap (24h)', description: 'Maximum points a single actor can earn in a rolling 24h window.' },
    { key: 'globalDailyCap', label: 'Global cap (24h)', description: 'Maximum points the system can emit in a rolling 24h window.' },
  ]

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="pixel-section-title text-base">Tip scoring controls</h3>
          <p className="text-[11px] text-[var(--px-sub)]">
            Define weighting and cooldown logic for mention-driven tips, then preview how the rules behave before wiring ingestion.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={resetConfig}
            className="pixel-button btn-sm border-white dark:border-slate-700/20 bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5 text-slate-950 dark:text-slate-950 dark:text-white hover:border-emerald-300/40 hover:bg-emerald-500/10 hover:text-emerald-100"
          >
            Reset defaults
          </button>
          <button
            type="button"
            onClick={handleCopyConfig}
            className="pixel-button btn-sm border-emerald-400/40 bg-emerald-500/10 text-emerald-100 hover:border-emerald-300/60 hover:bg-emerald-400/20"
          >
            {copied ? 'Copied config ✓' : 'Copy config JSON'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryHighlights.map((item) => (
          <div
            key={item.key}
            className="rounded-2xl border border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5 p-4 shadow-[0_14px_36px_-24px_rgba(45,212,191,0.45)] backdrop-blur transition hover:border-emerald-400/30 hover:bg-slate-100/10 dark:bg-slate-100/90 dark:bg-white/5"
          >
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-950 dark:text-white/60">{item.label}</div>
            <div className="mt-2 text-2xl font-semibold text-emerald-200">{item.value}</div>
            <div className="mt-1 text-[11px] text-[var(--px-sub)]">{item.hint}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-3">
          {configEntries.map((entry) => (
            <label key={entry.key} className="block text-[12px] text-slate-950 dark:text-white/85">
              <span className="mb-1 block font-semibold text-slate-950 dark:text-white">{entry.label}</span>
              <p className="mb-2 text-[11px] text-[var(--px-sub)]">{entry.description}</p>
              <input
                className="pixel-input w-full"
                type="number"
                step={entry.step ?? 1}
                min={MINIMUMS[entry.key]}
                value={config[entry.key]}
                onChange={handleInputChange(entry.key)}
              />
            </label>
          ))}
        </div>

        <div className="space-y-3">
          {cooldownEntries.map((entry) => (
            <label key={entry.key} className="block text-[12px] text-slate-950 dark:text-white/85">
              <span className="mb-1 block font-semibold text-slate-950 dark:text-white">{entry.label}</span>
              <p className="mb-2 text-[11px] text-[var(--px-sub)]">{entry.description}</p>
              <input
                className="pixel-input w-full"
                type="number"
                step={entry.step ?? 1}
                min={MINIMUMS[entry.key]}
                value={config[entry.key]}
                onChange={handleInputChange(entry.key)}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white dark:border-slate-700/10 bg-black dark:bg-slate-950/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="pixel-section-title text-sm">Preview timeline</h4>
            <p className="text-[11px] text-[var(--px-sub)]">Simulated mention stream based on the current scoring configuration.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-950 dark:text-white/75">
            <span className="pixel-pill border border-emerald-400/40 bg-emerald-500/10 text-emerald-100">
              Awarded: {totalAwarded} pts
            </span>
            <span className="pixel-pill border border-amber-400/40 bg-amber-500/10 text-amber-200">
              Suppressed: {suppressedCount}
            </span>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-left text-[11px] text-slate-950 dark:text-white/80">
            <thead>
              <tr>
                <th className="px-3 py-2 font-semibold text-slate-950 dark:text-white/70">Event</th>
                <th className="px-3 py-2 font-semibold text-slate-950 dark:text-white/70">Actor</th>
                <th className="px-3 py-2 font-semibold text-slate-950 dark:text-white/70">Outcome</th>
                <th className="px-3 py-2 font-semibold text-slate-950 dark:text-white/70 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {preview.timeline.map(({ event, outcome }) => (
                <tr key={event.id} className={clsx(outcome.suppressed ? 'opacity-70' : 'opacity-100')}>
                  <td className="px-3 py-2">
                    <div className="font-semibold text-slate-950 dark:text-white">
                      {event.type === 'direct_mention' && 'Direct mention'}
                      {event.type === 'reply_mention' && 'Reply mention'}
                      {event.type === 'keyword_signal' && 'Keyword ping'}
                    </div>
                    <div className="text-[10px] text-[var(--px-sub)]">
                      Multiplier {numberFormatter.format(outcome.multiplier)} · next eligible {formatRelative(outcome.nextEligibleAt)}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div>{outcome.actorId}</div>
                    <div className="text-[10px] text-[var(--px-sub)]">
                      24h actor: {pointFormatter.format(outcome.actorPoints24h)} pts
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={clsx(
                        'pixel-pill inline-block border px-2 py-1',
                        outcome.suppressed
                          ? 'border-amber-400/40 bg-amber-500/10 text-amber-200'
                          : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
                      )}
                    >
                      {formatReason(outcome.reason)}
                    </span>
                    <div className="mt-1 text-[10px] text-[var(--px-sub)]">
                      Global 24h: {pointFormatter.format(outcome.globalPoints24h)} pts
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-[12px] font-semibold text-slate-950 dark:text-white">
                    {pointFormatter.format(outcome.awardedPoints)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
