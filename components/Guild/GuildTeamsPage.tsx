'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import clsx from 'clsx'
import { useAccount, useChainId, useConfig, useSwitchChain } from 'wagmi'
import { useFocusTrap } from '@/components/quest-wizard/components/Accessibility'
import { getPublicClient, waitForTransactionReceipt, writeContract } from 'wagmi/actions'
import {
  CHAIN_IDS,
  type ChainKey,
  GM_CONTRACT_ABI,
  getContractAddress,
} from '@/lib/gm-utils'
import { formatNumber } from '@/lib/formatters'
import { buildGuildSlug } from '@/lib/team'
import { buildFrameShareUrl, openWarpcastComposer } from '@/lib/share'
import type { FarcasterUser } from '@/lib/neynar'
import { XPEventOverlay, type XpEventPayload } from '@/components/XPEventOverlay'
import { RankProgress } from '@/components/ui/RankProgress'
import { useLegacyNotificationAdapter } from '@/components/ui/live-notifications'
import { ICON_SIZES } from '@/lib/icon-sizes'
import { readStorageCache, writeStorageCache } from '@/lib/utils'

const QRCode = dynamic(() => import('qrcode.react').then((m) => m.QRCodeSVG), { ssr: false })

const SUPPORTED_CHAINS: ChainKey[] = ['base', 'unichain', 'celo', 'ink', 'op']
const CHAIN_LABEL: Record<ChainKey, string> = {
  base: 'Base',
  unichain: 'Unichain',
  celo: 'Celo',
  ink: 'Ink',
  op: 'Optimism',
}
const CHAIN_BRAND: Record<ChainKey, { bg: string; fg: string; label: string; title: string }> = {
  base: { bg: '#0052ff', fg: '#ffffff', label: 'B', title: 'Base' },
  unichain: { bg: '#8247e5', fg: '#ffffff', label: 'U', title: 'Unichain' },
  celo: { bg: '#35d07f', fg: '#0a0a0a', label: 'C', title: 'Celo' },
  ink: { bg: '#111111', fg: '#ffffff', label: 'I', title: 'Ink' },
  op: { bg: '#ff0420', fg: '#ffffff', label: 'OP', title: 'Optimism' },
}
const ZERO_ADDR = '0x0000000000000000000000000000000000000000' as const
const MIN_POINTS_TO_CREATE = 100n

const EMPTY_CHAIN_STATE: Record<ChainKey, { code: string; registered: boolean }> = {
  base: { code: '', registered: false },
  unichain: { code: '', registered: false },
  celo: { code: '', registered: false },
  ink: { code: '', registered: false },
  op: { code: '', registered: false },
}

const GUILD_DIRECTORY_CACHE_KEY = 'gmeowGuildDirectory_v1'
const GUILD_DIRECTORY_CACHE_TTL_MS = 1000 * 60 * 3
const GUILD_MEMBERSHIP_CACHE_PREFIX = 'gmeowGuildMembership_v1::'
const GUILD_MEMBERSHIP_CACHE_TTL_MS = 1000 * 60 * 3
const MAX_DIRECTORY_SCAN = 200

const HOW_IT_WORKS_STEPS: Array<{ title: string; summary: string; body: string; action?: string }> = [
  {
    title: 'Connect & choose a chain',
    summary: 'Link your wallet, then pick the network where your guild will live.',
    body: 'Use the chain selector to hop between Base, Celo, Ink, Optimism, or Unichain. Your point balance updates instantly per network.',
    action: 'Tap the chain chip inside the launch card to switch networks before deploying.',
  },
  {
    title: 'Secure your referral identity',
    summary: 'Claim a short referral code or link a friend’s code to unlock bonuses.',
    body: 'Referral codes make every invite worth XP. Set one that matches your Farcaster handle or link a friend to split welcome rewards.',
    action: 'Open the Referral Hub card and set your code in a single step.',
  },
  {
    title: 'Create or join a guild',
    summary: 'Spend points to launch a guild or join an existing crew in one click.',
    body: 'Creating a guild escrows a small number of points (refundable). Prefer to explore? Filter the directory, preview stats, and join directly from the cards.',
    action: 'Use “Launch guild” or “Join guild” buttons right from the directory grid.',
  },
  {
    title: 'Grow your roster',
    summary: 'Share QR invites, fire quests, and rally GM streaks to climb leaderboards.',
    body: 'Treasury deposits level up your guild score. Create guild quests to coordinate members and claim rewards straight from the new console.',
    action: 'Hit “Manage guild” to open the new console with treasury and quest tools.',
  },
]

const FRIENDLY_TIPS: Array<{ title: string; body: string; icon: string }> = [
  { title: 'Broadcast-ready invites', body: 'Invite links bundle the referral code and guild slug. Share once and new members land on your console.', icon: '📡' },
  { title: 'Mobile-first flow', body: 'All high-frequency actions live above the fold. Switch chains, launch guilds, and share invites without scrolling.', icon: '📱' },
  { title: 'Transparent stats', body: 'Guild cards surface live member counts, point totals, and your join status so you always know where to focus.', icon: '📊' },
]

type Membership = {
  chain: ChainKey
  teamId: number
  teamName: string
  totalPoints: number
  memberCount: number
  founder: string
  registered: boolean
}

type TeamEntry = {
  chain: ChainKey
  teamId: number
  name: string
  founder: string
  totalPoints: number
  memberCount: number
}

type GuildDirectoryCachePayload = {
  teams: TeamEntry[]
  scanLimit: number
}

type GuildMembershipCachePayload = {
  memberships: Membership[]
  selectedGuildChain: ChainKey | null
  pointsPerChain: Partial<Record<ChainKey, string>>
  alreadyFounderAnywhere: boolean
  registeredSnapshots: Record<ChainKey, { code: string; registered: boolean }>
}

function ChainIcon({ chain, size = 16 }: { chain: ChainKey; size?: number }) {
  const def = CHAIN_BRAND[chain]
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-label={def.title} role="img" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <rect x="2" y="2" width="20" height="20" rx={size} ry={size} fill={def.bg} />
      <text x="12" y="15" textAnchor="middle" fontSize="11" fontWeight="700" fill={def.fg} className="site-font">
        {def.label}
      </text>
    </svg>
  )
}

function shortAddr(addr?: string | null) {
  if (!addr) return '-'
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

async function getCurrentUserFarcaster(): Promise<FarcasterUser | null> {
  try {
    const { sdk } = await import('@farcaster/miniapp-sdk')
    const ctx = await sdk.context
    if (ctx?.user) {
      return {
        fid: ctx.user.fid,
        username: ctx.user.username,
        displayName: ctx.user.displayName,
        pfpUrl: ctx.user.pfpUrl,
      }
    }
  } catch {}
  return null
}

function GuildRulesPanel({ chains, onClose }: { chains: ChainKey[]; onClose: () => void }) {
  const containerRef = useFocusTrap(true)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div className="guild-modal-backdrop fixed inset-0 z-40 flex items-end justify-center px-4 pb-24 transition-opacity duration-200 sm:items-center sm:pb-0">
      <div className="w-full max-w-xl">
        <div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="guild-rules-title"
          className="pixel-card guild-modal-card relative overflow-hidden text-left"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close guild rules modal"
            className="guild-modal-close absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full text-base font-semibold uppercase tracking-[0.22em]"
          >
            ✕
          </button>
          <header className="mb-4 flex flex-col gap-1 pr-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-200/70">Gmeow Guilds</p>
            <h3 id="guild-rules-title" className="pixel-heading text-[22px]">Guild Rules &amp; Quick Guide</h3>
            <p className="text-[12px] text-slate-200">Keep your squads aligned across Base, Optimism, Celo, Ink, and Unichain.</p>
          </header>
          <ol className="list-decimal space-y-3 pl-6 text-[13px] text-sky-100">
            <li>Guilds are per-chain. Switching networks moves your membership to that chain.</li>
            <li>Each founder can register a single guild identity across the multichain roster.</li>
            <li>Deposits grow the treasury and level your guild by 10% of each point contribution.</li>
            <li>Apply a referral code before joining to unlock the welcome XP boost.</li>
          </ol>
          <div className="mt-6 flex flex-wrap gap-2">
            {chains.map((chain) => (
              <span key={chain} className="guild-pill guild-pill--compact flex items-center gap-1.5">
                <ChainIcon chain={chain} size={ICON_SIZES.xs} />
                <span>{CHAIN_BRAND[chain].title}</span>
              </span>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <button type="button" className="guild-button guild-button--secondary min-h-[44px]" onClick={onClose}>
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GuildTeamsPage() {
  const { address } = useAccount()
  const wagmiConfig = useConfig()
  const currentChainId = useChainId()
  const { switchChainAsync } = useSwitchChain()

  const pushNotification = useLegacyNotificationAdapter()
  const membershipCacheKey = useMemo(
    () => (address ? `${GUILD_MEMBERSHIP_CACHE_PREFIX}${address.toLowerCase()}` : null),
    [address],
  )

  const [chainForCreate, setChainForCreate] = useState<ChainKey>('base')
  const [teamName, setTeamName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)

  const [memberships, setMemberships] = useState<Membership[]>([])
  const [selectedGuildChain, setSelectedGuildChain] = useState<ChainKey | null>(null)
  const [pointsPerChain, setPointsPerChain] = useState<Partial<Record<ChainKey, bigint>>>({})
  const [alreadyFounderAnywhere, setAlreadyFounderAnywhere] = useState(false)
  const [registeredSnapshots, setRegisteredSnapshots] = useState<Record<ChainKey, { code: string; registered: boolean }>>({ ...EMPTY_CHAIN_STATE })
  const [refChain, setRefChain] = useState<ChainKey>('base')
  const [myRefCode, setMyRefCode] = useState('')
  const [myRegistered, setMyRegistered] = useState(false)
  const [editRefCode, setEditRefCode] = useState('')
  const [referralInput, setReferralInput] = useState('')
  const [refLoading, setRefLoading] = useState<string | null>(null)
  const [refMsg, setRefMsg] = useState<string | null>(null)
  const [refErr, setRefErr] = useState<string | null>(null)

  const [teams, setTeams] = useState<TeamEntry[]>([])
  const [isLoadingTeams, setIsLoadingTeams] = useState(true)
  const [scanLimit, setScanLimit] = useState(20)
  const [directoryChain, setDirectoryChain] = useState<'all' | ChainKey>('all')
  const [searchText, setSearchText] = useState('')
  const [joiningKey, setJoiningKey] = useState<string | null>(null)
  const [opMsg, setOpMsg] = useState<string | null>(null)
  const [opErr, setOpErr] = useState<string | null>(null)
  const [hasCachedDirectory, setHasCachedDirectory] = useState(false)
  const [directoryCacheHydrated, setDirectoryCacheHydrated] = useState(false)

  const [showRules, setShowRules] = useState(false)
  const [currentUserFarcaster, setCurrentUserFarcaster] = useState<FarcasterUser | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [xpOverlay, setXpOverlay] = useState<XpEventPayload | null>(null)

  useEffect(() => {
    let active = true
    getCurrentUserFarcaster().then((fc) => {
      if (!active) return
      setCurrentUserFarcaster(fc)
      if (!myRefCode && fc?.username) setEditRefCode(fc.username.toLowerCase())
    })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const cached = readStorageCache<GuildDirectoryCachePayload>(
      GUILD_DIRECTORY_CACHE_KEY,
      GUILD_DIRECTORY_CACHE_TTL_MS,
    )
    if (cached?.teams?.length) {
      setTeams(cached.teams)
      setIsLoadingTeams(false)
      setHasCachedDirectory(true)
      if (typeof cached.scanLimit === 'number' && cached.scanLimit > 0) {
        setScanLimit((prev) => {
          const next = Math.max(prev, Math.min(cached.scanLimit, MAX_DIRECTORY_SCAN))
          return next
        })
      }
    }
    setDirectoryCacheHydrated(true)
  }, [])

  useEffect(() => {
    if (!membershipCacheKey) return
    const cached = readStorageCache<GuildMembershipCachePayload>(
      membershipCacheKey,
      GUILD_MEMBERSHIP_CACHE_TTL_MS,
    )
    if (!cached) return
    if (Array.isArray(cached.memberships)) setMemberships(cached.memberships)
    const points: Partial<Record<ChainKey, bigint>> = {}
    if (cached.pointsPerChain) {
      Object.entries(cached.pointsPerChain).forEach(([key, value]) => {
        if (typeof value !== 'string' || !value) return
        try {
          points[key as ChainKey] = BigInt(value)
        } catch {}
      })
    }
    setPointsPerChain(points)
    setAlreadyFounderAnywhere(Boolean(cached.alreadyFounderAnywhere))
    setRegisteredSnapshots((prev) => ({ ...prev, ...(cached.registeredSnapshots ?? {}) }))
    if (cached.selectedGuildChain) {
      const exists = cached.memberships?.some((m) => m.chain === cached.selectedGuildChain)
      if (exists) setSelectedGuildChain(cached.selectedGuildChain)
    } else if (cached.memberships?.length && !selectedGuildChain) {
      setSelectedGuildChain(cached.memberships[0].chain)
    }
  }, [membershipCacheKey, selectedGuildChain])

  const ensureChain = useCallback(async (target: ChainKey) => {
    const targetId = CHAIN_IDS[target]
    if (currentChainId === targetId) return true
    try {
      await switchChainAsync({ chainId: targetId })
      return true
    } catch {
      return false
    }
  }, [currentChainId, switchChainAsync])

  useEffect(() => {
    let disposed = false
    ;(async () => {
      if (!address) {
        if (!disposed) {
          setMemberships([])
          setSelectedGuildChain(null)
          setPointsPerChain({})
          setAlreadyFounderAnywhere(false)
          setRegisteredSnapshots({ ...EMPTY_CHAIN_STATE })
        }
        return
      }

      const nextMemberships: Membership[] = []
      const nextSnapshots: Record<ChainKey, { code: string; registered: boolean }> = { ...EMPTY_CHAIN_STATE }
      const nextPoints: Partial<Record<ChainKey, bigint>> = {}
      let foundFounder = false

      const rpcTimeout = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
        Promise.race([
          promise,
          new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 10000))
        ])

      for (const chain of SUPPORTED_CHAINS) {
        try {
          const client = getPublicClient(wagmiConfig, { chainId: CHAIN_IDS[chain] })
          if (!client) continue
          const contract = getContractAddress(chain)

          const [stats, gidRaw, referrerRaw, codeRaw] = await Promise.all([
            rpcTimeout(client.readContract({ address: contract, abi: GM_CONTRACT_ABI, functionName: 'getUserStats', args: [address] }).catch(() => null), null),
            rpcTimeout(client.readContract({ address: contract, abi: GM_CONTRACT_ABI, functionName: 'guildOf', args: [address] }).catch(() => 0n), 0n),
            rpcTimeout(client.readContract({ address: contract, abi: GM_CONTRACT_ABI, functionName: 'referrerOf', args: [address] }).catch(() => ZERO_ADDR), ZERO_ADDR),
            rpcTimeout(client.readContract({ address: contract, abi: GM_CONTRACT_ABI, functionName: 'referralCodeOf', args: [address] }).catch(() => ''), ''),
          ])

          if (stats) nextPoints[chain] = ((stats as any)[0] as bigint) || 0n
          const registered = Boolean(referrerRaw && typeof referrerRaw === 'string' && referrerRaw.toLowerCase() !== ZERO_ADDR)
          const refCode = typeof codeRaw === 'string' ? codeRaw : ''
          nextSnapshots[chain] = { code: refCode, registered }

          const teamId = Number(gidRaw || 0n)
          if (teamId > 0) {
            try {
              const guild = await rpcTimeout(
                client.readContract({ address: contract, abi: GM_CONTRACT_ABI, functionName: 'guilds', args: [BigInt(teamId)] }),
                null
              )
              if (!guild) continue
              const arr = guild as any[]
              const name = (arr?.[0] as string) || `Guild #${teamId}`
              const founder = (arr?.[1] as string) || ZERO_ADDR
              const totalPoints = Number((arr?.[2] as bigint) || 0n)
              const memberCount = Number((arr?.[3] as bigint) || 0n)
              nextMemberships.push({ chain, teamId, teamName: name, totalPoints, memberCount, founder, registered })
              if (founder && address && founder.toLowerCase() === address.toLowerCase()) foundFounder = true
            } catch (err) {
              console.debug('Failed to read guild', chain, teamId, err)
            }
          }
        } catch (err) {
          console.debug('Failed to load chain data', chain, err)
        }
      }

      if (disposed) return

      nextMemberships.sort((a, b) => a.chain.localeCompare(b.chain))

      let resolvedSelected: ChainKey | null = null

      setMemberships(nextMemberships)
      setPointsPerChain(nextPoints)
      setAlreadyFounderAnywhere(foundFounder)
      setRegisteredSnapshots(nextSnapshots)
      setSelectedGuildChain((prev) => {
        if (!nextMemberships.length) {
          resolvedSelected = null
          return null
        }
        if (prev && nextMemberships.some((m) => m.chain === prev)) {
          resolvedSelected = prev
          return prev
        }
        const fallback = nextMemberships[0].chain
        resolvedSelected = fallback
        return fallback
      })

      if (membershipCacheKey) {
        const serializedPoints = Object.entries(nextPoints).reduce<Partial<Record<ChainKey, string>>>((acc, [key, value]) => {
          if (typeof value === 'bigint') acc[key as ChainKey] = value.toString()
          return acc
        }, {})
        writeStorageCache(membershipCacheKey, {
          memberships: nextMemberships,
          selectedGuildChain: resolvedSelected,
          pointsPerChain: serializedPoints,
          alreadyFounderAnywhere: foundFounder,
          registeredSnapshots: nextSnapshots,
        })
      }
    })()
    return () => { disposed = true }
  }, [address, wagmiConfig, refreshKey, membershipCacheKey])

  useEffect(() => {
    const snap = registeredSnapshots[refChain]
    setMyRefCode(snap?.code || '')
    setMyRegistered(Boolean(snap?.registered))
    setEditRefCode((prev) => {
      if (refLoading) return prev
      if (snap?.code) return snap.code
      if (!prev && currentUserFarcaster?.username) return currentUserFarcaster.username.toLowerCase()
      return prev
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refChain, registeredSnapshots, refLoading, currentUserFarcaster?.username])

  useEffect(() => {
    if (!directoryCacheHydrated) return
    let disposed = false
    setIsLoadingTeams(true)
    ;(async () => {
      try {
        const rpcTimeout = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
          Promise.race([
            promise,
            new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 10000))
          ])

        const collected: TeamEntry[] = []
        for (const chain of SUPPORTED_CHAINS) {
          try {
            const client = getPublicClient(wagmiConfig, { chainId: CHAIN_IDS[chain] })
            if (!client) continue
            const address = getContractAddress(chain)
            const maxId = await rpcTimeout(
              client.readContract({ address, abi: GM_CONTRACT_ABI, functionName: 'nextGuildId', args: [] }).catch(() => 0n),
              0n
            )
            if (!maxId || maxId === 0n) continue
            const ids = Array.from({ length: Math.min(Number(maxId), Math.min(scanLimit, MAX_DIRECTORY_SCAN)) }, (_, i) => BigInt(i + 1))
            const calls = ids.map((id) => ({ address, abi: GM_CONTRACT_ABI, functionName: 'guilds' as const, args: [id] }))
            let results: any[] = []
            try {
              results = await rpcTimeout(client.multicall({ contracts: calls }), [])
            } catch {
              results = await Promise.all(
                calls.map((call) =>
                  rpcTimeout(
                    client
                      .readContract(call as any)
                      .then((res) => ({ result: res }))
                      .catch(() => ({ result: null })),
                    { result: null }
                  ),
                ),
              )
            }
            results.forEach((entry, idx) => {
              const res = entry?.result as any
              if (!res) return
              const name = (res[0] as string) || ''
              const founder = (res[1] as string) || ZERO_ADDR
              const totalPoints = Number((res[2] as bigint) || 0n)
              const memberCount = Number((res[3] as bigint) || 0n)
              const teamId = Number(ids[idx])
              const exists = name.trim().length > 0 || totalPoints > 0 || memberCount > 0
              if (!exists) return
              collected.push({ chain, teamId, name, founder, totalPoints, memberCount })
            })
          } catch (err) {
            console.debug('Directory scan failed on', chain, err)
          }
        }
        if (!disposed) {
          collected.sort((a, b) => b.totalPoints - a.totalPoints)
          setTeams(collected)
          setHasCachedDirectory(collected.length > 0)
          writeStorageCache(GUILD_DIRECTORY_CACHE_KEY, {
            teams: collected,
            scanLimit: Math.min(scanLimit, MAX_DIRECTORY_SCAN),
          })
        }
      } finally {
        if (!disposed) setIsLoadingTeams(false)
      }
    })()
    return () => { disposed = true }
  }, [scanLimit, wagmiConfig, refreshKey, directoryCacheHydrated])

  const selectedMembership = useMemo(
    () => (selectedGuildChain ? memberships.find((m) => m.chain === selectedGuildChain) || null : null),
    [memberships, selectedGuildChain],
  )

  const shareFrameUrl = useMemo(
    () => (selectedMembership ? buildFrameShareUrl({ type: 'guild', id: selectedMembership.teamId, chain: selectedMembership.chain }) : ''),
    [selectedMembership],
  )

  const shareLink = useMemo(() => {
    if (!selectedMembership) return ''
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const slug = buildGuildSlug(selectedMembership.teamName, selectedMembership.teamId)
      return `${origin}/Guild/guild/${selectedMembership.chain}/${slug}`
    } catch {
      return ''
    }
  }, [selectedMembership])

  const selectedChainPoints = pointsPerChain[chainForCreate] ?? 0n
  const canCreate = Boolean(
    address &&
      teamName.trim().length > 0 &&
      teamName.trim().length <= 32 &&
      selectedChainPoints >= MIN_POINTS_TO_CREATE &&
      !alreadyFounderAnywhere,
  )

  const handleCreateGuild = async () => {
    setCreateError(null)
    setCreateSuccess(null)
    if (!address) {
      setCreateError('Connect your wallet first.')
      return
    }
    const name = teamName.trim()
    if (!name) {
      setCreateError('Enter a guild name (max 32 characters).')
      return
    }
    if (name.length > 32) {
      setCreateError('Guild name must be 32 characters or fewer.')
      return
    }
    if (selectedChainPoints < MIN_POINTS_TO_CREATE) {
      setCreateError(`Need at least ${Number(MIN_POINTS_TO_CREATE)} points on ${CHAIN_LABEL[chainForCreate]}.`)
      return
    }
    const ok = await ensureChain(chainForCreate)
    if (!ok) {
      setCreateError(`Approve the network switch request to ${CHAIN_LABEL[chainForCreate]}.`)
      return
    }
    try {
      setIsCreating(true)
      const hash = await writeContract(wagmiConfig, {
        address: getContractAddress(chainForCreate),
        abi: GM_CONTRACT_ABI,
        functionName: 'createGuild',
        args: [name],
        chainId: CHAIN_IDS[chainForCreate],
        account: address,
      })
      await waitForTransactionReceipt(wagmiConfig, { hash, chainId: CHAIN_IDS[chainForCreate] })
      setCreateSuccess(`“${name}” launched on ${CHAIN_LABEL[chainForCreate]}!`)
      setTeamName('')
      setRefreshKey((key) => key + 1)
      setSelectedGuildChain(chainForCreate)
      pushNotification({
        type: 'success',
        title: 'Guild launched',
        message: `“${name}” is now live on ${CHAIN_LABEL[chainForCreate]}.`,
      })
    } catch (e: any) {
      const message = e?.shortMessage || e?.message || 'Failed to launch guild.'
      setCreateError(message)
      pushNotification({ type: 'error', title: 'Guild launch failed', message })
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinTeam = async (chain: ChainKey, teamId: number) => {
    if (!address) return
    const key = `${chain}-${teamId}`
    setJoiningKey(key)
    setOpMsg(null)
    setOpErr(null)
    try {
      const ok = await ensureChain(chain)
      if (!ok) throw new Error(`Approve network switch to ${CHAIN_LABEL[chain]}.`)
      const hash = await writeContract(wagmiConfig, {
        address: getContractAddress(chain),
        abi: GM_CONTRACT_ABI,
        functionName: 'joinGuild',
        args: [BigInt(teamId)],
        chainId: CHAIN_IDS[chain],
        account: address,
      })
      await waitForTransactionReceipt(wagmiConfig, { hash, chainId: CHAIN_IDS[chain] })
      setOpMsg(`Joined guild #${teamId} on ${CHAIN_LABEL[chain]}.`)
      setSelectedGuildChain(chain)
      setRefreshKey((prev) => prev + 1)
      pushNotification({
        type: 'success',
        title: 'Guild joined',
        message: `Guild #${teamId} on ${CHAIN_LABEL[chain]} is now active for you.`,
      })
    } catch (e: any) {
      const message = e?.shortMessage || e?.message || 'Failed to join guild.'
      setOpErr(message)
      pushNotification({ type: 'error', title: 'Join guild failed', message })
    } finally {
      setJoiningKey(null)
    }
  }

  const handleSetReferralCode = async () => {
    setRefMsg(null)
    setRefErr(null)
    setRefLoading('setCode')
    try {
      if (!address) throw new Error('Connect wallet first.')
      const code = editRefCode.trim().toLowerCase()
      if (!code) throw new Error('Enter a referral code.')
      const ok = await ensureChain(refChain)
      if (!ok) throw new Error(`Approve network switch to ${CHAIN_LABEL[refChain]}.`)
      const hash = await writeContract(wagmiConfig, {
        address: getContractAddress(refChain),
        abi: GM_CONTRACT_ABI,
        functionName: 'registerReferralCode',
        args: [code],
        chainId: CHAIN_IDS[refChain],
        account: address,
      })
      await waitForTransactionReceipt(wagmiConfig, { hash, chainId: CHAIN_IDS[refChain] })
      setRefMsg('Referral code saved.')
      setRegisteredSnapshots((prev) => ({ ...prev, [refChain]: { code, registered: prev[refChain]?.registered ?? false } }))
      setRefreshKey((prev) => prev + 1)
      pushNotification({
        type: 'success',
        title: 'Referral code saved',
        message: `Code “${code}” active on ${CHAIN_LABEL[refChain]}.`,
      })
    } catch (e: any) {
      const message = e?.shortMessage || e?.message || 'Failed to set referral code.'
      setRefErr(message)
      pushNotification({ type: 'error', title: 'Referral update failed', message })
    } finally {
      setRefLoading(null)
    }
  }

  const handleRegisterByCode = async () => {
    setRefMsg(null)
    setRefErr(null)
    setRefLoading('linkReferrer')
    try {
      if (!address) throw new Error('Connect wallet first.')
      const friendCode = referralInput.trim().toLowerCase()
      if (!friendCode) throw new Error('Enter a friend code to link.')
      const ok = await ensureChain(refChain)
      if (!ok) throw new Error(`Approve network switch to ${CHAIN_LABEL[refChain]}.`)
      const hash = await writeContract(wagmiConfig, {
        address: getContractAddress(refChain),
        abi: GM_CONTRACT_ABI,
        functionName: 'setReferrer',
        args: [friendCode],
        chainId: CHAIN_IDS[refChain],
        account: address,
      })
      await waitForTransactionReceipt(wagmiConfig, { hash, chainId: CHAIN_IDS[refChain] })
      setRefMsg('Friend code linked.')
      setReferralInput('')
      setRegisteredSnapshots((prev) => ({ ...prev, [refChain]: { code: prev[refChain]?.code ?? '', registered: true } }))
      setRefreshKey((prev) => prev + 1)
      pushNotification({
        type: 'success',
        title: 'Friend code linked',
        message: `Referrer connected on ${CHAIN_LABEL[refChain]}.`,
      })
    } catch (e: any) {
      const message = e?.shortMessage || e?.message || 'Failed to link friend code.'
      setRefErr(message)
      pushNotification({ type: 'error', title: 'Friend code failed', message })
    } finally {
      setRefLoading(null)
    }
  }

  const handleCopy = useCallback((value: string, label: string) => {
    if (!value) return
    setRefErr(null)
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setRefMsg(`${label} copied.`)
        const preview = value.length > 28 ? `${value.slice(0, 24)}…` : value
        pushNotification({ type: 'info', title: `${label} copied`, message: preview })
      })
      .catch(() => {
        setRefErr('Copy failed.')
        pushNotification({ type: 'error', title: 'Copy failed', message: `Could not copy ${label.toLowerCase()}.` })
      })
  }, [pushNotification])

  const filteredTeams = useMemo(() => {
    const query = searchText.trim().toLowerCase()
    return teams.filter((team) => {
      const chainOk = directoryChain === 'all' || team.chain === directoryChain
      if (!chainOk) return false
      if (!query) return true
      return (
        team.name.toLowerCase().includes(query) ||
        team.teamId.toString() === query ||
        team.founder.toLowerCase().includes(query)
      )
    })
  }, [directoryChain, searchText, teams])

  const handleShareInvite = () => {
    if (!selectedMembership || !shareFrameUrl) return
    const text = `Join ${selectedMembership.teamName || 'our guild'} on ${CHAIN_BRAND[selectedMembership.chain].title}!\n${shareLink}`
    void openWarpcastComposer(text, shareFrameUrl)
  }

  const showDirectorySkeleton = isLoadingTeams && (!hasCachedDirectory || !teams.length)
  const showDirectoryEmpty = !showDirectorySkeleton && filteredTeams.length === 0

  return (
    <div className="guild-page">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 lg:px-8 site-font">
        <section className="guild-panel guild-hero space-y-5 rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="guild-pill guild-pill--compact text-[var(--px-sub)]">Guild hub</span>
              <h1 className="pixel-section-title mt-2 text-[1.95rem] leading-tight sm:text-[2.4rem]">
                Launch, recruit, and manage across every chain.
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="guild-button guild-button--secondary guild-button--sm min-h-[44px]" onClick={() => setShowRules(true)}>
                Quick rules
              </button>
              <Link className="guild-button guild-button--secondary guild-button--sm min-h-[44px]" href="/Quest">
                Seasonal quests
              </Link>
            </div>
          </div>
          <p className="max-w-2xl text-[13px] text-[var(--px-sub)]">
            Create a guild, track members, deposit treasury points, and share invites in seconds. Founders get a dedicated console while members gain faster access to rewards.
          </p>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.25fr,0.75fr]">
          <div className="guild-panel guild-panel--strong rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="pixel-section-title m-0 text-lg">My guilds</h2>
              <div className="flex items-center gap-2 text-[11px] text-[var(--px-sub)]">
                {memberships.length ? 'Select a guild for quick tools.' : 'You have not joined a guild yet.'}
              </div>
            </div>
            {memberships.length ? (
              <div className="grid gap-3">
                {memberships.map((guild) => {
                  const manageSlug = buildGuildSlug(guild.teamName, guild.teamId)
                  const isSelected = selectedGuildChain === guild.chain
                  return (
                    <div
                      key={`${guild.chain}-${guild.teamId}`}
                      className={clsx(
                        'guild-panel rounded-xl p-4 guild-card',
                        isSelected ? 'guild-panel--strong guild-card--active' : 'guild-panel--muted guild-card--hover',
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className={clsx('guild-pill guild-pill--compact min-h-[44px]', isSelected && 'guild-pill--active')}
                              onClick={() => setSelectedGuildChain(guild.chain)}
                            >
                              <ChainIcon chain={guild.chain} size={ICON_SIZES.xs} /> {CHAIN_LABEL[guild.chain]}
                            </button>
                            {guild.registered ? <span className="guild-pill guild-pill--compact">Friend code linked</span> : null}
                          </div>
                          <div className="text-sm font-semibold text-white dark:text-slate-950 dark:text-white">{guild.teamName || `Guild #${guild.teamId}`}</div>
                          <div className="text-[11px] text-[var(--px-sub)]">
                            Founder {shortAddr(guild.founder)} • Members {formatNumber(guild.memberCount)} • Points {formatNumber(guild.totalPoints)}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Link className="guild-button guild-button--primary guild-button--sm min-h-[44px]" href={`/Guild/guild/${guild.chain}/${manageSlug}`}>
                            Manage guild
                          </Link>
                          <button
                            type="button"
                            className="guild-button guild-button--secondary guild-button--sm min-h-[44px]"
                            onClick={() => setSelectedGuildChain(guild.chain)}
                          >
                            Set active
                          </button>
                        </div>
                      </div>
                      <RankProgress
                        points={guild.totalPoints}
                        size="sm"
                        variant="plain"
                        showIcon={false}
                        hideTotals
                        className="mt-3"
                      />
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="guild-panel guild-panel--muted rounded-xl p-5 text-[12px] text-[var(--px-sub)]">
                You are not part of any guild yet. Join from the directory below or launch a new one to unlock the management console.
              </div>
            )}
          </div>

          <div className="guild-panel guild-panel--strong space-y-4 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <h2 className="pixel-section-title m-0 text-lg">Share links</h2>
              <div className="text-[11px] text-[var(--px-sub)]">
                {selectedMembership ? CHAIN_LABEL[selectedMembership.chain] : 'No guild selected'}
              </div>
            </div>
            {selectedMembership ? (
              <>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--px-sub)]">
                  {shareLink || 'Invite link unavailable'}
                  {shareLink ? (
                    <button
                      type="button"
                      className="guild-button guild-button--secondary guild-button--sm min-h-[44px]"
                      onClick={() => handleCopy(shareLink, 'Invite link')}
                    >
                      Copy
                    </button>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="guild-button guild-button--primary min-h-[44px]"
                    onClick={handleShareInvite}
                    disabled={!shareFrameUrl}
                  >
                    Share on Farcaster
                  </button>
                  <Link
                    className="guild-button guild-button--secondary min-h-[44px]"
                    href={`/Guild/guild/${selectedMembership.chain}/${buildGuildSlug(selectedMembership.teamName, selectedMembership.teamId)}`}
                  >
                    Open guild console
                  </Link>
                </div>
                {shareLink ? (
                  <div className="guild-panel guild-panel--strong rounded-xl p-4 text-center">
                    <div className="mb-2 text-[11px] text-[var(--px-sub)]">Scan to open guild console</div>
                    <QRCode value={shareLink} size={120} bgColor="transparent" fgColor="#ffffff" />
                  </div>
                ) : null}
              </>
            ) : (
              <div className="text-[12px] text-[var(--px-sub)]">Select one of your guilds on the left to activate quick share tools.</div>
            )}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.05fr,0.95fr]">
          <div className="guild-panel guild-panel--strong space-y-4 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="pixel-section-title m-0 text-lg">Launch a new guild</h2>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[var(--px-sub)]">Chain</span>
                <div className="flex flex-wrap gap-2">
                  {SUPPORTED_CHAINS.map((chain) => (
                    <button
                      key={chain}
                      type="button"
                      className={clsx('guild-pill guild-pill--compact min-h-[44px]', chainForCreate === chain && 'guild-pill--active')}
                      onClick={() => setChainForCreate(chain)}
                    >
                      <ChainIcon chain={chain} size={ICON_SIZES.xs} /> {CHAIN_LABEL[chain]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col gap-2">
                <label className="text-[11px] text-[var(--px-sub)]">Guild name</label>
                <input className="pixel-input" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Warpspeed Cats" maxLength={32} />
                <div className="text-[11px] text-[var(--px-sub)]">{teamName.trim().length}/32 characters</div>
              </div>
              <div className="guild-panel guild-panel--muted rounded-xl p-4 text-[12px] text-[var(--px-sub)]">
                {formatNumber(Number(selectedChainPoints))} pts available on {CHAIN_LABEL[chainForCreate]} • requires {Number(MIN_POINTS_TO_CREATE)} pts escrow
              </div>
              {alreadyFounderAnywhere ? (
                <div className="guild-panel guild-panel--danger rounded-xl p-3 text-[12px]">
                  You already lead a guild. Each wallet can found one guild at a time.
                </div>
              ) : null}
              {createError ? (
                <div className="guild-panel guild-panel--danger rounded-xl p-3 text-[12px]">{createError}</div>
              ) : null}
              {createSuccess ? (
                <div className="guild-panel guild-panel--success rounded-xl p-3 text-[12px]">{createSuccess}</div>
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="guild-button guild-button--primary min-h-[44px]"
                  disabled={!canCreate || isCreating}
                  onClick={handleCreateGuild}
                >
                  {isCreating ? 'Launching…' : `Launch on ${CHAIN_LABEL[chainForCreate]}`}
                </button>
                <div className="text-[11px] text-[var(--px-sub)]">Wallet confirmation required • Escrow unlocks if guild closes.</div>
              </div>
            </div>
          </div>

          <div className="guild-panel guild-panel--strong space-y-4 rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="pixel-section-title m-0 text-lg">Referral hub</h2>
              <div className="flex items-center gap-2 text-[11px] text-[var(--px-sub)]">
                <span>Chain</span>
                <div className="flex flex-wrap gap-2">
                  {SUPPORTED_CHAINS.map((chain) => (
                    <button
                      key={chain}
                      type="button"
                      className={clsx('guild-pill guild-pill--compact min-h-[44px]', refChain === chain && 'guild-pill--active')}
                      onClick={() => setRefChain(chain)}
                    >
                      <ChainIcon chain={chain} size={ICON_SIZES.xs} /> {CHAIN_LABEL[chain]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-[var(--px-sub)]">My referral code</label>
                <div className={clsx('pixel-input', myRefCode ? 'text-slate-950 dark:text-white' : 'text-[var(--px-sub)]')}>{myRefCode || 'Not set yet'}</div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input className="pixel-input flex-1" value={editRefCode} onChange={(e) => setEditRefCode(e.target.value.toLowerCase())} placeholder="e.g. heycat" />
                <button
                  type="button"
                  className="guild-button guild-button--primary sm:w-auto min-h-[44px]"
                  onClick={handleSetReferralCode}
                  disabled={refLoading === 'setCode' || !editRefCode.trim()}
                >
                  {refLoading === 'setCode' ? 'Saving…' : myRefCode ? 'Update code' : 'Set code'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={clsx('guild-button guild-button--secondary guild-button--sm min-h-[44px]', !myRefCode && 'cursor-not-allowed opacity-50')}
                  onClick={() => myRefCode && handleCopy(myRefCode, 'Referral code')}
                  disabled={!myRefCode}
                >
                  Copy code
                </button>
                <button
                  type="button"
                  className={clsx(
                    'guild-button guild-button--secondary guild-button--sm min-h-[44px]',
                    (!shareLink || !selectedMembership) && 'cursor-not-allowed opacity-50',
                  )}
                  onClick={() => selectedMembership && shareLink && handleCopy(shareLink, 'Invite link')}
                  disabled={!shareLink}
                >
                  Copy invite link
                </button>
              </div>
              <div className="guild-panel guild-panel--muted rounded-xl p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <input className="pixel-input flex-1" value={referralInput} onChange={(e) => setReferralInput(e.target.value.toLowerCase())} placeholder="friend-code" />
                  <button
                    type="button"
                    className="guild-button guild-button--secondary sm:w-auto min-h-[44px]"
                    onClick={handleRegisterByCode}
                    disabled={refLoading === 'linkReferrer' || !referralInput.trim() || myRegistered}
                  >
                    {refLoading === 'linkReferrer' ? 'Submitting…' : myRegistered ? 'Already linked' : 'Link friend code'}
                  </button>
                </div>
                <div className="text-[11px] text-[var(--px-sub)]">
                  {myRegistered ? 'Friend code linked — referrals now earn bonuses on this chain.' : 'Link a friend code to start earning shared XP.'}
                </div>
              </div>
              {(refMsg || refErr) ? (
                <div className="text-[11px]">
                  {refMsg ? <span className="text-emerald-300">{refMsg}</span> : null}
                  {refErr ? <span className="ml-2 text-red-400">{refErr}</span> : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="guild-panel guild-panel--strong space-y-4 rounded-2xl p-5" id="guild-directory">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="pixel-section-title m-0 text-lg">Guild directory</h2>
              <div className="text-[11px] text-[var(--px-sub)]">Browse live guilds across every chain. Join instantly or open the management console for deeper stats.</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="guild-toggle">
                <button
                  type="button"
                  className={clsx('guild-toggle__option', directoryChain === 'all' && 'is-active')}
                  onClick={() => setDirectoryChain('all')}
                >
                  All chains
                </button>
                {SUPPORTED_CHAINS.map((chain) => (
                  <button
                    key={chain}
                    type="button"
                    className={clsx('guild-toggle__option', directoryChain === chain && 'is-active')}
                    onClick={() => setDirectoryChain(chain)}
                  >
                    {CHAIN_LABEL[chain]}
                  </button>
                ))}
              </div>
              <input className="pixel-input w-48" placeholder="Search name, founder, id" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
            </div>
          </div>
          {opMsg || opErr ? (
            <div className="text-[11px]">
              {opMsg ? <span className="text-emerald-300">{opMsg}</span> : null}
              {opErr ? <span className="ml-2 text-red-400">{opErr}</span> : null}
            </div>
          ) : null}
          {showDirectorySkeleton ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="guild-panel guild-panel--muted guild-card guild-card--hover h-32 animate-pulse" />
              ))}
            </div>
          ) : showDirectoryEmpty ? (
            <div className="guild-panel guild-panel--muted rounded-2xl p-5 text-sm text-[var(--px-sub)]">
              No guilds match your filters yet. Expand your search or launch a new guild above.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filteredTeams.map((team) => {
                const key = `${team.chain}-${team.teamId}`
                const joined = memberships.some((m) => m.chain === team.chain && m.teamId === team.teamId)
                const slug = buildGuildSlug(team.name, team.teamId)
                return (
                  <div
                    key={key}
                    className={clsx('guild-panel guild-directory-card space-y-3 p-4', joined && 'guild-directory-card--active')}
                  >
                    <div className="flex items-start gap-3">
                      <ChainIcon chain={team.chain} size={20} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-white dark:text-slate-950 dark:text-white">{team.name || `Guild #${team.teamId}`}</div>
                        <div className="mt-1 text-[11px] text-[var(--px-sub)]">
                          {CHAIN_LABEL[team.chain]} • Members {formatNumber(team.memberCount)} • Points {formatNumber(team.totalPoints)}
                        </div>
                        <div className="mt-1 text-[11px] text-[var(--px-sub)]">Founder {shortAddr(team.founder)}</div>
                      </div>
                      {joined ? <span className="guild-pill guild-pill--compact">Joined</span> : null}
                    </div>
                    <RankProgress
                      points={team.totalPoints}
                      size="sm"
                      variant="subtle"
                      showIcon={false}
                      hideTotals
                      className="mt-1"
                    />
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        className="guild-button guild-button--primary min-h-[44px]"
                        disabled={joiningKey === key || joined}
                        onClick={() => handleJoinTeam(team.chain, team.teamId)}
                      >
                        {joined ? 'Already joined' : joiningKey === key ? 'Joining…' : 'Join guild'}
                      </button>
                      <Link className="guild-button guild-button--secondary min-h-[44px]" href={`/Guild/guild/${team.chain}/${slug}`}>
                        View console
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex justify-center">
            <button
              type="button"
              className="guild-button guild-button--secondary min-h-[44px]"
              onClick={() => setScanLimit((limit) => Math.min(limit + 20, MAX_DIRECTORY_SCAN))}
              disabled={isLoadingTeams || scanLimit >= MAX_DIRECTORY_SCAN}
            >
              {isLoadingTeams
                ? hasCachedDirectory ? 'Refreshing…' : 'Loading…'
                : scanLimit >= MAX_DIRECTORY_SCAN
                  ? 'Scan limit reached'
                  : `Scan more (next ${Math.min(scanLimit + 20, MAX_DIRECTORY_SCAN)})`}
            </button>
          </div>
        </section>

        <section className="guild-panel guild-panel--strong space-y-4 rounded-2xl p-5">
          <h2 className="pixel-section-title m-0 text-lg">How guilds work</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {HOW_IT_WORKS_STEPS.map((step, idx) => (
              <div key={step.title} className="guild-panel guild-panel--muted guild-card guild-card--hover rounded-2xl p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--px-sub)]">Step {idx + 1}</div>
                <div className="mt-1 text-lg font-semibold text-white dark:text-slate-950 dark:text-white">{step.title}</div>
                <div className="mt-2 text-[12px] text-[var(--px-sub)]">{step.summary}</div>
                <p className="mt-2 text-[12px] text-[var(--px-sub)]">{step.body}</p>
                {step.action ? <div className="mt-3 text-[11px] text-indigo-300">Pro tip: {step.action}</div> : null}
              </div>
            ))}
          </div>
        </section>

        <section className="guild-panel guild-panel--strong space-y-4 rounded-2xl p-5">
          <h2 className="pixel-section-title m-0 text-lg">Friendly tips</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {FRIENDLY_TIPS.map((tip) => (
              <div key={tip.title} className="guild-panel guild-panel--muted guild-card guild-card--hover rounded-2xl p-4">
                <div className="text-2xl">{tip.icon}</div>
                <div className="mt-2 text-sm font-semibold text-white dark:text-slate-950 dark:text-white">{tip.title}</div>
                <div className="mt-1 text-[12px] text-[var(--px-sub)]">{tip.body}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {showRules ? <GuildRulesPanel chains={SUPPORTED_CHAINS} onClose={() => setShowRules(false)} /> : null}
      <XPEventOverlay open={Boolean(xpOverlay)} payload={xpOverlay} onClose={() => setXpOverlay(null)} />
    </div>
  )
}
