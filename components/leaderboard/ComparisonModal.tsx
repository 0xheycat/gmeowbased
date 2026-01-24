/**
 * ComparisonModal Component - TrezoAdmin Professional Pattern
 * Compare up to 3 pilots side-by-side  
 * Professional animations, visual hierarchy, and responsive design
 * Uses Headless UI Dialog + Framer Motion
 * NO EMOJIS - Icons only
 */

'use client'

import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import CloseIcon from '@mui/icons-material/Close'
import BarChartIcon from '@mui/icons-material/BarChart'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import StarIcon from '@mui/icons-material/Star'
import PersonIcon from '@mui/icons-material/Person'
import { useComparisonExport } from '@/lib/hooks/useComparisonExport'
import { useState } from 'react'

interface ComparisonPilot {
  farcaster_fid: number | null
  username?: string
  display_name?: string
  pfp_url?: string
  total_score: number
  points_balance: number
  viral_xp: number
  guild_bonus: number
  referral_bonus: number
  streak_bonus: number
  badge_prestige: number
  tip_points?: number
  nft_points?: number
}

interface ComparisonModalProps {
  pilots: ComparisonPilot[]
  isOpen: boolean
  onClose: () => void
  onRemovePilot?: (fid: number) => void
}

const categories = [
  { label: 'Quest Points', key: 'points_balance' as const },
  { label: 'Viral XP', key: 'viral_xp' as const },
  { label: 'Guild Bonus', key: 'guild_bonus' as const },
  { label: 'Referrals', key: 'referral_bonus' as const },
  { label: 'Streak Bonus', key: 'streak_bonus' as const },
  { label: 'Badge Points', key: 'badge_prestige' as const },
  { label: 'Tip Points', key: 'tip_points' as const },
  { label: 'NFT Points', key: 'nft_points' as const },
]

function CategoryBar({
  label,
  values,
  maxValue,
}: {
  label: string
  values: number[]
  maxValue: number
}) {
  const winnerIndex = values.indexOf(Math.max(...values))

  return (
    <motion.div 
      className="mb-4 sm:mb-6 p-3 sm:p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3 flex items-center gap-2">
        <div className="w-1 h-4 bg-brand rounded-full" />
        {label}
      </div>
      <div className="grid gap-2 sm:gap-4 overflow-x-auto pb-2" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(80px, 1fr))`, minWidth: 'min-content' }}>
        {values.map((value, i) => (
          <div key={i} className="flex flex-col items-center flex-shrink-0">
            <div className="w-full max-w-[80px] sm:max-w-full bg-gray-100 dark:bg-dark-bg-elevated rounded-lg h-8 sm:h-10 relative overflow-hidden mb-2 shadow-sm">
              <motion.div
                className={`h-full rounded-lg ${
                  i === winnerIndex
                    ? 'bg-gradient-to-r from-brand to-purple-600 shadow-lg'
                    : 'bg-gray-300 dark:bg-gray-700'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${maxValue > 0 ? (value / maxValue) * 100 : 0}%` }}
                transition={{ duration: 0.8, delay: 0.1 * i, ease: "easeOut" }}
              />
              {/* Percentage label inside bar */}
              {maxValue > 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-[10px] sm:text-xs font-medium whitespace-nowrap ${
                    (value / maxValue) * 100 > 40 ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {Math.round((value / maxValue) * 100)}%
                  </span>
                </div>
              )}
            </div>
            <div className={`text-xs sm:text-sm font-bold ${i === winnerIndex ? 'text-brand' : 'text-gray-700 dark:text-gray-300'}`}>
              {value.toLocaleString()}
            </div>
            {i === winnerIndex && value > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
              >
                <EmojiEventsIcon className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 mt-1" />
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function PilotColumn({ pilot, onRemove, rank }: { pilot: ComparisonPilot; onRemove?: () => void; rank: number }) {
  return (
    <motion.div 
      className="flex flex-col items-center p-4 sm:p-5 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow relative"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: rank * 0.1 }}
    >
      {/* Rank Badge */}
      <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm ${
          rank === 1 ? 'bg-yellow-500 text-white' :
          rank === 2 ? 'bg-gray-400 text-white' :
          rank === 3 ? 'bg-orange-600 text-white' :
          'bg-gray-300 text-gray-700'
        }`}>
          #{rank}
        </div>
      </div>

      {/* Remove Button */}
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-2 sm:top-3 right-2 sm:right-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-danger-500 hover:bg-danger-600 text-white flex items-center justify-center transition-all hover:scale-110 shadow-lg"
          aria-label="Remove pilot"
        >
          <CloseIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </button>
      )}

      {/* Avatar */}
      <div className="relative mb-3 sm:mb-4 mt-2 sm:mt-3">
        {pilot.pfp_url ? (
          <img
            src={pilot.pfp_url}
            alt={pilot.display_name || pilot.username}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-3 sm:border-4 border-white dark:border-gray-700 shadow-lg"
          />
        ) : (
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700 border-3 sm:border-4 border-white dark:border-gray-700 flex items-center justify-center shadow-lg">
            <PersonIcon sx={{ fontSize: 48 }} className="text-gray-400 dark:text-gray-300" />
          </div>
        )}
        {/* Star badge for top scorer */}
        {rank === 1 && (
          <motion.div 
            className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full p-1 sm:p-1.5 shadow-lg"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.5, type: "spring" }}
          >
            <StarIcon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
          </motion.div>
        )}
      </div>

      {/* Name */}
      <div className="text-center mb-2 sm:mb-3 w-full px-2">
        <div className="font-bold text-gray-900 dark:text-white text-base sm:text-lg truncate">
          {pilot.display_name || pilot.username || `!${pilot.farcaster_fid}`}
        </div>
        {pilot.username && pilot.display_name && (
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
            @{pilot.username}
          </div>
        )}
      </div>

      {/* Score Card */}
      <div className="w-full bg-gradient-to-r from-brand/10 to-purple-600/10 dark:from-brand/20 dark:to-purple-600/20 rounded-lg p-3 sm:p-4 border border-brand/20">
        <div className="text-center">
          <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-brand to-purple-600 bg-clip-text text-transparent mb-1">
            {pilot.total_score.toLocaleString()}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider font-semibold">
            Total Points
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function ComparisonModal({ pilots, isOpen, onClose, onRemovePilot }: ComparisonModalProps) {
  if (pilots.length === 0) return null

  const maxValues = categories.reduce(
    (acc, cat) => {
      acc[cat.key] = Math.max(...pilots.map((p) => p[cat.key] || 0))
      return acc
    },
    {} as Record<string, number>
  )

  // Export & Share hooks
  const {
    isExporting,
    shareToWarpcast,
    mintComparisonNFT,
    copyTextSummary,
    downloadAsImage,
    nativeShare,
  } = useComparisonExport()

  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const handleSuccess = (message: string) => {
    setSuccessMessage(message)
    setShowSuccessToast(true)
    setTimeout(() => setShowSuccessToast(false), 3000)
  }

  const handleShareWarpcast = async () => {
    const result = await shareToWarpcast(pilots)
    if (result.success) {
      handleSuccess('Opening Warpcast with image...')
    } else {
      handleSuccess(`Failed: ${result.error || 'Unknown error'}`)
    }
  }

  const handleMintNFT = async () => {
    const result = await mintComparisonNFT(pilots)
    if (result.success) {
      handleSuccess('NFT minting prepared! Opening wallet...')
      // TODO: Execute transaction via wagmi when user approves
      // const { sendCalls } = useSendCalls()
      // await sendCalls({ calls: [result.transaction] })
    } else {
      handleSuccess(`Failed: ${result.error || 'Unknown error'}`)
    }
  }

  const handleCopyText = async () => {
    const categoryData = categories.map(cat => ({
      label: cat.label,
      key: cat.key,
      values: pilots.map(p => p[cat.key] || 0)
    }))
    const result = await copyTextSummary({ pilots, categories: categoryData })
    if (result.success) {
      handleSuccess('Results copied to clipboard!')
    }
  }

  const handleDownload = async () => {
    const result = await downloadAsImage('comparison-content', `pilot-comparison-${Date.now()}.png`)
    if (result.success) {
      handleSuccess('Image downloaded successfully!')
    }
  }

  const handleNativeShare = async () => {
    const result = await nativeShare(pilots)
    if (result.success) {
      handleSuccess('Shared successfully!')
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-500/75 dark:bg-black/75 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
      />

      <div className="fixed inset-0 z-50 w-screen overflow-y-auto pt-4 sm:pt-0">
        <div className="flex min-h-full items-end justify-center pb-4 px-2 sm:px-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-900 text-left shadow-xl transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in w-full mx-auto max-h-[90vh] sm:mx-4 sm:my-8 sm:max-w-4xl data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95"
          >
            {/* Header */}
            <motion.div 
              className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 px-3 sm:px-6 py-3 sm:py-5 border-b border-gray-200 dark:border-gray-700"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-brand to-purple-600 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
                    <BarChartIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="text-left min-w-0">
                    <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                      Pilot Comparison
                    </h2>
                    <p className="text-[10px] sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                      Compare performance
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg transition-all text-gray-600 dark:text-gray-400 hover:text-white hover:bg-danger-500 dark:hover:bg-danger-500 flex-shrink-0"
                >
                  <CloseIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </motion.div>

            {/* Content - Wrappable for screenshot */}
            <div id="comparison-content" className="p-3 sm:p-6 bg-gray-50 dark:bg-gray-900 overflow-y-auto max-h-[calc(90vh-240px)] sm:max-h-[calc(90vh-280px)]">
              {/* Pilot Headers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
                {pilots.map((pilot, index) => (
                  <PilotColumn
                    key={pilot.farcaster_fid}
                    pilot={pilot}
                    rank={index + 1}
                    onRemove={onRemovePilot ? () => onRemovePilot(pilot.farcaster_fid!) : undefined}
                  />
                ))}
              </div>

              {/* Category Comparisons */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center gap-2 mb-4 sm:mb-6">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white px-2 sm:px-4 whitespace-nowrap">
                    Performance
                  </h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
                </div>
                
                <div className="space-y-2 sm:space-y-3">
                  {categories.map((cat, index) => (
                    <CategoryBar
                      key={cat.key}
                      label={cat.label}
                      values={pilots.map((p) => p[cat.key] || 0)}
                      maxValue={maxValues[cat.key]}
                    />
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Export & Share Footer - Professional Pattern */}
            <motion.div 
              className="p-2 sm:p-6 bg-white dark:bg-gray-800 border-t-2 border-gray-200 dark:border-gray-700 max-h-[calc(10vh+60px)] overflow-y-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {/* Stats Summary */}
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-4 text-center">
                <span className="font-semibold text-gray-900 dark:text-white">{pilots.length}</span> pilots compared across <span className="font-semibold text-gray-900 dark:text-white">{categories.length}</span> categories
              </div>

              {/* Share Buttons Grid - Strava/LinkedIn Pattern */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3">
                <Button
                  onClick={handleShareWarpcast}
                  disabled={isExporting}
                  variant="outline"
                  size="sm"
                  className="flex flex-col items-center gap-0.5 h-auto py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span className="font-medium">Share</span>
                </Button>

                <Button
                  onClick={handleMintNFT}
                  disabled={isExporting}
                  variant="outline"
                  size="sm"
                  className="flex flex-col items-center gap-0.5 h-auto py-1.5 sm:py-2 px-1 sm:px-2 bg-gradient-to-r from-brand/5 to-purple-600/5 hover:from-brand/10 hover:to-purple-600/10 border-brand/20 text-[10px] sm:text-xs"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="font-medium bg-gradient-to-r from-brand to-purple-600 bg-clip-text text-transparent">Mint</span>
                </Button>

                <Button
                  onClick={handleCopyText}
                  disabled={isExporting}
                  variant="outline"
                  size="sm"
                  className="flex flex-col items-center gap-0.5 h-auto py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="font-medium">Copy</span>
                </Button>

                <Button
                  onClick={handleDownload}
                  disabled={isExporting}
                  variant="outline"
                  size="sm"
                  className="flex flex-col items-center gap-0.5 h-auto py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="font-medium">Save</span>
                </Button>
              </div>

              {/* Primary Action Button */}
              <div className="flex gap-1.5 sm:gap-3 mt-2 sm:mt-3">
                {/* Native Share (Mobile Only) */}
                {typeof window !== 'undefined' && 'share' in navigator && (
                  <Button
                    onClick={handleNativeShare}
                    disabled={isExporting}
                    variant="default"
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 hover:from-purple-700 hover:via-pink-700 hover:to-orange-700 shadow-lg md:hidden text-[10px] sm:text-xs py-1.5 sm:py-3 px-2"
                  >
                    <EmojiEventsIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                )}
                <Button
                  onClick={onClose}
                  variant="outline"
                  size="sm"
                  className={`${typeof window !== 'undefined' && 'share' in navigator ? 'flex-1' : 'w-full'} text-[10px] sm:text-xs py-1.5 sm:py-3 px-2`}
                >
                  <CloseIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              </div>

              {/* Success Toast */}
              {showSuccessToast && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-xl z-[70] flex items-center gap-2 text-xs sm:text-sm"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">{successMessage}</span>
                </motion.div>
              )}
            </motion.div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  )
}
