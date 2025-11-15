'use client'

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useAccount, useConnect } from 'wagmi'
import { useMiniKit, useAuthenticate } from '@coinbase/onchainkit/minikit'
import { MiniKitAuthPanel } from '@/components/quest-wizard/components/MiniKitAuthPanel'
import { WizardHeader } from '@/components/quest-wizard/components/WizardHeader'
import { useMediaQuery } from '@/components/quest-wizard/hooks/useMediaQuery'
import {
	formatUnknownError,
	isAbortError,
	safeParseSignInMessage,
	extractFidFromSignIn,
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
	type WalletAutoState,
} from '@/components/quest-wizard/types'

// @edit-start 2025-02-14 — Use shared quest wizard module from components namespace
import {
	ASSET_SNAPSHOT_TTL_MS,
	DEFAULT_CHAIN_FILTER,
	DEFAULT_NFT_QUERY,
	DEFAULT_TOKEN_QUERY,
	EMPTY_DRAFT,
	draftReducer,
	STEPS,
	type AssetSnapshot,
	type NftOption,
	type QuestDraft,
	type QuestVerificationState,
	type QuestVerificationSuccess,
	type StepKey,
	type TokenOption,
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
	const [stepIndex, setStepIndex] = useState(0)
	const [headerCollapsed, setHeaderCollapsed] = useState(false)
	const [prefilledFollow, setPrefilledFollow] = useState(false)
	const [authStatus, setAuthStatus] = useState<AuthStatus>('idle')
	const [authError, setAuthError] = useState<string | null>(null)
	const [profile, setProfile] = useState<FarcasterUser | null>(null)
	const [profileLoading, setProfileLoading] = useState(false)
	const [draft, dispatch] = useReducer(draftReducer, EMPTY_DRAFT)
	const [tokens, setTokens] = useState<TokenOption[]>([])
	const [tokenWarnings, setTokenWarnings] = useState<string[]>([])
	const [nfts, setNfts] = useState<NftOption[]>([])
	const [nftWarnings, setNftWarnings] = useState<string[]>([])
	const [tokenQuery, setTokenQuery] = useState(DEFAULT_TOKEN_QUERY)
	const [nftQuery, setNftQuery] = useState(DEFAULT_NFT_QUERY)
	const [tokenLoading, setTokenLoading] = useState(false)
	const [nftLoading, setNftLoading] = useState(false)
	const [tokenError, setTokenError] = useState<string | null>(null)
	const [nftError, setNftError] = useState<string | null>(null)
	const [signInResult, setSignInResult] = useState<MiniAppSignInResult | null>(null)
	const [walletAutoState, setWalletAutoState] = useState<WalletAutoState>({ status: 'idle', connectorName: null, lastError: null })
	const [touchedSteps, setTouchedSteps] = useState<Record<StepKey, boolean>>({ basics: false, eligibility: false, rewards: false, preview: false })
	const [hasLoadedTokens, setHasLoadedTokens] = useState(false)
	const [hasLoadedNfts, setHasLoadedNfts] = useState(false)
	const [escrowNow, setEscrowNow] = useState(() => Date.now())
	const triedMiniAuthRef = useRef(false)
	const triedWalletAutoRef = useRef(false)
	const tokenFetchControllerRef = useRef<AbortController | null>(null)
	const nftFetchControllerRef = useRef<AbortController | null>(null)
	const pendingAuthToastRef = useRef<number | null>(null)
	const pendingWalletToastRef = useRef<number | null>(null)
	const tokenSnapshotCacheRef = useRef<Map<string, AssetSnapshot<TokenOption>>>(new Map())
	const nftSnapshotCacheRef = useRef<Map<string, AssetSnapshot<NftOption>>>(new Map())
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
	const isMobile = useMediaQuery('(max-width: 768px)')
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

	const contextUser = (context?.user ?? null) as MiniKitContextUser | null
	const miniAppLocation = typeof (context as any)?.location === 'string' ? (context as any).location : null
	const miniAppClient = typeof (context as any)?.client?.name === 'string' ? (context as any).client.name : null
	const isMiniAppSession = Boolean(contextUser || miniAppLocation || miniAppClient)
	const hasOnchainKitApiKey = Boolean(process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY)
	const parsedSignIn = useMemo(() => (signInResult ? safeParseSignInMessage(signInResult.message) : null), [signInResult])
	const signInFid = useMemo(() => extractFidFromSignIn(parsedSignIn), [parsedSignIn])
	const resolvedFid = useMemo(() => {
		const contextFid = normalizeFid(contextUser?.fid)
		return signInFid ?? contextFid ?? null
	}, [signInFid, contextUser?.fid])
	const creatorTier = useMemo<CreatorTier>(() => resolveCreatorTier({ fid: resolvedFid ?? undefined, address }), [resolvedFid, address])
	const questPolicy = useMemo(() => getQuestPolicy(creatorTier), [creatorTier])
	const requiredAssetGate = useMemo(() => questTypeRequiresGate(draft.questTypeKey), [draft.questTypeKey])

	const assetsLoading = tokenLoading || nftLoading
	const assetsError = tokenError ?? nftError
	const assetWarnings = useMemo(() => [...tokenWarnings, ...nftWarnings], [tokenWarnings, nftWarnings])

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

	const markStepTouched = useCallback((key: StepKey) => {
		setTouchedSteps((prev) => (prev[key] ? prev : { ...prev, [key]: true }))
	}, [])

	const handleStepSelect = useCallback(
		(index: number) => {
			if (index === stepIndex) return
			const currentStep = STEPS[stepIndex]
			const currentValidation = validation[currentStep.key]
			if (index > stepIndex && !currentValidation.valid) {
				markStepTouched(currentStep.key)
				pushNotification({
					tone: 'warning',
					title: `Complete ${currentStep.label}`,
					description: 'Fill in the highlighted fields before advancing to the next step.',
				})
				return
			}
			setStepIndex(index)
		},
		[markStepTouched, pushNotification, stepIndex, validation],
	)

	const handleNextStep = useCallback(() => {
		const currentStep = STEPS[stepIndex]
		const currentValidation = validation[currentStep.key]
		if (!currentValidation.valid) {
			markStepTouched(currentStep.key)
			pushNotification({
				tone: 'warning',
				title: `Finish ${currentStep.label}`,
				description: 'Complete the required fields to continue the wizard.',
			})
			return
		}
		setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1))
	}, [markStepTouched, pushNotification, stepIndex, validation])

	const handlePrevStep = useCallback(() => {
		setStepIndex((prev) => Math.max(prev - 1, 0))
	}, [])

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
			dispatch({ type: 'merge', patch })
			if (!policyNoticeRef.current.gateEnforced) {
				pushNotification({
					tone: 'info',
					title: 'Hold quests require a gate',
					description: 'Quest type enforcement automatically enabled the correct gating mode.',
				})
				policyNoticeRef.current.gateEnforced = true
			}
		}
	}, [draft.eligibilityAssetType, draft.eligibilityMode, questPolicy.allowPartnerMode, questPolicy.forceHoldQuestGate, requiredAssetGate, pushNotification])

	useEffect(() => {
		if (questPolicy.allowPartnerMode) return
		if (draft.eligibilityMode !== 'partner') return
		dispatch({
			type: 'merge',
			patch: {
				eligibilityMode: questPolicy.forceHoldQuestGate ? 'simple' : 'open',
				eligibilityChainList: [],
			},
		})
		if (!policyNoticeRef.current.partnerDowngraded) {
			pushNotification({
				tone: 'info',
				title: 'Partner mode locked',
				description: 'Your tier focuses on simple gates for now. Reach out to the ops team to unlock partner mode.',
			})
			policyNoticeRef.current.partnerDowngraded = true
		}
	}, [draft.eligibilityMode, pushNotification, questPolicy.allowPartnerMode, questPolicy.forceHoldQuestGate])

	useEffect(() => {
		if (draft.eligibilityMode !== 'partner') return
		const maxChains = questPolicy.maxPartnerChains
		if (!Number.isFinite(maxChains)) return
		const limit = Math.max(1, Math.floor(Number(maxChains)))
		if (draft.eligibilityChainList.length <= limit) return
		const trimmed = draft.eligibilityChainList.slice(0, limit)
		dispatch({ type: 'merge', patch: { eligibilityChainList: trimmed } })
		if (!policyNoticeRef.current.partnerChainsTrimmed) {
			pushNotification({
				tone: 'info',
				title: `Partner chains limited to ${limit}`,
				description: 'Higher limits unlock with the partner success tier. Extra chains were removed from this quest.',
			})
			policyNoticeRef.current.partnerChainsTrimmed = true
		}
	}, [draft.eligibilityChainList, draft.eligibilityMode, pushNotification, questPolicy.maxPartnerChains])

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
		dispatch({ type: 'merge', patch: { eligibilityAssetId: undefined } })
		if (policyNoticeRef.current.eligibilityAsset !== assetId) {
			pushNotification({
				tone: 'warning',
				title: 'Verified asset required',
				description: 'Pick a verified token or collection to keep this quest Mini App ready.',
			})
			policyNoticeRef.current.eligibilityAsset = assetId
		}
	}, [draft.eligibilityAssetId, draft.eligibilityAssetType, questPolicy, pushNotification, tokenLookup, nftLookup])

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
		dispatch({ type: 'merge', patch: { rewardAssetId: undefined, rewardToken: '', rewardTokenPerUser: '0' } })
		if (policyNoticeRef.current.rewardAsset !== assetId) {
			pushNotification({
				tone: 'warning',
				title: 'Reward asset needs verification',
				description: 'Swap to a verified contract before launching your quest.',
			})
			policyNoticeRef.current.rewardAsset = assetId
		}
	}, [draft.rewardAssetId, draft.rewardMode, pushNotification, questPolicy, tokenLookup, nftLookup])

	useEffect(() => {
		if (questPolicy.allowRaffle) return
		if (!draft.raffleEnabled) return
		dispatch({ type: 'merge', patch: { raffleEnabled: false } })
		if (!policyNoticeRef.current.raffleDisabled) {
			pushNotification({
				tone: 'info',
				title: 'Raffle rewards disabled',
				description: 'Raffles unlock for partner and admin tiers. Points rewards stay available.',
			})
			policyNoticeRef.current.raffleDisabled = true
		}
	}, [draft.raffleEnabled, pushNotification, questPolicy.allowRaffle])

	useEffect(() => {
		if (!isFrameReady && typeof setFrameReady === 'function') {
			setFrameReady()
		}
	}, [isFrameReady, setFrameReady])

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
		dispatch({ type: 'merge', patch: { followUsername: normalized.trim() } })
		setPrefilledFollow(true)
	}, [prefilledFollow, contextUser?.username, draft.followUsername])

	useEffect(() => {
		if (signInResult) {
			setAuthStatus((prev) => (prev === 'success' ? prev : 'success'))
			setAuthError(null)
			return
		}
		if (authStatus === 'success') {
			setAuthStatus('idle')
		}
	}, [signInResult, authStatus])

	useEffect(() => {
		if (!resolvedFid) {
			setProfile(null)
			setProfileLoading(false)
			return
		}
		let cancelled = false
		setProfileLoading(true)
		void (async () => {
			try {
				const result = await fetchUserByFid(resolvedFid)
				if (!cancelled) {
					setProfile(result)
					setProfileLoading(false)
				}
			} catch (error) {
				if (!cancelled) {
					console.warn('Failed to fetch Neynar profile:', error)
					setProfile(null)
					setProfileLoading(false)
				}
			}
		})()
		return () => {
			cancelled = true
		}
	}, [resolvedFid])

	const handleAuthenticate = useCallback(async () => {
		setAuthError(null)
		setAuthStatus('pending')
		if (pendingAuthToastRef.current) {
			dismissNotification(pendingAuthToastRef.current)
			pendingAuthToastRef.current = null
		}
		const startToastId = pushNotification({
			tone: 'info',
			title: 'Starting Gmeow sign-in',
			description: 'Follow the mini-app prompt to finish authentication.',
			duration: 6400,
		})
		pendingAuthToastRef.current = startToastId
		try {
			const result = await signInWithMiniKit()
			dismissNotification(startToastId)
			pendingAuthToastRef.current = null
			if (!result) {
				setSignInResult(null)
				setAuthStatus('idle')
				pushNotification({
					tone: 'warning',
					title: 'Sign-in dismissed',
					description: 'No Farcaster signature was detected. Try again when you are ready.',
				})
				return result
			}
			setSignInResult(result)
			setAuthStatus('success')
			pushNotification({
				tone: 'success',
				title: 'Signed in with Gmeow',
				description: 'Mini-app handshake complete. Identity data is synced.',
			})
			return result
		} catch (error) {
			console.error('MiniKit authentication failed:', error)
			setAuthStatus('error')
			setSignInResult(null)
			const message = formatUnknownError(error, 'We could not finish the Gmeow sign-in.')
			setAuthError(message)
			dismissNotification(startToastId)
			pendingAuthToastRef.current = null
			pushNotification({
				tone: 'error',
				title: 'Sign-in failed',
				description: message,
			})
			return false
		}
	}, [dismissNotification, pushNotification, signInWithMiniKit])

	useEffect(() => {
		if (!isFrameReady) return
		if (!isMiniAppSession) return
		if (signInResult) return
		if (authStatus === 'pending') return
		if (triedMiniAuthRef.current) return
		triedMiniAuthRef.current = true
		void handleAuthenticate()
	}, [isFrameReady, isMiniAppSession, signInResult, authStatus, handleAuthenticate])

	useEffect(() => {
		if (!isMiniAppSession) {
			triedMiniAuthRef.current = false
		}
	}, [isMiniAppSession])

	useEffect(() => {
		if (isMiniAppSession) return
		if (isConnected) return
		if (triedWalletAutoRef.current) return
		if (!Array.isArray(connectors) || connectors.length === 0) {
			triedWalletAutoRef.current = true
			setWalletAutoState({ status: 'missing', connectorName: null, lastError: null })
			pushNotification({
				tone: 'warning',
				title: 'No desktop wallet connector',
				description: 'Add a Farcaster-compatible signer to test the Gmeow wizard on desktop.',
			})
			return
		}
		const availableConnectors = connectors.filter((connector) => {
			if (typeof connector.ready === 'boolean') return connector.ready
			return true
		})
		if (!availableConnectors.length) {
			setWalletAutoState({ status: 'missing', connectorName: null, lastError: null })
			return
		}
		const preferredConnector =
			availableConnectors.find((connector) => {
				const id = connector?.id?.toString?.().toLowerCase?.()
				const name = connector?.name?.toLowerCase?.()
				return Boolean(id && id.includes('farcaster')) || Boolean(name && name.includes('farcaster'))
			}) ?? availableConnectors[0]
		if (!preferredConnector) {
			setWalletAutoState({ status: 'missing', connectorName: null, lastError: null })
			return
		}
		triedWalletAutoRef.current = true
		const attempt = async () => {
			if (pendingWalletToastRef.current) {
				dismissNotification(pendingWalletToastRef.current)
				pendingWalletToastRef.current = null
			}
			const friendlyName = preferredConnector?.name || 'your wallet'
			const startToastId = pushNotification({
				tone: 'info',
				title: 'Connecting wallet',
				description: `Gmeow is attempting to link ${friendlyName}. Approve the prompt if it appears.`,
				duration: 6200,
			})
			pendingWalletToastRef.current = startToastId
			setWalletAutoState({ status: 'attempting', connectorName: friendlyName, lastError: null })
			try {
				if (typeof connectAsync === 'function') {
					await connectAsync({ connector: preferredConnector })
					dismissNotification(startToastId)
					pendingWalletToastRef.current = null
					setWalletAutoState({ status: 'connected', connectorName: friendlyName, lastError: null })
					pushNotification({
						tone: 'success',
						title: 'Wallet connected',
						description: 'Gmeow successfully linked your wallet for the demo.',
					})
				} else {
					connect({ connector: preferredConnector })
					dismissNotification(startToastId)
					pendingWalletToastRef.current = null
					setWalletAutoState({ status: 'requested', connectorName: friendlyName, lastError: null })
					pushNotification({
						tone: 'info',
						title: 'Wallet connection requested',
						description: 'Approve the signer request to finalize the Gmeow link.',
					})
				}
			} catch (error) {
				console.warn('Auto wallet connect failed:', error)
				dismissNotification(startToastId)
				pendingWalletToastRef.current = null
				setWalletAutoState({ status: 'failed', connectorName: friendlyName, lastError: formatUnknownError(error, 'Automatic wallet connection did not complete.') })
				pushNotification({
					tone: 'error',
					title: 'Wallet connection failed',
					description: formatUnknownError(error, 'We could not connect your wallet automatically.'),
				})
			}
		}
		setTimeout(() => {
			void attempt()
		}, 0)
	}, [connect, connectAsync, connectors, dismissNotification, isConnected, isMiniAppSession, pushNotification, setWalletAutoState])

	useEffect(() => {
		if (isMiniAppSession) {
			triedWalletAutoRef.current = false
		}
	}, [isMiniAppSession])

	useEffect(() => {
		if (isConnected) {
			const connectorName = activeConnector?.name || null
			setWalletAutoState((prev) => {
				const resolvedName = connectorName ?? prev.connectorName ?? null
				if (prev.status === 'connected' && prev.connectorName === resolvedName) {
					return prev
				}
				return { status: 'connected', connectorName: resolvedName, lastError: null }
			})
		} else {
			setWalletAutoState((prev) => {
				if (prev.status === 'connected' || prev.status === 'requested') {
					return { status: 'idle', connectorName: prev.connectorName ?? null, lastError: prev.lastError ?? null }
				}
				return prev
			})
		}
	}, [activeConnector, isConnected, setWalletAutoState])

	const fetchTokenCatalog = useCallback(
		async (term: string, chains: string = DEFAULT_CHAIN_FILTER, options: { force?: boolean } = {}) => {
			const trimmed = term.trim()
			const cacheKey = `${chains}::${trimmed.toLowerCase()}`
			const cached = tokenSnapshotCacheRef.current.get(cacheKey)
			if (!options.force && cached && Date.now() - cached.timestamp < ASSET_SNAPSHOT_TTL_MS) {
				setTokens(cached.items)
				setTokenWarnings(cached.warnings)
				setTokenLoading(false)
				setTokenError(null)
				return
			}

			tokenFetchControllerRef.current?.abort()
			const controller = new AbortController()
			tokenFetchControllerRef.current = controller
			setTokenLoading(true)
			setTokenError(null)

			try {
				const params = new URLSearchParams()
				params.set('section', 'tokens')
				params.set('includePrice', 'true')
				params.set('limit', isMobile ? '12' : '20')
				params.set('chains', chains)
				if (trimmed.length > 0) {
					params.set('tokenTerm', trimmed)
				}

				const response = await fetch(`/api/farcaster/assets?${params.toString()}`, {
					cache: 'no-store',
					signal: controller.signal,
				})
				let data: any = null
				try {
					data = await response.json()
				} catch {
					throw new Error('Failed to parse token catalog response')
				}

				if (!response.ok || !data?.ok) {
					const fallback = `Failed to load tokens (status ${response.status})`
					const message = typeof data?.error === 'string' && data.error.length > 0 ? data.error : fallback
					throw new Error(message)
				}

				const nextTokens = Array.isArray(data.tokens) ? (data.tokens as TokenOption[]) : []
				const nextWarnings = Array.isArray(data.tokenWarnings) ? data.tokenWarnings : []
				tokenSnapshotCacheRef.current.set(cacheKey, { items: nextTokens, warnings: nextWarnings, timestamp: Date.now() })
				setTokens(nextTokens)
				setTokenWarnings(nextWarnings)
			} catch (error) {
				if (isAbortError(error)) {
					return
				}
				const message = error instanceof Error ? error.message : 'Failed to load tokens'
				tokenSnapshotCacheRef.current.delete(cacheKey)
				setTokens([])
				setTokenWarnings([])
				setTokenError(message)
			} finally {
				if (tokenFetchControllerRef.current === controller) {
					tokenFetchControllerRef.current = null
				}
				setTokenLoading(false)
			}
		},
		[isMobile],
	)

	const fetchNftCatalog = useCallback(
		async (query: string, chains: string = DEFAULT_CHAIN_FILTER, options: { force?: boolean } = {}) => {
			const trimmed = query.trim()
			const cacheKey = `${chains}::${trimmed.toLowerCase()}`
			const cached = nftSnapshotCacheRef.current.get(cacheKey)
			if (!options.force && cached && Date.now() - cached.timestamp < ASSET_SNAPSHOT_TTL_MS) {
				setNfts(cached.items)
				setNftWarnings(cached.warnings)
				setNftLoading(false)
				setNftError(null)
				return
			}

			nftFetchControllerRef.current?.abort()
			const controller = new AbortController()
			nftFetchControllerRef.current = controller
			setNftLoading(true)
			setNftError(null)

			try {
				const params = new URLSearchParams()
				params.set('section', 'nfts')
				params.set('chains', chains)
				params.set('limit', isMobile ? '12' : '20')
				if (trimmed.length > 0) {
					params.set('nftQuery', trimmed)
				}

				const response = await fetch(`/api/farcaster/assets?${params.toString()}`, {
					cache: 'no-store',
					signal: controller.signal,
				})
				let data: any = null
				try {
					data = await response.json()
				} catch {
					throw new Error('Failed to parse NFT catalog response')
				}

				if (!response.ok || !data?.ok) {
					const fallback = `Failed to load NFT collections (status ${response.status})`
					const message = typeof data?.error === 'string' && data.error.length > 0 ? data.error : fallback
					throw new Error(message)
				}

				const nextNfts = Array.isArray(data.nfts) ? (data.nfts as NftOption[]) : []
				const nextWarnings = Array.isArray(data.nftWarnings) ? data.nftWarnings : []
				nftSnapshotCacheRef.current.set(cacheKey, { items: nextNfts, warnings: nextWarnings, timestamp: Date.now() })
				setNfts(nextNfts)
				setNftWarnings(nextWarnings)
			} catch (error) {
				if (isAbortError(error)) {
					return
				}
				const message = error instanceof Error ? error.message : 'Failed to load NFT collections'
				nftSnapshotCacheRef.current.delete(cacheKey)
				setNfts([])
				setNftWarnings([])
				setNftError(message)
			} finally {
				if (nftFetchControllerRef.current === controller) {
					nftFetchControllerRef.current = null
				}
				setNftLoading(false)
			}
		},
		[isMobile],
	)

	const handleAssetRescan = useCallback(() => {
		setHasLoadedTokens(true)
		setHasLoadedNfts(true)
		void Promise.all([
			fetchTokenCatalog(tokenQuery, DEFAULT_CHAIN_FILTER, { force: true }),
			fetchNftCatalog(nftQuery, DEFAULT_CHAIN_FILTER, { force: true }),
		])
	}, [fetchTokenCatalog, fetchNftCatalog, nftQuery, tokenQuery])

	const handleVerifyDraft = useCallback((options?: { force?: boolean }) => runDraftVerification(options), [runDraftVerification])

	const handleTokenSearch = useCallback(
		(term: string) => {
			const nextTerm = term.trim()
			setTokenQuery(nextTerm)
			setHasLoadedTokens(true)
			void fetchTokenCatalog(nextTerm)
		},
		[fetchTokenCatalog],
	)

	const handleNftSearch = useCallback(
		(query: string) => {
			const nextQuery = query.trim().length > 0 ? query.trim() : DEFAULT_NFT_QUERY
			setNftQuery(nextQuery)
			setHasLoadedNfts(true)
			void fetchNftCatalog(nextQuery)
		},
		[fetchNftCatalog],
	)

	useEffect(() => {
		if ((stepIndex === 1 || stepIndex === 2) && !hasLoadedTokens) {
			setHasLoadedTokens(true)
			void fetchTokenCatalog(tokenQuery)
		}
	}, [fetchTokenCatalog, hasLoadedTokens, stepIndex, tokenQuery])

	useEffect(() => {
		if ((stepIndex === 1 || stepIndex === 2) && !hasLoadedNfts) {
			setHasLoadedNfts(true)
			void fetchNftCatalog(nftQuery)
		}
	}, [fetchNftCatalog, hasLoadedNfts, stepIndex, nftQuery])

	const handleMerge = (patch: Partial<QuestDraft>) => dispatch({ type: 'merge', patch })
	const handleReset = () => {
		dispatch({ type: 'reset' })
		setTouchedSteps({ basics: false, eligibility: false, rewards: false, preview: false })
	}

	return (
		<div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-12 pt-8">
				<WizardHeader
					context={context}
					profile={profile}
					loadingProfile={profileLoading}
					signInResult={signInResult}
					resolvedFid={resolvedFid}
					step={stepIndex}
					collapsed={headerCollapsed}
					onToggleCollapsed={() => setHeaderCollapsed((prev) => !prev)}
					walletAddress={address}
					walletState={walletAutoState}
				/>
				<MiniKitAuthPanel
					context={context}
					isFrameReady={isFrameReady}
					authStatus={authStatus}
					authError={authError}
					hasApiKey={hasOnchainKitApiKey}
					onAuthenticate={handleAuthenticate}
					signInResult={signInResult}
					parsedSignIn={parsedSignIn}
					profile={profile}
					profileLoading={profileLoading}
					resolvedFid={resolvedFid}
				/>
				<header className="flex flex-col gap-2">
					<span className="text-[11px] uppercase tracking-[0.3em] text-sky-400">Quest Builder Demo</span>
					<h1 className="text-3xl font-semibold sm:text-4xl">Multi-step wizard · prototype</h1>
					<p className="max-w-2xl text-sm text-slate-300 sm:text-base">
						This sandbox keeps a single <code className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[12px] text-emerald-300">QuestDraft</code> snapshot as you page through the steps, mirroring the contract struct in
						<code className="ml-1 rounded bg-slate-800/80 px-1 py-0.5 text-[12px] text-emerald-300">GmeowMultichain</code>.
					</p>
				</header>

				<Stepper activeIndex={stepIndex} steps={renderedSteps} onSelect={handleStepSelect} />

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
							onTokenSearch={handleTokenSearch}
							onNftSearch={handleNftSearch}
							onRefreshCatalog={handleAssetRescan}
							onChange={handleMerge}
							onNext={handleNextStep}
							onPrev={handlePrevStep}
							onReset={handleReset}
							validation={activeValidation}
							showValidation={Boolean(activeStepTouched)}
							tokenEscrowStatus={tokenEscrowStatus}
							verificationState={verificationState}
							onVerifyDraft={handleVerifyDraft}
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

