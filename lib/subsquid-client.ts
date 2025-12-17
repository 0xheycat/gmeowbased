/**
 * Subsquid GraphQL Client
 * 
 * Centralized query layer for all blockchain analytics via Subsquid.
 * Handles 95-98% of calculations with <10ms response times.
 * 
 * Architecture:
 * - Subsquid: Blockchain data (XP, streaks, leaderboards, events)
 * - Supabase: Identity + metadata (FID→wallet, guild names, quest definitions)
 * 
 * GraphQL Endpoint: http://localhost:4350/graphql
 */

import { GraphQLClient, gql } from 'graphql-request';

const SUBSQUID_ENDPOINT = process.env.SUBSQUID_GRAPHQL_URL || 'http://localhost:4350/graphql';

const client = new GraphQLClient(SUBSQUID_ENDPOINT, {
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UserStats {
  address: string;
  totalXP: number;
  available: number; // Available XP for spending
  locked: bigint; // Locked XP (can't be spent yet)
  total: bigint; // Total XP lifetime
  level: number;
  tier: string;
  currentStreak: number;
  lastGMTimestamp: number | null; // milliseconds
  lifetimeGMs: number;
  guildMemberships: number;
  badgeCount: number;
  rank: number | null;
  weeklyPoints: number;
  monthlyPoints: number;
}

export interface LeaderboardEntry {
  rank: number;
  address: string;
  totalXP: number;
  level: number;
  tier: string;
  gmStreak: number;
  totalGMs: number;
}

export interface GMStats {
  fid: number;
  address: string;
  currentStreak: number;
  longestStreak: number;
  totalGMs: number;
  lastGMTimestamp: string | null;
  rank: number;
  todayGMed: boolean;
}

export interface GuildStats {
  guildId: string;
  memberCount: number;
  totalPoints: number;
  treasuryBalance: string;
  rank: number;
  recentEvents: Array<{
    type: string;
    timestamp: string;
    amount?: string;
  }>;
}

export interface QuestStats {
  questId: string;
  totalCompletions: number;
  uniqueUsers: number;
  lastCompletedAt: string | null;
}

export interface ReferralStats {
  code?: string;
  address?: string;
  totalReferrals: number;
  activeReferrals: number;
  totalRewards: string;
  referralTree: Array<{
    address: string;
    timestamp: string;
    rewards: string;
  }>;
}

export interface BadgeStats {
  badgeId: string;
  totalMinted: number;
  uniqueHolders: number;
  userOwns?: boolean;
  userAddress?: string;
}

export interface NFTStats {
  tokenId: string;
  owner: string;
  nftType: string; // NEW: Phase 1 Day 2 - Badge type from NFTMinted event
  metadataURI: string; // NEW: Phase 1 Day 2 - Metadata URI from NFTMinted event
  mintedAt: string;
  blockNumber?: number;
  mintTxHash?: string;
  transferCount: number;
  transferHistory: Array<{
    from: string;
    to: string;
    timestamp: string;
    txHash: string;
  }>;
}

export interface UserNFTStats {
  address: string;
  totalNFTs: number;
  nftIds: string[];
  recentMints: Array<{
    tokenId: string;
    timestamp: string;
    txHash: string;
  }>;
  recentTransfers: Array<{
    tokenId: string;
    from: string;
    to: string;
    timestamp: string;
  }>;
}

export interface VerificationHistory {
  fid: number;
  questId?: string;
  completions: Array<{
    questId: string;
    completedAt: string;
    txHash: string;
    verified: boolean;
  }>;
}

export interface OnchainStats {
  address: string;
  totalTransactions: number;
  totalGasSpent: string;
  firstActivityAt: string;
  lastActivityAt: string;
  dailyStats: Array<{
    date: string;
    transactionCount: number;
    gasSpent: string;
  }>;
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get comprehensive user statistics
 * Used by: Points Frame, Generic Frame, Profile pages
 */
export async function getUserStats(walletAddress: string): Promise<UserStats | null> {
  const addressLower = walletAddress.toLowerCase();
  
  const query = gql`
    query GetUserStats($address: String!) {
      users(where: { id_eq: $address }, limit: 1) {
        id
        totalXP
        currentStreak
        lastGMTimestamp
        lifetimeGMs
        badges {
          id
          tokenId
          badgeType
        }
        guilds {
          id
          role
          pointsContributed
        }
      }
      leaderboardEntries(where: { id_eq: $address }, limit: 1) {
        rank
        totalPoints
        weeklyPoints
        monthlyPoints
      }
    }
  `;

  try {
    const data: any = await client.request(query, { address: addressLower });
    
    if (!data.users || data.users.length === 0) {
      console.warn('[getUserStats] No user found for address:', walletAddress);
      return null;
    }

    const user = data.users[0];
    const leaderboard = data.leaderboardEntries?.[0] || null;
    
    // Calculate level and tier from totalXP (client-side calculation)
    const totalXP = Number(user.totalXP || 0);
    const { level, tier } = calculateLevelAndTier(totalXP);

    return {
      address: user.id,
      totalXP,
      available: totalXP, // Simplified: all XP available (locked XP logic TBD)
      locked: 0n,
      total: BigInt(totalXP),
      level,
      tier,
      currentStreak: user.currentStreak || 0,
      lastGMTimestamp: user.lastGMTimestamp ? Number(user.lastGMTimestamp) * 1000 : null,
      lifetimeGMs: user.lifetimeGMs || 0,
      guildMemberships: user.guilds?.length || 0,
      badgeCount: user.badges?.length || 0,
      rank: leaderboard?.rank || null,
      weeklyPoints: leaderboard?.weeklyPoints ? Number(leaderboard.weeklyPoints) : 0,
      monthlyPoints: leaderboard?.monthlyPoints ? Number(leaderboard.monthlyPoints) : 0,
    };
  } catch (error) {
    console.error('[getUserStats] Error:', error);
    return null;
  }
}

/**
 * Calculate level and tier from total XP
 * This matches the rank calculation logic from the smart contract
 */
function calculateLevelAndTier(totalXP: number): { level: number; tier: string } {
  // Level calculation: XP / 1000 (rounded down)
  const level = Math.max(1, Math.floor(totalXP / 1000));
  
  // Tier thresholds (matching contract logic)
  const tier = 
    totalXP >= 100000 ? 'Diamond' :
    totalXP >= 50000 ? 'Platinum' :
    totalXP >= 25000 ? 'Gold' :
    totalXP >= 10000 ? 'Silver' :
    'Bronze';
  
  return { level, tier };
}

/**
 * Get leaderboard rankings from Subsquid
 * Used by: Leaderboard Frame, Dashboard
 * 🔴 CRITICAL: Unblocks Phase 3 after migration
 * 
 * @param params.limit - Number of entries to return (default: 10)
 * @param params.offset - Offset for pagination (default: 0)
 * @param params.period - Time period filter: 'all_time' | 'weekly' | 'monthly' (default: 'all_time')
 */
export async function getLeaderboard(params?: {
  limit?: number;
  offset?: number;
  period?: 'all_time' | 'weekly' | 'monthly';
}) {
  const { limit = 10, offset = 0, period = 'all_time' } = params || {};

  // Build query based on period
  const query = gql`
    query GetLeaderboard($limit: Int!, $offset: Int!) {
      leaderboardEntries(
        limit: $limit
        offset: $offset
        orderBy: rank_ASC
      ) {
        id
        rank
        totalPoints
        weeklyPoints
        monthlyPoints
        updatedAt
        user {
          id
          totalXP
          currentStreak
          lifetimeGMs
          lastGMTimestamp
        }
      }
    }
  `;

  try {
    const data: any = await client.request(query, { limit, offset });
    
    if (!data?.leaderboardEntries) {
      console.warn('[getLeaderboard] No leaderboard entries returned');
      return [];
    }

    // Map to frame-compatible format
    return data.leaderboardEntries.map((entry: any) => {
      // Determine points based on period
      const points = period === 'weekly' 
        ? entry.weeklyPoints 
        : period === 'monthly' 
          ? entry.monthlyPoints 
          : entry.totalPoints;

      return {
        rank: entry.rank,
        address: entry.user.id, // wallet address (lowercase)
        points: Number(points || 0),
        totalXP: Number(entry.user.totalXP || 0),
        currentStreak: entry.user.currentStreak || 0,
        lifetimeGMs: entry.user.lifetimeGMs || 0,
        lastGMTimestamp: entry.user.lastGMTimestamp ? Number(entry.user.lastGMTimestamp) * 1000 : null,
        updatedAt: entry.updatedAt,
      };
    });
  } catch (error) {
    console.error('[getLeaderboard] Error:', error);
    return [];
  }
}

/**
 * Get guild statistics from Subsquid
 * Used by: Guild Frame
 * 
 * @param guildId - Guild ID from contract
 * @returns Guild stats with members, points, events
 */
export async function getGuildStats(guildId: string) {
  const query = gql`
    query GetGuildStats($guildId: String!) {
      guilds(where: { id_eq: $guildId }, limit: 1) {
        id
        owner
        createdAt
        totalMembers
        totalPoints
        members(limit: 20, orderBy: pointsContributed_DESC) {
          id
          user {
            id
            totalXP
          }
          role
          pointsContributed
          joinedAt
          isActive
        }
        events(limit: 10, orderBy: timestamp_DESC) {
          id
          eventType
          user
          amount
          timestamp
        }
      }
    }
  `;

  try {
    const data: any = await client.request(query, { guildId });
    
    if (!data?.guilds || data.guilds.length === 0) {
      console.warn('[getGuildStats] No guild found:', guildId);
      return null;
    }

    const guild = data.guilds[0];

    return {
      id: guild.id,
      owner: guild.owner,
      createdAt: Number(guild.createdAt) * 1000, // Convert to milliseconds
      totalMembers: guild.totalMembers,
      totalPoints: Number(guild.totalPoints || 0),
      members: guild.members.map((member: any) => ({
        id: member.id,
        address: member.user.id,
        role: member.role,
        pointsContributed: Number(member.pointsContributed || 0),
        joinedAt: Number(member.joinedAt) * 1000,
        isActive: member.isActive,
        totalXP: Number(member.user.totalXP || 0),
      })),
      recentEvents: guild.events.map((event: any) => ({
        id: event.id,
        eventType: event.eventType,
        user: event.user,
        amount: event.amount ? Number(event.amount) : null,
        timestamp: Number(event.timestamp) * 1000,
      })),
    };
  } catch (error) {
    console.error('[getGuildStats] Error:', error);
    return null;
  }
}

/**
 * Get badge statistics for a user
 * Used by: Badge Frame
 * Returns all badges owned by a user from Subsquid
 */
export async function getBadgeStats(params: { fid: number; walletAddress?: string }): Promise<{
  earnedBadges: Array<{
    id: string;
    tokenId: string;
    badgeType: string;
    timestamp: string;
  }>;
  earnedCount: number;
  hasLegendary: boolean;
} | null> {
  const { fid, walletAddress } = params;

  // Need wallet address to query badges
  if (!walletAddress) {
    console.warn('[getBadgeStats] No wallet address provided for FID:', fid);
    return { earnedBadges: [], earnedCount: 0, hasLegendary: false };
  }

  try {
    const query = gql`
      query GetBadgeStats($userAddress: String!) {
        badgeMints(
          where: { user: { id_eq: $userAddress } }
          orderBy: timestamp_DESC
          limit: 50
        ) {
          id
          tokenId
          badgeType
          timestamp
        }
      }
    `;

    const response = await client.request(query, {
      userAddress: walletAddress.toLowerCase(),
    });

    const badges = response.badgeMints || [];
    const earnedCount = badges.length;
    const hasLegendary = badges.some((b: any) => b.badgeType?.toLowerCase().includes('legendary'));

    return {
      earnedBadges: badges.map((b: any) => ({
        id: b.id,
        tokenId: String(b.tokenId),
        badgeType: b.badgeType,
        timestamp: new Date(Number(b.timestamp) * 1000).toISOString(),
      })),
      earnedCount,
      hasLegendary,
    };
  } catch (error) {
    console.error('[getBadgeStats] Error:', error);
    return { earnedBadges: [], earnedCount: 0, hasLegendary: false };
  }
}

/**
 * Get referral statistics
 * Used by: Referral Frame
 * Query by code (to show code stats) or by owner address (to show user's referral performance)
 */
export async function getReferralStats(params: { 
  code?: string; 
  ownerAddress?: string;
}): Promise<{
  code: string | null;
  owner: string | null;
  totalUses: number;
  totalRewards: string;
  recentReferrals: Array<{
    id: string;
    referee: string;
    reward: string;
    timestamp: string;
  }>;
} | null> {
  const { code, ownerAddress } = params;

  if (!code && !ownerAddress) {
    console.warn('[getReferralStats] Need either code or ownerAddress');
    return null;
  }

  try {
    let query: any;
    let variables: any;

    if (code) {
      // Query by referral code
      query = gql`
        query GetReferralByCode($code: String!) {
          referralCodes(where: { id_eq: $code }, limit: 1) {
            id
            owner
            createdAt
            totalUses
            totalRewards
            referrals(limit: 10, orderBy: timestamp_DESC) {
              id
              referee
              reward
              timestamp
            }
          }
        }
      `;
      variables = { code: code.toLowerCase() };
    } else {
      // Query by owner address
      query = gql`
        query GetReferralByOwner($owner: String!) {
          referralCodes(where: { owner_eq: $owner }, limit: 1) {
            id
            owner
            createdAt
            totalUses
            totalRewards
            referrals(limit: 10, orderBy: timestamp_DESC) {
              id
              referee
              reward
              timestamp
            }
          }
        }
      `;
      variables = { owner: ownerAddress!.toLowerCase() };
    }

    const response = await client.request(query, variables);
    const referralCode = response.referralCodes?.[0];

    if (!referralCode) {
      return {
        code: code || null,
        owner: ownerAddress || null,
        totalUses: 0,
        totalRewards: '0',
        recentReferrals: [],
      };
    }

    return {
      code: referralCode.id,
      owner: referralCode.owner,
      totalUses: referralCode.totalUses || 0,
      totalRewards: String(referralCode.totalRewards || '0'),
      recentReferrals: (referralCode.referrals || []).map((r: any) => ({
        id: r.id,
        referee: r.referee,
        reward: String(r.reward),
        timestamp: new Date(Number(r.timestamp) * 1000).toISOString(),
      })),
    };
  } catch (error) {
    console.error('[getReferralStats] Error:', error);
    return null;
  }
}

/**
 * Get GM streak statistics
 * Used by: GM Frame
 * NOTE: FID must be resolved to wallet address via Supabase first
 */
export async function getGMStats(params: { fid: number; walletAddress?: string }): Promise<GMStats | null> {
  const { fid, walletAddress } = params;

  // If no wallet address provided, we can't query (need Supabase FID lookup)
  if (!walletAddress) {
    console.warn('[getGMStats] No wallet address provided, need FID→wallet lookup from Supabase');
    return null;
  }

  const query = gql`
    query GetGMStats($address: String!) {
      user(id: $address) {
        id
        totalXP
        currentStreak
        lastGMTimestamp
        lifetimeGMs
      }
      leaderboardEntry(id: $address) {
        rank
      }
      gmEvents(where: { user: { id: $address } }, orderBy: timestamp_DESC, limit: 1) {
        timestamp
      }
    }
  `;

  try {
    const data: any = await client.request(query, { address: walletAddress.toLowerCase() });
    
    if (!data.user) {
      return null;
    }

    const user = data.user;
    const lastGM = data.gmEvents[0]?.timestamp;
    const now = Date.now();
    const lastGMTimestamp = lastGM ? Number(lastGM) * 1000 : 0; // Convert from seconds to ms
    const todayGMed = lastGMTimestamp ? 
      (now - lastGMTimestamp) < 24 * 60 * 60 * 1000 : false;

    return {
      fid,
      address: user.id,
      currentStreak: user.currentStreak || 0,
      longestStreak: user.currentStreak || 0, // TODO: Add longestStreak to schema if needed
      totalGMs: user.lifetimeGMs || 0,
      lastGMTimestamp: user.lastGMTimestamp ? new Date(Number(user.lastGMTimestamp) * 1000).toISOString() : null,
      rank: data.leaderboardEntry?.rank || 0,
      todayGMed,
    };
  } catch (error) {
    console.error('Error fetching GM stats:', error);
    return null;
  }
}



/**
 * Get quest completion statistics
 * Used by: Quest Frame
 */
export async function getQuestStats(questId: string): Promise<QuestStats | null> {
  const query = gql`
    query GetQuestStats($questId: String!) {
      questCompletions(where: { questId: $questId }) {
        id
        user {
          id
        }
        completedAt
      }
    }
  `;

  try {
    const data: any = await client.request(query, { questId });
    
    const completions = data.questCompletions || [];
    const uniqueUsers = new Set(completions.map((c: any) => c.user.id)).size;
    const lastCompleted = completions.length > 0 ? 
      completions.sort((a: any, b: any) => 
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      )[0].completedAt : null;

    return {
      questId,
      totalCompletions: completions.length,
      uniqueUsers,
      lastCompletedAt: lastCompleted,
    };
  } catch (error) {
    console.error('Error fetching quest stats:', error);
    return null;
  }
}

/**
 * Get NFT statistics and transfer history
 * Updated: Phase 1 Day 2 - Added nftType and metadataURI fields
 * Used by: NFT Frame, metadata API
 */
export async function getNFTStats(params: { tokenId: string }): Promise<NFTStats | null> {
  const { tokenId } = params;

  const query = gql`
    query GetNFTStats($tokenId: BigInt!) {
      nftMints(where: { tokenId: $tokenId }) {
        tokenId
        to
        nftType
        metadataURI
        timestamp
        blockNumber
        txHash
      }
      nftTransfers(where: { tokenId: $tokenId }, orderBy: timestamp_DESC) {
        from
        to
        timestamp
        txHash
      }
    }
  `;

  try {
    const data: any = await client.request(query, { tokenId });
    
    if (!data.nftMints || data.nftMints.length === 0) {
      return null;
    }

    const mint = data.nftMints[0];
    const transfers = data.nftTransfers || [];
    const currentOwner = transfers.length > 0 ? 
      transfers[0].to : mint.to;

    return {
      tokenId,
      owner: currentOwner,
      nftType: mint.nftType,
      metadataURI: mint.metadataURI,
      mintedAt: mint.timestamp,
      blockNumber: mint.blockNumber,
      mintTxHash: mint.txHash,
      transferCount: transfers.length,
      transferHistory: transfers.map((t: any) => ({
        from: t.from,
        to: t.to,
        timestamp: t.timestamp,
        txHash: t.txHash,
      })),
    };
  } catch (error) {
    console.error('Error fetching NFT stats:', error);
    return null;
  }
}

/**
 * Get user's NFT holdings and history
 * Used by: NFT Frame, hybrid-data
 */
export async function getUserNFTStats(params: { address: string }): Promise<UserNFTStats> {
  const { address } = params;
  const lowerAddress = address.toLowerCase();

  const query = gql`
    query GetUserNFTs($address: String!) {
      nftMints(where: { to_eq: $address }, orderBy: timestamp_DESC, limit: 100) {
        id
        tokenId
        to
        timestamp
        txHash
      }
      nftTransfers(
        where: { 
          OR: [
            { from_eq: $address }
            { to_eq: $address }
          ]
        }
        orderBy: timestamp_DESC
        limit: 50
      ) {
        id
        tokenId
        from
        to
        timestamp
        txHash
      }
    }
  `;

  try {
    const data: any = await client.request(query, { address: lowerAddress });
    
    const mints = data.nftMints || [];
    const transfers = data.nftTransfers || [];
    
    // Calculate current NFT holdings (mints received - transfers sent)
    const mintedTokenIds: string[] = mints.map((m: any) => String(m.tokenId));
    const transferredOut: string[] = transfers
      .filter((t: any) => t.from.toLowerCase() === lowerAddress)
      .map((t: any) => String(t.tokenId));
    
    const transferredSet = new Set(transferredOut);
    const currentNFTIds = mintedTokenIds.filter((id: string) => !transferredSet.has(id));

    const result = {
      address: lowerAddress,
      totalNFTs: currentNFTIds.length,
      nftIds: currentNFTIds,
      recentMints: mints.slice(0, 10).map((m: any) => ({
        tokenId: String(m.tokenId),
        timestamp: new Date(Number(m.timestamp) * 1000).toISOString(),
        txHash: m.txHash,
      })),
      recentTransfers: transfers.slice(0, 10).map((t: any) => ({
        tokenId: String(t.tokenId),
        from: t.from,
        to: t.to,
        timestamp: new Date(Number(t.timestamp) * 1000).toISOString(),
      })),
    };
    
    return result;
  } catch (error) {
    console.error('Error fetching user NFT stats:', error);
    return {
      address: lowerAddress,
      totalNFTs: 0,
      nftIds: [],
      recentMints: [],
      recentTransfers: [],
    };
  }
}

/**
 * Get quest verification history
 * Used by: Verify Frame
 */
export async function getVerificationHistory(params: {
  fid: number;
  questId?: string;
}): Promise<VerificationHistory | null> {
  const { fid, questId } = params;

  const query = gql`
    query GetVerificationHistory($fid: Int!, $questId: String) {
      questCompletions(
        where: { user: { fid: $fid }, questId: $questId }
        orderBy: completedAt_DESC
      ) {
        questId
        completedAt
        txHash
        verified
      }
    }
  `;

  try {
    const data: any = await client.request(query, { fid, questId });
    
    return {
      fid,
      questId,
      completions: (data.questCompletions || []).map((c: any) => ({
        questId: c.questId,
        completedAt: c.completedAt,
        txHash: c.txHash,
        verified: c.verified,
      })),
    };
  } catch (error) {
    console.error('Error fetching verification history:', error);
    return null;
  }
}

/**
 * Get onchain activity statistics
 * Used by: OnchainStats Frame
 */
export async function getOnchainStats(params: { userAddr: string }): Promise<OnchainStats | null> {
  const { userAddr } = params;

  const query = gql`
    query GetOnchainStats($address: String!) {
      user(id: $address) {
        id
        totalTransactions
        totalGasSpent
        firstActivityAt
        lastActivityAt
      }
      dailyStats(where: { user: $address }, orderBy: date_DESC, limit: 30) {
        date
        transactionCount
        gasSpent
      }
    }
  `;

  try {
    const data: any = await client.request(query, { address: userAddr.toLowerCase() });
    
    if (!data.user) {
      return null;
    }

    return {
      address: data.user.id,
      totalTransactions: data.user.totalTransactions || 0,
      totalGasSpent: data.user.totalGasSpent || '0',
      firstActivityAt: data.user.firstActivityAt || '',
      lastActivityAt: data.user.lastActivityAt || '',
      dailyStats: (data.dailyStats || []).map((s: any) => ({
        date: s.date,
        transactionCount: s.transactionCount || 0,
        gasSpent: s.gasSpent || '0',
      })),
    };
  } catch (error) {
    console.error('Error fetching onchain stats:', error);
    return null;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if Subsquid service is available
 */
export async function checkSubsquidHealth(): Promise<boolean> {
  try {
    const query = gql`
      query Health {
        _metadata {
          lastProcessedBlock
        }
      }
    `;
    await client.request(query);
    return true;
  } catch (error) {
    console.error('Subsquid health check failed:', error);
    return false;
  }
}

/**
 * Get last indexed block number
 */
export async function getLastIndexedBlock(): Promise<number | null> {
  try {
    const query = gql`
      query GetLastBlock {
        _metadata {
          lastProcessedBlock
        }
      }
    `;
    const data: any = await client.request(query);
    return data._metadata?.lastProcessedBlock || null;
  } catch (error) {
    console.error('Error fetching last indexed block:', error);
    return null;
  }
}
