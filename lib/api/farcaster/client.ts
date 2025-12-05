/**
 * Farcaster API Client
 * Wrapper around Neynar SDK for quest-related Farcaster data
 */

import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk';

// Initialize Neynar client with Configuration object
const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY!,
});
const neynar = new NeynarAPIClient(config);

// Cache duration (5 minutes)
const CACHE_TTL = 300;

// ===========================
// User Data
// ===========================

export interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  followerCount: number;
  followingCount: number;
  bio?: string;
  verifiedAddresses?: string[];
}

/**
 * Get user data by FID
 */
export async function getUserByFid(fid: number): Promise<FarcasterUser> {
  try {
    const response = await neynar.fetchBulkUsers({ fids: [fid] });
    const user = response.users[0];
    
    return {
      fid: user.fid,
      username: user.username,
      displayName: user.display_name || user.username,
      pfpUrl: user.pfp_url || '',
      followerCount: user.follower_count || 0,
      followingCount: user.following_count || 0,
      bio: user.profile?.bio?.text,
      verifiedAddresses: user.verified_addresses?.eth_addresses || [],
    };
  } catch (error) {
    console.error(`Failed to fetch user ${fid}:`, error);
    throw new Error(`Failed to fetch user data for FID ${fid}`);
  }
}

/**
 * Get multiple users by FIDs
 */
export async function getUsersByFids(fids: number[]): Promise<FarcasterUser[]> {
  try {
    const response = await neynar.fetchBulkUsers({ fids });
    
    return response.users.map(user => ({
      fid: user.fid,
      username: user.username,
      displayName: user.display_name || user.username,
      pfpUrl: user.pfp_url || '',
      followerCount: user.follower_count || 0,
      followingCount: user.following_count || 0,
      bio: user.profile?.bio?.text,
      verifiedAddresses: user.verified_addresses?.eth_addresses || [],
    }));
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw new Error('Failed to fetch user data');
  }
}

// ===========================
// Cast Data
// ===========================

export interface FarcasterCast {
  hash: string;
  text: string;
  authorFid: number;
  timestamp: string;
  likes: number;
  recasts: number;
  replies: number;
}

/**
 * Get user's recent casts
 */
export async function getUserCasts(fid: number, limit: number = 25): Promise<FarcasterCast[]> {
  try {
    const response = await neynar.fetchCastsForUser({ fid, limit });
    
    return response.casts.map((cast: any) => ({
      hash: cast.hash,
      text: cast.text,
      authorFid: cast.author.fid,
      timestamp: cast.timestamp,
      likes: cast.reactions?.likes_count || 0,
      recasts: cast.reactions?.recasts_count || 0,
      replies: cast.replies?.count || 0,
    }));
  } catch (error) {
    console.error(`Failed to fetch casts for user ${fid}:`, error);
    return []; // Return empty array instead of throwing
  }
}

/**
 * Check if user has cast with specific content
 */
export async function checkUserHasCast(fid: number, searchText?: string): Promise<boolean> {
  try {
    const casts = await getUserCasts(fid, 100);
    
    if (!searchText) {
      return casts.length > 0; // Just check if user has any casts
    }
    
    // Check if any cast contains the search text
    return casts.some(cast => 
      cast.text.toLowerCase().includes(searchText.toLowerCase())
    );
  } catch (error) {
    console.error('Failed to check cast:', error);
    return false;
  }
}

// ===========================
// Channel Data
// ===========================

export interface FarcasterChannel {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  followerCount: number;
}

/**
 * Get channel details
 */
export async function getChannelDetails(channelId: string): Promise<FarcasterChannel> {
  try {
    const response = await neynar.lookupChannel({ id: channelId });
    const channel = response.channel;
    
    return {
      id: channel.id,
      name: channel.name || '',
      description: channel.description,
      imageUrl: channel.image_url,
      followerCount: channel.follower_count || 0,
    };
  } catch (error) {
    console.error(`Failed to fetch channel ${channelId}:`, error);
    throw new Error(`Failed to fetch channel ${channelId}`);
  }
}

/**
 * Check if user follows a channel
 */
export async function checkUserFollowsChannel(
  fid: number, 
  channelId: string
): Promise<boolean> {
  try {
    // Note: This would require checking user's followed channels
    // For now, return false as placeholder
    // TODO: Implement proper channel following check
    console.warn('Channel following check not yet implemented');
    return false;
  } catch (error) {
    console.error('Failed to check channel following:', error);
    return false;
  }
}

// ===========================
// Follow Relationships
// ===========================

/**
 * Check if user follows another user
 */
export async function checkUserFollows(
  sourceFid: number, 
  targetFid: number
): Promise<boolean> {
  try {
    // Note: This would require checking user's following list
    // For now, return false as placeholder
    // TODO: Implement proper following check with Neynar API
    console.warn('Follow check not yet implemented');
    return false;
  } catch (error) {
    console.error('Failed to check following:', error);
    return false;
  }
}

// ===========================
// Engagement Actions
// ===========================

/**
 * Check if user liked a specific cast
 */
export async function checkUserLikedCast(
  fid: number, 
  castHash: string
): Promise<boolean> {
  try {
    // Note: This would require checking user's liked casts
    // For now, return false as placeholder
    // TODO: Implement proper like check
    console.warn('Like check not yet implemented');
    return false;
  } catch (error) {
    console.error('Failed to check like:', error);
    return false;
  }
}

/**
 * Check if user recasted a specific cast
 */
export async function checkUserRecastedCast(
  fid: number, 
  castHash: string
): Promise<boolean> {
  try {
    // Note: This would require checking user's recasts
    // For now, return false as placeholder
    // TODO: Implement proper recast check
    console.warn('Recast check not yet implemented');
    return false;
  } catch (error) {
    console.error('Failed to check recast:', error);
    return false;
  }
}
