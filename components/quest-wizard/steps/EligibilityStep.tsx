import type { QuestDraft, TokenOption, NftOption, TokenLookup, NftLookup, StepErrors } from '../shared'
import { mergeChainLists, formatChainList, sanitizeNumericInput } from '../shared'
import { Field } from '../components/Field'
import { SegmentedToggle } from '../components/SegmentedToggle'
import { TokenSelector } from '../components/TokenSelector'
import { NftSelector } from '../components/NftSelector'
import { CatalogStatusBanner } from '../components/CatalogStatusBanner'
import { CHAIN_KEYS, CHAIN_LABEL } from '@/lib/gmeow-utils'
import { isAssetAllowed, questTypeRequiresGate, type QuestPolicy } from '@/lib/quest-policy'

export function EligibilityStep({
	draft,
	policy,
	requiredGate,
	onChange,
	tokens,
	nfts,
	tokenLookup,
	nftLookup,
	tokenLoading,
	tokenError,
	nftLoading,
	nftError,
	warnings,
	onTokenSearch,
	onNftSearch,
	tokenQuery,
	nftQuery,
	onRefreshCatalog,
	errors,
	showValidation,
}: {
	draft: QuestDraft
	policy: QuestPolicy
	requiredGate: ReturnType<typeof questTypeRequiresGate>
	onChange(patch: Partial<QuestDraft>): void
	tokens: TokenOption[]
	nfts: NftOption[]
	tokenLookup: TokenLookup
	nftLookup: NftLookup
	tokenLoading: boolean
	tokenError: string | null
	nftLoading: boolean
	nftError: string | null
	warnings: string[]
	onTokenSearch(term: string): void
	onNftSearch(term: string): void
	tokenQuery: string
	nftQuery: string
	onRefreshCatalog(): void
	errors: StepErrors
	showValidation: boolean
}) {
	const selectedToken = draft.eligibilityAssetType === 'token' && draft.eligibilityAssetId ? tokenLookup[draft.eligibilityAssetId.toLowerCase()] : undefined
	const selectedNft = draft.eligibilityAssetType === 'nft' && draft.eligibilityAssetId ? nftLookup[draft.eligibilityAssetId.toLowerCase()] : undefined
	const activeError = draft.eligibilityAssetType === 'token' ? tokenError : nftError
	const combinedLoading = tokenLoading || nftLoading
	const bannerError = activeError ?? tokenError ?? nftError ?? null
	const requiresGate = Boolean(requiredGate)
	const partnerEnabled = policy.allowPartnerMode
	const partnerMode = draft.eligibilityMode === 'partner'
	const partnerChainLimit = partnerEnabled && Number.isFinite(policy.maxPartnerChains)
		? Math.max(1, Math.floor(Number(policy.maxPartnerChains)))
		: Infinity
	const effectiveChains = partnerMode
		? draft.eligibilityChainList
		: selectedToken
			? [selectedToken.chain]
			: selectedNft
				? [selectedNft.chain]
				: []
	const getError = (key: string) => (showValidation ? errors[key] : undefined)
	const assetError = getError('eligibilityAssetId')
	const minimumError = getError('eligibilityMinimum')
	const chainError = getError('eligibilityChainList')
	// @edit-start 2025-11-11 — Enforce quest policy messaging for eligibility step
	const policyNotes: string[] = []
	if (requiresGate) {
		policyNotes.push('Hold quests stay gated with verified assets so the Mini App never fails mid-claim.')
	}
	if (!partnerEnabled) {
		policyNotes.push('Partner allowlists unlock after the ops team approves your creator tier.')
	} else if (partnerChainLimit !== Infinity) {
		policyNotes.push(`Partner allowlists can sync up to ${partnerChainLimit} chain${partnerChainLimit === 1 ? '' : 's'} at once.`)
	}
	if (policy.requireVerifiedAssets) {
		policyNotes.push('Only verified tokens and collections can be selected for this quest tier.')
	}
	// @edit-end

	const handleEligibilityMode = (mode: QuestDraft['eligibilityMode']) => {
		if ((mode === 'open' && requiresGate) || (mode === 'partner' && !partnerEnabled)) {
			return
		}
		const basePatch: Partial<QuestDraft> = { eligibilityMode: mode }
		if (mode === 'open') {
			onChange({
				...basePatch,
				eligibilityAssetId: undefined,
				eligibilityCollection: '',
				eligibilityChainList: [],
				eligibilityMinimum: '0',
			})
		} else if (mode === 'simple') {
			onChange({
				...basePatch,
				eligibilityChainList: selectedToken ? [selectedToken.chain] : selectedNft ? [selectedNft.chain] : [draft.chain],
			})
		} else {
			onChange(basePatch)
		}
	}

	const handleTokenSelect = (token: TokenOption) => {
		const nextChains =
			draft.eligibilityMode === 'simple'
				? [token.chain]
				: mergeChainLists(draft.eligibilityChainList, token.chain)
		const constrainedChains =
			draft.eligibilityMode === 'partner' && partnerChainLimit !== Infinity
				? nextChains.slice(0, partnerChainLimit)
				: nextChains
		onChange({
			eligibilityAssetType: 'token',
			eligibilityAssetId: token.id,
			eligibilityCollection: token.id,
			eligibilityChainList: constrainedChains,
			eligibilityMinimum: draft.eligibilityMinimum || '1',
		})
	}

	const handleNftSelect = (nft: NftOption) => {
		const nextChains =
			draft.eligibilityMode === 'simple'
				? [nft.chain]
				: mergeChainLists(draft.eligibilityChainList, nft.chain)
		const constrainedChains =
			draft.eligibilityMode === 'partner' && partnerChainLimit !== Infinity
				? nextChains.slice(0, partnerChainLimit)
				: nextChains
		onChange({
			eligibilityAssetType: 'nft',
			eligibilityAssetId: nft.id,
			eligibilityCollection: nft.id,
			eligibilityChainList: constrainedChains,
			eligibilityMinimum: draft.eligibilityMinimum || '1',
		})
	}

	const chainDescription = !partnerEnabled
		? 'Partner mode unlocks after ops approval.'
		: partnerChainLimit === Infinity
			? 'Partner mode lets you merge allowlists across networks.'
			: `Partner mode can sync ${partnerChainLimit} chain${partnerChainLimit === 1 ? '' : 's'} at once.`

	const chainSelector = (
		<Field label="Eligible chains" description={chainDescription} error={chainError}>
			<div className="flex flex-wrap gap-2">
				{CHAIN_KEYS.map((chainKey) => {
					const active = effectiveChains.includes(chainKey)
					const limitBlocksNew = partnerMode && !active && partnerChainLimit !== Infinity && effectiveChains.length >= partnerChainLimit
					const disabled = !partnerMode || limitBlocksNew
					// @edit-start 2025-11-12 — Add keyboard focus treatment for chain selectors
					return (
						<button
							key={chainKey}
							type="button"
							disabled={disabled}
							onClick={() => {
								if (disabled) return
								const next = active ? effectiveChains.filter((item) => item !== chainKey) : [...effectiveChains, chainKey]
								onChange({ eligibilityChainList: next })
							}}
							className={`rounded-full border px-3 py-1 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
								active
									? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-200'
									: 'border-slate-200 dark:border-white/10 text-slate-300 hover:border-slate-200 dark:border-white/10 disabled:opacity-50'
							}`}
							aria-pressed={active}
							title={limitBlocksNew ? `Limited to ${partnerChainLimit} partner chains` : undefined}
						>
							{CHAIN_LABEL[chainKey]}
						</button>
					)
					// @edit-end
				})}
			</div>
		</Field>
	)

	return (
		<div className="space-y-6">
			{policyNotes.length ? (
				// @edit-start 2025-11-11 — Eligibility policy banner
				<div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100">
					<ul className="space-y-1">
						{policyNotes.map((note) => (
							<li key={note} className="flex items-start gap-2">
								<span aria-hidden className="mt-0.5 text-emerald-200">✔️</span>
								<span>{note}</span>
							</li>
						))}
					</ul>
				</div>
				// @edit-end
			) : null}
			<SegmentedToggle
				ariaLabel="Eligibility mode"
				value={draft.eligibilityMode}
				onChange={handleEligibilityMode}
				options={[
					// @edit-start 2025-11-11 — Disable policy-restricted eligibility modes
					{
						value: 'open',
						label: 'Open quest',
						description: 'No gating — anyone can claim',
						tone: 'sky',
						disabled: requiresGate,
						disabledReason: requiresGate ? 'Hold quests must stay gated for Mini App compliance.' : undefined,
					},
					{
						value: 'simple',
						label: 'Token gate',
						description: 'Single verified asset gate',
						tone: 'emerald',
					},
					{
						value: 'partner',
						label: 'Partner allowlist',
						description: partnerEnabled ? 'Merge assets across chains' : 'Reserved for approved creators',
						tone: 'purple',
						disabled: !partnerEnabled,
						disabledReason: partnerEnabled ? undefined : 'Partner mode unlocks after upgrade.',
					},
					// @edit-end
				]}
			/>

			{draft.eligibilityMode === 'open' ? (
				<p className="text-sm text-slate-300">No gating configured. Anyone on {CHAIN_LABEL[draft.chain]} can claim.</p>
			) : (
				<div className="space-y-5 rounded-2xl border border-white dark:border-slate-700/10 bg-slate-950/60 p-4">
					<CatalogStatusBanner
						label="Eligibility assets"
						loading={combinedLoading}
						error={bannerError}
						warnings={warnings}
						onRefresh={onRefreshCatalog}
						policy={policy}
					/>

					<SegmentedToggle
						ariaLabel="Eligibility asset type"
						size="sm"
						value={draft.eligibilityAssetType}
						onChange={(next) => onChange({ eligibilityAssetType: next })}
						options={[
							{ value: 'token', label: 'Tokens', description: 'ERC-20 balance checks', tone: 'emerald' },
							{ value: 'nft', label: 'NFT collections', description: 'ERC-721 or badge hold', tone: 'indigo' },
						]}
					/>

					{draft.eligibilityAssetType === 'token' ? (
						<TokenSelector
							tokens={tokens}
							selectedId={draft.eligibilityAssetId}
							onSelect={handleTokenSelect}
							loading={tokenLoading}
							error={tokenError}
							onSearch={onTokenSearch}
							query={tokenQuery}
							errorMessage={assetError}
							isAssetSelectable={(token) => ({
								allowed: isAssetAllowed(token, policy),
								reason: policy.requireVerifiedAssets && !token.verified ? 'Verified tokens only for this quest tier.' : undefined,
							})}
						/>
					) : (
						<NftSelector
							nfts={nfts}
							selectedId={draft.eligibilityAssetId}
							onSelect={handleNftSelect}
							loading={nftLoading}
							error={nftError}
							onSearch={onNftSearch}
							query={nftQuery}
							errorMessage={assetError}
							isAssetSelectable={(nft) => ({
								allowed: isAssetAllowed(nft, policy),
								reason: policy.requireVerifiedAssets && !nft.verified ? 'Verified collections only for this quest tier.' : undefined,
							})}
						/>
					)}

					<Field label="Minimum balance" description="Token units (supports decimals) or NFT count required to join" error={minimumError}>
						<input
							className="pixel-input"
							value={draft.eligibilityMinimum}
							onChange={(event) => onChange({ eligibilityMinimum: sanitizeNumericInput(event.target.value, { allowDecimals: true }) })}
							placeholder={draft.eligibilityAssetType === 'token' ? 'e.g., 100 or 0.5' : 'e.g., 1 or 3'}
							aria-invalid={Boolean(minimumError)}
						/>
					</Field>

					{chainSelector}

					<div className="rounded-2xl border border-sky-400/30 bg-sky-400/10 px-4 py-3 text-xs text-sky-200">
						{draft.eligibilityMode === 'partner'
							? `Holders of ${selectedToken?.name || selectedNft?.collection || 'partner NFT'} across ${formatChainList(effectiveChains)} will see a verified partner banner in Step 4.`
							: selectedToken || selectedNft
								? `Gate enabled · ${selectedToken?.symbol || selectedNft?.name} on ${formatChainList(effectiveChains)}${selectedToken?.verified || selectedNft?.verified ? ' · Verified asset' : ''}`
								: 'Select a verified token or collection to finish configuring the gate.'}
					</div>
				</div>
			)}
		</div>
	)
}
