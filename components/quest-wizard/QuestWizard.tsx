'use client'

import Image from 'next/image'
import { useCallback, useEffect, useId, useMemo, useReducer, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
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
import { Field } from '@/components/quest-wizard/components/Field'
import { SegmentedToggle } from '@/components/quest-wizard/components/SegmentedToggle'
import { QuickExpiryPicker } from '@/components/quest-wizard/components/QuickExpiryPicker'
import { TokenSelector } from '@/components/quest-wizard/components/TokenSelector'
import { SelectorState } from '@/components/quest-wizard/components/SelectorState'
import type { FieldControlA11yProps } from '@/components/quest-wizard/components/a11y'
import {
	type AuthStatus,
	type MiniAppSignInResult,
	type MiniKitContextUser,
	type WalletAutoState,
} from '@/components/quest-wizard/types'

import {
	CHAIN_KEYS,
	CHAIN_LABEL,
	getQuestFieldConfig,
	normalizeQuestTypeKey,
	type ChainKey,
	type QuestFieldConfig,
} from '@/lib/gm-utils'
// @edit-start 2025-02-14 — Use shared quest wizard module from components namespace
import {
	ASSET_SNAPSHOT_TTL_MS,
	DEFAULT_CHAIN_FILTER,
	DEFAULT_NFT_QUERY,
	DEFAULT_TOKEN_QUERY,
	EMPTY_DRAFT,
	draftReducer,
	QUEST_FIELD_DESCRIPTIONS,
	QUEST_FIELD_ORDER,
	QUEST_TYPE_DETAILS,
	QUEST_TYPE_OPTIONS,
	formatChainList,
	formatEth,
	formatRelativeTimeFromNow,
	formatVerificationValue,
	STEPS,
	sanitizeNumericInput,
	sanitizeUsernameInput,
	mergeChainLists,
	type AssetSnapshot,
	type NftLookup,
	type NftOption,
	type QuestDraft,
	type QuestSummary,
	type QuestVerificationState,
	type QuestVerificationSuccess,
	type StepErrors,
	type StepKey,
	type StepValidationResult,
	type TokenLookup,
	type TokenOption,
	type QuestTypeDetails,
	toIsoStringOrEmpty,
	toLocalDateTimeInputValue,
	toPositiveInt,
	type TokenEscrowPhase,
	type TokenEscrowStatus,
	normalizeFid,
} from '@/components/quest-wizard/shared'
// @edit-end
import {
	getQuestPolicy,
	isAssetAllowed,
	questTypeRequiresGate,
	resolveCreatorTier,
	type CreatorTier,
	type QuestPolicy,
} from '@/lib/quest-policy'
import { fetchUserByFid, type FarcasterUser } from '@/lib/neynar'
import { useNotifications } from '@/components/ui/live-notifications'

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

type StepperProps = {
	activeIndex: number
	steps: Array<{ key: StepKey; label: string; description: string; status: 'done' | 'active' | 'waiting' }>
	onSelect(index: number): void
}

function Stepper({ activeIndex, steps, onSelect }: StepperProps) {
	return (
		<ol className="relative flex snap-x snap-mandatory gap-3 overflow-x-auto rounded-3xl border border-white/10 bg-slate-950/70 p-4 backdrop-blur lg:grid lg:grid-cols-4 lg:gap-3 lg:overflow-visible">
			{steps.map((step, index) => {
				const isActive = step.status === 'active' || index === activeIndex
				const isDone = step.status === 'done'
					// @edit-start 2025-11-12 — Improve focus visibility on stepper controls
					return (
					<li key={step.key} className="group flex-none snap-start min-w-[220px] lg:min-w-0">
						<button
							type="button"
							onClick={() => onSelect(index)}
								className={`flex w-full flex-col gap-1 rounded-2xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
								isActive
									? 'border-sky-400/60 bg-sky-400/10 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]'
									: isDone
										? 'border-emerald-400/40 bg-emerald-500/5'
										: 'border-white/5 hover:border-white/15 hover:bg-white/5'
							}`}
							aria-current={isActive ? 'step' : undefined}
						>
							<span className="flex items-center gap-2 text-sm font-semibold">
								<span
									className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] uppercase tracking-[0.2em] ${
										isActive
											? 'border-sky-400 bg-sky-400/10 text-sky-200'
											: isDone
												? 'border-emerald-400 bg-emerald-400/10 text-emerald-200'
												: 'border-white/10 bg-slate-900 text-slate-400'
										}`}
								>
									{index + 1}
								</span>
								{step.label}
							</span>
							<span className="text-xs text-slate-400">{step.description}</span>
						</button>
					</li>
				)
					// @edit-end
			})}
		</ol>
	)
}

type StepPanelProps = {
	index: number
	step: { key: StepKey; label: string; description: string }
	draft: QuestDraft
	policy: QuestPolicy
	requiredGate: ReturnType<typeof questTypeRequiresGate>
	summary: QuestSummary
	tokens: TokenOption[]
	nfts: NftOption[]
	tokenLookup: TokenLookup
	nftLookup: NftLookup
	assetsLoading: boolean
	assetsError: string | null
	assetWarnings: string[]
	tokenLoading: boolean
	tokenError: string | null
	nftLoading: boolean
	nftError: string | null
	tokenQuery: string
	nftQuery: string
	onTokenSearch(term: string): void
	onNftSearch(term: string): void
	onRefreshCatalog(): void
	onChange(patch: Partial<QuestDraft>): void
	onNext(): void
	onPrev(): void
	onReset(): void
	validation: StepValidationResult
	showValidation: boolean
	tokenEscrowStatus: TokenEscrowStatus | null
	verificationState: QuestVerificationState
	onVerifyDraft(options?: { force?: boolean }): Promise<QuestVerificationSuccess | null> | null | void
}

function StepPanel({
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

function buildQuestFieldRequirementHints(config: QuestFieldConfig): string[] {
	return QUEST_FIELD_ORDER.filter((field) => config[field] && config[field] !== 'hidden').map((field) => {
		const requirement = config[field]
		const description = QUEST_FIELD_DESCRIPTIONS[field] || field
		const prefix = requirement === 'required' ? 'Required' : 'Optional'
		return `${prefix} · ${description}`
	})
}

function QuestTypeGuide({
	questType,
	detail,
	config,
}: {
	questType: QuestDraft['questTypeKey']
	detail: QuestTypeDetails
	config: QuestFieldConfig
}) {
	const modeLabel = config.mode === 'social' ? 'Social quest' : 'Onchain quest'
	const modeTone = config.mode === 'social' ? 'border-sky-400/40 bg-sky-400/10 text-sky-200' : 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
	const requirementHints = buildQuestFieldRequirementHints(config)
	const tips = detail.tips ?? []
	const showPanels = requirementHints.length > 0 || tips.length > 0

	return (
		<section className="rounded-3xl border border-white/10 bg-white/5 p-5">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Quest template</p>
					<h3 className="mt-1 text-xl font-semibold text-slate-100">{detail.label}</h3>
					<p className="mt-2 max-w-xl text-sm text-slate-300">{detail.description}</p>
				</div>
				<span className={`inline-flex h-fit items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${modeTone}`}>
					{modeLabel}
				</span>
			</div>
			{showPanels ? (
				<div className="mt-4 grid gap-3 lg:grid-cols-2">
					{requirementHints.length ? (
						<div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
							<p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Fields</p>
							<ul className="mt-2 space-y-1 text-sm text-slate-200">
								{requirementHints.map((hint, index) => (
									<li key={`${questType}-hint-${index}`} className="flex items-start gap-2">
										<span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden />
										<span>{hint}</span>
									</li>
								))}
							</ul>
						</div>
					) : null}
					{tips.length ? (
						<div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
							<p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Tips</p>
							<ul className="mt-2 space-y-1 text-sm text-slate-200">
								{tips.map((tip, index) => (
									<li key={`${questType}-tip-${index}`} className="flex items-start gap-2">
										<span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-sky-400" aria-hidden />
										<span>{tip}</span>
									</li>
								))}
							</ul>
						</div>
					) : null}
				</div>
			) : (
				<p className="mt-4 text-xs text-slate-400">No extra fields required – jump straight into the basics below.</p>
			)}
		</section>
	)
}

function BasicsStep({
	draft,
	onChange,
	errors,
	showValidation,
}: {
	draft: QuestDraft
	onChange(patch: Partial<QuestDraft>): void
	errors: StepErrors
	showValidation: boolean
}) {
	const questType = normalizeQuestTypeKey(draft.questTypeKey)
	const fieldConfig = getQuestFieldConfig(questType)
	const questDetail = QUEST_TYPE_DETAILS[questType] ?? QUEST_TYPE_DETAILS.GENERIC
	const followState = fieldConfig.followHandle
	const frameState = fieldConfig.frameUrl
	const castLinkState = fieldConfig.castLink
	const castTextState = fieldConfig.castText
	const mentionState = fieldConfig.mentionHandle
	const targetHandleState = fieldConfig.targetHandle
	const targetFidState = fieldConfig.targetFid
	const showFollow = followState !== 'hidden'
	const showFrame = frameState !== 'hidden'
	const showCastLink = castLinkState !== 'hidden'
	const showCastContains = castTextState !== 'hidden'
	const showMention = mentionState !== 'hidden'
	const showTargetUsername = targetHandleState !== 'hidden'
	const showTargetFid = targetFidState !== 'hidden'
	const followRequired = followState === 'required'
	const castLinkRequired = castLinkState === 'required'
	const castContainsRequired = castTextState === 'required'
	const mentionRequired = mentionState === 'required'
	const targetUsernameRequired = targetHandleState === 'required'
	const targetFidRequired = targetFidState === 'required'
	const getError = (key: string) => (showValidation ? errors[key] : undefined)
	const nameError = getError('name')
	const descriptionError = getError('description')
	const followError = getError('followUsername')
	const frameUrlError = getError('frameUrl')
	const castLinkError = getError('castLink')
	const mentionError = getError('mentionUsername')
	const targetUsernameError = getError('targetUsername')
	const targetFidError = getError('targetFid')

	const castLinkLabel = castLinkRequired ? 'Cast or channel link' : 'Cast or channel link (optional)'
	const castLinkDescription = castLinkRequired
		? 'Paste a Warpcast URL or cast hash — verified posts surface richer metadata'
		: 'Optional anchor. Paste a Warpcast URL or cast hash to enrich preview and verification.'
	const castContainsLabel = castContainsRequired ? 'Required cast text' : 'Cast keyword (optional)'
	const castContainsDescription = castContainsRequired
		? "Claimer's cast must include this phrase (case-insensitive)"
		: 'Optional keyword filter — match hashtags, phrases, or partner names'
	const mentionLabel = mentionRequired ? 'Mention handle' : 'Mention handle (optional)'
	const targetUsernameLabel = targetUsernameRequired ? 'Target username' : 'Target username (optional)'
	const targetFidLabel = targetFidRequired ? 'Target fid' : 'Target fid (optional)'

	const handleMediaUpload = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file) return
		const reader = new FileReader()
		reader.onloadend = () => {
			const result = typeof reader.result === 'string' ? reader.result : ''
			onChange({ media: result, mediaPreview: result, mediaFileName: file.name })
		}
		reader.readAsDataURL(file)
	}

	const applyQuestTypeChange = (nextType: QuestDraft['questTypeKey']) => {
		const normalizedType = normalizeQuestTypeKey(nextType)
		const nextConfig = getQuestFieldConfig(normalizedType)
		const patch: Partial<QuestDraft> = { questTypeKey: normalizedType }
		if (nextConfig.followHandle === 'hidden' && draft.followUsername) {
			patch.followUsername = ''
		}
		if (nextConfig.mentionHandle === 'hidden' && draft.mentionUsername) {
			patch.mentionUsername = ''
		}
		if (nextConfig.castLink === 'hidden' && draft.castLink) {
			patch.castLink = ''
		}
		if (nextConfig.castText === 'hidden' && draft.castContains) {
			patch.castContains = ''
		}
		if (nextConfig.frameUrl === 'hidden' && draft.frameUrl) {
			patch.frameUrl = ''
		}
		if (nextConfig.targetHandle === 'hidden' && draft.targetUsername) {
			patch.targetUsername = ''
		}
		if (nextConfig.targetFid === 'hidden' && draft.targetFid) {
			patch.targetFid = ''
		}
		if (nextConfig.targetHandle === 'hidden' && nextConfig.targetFid === 'hidden' && draft.target) {
			patch.target = ''
		}
		onChange(patch)
	}

	const handleQuestTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
		applyQuestTypeChange(event.target.value as QuestDraft['questTypeKey'])
	}

	const handleMentionChange = (value: string) => {
		onChange({ mentionUsername: sanitizeUsernameInput(value) })
	}

	const handleTargetUsernameChange = (value: string) => {
		const sanitized = sanitizeUsernameInput(value)
		onChange({ targetUsername: sanitized, target: sanitized })
	}

	const handleTargetFidChange = (value: string) => {
		const digitsOnly = value.replace(/[^0-9]/g, '')
		onChange({ targetFid: digitsOnly, target: digitsOnly || draft.targetUsername })
	}

	return (
		<div className="grid gap-6">
			<QuestTypeGuide questType={questType} detail={questDetail} config={fieldConfig} />
			<div className="grid gap-4 sm:grid-cols-2">
				<Field label="Quest title" description="Headline shown on the quest card" error={nameError}>
					<input
						className="pixel-input"
						placeholder="e.g. GM with the partner community"
						value={draft.name}
						onChange={(event) => onChange({ name: event.target.value })}
						aria-invalid={Boolean(nameError)}
					/>
				</Field>
				<Field label="Quest type">
					<select
						className="pixel-input"
						value={questType}
						onChange={handleQuestTypeChange}
					>
						{QUEST_TYPE_OPTIONS.map((key) => {
							const optionDetail = QUEST_TYPE_DETAILS[normalizeQuestTypeKey(key)] ?? QUEST_TYPE_DETAILS.GENERIC
							return (
								<option key={key} value={key}>
									{optionDetail.label}
								</option>
							)
						})}
					</select>
				</Field>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<Field label="Chain" description="Primary chain for reward settlement and onchain checks">
					<select className="pixel-input" value={draft.chain} onChange={(event) => onChange({ chain: event.target.value as ChainKey })}>
						{CHAIN_KEYS.map((chainKey) => (
							<option key={chainKey} value={chainKey}>
								{CHAIN_LABEL[chainKey]}
							</option>
						))}
					</select>
				</Field>
				<Field label="Expiry" description="Use a preset or schedule a UTC cutoff – blank keeps the quest evergreen">
					<QuickExpiryPicker value={draft.expiresAtISO} onChange={(next) => onChange({ expiresAtISO: next })} />
				</Field>
			</div>

			<Field label="Tagline" description="Appears under the quest title across cards, frames, and notifications">
				<input
					className="pixel-input"
					placeholder="e.g. Holders unlock early mint allowlist"
					value={draft.headline}
					onChange={(event) => onChange({ headline: event.target.value })}
				/>
			</Field>

			<Field label="Quest narrative" description="Outline instructions, rewards, and partner call-outs — Markdown (**bold**, - lists) is supported" error={descriptionError}>
				<textarea
					className="pixel-input min-h-[120px]"
					placeholder="Tell claimers what to do, why it matters, and who is partnering with you."
					value={draft.description}
					onChange={(event) => onChange({ description: event.target.value })}
					aria-invalid={Boolean(descriptionError)}
				/>
			</Field>

			{showFollow ? (
				<Field label="Follower username" description="Enter the Farcaster handle (no @). We highlight verified profiles when detected." error={followError}>
					<input
						className="pixel-input"
						placeholder="@heycat"
						value={draft.followUsername}
						onChange={(event) => onChange({ followUsername: event.target.value.replace(/^@/, '') })}
						aria-invalid={Boolean(followError)}
						aria-required={followRequired}
					/>
				</Field>
			) : null}

			{showFrame ? (
				<Field label="Frame URL" description="Paste the https://warpcast.com/~/frame/... link to enable frame verification and analytics" error={frameUrlError}>
					<input
						className="pixel-input"
						placeholder="https://warpcast.com/~/frame/..."
						value={draft.frameUrl}
						onChange={(event) => onChange({ frameUrl: event.target.value.trim() })}
						aria-invalid={Boolean(frameUrlError)}
						aria-required={frameState === 'required'}
					/>
				</Field>
			) : null}

			{showCastLink ? (
				<Field label={castLinkLabel} description={castLinkDescription} error={castLinkError}>
					<input
						className="pixel-input"
						placeholder="https://warpcast.com/... or 0xcasthash"
						value={draft.castLink}
						onChange={(event) => onChange({ castLink: event.target.value.trim() })}
						aria-invalid={Boolean(castLinkError)}
						aria-required={castLinkRequired}
					/>
				</Field>
			) : null}

			{showCastContains ? (
				<Field label={castContainsLabel} description={castContainsDescription}>
					<input
						className="pixel-input"
						placeholder="e.g. #based or gm"
						value={draft.castContains}
						onChange={(event) => onChange({ castContains: event.target.value })}
					/>
				</Field>
			) : null}

			{showMention ? (
				<Field label={mentionLabel} description="Claimer must mention this Farcaster handle — we strip the @ automatically" error={mentionError}>
					<input
						className="pixel-input"
						placeholder="@gmeowbased"
						value={draft.mentionUsername}
						onChange={(event) => handleMentionChange(event.target.value)}
						aria-invalid={Boolean(mentionError)}
						aria-required={mentionRequired}
					/>
				</Field>
			) : null}

			{showTargetUsername || showTargetFid ? (
				<div className="grid gap-4 sm:grid-cols-2">
					{showTargetUsername ? (
						<Field label={targetUsernameLabel} description="Override the detected username if the target may change handles" error={targetUsernameError}>
							<input
								className="pixel-input"
								placeholder="@caster"
								value={draft.targetUsername}
								onChange={(event) => handleTargetUsernameChange(event.target.value)}
								aria-invalid={Boolean(targetUsernameError)}
								aria-required={targetUsernameRequired}
							/>
						</Field>
					) : null}
					{showTargetFid ? (
						<Field label={targetFidLabel} description="Lock to a specific FID if you expect the username to rotate" error={targetFidError}>
							<input
								className="pixel-input"
								placeholder="12345"
								value={draft.targetFid}
								onChange={(event) => handleTargetFidChange(event.target.value)}
								aria-invalid={Boolean(targetFidError)}
								aria-required={targetFidRequired}
							/>
						</Field>
					) : null}
				</div>
			) : null}

			<div className="grid gap-4 sm:grid-cols-2">
				<Field label="Cover image" description="Upload or paste artwork (1280×720 recommended) to preview the quest card">
					<input className="pixel-input" type="file" accept="image/*" onChange={handleMediaUpload} />
					<input
						className="pixel-input"
						placeholder="https://cdn..."
						value={draft.media && draft.media.startsWith('http') ? draft.media : ''}
						onChange={(event) => onChange({ media: event.target.value, mediaPreview: event.target.value })}
					/>
				</Field>
				<div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 p-4">
					{draft.mediaPreview ? (
						<div className="w-full max-w-[220px] overflow-hidden rounded-2xl border border-white/10 shadow-lg shadow-sky-500/20">
							<Image
								src={draft.mediaPreview}
								alt="Quest media preview"
								width={440}
								height={440}
								className="h-auto w-full object-cover"
								unoptimized
							/>
							{draft.mediaFileName ? (
								<div className="border-t border-white/10 bg-slate-950/80 px-3 py-2 text-center text-[11px] text-slate-300">
									{draft.mediaFileName}
								</div>
							) : null}
						</div>
					) : (
						<span className="text-center text-xs text-slate-400">Upload an image to preview the quest card cover.</span>
					)}
				</div>
			</div>
		</div>
	)
}

function EligibilityStep({
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
									: 'border-white/10 text-slate-300 hover:border-white/20 disabled:opacity-50'
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
				<div className="space-y-5 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
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

function RewardsStep({
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
				<div className="space-y-5 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
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

			<div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
				<label className="flex items-center gap-3 text-sm">
					<input
						type="checkbox"
						className="h-5 w-5 rounded border border-white/20 bg-slate-900"
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

function FinalizeStep({
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
		idle: 'border-white/10 bg-slate-950/60 text-slate-200',
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
			<div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
				<div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
					<span>Launch checklist</span>
					<span>{summary.expiryLabel}</span>
				</div>
				<h3 className="mt-3 text-lg font-semibold text-slate-100">{summary.title}</h3>
				<p className="text-sm text-slate-300">{summary.subtitle}</p>
				<div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
					<span className="rounded-full border border-white/10 px-3 py-1">{summary.chainLabel}</span>
					<span className="rounded-full border border-white/10 px-3 py-1">{summary.questTypeLabel}</span>
					<span className="rounded-full border border-white/10 px-3 py-1">
						{summary.questMode === 'social' ? 'Social quest' : 'Onchain quest'}
					</span>
					{summary.eligibilityBadge ? <span className="rounded-full border border-white/10 px-3 py-1">{summary.eligibilityBadge}</span> : null}
					{summary.rewardBadge ? <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-emerald-200">{summary.rewardBadge}</span> : null}
				</div>
			</div>

			<div className="grid gap-4">
				<Field label="ERC-20 escrow readiness">
					{!isTokenReward ? (
						<p className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">Token escrow not required for this quest.</p>
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
								<div className="rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2">
									<p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Funding target</p>
									<p className="mt-1 text-sm font-semibold text-slate-100">{expectedDisplay ?? '—'}</p>
									<p className="text-[11px] text-slate-400">
										{perUserDisplay ? `${perUserDisplay} each${claimerSummary ? ` · ${claimerSummary}` : ''}` : claimerSummary ?? 'Per claimer pending'}
									</p>
								</div>
								<div className="rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2">
									<p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Recorded deposit</p>
									<p className="mt-1 text-sm font-semibold text-slate-100">{recordedDisplay ?? '—'}</p>
									<p className="text-[11px] text-slate-400">
										{recordedDisplay ? 'Matches latest queue snapshot' : 'Awaiting deposit snapshot'}
									</p>
								</div>
								<div className="rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2">
									<p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Detection</p>
									<p className="mt-1 text-sm font-semibold text-slate-100">{detectedAtLabel ?? '—'}</p>
									<p className="text-[11px] text-slate-400">{detectionSummary}</p>
								</div>
								<div className="rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2">
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
					<p className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">{summary.description}</p>
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
								className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] text-slate-100 transition hover:border-white/20 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
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
						<div className="relative h-36 w-36 overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
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

type NftSelectorProps = {
	nfts: NftOption[]
	selectedId?: string | null
	onSelect(option: NftOption): void
	loading?: boolean
	error?: string | null
	onSearch?(value: string): void
	query?: string
	errorMessage?: string | null
	isAssetSelectable?: (option: NftOption) => { allowed: boolean; reason?: string }
} & FieldControlA11yProps

// @edit-start 2025-11-12 — Wire field identifiers into NFT selector trigger
function NftSelector({
	nfts,
	selectedId,
	onSelect,
	loading = false,
	error,
	onSearch,
	query = '',
	errorMessage,
	isAssetSelectable,
	id,
	'aria-describedby': ariaDescribedby,
	'aria-labelledby': ariaLabelledby,
}: NftSelectorProps) {
	const [open, setOpen] = useState(false)
	const [searchValue, setSearchValue] = useState(query)
	const containerRef = useRef<HTMLDivElement | null>(null)
	const errorId = useId()
	const listboxId = useId()
	const selectedNft = useMemo(() => {
		if (!selectedId) return null
		return nfts.find((nft) => nft.id.toLowerCase() === selectedId.toLowerCase()) ?? null
	}, [nfts, selectedId])
	const triggerDescribedBy = [ariaDescribedby, errorMessage ? errorId : null].filter(Boolean).join(' ') || undefined

	useEffect(() => {
		if (!open) {
			setSearchValue(query)
		}
	}, [query, open])

	useEffect(() => {
		if (!open) return
		const handleClick = (event: MouseEvent) => {
			if (!containerRef.current) return
			if (!containerRef.current.contains(event.target as Node)) {
				setOpen(false)
			}
		}
		document.addEventListener('mousedown', handleClick)
		return () => {
			document.removeEventListener('mousedown', handleClick)
		}
	}, [open])

	const filteredCollections = useMemo(() => {
		const term = searchValue.trim().toLowerCase()
		if (!term) return nfts
		return nfts.filter((nft) => {
			const haystack = [nft.name, nft.collection, nft.id]
			return haystack.some((value) => typeof value === 'string' && value.toLowerCase().includes(term))
		})
	}, [nfts, searchValue])

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (onSearch) {
			const nextTerm = searchValue.trim()
			onSearch(nextTerm)
		}
	}

	const handleSelect = (nft: NftOption) => {
		onSelect(nft)
		setOpen(false)
	}

	return (
		<div ref={containerRef} className="relative">
			<button
				type="button"
				onClick={() => setOpen((prev) => !prev)}
				className="pixel-input flex min-h-[64px] w-full items-center justify-between gap-3 text-left"
				id={id}
				aria-labelledby={ariaLabelledby}
				aria-describedby={triggerDescribedBy}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={open ? listboxId : undefined}
			>
				<span className="flex min-w-0 items-center gap-3">
					{selectedNft ? (
						<>
							<Image
								src={selectedNft.image}
								alt={`${selectedNft.name} cover`}
								width={40}
								height={40}
								className="h-10 w-10 flex-none rounded-xl border border-white/10 bg-slate-900 object-cover"
								unoptimized
							/>
							<span className="flex min-w-0 flex-col">
								<span className="truncate text-sm font-semibold text-slate-100">{selectedNft.name}</span>
								<span className="mt-1 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
									<span>{selectedNft.collection} · {CHAIN_LABEL[selectedNft.chain]}</span>
									<span
										className={`rounded-full px-2 py-[2px] text-[9px] tracking-[0.18em] ${
											selectedNft.verified ? 'bg-emerald-400/20 text-emerald-200' : 'bg-amber-400/20 text-amber-100'
										}`}
									>
										{selectedNft.verified ? 'Verified' : 'Manual review'}
									</span>
								</span>
							</span>
						</>
					) : (
						<span className="text-sm text-slate-400">Select an NFT collection</span>
					)}
				</span>
				<span className={`text-xs text-slate-400 transition ${open ? 'rotate-180' : ''}`}>⌄</span>
			</button>
			{open ? (
				<div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90 shadow-[0_24px_60px_rgba(17,24,39,0.55)] backdrop-blur-xl">
					<form onSubmit={handleSubmit} className="border-b border-white/10 bg-slate-950/70 p-3">
						<div className="flex gap-2">
							<input
								type="search"
								value={searchValue}
								onChange={(event) => setSearchValue(event.target.value)}
								placeholder="Collection, name, or 0x…"
								className="pixel-input flex-1 bg-slate-900/60 text-sm"
							/>
							{onSearch ? (
								<button
									type="submit"
									className="rounded-xl bg-indigo-400/80 px-3 py-1.5 text-[12px] font-semibold text-slate-950 transition hover:brightness-110"
								>
									Search
								</button>
							) : null}
						</div>
						<p className="mt-2 text-[10px] text-slate-400">Press Enter to refresh.</p>
					</form>
						<div className="max-h-72 overflow-y-auto ock-scrollbar">
						{loading ? (
							<SelectorState variant="loading" message="Searching Gmeow NFT catalog…" />
						) : error ? (
							<SelectorState variant="error" message={error} />
						) : filteredCollections.length === 0 ? (
							<SelectorState variant="empty" message="No collections matched this query." />
						) : (
								<ul className="divide-y divide-white/5" role="listbox" id={listboxId} aria-labelledby={ariaLabelledby}>
								{filteredCollections.map((nft) => {
									const active = selectedId?.toLowerCase() === nft.id.toLowerCase()
									// @edit-start 2025-11-11 — Guard NFT selection according to quest policy
									const guard = isAssetSelectable ? isAssetSelectable(nft) : { allowed: true as const }
									const selectable = guard?.allowed !== false
									const disabledReason = guard?.reason
									// @edit-end
									return (
										<li key={`${nft.chain}:${nft.id}`} className={selectable ? '' : 'opacity-60'}>
											<button
												type="button"
												onClick={() => {
													if (!selectable) return
													handleSelect(nft)
												}}
												disabled={!selectable}
												aria-disabled={!selectable}
												title={disabledReason}
													className={`flex w-full items-center gap-3 px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
														active ? 'bg-sky-500/15 text-sky-100' : selectable ? 'hover:bg-white/5' : 'cursor-not-allowed'
													}`}
													role="option"
													aria-selected={active}
											>
												<Image
													src={nft.image}
													alt={`${nft.name} cover`}
													width={44}
													height={44}
													className="h-11 w-11 rounded-xl border border-white/10 bg-slate-900 object-cover"
													unoptimized
												/>
												<div className="flex flex-col text-sm text-slate-100">
													<span className="font-semibold">{nft.name}</span>
													<span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{CHAIN_LABEL[nft.chain]}</span>
													{disabledReason ? <span className="text-[10px] text-amber-200">{disabledReason}</span> : null}
												</div>
												<span className="ml-auto flex flex-col items-end gap-1 text-xs text-slate-300">
													<span>{nft.floorPriceEth != null ? `${formatEth(nft.floorPriceEth)} floor` : 'No floor data'}</span>
													{nft.balance != null ? <span className="text-[10px] text-slate-500">Indexed supply {nft.balance}</span> : null}
													<span
														className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${nft.verified ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-100'}`}
													>
														{nft.verified ? 'Verified' : 'Manual review'}
													</span>
												</span>
											</button>
										</li>
									)
								})}
							</ul>
						)}
					</div>
				</div>
			) : null}
				{selectedNft && !selectedNft.verified ? (
					<p className="mt-2 flex items-center gap-2 text-[11px] text-amber-200">
						<span aria-hidden>⚠️</span>
						<span>This collection is not yet verified in the Gmeow catalog. Confirm the contract address before launching.</span>
					</p>
				) : null}
			{errorMessage ? (
				<p className="mt-2 text-[11px] text-rose-200" id={errorId} role="alert">
					{errorMessage}
				</p>
			) : null}
		</div>
	)
	// @edit-end
}

function CatalogStatusBanner({
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

function PreviewCard({ summary, stepIndex, tokenEscrowStatus, rewardMode }: { summary: QuestSummary; stepIndex: number; tokenEscrowStatus: TokenEscrowStatus | null; rewardMode: QuestDraft['rewardMode'] }) {
	const prefersReducedMotion = useReducedMotion()
	const escrowBadge = (() => {
		if (rewardMode !== 'token') return null
		const state = tokenEscrowStatus?.state ?? 'missing'
		const config: Record<TokenEscrowPhase, { label: string; icon: string; className: string }> = {
			ready: {
				label: 'Escrow ready',
				icon: '✅',
				className: 'border border-emerald-400/40 bg-emerald-400/10 text-emerald-100',
			},
			warming: {
				label: 'Warm-up hold',
				icon: '⏳',
				className: 'border border-amber-400/40 bg-amber-500/10 text-amber-100',
			},
			'awaiting-detection': {
				label: 'Awaiting detection',
				icon: '🔁',
				className: 'border border-sky-400/40 bg-sky-500/10 text-sky-100',
			},
			insufficient: {
				label: 'Top up escrow',
				icon: '⚠️',
				className: 'border border-rose-500/40 bg-rose-500/15 text-rose-100',
			},
			missing: {
				label: 'Escrow incomplete',
				icon: '⚠️',
				className: 'border border-rose-500/40 bg-rose-500/15 text-rose-100',
			},
		}
		const badge = config[state]
		return (
			<span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${badge.className}`}>
				<span aria-hidden>{badge.icon}</span>
				<span>{badge.label}</span>
			</span>
		)
	})()
	return (
		<motion.div
			className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-[1px]"
			/* @edit-start 2025-11-12 — Disable hover wobble when reduced motion is requested */
			whileHover={prefersReducedMotion ? undefined : { rotateX: -2, rotateY: 3 }}
			transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 20 }}
			/* @edit-end */
		>
			<div className="relative h-full rounded-[calc(1.5rem-1px)] bg-slate-950/95 p-6 backdrop-blur">
				<div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_transparent_60%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
				<div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
					<span>Live preview</span>
					<div className="flex items-center gap-2">
						{escrowBadge}
						<span>Step {stepIndex + 1} / {STEPS.length}</span>
					</div>
				</div>

				<div className="mt-6 space-y-5">
					<div className="relative h-40 w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
						{summary.mediaPreview ? (
							<Image src={summary.mediaPreview} alt="Quest cover" fill className="object-cover" sizes="320px" unoptimized />
						) : (
							<div className="flex h-full w-full items-center justify-center text-xs text-slate-500">Upload art in Step 1</div>
						)}
					</div>

					<div>
						<h3 className="text-2xl font-semibold text-slate-100">{summary.title}</h3>
						<p className="text-sm text-slate-300">{summary.subtitle}</p>
					</div>

					<div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
						<span className="rounded-full border border-white/10 px-3 py-1">{summary.chainLabel}</span>
						<span className="rounded-full border border-white/10 px-3 py-1">{summary.questTypeLabel}</span>
						<span className="rounded-full border border-white/10 px-3 py-1">
							{summary.questMode === 'social' ? 'Social quest' : 'Onchain quest'}
						</span>
						{summary.eligibilityBadge ? <span className="rounded-full border border-white/10 px-3 py-1">{summary.eligibilityBadge}</span> : null}
						{summary.rewardBadge ? <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-emerald-200">{summary.rewardBadge}</span> : null}
					</div>

					<p className="text-sm text-slate-300">{summary.description}</p>
					{summary.partnerCopy ? (
						<p className="rounded-2xl border border-sky-400/30 bg-sky-400/10 p-3 text-xs text-sky-200">{summary.partnerCopy}</p>
					) : null}

					<ul className="grid gap-1 text-xs text-slate-400">
						{summary.metaRows.slice(0, 3).map((row, index) => (
							<li key={`summary-meta-${index}`}>• {row}</li>
						))}
					</ul>
					<p className="mt-3 text-[11px] uppercase tracking-[0.3em] text-slate-500">Expiry · {summary.expiryLabel}</p>
				</div>
			</div>
		</motion.div>
	)
}

function DebugPanel({
	draft,
	tokens,
	nfts,
	assetsLoading,
	assetsError,
	assetWarnings,
}: {
	draft: QuestDraft
	tokens: TokenOption[]
	nfts: NftOption[]
	assetsLoading: boolean
	assetsError: string | null
	assetWarnings: string[]
}) {
	return (
		<div className="space-y-3">
			<details className="group rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
				<summary className="cursor-pointer text-sm font-semibold text-slate-200">Debug · QuestDraft JSON</summary>
				<pre className="mt-3 max-h-80 overflow-auto rounded-xl bg-slate-950/80 p-3 text-[11px] text-emerald-200">
					{JSON.stringify(draft, null, 2)}
				</pre>
			</details>
			<details className="group rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
				<summary className="cursor-pointer text-sm font-semibold text-slate-200">Debug · Catalog snapshot</summary>
				<div className="mt-3 space-y-3">
					<div className="rounded-xl border border-white/10 bg-slate-950/70 p-3 text-[11px] text-slate-200">
						<strong className="block text-[10px] uppercase tracking-[0.3em] text-slate-400">Status</strong>
						<div className="mt-1 space-y-1">
							<div>Loading: {assetsLoading ? 'yes' : 'no'}</div>
							{assetsError ? <div className="text-rose-200">Error: {assetsError}</div> : null}
							{assetWarnings.length > 0 ? (
								<ul className="space-y-0.5 text-amber-200">
									{assetWarnings.map((warning) => (
										<li key={warning}>• {warning}</li>
									))}
								</ul>
							) : null}
						</div>
					</div>
					<div className="grid gap-3 md:grid-cols-2">
						<pre className="max-h-64 overflow-auto rounded-xl border border-white/10 bg-slate-950/80 p-3 text-[11px] text-sky-200">
							<strong className="block text-[10px] uppercase tracking-[0.3em] text-slate-400">Tokens</strong>
							{JSON.stringify(tokens, null, 2)}
						</pre>
						<pre className="max-h-64 overflow-auto rounded-xl border border-white/10 bg-slate-950/80 p-3 text-[11px] text-purple-200">
							<strong className="block text-[10px] uppercase tracking-[0.3em] text-slate-400">NFTs</strong>
							{JSON.stringify(nfts, null, 2)}
						</pre>
					</div>
				</div>
			</details>
		</div>
	)
}
