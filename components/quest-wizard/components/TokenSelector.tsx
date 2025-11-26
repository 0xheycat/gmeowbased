
'use client'

import Image from 'next/image'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { useState, useEffect, useId, useMemo, useRef, useCallback } from 'react'
import type { TokenOption } from '../shared'
import type { FieldControlA11yProps } from './a11y'
import { SelectorState } from './SelectorState'
import { AssetListSkeleton } from './LoadingSkeleton'
import { CHAIN_LABEL } from '@/lib/gm-utils'
import { formatUsd } from '../shared'

export type TokenSelectorProps = {
	tokens: TokenOption[]
	selectedId?: string | null
	onSelect(option: TokenOption): void
	loading?: boolean
	error?: string | null
	onSearch?(value: string): void
	query?: string
	errorMessage?: string | null
	isAssetSelectable?: (option: TokenOption) => { allowed: boolean; reason?: string }
} & FieldControlA11yProps

const SEARCH_DEBOUNCE_MS = 320

// @edit-start 2025-11-12 — Token selector uses inline search with combo box semantics
export function TokenSelector({
	tokens,
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
}: TokenSelectorProps) {
	const containerRef = useRef<HTMLDivElement | null>(null)
	const inputRef = useRef<HTMLInputElement | null>(null)
	const errorId = useId()
	const listboxId = useId()
	const [open, setOpen] = useState(false)
	const [searchValue, setSearchValue] = useState(query)
	const [activeIndex, setActiveIndex] = useState<number>(() => -1)
	const lastDebouncedSearchRef = useRef<string>('')
	const filteredOptionsRef = useRef<Array<{ token: TokenOption; selectable: boolean; reason: string | null }>>([])
	const optionsKeyRef = useRef<string>('')
	const lastResetSignatureRef = useRef<string | null>(null)

	const selectedToken = useMemo(() => {
		if (!selectedId) return null
		return tokens.find((token) => token.id.toLowerCase() === selectedId.toLowerCase()) ?? null
	}, [tokens, selectedId])

	const triggerDescribedBy = [ariaDescribedby, errorMessage ? errorId : null].filter(Boolean).join(' ') || undefined

	const computedOptions = useMemo(() => {
		return tokens.map((token) => {
			const guard = isAssetSelectable ? isAssetSelectable(token) : { allowed: true as const }
			return {
				token,
				selectable: guard?.allowed !== false,
				reason: guard?.reason ?? null,
			}
		})
	}, [tokens, isAssetSelectable])

	useEffect(() => {
		if (!selectedId) {
			setActiveIndex(-1)
			return
		}
		const nextIndex = computedOptions.findIndex((entry) => entry.token.id.toLowerCase() === selectedId.toLowerCase())
		setActiveIndex(nextIndex)
	}, [computedOptions, selectedId])

	useEffect(() => {
		if (!open) {
			setSearchValue(query)
		}
	}, [query, open])

	useEffect(() => {
		lastDebouncedSearchRef.current = query.trim()
	}, [query])

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

	const filteredOptions = useMemo(() => {
		const term = searchValue.trim().toLowerCase()
		if (!term) return tokens
		return tokens.filter((token) => {
			const haystack = [token.name, token.symbol, token.id]
			return haystack.some((value) => typeof value === 'string' && value.toLowerCase().includes(term))
		})
	}, [tokens, searchValue])

	const filteredComputedOptions = useMemo(() => {
		const lookup = new Map(computedOptions.map((entry) => [entry.token.id.toLowerCase(), entry]))
		return filteredOptions.map((token) => lookup.get(token.id.toLowerCase()) ?? { token, selectable: true, reason: null })
	}, [filteredOptions, computedOptions])

	const optionsKey = useMemo(
		() =>
			filteredComputedOptions
				.map((entry) => `${entry.token.chain}:${entry.token.id}:${entry.selectable ? '1' : '0'}`)
				.join('|'),
		[filteredComputedOptions],
	)

	useEffect(() => {
		filteredOptionsRef.current = filteredComputedOptions
	}, [filteredComputedOptions])

	useEffect(() => {
		optionsKeyRef.current = optionsKey
	}, [optionsKey])

	const getSelectableIndex = useCallback(
		(direction: 1 | -1, startIndex: number) => {
			const options = filteredOptionsRef.current
			if (options.length === 0) return -1
			let index = startIndex
			for (let i = 0; i < options.length; i += 1) {
				index = (index + direction + options.length) % options.length
				if (options[index]?.selectable) {
					return index
				}
			}
			return startIndex
		},
		[],
	)

	const searchSignature = useMemo(() => searchValue.trim().toLowerCase(), [searchValue])

	useEffect(() => {
		if (!open) return
		const options = filteredOptionsRef.current
		const signature = `${searchSignature}|${optionsKeyRef.current}`
		if (lastResetSignatureRef.current === signature) return
		lastResetSignatureRef.current = signature
		if (options.length === 0) {
			setActiveIndex(-1)
			return
		}
		if (selectedId) {
			const selectedIndex = options.findIndex((entry) => entry.token.id.toLowerCase() === selectedId.toLowerCase())
			if (selectedIndex >= 0) {
				setActiveIndex(selectedIndex)
				return
			}
		}
		const firstSelectable = options.findIndex((entry) => entry.selectable)
		setActiveIndex(firstSelectable)
	}, [open, searchSignature, selectedId])

	useEffect(() => {
		if (!open) return
		requestAnimationFrame(() => {
			inputRef.current?.focus()
		})
	}, [open])

	useEffect(() => {
		if (!onSearch) return
		const trimmed = searchValue.trim()
		const handle = window.setTimeout(() => {
			if (lastDebouncedSearchRef.current === trimmed) return
			lastDebouncedSearchRef.current = trimmed
			onSearch(trimmed)
		}, SEARCH_DEBOUNCE_MS)
		return () => window.clearTimeout(handle)
	}, [searchValue, onSearch])

	const handleSelect = (token: TokenOption) => {
		onSelect(token)
		setOpen(false)
		setSearchValue('')
		requestAnimationFrame(() => {
			inputRef.current?.blur()
		})
	}

	useEffect(() => {
		if (!open) return
		if (activeIndex < 0) return
		const options = filteredOptionsRef.current
		const activeOption = options[activeIndex]
		if (!activeOption) return
		const optionId = `${listboxId}-${activeOption.token.chain}-${activeOption.token.id}`
		const node = document.getElementById(optionId)
		if (node) {
			requestAnimationFrame(() => {
				node.scrollIntoView({ block: 'nearest' })
			})
		}
	}, [activeIndex, open, listboxId])

	const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
		setSearchValue(event.target.value)
		if (!open) {
			setOpen(true)
		}
	}

	const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		const options = filteredOptionsRef.current
		switch (event.key) {
			case 'ArrowDown': {
				event.preventDefault()
				if (!open) setOpen(true)
				const start = activeIndex >= 0 ? activeIndex : options.findIndex((entry) => entry.selectable)
				if (start === -1) return
				setActiveIndex(getSelectableIndex(1, start))
				break
			}
			case 'ArrowUp': {
				event.preventDefault()
				if (!open) setOpen(true)
				const start = activeIndex >= 0 ? activeIndex : options.findIndex((entry) => entry.selectable)
				if (start === -1) return
				setActiveIndex(getSelectableIndex(-1, start))
				break
			}
			case 'Home': {
				if (!open) return
				event.preventDefault()
				setActiveIndex(options.findIndex((entry) => entry.selectable))
				break
			}
			case 'End': {
				if (!open) return
				event.preventDefault()
				for (let i = options.length - 1; i >= 0; i -= 1) {
					if (options[i]?.selectable) {
						setActiveIndex(i)
						break
					}
				}
				break
			}
			case 'Enter':
			case ' ': {
				event.preventDefault()
				if (!open) {
					setOpen(true)
					return
				}
				const option = activeIndex >= 0 ? options[activeIndex] : null
				if (option && option.selectable) {
					handleSelect(option.token)
				}
				break
			}
			case 'Escape': {
				if (!open) return
				event.preventDefault()
				setOpen(false)
				requestAnimationFrame(() => inputRef.current?.blur())
				break
			}
			case 'Tab': {
				setOpen(false)
				break
			}
			default:
				break
		}
	}

	return (
		<div ref={containerRef} className="relative">
			<div
				className="flex w-full items-center gap-3 rounded-2xl border border-white dark:border-slate-700/10 bg-slate-950/60 px-3 py-2 text-slate-200 shadow-sm backdrop-blur transition focus-within:border-sky-300 focus-within:ring-2 focus-within:ring-sky-300 focus-within:ring-offset-2 focus-within:ring-offset-slate-950"
				onClick={() => {
					if (!open) {
						setOpen(true)
					}
					inputRef.current?.focus()
				}}
				role="presentation"
			>
				{selectedToken ? (
					<span className="hidden min-w-0 items-center gap-3 md:flex">
						<Image
							src={selectedToken.icon}
							alt={`${selectedToken.symbol} icon`}
							width={32}
							height={32}
							className="h-8 w-8 flex-none rounded-full border border-white dark:border-slate-700/10 bg-slate-900 object-cover"
							unoptimized
						/>
						<span className="flex min-w-0 flex-col text-left">
							<span className="truncate text-sm font-semibold text-slate-100">{selectedToken.name}</span>
							<span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
								{selectedToken.symbol} · {CHAIN_LABEL[selectedToken.chain]}
							</span>
						</span>
					</span>
				) : null}
				<input
					ref={inputRef}
					id={id}
					type="search"
					value={searchValue}
					onChange={handleInputChange}
					onFocus={() => setOpen(true)}
					onKeyDown={handleInputKeyDown}
					placeholder={selectedToken ? 'Search tokens…' : 'Search verified token catalog'}
					className="flex-1 min-w-0 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
					role="combobox"
					aria-autocomplete="list"
					aria-expanded={open}
					aria-controls={listboxId}
					aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-${filteredOptionsRef.current[activeIndex]?.token.chain}-${filteredOptionsRef.current[activeIndex]?.token.id}` : undefined}
					aria-labelledby={ariaLabelledby}
					aria-describedby={triggerDescribedBy}
					autoComplete="off"
				/>
				<span className={`text-xs text-slate-400 transition ${open ? 'rotate-180' : ''}`} aria-hidden>
					⌄
				</span>
			</div>
			{open ? (
				<div className="absolute right-0 z-30 mt-2 w-full min-w-[280px] max-w-[360px] overflow-hidden rounded-2xl border border-white dark:border-slate-700/10 bg-slate-950/95 shadow-[0_18px_44px_rgba(17,24,39,0.45)] backdrop-blur-xl">
					<div className="border-b border-white dark:border-slate-700/10 bg-slate-950/80 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
						Results refresh automatically as you type.
					</div>
					<div 
						className="max-h-60 overflow-y-auto ock-scrollbar" 
						role="listbox" 
						id={listboxId} 
						aria-labelledby={ariaLabelledby}
						aria-live="polite"
						aria-atomic="false"
					>
						{loading ? (
							<AssetListSkeleton count={5} />
						) : error ? (
							<SelectorState variant="error" message={error} />
						) : filteredOptionsRef.current.length === 0 ? (
							searchValue.trim() ? (
								<SelectorState 
									variant="no-results" 
									message={`No tokens found for "${searchValue.trim()}"`}
									hint="Try searching by token symbol (e.g., USDC), name, or contract address (0x…)"
								/>
							) : (
								<SelectorState 
									variant="empty" 
									message="No tokens available"
									hint="Start typing to search the verified token catalog"
								/>
							)
						) : (
							<ul className="divide-y divide-white/5">
								{filteredOptionsRef.current.map((entry, index) => {
									const { token, selectable, reason } = entry
									const active = selectedId?.toLowerCase() === token.id.toLowerCase()
									const highlighted = index === activeIndex
									const optionId = `${listboxId}-${token.chain}-${token.id}`
									const guardId = reason ? `${optionId}-guard` : undefined
									return (
										<li
											key={`${token.chain}:${token.id}`}
											id={optionId}
											role="option"
											aria-selected={highlighted}
											aria-disabled={!selectable}
											aria-describedby={guardId}
											className={selectable ? '' : 'opacity-60'}
										>
											<button
												type="button"
												onMouseDown={(event) => event.preventDefault()}
												onMouseEnter={() => setActiveIndex(index)}
												onClick={() => {
												if (!selectable) return
												handleSelect(token)
											}}
												className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
												selectable ? 'cursor-pointer' : 'cursor-not-allowed'
											} ${
												highlighted
													? 'bg-sky-500/20 text-slate-100'
													: active
														? 'bg-sky-500/15 text-sky-100'
														: selectable
															? 'hover:bg-slate-100/90 dark:bg-white/5'
															: ''
											}`}
											>
												<span className="flex items-center gap-3">
													<Image
														src={token.icon}
														alt={`${token.symbol} icon`}
														width={32}
														height={32}
														className="h-8 w-8 rounded-full border border-white dark:border-slate-700/10 bg-slate-900 object-cover"
														unoptimized
													/>
													<span className="flex flex-col text-sm font-medium text-slate-100">
														<span>{token.name}</span>
														{reason ? (
															<span className="text-[10px] text-amber-200" id={guardId}>
																{reason}
															</span>
														) : null}
													</span>
												</span>
												<span className="flex flex-col items-end text-xs text-slate-300">
													<span className="font-semibold text-slate-200">{token.symbol}</span>
													<span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{CHAIN_LABEL[token.chain]}</span>
													{token.priceUsd != null ? (
														<span>{formatUsd(token.priceUsd)}</span>
													) : (
														<span className="text-slate-500">No price</span>
													)}
													{token.balance ? (
														<span className="text-[9px] text-slate-500">Indexed balance {token.balance}</span>
													) : null}
													<span
														className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[9px] uppercase tracking-[0.2em] ${
															token.verified ? 'bg-emerald-400/20 text-emerald-200' : 'bg-amber-400/20 text-amber-100'
														}`}
													>
														{token.verified ? 'Verified' : 'Manual review'}
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
		{selectedToken && !selectedToken.verified ? (
			<p className="mt-2 flex items-center gap-2 text-[11px] text-amber-200">
				<span aria-hidden>⚠️</span>
				<span>
					This contract is not flagged as verified in the Gmeow catalog. Double-check the address before publishing.
				</span>
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

