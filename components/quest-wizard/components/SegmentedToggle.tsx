'use client'

import type { KeyboardEvent, ReactNode } from 'react'

export type SegmentedToggleTone = 'sky' | 'emerald' | 'amber' | 'indigo' | 'purple' | 'neutral'

export type SegmentedToggleOption<T extends string> = {
	value: T
	label: string
	description?: string
	badge?: string | ReactNode
	tone?: SegmentedToggleTone
	// @edit-start 2025-11-11 — Support disabled toggle options
	disabled?: boolean
	disabledReason?: string
	// @edit-end
}

export type SegmentedToggleProps<T extends string> = {
	options: Array<SegmentedToggleOption<T>>
	value: T
	onChange(next: T): void
	size?: 'sm' | 'md'
	ariaLabel?: string
}

export function SegmentedToggle<T extends string>({ options, value, onChange, size = 'md', ariaLabel }: SegmentedToggleProps<T>) {
	const toneClass: Record<SegmentedToggleTone, string> = {
		sky: 'border-sky-400/60 bg-gradient-to-r from-sky-400/80 via-blue-400/80 to-indigo-500/80 text-slate-900 dark:text-slate-500 shadow-lg shadow-sky-500/25',
		emerald: 'border-emerald-400/60 bg-gradient-to-r from-emerald-300/80 via-emerald-400/80 to-teal-400/80 text-slate-900 dark:text-slate-500 shadow-lg shadow-emerald-400/25',
		amber: 'border-amber-400/60 bg-gradient-to-r from-amber-300/80 via-amber-400/80 to-amber-500/80 text-slate-950 shadow-lg shadow-amber-500/25',
		indigo: 'border-indigo-400/60 bg-gradient-to-r from-indigo-400/80 via-violet-400/80 to-purple-500/80 text-slate-100 shadow-lg shadow-indigo-500/25',
		purple: 'border-fuchsia-400/60 bg-gradient-to-r from-fuchsia-400/80 via-purple-400/80 to-indigo-500/80 text-slate-100 shadow-lg shadow-fuchsia-500/25',
		neutral: 'border-slate-200 dark:border-white/10 bg-slate-100/90 dark:bg-white/5 text-slate-900 dark:text-slate-500 shadow-lg shadow-white/10',
	}
	const baseInactive = 'border border-slate-200 dark:border-white/10 text-slate-300 hover:border-slate-200 dark:border-white/10'
	const padding = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
	const layout = size === 'sm' ? 'gap-1' : 'gap-2'
	const minWidth = size === 'sm' ? 'min-w-[120px]' : 'min-w-[160px]'
	const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
	// @edit-start 2025-11-11 — Ignore disabled items when computing active index
	const activeIndexRaw = options.findIndex((option) => option.value === value && !option.disabled)
	const fallbackIndex = options.findIndex((option) => !option.disabled)
	const activeIndex = activeIndexRaw === -1 ? (fallbackIndex === -1 ? 0 : fallbackIndex) : activeIndexRaw
	// @edit-end

	const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
		if (!options.length) return
		// @edit-start 2025-11-11 — Skip disabled options in keyboard navigation
		const move = (delta: number) => {
			let nextIndex = index
			let iterations = 0
			while (iterations < options.length) {
				nextIndex = (nextIndex + delta + options.length) % options.length
				if (!options[nextIndex]?.disabled) {
					onChange(options[nextIndex].value)
					return
				}
				iterations += 1
			}
		}
		// @edit-end

		switch (event.key) {
			case 'ArrowRight':
			case 'ArrowDown':
				event.preventDefault()
				move(1)
				break
			case 'ArrowLeft':
			case 'ArrowUp':
				event.preventDefault()
				move(-1)
				break
			case 'Home':
				event.preventDefault()
				onChange(options[0].value)
				break
			case 'End':
				event.preventDefault()
				onChange(options[options.length - 1].value)
				break
			default:
				break
		}
	}

	return (
		<div className="flex flex-wrap gap-2" role="radiogroup" aria-label={ariaLabel}>
			{options.map((option, index) => {
				const active = option.value === value
				const tone = option.tone ?? 'sky'
				const isDisabled = Boolean(option.disabled)
				const baseClass = `group flex ${minWidth} flex-col rounded-2xl transition ${focusRing} ${padding} ${layout}`
				// @edit-start 2025-11-11 — Style disabled segmented options
				const stateClass = isDisabled
					? 'cursor-not-allowed border border-slate-200 dark:border-white/10 text-slate-500/70 opacity-60'
					: active
						? toneClass[tone]
						: baseInactive
				// @edit-end
				return (
					<button
						key={option.value}
						type="button"
						role="radio"
						aria-checked={active}
						aria-disabled={isDisabled}
						aria-posinset={index + 1}
						aria-setsize={options.length}
						tabIndex={isDisabled ? -1 : active ? 0 : index === activeIndex ? 0 : -1}
						onKeyDown={(event) => handleKeyDown(event, index)}
						onClick={() => {
							if (isDisabled) return
							onChange(option.value)
						}}
						disabled={isDisabled}
						title={isDisabled ? option.disabledReason : undefined}
						className={`${baseClass} ${stateClass}`}
					>
						<span className={`font-semibold ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>{option.label}</span>
						{option.description ? (
							<span className={`text-[11px] ${isDisabled ? 'text-slate-500/80' : active ? 'text-slate-900/80' : 'text-slate-400'}`}>{option.description}</span>
						) : null}
						{option.badge ? (
							<span className={`w-fit rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${active ? 'bg-black/20 text-black dark:text-slate-950 dark:text-white' : 'bg-slate-100/90 dark:bg-white/5 text-slate-300'}`}>
								{option.badge}
							</span>
						) : null}
					</button>
				)
			})}
		</div>
	)
}
