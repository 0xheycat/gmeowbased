import Image from 'next/image'
import type { FormEvent } from 'react'
import { useState, useEffect, useId, useMemo, useRef } from 'react'
import type { NftOption } from '../shared'
import type { FieldControlA11yProps } from './a11y'
import { SelectorState } from './SelectorState'
import { CHAIN_LABEL } from '@/lib/gm-utils'
import { formatEth } from '../shared'

type NftSelectorProps = {
	nfts: NftOption[]
	selectedId?: string | null
	onSelect(option: NftOption): void
	loading?: boolean
	error?: string | null
	onSearch?(value: string): void
	query?: string
	errorMessage?: string | null
	isAssetSelectable?: (option: NftOption) => { allowed: boolean; reason?: string }
} & FieldControlA11yProps

// @edit-start 2025-11-12 — Wire field identifiers into NFT selector trigger
export function NftSelector({
	nfts,
	selectedId,
	onSelect,
	loading = false,
	error,
	onSearch,
	query = '',
	errorMessage,
	isAssetSelectable,
	id,
	'aria-describedby': ariaDescribedby,
	'aria-labelledby': ariaLabelledby,
}: NftSelectorProps) {
	const [open, setOpen] = useState(false)
	const [searchValue, setSearchValue] = useState(query)
	const containerRef = useRef<HTMLDivElement | null>(null)
	const errorId = useId()
	const listboxId = useId()
	const selectedNft = useMemo(() => {
		if (!selectedId) return null
		return nfts.find((nft) => nft.id.toLowerCase() === selectedId.toLowerCase()) ?? null
	}, [nfts, selectedId])
	const triggerDescribedBy = [ariaDescribedby, errorMessage ? errorId : null].filter(Boolean).join(' ') || undefined

	useEffect(() => {
		if (!open) {
			setSearchValue(query)
		}
	}, [query, open])

	useEffect(() => {
		if (!open) return
		const handleClick = (event: MouseEvent) => {
			if (!containerRef.current) return
			if (!containerRef.current.contains(event.target as Node)) {
				setOpen(false)
			}
		}
		document.addEventListener('mousedown', handleClick)
		return () => {
			document.removeEventListener('mousedown', handleClick)
		}
	}, [open])

	const filteredCollections = useMemo(() => {
		const term = searchValue.trim().toLowerCase()
		if (!term) return nfts
		return nfts.filter((nft) => {
			const haystack = [nft.name, nft.collection, nft.id]
			return haystack.some((value) => typeof value === 'string' && value.toLowerCase().includes(term))
		})
	}, [nfts, searchValue])

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (onSearch) {
			const nextTerm = searchValue.trim()
			onSearch(nextTerm)
		}
	}

	const handleSelect = (nft: NftOption) => {
		onSelect(nft)
		setOpen(false)
	}

	return (
		<div ref={containerRef} className="relative">
			<button
				type="button"
				onClick={() => setOpen((prev) => !prev)}
				className="pixel-input flex min-h-[64px] w-full items-center justify-between gap-3 text-left"
				id={id}
				aria-labelledby={ariaLabelledby}
				aria-describedby={triggerDescribedBy}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={open ? listboxId : undefined}
			>
				<span className="flex min-w-0 items-center gap-3">
					{selectedNft ? (
						<>
							<Image
								src={selectedNft.image}
								alt={`${selectedNft.name} cover`}
								width={40}
								height={40}
								className="h-10 w-10 flex-none rounded-xl border border-white/10 bg-slate-900 object-cover"
								unoptimized
							/>
							<span className="flex min-w-0 flex-col">
								<span className="truncate text-sm font-semibold text-slate-100">{selectedNft.name}</span>
								<span className="mt-1 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
									<span>{selectedNft.collection} · {CHAIN_LABEL[selectedNft.chain]}</span>
									<span
										className={`rounded-full px-2 py-[2px] text-[9px] tracking-[0.18em] ${
											selectedNft.verified ? 'bg-emerald-400/20 text-emerald-200' : 'bg-amber-400/20 text-amber-100'
										}`}
									>
										{selectedNft.verified ? 'Verified' : 'Manual review'}
									</span>
								</span>
							</span>
						</>
					) : (
						<span className="text-sm text-slate-400">Select an NFT collection</span>
					)}
				</span>
				<span className={`text-xs text-slate-400 transition ${open ? 'rotate-180' : ''}`}>⌄</span>
			</button>
			{open ? (
				<div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90 shadow-[0_24px_60px_rgba(17,24,39,0.55)] backdrop-blur-xl">
					<form onSubmit={handleSubmit} className="border-b border-white/10 bg-slate-950/70 p-3">
						<div className="flex gap-2">
							<input
								type="search"
								value={searchValue}
								onChange={(event) => setSearchValue(event.target.value)}
								placeholder="Collection, name, or 0x…"
								className="pixel-input flex-1 bg-slate-900/60 text-sm"
							/>
							{onSearch ? (
								<button
									type="submit"
									className="rounded-xl bg-indigo-400/80 px-3 py-1.5 text-[12px] font-semibold text-slate-950 transition hover:brightness-110"
								>
									Search
								</button>
							) : null}
						</div>
						<p className="mt-2 text-[10px] text-slate-400">Press Enter to refresh.</p>
					</form>
						<div className="max-h-72 overflow-y-auto ock-scrollbar">
						{loading ? (
							<SelectorState variant="loading" message="Searching Gmeow NFT catalog…" />
						) : error ? (
							<SelectorState variant="error" message={error} />
						) : filteredCollections.length === 0 ? (
							<SelectorState variant="empty" message="No collections matched this query." />
						) : (
								<ul className="divide-y divide-white/5" role="listbox" id={listboxId} aria-labelledby={ariaLabelledby}>
								{filteredCollections.map((nft) => {
									const active = selectedId?.toLowerCase() === nft.id.toLowerCase()
									// @edit-start 2025-11-11 — Guard NFT selection according to quest policy
									const guard = isAssetSelectable ? isAssetSelectable(nft) : { allowed: true as const }
									const selectable = guard?.allowed !== false
									const disabledReason = guard?.reason
									// @edit-end
									return (
										<li key={`${nft.chain}:${nft.id}`} className={selectable ? '' : 'opacity-60'}>
											<button
												type="button"
												onClick={() => {
													if (!selectable) return
													handleSelect(nft)
												}}
												disabled={!selectable}
												aria-disabled={!selectable}
												title={disabledReason}
													className={`flex w-full items-center gap-3 px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
														active ? 'bg-sky-500/15 text-sky-100' : selectable ? 'hover:bg-white/5' : 'cursor-not-allowed'
													}`}
													role="option"
													aria-selected={active}
											>
												<Image
													src={nft.image}
													alt={`${nft.name} cover`}
													width={44}
													height={44}
													className="h-11 w-11 rounded-xl border border-white/10 bg-slate-900 object-cover"
													unoptimized
												/>
												<div className="flex flex-col text-sm text-slate-100">
													<span className="font-semibold">{nft.name}</span>
													<span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{CHAIN_LABEL[nft.chain]}</span>
													{disabledReason ? <span className="text-[10px] text-amber-200">{disabledReason}</span> : null}
												</div>
												<span className="ml-auto flex flex-col items-end gap-1 text-xs text-slate-300">
													<span>{nft.floorPriceEth != null ? `${formatEth(nft.floorPriceEth)} floor` : 'No floor data'}</span>
													{nft.balance != null ? <span className="text-[10px] text-slate-500">Indexed supply {nft.balance}</span> : null}
													<span
														className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${nft.verified ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-100'}`}
													>
														{nft.verified ? 'Verified' : 'Manual review'}
													</span>
												</span>
											</button>
										</li>
									)
								})}
							</ul>
						)}
					</div>
				</div>
			) : null}
				{selectedNft && !selectedNft.verified ? (
					<p className="mt-2 flex items-center gap-2 text-[11px] text-amber-200">
						<span aria-hidden>⚠️</span>
						<span>This collection is not yet verified in the Gmeow catalog. Confirm the contract address before launching.</span>
					</p>
				) : null}
			{errorMessage ? (
				<p className="mt-2 text-[11px] text-rose-200" id={errorId} role="alert">
					{errorMessage}
				</p>
			) : null}
		</div>
	)
	// @edit-end
}
