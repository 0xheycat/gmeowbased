/**
 * @file components/admin/BotStatsConfigPanel.tsx
 * 
 * Bot Stats Response Engine Configuration Panel
 * Admin UI for configuring bot auto-reply triggers, cooldowns, and Neynar score thresholds.
 * 
 * PHASE: Phase 1 - Week 3 (December 2025)
 * DATE: Updated December 16, 2025
 * STATUS: ✅ IMPLEMENTED (minNeynarScore field added)
 * 
 * TODO:
 * - [ ] Add real-time config validation preview (show sample cast matching)
 * - [ ] Add A/B testing toggle for new config variants
 * - [ ] Add config version history (rollback capability)
 * - [ ] Add "Test Configuration" button to simulate targeting
 * 
 * FEATURES:
 * - ✅ Mention triggers configuration (multi-line input)
 * - ✅ Signal keywords configuration
 * - ✅ Question starters configuration
 * - ✅ Response variants (rotated phrases)
 * - ✅ Cooldown minutes (rate limiting)
 * - ✅ Repeat cooldown minutes
 * - ✅ XP delta threshold
 * - ✅ Minimum Neynar score threshold (0.0-1.0)
 * - ✅ Require question mark toggle
 * - ✅ Dirty state tracking
 * - ✅ Reset defaults & revert changes
 * 
 * REFERENCE DOCUMENTATION:
 * - FARCASTER-BOT-ENHANCEMENT-PLAN-PART-2.md (Section 4.7: Edge Cases & Exploits)
 * - FARCASTER-BOT-ENHANCEMENT-PLAN-PART-1.md (Section 3.3: Bot Targeting Logic)
 * 
 * CRITICAL FINDINGS:
 * ⚠️ NEYNAR SCORE: Set to 0 disables quality gate (allow all casts)
 * ⚠️ COOLDOWN: Too low (<5 min) may cause spam, too high (>60 min) reduces engagement
 * ⚠️ KEYWORDS: Case-insensitive matching, avoid overly broad terms
 * 
 * REQUIREMENTS FROM farcaster.instructions.md:
 * - Config stored in Supabase (bot_config table)
 * - Changes take effect within 3 minutes (config refresh interval)
 * - Admin-only access (session validation required)
 * - Network: Base (ChainID: 8453)
 */

'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import clsx from 'clsx'

import type { BotStatsConfig } from '@/lib/bot/config/types'
import { DEFAULT_BOT_STATS_CONFIG } from '@/lib/bot/config/types'

const SESSION_EXPIRED_MESSAGE = 'Admin session expired. Please sign in again.'

type ConfigResponse = {
  ok: boolean
  config: BotStatsConfig
  warning?: string
  error?: string
  message?: string
}

function arrayToMultiline(values: string[] | null | undefined): string {
  if (!values?.length) return ''
  return values.join('\n')
}

function multilineToArray(input: string): string[] {
  return input
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

function normaliseNumberInput(value: string, fallback: number): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return numeric
}

type FormState = {
  mentionMatchers: string
  signalKeywords: string
  questionStarters: string
  responseVariants: string
  requireQuestionMark: boolean
  cooldownMinutes: string
  repeatCooldownMinutes: string
  minDeltaPoints: string
  minNeynarScore: string
}

function toFormState(config: BotStatsConfig): FormState {
  return {
    mentionMatchers: arrayToMultiline(config.mentionMatchers),
    signalKeywords: arrayToMultiline(config.signalKeywords),
    questionStarters: arrayToMultiline(config.questionStarters),
    responseVariants: arrayToMultiline(config.responseVariants ?? []),
    requireQuestionMark: Boolean(config.requireQuestionMark),
    cooldownMinutes: String(config.cooldownMinutes ?? DEFAULT_BOT_STATS_CONFIG.cooldownMinutes),
    repeatCooldownMinutes: String(config.repeatCooldownMinutes ?? DEFAULT_BOT_STATS_CONFIG.repeatCooldownMinutes),
    minDeltaPoints: String(config.minDeltaPoints ?? DEFAULT_BOT_STATS_CONFIG.minDeltaPoints),
    // @edit-start 2025-02-15 — Surface Neynar score threshold in admin UI
    minNeynarScore: String(
      typeof config.minNeynarScore === 'number'
        ? config.minNeynarScore
        : DEFAULT_BOT_STATS_CONFIG.minNeynarScore,
    ),
    // @edit-end
  }
}

function toConfigPayload(form: FormState): Partial<BotStatsConfig> {
  const minScore = normaliseNumberInput(form.minNeynarScore, DEFAULT_BOT_STATS_CONFIG.minNeynarScore)
  const clampedScore = Math.max(0, Math.min(1, minScore))

  return {
    mentionMatchers: multilineToArray(form.mentionMatchers),
    signalKeywords: multilineToArray(form.signalKeywords),
    questionStarters: multilineToArray(form.questionStarters),
    responseVariants: multilineToArray(form.responseVariants),
    requireQuestionMark: form.requireQuestionMark,
    cooldownMinutes: normaliseNumberInput(form.cooldownMinutes, DEFAULT_BOT_STATS_CONFIG.cooldownMinutes),
    repeatCooldownMinutes: normaliseNumberInput(form.repeatCooldownMinutes, DEFAULT_BOT_STATS_CONFIG.repeatCooldownMinutes),
    minDeltaPoints: normaliseNumberInput(form.minDeltaPoints, DEFAULT_BOT_STATS_CONFIG.minDeltaPoints),
    // @edit-start 2025-02-15 — Persist Neynar score threshold from admin UI
    minNeynarScore: clampedScore,
    // @edit-end
  }
}

function configsEqual(a: BotStatsConfig | null, b: BotStatsConfig | null): boolean {
  if (!a || !b) return false
  const keys: Array<keyof BotStatsConfig> = [
    'mentionMatchers',
    'signalKeywords',
    'questionStarters',
    'requireQuestionMark',
    'cooldownMinutes',
    'repeatCooldownMinutes',
    'minDeltaPoints',
    // @edit-start 2025-02-15 — Track Neynar score threshold in dirty checks
    'minNeynarScore',
    // @edit-end
    'responseVariants',
  ]
  return keys.every((key) => {
    if (Array.isArray(a[key]) || Array.isArray(b[key])) {
      const aValues = Array.isArray(a[key]) ? (a[key] as string[]) : []
      const bValues = Array.isArray(b[key]) ? (b[key] as string[]) : []
      return aValues.join('|') === bValues.join('|')
    }
    return a[key] === b[key]
  })
}

export default function BotStatsConfigPanel() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [serverConfig, setServerConfig] = useState<BotStatsConfig | null>(null)
  const [form, setForm] = useState<FormState>(() => toFormState(DEFAULT_BOT_STATS_CONFIG))

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    setError(null)
    setWarning(null)
    try {
      const response = await fetch('/api/admin/bot/config', { cache: 'no-store' })
      if (response.status === 401) {
        throw new Error(SESSION_EXPIRED_MESSAGE)
      }
      const payload = (await response.json()) as ConfigResponse
      if (!response.ok || !payload.ok) {
        const message = payload?.message || payload?.error || `HTTP ${response.status}`
        throw new Error(message)
      }
      setServerConfig(payload.config)
      setForm(toFormState(payload.config))
      if (payload.warning) setWarning(payload.warning)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load bot stats config'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchConfig()
  }, [fetchConfig])

  const dirty = useMemo(() => {
    if (!serverConfig) return false
    const payload = toConfigPayload(form)
    return !configsEqual(serverConfig, payload as BotStatsConfig)
  }, [form, serverConfig])

  const handleChange = useCallback(
    (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.type === 'checkbox'
        ? (event.target as HTMLInputElement).checked
        : event.target.value
      setForm((prev) => ({
        ...prev,
        [field]: value,
      }))
      setSuccess(null)
    },
    []
  )

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    const payload = toConfigPayload(form)

    try {
      const response = await fetch('/api/admin/bot/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = (await response.json().catch(() => null)) as ConfigResponse | null
      if (response.status === 401) {
        throw new Error(SESSION_EXPIRED_MESSAGE)
      }
      if (!response.ok || !json?.ok) {
        const message = json?.message || json?.error || `HTTP ${response.status}`
        throw new Error(message)
      }
      setServerConfig(json.config)
      setForm(toFormState(json.config))
      setSuccess('Configuration saved. New triggers take effect within a few minutes.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to persist configuration'
      setError(message)
    } finally {
      setSaving(false)
    }
  }, [form, saving])

  const handleResetDefaults = useCallback(() => {
    setForm(toFormState(DEFAULT_BOT_STATS_CONFIG))
    setSuccess(null)
    setWarning(null)
  }, [])

  const handleRevert = useCallback(() => {
    if (serverConfig) {
      setForm(toFormState(serverConfig))
      setSuccess(null)
    }
  }, [serverConfig])

  return (
    <section className="pixel-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="pixel-section-title text-base">Stats Response Engine</h2>
          <p className="text-[11px] text-[var(--px-sub)]">
            Control how @gmeowbased recognises stats casts, throttles repeats, and flavours responses for community requests.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--px-sub)]">
          {dirty ? <span className="pixel-pill border-amber-400/40 bg-amber-500/10 text-amber-200">Unsaved changes</span> : null}
          {saving ? <span className="pixel-pill border-white dark:border-slate-700/15 bg-slate-100/10 dark:bg-white/5 text-slate-950 dark:text-white/70">Saving…</span> : null}
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-[12px] text-red-100">
          <div className="font-semibold">Unable to load configuration</div>
          <p className="mt-1 leading-relaxed">{error}</p>
        </div>
      ) : null}

      {warning ? (
        <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-[12px] text-amber-100">
          <div className="font-semibold">Loaded with warnings</div>
          <p className="mt-1 leading-relaxed">{warning}</p>
        </div>
      ) : null}

      {success ? (
        <div className="mt-4 rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-3 text-[12px] text-emerald-100">
          {success}
        </div>
      ) : null}

      <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-1 text-[11px] text-[var(--px-sub)]">
            Mention triggers
            <textarea
              className="min-h-[90px] rounded-xl border border-slate-200 dark:border-slate-700/10 bg-black dark:bg-slate-950/20 px-3 py-2 text-sm text-slate-950 dark:text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
              value={form.mentionMatchers}
              onChange={handleChange('mentionMatchers')}
              placeholder="@gmeowbased\n#gmeowbased"
            />
            <span className="text-[10px] text-slate-950 dark:text-white/60">One per line. Bot only responds when at least one mention matches.</span>
          </label>

          <label className="flex flex-col gap-1 text-[11px] text-[var(--px-sub)]">
            Signal keywords
            <textarea
              className="min-h-[90px] rounded-xl border border-slate-200 dark:border-slate-700/10 bg-black dark:bg-slate-950/20 px-3 py-2 text-sm text-slate-950 dark:text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
              value={form.signalKeywords}
              onChange={handleChange('signalKeywords')}
              placeholder="stats\nrank\nlevel"
            />
            <span className="text-[10px] text-slate-950 dark:text-white/60">Lowercase keywords that must appear in the cast text.</span>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-1 text-[11px] text-[var(--px-sub)]">
            Question starters
            <textarea
              className="min-h-[80px] rounded-xl border border-slate-200 dark:border-slate-700/10 bg-black dark:bg-slate-950/20 px-3 py-2 text-sm text-slate-950 dark:text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
              value={form.questionStarters}
              onChange={handleChange('questionStarters')}
              placeholder="what\nhow\nshow"
            />
            <span className="text-[10px] text-slate-950 dark:text-white/60">If no question mark is present, the cast must start with one of these verbs.</span>
          </label>

          <label className="flex flex-col gap-1 text-[11px] text-[var(--px-sub)]">
            Response variants
            <textarea
              className="min-h-[80px] rounded-xl border border-slate-200 dark:border-slate-700/10 bg-black dark:bg-slate-950/20 px-3 py-2 text-sm text-slate-950 dark:text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
              value={form.responseVariants}
              onChange={handleChange('responseVariants')}
              placeholder="Signal sync complete\nTelemetry uplink secure"
            />
            <span className="text-[10px] text-slate-950 dark:text-white/60">Optional intro phrases rotated to avoid repetitive tone.</span>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <label className="flex flex-col gap-1 text-[11px] text-[var(--px-sub)]">
            Cooldown minutes
            <input
              className="rounded-xl border border-slate-200 dark:border-slate-700/10 bg-black dark:bg-slate-950/20 px-3 py-2 text-sm text-slate-950 dark:text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
              type="number"
              min={1}
              max={240}
              value={form.cooldownMinutes}
              onChange={handleChange('cooldownMinutes')}
            />
            <span className="text-[10px] text-slate-950 dark:text-white/60">Minimum delay between full stat replies per user.</span>
          </label>

          <label className="flex flex-col gap-1 text-[11px] text-[var(--px-sub)]">
            Repeat question minutes
            <input
              className="rounded-xl border border-slate-200 dark:border-slate-700/10 bg-black dark:bg-slate-950/20 px-3 py-2 text-sm text-slate-950 dark:text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
              type="number"
              min={1}
              max={120}
              value={form.repeatCooldownMinutes}
              onChange={handleChange('repeatCooldownMinutes')}
            />
            <span className="text-[10px] text-slate-950 dark:text-white/60">Time before identical prompts get a fresh reply.</span>
          </label>

          <label className="flex flex-col gap-1 text-[11px] text-[var(--px-sub)]">
            XP delta threshold
            <input
              className="rounded-xl border border-slate-200 dark:border-slate-700/10 bg-black dark:bg-slate-950/20 px-3 py-2 text-sm text-slate-950 dark:text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
              type="number"
              min={0}
              max={5000}
              value={form.minDeltaPoints}
              onChange={handleChange('minDeltaPoints')}
            />
            <span className="text-[10px] text-slate-950 dark:text-white/60">Used to highlight progress when XP moves beyond this threshold.</span>
          </label>

          <label className="flex flex-col gap-1 text-[11px] text-[var(--px-sub)]">
            Minimum Neynar score
            <input
              className="rounded-xl border border-slate-200 dark:border-slate-700/10 bg-black dark:bg-slate-950/20 px-3 py-2 text-sm text-slate-950 dark:text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={form.minNeynarScore}
              onChange={handleChange('minNeynarScore')}
            />
            <span className="text-[10px] text-slate-950 dark:text-white/60">
              Casts only receive auto replies when their Neynar score meets this bar. Set to 0 to disable the gate.
            </span>
          </label>
        </div>

        <label className="flex items-center gap-2 text-[12px] text-slate-950 dark:text-white/80">
          <input
            className="h-4 w-4 rounded border-white dark:border-slate-700/30 bg-black dark:bg-slate-950/40 text-emerald-400 focus:ring-emerald-400"
            type="checkbox"
            checked={form.requireQuestionMark}
            onChange={handleChange('requireQuestionMark')}
          />
          Require question mark in addition to keywords
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className={clsx('pixel-button btn-sm disabled:opacity-50', { 'cursor-not-allowed opacity-60': !dirty || saving })}
            type="submit"
            disabled={!dirty || saving || loading}
          >
            {saving ? 'Saving…' : 'Save configuration'}
          </button>
          <button
            className="pixel-button btn-sm border-white dark:border-slate-700/15 bg-slate-100/10 dark:bg-white/5 text-slate-950 dark:text-white/70 hover:border-emerald-300/40 hover:bg-emerald-500/10 hover:text-emerald-100"
            type="button"
            onClick={handleRevert}
            disabled={!dirty || saving}
          >
            Revert changes
          </button>
          <button
            className="pixel-button btn-sm border-amber-400/40 bg-amber-500/10 text-amber-100 hover:border-amber-300/50 hover:bg-amber-400/20"
            type="button"
            onClick={handleResetDefaults}
            disabled={saving}
          >
            Reset defaults
          </button>
          <span className="text-[11px] text-[var(--px-sub)]">
            Adjusting triggers updates the bot after the next config refresh (≈3 minutes).
          </span>
        </div>
      </form>
    </section>
  )
}
