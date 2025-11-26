import Image from 'next/image'
import type { QuestDraft, QuestSummary, TokenOption, NftOption, TokenEscrowStatus, QuestVerificationState, QuestVerificationSuccess } from '../shared'
import { formatRelativeTimeFromNow, toPositiveInt } from '../shared'
import { Field } from '../components/Field'

function formatVerificationValue(value: unknown): string {
	if (value === null || value === undefined) return '—'
	if (typeof value === 'boolean') return value ? 'true' : 'false'
	if (typeof value === 'number') return String(value)
	if (typeof value === 'string') {
		if (value.length > 80) return value.slice(0, 80) + '…'
		return value
	}
	if (Array.isArray(value)) {
		return value.length ? `[${value.length} items]` : '[]'
	}
	if (typeof value === 'object') {
		const keys = Object.keys(value)
		return keys.length ? `{${keys.length} keys}` : '{}'
	}
	return String(value)
}

export function FinalizeStep({
	draft,
	summary,
	tokens,
	nfts,
	assetWarnings,
	assetsError,
	assetsLoading,
	tokenEscrowStatus,
	verificationState,
	onVerifyDraft,
}: {
	draft: QuestDraft
	summary: QuestSummary
	tokens: TokenOption[]
	nfts: NftOption[]
	assetWarnings: string[]
	assetsError: string | null
	assetsLoading: boolean
	tokenEscrowStatus: TokenEscrowStatus | null
	verificationState: QuestVerificationState
	onVerifyDraft(options?: { force?: boolean }): Promise<QuestVerificationSuccess | null> | null | void
}) {
	const tokenCount = tokens.length
	const nftCount = nfts.length
	const assetStatusMessage = assetsLoading
		? 'Fetching catalog data...'
		: assetsError
			? assetsError
			: `Loaded ${tokenCount} token${tokenCount === 1 ? '' : 's'} and ${nftCount} NFT collection${nftCount === 1 ? '' : 's'} from the Gmeow catalog.`
	const assetStatusVariant = assetsError ? 'error' : assetsLoading ? 'loading' : 'ready'
	const verificationStatus = verificationState.status
	const verificationData = verificationState.data
	const verificationError = verificationState.error
	const verificationVariant = verificationStatus === 'success' ? 'success' : verificationStatus === 'error' ? 'error' : verificationStatus === 'pending' ? 'pending' : 'idle'
	const verificationDuration = verificationData?.durationMs ? Math.round(Number(verificationData.durationMs)) : null
	const verificationMessage = (() => {
		if (verificationStatus === 'pending') return 'Running /api/quests/verify…'
		if (verificationStatus === 'success') return verificationDuration ? `Verified via /api/quests/verify in ${verificationDuration}ms` : 'Verified via /api/quests/verify'
		if (verificationStatus === 'error') return verificationError || 'Verification failed via /api/quests/verify'
		return 'Preview verification available via /api/quests/verify'
	})()
	const verificationClass = {
		success: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100',
		error: 'border-rose-500/40 bg-rose-500/15 text-rose-100',
		pending: 'border-sky-400/40 bg-sky-500/10 text-sky-100',
		idle: 'border-slate-200 dark:border-white/10 bg-slate-950/60 text-slate-200',
	}[verificationVariant]
	const requirementEntries = verificationData ? Object.entries(verificationData.requirement || {}) : []
	const metaEntries = verificationData ? Object.entries(verificationData.meta || {}) : []
	const castEntries = verificationData ? Object.entries(verificationData.castDetails || {}) : []
	const verifyButtonLabel = verificationStatus === 'pending' ? 'Verifying…' : 'Re-run verify'
	const isTokenReward = draft.rewardMode === 'token'
	const escrowStatus = isTokenReward ? tokenEscrowStatus : null
	const symbolSuffix = escrowStatus?.symbol ? ` ${escrowStatus.symbol}` : ''
	const expectedDisplay = escrowStatus ? `${escrowStatus.expectedTotalDisplay}${symbolSuffix}` : null
	const recordedDisplay = escrowStatus ? `${escrowStatus.recordedTotalDisplay}${symbolSuffix}` : null
	const perUserDisplay = escrowStatus ? `${escrowStatus.expectedPerUserDisplay}${symbolSuffix}` : null
	const maxCompletionsCount = toPositiveInt(draft.maxCompletions, 0)
	const claimerSummary = maxCompletionsCount > 0 ? `${maxCompletionsCount.toLocaleString()} claimer${maxCompletionsCount === 1 ? '' : 's'}` : null
	const detectedAtLabel = escrowStatus?.detectedAtMs
		? new Date(escrowStatus.detectedAtMs).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
		: null
	const warmupRelative = escrowStatus?.readyAtMs ? formatRelativeTimeFromNow(escrowStatus.readyAtMs) : null
	const warmupAbsolute = escrowStatus?.readyAtMs
		? new Date(escrowStatus.readyAtMs).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
		: null
	const escrowBlockers: string[] = []
	const pushBlocker = (message: string) => {
		if (!escrowBlockers.includes(message)) {
			escrowBlockers.push(message)
		}
	}
	let escrowStatusTitle = 'Escrow not configured yet'
	let escrowStatusDescription = 'Open Step 3 and add the funding transaction, amount, and detection timestamp.'
	let escrowStatusTone = 'border-rose-500/40 bg-rose-500/15 text-rose-100'
	let escrowStatusIcon = '⚠️'
	if (!isTokenReward) {
		// no-op — non-token quests skip escrow requirements
	} else if (!escrowStatus) {
		pushBlocker('Pick a verified ERC-20 reward and fill in the escrow fields in Step 3 → Rewards.')
	} else {
		escrowStatusTitle = (() => {
			switch (escrowStatus.state) {
				case 'ready':
					return 'Escrow ready'
				case 'warming':
					return 'Warm-up in progress'
				case 'awaiting-detection':
					return 'Waiting on detection'
				case 'insufficient':
					return 'Top up the escrow deposit'
				case 'missing':
				default:
					return 'Escrow incomplete'
			}
		})()
		escrowStatusDescription = (() => {
			switch (escrowStatus.state) {
				case 'ready':
					return 'Everything checks out. You can publish once the rest of the checklist is clear.'
				case 'warming':
					return warmupRelative && warmupAbsolute
						? `Warm-up finishes ${warmupRelative} (${warmupAbsolute}). Launch after the hold clears.`
						: 'Warm-up finishes soon. Launch after the hold clears.'
				case 'awaiting-detection':
					return 'We have not seen the detection timestamp yet — update Step 3 once the automation queue catches it.'
				case 'insufficient':
					return `Deposit currently covers ${recordedDisplay ?? '0'} but needs ${expectedDisplay ?? 'the full amount'} for every claimer.`
				case 'missing':
				default:
					return 'Add the funding transaction hash, total amount, and detection timestamp in Step 3 before going live.'
			}
		})()
		escrowStatusTone = (() => {
			switch (escrowStatus.state) {
				case 'ready':
					return 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100'
				case 'warming':
					return 'border-amber-400/40 bg-amber-500/10 text-amber-100'
				case 'awaiting-detection':
					return 'border-sky-400/40 bg-sky-500/10 text-sky-100'
				case 'insufficient':
					return 'border-rose-500/40 bg-rose-500/15 text-rose-100'
				case 'missing':
				default:
					return 'border-rose-500/40 bg-rose-500/15 text-rose-100'
			}
		})()
		escrowStatusIcon = (() => {
			switch (escrowStatus.state) {
				case 'ready':
					return '✅'
				case 'warming':
					return '⏳'
				case 'awaiting-detection':
					return '🔁'
				case 'insufficient':
					return '⚠️'
				case 'missing':
				default:
					return '⚠️'
			}
		})()
		if (escrowStatus.missingFields.includes('tx')) {
			pushBlocker('Add the funding transaction hash in Step 3 → Rewards.')
		}
		if (escrowStatus.missingFields.includes('amount')) {
			pushBlocker('Record the escrow amount exactly as sent onchain (token units).')
		}
		if (escrowStatus.missingFields.includes('detectedAt')) {
			pushBlocker('Stamp the detection timestamp after the automation queue observes the transfer.')
		}
		if (escrowStatus.missingFields.includes('configuration')) {
			pushBlocker('Confirm reward-per-claimer and completion cap produce a non-zero funding target.')
		}
		if (escrowStatus.state === 'insufficient') {
			pushBlocker(`Top up the escrow to at least ${expectedDisplay ?? 'the required total'}.`)
		}
		if (escrowStatus.state === 'awaiting-detection') {
			pushBlocker('Update the detection timestamp once the automation queue records the deposit.')
		}
	}
	const detectionSummary = detectedAtLabel ? `Seen ${detectedAtLabel}` : 'Waiting for detection timestamp'
	const warmupSummary = (() => {
		if (!escrowStatus) return isTokenReward ? 'Escrow summary unavailable' : 'Not applicable'
		switch (escrowStatus.state) {
			case 'ready':
				return 'Warm-up complete'
			case 'warming':
				return warmupRelative && warmupAbsolute ? `Unlocks ${warmupRelative} (${warmupAbsolute})` : 'Warm-up in progress'
			case 'awaiting-detection':
				return 'Waiting on detection timestamp'
			case 'insufficient':
				return 'Top up required before launch'
			case 'missing':
			default:
				return 'Escrow configuration incomplete'
		}
	})()

	const escrowStateDataAttr = tokenEscrowStatus?.state ?? 'not-applicable'

	return (
		<div className="space-y-6">
			<span className="sr-only" data-escrow-state={escrowStateDataAttr} />
			<div className="rounded-3xl border border-white dark:border-slate-700/10 bg-slate-950/70 p-4">
				<div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
					<span>Launch checklist</span>
					<span>{summary.expiryLabel}</span>
				</div>
				<h3 className="mt-3 text-lg font-semibold text-slate-100">{summary.title}</h3>
				<p className="text-sm text-slate-300">{summary.subtitle}</p>
				<div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
					<span className="rounded-full border border-white dark:border-slate-700/10 px-3 py-1">{summary.chainLabel}</span>
					<span className="rounded-full border border-white dark:border-slate-700/10 px-3 py-1">{summary.questTypeLabel}</span>
					<span className="rounded-full border border-white dark:border-slate-700/10 px-3 py-1">
						{summary.questMode === 'social' ? 'Social quest' : 'Onchain quest'}
					</span>
					{summary.eligibilityBadge ? <span className="rounded-full border border-white dark:border-slate-700/10 px-3 py-1">{summary.eligibilityBadge}</span> : null}
					{summary.rewardBadge ? <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-emerald-200">{summary.rewardBadge}</span> : null}
				</div>
			</div>

			<div className="grid gap-4">
				<Field label="ERC-20 escrow readiness">
					{!isTokenReward ? (
						<p className="rounded-2xl border border-white dark:border-slate-700/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">Token escrow not required for this quest.</p>
					) : !escrowStatus ? (
						<div className="rounded-2xl border border-amber-500/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-100">
							Select a verified ERC-20 reward and complete the funding fields in Step 3 to unlock this summary.
						</div>
					) : (
						<div className="space-y-4">
							<div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${escrowStatusTone}`}>
								<span aria-hidden className="text-lg">{escrowStatusIcon}</span>
								<div>
									<p className="font-semibold">{escrowStatusTitle}</p>
									<p className="mt-1 text-[13px] leading-snug">{escrowStatusDescription}</p>
								</div>
							</div>
							<div className="grid gap-3 sm:grid-cols-2">
								<div className="rounded-2xl border border-white dark:border-slate-700/10 bg-slate-950/50 px-3 py-2">
									<p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Funding target</p>
									<p className="mt-1 text-sm font-semibold text-slate-100">{expectedDisplay ?? '—'}</p>
									<p className="text-[11px] text-slate-400">
										{perUserDisplay ? `${perUserDisplay} each${claimerSummary ? ` · ${claimerSummary}` : ''}` : claimerSummary ?? 'Per claimer pending'}
									</p>
								</div>
								<div className="rounded-2xl border border-white dark:border-slate-700/10 bg-slate-950/50 px-3 py-2">
									<p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Recorded deposit</p>
									<p className="mt-1 text-sm font-semibold text-slate-100">{recordedDisplay ?? '—'}</p>
									<p className="text-[11px] text-slate-400">
										{recordedDisplay ? 'Matches latest queue snapshot' : 'Awaiting deposit snapshot'}
									</p>
								</div>
								<div className="rounded-2xl border border-white dark:border-slate-700/10 bg-slate-950/50 px-3 py-2">
									<p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Detection</p>
									<p className="mt-1 text-sm font-semibold text-slate-100">{detectedAtLabel ?? '—'}</p>
									<p className="text-[11px] text-slate-400">{detectionSummary}</p>
								</div>
								<div className="rounded-2xl border border-white dark:border-slate-700/10 bg-slate-950/50 px-3 py-2">
									<p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Warm-up status</p>
									<p className="mt-1 text-sm font-semibold text-slate-100">{warmupSummary}</p>
								</div>
							</div>
							{escrowBlockers.length ? (
								<div className="rounded-2xl border border-rose-500/40 bg-rose-500/15 px-4 py-3 text-[13px] text-rose-100">
									<p className="font-semibold">Launch blockers</p>
									<ul className="mt-2 space-y-1 text-[12px] leading-relaxed">
										{escrowBlockers.map((blocker) => (
											<li key={blocker}>• {blocker}</li>
										))}
									</ul>
								</div>
							) : null}
						</div>
					)}
				</Field>
				<Field label="Narrative overview">
					<p className="rounded-2xl border border-white dark:border-slate-700/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">{summary.description}</p>
					{summary.partnerCopy ? (
						<p className="rounded-2xl border border-sky-400/30 bg-sky-400/10 px-4 py-3 text-xs text-sky-200">{summary.partnerCopy}</p>
					) : null}
				</Field>

				<Field label="Wallet asset sync">
					<div
						className={`rounded-2xl border px-4 py-3 text-xs ${
							assetStatusVariant === 'error'
								? 'border-rose-500/40 bg-rose-500/15 text-rose-100'
								: assetStatusVariant === 'loading'
									? 'border-sky-400/40 bg-sky-500/10 text-sky-100'
									: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
						}`}
					>
						{assetStatusMessage}
					</div>
					{assetWarnings.length > 0 ? (
						<ul className="mt-2 space-y-1 text-[11px] text-amber-200">
							{assetWarnings.map((warning) => (
								<li key={warning}>• {warning}</li>
							))}
						</ul>
					) : null}
				</Field>

				<Field label="Quest metadata">
					<ul className="grid gap-2 text-sm text-slate-300">
						{summary.metaRows.map((row) => (
							<li key={row}>• {row}</li>
						))}
					</ul>
				</Field>

				<Field label="API verification">
					<div className={`rounded-2xl border px-4 py-3 text-xs ${verificationClass}`}>
						<div className="flex flex-wrap items-center justify-between gap-3">
							<span>{verificationMessage}</span>
							<button
								type="button"
								onClick={() => void onVerifyDraft({ force: true })}
								disabled={verificationStatus === 'pending'}
								className="rounded-full border border-white dark:border-slate-700/10 bg-slate-100/10 dark:bg-slate-100/90 dark:bg-white/5 px-3 py-1 text-[11px] text-slate-100 transition hover:border-white dark:border-slate-700/20 hover:bg-slate-100/20 dark:bg-slate-100/90 dark:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{verifyButtonLabel}
							</button>
						</div>
						{verificationStatus === 'error' && verificationError ? (
							<p className="mt-2 text-[11px] text-rose-200">{verificationError}</p>
						) : null}
						{verificationStatus === 'success' ? (
							<div className="mt-3 space-y-3 text-slate-100">
								{requirementEntries.length ? (
									<div>
										<p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Requirement</p>
										<ul className="mt-1 space-y-1 text-[11px]">
											{requirementEntries.slice(0, 5).map(([key, value]) => (
												<li key={`req-${key}`} className="flex items-start justify-between gap-2">
													<span className="font-semibold text-slate-300">{key}</span>
													<span className="max-w-[60%] text-right text-slate-100">{formatVerificationValue(value)}</span>
												</li>
											))}
										</ul>
									</div>
								) : null}
								{metaEntries.length ? (
									<div>
										<p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Meta</p>
										<ul className="mt-1 space-y-1 text-[11px]">
											{metaEntries.slice(0, 5).map(([key, value]) => (
												<li key={`meta-${key}`} className="flex items-start justify-between gap-2">
													<span className="font-semibold text-slate-300">{key}</span>
													<span className="max-w-[60%] text-right text-slate-100">{formatVerificationValue(value)}</span>
												</li>
											))}
										</ul>
									</div>
								) : null}
								{castEntries.length ? (
									<div>
										<p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Cast details</p>
										<ul className="mt-1 space-y-1 text-[11px]">
											{castEntries.slice(0, 4).map(([key, value]) => (
												<li key={`cast-${key}`} className="flex items-start justify-between gap-2">
													<span className="font-semibold text-slate-300">{key}</span>
													<span className="max-w-[60%] text-right text-slate-100">{formatVerificationValue(value)}</span>
												</li>
											))}
										</ul>
									</div>
								) : null}
							</div>
						) : null}
					</div>
				</Field>

				<Field label="Uploaded media">
					<div className="flex flex-wrap gap-4">
						<div className="relative h-36 w-36 overflow-hidden rounded-2xl border border-white dark:border-slate-700/10 bg-slate-900">
							{summary.mediaPreview ? (
								<Image src={summary.mediaPreview} alt="Quest media" fill className="object-cover" sizes="150px" unoptimized />
							) : (
								<div className="flex h-full w-full items-center justify-center text-[11px] text-slate-400">No image yet</div>
							)}
						</div>
						<div className="flex flex-col justify-center gap-1 text-xs text-slate-400">
							<span>{summary.mediaFileName || '— no file uploaded —'}</span>
							<span>Displayed on Step 4 preview card and the final quest card.</span>
						</div>
					</div>
				</Field>
			</div>

			<div className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
				Looks good? Wire this draft into <code className="rounded bg-emerald-900/60 px-1 text-[12px] text-emerald-100">createAddQuestTransaction</code> once the contract migrations land. Until then this wizard is purely a UX sandbox.
			</div>
		</div>
	)
}
