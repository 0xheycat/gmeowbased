import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { fetchUserByFid, type FarcasterUser } from '@/lib/neynar'

// Type definitions moved from removed quest-wizard
type MiniKitContextUser = { fid: number; username: string; pfpUrl?: string }
type AuthStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'pending' | 'success'
type MiniAppSignInResult = { isSuccess: boolean; message?: string }

function normalizeFid(fid: any): number | null {
  const parsed = typeof fid === 'string' ? parseInt(fid, 10) : fid
  return typeof parsed === 'number' && !isNaN(parsed) && parsed > 0 ? parsed : null
}

function safeParseSignInMessage(message: any): any {
  try { return typeof message === 'string' ? JSON.parse(message) : message } catch { return null }
}

function extractFidFromSignIn(result: any): number | null {
  return normalizeFid(result?.fid)
}

function formatUnknownError(error: any, fallbackMessage?: string): string {
  return error?.message || fallbackMessage || String(error)
}

/**
 * @deprecated Use `useAuth` from `lib/hooks/use-auth` instead
 * 
 * This hook will be removed in Phase 2.
 * 
 * Migration guide:
 * ```tsx
 * // OLD (useMiniKitAuth - deprecated)
 * import { useMiniKitAuth } from '@/hooks/useMiniKitAuth'
 * const auth = useMiniKitAuth({ context, isFrameReady, ... })
 * 
 * // NEW (useAuth - unified)
 * import { useAuth } from '@/lib/hooks/use-auth'
 * const { fid, profile, isAuthenticated, authMethod } = useAuth()
 * ```
 * 
 * Benefits of unified auth:
 * - ✅ Works everywhere (not just Quest Wizard)
 * - ✅ Automatic miniapp detection (no props needed)
 * - ✅ Combines wallet + miniapp auth
 * - ✅ No prop drilling
 * - ✅ Single source of truth
 * 
 * @see lib/hooks/use-auth.ts for new API
 * @see lib/contexts/AuthContext.tsx for implementation
 */

type NotificationInput = {
	tone: 'info' | 'success' | 'warning' | 'error'
	title: string
	description?: string
	duration?: number
}

type UseMiniKitAuthOptions = {
	context: any
	isFrameReady: boolean
	isMiniAppSession: boolean
	signInWithMiniKit: () => Promise<any>
	pushNotification: (input: NotificationInput) => number
	dismissNotification: (id: number) => void
}

export function useMiniKitAuth({
	context,
	isFrameReady,
	isMiniAppSession,
	signInWithMiniKit,
	pushNotification,
	dismissNotification,
}: UseMiniKitAuthOptions) {
	const [authStatus, setAuthStatus] = useState<AuthStatus>('idle')
	const [authError, setAuthError] = useState<string | null>(null)
	const [profile, setProfile] = useState<FarcasterUser | null>(null)
	const [profileLoading, setProfileLoading] = useState(false)
	const [signInResult, setSignInResult] = useState<MiniAppSignInResult | null>(null)

	const triedMiniAuthRef = useRef(false)
	const pendingAuthToastRef = useRef<number | null>(null)

	const contextUser = (context?.user ?? null) as MiniKitContextUser | null

	// Parse sign-in message
	const parsedSignIn = useMemo(() => (signInResult ? safeParseSignInMessage(signInResult.message) : null), [signInResult])

	// Extract FID from sign-in
	const signInFid = useMemo(() => extractFidFromSignIn(parsedSignIn), [parsedSignIn])

	// Resolve FID from context or sign-in
	const resolvedFid = useMemo(() => {
		const contextFid = normalizeFid(contextUser?.fid)
		return signInFid ?? contextFid ?? null
	}, [signInFid, contextUser?.fid])

	// Update auth status when sign-in succeeds
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

	// Load Neynar profile when FID is resolved
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

	// Handle MiniKit authentication
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
			} as any)
			return false
		}
	}, [dismissNotification, pushNotification, signInWithMiniKit])

	// Auto-authenticate when frame is ready
	useEffect(() => {
		if (!isFrameReady) return
		if (!isMiniAppSession) return
		if (signInResult) return
		if (authStatus === 'pending') return
		if (triedMiniAuthRef.current) return
		triedMiniAuthRef.current = true
		void handleAuthenticate()
	}, [isFrameReady, isMiniAppSession, signInResult, authStatus, handleAuthenticate])

	// Reset tried flag when not in mini-app
	useEffect(() => {
		if (!isMiniAppSession) {
			triedMiniAuthRef.current = false
		}
	}, [isMiniAppSession])

	return {
		authStatus,
		authError,
		profile,
		profileLoading,
		signInResult,
		resolvedFid,
		contextUser,
		authenticate: handleAuthenticate,
	}
}
