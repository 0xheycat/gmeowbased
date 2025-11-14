'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import clsx from 'clsx'

import { CHAIN_KEYS, CHAIN_LABEL, type ChainKey } from '@/lib/gm-utils'
import {
  type PartnerRequirementKind,
  type PartnerSnapshotSummaryPayload,
} from '@/lib/partner-snapshot'
import { useLegacyNotificationAdapter } from '@/components/ui/live-notifications'

const REQUIREMENT_OPTIONS: Array<{ value: PartnerRequirementKind; label: string; description: string }> = [
  { value: 'points', label: 'GMEOW points', description: 'Validate native points held in-contract on the selected chains.' },
  { value: 'erc20', label: 'ERC-20 balance', description: 'Check an ERC-20 token balance across the selected networks.' },
  { value: 'erc721', label: 'ERC-721 balance', description: 'Require ownership of one or more NFTs from a collection.' },
  { value: 'erc1155', label: 'ERC-1155 balance', description: 'Gate on ERC-1155 token holdings for a specific token ID.' },
]

const DEFAULT_MINIMUM: Record<PartnerRequirementKind, string> = {
  points: '100',
  erc20: '1',
  erc721: '1',
  erc1155: '1',
}

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/

const EMPTY_OBJECT_PRETTY = '{\n  "campaign": ""\n}'

type SnapshotHistoryEntry = {
  snapshotId: string
  partner: string
  computedAt: string
  totalAddresses: number
  eligibleCount: number
  ineligibleCount: number
  chains: Array<{ chain: string; total: number; eligible: number; ineligible: number }>
  requirement: PartnerSnapshotSummaryPayload['requirement']
  metadata: Record<string, unknown> | null
}

type FormErrors = Partial<Record<'partnerName' | 'chains' | 'minimum' | 'contractAddress' | 'tokenId' | 'metadata' | 'maxAddressesPerChain', string>>

function sanitizeIntegerInput(value: string) {
  return value.replace(/[^0-9]/g, '')
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return '0'
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 10_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}

function formatChainLabel(chain: string) {
  const normalized = chain.toLowerCase() as ChainKey
  return CHAIN_LABEL[normalized] ?? chain.toUpperCase()
}

function formatRequirementDescriptor(requirement: PartnerSnapshotSummaryPayload['requirement'] | null | undefined) {
  if (!requirement) return '—'
  switch (requirement.kind) {
    case 'points':
      return `≥ ${requirement.minimum} points`
    case 'erc20':
      return `ERC-20 ${requirement.address} · ≥ ${requirement.minimum}`
    case 'erc721':
      return `ERC-721 ${requirement.address} · ≥ ${requirement.minimum}`
    case 'erc1155':
      return `ERC-1155 ${requirement.address} · token ${requirement.tokenId} · ≥ ${requirement.minimum}`
    default:
      return '—'
  }
}

function buildRequirementSummary(summary: PartnerSnapshotSummaryPayload | null) {
  if (!summary) return '—'
  return formatRequirementDescriptor(summary.requirement)
}

function stringifyJson(input: Record<string, unknown> | null | undefined) {
  if (!input) return null
  try {
    return JSON.stringify(input, null, 2)
  } catch (error) {
    console.warn('Failed to stringify metadata payload', error)
    return null
  }
}

export default function PartnerSnapshotPanel() {
  const notify = useLegacyNotificationAdapter()
  const [partnerName, setPartnerName] = useState('')
  const [snapshotId, setSnapshotId] = useState('')
  const [requirementKind, setRequirementKind] = useState<PartnerRequirementKind>('points')
  const [minimum, setMinimum] = useState(DEFAULT_MINIMUM.points)
  const [contractAddress, setContractAddress] = useState('')
  const [tokenId, setTokenId] = useState('0')
  const [metadataJson, setMetadataJson] = useState(EMPTY_OBJECT_PRETTY)
  const [maxAddressesPerChain, setMaxAddressesPerChain] = useState('')
  const [selectedChains, setSelectedChains] = useState<Set<ChainKey>>(() => new Set<ChainKey>(CHAIN_KEYS))
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [responseError, setResponseError] = useState<string | null>(null)
  const [requestPreview, setRequestPreview] = useState<Record<string, unknown> | null>(null)
  const [summary, setSummary] = useState<PartnerSnapshotSummaryPayload | null>(null)
  const [lastRunAt, setLastRunAt] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [history, setHistory] = useState<SnapshotHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const response = await fetch('/api/snapshot?limit=6', { cache: 'no-store' })
      const json = await response.json().catch(() => ({})) as { ok?: boolean; history?: unknown; message?: string }
      if (!response.ok || json?.ok === false) {
        const message = typeof json?.message === 'string' ? json.message : `History request failed (HTTP ${response.status})`
        throw new Error(message)
      }

      const rawHistory = Array.isArray(json?.history) ? json.history : []
      const mapped: SnapshotHistoryEntry[] = rawHistory
        .map((entry) => {
          const snapshotId = typeof (entry as any)?.snapshotId === 'string' ? (entry as any).snapshotId : ''
          if (!snapshotId) return null
          const partner = typeof (entry as any)?.partner === 'string' ? (entry as any).partner : 'Unknown partner'
          const computedAt = typeof (entry as any)?.computedAt === 'string' ? (entry as any).computedAt : new Date(0).toISOString()
          const totalAddresses = Number((entry as any)?.totalAddresses ?? 0)
          const eligibleCount = Number((entry as any)?.eligibleCount ?? 0)
          const ineligibleCount = Number((entry as any)?.ineligibleCount ?? Math.max(totalAddresses - eligibleCount, 0))

          const requirementInput = (entry as any)?.requirement ?? {}
          const requirementKind = requirementInput?.kind as PartnerRequirementKind | undefined
          const requirementMinimum = typeof requirementInput?.minimum === 'string'
            ? requirementInput.minimum
            : `${requirementInput?.minimum ?? '0'}`

          const requirement: PartnerSnapshotSummaryPayload['requirement'] = (() => {
            switch (requirementKind) {
              case 'erc20':
              case 'erc721':
                return {
                  kind: requirementKind,
                  address: typeof requirementInput?.address === 'string' ? requirementInput.address : '',
                  minimum: requirementMinimum,
                }
              case 'erc1155':
                return {
                  kind: 'erc1155',
                  address: typeof requirementInput?.address === 'string' ? requirementInput.address : '',
                  tokenId: typeof requirementInput?.tokenId === 'string'
                    ? requirementInput.tokenId
                    : `${requirementInput?.tokenId ?? '0'}`,
                  minimum: requirementMinimum,
                }
              case 'points':
              default:
                return {
                  kind: 'points',
                  minimum: requirementMinimum,
                }
            }
          })()

          const chains = Array.isArray((entry as any)?.chains)
            ? (entry as any).chains.map((chainEntry: any) => ({
              chain: typeof chainEntry?.chain === 'string' ? chainEntry.chain : 'unknown',
              total: Number(chainEntry?.total ?? 0),
              eligible: Number(chainEntry?.eligible ?? 0),
              ineligible: Number(chainEntry?.ineligible ?? 0),
            }))
            : []

          const metadata = (entry as any)?.metadata && typeof (entry as any).metadata === 'object'
            ? (entry as any).metadata as Record<string, unknown>
            : null

          return {
            snapshotId,
            partner,
            computedAt,
            totalAddresses,
            eligibleCount,
            ineligibleCount,
            chains,
            requirement,
            metadata,
          }
        })
        .filter((item): item is SnapshotHistoryEntry => Boolean(item?.snapshotId))

      setHistory(mapped)
    } catch (error) {
      const message = (error as Error)?.message ?? 'Unable to load snapshot history.'
      setHistoryError(message)
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchHistory()
  }, [fetchHistory])

  const chainSelections = useMemo(() => CHAIN_KEYS.map((key) => ({ key, label: CHAIN_LABEL[key] })), [])

  const summaryRequirementLabel = useMemo(() => buildRequirementSummary(summary), [summary])

  const chainSummaryEntries = useMemo(() => {
    if (!summary) return []
    return CHAIN_KEYS.filter((chain) => summary.chains?.[chain])
      .map((chain) => ({ chain, stats: summary.chains[chain]! }))
  }, [summary])

  const handleChainToggle = useCallback((chain: ChainKey) => {
    setSelectedChains((prev) => {
      const next = new Set(prev)
      if (next.has(chain)) next.delete(chain)
      else next.add(chain)
      return next
    })
    setFormErrors((prev) => ({ ...prev, chains: undefined }))
  }, [])

  const handleSelectAllChains = useCallback(() => {
    setSelectedChains(new Set<ChainKey>(CHAIN_KEYS))
    setFormErrors((prev) => ({ ...prev, chains: undefined }))
  }, [])

  const handleClearChains = useCallback(() => {
    setSelectedChains(new Set<ChainKey>())
  }, [])

  const handleRequirementSwitch = useCallback((nextKind: PartnerRequirementKind) => {
    setRequirementKind(nextKind)
    setMinimum((prev) => (prev.trim().length ? prev : DEFAULT_MINIMUM[nextKind]))
    if (nextKind === 'points') {
      setContractAddress('')
      setTokenId('0')
    } else if (nextKind === 'erc1155') {
      setTokenId((prev) => (prev && prev !== '0' ? prev : '0'))
    } else {
      setTokenId('')
    }
    setFormErrors((prev) => ({ ...prev, contractAddress: undefined, tokenId: undefined, minimum: undefined }))
  }, [])

  const handleReset = useCallback(() => {
    setPartnerName('')
    setSnapshotId('')
    setRequirementKind('points')
    setMinimum(DEFAULT_MINIMUM.points)
    setContractAddress('')
    setTokenId('0')
    setMetadataJson(EMPTY_OBJECT_PRETTY)
    setMaxAddressesPerChain('')
    setSelectedChains(new Set<ChainKey>(CHAIN_KEYS))
    setFormErrors({})
    setResponseError(null)
  }, [])

  const handleSubmit = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (submitting) return

    const errors: FormErrors = {}
    const trimmedPartner = partnerName.trim()
    if (!trimmedPartner) {
      errors.partnerName = 'Enter a partner name.'
    }

    const chains = Array.from(selectedChains)
    if (!chains.length) {
      errors.chains = 'Select at least one chain.'
    }

    const trimmedMinimum = minimum.trim()
    if (!trimmedMinimum) {
      errors.minimum = 'Enter the minimum balance or points required.'
    } else if (!/^[0-9]+$/.test(trimmedMinimum)) {
      errors.minimum = 'Minimum must be a whole number.'
    } else if (BigInt(trimmedMinimum) <= 0n) {
      errors.minimum = 'Minimum must be greater than zero.'
    }

    let trimmedAddress = contractAddress.trim()
    if (requirementKind !== 'points') {
      if (!trimmedAddress) {
        errors.contractAddress = 'Enter the contract address for this requirement.'
      } else if (!ADDRESS_REGEX.test(trimmedAddress)) {
        errors.contractAddress = 'Contract address must be a valid 0x… string.'
      } else {
        trimmedAddress = trimmedAddress.toLowerCase()
      }
    }

    const trimmedTokenId = tokenId.trim()
    if (requirementKind === 'erc1155') {
      if (!trimmedTokenId) {
        errors.tokenId = 'Provide the ERC-1155 token ID to check.'
      } else if (!/^[0-9]+$/.test(trimmedTokenId)) {
        errors.tokenId = 'Token ID must be a whole number.'
      }
    }

    const trimmedMetadata = metadataJson.trim()
    let metadata: Record<string, unknown> | undefined
    if (trimmedMetadata) {
      try {
        const parsed = JSON.parse(trimmedMetadata)
        if (parsed && typeof parsed === 'object') {
          metadata = parsed as Record<string, unknown>
        } else {
          errors.metadata = 'Metadata must be a JSON object.'
        }
      } catch (error: any) {
        errors.metadata = error?.message || 'Metadata must be valid JSON.'
      }
    }

    const trimmedMax = maxAddressesPerChain.trim()
    let maxAddresses: number | undefined
    if (trimmedMax) {
      const parsed = Number.parseInt(trimmedMax, 10)
      if (!Number.isFinite(parsed) || parsed <= 0) {
        errors.maxAddressesPerChain = 'Max addresses per chain must be a positive integer.'
      } else {
        maxAddresses = parsed
      }
    }

    setFormErrors(errors)
    if (Object.keys(errors).length > 0) {
      const firstMessage = Object.values(errors).find(Boolean)
      if (firstMessage) {
        notify({ type: 'error', title: 'Fix the highlighted fields', message: firstMessage })
      }
      return
    }

    const payload: Record<string, unknown> = {
      partnerName: trimmedPartner,
      chains,
      requirement: { kind: requirementKind, minimum: trimmedMinimum },
    }

    if (requirementKind !== 'points') {
      Object.assign(payload.requirement as Record<string, unknown>, { address: trimmedAddress })
    }

    if (requirementKind === 'erc1155') {
      Object.assign(payload.requirement as Record<string, unknown>, { tokenId: trimmedTokenId })
    }

    if (metadata) {
      payload.metadata = metadata
    }

    if (maxAddresses !== undefined) {
      payload.maxAddressesPerChain = maxAddresses
    }

    const trimmedSnapshotId = snapshotId.trim()
    if (trimmedSnapshotId) {
      payload.snapshotId = trimmedSnapshotId
    }

    setSubmitting(true)
    setResponseError(null)
    setFormErrors({})
    setRequestPreview({ ...payload, requirement: { ...(payload.requirement as Record<string, unknown>) } })

    try {
      const response = await fetch('/api/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      let json: any = null
      try {
        json = await response.json()
      } catch {
        json = null
      }
      if (!response.ok || !json?.ok) {
        const message = typeof json?.message === 'string' ? json.message : `Snapshot failed (HTTP ${response.status})`
        throw new Error(message)
      }

      const summaryPayload = json.summary as PartnerSnapshotSummaryPayload
      setSummary(summaryPayload)
      setLastRunAt(new Date().toISOString())
      notify({
        type: 'success',
        title: 'Snapshot complete',
        message: `Processed ${formatNumber(summaryPayload.totalAddresses)} addresses in ${summaryPayload.durationMs.toLocaleString()}ms.`,
      })
      await fetchHistory()
    } catch (error: any) {
      const message = error?.message || 'Unable to generate partner snapshot.'
      setResponseError(message)
      notify({ type: 'error', title: 'Snapshot failed', message })
    } finally {
      setSubmitting(false)
    }
  }, [submitting, partnerName, selectedChains, minimum, requirementKind, contractAddress, tokenId, metadataJson, maxAddressesPerChain, snapshotId, notify, fetchHistory])

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-sky-500/5">
      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="pixel-section-title text-lg">Partner allowlist snapshots</h2>
            <p className="text-[11px] text-[var(--px-sub)]">
              Generate Gmeow rows for partner campaigns by checking on-chain balances across multiple networks.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="pixel-button btn-sm"
              onClick={handleReset}
              disabled={submitting}
            >
              Reset form
            </button>
            <button
              type="submit"
              className="pixel-button btn-sm border-sky-400/60 bg-sky-500/20 text-sky-50 hover:border-sky-300/60"
              disabled={submitting}
            >
              {submitting ? 'Running…' : 'Run snapshot'}
            </button>
          </div>
        </div>

        {responseError ? (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/15 p-4 text-sm text-rose-100">
            <div className="font-semibold">Snapshot failed</div>
            <p className="mt-1 text-[12px]">{responseError}</p>
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <h3 className="pixel-section-title text-base">Partner details</h3>
              <div className="mt-4 grid gap-4">
                <label className="flex flex-col gap-1 text-[12px]">
                  <span>Partner name</span>
                  <input
                    className="pixel-input"
                    placeholder="e.g. Base Ecosystem Boost"
                    value={partnerName}
                    onChange={(event) => setPartnerName(event.target.value)}
                    aria-invalid={Boolean(formErrors.partnerName)}
                  />
                  {formErrors.partnerName ? <span className="text-[11px] text-amber-200">{formErrors.partnerName}</span> : null}
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-[12px]">
                    <span>Snapshot ID (optional)</span>
                    <input
                      className="pixel-input"
                      placeholder="auto-generated if blank"
                      value={snapshotId}
                      onChange={(event) => setSnapshotId(event.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[12px]">
                    <span>Max addresses / chain</span>
                    <input
                      className="pixel-input"
                      placeholder="leave blank for all"
                      value={maxAddressesPerChain}
                      onChange={(event) => setMaxAddressesPerChain(sanitizeIntegerInput(event.target.value))}
                      aria-invalid={Boolean(formErrors.maxAddressesPerChain)}
                    />
                    {formErrors.maxAddressesPerChain ? <span className="text-[11px] text-amber-200">{formErrors.maxAddressesPerChain}</span> : null}
                  </label>
                </div>
                <label className="flex flex-col gap-1 text-[12px]">
                  <span>Metadata (JSON, optional)</span>
                  <textarea
                    className="pixel-input min-h-[120px]"
                    value={metadataJson}
                    onChange={(event) => setMetadataJson(event.target.value)}
                    aria-invalid={Boolean(formErrors.metadata)}
                  />
                  {formErrors.metadata ? <span className="text-[11px] text-amber-200">{formErrors.metadata}</span> : null}
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <h3 className="pixel-section-title text-base">Eligible chains</h3>
              <p className="mt-1 text-[11px] text-[var(--px-sub)]">Toggle the networks included in the partner snapshot.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {chainSelections.map((entry) => {
                  const active = selectedChains.has(entry.key)
                  return (
                    <button
                      key={entry.key}
                      type="button"
                      onClick={() => handleChainToggle(entry.key)}
                      className={clsx(
                        'pixel-pill px-3 py-1 text-[11px] tracking-[0.16em] transition',
                        active
                          ? 'border-sky-400/60 bg-sky-400/15 text-sky-100 shadow-[0_0_16px_rgba(56,189,248,0.35)]'
                          : 'border-white/12 bg-white/5 text-white/70 hover:border-sky-300/40 hover:text-white',
                      )}
                    >
                      {entry.label}
                    </button>
                  )
                })}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[var(--px-sub)]">
                <button
                  type="button"
                  onClick={handleSelectAllChains}
                  className="pixel-pill border border-sky-400/40 bg-sky-500/10 px-3 py-1 text-sky-50 transition hover:border-sky-300/60 hover:bg-sky-400/20"
                  disabled={selectedChains.size === CHAIN_KEYS.length}
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={handleClearChains}
                  className="pixel-pill border border-white/12 bg-white/5 px-3 py-1 text-white/70 transition hover:border-rose-300/40 hover:text-white disabled:opacity-50"
                  disabled={selectedChains.size === 0}
                >
                  Clear
                </button>
                <span>
                  {selectedChains.size} / {CHAIN_KEYS.length} chains selected
                </span>
              </div>
              {formErrors.chains ? <p className="mt-2 text-[11px] text-amber-200">{formErrors.chains}</p> : null}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <h3 className="pixel-section-title text-base">Requirement</h3>
            <p className="mt-1 text-[11px] text-[var(--px-sub)]">Configure the gating logic applied across the selected networks.</p>

            <div className="mt-4 grid gap-3">
              <label className="flex flex-col gap-1 text-[12px]">
                <span>Requirement kind</span>
                <select
                  className="pixel-input"
                  value={requirementKind}
                  onChange={(event) => handleRequirementSwitch(event.target.value as PartnerRequirementKind)}
                >
                  {REQUIREMENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-[var(--px-sub)]">
                  {REQUIREMENT_OPTIONS.find((option) => option.value === requirementKind)?.description}
                </span>
              </label>

              {requirementKind !== 'points' ? (
                <label className="flex flex-col gap-1 text-[12px]">
                  <span>Contract address</span>
                  <input
                    className="pixel-input"
                    placeholder="0x…"
                    value={contractAddress}
                    onChange={(event) => setContractAddress(event.target.value)}
                    aria-invalid={Boolean(formErrors.contractAddress)}
                  />
                  {formErrors.contractAddress ? <span className="text-[11px] text-amber-200">{formErrors.contractAddress}</span> : null}
                </label>
              ) : null}

              {requirementKind === 'erc1155' ? (
                <label className="flex flex-col gap-1 text-[12px]">
                  <span>ERC-1155 token ID</span>
                  <input
                    className="pixel-input"
                    placeholder="0"
                    value={tokenId}
                    onChange={(event) => setTokenId(sanitizeIntegerInput(event.target.value))}
                    aria-invalid={Boolean(formErrors.tokenId)}
                  />
                  {formErrors.tokenId ? <span className="text-[11px] text-amber-200">{formErrors.tokenId}</span> : null}
                </label>
              ) : null}

              <label className="flex flex-col gap-1 text-[12px]">
                <span>Minimum required</span>
                <input
                  className="pixel-input"
                  placeholder="e.g. 100"
                  value={minimum}
                  onChange={(event) => setMinimum(sanitizeIntegerInput(event.target.value))}
                  aria-invalid={Boolean(formErrors.minimum)}
                />
                {formErrors.minimum ? <span className="text-[11px] text-amber-200">{formErrors.minimum}</span> : null}
              </label>
            </div>
          </div>
        </div>

        {summary ? (
          <div className="rounded-2xl border border-sky-400/40 bg-sky-500/10 p-5 shadow-[0_0_40px_rgba(56,189,248,0.15)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="pixel-section-title text-base">Latest snapshot</h3>
                <p className="text-[11px] text-sky-100/80">
                  Snapshot ID <span className="font-mono text-[12px] text-sky-50">{summary.snapshotId}</span>
                </p>
              </div>
              <div className="text-right text-[11px] text-sky-100/80">
                <div>Run at {formatDateTime(lastRunAt)}</div>
                <div>{summary.durationMs.toLocaleString()} ms</div>
              </div>
            </div>

            <dl className="mt-4 grid gap-3 text-[12px] text-sky-50 sm:grid-cols-4">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.24em] text-sky-200/80">Partner</dt>
                <dd className="mt-1 font-semibold">{summary.partner}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.24em] text-sky-200/80">Requirement</dt>
                <dd className="mt-1 font-semibold">{summaryRequirementLabel}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.24em] text-sky-200/80">Eligible</dt>
                <dd className="mt-1 font-semibold text-emerald-200">{formatNumber(summary.eligibleCount)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.24em] text-sky-200/80">Total processed</dt>
                <dd className="mt-1 font-semibold">{formatNumber(summary.totalAddresses)}</dd>
              </div>
            </dl>

            {chainSummaryEntries.length ? (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-sky-400/30 bg-sky-500/5">
                <table className="min-w-full text-left text-[12px] text-sky-50/90">
                  <thead>
                    <tr className="border-b border-sky-400/20 text-[10px] uppercase tracking-[0.26em] text-sky-200/70">
                      <th className="px-4 py-2">Chain</th>
                      <th className="px-4 py-2">Eligible</th>
                      <th className="px-4 py-2">Ineligible</th>
                      <th className="px-4 py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chainSummaryEntries.map(({ chain, stats }) => (
                      <tr key={chain} className="border-b border-sky-400/10 last:border-none">
                        <td className="px-4 py-2 font-semibold">{CHAIN_LABEL[chain]}</td>
                        <td className="px-4 py-2 text-emerald-200">{formatNumber(stats.eligible)}</td>
                        <td className="px-4 py-2 text-rose-200">{formatNumber(stats.ineligible)}</td>
                        <td className="px-4 py-2">{formatNumber(stats.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {summary.metadata ? (
              <details className="mt-4 rounded-2xl border border-sky-400/30 bg-sky-500/5 p-4 text-[12px] text-sky-50/90">
                <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-200">Metadata payload</summary>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl bg-black/40 p-3 font-mono text-[11px]">
                  {stringifyJson(summary.metadata)}
                </pre>
              </details>
            ) : null}

            {requestPreview ? (
              <details className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-500/5 p-4 text-[12px] text-sky-50/80">
                <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-200">Request payload</summary>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl bg-black/40 p-3 font-mono text-[11px]">
                  {JSON.stringify(requestPreview, null, 2)}
                </pre>
              </details>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-[12px] text-[var(--px-sub)]">
            Run a snapshot to preview per-chain eligibility counts and request details.
          </div>
        )}
      </form>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="pixel-section-title text-base">Recent partner snapshots</h3>
            <p className="text-[11px] text-[var(--px-sub)]">Loaded directly from Supabase history.</p>
          </div>
          <button
            type="button"
            onClick={() => void fetchHistory()}
            className="pixel-button btn-sm border-sky-400/40 bg-sky-500/10 text-sky-100 hover:border-sky-300/60 hover:bg-sky-400/20 disabled:opacity-60"
            disabled={historyLoading}
          >
            {historyLoading ? 'Refreshing…' : 'Refresh history'}
          </button>
        </div>

        {historyError ? (
          <div className="mt-3 rounded-2xl border border-rose-500/40 bg-rose-500/15 p-3 text-[12px] text-rose-100">
            {historyError}
          </div>
        ) : null}

        {history.length ? (
          <div className="mt-4 space-y-4">
            {history.map((entry) => (
              <div key={entry.snapshotId} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--px-sub)]">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.28em] text-white/50">Snapshot ID</div>
                    <div className="font-mono text-[12px] text-white/80">{entry.snapshotId}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-[0.28em] text-white/50">Computed</div>
                    <div className="text-[12px] text-white/80">{formatDateTime(entry.computedAt)}</div>
                  </div>
                </div>

                <dl className="mt-3 grid gap-3 text-[12px] text-white/80 sm:grid-cols-4">
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.24em] text-white/50">Partner</dt>
                    <dd className="mt-1 font-semibold">{entry.partner}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.24em] text-white/50">Requirement</dt>
                    <dd className="mt-1 font-semibold">{formatRequirementDescriptor(entry.requirement)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.24em] text-white/50">Eligible</dt>
                    <dd className="mt-1 font-semibold text-emerald-200">{formatNumber(entry.eligibleCount)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.24em] text-white/50">Total</dt>
                    <dd className="mt-1 font-semibold">{formatNumber(entry.totalAddresses)}</dd>
                  </div>
                </dl>

                {entry.chains.length ? (
                  <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
                    <table className="min-w-full text-left text-[11px] text-white/70">
                      <thead className="bg-white/5 text-[10px] uppercase tracking-[0.24em] text-white/40">
                        <tr>
                          <th className="px-3 py-2">Chain</th>
                          <th className="px-3 py-2 text-right">Eligible</th>
                          <th className="px-3 py-2 text-right">Ineligible</th>
                          <th className="px-3 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.chains.map((chain) => (
                          <tr key={`${entry.snapshotId}-${chain.chain}`} className="odd:bg-white/5">
                            <td className="px-3 py-2 font-semibold">{formatChainLabel(chain.chain)}</td>
                            <td className="px-3 py-2 text-right text-emerald-200">{formatNumber(chain.eligible)}</td>
                            <td className="px-3 py-2 text-right text-rose-200">{formatNumber(chain.ineligible)}</td>
                            <td className="px-3 py-2 text-right">{formatNumber(chain.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {entry.metadata ? (
                  <details className="mt-3 rounded-xl border border-white/12 bg-white/5 p-3 text-[12px] text-white/75">
                    <summary className="cursor-pointer text-[10px] uppercase tracking-[0.2em] text-white/50">Metadata</summary>
                    <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl bg-black/40 p-3 font-mono text-[11px]">
                      {stringifyJson(entry.metadata) ?? '—'}
                    </pre>
                  </details>
                ) : null}
              </div>
            ))}
          </div>
        ) : historyLoading ? (
          <p className="mt-4 text-[12px] text-[var(--px-sub)]">Loading snapshot history…</p>
        ) : (
          <p className="mt-4 text-[12px] text-[var(--px-sub)]">No partner snapshots recorded yet.</p>
        )}
      </div>
    </section>
  )
}
