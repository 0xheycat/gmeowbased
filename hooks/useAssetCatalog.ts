import { useState, useRef, useCallback, useEffect } from 'react'

// Type definitions moved from removed quest-wizard
type TokenOption = { symbol: string; address: string; chainId: number; decimals?: number }
type NftOption = { name: string; address: string; chainId: number; tokenId?: string }
type AssetSnapshot = { items: (TokenOption | NftOption)[]; warnings: string[]; timestamp?: number }

const DEFAULT_TOKEN_QUERY = ''
const DEFAULT_NFT_QUERY = ''
const DEFAULT_CHAIN_FILTER = 'all'
const ASSET_SNAPSHOT_TTL_MS = 300000

function isAbortError(error: any): boolean {
  return error?.name === 'AbortError'
}

type UseAssetCatalogOptions = {
	isMobile: boolean
	stepIndex: number
}

export function useAssetCatalog({ isMobile, stepIndex }: UseAssetCatalogOptions) {
	const [tokens, setTokens] = useState<TokenOption[]>([])
	const [tokenWarnings, setTokenWarnings] = useState<string[]>([])
	const [nfts, setNfts] = useState<NftOption[]>([])
	const [nftWarnings, setNftWarnings] = useState<string[]>([])
	const [tokenQuery, setTokenQuery] = useState(DEFAULT_TOKEN_QUERY)
	const [nftQuery, setNftQuery] = useState(DEFAULT_NFT_QUERY)
	const [tokenLoading, setTokenLoading] = useState(false)
	const [nftLoading, setNftLoading] = useState(false)
	const [tokenError, setTokenError] = useState<string | null>(null)
	const [nftError, setNftError] = useState<string | null>(null)
	const [hasLoadedTokens, setHasLoadedTokens] = useState(false)
	const [hasLoadedNfts, setHasLoadedNfts] = useState(false)

	const tokenFetchControllerRef = useRef<AbortController | null>(null)
	const nftFetchControllerRef = useRef<AbortController | null>(null)
	const tokenSnapshotCacheRef = useRef<Map<string, AssetSnapshot>>(new Map())
	const nftSnapshotCacheRef = useRef<Map<string, AssetSnapshot>>(new Map())

	const fetchTokenCatalog = useCallback(
		async (term: string, chains: string = DEFAULT_CHAIN_FILTER, options: { force?: boolean } = {}) => {
			const trimmed = term.trim()
			const cacheKey = `${chains}::${trimmed.toLowerCase()}`
			const cached = tokenSnapshotCacheRef.current.get(cacheKey)
			if (!options.force && cached && cached.timestamp && Date.now() - cached.timestamp < ASSET_SNAPSHOT_TTL_MS) {
				setTokens(cached.items as TokenOption[])
				setTokenWarnings(cached.warnings)
				setTokenLoading(false)
				setTokenError(null)
				return
			}

			tokenFetchControllerRef.current?.abort()
			const controller = new AbortController()
			tokenFetchControllerRef.current = controller
			setTokenLoading(true)
			setTokenError(null)

			try {
				const params = new URLSearchParams()
				params.set('section', 'tokens')
				params.set('includePrice', 'true')
				params.set('limit', isMobile ? '12' : '20')
				params.set('chains', chains)
				if (trimmed.length > 0) {
					params.set('tokenTerm', trimmed)
				}

				const response = await fetch(`/api/farcaster/assets?${params.toString()}`, {
					cache: 'no-store',
					signal: controller.signal,
				})
				let data: any = null
				try {
					data = await response.json()
				} catch {
					throw new Error('Failed to parse token catalog response')
				}

				if (!response.ok || !data?.ok) {
					const fallback = `Failed to load tokens (status ${response.status})`
					const message = typeof data?.error === 'string' && data.error.length > 0 ? data.error : fallback
					throw new Error(message)
				}

				const nextTokens = Array.isArray(data.tokens) ? (data.tokens as TokenOption[]) : []
				const nextWarnings = Array.isArray(data.tokenWarnings) ? data.tokenWarnings : []
				tokenSnapshotCacheRef.current.set(cacheKey, { items: nextTokens, warnings: nextWarnings, timestamp: Date.now() })
				setTokens(nextTokens)
				setTokenWarnings(nextWarnings)
			} catch (error) {
				if (isAbortError(error)) {
					return
				}
				const message = error instanceof Error ? error.message : 'Failed to load tokens'
				tokenSnapshotCacheRef.current.delete(cacheKey)
				setTokens([])
				setTokenWarnings([])
				setTokenError(message)
			} finally {
				if (tokenFetchControllerRef.current === controller) {
					tokenFetchControllerRef.current = null
				}
				setTokenLoading(false)
			}
		},
		[isMobile],
	)

	const fetchNftCatalog = useCallback(
		async (query: string, chains: string = DEFAULT_CHAIN_FILTER, options: { force?: boolean } = {}) => {
			const trimmed = query.trim()
			const cacheKey = `${chains}::${trimmed.toLowerCase()}`
		const cached = nftSnapshotCacheRef.current.get(cacheKey)
		if (!options.force && cached && cached.timestamp && Date.now() - cached.timestamp < ASSET_SNAPSHOT_TTL_MS) {
			setNfts(cached.items as NftOption[])
			setNftWarnings(cached.warnings)
				setNftLoading(false)
				setNftError(null)
				return
			}

			nftFetchControllerRef.current?.abort()
			const controller = new AbortController()
			nftFetchControllerRef.current = controller
			setNftLoading(true)
			setNftError(null)

			try {
				const params = new URLSearchParams()
				params.set('section', 'nfts')
				params.set('chains', chains)
				params.set('limit', isMobile ? '12' : '20')
				if (trimmed.length > 0) {
					params.set('nftQuery', trimmed)
				}

				const response = await fetch(`/api/farcaster/assets?${params.toString()}`, {
					cache: 'no-store',
					signal: controller.signal,
				})
				let data: any = null
				try {
					data = await response.json()
				} catch {
					throw new Error('Failed to parse NFT catalog response')
				}

				if (!response.ok || !data?.ok) {
					const fallback = `Failed to load NFT collections (status ${response.status})`
					const message = typeof data?.error === 'string' && data.error.length > 0 ? data.error : fallback
					throw new Error(message)
				}

				const nextNfts = Array.isArray(data.nfts) ? (data.nfts as NftOption[]) : []
				const nextWarnings = Array.isArray(data.nftWarnings) ? data.nftWarnings : []
				nftSnapshotCacheRef.current.set(cacheKey, { items: nextNfts, warnings: nextWarnings, timestamp: Date.now() })
				setNfts(nextNfts)
				setNftWarnings(nextWarnings)
			} catch (error) {
				if (isAbortError(error)) {
					return
				}
				const message = error instanceof Error ? error.message : 'Failed to load NFT collections'
				nftSnapshotCacheRef.current.delete(cacheKey)
				setNfts([])
				setNftWarnings([])
				setNftError(message)
			} finally {
				if (nftFetchControllerRef.current === controller) {
					nftFetchControllerRef.current = null
				}
				setNftLoading(false)
			}
		},
		[isMobile],
	)

	const handleTokenSearch = useCallback(
		(term: string) => {
			const nextTerm = term.trim()
			setTokenQuery(nextTerm)
			setHasLoadedTokens(true)
			void fetchTokenCatalog(nextTerm)
		},
		[fetchTokenCatalog],
	)

	const handleNftSearch = useCallback(
		(query: string) => {
			const nextQuery = query.trim().length > 0 ? query.trim() : DEFAULT_NFT_QUERY
			setNftQuery(nextQuery)
			setHasLoadedNfts(true)
			void fetchNftCatalog(nextQuery)
		},
		[fetchNftCatalog],
	)

	const refreshCatalog = useCallback(() => {
		setHasLoadedTokens(true)
		setHasLoadedNfts(true)
		void Promise.all([
			fetchTokenCatalog(tokenQuery, DEFAULT_CHAIN_FILTER, { force: true }),
			fetchNftCatalog(nftQuery, DEFAULT_CHAIN_FILTER, { force: true }),
		])
	}, [fetchTokenCatalog, fetchNftCatalog, nftQuery, tokenQuery])

	// Auto-load tokens on eligibility/rewards steps
	useEffect(() => {
		if ((stepIndex === 1 || stepIndex === 2) && !hasLoadedTokens) {
			setHasLoadedTokens(true)
			void fetchTokenCatalog(tokenQuery)
		}
	}, [fetchTokenCatalog, hasLoadedTokens, stepIndex, tokenQuery])

	// Auto-load NFTs on eligibility/rewards steps
	useEffect(() => {
		if ((stepIndex === 1 || stepIndex === 2) && !hasLoadedNfts) {
			setHasLoadedNfts(true)
			void fetchNftCatalog(nftQuery)
		}
	}, [fetchNftCatalog, hasLoadedNfts, stepIndex, nftQuery])

	return {
		tokens,
		nfts,
		tokenQuery,
		nftQuery,
		tokenLoading,
		nftLoading,
		tokenError,
		nftError,
		tokenWarnings,
		nftWarnings,
		assetsLoading: tokenLoading || nftLoading,
		assetsError: tokenError ?? nftError,
		assetWarnings: [...tokenWarnings, ...nftWarnings],
		onTokenSearch: handleTokenSearch,
		onNftSearch: handleNftSearch,
		onRefreshCatalog: refreshCatalog,
	}
}
