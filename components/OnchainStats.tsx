'use client'

import Image from 'next/image'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { createPublicClient, http, formatEther } from 'viem'
import type { Address } from 'viem'
import { chainStateCache } from '@/lib/cache-storage'
import { ConnectWallet } from '@/components/ConnectWallet'
import { probeMiniappReady, getMiniappContext } from '@/lib/miniappEnv'
import { buildFrameShareUrl, openWarpcastComposer } from '@/lib/share'
import { fetchFidByAddress } from '@/lib/neynar'

// Chain registry for the selector and per-chain behavior
type ChainKey = 'base' | 'celo' | 'optimism' | 'ethereum' | 'arbitrum' | 'avax' | 'berachain' | 'bnb' | 'fraxtal' | 'katana' | 'soneium' | 'taiko' | 'unichain' | 'ink' | 'hyperevm'
type ChainCfg = {
  key: ChainKey
  name: string
  chainId: number
  rpc: string
  explorer: string // without trailing slash
  icon: string
  hasEtherscanV2: boolean // supports api.etherscan.io/v2 with chainid
  nativeSymbol: string
}
const CHAINS: Record<ChainKey, ChainCfg> = {
  base: {
    key: 'base',
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/_ScddWNDeydEhhrjEHgsNRv6nAoaJpgE',
    explorer: 'https://basescan.org',
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/base.svg',
    hasEtherscanV2: true,
    nativeSymbol: 'ETH',
  },
  celo: {
    key: 'celo',
    name: 'Celo',
    chainId: 42220,
    rpc: 'https://forno.celo.org',
    explorer: 'https://celoscan.io',
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/celo.png',
    hasEtherscanV2: true,
    nativeSymbol: 'CELO',
  },
  optimism: {
    key: 'optimism',
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/op.svg',
    hasEtherscanV2: true,
    nativeSymbol: 'ETH',
  },
  ethereum: {
    key: 'ethereum',
    name: 'Ethereum',
    chainId: 1,
    rpc: 'https://eth-mainnet.g.alchemy.com/v2/_ScddWNDeydEhhrjEHgsNRv6nAoaJpgE',
    explorer: 'https://etherscan.io',
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/eth.svg',
    hasEtherscanV2: true,
    nativeSymbol: 'ETH',
  },

  // detail: new chains
  arbitrum: {
    key: 'arbitrum',
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/arbitrum.svg',
    hasEtherscanV2: true,
    nativeSymbol: 'ETH',
  },
  avax: {
    key: 'avax',
    name: 'Avalanche',
    chainId: 43114,
    rpc: 'https://api.avax.network/ext/bc/C/rpc',
    explorer: 'https://snowtrace.io',
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/avax.svg',
    hasEtherscanV2: true,
    nativeSymbol: 'AVAX',
  },
  berachain: {
    key: 'berachain',
    name: 'Berachain',
    chainId: 80094, // detail: update if different on your deployment
    rpc: 'https://rpc.berachain.com', // detail: verify RPC
    explorer: 'https://berascan.com', // detail: verify explorer
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/berachain.svg',
    hasEtherscanV2: true, // explorer API not wired here
    nativeSymbol: 'BERA',
  },
  bnb: {
    key: 'bnb',
    name: 'BNB Smart Chain',
    chainId: 56,
    rpc: 'https://bsc-dataseed.binance.org',
    explorer: 'https://bscscan.com',
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/bnb.svg',
    hasEtherscanV2: true,
    nativeSymbol: 'BNB',
  },
  fraxtal: {
    key: 'fraxtal',
    name: 'Fraxtal',
    chainId: 252,
    rpc: 'https://frax-mainnet.g.alchemy.com/v2/_ScddWNDeydEhhrjEHgsNRv6nAoaJpgE',
    explorer: 'https://fraxscan.com',
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/fraxtal.svg',
    hasEtherscanV2: true,
    nativeSymbol: 'ETH',
  },
  katana: {
    key: 'katana',
    name: 'Katana',
    chainId: 360, // detail: placeholder, update to Katana mainnet chainId
    rpc: 'https://rpc.katana.network', // detail: verify RPC
    explorer: 'https://explorer.katana.org', // detail: verify explorer
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/katana.svg',
    hasEtherscanV2: true,
    nativeSymbol: 'KAT',
  },
  soneium: {
    key: 'soneium',
    name: 'Soneium',
    chainId: 1946, // detail: Minato testnet uses 1946; update if mainnet differs
    rpc: 'https://rpc.minato.soneium.org', // detail: verify or switch to mainnet RPC
    explorer: 'https://explorer.minato.soneium.org', // detail: verify explorer
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/soneium.png',
    hasEtherscanV2: true,
    nativeSymbol: 'ETH',
  },
  taiko: {
    key: 'taiko',
    name: 'Taiko',
    chainId: 167000,
    rpc: 'https://rpc.mainnet.taiko.xyz',
    explorer: 'https://taikoscan.io',
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/taiko.svg',
    hasEtherscanV2: true, // taikoscan may not be on Etherscan v2
    nativeSymbol: 'ETH',
  },
  // detail: added Unichain
  unichain: {
    key: 'unichain',
    name: 'Unichain',
    chainId: 130,
    rpc: 'https://mainnet.unichain.org',
    explorer: 'https://uniscan.xyz',
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/unichain.png',
    hasEtherscanV2: true, // history not via Etherscan; shows RPC stats for now
    nativeSymbol: 'ETH',
  },
  // detail: added Ink
  ink: {
    key: 'ink',
    name: 'Ink',
    chainId: 57073,
    rpc: 'https://ink-mainnet.g.alchemy.com/v2/_ScddWNDeydEhhrjEHgsNRv6nAoaJpgE',
    explorer: 'https://explorer.inkonchain.com',
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/ink.png',
    hasEtherscanV2: true, // history not via Etherscan; shows RPC stats for now
    nativeSymbol: 'INK',
  },
  // detail: HyperEVM (RPC-only until explorer API is added)
  hyperevm: {
    key: 'hyperevm',
    name: 'HyperEVM',
    chainId: 999, // detail: verify chainId
    rpc: 'https://hyperliquid-mainnet.g.alchemy.com/v2/_ScddWNDeydEhhrjEHgsNRv6nAoaJpgE', // detail: verify RPC
    explorer: 'https://explorer.hyperliquid.xyz', // detail: verify explorer
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/hyper.png',
    hasEtherscanV2: true,
    nativeSymbol: 'HYPE',
  },
}

type OnchainStatsData = {
  totalOutgoingTxs: number | null
  contractsDeployed: number | null
  talentScore: number | null
  talentUpdatedAt: string | null
  firstTxAt: number | null
  lastTxAt: number | null
  baseAgeSeconds: number | null
  baseBalanceEth: string | null
  featured?: {
    address: string
    creator: string | null
    creationTx: string | null
    firstTxHash: string | null
    firstTxTime: number | null
    lastTxHash: string | null
    lastTxTime: number | null
  } | null
  totalVolumeEth?: string | null
  neynarScore: number | null
  powerBadge: boolean | null
}

type OnchainShareFields = Partial<Record<
  | 'txs'
  | 'contracts'
  | 'age'
  | 'balance'
  | 'volume'
  | 'talent'
  | 'neynar'
  | 'power'
  | 'featured'
  | 'builder'
  | 'firstTx'
  | 'lastTx'
  | 'chainName'
  | 'explorer',
  string
>>

type CachedStats = {
  fetchedAt: number
  stats: OnchainStatsData
}

const STATS_CACHE_TTL_MS = 3 * 60 * 1000

function createEmptyStats(): OnchainStatsData {
  return {
    totalOutgoingTxs: null,
    contractsDeployed: null,
    talentScore: null,
    talentUpdatedAt: null,
    firstTxAt: null,
    lastTxAt: null,
    baseAgeSeconds: null,
    baseBalanceEth: null,
    featured: null,
    totalVolumeEth: null,
    neynarScore: null,
    powerBadge: null,
  }
}

export function OnchainStats({ onLoadingChange }: { onLoadingChange?: (loading: boolean) => void }) {
  const { address, isConnected } = useAccount()
  const [loading, setLoading] = useState(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const reqIdRef = useRef(0)
  const [chainKey, setChainKey] = useState<ChainKey>('base')
  const chainCfg = CHAINS[chainKey]
  const [viewKey, setViewKey] = useState(0) // for slide-in animation on chain switch
  const onLoadingChangeRef = useRef(onLoadingChange)
  useEffect(() => {
    onLoadingChangeRef.current = onLoadingChange
  }, [onLoadingChange])

  const [stats, setStats] = useState<OnchainStatsData>(() => createEmptyStats())

  const [shareUrl, setShareUrl] = useState('')
  const [sharePending, setSharePending] = useState(false)
  const [shareFeedback, setShareFeedback] = useState<string | null>(null)
  const shareFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const computeShareFields = useCallback(
    (snapshot: OnchainStatsData): OnchainShareFields => {
      const fields: OnchainShareFields = {}
      const numberFmt = new Intl.NumberFormat('en-US')
      if (snapshot.totalOutgoingTxs != null) fields.txs = numberFmt.format(snapshot.totalOutgoingTxs)
      if (snapshot.contractsDeployed != null) fields.contracts = numberFmt.format(snapshot.contractsDeployed)
      if (snapshot.totalVolumeEth) fields.volume = snapshot.totalVolumeEth
      if (snapshot.baseBalanceEth) {
        const balNum = Number(snapshot.baseBalanceEth)
        if (Number.isFinite(balNum)) fields.balance = `${balNum.toFixed(4)} ${chainCfg.nativeSymbol}`
      }
      if (snapshot.baseAgeSeconds != null) {
        const d = Math.floor(snapshot.baseAgeSeconds / 86400)
        const h = Math.floor((snapshot.baseAgeSeconds % 86400) / 3600)
        if (d > 0) fields.age = `${d}d ${h}h`
        else {
          const m = Math.floor((snapshot.baseAgeSeconds % 3600) / 60)
          if (h > 0) fields.age = `${h}h ${m}m`
          else fields.age = `${Math.max(0, Math.floor(snapshot.baseAgeSeconds))}s`
        }
      }
      if (snapshot.talentScore != null) {
        fields.builder = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(snapshot.talentScore)
      }
      if (snapshot.neynarScore != null) {
        fields.neynar = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(snapshot.neynarScore)
      }
      if (snapshot.powerBadge != null) fields.power = snapshot.powerBadge ? 'Yes' : 'No'
      const dateLabel = (ts: number | null) =>
        ts ? new Date(ts * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null
      const firstTx = dateLabel(snapshot.firstTxAt)
      if (firstTx) fields.firstTx = firstTx
      const lastTx = dateLabel(snapshot.lastTxAt)
      if (lastTx) fields.lastTx = lastTx
      fields.chainName = chainCfg.name
      fields.explorer = chainCfg.explorer
      return fields
    },
    [chainCfg.explorer, chainCfg.name, chainCfg.nativeSymbol],
  )

  const getShareUrl = useCallback(
    (addr: string, selected: ChainKey, fields: OnchainShareFields) => {
      const extra: Record<string, string | number | boolean | null | undefined> = {
        statsChain: selected,
        chainName: fields.chainName,
        explorer: fields.explorer,
      }
      for (const [key, value] of Object.entries(fields)) {
        if (key === 'chainName' || key === 'explorer') continue
        if (!value) continue
        const trimmed = value.trim()
        if (!trimmed || trimmed === '—') continue
        extra[key] = trimmed
      }
      return buildFrameShareUrl({
        type: 'onchainstats',
        user: addr,
        chain: selected as any,
        extra,
      })
    },
    [],
  )

  useEffect(() => {
    if (!address) {
      setShareUrl('')
      return
    }
    const fields = computeShareFields(stats)
    setShareUrl(getShareUrl(address, chainKey, fields))
  }, [address, chainKey, computeShareFields, getShareUrl, stats])

  useEffect(() => {
    return () => {
      if (shareFeedbackTimerRef.current) {
        clearTimeout(shareFeedbackTimerRef.current)
      }
    }
  }, [])

  const pushShareFeedback = useCallback((message: string | null) => {
    if (shareFeedbackTimerRef.current) {
      clearTimeout(shareFeedbackTimerRef.current)
      shareFeedbackTimerRef.current = null
    }
    setShareFeedback(message)
    if (message) {
      shareFeedbackTimerRef.current = setTimeout(() => {
        setShareFeedback(null)
        shareFeedbackTimerRef.current = null
      }, 4200)
    }
  }, [])

  const load = useCallback(
    async (force?: boolean) => {
      const normalizedAddress = address?.toLowerCase()
      if (!normalizedAddress) {
        setErrMsg(null)
        setLoading(false)
        onLoadingChangeRef.current?.(false)
        return
      }

      const cacheKey = `stats:${normalizedAddress}:${chainKey}`
      const cached = chainStateCache.get(cacheKey) as CachedStats | null
      if (!force && cached && Date.now() - cached.fetchedAt < STATS_CACHE_TTL_MS) {
        setErrMsg(null)
        setLoading(false)
        onLoadingChangeRef.current?.(false)
        setStats(cached.stats)
        return
      }

      const myId = ++reqIdRef.current
      setLoading(true)
      onLoadingChangeRef.current?.(true)
      setErrMsg(null)

      try {
        const walletAddress = normalizedAddress as Address
        const client = createPublicClient({ transport: http(chainCfg.rpc) })

        const rpcTimeout = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
          Promise.race([
            promise,
            new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 10000))
          ])

        const [nonce, bal] = await Promise.all([
          rpcTimeout(client.getTransactionCount({ address: walletAddress }), 0),
          rpcTimeout(client.getBalance({ address: walletAddress }), 0n),
        ])

        const ES_V2 = 'https://api.etherscan.io/v2/api'
        const apiKey =
          process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY ||
          process.env.NEXT_PUBLIC_BASESCAN_API_KEY ||
          process.env.ETHERSCAN_API_KEY

        let contractsDeployed: number | null = null
        let featured:
          | { address: string; creator: string | null; creationTx: string | null; firstTxHash: string | null; firstTxTime: number | null; lastTxHash: string | null; lastTxTime: number | null }
          | null = null
        let firstTxAt: number | null = null
        let lastTxAt: number | null = null
        let baseAgeSeconds: number | null = null
        let totalVolumeEth: string | null = null

        const fetchJson = async (url: string, timeout = 4500) => {
          const ctrl = new AbortController()
          const to = setTimeout(() => ctrl.abort(), timeout)
          try {
            const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' })
            return await res.json()
          } finally {
            clearTimeout(to)
          }
        }

        const ZERO = '0x0000000000000000000000000000000000000000'
        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

        const countDeployedContracts = async (addr: string) => {
          const limit = 1000
          let startBlock = 0
          const seenTx = new Set<string>()
          const contracts = new Set<string>()
          for (let pages = 0; pages < 100; pages++) {
            const url = `${ES_V2}?chainid=${chainCfg.chainId}&module=account&action=txlist&address=${addr}&startblock=${startBlock}&endblock=latest&page=1&offset=${limit}&sort=asc&apikey=${apiKey}`
            const j = await fetchJson(url, 12000)
            const arr: any[] = j?.status === '1' && Array.isArray(j.result) ? j.result : []
            if (arr.length === 0) break
            for (const t of arr) {
              const hash = String(t?.hash || '')
              if (!hash || seenTx.has(hash)) continue
              seenTx.add(hash)
              const toEmpty = !t?.to || t.to === ''
              const cAddrRaw = t?.contractAddress || ''
              const cAddr =
                typeof cAddrRaw === 'string' && cAddrRaw && cAddrRaw !== ZERO
                  ? cAddrRaw.toLowerCase()
                  : null
              if (toEmpty || cAddr) {
                contracts.add(cAddr || `tx:${hash}`)
              }
            }
            const last = arr[arr.length - 1]
            const lastBlock = Number(last?.blockNumber || 0)
            if (!lastBlock) break
            if (arr.length < limit) break
            startBlock = Math.max(0, lastBlock - 1)
            await sleep(140)
          }
          return { count: contracts.size, contracts: Array.from(contracts) }
        }

        const computeEthTotalVolume = async (addr: string) => {
          const limit = 1000
          const addrLc = addr.toLowerCase()
          let inWei = 0n
          let outWei = 0n

          const pageAction = async (action: 'txlist' | 'txlistinternal') => {
            let startBlock = 0
            for (let pages = 0; pages < 100; pages++) {
              const url =
                `${ES_V2}?chainid=${chainCfg.chainId}&module=account&action=${action}&address=${addr}` +
                 `&startblock=${startBlock}&endblock=99999999&page=1&offset=${limit}&sort=asc&apikey=${apiKey}`
              const j = await fetchJson(url, 12000)
              const arr: any[] = j?.status === '1' && Array.isArray(j.result) ? j.result : []
              if (arr.length === 0) break
              for (const t of arr) {
                const val = BigInt(t?.value || '0')
                const from = String(t?.from || '').toLowerCase()
                const to = String(t?.to || '').toLowerCase()
                if (from === addrLc && to !== addrLc) outWei = outWei + val
                if (to === addrLc && from !== addrLc) inWei = inWei + val
              }
              const last = arr[arr.length - 1]
              const lastBlock = Number(last?.blockNumber || 0)
              if (!lastBlock || arr.length < limit) break
              startBlock = Math.max(0, lastBlock - 1)
              await sleep(140)
            }
          }

          await pageAction('txlist')
          await pageAction('txlistinternal')

          const total = inWei + outWei
          return total
        }

        if (apiKey && chainCfg.hasEtherscanV2) {
          try {
            const listUrl = `${ES_V2}?chainid=${chainCfg.chainId}&module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=latest&page=1&offset=100&sort=desc&apikey=${apiKey}`
            const j = await fetchJson(listUrl, 5000)
            if (j?.status === '1' && Array.isArray(j.result)) {
              const txs: any[] = j.result

              try {
                const firstUrl = `${ES_V2}?chainid=${chainCfg.chainId}&module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=latest&page=1&offset=1&sort=asc&apikey=${apiKey}`
                const fj = await fetchJson(firstUrl, 5000)
                const f0 = fj?.status === '1' && Array.isArray(fj.result) ? fj.result[0] : null
                firstTxAt = f0?.timeStamp ? Number(f0.timeStamp) : null
              } catch {}
              try {
                const lastUrl = `${ES_V2}?chainid=${chainCfg.chainId}&module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=latest&page=1&offset=1&sort=desc&apikey=${apiKey}`
                const lj = await fetchJson(lastUrl, 5000)
                const l0 = lj?.status === '1' && Array.isArray(lj.result) ? lj.result[0] : null
                lastTxAt = l0?.timeStamp ? Number(l0.timeStamp) : null
              } catch {}
              if (firstTxAt != null) {
                const nowSec = Math.floor(Date.now() / 1000)
                baseAgeSeconds = Math.max(0, nowSec - firstTxAt)
              }

              try {
                const dep = await countDeployedContracts(walletAddress)
                contractsDeployed = dep.count
              } catch {
                contractsDeployed = contractsDeployed ?? 0
              }

              const creationTxs = txs.filter(
                (t) =>
                  !t?.to ||
                  t?.to === '' ||
                  (t?.contractAddress && t.contractAddress !== ZERO),
              )
              const uniqueContractsRecent = Array.from(
                new Set(
                  creationTxs
                    .map((t: any) =>
                      t.contractAddress && t.contractAddress !== ZERO ? t.contractAddress : null,
                    )
                    .filter(Boolean),
                ),
              ) as string[]
              const featuredAddr = uniqueContractsRecent[0]
              if (featuredAddr) {
                const creationUrl = `${ES_V2}?chainid=${chainCfg.chainId}&module=contract&action=getcontractcreation&contractaddresses=${featuredAddr}&apikey=${apiKey}`
                const cj = await fetchJson(creationUrl, 5000)
                const creator =
                  cj?.status === '1' && Array.isArray(cj.result) && cj.result[0]?.contractCreator
                    ? String(cj.result[0].contractCreator)
                    : null
                const creationTx =
                  cj?.status === '1' && Array.isArray(cj.result) && cj.result[0]?.txHash
                    ? String(cj.result[0].txHash)
                    : null
                const firstUrl = `${ES_V2}?chainid=${chainCfg.chainId}&module=account&action=txlist&address=${featuredAddr}&startblock=0&endblock=latest&page=1&offset=1&sort=asc&apikey=${apiKey}`
                const fj = await fetchJson(firstUrl, 4500)
                const f0 = fj?.status === '1' && Array.isArray(fj.result) ? fj.result[0] : null
                const firstTxHash = f0?.hash ? String(f0.hash) : null
                const firstTxTime = f0?.timeStamp ? Number(f0.timeStamp) : null
                const lastUrl = `${ES_V2}?chainid=${chainCfg.chainId}&module=account&action=txlist&address=${featuredAddr}&startblock=0&endblock=latest&page=1&offset=1&sort=desc&apikey=${apiKey}`
                const lj = await fetchJson(lastUrl, 4500)
                const l0 = lj?.status === '1' && Array.isArray(lj.result) ? lj.result[0] : null
                const lastTxHash = l0?.hash ? String(l0.hash) : null
                const lastTxTime = l0?.timeStamp ? Number(l0.timeStamp) : null
                featured = {
                  address: featuredAddr,
                  creator,
                  creationTx,
                  firstTxHash,
                  firstTxTime,
                  lastTxHash,
                  lastTxTime,
                }
              }

              try {
                const totalWei = await computeEthTotalVolume(walletAddress)
                totalVolumeEth = `${Number(formatEther(totalWei)).toFixed(4)} ${chainCfg.nativeSymbol}`
              } catch {
                totalVolumeEth = null
              }
            } else {
              contractsDeployed = 0
            }
          } catch {
            contractsDeployed = (contractsDeployed ?? 0) || 0
          }
        } else {
          contractsDeployed = null
          firstTxAt = null
          lastTxAt = null
          baseAgeSeconds = null
          totalVolumeEth = null
        }

        let talentScore: number | null = null
        let talentUpdatedAt: string | null = null
        let neynarScore: number | null = null
        let powerBadge: boolean | null = null

        try {
          const talentKey =
            process.env.NEXT_PUBLIC_TALENT_API_KEY ||
            process.env.TALENT_API_KEY
          if (talentKey) {
            let id: string | null = null
            let source: 'farcaster' | 'wallet' | undefined
            try {
              if (await probeMiniappReady()) {
                const ctx = await getMiniappContext()
                const f = ctx?.user?.fid
                if (f != null) {
                  id = String(f)
                  source = 'farcaster'
                }
              }
            } catch {}
            if (!id) {
              id = walletAddress
              source = 'wallet'
            }
            if (id) {
              const qs = new URLSearchParams({ id })
              if (source === 'farcaster') qs.set('account_source', 'farcaster')
              if (source === 'wallet') qs.set('account_source', 'wallet')
              const ctrl = new AbortController()
              const to = setTimeout(() => ctrl.abort(), 3500)
              const resp = await fetch(`https://api.talentprotocol.com/scores?${qs.toString()}`, {
                signal: ctrl.signal,
                headers: {
                  Accept: 'application/json',
                  'X-API-KEY': talentKey as string,
                },
              })
              clearTimeout(to)
              if (resp.ok) {
                const j = await resp.json().catch(() => null)
                const scores = Array.isArray(j?.scores) ? j.scores : []
                const builder = scores.find((s: any) => String(s?.slug) === 'builder_score')
                if (builder) {
                  talentScore =
                    typeof builder.points === 'number'
                      ? builder.points
                      : Number(builder.points)
                  talentUpdatedAt = builder.last_calculated_at || null
                }
              } else if (resp.status === 401) {
                console.warn('Talent API unauthorized. Set NEXT_PUBLIC_TALENT_API_KEY.')
              }
            }
          }
        } catch {
          talentScore = talentScore ?? null
          talentUpdatedAt = talentUpdatedAt ?? null
        }

        try {
          const NEYNAR_KEY =
            process.env.NEXT_PUBLIC_NEYNAR_API_KEY || process.env.NEYNAR_API_KEY
          if (NEYNAR_KEY) {
            let fid: number | null = null
            try {
              if (await probeMiniappReady()) {
                const ctx = await getMiniappContext()
                const f = ctx?.user?.fid
                if (typeof f === 'number') fid = f
              }
            } catch {}
            if (!fid) {
              try {
                fid = await fetchFidByAddress(walletAddress)
              } catch (error) {
                console.warn('Failed to resolve fid via fetchFidByAddress:', error)
              }
            }
            if (fid != null) {
              const bulk = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
                headers: { 'x-api-key': NEYNAR_KEY, Accept: 'application/json' },
                cache: 'no-store',
              }).then((r) => (r.ok ? r.json() : null)).catch(() => null as any)
              const user = Array.isArray(bulk?.users) ? bulk.users[0] : null
              if (user) {
                const score = typeof user.score === 'number'
                  ? user.score
                  : (typeof user.experimental?.neynar_user_score === 'number' ? user.experimental.neynar_user_score : null)
                neynarScore = score != null ? Number(score) : null
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore – field exists on Neynar response
                const pb = user.power_badge
                powerBadge = typeof pb === 'boolean' ? pb : (typeof pb === 'string' ? pb === 'true' : null)
              }
            }
          }
        } catch {
          neynarScore = neynarScore ?? null
          powerBadge = powerBadge ?? null
        }

        const nextStats: OnchainStatsData = {
          totalOutgoingTxs: Number(nonce),
          contractsDeployed,
          talentScore,
          talentUpdatedAt,
          firstTxAt,
          lastTxAt,
          baseAgeSeconds,
          baseBalanceEth: Number(bal) >= 0 ? formatEther(bal) : null,
          featured,
          totalVolumeEth,
          neynarScore,
          powerBadge,
        }

        if (reqIdRef.current === myId) {
          setStats(nextStats)
          chainStateCache.set(cacheKey, { stats: nextStats, fetchedAt: Date.now() })
        }
      } catch (e: any) {
        if (reqIdRef.current === myId) setErrMsg(e?.message || 'Failed to load onchain stats')
      } finally {
        if (reqIdRef.current === myId) {
          setLoading(false)
          onLoadingChangeRef.current?.(false)
        }
      }
    },
    [address, chainCfg, chainKey],
  )

  useEffect(() => {
    void load()
  }, [load])
  // slide-in on chain change
  useEffect(() => {
    setViewKey((k) => k + 1)
  }, [chainKey])

  const handleShareFrame = useCallback(async () => {
    if (!address) {
      pushShareFeedback('Connect your wallet to share stats.')
      return
    }
    const fields = computeShareFields(stats)
    const url = getShareUrl(address, chainKey, fields) || shareUrl
    if (!url) {
      pushShareFeedback('Unable to build share link in this context.')
      return
    }
    try {
      setSharePending(true)
      pushShareFeedback('Opening Warpcast composer…')
      const summaryParts = [
        fields.txs ? `Txs ${fields.txs}` : null,
        fields.contracts ? `Contracts ${fields.contracts}` : null,
        fields.volume ? `Volume ${fields.volume}` : null,
        fields.balance ? `Balance ${fields.balance}` : null,
        fields.age ? `Age ${fields.age}` : null,
        fields.builder ? `Builder Score ${fields.builder}` : null,
        fields.neynar ? `Neynar Score ${fields.neynar}` : null,
        fields.power ? `Power Badge ${fields.power}` : null,
        fields.firstTx ? `First TX ${fields.firstTx}` : null,
        fields.lastTx ? `Last TX ${fields.lastTx}` : null,
      ].filter((entry): entry is string => Boolean(entry))
      const summary = summaryParts.map((entry) => `• ${entry}`).join('\n')
      const text = summary
        ? `Flexing my ${chainCfg.name} onchain stats via @gmeowbased.\n${summary}`
        : `Flexing my ${chainCfg.name} onchain stats via @gmeowbased.`
      const mode = await openWarpcastComposer(text, url)
      if (mode === 'noop') {
        pushShareFeedback('Share unavailable in this environment.')
      } else {
        pushShareFeedback(mode === 'miniapp' ? 'Cast shared inside Warpcast.' : 'Warpcast composer opened.')
      }
    } catch (error: any) {
      console.error('Share frame failed:', error?.message || error)
      pushShareFeedback('Share failed. Try again shortly.')
    } finally {
      setSharePending(false)
    }
  }, [address, chainKey, chainCfg.name, computeShareFields, getShareUrl, pushShareFeedback, shareUrl, stats])

  if (!isConnected) {
    return (
      <div className="text-center">
        <p className="text-[var(--px-sub)] text-sm mb-3">Connect your wallet to view your onchain stats.</p>
        <div className="flex items-center justify-center">
          <ConnectWallet />
        </div>
      </div>
    )
  }

  const fmt = (n: number | null) => (n == null ? '—' : new Intl.NumberFormat('en-US').format(n))
  const fmtDate = (ts: number | null) => (ts ? new Date(ts * 1000).toLocaleString() : '—')
  const fmtDuration = (secs: number | null) => {
    if (secs == null) return '—'
    const d = Math.floor(secs / 86400)
    const h = Math.floor((secs % 86400) / 3600)
    if (d > 0) return `${d}d ${h}h`
    const m = Math.floor((secs % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    return `${Math.max(0, Math.floor(secs))}s`
  }
  const short = (s?: string | null, head = 6, tail = 4) =>
    s ? `${s.slice(0, head)}…${s.slice(-tail)}` : '—'
  const txUrl = (h?: string | null) => (h ? `${chainCfg.explorer}/tx/${h}` : '#')
  const addrUrl = (a?: string | null) => (a ? `${chainCfg.explorer}/address/${a}` : '#')

  const valueSize = (k: string) =>
    k === 'first' || k === 'last'
      ? 'text-base sm:text-lg font-medium'
      : 'text-3xl sm:text-4xl font-extrabold tracking-tight leading-none'

  const valueStyle = (k: string): React.CSSProperties => {
    const common: React.CSSProperties = {
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent',
      textShadow: '0 2px 0 rgba(0,0,0,0.35)',
    }
    const g = (c1: string, c2: string) => ({ ...common, backgroundImage: `linear-gradient(90deg, ${c1}, ${c2})` })
    switch (k) {
      case 'txs': return g('#7CFF7A', '#19C37D')
      case 'contracts': return g('#FFC46B', '#FF7A00')
      case 'age': return g('#C084FC', '#7C3AED')
      case 'talent': return g('#60A5FA', '#22D3EE')
      case 'neynar': return g('#F472B6', '#A78BFA')
      case 'balance': return g('#7DD3FC', '#34D399')
      case 'volume': return g('#FDE68A', '#F59E0B')
      case 'first':
      case 'last':
        return { color: 'var(--px-sub)', textShadow: 'none' }
      default: return common
    }
  }

  return (
    <div>
      <div className="mb-3">
        {shareFeedback && (
          <p className="mb-2 text-right text-[10px] text-[var(--px-sub)]">{shareFeedback}</p>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            className="pixel-pill text-[10px] flex items-center gap-1 disabled:opacity-60"
            onClick={handleShareFrame}
            disabled={sharePending || !address}
            title={`Share ${chainCfg.name} frame`}
          >
            <span aria-hidden>📤</span>
            {sharePending ? 'Sharing…' : `Share ${chainCfg.name}`}
          </button>
          <button
            type="button"
            className="pixel-pill text-[10px] disabled:opacity-60"
            onClick={() => void load(true)}
            disabled={loading}
            title="Refresh onchain stats"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>
      {/* Stats + Featured for selected chain, slide-in */}
      <div key={viewKey} className="oc-slide-in">
        {loading && (
          <div className="mb-3">
            <div
              className="h-3 w-3 rounded-full animate-spin inline-block mr-2 align-middle oc-spinner"
            />
            <span className="text-[12px] text-[var(--px-sub)] align-middle">Fetching {chainCfg.name} stats…</span>
          </div>
        )}
        {errMsg && <p className="text-xs text-red-400 mb-3">Error: {errMsg}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { k: 'txs', label: 'Total Transactions', sub: 'Outgoing nonce', val: fmt(stats.totalOutgoingTxs), icon: '🧾' },
            { k: 'contracts', label: 'Contracts Deployed', sub: chainCfg.hasEtherscanV2 ? 'Explorer API' : 'Not available', val: fmt(stats.contractsDeployed), icon: '🧱' },
            { k: 'age', label: `Age on ${chainCfg.name}`, sub: 'Since first tx', val: fmtDuration(stats.baseAgeSeconds), icon: '⏳' },
            { k: 'volume', label: 'Total Volume', sub: 'Native (normal + internal)', val: stats.totalVolumeEth ?? '—', icon: '💧' },
            {
              k: 'talent',
              label: 'Builder Score',
              sub: 'Talent Protocol',
              val: stats.talentScore == null ? '—' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(stats.talentScore),
              icon: '🎓',
            },
            {
              k: 'neynar',
              label: 'Neynar Score',
              sub: 'Social Graph',
              val: stats.neynarScore == null ? '—' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(stats.neynarScore),
              icon: '⭐',
            },
            {
              k: 'power',
              label: 'Power Badge',
              sub: 'Neynar',
              val: stats.powerBadge == null ? '—' : (stats.powerBadge ? 'Yes 🔥' : 'No'),
              icon: '⚡',
            },
            { k: 'balance', label: 'Native Balance', sub: chainCfg.name, val: stats.baseBalanceEth ? `${Number(stats.baseBalanceEth).toFixed(4)} ${chainCfg.nativeSymbol}` : '—', icon: '🪙' },
            { k: 'first', label: 'First TX', sub: 'Historic', val: fmtDate(stats.firstTxAt), icon: '⏱️' },
            { k: 'last', label: 'Last TX', sub: 'Recent', val: fmtDate(stats.lastTxAt), icon: '🧭' },
          ].map((t) => (
            <div
              key={t.k}
              className="relative p-3 sm:p-4 oc-tile"
            >
              <div aria-hidden className="oc-tile-glow" />
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl leading-none">{t.icon}</span>
                  <div className="pixel-tile-label">{t.label}</div>
                </div>
                <span className="pixel-pill text-[10px]">{t.sub}</span>
              </div>

              <div className={`pixel-tile-value ${valueSize(t.k)}`} style={valueStyle(t.k)}>
                {t.val}
              </div>
            </div>
          ))}
        </div>

        {chainCfg.hasEtherscanV2 && stats.featured && (
          <div className="pixel-card mt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="pixel-section-title text-base">Featured Contract ({chainCfg.name})</h3>
              <span className="pixel-pill text-[10px]">CHAIN {chainCfg.chainId}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                className="relative p-3 sm:p-4 oc-tile"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📄</span>
                    <div className="pixel-tile-label">Address</div>
                  </div>
                  <a href={addrUrl(stats.featured.address)} target="_blank" rel="noopener noreferrer" className="pixel-pill text-[10px]">
                    View on Explorer
                  </a>
                </div>
                <div className="pixel-tile-value">{short(stats.featured.address)}</div>
                <div className="mt-2 text-[12px] text-[var(--px-sub)]">
                  Creator: <a className="hover:underline" href={addrUrl(stats.featured.creator)} target="_blank" rel="noopener noreferrer">{short(stats.featured.creator)}</a>
                </div>
                <div className="text-[12px] text-[var(--px-sub)]">
                  Creation TX: <a className="hover:underline" href={txUrl(stats.featured.creationTx)} target="_blank" rel="noopener noreferrer">{short(stats.featured.creationTx, 8, 6)}</a>
                </div>
              </div>

              <div
                className="relative p-3 sm:p-4 oc-tile"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🔎</span>
                    <div className="pixel-tile-label">Activity</div>
                  </div>
                  <span className="pixel-pill text-[10px]">FIRST / LAST</span>
                </div>
                <div className="text-sm">
                  <div className="mb-1">
                    First TX: <a className="hover:underline" href={txUrl(stats.featured.firstTxHash)} target="_blank" rel="noopener noreferrer">{short(stats.featured.firstTxHash, 8, 6)}</a>
                  </div>
                  <div className="text-[12px] text-[var(--px-sub)] mb-2">at {fmtDate(stats.featured.firstTxTime)}</div>
                  <div className="mb-1">
                    Last TX: <a className="hover:underline" href={txUrl(stats.featured.lastTxHash)} target="_blank" rel="noopener noreferrer">{short(stats.featured.lastTxHash, 8, 6)}</a>
                  </div>
                  <div className="text-[12px] text-[var(--px-sub)]">at {fmtDate(stats.featured.lastTxTime)}</div>
                </div>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-[var(--px-sub)]">
              {chainCfg.hasEtherscanV2
                ? `Data via Etherscan v2 (chainId ${chainCfg.chainId}). Set NEXT_PUBLIC_ETHERSCAN_API_KEY.`
                : `Explorer API not integrated for ${chainCfg.name} yet.`}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="pixel-section-title text-base">Chains</h3>
          <span className="pixel-pill text-[10px]">MULTICHAIN</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.values(CHAINS).map((c) => {
            const active = c.key === chainKey
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setChainKey(c.key)}
                className={`pixel-card flex items-center gap-2 p-2 transition ${active ? 'ring-2 ring-[var(--px-accent)] brightness-110' : 'hover:brightness-110'}`}
                title={`Switch to ${c.name}`}
              >
                <Image src={c.icon} alt={c.name} width={20} height={20} className="pixelated" unoptimized />
                <span className="text-sm">{c.name}</span>
              </button>
            )
          })}
        </div>
      </div>
     {/* detail: animation + tile styling lives in app/styles.css → ONCHAIN STATS SURFACE */}
    </div>
  )
}