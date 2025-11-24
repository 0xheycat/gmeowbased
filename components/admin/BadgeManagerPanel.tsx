'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import Image from 'next/image'

import { CHAIN_KEYS, type ChainKey } from '@/lib/gm-utils'
import { useLegacyNotificationAdapter } from '@/components/ui/live-notifications'
import {
  getPendingMints,
  getFailedMints,
  getMintQueueStats,
  retryMint,
  loadBadgeRegistry,
  type MintQueueEntry,
  type BadgeRegistry,
} from '@/lib/badges'

// @edit-start 2025-02-16 — Rebuilt badge manager panel with metadata autofill and multichain support
const CHAIN_LABEL: Record<ChainKey, string> = {
  base: 'Base',
  unichain: 'Unichain',
  celo: 'Celo',
  ink: 'Ink',
  op: 'Optimism',
}

function isChainKey(value: unknown): value is ChainKey {
  return typeof value === 'string' && (CHAIN_KEYS as readonly string[]).includes(value)
}

type TemplateRecord = {
  id: string
  name: string
  slug: string
  badgeType: string
  description: string | null
  chain: ChainKey
  pointsCost: number
  imageUrl: string | null
  artPath: string | null
  active: boolean
  metadata: Record<string, unknown> | null
}

type FormState = {
  name: string
  badgeType: string
  description: string
  slug: string
  chain: ChainKey
  chains: ChainKey[]
  pointsCost: string
  imageUrl: string
  artPath: string
  active: boolean
  metadataJson: string
}

type MetadataDerived = {
  name?: string
  description?: string
  imageUrl?: string
}

const DEFAULT_CHAIN: ChainKey = (CHAIN_KEYS[0] as ChainKey | undefined) ?? 'base'

const DEFAULT_FORM: FormState = {
  name: '',
  badgeType: '',
  description: '',
  slug: '',
  chain: DEFAULT_CHAIN,
  chains: [DEFAULT_CHAIN],
  pointsCost: '0',
  imageUrl: '',
  artPath: '',
  active: true,
  metadataJson: '{}',
}

export default function BadgeManagerPanel() {
  const notify = useLegacyNotificationAdapter()
  const [templates, setTemplates] = useState<TemplateRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [formBusy, setFormBusy] = useState(false)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formState, setFormState] = useState<FormState>({ ...DEFAULT_FORM })
  const [slugLocked, setSlugLocked] = useState(false)
  const [metadataError, setMetadataError] = useState<string | null>(null)

  const metadataDerivedRef = useRef<MetadataDerived>({})

  const isEditing = editingId != null

  // Phase 3B: New state for additional features
  const [activeTab, setActiveTab] = useState<'templates' | 'queue' | 'registry' | 'assign'>('templates')
  const [mintQueue, setMintQueue] = useState<MintQueueEntry[]>([])
  const [queueFilter, setQueueFilter] = useState<'all' | 'pending' | 'minting' | 'minted' | 'failed'>('all')
  const [queueLoading, setQueueLoading] = useState(false)
  const [queueStats, setQueueStats] = useState({ pending: 0, minting: 0, minted: 0, failed: 0 })
  const [badgeRegistry, setBadgeRegistry] = useState<BadgeRegistry | null>(null)
  const [registryLoading, setRegistryLoading] = useState(false)
  const [manualAssignFid, setManualAssignFid] = useState('')
  const [manualAssignBadgeType, setManualAssignBadgeType] = useState('')
  const [manualAssignBusy, setManualAssignBusy] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailModalBadge, setDetailModalBadge] = useState<TemplateRecord | null>(null)

  const loadTemplates = useCallback(
    async (force?: boolean) => {
      setLoading(true)
      setError(null)
      try {
        const url = force ? '/api/admin/badges?refresh=1' : '/api/admin/badges'
        const res = await fetch(url, { cache: 'no-store' })
        const json = await res.json()
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || `HTTP ${res.status}`)
        }
        setTemplates(json.templates as TemplateRecord[])
      } catch (e: any) {
        const message = e?.message || 'Failed to load badge templates'
        setError(message)
        notify({ type: 'error', title: 'Load failed', message })
      } finally {
        setLoading(false)
      }
    },
    [notify],
  )

  // Phase 3B: Mint Queue Management
  const loadMintQueue = useCallback(async () => {
    setQueueLoading(true)
    try {
      const [pending, failed, stats] = await Promise.all([
        getPendingMints(50),
        getFailedMints(50),
        getMintQueueStats(),
      ])
      
      let queue: MintQueueEntry[] = []
      if (queueFilter === 'all') {
        queue = [...pending, ...failed].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      } else if (queueFilter === 'pending') {
        queue = pending
      } else if (queueFilter === 'failed') {
        queue = failed
      }
      
      setMintQueue(queue)
      setQueueStats(stats)
    } catch (e: any) {
      notify({ type: 'error', title: 'Failed to load mint queue', message: e?.message || 'Unknown error' })
    } finally {
      setQueueLoading(false)
    }
  }, [queueFilter, notify])

  const handleRetryMint = useCallback(async (queueId: string) => {
    try {
      await retryMint(queueId)
      notify({ type: 'success', title: 'Mint retry queued', message: 'Badge mint has been reset to pending' })
      await loadMintQueue()
    } catch (e: any) {
      notify({ type: 'error', title: 'Retry failed', message: e?.message || 'Unable to retry mint' })
    }
  }, [loadMintQueue, notify])

  // Phase 3B: Badge Registry Viewer
  const loadBadgeRegistryData = useCallback(async () => {
    setRegistryLoading(true)
    try {
      const registry = loadBadgeRegistry()
      setBadgeRegistry(registry)
    } catch (e: any) {
      notify({ type: 'error', title: 'Failed to load registry', message: e?.message || 'Unknown error' })
    } finally {
      setRegistryLoading(false)
    }
  }, [notify])

  // Phase 3B: Manual Assignment
  const handleManualAssign = useCallback(async () => {
    const fid = Number(manualAssignFid)
    if (!fid || !Number.isFinite(fid) || fid <= 0) {
      notify({ type: 'error', title: 'Invalid FID', message: 'Enter a valid Farcaster ID' })
      return
    }
    if (!manualAssignBadgeType.trim()) {
      notify({ type: 'error', title: 'Missing badge type', message: 'Select a badge type to assign' })
      return
    }

    setManualAssignBusy(true)
    try {
      const res = await fetch('/api/badges/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid, badgeId: manualAssignBadgeType }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `HTTP ${res.status}`)
      }
      notify({ type: 'success', title: 'Badge assigned', message: `Assigned ${manualAssignBadgeType} to FID ${fid}` })
      setManualAssignFid('')
      setManualAssignBadgeType('')
    } catch (e: any) {
      notify({ type: 'error', title: 'Assignment failed', message: e?.message || 'Unable to assign badge' })
    } finally {
      setManualAssignBusy(false)
    }
  }, [manualAssignFid, manualAssignBadgeType, notify])

  // Phase 3B: Badge Detail Modal
  const openDetailModal = useCallback(async (template: TemplateRecord) => {
    setDetailModalBadge(template)
    setDetailModalOpen(true)
    // Assignment history would need API endpoint (future enhancement)
  }, [])

  useEffect(() => {
    void loadTemplates()
  }, [loadTemplates])

  // Phase 3B: Load data when switching tabs
  useEffect(() => {
    if (activeTab === 'queue') {
      void loadMintQueue()
    } else if (activeTab === 'registry') {
      void loadBadgeRegistryData()
    }
  }, [activeTab, loadMintQueue, loadBadgeRegistryData])

  const chainOptions = useMemo(
    () => (CHAIN_KEYS as ChainKey[]).map((key) => ({ value: key, label: CHAIN_LABEL[key] })),
    [],
  )

  const selectedChainSet = useMemo(() => new Set(formState.chains), [formState.chains])

  const applyMetadataAutofill = useCallback(
    (metadata: unknown) => {
      const prevDerived = metadataDerivedRef.current
      const derived = deriveMetadataFields(metadata)
      metadataDerivedRef.current = derived

      if (!derived.name && !derived.description && !derived.imageUrl) {
        return
      }

      setFormState((prev) => {
        let next = prev
        let mutated = false

        const ensureNext = () => {
          if (!mutated) {
            next = { ...prev }
            mutated = true
          }
        }

        if (derived.name) {
          const shouldReplace =
            !prev.name.trim() || (prevDerived.name && prev.name.trim() === prevDerived.name)
          if (shouldReplace) {
            ensureNext()
            next.name = derived.name
          }

          if (!slugLocked) {
            const prevSlugFromDerived = prevDerived.name ? slugify(prevDerived.name) : ''
            const shouldReplaceSlug =
              !prev.slug.trim() || (!!prevDerived.name && prev.slug === prevSlugFromDerived)
            if (shouldReplaceSlug) {
              ensureNext()
              next.slug = slugify(derived.name)
            }
          }
        }

        if (derived.description) {
          const shouldReplace =
            !prev.description.trim() ||
            (prevDerived.description && prev.description.trim() === prevDerived.description)
          if (shouldReplace) {
            ensureNext()
            next.description = derived.description
          }
        }

        if (derived.imageUrl) {
          const shouldReplace =
            !prev.imageUrl.trim() ||
            (prevDerived.imageUrl && prev.imageUrl.trim() === prevDerived.imageUrl)
          if (shouldReplace) {
            ensureNext()
            next.imageUrl = derived.imageUrl
            next.metadataJson = syncMetadataImageField(next.metadataJson, derived.imageUrl)
          }
        }

        return next
      })
    },
    [slugLocked],
  )

  const resetForm = useCallback(() => {
    metadataDerivedRef.current = {}
    setFormState({ ...DEFAULT_FORM })
    setMetadataError(null)
    setSlugLocked(false)
  }, [])

  const closeForm = useCallback(() => {
    setFormOpen(false)
    setEditingId(null)
    resetForm()
  }, [resetForm])

  const openCreateForm = useCallback(() => {
    setEditingId(null)
    resetForm()
    setFormOpen(true)
  }, [resetForm])

  const openEditForm = useCallback(
    (template: TemplateRecord) => {
      setEditingId(template.id)
      setSlugLocked(true)
      setMetadataError(null)
      metadataDerivedRef.current = {}
      setFormState({
        name: template.name ?? '',
        badgeType: template.badgeType ?? '',
        description: template.description ?? '',
        slug: template.slug ?? '',
        chain: template.chain,
        chains: [template.chain],
        pointsCost: String(template.pointsCost ?? 0),
        imageUrl: template.imageUrl ?? '',
        artPath: template.artPath ?? '',
        active: template.active,
        metadataJson: template.metadata ? JSON.stringify(template.metadata, null, 2) : '{}',
      })
      setFormOpen(true)
      if (template.metadata) {
        applyMetadataAutofill(template.metadata)
      }
    },
    [applyMetadataAutofill],
  )

  const handleNameChange = useCallback(
    (value: string) => {
      setFormState((prev) => {
        const next = { ...prev, name: value }
        if (!slugLocked) {
          next.slug = value ? slugify(value) : ''
        }
        return next
      })
    },
    [slugLocked],
  )

  const handleBadgeTypeChange = useCallback((value: string) => {
    setFormState((prev) => ({ ...prev, badgeType: value }))
  }, [])

  const handleDescriptionChange = useCallback((value: string) => {
    setFormState((prev) => ({ ...prev, description: value }))
  }, [])

  const handleSlugChange = useCallback((value: string) => {
    setFormState((prev) => ({ ...prev, slug: value }))
  }, [])

  const handleSlugBlur = useCallback(() => {
    setFormState((prev) => {
      const nextSlug = slugify(prev.slug)
      if (nextSlug === prev.slug) return prev
      return { ...prev, slug: nextSlug }
    })
  }, [])

  const handlePointsCostChange = useCallback((value: string) => {
    setFormState((prev) => ({ ...prev, pointsCost: value }))
  }, [])

  const handleStatusChange = useCallback((value: boolean) => {
    setFormState((prev) => ({ ...prev, active: value }))
  }, [])

  const handleChainSelect = useCallback((chain: ChainKey) => {
    setFormState((prev) => ({ ...prev, chain, chains: [chain] }))
  }, [])

  const handleMetadataJsonChange = useCallback(
    (value: string) => {
      setFormState((prev) => ({ ...prev, metadataJson: value }))
      if (!value.trim()) {
        setMetadataError(null)
        metadataDerivedRef.current = {}
        return
      }
      try {
        const parsed = JSON.parse(value)
        setMetadataError(null)
        applyMetadataAutofill(parsed)
      } catch (err: any) {
        setMetadataError(err?.message || 'Metadata must be valid JSON')
      }
    },
    [applyMetadataAutofill],
  )

  const handleMetadataJsonBlur = useCallback(() => {
    const raw = formState.metadataJson
    if (!raw.trim()) return
    try {
      const parsed = JSON.parse(raw)
      const pretty = JSON.stringify(parsed, null, 2)
      if (pretty !== raw) {
        setFormState((prev) => ({ ...prev, metadataJson: pretty }))
      }
    } catch {
      // ignore; user is still editing invalid JSON
    }
  }, [formState.metadataJson])

  const handleChainToggle = useCallback(
    (chain: ChainKey) => {
      if (isEditing) return
      setFormState((prev) => {
        const nextSet = new Set(prev.chains)
        if (nextSet.has(chain)) {
          if (nextSet.size === 1) {
            return prev
          }
          nextSet.delete(chain)
        } else {
          nextSet.add(chain)
        }
        const chains = Array.from(nextSet)
        return {
          ...prev,
          chains,
          chain: chains[0] ?? prev.chain,
        }
      })
    },
    [isEditing],
  )

  const handleSelectAllChains = useCallback(() => {
    if (isEditing) return
    const allChains = [...CHAIN_KEYS] as ChainKey[]
    setFormState((prev) => ({
      ...prev,
      chains: allChains,
      chain: allChains[0] ?? prev.chain,
    }))
  }, [isEditing])

  const handleClearChains = useCallback(() => {
    if (isEditing) return
    setFormState((prev) => ({
      ...prev,
      chains: [prev.chain],
    }))
  }, [isEditing])

  const handleFileUpload = useCallback(
    async (file: File) => {
      setUploadBusy(true)
      try {
        const data = new FormData()
        data.append('file', file)
        if (formState.artPath) {
          data.append('removePath', formState.artPath)
        }
        const res = await fetch('/api/admin/badges/upload', {
          method: 'POST',
          body: data,
        })
        const json = await res.json()
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || `HTTP ${res.status}`)
        }
        const url = json.url as string
        const path = json.path as string
        setFormState((prev) => ({
          ...prev,
          imageUrl: url,
          artPath: path,
          metadataJson: syncMetadataImageField(prev.metadataJson, url),
        }))
        notify({ type: 'success', title: 'Artwork uploaded', message: 'Badge art updated successfully.' })
      } catch (error: any) {
        notify({ type: 'error', title: 'Upload failed', message: error?.message || 'Unable to upload badge artwork.' })
      } finally {
        setUploadBusy(false)
      }
    },
    [formState.artPath, notify],
  )

  const handleSubmit = useCallback(async () => {
    const name = formState.name.trim()
    const badgeType = formState.badgeType.trim()
    if (!name) {
      notify({ type: 'error', title: 'Missing name', message: 'Provide a badge name.' })
      return
    }
    if (!badgeType) {
      notify({ type: 'error', title: 'Missing badge type', message: 'Badge type is required.' })
      return
    }

    const points = Number(formState.pointsCost)
    if (!Number.isFinite(points) || points < 0) {
      notify({ type: 'error', title: 'Invalid cost', message: 'Points cost must be a positive number.' })
      return
    }

    let metadata: Record<string, unknown> | null = null
    const metadataSource = formState.metadataJson.trim()
    if (metadataSource) {
      try {
        metadata = JSON.parse(metadataSource)
        setMetadataError(null)
        const pretty = JSON.stringify(metadata, null, 2)
        if (pretty !== formState.metadataJson) {
          setFormState((prev) => ({ ...prev, metadataJson: pretty }))
        }
      } catch (err: any) {
        const message = err?.message || 'Metadata must be valid JSON.'
        setMetadataError(message)
        notify({ type: 'error', title: 'Invalid metadata', message })
        return
      }
    }

    const slugBaseInput = formState.slug.trim() || name
    const slugBase = slugify(slugBaseInput)
    if (!slugBase) {
      notify({ type: 'error', title: 'Missing slug', message: 'Provide a slug or name so we can generate unique templates.' })
      return
    }

    const selectedChains = isEditing
      ? [formState.chain]
      : formState.chains.length
        ? formState.chains
        : [formState.chain]

    const uniqueChains = Array.from(
      new Set(
        selectedChains.filter((chain): chain is ChainKey => isChainKey(chain)),
      ),
    )
    if (!uniqueChains.length) {
      notify({ type: 'error', title: 'Missing chain', message: 'Select at least one chain for this badge template.' })
      return
    }

    const payloadBase = {
      name,
      badgeType,
      description: formState.description.trim() || null,
      pointsCost: Math.floor(points),
      imageUrl: formState.imageUrl || null,
      artPath: formState.artPath || null,
      active: formState.active,
      metadata,
    }

    setFormBusy(true)
    try {
      if (isEditing) {
        const payload = {
          ...payloadBase,
          chain: uniqueChains[0],
          slug: slugBase,
        }
        const res = await fetch(`/api/admin/badges/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const json = await res.json()
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || 'Unable to save template')
        }
        notify({ type: 'success', title: 'Template updated', message: `${payload.name} saved successfully.` })
        closeForm()
        await loadTemplates(true)
        return
      }

      const successChains: ChainKey[] = []
      const failureMessages: string[] = []

      for (const chainKey of uniqueChains) {
        const slug = slugify(uniqueChains.length > 1 ? `${slugBase}-${chainKey}` : slugBase)
        const payload = {
          ...payloadBase,
          chain: chainKey,
          slug,
        }
        try {
          const res = await fetch('/api/admin/badges', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          const json = await res.json()
          if (!res.ok || !json?.ok) {
            const reason = json?.error || `HTTP ${res.status}`
            failureMessages.push(`${CHAIN_LABEL[chainKey]}: ${reason}`)
          } else {
            successChains.push(chainKey)
          }
        } catch (error: any) {
          failureMessages.push(`${CHAIN_LABEL[chainKey]}: ${error?.message || 'Request failed'}`)
        }
      }

      if (successChains.length) {
        const label = successChains.map((key) => CHAIN_LABEL[key]).join(', ')
        notify({ type: 'success', title: 'Templates created', message: `Saved ${payloadBase.name} for ${label}.` })
        closeForm()
        await loadTemplates(true)
      }

      if (failureMessages.length) {
        notify({ type: 'error', title: 'Some templates failed', message: failureMessages.join(' • ') })
      }
    } catch (e: any) {
      notify({ type: 'error', title: 'Save failed', message: e?.message || 'Unable to save badge template.' })
    } finally {
      setFormBusy(false)
    }
  }, [closeForm, editingId, formState, isEditing, loadTemplates, notify])

  const handleToggleActive = useCallback(
    async (template: TemplateRecord) => {
      try {
        const res = await fetch(`/api/admin/badges/${template.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: !template.active }),
        })
        const json = await res.json()
        if (!res.ok || !json?.ok) throw new Error(json?.error || 'Unable to update status')
        notify({
          type: 'success',
          title: template.active ? 'Template deactivated' : 'Template activated',
          message: template.name,
        })
        await loadTemplates(true)
      } catch (e: any) {
        notify({ type: 'error', title: 'Update failed', message: e?.message || 'Unable to toggle badge template.' })
      }
    },
    [loadTemplates, notify],
  )

  const handleDelete = useCallback(
    async (template: TemplateRecord) => {
      if (!window.confirm(`Delete badge template "${template.name}"? This cannot be undone.`)) return
      try {
        const res = await fetch(`/api/admin/badges/${template.id}`, { method: 'DELETE' })
        const json = await res.json()
        if (!res.ok || !json?.ok) throw new Error(json?.error || 'Unable to delete template')
        notify({ type: 'success', title: 'Template deleted', message: template.name })
        await loadTemplates(true)
      } catch (e: any) {
        notify({ type: 'error', title: 'Delete failed', message: e?.message || 'Unable to delete badge template.' })
      }
    },
    [loadTemplates, notify],
  )

  return (
    <section className="px-2 sm:px-4">
      <div className="mx-auto w-full max-w-6xl rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-emerald-500/10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="pixel-section-title text-lg">Badge Management</h2>
            <p className="text-[11px] text-[var(--px-sub)]">
              Manage badge templates, mint queue, registry, and assignments.
            </p>
          </div>
        </div>

        {/* Phase 3B: Tab Navigation */}
        <nav className="mb-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={clsx(
              'pixel-button btn-sm transition',
              activeTab === 'templates'
                ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100'
                : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
            )}
          >
            Templates
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={clsx(
              'pixel-button btn-sm transition',
              activeTab === 'queue'
                ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100'
                : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
            )}
          >
            Mint Queue
            {queueStats.pending > 0 && (
              <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-[2px] text-[10px] font-semibold text-emerald-200">
                {queueStats.pending}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('registry')}
            className={clsx(
              'pixel-button btn-sm transition',
              activeTab === 'registry'
                ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100'
                : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
            )}
          >
            Registry
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('assign')}
            className={clsx(
              'pixel-button btn-sm transition',
              activeTab === 'assign'
                ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100'
                : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
            )}
          >
            Manual Assign
          </button>
        </nav>

        {/* Templates Tab (existing content) */}
        {activeTab === 'templates' && (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">Badge Templates</h3>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="pixel-button btn-sm"
                  onClick={() => loadTemplates(true)}
                  disabled={loading}
                >
                  {loading ? 'Refreshing…' : 'Refresh'}
                </button>
                <button
                  type="button"
                  className="pixel-button btn-sm border-emerald-400/60 bg-emerald-500/15 text-emerald-100 hover:border-emerald-300/60"
                  onClick={openCreateForm}
                >
                  New template
                </button>
              </div>
            </div>

        {error ? (
          <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            <div className="font-semibold">Unable to load badge templates</div>
            <p className="mt-1 text-[12px]">{error}</p>
          </div>
        ) : null}

        {loading && !templates.length ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-24 animate-pulse rounded-2xl bg-white/10" />
            ))}
          </div>
        ) : null}

        {!loading && templates.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 text-center text-sm text-[var(--px-sub)]">
            No badge templates yet. Create your first template to unlock admin badge uploads.
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {templates.map((template) => (
            <div key={template.id} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start gap-3">
                <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-white/10 bg-black/40">
                  {template.imageUrl ? (
                    <Image src={template.imageUrl} alt={template.name} fill sizes="64px" className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[11px] text-[var(--px-sub)]">
                      No art
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-white">{template.name}</h3>
                    <span
                      className={clsx(
                        'pixel-pill text-[10px]',
                        template.active ? 'bg-emerald-500/20 text-emerald-200' : 'bg-white/10 text-white/60',
                      )}
                    >
                      {template.active ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--px-sub)]">{template.badgeType}</div>
                  {template.description ? (
                    <p className="mt-2 line-clamp-3 text-[12px] text-white/70">{template.description}</p>
                  ) : null}
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-white/70">
                <div>
                  <dt className="text-[var(--px-sub)]">Chain</dt>
                  <dd>{CHAIN_LABEL[template.chain]}</dd>
                </div>
                <div>
                  <dt className="text-[var(--px-sub)]">Cost</dt>
                  <dd>{template.pointsCost.toLocaleString()} pts</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[var(--px-sub)]">Slug</dt>
                  <dd className="truncate text-white/80">{template.slug}</dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="pixel-button btn-xs"
                  onClick={() => openEditForm(template)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="pixel-button btn-xs"
                  onClick={() => handleToggleActive(template)}
                >
                  {template.active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  type="button"
                  className="pixel-button btn-xs border-sky-400/60 bg-sky-500/15 text-sky-200 hover:border-sky-300/60"
                  onClick={() => openDetailModal(template)}
                >
                  Details
                </button>
                <button
                  type="button"
                  className="pixel-button btn-xs border-red-400/60 bg-red-500/15 text-red-200 hover:border-red-300/60"
                  onClick={() => handleDelete(template)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
          </div>
        )}

        {/* Phase 3B: Mint Queue Tab */}
        {activeTab === 'queue' && (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">Mint Queue</h3>
              <button
                type="button"
                className="pixel-button btn-sm"
                onClick={loadMintQueue}
                disabled={queueLoading}
              >
                {queueLoading ? 'Loading…' : 'Refresh'}
              </button>
            </div>

            {/* Queue Stats */}
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/70">Pending</div>
                <div className="mt-1 text-2xl font-bold text-emerald-400">{queueStats.pending}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/70">Minting</div>
                <div className="mt-1 text-2xl font-bold text-amber-400">{queueStats.minting}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/70">Minted</div>
                <div className="mt-1 text-2xl font-bold text-white">{queueStats.minted}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/70">Failed</div>
                <div className="mt-1 text-2xl font-bold text-red-400">{queueStats.failed}</div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="mb-4 flex flex-wrap gap-2">
              {(['all', 'pending', 'minting', 'minted', 'failed'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setQueueFilter(filter)}
                  className={clsx(
                    'pixel-button btn-xs transition',
                    queueFilter === filter
                      ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100'
                      : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
                  )}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>

            {/* Queue Table */}
            {queueLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="h-16 animate-pulse rounded-2xl bg-white/10" />
                ))}
              </div>
            ) : mintQueue.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-[12px] text-[var(--px-sub)]">
                No mints in queue with status: {queueFilter}
              </div>
            ) : (
              <div className="space-y-2">
                {mintQueue.map((mint) => (
                  <div key={mint.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">FID {mint.fid}</span>
                          <span className="text-[11px] text-[var(--px-sub)]">{mint.badgeType}</span>
                          <span
                            className={clsx(
                              'pixel-pill text-[10px]',
                              mint.status === 'pending' && 'bg-emerald-500/20 text-emerald-200',
                              mint.status === 'minting' && 'bg-amber-500/20 text-amber-200',
                              mint.status === 'minted' && 'bg-white/10 text-white/70',
                              mint.status === 'failed' && 'bg-red-500/20 text-red-200'
                            )}
                          >
                            {mint.status}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-[var(--px-sub)]">
                          Created: {new Date(mint.createdAt).toLocaleString()}
                        </div>
                        {mint.error && (
                          <div className="mt-2 rounded border border-red-400/30 bg-red-500/10 p-2 text-[11px] text-red-200">
                            {mint.error}
                          </div>
                        )}
                        {mint.txHash && (
                          <div className="mt-1 text-[11px] text-[var(--px-sub)]">
                            Tx: <span className="font-mono">{mint.txHash.slice(0, 16)}...</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {mint.status === 'failed' && (
                          <button
                            type="button"
                            className="pixel-button btn-xs border-emerald-400/60 bg-emerald-500/15 text-emerald-100"
                            onClick={() => handleRetryMint(mint.id)}
                          >
                            Retry (Attempt {(mint.retryCount || 0) + 1})
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Phase 3B: Badge Registry Tab */}
        {activeTab === 'registry' && (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">Badge Registry</h3>
              <button
                type="button"
                className="pixel-button btn-sm"
                onClick={loadBadgeRegistryData}
                disabled={registryLoading}
              >
                {registryLoading ? 'Loading…' : 'Refresh'}
              </button>
            </div>

            {registryLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="h-24 animate-pulse rounded-2xl bg-white/10" />
                ))}
              </div>
            ) : !badgeRegistry ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-[12px] text-[var(--px-sub)]">
                Failed to load badge registry
              </div>
            ) : (
              <div className="space-y-4">
                {/* Registry Info */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="grid gap-2 text-[12px]">
                    <div className="flex justify-between">
                      <span className="text-[var(--px-sub)]">Version:</span>
                      <span className="font-semibold text-white">{badgeRegistry.version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--px-sub)]">Last Updated:</span>
                      <span className="font-semibold text-white">{badgeRegistry.lastUpdated}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--px-sub)]">Total Badges:</span>
                      <span className="font-semibold text-white">{badgeRegistry.badges.length}</span>
                    </div>
                  </div>
                </div>

                {/* Tier Overview */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-white">Tiers</h4>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(badgeRegistry.tiers).map(([key, tier]) => (
                      <div key={key} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: tier.color }}
                          />
                          <span className="text-sm font-semibold text-white">{tier.name}</span>
                        </div>
                        <div className="mt-2 text-[11px] text-[var(--px-sub)]">
                          Score: {tier.scoreRange.min.toFixed(2)} - {tier.scoreRange.max.toFixed(2)}
                        </div>
                        <div className="text-[11px] text-[var(--px-sub)]">
                          Bonus: +{tier.pointsBonus} points
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Badges List */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-white">Registry Badges</h4>
                  <div className="space-y-2">
                    {badgeRegistry.badges.map((badge) => (
                      <div key={badge.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-start gap-3">
                          {badge.imageUrl && (
                            <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-white/10">
                              <Image src={badge.imageUrl} alt={badge.name} fill sizes="48px" className="object-cover" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white">{badge.name}</span>
                              <span
                                className="pixel-pill text-[10px]"
                                style={{ backgroundColor: `${badgeRegistry.tiers[badge.tier].color}20`, color: badgeRegistry.tiers[badge.tier].color }}
                              >
                                {badge.tier}
                              </span>
                              {badge.autoAssign && (
                                <span className="pixel-pill bg-emerald-500/20 text-[10px] text-emerald-200">
                                  Auto
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-[11px] text-[var(--px-sub)]">{badge.description}</div>
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                              <span className="text-[var(--px-sub)]">Type: <span className="font-mono text-white">{badge.badgeType}</span></span>
                              <span className="text-[var(--px-sub)]">•</span>
                              <span className="text-[var(--px-sub)]">Chain: {badge.chain}</span>
                              {badge.assignmentRule && (
                                <>
                                  <span className="text-[var(--px-sub)]">•</span>
                                  <span className="text-[var(--px-sub)]">Rule: {badge.assignmentRule}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Phase 3B: Manual Assignment Tab */}
        {activeTab === 'assign' && (
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-white">Manual Badge Assignment</h3>
              <p className="text-[11px] text-[var(--px-sub)]">Assign a badge to a specific Farcaster ID</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-[12px]">
                  <span className="text-white">Farcaster ID (FID)</span>
                  <input
                    type="number"
                    className="pixel-input"
                    value={manualAssignFid}
                    onChange={(e) => setManualAssignFid(e.target.value)}
                    placeholder="e.g., 123456"
                    disabled={manualAssignBusy}
                  />
                </label>
                <label className="flex flex-col gap-1 text-[12px]">
                  <span className="text-white">Badge Type</span>
                  <input
                    type="text"
                    className="pixel-input"
                    value={manualAssignBadgeType}
                    onChange={(e) => setManualAssignBadgeType(e.target.value)}
                    placeholder="e.g., og_member"
                    disabled={manualAssignBusy}
                  />
                  <span className="text-[10px] text-[var(--px-sub)]">
                    Match badge type from registry or templates
                  </span>
                </label>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  className="pixel-button btn-sm border-emerald-400/60 bg-emerald-500/15 text-emerald-100"
                  onClick={handleManualAssign}
                  disabled={manualAssignBusy}
                >
                  {manualAssignBusy ? 'Assigning…' : 'Assign Badge'}
                </button>
              </div>
            </div>

            {/* Available Badge Types Reference */}
            {badgeRegistry && (
              <div className="mt-5">
                <h4 className="mb-3 text-sm font-semibold text-white">Available Badge Types</h4>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {badgeRegistry.badges.map((badge) => (
                    <button
                      key={badge.id}
                      type="button"
                      onClick={() => setManualAssignBadgeType(badge.badgeType)}
                      className="rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-emerald-400/40 hover:bg-white/10"
                    >
                      <div className="text-sm font-semibold text-white">{badge.name}</div>
                      <div className="mt-1 font-mono text-[11px] text-[var(--px-sub)]">{badge.badgeType}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Phase 3B: Badge Detail Modal */}
        {detailModalOpen && detailModalBadge && (
          <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/70 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="badge-detail-title"
              className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-black/80 p-4 sm:p-6 shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 id="badge-detail-title" className="pixel-section-title text-lg">Badge Details</h3>
                <button
                  className="pixel-button btn-sm min-h-[44px]"
                  onClick={() => setDetailModalOpen(false)}
                  aria-label="Close badge details modal"
                >
                  Close
                </button>
              </div>

              <div className="space-y-4">
                {/* Badge Preview */}
                <div className="flex items-start gap-4">
                  {detailModalBadge.imageUrl && (
                    <div className="h-24 w-24 overflow-hidden rounded-xl border border-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={detailModalBadge.imageUrl}
                        alt={detailModalBadge.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-lg font-semibold text-white">{detailModalBadge.name}</h4>
                    <div className="mt-1 text-[12px] text-[var(--px-sub)]">{detailModalBadge.description}</div>
                  </div>
                </div>

                {/* Badge Info */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <h5 className="mb-3 text-sm font-semibold text-white">Information</h5>
                  <dl className="grid gap-2 text-[12px]">
                    <div className="flex justify-between">
                      <dt className="text-[var(--px-sub)]">Badge Type:</dt>
                      <dd className="font-mono text-white">{detailModalBadge.badgeType}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[var(--px-sub)]">Slug:</dt>
                      <dd className="font-mono text-white">{detailModalBadge.slug}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[var(--px-sub)]">Chain:</dt>
                      <dd className="text-white">{CHAIN_LABEL[detailModalBadge.chain]}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[var(--px-sub)]">Points Cost:</dt>
                      <dd className="text-white">{detailModalBadge.pointsCost.toLocaleString()}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[var(--px-sub)]">Status:</dt>
                      <dd>
                        <span
                          className={clsx(
                            'pixel-pill text-[10px]',
                            detailModalBadge.active
                              ? 'bg-emerald-500/20 text-emerald-200'
                              : 'bg-white/10 text-white/60'
                          )}
                        >
                          {detailModalBadge.active ? 'Active' : 'Inactive'}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Metadata */}
                {detailModalBadge.metadata && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h5 className="mb-3 text-sm font-semibold text-white">Metadata</h5>
                    <pre className="max-h-60 overflow-auto rounded border border-white/10 bg-black/40 p-3 font-mono text-[11px] text-white/80">
                      {JSON.stringify(detailModalBadge.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Assignment History Placeholder */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <h5 className="mb-3 text-sm font-semibold text-white">Assignment History</h5>
                  <div className="text-[12px] text-[var(--px-sub)]">
                    Assignment history tracking coming soon...
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {formOpen ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/70 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="badge-form-title"
              className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-black/80 p-4 sm:p-6 shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 id="badge-form-title" className="pixel-section-title text-lg">
                  {isEditing ? 'Edit badge template' : 'New badge template'}
                </h3>
                <button className="pixel-button btn-sm min-h-[44px]" onClick={closeForm} disabled={formBusy} aria-label="Close badge form modal">
                  Close
                </button>
              </div>

              <div className="space-y-5 text-sm">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-[12px]">
                    <span>Name</span>
                    <input
                      type="text"
                      className="pixel-input"
                      value={formState.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="GM Badge"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[12px]">
                    <span>Badge type (contract string)</span>
                    <input
                      type="text"
                      className="pixel-input"
                      value={formState.badgeType}
                      onChange={(e) => handleBadgeTypeChange(e.target.value)}
                      placeholder="GM-LEGEND"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1 text-[12px]">
                  <span>Slug</span>
                  <input
                    type="text"
                    className="pixel-input"
                    value={formState.slug}
                    onChange={(e) => {
                      setSlugLocked(true)
                      handleSlugChange(e.target.value)
                    }}
                    onBlur={handleSlugBlur}
                    placeholder="gmeow-vanguard"
                  />
                  <span className="text-[10px] text-[var(--px-sub)]">
                    We slugify automatically; customize if you need a bespoke identifier.
                  </span>
                </label>

                <label className="flex flex-col gap-1 text-[12px]">
                  <span>Description</span>
                  <textarea
                    className="pixel-input min-h-[90px]"
                    value={formState.description}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    placeholder="Displayed in admin surfaces"
                  />
                </label>

                {isEditing ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="flex flex-col gap-1 text-[12px] md:col-span-1">
                      <span>Chain</span>
                      <select
                        className="pixel-input"
                        value={formState.chain}
                        onChange={(e) => handleChainSelect(e.target.value as ChainKey)}
                      >
                        {chainOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-[12px] md:col-span-1">
                      <span>Points cost</span>
                      <input
                        type="number"
                        min="0"
                        className="pixel-input"
                        value={formState.pointsCost}
                        onChange={(e) => handlePointsCostChange(e.target.value)}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-[12px] md:col-span-1">
                      <span>Status</span>
                      <select
                        className="pixel-input"
                        value={formState.active ? 'active' : 'inactive'}
                        onChange={(e) => handleStatusChange(e.target.value === 'active')}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </label>
                  </div>
                ) : (
                  <>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-col gap-2">
                        <p className="text-[12px] font-semibold">Distribution chains</p>
                        <p className="text-[11px] text-[var(--px-sub)]">
                          Select one or more chains. Multiple selections clone this badge and suffix the slug with the chain key.
                        </p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {chainOptions.map((option) => {
                          const selected = selectedChainSet.has(option.value)
                          return (
                            <button
                              type="button"
                              key={option.value}
                              className={clsx(
                                'pixel-button btn-xs transition-colors',
                                selected
                                  ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100'
                                  : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20',
                              )}
                              onClick={() => handleChainToggle(option.value)}
                              disabled={formBusy || uploadBusy}
                            >
                              {option.label}
                            </button>
                          )
                        })}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                        <button
                          type="button"
                          className="pixel-button btn-xs border-white/15 bg-white/10 text-white/70 hover:border-white/25"
                          onClick={handleSelectAllChains}
                          disabled={formBusy || uploadBusy}
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          className="pixel-button btn-xs border-white/15 bg-white/10 text-white/70 hover:border-white/25"
                          onClick={handleClearChains}
                          disabled={formBusy || uploadBusy}
                        >
                          Reset to primary
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="flex flex-col gap-1 text-[12px]">
                        <span>Points cost</span>
                        <input
                          type="number"
                          min="0"
                          className="pixel-input"
                          value={formState.pointsCost}
                          onChange={(e) => handlePointsCostChange(e.target.value)}
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-[12px]">
                        <span>Status</span>
                        <select
                          className="pixel-input"
                          value={formState.active ? 'active' : 'inactive'}
                          onChange={(e) => handleStatusChange(e.target.value === 'active')}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </label>
                    </div>
                  </>
                )}

                <div className="grid gap-4 lg:grid-cols-5">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 lg:col-span-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[12px] font-semibold">Badge artwork</p>
                        <p className="text-[11px] text-[var(--px-sub)]">
                          Upload PNG, JPG, or GIF (max 10MB). Artwork is hosted in Supabase storage.
                        </p>
                      </div>
                      <label className="pixel-button btn-xs cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (file) void handleFileUpload(file)
                          }}
                          disabled={uploadBusy}
                        />
                        {uploadBusy ? 'Uploading…' : 'Upload art'}
                      </label>
                    </div>
                    {formState.imageUrl ? (
                      <div className="relative mt-3 h-48 overflow-hidden rounded-xl border border-white/10">
                        <Image src={formState.imageUrl} alt="Badge preview" fill sizes="400px" className="object-cover" />
                      </div>
                    ) : null}
                  </div>

                  <label className="flex flex-col gap-1 text-[12px] lg:col-span-2">
                    <span>Metadata (JSON)</span>
                    <textarea
                      className="pixel-input min-h-[220px] font-mono text-[11px]"
                      value={formState.metadataJson}
                      onChange={(e) => handleMetadataJsonChange(e.target.value)}
                      onBlur={handleMetadataJsonBlur}
                    />
                    {metadataError ? (
                      <span className="text-[10px] text-red-300">{metadataError}</span>
                    ) : (
                      <span className="text-[10px] text-[var(--px-sub)]">
                        Paste token metadata to auto-fill name, description, and art.
                      </span>
                    )}
                  </label>
                </div>

                <div className="flex justify-end gap-2">
                  <button className="pixel-button btn-sm" onClick={closeForm} disabled={formBusy}>
                    Cancel
                  </button>
                  <button
                    className="pixel-button btn-sm border-emerald-400/60 bg-emerald-500/15 text-emerald-100"
                    disabled={formBusy || uploadBusy}
                    onClick={handleSubmit}
                  >
                    {formBusy ? 'Saving…' : isEditing ? 'Save changes' : 'Create template'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function syncMetadataImageField(metadataJson: string, imageUrl: string): string {
  if (!imageUrl) return metadataJson
  const trimmed = metadataJson?.trim()
  if (!trimmed) {
    const payload = { image: imageUrl }
    return JSON.stringify(payload, null, 2)
  }

  try {
    const parsed = JSON.parse(trimmed)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return metadataJson
    }

    const next: Record<string, unknown> = { ...parsed }
    const shouldUpdateImage = typeof next.image !== 'string' || next.image !== imageUrl
    if (shouldUpdateImage) {
      next.image = imageUrl
    }

    if (typeof next.imageUrl === 'string' && next.imageUrl !== imageUrl) {
      next.imageUrl = imageUrl
    }

    if (typeof next.media === 'object' && next.media !== null && !Array.isArray(next.media)) {
      const media = { ...(next.media as Record<string, unknown>) }
      if (typeof media.image === 'string' && media.image !== imageUrl) {
        media.image = imageUrl
        next.media = media
      }
      if (typeof media.imageUrl === 'string' && media.imageUrl !== imageUrl) {
        media.imageUrl = imageUrl
        next.media = media
      }
      if (typeof media.image_url === 'string' && media.image_url !== imageUrl) {
        media.image_url = imageUrl
        next.media = media
      }
    }

    return JSON.stringify(next, null, 2)
  } catch {
    return metadataJson
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function deriveMetadataFields(raw: unknown): MetadataDerived {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {}
  }

  const metadata = raw as Record<string, unknown>
  const derived: MetadataDerived = {}

  if (typeof metadata.name === 'string' && metadata.name.trim()) {
    derived.name = metadata.name.trim()
  }

  if (typeof metadata.description === 'string' && metadata.description.trim()) {
    derived.description = metadata.description.trim()
  }

  const imageCandidates: unknown[] = [metadata.image, metadata.imageUrl, metadata.image_url]

  if (typeof metadata.media === 'object' && metadata.media !== null && !Array.isArray(metadata.media)) {
    const media = metadata.media as Record<string, unknown>
    imageCandidates.push(media.image, media.imageUrl, media.image_url)
  }

  const imageCandidate = imageCandidates.find((candidate): candidate is string =>
    typeof candidate === 'string' && candidate.trim().length > 0,
  )
  if (imageCandidate) {
    derived.imageUrl = imageCandidate.trim()
  }

  return derived
}

// @edit-end
