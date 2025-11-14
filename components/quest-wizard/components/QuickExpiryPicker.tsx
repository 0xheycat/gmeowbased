'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { describeRelativeExpiry, formatExpiryLabel, makeFutureDate, toLocalDateTimeInputValue } from '@/components/quest-wizard/shared'
import type { FieldControlA11yProps } from '@/components/quest-wizard/components/a11y'
import type { SegmentedToggleTone } from '@/components/quest-wizard/components/SegmentedToggle'

const EXPIRY_PRESET_CONFIGS: Array<{ id: string; label: string; caption: string; tone: SegmentedToggleTone; compute(): string }> = [
	{ id: '48h', label: '48 hours', caption: 'Flash quest window', tone: 'sky', compute: () => toLocalDateTimeInputValue(makeFutureDate({ hours: 48 })) },
	{ id: '7d', label: '7 days', caption: 'Perfect for weekly drops', tone: 'emerald', compute: () => toLocalDateTimeInputValue(makeFutureDate({ days: 7, alignToDayEnd: true })) },
	{ id: '14d', label: '14 days', caption: 'Two-week campaign arc', tone: 'purple', compute: () => toLocalDateTimeInputValue(makeFutureDate({ days: 14, alignToDayEnd: true })) },
	{ id: '30d', label: '30 days', caption: 'Season-long spotlight', tone: 'indigo', compute: () => toLocalDateTimeInputValue(makeFutureDate({ days: 30, alignToDayEnd: true })) },
]

export type QuickExpiryPickerProps = {
	value: string
	onChange(next: string): void
} & FieldControlA11yProps

export function QuickExpiryPicker({ value, onChange, id, 'aria-describedby': ariaDescribedby, 'aria-labelledby': ariaLabelledby }: QuickExpiryPickerProps) {
	// @edit-start 2025-11-12 — Extract quick expiry picker component
	const [activePreset, setActivePreset] = useState<string | null>(() => (value ? null : 'evergreen'))
	const timezoneLabel = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Local device time', [])
	const inputValue = useMemo(() => {
		if (!value) return ''
		const parsed = new Date(value)
		if (Number.isNaN(parsed.getTime())) return value
		return toLocalDateTimeInputValue(parsed)
	}, [value])
	const friendlyLabel = formatExpiryLabel(value)
	const relativeLabel = describeRelativeExpiry(value)
	const activeCaption = useMemo(() => {
		if (activePreset === 'evergreen') return 'Evergreen quests remain open until you pause or close them manually.'
		if (activePreset) {
			const preset = EXPIRY_PRESET_CONFIGS.find((item) => item.id === activePreset)
			return preset?.caption ?? null
		}
		return 'Custom schedule — claimers see the exact cutoff you choose above.'
	}, [activePreset])

	useEffect(() => {
		if (!value) {
			setActivePreset('evergreen')
			return
		}
		if (activePreset === 'evergreen') {
			setActivePreset(null)
		}
	}, [activePreset, value])

	const handlePresetClick = (presetId: string, compute: () => string) => {
		if (presetId === 'evergreen') {
			setActivePreset('evergreen')
			onChange('')
			return
		}
		const nextValue = compute()
		setActivePreset(presetId)
		onChange(nextValue)
	}

	const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
		setActivePreset(null)
		onChange(event.target.value)
	}

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap gap-2">
				{/* @edit-start 2025-11-12 — Add pressed state + focus ring to expiry presets */}
				<button
					type="button"
					onClick={() => handlePresetClick('evergreen', () => '')}
					className={`rounded-2xl border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
						activePreset === 'evergreen'
							? 'border-white/60 bg-white/80 text-slate-900 shadow-lg shadow-white/20'
							: 'border-white/12 text-slate-300 hover:border-white/20'
					}`}
					aria-pressed={activePreset === 'evergreen'}
				>
					Evergreen
				</button>
				{EXPIRY_PRESET_CONFIGS.map((preset) => (
					<button
						key={preset.id}
						type="button"
						onClick={() => handlePresetClick(preset.id, preset.compute)}
						title={preset.caption}
						className={`rounded-2xl border px-3 py-1.5 text-xs uppercase tracking-[0.18em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
							activePreset === preset.id
								? preset.tone === 'emerald'
									? 'border-emerald-300/70 bg-emerald-300/80 text-slate-900 shadow-lg shadow-emerald-400/25'
									: preset.tone === 'purple'
										? 'border-fuchsia-300/70 bg-fuchsia-400/80 text-white shadow-lg shadow-fuchsia-400/25'
										: preset.tone === 'indigo'
											? 'border-indigo-300/70 bg-indigo-400/80 text-white shadow-lg shadow-indigo-400/25'
											: 'border-sky-300/70 bg-sky-300/80 text-slate-950 shadow-lg shadow-sky-400/25'
									: 'border-white/12 text-slate-300 hover:border-white/20'
						}`}
						aria-pressed={activePreset === preset.id}
					>
						{preset.label}
					</button>
				))}
				{/* @edit-end */}
			</div>
			{activeCaption ? <p className="text-[11px] text-slate-400">{activeCaption}</p> : null}
			<div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
				<label className="flex flex-col gap-2 text-xs text-slate-300">
					<span className="font-semibold text-slate-200">Custom UTC expiry</span>
					<input
						type="datetime-local"
						value={inputValue}
						onChange={handleInputChange}
						className="pixel-input"
						id={id}
						aria-describedby={[ariaDescribedby].filter(Boolean).join(' ') || undefined}
						aria-labelledby={ariaLabelledby}
					/>
					<span className="text-[11px] text-slate-500">Leave blank to keep the quest evergreen. Times save in {timezoneLabel}.</span>
				</label>
			</div>
			<div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 px-4 py-3 text-xs text-sky-200">
				<p>
					<strong className="text-slate-100">Active expiry:</strong> {friendlyLabel}
				</p>
				<p className="mt-1 text-sky-100/80">{relativeLabel}</p>
			</div>
		</div>
	)
	// @edit-end
}
