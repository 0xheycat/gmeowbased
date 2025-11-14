'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'

import { CHAIN_KEYS, type ChainKey } from '@/lib/gm-utils'
import { useLegacyNotificationAdapter } from '@/components/ui/live-notifications'

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

  useEffect(() => {
    void loadTemplates()
  }, [loadTemplates])

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
            <h2 className="pixel-section-title text-lg">Badge templates</h2>
            <p className="text-[11px] text-[var(--px-sub)]">
              Manage badge art, metadata, and mint costs for the Gmeow badge pipeline.
            </p>
          </div>
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
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-[12px] text-[var(--px-sub)]">
            No badge templates yet. Create your first template to unlock admin badge uploads.
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {templates.map((template) => (
            <div key={template.id} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start gap-3">
                <div className="h-16 w-16 overflow-hidden rounded-xl border border-white/10 bg-black/40">
                  {template.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={template.imageUrl} alt={template.name} className="h-full w-full object-cover" />
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
                  className="pixel-button btn-xs border-red-400/60 bg-red-500/15 text-red-200 hover:border-red-300/60"
                  onClick={() => handleDelete(template)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {formOpen ? (
          <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/70 p-4">
            <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-black/80 p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="pixel-section-title text-lg">
                  {isEditing ? 'Edit badge template' : 'New badge template'}
                </h3>
                <button className="pixel-button btn-xs" onClick={closeForm} disabled={formBusy}>
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
                      <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={formState.imageUrl} alt="Badge preview" className="h-48 w-full object-cover" />
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
