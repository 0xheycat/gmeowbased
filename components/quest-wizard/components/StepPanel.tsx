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
	const errorCount = stepErrors ? Object.keys(stepErrors).length : 0
	
	// Accessibility announcement for validation state
	const validationMessage = errorCount > 0 
		? `${errorCount} validation ${errorCount === 1 ? 'error' : 'errors'} found. Please review and correct before continuing.`
		: validation.valid 
			? 'Step is complete and valid. Ready to continue.'
			: ''
	
	// Handle Next click with validation errors - scroll to first error
	const handleNextClick = () => {
		if (!validation.valid && errorCount > 0) {
			// Find first element with aria-invalid="true"
			const firstErrorField = document.querySelector('[aria-invalid="true"]')
			if (firstErrorField) {
				firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' })
				// Flash the field to draw attention
				const fieldElement = firstErrorField.closest('fieldset') || firstErrorField
				fieldElement.classList.add('error-flash')
				setTimeout(() => fieldElement.classList.remove('error-flash'), 2000)
			}
		}
		onNext()
	}
	return (
		<div className="space-y-5 lg:space-y-6">
			{/* Screen reader announcement for validation state */}
			<div 
				className="sr-only" 
				role="status" 
				aria-live="polite" 
				aria-atomic="true"
			>
				{showValidation && validationMessage}
			</div>
			
			<div>
				<span className="text-[11px] uppercase tracking-[0.3em] text-sky-400">Step {index + 1}</span>
				<h2 className="mt-2 text-xl lg:text-2xl font-semibold">{step.label}</h2>
				<p className="mt-1 text-sm text-slate-300">{step.description}</p>
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

			<div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
				<button
					type="button"
					onClick={onPrev}
					disabled={index === 0}
					className="rounded-full border border-white dark:border-slate-700/10 px-5 py-3 text-sm font-medium text-slate-300 transition hover:border-white dark:border-slate-700/20 hover:bg-slate-100/5 dark:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
				>
					← Back
				</button>
				<div className="flex gap-3">
					<button
						type="button"
						onClick={onReset}
						className="flex-1 sm:flex-none rounded-full border border-white dark:border-slate-700/10 px-5 py-3 text-sm font-medium text-slate-300 transition hover:border-white dark:border-slate-700/20 hover:bg-slate-100/5 dark:bg-white/5 touch-manipulation"
					>
						Reset draft
					</button>
					<button
						type="button"
						onClick={handleNextClick}
						disabled={index >= STEPS.length - 1 || !validation.valid}
						title={
							!validation.valid && showValidation && errorCount > 0
								? `Complete ${errorCount} required field${errorCount === 1 ? '' : 's'} to continue`
								: !validation.valid
									? 'Fill in all required fields'
									: 'Continue to next step'
						}
						className="flex-1 sm:flex-none rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-black dark:text-white shadow-lg shadow-sky-500/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 touch-manipulation"
					>
						{!validation.valid && errorCount > 0 ? `Next (${errorCount})` : 'Next'} ↗
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
