'use client'

/* eslint-disable react-hooks/exhaustive-deps */
// wizardState methods are memoized with useCallback, safe to use in dependencies

import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useAccount, useConnect } from 'wagmi'
import { useMiniKit, useAuthenticate } from '@coinbase/onchainkit/minikit'
import { MiniKitAuthPanel } from '@/components/quest-wizard/components/MiniKitAuthPanel'
import { WizardHeader } from '@/components/quest-wizard/components/WizardHeader'
import { useMediaQuery } from '@/components/quest-wizard/hooks/useMediaQuery'
import { useWizardState } from '@/hooks/useWizardState'
import { useAssetCatalog } from '@/hooks/useAssetCatalog'
import { useMiniKitAuth } from '@/hooks/useMiniKitAuth'
import { useWalletConnection } from '@/hooks/useWalletConnection'
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
import { STEPS, type QuestDraft, normalizeFid } from '@/components/quest-wizard/shared'
import {
	getQuestPolicy,
	questTypeRequiresGate,
	resolveCreatorTier,
	type CreatorTier,
} from '@/lib/quest-policy'
import { useNotifications } from '@/components/ui/live-notifications'
import { Stepper } from '@/components/quest-wizard/components/Stepper'
import { StepPanel } from '@/components/quest-wizard/components/StepPanel'
import { PreviewCard } from '@/components/quest-wizard/components/PreviewCard'
import { DebugPanel } from '@/components/quest-wizard/components/DebugPanel'

export default function QuestWizard() {
	const { context, isFrameReady, setFrameReady } = useMiniKit()
	const { signIn: signInWithMiniKit } = useAuthenticate()
	const { address, connector: activeConnector, isConnected } = useAccount()
	const { connect, connectAsync, connectors } = useConnect()
	const { push: pushNotification, dismiss: dismissNotification } = useNotifications()
	const isMobile = useMediaQuery('(max-width: 768px)')
	const wizardState = useWizardState({ pushNotification })
	const { draft, stepIndex, headerCollapsed, touchedSteps } = wizardState
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
		tokenWarnings,
		nftWarnings,
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

	const wallet = useWalletConnection({
		isMiniAppSession,
		isConnected,
		activeConnector,
		connectors,
		connect,
		connectAsync,
		pushNotification,
		dismissNotification,
	})

	const [prefilledFollow, setPrefilledFollow] = useState(false)
	const [escrowNow, setEscrowNow] = useState(() => Date.now())
	// @edit-start 2025-11-12 — Respect user reduced-motion preferences for wizard transitions
	const prefersReducedMotion = useReducedMotion()
	const sectionMotion = useMemo(
		() =>
			prefersReducedMotion
				? {
					initial: { opacity: 1, y: 0 },
					animate: { opacity: 1, y: 0 },
					exit: { opacity: 1, y: 0 },
					transition: { duration: 0 },
				}
				: {
					initial: { opacity: 0, y: 16 },
					animate: { opacity: 1, y: 0 },
					exit: { opacity: 0, y: -16 },
					transition: { duration: 0.24, ease: 'easeOut' },
				},
		[prefersReducedMotion],
	)
	const asideMotion = useMemo(
		() =>
			prefersReducedMotion
				? {
					initial: { opacity: 1, scale: 1 },
					animate: { opacity: 1, scale: 1 },
					transition: { duration: 0 },
				}
				: {
					initial: { opacity: 0, scale: 0.97 },
					animate: { opacity: 1, scale: 1 },
					transition: { duration: 0.25, ease: 'easeOut' },
				},
		[prefersReducedMotion],
	)
	// @edit-end

	const hasOnchainKitApiKey = Boolean(process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY)
	const creatorTier = useMemo<CreatorTier>(() => resolveCreatorTier({ fid: auth.resolvedFid ?? undefined, address }), [auth.resolvedFid, address])
	const questPolicy = useMemo(() => getQuestPolicy(creatorTier), [creatorTier])
	const requiredAssetGate = useMemo(() => questTypeRequiresGate(draft.questTypeKey), [draft.questTypeKey])

	const tokenLookup = useMemo(() => createTokenLookup(tokens), [tokens])
	const nftLookup = useMemo(() => createNftLookup(nfts), [nfts])
	const tokenEscrowStatus = useMemo(() => deriveTokenEscrowStatus(draft, { tokenLookup, now: escrowNow }), [draft, tokenLookup, escrowNow])

	const summary = useMemo(() => summarizeDraft(draft, { tokenLookup, nftLookup }), [draft, tokenLookup, nftLookup])
	const validation = useMemo(
		() => validateAllSteps(draft, { tokenLookup, nftLookup, tokenEscrowStatus }),
		[draft, tokenLookup, nftLookup, tokenEscrowStatus],
	)
	const verificationPayload = useMemo(
		() => buildVerificationPayload(draft, { tokenLookup, nftLookup }),
		[draft, tokenLookup, nftLookup],
	)
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
	const renderedSteps = useMemo(
		() =>
			STEPS.map((step, index) => {
				const stepValidation = validation[step.key]
				const isActive = index === stepIndex
				const isBefore = index < stepIndex
				const status: 'done' | 'active' | 'waiting' = isActive
					? 'active'
					: isBefore && stepValidation?.valid
						? 'done'
						: 'waiting'
				return { ...step, status }
			}),
		[stepIndex, validation],
	)

	const handleMerge = (patch: Partial<QuestDraft>) => wizardState.onDraftChange(patch)
	const handleReset = () => wizardState.onReset()

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
					walletState={wallet.walletAutoState}
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
						className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl xl:p-8"
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
					onChange={handleMerge}
					onNext={() => wizardState.onNext(validation)}
					onPrev={wizardState.onPrev}
					onReset={handleReset}
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
						<PreviewCard summary={summary} stepIndex={stepIndex} tokenEscrowStatus={tokenEscrowStatus} rewardMode={draft.rewardMode} />
						<DebugPanel draft={draft} tokens={tokens} nfts={nfts} assetsLoading={assetsLoading} assetsError={assetsError} assetWarnings={assetWarnings} />
					</motion.aside>
				</main>
			</div>
		</div>
	)
}

