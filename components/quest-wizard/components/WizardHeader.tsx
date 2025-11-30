'use client'

import Image from 'next/image'
import type { MiniKitContextType } from '@/components/quest-wizard/types'
import { sanitizeUsernameInput } from '@/components/quest-wizard/shared'
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
	// @edit-start 2025-11-12 — Extract wizard header presentation
	const username = profile?.username || (typeof context?.user?.username === 'string' ? context.user.username : '')
	const displayName = profile?.displayName || (typeof context?.user?.displayName === 'string' ? context.user.displayName : '')
	const profileAvatarUrl = (profile as any)?.pfp?.url
	const contextUserAvatarUrl = (() => {
		const contextUserValue = (context?.user ?? null) as any
		return typeof contextUserValue?.pfp?.url === 'string' ? contextUserValue.pfp.url : ''
	})()
	const avatarUrl = profileAvatarUrl || contextUserAvatarUrl

	return (
		<header className={`sticky top-14 sm:top-16 lg:top-0 z-40 transition ${collapsed ? 'mb-2' : 'mb-4'}`}>
			<div className="flex flex-col gap-4 rounded-3xl border border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-white/5 p-5 backdrop-blur-xl">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-3">
						{avatarUrl ? (
							<div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white dark:border-slate-700/10 bg-slate-950">
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
						<button
							type="button"
							onClick={onToggleCollapsed}
							className="rounded-full border border-slate-200 dark:border-slate-700/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-300 dark:hover:border-slate-700/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
						>
							{collapsed ? 'Expand header' : 'Collapse header'}
						</button>
					</div>
				</div>
			</div>
		</header>
	)
	// @edit-end
}
