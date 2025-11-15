import type { QuestPolicy } from '@/lib/quest-policy'

export function CatalogStatusBanner({
	label,
	loading,
	error,
	warnings,
	onRefresh,
	policy,
}: {
	label: string
	loading?: boolean
	error?: string | null
	warnings?: string[]
	onRefresh?: () => void
	policy?: QuestPolicy
}) {
	const icon = error ? '⚠️' : loading ? '⏳' : '🔍'
	// @edit-start 2025-11-11 — Tailor catalog messaging to quest policy
	const enforceVerified = Boolean(policy?.requireVerifiedAssets)
	const description = error
		? error
		: loading
			? 'Querying tokens and NFT collections…'
			: enforceVerified
				? 'Catalog synced from Gmeow API. Only verified assets are selectable for this tier.'
				: 'Catalog synced from Gmeow API. Verified assets show an emerald badge — search or use wallet:0x… syntax to refine results.'
	// @edit-end

	return (
		<div className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
			<span className="mt-0.5 text-lg">{icon}</span>
			<div className="w-full space-y-2">
				<div className="flex items-center justify-between gap-3">
					<strong className="text-[11px] uppercase tracking-[0.3em] text-amber-200">{label}</strong>
					{onRefresh ? (
						<button
							type="button"
							onClick={onRefresh}
							/* @edit-start 2025-11-12 — Add focus outline to catalog refresh */
							className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-100 transition hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
						>
							Refresh
						</button>
						/* @edit-end */
					) : null}
				</div>
				<span>{description}</span>
				{warnings && warnings.length > 0 ? (
					<ul className="space-y-0.5 text-[10px] text-amber-100/80">
						{warnings.map((warning) => (
							<li key={warning}>• {warning}</li>
						))}
					</ul>
				) : null}
			</div>
		</div>
	)
}
