'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import {
  GM_CONTRACT_ABI,
  getContractAddress,
  CHAIN_IDS,
  type ChainKey,
  formatTimeUntilNextGM,
  canGMBasedOnTimestamp,
} from '@/lib/gmeow-utils'
import type { Abi } from 'viem' // add
import { GMCountdown } from './GMCountdown'
import { useNotifications } from '@/components/ui/live-notifications'
import { buildFrameShareUrl, openWarpcastComposer } from '@/lib/share'

type UserStatsTuple = readonly [
  bigint,          // lastGMTime
  bigint,          // streak
  bigint,          // totalPoints
  bigint,          // frozenUntil
  `0x${string}`,   // referrer
  bigint,          // teamId
  bigint,          // stakedPoints
  bigint,          // stakingMultiplier
  boolean          // registered
]

const SUPPORTED_CHAINS: ChainKey[] = ['base', 'unichain', 'celo', 'ink', 'op']
const CHAIN_LABEL: Record<ChainKey, string> = {
  base: 'Base',
  unichain: 'Unichain',
  celo: 'Celo',
  ink: 'Ink',
  op: 'Optimism',
}
const EXPLORER_TX: Partial<Record<ChainKey, (hash: `0x${string}`) => string>> = {
  base: (h) => `https://basescan.org/tx/${h}`,
  celo: (h) => `https://celoscan.io/tx/${h}`,
  // Add or adjust when you have confirmed explorers:
  unichain: (h) => `#/${h}`,
  ink: (h) => `#/${h}`,
  op: (h) => `https://optimistic.etherscan.io/tx/${h}`,
}

interface ContractGMButtonProps {
  chain?: ChainKey
}

export function ContractGMButton({ chain }: ContractGMButtonProps) {
  const { address, isConnected, chainId: walletChainId } = useAccount()
  const [selectedChain, setSelectedChain] = useState<ChainKey>(chain ?? 'base')
  useEffect(() => {
    if (chain && chain !== selectedChain) setSelectedChain(chain)
  }, [chain, selectedChain])
  const targetChainId = CHAIN_IDS[selectedChain]
  const contractAddress = getContractAddress(selectedChain)

  const gmFrameUrl = useMemo(() => {
    if (!address) return ''
    return buildFrameShareUrl({ type: 'gm', user: address })
  }, [address])

  const [streak, setStreak] = useState(0)
  const [canGM, setCanGM] = useState(false)
  const [gmMessage, setGmMessage] = useState('')
  const [lastGMTimestamp, setLastGMTimestamp] = useState(0)
  const { showNotification } = useNotifications()

  // Contract write function
  const {
    writeContract,
    isPending: isWritePending,
    data: txHash,
    error: writeError,
  } = useWriteContract()

  // Wait for transaction confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  // READ: getUserStats(_user) => tuple of primitives
  const {
    data: userData,
    error: readErr,
    refetch: refetchUserData,
  } = useReadContract({
    address: contractAddress,
    abi: GM_CONTRACT_ABI as unknown as Abi, // widen ABI typing
    functionName: 'getUserStats',
    args: address ? [address] : undefined,
    chainId: targetChainId,
    query: { enabled: !!address, retry: 0, refetchOnWindowFocus: false },
  })

  // Parse getUserStats result into streak/lastGM
  const parsed = useMemo(() => {
    if (!userData) return null
    try {
      const [lastGMTimeBn, streakBn] = userData as UserStatsTuple
      const lastGMTime = Number(lastGMTimeBn ?? 0n)
      const currentStreak = Number(streakBn ?? 0n)
      return {
        currentStreak,
        lastGMTimestamp: lastGMTime,
        canGMToday: canGMBasedOnTimestamp(lastGMTime),
      }
    } catch {
      // Fallback for unexpected shapes
      const arr = userData as unknown as readonly unknown[]
      const lastGMTime = Number((arr?.[0] as bigint) ?? 0n)
      const currentStreak = Number((arr?.[1] as bigint) ?? 0n)
      return {
        currentStreak,
        lastGMTimestamp: lastGMTime,
        canGMToday: canGMBasedOnTimestamp(lastGMTime),
      }
    }
  }, [userData])

  useEffect(() => {
  }, [readErr])

  // Update state when parsed data changes
  useEffect(() => {
    if (!parsed) return
    const { currentStreak, lastGMTimestamp, canGMToday } = parsed
    setStreak(currentStreak)
    setLastGMTimestamp(lastGMTimestamp)
    setCanGM(Boolean(canGMToday))
    // Message
    if (lastGMTimestamp === 0) {
      setGmMessage('First GM available!')
    } else if (canGMToday) {
      setGmMessage('You can GM now.')
    } else {
      setGmMessage(`Next GM in ${formatTimeUntilNextGM(lastGMTimestamp)}`)
    }
  }, [parsed])

  // Refetch data after successful transaction
  useEffect(() => {
    if (!isConfirmed) return
    refetchUserData?.()
    if (txHash) {
      const maker = EXPLORER_TX[selectedChain]
      const linkHref = maker ? maker(txHash as `0x${string}`) : undefined
      const chainLabel = CHAIN_LABEL[selectedChain]
      showNotification(`GM sent on ${chainLabel}! Streak updated.`, 'gm_sent', 7000)
    }
  }, [isConfirmed, refetchUserData, txHash, selectedChain, showNotification])

  // Update countdown timer text every second
  useEffect(() => {
    const updateTimer = () => {
      if (lastGMTimestamp === 0) {
        setGmMessage('First GM available!')
        setCanGM(true)
        return
      }
      const canGMNow = canGMBasedOnTimestamp(lastGMTimestamp)
      setCanGM(canGMNow)
      setGmMessage(canGMNow ? 'You can GM now.' : `Next GM in ${formatTimeUntilNextGM(lastGMTimestamp)}`)
    }
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [lastGMTimestamp])

  const { switchChainAsync, isPending: isSwitchingNetwork } = useSwitchChain()

  const handleGM = async () => {
    if (!isConnected || !canGM) {
      return
    }
    try {
      // Ensure target chain is active before write
      if (walletChainId !== targetChainId) {
        await switchChainAsync({ chainId: targetChainId })
      }

      // sendGM()
      writeContract({
        address: contractAddress,
        abi: GM_CONTRACT_ABI as unknown as Abi, // widen ABI typing
        functionName: 'sendGM',
        chainId: targetChainId,
      })
    } catch (error: any) {
      console.error('Failed to send GM transaction:', error?.message || String(error))
    }
  }

  const handleShare = async () => {
    try {
      if (!address) {
        return
      }
      const text = `GMEOW! Streak check on ${CHAIN_LABEL[selectedChain]} — let us cook.\nJoin the daily GM.`
      const embed = gmFrameUrl || `${window.location.origin}/api/gm-card/${address}`
      await openWarpcastComposer(text, embed)
    } catch (error: any) {
      console.error('Failed to share:', error?.message || String(error))
    }
  }

  // UI: Not connected
  if (!address) {
    return (
      <div className="relative site-font">
        <div className="pixel-card text-center space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--px-sub)]">Chain</span>
            <select
              className="pixel-input text-xs"
              value={selectedChain}
              onChange={(e) => setSelectedChain(e.target.value as ChainKey)}
            >
              {SUPPORTED_CHAINS.map((k) => (
                <option key={k} value={k}>{CHAIN_LABEL[k]}</option>
              ))}
            </select>
          </div>
          <div className="text-6xl">⏳</div>
          <h2 className="pixel-heading">Connect wallet to start</h2>
          <p className="text-[var(--px-sub)] text-sm">{CHAIN_LABEL[selectedChain]} GM awaits.</p>
        </div>
      </div>
    )
  }

  // UI: Already GM'd today
  if (!canGM && !isWritePending && !isConfirming) {
    const maker = EXPLORER_TX[selectedChain]
    const linkHref = maker && txHash ? maker(txHash as `0x${string}`) : undefined
    return (
      <div className="relative site-font">
        <div className="pixel-card text-center space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--px-sub)]">Chain</span>
            <select
              className="pixel-input text-xs"
              value={selectedChain}
              onChange={(e) => setSelectedChain(e.target.value as ChainKey)}
            >
              {SUPPORTED_CHAINS.map((k) => (
                <option key={k} value={k}>{CHAIN_LABEL[k]}</option>
              ))}
            </select>
          </div>

          <div className="text-6xl">🔥</div>
          <h2 className="pixel-heading">GM Sent Today!</h2>
          <p className="text-[var(--px-sub)]">
            Current streak: <span className="font-bold text-orange-300">{streak} days</span>
          </p>
          <p className="text-xs text-emerald-300">{gmMessage}</p>
          <GMCountdown lastGMTimestamp={lastGMTimestamp} className="mb-2" />
          <button onClick={handleShare} className="pixel-button w-full">📢 Share Your Streak</button>
          {linkHref && (
            <p className="text-xs text-[var(--px-sub)]">
              <a
                href={linkHref}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                View on Explorer ↗
              </a>
            </p>
          )}
        </div>
      </div>
    )
  }

  // UI: Ready to GM
  return (
    <div className="relative site-font">
      <div className="pixel-card text-center space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--px-sub)]">Chain</span>
          <select
            className="pixel-input text-xs"
            value={selectedChain}
            onChange={(e) => setSelectedChain(e.target.value as ChainKey)}
          >
            {SUPPORTED_CHAINS.map((k) => (
              <option key={k} value={k}>{CHAIN_LABEL[k]}</option>
            ))}
          </select>
        </div>

        <div className="text-6xl">☀️</div>
        <h2 className="pixel-heading">Ready for GM?</h2>
        <p className="text-[var(--px-sub)]">Send your daily GM on {CHAIN_LABEL[selectedChain]}</p>
        {streak > 0 && (
          <p className="text-xs text-[var(--px-sub)]">
            Your streak: <span className="font-bold text-orange-300">{streak} days</span>
          </p>
        )}
        <p className="text-xs text-emerald-300">{gmMessage}</p>

        <button
          onClick={handleGM}
          disabled={!isConnected || !canGM || isWritePending || isConfirming || isSwitchingNetwork}
          className="pixel-button w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSwitchingNetwork ? (
            <div className="flex items-center justify-center gap-2">
              <span
                className="rounded-full h-4 w-4 animate-spin gm-spinner"
              />
              Switching…
            </div>
          ) : isWritePending ? (
            <div className="flex items-center justify-center gap-2">
              <span
                className="rounded-full h-4 w-4 animate-spin gm-spinner"
              />
              Sending GM…
            </div>
          ) : isConfirming ? (
            <div className="flex items-center justify-center gap-2">
              <span
                className="rounded-full h-4 w-4 animate-spin gm-spinner"
              />
              Confirming…
            </div>
          ) : (
            `Send GM On ${CHAIN_LABEL[selectedChain]} 🚀`
          )}
        </button>

        {writeError && (
          <p className="text-xs text-red-400">Error: {writeError.message}</p>
        )}

        <p className="text-xs text-[var(--px-sub)]">Free transaction on {CHAIN_LABEL[selectedChain]} ⚡</p>
      </div>
    </div>
  )
}