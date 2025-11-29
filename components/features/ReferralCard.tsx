/**
 * ReferralCard Component - Gmeowbased Phase 16
 * Referral code management with stats, sharing, and XP overlay integration
 * 
 * Design: Tailwick v2.0 + Gmeowbased v0.1
 * Integration: Profile page (after Quick Actions)
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardBody, CardFooter, Button, Badge, StatsCard } from '@/components/ui/tailwick-primitives'
import { QuestIcon } from '@/components/ui/QuestIcon'
import { useAccount } from 'wagmi'
import { readContract, writeContract, waitForTransactionReceipt, getChainId, switchChain } from '@wagmi/core'
import { wagmiConfig } from '@/lib/wagmi'
import { createRegisterReferralCodeTx, getGuildAddress, getGuildABI, normalizeToGMChain, type GMChainKey, CHAIN_IDS, type ChainKey } from '@/lib/gmeow-utils'
import { XPEventOverlay, type XpEventPayload } from '@/components/XPEventOverlay'
import { useUnifiedFarcasterAuth } from '@/hooks/useUnifiedFarcasterAuth'
import { calculateRankProgress } from '@/lib/rank'
import { emitRankTelemetryEvent } from '@/lib/rank-telemetry-client'

type ReferralStats = {
  code: string | null
  totalReferrals: number
  bonusEarned: number
  activeReferrals: number
}

type ReferralCardProps = {
  chain?: ChainKey
}

// Simple toast utility
const toast = {
  success: (msg: string) => console.log('[Success]', msg),
  error: (msg: string) => console.error('[Error]', msg)
}

export function ReferralCard({ chain = 'base' }: ReferralCardProps) {
  const { address } = useAccount()
  const { profile } = useUnifiedFarcasterAuth()
  
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [xpCelebration, setXpCelebration] = useState<XpEventPayload | null>(null)

  // Fetch referral stats on mount
  useEffect(() => {
    if (!address) return
    fetchReferralStats()
  }, [address, chain])

  const fetchReferralStats = async () => {
    if (!address) return
    
    setLoading(true)
    try {
      const gmChain = normalizeToGMChain(chain)
      if (!gmChain) {
        console.error('Invalid chain for referral stats')
        setLoading(false)
        return
      }
      
      // Read referral code from contract
      const code = await readContract(wagmiConfig, {
        address: getGuildAddress(gmChain),
        abi: getGuildABI(gmChain),
        functionName: 'referralCodeOf',
        args: [address]
      }) as string

      // Read referral stats from contract
      const referralStatsData = await readContract(wagmiConfig, {
        address: getGuildAddress(gmChain),
        abi: getGuildABI(gmChain),
        functionName: 'referralStats',
        args: [address]
      }) as any

      setStats({
        code: code || null,
        totalReferrals: Number(referralStatsData.totalReferred || 0),
        bonusEarned: Number(referralStatsData.totalPointsEarned || 0),
        activeReferrals: Number(referralStatsData.totalReferred || 0) // Using total as active for now
      })
    } catch (error) {
      console.error('Failed to fetch referral stats:', error)
      // Set empty stats on error
      setStats({
        code: null,
        totalReferrals: 0,
        bonusEarned: 0,
        activeReferrals: 0
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterCode = async () => {
    if (!address || !codeInput.trim()) {
      toast.error('Please enter a referral code')
      return
    }

    if (!profile?.fid) {
      toast.error('Please connect Farcaster profile')
      return
    }

    setRegistering(true)
    try {
      // Validate code format (alphanumeric, 3-32 chars per contract)
      const code = codeInput.trim().toUpperCase()
      if (!/^[A-Z0-9]{3,32}$/.test(code)) {
        toast.error('Code must be 3-32 alphanumeric characters')
        setRegistering(false)
        return
      }

      // Check if code already exists
      const gmChain = normalizeToGMChain(chain)
      if (!gmChain) {
        toast.error('Invalid chain configuration')
        setRegistering(false)
        return
      }

      const existingOwner = await readContract(wagmiConfig, {
        address: getGuildAddress(gmChain),
        abi: getGuildABI(gmChain),
        functionName: 'referralOwnerOf',
        args: [code]
      }) as string

      if (existingOwner && existingOwner !== '0x0000000000000000000000000000000000000000') {
        toast.error('Code already taken. Try another!')
        setRegistering(false)
        return
      }

      // Switch chain if needed
      const currentChain = await getChainId(wagmiConfig)
      const chainId = CHAIN_IDS[chain as keyof typeof CHAIN_IDS]
      if (currentChain !== chainId) {
        await switchChain(wagmiConfig, { chainId: chainId as any })
      }

      // Execute transaction
      const txCall = createRegisterReferralCodeTx(code, gmChain)
      const hash = await writeContract(wagmiConfig, {
        ...txCall,
        account: address,
        chainId: chainId as any
      })
      await waitForTransactionReceipt(wagmiConfig, { hash, chainId: chainId as any })

      toast.success(`Referral code ${code} registered!`)
      
      // Refresh stats
      await fetchReferralStats()
      setCodeInput('')
    } catch (error: any) {
      console.error('Failed to register code:', error)
      toast.error(error.message || 'Failed to register code')
    } finally {
      setRegistering(false)
    }
  }

  const handleCopyLink = () => {
    if (!stats?.code) return
    const link = `${window.location.origin}/onboard?ref=${stats.code}`
    navigator.clipboard.writeText(link)
    toast.success('Referral link copied!')
  }

  const handleCopyCode = () => {
    if (!stats?.code) return
    navigator.clipboard.writeText(stats.code)
    toast.success('Referral code copied!')
  }

  const handleShareFarcaster = () => {
    if (!stats?.code) return
    const text = `Join Gmeowbased and use my referral code: ${stats.code}\n\ngmeowbased.com/onboard?ref=${stats.code}`
    window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`, '_blank')
  }

  const handleShareTwitter = () => {
    if (!stats?.code) return
    const text = `Join Gmeowbased and use my referral code: ${stats.code}\n\ngmeowbased.com/onboard?ref=${stats.code}`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
  }

  if (loading) {
    return (
      <Card className="theme-card-bg-primary">
        <CardBody>
          <div className="flex items-center justify-center py-12">
            <div className="foundation-spinner"></div>
            <p className="ml-4 theme-text-secondary">Loading referral stats...</p>
          </div>
        </CardBody>
      </Card>
    )
  }

  return (
    <>
      <Card className="theme-card-bg-primary">
        <CardHeader className="border-b theme-border-default">
          <div className="flex items-center gap-3">
            <QuestIcon type="referral_success" size={32} />
            <div>
              <h3 className="text-xl font-bold theme-text-primary">Referral System</h3>
              <p className="text-sm theme-text-secondary">Invite pilots and earn bonus XP</p>
            </div>
          </div>
        </CardHeader>

        <CardBody className="space-y-6">
          {/* Stats Grid */}
          {stats?.code && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatsCard
                icon="/assets/gmeow-icons/Add Friend Icon.svg"
                iconAlt="Total Referrals"
                label="Total Referrals"
                value={stats.totalReferrals}
                gradient="purple"
              />
              <StatsCard
                icon="/assets/gmeow-icons/Credits Icon.svg"
                iconAlt="Bonus Earned"
                label="Bonus Earned"
                value={`${stats.bonusEarned.toLocaleString()} XP`}
                gradient="blue"
              />
              <StatsCard
                icon="/assets/gmeow-icons/Active Icon.svg"
                iconAlt="Active Referrals"
                label="Active Referrals"
                value={stats.activeReferrals}
                gradient="green"
              />
            </div>
          )}

          {/* Referral Code Display or Registration */}
          {stats?.code ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-2">
                  Your Referral Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={stats.code}
                    readOnly
                    className="flex-1 px-4 py-3 rounded-lg theme-bg-subtle theme-text-primary font-mono text-lg font-bold text-center border theme-border-default"
                  />
                  <Button variant="secondary" onClick={handleCopyCode}>
                    Copy Code
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-2">
                  Referral Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={`gmeowbased.com/onboard?ref=${stats.code}`}
                    readOnly
                    className="flex-1 px-4 py-2 rounded-lg theme-bg-subtle theme-text-primary text-sm border theme-border-default"
                  />
                  <Button variant="primary" onClick={handleCopyLink}>
                    Copy Link
                  </Button>
                </div>
              </div>

              {/* Share Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleShareFarcaster}
                >
                  <span className="mr-2">📣</span>
                  Share on Farcaster
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleShareTwitter}
                >
                  <span className="mr-2">🐦</span>
                  Share on Twitter
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg theme-bg-subtle p-4 border theme-border-default">
                <h4 className="font-bold theme-text-primary mb-2">🎁 Register Your Referral Code</h4>
                <p className="text-sm theme-text-secondary mb-4">
                  Create a custom referral code and earn 50 XP for every pilot you invite!
                </p>
                <ul className="text-sm theme-text-secondary space-y-1">
                  <li>✓ 3-32 alphanumeric characters</li>
                  <li>✓ Automatically converted to uppercase</li>
                  <li>✓ Permanent once registered</li>
                  <li>✓ Earn recruiter badges at 1, 5, and 10 referrals</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-2">
                  Referral Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                    placeholder="COSMIC"
                    maxLength={32}
                    className="flex-1 px-4 py-3 rounded-lg theme-bg-subtle theme-text-primary font-mono text-lg border theme-border-default focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <Button 
                    variant="primary" 
                    onClick={handleRegisterCode}
                    disabled={registering || !codeInput.trim()}
                  >
                    {registering ? 'Registering...' : 'Register'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Reward Info */}
          <div className="rounded-lg bg-purple-600/10 border border-purple-600/20 p-4">
            <div className="flex items-start gap-3">
              <QuestIcon type="badge_mint" size={24} />
              <div>
                <h4 className="font-bold theme-text-primary mb-1">Recruiter Badges</h4>
                <p className="text-sm theme-text-secondary">
                  Earn exclusive recruiter badges: <strong>Bronze</strong> (1 referral), <strong>Silver</strong> (5 referrals), <strong>Gold</strong> (10 referrals)
                </p>
              </div>
            </div>
          </div>
        </CardBody>

        <CardFooter className="border-t theme-border-default">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm theme-text-secondary">
              Earn 50 XP per successful referral
            </p>
            {stats?.code && (
              <Badge variant="success">Code Active</Badge>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* XP Event Overlay */}
      {xpCelebration && (
        <XPEventOverlay
          open={!!xpCelebration}
          payload={xpCelebration}
          onClose={() => setXpCelebration(null)}
        />
      )}
    </>
  )
}
