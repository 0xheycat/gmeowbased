'use client'

/* eslint-disable react-hooks/exhaustive-deps */
// wizardState methods are memoized with useCallback, safe to use in dependencies

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'
import { useMiniKit, useAuthenticate } from '@coinbase/onchainkit/minikit'
import { MiniKitAuthPanel } from '@/components/quest-wizard/components/MiniKitAuthPanel'
import { WizardHeader } from '@/components/quest-wizard/components/WizardHeader'
import { useMediaQuery } from '@/components/quest-wizard/hooks/useMediaQuery'
import { useWizardAnimation } from '@/hooks/useWizardAnimation'
import { useWizardState } from '@/hooks/useWizardState'
import { useAssetCatalog } from '@/hooks/useAssetCatalog'
import { useMiniKitAuth } from '@/hooks/useMiniKitAuth'
import { useQuestVerification } from '@/hooks/useQuestVerification'
import { usePolicyEnforcement } from '@/hooks/usePolicyEnforcement'
import { useWizardEffects } from '@/hooks/useWizardEffects'
import { validateAllSteps } from '@/components/quest-wizard/validation'
import {
	createTokenLookup,
	createNftLookup,
	deriveTokenEscrowStatus,
	summarizeDraft,
	buildVerificationPayload,
} from '@/components/quest-wizard/helpers'
import { STEPS } from '@/components/quest-wizard/shared'
import {
	getQuestPolicy,
	questTypeRequiresGate,
	resolveCreatorTier,
} from '@/lib/quest-policy'
import { useNotifications } from '@/components/ui/live-notifications'
import { Stepper } from '@/components/quest-wizard/components/Stepper'
import { StepPanel } from '@/components/quest-wizard/components/StepPanel'
import type { XpEventPayload } from '@/components/XPEventOverlay'

// Heavy components - dynamically loaded
const PreviewCard = dynamic(() => import('@/components/quest-wizard/components/PreviewCard').then(mod => ({ default: mod.PreviewCard })), {
	loading: () => <div className="animate-pulse bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5/5 rounded-lg h-96" />,
})

const DebugPanel = dynamic(() => import('@/components/quest-wizard/components/DebugPanel').then(mod => ({ default: mod.DebugPanel })), {
	ssr: false,
})

const XPEventOverlay = dynamic(() => import('@/components/XPEventOverlay').then(mod => ({ default: mod.XPEventOverlay })), {
	ssr: false,
})

export default function QuestWizard() {
	const { context, isFrameReady, setFrameReady } = useMiniKit()
	const { signIn: signInWithMiniKit } = useAuthenticate()
	const { address, isConnected } = useAccount()
	const { push: pushNotification, dismiss: dismissNotification } = useNotifications()
	const isMobile = useMediaQuery('(max-width: 768px)')
	const wizardState = useWizardState({ pushNotification })
	const { draft, stepIndex, headerCollapsed, touchedSteps } = wizardState
	
	// Success celebration state
	const [showSuccessCelebration, setShowSuccessCelebration] = useState(false)
	const [celebrationPayload] = useState<XpEventPayload | null>(null)
	const assetCatalog = useAssetCatalog({ isMobile, stepIndex })
	const {
		tokens,
		nfts,
		tokenQuery,
		nftQuery,
		tokenLoading,
		nftLoading,
		tokenError,
		nftError,
		assetsLoading,
		assetsError,
		assetWarnings,
	} = assetCatalog

	const miniAppLocation = typeof (context as any)?.location === 'string' ? (context as any).location : null
	const miniAppClient = typeof (context as any)?.client?.name === 'string' ? (context as any).client.name : null
	const isMiniAppSession = Boolean(context?.user || miniAppLocation || miniAppClient)

	const auth = useMiniKitAuth({
		context,
		isFrameReady,
		isMiniAppSession,
		signInWithMiniKit,
		pushNotification,
		dismissNotification,
	})

	const [prefilledFollow, setPrefilledFollow] = useState(false)
	const [escrowNow, setEscrowNow] = useState(() => Date.now())
	const { sectionMotion, asideMotion } = useWizardAnimation()

	const hasOnchainKitApiKey = Boolean(process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY)
	const policyData = useMemo(
		() => {
			const tier = resolveCreatorTier({ fid: auth.resolvedFid ?? undefined, address })
			const policy = getQuestPolicy(tier)
			const requiredGate = questTypeRequiresGate(draft.questTypeKey)
			return { tier, policy, requiredGate }
		},
		[auth.resolvedFid, address, draft.questTypeKey],
	)
	const { policy: questPolicy, requiredGate: requiredAssetGate } = policyData

	const lookups = useMemo(() => ({ tokens: createTokenLookup(tokens), nfts: createNftLookup(nfts) }), [tokens, nfts])
	const { tokens: tokenLookup, nfts: nftLookup } = lookups
	const tokenEscrowStatus = useMemo(() => deriveTokenEscrowStatus(draft, { tokenLookup, now: escrowNow }), [draft, tokenLookup, escrowNow])

	const summary = useMemo(() => summarizeDraft(draft, { tokenLookup, nftLookup }), [draft, tokenLookup, nftLookup])
	const validation = useMemo(() => validateAllSteps(draft, { tokenLookup, nftLookup, tokenEscrowStatus }), [draft, tokenLookup, nftLookup, tokenEscrowStatus])
	const verificationPayload = useMemo(() => buildVerificationPayload(draft, { tokenLookup, nftLookup }), [draft, tokenLookup, nftLookup])
	const verificationCacheKey = useMemo(() => JSON.stringify(verificationPayload), [verificationPayload])
	
	const verification = useQuestVerification({
		stepIndex,
		verificationCacheKey,
		verificationPayload,
	})

	usePolicyEnforcement({
		draft,
		questPolicy,
		requiredAssetGate,
		tokenLookup,
		nftLookup,
		onDraftChange: wizardState.onDraftChange,
		pushNotification,
	})

	useWizardEffects({
		isFrameReady,
		setFrameReady,
		tokenEscrowStatus,
		draft,
		prefilledFollow,
		contextUsername: auth.contextUser?.username,
		onEscrowUpdate: () => setEscrowNow(Date.now()),
		onDraftChange: wizardState.onDraftChange,
		onFollowPrefilled: () => setPrefilledFollow(true),
	})

	const activeStep = STEPS[stepIndex]
	const activeValidation = validation[activeStep.key]
	const activeStepTouched = touchedSteps[activeStep.key]
	const renderedSteps = STEPS.map((step, index) => ({
		...step,
		status: (index === stepIndex ? 'active' : index < stepIndex && validation[step.key]?.valid ? 'done' : 'waiting') as 'done' | 'active' | 'waiting',
	}))

	return (
		<div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-12 pt-8">
				<WizardHeader
					context={context}
					profile={auth.profile}
					loadingProfile={auth.profileLoading}
				signInResult={auth.signInResult}
				resolvedFid={auth.resolvedFid}
				step={stepIndex}
				collapsed={headerCollapsed}
				onToggleCollapsed={() => wizardState.setHeaderCollapsed(!headerCollapsed)}
				walletAddress={address}
				isWalletConnected={isConnected}
			/>
				<MiniKitAuthPanel
					context={context}
					isFrameReady={isFrameReady}
					authStatus={auth.authStatus}
					authError={auth.authError}
					hasApiKey={hasOnchainKitApiKey}
					onAuthenticate={auth.authenticate}
					signInResult={auth.signInResult}
					parsedSignIn={null}
					profile={auth.profile}
					profileLoading={auth.profileLoading}
					resolvedFid={auth.resolvedFid}
				/>
				<header className="flex flex-col gap-2">
					<span className="text-[11px] uppercase tracking-[0.3em] text-sky-400">Quest Builder Demo</span>
					<h1 className="text-3xl font-semibold sm:text-4xl">Multi-step wizard · prototype</h1>
					<p className="max-w-2xl text-sm text-slate-300 sm:text-base">
						This sandbox keeps a single <code className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[12px] text-emerald-300">QuestDraft</code> snapshot as you page through the steps, mirroring the contract struct in
						<code className="ml-1 rounded bg-slate-800/80 px-1 py-0.5 text-[12px] text-emerald-300">GmeowMultichain</code>.
					</p>
				</header>

				<Stepper activeIndex={stepIndex} steps={renderedSteps} onSelect={(index) => wizardState.onStepSelect(index, validation)} />

				<main className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
					<motion.section
						key={activeStep.key}
						initial={sectionMotion.initial}
						animate={sectionMotion.animate}
						exit={sectionMotion.exit}
						transition={sectionMotion.transition}
						className="rounded-3xl border border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5/5 p-6 backdrop-blur-xl xl:p-8"
					>
						<StepPanel
							index={stepIndex}
							step={activeStep}
							draft={draft}
							summary={summary}
							tokens={tokens}
							nfts={nfts}
							policy={questPolicy}
							requiredGate={requiredAssetGate}
							tokenLookup={tokenLookup}
							nftLookup={nftLookup}
							assetsLoading={assetsLoading}
							assetsError={assetsError}
							assetWarnings={assetWarnings}
							tokenLoading={tokenLoading}
							tokenError={tokenError}
							nftLoading={nftLoading}
							nftError={nftError}
						tokenQuery={tokenQuery}
						nftQuery={nftQuery}
					onTokenSearch={assetCatalog.onTokenSearch}
					onNftSearch={assetCatalog.onNftSearch}
					onRefreshCatalog={assetCatalog.onRefreshCatalog}
				onChange={wizardState.onDraftChange}
				onNext={() => wizardState.onNext(validation)}
				onPrev={wizardState.onPrev}
				onReset={wizardState.onReset}
						validation={activeValidation}
						showValidation={Boolean(activeStepTouched)}
						tokenEscrowStatus={tokenEscrowStatus}
						verificationState={verification.verificationState}
						onVerifyDraft={verification.runDraftVerification}
					/>
					</motion.section>

					<motion.aside
						className="space-y-4 lg:sticky lg:top-12"
						initial={asideMotion.initial}
						animate={asideMotion.animate}
						transition={asideMotion.transition}
					>
						<PreviewCard summary={summary} draft={draft} stepIndex={stepIndex} tokenEscrowStatus={tokenEscrowStatus} rewardMode={draft.rewardMode} />
						<DebugPanel draft={draft} tokens={tokens} nfts={nfts} assetsLoading={assetsLoading} assetsError={assetsError} assetWarnings={assetWarnings} />
				</motion.aside>
			</main>
		</div>
		
		{/* Success Celebration Overlay */}
		<XPEventOverlay
			open={showSuccessCelebration}
			payload={celebrationPayload}
			onClose={() => setShowSuccessCelebration(false)}
		/>
	</div>
	)
}