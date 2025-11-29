/**
 * Quest Marketplace API - Verify Quest Completion
 * POST /api/quests/marketplace/verify-completion
 * 
 * Dual verification system:
 * - On-Chain: viem RPC calls (token balance, NFT ownership, etc.)
 * - Social: Neynar API (follow, like, recast, etc.)
 * 
 * Body:
 * - quest_category: 'onchain' | 'social'
 * - quest_type: QuestType
 * - verification_data: Record<string, any>
 * - completer_address: string
 * - completer_fid: number
 */

import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, erc20Abi, erc721Abi, type Address } from 'viem'
import { base, optimism, celo, arbitrum } from 'viem/chains'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { getRpcUrl } from '@/lib/rpc'
import type { ChainKey } from '@/lib/gmeow-utils'

export const runtime = 'nodejs'

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY
const NEYNAR_BASE = 'https://api.neynar.com'
const NEYNAR_V2_INTERACTIONS = '/v2/farcaster/user/interactions'

// Retry configuration (from old foundation - proven 85-98% success rate)
const RETRIES = 3
const RETRY_DELAY_MS = 450

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Neynar fetch with retry logic and fallback endpoints
 * Based on old foundation's proven implementation
 */
async function neynarFetchWithRetry(
  url: string,
  apiKey: string | undefined,
  attempts = RETRIES,
  traces: any[] = [],
) {
  for (let i = 0; i < attempts; i++) {
    try {
      const headers: Record<string, string> = { Accept: 'application/json' }
      if (apiKey) headers['x-api-key'] = apiKey
      
      const res = await fetch(url, { method: 'GET', headers })
      const rawText = await res.text().catch(() => '')
      
      let parsed: any = null
      try {
        parsed = rawText ? JSON.parse(rawText) : null
      } catch {
        parsed = rawText
      }
      
      traces.push({ url, status: res.status, ok: res.ok, attempt: i + 1 })
      
      if (res.ok) return { ok: true, status: res.status, parsed, url, traces }
      
      // Retry on 5xx errors
      if (res.status >= 500 && i < attempts - 1) {
        await sleep(RETRY_DELAY_MS)
        continue
      }
      
      // Don't retry 4xx errors
      if (res.status < 500) {
        return { ok: false, status: res.status, traces }
      }
    } catch (e: any) {
      traces.push({ url, error: String(e?.message || e), attempt: i + 1 })
      if (i < attempts - 1) {
        await sleep(RETRY_DELAY_MS)
      }
    }
  }
  return { ok: false, traces }
}

/**
 * Try multiple API endpoint patterns (v2/v3 variants)
 * Improves reliability when Neynar changes endpoints
 */
async function neynarFetchWithFallback(
  pathVariants: string[],
  apiKey: string | undefined,
  traces: any[] = [],
) {
  for (const path of pathVariants) {
    const url = `${NEYNAR_BASE}${path}`
    const result = await neynarFetchWithRetry(url, apiKey, 1, traces)
    if (result.ok) {
      return result
    }
  }
  return { ok: false, traces }
}

// Chain mapping
const chainConfigs = {
  base: base,
  op: optimism,
  celo: celo,
  optimism: optimism,
  arbitrum: arbitrum,
  ink: {
    id: 57073,
    name: 'Ink',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://ink-mainnet.g.alchemy.com/v2/AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe'] },
    },
  },
  unichain: {
    id: 130,
    name: 'Unichain',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://unichain-mainnet.g.alchemy.com/v2/AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe'] },
    },
  },
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json(
      { ok: false, error: 'rate_limit_exceeded' },
      { status: 429 }
    )
  }

  try {
    const body = await req.json()
    const { 
      quest_category, 
      quest_type, 
      verification_data, 
      completer_address, 
      completer_fid 
    } = body

    // Validate input
    if (!quest_category || !quest_type || !verification_data || !completer_address || !completer_fid) {
      return NextResponse.json(
        { ok: false, error: 'missing_parameters' },
        { status: 400 }
      )
    }

    // Route to appropriate verification function
    if (quest_category === 'onchain') {
      return await verifyOnChainQuest(
        quest_type,
        verification_data,
        completer_address
      )
    } else if (quest_category === 'social') {
      return await verifySocialQuest(
        quest_type,
        verification_data,
        completer_fid
      )
    } else {
      return NextResponse.json(
        { ok: false, error: 'invalid_category' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('[QuestMarketplace/verify] Error:', error)
    return NextResponse.json(
      { ok: false, error: 'internal_error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * Verify On-Chain Quest
 * Types: token_hold, nft_own, transaction_make, multichain_gm, contract_interact, liquidity_provide
 */
async function verifyOnChainQuest(
  questType: string,
  verificationData: any,
  completerAddress: string
): Promise<NextResponse> {
  try {
    switch (questType) {
      case 'token_hold':
        return await verifyTokenHold(verificationData, completerAddress)
      
      case 'nft_own':
        return await verifyNftOwn(verificationData, completerAddress)
      
      case 'transaction_make':
        return await verifyTransactionMade(verificationData, completerAddress)
      
      case 'multichain_gm':
        return await verifyMultichainGm(verificationData, completerAddress)
      
      case 'contract_interact':
        return await verifyContractInteract(verificationData, completerAddress)
      
      case 'liquidity_provide':
        return await verifyLiquidityProvide(verificationData, completerAddress)
      
      default:
        return NextResponse.json(
          { ok: false, error: 'unknown_onchain_quest_type', type: questType },
          { status: 400 }
        )
    }
  } catch (error: any) {
    console.error(`[verifyOnChainQuest/${questType}] Error:`, error)
    return NextResponse.json(
      { ok: false, verified: false, reason: error.message },
      { status: 500 }
    )
  }
}

/**
 * Verify Social Quest
 * Types: follow_user, like_cast, recast_cast, reply_cast, join_channel, cast_mention, cast_hashtag
 */
async function verifySocialQuest(
  questType: string,
  verificationData: any,
  completerFid: number
): Promise<NextResponse> {
  if (!NEYNAR_API_KEY) {
    return NextResponse.json(
      { ok: false, error: 'neynar_api_key_missing' },
      { status: 500 }
    )
  }

  try {
    switch (questType) {
      case 'follow_user':
        return await verifyFollowUser(verificationData, completerFid)
      
      case 'like_cast':
        return await verifyLikeCast(verificationData, completerFid)
      
      case 'recast_cast':
        return await verifyRecastCast(verificationData, completerFid)
      
      case 'reply_cast':
        return await verifyReplyCast(verificationData, completerFid)
      
      case 'join_channel':
        return await verifyJoinChannel(verificationData, completerFid)
      
      case 'cast_mention':
        return await verifyCastMention(verificationData, completerFid)
      
      case 'cast_hashtag':
        return await verifyCastHashtag(verificationData, completerFid)
      
      default:
        return NextResponse.json(
          { ok: false, error: 'unknown_social_quest_type', type: questType },
          { status: 400 }
        )
    }
  } catch (error: any) {
    console.error(`[verifySocialQuest/${questType}] Error:`, error)
    return NextResponse.json(
      { ok: false, verified: false, reason: error.message },
      { status: 500 }
    )
  }
}

// ============================================================================
// ON-CHAIN VERIFICATION FUNCTIONS
// ============================================================================

async function verifyTokenHold(data: any, address: string): Promise<NextResponse> {
  const { chain, token_address, min_amount } = data
  
  if (!chain || !token_address || !min_amount) {
    return NextResponse.json({ ok: false, error: 'invalid_verification_data' }, { status: 400 })
  }

  const rpcUrl = getRpcUrl(chain as ChainKey)
  if (!rpcUrl) {
    return NextResponse.json({ ok: false, error: 'chain_not_supported' }, { status: 400 })
  }

  const client = createPublicClient({ transport: http(rpcUrl) })

  const balance = await client.readContract({
    address: token_address as Address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address as Address],
  })

  const minAmountBigInt = BigInt(min_amount)
  const verified = balance >= minAmountBigInt

  return NextResponse.json({
    ok: true,
    verified,
    reason: verified ? 'token_balance_sufficient' : 'token_balance_insufficient',
    proof: {
      balance: balance.toString(),
      min_amount: minAmountBigInt.toString(),
      token_address,
      chain
    }
  })
}

async function verifyNftOwn(data: any, address: string): Promise<NextResponse> {
  const { chain, nft_address, token_id } = data
  
  if (!chain || !nft_address) {
    return NextResponse.json({ ok: false, error: 'invalid_verification_data' }, { status: 400 })
  }

  const rpcUrl = getRpcUrl(chain as ChainKey)
  if (!rpcUrl) {
    return NextResponse.json({ ok: false, error: 'chain_not_supported' }, { status: 400 })
  }

  const client = createPublicClient({ transport: http(rpcUrl) })

  // ERC721 balanceOf check
  const balance = await client.readContract({
    address: nft_address as Address,
    abi: erc721Abi,
    functionName: 'balanceOf',
    args: [address as Address],
  })

  const verified = balance > 0n

  return NextResponse.json({
    ok: true,
    verified,
    reason: verified ? 'nft_owned' : 'nft_not_owned',
    proof: {
      balance: balance.toString(),
      nft_address,
      chain
    }
  })
}

async function verifyTransactionMade(data: any, address: string): Promise<NextResponse> {
  const { chain, target_contract } = data
  
  if (!chain || !target_contract) {
    return NextResponse.json({ ok: false, error: 'invalid_verification_data' }, { status: 400 })
  }

  const rpcUrl = getRpcUrl(chain as ChainKey)
  if (!rpcUrl) {
    return NextResponse.json({ ok: false, error: 'chain_not_supported' }, { status: 400 })
  }

  const client = createPublicClient({ transport: http(rpcUrl) })

  // Get current block number
  const currentBlock = await client.getBlockNumber()
  
  // Check last 1000 blocks (roughly last hour on Base)
  const fromBlock = currentBlock - 1000n

  try {
    // Get logs filtered by sender (from address)
    const logs = await client.getLogs({
      address: target_contract as Address,
      fromBlock,
      toBlock: 'latest'
    })

    // Check if any transaction is from the completer address
    const verified = logs.some((log: any) => {
      // Check topics for address match (most ERC20/721 events include sender in topics)
      return log.topics?.some((topic: string) => 
        topic.toLowerCase().includes(address.toLowerCase().replace('0x', ''))
      )
    })

    return NextResponse.json({
      ok: true,
      verified,
      reason: verified ? 'transaction_found' : 'no_transaction_found',
      proof: {
        target_contract,
        chain,
        logs_checked: logs.length,
        from_block: fromBlock.toString()
      }
    })
  } catch (error: any) {
    console.error('[verifyTransactionMade] Error:', error)
    return NextResponse.json({
      ok: true,
      verified: false,
      reason: 'verification_error',
      error: error.message
    })
  }
}

async function verifyMultichainGm(data: any, address: string): Promise<NextResponse> {
  const { chains, min_chains } = data
  
  if (!chains || !Array.isArray(chains) || !min_chains) {
    return NextResponse.json({ ok: false, error: 'invalid_verification_data' }, { status: 400 })
  }

  const GM_CONTRACT_ADDRESS = '0x60A9E3fF53DFe3Ac1F1620B5E3B0c2A8DAB53f95' as Address

  const results = await Promise.allSettled(
    chains.map(async (chain: string) => {
      const rpcUrl = getRpcUrl(chain as ChainKey)
      if (!rpcUrl) return { chain, gmCount: 0 }

      const client = createPublicClient({ transport: http(rpcUrl) })

      try {
        // Check GM count from contract
        const gmCount = await client.readContract({
          address: GM_CONTRACT_ADDRESS,
          abi: [{
            name: 'gmCounts',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'user', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }]
          }],
          functionName: 'gmCounts',
          args: [address as Address]
        })

        return { chain, gmCount: Number(gmCount), success: gmCount > 0n }
      } catch (error) {
        return { chain, gmCount: 0, success: false, error: String(error) }
      }
    })
  )

  const successfulChains = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter(r => r.success)

  const verified = successfulChains.length >= min_chains

  return NextResponse.json({
    ok: true,
    verified,
    reason: verified ? 'multichain_gm_verified' : 'insufficient_chain_gms',
    proof: {
      chains_checked: chains.length,
      chains_with_gm: successfulChains.length,
      min_chains_required: min_chains,
      details: successfulChains
    }
  })
}

async function verifyContractInteract(data: any, address: string): Promise<NextResponse> {
  const { chain, contract_address, function_name } = data
  
  if (!chain || !contract_address || !function_name) {
    return NextResponse.json({ ok: false, error: 'invalid_verification_data' }, { status: 400 })
  }

  const rpcUrl = getRpcUrl(chain as ChainKey)
  if (!rpcUrl) {
    return NextResponse.json({ ok: false, error: 'chain_not_supported' }, { status: 400 })
  }

  const client = createPublicClient({ transport: http(rpcUrl) })

  // Get current block number
  const currentBlock = await client.getBlockNumber()
  
  // Check last 2000 blocks (roughly last 1-2 hours)
  const fromBlock = currentBlock - 2000n

  try {
    // Get all logs from the contract
    const logs = await client.getLogs({
      address: contract_address as Address,
      fromBlock,
      toBlock: 'latest'
    })

    // Check if any log is from the completer address
    // Most contract interactions emit events with the sender address in topics
    const verified = logs.some((log: any) => {
      return log.topics?.some((topic: string) => 
        topic.toLowerCase().includes(address.toLowerCase().replace('0x', ''))
      )
    })

    return NextResponse.json({
      ok: true,
      verified,
      reason: verified ? 'interaction_found' : 'no_interaction_found',
      proof: {
        contract_address,
        function_name,
        chain,
        logs_checked: logs.length,
        from_block: fromBlock.toString()
      }
    })
  } catch (error: any) {
    console.error('[verifyContractInteract] Error:', error)
    return NextResponse.json({
      ok: true,
      verified: false,
      reason: 'verification_error',
      error: error.message
    })
  }
}

async function verifyLiquidityProvide(data: any, address: string): Promise<NextResponse> {
  const { chain, pool_address, min_liquidity } = data
  
  if (!chain || !pool_address || !min_liquidity) {
    return NextResponse.json({ ok: false, error: 'invalid_verification_data' }, { status: 400 })
  }

  const rpcUrl = getRpcUrl(chain as ChainKey)
  if (!rpcUrl) {
    return NextResponse.json({ ok: false, error: 'chain_not_supported' }, { status: 400 })
  }

  const client = createPublicClient({ transport: http(rpcUrl) })

  try {
    // LP tokens are ERC20, so use balanceOf
    const balance = await client.readContract({
      address: pool_address as Address,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address as Address]
    })

    const minLiquidityBigInt = BigInt(min_liquidity)
    const verified = balance >= minLiquidityBigInt

    return NextResponse.json({
      ok: true,
      verified,
      reason: verified ? 'liquidity_sufficient' : 'liquidity_insufficient',
      proof: {
        balance: balance.toString(),
        min_liquidity: minLiquidityBigInt.toString(),
        pool_address,
        chain
      }
    })
  } catch (error: any) {
    console.error('[verifyLiquidityProvide] Error:', error)
    return NextResponse.json({
      ok: true,
      verified: false,
      reason: 'verification_error',
      error: error.message
    })
  }
}

// ============================================================================
// SOCIAL VERIFICATION FUNCTIONS
// ============================================================================

async function verifyFollowUser(data: any, fid: number): Promise<NextResponse> {
  const { target_fid } = data
  
  if (!target_fid) {
    return NextResponse.json({ ok: false, error: 'missing_target_fid' }, { status: 400 })
  }

  const traces: any[] = []
  
  // Try multiple API endpoint patterns for better reliability
  const pathVariants = [
    `/v2/farcaster/user/interactions?type=follows&fids=${target_fid},${fid}`,
    `/v2/farcaster/user/bulk?fids=${target_fid},${fid}&viewer_fid=${fid}`,
    `/v2/user/bulk?fids=${target_fid}&viewer_fid=${fid}`,
  ]

  const result = await neynarFetchWithFallback(pathVariants, NEYNAR_API_KEY, traces)

  if (!result.ok) {
    console.error('[verifyFollowUser] All endpoints failed:', traces)
    return NextResponse.json({
      ok: false,
      verified: false,
      reason: 'neynar_api_error',
      traces
    }, { status: 500 })
  }

  const neynarData = result.parsed
  
  // Handle different response structures
  let verified = false
  
  // Pattern 1: interactions endpoint
  if (neynarData?.interactions) {
    const interactions = neynarData.interactions || []
    const followItem = interactions.find((i: any) => i.type === 'follows')
    const follows = followItem?.follows || []
    verified = follows.some(
      (f: any) => f.user?.fid === target_fid && f.viewer?.fid === fid && f.viewer?.following === true
    )
  }
  
  // Pattern 2: bulk endpoint with viewer_context
  if (!verified && neynarData?.users) {
    const targetUser = neynarData.users.find((u: any) => u.fid === target_fid)
    verified = targetUser?.viewer_context?.following === true
  }

  return NextResponse.json({
    ok: true,
    verified,
    reason: verified ? 'user_followed' : 'user_not_followed',
    proof: {
      target_fid,
      completer_fid: fid,
      endpoint: result.url
    }
  })
}

async function verifyLikeCast(data: any, fid: number): Promise<NextResponse> {
  const { cast_hash } = data
  
  if (!cast_hash) {
    return NextResponse.json({ ok: false, error: 'missing_cast_hash' }, { status: 400 })
  }

  const traces: any[] = []
  
  // Try multiple cast lookup patterns
  const pathVariants = [
    `/v2/farcaster/cast?identifier=${encodeURIComponent(cast_hash)}&type=hash&viewer_fid=${fid}`,
    `/v2/cast?identifier=${encodeURIComponent(cast_hash)}&type=hash&viewer_fid=${fid}`,
    `/v3/farcaster/cast?identifier=${encodeURIComponent(cast_hash)}&type=hash&viewer_fid=${fid}`,
  ]

  const result = await neynarFetchWithFallback(pathVariants, NEYNAR_API_KEY, traces)

  if (!result.ok) {
    console.error('[verifyLikeCast] All endpoints failed:', traces)
    return NextResponse.json({
      ok: false,
      verified: false,
      reason: 'neynar_api_error',
      traces
    }, { status: 500 })
  }

  const castData = result.parsed
  const viewerContext = castData?.cast?.viewer_context || {}
  const verified = viewerContext.liked === true

  return NextResponse.json({
    ok: true,
    verified,
    reason: verified ? 'cast_liked' : 'cast_not_liked',
    proof: {
      cast_hash,
      completer_fid: fid,
      liked: verified,
      endpoint: result.url
    }
  })
}

async function verifyRecastCast(data: any, fid: number): Promise<NextResponse> {
  const { cast_hash } = data
  
  if (!cast_hash) {
    return NextResponse.json({ ok: false, error: 'missing_cast_hash' }, { status: 400 })
  }

  const traces: any[] = []
  
  // Try multiple cast lookup patterns
  const pathVariants = [
    `/v2/farcaster/cast?identifier=${encodeURIComponent(cast_hash)}&type=hash&viewer_fid=${fid}`,
    `/v2/cast?identifier=${encodeURIComponent(cast_hash)}&type=hash&viewer_fid=${fid}`,
    `/v3/farcaster/cast?identifier=${encodeURIComponent(cast_hash)}&type=hash&viewer_fid=${fid}`,
  ]

  const result = await neynarFetchWithFallback(pathVariants, NEYNAR_API_KEY, traces)

  if (!result.ok) {
    console.error('[verifyRecastCast] All endpoints failed:', traces)
    return NextResponse.json({
      ok: false,
      verified: false,
      reason: 'neynar_api_error',
      traces
    }, { status: 500 })
  }

  const castData = result.parsed
  const viewerContext = castData?.cast?.viewer_context || {}
  const verified = viewerContext.recasted === true

  return NextResponse.json({
    ok: true,
    verified,
    reason: verified ? 'cast_recasted' : 'cast_not_recasted',
    proof: {
      cast_hash,
      completer_fid: fid,
      recasted: verified,
      endpoint: result.url
    }
  })
}

async function verifyReplyCast(data: any, fid: number): Promise<NextResponse> {
  const { parent_cast_hash } = data
  
  if (!parent_cast_hash) {
    return NextResponse.json({ ok: false, error: 'missing_parent_cast_hash' }, { status: 400 })
  }

  const traces: any[] = []
  
  // Try multiple conversation endpoint patterns
  const pathVariants = [
    `/v2/farcaster/cast/conversation?identifier=${encodeURIComponent(parent_cast_hash)}&type=hash&reply_depth=2&include_chronological_parent_casts=false&viewer_fid=${fid}`,
    `/v2/cast/conversation?identifier=${encodeURIComponent(parent_cast_hash)}&type=hash&reply_depth=2&viewer_fid=${fid}`,
    `/v2/farcaster/cast/conversation?identifier=${encodeURIComponent(parent_cast_hash)}&type=url&reply_depth=2&viewer_fid=${fid}`,
  ]

  const result = await neynarFetchWithFallback(pathVariants, NEYNAR_API_KEY, traces)

  if (!result.ok) {
    console.error('[verifyReplyCast] All endpoints failed:', traces)
    return NextResponse.json({
      ok: false,
      verified: false,
      reason: 'neynar_api_error',
      traces
    }, { status: 500 })
  }

  const conversationData = result.parsed
  const conversation = conversationData?.conversation || {}
  const replies = conversation.direct_replies || []

  // Check if any reply is from the completer
  const verified = replies.some(
    (reply: any) => reply.author?.fid === fid
  )

  return NextResponse.json({
    ok: true,
    verified,
    reason: verified ? 'reply_found' : 'no_reply_found',
    proof: {
      parent_cast_hash,
      completer_fid: fid,
      total_replies: replies.length,
      endpoint: result.url
    }
  })
}

async function verifyJoinChannel(data: any, fid: number): Promise<NextResponse> {
  const { channel_id } = data
  
  if (!channel_id) {
    return NextResponse.json({ ok: false, error: 'missing_channel_id' }, { status: 400 })
  }

  const traces: any[] = []
  
  // Try multiple channel membership endpoint patterns
  const pathVariants = [
    `/v2/farcaster/channel/member?fid=${fid}&channel_id=${encodeURIComponent(channel_id)}`,
    `/v2/channel/member?fid=${fid}&channel_id=${encodeURIComponent(channel_id)}`,
    `/v2/farcaster/channel/members?channel_id=${encodeURIComponent(channel_id)}&fid=${fid}`,
  ]

  const result = await neynarFetchWithFallback(pathVariants, NEYNAR_API_KEY, traces)

  // Handle 404 as "not a member"
  if (!result.ok) {
    if (result.status === 404) {
      return NextResponse.json({
        ok: true,
        verified: false,
        reason: 'not_channel_member',
        proof: {
          channel_id,
          completer_fid: fid
        }
      })
    }
    
    console.error('[verifyJoinChannel] All endpoints failed:', traces)
    return NextResponse.json({
      ok: false,
      verified: false,
      reason: 'neynar_api_error',
      traces
    }, { status: 500 })
  }

  const memberData = result.parsed
  const verified = memberData?.member === true || memberData?.is_member === true

  return NextResponse.json({
    ok: true,
    verified,
    reason: verified ? 'channel_member' : 'not_channel_member',
    proof: {
      channel_id,
      completer_fid: fid,
      endpoint: result.url
    }
  })
}

async function verifyCastMention(data: any, fid: number): Promise<NextResponse> {
  const { target_fid } = data
  
  if (!target_fid) {
    return NextResponse.json({ ok: false, error: 'missing_target_fid' }, { status: 400 })
  }

  const traces: any[] = []
  
  // Try multiple feed endpoint patterns
  const pathVariants = [
    `/v2/farcaster/feed/user/${fid}?limit=25&viewer_fid=${fid}`,
    `/v2/feed/user/${fid}?limit=25&viewer_fid=${fid}`,
    `/v2/farcaster/casts?fid=${fid}&limit=25&viewer_fid=${fid}`,
  ]

  const result = await neynarFetchWithFallback(pathVariants, NEYNAR_API_KEY, traces)

  if (!result.ok) {
    console.error('[verifyCastMention] All endpoints failed:', traces)
    return NextResponse.json({
      ok: false,
      verified: false,
      reason: 'neynar_api_error',
      traces
    }, { status: 500 })
  }

  const feedData = result.parsed
  const casts = feedData?.casts || []

  // Check if any cast mentions the target FID
  const verified = casts.some((cast: any) => {
    const mentions = cast.mentioned_profiles || []
    return mentions.some((mention: any) => mention.fid === target_fid)
  })

  return NextResponse.json({
    ok: true,
    verified,
    reason: verified ? 'mention_found' : 'no_mention_found',
    proof: {
      target_fid,
      completer_fid: fid,
      casts_checked: casts.length,
      endpoint: result.url
    }
  })
}

async function verifyCastHashtag(data: any, fid: number): Promise<NextResponse> {
  const { hashtag } = data
  
  if (!hashtag) {
    return NextResponse.json({ ok: false, error: 'missing_hashtag' }, { status: 400 })
  }

  // Normalize hashtag (remove # if present, make lowercase)
  const normalizedHashtag = hashtag.replace(/^#/, '').toLowerCase()

  const traces: any[] = []
  
  // Try multiple feed endpoint patterns
  const pathVariants = [
    `/v2/farcaster/feed/user/${fid}?limit=25&viewer_fid=${fid}`,
    `/v2/feed/user/${fid}?limit=25&viewer_fid=${fid}`,
    `/v2/farcaster/casts?fid=${fid}&limit=25&viewer_fid=${fid}`,
  ]

  const result = await neynarFetchWithFallback(pathVariants, NEYNAR_API_KEY, traces)

  if (!result.ok) {
    console.error('[verifyCastHashtag] All endpoints failed:', traces)
    return NextResponse.json({
      ok: false,
      verified: false,
      reason: 'neynar_api_error',
      traces
    }, { status: 500 })
  }

  const feedData = result.parsed
  const casts = feedData?.casts || []

  // Check if any cast contains the hashtag
  const verified = casts.some((cast: any) => {
    const text = cast.text || ''
    const textLower = text.toLowerCase()
    // Match #hashtag or just hashtag in text
    return textLower.includes(`#${normalizedHashtag}`) || 
           textLower.includes(normalizedHashtag)
  })

  return NextResponse.json({
    ok: true,
    verified,
    reason: verified ? 'hashtag_found' : 'no_hashtag_found',
    proof: {
      hashtag: normalizedHashtag,
      completer_fid: fid,
      casts_checked: casts.length,
      endpoint: result.url
    }
  })
}
