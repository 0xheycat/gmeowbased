'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useAccount, useChainId, useConfig, useSwitchChain } from 'wagmi'
import { getPublicClient, writeContract, waitForTransactionReceipt } from 'wagmi/actions'
import { CHAIN_IDS, type ChainKey, GM_CONTRACT_ABI, getContractAddress } from '@/lib/gm-utils'
import type { TeamSummary } from '@/lib/team'
import { getTeamSummaryClient, getTeamMembersClient } from '@/lib/team'

type Props = { chain: ChainKey; teamId: number; initialSummary: TeamSummary }

export default function TeamPageClient({ chain, teamId, initialSummary }: Props) {
  const { address } = useAccount()
  const wagmiConfig = useConfig()
  const currentChainId = useChainId()
  const { switchChainAsync } = useSwitchChain()

  const [summary, setSummary] = useState<TeamSummary>(initialSummary)
  const [members, setMembers] = useState<{ address: string; points: bigint; pct: number }[]>([])
  const [limit, setLimit] = useState(50)
  const [loading, setLoading] = useState(true)
  const [op, setOp] = useState<{ busy: string | null; msg?: string; err?: string }>({ busy: null })
  const [myStatus, setMyStatus] = useState<{ registered: boolean; teamId: number; isFounder: boolean }>({ registered: false, teamId: 0, isFounder: false })

  const ensureChain = async () => {
    const target = CHAIN_IDS[chain]
    if (currentChainId === target) return true
    try { await switchChainAsync({ chainId: target }); return true } catch { return false }
  }

  const refresh = async () => {
    setLoading(true)
    try {
      const [s, mem] = await Promise.all([
        getTeamSummaryClient(chain, teamId),
        getTeamMembersClient(chain, teamId, limit, 0),
      ])
      setSummary(s)
      setMembers(mem)
      if (address) {
        const client = getPublicClient(wagmiConfig, { chainId: CHAIN_IDS[chain] })
        if (client) {
          const rpcTimeout = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
            Promise.race([
              promise,
              new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 10000))
            ])

          const stats = await rpcTimeout(
            client.readContract({
              address: getContractAddress(chain),
              abi: GM_CONTRACT_ABI,
              functionName: 'getUserStats',
              args: [address],
            }),
            null
          )
          if (stats) {
            const tid = Number((stats as any)[5] || 0n)
            const reg = Boolean((stats as any)[8])
            const isFounder = s?.founder && address ? s.founder.toLowerCase() === address.toLowerCase() : false
            setMyStatus({ registered: reg, teamId: tid, isFounder })
          }
        }
      }
    } finally { setLoading(false) }
  }

  useEffect(() => { refresh() }, [chain, teamId, address, limit]) // eslint-disable-line react-hooks/exhaustive-deps

  const canJoin = !!address && myStatus.registered && myStatus.teamId === 0

  const joinTeam = async () => {
    if (!address) return
    setOp({ busy: 'join' })
    try {
      const ok = await ensureChain()
      if (!ok) throw new Error('Please approve network switch')
      const hash = await writeContract(wagmiConfig, {
        address: getContractAddress(chain),
        abi: GM_CONTRACT_ABI,
        functionName: 'joinTeam',
        args: [BigInt(teamId)],
        chainId: CHAIN_IDS[chain],
        account: address,
      })
      await waitForTransactionReceipt(wagmiConfig, { hash, chainId: CHAIN_IDS[chain] })
      setOp({ busy: null, msg: 'Joined team' })
      await refresh()
    } catch (e: any) {
      setOp({ busy: null, err: e?.shortMessage || e?.message || 'Join failed' })
    }
  }

  const leaveTeam = async () => {
    if (!address) return
    setOp({ busy: 'leave' })
    try {
      const ok = await ensureChain()
      if (!ok) throw new Error('Please approve network switch')
      const hash = await writeContract(wagmiConfig, {
        address: getContractAddress(chain),
        abi: GM_CONTRACT_ABI,
        functionName: 'leaveTeam',
        args: [],
        chainId: CHAIN_IDS[chain],
        account: address,
      })
      await waitForTransactionReceipt(wagmiConfig, { hash, chainId: CHAIN_IDS[chain] })
      setOp({ busy: null, msg: 'Left team' })
      await refresh()
    } catch (e: any) {
      setOp({ busy: null, err: e?.shortMessage || e?.message || 'Leave failed' })
    }
  }

  // Founder actions
  const [newName, setNewName] = useState('')
  const [newPfp, setNewPfp] = useState('')
  const [newBio, setNewBio] = useState('')
  const [newBonus, setNewBonus] = useState<number>(summary?.founderBonus || 0)

  const runFounder = async (fn: 'renameTeam' | 'setTeamPfp' | 'setTeamBio' | 'setFounderBonus', args: any[], msg: string) => {
    if (!address) return
    setOp({ busy: fn })
    try {
      const ok = await ensureChain()
      if (!ok) throw new Error('Please approve network switch')
      const hash = await writeContract(wagmiConfig, {
        address: getContractAddress(chain),
        abi: GM_CONTRACT_ABI as any,
        functionName: fn as any,
        args,
        chainId: CHAIN_IDS[chain],
        account: address,
      })
      await waitForTransactionReceipt(wagmiConfig, { hash, chainId: CHAIN_IDS[chain] })
      setOp({ busy: null, msg })
      setNewName('')
      await refresh()
    } catch (e: any) {
      setOp({ busy: null, err: e?.shortMessage || e?.message || 'Action failed' })
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 md:px-6 site-font">
      <div className="pixel-card mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="pixel-section-title m-0 truncate">{summary?.name || `Team #${teamId}`}</h1>
            <div className="text-[11px] text-[var(--px-sub)]">
              Founder {summary?.founder ? `${summary.founder.slice(0,6)}…${summary.founder.slice(-4)}` : '-'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="pixel-pill text-[10px]">Points {summary?.totalPoints?.toLocaleString?.() || 0}</span>
            <span className="pixel-pill text-[10px]">Members {summary?.memberCount || 0}</span>
          </div>
        </div>
        {summary?.pfp ? (
          <div className="mt-2">
            <Image src={summary.pfp} alt="Team PFP" width={80} height={80} className="pixelated rounded" unoptimized />
          </div>
        ) : null}
        {summary?.bio ? <p className="mt-2 text-sm text-[var(--px-sub)]">{summary.bio}</p> : null}

        <div className="mt-3 flex items-center gap-2">
          {!address ? (
            <span className="text-[11px] text-[var(--px-sub)]">Connect wallet to interact.</span>
          ) : myStatus.teamId === teamId ? (
            <>
              <span className="pixel-pill text-[10px]">Joined</span>
              {!myStatus.isFounder && (
                <button className="btn-secondary btn-sm" disabled={op.busy === 'leave'} onClick={leaveTeam}>
                  {op.busy === 'leave' ? 'Leaving…' : 'Leave'}
                </button>
              )}
            </>
          ) : canJoin ? (
            <button className="btn-primary btn-sm" disabled={op.busy === 'join'} onClick={joinTeam}>
              {op.busy === 'join' ? 'Joining…' : 'Join Team'}
            </button>
          ) : (
            <span className="text-[11px] text-[var(--px-sub)]">Register on this chain or leave current team to join.</span>
          )}
        </div>
        {(op.msg || op.err) && (
          <div className="mt-2 text-[11px]">{op.msg ? <span className="text-emerald-400">{op.msg}</span> : null}{op.err ? <span className="text-red-400">{op.err}</span> : null}</div>
        )}
      </div>

      {address && myStatus.isFounder && (
        <div className="pixel-card mb-4">
          <h3 className="pixel-section-title">Manage</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div className="flex gap-2">
              <input className="pixel-input flex-1" placeholder={summary.name} value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={32} />
              <button className="btn-secondary" disabled={!newName.trim() || op.busy === 'renameTeam'} onClick={() => runFounder('renameTeam', [BigInt(teamId), newName.trim()], 'Name updated')}>{op.busy === 'renameTeam' ? 'Saving…' : 'Save'}</button>
            </div>
            <div className="flex gap-2">
              <input className="pixel-input flex-1" placeholder="ipfs://... or https://..." value={newPfp} onChange={(e) => setNewPfp(e.target.value)} />
              <button className="btn-secondary" disabled={!newPfp.trim() || op.busy === 'setTeamPfp'} onClick={() => runFounder('setTeamPfp', [BigInt(teamId), newPfp.trim()], 'PFP updated')}>{op.busy === 'setTeamPfp' ? 'Saving…' : 'Save'}</button>
            </div>
            <div className="flex gap-2">
              <input className="pixel-input flex-1" placeholder="Short bio" value={newBio} onChange={(e) => setNewBio(e.target.value)} />
              <button className="btn-secondary" disabled={!newBio.trim() || op.busy === 'setTeamBio'} onClick={() => runFounder('setTeamBio', [BigInt(teamId), newBio.trim()], 'Bio updated')}>{op.busy === 'setTeamBio' ? 'Saving…' : 'Save'}</button>
            </div>
            <div className="flex gap-2">
              <input className="pixel-input w-28 text-right" type="number" min={0} max={1000} value={newBonus} onChange={(e) => setNewBonus(Math.max(0, Math.min(1000, parseInt(e.target.value || '0', 10))))} />
              <button className="btn-secondary" disabled={op.busy === 'setFounderBonus'} onClick={() => runFounder('setFounderBonus', [BigInt(teamId), BigInt(newBonus)], 'Bonus updated')}>{op.busy === 'setFounderBonus' ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="pixel-card">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="pixel-section-title">Members</h3>
          <div className="flex items-center gap-2">
            <span className="pixel-pill text-[10px]">Showing {Math.min(members.length, limit)} / {summary.memberCount}</span>
            <button className="btn-secondary btn-sm" onClick={() => setLimit((n) => Math.min(n + 50, 500))} disabled={loading || members.length >= summary.memberCount}>Load More</button>
          </div>
        </div>
        {loading ? (
          <div className="space-y-2">{[...Array(6)].map((_, i) => (<div key={i} className="h-8 rounded animate-pulse" style={{ background: 'rgba(138,99,210,0.18)' }} />))}</div>
        ) : members.length ? (
          <div className="divide-y divide-[rgba(138,99,210,0.25)]">
            {members.map((m) => (
              <div key={m.address} className="px-3 py-2 grid grid-cols-2 sm:grid-cols-[1fr,7rem,7rem] gap-1 sm:gap-2 items-center">
                <div className="truncate order-1 col-span-2 sm:order-none sm:col-span-1">
                  <span className="font-extrabold">{m.address.slice(0,6)}…{m.address.slice(-4)}</span>
                </div>
                <div className="order-2 sm:order-none text-right font-extrabold text-purple-300">{Number(m.points).toLocaleString()}</div>
                <div className="order-3 sm:order-none text-right font-extrabold text-emerald-300">{m.pct.toFixed(2)}%</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[12px] text-[var(--px-sub)]">No members found.</div>
        )}
      </div>
    </div>
  )
}