import type { StepPanelProps } from '../shared'
import { STEPS } from '../shared'
import { BasicsStep } from '../steps/BasicsStep'
import { EligibilityStep } from '../steps/EligibilityStep'
import { RewardsStep } from '../steps/RewardsStep'
import { FinalizeStep } from '../steps/FinalizeStep'

export function StepPanel({
	index,
	step,
	draft,
	policy,
	requiredGate,
	summary,
	tokens,
	nfts,
	tokenLookup,
	nftLookup,
	assetsLoading,
	assetsError,
	assetWarnings,
	tokenLoading,
	tokenError,
	nftLoading,
	nftError,
	tokenQuery,
	nftQuery,
	onTokenSearch,
	onNftSearch,
	onRefreshCatalog,
	onChange,
	onNext,
	onPrev,
	onReset,
	validation,
	showValidation,
	tokenEscrowStatus,
	verificationState,
	onVerifyDraft,
}: StepPanelProps) {
	const stepErrors = validation.errors
	return (
		<div className="space-y-6">
			<div>
				<span className="text-[11px] uppercase tracking-[0.3em] text-sky-400">Step {index + 1}</span>
				<h2 className="mt-2 text-2xl font-semibold">{step.label}</h2>
				<p className="text-sm text-slate-300">{step.description}</p>
			</div>

			{step.key === 'basics' ? <BasicsStep draft={draft} onChange={onChange} errors={stepErrors} showValidation={showValidation} /> : null}
			{step.key === 'eligibility' ? (
				<EligibilityStep
					draft={draft}
					policy={policy}
					requiredGate={requiredGate}
					onChange={onChange}
					tokens={tokens}
					nfts={nfts}
					tokenLookup={tokenLookup}
					nftLookup={nftLookup}
					tokenLoading={tokenLoading}
					tokenError={tokenError}
					nftLoading={nftLoading}
					nftError={nftError}
					warnings={assetWarnings}
					onTokenSearch={onTokenSearch}
					onNftSearch={onNftSearch}
					tokenQuery={tokenQuery}
					nftQuery={nftQuery}
					onRefreshCatalog={onRefreshCatalog}
					errors={stepErrors}
					showValidation={showValidation}
				/>
			) : null}
			{step.key === 'rewards' ? (
				<RewardsStep
					draft={draft}
					policy={policy}
					onChange={onChange}
					tokens={tokens}
					nfts={nfts}
					tokenLoading={tokenLoading}
					tokenError={tokenError}
					nftLoading={nftLoading}
					nftError={nftError}
					tokenQuery={tokenQuery}
					nftQuery={nftQuery}
					onTokenSearch={onTokenSearch}
					onNftSearch={onNftSearch}
					onRefreshCatalog={onRefreshCatalog}
					tokenEscrowStatus={tokenEscrowStatus}
					errors={stepErrors}
					showValidation={showValidation}
				/>
			) : null}
			{step.key === 'preview' ? (
				<FinalizeStep
					draft={draft}
					summary={summary}
					tokens={tokens}
					nfts={nfts}
					assetWarnings={assetWarnings}
					assetsError={assetsError}
					assetsLoading={assetsLoading}
					tokenEscrowStatus={tokenEscrowStatus}
					verificationState={verificationState}
					onVerifyDraft={onVerifyDraft}
				/>
			) : null}

			<div className="flex flex-wrap items-center justify-between gap-3 pt-2">
				<button
					type="button"
					onClick={onPrev}
					disabled={index === 0}
					className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 disabled:opacity-40"
				>
					← Back
				</button>
				<div className="flex gap-3">
					<button
						type="button"
						onClick={onReset}
						className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20"
					>
						Reset draft
					</button>
					<button
						type="button"
						onClick={onNext}
						disabled={index >= STEPS.length - 1 || !validation.valid}
						className="rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 px-5 py-2 text-sm font-semibold text-black shadow-lg shadow-sky-500/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
					>
						Next ↗
					</button>
				</div>
			</div>
			{!validation.valid ? (
				<p className={`text-xs ${showValidation ? 'text-amber-200' : 'text-slate-400'}`}>
					{showValidation ? 'Complete the highlighted fields above to continue.' : 'Fill in the required fields to unlock the next step.'}
				</p>
			) : null}
		</div>
	)
}
