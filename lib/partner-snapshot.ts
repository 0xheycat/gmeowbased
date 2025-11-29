import { performance } from 'node:perf_hooks'

import { createPublicClient, erc20Abi, erc721Abi, erc1155Abi, http } from 'viem'
import type { Address } from 'viem'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  CONTRACT_ADDRESSES,
  GM_CONTRACT_ABI,
  normalizeChainKey,
  CHAIN_KEYS,
  type GMChainKey,
  type ChainKey,
} from '@/lib/gmeow-utils'
import { fetchAggregatedRaw, type RawAggregate } from '@/lib/leaderboard-aggregator'
import { getRpcUrl } from '@/lib/rpc'

const DEFAULT_TABLE = process.env.SUPABASE_PARTNER_SNAPSHOT_TABLE || 'partner_snapshots'
const INSERT_BATCH_SIZE = 400

export type PartnerRequirementKind = 'points' | 'erc20' | 'erc721' | 'erc1155'

export type PartnerSnapshotRequirement =
  | {
      kind: 'points'
      minimum: bigint
    }
  | {
      kind: 'erc20'
      address: Address
      minimum: bigint
    }
  | {
      kind: 'erc721'
      address: Address
      minimum: bigint
    }
  | {
      kind: 'erc1155'
      address: Address
      tokenId: bigint
      minimum: bigint
    }

export type PartnerSnapshotOptions = {
  supabase: SupabaseClient
  snapshotId?: string
  partnerName: string
  chains: Array<string | ChainKey>
  requirement: PartnerSnapshotRequirement
  metadata?: Record<string, unknown>
  maxAddressesPerChain?: number
  tableName?: string
}

export type PartnerSnapshotRow = {
  snapshot_id: string
  partner: string
  chain: GMChainKey
  address: Address
  eligible: boolean
  balance: string
  requirement_kind: PartnerRequirementKind
  requirement_address: string | null
  requirement_token_id: string | null
  requirement_minimum: string
  computed_at: string
  reason: string | null
  metadata: Record<string, unknown> | null
}

export type PartnerSnapshotSummary = {
  snapshotId: string
  partner: string
  totalAddresses: number
  eligibleCount: number
  ineligibleCount: number
  chains: Record<GMChainKey, { total: number; eligible: number; ineligible: number }>
  requirement: PartnerSnapshotRequirement
  metadata?: Record<string, unknown>
  durationMs: number
}

export type PartnerSnapshotSummaryPayload = Omit<PartnerSnapshotSummary, 'requirement'> & {
  requirement:
    | { kind: 'points'; minimum: string }
    | { kind: 'erc20'; address: Address; minimum: string }
    | { kind: 'erc721'; address: Address; minimum: string }
    | { kind: 'erc1155'; address: Address; tokenId: string; minimum: string }
}

export function serializePartnerSnapshotSummary(summary: PartnerSnapshotSummary): PartnerSnapshotSummaryPayload {
  const { requirement, ...rest } = summary
  switch (requirement.kind) {
    case 'points':
      return {
        ...rest,
        requirement: { kind: 'points', minimum: requirement.minimum.toString() },
      }
    case 'erc20':
      return {
        ...rest,
        requirement: {
          kind: 'erc20',
          address: requirement.address,
          minimum: requirement.minimum.toString(),
        },
      }
    case 'erc721':
      return {
        ...rest,
        requirement: {
          kind: 'erc721',
          address: requirement.address,
          minimum: requirement.minimum.toString(),
        },
      }
    case 'erc1155':
      return {
        ...rest,
        requirement: {
          kind: 'erc1155',
          address: requirement.address,
          tokenId: requirement.tokenId.toString(),
          minimum: requirement.minimum.toString(),
        },
      }
    default: {
      const exhaustiveCheck: never = requirement
      throw new Error(`Unsupported requirement kind: ${String((exhaustiveCheck as any)?.kind ?? '')}`)
    }
  }
}

type BalanceResult = {
  balance: bigint
  eligible: boolean
  reason: string | null
}

type ClientCache = Map<GMChainKey, ReturnType<typeof createPublicClient>>

const clientCache: ClientCache = new Map()

function getClient(chain: GMChainKey) {
  const cached = clientCache.get(chain)
  if (cached) return cached
  const rpcUrl = getRpcUrl(chain)
  const client = createPublicClient({ transport: http(rpcUrl) })
  clientCache.set(chain, client)
  return client
}

async function mapWithConcurrency<T, U>(items: T[], limit: number, iteratee: (item: T, index: number) => Promise<U>): Promise<U[]> {
  if (items.length === 0) return []
  const results: U[] = new Array(items.length)
  let cursor = 0

  async function worker() {
    while (true) {
      const index = cursor++
      if (index >= items.length) break
      // eslint-disable-next-line no-await-in-loop
      results[index] = await iteratee(items[index], index)
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker())
  await Promise.all(workers)
  return results
}

async function resolvePointsBalance(chain: GMChainKey, address: Address, minimum: bigint): Promise<BalanceResult> {
  try {
    const client = getClient(chain)
    const rpcTimeout = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 10000))
      ])

    const result = await rpcTimeout(
      client.readContract({
        address: CONTRACT_ADDRESSES[chain],
        abi: GM_CONTRACT_ABI,
        functionName: 'getUserStats',
        args: [address],
      }),
      null
    )
    if (!result) return { balance: 0n, eligible: false, reason: 'points_call_timeout' }
    const [available] = result as readonly [bigint, bigint, bigint]
    const eligible = available >= minimum
    return { balance: available, eligible, reason: eligible ? null : 'insufficient_points' }
  } catch (error) {
    return { balance: 0n, eligible: false, reason: (error as Error)?.message ?? 'points_call_failed' }
  }
}

async function resolveErc20Balance(chain: GMChainKey, token: Address, user: Address, minimum: bigint): Promise<BalanceResult> {
  try {
    const client = getClient(chain)
    const rpcTimeout = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 10000))
      ])

    const balance = await rpcTimeout(
      client.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [user],
      }) as Promise<bigint>,
      0n
    )
    const eligible = balance >= minimum
    return { balance, eligible, reason: eligible ? null : 'insufficient_balance' }
  } catch (error) {
    return { balance: 0n, eligible: false, reason: (error as Error)?.message ?? 'erc20_call_failed' }
  }
}

async function resolveErc721Balance(chain: GMChainKey, token: Address, user: Address, minimum: bigint): Promise<BalanceResult> {
  try {
    const client = getClient(chain)
    const rpcTimeout = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 10000))
      ])

    const balance = await rpcTimeout(
      client.readContract({
        address: token,
        abi: erc721Abi,
        functionName: 'balanceOf',
        args: [user],
      }) as Promise<bigint>,
      0n
    )
    const eligible = balance >= minimum
    return { balance, eligible, reason: eligible ? null : 'insufficient_balance' }
  } catch (error) {
    return { balance: 0n, eligible: false, reason: (error as Error)?.message ?? 'erc721_call_failed' }
  }
}

async function resolveErc1155Balance(chain: GMChainKey, token: Address, tokenId: bigint, user: Address, minimum: bigint): Promise<BalanceResult> {
  try {
    const client = getClient(chain)
    const rpcTimeout = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 10000))
      ])

    const balance = await rpcTimeout(
      client.readContract({
        address: token,
        abi: erc1155Abi,
        functionName: 'balanceOf',
        args: [user, tokenId],
      }) as Promise<bigint>,
      0n
    )
    const eligible = balance >= minimum
    return { balance, eligible, reason: eligible ? null : 'insufficient_balance' }
  } catch (error) {
    return { balance: 0n, eligible: false, reason: (error as Error)?.message ?? 'erc1155_call_failed' }
  }
}

async function evaluateRequirement(
  chain: GMChainKey,
  address: Address,
  requirement: PartnerSnapshotRequirement,
): Promise<BalanceResult> {
  switch (requirement.kind) {
    case 'points':
      return resolvePointsBalance(chain, address, requirement.minimum)
    case 'erc20':
      return resolveErc20Balance(chain, requirement.address, address, requirement.minimum)
    case 'erc721':
      return resolveErc721Balance(chain, requirement.address, address, requirement.minimum)
    case 'erc1155':
      return resolveErc1155Balance(chain, requirement.address, requirement.tokenId, address, requirement.minimum)
    default:
      return { balance: 0n, eligible: false, reason: 'unsupported_requirement' }
  }
}

function sanitizeRequirementInput(requirement: PartnerSnapshotRequirement): PartnerSnapshotRequirement {
  if (requirement.minimum < 0n) {
    throw new Error('minimum threshold cannot be negative')
  }
  if (requirement.kind === 'erc1155' && requirement.tokenId < 0n) {
    throw new Error('tokenId cannot be negative')
  }
  return requirement
}

function asBigInt(value: string | number | bigint, label: string): bigint {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${label} must be finite`)
    return BigInt(Math.trunc(value))
  }
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`${label} cannot be empty`)
  if (/^0x[0-9a-f]+$/i.test(trimmed)) return BigInt(trimmed)
  return BigInt(trimmed)
}

export function buildRequirement(kind: PartnerRequirementKind, config: Record<string, unknown>): PartnerSnapshotRequirement {
  switch (kind) {
    case 'points':
      return sanitizeRequirementInput({ kind, minimum: asBigInt((config.minimum ?? 1) as string | number | bigint, 'minimum') })
    case 'erc20':
    case 'erc721': {
      const address = config.address as string
      if (typeof address !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
        throw new Error('Valid contract address required')
      }
      return sanitizeRequirementInput({
        kind,
        address: address as Address,
        minimum: asBigInt((config.minimum ?? 1) as string | number | bigint, 'minimum'),
      })
    }
    case 'erc1155': {
      const address = config.address as string
      if (typeof address !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
        throw new Error('Valid contract address required')
      }
      const tokenId = asBigInt((config.tokenId ?? 0) as string | number | bigint, 'tokenId')
      const minimum = asBigInt((config.minimum ?? 1) as string | number | bigint, 'minimum')
      return sanitizeRequirementInput({ kind, address: address as Address, tokenId, minimum })
    }
    default:
      throw new Error(`Unsupported requirement kind: ${String(kind)}`)
  }
}

function dedupeAddresses(rows: RawAggregate[]): Address[] {
  const set = new Set<string>()
  for (const row of rows) {
    set.add(row.address.toLowerCase())
  }
  return Array.from(set).map(addr => addr as Address)
}

export async function runPartnerSnapshot(options: PartnerSnapshotOptions): Promise<{ summary: PartnerSnapshotSummary; rows: PartnerSnapshotRow[] }> {
  const {
    supabase,
    partnerName,
    requirement,
    metadata,
    maxAddressesPerChain = Number.POSITIVE_INFINITY,
  } = options
  if (!supabase) throw new Error('Supabase client is required')

  const tableName = options.tableName || DEFAULT_TABLE
  if (!tableName) throw new Error('Partner snapshot table name is not configured')

  const start = performance.now()
  const snapshotId = options.snapshotId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const normalizedChains = options.chains
    .map(item => normalizeChainKey(item))
    .filter((value): value is GMChainKey => value != null && CHAIN_KEYS.includes(value as GMChainKey))
  if (normalizedChains.length === 0) {
    throw new Error('At least one valid GM chain is required')
  }

  const requirementConfig = sanitizeRequirementInput(requirement)
  const perChainMetrics: Record<GMChainKey, { total: number; eligible: number; ineligible: number }> = Object.create(null)
  const computedAt = new Date().toISOString()

  const evaluationInputs: Array<{ chain: GMChainKey; addresses: Address[] }> = []
  for (const chain of normalizedChains) {
    const aggregates = await fetchAggregatedRaw({ global: false, chain })
    const addresses = dedupeAddresses(aggregates.rows).slice(0, maxAddressesPerChain)
    perChainMetrics[chain] = { total: addresses.length, eligible: 0, ineligible: 0 }
    evaluationInputs.push({ chain, addresses })
  }

  const evaluationTasks: Array<Promise<Array<{ chain: GMChainKey; address: Address; result: BalanceResult }>>> = []
  for (const input of evaluationInputs) {
    const { chain, addresses } = input
    const task = mapWithConcurrency(addresses, 6, async (address) => {
      const result = await evaluateRequirement(chain, address, requirementConfig)
      return { chain, address, result }
    })
    evaluationTasks.push(task)
  }

  const evaluations = (await Promise.all(evaluationTasks)).flat()

  const rows: PartnerSnapshotRow[] = evaluations.map(({ chain, address, result }) => {
    const metrics = perChainMetrics[chain]
    if (result.eligible) metrics.eligible += 1
    else metrics.ineligible += 1
    return {
      snapshot_id: snapshotId,
      partner: partnerName,
      chain,
      address,
      eligible: result.eligible,
      balance: result.balance.toString(),
      requirement_kind: requirementConfig.kind,
      requirement_address: 'address' in requirementConfig ? requirementConfig.address : null,
      requirement_token_id: requirementConfig.kind === 'erc1155' ? requirementConfig.tokenId.toString() : null,
      requirement_minimum: requirementConfig.minimum.toString(),
      computed_at: computedAt,
      reason: result.reason,
      metadata: metadata ?? null,
    }
  })

  const { error: deleteError } = await supabase.from(tableName).delete().eq('snapshot_id', snapshotId)
  if (deleteError) {
    throw deleteError
  }

  for (let cursor = 0; cursor < rows.length; cursor += INSERT_BATCH_SIZE) {
    const batch = rows.slice(cursor, cursor + INSERT_BATCH_SIZE)
    if (batch.length === 0) continue
    const { error } = await supabase.from(tableName).insert(batch)
    if (error) {
      throw error
    }
  }

  const eligibleCount = rows.filter(row => row.eligible).length
  const durationMs = Math.round(performance.now() - start)

  const summary: PartnerSnapshotSummary = {
    snapshotId,
    partner: partnerName,
    totalAddresses: rows.length,
    eligibleCount,
    ineligibleCount: rows.length - eligibleCount,
    chains: perChainMetrics,
    requirement: requirementConfig,
    metadata,
    durationMs,
  }

  return { summary, rows }
}
