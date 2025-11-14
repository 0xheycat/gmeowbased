'use client'

import Image from 'next/image'
import type { MiniKitContextType } from '@/components/quest-wizard/types'
import { sanitizeUsernameInput, shortenAddress, STEPS } from '@/components/quest-wizard/shared'
import { MiniStat, StatusPill, type StatusTone } from '@/components/quest-wizard/components/primitives'
import type { MiniAppSignInResult } from '@/components/quest-wizard/types'
import type { FarcasterUser } from '@/lib/neynar'
import type { WalletAutoState } from '@/components/quest-wizard/types'

export type WizardHeaderProps = {
	context: MiniKitContextType
	profile: FarcasterUser | null
	loadingProfile: boolean
	signInResult: MiniAppSignInResult | null
	resolvedFid: number | null
	step: number
	collapsed: boolean
	onToggleCollapsed(): void
	walletAddress?: string | null
	walletState: WalletAutoState
}

export function WizardHeader({
	context,
	profile,
	loadingProfile,
	signInResult,
	resolvedFid,
	step,
	collapsed,
	onToggleCollapsed,
	walletAddress,
	walletState,
}: WizardHeaderProps) {
	// @edit-start 2025-11-12 — Extract wizard header presentation
	const username = profile?.username || (typeof context?.user?.username === 'string' ? context.user.username : '')
	const displayName = profile?.displayName || (typeof context?.user?.displayName === 'string' ? context.user.displayName : '')
	const profileAvatarUrl = (profile as any)?.pfp?.url
	const contextUserAvatarUrl = (() => {
		const contextUserValue = (context?.user ?? null) as any
		return typeof contextUserValue?.pfp?.url === 'string' ? contextUserValue.pfp.url : ''
	})()
	const avatarUrl = profileAvatarUrl || contextUserAvatarUrl
	const fidLabel = resolvedFid ? `FID #${resolvedFid}` : 'No FID linked'
	const identityReady = Boolean(signInResult || resolvedFid)
	const identityTone: StatusTone = identityReady ? 'ready' : 'warn'
	const stepLabel = `Step ${step + 1} of ${STEPS.length}`
	const shortWalletAddress = walletAddress ? shortenAddress(walletAddress) : null
	const walletConnectorName = walletState.connectorName || null
	const walletTone: StatusTone = (() => {
		switch (walletState.status) {
			case 'connected':
				return 'ready'
			case 'failed':
			case 'missing':
				return 'warn'
			default:
				return 'neutral'
		}
	})()
	const walletPillLabel = (() => {
		switch (walletState.status) {
			case 'connected':
				return 'Wallet linked'
			case 'attempting':
				return 'Auto-connecting…'
			case 'requested':
				return 'Awaiting approval'
			case 'failed':
				return 'Connect failed'
			case 'missing':
				return 'No connector'
			default:
				return 'Wallet idle'
		}
	})()
	const walletStatusDetail = (() => {
		switch (walletState.status) {
			case 'connected':
				return walletConnectorName ? `Linked via ${walletConnectorName}` : 'Wallet linked for quest previews'
			case 'attempting':
				return walletConnectorName ? `Auto-connecting with ${walletConnectorName}` : 'Attempting desktop wallet auto-connect'
			case 'requested':
				return walletConnectorName ? `Waiting for ${walletConnectorName} approval` : 'Awaiting wallet approval'
			case 'failed':
				return walletConnectorName ? `${walletConnectorName} rejected or timed out` : 'Auto-connect attempt failed'
			case 'missing':
				return 'No compatible desktop wallet connector detected'
			default:
				return 'Wallet not linked yet'
		}
	})()
	const walletAddressValue = shortWalletAddress ? (
		<span className="font-mono text-xs text-slate-100">{shortWalletAddress}</span>
	) : (
		<span className="text-xs text-slate-400">Not connected</span>
	)
	const autoConnectDetail = (
		<div className="flex flex-col gap-1">
			<span>{walletStatusDetail}</span>
			{walletState.status === 'failed' && walletState.lastError ? (
				<span className="text-[10px] text-rose-200">{walletState.lastError}</span>
			) : null}
		</div>
	)

	return (
		<header className={`sticky top-0 z-40 transition ${collapsed ? 'mb-2' : 'mb-4'}`}>
			<div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-3">
						{avatarUrl ? (
							<div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
								<Image src={avatarUrl} alt={username || 'Farcaster avatar'} fill sizes="48px" className="object-cover" unoptimized />
							</div>
						) : (
							<div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-950 text-lg text-slate-500">
								🐾
							</div>
						)}
						<div>
							<p className="text-xs uppercase tracking-[0.3em] text-slate-400">Quest wizard</p>
							<h1 className="text-xl font-semibold text-slate-100">{displayName || username ? `${displayName || username}` : 'Farcaster session not linked'}</h1>
							<p className="text-[11px] text-slate-400">{username ? `@${sanitizeUsernameInput(username)}` : 'Authenticate via MiniKit to personalize quests.'}</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<StatusPill tone={identityTone}>{identityReady ? 'Identity linked' : 'Identity pending'}</StatusPill>
						<StatusPill tone={walletTone}>{walletPillLabel}</StatusPill>
						<span className="rounded-full bg-slate-900/60 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">{stepLabel}</span>
						<button
							type="button"
							onClick={onToggleCollapsed}
							className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300 transition hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
						>
							{collapsed ? 'Expand header' : 'Collapse header'}
						</button>
					</div>
				</div>
				{!collapsed ? (
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						<MiniStat label="FID" value={fidLabel} />
						<MiniStat label="Profile status" value={loadingProfile ? 'Loading Neynar profile…' : identityReady ? 'Ready to mint quests' : 'Awaiting MiniKit sign-in'} />
						<MiniStat label="Wallet" value={walletAddressValue} />
						<MiniStat label="Auto-connect" value={autoConnectDetail} />
					</div>
				) : null}
			</div>
		</header>
	)
	// @edit-end
}
