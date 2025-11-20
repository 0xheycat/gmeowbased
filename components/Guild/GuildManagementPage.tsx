'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAccount, useChainId, useConfig, useSwitchChain } from 'wagmi'
import { getPublicClient, waitForTransactionReceipt, writeContract } from 'wagmi/actions'
import { decodeEventLog } from 'viem'
import {
  CHAIN_IDS,
  type ChainKey,
  GM_CONTRACT_ABI,
  getContractAddress,
} from '@/lib/gm-utils'
import { buildGuildSlug } from '@/lib/team'
import { buildFrameShareUrl, openWarpcastComposer } from '@/lib/share'

const CHAIN_BRAND: Record<ChainKey, { bg: string; fg: string; label: string; title: string }> = {
  base: { bg: '#0052ff', fg: '#ffffff', label: 'B', title: 'Base' },
  unichain: { bg: '#8247e5', fg: '#ffffff', label: 'U', title: 'Unichain' },
  celo: { bg: '#35d07f', fg: '#0a0a0a', label: 'C', title: 'Celo' },
  ink: { bg: '#111111', fg: '#ffffff', label: 'I', title: 'Ink' },
  op: { bg: '#ff0420', fg: '#ffffff', label: 'OP', title: 'Optimism' },
}

const DEPLOY_BLOCKS: Partial<Record<ChainKey, bigint>> = {
  base: (() => { try { const v = process.env.NEXT_PUBLIC_DEPLOY_BLOCK_BASE; return v ? BigInt(v) : undefined } catch { return undefined } })(),
  unichain: (() => { try { const v = process.env.NEXT_PUBLIC_DEPLOY_BLOCK_UNICHAIN; return v ? BigInt(v) : undefined } catch { return undefined } })(),
  celo: (() => { try { const v = process.env.NEXT_PUBLIC_DEPLOY_BLOCK_CELO; return v ? BigInt(v) : undefined } catch { return undefined } })(),
  ink: (() => { try { const v = process.env.NEXT_PUBLIC_DEPLOY_BLOCK_INK; return v ? BigInt(v) : undefined } catch { return undefined } })(),
  op: (() => { try { const v = process.env.NEXT_PUBLIC_DEPLOY_BLOCK_OP; return v ? BigInt(v) : undefined } catch { return undefined } })(),
}

type MemberRow = { address: string; points: bigint; contributionPct: number }
type GuildSummary = {
  name: string
  founder: string
  totalPoints: bigint
  memberCount: bigint
  level: number
  active: boolean
}
type QuestRow = { id: number; name: string; rewardPoints: bigint; active: boolean }

type Props = {
  chain: ChainKey
  teamId: number
  slug: string
}

function ChainIcon({ chain, size = 18 }: { chain: ChainKey; size?: number }) {
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

function shortAddr(addr: string | undefined | null) {
  if (!addr) return '-'
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

const formatNumber = (value: bigint | number, compact = false) => {
  const num = typeof value === 'bigint' ? Number(value) : value
  if (!Number.isFinite(num)) return '0'
  if (compact && Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (compact && Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(1)}k`
  return num.toLocaleString('en-US')
}

export default function GuildManagementPage({ chain, teamId, slug }: Props) {
  const { address } = useAccount()
  const wagmiConfig = useConfig()
  const currentChainId = useChainId()
  const { switchChainAsync } = useSwitchChain()

  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<GuildSummary | null>(null)
  const [treasury, setTreasury] = useState<bigint>(0n)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [quests, setQuests] = useState<QuestRow[]>([])
  const [userPoints, setUserPoints] = useState<bigint>(0n)
  const [userStatus, setUserStatus] = useState<{ isMember: boolean; isFounder: boolean; registered: boolean }>({ isMember: false, isFounder: false, registered: false })
  const [opState, setOpState] = useState<{ busy: string | null; msg?: string; err?: string }>({ busy: null })

  const [depositInput, setDepositInput] = useState('')
  const [claimInput, setClaimInput] = useState('')
  const [questName, setQuestName] = useState('')
  const [questReward, setQuestReward] = useState('')

  const ensureChain = useCallback(async () => {
    const target = CHAIN_IDS[chain]
    if (currentChainId === target) return true
    try {
      await switchChainAsync({ chainId: target })
      return true
    } catch (err) {
      console.debug('Switch network refused', err)
      return false
    }
  }, [chain, currentChainId, switchChainAsync])

  const refresh = useCallback(async () => {
    const chainId = CHAIN_IDS[chain]
    const client = getPublicClient(wagmiConfig, { chainId })
    if (!client) return

    setLoading(true)
    setOpState((prev) => ({ ...prev, msg: undefined, err: undefined }))

    const rpcTimeout = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 10000))
      ])

    try {
      const contract = getContractAddress(chain)
      const guildPromise = rpcTimeout(
        client.readContract({ address: contract, abi: GM_CONTRACT_ABI, functionName: 'guilds', args: [BigInt(teamId)] }),
        null
      )
      const treasuryPromise = rpcTimeout(
        client.readContract({ address: contract, abi: GM_CONTRACT_ABI, functionName: 'guildTreasuryPoints', args: [BigInt(teamId)] }),
        0n
      )
      const nextQuestPromise = rpcTimeout(
        client.readContract({ address: contract, abi: GM_CONTRACT_ABI, functionName: 'nextGuildQuestId', args: [] }).catch(() => 0n),
        0n
      )
      const logsPromise = rpcTimeout(
        client.getLogs({ address: contract, fromBlock: DEPLOY_BLOCKS[chain] ?? 0n, toBlock: 'latest' } as any),
        []
      )

      const [guildRaw, treasuryRaw, nextQuestId, rawLogs] = await Promise.all([guildPromise, treasuryPromise, nextQuestPromise, logsPromise])
      if (!guildRaw) {
        setOpState({ busy: null, err: 'Could not load guild data (timeout)' })
        return
      }

      const guildArr = guildRaw as any[]
      const guildSummary: GuildSummary = {
        name: (guildArr?.[0] as string) || `Guild #${teamId}`,
        founder: (guildArr?.[1] as string) || '',
        totalPoints: (guildArr?.[2] as bigint) || 0n,
        memberCount: (guildArr?.[3] as bigint) || 0n,
        active: Boolean(guildArr?.[4]),
        level: Number(guildArr?.[6] || 1),
      }
      setSummary(guildSummary)
      setTreasury((treasuryRaw as bigint) || 0n)

      // Members from events
      type GuildEvt = { name: string; member?: string; guildId?: bigint; blockNumber: bigint; logIndex: number }
      const guildEvents: GuildEvt[] = []
      for (const lg of rawLogs as any[]) {
        try {
          const parsed = decodeEventLog({ abi: GM_CONTRACT_ABI as any, data: lg.data, topics: lg.topics }) as any
          if (parsed.eventName === 'GuildJoined' || parsed.eventName === 'GuildLeft') {
            const args: any = parsed.args || {}
            const evt: GuildEvt = {
              name: parsed.eventName,
              guildId: (args.guildId ?? args.guildID ?? args._guildId) as bigint | undefined,
              member: (args.member as string | undefined) ?? undefined,
              blockNumber: lg.blockNumber as bigint,
              logIndex: Number(lg.logIndex ?? 0),
            }
            if (evt.guildId === BigInt(teamId)) guildEvents.push(evt)
          }
        } catch {}
      }
      guildEvents.sort((a, b) => (a.blockNumber === b.blockNumber ? a.logIndex - b.logIndex : a.blockNumber < b.blockNumber ? -1 : 1))
      const currentMembers = new Set<string>()
      for (const evt of guildEvents) {
        if (!evt.member) continue
        const normalized = evt.member.toLowerCase()
        if (evt.name === 'GuildJoined') currentMembers.add(normalized)
        if (evt.name === 'GuildLeft') currentMembers.delete(normalized)
      }
      const memberAddresses = Array.from(currentMembers)

      const guildTotal = guildSummary.totalPoints
      const contracts = memberAddresses.map((m) => ({ address: contract, abi: GM_CONTRACT_ABI, functionName: 'getUserStats' as const, args: [m as `0x${string}`] }))
      let statsResults: any[] = []
      if (contracts.length) {
        try {
          statsResults = await client.multicall({ contracts })
        } catch {
          statsResults = await Promise.all(
            contracts.map((call) =>
              client
                .readContract(call as any)
                .then((res) => ({ result: res }))
                .catch(() => ({ result: null })),
            ),
          )
        }
      }
      const mappedMembers: MemberRow[] = memberAddresses.map((addr, idx) => {
        const res = statsResults[idx]?.result
        const totalEarned = (res ? (res as any)[2] : 0n) as bigint
        const pct = guildTotal > 0n ? Number((totalEarned * 10000n) / guildTotal) / 100 : 0
        return { address: addr, points: totalEarned, contributionPct: pct }
      })
      mappedMembers.sort((a, b) => (a.points === b.points ? 0 : a.points < b.points ? 1 : -1))
      setMembers(mappedMembers)

      // Quests
      const questsArr: QuestRow[] = []
      const questMax = Number(nextQuestId || 0n)
      if (questMax > 0) {
        const questIds = Array.from({ length: questMax }, (_, i) => BigInt(i + 1))
        const questCalls = questIds.map((id) => ({ address: contract, abi: GM_CONTRACT_ABI, functionName: 'guildQuests' as const, args: [id] }))
        let questResults: any[] = []
        try {
          questResults = await client.multicall({ contracts: questCalls })
        } catch {
          questResults = await Promise.all(
            questCalls.map((call) =>
              client
                .readContract(call as any)
                .then((res) => ({ result: res }))
                .catch(() => ({ result: null })),
            ),
          )
        }
        questResults.forEach((entry, idx) => {
          const res = entry?.result as any
          if (!res) return
          const guildId = (res[0] as bigint) || 0n
          if (guildId !== BigInt(teamId)) return
          questsArr.push({
            id: idx + 1,
            name: (res[1] as string) || `Quest #${idx + 1}`,
            rewardPoints: (res[2] as bigint) || 0n,
            active: Boolean(res[3]),
          })
        })
      }
      setQuests(questsArr)

      if (address) {
        const [statsRes, referrer, gid] = await Promise.all([
          rpcTimeout(client.readContract({ address: contract, abi: GM_CONTRACT_ABI, functionName: 'getUserStats', args: [address] }).catch(() => null), null),
          rpcTimeout(client.readContract({ address: contract, abi: GM_CONTRACT_ABI, functionName: 'referrerOf', args: [address] }).catch(() => null), null),
          rpcTimeout(client.readContract({ address: contract, abi: GM_CONTRACT_ABI, functionName: 'guildOf', args: [address] }).catch(() => 0n), 0n),
        ])
        const available = statsRes ? ((statsRes as any)[0] as bigint) : 0n
        setUserPoints(available || 0n)
        const registered = referrer ? (referrer as string).toLowerCase() !== '0x0000000000000000000000000000000000000000' : false
        const joinedId = Number(gid || 0n)
        const isMember = joinedId === teamId
        const isFounder = Boolean(address && guildSummary.founder && guildSummary.founder.toLowerCase() === address.toLowerCase())
        setUserStatus({ isMember, isFounder, registered })
      } else {
        setUserPoints(0n)
        setUserStatus({ isMember: false, isFounder: false, registered: false })
      }
    } catch (error) {
      console.error('Failed to refresh guild data', error)
      setOpState((prev) => ({ ...prev, err: 'Failed to load guild data' }))
    } finally {
      setLoading(false)
    }
  }, [address, chain, teamId, wagmiConfig])

  useEffect(() => {
    refresh()
  }, [refresh])

  const shareFrameUrl = useMemo(() => buildFrameShareUrl({ type: 'guild', id: teamId, chain }), [chain, teamId])
  const shareLink = useMemo(() => {
    if (typeof window === 'undefined') return ''
    try {
      const origin = window.location.origin
      const slugged = buildGuildSlug(summary?.name, teamId)
      return `${origin}/Guild/guild/${chain}/${slugged}`
    } catch {
      return ''
    }
  }, [chain, summary?.name, teamId])

  const runTx = useCallback(
    async (label: string, fn: () => Promise<`0x${string}` | undefined>, after?: () => Promise<void> | void) => {
      setOpState({ busy: label })
      try {
        const ok = await ensureChain()
        if (!ok) throw new Error('Please approve the network switch request')
        const hash = await fn()
        if (!hash) throw new Error('Transaction not created')
        await waitForTransactionReceipt(wagmiConfig, { hash, chainId: CHAIN_IDS[chain] })
        setOpState({ busy: null, msg: 'Transaction confirmed.' })
        if (after) await after()
      } catch (e: any) {
        setOpState({ busy: null, err: e?.shortMessage || e?.message || 'Action failed' })
      }
    },
    [chain, ensureChain, wagmiConfig],
  )

  const handleJoin = async () => {
    if (!address) return
    await runTx('join-guild', async () =>
      writeContract(wagmiConfig, {
        address: getContractAddress(chain),
        abi: GM_CONTRACT_ABI,
        functionName: 'joinGuild',
        args: [BigInt(teamId)],
        chainId: CHAIN_IDS[chain],
        account: address,
      }),
      refresh,
    )
  }

  const handleLeave = async () => {
    if (!address) return
    await runTx('leave-guild', async () =>
      writeContract(wagmiConfig, {
        address: getContractAddress(chain),
        abi: GM_CONTRACT_ABI,
        functionName: 'leaveGuild',
        args: [],
        chainId: CHAIN_IDS[chain],
        account: address,
      }),
      refresh,
    )
  }

  const handleDeposit = async () => {
    if (!address) return
    const clean = depositInput.trim()
    if (!clean || Number.parseInt(clean, 10) <= 0) return setOpState({ busy: null, err: 'Enter deposit amount in points.' })
    const value = BigInt(clean)
    if (value > userPoints) return setOpState({ busy: null, err: 'Not enough available points.' })
    await runTx('deposit-points', async () =>
      writeContract(wagmiConfig, {
        address: getContractAddress(chain),
        abi: GM_CONTRACT_ABI,
        functionName: 'depositGuildPoints',
        args: [BigInt(teamId), value],
        chainId: CHAIN_IDS[chain],
        account: address,
      }),
      async () => {
        setDepositInput('')
        await refresh()
      },
    )
  }

  const handleClaim = async () => {
    if (!address) return
    const clean = claimInput.trim()
    if (!clean || Number.parseInt(clean, 10) <= 0) return setOpState({ busy: null, err: 'Enter claim amount in points.' })
    const value = BigInt(clean)
    if (value > treasury) return setOpState({ busy: null, err: 'Not enough points in treasury.' })
    await runTx('claim-reward', async () =>
      writeContract(wagmiConfig, {
        address: getContractAddress(chain),
        abi: GM_CONTRACT_ABI,
        functionName: 'claimGuildReward',
        args: [BigInt(teamId), value],
        chainId: CHAIN_IDS[chain],
        account: address,
      }),
      async () => {
        setClaimInput('')
        await refresh()
      },
    )
  }

  const handleCreateQuest = async () => {
    if (!address) return
    const name = questName.trim()
    const reward = questReward.trim()
    if (!name || Number.parseInt(reward, 10) <= 0) {
      setOpState({ busy: null, err: 'Provide quest name and reward points.' })
      return
    }
    await runTx('create-quest', async () =>
      writeContract(wagmiConfig, {
        address: getContractAddress(chain),
        abi: GM_CONTRACT_ABI,
        functionName: 'createGuildQuest',
        args: [BigInt(teamId), name, BigInt(reward)],
        chainId: CHAIN_IDS[chain],
        account: address,
      }),
      async () => {
        setQuestName('')
        setQuestReward('')
        await refresh()
      },
    )
  }

  const handleCompleteQuest = async (questId: number) => {
    if (!address) return
    await runTx('complete-quest', async () =>
      writeContract(wagmiConfig, {
        address: getContractAddress(chain),
        abi: GM_CONTRACT_ABI,
        functionName: 'completeGuildQuest',
        args: [BigInt(questId)],
        chainId: CHAIN_IDS[chain],
        account: address,
      }),
      refresh,
    )
  }

  const handleShare = () => {
    if (!shareFrameUrl) return
    const text = `Join ${summary?.name || 'our guild'} on ${CHAIN_BRAND[chain].title}!\n${shareLink}`
    void openWarpcastComposer(text, shareFrameUrl)
  }

  const canJoin = Boolean(address && userStatus.registered && !userStatus.isMember)
  const canLeave = Boolean(address && userStatus.isMember && !userStatus.isFounder)
  const showFounderTools = Boolean(address && userStatus.isFounder)

  return (
    <div className="px-4 pb-10 pt-6 sm:px-6 lg:px-10 site-font">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="grid gap-4 rounded-2xl guild-panel guild-panel--strong p-5 shadow-lg md:grid-cols-[1.4fr,1fr]">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <ChainIcon chain={chain} size={20} />
              <span className="guild-pill guild-pill--compact text-[var(--px-sub)]">Guild Console</span>
            </div>
            <h1 className="pixel-section-title m-0 text-2xl sm:text-3xl">
              {summary?.name || `Guild #${teamId}`}
            </h1>
            <div className="text-[12px] text-[var(--px-sub)]">
              Managed on {CHAIN_BRAND[chain].title} • Founder {shortAddr(summary?.founder)} • Level {summary?.level ?? 1}
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="guild-pill">Members {formatNumber(summary?.memberCount || 0n, true)}</span>
              <span className="guild-pill">Points {formatNumber(summary?.totalPoints || 0n, true)}</span>
              <span className="guild-pill">Treasury {formatNumber(treasury, true)} pts</span>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-3 rounded-xl guild-panel guild-panel--strong p-4">
            <div className="text-[11px] text-[var(--px-sub)]">Guild quick actions</div>
            <div className="flex flex-wrap gap-2">
              <button className="guild-button guild-button--primary guild-button--sm" onClick={handleShare} disabled={!shareFrameUrl}>
                Share on Farcaster
              </button>
              <button className="guild-button guild-button--secondary guild-button--sm" onClick={refresh} disabled={loading}>
                {loading ? 'Refreshing…' : 'Refresh data'}
              </button>
              <Link className="guild-button guild-button--secondary guild-button--sm" href={`/Guild`}>
                Back to directory
              </Link>
            </div>
            <div className="text-[11px] text-[var(--px-sub)]">
              Direct link: {shareLink ? (
                <button
                  className="underline decoration-dotted underline-offset-2"
                  onClick={() => {
                    if (!shareLink) return
                    void navigator.clipboard.writeText(shareLink)
                    setOpState({ busy: null, msg: 'Invite link copied.' })
                  }}
                >
                  Copy invite link
                </button>
              ) : (
                'Unavailable'
              )}
            </div>
          </div>
        </div>

        {(opState.msg || opState.err) && (
          <div className="pixel-card guild-panel guild-panel--muted p-4 text-[12px]">
            {opState.msg ? <div className="text-emerald-300">{opState.msg}</div> : null}
            {opState.err ? <div className="text-red-400">{opState.err}</div> : null}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-5">
            <div className="pixel-card guild-panel guild-panel--strong space-y-4 p-5">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <h2 className="pixel-section-title m-0 text-lg">Membership</h2>
                <div className="text-[11px] text-[var(--px-sub)]">Available points: {formatNumber(userPoints)}</div>
              </div>
              {!address ? (
                <div className="text-[12px] text-[var(--px-sub)]">Connect your wallet to manage guild membership.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button className="guild-button guild-button--primary" onClick={handleJoin} disabled={!canJoin || opState.busy === 'join-guild'}>
                    {opState.busy === 'join-guild' ? 'Joining…' : 'Join guild'}
                  </button>
                  <button className="guild-button guild-button--secondary" onClick={handleLeave} disabled={!canLeave || opState.busy === 'leave-guild'}>
                    {opState.busy === 'leave-guild' ? 'Leaving…' : 'Leave guild'}
                  </button>
                  {userStatus.isFounder ? (
                    <span className="guild-pill guild-pill--compact">Founder privileges active</span>
                  ) : null}
                  {!userStatus.registered ? (
                    <span className="text-[11px] text-orange-300">Link a referral code on the main Guild page before joining.</span>
                  ) : null}
                </div>
              )}
            </div>

            <div className="pixel-card guild-panel guild-panel--strong space-y-4 p-5">
              <h2 className="pixel-section-title m-0 text-lg">Treasury</h2>
              <div className="text-[12px] text-[var(--px-sub)]">
                Treasury balance {formatNumber(treasury)} pts. Deposits increase guild score by 10% of the amount.
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] text-[var(--px-sub)]">Deposit points</label>
                  <div className="flex gap-2">
                    <input
                      className="pixel-input flex-1"
                      inputMode="numeric"
                      value={depositInput}
                      onChange={(e) => setDepositInput(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="100"
                    />
                    <button className="guild-button guild-button--primary" onClick={handleDeposit} disabled={opState.busy === 'deposit-points' || !address}>
                      {opState.busy === 'deposit-points' ? 'Depositing…' : 'Deposit'}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] text-[var(--px-sub)]">Claim reward</label>
                  <div className="flex gap-2">
                    <input
                      className="pixel-input flex-1"
                      inputMode="numeric"
                      value={claimInput}
                      onChange={(e) => setClaimInput(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="50"
                    />
                    <button className="guild-button guild-button--secondary" onClick={handleClaim} disabled={opState.busy === 'claim-reward' || !address}>
                      {opState.busy === 'claim-reward' ? 'Claiming…' : 'Claim'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pixel-card guild-panel guild-panel--strong space-y-4 p-5">
              <div className="flex items-center justify-between">
                <h2 className="pixel-section-title m-0 text-lg">Members ({members.length})</h2>
                <div className="text-[11px] text-[var(--px-sub)]">Sorted by total earned points</div>
              </div>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="guild-skeleton h-8 rounded animate-pulse" />
                  ))}
                </div>
              ) : members.length ? (
                <div className="guild-divided">
                  {members.map((member) => (
                    <div key={member.address} className="grid grid-cols-[minmax(0,1fr),6.5rem,6rem] items-center gap-2 px-3 py-2 text-[13px]">
                      <div className="truncate font-semibold text-white">{shortAddr(member.address)}</div>
                      <div className="text-right font-semibold text-purple-300">{formatNumber(member.points)}</div>
                      <div className="text-right font-semibold text-emerald-300">{member.contributionPct.toFixed(2)}%</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[12px] text-[var(--px-sub)]">No members yet. Share your invite to recruit.</div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            {showFounderTools && (
              <div className="pixel-card guild-panel guild-panel--strong space-y-4 p-5">
                <div>
                  <h2 className="pixel-section-title m-0 text-lg">Founder actions</h2>
                  <div className="text-[12px] text-[var(--px-sub)]">Only the guild founder can create quests.</div>
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    className="pixel-input"
                    placeholder="Quest name"
                    value={questName}
                    onChange={(e) => setQuestName(e.target.value.slice(0, 64))}
                  />
                  <div className="flex gap-2">
                    <input
                      className="pixel-input flex-1"
                      placeholder="Reward points"
                      inputMode="numeric"
                      value={questReward}
                      onChange={(e) => setQuestReward(e.target.value.replace(/[^0-9]/g, ''))}
                    />
                    <button className="guild-button guild-button--primary" onClick={handleCreateQuest} disabled={opState.busy === 'create-quest'}>
                      {opState.busy === 'create-quest' ? 'Creating…' : 'Create quest'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="pixel-card guild-panel guild-panel--strong space-y-4 p-5">
              <div className="flex items-center justify-between">
                <h2 className="pixel-section-title m-0 text-lg">Quests</h2>
                <div className="text-[11px] text-[var(--px-sub)]">Members can complete active quests for rewards.</div>
              </div>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="guild-skeleton h-10 rounded animate-pulse" />
                  ))}
                </div>
              ) : quests.length ? (
                <div className="space-y-3">
                  {quests.map((quest) => (
                    <div key={quest.id} className="guild-panel guild-panel--muted rounded-xl p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-white">{quest.name}</div>
                          <div className="text-[11px] text-[var(--px-sub)]">Reward {formatNumber(quest.rewardPoints)} pts</div>
                        </div>
                        <button
                          className="guild-button guild-button--secondary guild-button--sm"
                          disabled={!quest.active || opState.busy === 'complete-quest' || !address}
                          onClick={() => handleCompleteQuest(quest.id)}
                        >
                          {quest.active ? (opState.busy === 'complete-quest' ? 'Completing…' : 'Complete quest') : 'Inactive'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[12px] text-[var(--px-sub)]">No quests yet. Founders can create one from the panel above.</div>
              )}
            </div>

            <div className="pixel-card guild-panel guild-panel--strong space-y-4 p-5">
              <h2 className="pixel-section-title m-0 text-lg">Activity tips</h2>
              <ul className="space-y-2 text-[12px] text-[var(--px-sub)]">
                <li>Depositing points boosts your guild score and treasury.</li>
                <li>Share the invite link so new members auto-open this console.</li>
                <li>Use quests to create coordinated streaks for seasonal rewards.</li>
              </ul>
              <div className="text-[11px] text-[var(--px-sub)]">
                Need help? Jump back to the <Link className="text-indigo-300 underline" href="/Guild">Guild directory</Link> for docs and support.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
