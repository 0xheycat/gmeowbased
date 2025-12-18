/**
 * GM System Queries
 * Phase: Frame Migration - GM Frame
 * 
 * Supabase queries for GM streak calculations and history.
 * Works in tandem with Subsquid for blockchain event data.
 * 
 * Architecture:
 * - Supabase: FID → wallet mapping, user profiles
 * - Subsquid: GM events, streak calculations (95% of work)
 */

import { getSupabaseServerClient } from '@/lib/supabase';

// Toggle for development/testing
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_GM === 'true' || false;

/**
 * Get user wallet address from FID
 * This is the PRIMARY Supabase query for GM frame.
 * Subsquid handles all blockchain data.
 */
export async function getWalletFromFid(fid: number): Promise<string | null> {
  if (USE_MOCK_DATA) {
    console.log('[getWalletFromFid] Using mock data');
    return '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  }

  const supabase = getSupabaseServerClient();
  
  if (!supabase) {
    console.error('[getWalletFromFid] Supabase client not available');
    return null;
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('wallet_address')
    .eq('fid', fid)
    .single();

  if (error) {
    console.error('[getWalletFromFid] Error:', error);
    return null;
  }

  return data?.wallet_address || null;
}

/**
 * Get FID from wallet address (reverse lookup)
 */
export async function getFidFromWallet(walletAddress: string): Promise<number | null> {
  if (USE_MOCK_DATA) {
    console.log('[getFidFromWallet] Using mock data');
    return 12345;
  }

  const supabase = getSupabaseServerClient();
  
  if (!supabase) {
    console.error('[getFidFromWallet] Supabase client not available');
    return null;
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('fid')
    .eq('wallet_address', walletAddress.toLowerCase())
    .single();

  if (error) {
    console.error('[getFidFromWallet] Error:', error);
    return null;
  }

  return data?.fid || null;
}

/**
 * @deprecated Phase 8.4: Use getUserProfile from @/lib/supabase/queries/user instead
 * This function is a duplicate and will be removed in future versions.
 * 
 * Get user profile metadata
 * Used for display name, avatar, etc. in frames
 */
export async function getUserProfile(fid: number) {
  console.warn('[DEPRECATED] gm.ts getUserProfile is deprecated. Use @/lib/supabase/queries/user instead');
  
  if (USE_MOCK_DATA) {
    console.log('[getUserProfile] Using mock data');
    return {
      fid,
      username: 'mockuser',
      display_name: 'Mock User',
      pfp_url: 'https://i.imgur.com/mockpfp.png',
      wallet_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    };
  }

  const supabase = getSupabaseServerClient();
  
  if (!supabase) {
    console.error('[getUserProfile] Supabase client not available');
    return null;
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('fid, username, display_name, pfp_url, wallet_address')
    .eq('fid', fid)
    .single();

  if (error) {
    console.error('[getUserProfile] Error:', error);
    return null;
  }

  return data;
}

/**
 * Update user's last GM timestamp
 * Called after successful GM transaction
 */
export async function updateLastGMTimestamp(fid: number, timestamp: string): Promise<boolean> {
  if (USE_MOCK_DATA) {
    console.log('[updateLastGMTimestamp] Mock mode, skipping update');
    return true;
  }

  const supabase = getSupabaseServerClient();
  
  if (!supabase) {
    console.error('[updateLastGMTimestamp] Supabase client not available');
    return false;
  }

  // Note: last_gm_at tracking moved to miniapp_notification_tokens table
  // This is a no-op for backwards compatibility
  const { error } = null as any;
  // TODO: Update miniapp_notification_tokens.last_gm_reference_at if needed

  if (error) {
    console.error('[updateLastGMTimestamp] Error:', error);
    return false;
  }

  return true;
}

/**
 * Batch lookup: Get wallet addresses for multiple FIDs
 * Used for leaderboard display
 */
export async function getWalletsFromFids(fids: number[]): Promise<Map<number, string>> {
  if (USE_MOCK_DATA) {
    console.log('[getWalletsFromFids] Using mock data');
    const mockMap = new Map<number, string>();
    fids.forEach((fid, idx) => {
      mockMap.set(fid, `0x${idx.toString().padStart(40, '0')}`);
    });
    return mockMap;
  }

  const supabase = getSupabaseServerClient();
  
  if (!supabase) {
    console.error('[getWalletsFromFids] Supabase client not available');
    return new Map();
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('fid, wallet_address')
    .in('fid', fids);

  if (error) {
    console.error('[getWalletsFromFids] Error:', error);
    return new Map();
  }

  const walletMap = new Map<number, string>();
  data?.forEach((row) => {
    if (row.fid && row.wallet_address) {
      walletMap.set(row.fid, row.wallet_address);
    }
  });

  return walletMap;
}

/**
 * Check if user has profile in database
 * Used for onboarding flow
 */
export async function hasUserProfile(fid: number): Promise<boolean> {
  if (USE_MOCK_DATA) {
    return true;
  }

  const supabase = getSupabaseServerClient();
  
  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('fid')
    .eq('fid', fid)
    .single();

  return !error && data !== null;
}

/**
 * Create user profile (called during onboarding)
 */
export async function createUserProfile(params: {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  wallet_address: string;
}): Promise<boolean> {
  if (USE_MOCK_DATA) {
    console.log('[createUserProfile] Mock mode, skipping insert');
    return true;
  }

  const supabase = getSupabaseServerClient();
  
  if (!supabase) {
    console.error('[createUserProfile] Supabase client not available');
    return false;
  }

  const { error } = await supabase
    .from('user_profiles')
    .insert({
      fid: params.fid,
      username: params.username,
      display_name: params.display_name,
      pfp_url: params.pfp_url,
      wallet_address: params.wallet_address.toLowerCase(),
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error('[createUserProfile] Error:', error);
    return false;
  }

  return true;
}

// ============================================================================
// LEGACY QUERIES (for backward compatibility during migration)
// These will be removed after Phase 3
// ============================================================================

/**
 * @deprecated Use Subsquid getGMStats() instead
 * Legacy query for gmeow_rank_events table
 */
export async function getLegacyGMEvents(fid: number, limit = 30) {
  console.warn('[getLegacyGMEvents] DEPRECATED - Use Subsquid getGMStats() instead');
  
  const supabase = getSupabaseServerClient();
  
  if (!supabase) {
    return [];
  }

  // ⚠️ TODO: Replace with Subsquid getGMRankEvents()
  const { data, error } = await supabase
    .from('gmeow_rank_events')
    .select('*')
    .eq('fid', fid)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[getLegacyGMEvents] Error:', error);
    return [];
  }

  return data || [];
}
