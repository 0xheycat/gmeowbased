import { randomUUID } from 'crypto'
import { createPublicClient, http, parseAbiItem, type AbiEvent } from 'viem'
import { CHAIN_KEYS, CONTRACT_ADDRESSES, type ChainKey } from '@/lib/gm-utils'
import { getRpcUrl } from '@/lib/rpc'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase-server'

const BADGE_TABLE = process.env.SUPABASE_BADGE_TEMPLATE_TABLE || 'badge_templates'
const BADGE_BUCKET = process.env.SUPABASE_BADGE_BUCKET || 'badge-art'
const TEMPLATE_CACHE_TTL_MS = Number(process.env.BADGE_TEMPLATE_CACHE_TTL_MS ?? 15_000)
const MINT_CACHE_TTL_MS = Number(process.env.BADGE_MINT_CACHE_TTL_MS ?? 30_000)
const BADGE_MINT_LOOKBACK_BLOCKS = BigInt(process.env.BADGE_MINT_LOOKBACK_BLOCKS ?? 400_000)

export type BadgeTemplate = {
  id: string
  createdAt: string
  updatedAt: string
  name: string
  slug: string
  badgeType: string
  description: string | null
  chain: ChainKey
  pointsCost: number
  imageUrl: string | null
  artPath: string | null
  active: boolean
  metadata: Record<string, unknown> | null
}

export const BADGE_BUCKET_NAME = BADGE_BUCKET

export type BadgeTemplateInput = {
  name: string
  slug?: string | null
  badgeType: string
  description?: string | null
  chain: ChainKey
  pointsCost: number
  imageUrl?: string | null
  artPath?: string | null
  active?: boolean
  metadata?: Record<string, unknown> | null
}

export type MintedBadge = {
  chain: ChainKey
  badgeId: number
  badgeType: string
  mintedAt?: number
  tokenUri?: string | null
  template?: BadgeTemplate | null
}

type SupabaseRow = {
  id: string
  created_at: string
  updated_at: string
  name: string
  slug: string
  badge_type: string
  description?: string | null
  chain: ChainKey
  points_cost: number
  image_url?: string | null
  art_path?: string | null
  active: boolean
  metadata?: Record<string, unknown> | null
}

type TemplateCache = { value: BadgeTemplate[]; includesInactive: boolean; expiresAt: number }
const templateCache: { current: TemplateCache | null } = { current: null }
const mintedCache = new Map<string, { value: MintedBadge[]; expiresAt: number }>()
const MISSING_TABLE_CODES = new Set(['42P01', 'PGRST302'])

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const maybe = error as { code?: string | null; message?: string | null }
  if (maybe.code && MISSING_TABLE_CODES.has(maybe.code)) return true
  const message = maybe.message || ''
  return message.includes('Could not find the table') && message.includes(BADGE_TABLE)
}

function missingTableMessage(): string {
  return `Supabase table "${BADGE_TABLE}" is missing. Run the setup script at scripts/sql/create_badge_templates.sql and ensure the SUPABASE_BADGE_TEMPLATE_TABLE env variable matches your schema.`
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function now(): number {
  return Date.now()
}

function assertSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  }
}

function transformRow(row: SupabaseRow): BadgeTemplate {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    name: row.name,
    slug: row.slug,
    badgeType: row.badge_type,
    description: row.description ?? null,
    chain: row.chain,
    pointsCost: Number(row.points_cost) || 0,
    imageUrl: row.image_url ?? null,
    artPath: row.art_path ?? null,
    active: Boolean(row.active),
    metadata: row.metadata ?? null,
  }
}

async function ensureBadgeBucket() {
  assertSupabase()
  const supabase = getSupabaseServerClient()
  if (!supabase) throw new Error('Supabase client unavailable')
  const { data } = await supabase.storage.getBucket(BADGE_BUCKET)
  if (!data) {
    await supabase.storage.createBucket(BADGE_BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
    })
  }
}

type UploadFile = File | (Blob & { name?: string })

export async function uploadBadgeArt(file: UploadFile): Promise<{ url: string; path: string }> {
  assertSupabase()
  const supabase = getSupabaseServerClient()
  if (!supabase) throw new Error('Supabase client unavailable')

  await ensureBadgeBucket()
  const arrayBuffer = await file.arrayBuffer()
  const originalName = (file as File).name || 'badge-art.png'
  const extension = originalName.split('.').pop()?.toLowerCase() || 'png'
  const safeName = originalName.replace(/[^a-zA-Z0-9_.-]/g, '_')
  const path = `templates/${randomUUID()}-${safeName}`
  const { error } = await supabase.storage.from(BADGE_BUCKET).upload(path, arrayBuffer, {
    contentType: file.type || `image/${extension}`,
    upsert: true,
  })
  if (error) {
    throw new Error(`Failed to upload badge art: ${error.message}`)
  }
  const { data } = supabase.storage.from(BADGE_BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, path }
}

type ListBadgeTemplatesOptions = {
  includeInactive?: boolean
  force?: boolean
  throwOnMissingTable?: boolean
}

export async function listBadgeTemplates(options: ListBadgeTemplatesOptions = {}): Promise<BadgeTemplate[]> {
  const {
    includeInactive = false,
    force = false,
    throwOnMissingTable = false,
  } = options

  const cache = templateCache.current
  const timestamp = now()
  if (!force && cache && cache.expiresAt >= timestamp) {
    if (includeInactive) {
      if (cache.includesInactive) {
        return cache.value
      }
    } else {
      if (cache.includesInactive) {
        return cache.value.filter(template => template.active)
      }
      return cache.value
    }
  }

  assertSupabase()
  const supabase = getSupabaseServerClient()
  if (!supabase) return []

  let query = supabase.from(BADGE_TABLE).select('*').order('points_cost', { ascending: true })
  if (!includeInactive) {
    query = query.eq('active', true)
  }

  const { data, error } = await query
  if (error) {
    if (isMissingTableError(error)) {
      const message = missingTableMessage()
      if (throwOnMissingTable) {
        throw new Error(message)
      }
      console.warn(`Badge templates table missing at Supabase: ${error.message}`)
      const empty: BadgeTemplate[] = []
      templateCache.current = {
        value: empty,
        includesInactive: includeInactive,
        expiresAt: timestamp + TEMPLATE_CACHE_TTL_MS,
      }
      return empty
    }
    throw new Error(`Failed to load badge templates: ${error.message}`)
  }

  const mapped = (data as SupabaseRow[]).map(transformRow)
  const expiresAt = now() + TEMPLATE_CACHE_TTL_MS
  templateCache.current = { value: mapped, includesInactive: includeInactive, expiresAt }
  if (includeInactive) {
    return mapped
  }
  return mapped.filter(template => template.active)
}

export async function getBadgeTemplateById(id: string): Promise<BadgeTemplate | null> {
  assertSupabase()
  const supabase = getSupabaseServerClient()
  if (!supabase) return null
  const { data, error } = await supabase.from(BADGE_TABLE).select('*').eq('id', id).maybeSingle()
  if (error) {
    if (isMissingTableError(error)) return null
    throw new Error(`Failed to load template: ${error.message}`)
  }
  if (!data) return null
  return transformRow(data as SupabaseRow)
}

export async function createBadgeTemplate(input: BadgeTemplateInput): Promise<BadgeTemplate> {
  const supabase = getSupabaseServerClient()
  assertSupabase()
  if (!supabase) throw new Error('Supabase client unavailable')

  const slug = slugify(input.slug || input.name)
  const { data: existing, error: slugError } = await supabase
    .from(BADGE_TABLE)
    .select('id')
    .eq('slug', slug)
    .limit(1)
  if (slugError) {
    if (isMissingTableError(slugError)) throw new Error(missingTableMessage())
    throw new Error(`Slug lookup failed: ${slugError.message}`)
  }
  if (existing && existing.length > 0) throw new Error('Badge slug already exists')

  const payload = {
    id: randomUUID(),
    name: input.name,
    slug,
    badge_type: input.badgeType,
    description: input.description ?? null,
    chain: input.chain,
    points_cost: Math.max(0, Math.floor(input.pointsCost)),
    image_url: input.imageUrl ?? null,
    art_path: input.artPath ?? null,
    active: input.active ?? true,
    metadata: input.metadata ?? null,
  }

  const { data, error } = await supabase.from(BADGE_TABLE).insert(payload).select().maybeSingle()
  if (error) {
    if (isMissingTableError(error)) throw new Error(missingTableMessage())
    throw new Error(`Failed to create badge template: ${error.message}`)
  }
  templateCache.current = null
  return transformRow(data as SupabaseRow)
}

export async function updateBadgeTemplate(id: string, input: Partial<BadgeTemplateInput>): Promise<BadgeTemplate> {
  const supabase = getSupabaseServerClient()
  assertSupabase()
  if (!supabase) throw new Error('Supabase client unavailable')

  const updates: Record<string, unknown> = {}
  if (input.name != null) updates.name = input.name
  if (input.badgeType != null) updates.badge_type = input.badgeType
  if (input.description !== undefined) updates.description = input.description
  if (input.chain != null) updates.chain = input.chain
  if (input.pointsCost != null) updates.points_cost = Math.max(0, Math.floor(input.pointsCost))
  if (input.imageUrl !== undefined) updates.image_url = input.imageUrl
  if (input.artPath !== undefined) updates.art_path = input.artPath
  if (input.active != null) updates.active = input.active
  if (input.metadata !== undefined) updates.metadata = input.metadata
  updates.updated_at = new Date().toISOString()

  if (input.slug) {
    const slug = slugify(input.slug)
    updates.slug = slug
    const { data: existing, error: slugError } = await supabase
      .from(BADGE_TABLE)
      .select('id')
      .eq('slug', slug)
      .neq('id', id)
      .limit(1)
    if (slugError) {
      if (isMissingTableError(slugError)) throw new Error(missingTableMessage())
      throw new Error(`Slug check failed: ${slugError.message}`)
    }
    if (existing && existing.length > 0) throw new Error('Badge slug already exists')
  }

  const { data, error } = await supabase.from(BADGE_TABLE).update(updates).eq('id', id).select().maybeSingle()
  if (error) {
    if (isMissingTableError(error)) throw new Error(missingTableMessage())
    throw new Error(`Failed to update badge template: ${error.message}`)
  }
  templateCache.current = null
  return transformRow(data as SupabaseRow)
}

export async function deleteBadgeTemplate(id: string): Promise<void> {
  assertSupabase()
  const supabase = getSupabaseServerClient()
  if (!supabase) throw new Error('Supabase client unavailable')

  const { data, error } = await supabase.from(BADGE_TABLE).select('art_path').eq('id', id).maybeSingle()
  if (error) {
    if (isMissingTableError(error)) throw new Error(missingTableMessage())
    throw new Error(`Failed to load art path: ${error.message}`)
  }

  const artPath = (data as { art_path?: string | null } | null)?.art_path
  const { error: deleteError } = await supabase.from(BADGE_TABLE).delete().eq('id', id)
  if (deleteError) {
    if (isMissingTableError(deleteError)) throw new Error(missingTableMessage())
    throw new Error(`Failed to delete badge template: ${deleteError.message}`)
  }

  if (artPath) {
    await supabase.storage.from(BADGE_BUCKET).remove([artPath])
  }
  templateCache.current = null
}

function getStartBlock(chain: ChainKey): bigint {
  const envKey = `CHAIN_START_BLOCK_${chain.toUpperCase()}`
  const direct = process.env[envKey]
  if (direct) {
    const parsed = Number(direct)
    if (Number.isFinite(parsed) && parsed >= 0) return BigInt(Math.floor(parsed))
  }
  const inline = process.env.CHAIN_START_BLOCK
  if (inline) {
    for (const chunk of inline.split(',')) {
      const [key, value] = chunk.split(':').map(part => part.trim())
      if (key === chain) {
        const parsed = Number(value)
        if (Number.isFinite(parsed) && parsed >= 0) return BigInt(Math.floor(parsed))
      }
    }
  }
  return 0n
}

const EVT_BADGE_MINTED = parseAbiItem(
  'event BadgeMinted(address indexed to, uint256 tokenId, string badgeType)'
) as AbiEvent

async function fetchMintLogsForChain(chain: ChainKey, address: `0x${string}`): Promise<MintedBadge[]> {
  const rpc = getRpcUrl(chain)
  const client = createPublicClient({ transport: http(rpc) })
  const latest = await client.getBlockNumber()
  let fromBlock = latest > BADGE_MINT_LOOKBACK_BLOCKS ? latest - BADGE_MINT_LOOKBACK_BLOCKS : 0n
  const chainStart = getStartBlock(chain)
  if (chainStart > fromBlock) fromBlock = chainStart
  if (fromBlock > latest) return []

  const contract = CONTRACT_ADDRESSES[chain]
  const logs = await client.getLogs({
    address: contract,
    event: EVT_BADGE_MINTED,
    args: { to: address },
    fromBlock,
    toBlock: latest,
  })

  const results: MintedBadge[] = []
  const blockTimestampCache = new Map<bigint, number>()
  for (const log of logs) {
    const args = (log as unknown as { args?: Record<string, unknown> }).args || {}
    const badgeIdRaw = args.tokenId as bigint | number | string | undefined
    const badgeType = typeof args.badgeType === 'string' ? args.badgeType : 'Badge'
    const badgeId = typeof badgeIdRaw === 'bigint' ? Number(badgeIdRaw) : typeof badgeIdRaw === 'number' ? badgeIdRaw : Number(badgeIdRaw || 0)
    let mintedAt: number | undefined
    if (log.blockNumber != null) {
      const cached = blockTimestampCache.get(log.blockNumber)
      if (cached) {
        mintedAt = cached
      } else {
        const block = await client.getBlock({ blockNumber: log.blockNumber })
        mintedAt = Number(block.timestamp) * 1000
        blockTimestampCache.set(log.blockNumber, mintedAt)
      }
    }
    results.push({ chain, badgeId, badgeType, mintedAt })
  }
  return results.sort((a, b) => (b.mintedAt ?? 0) - (a.mintedAt ?? 0))
}

function enrichMintWithTemplate(mints: MintedBadge[], templates: BadgeTemplate[]): MintedBadge[] {
  const byType = new Map<string, BadgeTemplate>()
  for (const template of templates) {
    byType.set(`${template.chain}:${template.badgeType}`, template)
  }
  return mints.map(mint => {
    const template = byType.get(`${mint.chain}:${mint.badgeType}`) || null
    return {
      ...mint,
      template,
    }
  })
}

export async function fetchMintedBadges(address: `0x${string}`, options: { chains?: ChainKey[]; force?: boolean } = {}): Promise<MintedBadge[]> {
  const normalized = address.toLowerCase() as `0x${string}`
  const cacheKey = `${normalized}:${(options.chains || CHAIN_KEYS).join(',')}`
  const cache = mintedCache.get(cacheKey)
  if (!options.force && cache && cache.expiresAt > now()) {
    return cache.value
  }

  const chains = options.chains && options.chains.length ? options.chains : CHAIN_KEYS
  const mintsPerChain = await Promise.all(
    chains.map(chain => fetchMintLogsForChain(chain, normalized).catch(() => []))
  )
  const flat = mintsPerChain.flat()
  const templates = await listBadgeTemplates({ includeInactive: true })
  const enriched = enrichMintWithTemplate(flat, templates)
  mintedCache.set(cacheKey, { value: enriched, expiresAt: now() + MINT_CACHE_TTL_MS })
  return enriched
}

export async function invalidateBadgeCaches() {
  templateCache.current = null
  mintedCache.clear()
}
