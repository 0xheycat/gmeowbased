'use client'

/**
 * Guild Discovery - Guild Directory & Join Flow
 * Phase 15: Guild system with on-chain data & XP overlay
 * 
 * Features:
 * - Real on-chain guild data from contracts
 * - Multi-chain guild scanning (Base, Unichain, Celo, Ink, Optimism)
 * - Guild join flow with transaction
 * - XP celebration overlay (guild-join event)
 * - Search & filter system
 * - Stats dashboard
 * 
 * Design System:
 * - Tailwick v2.0 (Card, Button, Badge, Input components)
 * - Gmeowbased v0.1 (QuestIcon for guild icon)
 * - Mobile-first responsive (1/2/3 columns)
 * 
 * Data Source:
 * - Guild data from on-chain contract state (NOT database)
 * - Member rosters from GuildJoined/GuildLeft events
 * - User membership from guildOf(address) contract call
 */

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount, useConfig, useChainId } from 'wagmi'
import { readContract, writeContract, waitForTransactionReceipt, switchChain, getChainId } from 'wagmi/actions'
import { AppLayout } from '@/components/layouts/AppLayout'
import { 
  Card, 
  CardBody, 
  CardHeader,
  CardFooter,
  Badge, 
  Button,
  StatsCard
} from '@/components/ui/tailwick-primitives'
import { QuestIcon } from '@/components/ui/QuestIcon'
import { XPEventOverlay, type XpEventPayload } from '@/components/XPEventOverlay'
import { useUnifiedFarcasterAuth } from '@/hooks/useUnifiedFarcasterAuth'
import { calculateRankProgress } from '@/lib/rank'
import { emitRankTelemetryEvent } from '@/lib/rank-telemetry-client'
import { 
  getTeamSummary, 
  buildGuildSlug, 
  type TeamSummary 
} from '@/lib/team'
import { 
  CHAIN_IDS, 
  type ChainKey,
  type GMChainKey,
  getGuildAddress,
  getGuildABI,
  createJoinGuildTx,
  normalizeToGMChain,
  isGMChain
} from '@/lib/gmeow-utils'

// Simple toast utility
const toast = {
  success: (msg: string) => console.log('[SUCCESS]', msg),
  error: (msg: string) => console.error('[ERROR]', msg)
}

// Guild data type
type GuildData = {
  chain: ChainKey
  teamId: number
  name: string
  founder: string // wallet address
  totalPoints: number
  memberCount: number
  active: boolean
  level: number
  isJoined: boolean
  rank?: number
}

// Stats type
type GuildStats = {
  total: number
  active: number
  joined: number
  totalMembers: number
}

// Filter state type
type FilterState = {
  search: string
  chain: ChainKey | 'all'
  status: 'all' | 'active' | 'inactive'
  membership: 'all' | 'joined' | 'not-joined'
}

// Chain labels
const chainLabels: Record<ChainKey, string> = {
  base: 'Base',
  unichain: 'Unichain',
  celo: 'Celo',
  ink: 'Ink',
  optimism: 'Optimism',
  arbitrum: 'Arbitrum',
  ethereum: 'Ethereum',
  avax: 'Avalanche',
  berachain: 'Berachain',
  bnb: 'BNB Chain',
  fraxtal: 'Fraxtal',
  katana: 'Katana',
  soneium: 'Soneium',
  taiko: 'Taiko',
  hyperevm: 'HyperEVM',
  op: 'Optimism'
}

// Supported guild chains (chains with deployed contracts)
const GUILD_CHAINS: ChainKey[] = ['base', 'unichain', 'celo', 'ink', 'op']
const MAX_SCAN_LIMIT = 50 // Scan first 50 guild IDs per chain

// Short address helper
const shortAddr = (addr: string | null | undefined) => {
  if (!addr) return '0x...'
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

// Format number helper
const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

// Chain icon component
function ChainIcon({ chain, size = 16 }: { chain: ChainKey; size?: number }) {
  // Use badge colors based on chain
  const colors: Record<string, string> = {
    base: 'bg-blue-500',
    unichain: 'bg-pink-500',
    celo: 'bg-yellow-500',
    ink: 'bg-indigo-500',
    op: 'bg-red-500',
    optimism: 'bg-red-500'
  }
  
  return (
    <div 
      className={`${colors[chain] || 'bg-slate-500'} rounded-full`}
      style={{ width: size, height: size }}
    />
  )
}

export default function GuildDiscoveryPage() {
  const router = useRouter()
  const { address } = useAccount()
  const wagmiConfig = useConfig()
  const currentChainId = useChainId()
  const { profile } = useUnifiedFarcasterAuth()

  const [guilds, setGuilds] = useState<GuildData[]>([])
  const [loading, setLoading] = useState(true)
  const [joiningGuild, setJoiningGuild] = useState<number | null>(null)
  const [xpCelebration, setXpCelebration] = useState<XpEventPayload | null>(null)
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    chain: 'all',
    status: 'all',
    membership: 'all'
  })

  // Fetch user stats for XP overlay
  const fetchUserStats = async (fid: number) => {
    try {
      const response = await fetch(`/api/stats?fid=${fid}`)
      if (!response.ok) throw new Error('Failed to fetch stats')
      return await response.json()
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
      return { total_points: 0 }
    }
  }

  // Fetch guilds from contracts
  const fetchGuilds = async () => {
    setLoading(true)
    const allGuilds: GuildData[] = []
    
    try {
      // Scan guilds across all supported chains
      for (const chain of GUILD_CHAINS) {
        try {
          const chainId = CHAIN_IDS[chain as keyof typeof CHAIN_IDS]
          if (!chainId) continue
          // Skip non-GM chains
          if (!isGMChain(chain)) continue

          // Scan guild IDs 1 → MAX_SCAN_LIMIT
          const scanPromises = []
          for (let teamId = 1; teamId <= MAX_SCAN_LIMIT; teamId++) {
            scanPromises.push(
              getTeamSummary(chain as GMChainKey, teamId)
                .then((summary: TeamSummary) => ({
                  chain,
                  teamId: summary.teamId,
                  name: summary.name,
                  founder: summary.founder,
                  totalPoints: summary.totalPoints,
                  memberCount: summary.memberCount,
                  active: true, // getTeamSummary only returns active guilds
                  level: 1, // Default level (not in contract)
                  isJoined: false, // Will be updated below
                  rank: 0
                } as GuildData))
                .catch(() => null)
            )
          }
          
          const results = await Promise.all(scanPromises)
          const validGuilds = results.filter(Boolean) as GuildData[]
          
          // Check user membership for each guild if wallet connected
          if (address && validGuilds.length > 0) {
            try {
              const gmChain = normalizeToGMChain(chain)
              if (!gmChain) continue
              
              const userGuildId = await readContract(wagmiConfig, {
                address: getGuildAddress(gmChain),
                abi: getGuildABI(gmChain),
                functionName: 'guildOf',
                args: [address],
                chainId
              })
              
              validGuilds.forEach(g => {
                g.isJoined = userGuildId === BigInt(g.teamId)
              })
            } catch (error) {
              console.error(`Failed to check membership on ${chain}:`, error)
            }
          }
          
          allGuilds.push(...validGuilds)
        } catch (error) {
          console.error(`Failed to scan guilds on ${chain}:`, error)
        }
      }
      
      // Sort by totalPoints descending
      allGuilds.sort((a, b) => b.totalPoints - a.totalPoints)
      
      // Add rank
      allGuilds.forEach((g, i) => {
        g.rank = i + 1
      })
      
      setGuilds(allGuilds)
    } catch (error) {
      console.error('Failed to fetch guilds:', error)
      toast.error('Failed to load guilds')
    } finally {
      setLoading(false)
    }
  }

  // Load guilds on mount and when address changes
  useEffect(() => {
    fetchGuilds()
  }, [address])

  // Calculate guild stats
  const guildStats: GuildStats = useMemo(() => {
    const total = guilds.length
    const active = guilds.filter(g => g.active).length
    const joined = guilds.filter(g => g.isJoined).length
    const totalMembers = guilds.reduce((sum, g) => sum + g.memberCount, 0)
    
    return { total, active, joined, totalMembers }
  }, [guilds])

  // Filter guilds
  const filteredGuilds = useMemo(() => {
    return guilds.filter(guild => {
      // Search filter
      if (filters.search && !guild.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false
      }
      
      // Chain filter
      if (filters.chain !== 'all' && guild.chain !== filters.chain) {
        return false
      }
      
      // Status filter
      if (filters.status === 'active' && !guild.active) return false
      if (filters.status === 'inactive' && guild.active) return false
      
      // Membership filter
      if (filters.membership === 'joined' && !guild.isJoined) return false
      if (filters.membership === 'not-joined' && guild.isJoined) return false
      
      return true
    })
  }, [guilds, filters])

  // Handle guild join
  const handleJoinGuild = async (guild: GuildData) => {
    try {
      // 1. Validate auth
      if (!address) {
        toast.error('Connect wallet to join guild')
        return
      }
      if (!profile?.fid) {
        toast.error('Sign in with Farcaster to join guild')
        return
      }

      setJoiningGuild(guild.teamId)

      // 2. Check not in guild
      const gmChain = normalizeToGMChain(guild.chain)
      if (!gmChain) throw new Error('Unsupported chain')
      
      const chainId = CHAIN_IDS[gmChain]
      if (!chainId) throw new Error('Unsupported chain')

      const currentGuildId = await readContract(wagmiConfig, {
        address: getGuildAddress(gmChain),
        abi: getGuildABI(gmChain),
        functionName: 'guildOf',
        args: [address],
        chainId
      })
      
      if (currentGuildId && (currentGuildId as bigint) > 0n) {
        toast.error('Already in a guild. Leave current guild first.')
        return
      }

      // 3. Switch chain if needed
      const currentChain = await getChainId(wagmiConfig)
      if (currentChain !== chainId) {
        await switchChain(wagmiConfig, { chainId })
      }

      // 4. Execute join transaction
      const txCall = createJoinGuildTx(guild.teamId, gmChain)
      const hash = await writeContract(wagmiConfig, {
        ...txCall,
        account: address,
        chainId
      })

      toast.success('Transaction submitted!')

      // 5. Wait for confirmation
      await waitForTransactionReceipt(wagmiConfig, { 
        hash, 
        chainId 
      })

      // 6. Fetch user stats
      const userStats = await fetchUserStats(profile.fid)
      const progress = calculateRankProgress(userStats.total_points)

      // 7. Show XP celebration
      setXpCelebration({
        event: 'guild-join',
        chainKey: guild.chain,
        xpEarned: 500, // Guild join bonus
        totalPoints: userStats.total_points,
        progress: progress,
        headline: `Joined Guild!`,
        visitUrl: `/app/guilds/${guild.chain}/${buildGuildSlug(guild.name, guild.teamId)}`,
        tierTagline: `Welcome to ${guild.name}!`
      })

      // 8. Emit telemetry
      await emitRankTelemetryEvent({
        event: 'guild-join',
        chain: guild.chain,
        walletAddress: address,
        fid: profile.fid,
        delta: 500,
        totalPoints: userStats.total_points,
        level: progress.level,
        tierName: progress.currentTier.name,
        tierPercent: progress.percent,
        metadata: {
          guildId: guild.teamId,
          guildName: guild.name,
          chain: guild.chain,
          txHash: hash
        }
      })

      // 9. Refresh guilds
      await fetchGuilds()
      
      toast.success(`Joined ${guild.name}!`)
    } catch (error: any) {
      console.error('Join guild error:', error)
      toast.error(error.message || 'Failed to join guild')
    } finally {
      setJoiningGuild(null)
    }
  }

  // Handle view guild
  const handleViewGuild = (guild: GuildData) => {
    const slug = buildGuildSlug(guild.name, guild.teamId)
    router.push(`/app/guilds/${guild.chain}/${slug}`)
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold theme-text-primary mb-2">Guild Discovery</h1>
          <p className="theme-text-secondary">Join communities across multiple chains and earn rewards together</p>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard 
            icon="/assets/gmeow-icons/Gallery Icon.svg"
            iconAlt="Total Guilds"
            label="Total Guilds" 
            value={guildStats.total.toString()}
          />
          <StatsCard 
            icon="/assets/gmeow-icons/Credits Icon.svg"
            iconAlt="Active Guilds"
            label="Active Guilds" 
            value={guildStats.active.toString()}
            gradient="green"
          />
          <StatsCard 
            icon="/assets/gmeow-icons/Badges Icon.svg"
            iconAlt="Your Guilds"
            label="Your Guilds" 
            value={guildStats.joined.toString()}
            gradient="cyan"
          />
          <StatsCard 
            icon="/assets/gmeow-icons/Users Icon.svg"
            iconAlt="Total Members"
            label="Total Members" 
            value={formatNumber(guildStats.totalMembers)}
            gradient="purple"
          />
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Search guilds..."
            value={filters.search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="theme-card-bg-primary theme-text-primary border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 md:col-span-2"
          />

          {/* Chain Filter */}
          <select
            value={filters.chain}
            onChange={(e) => setFilters(prev => ({ ...prev, chain: e.target.value as ChainKey | 'all' }))}
            className="theme-card-bg-primary theme-text-primary border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Chains</option>
            {GUILD_CHAINS.map(chain => (
              <option key={chain} value={chain}>{chainLabels[chain]}</option>
            ))}
          </select>

          {/* Membership Filter */}
          <select
            value={filters.membership}
            onChange={(e) => setFilters(prev => ({ ...prev, membership: e.target.value as FilterState['membership'] }))}
            className="theme-card-bg-primary theme-text-primary border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Guilds</option>
            <option value="joined">Joined</option>
            <option value="not-joined">Not Joined</option>
          </select>
        </div>

        {/* Guild Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <Card key={i} className="animate-pulse theme-card-bg-primary">
                <div className="h-24 bg-slate-700/50" />
                <CardBody className="space-y-3">
                  <div className="h-4 bg-slate-700/50 rounded" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-3 bg-slate-700/50 rounded" />
                    <div className="h-3 bg-slate-700/50 rounded" />
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        ) : filteredGuilds.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGuilds.map(guild => (
              <GuildCard
                key={`${guild.chain}-${guild.teamId}`}
                guild={guild}
                onJoin={handleJoinGuild}
                onView={handleViewGuild}
                isJoining={joiningGuild === guild.teamId}
              />
            ))}
          </div>
        ) : (
          <EmptyState filters={filters} onClearFilters={() => setFilters({ search: '', chain: 'all', status: 'all', membership: 'all' })} />
        )}

        {/* XP Overlay */}
        {xpCelebration && (
          <XPEventOverlay 
            payload={xpCelebration} 
            open={Boolean(xpCelebration)} 
            onClose={() => setXpCelebration(null)} 
          />
        )}
      </div>
    </AppLayout>
  )
}

// Guild Card Component
function GuildCard({ 
  guild, 
  onJoin, 
  onView, 
  isJoining 
}: { 
  guild: GuildData
  onJoin: (guild: GuildData) => void
  onView: (guild: GuildData) => void
  isJoining: boolean
}) {
  return (
    <Card hover className="theme-card-bg-primary overflow-hidden">
      {/* Guild Header with Chain Badge */}
      <div className="relative p-4 bg-gradient-to-br from-primary-500/20 to-primary-600/20">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="info" size="sm" className="flex items-center gap-1.5">
            <ChainIcon chain={guild.chain} size={14} />
            <span>{chainLabels[guild.chain]}</span>
          </Badge>
          {guild.rank && (
            <Badge variant="success" size="sm">
              Rank #{guild.rank}
            </Badge>
          )}
        </div>
        
        <h3 className="text-xl font-bold theme-text-primary truncate">
          {guild.name}
        </h3>
        
        {guild.isJoined && (
          <Badge className="absolute top-2 right-2 bg-emerald-500/90 text-white" size="sm">
            ✓ Joined
          </Badge>
        )}
      </div>

      <CardBody className="space-y-4">
        {/* Guild Stats Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <QuestIcon type="guild_join" size={16} className="text-cyan-400" />
            <span className="theme-text-secondary">
              {guild.memberCount} members
            </span>
          </div>
          <div className="flex items-center gap-2">
            <QuestIcon type="quest_claim" size={16} className="text-amber-400" />
            <span className="theme-text-secondary">
              Level {guild.level}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <QuestIcon type="onchain" size={16} className="text-emerald-400" />
            <span className="theme-text-secondary">
              {formatNumber(guild.totalPoints)} pts
            </span>
          </div>
          <div className="flex items-center gap-2">
            <QuestIcon type="badge_mint" size={16} className="text-purple-400" />
            <span className="theme-text-secondary">
              {guild.active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Founder Badge */}
        <div className="flex items-center gap-2 text-xs theme-text-secondary pt-2 border-t border-slate-700/50">
          <span>Founder:</span>
          <code className="text-xs bg-slate-700/50 px-2 py-1 rounded">
            {shortAddr(guild.founder)}
          </code>
        </div>
      </CardBody>

      <CardFooter className="grid grid-cols-2 gap-3">
        {/* Join Button (if not member) */}
        {!guild.isJoined && (
          <Button 
            variant="primary" 
            size="sm" 
            onClick={() => onJoin(guild)}
            disabled={isJoining}
          >
            {isJoining ? 'Joining...' : 'Join Guild'}
          </Button>
        )}
        
        {/* View Button */}
        <Button 
          variant={guild.isJoined ? 'primary' : 'secondary'} 
          size="sm"
          onClick={() => onView(guild)}
          className={!guild.isJoined ? '' : 'col-span-2'}
        >
          View Details
        </Button>
      </CardFooter>
    </Card>
  )
}

// Empty State Component
function EmptyState({ filters, onClearFilters }: { filters: FilterState; onClearFilters: () => void }) {
  const hasFilters = filters.search || filters.chain !== 'all' || filters.status !== 'all' || filters.membership !== 'all'

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <QuestIcon type="badge_mint" size={64} className="opacity-40 mb-4" />
      <h3 className="text-xl font-bold theme-text-primary mb-2">
        {hasFilters ? 'No Guilds Found' : 'No Guilds Available'}
      </h3>
      <p className="theme-text-secondary mb-6 max-w-md">
        {hasFilters 
          ? 'Try adjusting your filters or search query to find guilds'
          : 'Connect your wallet to discover guilds across all chains'
        }
      </p>
      {hasFilters && (
        <Button variant="secondary" onClick={onClearFilters}>
          Clear Filters
        </Button>
      )}
    </div>
  )
}
