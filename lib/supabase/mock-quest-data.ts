/**
 * Mock Quest Data for Testing
 * Used when Supabase is unavailable or for development
 * 
 * ⚠️ WARNING: Mock data for local development only!
 * DO NOT use in production. Always fetch real data from Supabase.
 * 
 * For production, use:
 * - Supabase queries via lib/supabase/edge.ts
 * - Subsquid for blockchain data
 * - Neynar for Farcaster data via lib/integrations/neynar.ts
 */

import type { Quest } from './types/quest';

export const MOCK_QUESTS: Quest[] = [
  {
    id: 1,
    slug: 'quest-1',
    created_at: new Date().toISOString(),
    title: 'Complete Your First Base Transaction',
    description: 'Make your first transaction on Base network to earn XP and unlock exclusive rewards. This quest introduces you to on-chain interactions.',
    category: 'onchain',
    type: 'custom',
    creator_fid: 12345,
    creator_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    reward_points: 100,
    reward_mode: 'points',
    verification_data: {},
    status: 'active',
    max_completions: 1000,
    completion_count: 234,
    cover_image_url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&q=80',
    badge_image_url: 'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=200&q=80',
    min_viral_xp_required: 0,
    is_featured: true,
    featured_order: 1,
    difficulty: 'beginner',
    estimated_time_minutes: 5,
    tags: ['onchain', 'beginner', 'base'],
    participant_count: 234,
    tasks: [
      {
        id: 1,
        title: 'Connect Wallet',
        description: 'Connect your wallet to the Base network',
        type: 'custom',
        verification_data: {},
        status: 'pending',
      },
      {
        id: 2,
        title: 'Send Transaction',
        description: 'Complete a transaction on Base',
        type: 'custom',
        verification_data: {},
        status: 'pending',
      },
    ],
  },
  {
    id: 2,
    slug: 'quest-2',
    created_at: new Date().toISOString(),
    title: 'Follow @gmeowbased on Farcaster',
    description: 'Join the Gmeowbased community by following our official account. Stay updated with quests, events, and rewards.',
    category: 'social',
    type: 'follow_user',
    creator_fid: 12345,
    reward_points: 50,
    reward_mode: 'points',
    verification_data: { target_fid: 12345 },
    status: 'active',
    max_completions: 10000,
    completion_count: 1567,
    cover_image_url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80',
    badge_image_url: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=200&q=80',
    min_viral_xp_required: 0,
    is_featured: true,
    featured_order: 2,
    difficulty: 'beginner',
    estimated_time_minutes: 2,
    tags: ['social', 'farcaster', 'community'],
    participant_count: 1567,
    tasks: [
      {
        id: 1,
        title: 'Follow Account',
        description: 'Follow @gmeowbased on Farcaster',
        type: 'follow_user',
        verification_data: { target_fid: 12345 },
        status: 'pending',
      },
    ],
  },
  {
    id: 3,
    slug: 'quest-3',
    created_at: new Date().toISOString(),
    title: 'Mint Your First Base NFT',
    description: 'Mint a commemorative NFT on Base network to celebrate your journey. Exclusive collection for early supporters.',
    category: 'onchain',
    type: 'mint_nft',
    creator_fid: 12345,
    reward_points: 200,
    reward_mode: 'points_and_token',
    token_reward_amount: 10,
    nft_reward_contract: '0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20',
    verification_data: {},
    status: 'active',
    max_completions: 500,
    completion_count: 89,
    cover_image_url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800&q=80',
    badge_image_url: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=200&q=80',
    min_viral_xp_required: 100,
    is_featured: true,
    featured_order: 3,
    difficulty: 'intermediate',
    estimated_time_minutes: 10,
    tags: ['nft', 'minting', 'base', 'rewards'],
    participant_count: 89,
    tasks: [
      {
        id: 1,
        title: 'Prepare Wallet',
        description: 'Ensure you have enough ETH for gas',
        type: 'custom',
        verification_data: {},
        status: 'pending',
      },
      {
        id: 2,
        title: 'Mint NFT',
        description: 'Complete the NFT minting transaction',
        type: 'mint_nft',
        verification_data: {},
        status: 'pending',
      },
    ],
  },
  {
    id: 4,
    slug: 'quest-4',
    created_at: new Date().toISOString(),
    title: 'Swap Tokens on Base DEX',
    description: 'Experience DeFi by swapping tokens on Base network. Learn about liquidity pools and decentralized exchanges.',
    category: 'onchain',
    type: 'swap_token',
    creator_fid: 12345,
    reward_points: 150,
    reward_mode: 'points',
    verification_data: {},
    status: 'active',
    max_completions: 1000,
    completion_count: 456,
    cover_image_url: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=800&q=80',
    min_viral_xp_required: 50,
    is_featured: false,
    difficulty: 'intermediate',
    estimated_time_minutes: 15,
    tags: ['defi', 'swap', 'base', 'trading'],
    participant_count: 456,
    tasks: [
      {
        id: 1,
        title: 'Connect to DEX',
        description: 'Connect your wallet to a Base DEX',
        type: 'custom',
        verification_data: {},
        status: 'pending',
      },
      {
        id: 2,
        title: 'Complete Swap',
        description: 'Swap any token pair',
        type: 'swap_token',
        verification_data: {},
        status: 'pending',
      },
    ],
  },
  {
    id: 5,
    slug: 'quest-5',
    created_at: new Date().toISOString(),
    title: 'Cast with #BaseQuest Tag',
    description: 'Share your Base journey on Farcaster with the #BaseQuest tag. Inspire others and grow the community.',
    category: 'social',
    type: 'custom',
    creator_fid: 12345,
    reward_points: 75,
    reward_mode: 'points',
    verification_data: { required_tag: 'BaseQuest' },
    status: 'active',
    max_completions: 5000,
    completion_count: 892,
    cover_image_url: 'https://images.unsplash.com/photo-1611162616305-c69b3037c7ba?w=800&q=80',
    min_viral_xp_required: 25,
    is_featured: false,
    difficulty: 'beginner',
    estimated_time_minutes: 3,
    tags: ['social', 'farcaster', 'content'],
    participant_count: 892,
    tasks: [
      {
        id: 1,
        title: 'Write Cast',
        description: 'Create a cast mentioning #BaseQuest',
        type: 'custom',
        verification_data: { required_tag: 'BaseQuest' },
        status: 'pending',
      },
    ],
  },
  {
    id: 6,
    slug: 'quest-6',
    created_at: new Date().toISOString(),
    title: 'Provide Liquidity on Base',
    description: 'Become a liquidity provider and earn fees. Advanced DeFi quest for experienced users.',
    category: 'onchain',
    type: 'provide_liquidity',
    creator_fid: 12345,
    reward_points: 300,
    reward_mode: 'points_and_token',
    token_reward_amount: 25,
    verification_data: {},
    status: 'active',
    max_completions: 200,
    completion_count: 34,
    cover_image_url: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=800&q=80',
    min_viral_xp_required: 200,
    is_featured: false,
    difficulty: 'advanced',
    estimated_time_minutes: 30,
    tags: ['defi', 'liquidity', 'advanced', 'yields'],
    participant_count: 34,
    tasks: [
      {
        id: 1,
        title: 'Select Pool',
        description: 'Choose a liquidity pool to provide to',
        type: 'custom',
        verification_data: {},
        status: 'pending',
      },
      {
        id: 2,
        title: 'Add Liquidity',
        description: 'Add liquidity to the selected pool',
        type: 'provide_liquidity',
        verification_data: {},
        status: 'pending',
      },
    ],
  },
];

export function getMockQuest(id: number): Quest | null {
  return MOCK_QUESTS.find((q) => q.id === id) || null;
}

export function getMockFeaturedQuests(limit: number = 3): Quest[] {
  return MOCK_QUESTS.filter((q) => q.is_featured)
    .sort((a, b) => (a.featured_order || 0) - (b.featured_order || 0))
    .slice(0, limit);
}

export function getMockActiveQuests(filters?: {
  category?: 'onchain' | 'social';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  search?: string;
}): Quest[] {
  let quests = MOCK_QUESTS.filter((q) => q.status === 'active');

  if (filters?.category) {
    quests = quests.filter((q) => q.category === filters.category);
  }

  if (filters?.difficulty) {
    quests = quests.filter((q) => q.difficulty === filters.difficulty);
  }

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    quests = quests.filter(
      (q) =>
        q.title.toLowerCase().includes(searchLower) ||
        q.description.toLowerCase().includes(searchLower) ||
        q.tags.some((tag) => tag.toLowerCase().includes(searchLower))
    );
  }

  return quests;
}
