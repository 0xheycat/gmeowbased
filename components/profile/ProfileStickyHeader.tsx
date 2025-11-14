'use client'

import Image from 'next/image'

interface ProfileStickyHeaderProps {
  avatarUrl?: string | null
  displayName: string
  address: string
  totalPoints: number
  globalRank: number | null
}

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function formatNumber(value: number | null | undefined) {
  if (!value || Number.isNaN(value)) return '0'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString('en-US')
}

export function ProfileStickyHeader({
  avatarUrl,
  displayName,
  address,
  totalPoints,
  globalRank,
}: ProfileStickyHeaderProps) {
  return (
    <div className="sticky top-0 z-40 bg-[#080f21]/95 backdrop-blur-md px-3 py-2 sm:hidden border-b border-white/10 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between gap-3">
        {/* Avatar + Name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {avatarUrl ? (
            <Image 
              src={avatarUrl} 
              width={32} 
              height={32} 
              alt={displayName}
              className="rounded-full border border-white/20 pixelated" 
              unoptimized
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold border border-white/20">
              {displayName[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="font-bold text-sm truncate">{displayName}</div>
            <div className="text-[10px] text-slate-400">{shortAddress(address)}</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-3 text-xs flex-shrink-0">
          <div className="text-right">
            <div className="font-black text-[#7CFF7A] leading-tight">{formatNumber(totalPoints)}</div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider">XP</div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="text-right">
            <div className="font-black text-amber-400 leading-tight">#{formatNumber(globalRank || 0)}</div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider">Rank</div>
          </div>
        </div>
      </div>
    </div>
  )
}
