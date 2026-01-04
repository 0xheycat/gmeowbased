/**
 * Neynar Wallet Sync Utility
 * 
 * Fetches and syncs multi-wallet configuration from Neynar API
 * Updates user_profiles with custody_address and verified_addresses
 * 
 * Usage:
 *   import { syncWalletsFromNeynar } from '@/lib/integrations/neynar-wallet-sync'
 *   await syncWalletsFromNeynar(fid)
 */

import { createClient } from '@/lib/supabase/edge'

interface NeynarWalletData {
  custody_address: string | null
  verified_addresses: string[]
}

/**
 * Fetch wallet addresses from Neynar API
 */
async function fetchNeynarWallets(fid: number): Promise<NeynarWalletData | null> {
  const apiKey = process.env.NEYNAR_API_KEY
  if (!apiKey) {
    console.error('[syncWalletsFromNeynar] Missing NEYNAR_API_KEY')
    return null
  }

  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      {
        headers: {
          'accept': 'application/json',
          'api_key': apiKey,
        },
      }
    )

    if (!response.ok) {
      console.error('[syncWalletsFromNeynar] Neynar API error:', response.status)
      return null
    }

    const data = await response.json()
    const user = data.users?.[0]
    
    if (!user) {
      console.error('[syncWalletsFromNeynar] User not found for FID:', fid)
      return null
    }

    return {
      custody_address: user.custody_address || null,
      verified_addresses: user.verified_addresses?.eth_addresses || [],
    }
  } catch (error) {
    console.error('[syncWalletsFromNeynar] Error fetching from Neynar:', error)
    return null
  }
}

/**
 * Sync wallet addresses from Neynar to database
 * 
 * @param fid - Farcaster ID
 * @param forceUpdate - Force update even if profile exists
 * @param connectedAddress - The currently connected wallet address (optional, uses this as primary if provided)
 * @returns Updated wallet data or null on error
 */
export async function syncWalletsFromNeynar(
  fid: number,
  forceUpdate: boolean = false,
  connectedAddress?: string
): Promise<NeynarWalletData | null> {
  const supabase = createClient()
  if (!supabase) {
    console.error('[syncWalletsFromNeynar] Supabase client unavailable')
    return null
  }

  // Fetch from Neynar
  const walletData = await fetchNeynarWallets(fid)
  if (!walletData) return null

  // Get primary wallet with priority:
  // 1. Connected wallet (if provided and verified)
  // 2. First verified address
  // 3. Custody address
  let primaryWallet: string | null
  
  if (connectedAddress) {
    const normalizedConnected = connectedAddress.toLowerCase()
    const normalizedVerified = walletData.verified_addresses.map(addr => addr.toLowerCase())
    const normalizedCustody = walletData.custody_address?.toLowerCase()
    
    // Use connected wallet if it's verified or is the custody address
    if (normalizedVerified.includes(normalizedConnected) || normalizedConnected === normalizedCustody) {
      primaryWallet = connectedAddress
      console.log('[syncWalletsFromNeynar] Using connected wallet as primary:', connectedAddress)
    } else {
      // Fallback to first verified or custody
      primaryWallet = walletData.verified_addresses[0] || walletData.custody_address
      console.warn('[syncWalletsFromNeynar] Connected wallet not verified, using fallback:', primaryWallet)
    }
  } else {
    // No connected wallet provided, use first verified or custody
    primaryWallet = walletData.verified_addresses[0] || walletData.custody_address
  }

  // Update database
  const { error } = await supabase
    .from('user_profiles')
    .upsert(
      {
        fid,
        wallet_address: primaryWallet,
        custody_address: walletData.custody_address,
        verified_addresses: walletData.verified_addresses.length > 0 
          ? walletData.verified_addresses 
          : null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'fid',
        ignoreDuplicates: !forceUpdate,
      }
    )

  if (error) {
    console.error('[syncWalletsFromNeynar] Database update error:', error)
    return null
  }

  console.log(`[syncWalletsFromNeynar] ✅ Synced ${walletData.verified_addresses.length + 1} wallets for FID ${fid}`)
  return walletData
}

/**
 * Sync wallets for multiple FIDs in batch
 */
export async function syncMultipleWallets(fids: number[]): Promise<void> {
  console.log(`[syncMultipleWallets] Starting sync for ${fids.length} FIDs...`)
  
  const results = await Promise.allSettled(
    fids.map(fid => syncWalletsFromNeynar(fid, false))
  )

  const successful = results.filter(r => r.status === 'fulfilled' && r.value !== null).length
  const failed = results.length - successful

  console.log(`[syncMultipleWallets] Complete: ${successful} success, ${failed} failed`)
}

/**
 * Get all wallet addresses for a FID (from database)
 * Returns unique list of all wallets (primary, custody, verified)
 */
export async function getAllWalletsForFID(fid: number): Promise<string[]> {
  const supabase = createClient()
  if (!supabase) return []

  const { data } = await supabase
    .from('user_profiles')
    .select('wallet_address, custody_address, verified_addresses')
    .eq('fid', fid)
    .single()

  if (!data) return []

  const wallets: string[] = []
  if (data.wallet_address) wallets.push(data.wallet_address.toLowerCase())
  if (data.custody_address) wallets.push(data.custody_address.toLowerCase())
  if (data.verified_addresses && Array.isArray(data.verified_addresses)) {
    wallets.push(...data.verified_addresses.map((addr: string) => addr.toLowerCase()))
  }

  // Remove duplicates
  return [...new Set(wallets)]
}
