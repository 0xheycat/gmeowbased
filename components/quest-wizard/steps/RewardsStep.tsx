import { useMemo } from 'react'
import type { QuestDraft, TokenOption, NftOption, StepErrors, TokenEscrowStatus } from '../shared'
import { sanitizeNumericInput, toLocalDateTimeInputValue, toIsoStringOrEmpty, formatRelativeTimeFromNow, toPositiveInt } from '../shared'
import { Field } from '../components/Field'
import { SegmentedToggle } from '../components/SegmentedToggle'
import { TokenSelector } from '../components/TokenSelector'
import { NftSelector } from '../components/NftSelector'
import { CatalogStatusBanner } from '../components/CatalogStatusBanner'
import { isAssetAllowed, type QuestPolicy } from '@/lib/quest-policy'

export function RewardsStep({
	draft,
	policy,
	onChange,
	tokens,
	nfts,
	tokenLoading,
	tokenError,
	nftLoading,
	nftError,
	tokenQuery,
	nftQuery,
	onTokenSearch,
	onNftSearch,
	onRefreshCatalog,
	errors,
	showValidation,
	tokenEscrowStatus,
}: {
	draft: QuestDraft
	policy: QuestPolicy
	onChange(patch: Partial<QuestDraft>): void
	tokens: TokenOption[]
	nfts: NftOption[]
	tokenLoading: boolean
	tokenError: string | null
	nftLoading: boolean
	nftError: string | null
	tokenQuery: string
	nftQuery: string
	onTokenSearch(term: string): void
	onNftSearch(term: string): void
	onRefreshCatalog(): void
	errors: StepErrors
	showValidation: boolean
	tokenEscrowStatus: TokenEscrowStatus | null
}) {
	const handleRewardMode = (mode: QuestDraft['rewardMode']) => {
		onChange({ rewardMode: mode })
		if (mode === 'points') {
			onChange({ rewardAssetId: undefined, rewardToken: '', rewardTokenPerUser: '0' })
		}
	}

	// @edit-start 2025-11-11 — Enforce quest policy in rewards step
	const raffleLocked = !policy.allowRaffle
	const tokenGuard = (token: TokenOption) => ({
		allowed: isAssetAllowed(token, policy),
		reason: policy.requireVerifiedAssets && !token.verified ? 'Verified tokens only for this quest tier.' : undefined,
	})
	const nftGuard = (nft: NftOption) => ({
		allowed: isAssetAllowed(nft, policy),
		reason: policy.requireVerifiedAssets && !nft.verified ? 'Verified collections only for this quest tier.' : undefined,
	})
	// @edit-end

	const getError = (key: string) => (showValidation ? errors[key] : undefined)
	const rewardAssetError = getError('rewardAssetId')
	const rewardTokenPerUserError = getError('rewardTokenPerUser')
	const rewardPointsError = getError('rewardPoints')
	const maxCompletionsError = getError('maxCompletions')
	const maxWinnersError = getError('maxWinners')
	const rewardDepositTxError = getError('rewardTokenDepositTx')
	const rewardDepositAmountError = getError('rewardTokenDepositAmount')
	const rewardDepositDetectedError = getError('rewardTokenDepositDetectedAtISO')

	const handleRewardTokenSelect = (token: TokenOption) => {
		onChange({ rewardAssetId: token.id, rewardToken: token.id, rewardTokenPerUser: draft.rewardTokenPerUser === '0' ? '10' : draft.rewardTokenPerUser || '10' })
	}

	const handleRewardNftSelect = (nft: NftOption) => {
		onChange({ rewardAssetId: nft.id, rewardToken: nft.id, rewardTokenPerUser: draft.rewardTokenPerUser === '0' ? '1' : draft.rewardTokenPerUser || '1' })
	}

	const combinedLoading = tokenLoading || nftLoading
	const modeError = draft.rewardMode === 'token' ? tokenError : draft.rewardMode === 'nft' ? nftError : null
	const bannerError = modeError ?? tokenError ?? nftError ?? null
	const depositDetectedInputValue = useMemo(() => {
		if (!draft.rewardTokenDepositDetectedAtISO) return ''
		const parsed = new Date(draft.rewardTokenDepositDetectedAtISO)
		if (Number.isNaN(parsed.getTime())) return ''
		return toLocalDateTimeInputValue(parsed)
	}, [draft.rewardTokenDepositDetectedAtISO])
	const escrowExpectation = useMemo(() => {
		if (!tokenEscrowStatus) return null
		if (tokenEscrowStatus.expectedTotal <= 0n) return null
		const symbolLabel = tokenEscrowStatus.symbol && tokenEscrowStatus.symbol.trim() ? tokenEscrowStatus.symbol : 'tokens'
		const claimerCount = toPositiveInt(draft.maxCompletions, 0)
		const perUserDisplay = tokenEscrowStatus.expectedPerUserDisplay || '0'
		const totalDisplay = tokenEscrowStatus.expectedTotalDisplay
		if (claimerCount > 0) {
			return `${totalDisplay} ${symbolLabel} needed for ${claimerCount.toLocaleString()} claimer${claimerCount === 1 ? '' : 's'} (${perUserDisplay} each)`
		}
		return `${totalDisplay} ${symbolLabel} needed for all claimers`
	}, [tokenEscrowStatus, draft.maxCompletions])
	const escrowWarmupCopy = useMemo(() => {
		if (!tokenEscrowStatus || !tokenEscrowStatus.readyAtMs) return null
		const readyAt = new Date(tokenEscrowStatus.readyAtMs)
		if (Number.isNaN(readyAt.getTime())) return null
		const relative = formatRelativeTimeFromNow(tokenEscrowStatus.readyAtMs)
		const absolute = readyAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
		return `Warm-up clears ${relative} (${absolute})`
	}, [tokenEscrowStatus])
	const depositDetectedDescription = escrowWarmupCopy
		? `${escrowWarmupCopy}. Record when the automation queue first saw the transfer.`
		: 'Record when the automation queue first saw the transfer.'
	const escrowStatusInsight = useMemo(() => {
		if (!tokenEscrowStatus) return null
		const { state, readyAtMs, detectedAtMs, expectedTotalDisplay, recordedTotalDisplay, symbol } = tokenEscrowStatus
		const symbolSuffix = symbol ? ` ${symbol}` : ''
		const nowMs = Date.now()
		const relativeReady = readyAtMs ? formatRelativeTimeFromNow(readyAtMs, nowMs) : null
		const relativeDetected = detectedAtMs ? formatRelativeTimeFromNow(detectedAtMs, nowMs) : null
		switch (state) {
			case 'ready':
				return {
					icon: '✅',
					className: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100',
					message: 'Escrow ready — you can move to launch.',
				}
			case 'warming':
				return {
					icon: '⏳',
					className: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
					message: relativeReady ? `Warm-up finishes ${relativeReady}. Launch once it clears.` : 'Warm-up finishes soon. Launch once it clears.',
				}
			case 'awaiting-detection':
				return {
					icon: '🔁',
					className: 'border-sky-400/40 bg-sky-500/10 text-sky-100',
					message: relativeDetected
						? `Detected ${relativeDetected}. Update the timestamp once the queue confirms it.`
						: 'Waiting on detection — update the timestamp once the queue confirms it.',
				}
			case 'insufficient':
				return {
					icon: '⚠️',
					className: 'border-rose-500/40 bg-rose-500/15 text-rose-100',
					message: `Deposit is short — expected ${expectedTotalDisplay}${symbolSuffix}, recorded ${recordedTotalDisplay}${symbolSuffix}.`,
				}
			case 'missing':
			default:
				return {
					icon: '⚠️',
					className: 'border-rose-500/40 bg-rose-500/15 text-rose-100',
					message: 'Funding details incomplete — add them below to continue.',
				}
		}
	}, [tokenEscrowStatus])

	return (
		<div className="space-y-6">
			<SegmentedToggle
				ariaLabel="Reward mode"
				value={draft.rewardMode}
				onChange={handleRewardMode}
				options={[
					{ value: 'points', label: 'GMEOW points', description: 'Off-chain loyalty points', tone: 'sky' },
					{ value: 'token', label: 'ERC-20 token', description: 'Send fungible rewards', tone: 'emerald' },
					{ value: 'nft', label: 'NFT drop', description: 'Distribute ERC-721 rewards', tone: 'indigo' },
				]}
			/>

			{draft.rewardMode === 'points' ? (
				<div className="grid gap-4 sm:grid-cols-2">
					<Field label="Points per claimer" error={rewardPointsError}>
						<input
							className="pixel-input"
							value={draft.rewardPoints}
							onChange={(event) => onChange({ rewardPoints: sanitizeNumericInput(event.target.value) })}
							aria-invalid={Boolean(rewardPointsError)}
						/>
					</Field>
					<Field label="Max completions" error={maxCompletionsError}>
						<input
							className="pixel-input"
							value={draft.maxCompletions}
							onChange={(event) => onChange({ maxCompletions: sanitizeNumericInput(event.target.value) })}
							aria-invalid={Boolean(maxCompletionsError)}
						/>
					</Field>
				</div>
			) : (
				<div className="space-y-5 rounded-2xl border border-white dark:border-slate-700/10 bg-slate-950/60 p-4">
					<CatalogStatusBanner label="Reward inventory" loading={combinedLoading} error={bannerError} onRefresh={onRefreshCatalog} policy={policy} />
					{draft.rewardMode === 'token' ? (
						<TokenSelector
							tokens={tokens}
							selectedId={draft.rewardAssetId}
							onSelect={handleRewardTokenSelect}
							loading={tokenLoading}
							error={tokenError}
							onSearch={onTokenSearch}
							query={tokenQuery}
							errorMessage={rewardAssetError}
							isAssetSelectable={tokenGuard}
						/>
					) : (
						<NftSelector
							nfts={nfts}
							selectedId={draft.rewardAssetId}
							onSelect={handleRewardNftSelect}
							loading={nftLoading}
							error={nftError}
							onSearch={onNftSearch}
							query={nftQuery}
							errorMessage={rewardAssetError}
							isAssetSelectable={nftGuard}
						/>
					)}
					<Field label={draft.rewardMode === 'token' ? 'Tokens per claimer' : 'NFTs per claimer'} error={rewardTokenPerUserError}>
						<input
							className="pixel-input"
							value={draft.rewardTokenPerUser}
							onChange={(event) =>
								onChange({
									rewardTokenPerUser: sanitizeNumericInput(event.target.value, { allowDecimals: draft.rewardMode === 'token' }),
								})
							}
							aria-invalid={Boolean(rewardTokenPerUserError)}
						/>
					</Field>
					{draft.rewardMode === 'token' ? (
						<div className="space-y-4">
							<div className="grid gap-4 sm:grid-cols-2">
								<Field label="Deposit transaction hash" description="Paste the onchain funding transaction hash so ops can verify escrow." error={rewardDepositTxError}>
									<input
										className="pixel-input"
										placeholder="0x…"
										value={draft.rewardTokenDepositTx}
										onChange={(event) => onChange({ rewardTokenDepositTx: event.target.value.trim() })}
										aria-invalid={Boolean(rewardDepositTxError)}
									/>
								</Field>
								<Field label="Total deposit amount" description="Total ERC-20 amount routed into escrow (token units)." error={rewardDepositAmountError}>
									<input
										className="pixel-input"
										placeholder="1000000"
										value={draft.rewardTokenDepositAmount}
										onChange={(event) =>
											onChange({
												rewardTokenDepositAmount: sanitizeNumericInput(event.target.value, { allowDecimals: true }),
											})
										}
										aria-invalid={Boolean(rewardDepositAmountError)}
									/>
								</Field>
							</div>
							<Field label="Deposit detected at" description={depositDetectedDescription} error={rewardDepositDetectedError}>
								<input
									className="pixel-input"
									type="datetime-local"
									value={depositDetectedInputValue}
									onChange={(event) => onChange({ rewardTokenDepositDetectedAtISO: toIsoStringOrEmpty(event.target.value) })}
									aria-invalid={Boolean(rewardDepositDetectedError)}
								/>
							</Field>
							{escrowExpectation ? (
								<div className="rounded-2xl border border-emerald-300/30 bg-emerald-400/5 px-4 py-2 text-[13px] text-emerald-100">
									{escrowExpectation}
								</div>
							) : null}
							{escrowStatusInsight ? (
								<div className={`flex items-start gap-2 rounded-2xl border px-4 py-2 text-[13px] ${escrowStatusInsight.className}`}>
									<span aria-hidden>{escrowStatusInsight.icon}</span>
									<p>{escrowStatusInsight.message}</p>
								</div>
							) : null}
						</div>
					) : null}
				</div>
			)}

			<div className="rounded-2xl border border-white dark:border-slate-700/10 bg-slate-950/40 p-4">
				<label className="flex items-center gap-3 text-sm">
					<input
						type="checkbox"
						className="h-5 w-5 rounded border border-white dark:border-slate-700/20 bg-slate-900"
						checked={draft.raffleEnabled}
						disabled={raffleLocked}
						onChange={(event) => {
							if (raffleLocked) return
							onChange({ raffleEnabled: event.target.checked })
						}}
					/>
					Enable raffle for this quest
				</label>
				{raffleLocked ? (
					/* @edit-start 2025-11-11 — Communicate raffle policy restriction */
					<p className="mt-2 text-[11px] text-amber-200">Raffles unlock for partner and admin tiers. Stick with instant rewards for now.</p>
					/* @edit-end */
				) : null}
				{draft.raffleEnabled ? (
					<div className="mt-4 grid gap-4 sm:grid-cols-2">
						<Field label="Raffle strategy">
							<select
								className="pixel-input"
								value={draft.raffleStrategy}
								onChange={(event) => onChange({ raffleStrategy: event.target.value as QuestDraft['raffleStrategy'] })}
							>
								<option value="blockhash">Chain blockhash</option>
								<option value="farcaster">Farcaster mini-app</option>
							</select>
						</Field>
						<Field label="Number of winners" error={maxWinnersError}>
							<input
								className="pixel-input"
								value={draft.maxWinners}
								onChange={(event) => onChange({ maxWinners: sanitizeNumericInput(event.target.value) })}
								aria-invalid={Boolean(maxWinnersError)}
							/>
						</Field>
					</div>
				) : null}
				<div className="mt-3 text-xs text-slate-400">
					{draft.raffleEnabled
						? `Winners receive ${draft.rewardMode === 'points' ? `${draft.rewardPoints || '0'} pts` : draft.rewardTokenPerUser || '0'} each`
						: 'Raffles are off – claimers receive rewards instantly.'}
				</div>
			</div>
		</div>
	)
}
