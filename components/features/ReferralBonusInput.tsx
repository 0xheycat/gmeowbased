/**
 * ReferralBonusInput - Onboarding referral code entry
 * Handles setReferrer transaction with XP overlay celebration
 * 
 * Design: Tailwick v2.0 + Gmeowbased v0.1
 * Integration: Onboard page
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/tailwick-primitives'
import { QuestIcon } from '@/components/ui/QuestIcon'
import { useAccount } from 'wagmi'
import { readContract, writeContract, waitForTransactionReceipt, getChainId, switchChain } from '@wagmi/core'
import { wagmiConfig } from '@/lib/wagmi'
import { createSetReferrerTx, getGuildAddress, getGuildABI, normalizeToGMChain, CHAIN_IDS, type ChainKey } from '@/lib/gmeow-utils'
import { XPEventOverlay, type XpEventPayload } from '@/components/XPEventOverlay'
import { useUnifiedFarcasterAuth } from '@/hooks/useUnifiedFarcasterAuth'
import { calculateRankProgress } from '@/lib/rank'
import { emitRankTelemetryEvent } from '@/lib/rank-telemetry-client'

type ReferralBonusInputProps = {
  chain?: ChainKey
  onSuccess?: () => void
  onSkip?: () => void
}

// Simple toast
const toast = {
  success: (msg: string) => console.log('[Success]', msg),
  error: (msg: string) => console.error('[Error]', msg)
}

export function ReferralBonusInput({ chain = 'base', onSuccess, onSkip }: ReferralBonusInputProps) {
  const { address } = useAccount()
  const { profile } = useUnifiedFarcasterAuth()
  
  const [referralCode, setReferralCode] = useState('')
  const [applying, setApplying] = useState(false)
  const [xpCelebration, setXpCelebration] = useState<XpEventPayload | null>(null)

  const handleApplyReferral = async () => {
    if (!address || !referralCode.trim()) {
      toast.error('Please enter a referral code')
      return
    }

    if (!profile?.fid) {
      toast.error('Please connect Farcaster profile')
      return
    }

    setApplying(true)
    try {
      const code = referralCode.trim().toUpperCase()
      const gmChain = normalizeToGMChain(chain)
      if (!gmChain) {
        toast.error('Invalid chain configuration')
        setApplying(false)
        return
      }

      // Validate referral code exists
      const referrerAddress = await readContract(wagmiConfig, {
        address: getGuildAddress(gmChain),
        abi: getGuildABI(),
        functionName: 'referralOwnerOf',
        args: [code]
      }) as string

      if (!referrerAddress || referrerAddress === '0x0000000000000000000000000000000000000000') {
        toast.error('Invalid referral code')
        setApplying(false)
        return
      }

      // Check not already referred
      const currentReferrer = await readContract(wagmiConfig, {
        address: getGuildAddress(gmChain),
        abi: getGuildABI(),
        functionName: 'referrerOf',
        args: [address]
      }) as string

      if (currentReferrer && currentReferrer !== '0x0000000000000000000000000000000000000000') {
        toast.error('You already have a referrer')
        setApplying(false)
        return
      }

      // Switch chain if needed
      const currentChain = await getChainId(wagmiConfig)
      const chainId = CHAIN_IDS[chain as keyof typeof CHAIN_IDS]
      if (currentChain !== chainId) {
        await switchChain(wagmiConfig, { chainId: chainId as any })
      }

      // Execute setReferrer transaction
      const txCall = createSetReferrerTx(code, gmChain)
      const hash = await writeContract(wagmiConfig, {
        ...txCall,
        account: address,
        chainId: chainId as any
      })
      await waitForTransactionReceipt(wagmiConfig, { hash, chainId: chainId as any })

      // Calculate rank progress (referral gives 50 XP per contract)
      const totalPoints = 50 // Assuming new user starts with 0
      const progress = calculateRankProgress(totalPoints)

      // Show XP overlay
      setXpCelebration({
        event: 'referral',
        chainKey: chain,
        xpEarned: 50,
        totalPoints: totalPoints,
        progress: progress,
        headline: 'Referral Bonus!',
        visitUrl: '/app/profile',
        tierTagline: `Welcome to the crew! You earned 50 XP.`
      })

      // Emit telemetry
      await emitRankTelemetryEvent({
        event: 'referral',
        chain: chain,
        walletAddress: address,
        fid: profile.fid,
        delta: 50,
        totalPoints: totalPoints,
        level: progress.level,
        tierName: progress.currentTier.name,
        tierPercent: progress.percent,
        metadata: { referralCode: code, referrerAddress, txHash: hash }
      })

      toast.success('Referral code applied! You earned 50 XP.')
      
      // Call success callback after showing overlay
      setTimeout(() => {
        if (onSuccess) onSuccess()
      }, 2000)
    } catch (error: any) {
      console.error('Failed to apply referral code:', error)
      toast.error(error.message || 'Failed to apply referral code')
    } finally {
      setApplying(false)
    }
  }

  return (
    <>
      <div className="rounded-lg theme-bg-subtle p-6 border theme-border-default">
        <div className="flex items-start gap-4 mb-4">
          <QuestIcon type="referral_success" size={48} />
          <div>
            <h3 className="text-lg font-bold theme-text-primary mb-1">🎁 Got a Referral Code?</h3>
            <p className="text-sm theme-text-secondary">
              Enter your referral code to earn 50 bonus XP and help your friend unlock rewards!
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium theme-text-secondary mb-2">
              Referral Code (Optional)
            </label>
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="COSMIC"
              maxLength={32}
              className="w-full px-4 py-3 rounded-lg theme-bg-subtle theme-text-primary font-mono text-lg border theme-border-default focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={applying}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              variant="primary" 
              onClick={handleApplyReferral}
              disabled={applying || !referralCode.trim()}
              className="flex-1"
            >
              {applying ? 'Applying...' : 'Apply Code & Earn 50 XP'}
            </Button>
            {onSkip && (
              <Button 
                variant="secondary" 
                onClick={onSkip}
                disabled={applying}
              >
                Skip
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t theme-border-subtle">
          <p className="text-xs theme-text-tertiary text-center">
            ✓ One-time bonus • ✓ Helps your friend earn recruiter badges • ✓ Can be skipped
          </p>
        </div>
      </div>

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
