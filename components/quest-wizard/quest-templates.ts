/**
 * Quest Templates for Quick Creation
 * 
 * Pre-configured quest templates to help users create common quest types faster.
 */

import type { QuestDraft } from './shared'
// QUEST_TYPES is available via QuestDraft type from shared.ts
// import { QUEST_TYPES } from '@/lib/gm-utils'

export type QuestTemplate = {
	id: string
	name: string
	description: string
	icon: string
	category: 'social' | 'onchain' | 'hybrid'
	difficulty: 'easy' | 'medium' | 'hard'
	estimatedTime: string
	popularityRank: number
	draft: Partial<QuestDraft>
}

/**
 * Pre-defined quest templates
 */
export const QUEST_TEMPLATES: QuestTemplate[] = [
	{
		id: 'giveaway-token',
		name: 'Token Giveaway',
		description: 'Distribute ERC-20 tokens to participants who complete social actions like following, casting, or recasting. Perfect for growing your community and rewarding early supporters with direct token transfers.',
		icon: '🎁',
		category: 'social',
		difficulty: 'easy',
		estimatedTime: '5 min',
		popularityRank: 1,
		draft: {
			name: 'Token Giveaway Quest',
			headline: 'Complete actions to earn tokens',
			description: 'Follow us and cast about this quest to be eligible for token rewards!',
			questTypeKey: 'GENERIC' as any as any,
			eligibilityMode: 'open',
			rewardMode: 'token',
			rewardTokenPerUser: '10',
			raffleEnabled: false,
			maxWinners: '100',
			maxCompletions: '1',
		},
	},
	{
		id: 'nft-contest',
		name: 'NFT Contest',
		description: 'Run a provably fair raffle using blockhash or Farcaster randomness to distribute NFT rewards to lucky winners. Ideal for limited edition drops, art reveals, and exclusive collectible campaigns.',
		icon: '🎨',
		category: 'social',
		difficulty: 'easy',
		estimatedTime: '5 min',
		popularityRank: 2,
		draft: {
			name: 'NFT Raffle Contest',
			headline: 'Win exclusive NFTs',
			description: 'Complete the quest for a chance to win limited edition NFTs from our collection!',
			questTypeKey: 'GENERIC' as any as any,
			eligibilityMode: 'open',
			rewardMode: 'nft',
			rewardTokenPerUser: '1',
			raffleEnabled: true,
			raffleStrategy: 'blockhash',
			maxWinners: '10',
			maxCompletions: '1',
		},
	},
	{
		id: 'referral-campaign',
		name: 'Referral Campaign',
		description: 'Build viral growth loops by rewarding users with points or tokens for each friend they successfully refer. Track referral chains and create leaderboards to gamify community expansion.',
		icon: '👥',
		category: 'social',
		difficulty: 'medium',
		estimatedTime: '10 min',
		popularityRank: 3,
		draft: {
			name: 'Referral Rewards Program',
			headline: 'Earn points for every friend you bring',
			description: 'Invite friends to join our community and earn bonus points for each successful referral!',
			questTypeKey: 'GENERIC' as any as any,
			eligibilityMode: 'open',
			rewardMode: 'points',
			rewardPoints: '50',
			raffleEnabled: false,
			maxWinners: '1000',
			maxCompletions: '10',
		},
	},
	{
		id: 'holder-airdrop',
		name: 'Token Holder Airdrop',
		description: 'Reward loyal token holders with bonus airdrops. Set minimum balance thresholds and verify holdings onchain across Base, Optimism, Celo, Unichain, and Ink networks. Great for retention campaigns.',
		icon: '💎',
		category: 'onchain',
		difficulty: 'easy',
		estimatedTime: '5 min',
		popularityRank: 4,
		draft: {
			name: 'Holder Airdrop',
			headline: 'Exclusive rewards for our token holders',
			description: 'Hold our token to be eligible for this special airdrop reward!',
			questTypeKey: 'GENERIC' as any,
			eligibilityMode: 'partner',
			eligibilityAssetType: 'token',
			eligibilityMinimum: '100',
			rewardMode: 'token',
			rewardTokenPerUser: '50',
			raffleEnabled: false,
			maxWinners: '500',
			maxCompletions: '1',
		},
	},
	{
		id: 'nft-holder-access',
		name: 'NFT Holder Benefits',
		description: 'Gate access and rewards based on NFT collection ownership. Verify ERC-721 holdings onchain to create exclusive perks for your community. Perfect for PFP projects, art collections, and membership NFTs.',
		icon: '🖼️',
		category: 'onchain',
		difficulty: 'easy',
		estimatedTime: '5 min',
		popularityRank: 5,
		draft: {
			name: 'NFT Holder Exclusive',
			headline: 'Special rewards for NFT collectors',
			description: 'Hold an NFT from our collection to unlock exclusive benefits and rewards!',
			questTypeKey: 'GENERIC' as any,
			eligibilityMode: 'partner',
			eligibilityAssetType: 'nft',
			eligibilityMinimum: '1',
			rewardMode: 'points',
			rewardPoints: '100',
			raffleEnabled: false,
			maxWinners: '200',
			maxCompletions: '1',
		},
	},
	{
		id: 'engagement-boost',
		name: 'Engagement Campaign',
		description: 'Amplify your Farcaster presence by rewarding follows, recasts, likes, replies, mentions, and channel posts. Drive authentic engagement with verification through Neynar API and Farcaster Hub.',
		icon: '📢',
		category: 'social',
		difficulty: 'easy',
		estimatedTime: '5 min',
		popularityRank: 6,
		draft: {
			name: 'Social Engagement Quest',
			headline: 'Like, recast, and follow to earn',
			description: 'Complete all social actions to maximize your rewards and help spread the word!',
			questTypeKey: 'GENERIC' as any,
			eligibilityMode: 'open',
			rewardMode: 'points',
			rewardPoints: '25',
			raffleEnabled: false,
			maxWinners: '1000',
			maxCompletions: '1',
		},
	},
	{
		id: 'content-creator',
		name: 'Content Creation Quest',
		description: 'Reward users for creating quality content about your project',
		icon: '✍️',
		category: 'social',
		difficulty: 'medium',
		estimatedTime: '10 min',
		popularityRank: 7,
		draft: {
			name: 'Content Creator Rewards',
			headline: 'Create content, earn rewards',
			description: 'Write about our project, include specific keywords, and earn tokens for quality content!',
			questTypeKey: 'GENERIC' as any,
			castContains: 'gmeowbased adventure quest',
			eligibilityMode: 'open',
			rewardMode: 'token',
			rewardTokenPerUser: '20',
			raffleEnabled: false,
			maxWinners: '50',
			maxCompletions: '1',
		},
	},
	{
		id: 'frame-interaction',
		name: 'Frame Interaction Quest',
		description: 'Drive engagement to your Farcaster Frame',
		icon: '🖼️',
		category: 'hybrid',
		difficulty: 'medium',
		estimatedTime: '7 min',
		popularityRank: 8,
		draft: {
			name: 'Interactive Frame Quest',
			headline: 'Interact with our Frame to win',
			description: 'Visit our Farcaster Frame and complete the interactive experience to earn rewards!',
			questTypeKey: 'GENERIC' as any,
			eligibilityMode: 'open',
			rewardMode: 'points',
			rewardPoints: '75',
			raffleEnabled: true,
			raffleStrategy: 'farcaster',
			maxWinners: '25',
			maxCompletions: '1',
		},
	},
	{
		id: 'whale-exclusive',
		name: 'Whale Exclusive Quest',
		description: 'High-value quest for users holding significant token amounts',
		icon: '🐋',
		category: 'onchain',
		difficulty: 'hard',
		estimatedTime: '5 min',
		popularityRank: 9,
		draft: {
			name: 'Whale Holder Rewards',
			headline: 'Exclusive benefits for major holders',
			description: 'Hold a significant amount of our token to access premium rewards and benefits!',
			questTypeKey: 'GENERIC' as any,
			eligibilityMode: 'partner',
			eligibilityAssetType: 'token',
			eligibilityMinimum: '10000',
			rewardMode: 'token',
			rewardTokenPerUser: '500',
			raffleEnabled: false,
			maxWinners: '20',
			maxCompletions: '1',
		},
	},
	{
		id: 'community-milestone',
		name: 'Community Milestone',
		description: 'Celebrate community achievements with collective rewards',
		icon: '🎉',
		category: 'social',
		difficulty: 'medium',
		estimatedTime: '8 min',
		popularityRank: 10,
		draft: {
			name: 'Milestone Celebration',
			headline: 'We reached a major milestone!',
			description: 'Thank you for being part of our journey. Claim your milestone reward today!',
			questTypeKey: 'GENERIC' as any,
			eligibilityMode: 'open',
			rewardMode: 'nft',
			rewardTokenPerUser: '1',
			raffleEnabled: true,
			raffleStrategy: 'blockhash',
			maxWinners: '100',
			maxCompletions: '1',
		},
	},
]

/**
 * Get template by ID
 */
export function getTemplateById(id: string): QuestTemplate | null {
	return QUEST_TEMPLATES.find(t => t.id === id) ?? null
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: QuestTemplate['category']): QuestTemplate[] {
	return QUEST_TEMPLATES.filter(t => t.category === category).sort((a, b) => a.popularityRank - b.popularityRank)
}

/**
 * Get templates by difficulty
 */
export function getTemplatesByDifficulty(difficulty: QuestTemplate['difficulty']): QuestTemplate[] {
	return QUEST_TEMPLATES.filter(t => t.difficulty === difficulty).sort((a, b) => a.popularityRank - b.popularityRank)
}

/**
 * Get most popular templates
 */
export function getPopularTemplates(limit: number = 5): QuestTemplate[] {
	return [...QUEST_TEMPLATES].sort((a, b) => a.popularityRank - b.popularityRank).slice(0, limit)
}

/**
 * Apply template to quest draft
 */
export function applyTemplate(template: QuestTemplate, existingDraft?: Partial<QuestDraft>): Partial<QuestDraft> {
	return {
		...existingDraft,
		...template.draft,
		// Preserve certain fields from existing draft if they exist
		chain: existingDraft?.chain ?? 'base',
		eligibilityChainList: existingDraft?.eligibilityChainList ?? ['base'],
	}
}

/**
 * Create custom template from existing draft
 */
export function createCustomTemplate(
	draft: Partial<QuestDraft>,
	metadata: {
		name: string
		description: string
		icon?: string
		category?: QuestTemplate['category']
	}
): QuestTemplate {
	return {
		id: `custom-${Date.now()}`,
		name: metadata.name,
		description: metadata.description,
		icon: metadata.icon ?? '⭐',
		category: metadata.category ?? 'social',
		difficulty: 'medium',
		estimatedTime: '10 min',
		popularityRank: 999,
		draft,
	}
}
