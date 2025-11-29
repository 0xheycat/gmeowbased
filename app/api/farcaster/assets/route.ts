import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { CHAIN_IDS, normalizeToGMChain, type ChainKey, type GMChainKey } from '@/lib/gmeow-utils'
import { withErrorHandler } from '@/lib/error-handler'

const ONCHAINKIT_API_KEY = process.env.ONCHAINKIT_API_KEY ?? process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY ?? ''
const ONCHAINKIT_RPC_BASE_URL = 'https://api.developer.coinbase.com/rpc/v1'
const ONCHAINKIT_JSONRPC_VERSION = '2.0'
const ONCHAINKIT_VERSION_HEADER = process.env.ONCHAINKIT_VERSION ?? '1.1.2'

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY ?? process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? ''
const ALCHEMY_ORIGIN = process.env.ALCHEMY_ORIGIN ?? 'https://www.alchemy.com'

const DEFAULT_CHAIN_SET: ChainKey[] = ['base', 'op', 'celo']
const DEFAULT_NFT_CHAIN_SET: ChainKey[] = ['base', 'op']
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 40
const ONCHAINKIT_CHAIN_SLUG = 'base'

const CHAIN_ID_TO_CHAIN_KEY = new Map<number, ChainKey>(
  Object.entries(CHAIN_IDS).map(([key, value]) => [value, key as ChainKey]),
)

// @edit-start 2025-11-13 — Integrate Alchemy Prices API for token hydration
const ALCHEMY_PRICE_API_BASE_URL = 'https://api.g.alchemy.com/prices/v1'
const ALCHEMY_PRICE_CACHE_TTL_MS = 1000 * 60 * 5
const ALCHEMY_PRICE_CHUNK_SIZE = 20

const ALCHEMY_PRICE_NETWORKS: Partial<Record<ChainKey, string>> = {
  base: 'base-mainnet',
  op: 'optimism-mainnet',
  celo: 'celo-mainnet',
}

type AlchemyPriceCacheEntry = {
  fetchedAt: number
  priceUsd: number | null
}

const ALCHEMY_PRICE_CACHE = new Map<string, AlchemyPriceCacheEntry>()
// @edit-end

const ALCHEMY_HOSTS: Partial<Record<ChainKey, string>> = {
  base: process.env.ALCHEMY_BASE_URL ?? 'https://base-mainnet.g.alchemy.com',
  op: process.env.ALCHEMY_OP_URL ?? 'https://opt-mainnet.g.alchemy.com',
  celo: process.env.ALCHEMY_CELO_URL ?? '',
  unichain: process.env.ALCHEMY_UNICHAIN_URL ?? '',
  ink: process.env.ALCHEMY_INK_URL ?? '',
}

type OnchainKitToken = {
  address: string | ''
  chainId: number
  decimals?: number
  image?: string | null
  name: string
  symbol: string
}

type TokenCatalogEntry = {
  id: string
  address: string
  name: string
  symbol: string
  icon: string
  chain: ChainKey
  chainId: number
  decimals: number | null
  priceUsd: number | null
  verified: boolean
}

type NftCatalogEntry = {
  id: string
  name: string
  collection: string
  image: string
  chain: ChainKey
  floorPriceEth: number | null
  verified: boolean
}

type AlchemyContractSummary = {
  address: string
  name: string
  collection: string
  image: string
  verified: boolean
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export const GET = withErrorHandler(async (request: NextRequest) => {
  const ip = getClientIp(request)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const params = request.nextUrl.searchParams
  const section = (params.get('section') ?? 'tokens').toLowerCase()
  const chains = parseChains(params.get('chains'))
  const limit = parseLimit(params.get('limit'))
  const includePrice = params.get('includePrice') !== 'false'
  const tokenTerm = (params.get('tokenTerm') ?? '').trim()
  const nftQuery = ((params.get('nftQuery') ?? '').trim() || 'cats').slice(0, 140)

  if (section === 'tokens') {
    const { tokens, warnings } = await fetchTokenCatalog({ chains, tokenTerm, limit, includePrice })
    return NextResponse.json({ ok: true, tokens, tokenWarnings: warnings }, { status: 200 })
  }

  if (section === 'nfts') {
    const { nfts, warnings } = await fetchAlchemyCatalog({ chains, query: nftQuery, limit })
    return NextResponse.json({ ok: true, nfts, nftWarnings: warnings }, { status: 200 })
  }

  const [tokenResult, nftResult] = await Promise.allSettled([
    fetchTokenCatalog({ chains, tokenTerm, limit, includePrice }),
    fetchAlchemyCatalog({ chains, query: nftQuery, limit }),
  ])

  const tokens: TokenCatalogEntry[] = tokenResult.status === 'fulfilled' ? tokenResult.value.tokens : []
  const tokenWarnings: string[] =
    tokenResult.status === 'fulfilled' ? tokenResult.value.warnings : [`tokens: ${formatError(tokenResult.reason)}`]

  const nfts: NftCatalogEntry[] = nftResult.status === 'fulfilled' ? nftResult.value.nfts : []
  const nftWarnings: string[] =
    nftResult.status === 'fulfilled' ? nftResult.value.warnings : [`nfts: ${formatError(nftResult.reason)}`]

  const ok = tokenResult.status === 'fulfilled' || nftResult.status === 'fulfilled'

  return NextResponse.json({ ok, tokens, nfts, tokenWarnings, nftWarnings }, { status: ok ? 200 : 500 })
})

type TokenCatalogOptions = {
  chains: ChainKey[]
  tokenTerm: string
  limit: number
  includePrice: boolean
}

type OnchainKitTokenRequest = {
  limit?: string
  page?: string
  search?: string
}

async function fetchTokenCatalog(options: TokenCatalogOptions): Promise<{ tokens: TokenCatalogEntry[]; warnings: string[] }> {
  if (!ONCHAINKIT_API_KEY) {
    throw new Error('OnchainKit API key not configured. Set ONCHAINKIT_API_KEY or NEXT_PUBLIC_ONCHAINKIT_API_KEY.')
  }

  const limit = clamp(options.limit, 1, MAX_LIMIT)
  const tokenTerm = options.tokenTerm.trim()
  const chains = options.chains.length > 0 ? options.chains : DEFAULT_CHAIN_SET

  const supportedChainIds = Array.from(
    new Set(
      chains
        .map((chain) => normalizeToGMChain(chain))
        .filter((gmChain): gmChain is GMChainKey => gmChain !== null)
        .map((gmChain) => CHAIN_IDS[gmChain])
        .filter((id): id is number => Number.isFinite(id)),
    ),
  )

  if (supportedChainIds.length === 0) {
    throw new Error('No supported chains provided for OnchainKit token catalog.')
  }

  const fetchLimit = Math.min(200, Math.max(limit * supportedChainIds.length, limit))
  const response = await fetchOnchainKitTokens({
    limit: String(fetchLimit),
    page: '1',
    search: tokenTerm.length > 0 ? tokenTerm : undefined,
  })

  const warnings: string[] = []

  const seen = new Set<string>()
  const tokens: TokenCatalogEntry[] = []

  for (const raw of response) {
    const token = mapOnchainKitToken(raw)
    if (!token) continue
    const gmChain = normalizeToGMChain(token.chain)
    if (!gmChain) continue
    const chainId = CHAIN_IDS[gmChain]
    if (!supportedChainIds.includes(chainId)) continue
    const key = `${token.chain}:${token.id.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    tokens.push(token)
    if (tokens.length >= limit) break
  }

  if (tokens.length === 0) {
    warnings.push('No tokens returned for the current query.')
  } else {
    if (tokens.length < limit) {
      warnings.push(`Only ${tokens.length} token${tokens.length === 1 ? '' : 's'} matched the current filters.`)
    }
    if (options.includePrice) {
      const priceWarnings = await hydrateTokensWithAlchemyPrices(tokens)
      warnings.push(...priceWarnings)
    }
  }

  return { tokens, warnings }
}
type AlchemyCatalogOptions = {
  chains: ChainKey[]
  query: string
  limit: number
}

async function fetchAlchemyCatalog(options: AlchemyCatalogOptions): Promise<{ nfts: NftCatalogEntry[]; warnings: string[] }> {
  if (!ALCHEMY_API_KEY) {
    throw new Error('Alchemy API key not configured. Set ALCHEMY_API_KEY or NEXT_PUBLIC_ALCHEMY_API_KEY.')
  }

  const { chains } = options
  const trimmedQuery = options.query.trim()
  const ownerAddress = parseOwnerDirective(trimmedQuery)
  const searchQuery = ownerAddress ? '' : trimmedQuery
  const limit = clamp(options.limit, 1, MAX_LIMIT)

  const activeChains = (chains.length > 0 ? chains : DEFAULT_NFT_CHAIN_SET).filter((chain) => Boolean(ALCHEMY_HOSTS[chain]))
  if (activeChains.length === 0) {
    throw new Error('No supported chains configured for Alchemy NFT search.')
  }

  const results: NftCatalogEntry[] = []
  const warnings: string[] = []
  const perChainLimit = Math.max(1, Math.ceil(limit / activeChains.length))

  for (const chain of activeChains) {
    if (results.length >= limit) break
    try {
      const contracts = ownerAddress
        ? await fetchAlchemyContractsForOwner(chain, ownerAddress, perChainLimit)
        : await searchAlchemyContracts(chain, searchQuery, perChainLimit)
      for (const contract of contracts) {
        if (results.length >= limit) break
        let floorPrice: number | null = null
        try {
          floorPrice = await fetchAlchemyFloorPrice(chain, contract.address)
        } catch (error) {
          warnings.push(`${chain}: floor price lookup failed (${formatError(error)})`)
        }
        results.push({
          id: contract.address,
          name: contract.name,
          collection: contract.collection,
          image: contract.image,
          chain,
          floorPriceEth: floorPrice,
          verified: contract.verified,
        })
      }
    } catch (error) {
      warnings.push(`${chain}: ${formatError(error)}`)
    }
  }

  if (results.length === 0) {
    warnings.push('No NFT collections returned for the current query.')
  }

  return { nfts: results.slice(0, limit), warnings }
}

async function searchAlchemyContracts(chain: ChainKey, query: string, limit: number): Promise<AlchemyContractSummary[]> {
  const host = ALCHEMY_HOSTS[chain]
  if (!host) {
    throw new Error(`Alchemy host missing for chain ${chain}`)
  }

  const url = new URL(`${host.replace(/\/$/, '')}/nft/v3/${ALCHEMY_API_KEY}/searchContractMetadata`)
  url.searchParams.set('query', query.length > 0 ? query : 'cats')
  url.searchParams.set('pageSize', String(clamp(limit, 1, MAX_LIMIT)))
  url.searchParams.set('withSpamFilter', 'true')

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Origin: ALCHEMY_ORIGIN,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const text = await safeReadText(response)
    throw new Error(`Alchemy searchContractMetadata failed (${response.status})${text ? ` – ${text}` : ''}`)
  }

  const json = await response.json()
  const contracts = extractArray(json, ['contracts', 'results'])

  const summaries: AlchemyContractSummary[] = []
  for (const raw of contracts) {
    const contract = mapAlchemyContract(raw)
    if (!contract) continue
    summaries.push(contract)
    if (summaries.length >= limit) break
  }

  return summaries
}

async function fetchAlchemyContractsForOwner(chain: ChainKey, owner: string, limit: number): Promise<AlchemyContractSummary[]> {
  const host = ALCHEMY_HOSTS[chain]
  if (!host) {
    throw new Error(`Alchemy host missing for chain ${chain}`)
  }

  const url = new URL(`${host.replace(/\/$/, '')}/nft/v3/${ALCHEMY_API_KEY}/getContractsForOwner`)
  url.searchParams.set('owner', owner)
  url.searchParams.set('pageSize', String(clamp(limit, 1, MAX_LIMIT)))
  url.searchParams.set('withMetadata', 'true')

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Origin: ALCHEMY_ORIGIN,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const text = await safeReadText(response)
    throw new Error(`Alchemy getContractsForOwner failed (${response.status})${text ? ` – ${text}` : ''}`)
  }

  const json = await response.json()
  let contracts = extractArray(json, ['contracts'])
  if (contracts.length === 0 && json?.data) {
    contracts = extractArray(json.data, ['contracts'])
  }

  const summaries: AlchemyContractSummary[] = []
  for (const raw of contracts) {
    const contract = mapAlchemyContract(raw)
    if (!contract) continue
    summaries.push(contract)
    if (summaries.length >= limit) break
  }

  return summaries
}

async function fetchAlchemyFloorPrice(chain: ChainKey, contractAddress: string): Promise<number | null> {
  const host = ALCHEMY_HOSTS[chain]
  if (!host) return null

  const url = new URL(`${host.replace(/\/$/, '')}/nft/v3/${ALCHEMY_API_KEY}/getFloorPrice`)
  url.searchParams.set('contractAddress', contractAddress)

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Origin: ALCHEMY_ORIGIN,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    return null
  }

  const json = await response.json()
  const priceCandidate =
    json?.openSea?.floorPrice ??
    json?.floorPriceInNativeCurrency ??
    json?.floorPrice?.eth ??
    json?.floorPrice?.nativeCurrency ??
    null

  const value =
    typeof priceCandidate === 'number'
      ? priceCandidate
      : typeof priceCandidate === 'string'
        ? Number.parseFloat(priceCandidate)
        : null
  return Number.isFinite(value) ? value : null
}

async function fetchOnchainKitTokens(params: OnchainKitTokenRequest): Promise<OnchainKitToken[]> {
  const key = encodeURIComponent(ONCHAINKIT_API_KEY.trim())
  if (!key) {
    throw new Error('OnchainKit API key missing')
  }

  const url = `${ONCHAINKIT_RPC_BASE_URL}/${ONCHAINKIT_CHAIN_SLUG}/${key}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'OnchainKit-Context': 'api',
      'OnchainKit-Version': ONCHAINKIT_VERSION_HEADER,
    },
    body: JSON.stringify({
      id: 1,
      jsonrpc: ONCHAINKIT_JSONRPC_VERSION,
      method: 'cdp_listSwapAssets',
      params: [
        {
          limit: '50',
          page: '1',
          ...params,
        },
      ],
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const text = await safeReadText(response)
    throw new Error(`OnchainKit tokens request failed (${response.status})${text ? ` – ${text}` : ''}`)
  }

  const payload = await response.json()

  if (payload?.error) {
    const code = payload.error?.code ?? payload.code ?? 'unknown'
    const message = payload.error?.message ?? payload.message ?? 'Request failed'
    throw new Error(`OnchainKit tokens error (${code}) – ${message}`)
  }

  if (!Array.isArray(payload?.result)) {
    throw new Error('OnchainKit tokens response missing result array')
  }

  return payload.result as OnchainKitToken[]
}

function mapOnchainKitToken(raw: OnchainKitToken): TokenCatalogEntry | null {
  if (!raw) return null

  const chainKey = mapChainIdToChainKey(raw.chainId)
  if (!chainKey) return null

  const address = typeof raw.address === 'string' ? raw.address.trim() : ''
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return null

  const name = typeof raw.name === 'string' && raw.name.length > 0 ? raw.name : 'Unnamed token'
  const symbol = typeof raw.symbol === 'string' && raw.symbol.length > 0 ? raw.symbol : name.slice(0, 8).toUpperCase()
  const icon = typeof raw.image === 'string' && raw.image.length > 0 ? raw.image : fallbackTokenIcon(address)
  const decimals = typeof raw.decimals === 'number' && Number.isFinite(raw.decimals) ? raw.decimals : null
  const gmChain = normalizeToGMChain(chainKey)
  const chainId = typeof raw.chainId === 'number' && Number.isFinite(raw.chainId) ? raw.chainId : (gmChain ? CHAIN_IDS[gmChain] : CHAIN_IDS.base)

  return {
    id: address,
    address,
    name,
    symbol,
    icon,
    chain: chainKey,
    chainId,
    decimals,
    priceUsd: null,
    verified: true,
  }
}

// @edit-start 2025-11-13 — Hydrate token USD prices via Alchemy Prices API
async function hydrateTokensWithAlchemyPrices(tokens: TokenCatalogEntry[]): Promise<string[]> {
  const warnings: string[] = []
  if (tokens.length === 0) return warnings

  const trimmedApiKey = ALCHEMY_API_KEY.trim()
  if (!trimmedApiKey) {
    warnings.push('Alchemy API key missing; USD price lookups skipped.')
    return warnings
  }

  const now = Date.now()
  const unsupportedChains = new Set<ChainKey>()
  const pendingEntries = new Map<
    string,
    {
      chain: ChainKey
      address: string
      network: string
      tokens: TokenCatalogEntry[]
    }
  >()

  for (const token of tokens) {
    token.priceUsd = token.priceUsd ?? null
    const network = ALCHEMY_PRICE_NETWORKS[token.chain]
    if (!network) {
      unsupportedChains.add(token.chain)
      continue
    }

    const normalizedAddress = token.address.trim().toLowerCase()
    if (!/^0x[a-f0-9]{40}$/.test(normalizedAddress)) {
      continue
    }

    const cacheKey = makeAlchemyPriceCacheKey(token.chain, normalizedAddress)
    const cached = ALCHEMY_PRICE_CACHE.get(cacheKey)
    if (cached && now - cached.fetchedAt < ALCHEMY_PRICE_CACHE_TTL_MS) {
      token.priceUsd = cached.priceUsd
      continue
    }

    const pendingKey = `${network}:${normalizedAddress}`
    const existing = pendingEntries.get(pendingKey)
    if (existing) {
      existing.tokens.push(token)
    } else {
      pendingEntries.set(pendingKey, {
        chain: token.chain,
        address: normalizedAddress,
        network,
        tokens: [token],
      })
    }
  }

  if (unsupportedChains.size > 0) {
    warnings.push(
      `Alchemy price endpoint does not currently support: ${Array.from(unsupportedChains.values()).join(', ')}`,
    )
  }

  if (pendingEntries.size === 0) {
    return warnings
  }

  const pendingList = Array.from(pendingEntries.values())
  const missingPriceKeys: string[] = []

  for (let index = 0; index < pendingList.length; index += ALCHEMY_PRICE_CHUNK_SIZE) {
    const chunk = pendingList.slice(index, index + ALCHEMY_PRICE_CHUNK_SIZE)
    const body = {
      addresses: chunk.map((entry) => ({ network: entry.network, address: entry.address })),
    }

    try {
      const response = await fetch(`${ALCHEMY_PRICE_API_BASE_URL}/tokens/by-address`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${trimmedApiKey}`,
        },
        body: JSON.stringify(body),
        cache: 'no-store',
      })

      if (!response.ok) {
        const text = await safeReadText(response)
        warnings.push(`Alchemy price lookup failed (${response.status})${text ? ` – ${text}` : ''}`)
        continue
      }

      const payload = await response.json()
      const data = Array.isArray(payload?.data) ? payload.data : []
      const seen = new Set<string>()

      for (const item of data) {
        const rawNetwork = typeof item?.network === 'string' ? item.network : ''
        const rawAddress = typeof item?.address === 'string' ? item.address : ''
        const normalizedAddress = rawAddress.trim().toLowerCase()
        const pendingKey = `${rawNetwork}:${normalizedAddress}`
        const pending = pendingEntries.get(pendingKey)
        if (!pending) continue

        seen.add(pendingKey)

        const usdPrice = extractUsdPrice(item?.prices)
        const cacheKey = makeAlchemyPriceCacheKey(pending.chain, normalizedAddress)

        if (usdPrice != null) {
          for (const token of pending.tokens) {
            token.priceUsd = usdPrice
          }
          ALCHEMY_PRICE_CACHE.set(cacheKey, { fetchedAt: now, priceUsd: usdPrice })
        } else {
          ALCHEMY_PRICE_CACHE.set(cacheKey, { fetchedAt: now, priceUsd: null })
          missingPriceKeys.push(pendingKey)
        }

        if (typeof item?.error === 'string' && item.error.length > 0) {
          warnings.push(`Alchemy price error for ${pending.chain}:${pending.address} – ${item.error}`)
        }
      }

      for (const entry of chunk) {
        const pendingKey = `${entry.network}:${entry.address}`
        if (seen.has(pendingKey)) continue
        const cacheKey = makeAlchemyPriceCacheKey(entry.chain, entry.address)
        ALCHEMY_PRICE_CACHE.set(cacheKey, { fetchedAt: now, priceUsd: null })
        missingPriceKeys.push(pendingKey)
      }
    } catch (error) {
      warnings.push(`Alchemy price lookup threw (${formatError(error)})`)
    }
  }

  if (missingPriceKeys.length > 0) {
    warnings.push(`Alchemy did not return USD prices for ${missingPriceKeys.length} token${missingPriceKeys.length === 1 ? '' : 's'}.`)
  }

  return warnings
}

function makeAlchemyPriceCacheKey(chain: ChainKey, address: string): string {
  return `${chain}:${address}`
}

function extractUsdPrice(prices: unknown): number | null {
  if (!Array.isArray(prices)) return null
  for (const candidate of prices) {
    const currency = typeof candidate?.currency === 'string' ? candidate.currency.toUpperCase() : ''
    if (currency !== 'USD') continue
    const value = typeof candidate?.value === 'number' ? candidate.value : Number.parseFloat(candidate?.value ?? '')
    if (Number.isFinite(value)) {
      return Number(value)
    }
  }
  return null
}
// @edit-end

function mapAlchemyContract(raw: any): AlchemyContractSummary | null {
  if (!raw) return null
  const spamIndicators = [
    raw?.isSpam,
    raw?.spamInfo?.isSpam,
    raw?.contract?.isSpam,
    raw?.contract?.spamInfo?.isSpam,
  ]
  if (spamIndicators.some((flag) => isTruthySpamFlag(flag))) return null

  const base = raw?.contract ?? raw
  const address = String(
    raw?.address ??
      raw?.contractAddress ??
      raw?.contractMetadata?.contractAddress ??
      raw?.metadata?.contractAddress ??
      base?.address ??
      base?.contractAddress ??
      '',
  ).trim()

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return null

  const metadata = raw.contractMetadata ?? raw.metadata ?? base?.metadata ?? base ?? raw
  const name = typeof metadata?.name === 'string' && metadata.name.length > 0 ? metadata.name : raw?.name ?? 'Unnamed collection'
  const collection =
    typeof metadata?.openSea?.collectionName === 'string' && metadata.openSea.collectionName.length > 0
      ? metadata.openSea.collectionName
      : typeof raw?.openSeaMetadata?.collectionName === 'string' && raw.openSeaMetadata.collectionName.length > 0
        ? raw.openSeaMetadata.collectionName
        : name
  const image =
    typeof metadata?.openSea?.imageUrl === 'string' && metadata.openSea.imageUrl.length > 0
      ? metadata.openSea.imageUrl
      : typeof metadata?.image === 'string' && metadata.image.length > 0
        ? metadata.image
        : typeof raw?.openSeaMetadata?.imageUrl === 'string' && raw.openSeaMetadata.imageUrl.length > 0
          ? raw.openSeaMetadata.imageUrl
          : fallbackNftImage(address)
  const verified = Boolean(
    metadata?.openSea?.verified ??
      metadata?.isVerified ??
      raw?.openSeaMetadata?.verified ??
      raw?.verified ??
      false,
  )

  return {
    address,
    name,
    collection,
    image,
    verified,
  }
}

function isTruthySpamFlag(flag: unknown): boolean {
  if (flag == null) return false
  if (typeof flag === 'boolean') return flag
  if (typeof flag === 'number') return flag !== 0
  if (typeof flag === 'string') {
    const normalized = flag.trim().toLowerCase()
    return normalized === 'true' || normalized === '1' || normalized === 'spam'
  }
  return false
}

function parseOwnerDirective(query: string): string | null {
  if (!query) return null
  const lower = query.toLowerCase()
  const prefixes = ['wallet:', 'owner:', 'addr:', 'address:']
  for (const prefix of prefixes) {
    if (lower.startsWith(prefix)) {
      const candidate = query.slice(prefix.length).trim()
      return /^0x[a-fA-F0-9]{40}$/.test(candidate) ? candidate : null
    }
  }
  return null
}

function parseChains(value: string | null): ChainKey[] {
  if (!value) return []
  const entries = value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

  const chains: ChainKey[] = []
  for (const entry of entries) {
    switch (entry) {
      case 'base':
      case 'base-mainnet':
        chains.push('base')
        break
      case 'op':
      case 'optimism':
      case 'opt':
      case 'opt-mainnet':
        chains.push('op')
        break
      case 'celo':
      case 'celo-mainnet':
        chains.push('celo')
        break
      case 'unichain':
      case 'unichain-mainnet':
        chains.push('unichain')
        break
      case 'ink':
      case 'ink-mainnet':
        chains.push('ink')
        break
    }
  }

  return Array.from(new Set(chains))
}

function parseLimit(value: string | null): number {
  if (!value) return DEFAULT_LIMIT
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? clamp(parsed, 1, MAX_LIMIT) : DEFAULT_LIMIT
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function mapChainIdToChainKey(chainId: number | null | undefined): ChainKey | null {
  if (typeof chainId !== 'number' || !Number.isFinite(chainId)) return null
  return CHAIN_ID_TO_CHAIN_KEY.get(chainId) ?? null
}

function extractArray(payload: any, keys: string[]): any[] {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  for (const key of keys) {
    const value = payload?.[key]
    if (Array.isArray(value)) return value
  }
  return []
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text()
  } catch {
    return ''
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : typeof error === 'string' ? error : 'unknown error'
}

function fallbackTokenIcon(address: string): string {
  return `https://effigy.im/a/${address.toLowerCase()}.png`
}

function fallbackNftImage(address: string): string {
  return `https://effigy.im/a/${address.toLowerCase()}-collection.png`
}
