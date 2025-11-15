'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { ConnectWallet } from '@/components/ConnectWallet'
import { useAccount } from 'wagmi'
import { useMiniKit } from '@coinbase/onchainkit/minikit'
import type { MiniKitContextType } from '@/components/quest-wizard/types'
import { sanitizeUsernameInput, shortenAddress, STEPS } from '@/components/quest-wizard/shared'
import { MiniStat, StatusPill, type StatusTone } from '@/components/quest-wizard/components/primitives'
import type { MiniAppSignInResult } from '@/components/quest-wizard/types'
import type { FarcasterUser } from '@/lib/neynar'
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
	isWalletConnected: boolean
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
	isWalletConnected,
}: WizardHeaderProps) {
	// Fix hydration mismatch - wallet state is client-only
	const [mounted, setMounted] = useState(false)
	const { context: miniKitContext } = useMiniKit()
	const { isConnected: hookIsConnected } = useAccount()
	
	useEffect(() => {
		setMounted(true)
	}, [])
	
	// Determine if we should show wallet button
	const miniAppLocation = typeof (miniKitContext as any)?.location === 'string' ? (miniKitContext as any).location : null
	const miniAppClient = typeof (miniKitContext as any)?.client?.name === 'string' ? (miniKitContext as any).client.name : null
	const isMiniAppSession = Boolean(miniKitContext?.user || miniAppLocation || miniAppClient)
	const showWalletConnect = mounted && !isMiniAppSession && !hookIsConnected

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
	
	// Prevent hydration mismatch - only show wallet status after mount
	const walletTone: StatusTone = (mounted && isWalletConnected) ? 'ready' : 'neutral'
	const walletPillLabel = mounted ? (isWalletConnected ? 'Wallet linked' : 'Wallet not linked') : 'Checking...'
	const walletStatusDetail = mounted 
		? (isWalletConnected 
			? 'Wallet connected for quest creation'
			: 'Connect wallet to preview on-chain features')
		: 'Checking wallet connection...'
	const walletAddressValue = mounted ? (shortWalletAddress ? (
		<span className="font-mono text-xs text-slate-100">{shortWalletAddress}</span>
	) : (
		<span className="text-xs text-slate-400">Not connected</span>
	)) : (
		<span className="text-xs text-slate-400">Checking...</span>
	)
	const autoConnectDetail = (
		<div className="flex flex-col gap-1">
			<span>{walletStatusDetail}</span>
		</div>
	)

	return (
		<header className={`sticky top-14 sm:top-16 lg:top-0 z-50 transition ${collapsed ? 'mb-2' : 'mb-4'}`}>
			<div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-3">
						{avatarUrl ? (
							<div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
								<Image src={avatarUrl} alt={username || 'Farcaster avatar'} fill sizes="48px" className="object-cover" unoptimized />
							</div>
						) : null}
						{(displayName || username) && (
							<div>
								<h1 className="text-xl font-semibold text-slate-100">{displayName || username}</h1>
								<p className="text-[11px] text-slate-400">@{sanitizeUsernameInput(username)}</p>
							</div>
						)}
					</div>
					<div className="flex items-center gap-2">
						<StatusPill tone={identityTone}>{identityReady ? 'Identity linked' : 'Identity pending'}</StatusPill>
						<StatusPill tone={walletTone}>{walletPillLabel}</StatusPill>
						{showWalletConnect && (
							<div className="hidden sm:block">
								<ConnectWallet />
							</div>
						)}
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
