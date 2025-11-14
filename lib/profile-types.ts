import type { ChainKey } from '@/lib/gm-utils'
import type { FarcasterUser } from '@/lib/neynar'

export type TeamOverview = {
  chain: ChainKey
  teamId: number
  name: string
  founder: string
  memberCount: number
}

export type ProfileChainSnapshot = {
  chain: ChainKey
  totalPoints: number
  availablePoints: number
  lockedPoints: number
  streak: number
  lastGM?: number
  registered: boolean
  gmReward?: number
  teamId?: number
}

export type ProfileBadge = {
  chain: ChainKey
  badgeId: number
  name?: string
  image?: string
  tokenUri?: string
}

export type ProfileOverviewData = {
  address: `0x${string}`
  fid: number | null
  displayName: string
  username?: string
  pfpUrl?: string
  farcasterUser?: FarcasterUser | null
  totalPoints: number
  estimatedGMs: number
  streak: number
  lastGM?: number
  globalRank?: number | null
  referrer?: string | null
  team?: TeamOverview | null
  chainSummaries: ProfileChainSnapshot[]
  badges: ProfileBadge[]
  registeredChains: ChainKey[]
  frameUrl?: string
  shareUrl?: string
  neynarScore?: number | null
}
