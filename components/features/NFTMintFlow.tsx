/**
 * NFTMintFlow Component - Phase 17
 * 3-Step NFT Minting Modal with XP Overlay Integration
 * 
 * Design: Tailwick v2.0 + Gmeowbased v0.1 icons
 * Pattern: Reuses QuestWizard modal pattern, NOT old foundation UI
 * 
 * Flow:
 * 1. Confirm Details - Show NFT preview, requirements, price
 * 2. Transaction Processing - Wait for blockchain confirmation
 * 3. Success - Celebrate with XPEventOverlay, offer Frame share
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card, CardBody, CardHeader, CardFooter, Button, Badge } from '@/components/ui/tailwick-primitives'
import { QuestIcon } from '@/components/ui/QuestIcon'
import { XPEventOverlay, type XpEventPayload } from '@/components/XPEventOverlay'
import type { NFTMetadata } from '@/lib/nfts'
import { formatMintPrice, getRarityColor, getCategoryIcon } from '@/lib/nfts'

export type NFTMintStep = 1 | 2 | 3

export type NFTMintFlowProps = {
  isOpen: boolean
  onClose: () => void
  nft: NFTMetadata | null
  onMint: (nft: NFTMetadata) => Promise<{
    success: boolean
    txHash?: string
    tokenId?: number
    error?: string
  }>
  onShare?: (nft: NFTMetadata, tokenId: number) => void
}

export function NFTMintFlow({
  isOpen,
  onClose,
  nft,
  onMint,
  onShare,
}: NFTMintFlowProps) {
  const [step, setStep] = useState<NFTMintStep>(1)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mintResult, setMintResult] = useState<{
    txHash: string
    tokenId: number
  } | null>(null)
  const [xpCelebration, setXpCelebration] = useState<XpEventPayload | null>(null)

  // Reset state when modal closes
  const handleClose = () => {
    setStep(1)
    setProcessing(false)
    setError(null)
    setMintResult(null)
    setXpCelebration(null)
    onClose()
  }

  // Handle mint initiation
  const handleMintClick = async () => {
    if (!nft) return

    setStep(2)
    setProcessing(true)
    setError(null)

    try {
      const result = await onMint(nft)

      if (result.success && result.txHash && result.tokenId) {
        setMintResult({
          txHash: result.txHash,
          tokenId: result.tokenId,
        })

        // Show XP celebration overlay (100 XP for NFT mint)
        setXpCelebration({
          event: 'nft-mint',
          chainKey: nft.chain,
          xpEarned: 100,
          totalPoints: 0, // Will be fetched from user context
          headline: 'NFT Minted!',
          tierTagline: `${nft.name} successfully minted`,
        })

        setStep(3)
      } else {
        setError(result.error || 'Failed to mint NFT. Please try again.')
        setStep(1)
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
      setStep(1)
    } finally {
      setProcessing(false)
    }
  }

  // Handle Frame share
  const handleShare = () => {
    if (nft && mintResult) {
      onShare?.(nft, mintResult.tokenId)
    }
  }

  if (!isOpen || !nft) return null

  return (
    <>
      {/* Modal Overlay */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        {/* Modal Content */}
        <div
          className="w-full max-w-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="theme-card-bg-primary max-h-[90vh] overflow-y-auto">
            <CardHeader>
              {/* Header with Close Button */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold theme-text-primary flex items-center gap-2">
                  <QuestIcon type="nft_mint" size={24} />
                  Mint NFT
                </h2>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-white/10 rounded transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Step Indicators */}
              <div className="flex items-center gap-2 mt-4">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`flex-1 h-1.5 rounded-full transition-colors ${
                      s <= step ? 'bg-primary' : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
            </CardHeader>

            <CardBody className="space-y-6">
              {/* Step 1: Confirm Details */}
              {step === 1 && (
                <>
                  {/* NFT Preview Image */}
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800">
                    <Image
                      src={nft.image_url}
                      alt={nft.name}
                      fill
                      className="object-cover"
                    />
                    
                    {/* Rarity Badge Overlay */}
                    <div className="absolute top-3 left-3">
                      <Badge variant="primary" className="backdrop-blur-sm">
                        {nft.rarity.charAt(0).toUpperCase() + nft.rarity.slice(1)}
                      </Badge>
                    </div>
                  </div>

                  {/* NFT Details */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-bold theme-text-primary">{nft.name}</h3>
                      <p className="text-sm theme-text-secondary mt-1">{nft.description}</p>
                    </div>

                    {/* Attributes */}
                    {nft.attributes && nft.attributes.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold theme-text-secondary uppercase tracking-wide">
                          Attributes
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {nft.attributes.map((attr, idx) => (
                            <div
                              key={idx}
                              className="bg-white/5 rounded px-3 py-2 border theme-border-subtle"
                            >
                              <div className="text-xs theme-text-secondary">{attr.trait_type}</div>
                              <div className="text-sm font-medium theme-text-primary">{attr.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mint Info */}
                    <div className="bg-white/5 rounded-lg p-4 border theme-border-subtle space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="theme-text-secondary">Chain</span>
                        <span className="theme-text-primary font-medium">{nft.chain.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="theme-text-secondary">Category</span>
                        <span className="theme-text-primary font-medium flex items-center gap-1.5">
                          <QuestIcon type={getCategoryIcon(nft.category) as any} size={16} />
                          {nft.category.charAt(0).toUpperCase() + nft.category.slice(1)}
                        </span>
                      </div>
                      {nft.max_supply && nft.max_supply > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="theme-text-secondary">Supply</span>
                          <span className="theme-text-primary font-medium">
                            {nft.current_supply || 0} / {nft.max_supply}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm pt-2 border-t theme-border-subtle">
                        <span className="theme-text-secondary font-semibold">Mint Price</span>
                        <span className="theme-text-primary font-bold text-base">
                          {formatMintPrice(nft.mint_price_wei)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Error Display */}
                  {error && (
                    <div className="bg-danger/10 border border-danger/20 rounded-lg p-3 flex items-start gap-2">
                      <QuestIcon type="nft_mint" size={18} className="flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-danger">{error}</div>
                    </div>
                  )}
                </>
              )}

              {/* Step 2: Transaction Processing */}
              {step === 2 && (
                <div className="text-center py-12 space-y-6">
                  {/* Animated Icon */}
                  <div className="relative mx-auto w-24 h-24">
                    <div className="absolute inset-0 animate-ping">
                      <QuestIcon type="nft_mint" size={96} className="opacity-20" />
                    </div>
                    <QuestIcon type="nft_mint" size={96} className="animate-pulse" />
                  </div>

                  {/* Status Text */}
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold theme-text-primary">Minting NFT...</h3>
                    <p className="text-sm theme-text-secondary max-w-sm mx-auto">
                      Please confirm the transaction in your wallet and wait for blockchain confirmation.
                    </p>
                  </div>

                  {/* Loading Dots */}
                  <div className="flex justify-center gap-2">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Success */}
              {step === 3 && mintResult && (
                <div className="text-center py-8 space-y-6">
                  {/* Success Icon */}
                  <div className="mx-auto w-20 h-20 rounded-full bg-success/20 flex items-center justify-center">
                    <QuestIcon type="quest_claim" size={48} />
                  </div>

                  {/* Success Message */}
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold theme-text-primary">NFT Minted!</h3>
                    <p className="text-sm theme-text-secondary max-w-sm mx-auto">
                      Your <span className="font-semibold">{nft.name}</span> has been minted successfully!
                    </p>
                  </div>

                  {/* Token Info */}
                  <div className="bg-white/5 rounded-lg p-4 border theme-border-subtle inline-block">
                    <div className="text-xs theme-text-secondary mb-1">Token ID</div>
                    <div className="text-xl font-bold theme-text-primary">#{mintResult.tokenId}</div>
                  </div>

                  {/* Transaction Hash */}
                  <div className="text-xs theme-text-secondary">
                    <a
                      href={`https://basescan.org/tx/${mintResult.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline inline-flex items-center gap-1"
                    >
                      View on Explorer
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              )}
            </CardBody>

            <CardFooter>
              <div className="flex gap-3 w-full">
                {/* Step 1: Confirm or Cancel */}
                {step === 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={handleClose}
                      disabled={processing}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleMintClick}
                      disabled={processing}
                      className="flex-1"
                    >
                      Confirm Mint
                    </Button>
                  </>
                )}

                {/* Step 2: Processing (no buttons) */}
                {step === 2 && null}

                {/* Step 3: Success Actions */}
                {step === 3 && (
                  <>
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={handleClose}
                      className="flex-1"
                    >
                      Close
                    </Button>
                    {onShare && (
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={handleShare}
                        className="flex-1"
                      >
                        <span className="flex items-center gap-2">
                          <QuestIcon type="stats_shared" size={18} />
                          Share on Farcaster
                        </span>
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* XP Celebration Overlay */}
      {xpCelebration && (
        <XPEventOverlay
          open={true}
          payload={xpCelebration}
          onClose={() => setXpCelebration(null)}
        />
      )}
    </>
  )
}
