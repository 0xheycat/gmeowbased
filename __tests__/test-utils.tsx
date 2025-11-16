import type { ReactElement } from 'react'
import type { RenderOptions } from '@testing-library/react'
import { render } from '@testing-library/react'
import { vi } from 'vitest'

/**
 * Custom render function for testing with common providers
 */
export function renderWithProviders(
	ui: ReactElement,
	options?: Omit<RenderOptions, 'wrapper'>,
) {
	return render(ui, { ...options })
}

/**
 * Mock notification system
 */
export function createMockNotifications() {
	return {
		push: vi.fn(),
		dismiss: vi.fn(),
	}
}

/**
 * Wait for async updates
 */
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

/**
 * Create mock MiniKit context
 */
export function createMockMiniKitContext(overrides = {}) {
	return {
		user: {
			fid: 1234,
			username: 'testuser',
			displayName: 'Test User',
			pfpUrl: 'https://example.com/pfp.png',
		},
		location: null,
		client: { name: 'test-client' },
		...overrides,
	}
}

/**
 * Create mock wallet account
 */
export function createMockAccount(overrides = {}) {
	return {
		address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
		isConnected: true,
		connector: { id: 'test-connector', name: 'Test Connector' },
		...overrides,
	}
}

/**
 * Create mock token option
 */
export function createMockToken(overrides = {}) {
	return {
		address: '0xtoken' as `0x${string}`,
		symbol: 'TEST',
		name: 'Test Token',
		decimals: 18,
		chainId: 8453,
		logoURI: 'https://example.com/token.png',
		...overrides,
	}
}

/**
 * Create mock NFT option
 */
export function createMockNFT(overrides = {}) {
	return {
		address: '0xnft' as `0x${string}`,
		name: 'Test NFT',
		symbol: 'TNFT',
		chainId: 8453,
		imageUrl: 'https://example.com/nft.png',
		...overrides,
	}
}

/**
 * Create mock quest draft
 */
export function createMockQuestDraft(overrides = {}) {
	return {
		questTypeKey: 'gm',
		name: 'Test Quest',
		headline: 'Test headline',
		description: 'Test description',
		media: null,
		eligibilityMode: 'open' as const,
		eligibilityAssetType: null,
		eligibilityAssetAddress: null,
		eligibilityAssetChainId: null,
		eligibilityMinBalance: '',
		eligibilityPartnerChains: [],
		rewardMode: 'points' as const,
		rewardAssetAddress: null,
		rewardAssetChainId: null,
		rewardAmount: '100',
		raffleEnabled: false,
		raffleStrategy: 'random' as const,
		raffleMaxWinners: '',
		rewardTxHash: null,
		rewardDepositAmount: null,
		rewardDepositDetectedAt: null,
		maxCompletions: '',
		expiresAt: null,
		followUsername: null,
		frameUrl: null,
		castLink: null,
		castContains: null,
		mentionUsername: null,
		targetUsername: null,
		targetFid: null,
		...overrides,
	}
}

export * from '@testing-library/react'
