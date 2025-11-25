'use client'

import { motion, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import { lazy, Suspense, useState } from 'react'
import { buildFrameShareUrl, openWarpcastComposer } from '@/lib/share'
import type { QuestDraft, QuestSummary, TokenEscrowPhase, TokenEscrowStatus } from '../shared'
import { STEPS } from '../shared'

// Lazy load QuestCard for better performance
const QuestCard = lazy(() => 
	import('./QuestCard').then(m => ({ default: m.QuestCard }))
)

export function PreviewCard({
	summary,
	draft,
	stepIndex,
	tokenEscrowStatus,
	rewardMode,
}: {
	summary: QuestSummary
	draft: QuestDraft
	stepIndex: number
	tokenEscrowStatus: TokenEscrowStatus | null
	rewardMode: QuestDraft['rewardMode']
}) {
	const [viewMode, setViewMode] = useState<'standard' | 'card'>('card')
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
	
	// Determine rarity for QuestCard based on reward type and metadata
	const getRarity = (): 'normal' | 'rare' | 'epic' | 'legendary' => {
		if (rewardMode === 'nft') return 'epic'
		if (rewardMode === 'token') {
			// Try to extract amount from rewardBadge or metaRows
			const rewardText = summary.rewardBadge || summary.metaRows.join(' ')
			const match = rewardText.match(/[\d,]+/)
			const amount = match ? parseFloat(match[0].replace(/,/g, '')) : 0
			
			if (amount > 1000) return 'legendary'
			if (amount > 100) return 'epic'
			return 'rare'
		}
		if (rewardMode === 'points') return 'rare'
		return 'normal'
	}
	
	// Show QuestCard if in final preview step (step 3)
	if (viewMode === 'card' && stepIndex === 3) {
		return (
			<div className="space-y-4">
				{/* View toggle */}
				<div className="flex justify-end gap-2">
					<button
						onClick={() => setViewMode('standard')}
						className="rounded-lg bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5/5 px-3 py-1.5 text-xs text-slate-400 transition hover:bg-slate-100/10 dark:bg-slate-100/90 dark:bg-white/5/5"
					>
						Standard View
					</button>
					<button
						onClick={() => setViewMode('card')}
						className="rounded-lg bg-sky-500/20 px-3 py-1.5 text-xs text-sky-300"
					>
						Card View ✨
					</button>
				</div>
				
				<Suspense fallback={<CardLoadingSkeleton />}>
					<QuestCard
						summary={summary}
						variant={getRarity()}
						showFlip={true}
					/>
				</Suspense>
			</div>
		)
	}
	
	return (
		<div className="space-y-4">
			{/* View toggle - only show on preview step */}
			{stepIndex === 3 && (
				<div className="flex justify-end gap-2">
					<button
						onClick={() => setViewMode('standard')}
						className="rounded-lg bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5/5 px-3 py-1.5 text-xs text-slate-400"
					>
						Standard View
					</button>
					<button
						onClick={() => setViewMode('card')}
						className="rounded-lg bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5/5 px-3 py-1.5 text-xs text-slate-400 transition hover:bg-slate-100/10 dark:bg-slate-100/90 dark:bg-white/5/5"
					>
						Card View ✨
					</button>
				</div>
			)}
			
			<motion.div
			className="group relative overflow-hidden rounded-2xl lg:rounded-3xl border border-white dark:border-slate-700/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-[1px]"
			/* @edit-start 2025-11-12 — Disable hover wobble when reduced motion is requested */
			whileHover={prefersReducedMotion ? undefined : { rotateX: -2, rotateY: 3 }}
			transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 20 }}
			/* @edit-end */
		>
			<div className="relative h-full rounded-[calc(1rem-1px)] lg:rounded-[calc(1.5rem-1px)] bg-slate-950/95 p-4 lg:p-6 backdrop-blur">
				<div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_transparent_60%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
				<div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
					<span>Live preview</span>
					<div className="flex items-center gap-2">
						{escrowBadge}
						{stepIndex === 3 && (
							<button
								onClick={() => {
									const frameUrl = buildFrameShareUrl({
										type: 'quest',
										chain: draft.chain,
										questId: 'draft',
									})
									const castText = `Check out my new quest: ${summary.title} \ud83c\udfaf`
									void openWarpcastComposer(castText, frameUrl)
								}}
								className="rounded-lg bg-sky-500/20 px-3 py-1.5 text-[10px] font-semibold text-sky-200 transition hover:bg-sky-500/30 border border-sky-400/30"
								title="Share quest frame on Farcaster"
							>
								🔗 Share Frame
							</button>
						)}
						<span>
							Step {stepIndex + 1} / {STEPS.length}
						</span>
					</div>
				</div>

				<div className="mt-4 lg:mt-6 space-y-4 lg:space-y-5">
					<div className="relative h-36 lg:h-40 w-full overflow-hidden rounded-xl lg:rounded-2xl border border-white dark:border-slate-700/10 bg-slate-900">
						{summary.mediaPreview ? (
							<Image src={summary.mediaPreview} alt="Quest cover" fill className="object-cover" sizes="320px" unoptimized />
						) : (
							<div className="flex h-full w-full items-center justify-center text-xs text-slate-500">Upload art in Step 1</div>
						)}
					</div>

					<div>
						<h3 className="text-xl lg:text-2xl font-semibold text-slate-100">{summary.title}</h3>
						<p className="text-sm text-slate-300 mt-1">{summary.subtitle}</p>
					</div>

					<div className="flex flex-wrap gap-2 text-[10px] lg:text-[11px] uppercase tracking-[0.2em] text-slate-400">
						<span className="rounded-full border border-white dark:border-slate-700/10 px-3 py-1">{summary.chainLabel}</span>
						<span className="rounded-full border border-white dark:border-slate-700/10 px-3 py-1">{summary.questTypeLabel}</span>
						<span className="rounded-full border border-white dark:border-slate-700/10 px-3 py-1">
							{summary.questMode === 'social' ? 'Social quest' : 'Onchain quest'}
						</span>
						{summary.eligibilityBadge ? <span className="rounded-full border border-white dark:border-slate-700/10 px-3 py-1">{summary.eligibilityBadge}</span> : null}
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
		</div>
	)
}

function CardLoadingSkeleton() {
	return (
		<div className="h-[440px] w-full max-w-[320px] animate-pulse rounded-2xl bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5/5" />
	)
}
