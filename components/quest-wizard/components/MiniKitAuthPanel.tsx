import type { ReactNode } from 'react'

import { MiniStat, StatusPill, type StatusTone } from '@/components/quest-wizard/components/primitives'
import { formatFidLabel, shortenAddress } from '@/components/quest-wizard/shared'
import {
	type AuthStatus,
	type MiniAppAuthMethod,
	type MiniAppSignInResult,
	type MiniKitContextType,
	type MiniKitContextUser,
	type ParsedMiniKitSignIn,
} from '@/components/quest-wizard/types'
import type { FarcasterUser } from '@/lib/neynar'

function formatAuthMethod(method: MiniAppAuthMethod | undefined): string {
	if (!method) return 'Unknown'
	return method === 'custody' ? 'Custody address' : 'Auth address'
}

function formatIsoTimestamp(value: string | undefined): string | null {
	if (!value) return null
	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) return null
	return parsed.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export type MiniKitAuthPanelProps = {
	context: MiniKitContextType
	isFrameReady: boolean
	authStatus: AuthStatus
	authError: string | null
	hasApiKey: boolean
	onAuthenticate: () => void
	signInResult: MiniAppSignInResult | null
	parsedSignIn: ParsedMiniKitSignIn | null
	profile: FarcasterUser | null
	profileLoading: boolean
	resolvedFid: number | null
}

export function MiniKitAuthPanel({
	context,
	isFrameReady,
	authStatus,
	authError,
	hasApiKey,
	onAuthenticate,
	signInResult,
	parsedSignIn,
	profile,
	profileLoading,
	resolvedFid,
}: MiniKitAuthPanelProps) {
	const contextUser = (context?.user ?? null) as MiniKitContextUser | null
	const contextFidLabel = formatFidLabel(contextUser?.fid)
	const resolvedFidLabel = formatFidLabel(resolvedFid)
	const domainLabel = parsedSignIn?.domain ?? null
	const issuedAtLabel = formatIsoTimestamp(parsedSignIn?.issuedAt)
	const authMethodLabel = signInResult ? formatAuthMethod(signInResult.authMethod) : null
	const signInAddress = typeof parsedSignIn?.address === 'string' ? parsedSignIn.address : undefined
	const usernameCandidate =
		profile?.username ??
		(typeof contextUser?.username === 'string' ? contextUser.username : undefined)
	const formattedUsername = usernameCandidate
		? usernameCandidate.startsWith('@')
			? usernameCandidate
			: `@${usernameCandidate}`
		: 'Not detected'
	const displayName =
		profile?.displayName ??
		(typeof contextUser?.displayName === 'string' ? contextUser.displayName : undefined)

	const primaryAddress =
		(typeof profile?.walletAddress === 'string' && profile.walletAddress) ||
		(typeof profile?.custodyAddress === 'string' && profile.custodyAddress) ||
		signInAddress ||
		(Array.isArray(profile?.verifications)
			? profile.verifications.find((entry) => typeof entry === 'string' && entry.startsWith('0x'))
			: undefined)
	const formattedAddress = primaryAddress ? shortenAddress(primaryAddress) : null
	const neynarScore = typeof profile?.neynarScore === 'number' ? profile.neynarScore : null
	const nonceLabel = parsedSignIn?.nonce ?? null
	const chainIdLabel = parsedSignIn?.chainID ?? null

	const hasAuthenticatedUser = Boolean(signInResult)
	const statusPills = [
		{ tone: (isFrameReady ? 'ready' : 'warn') as StatusTone, label: isFrameReady ? 'Frame ready' : 'Frame not ready' },
		{ tone: (contextFidLabel ? 'ready' : 'warn') as StatusTone, label: contextFidLabel ? `Mini app fid ${contextFidLabel}` : 'Standalone preview' },
		{ tone: (hasAuthenticatedUser ? 'ready' : 'warn') as StatusTone, label: hasAuthenticatedUser ? 'Signed in' : 'Not signed' },
		{ tone: (hasApiKey ? 'ready' : 'warn') as StatusTone, label: hasApiKey ? 'API key loaded' : 'API key missing' },
	]

	const contextDetails: string[] = []
	const clientName = typeof (context as any)?.client?.name === 'string' ? (context as any).client.name : null
	if (clientName) contextDetails.push(`Client: ${clientName}`)
	const location = typeof (context as any)?.location === 'string' ? (context as any).location : null
	if (location) contextDetails.push(`Launch: ${location}`)
	if (domainLabel) contextDetails.push(`Domain: ${domainLabel}`)
	if (nonceLabel) contextDetails.push(`Nonce: ${nonceLabel}`)

	const identityStats: Array<{ label: string; value: ReactNode }> = [
		{ label: 'Farcaster FID', value: resolvedFidLabel ?? 'Not resolved' },
		{ label: 'Username', value: formattedUsername },
	]

	if (displayName) {
		identityStats.push({ label: 'Display name', value: displayName })
	}
	if (domainLabel) {
		identityStats.push({ label: 'Signing domain', value: domainLabel })
	}
	if (authMethodLabel) {
		identityStats.push({ label: 'Auth method', value: authMethodLabel })
	}
	if (issuedAtLabel) {
		identityStats.push({ label: 'Signed at', value: issuedAtLabel })
	}
	if (chainIdLabel) {
		identityStats.push({ label: 'Chain ID', value: chainIdLabel })
	}
	if (formattedAddress) {
		identityStats.push({
			label: 'Primary address',
			value: <span className="font-mono text-xs">{formattedAddress}</span>,
		})
	}
	if (neynarScore != null) {
		identityStats.push({ label: 'Neynar score', value: neynarScore.toFixed(2) })
	}

	const buttonLabel =
		authStatus === 'pending' ? 'Authenticating…' : hasAuthenticatedUser ? 'Re-authenticate' : 'Sign in with Farcaster'

	return (
		<section className="rounded-3xl border border-sky-400/30 bg-sky-500/10 p-6 shadow-[0_12px_36px_rgba(8,145,178,0.18)] backdrop-blur-xl">
			<div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
				<div className="flex flex-col gap-3">
					<span className="text-[11px] uppercase tracking-[0.28em] text-sky-300">MiniKit Authentication Preview</span>
					<p className="max-w-xl text-sm text-slate-300">
						Test Gmeow&apos;s MiniKit hooks in isolation before rolling them out across the app. Works both inside Warpcast and in standalone mode.
					</p>
					<div className="flex flex-wrap gap-2">
						{statusPills.map(({ tone, label }) => (
							<StatusPill key={label} tone={tone}>
								{label}
							</StatusPill>
						))}
					</div>
					{contextDetails.length ? <p className="text-xs text-slate-400">{contextDetails.join(' · ')}</p> : null}
				</div>
				<div className="flex w-full max-w-[240px] flex-col gap-2">
					<button
						type="button"
						onClick={onAuthenticate}
						disabled={authStatus === 'pending'}
						className="inline-flex items-center justify-center rounded-2xl border border-sky-400/50 bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-50 transition hover:border-sky-300/60 hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{buttonLabel}
					</button>
					{authError ? (
						<div className="rounded-2xl border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-[12px] text-rose-100">{authError}</div>
					) : null}
					{!hasApiKey ? (
						<p className="text-[11px] text-amber-300">
							Set <code className="rounded bg-slate-900 px-1 py-0.5">GMEOW</code> to enable sponsored transactions and token data.
						</p>
					) : null}
				</div>
			</div>
			<div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/40 p-4">
				{profileLoading ? (
					<p className="text-sm text-slate-300">Loading Neynar profile…</p>
				) : identityStats.length ? (
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{identityStats.map(({ label, value }) => (
							<MiniStat key={label} label={label} value={value} />
						))}
					</div>
				) : (
					<p className="text-sm text-slate-300">Authenticate to inspect MiniKit payloads and resolved identity details.</p>
				)}
			</div>
		</section>
	)
}
