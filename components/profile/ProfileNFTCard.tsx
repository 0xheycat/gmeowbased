'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useAccount } from 'wagmi'
// Reserved for future implementation:
// import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'

interface ProfileNFTCardProps {
  level: number
  tier: string
  totalXP: number
  badges: number
  streakCurrent: number
  streakLongest: number
  username?: string
  pfpUrl?: string
}

export function ProfileNFTCard({
  level,
  tier,
  totalXP,
  badges,
  streakCurrent,
  streakLongest,
  username,
  pfpUrl,
}: ProfileNFTCardProps) {
  const [isMinting, setIsMinting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const { address } = useAccount()
  // Wagmi hooks reserved for future SoulboundBadge minting implementation
  // const { writeContract, data: hash } = useWriteContract()
  // const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const handleMint = async () => {
    if (!address) return
    setIsMinting(true)
    try {
      // TODO: Replace with actual SoulboundBadge contract call
      // writeContract({
      //   address: SOULBOUND_BADGE_ADDRESS,
      //   abi: SOULBOUND_BADGE_ABI,
      //   functionName: 'mint',
      //   args: [address, 'profile', level, totalXP],
      // })
      
      // Simulated success for now
      setTimeout(() => {
        setIsMinting(false)
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 5000)
      }, 2000)
    } catch (error) {
      console.error('Mint failed:', error)
      setIsMinting(false)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-gold/40 bg-gradient-to-br from-[#0a0e27] via-[#0e1433] to-[#0a0e27] p-1 shadow-[0_0_60px_rgba(255,215,0,0.3)]">
      {/* Holographic shimmer overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold/10 to-transparent animate-[shimmer_3s_ease-in-out_infinite]" />
      
      {/* Card content */}
      <div className="relative z-10 space-y-6 rounded-[22px] bg-gradient-to-br from-[#0a0e27]/95 via-[#0e1433]/95 to-[#0a0e27]/95 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {pfpUrl ? (
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gold to-gold-dark blur-xl opacity-50 animate-pulse" />
                <Image
                  src={pfpUrl}
                  alt="Profile"
                  width={64}
                  height={64}
                  className="relative rounded-full border-2 border-gold"
                />
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold bg-gradient-to-br from-gold/20 to-gold-dark/10 text-3xl">
                🎴
              </div>
            )}
            <div>
              <h3 className="text-xl font-black text-gold drop-shadow-[0_0_15px_rgba(255,215,0,0.6)]">
                {username || 'Pioneer'}
              </h3>
              <p className="text-sm text-gray-400">Level {level} • {tier}</p>
            </div>
          </div>
          <div className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-bold text-gold">
            NFT Card
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <StatBox label="Total XP" value={totalXP.toLocaleString()} icon="⚡" />
          <StatBox label="Badges" value={badges} icon="🏅" />
          <StatBox label="Streak" value={streakCurrent} icon="🔥" />
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-gold/20 bg-gradient-to-br from-gold/5 to-transparent p-3">
            <div className="text-xs text-gray-400">Longest Streak</div>
            <div className="mt-1 text-lg font-bold text-gold">{streakLongest} days</div>
          </div>
          <div className="rounded-xl border border-gold/20 bg-gradient-to-br from-gold/5 to-transparent p-3">
            <div className="text-xs text-gray-400">Current Tier</div>
            <div className="mt-1 text-lg font-bold text-gold">{tier}</div>
          </div>
        </div>

        {/* Mint Button */}
        <button
          onClick={handleMint}
          disabled={isMinting || !address}
          className="relative w-full overflow-hidden rounded-full border-2 border-gold/60 bg-gradient-to-r from-gold/30 via-gold-dark/20 to-gold/30 px-6 py-4 font-bold text-white dark:text-white shadow-[0_8px_32px_rgba(255,215,0,0.4),0_0_40px_rgba(255,215,0,0.2)] transition-all hover:scale-105 hover:shadow-[0_12px_40px_rgba(255,215,0,0.6)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          {isMinting ? (
            <>
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gold border-t-transparent" />
                Forging your card on-chain...
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center justify-center gap-2">
                🎴 Mint as NFT
              </span>
            </>
          )}
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-[shimmer_2s_ease-in-out_infinite]" />
        </button>

        {!address && (
          <p className="text-center text-xs text-gray-400">Connect your wallet to mint</p>
        )}
      </div>

      {/* Success Modal */}
      {showSuccess && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-black dark:bg-slate-950/80 backdrop-blur-md">
          <div className="space-y-4 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-gold to-gold-dark p-1 shadow-[0_0_40px_rgba(255,215,0,0.8)] animate-pulse">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-dark-bg">
                <span className="text-3xl">✅</span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gold">Card Minted!</h3>
            <p className="text-sm text-gray-300">Your profile NFT is now on-chain</p>
            <button
              onClick={() => setShowSuccess(false)}
              className="rounded-full border border-gold/40 bg-gold/20 px-6 py-2 text-sm font-semibold text-gold transition-all hover:bg-gold/30"
            >
              View on Explorer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-gold/25 bg-gradient-to-br from-gold/10 to-gold-dark/5 p-4 shadow-[0_4px_16px_rgba(255,215,0,0.15)]">
      <div className="absolute right-2 top-2 text-2xl opacity-20">{icon}</div>
      <div className="relative">
        <div className="text-xs uppercase tracking-wide text-gold/60">{label}</div>
        <div className="mt-1 text-2xl font-black text-gold drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">
          {value}
        </div>
      </div>
    </div>
  )
}
