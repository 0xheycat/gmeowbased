/**
 * GMButton Component - Professional Daily GM Ritual
 * 
 * Template Reference: gmeowbased0.6 (Web3 patterns) + music (button system)
 * Features:
 * - Countdown timer with circular progress
 * - Transaction handling with wagmi
 * - XPEventOverlay celebration integration
 * - Subsquid GM stats fetching
 * - Multi-chain support (Base, OP, Unichain, Celo, Ink)
 * - Professional animations (Framer Motion)
 * 
 * Phase: Integration Phase
 * Date: December 14, 2025
 * 
 * Website: https://gmeowhq.art
 * Network: Base (Chain ID: 8453)
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useReadContract } from 'wagmi'
import { GMCountdown } from '@/components/GMCountdown'
import { XPEventOverlay, type XpEventPayload } from '@/components/XPEventOverlay'
import { getGMStats, type GMStats } from '@/lib/integrations/subsquid-client'
import { CONTRACT_ADDRESSES, GM_CONTRACT_ABI, type ChainKey } from '@/lib/contracts/gmeow-utils'
import { Tooltip } from '@/components/ui/tooltip'
import { getUserStatsOnChainClient } from '@/lib/contracts/scoring-module-client'
import type { RankProgress } from '@/lib/scoring/unified-calculator'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'

// Only support Base chain for GM transactions (aligned with CONTRACT_ADDRESSES)
type SupportedGMChain = 'base'

const CHAIN_IDS: Record<SupportedGMChain, number> = {
  base: 8453,
}

const CHAIN_LABELS: Record<SupportedGMChain, string> = {
  base: 'Base',
}

interface GMButtonProps {
  /** Selected chain for GM transaction (only Base supported) */
  chain?: SupportedGMChain
  /** User's FID (optional - for fetching GM stats) */
  fid?: number
  /** Custom className for styling */
  className?: string
  /** Variant style */
  variant?: 'default' | 'minimal' | 'hero'
}

export function GMButton({ 
  chain = 'base', 
  fid,
  className = '',
  variant = 'default'
}: GMButtonProps) {
  // Wagmi hooks
  const { address, isConnected, chainId: walletChainId } = useAccount()
  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract()
  const { isSuccess: isConfirmed, isLoading: isConfirming } = useWaitForTransactionReceipt({ 
    hash: txHash 
  })
  const { switchChainAsync } = useSwitchChain()

  // State
  const [gmStats, setGmStats] = useState<GMStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [xpOverlayOpen, setXpOverlayOpen] = useState(false)
  const [xpPayload, setXpPayload] = useState<XpEventPayload | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [cooldownProgress, setCooldownProgress] = useState<number>(0)
  const [rankProgress, setRankProgress] = useState<RankProgress | null>(null)
  
  const targetChainId = CHAIN_IDS[chain]
  const contractAddress = CONTRACT_ADDRESSES[chain]

  // Read lastGMTime directly from contract
  const { data: lastGMTimeRaw, refetch: refetchLastGMTime } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: GM_CONTRACT_ABI,
    functionName: 'lastGMTime',
    args: address ? [address] : undefined,
    chainId: targetChainId,
    query: {
      enabled: !!address,
      refetchInterval: 5000, // Refetch every 5 seconds
    },
  })

  // Convert lastGMTime from BigInt to number (keep in seconds)
  // GMCountdown and getTimeUntilNextGM expect seconds, they handle the ms conversion
  const lastGMTime = lastGMTimeRaw ? Number(lastGMTimeRaw) : 0

  // Format time remaining
  const formatTimeRemaining = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  // Calculate cooldown progress (0-100)
  const calculateCooldownProgress = (lastGMTime: number): number => {
    const now = Date.now()
    const timeSince = now - lastGMTime
    const oneDayMs = 24 * 60 * 60 * 1000
    return Math.min((timeSince / oneDayMs) * 100, 100)
  }

  // Fetch GM stats on mount
  useEffect(() => {
    if (!address) return
    
    const fetchStats = async () => {
      setIsLoadingStats(true)
      try {
        const stats = await getGMStats({ 
          fid: fid || 0, 
          walletAddress: address 
        })
        setGmStats(stats)
        
        // Get rank progress from on-chain ScoringModule contract
        if (address) {
          try {
            const onChainStats = await getUserStatsOnChainClient(address)
            if (onChainStats) {
              setRankProgress({
                currentTier: onChainStats.rankTier,
                currentPoints: Number(onChainStats.totalScore),
                nextTierPoints: onChainStats.nextRankThreshold ? Number(onChainStats.nextRankThreshold) : 0,
                progress: onChainStats.rankProgress || 0,
                nextTierName: `Tier ${onChainStats.rankTier + 1}`
              })
            }
          } catch (error) {
            console.error('[GMButton] Error fetching on-chain stats:', error)
          }
        }
      } catch (error) {
        console.error('[GMButton] Error fetching GM stats:', error)
      } finally {
        setIsLoadingStats(false)
      }
    }
    
    fetchStats()
  }, [address, fid])

  // Update cooldown timer every second using on-chain lastGMTime (in seconds)
  useEffect(() => {
    if (!lastGMTime || lastGMTime === 0) {
      setTimeRemaining('')
      setCooldownProgress(100)
      return
    }

    const updateTimer = () => {
      const now = Date.now()
      const lastGMTimeMs = lastGMTime * 1000 // Convert to milliseconds
      const timeSince = now - lastGMTimeMs
      const oneDayMs = 24 * 60 * 60 * 1000
      const remaining = oneDayMs - timeSince

      if (remaining > 0) {
        setTimeRemaining(formatTimeRemaining(remaining))
        setCooldownProgress(calculateCooldownProgress(lastGMTimeMs))
      } else {
        setTimeRemaining('')
        setCooldownProgress(100)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [lastGMTime])

  // Check if user can GM today using on-chain data (lastGMTime in seconds)
  const canGM = useCallback(() => {
    if (!lastGMTime || lastGMTime === 0) return true
    
    const now = Date.now()
    const lastGMTimeMs = lastGMTime * 1000 // Convert to milliseconds
    const timeSinceLastGM = now - lastGMTimeMs
    const oneDayMs = 24 * 60 * 60 * 1000
    
    return timeSinceLastGM >= oneDayMs
  }, [lastGMTime])

  // Handle GM transaction
  const handleSendGM = async () => {
    if (!isConnected) {
      console.log('[GMButton] Please connect wallet')
      return
    }

    if (!canGM()) {
      console.log('[GMButton] Already GM\'d today')
      return
    }

    try {
      // Switch chain if needed
      if (walletChainId !== targetChainId) {
        console.log('[GMButton] Switching to', CHAIN_LABELS[chain])
        await switchChainAsync({ chainId: targetChainId })
      }

      // Send GM transaction
      console.log('[GMButton] Sending GM transaction...')

      writeContract({
        address: contractAddress as `0x${string}`,
        abi: GM_CONTRACT_ABI,
        functionName: 'sendGM',
        chainId: targetChainId,
      })
    } catch (error: any) {
      console.error('[GMButton] Transaction error:', error)
    }
  }

  // Handle transaction confirmation
  useEffect(() => {
    if (!isConfirmed || !txHash || !address) return

    const handleSuccess = async () => {
      console.log('[GMButton] Transaction confirmed! Hash:', txHash)
      
      // Invalidate scoring cache to show updated points immediately
      await fetch('/api/scoring/invalidate-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      }).catch((err) => {
        console.error('[GMButton] Failed to invalidate cache:', err);
      });
      
      // Small delay to ensure indexer has updated
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Fetch updated GM stats
      const updatedStats = await getGMStats({ 
        fid: fid || 0, 
        walletAddress: address 
      })

      if (!updatedStats) {
        console.error('[GMButton] Failed to fetch updated stats')
        return
      }

      console.log('[GMButton] Updated stats:', updatedStats)
      setGmStats(updatedStats)

      // Get updated rank progress from on-chain
      if (address) {
        try {
          const onChainStats = await getUserStatsOnChainClient(address)
          if (onChainStats) {
            setRankProgress({
              currentTier: onChainStats.rankTier,
              currentPoints: Number(onChainStats.totalScore),
              nextTierPoints: onChainStats.nextRankThreshold ? Number(onChainStats.nextRankThreshold) : 0,
              progress: onChainStats.rankProgress || 0,
              nextTierName: `Tier ${onChainStats.rankTier + 1}`
            })
          }
        } catch (error) {
          console.error('[GMButton] Error fetching updated on-chain stats:', error)
        }
      }

      // Get totalXP from on-chain total score
      const newTotalXP = address ? Number((await getUserStatsOnChainClient(address))?.totalScore || 0) : updatedStats.totalGMs * 10

      // Refetch on-chain lastGMTime
      refetchLastGMTime()

      // Calculate GM reward (base: 10 XP + streak bonus)
      const baseReward = 10
      const streakBonus = Math.min(updatedStats.currentStreak * 2, 50) // Max +50 XP from streak
      const gmReward = baseReward + streakBonus

      console.log('[GMButton] Showing XP celebration:', {
        gmReward,
        newTotalXP,
        streak: updatedStats.currentStreak
      })

      // Create XP payload
      const payload: XpEventPayload = {
        event: 'gm',
        chainKey: chain,
        xpEarned: gmReward,
        totalPoints: newTotalXP,
        headline: `GM sent! 🌅 Streak: ${updatedStats.currentStreak}`,
        tierTagline: `+${gmReward} XP Earned`,
        shareLabel: 'Share GM streak',
        visitLabel: 'View Stats',
        visitUrl: '/profile',
      }

      // Set payload first, then open overlay
      setXpPayload(payload)
      
      // Use setTimeout to ensure state update completes
      setTimeout(() => {
        console.log('[GMButton] Opening XP overlay...')
        setXpOverlayOpen(true)
      }, 100)
    }

    handleSuccess()
  }, [isConfirmed, txHash, address, fid, chain])

  // Handle transaction errors
  useEffect(() => {
    if (!writeError) return
    console.error('[GMButton] Transaction error:', writeError)
  }, [writeError])

  // Calculate button state
  const isDisabled = !isConnected || isPending || isConfirming || !canGM()
  const isLoading = isPending || isConfirming || isLoadingStats

  // Get streak milestone icon
  const getStreakIcon = () => {
    const streak = gmStats?.currentStreak || 0
    if (streak >= 30) return <LocalFireDepartmentIcon className="w-5 h-5" />
    if (streak >= 7) return <RocketLaunchIcon className="w-5 h-5" />
    return <WbSunnyIcon className="w-5 h-5" />
  }

  // Get streak milestone color
  const getStreakColor = () => {
    const streak = gmStats?.currentStreak || 0
    if (streak >= 30) return 'from-orange-500 to-red-500'
    if (streak >= 7) return 'from-purple-500 to-pink-500'
    return 'from-yellow-400 to-orange-500'
  }

  if (variant === 'minimal') {
    return (
      <>
        <Tooltip
          content={
            !canGM() && timeRemaining ? (
              `Next GM in ${timeRemaining}`
            ) : !canGM() ? (
              'GM sent today ✓'
            ) : (
              'Send GM • Earn XP • Build streak 🔥'
            )
          }
        >
          <button
            onClick={handleSendGM}
            disabled={isDisabled}
            className={`
              relative group
              px-6 py-3 rounded-xl
              bg-gradient-to-r ${getStreakColor()}
              text-white font-semibold
              disabled:opacity-50 disabled:cursor-not-allowed
              hover:shadow-lg hover:scale-105
              transition-all duration-200
              ${className}
            `}
          >
            <div className="flex items-center gap-2">
              {getStreakIcon()}
              <span>
                {isLoading ? 'Sending...' : 
                 !canGM() && timeRemaining ? `${timeRemaining}` : 
                 !canGM() ? 'GM Sent ✓' : 
                 'Send GM'}
              </span>
            </div>
          </button>
        </Tooltip>

        <XPEventOverlay
          open={xpOverlayOpen}
          payload={xpPayload}
          onClose={() => setXpOverlayOpen(false)}
        />
      </>
    )
  }

  if (variant === 'hero') {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative ${className}`}
        >
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 blur-3xl" />

          {/* Card */}
          <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-700 p-8 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  {getStreakIcon()}
                  Daily GM Ritual
                </h3>
                <p className="text-slate-400 mt-1">
                  Keep your streak alive • Earn bonus XP
                </p>
              </div>
              {gmStats && (
                <div className="text-right">
                  <div className="text-3xl font-bold text-white">
                    {gmStats.currentStreak}
                  </div>
                  <div className="text-sm text-slate-400">Day Streak</div>
                </div>
              )}
            </div>

            {/* Countdown */}
            {lastGMTime && lastGMTime > 0 && (
              <div className="mb-6">
                <GMCountdown 
                  lastGMTimestamp={lastGMTime}
                  className="scale-90"
                />
              </div>
            )}

            {/* Stats Grid */}
            {gmStats && rankProgress && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-white">
                    {gmStats.totalGMs}
                  </div>
                  <div className="text-sm text-slate-400">Lifetime GMs</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-white">
                    {(gmStats.totalGMs * 10).toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-400">Total XP</div>
                </div>
                {/* Rank tier */}
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <div className="text-lg font-bold text-white">
                    {rankProgress.currentTier.name}
                  </div>
                  <div className="text-sm text-slate-400">Current Rank</div>
                </div>
                {/* Level progress */}
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <div className="text-lg font-bold text-white">
                    Level {rankProgress.level}
                  </div>
                  <div className="text-sm text-slate-400">
                    {rankProgress.xpIntoLevel}/{rankProgress.xpForLevel} XP
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                      style={{ width: `${(rankProgress.xpIntoLevel / rankProgress.xpForLevel) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Cooldown Info Bar */}
            {!canGM() && timeRemaining && (
              <div className="mb-4 bg-slate-800/80 rounded-lg p-3 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <AccessTimeIcon className="w-4 h-4" />
                    <span>Next GM available in</span>
                  </div>
                  <span className="text-white font-semibold text-sm">{timeRemaining}</span>
                </div>
                {/* Progress bar */}
                <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${cooldownProgress}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
                  />
                </div>
              </div>
            )}

            {/* Action Button with Tooltip */}
            <Tooltip
              content={
                !isConnected ? (
                  <div>
                    <div className="font-semibold mb-1">Wallet Required</div>
                    <div className="text-slate-300">Connect your wallet to send daily GM</div>
                  </div>
                ) : !canGM() ? (
                  <div>
                    <div className="font-semibold mb-1">24-Hour Cooldown Active</div>
                    <div className="text-slate-300">Come back in {timeRemaining} to send your next GM and continue your streak!</div>
                    <div className="text-yellow-400 mt-2 text-xs">💡 Daily GMs earn 10 XP + streak bonus (up to +50 XP)</div>
                  </div>
                ) : (
                  <div>
                    <div className="font-semibold mb-1">Send Daily GM</div>
                    <div className="text-slate-300">Earn 10 XP + streak bonus</div>
                    <div className="text-yellow-400 mt-2 text-xs">Current streak: {gmStats?.currentStreak || 0} days 🔥</div>
                  </div>
                )
              }
            >
              <button
                onClick={handleSendGM}
                disabled={isDisabled}
                className={`
                  relative w-full group
                  px-8 py-4 rounded-xl
                  bg-gradient-to-r ${getStreakColor()}
                  text-white font-bold text-lg
                  disabled:opacity-50 disabled:cursor-not-allowed
                  hover:shadow-xl hover:scale-[1.02]
                  transition-all duration-200
                  overflow-hidden
                `}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                
                <div className="relative flex items-center justify-center gap-3">
                  {isLoading && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                  )}
                  {!canGM() && <CheckCircleIcon className="w-5 h-5" />}
                  {!isConnected && <InfoOutlinedIcon className="w-5 h-5" />}
                  <span>
                    {!isConnected ? 'Connect Wallet to GM' :
                     isLoading ? 'Sending GM...' : 
                     !canGM() ? `Next GM in ${timeRemaining}` : 
                     'Send GM & Earn XP'}
                  </span>
                </div>
              </button>
            </Tooltip>

            {/* Network indicator */}
            <div className="mt-4 text-center">
              <span className="text-xs text-slate-500">
                Network: {CHAIN_LABELS[chain]}
              </span>
            </div>
          </div>
        </motion.div>

        <XPEventOverlay
          open={xpOverlayOpen}
          payload={xpPayload}
          onClose={() => setXpOverlayOpen(false)}
        />
      </>
    )
  }

  // Default variant
  return (
    <>
      <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            {getStreakIcon()}
            Daily GM
          </h3>
          {gmStats && (
            <div className="flex items-center gap-2 text-sm">
              <LocalFireDepartmentIcon className="w-4 h-4 text-orange-500" />
              <span className="font-semibold text-slate-900 dark:text-white">
                {gmStats.currentStreak} day streak
              </span>
            </div>
          )}
        </div>

        {/* Cooldown Progress */}
        {!canGM() && timeRemaining && (
          <div className="mb-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="text-slate-600 dark:text-slate-400">Next GM available</span>
              <span className="text-slate-900 dark:text-white font-semibold">{timeRemaining}</span>
            </div>
            <div className="h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${cooldownProgress}%` }}
                className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
              />
            </div>
          </div>
        )}

        {/* Countdown */}
        {lastGMTime && lastGMTime > 0 && (
          <div className="mb-4">
            <GMCountdown 
              lastGMTimestamp={lastGMTime}
              className="scale-75"
            />
          </div>
        )}

        {/* Stats */}
        {gmStats && rankProgress && (
          <div className="space-y-3 mb-4">
            {/* XP Stats Row */}
            <div className="flex gap-3">
              <div className="flex-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg p-3">
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {gmStats.totalGMs}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Total GMs</div>
              </div>
              <div className="flex-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg p-3">
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {(gmStats.totalGMs * 10).toLocaleString()}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Total XP</div>
              </div>
            </div>
            {/* Rank & Level Row */}
            <div className="bg-slate-100 dark:bg-slate-700/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {rankProgress.currentTier.name}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Level {rankProgress.level} • {rankProgress.xpIntoLevel}/{rankProgress.xpForLevel} XP
                  </div>
                </div>
              </div>
              {/* Level progress bar */}
              <div className="h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                  style={{ width: `${(rankProgress.xpIntoLevel / rankProgress.xpForLevel) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Button with Tooltip */}
        <Tooltip
          content={
            !canGM() && timeRemaining ? (
              `Come back in ${timeRemaining} to continue your streak!`
            ) : !canGM() ? (
              'GM sent today ✓'
            ) : (
              'Earn 10 XP + streak bonus 🔥'
            )
          }
        >
          <button
            onClick={handleSendGM}
            disabled={isDisabled}
            className={`
              relative w-full group
              px-6 py-3 rounded-xl
              bg-gradient-to-r ${getStreakColor()}
              text-white font-semibold
              disabled:opacity-50 disabled:cursor-not-allowed
              hover:shadow-lg hover:scale-[1.02]
              transition-all duration-200
            `}
          >
            <div className="flex items-center justify-center gap-2">
              {isLoading && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
              )}
              {!canGM() && <CheckCircleIcon className="w-4 h-4" />}
              <span>
                {isLoading ? 'Sending...' : 
                 !canGM() ? 'GM Sent ✓' : 
                 'Send GM'}
              </span>
            </div>
          </button>
        </Tooltip>

        {/* Network label */}
        <div className="mt-3 text-center">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {CHAIN_LABELS[chain]}
          </span>
        </div>
      </div>

      <XPEventOverlay
        open={xpOverlayOpen}
        payload={xpPayload}
        onClose={() => setXpOverlayOpen(false)}
      />
    </>
  )
}
