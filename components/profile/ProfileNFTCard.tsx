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
    <div className="relative overflow-hidden rounded-3xl border-2 border-[#ffd700]/40 bg-gradient-to-br from-[#0a0e27] via-[#0e1433] to-[#0a0e27] p-1 shadow-[0_0_60px_rgba(255,215,0,0.3)]">
      {/* Holographic shimmer overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#ffd700]/10 to-transparent animate-[shimmer_3s_ease-in-out_infinite]" />
      
      {/* Card content */}
      <div className="relative z-10 space-y-6 rounded-[22px] bg-gradient-to-br from-[#0a0e27]/95 via-[#0e1433]/95 to-[#0a0e27]/95 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {pfpUrl ? (
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#ffd700] to-[#ffed4e] blur-xl opacity-50 animate-pulse" />
                <Image
                  src={pfpUrl}
                  alt="Profile"
                  width={64}
                  height={64}
                  className="relative rounded-full border-2 border-[#ffd700]"
                />
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#ffd700] bg-gradient-to-br from-[#ffd700]/20 to-[#ffed4e]/10 text-3xl">
                🎴
              </div>
            )}
            <div>
              <h3 className="text-xl font-black text-[#ffd700]" style={{ textShadow: '0 0 15px rgba(255,215,0,0.6)' }}>
                {username || 'Pioneer'}
              </h3>
              <p className="text-sm text-gray-400">Level {level} • {tier}</p>
            </div>
          </div>
          <div className="rounded-full border border-[#ffd700]/30 bg-[#ffd700]/10 px-3 py-1 text-xs font-bold text-[#ffd700]">
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
          <div className="rounded-xl border border-[#ffd700]/20 bg-gradient-to-br from-[#ffd700]/5 to-transparent p-3">
            <div className="text-xs text-gray-400">Longest Streak</div>
            <div className="mt-1 text-lg font-bold text-[#ffd700]">{streakLongest} days</div>
          </div>
          <div className="rounded-xl border border-[#ffd700]/20 bg-gradient-to-br from-[#ffd700]/5 to-transparent p-3">
            <div className="text-xs text-gray-400">Current Tier</div>
            <div className="mt-1 text-lg font-bold text-[#ffd700]">{tier}</div>
          </div>
        </div>

        {/* Mint Button */}
        <button
          onClick={handleMint}
          disabled={isMinting || !address}
          className="relative w-full overflow-hidden rounded-full border-2 border-[#ffd700]/60 bg-gradient-to-r from-[#ffd700]/30 via-[#ffed4e]/20 to-[#ffd700]/30 px-6 py-4 font-bold text-white shadow-[0_8px_32px_rgba(255,215,0,0.4),0_0_40px_rgba(255,215,0,0.2)] transition-all hover:scale-105 hover:shadow-[0_12px_40px_rgba(255,215,0,0.6)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          {isMinting ? (
            <>
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#ffd700] border-t-transparent" />
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
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-black/80 backdrop-blur-md">
          <div className="space-y-4 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-[#ffd700] to-[#ffed4e] p-1 shadow-[0_0_40px_rgba(255,215,0,0.8)] animate-pulse">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0a0e27]">
                <span className="text-3xl">✅</span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-[#ffd700]">Card Minted!</h3>
            <p className="text-sm text-gray-300">Your profile NFT is now on-chain</p>
            <button
              onClick={() => setShowSuccess(false)}
              className="rounded-full border border-[#ffd700]/40 bg-[#ffd700]/20 px-6 py-2 text-sm font-semibold text-[#ffd700] transition-all hover:bg-[#ffd700]/30"
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
    <div className="relative overflow-hidden rounded-xl border-2 border-[#ffd700]/25 bg-gradient-to-br from-[#ffd700]/10 to-[#ffed4e]/5 p-4 shadow-[0_4px_16px_rgba(255,215,0,0.15)]">
      <div className="absolute right-2 top-2 text-2xl opacity-20">{icon}</div>
      <div className="relative">
        <div className="text-xs uppercase tracking-wide text-[#ffd700]/60">{label}</div>
        <div className="mt-1 text-2xl font-black text-[#ffd700]" style={{ textShadow: '0 0 10px rgba(255,215,0,0.5)' }}>
          {value}
        </div>
      </div>
    </div>
  )
}
