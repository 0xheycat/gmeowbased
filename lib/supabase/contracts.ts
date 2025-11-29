/**
 * Supabase Contract Tracking - Replaces RPC-based counting
 * 
 * Purpose: Store and query deployed contracts efficiently
 * Benefits:
 * - Faster queries (database vs RPC)
 * - Reliable data (no Etherscan API limits)
 * - Historical tracking
 * - Cross-chain aggregation
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type UserContract = {
  id: number
  user_address: string
  fid: number | null
  contract_address: string
  chain_id: number
  chain_key: string
  deployed_at: string | null
  deployment_tx: string | null
  creator_address: string | null
  contract_name: string | null
  is_verified: boolean
  created_at: string
  updated_at: string
}

export type FeaturedContract = {
  contract_address: string
  creator_address: string | null
  deployment_tx: string | null
  deployed_at: string | null
  contract_name: string | null
  is_verified: boolean
}

/**
 * Get contract count for user (with optional chain filter)
 */
export async function getUserContractCount(
  userAddress: string,
  chainKey?: string
): Promise<number> {
  try {
    const { data, error } = await supabase
      .rpc('get_user_contract_count', {
        p_user_address: userAddress.toLowerCase(),
        p_chain_key: chainKey || null,
      })

    if (error) {
      console.error('[getUserContractCount] Supabase error:', error)
      return 0
    }

    return Number(data) || 0
  } catch (err) {
    console.error('[getUserContractCount] Exception:', err)
    return 0
  }
}

/**
 * Get featured contract (most recent) for user on specific chain
 */
export async function getUserFeaturedContract(
  userAddress: string,
  chainKey: string
): Promise<FeaturedContract | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_user_featured_contract', {
        p_user_address: userAddress.toLowerCase(),
        p_chain_key: chainKey,
      })

    if (error) {
      console.error('[getUserFeaturedContract] Supabase error:', error)
      return null
    }

    if (!data || data.length === 0) return null

    return data[0] as FeaturedContract
  } catch (err) {
    console.error('[getUserFeaturedContract] Exception:', err)
    return null
  }
}

/**
 * Upsert user contract (idempotent)
 */
export async function upsertUserContract(params: {
  userAddress: string
  fid?: number
  contractAddress: string
  chainId: number
  chainKey: string
  deployedAt?: Date
  deploymentTx?: string
  creatorAddress?: string
  contractName?: string
  isVerified?: boolean
}): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .rpc('upsert_user_contract', {
        p_user_address: params.userAddress.toLowerCase(),
        p_fid: params.fid || null,
        p_contract_address: params.contractAddress.toLowerCase(),
        p_chain_id: params.chainId,
        p_chain_key: params.chainKey,
        p_deployed_at: params.deployedAt?.toISOString() || null,
        p_deployment_tx: params.deploymentTx || null,
        p_creator_address: params.creatorAddress?.toLowerCase() || null,
        p_contract_name: params.contractName || null,
        p_is_verified: params.isVerified || false,
      })

    if (error) {
      console.error('[upsertUserContract] Supabase error:', error)
      return null
    }

    return Number(data) || null
  } catch (err) {
    console.error('[upsertUserContract] Exception:', err)
    return null
  }
}

/**
 * Get all contracts for user (paginated)
 */
export async function getUserContracts(
  userAddress: string,
  options?: {
    chainKey?: string
    limit?: number
    offset?: number
  }
): Promise<UserContract[]> {
  try {
    let query = supabase
      .from('user_contracts')
      .select('*')
      .eq('user_address', userAddress.toLowerCase())
      .order('deployed_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (options?.chainKey) {
      query = query.eq('chain_key', options.chainKey)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error('[getUserContracts] Supabase error:', error)
      return []
    }

    return (data || []) as UserContract[]
  } catch (err) {
    console.error('[getUserContracts] Exception:', err)
    return []
  }
}

/**
 * Batch insert contracts (for migration/backfill)
 */
export async function batchUpsertContracts(
  contracts: Array<{
    userAddress: string
    fid?: number
    contractAddress: string
    chainId: number
    chainKey: string
    deployedAt?: Date
    deploymentTx?: string
    creatorAddress?: string
  }>
): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  // Process in chunks of 50 to avoid rate limits
  const CHUNK_SIZE = 50
  for (let i = 0; i < contracts.length; i += CHUNK_SIZE) {
    const chunk = contracts.slice(i, i + CHUNK_SIZE)
    
    const results = await Promise.allSettled(
      chunk.map((c) => upsertUserContract(c))
    )

    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        success++
      } else {
        failed++
      }
    })

    // Small delay between chunks
    if (i + CHUNK_SIZE < contracts.length) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  return { success, failed }
}
