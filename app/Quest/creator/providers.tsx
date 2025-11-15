'use client'

import type { ReactNode } from 'react'
import { OnchainKitProvider } from '@coinbase/onchainkit'
import { base } from 'viem/chains'

const FALLBACK_BASE_URL =
	process.env.NEXT_PUBLIC_ONCHAINKIT_BASE_URL ||
	process.env.NEXT_PUBLIC_FRAME_ORIGIN ||
	process.env.MAIN_URL ||
	'https://gmeowhq.art'

const NORMALIZED_BASE_URL = FALLBACK_BASE_URL.replace(/\/$/, '')
const DEFAULT_LOGO_URL = `${NORMALIZED_BASE_URL}/logo.png`

const APP_NAME = process.env.NEXT_PUBLIC_ONCHAINKIT_APP_NAME || 'Gmeow Quest Creator'
const LOGO_URL = process.env.NEXT_PUBLIC_ONCHAINKIT_LOGO || DEFAULT_LOGO_URL
const TERMS_URL = process.env.NEXT_PUBLIC_ONCHAINKIT_TERMS_URL || process.env.NEXT_PUBLIC_TERMS_URL
const PRIVACY_URL = process.env.NEXT_PUBLIC_ONCHAINKIT_PRIVACY_URL || process.env.NEXT_PUBLIC_PRIVACY_URL

// @edit-start 2025-11-12 — Quest creator MiniKit provider migrated from demo route
export function QuestCreatorMiniKitProvider({ children }: { children: ReactNode }) {
	const apiKey = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY

	const walletConfig: {
		display: 'modal'
		preference: 'all'
		termsUrl?: string
		privacyUrl?: string
	} = {
		display: 'modal',
		preference: 'all',
	}

	if (TERMS_URL) walletConfig.termsUrl = TERMS_URL
	if (PRIVACY_URL) walletConfig.privacyUrl = PRIVACY_URL

	return (
		<OnchainKitProvider
			chain={base}
			apiKey={apiKey}
			config={{
				appearance: {
					mode: 'dark',
					theme: 'base',
					name: APP_NAME,
					logo: LOGO_URL,
				},
				wallet: walletConfig,
				analytics: false,
			}}
			miniKit={{
				enabled: true,
				autoConnect: true, // Enable auto-connect for MiniKit users
			}}
		>
			{children}
		</OnchainKitProvider>
	)
}
// @edit-end
