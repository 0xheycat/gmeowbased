/**
 * useComparisonExport Hook
 * Professional export & share utilities for comparison results
 * 
 * Patterns:
 * - Strava: Download segment comparison as image
 * - Duolingo: Share friend battle results
 * - LinkedIn: Export profile comparison
 * - Instagram Stories: Export with branding
 */

'use client'

import { useState, useCallback } from 'react'
import { openWarpcastComposer, copyToClipboardSafe } from '@/lib/share'

export interface ExportPilot {
  farcaster_fid: number | null
  username?: string
  display_name?: string
  total_score: number
}

export interface ExportOptions {
  pilots: ExportPilot[]
  categories: Array<{ label: string; key: string; values: number[] }>
}

export function useComparisonExport() {
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  /**
   * Generate share text for social platforms with @mentions
   * Pattern: Strava "I crushed the segment!", Duolingo "Battle results!"
   * Enhanced: Uses @username mentions for engagement
   */
  const generateShareText = useCallback((pilots: ExportPilot[]) => {
    if (pilots.length === 0) return ''
    
    // Generate @mentions (use username for proper Farcaster mentions)
    const mentions = pilots
      .map(p => p.username ? `@${p.username}` : (p.display_name || `!${p.farcaster_fid}`))
      .join(' ')
    
    const topScorer = [...pilots].sort((a, b) => b.total_score - a.total_score)[0]
    const topMention = topScorer.username ? `@${topScorer.username}` : (topScorer.display_name || `!${topScorer.farcaster_fid}`)
    
    // Engaging cast text with @mentions for notifications
    return `🏆 Pilot Battle Results!\n\n${mentions}\n\n👑 ${topMention} dominated with ${topScorer.total_score.toLocaleString()} points!\n\nCheck out the full comparison 👇`
  }, [])

  /**
   * Generate plain text summary for copying
   * Pattern: LinkedIn comparison export (text format)
   */
  const generateTextSummary = useCallback((options: ExportOptions) => {
    const { pilots, categories } = options
    
    let summary = '🏆 PILOT COMPARISON RESULTS\n'
    summary += '=' + ''.repeat(50) + '\n\n'
    
    // Pilot headers
    pilots.forEach((pilot, i) => {
      const name = pilot.display_name || pilot.username || `!${pilot.farcaster_fid}`
      summary += `#${i + 1} ${name}: ${pilot.total_score.toLocaleString()} points\n`
    })
    
    summary += '\n' + '-'.repeat(50) + '\n\n'
    
    // Category breakdowns
    categories.forEach(cat => {
      summary += `📊 ${cat.label}:\n`
      pilots.forEach((pilot, i) => {
        const name = (pilot.display_name || pilot.username || `!${pilot.farcaster_fid}`).substring(0, 20)
        const value = cat.values[i] || 0
        const maxValue = Math.max(...cat.values)
        const isWinner = value === maxValue && value > 0
        summary += `  ${isWinner ? '👑' : '  '} ${name}: ${value.toLocaleString()}\n`
      })
      summary += '\n'
    })
    
    summary += '-'.repeat(50) + '\n'
    summary += '🚀 Compare your stats at gmeowbased.vercel.app\n'
    
    return summary
  }, [])

  /**
   * Share to Warpcast with pre-filled text + image embed
   * Pattern: Duolingo friend battle share button
   * Enhanced: Includes comparison image as embed for visual appeal
   */
  const shareToWarpcast = useCallback(async (pilots: ExportPilot[]) => {
    setIsExporting(true)
    setExportError(null)
    
    try {
      const shareText = generateShareText(pilots)
      
      // First, generate the comparison image
      const html2canvas = (await import('html2canvas')).default
      const element = document.getElementById('comparison-content')
      
      if (!element) {
        throw new Error('Comparison content not found')
      }
      
      // Generate canvas with high quality
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
      })
      
      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b)
          else reject(new Error('Failed to create image blob'))
        }, 'image/png', 0.95)
      })
      
      // Upload image to get public URL (using browser's File API)
      // For now, we'll use a data URL as embed (Warpcast supports data URLs)
      const dataUrl = canvas.toDataURL('image/png', 0.95)
      
      // Import share utilities
      const { openWarpcastComposer } = await import('@/lib/share')
      
      // Open composer with text and image embed
      await openWarpcastComposer(shareText, dataUrl)
      
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to share'
      setExportError(message)
      return { success: false, error: message }
    } finally {
      setIsExporting(false)
    }
  }, [generateShareText])

  /**
   * Mint comparison results as NFT (tradeable onchain)
   * Pattern: Onchain achievement preservation
   * Note: NFTs are tradeable/sellable (unlike badges which are soulbound)
   */
  const mintComparisonNFT = useCallback(async (pilots: ExportPilot[]) => {
    setIsExporting(true)
    setExportError(null)
    
    try {
      // Generate comparison metadata
      const names = pilots
        .map(p => p.display_name || p.username || `!${p.farcaster_fid}`)
        .join(' vs ')
      
      const topScorer = [...pilots].sort((a, b) => b.total_score - a.total_score)[0]
      const topName = topScorer.display_name || topScorer.username || `!${topScorer.farcaster_fid}`
      
      const nftTypeId = `comparison-${Date.now()}`
      const reason = `Pilot Battle: ${names} - ${topName} won with ${topScorer.total_score.toLocaleString()} points`
      
      // Import wallet transaction utilities dynamically
      const { createMintNFTTx } = await import('@/lib/gmeow-utils')
      
      // Create NFT mint transaction (tradeable NFT, not soulbound badge)
      const mintTx = createMintNFTTx(nftTypeId, reason, 'base')
      
      // Return transaction data for wallet execution
      return { 
        success: true, 
        transaction: mintTx,
        nftTypeId,
        reason
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to prepare NFT mint'
      setExportError(message)
      return { success: false, error: message }
    } finally {
      setIsExporting(false)
    }
  }, [])

  /**
   * Copy text summary to clipboard
   * Pattern: LinkedIn "Copy profile comparison" feature
   */
  const copyTextSummary = useCallback(async (options: ExportOptions) => {
    setIsExporting(true)
    setExportError(null)
    
    try {
      const summary = generateTextSummary(options)
      const success = await copyToClipboardSafe(summary)
      
      if (!success) {
        throw new Error('Failed to copy summary')
      }
      
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to copy summary'
      setExportError(message)
      return { success: false, error: message }
    } finally {
      setIsExporting(false)
    }
  }, [generateTextSummary])

  /**
   * Download comparison as PNG image
   * Pattern: Strava segment comparison download
   * Uses native browser screenshot API (html2canvas not needed)
   */
  const downloadAsImage = useCallback(async (elementId: string, filename: string = 'pilot-comparison.png') => {
    setIsExporting(true)
    setExportError(null)
    
    try {
      // Get the element to export
      const element = document.getElementById(elementId)
      if (!element) {
        throw new Error('Element not found')
      }

      // Use html2canvas library (we'll install it)
      // @ts-ignore - dynamic import
      const html2canvas = (await import('html2canvas')).default
      
      // Generate canvas from HTML element
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2, // 2x resolution for quality
        logging: false,
        useCORS: true,
      })
      
      // Convert canvas to blob
      const blob = await new Promise<Blob | null>(resolve => {
        canvas.toBlob(resolve, 'image/png', 1.0)
      })
      
      if (!blob) {
        throw new Error('Failed to generate image')
      }
      
      // Download the image
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to download image'
      setExportError(message)
      return { success: false, error: message }
    } finally {
      setIsExporting(false)
    }
  }, [])

  /**
   * Native mobile share (iOS/Android share sheet)
   * Pattern: Instagram story share, Twitter share
   */
  const nativeShare = useCallback(async (pilots: ExportPilot[]) => {
    setIsExporting(true)
    setExportError(null)
    
    try {
      if (!navigator.share) {
        throw new Error('Native share not supported on this device')
      }
      
      const shareText = generateShareText(pilots)
      const currentUrl = typeof window !== 'undefined' ? window.location.href : ''
      
      await navigator.share({
        title: 'Pilot Comparison Results',
        text: shareText,
        url: currentUrl,
      })
      
      return { success: true }
    } catch (error) {
      // User cancelled share or share not supported
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'Share cancelled' }
      }
      const message = error instanceof Error ? error.message : 'Failed to share'
      setExportError(message)
      return { success: false, error: message }
    } finally {
      setIsExporting(false)
    }
  }, [generateShareText])

  return {
    isExporting,
    exportError,
    shareToWarpcast,
    mintComparisonNFT,
    copyTextSummary,
    downloadAsImage,
    nativeShare,
    generateShareText,
    generateTextSummary,
  }
}
