'use client'

/* eslint-disable react-hooks/exhaustive-deps */
// wizardState methods are memoized with useCallback, safe to use in dependencies

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import {
	formatUnknownError,
	isAbortError,
} from '@/components/quest-wizard/utils'
import { validateAllSteps } from '@/components/quest-wizard/validation'
import {
	createTokenLookup,
	createNftLookup,
	deriveTokenEscrowStatus,
	summarizeDraft,
	buildVerificationPayload,
} from '@/components/quest-wizard/helpers'
import {
	type AuthStatus,
	type MiniAppSignInResult,
	type MiniKitContextUser,
} from '@/components/quest-wizard/types'

// @edit-start 2025-02-14 — Use shared quest wizard module from components namespace
import {
	STEPS,
	type QuestDraft,
	type QuestVerificationState,
	type QuestVerificationSuccess,
	normalizeFid,
} from '@/components/quest-wizard/shared'
// @edit-end
import {
	getQuestPolicy,
	isAssetAllowed,
	questTypeRequiresGate,
	resolveCreatorTier,
	type CreatorTier,
} from '@/lib/quest-policy'
import { fetchUserByFid, type FarcasterUser } from '@/lib/neynar'
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

	const contextUser = (context?.user ?? null) as MiniKitContextUser | null
	const miniAppLocation = typeof (context as any)?.location === 'string' ? (context as any).location : null
	const miniAppClient = typeof (context as any)?.client?.name === 'string' ? (context as any).client.name : null
	const isMiniAppSession = Boolean(contextUser || miniAppLocation || miniAppClient)

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
	const verificationCacheRef = useRef<Map<string, QuestVerificationSuccess>>(new Map())
	const verificationAbortRef = useRef<AbortController | null>(null)
	const policyNoticeRef = useRef({
		partnerDowngraded: false,
		raffleDisabled: false,
		partnerChainsTrimmed: false,
		eligibilityAsset: null as string | null,
		rewardAsset: null as string | null,
		gateEnforced: false,
	})
	const [verificationState, setVerificationState] = useState<QuestVerificationState>({ status: 'idle', lastKey: null, data: null, error: null })
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

	const runDraftVerification = useCallback(
		async (options: { force?: boolean } = {}) => {
			if (!verificationCacheKey) return null
			if (!options.force) {
				const cached = verificationCacheRef.current.get(verificationCacheKey)
				if (cached) {
					setVerificationState({ status: 'success', lastKey: verificationCacheKey, data: cached, error: null })
					return cached
				}
			}

			verificationAbortRef.current?.abort()
			const controller = new AbortController()
			verificationAbortRef.current = controller
			setVerificationState((prev) => ({ status: 'pending', lastKey: verificationCacheKey, data: options.force ? null : prev.data, error: null }))

			try {
				const response = await fetch('/api/quests/verify', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(verificationPayload),
					signal: controller.signal,
				})
				let json: any = null
				try {
					json = await response.json()
				} catch {
					json = null
				}
				if (!response.ok || !json?.ok) {
					const reason = typeof json?.reason === 'string' ? json.reason : `verification_failed_${response.status}`
					throw new Error(reason)
				}
				const result: QuestVerificationSuccess = {
					questTypeKey: String(json.questTypeKey || verificationPayload.questTypeKey || ''),
					questTypeCode: Number(json.questTypeCode ?? verificationPayload.actionCode ?? 0),
					requirement: typeof json.requirement === 'object' && json.requirement ? json.requirement : {},
					meta: typeof json.meta === 'object' && json.meta ? json.meta : {},
					castDetails: typeof json.castDetails === 'object' && json.castDetails ? json.castDetails : {},
					traces: Array.isArray(json.traces) ? json.traces : [],
					durationMs: Number(json.durationMs ?? 0),
				}
				verificationCacheRef.current.set(verificationCacheKey, result)
				setVerificationState({ status: 'success', lastKey: verificationCacheKey, data: result, error: null })
				return result
			} catch (error) {
				if (isAbortError(error)) return null
				const message = formatUnknownError(error, 'Quest verification failed.')
				setVerificationState({ status: 'error', lastKey: verificationCacheKey, data: null, error: message })
				return null
			} finally {
				if (verificationAbortRef.current === controller) {
					verificationAbortRef.current = null
				}
			}
		},
		[verificationCacheKey, verificationPayload],
	)

	useEffect(() => {
		if (stepIndex !== 3) return
		if (!verificationCacheKey) return
		const cached = verificationCacheRef.current.get(verificationCacheKey)
		if (cached) {
			setVerificationState({ status: 'success', lastKey: verificationCacheKey, data: cached, error: null })
			return
		}
		void runDraftVerification()
	}, [stepIndex, verificationCacheKey, runDraftVerification])

	useEffect(() => {
		if (questPolicy.allowPartnerMode) {
			policyNoticeRef.current.partnerDowngraded = false
			policyNoticeRef.current.partnerChainsTrimmed = false
		}
		if (questPolicy.allowRaffle) {
			policyNoticeRef.current.raffleDisabled = false
		}
	}, [questPolicy.allowPartnerMode, questPolicy.allowRaffle])

	useEffect(() => {
		if (typeof window === 'undefined') return undefined
		if (tokenEscrowStatus?.state !== 'warming') return undefined
		const interval = window.setInterval(() => {
			setEscrowNow(Date.now())
		}, 30_000)
		return () => window.clearInterval(interval)
	}, [tokenEscrowStatus?.state])

	useEffect(() => {
		if (!questPolicy.requireVerifiedAssets) {
			policyNoticeRef.current.eligibilityAsset = null
			policyNoticeRef.current.rewardAsset = null
		}
	}, [questPolicy.requireVerifiedAssets])

	useEffect(() => {
		setEscrowNow(Date.now())
	}, [draft.rewardTokenDepositTx, draft.rewardTokenDepositDetectedAtISO, draft.rewardTokenDepositAmount])

	useEffect(() => {
		if (!questPolicy.forceHoldQuestGate || !requiredAssetGate) {
			policyNoticeRef.current.gateEnforced = false
		}
	}, [questPolicy.forceHoldQuestGate, requiredAssetGate])

	// Enforce hold-quest gating requirements based on policy
	// eslint-disable-next-line react-hooks/exhaustive-deps -- wizardState.onDraftChange is memoized
	useEffect(() => {
		if (!questPolicy.forceHoldQuestGate) return
		if (!requiredAssetGate) return
		const desiredAssetType = requiredAssetGate
		const patch: Partial<QuestDraft> = {}
		let changed = false
		if (draft.eligibilityMode === 'open') {
			patch.eligibilityMode = 'simple'
			changed = true
		}
		if (draft.eligibilityMode === 'partner' && !questPolicy.allowPartnerMode) {
			patch.eligibilityMode = 'simple'
			changed = true
		}
		if (draft.eligibilityAssetType !== desiredAssetType) {
			patch.eligibilityAssetType = desiredAssetType
			patch.eligibilityAssetId = undefined
			changed = true
		}
		if (changed) {
			wizardState.onDraftChange(patch)
			if (!policyNoticeRef.current.gateEnforced) {
				pushNotification({
					tone: 'info',
					title: 'Hold quests require a gate',
					description: 'Quest type enforcement automatically enabled the correct gating mode.',
				})
				policyNoticeRef.current.gateEnforced = true
			}
		}
	}, [draft.eligibilityAssetType, draft.eligibilityMode, questPolicy.allowPartnerMode, questPolicy.forceHoldQuestGate, requiredAssetGate, pushNotification, wizardState.onDraftChange])

	// Downgrade partner mode if not allowed by policy
	// eslint-disable-next-line react-hooks/exhaustive-deps -- wizardState.onDraftChange is memoized
	useEffect(() => {
		if (questPolicy.allowPartnerMode) return
		if (draft.eligibilityMode !== 'partner') return
		wizardState.onDraftChange({
			eligibilityMode: questPolicy.forceHoldQuestGate ? 'simple' : 'open',
			eligibilityChainList: [],
		})
		if (!policyNoticeRef.current.partnerDowngraded) {
			pushNotification({
				tone: 'info',
				title: 'Partner mode locked',
				description: 'Your tier focuses on simple gates for now. Reach out to the ops team to unlock partner mode.',
			})
			policyNoticeRef.current.partnerDowngraded = true
		}
	}, [draft.eligibilityMode, pushNotification, questPolicy.allowPartnerMode, questPolicy.forceHoldQuestGate, wizardState.onDraftChange])

	// Enforce max partner chains limit
	// eslint-disable-next-line react-hooks/exhaustive-deps -- wizardState.onDraftChange is memoized
	useEffect(() => {
		if (draft.eligibilityMode !== 'partner') return
		const maxChains = questPolicy.maxPartnerChains
		if (!Number.isFinite(maxChains)) return
		const limit = Math.max(1, Math.floor(Number(maxChains)))
		if (draft.eligibilityChainList.length <= limit) return
		const trimmed = draft.eligibilityChainList.slice(0, limit)
		wizardState.onDraftChange({ eligibilityChainList: trimmed })
		if (!policyNoticeRef.current.partnerChainsTrimmed) {
			pushNotification({
				tone: 'info',
				title: `Partner chains limited to ${limit}`,
				description: 'Higher limits unlock with the partner success tier. Extra chains were removed from this quest.',
			})
			policyNoticeRef.current.partnerChainsTrimmed = true
		}
	}, [draft.eligibilityChainList, draft.eligibilityMode, pushNotification, questPolicy.maxPartnerChains, wizardState.onDraftChange])

	// Clear eligibility asset if not verified (policy requirement)
	// eslint-disable-next-line react-hooks/exhaustive-deps -- wizardState.onDraftChange is memoized
	useEffect(() => {
		if (!questPolicy.requireVerifiedAssets) return
		const assetId = draft.eligibilityAssetId?.toLowerCase()
		if (!assetId) {
			policyNoticeRef.current.eligibilityAsset = null
			return
		}
		const asset =
			draft.eligibilityAssetType === 'token'
				? tokenLookup[assetId]
				: nftLookup[assetId]
		if (isAssetAllowed(asset, questPolicy)) {
			policyNoticeRef.current.eligibilityAsset = null
			return
		}
		wizardState.onDraftChange({ eligibilityAssetId: undefined })
		if (policyNoticeRef.current.eligibilityAsset !== assetId) {
			pushNotification({
				tone: 'warning',
				title: 'Verified asset required',
				description: 'Pick a verified token or collection to keep this quest Mini App ready.',
			})
			policyNoticeRef.current.eligibilityAsset = assetId
		}
	}, [draft.eligibilityAssetId, draft.eligibilityAssetType, questPolicy, pushNotification, tokenLookup, nftLookup, wizardState.onDraftChange])

	// Clear reward asset if not verified (policy requirement)
	// eslint-disable-next-line react-hooks/exhaustive-deps -- wizardState.onDraftChange is memoized
	useEffect(() => {
		if (!questPolicy.requireVerifiedAssets) return
		if (draft.rewardMode !== 'token' && draft.rewardMode !== 'nft') {
			policyNoticeRef.current.rewardAsset = null
			return
		}
		const assetId = draft.rewardAssetId?.toLowerCase()
		if (!assetId) {
			policyNoticeRef.current.rewardAsset = null
			return
		}
		const asset = draft.rewardMode === 'token' ? tokenLookup[assetId] : nftLookup[assetId]
		if (isAssetAllowed(asset, questPolicy)) {
			policyNoticeRef.current.rewardAsset = null
			return
		}
		wizardState.onDraftChange({ rewardAssetId: undefined, rewardToken: '', rewardTokenPerUser: '0' })
		if (policyNoticeRef.current.rewardAsset !== assetId) {
			pushNotification({
				tone: 'warning',
				title: 'Reward asset needs verification',
				description: 'Swap to a verified contract before launching your quest.',
			})
			policyNoticeRef.current.rewardAsset = assetId
		}
	}, [draft.rewardAssetId, draft.rewardMode, pushNotification, questPolicy, tokenLookup, nftLookup, wizardState.onDraftChange])

	// Disable raffle if not allowed by policy
	// eslint-disable-next-line react-hooks/exhaustive-deps -- wizardState.onDraftChange is memoized
	useEffect(() => {
		if (questPolicy.allowRaffle) return
		if (!draft.raffleEnabled) return
		wizardState.onDraftChange({ raffleEnabled: false })
		if (!policyNoticeRef.current.raffleDisabled) {
			pushNotification({
				tone: 'info',
				title: 'Raffle rewards disabled',
				description: 'Raffles unlock for partner and admin tiers. Points rewards stay available.',
			})
			policyNoticeRef.current.raffleDisabled = true
		}
	}, [draft.raffleEnabled, pushNotification, questPolicy.allowRaffle, wizardState.onDraftChange])

	// Frame readiness check for MiniKit
	useEffect(() => {
		if (!isFrameReady && typeof setFrameReady === 'function') {
			setFrameReady()
		}
	}, [isFrameReady, setFrameReady])

	// Prefill follow username from MiniKit context
	// eslint-disable-next-line react-hooks/exhaustive-deps -- wizardState.onDraftChange is memoized
	useEffect(() => {
		if (prefilledFollow) return
		if (draft.followUsername) {
			setPrefilledFollow(true)
			return
		}
		const username = typeof contextUser?.username === 'string' ? contextUser.username : undefined
		if (!username) return
		const normalized = username.startsWith('@') ? username.slice(1) : username
		if (!normalized.trim()) {
			setPrefilledFollow(true)
			return
		}
		wizardState.onDraftChange({ followUsername: normalized.trim() })
		setPrefilledFollow(true)
	}, [prefilledFollow, auth.contextUser?.username, draft.followUsername, wizardState.onDraftChange])

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
						verificationState={verificationState}
						onVerifyDraft={runDraftVerification}
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

