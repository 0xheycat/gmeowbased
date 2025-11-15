'use client'

import { motion, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import type { QuestDraft, QuestSummary, TokenEscrowPhase, TokenEscrowStatus } from '../shared'
import { STEPS } from '../shared'

export function PreviewCard({
	summary,
	stepIndex,
	tokenEscrowStatus,
	rewardMode,
}: {
	summary: QuestSummary
	stepIndex: number
	tokenEscrowStatus: TokenEscrowStatus | null
	rewardMode: QuestDraft['rewardMode']
}) {
	const prefersReducedMotion = useReducedMotion()
	const escrowBadge = (() => {
		if (rewardMode !== 'token') return null
		const state = tokenEscrowStatus?.state ?? 'missing'
		const config: Record<TokenEscrowPhase, { label: string; icon: string; className: string }> = {
			ready: {
				label: 'Escrow ready',
				icon: '✅',
				className: 'border border-emerald-400/40 bg-emerald-400/10 text-emerald-100',
			},
			warming: {
				label: 'Warm-up hold',
				icon: '⏳',
				className: 'border border-amber-400/40 bg-amber-500/10 text-amber-100',
			},
			'awaiting-detection': {
				label: 'Awaiting detection',
				icon: '🔁',
				className: 'border border-sky-400/40 bg-sky-500/10 text-sky-100',
			},
			insufficient: {
				label: 'Top up escrow',
				icon: '⚠️',
				className: 'border border-rose-500/40 bg-rose-500/15 text-rose-100',
			},
			missing: {
				label: 'Escrow incomplete',
				icon: '⚠️',
				className: 'border border-rose-500/40 bg-rose-500/15 text-rose-100',
			},
		}
		const badge = config[state]
		return (
			<span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${badge.className}`}>
				<span aria-hidden>{badge.icon}</span>
				<span>{badge.label}</span>
			</span>
		)
	})()
	return (
		<motion.div
			className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-[1px]"
			/* @edit-start 2025-11-12 — Disable hover wobble when reduced motion is requested */
			whileHover={prefersReducedMotion ? undefined : { rotateX: -2, rotateY: 3 }}
			transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 20 }}
			/* @edit-end */
		>
			<div className="relative h-full rounded-[calc(1.5rem-1px)] bg-slate-950/95 p-6 backdrop-blur">
				<div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_transparent_60%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
				<div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
					<span>Live preview</span>
					<div className="flex items-center gap-2">
						{escrowBadge}
						<span>
							Step {stepIndex + 1} / {STEPS.length}
						</span>
					</div>
				</div>

				<div className="mt-6 space-y-5">
					<div className="relative h-40 w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
						{summary.mediaPreview ? (
							<Image src={summary.mediaPreview} alt="Quest cover" fill className="object-cover" sizes="320px" unoptimized />
						) : (
							<div className="flex h-full w-full items-center justify-center text-xs text-slate-500">Upload art in Step 1</div>
						)}
					</div>

					<div>
						<h3 className="text-2xl font-semibold text-slate-100">{summary.title}</h3>
						<p className="text-sm text-slate-300">{summary.subtitle}</p>
					</div>

					<div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
						<span className="rounded-full border border-white/10 px-3 py-1">{summary.chainLabel}</span>
						<span className="rounded-full border border-white/10 px-3 py-1">{summary.questTypeLabel}</span>
						<span className="rounded-full border border-white/10 px-3 py-1">
							{summary.questMode === 'social' ? 'Social quest' : 'Onchain quest'}
						</span>
						{summary.eligibilityBadge ? <span className="rounded-full border border-white/10 px-3 py-1">{summary.eligibilityBadge}</span> : null}
						{summary.rewardBadge ? <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-emerald-200">{summary.rewardBadge}</span> : null}
					</div>

					<p className="text-sm text-slate-300">{summary.description}</p>
					{summary.partnerCopy ? <p className="rounded-2xl border border-sky-400/30 bg-sky-400/10 p-3 text-xs text-sky-200">{summary.partnerCopy}</p> : null}

					<ul className="grid gap-1 text-xs text-slate-400">
						{summary.metaRows.slice(0, 3).map((row, index) => (
							<li key={`summary-meta-${index}`}>• {row}</li>
						))}
					</ul>
					<p className="mt-3 text-[11px] uppercase tracking-[0.3em] text-slate-500">Expiry · {summary.expiryLabel}</p>
				</div>
			</div>
		</motion.div>
	)
}
