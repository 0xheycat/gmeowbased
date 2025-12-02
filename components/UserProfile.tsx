'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useAccount, useConfig } from 'wagmi'
import { getPublicClient } from '@wagmi/core'
import {
  CHAIN_IDS,
  GM_CONTRACT_ABI,
  getContractAddress,
  type ChainKey,
} from '@/lib/gmeow-utils'
import { clearStorageCache, readStorageCache, writeStorageCache } from '@/lib/utils'

interface UserProfileProps {
  user: {
    fid: number
    username?: string
    displayName?: string
    pfpUrl?: string
  }
}

const SUPPORTED_CHAINS: ChainKey[] = ['base', 'unichain', 'celo', 'ink', 'op']
const CHAIN_LABEL: Record<ChainKey, string> = {
  base: 'Base',
  unichain: 'Unichain',
  celo: 'Celo',
  ink: 'Ink',
  op: 'Optimism',
}

type UserProfileTuple = {
  name: string
  bio: string
  twitter: string
  pfpUrl: string
  joinDate: bigint
  hasCustomProfile: boolean
}

type CachedProfilePayload = {
  profile: {
    name?: string
    pfpUrl?: string
    bio?: string
    twitter?: string
    chain?: ChainKey
  } | null
  lastAnnounce: string | null
}

const CACHE_TTL_MS = 1000 * 60 * 3

export function UserProfile({ user }: UserProfileProps) {
  const { address } = useAccount()
  const wagmiConfig = useConfig()

  // Aggregated on-chain profile (best available across chains)
  const [profile, setProfile] = useState<CachedProfilePayload['profile']>(null)

  const lastAnnouncementRef = useRef<string | null>(null)
  const hydratedCacheRef = useRef(false)
  const cacheKey = address ? `profile:${address.toLowerCase()}` : null

  const httpFromIpfs = useCallback((uri?: string) => {
    if (!uri) return uri
    if (uri.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${uri.slice('ipfs://'.length)}`
    return uri
  }, [])

  useEffect(() => {
    let disposed = false

    async function loadProfile() {
      if (!address) {
        setProfile(null)
        lastAnnouncementRef.current = null
        hydratedCacheRef.current = false
        if (cacheKey) clearStorageCache(cacheKey)
        return
      }

      if (cacheKey && !hydratedCacheRef.current) {
        const cached = readStorageCache<CachedProfilePayload>(cacheKey, CACHE_TTL_MS)
        if (cached) {
          setProfile(cached.profile)
          lastAnnouncementRef.current = cached.lastAnnounce
        }
        hydratedCacheRef.current = true
      }

      try {
        let best: { prof: UserProfileTuple; chain: ChainKey } | null = null
        let fallback: { prof: UserProfileTuple; chain: ChainKey } | null = null

        const rpcTimeout = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
          Promise.race([
            promise,
            new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 10000))
          ])

        for (const chain of SUPPORTED_CHAINS) {
          const chainId = CHAIN_IDS[chain]
          const client = getPublicClient(wagmiConfig, { chainId })
          if (!client) continue

          try {
            const result = await rpcTimeout(
              client.readContract({
                address: getContractAddress(chain),
                abi: GM_CONTRACT_ABI,
                functionName: 'getUserProfile',
                args: [address],
              }),
              null
            )
            if (!result) continue
            const tuple = result as readonly [string, string, string, string, bigint, boolean]
            const prof: UserProfileTuple = {
              name: tuple[0],
              bio: tuple[1],
              twitter: tuple[2],
              pfpUrl: tuple[3],
              joinDate: tuple[4],
              hasCustomProfile: tuple[5],
            }

            const hasDetails = Boolean(prof.name || prof.pfpUrl || prof.bio || prof.twitter)
            if (prof.hasCustomProfile && hasDetails && !best) {
              best = { prof, chain }
            } else if (hasDetails && !fallback) {
              fallback = { prof, chain }
            }

            if (best) break
          } catch (err) {
            // Silent fail - try next chain
          }
        }

        if (disposed) return

        const chosen = best || fallback
        if (chosen) {
          const normalized = {
            name: chosen.prof.name || undefined,
            pfpUrl: httpFromIpfs(chosen.prof.pfpUrl) || undefined,
            bio: chosen.prof.bio || undefined,
            twitter: chosen.prof.twitter || undefined,
            chain: chosen.chain,
          }
          setProfile(normalized)

          const announceKey = `sync-${chosen.chain}`
          lastAnnouncementRef.current = announceKey

          if (cacheKey) {
            writeStorageCache(cacheKey, { profile: normalized, lastAnnounce: lastAnnouncementRef.current })
          }
        } else {
          setProfile(null)
          const announceKey = 'empty'
          lastAnnouncementRef.current = announceKey
          if (cacheKey) {
            writeStorageCache(cacheKey, { profile: null, lastAnnounce: lastAnnouncementRef.current })
          }
        }
      } catch (err) {
        if (disposed) return
        console.error('Profile fetch failed:', (err as Error)?.message || String(err))
        lastAnnouncementRef.current = 'error'
        if (cacheKey) clearStorageCache(cacheKey)
      }
    }

    void loadProfile()

    return () => {
      disposed = true
    }
  }, [address, cacheKey, httpFromIpfs, wagmiConfig])

  const title = profile?.name || user.displayName || user.username || `User #${user.fid}`
  const avatarUrl = profile?.pfpUrl || user.pfpUrl
  const initial = (title || 'U')[0]?.toUpperCase()

  return (
    <div className="relative max-w-sm mx-auto site-font">
      <div className="pixel-card text-center">
        {/* Avatar with pixel frame */}
        <div className="flex items-center justify-center mb-4">
          <div
            className="user-avatar-frame"
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={title}
                width={60}
                height={60}
                className="pixelated img-cover-center"
                unoptimized
                onError={(e) => {
                  console.error('Image failed to load:', avatarUrl)
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <span className="text-lg text-[var(--px-sub)]">{initial}</span>
            )}
          </div>
        </div>

        {/* Name */}
        <h2 className="pixel-heading mb-1">{title}</h2>

        {/* Username */}
        {user.username && (
          <p className="text-[var(--px-sub)] text-sm mb-2">@{user.username}</p>
        )}

        {/* FID and Chain source */}
        <div className="flex items-center justify-center gap-2 flex-wrap text-xs text-[var(--px-sub)]">
          <span className="pixel-pill">FID {user.fid}</span>
          {profile?.chain && (
            <span className="pixel-pill">On-chain: {CHAIN_LABEL[profile.chain]}</span>
          )}
        </div>

        {/* Optional bio (on-chain) */}
        {profile?.bio && (
          <p className="mt-3 text-xs text-[var(--px-sub)] px-2">{profile.bio}</p>
        )}
      </div>
    </div>
  )
}