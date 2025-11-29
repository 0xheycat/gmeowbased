import { decodeEventLog } from 'viem'
import { getPublicClient } from 'wagmi/actions'
import { wagmiConfig } from '@/lib/wagmi'
import { CHAIN_IDS, type GMChainKey, GM_CONTRACT_ABI, getContractAddress } from '@/lib/gmeow-utils'

export type TeamSummary = {
  chain: GMChainKey
  teamId: number // guildId
  name: string
  founder: string // mapped from guild leader
  totalPoints: number
  founderBonus: number // not in ABI; kept for compatibility -> 0
  memberCount: number
  pfp?: string | null // not in ABI
  bio?: string | null // not in ABI
}

export function buildGuildSlug(name: string | null | undefined, teamId: number): string {
  const safeId = Number.isFinite(teamId) && teamId > 0 ? teamId : 0
  const base = (name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const slugBody = base || 'guild'
  return `${slugBody}-${safeId || '0'}`
}

export function extractTeamIdFromSlug(slug: string | null | undefined): number | null {
  if (!slug) return null
  const parts = slug.split('-').filter(Boolean)
  if (!parts.length) return null
  const last = parts[parts.length - 1]
  const id = Number.parseInt(last, 10)
  if (!Number.isFinite(id) || id <= 0) return null
  return id
}

const DEPLOY_BLOCKS: Partial<Record<GMChainKey, bigint>> = {
  base: envBig('NEXT_PUBLIC_DEPLOY_BLOCK_BASE'),
  unichain: envBig('NEXT_PUBLIC_DEPLOY_BLOCK_UNICHAIN'),
  celo: envBig('NEXT_PUBLIC_DEPLOY_BLOCK_CELO'),
  ink: envBig('NEXT_PUBLIC_DEPLOY_BLOCK_INK'),
  op: envBig('NEXT_PUBLIC_DEPLOY_BLOCK_OP'),
  arbitrum: envBig('NEXT_PUBLIC_DEPLOY_BLOCK_ARBITRUM'),
}

function envBig(k: string): bigint | undefined {
  const v = process.env[k]
  return v && /^\d+$/.test(v) ? BigInt(v) : undefined
}

type WagmiChainId = (typeof wagmiConfig)['chains'][number]['id']

// get "team" summary using guilds(...) view
export async function getTeamSummary(chain: GMChainKey, teamId: number): Promise<TeamSummary> {
  const chainId = CHAIN_IDS[chain] as WagmiChainId
  const client = getPublicClient(wagmiConfig, { chainId })
  const address = getContractAddress(chain)

  const rpcTimeout = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 10000))
    ])

  // guilds(guildId) -> (name, leader, totalPoints, memberCount, active, level)
  const g = await rpcTimeout(
    client.readContract({
      address,
      abi: GM_CONTRACT_ABI,
      functionName: 'guilds',
      args: [BigInt(teamId)],
    }),
    null
  )
  if (!g) throw new Error('Guild read timeout')

  const name = (g as any)[0] as string
  const leader = (g as any)[1] as string
  const totalPoints = Number(((g as any)[2] as bigint) ?? 0n)
  const memberCount = Number(((g as any)[3] as bigint) ?? 0n)

  return {
    chain,
    teamId,
    name,
    founder: leader,
    totalPoints,
    founderBonus: 0, // not present in ABI
    memberCount,
    pfp: null,
    bio: null,
  }
}

export const getTeamSummaryClient = getTeamSummary

// Build member list from GuildJoined/GuildLeft logs
export async function getTeamMembersClient(
  chain: GMChainKey,
  teamId: number,
  limit = 50,
  offset = 0,
): Promise<{ address: string; points: bigint; pct: number }[]> {
  const chainId = CHAIN_IDS[chain] as WagmiChainId
  const client = getPublicClient(wagmiConfig, { chainId })
  const address = getContractAddress(chain)
  const fromBlock = DEPLOY_BLOCKS[chain] ?? 0n

  const rpcTimeout = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 10000))
    ])

  // Pull logs and reconstruct current members
  const rawLogs = await rpcTimeout(
    client.getLogs({ address, fromBlock, toBlock: 'latest' } as any),
    []
  )

  type Evt = {
    name: string
    teamId?: bigint
    member?: string
    blockNumber: bigint
    logIndex: number
  }

  const evts: Evt[] = []
  for (const lg of rawLogs as any[]) {
    try {
      const parsed = decodeEventLog({ abi: GM_CONTRACT_ABI as any, data: lg.data, topics: lg.topics }) as any
      if (parsed.eventName === 'GuildJoined' || parsed.eventName === 'GuildLeft') {
        const args: any = parsed.args || {}
        const e: Evt = {
          name: parsed.eventName,
          teamId: (args.guildId ?? args.guildID ?? args._guildId) as bigint | undefined,
          member: (args.member as string | undefined) ?? undefined,
          blockNumber: lg.blockNumber as bigint,
          logIndex: Number(lg.logIndex ?? 0),
        }
        if (e.teamId === BigInt(teamId)) evts.push(e)
      }
    } catch {
      // ignore non-guild logs
    }
  }

  evts.sort((a, b) =>
    a.blockNumber === b.blockNumber ? a.logIndex - b.logIndex : a.blockNumber < b.blockNumber ? -1 : 1,
  )

  const current = new Set<string>()
  for (const e of evts) {
    if (e.name === 'GuildJoined' && e.member) current.add(e.member.toLowerCase())
    if (e.name === 'GuildLeft' && e.member) current.delete(e.member.toLowerCase())
  }

  const addrs = Array.from(current).slice(offset, offset + limit)
  if (!addrs.length) return []

  // Get guild total points
  let guildTotal = 0n
  try {
    const g = await rpcTimeout(
      client.readContract({ address, abi: GM_CONTRACT_ABI, functionName: 'guilds', args: [BigInt(teamId)] }),
      null
    )
    guildTotal = g ? (((g as any)?.[2] as bigint) ?? 0n) : 0n
  } catch {
    guildTotal = 0n
  }

  // Multicall user stats to get their total earned points
  const calls = addrs.map((a) => ({ address, abi: GM_CONTRACT_ABI, functionName: 'getUserStats' as const, args: [a as `0x${string}`] }))
  let res: any[] = []
  try {
    res = await rpcTimeout(client.multicall({ contracts: calls }), [])
  } catch {
    // fallback if multicall not supported
    res = await Promise.all(
      calls.map((c) =>
        rpcTimeout(
          client
            .readContract(c as any)
            .then((r) => ({ result: r }))
            .catch(() => ({ result: null })),
          { result: null }
        ),
      ),
    )
  }

  const rows = addrs.map((addr, i) => {
    const r = res[i]?.result
    // getUserStats(user) -> (availablePoints, lockedPoints, totalEarned)
    const pts = r ? ((r as any)[2] as bigint) : 0n
    const pct = guildTotal > 0n ? Number((pts * 10000n) / guildTotal) / 100 : 0
    return { address: addr, points: pts, pct }
  })

  rows.sort((a, b) => (a.points === b.points ? 0 : a.points < b.points ? 1 : -1))
  return rows
}