/**
 * XP Celebration System - Main Modal Component
 * 
 * Professional gaming-style celebration modal with three variants:
 * - 'xp-gain': Standard XP earned celebration
 * - 'level-up': Enhanced effects for level milestones
 * - 'tier-change': Special celebration for tier upgrades
 * 
 * Features:
 * - Compact modal (420px width desktop)
 * - Responsive bottom sheet (<768px mobile)
 * - Auto-dismiss after 4 seconds (pauses on hover/focus)
 * - Keyboard navigation (ESC, Tab, Enter/Space)
 * - Focus trap with ARIA attributes
 * - Screen reader announcements
 * - prefers-reduced-motion support
 * - Animated tier transitions
 * - Military HUD aesthetics
 * 
 * Accessibility:
 * - WCAG AAA compliant
 * - Focus trap enabled
 * - Auto-dismiss cancellable
 * - Screen reader friendly
 * 
 * Website: https://gmeowhq.art
 * Network: Base (Chain ID: 8453)
 */

'use client'

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { XPCelebrationModalProps, ParticleShape } from './types'
import { ACCESSIBLE_COLORS, ANIMATION_TIMINGS, TIER_COLOR_SCHEMES } from './types'
import {
  modalVariants,
  mobileSheetVariants,
  staggerContainerVariants,
  staggerItemVariants,
  reducedMotionVariants,
} from './animations'
import { CircularProgress } from './CircularProgress'
import { XPCounter } from './XPCounter'
import { ConfettiCanvas } from './ConfettiCanvas'
import { TierBadge } from './TierBadge'
import { ShareButton } from './ShareButton'

/**
 * Close button icon (X)
 */
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 6L18 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * XP Celebration Modal Component
 * Professional gaming-style celebration modal
 */
export function XPCelebrationModal({
  open,
  onClose,
  event,
  xpEarned,
  totalPoints,
  level,
  xpIntoLevel,
  xpForLevel,
  tierName,
  tierTagline,
  tierCategory = 'beginner',
  chainKey = 'base',
  shareUrl,
  onShare,
  visitUrl,
  onVisit,
  eventIcon,
  variant = 'xp-gain',
  previousLevel,
  previousTierName,
}: XPCelebrationModalProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [autoDismissEnabled, setAutoDismissEnabled] = useState(true)
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const prefersReducedMotion = useReducedMotion()

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  // Auto-dismiss timer
  useEffect(() => {
    if (!open || !autoDismissEnabled) return

    const timer = setTimeout(() => {
      onClose()
    }, ANIMATION_TIMINGS.modalAutoDismiss)

    return () => {
      clearTimeout(timer)
    }
  }, [open, autoDismissEnabled, onClose])

  // Focus trap
  useEffect(() => {
    if (!open) return

    // Focus close button on open
    setTimeout(() => {
      closeButtonRef.current?.focus()
    }, 100)

    // Trap focus within modal
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const modal = modalRef.current
      if (!modal) return

      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus()
          e.preventDefault()
        }
      }
    }

    document.addEventListener('keydown', handleTabKey)

    return () => {
      document.removeEventListener('keydown', handleTabKey)
    }
  }, [open])

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  // Calculate progress percentage
  const progressPercent = xpForLevel > 0 ? (xpIntoLevel / xpForLevel) * 100 : 0

  // Get tier colors
  const tierColors = TIER_COLOR_SCHEMES[tierCategory]
  
  // Enhanced confetti for level-up and tier-change variants
  const confettiParticleCount = variant === 'level-up' ? 60 : variant === 'tier-change' ? 80 : 40
  const confettiColors = [
    tierColors.primary,
    tierColors.glow,
    ACCESSIBLE_COLORS.success,
    ACCESSIBLE_COLORS.warning,
  ]
  
  // Enhanced confetti shapes for special variants
  const confettiShapes: ParticleShape[] | undefined = variant === 'tier-change' 
    ? ['star', 'catPaw', 'heart'] 
    : undefined

  // Select animation variants based on viewport
  const variants = prefersReducedMotion
    ? reducedMotionVariants
    : isMobile
    ? mobileSheetVariants
    : modalVariants

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Premium AAA Gaming Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60]"
            style={{
              background: `
                radial-gradient(circle at center, 
                  rgba(0, 0, 0, 0.4) 0%, 
                  rgba(0, 0, 0, 0.85) 100%
                )
              `,
              backdropFilter: 'blur(12px) brightness(0.7)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={onClose}
            aria-hidden="true"
          >
            {/* Vignette effect */}
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.6) 100%)',
                pointerEvents: 'none',
              }}
            />
          </motion.div>

          {/* Modal container */}
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="xp-modal-title"
            aria-describedby="xp-modal-description"
          >
            <motion.div
              ref={modalRef}
              className="relative w-full overflow-hidden rounded-2xl shadow-2xl"
              style={{
                maxWidth: isMobile ? '100%' : '420px',
                maxHeight: isMobile ? 'calc(100vh - 32px)' : '90vh',
                background: `
                  linear-gradient(135deg, 
                    rgba(9, 9, 11, 0.98) 0%, 
                    rgba(24, 24, 27, 0.95) 100%
                  )
                `,
                border: `3px solid ${tierColors.primary}70`,
                boxShadow: `
                  0 0 80px ${tierColors.glow}60,
                  0 0 120px ${tierColors.primary}30,
                  0 30px 60px rgba(0,0,0,0.7),
                  inset 0 0 60px rgba(0,0,0,0.4)
                `,
                backdropFilter: 'blur(20px)',
              }}
              variants={variants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onMouseEnter={() => setAutoDismissEnabled(false)}
              onMouseLeave={() => setAutoDismissEnabled(true)}
              onFocus={() => setAutoDismissEnabled(false)}
              onBlur={() => setAutoDismissEnabled(true)}
            >
              {/* Confetti layer - Enhanced for level-up/tier-change */}
              <ConfettiCanvas 
                colors={confettiColors} 
                particleCount={confettiParticleCount}
                shapes={confettiShapes}
              />

              {/* Close button with enhanced z-index */}
              <button
                ref={closeButtonRef}
                onClick={onClose}
                onPointerDown={(e) => { e.stopPropagation(); onClose(); }}
                className="absolute right-4 top-4 z-[100] cursor-pointer rounded-lg p-2 transition-all duration-200 hover:bg-white/20 hover:scale-110 active:scale-95"
                style={{ 
                  color: ACCESSIBLE_COLORS.muted,
                  pointerEvents: 'auto',
                }}
                aria-label="Close celebration modal"
              >
                <CloseIcon className="h-5 w-5" />
              </button>

              {/* Military HUD Style Layout - Horizontal Panels */}
              <motion.div
                className="relative z-10 h-full overflow-hidden"
                variants={staggerContainerVariants}
                initial="hidden"
                animate="visible"
              >
                {/* Tech Grid Background */}
                <div className="absolute inset-0 z-0 pointer-events-none opacity-10">
                  <div 
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `
                        linear-gradient(${tierColors.primary}30 1px, transparent 1px),
                        linear-gradient(90deg, ${tierColors.primary}30 1px, transparent 1px)
                      `,
                      backgroundSize: '20px 20px',
                    }}
                  />
                </div>

                {/* Animated Scanlines */}
                <motion.div
                  className="absolute inset-0 z-0 pointer-events-none"
                  style={{
                    background: `repeating-linear-gradient(
                      0deg,
                      transparent,
                      transparent 2px,
                      ${tierColors.primary}08 2px,
                      ${tierColors.primary}08 4px
                    )`,
                  }}
                  animate={{ y: [0, 20, 0] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />

                {/* Corner Brackets - Military HUD Style */}
                <div className="absolute inset-0 pointer-events-none z-20">
                  {/* Top-left bracket */}
                  <div className="absolute top-3 left-3 w-8 h-8">
                    <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: tierColors.primary }} />
                    <div className="absolute top-0 left-0 w-0.5 h-full" style={{ background: tierColors.primary }} />
                  </div>
                  {/* Top-right bracket */}
                  <div className="absolute top-3 right-3 w-8 h-8">
                    <div className="absolute top-0 right-0 w-full h-0.5" style={{ background: tierColors.primary }} />
                    <div className="absolute top-0 right-0 w-0.5 h-full" style={{ background: tierColors.primary }} />
                  </div>
                  {/* Bottom-right bracket */}
                  <div className="absolute bottom-3 right-3 w-8 h-8">
                    <div className="absolute bottom-0 right-0 w-full h-0.5" style={{ background: tierColors.primary }} />
                    <div className="absolute bottom-0 right-0 w-0.5 h-full" style={{ background: tierColors.primary }} />
                  </div>
                  {/* Bottom-left bracket */}
                  <div className="absolute bottom-3 left-3 w-8 h-8">
                    <div className="absolute bottom-0 left-0 w-full h-0.5" style={{ background: tierColors.primary }} />
                    <div className="absolute bottom-0 left-0 w-0.5 h-full" style={{ background: tierColors.primary }} />
                  </div>
                </div>

                {/* Screen reader announcement */}
                <div className="sr-only" role="status" aria-live="polite">
                  Congratulations! You earned {xpEarned} experience points. You are now at {tierName} tier, level {level}.
                </div>

                {/* Main Content - Military HUD Split Layout */}
                <div className="relative z-10 h-full flex flex-col p-6 pt-10 pb-6">
                  {/* Header Bar */}
                  <motion.div 
                    className="flex items-center justify-between mb-6"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                  >
                    {/* Tech-style header */}
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-1 h-6" 
                        style={{ background: `linear-gradient(180deg, ${tierColors.primary}, transparent)` }} 
                      />
                      <h2 
                        id="xp-modal-title"
                        className="text-xs font-bold uppercase tracking-[0.3em]"
                        style={{ color: tierColors.primary }}
                      >
                        {variant === 'level-up' ? 'LEVEL UP' : variant === 'tier-change' ? 'TIER UPGRADED' : 'XP GAINED'}
                      </h2>
                    </div>
                    <div 
                      className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
                      style={{
                        background: `${tierColors.primary}20`,
                        border: `1px solid ${tierColors.primary}40`,
                        color: tierColors.primary,
                        clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                      }}
                    >
                      LVL {level}
                    </div>
                  </motion.div>

                  {/* Split Panel Layout - Valorant/Apex Style */}
                  <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
                    {/* LEFT PANEL - Event & Tier Info (35%) */}
                    <motion.div 
                      className="flex flex-col gap-4 relative overflow-hidden"
                      style={{ flex: '0 0 35%' }}
                      initial={{ x: -30, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                    >
                      {/* Event Icon Badge */}
                      <div 
                        className="relative p-4 flex flex-col items-center gap-3 overflow-hidden"
                        style={{
                          background: `linear-gradient(135deg, ${tierColors.primary}15, ${tierColors.glow}05)`,
                          border: `2px solid ${tierColors.primary}40`,
                          borderLeft: `4px solid ${tierColors.primary}`,
                          clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%)',
                          boxShadow: `inset 0 0 30px ${tierColors.primary}10`,
                        }}
                      >
                        {/* Icon container */}
                        <motion.div
                          className="relative"
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{
                            delay: 0.3,
                            duration: 0.6,
                            type: 'spring',
                            stiffness: 150,
                          }}
                        >
                          <div
                            className="w-16 h-16 flex items-center justify-center overflow-hidden"
                            style={{
                              clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
                              background: `linear-gradient(135deg, ${tierColors.primary}40, ${tierColors.glow}20)`,
                              border: `2px solid ${tierColors.primary}`,
                              boxShadow: `0 0 20px ${tierColors.glow}40`,
                              color: tierColors.primary,
                            }}
                          >
                            <div className="scale-75">{eventIcon}</div>
                          </div>
                        </motion.div>

                        {/* Event label */}
                        <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: ACCESSIBLE_COLORS.muted }}>
                          EVENT
                        </div>
                      </div>

                      {/* Tier Badge - Compact */}
                      <motion.div
                        className="relative p-3 overflow-hidden"
                        style={{
                          background: `linear-gradient(135deg, ${tierColors.glow}10, ${tierColors.primary}05)`,
                          border: `1px solid ${tierColors.primary}30`,
                          borderLeft: `3px solid ${tierColors.primary}60`,
                          clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)',
                        }}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.4 }}
                      >
                        <div className="flex flex-col gap-1">
                          <div 
                            className="text-xs font-black uppercase tracking-wider"
                            style={{ 
                              color: tierColors.primary,
                              textShadow: `0 0 10px ${tierColors.glow}60`,
                            }}
                          >
                            {tierName}
                          </div>
                          <div 
                            className="text-[10px] leading-tight"
                            style={{ color: ACCESSIBLE_COLORS.muted }}
                          >
                            {tierTagline}
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>

                    {/* DIAGONAL DIVIDER */}
                    <div 
                      className="w-px h-full relative"
                      style={{
                        background: `linear-gradient(180deg, transparent, ${tierColors.primary}60, transparent)`,
                      }}
                    >
                      <div 
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rotate-45"
                        style={{
                          background: tierColors.primary,
                          boxShadow: `0 0 10px ${tierColors.glow}`,
                        }}
                      />
                    </div>

                    {/* RIGHT PANEL - Progress & XP (60%) */}
                    <motion.div 
                      className="flex-1 flex flex-col gap-4 items-center justify-center overflow-hidden"
                      initial={{ x: 30, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                    >
                      {/* Gaming Template Progress Ring + XP Display */}
                      <motion.div
                        className="relative"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          delay: 0.4,
                          duration: 0.5,
                          type: 'spring',
                          stiffness: 200,
                          damping: 15,
                        }}
                      >
                        {/* Hexagonal Frame Container */}
                        <div
                          className="relative"
                          style={{
                            width: '180px',
                            height: '180px',
                          }}
                        >
                          {/* Tech Corner Brackets */}
                          <div className="absolute inset-0 pointer-events-none">
                            {/* Top-left */}
                            <div className="absolute -top-2 -left-2 w-6 h-6">
                              <div className="absolute top-0 left-0 w-full h-px" style={{ background: tierColors.primary }} />
                              <div className="absolute top-0 left-0 w-px h-full" style={{ background: tierColors.primary }} />
                              <div className="absolute top-1 left-1 w-2 h-2 border-t border-l" style={{ borderColor: `${tierColors.glow}60` }} />
                            </div>
                            {/* Top-right */}
                            <div className="absolute -top-2 -right-2 w-6 h-6">
                              <div className="absolute top-0 right-0 w-full h-px" style={{ background: tierColors.primary }} />
                              <div className="absolute top-0 right-0 w-px h-full" style={{ background: tierColors.primary }} />
                              <div className="absolute top-1 right-1 w-2 h-2 border-t border-r" style={{ borderColor: `${tierColors.glow}60` }} />
                            </div>
                            {/* Bottom-right */}
                            <div className="absolute -bottom-2 -right-2 w-6 h-6">
                              <div className="absolute bottom-0 right-0 w-full h-px" style={{ background: tierColors.primary }} />
                              <div className="absolute bottom-0 right-0 w-px h-full" style={{ background: tierColors.primary }} />
                              <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r" style={{ borderColor: `${tierColors.glow}60` }} />
                            </div>
                            {/* Bottom-left */}
                            <div className="absolute -bottom-2 -left-2 w-6 h-6">
                              <div className="absolute bottom-0 left-0 w-full h-px" style={{ background: tierColors.primary }} />
                              <div className="absolute bottom-0 left-0 w-px h-full" style={{ background: tierColors.primary }} />
                              <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l" style={{ borderColor: `${tierColors.glow}60` }} />
                            </div>
                          </div>

                          {/* Orbital Ring Decorations */}
                          <motion.div
                            className="absolute inset-0"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                          >
                            {[0, 90, 180, 270].map((angle) => (
                              <div
                                key={angle}
                                className="absolute w-1 h-1"
                                style={{
                                  top: '50%',
                                  left: '50%',
                                  transform: `rotate(${angle}deg) translateY(-95px)`,
                                  background: tierColors.primary,
                                  boxShadow: `0 0 6px ${tierColors.glow}`,
                                  borderRadius: '50%',
                                }}
                              />
                            ))}
                          </motion.div>

                          {/* Pulse Glow Background */}
                          <motion.div
                            className="absolute inset-0"
                            style={{
                              background: `radial-gradient(circle, ${tierColors.glow}15, transparent 70%)`,
                              filter: 'blur(30px)',
                            }}
                            animate={{
                              opacity: [0.3, 0.7, 0.3],
                              scale: [0.9, 1.1, 0.9],
                            }}
                            transition={{
                              duration: 3,
                              repeat: Infinity,
                              ease: 'easeInOut',
                            }}
                          />

                          {/* Progress Ring */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <CircularProgress
                              percent={progressPercent}
                              size={160}
                              strokeWidth={14}
                              color={tierColors.primary}
                              glowColor={tierColors.glow}
                              tierCategory={tierCategory}
                            />
                          </div>

                          {/* XP Number Display - Centered in Ring with Dynamic Scaling */}
                          <motion.div
                            className="absolute inset-0 flex flex-col items-center justify-center px-4"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                              delay: 0.6,
                              duration: 0.6,
                              type: 'spring',
                              stiffness: 150,
                            }}
                          >
                            {/* XP Number with Aggressive Dynamic Font Size */}
                            <motion.div
                              className="font-black tabular-nums leading-none max-w-full overflow-hidden text-center"
                              style={{
                                fontSize: xpEarned >= 100000 ? '1.5rem' 
                                  : xpEarned >= 10000 ? '1.75rem' 
                                  : xpEarned >= 1000 ? '2rem' 
                                  : xpEarned >= 100 ? '2.25rem' 
                                  : '2.5rem',
                                color: ACCESSIBLE_COLORS.foreground,
                                textShadow: `
                                  0 0 20px ${tierColors.glow},
                                  0 0 40px ${tierColors.glow}80,
                                  0 2px 8px rgba(0,0,0,0.9)
                                `,
                                WebkitTextStroke: `0.5px ${tierColors.primary}`,
                                letterSpacing: '-0.08em',
                                wordBreak: 'keep-all',
                                whiteSpace: 'nowrap',
                              }}
                              animate={{
                                scale: [1, 1.03, 1],
                              }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                repeatDelay: 1,
                              }}
                            >
                              +{xpEarned.toLocaleString()}
                            </motion.div>

                          </motion.div>

                          {/* Percentage Display - Top Right */}
                          <motion.div
                            className="absolute top-3 right-3 px-2 py-1"
                            style={{
                              background: `linear-gradient(135deg, ${tierColors.primary}20, ${tierColors.glow}10)`,
                              border: `1px solid ${tierColors.primary}40`,
                              borderRight: `2px solid ${tierColors.primary}`,
                              clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%)',
                              boxShadow: `inset 0 0 10px ${tierColors.primary}10`,
                            }}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.7, duration: 0.4 }}
                          >
                            <div
                              className="text-xs font-black tabular-nums"
                              style={{
                                color: tierColors.primary,
                                textShadow: `0 0 8px ${tierColors.glow}80`,
                              }}
                            >
                              {Math.round(progressPercent)}%
                            </div>
                          </motion.div>

                          {/* Template Overlay Pattern */}
                          <div
                            className="absolute inset-0 pointer-events-none opacity-20"
                            style={{
                              background: `
                                repeating-conic-gradient(
                                  from 0deg at 50% 50%,
                                  transparent 0deg,
                                  ${tierColors.primary}20 1deg,
                                  transparent 2deg,
                                  transparent 10deg
                                )
                              `,
                              mask: 'radial-gradient(circle, black 45%, transparent 46%, transparent 54%, black 55%)',
                              WebkitMask: 'radial-gradient(circle, black 45%, transparent 46%, transparent 54%, black 55%)',
                            }}
                          />
                        </div>
                      </motion.div>

                      {/* XP EARNED Label - Below Hexagonal Frame */}
                      <motion.div
                        className="flex items-center justify-center gap-2 mt-3 px-4 py-1.5"
                        style={{
                          background: `linear-gradient(135deg, ${tierColors.primary}15, ${tierColors.glow}05)`,
                          border: `1px solid ${tierColors.primary}30`,
                          borderBottom: `2px solid ${tierColors.primary}60`,
                          clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%, 0 8px)',
                        }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 0.4 }}
                      >
                        <div
                          className="text-xs font-bold uppercase tracking-[0.25em]"
                          style={{
                            color: tierColors.primary,
                            textShadow: `0 0 8px ${tierColors.glow}60`,
                          }}
                        >
                          XP EARNED
                        </div>
                      </motion.div>

                      {/* Level Stats */}
                      <motion.div
                        className="flex flex-col items-center gap-2 mt-3"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9, duration: 0.4 }}
                      >
                        <div className="text-sm font-semibold tabular-nums" style={{ color: ACCESSIBLE_COLORS.muted }}>
                          <span style={{ color: tierColors.primary }}>{xpIntoLevel.toLocaleString()}</span>
                          {' / '}
                          <span>{xpForLevel.toLocaleString()}</span>
                          {' XP'}
                        </div>
                        
                        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${tierColors.primary}20` }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{
                              background: `linear-gradient(90deg, ${tierColors.primary}, ${tierColors.glow})`,
                              boxShadow: `0 0 10px ${tierColors.glow}80`,
                            }}
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{
                              delay: 0.9,
                              duration: 1.2,
                              ease: [0.25, 0.46, 0.45, 0.94],
                            }}
                          />
                        </div>
                      </motion.div>

                      {/* Bottom Stat Cards */}
                  <motion.div
                    className="grid grid-cols-3 gap-3 mt-4 w-full"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.0, duration: 0.5 }}
                  >
                    <div className="p-3 flex flex-col items-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${tierColors.primary}10, ${tierColors.glow}05)`, border: `1px solid ${tierColors.primary}30`, borderTop: `2px solid ${tierColors.primary}60`, clipPath: 'polygon(0 8px, 8px 0, 100% 0, 100% 100%, 0 100%)', boxShadow: `inset 0 0 20px ${tierColors.primary}05` }}>
                      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: ACCESSIBLE_COLORS.muted }}>Total XP</div>
                      <div className="text-lg font-bold" style={{ color: tierColors.primary }}>{(xpIntoLevel + (level * 1000)).toLocaleString()}</div>
                    </div>
                    <div className="p-3 flex flex-col items-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${tierColors.primary}10, ${tierColors.glow}05)`, border: `1px solid ${tierColors.primary}30`, borderTop: `2px solid ${tierColors.primary}60`, clipPath: 'polygon(0 8px, 8px 0, 100% 0, 100% 100%, 0 100%)', boxShadow: `inset 0 0 20px ${tierColors.primary}05` }}>
                      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: ACCESSIBLE_COLORS.muted }}>Level</div>
                      <div className="text-lg font-bold" style={{ color: tierColors.primary }}>{level}</div>
                    </div>
                    <div className="p-3 flex flex-col items-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${tierColors.primary}10, ${tierColors.glow}05)`, border: `1px solid ${tierColors.primary}30`, borderTop: `2px solid ${tierColors.primary}60`, clipPath: 'polygon(0 8px, 8px 0, 100% 0, 100% 100%, 0 100%)', boxShadow: `inset 0 0 20px ${tierColors.primary}05` }}>
                      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: ACCESSIBLE_COLORS.muted }}>To Next</div>
                      <div className="text-lg font-bold" style={{ color: tierColors.primary }}>{(xpForLevel - xpIntoLevel).toLocaleString()}</div>
                    </div>
                  </motion.div>

                  {/* Angular Military Buttons */}
                  <motion.div
                    className="flex flex-col gap-3 mt-6 w-full"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2, duration: 0.5 }}
                  >
                    <div className="overflow-hidden" style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}>
                      <ShareButton xpEarned={xpEarned} tierName={tierName} event={event} shareUrl={shareUrl} onShare={onShare} />
                    </div>
                    {visitUrl && (
                      <motion.button onClick={() => { onVisit?.(); window.open(visitUrl, '_blank', 'noopener,noreferrer') }} className="relative px-6 py-3 text-sm font-bold uppercase tracking-widest overflow-hidden" style={{ background: `linear-gradient(135deg, ${tierColors.primary}20, ${tierColors.glow}10)`, color: ACCESSIBLE_COLORS.foreground, border: `2px solid ${tierColors.primary}40`, borderLeft: `4px solid ${tierColors.primary}`, clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }} whileHover={{ borderColor: tierColors.primary }} whileTap={{ scale: 0.98 }}><span className="relative z-10 text-xs">View Details</span></motion.button>
                    )}
                    <motion.button onClick={onClose} className="px-4 py-2 text-xs uppercase tracking-widest overflow-hidden" style={{ color: ACCESSIBLE_COLORS.muted, background: 'rgba(255, 255, 255, 0.02)', border: `1px solid ${tierColors.primary}20` }} whileHover={{ color: ACCESSIBLE_COLORS.foreground, background: 'rgba(255, 255, 255, 0.05)' }} whileTap={{ scale: 0.95 }}><span className="uppercase text-[10px] tracking-widest">Dismiss (ESC)</span></motion.button>
                  </motion.div>
                    </motion.div>
                  </div>
                </div>

              </motion.div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
