/**
 * Gmeow Loader - Retro/Cyberpunk Gaming Style
 * 
 * Professional loader with typewriter effect and cyberpunk aesthetics
 * Features:
 * - Typewriter animation for "Gmeow" text
 * - Glitch effects and scanlines
 * - Neon glow and shadows
 * - Multiple size variants (small, medium, large, fullscreen)
 * - Multiple style variants (retro, cyberpunk, minimal, gaming)
 * - Fully responsive and accessible
 * - WCAG AA compliant with proper ARIA attributes
 * 
 * Usage:
 * <Loader size="medium" variant="cyberpunk" />
 * <Loader size="fullscreen" variant="retro" showText />
 */

'use client'

import { useEffect, useState } from 'react'
import cn from 'classnames'

export type LoaderSizeTypes = 'small' | 'medium' | 'large' | 'fullscreen'
export type LoaderVariantTypes = 'retro' | 'cyberpunk' | 'gaming' | 'minimal'

export interface LoaderTypes extends React.HTMLAttributes<HTMLDivElement> {
  size?: LoaderSizeTypes
  variant?: LoaderVariantTypes
  showText?: boolean
  message?: string
  className?: string
}

const sizeClasses = {
  small: 'w-8 h-8',
  medium: 'w-12 h-12',
  large: 'w-16 h-16',
  fullscreen: 'w-24 h-24',
}

const containerSizes = {
  small: 'gap-2',
  medium: 'gap-3',
  large: 'gap-4',
  fullscreen: 'gap-6',
}

const textSizes = {
  small: 'text-xs',
  medium: 'text-sm',
  large: 'text-lg',
  fullscreen: 'text-2xl',
}

const TypewriterText = ({ text, size }: { text: string; size: LoaderSizeTypes }) => {
  const [displayText, setDisplayText] = useState('')
  const [showCursor, setShowCursor] = useState(true)

  useEffect(() => {
    let currentIndex = 0
    const typingSpeed = 150

    const typeInterval = setInterval(() => {
      if (currentIndex <= text.length) {
        setDisplayText(text.slice(0, currentIndex))
        currentIndex++
      } else {
        clearInterval(typeInterval)
        // Reset after completion
        setTimeout(() => {
          currentIndex = 0
          setDisplayText('')
        }, 2000)
      }
    }, typingSpeed)

    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 530)

    return () => {
      clearInterval(typeInterval)
      clearInterval(cursorInterval)
    }
  }, [text])

  return (
    <div className="flex items-center justify-center font-mono font-bold tracking-wider">
      <span className={cn('relative', textSizes[size])}>
        {displayText}
        <span
          className={cn(
            'inline-block w-[2px] ml-0.5 bg-current',
            showCursor ? 'opacity-100' : 'opacity-0',
            size === 'small' ? 'h-3' : size === 'medium' ? 'h-4' : size === 'large' ? 'h-6' : 'h-8'
          )}
          aria-hidden="true"
        />
      </span>
    </div>
  )
}

const RetroLoader = ({ size }: { size: LoaderSizeTypes }) => (
  <div className="relative">
    {/* Outer rotating ring - arcade style */}
    <div
      className={cn(
        'absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-400 border-r-cyan-400 animate-spin',
        'shadow-[0_0_20px_rgba(34,211,238,0.5)]'
      )}
      style={{ animationDuration: '1s' }}
    />
    
    {/* Middle ring - counter rotation */}
    <div
      className={cn(
        'absolute inset-2 rounded-full border-4 border-transparent border-b-fuchsia-400 border-l-fuchsia-400 animate-spin',
        'shadow-[0_0_15px_rgba(232,121,249,0.5)]'
      )}
      style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}
    />
    
    {/* Center pixel art cat emoji */}
    <div className="absolute inset-0 flex items-center justify-center">
      <span className={cn(
        'text-center leading-none',
        size === 'small' ? 'text-xs' : size === 'medium' ? 'text-lg' : size === 'large' ? 'text-2xl' : 'text-4xl'
      )}>
        😸
      </span>
    </div>
    
    {/* Scanline effect */}
    <div className="absolute inset-0 rounded-full pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent animate-scan" />
    </div>
  </div>
)

const CyberpunkLoader = ({ size }: { size: LoaderSizeTypes }) => (
  <div className="relative">
    {/* Glitch outer ring */}
    <div
      className={cn(
        'absolute inset-0 rounded-full border-2 border-emerald-400 animate-spin',
        'shadow-[0_0_30px_rgba(52,211,153,0.6),inset_0_0_20px_rgba(52,211,153,0.3)]',
        'before:absolute before:inset-0 before:rounded-full before:border-2 before:border-emerald-400',
        'before:animate-glitch-1'
      )}
      style={{ animationDuration: '2s' }}
    />
    
    {/* Hexagonal pattern */}
    <div className="absolute inset-0 flex items-center justify-center">
      <div className={cn(
        'relative',
        size === 'small' ? 'w-4 h-4' : size === 'medium' ? 'w-6 h-6' : size === 'large' ? 'w-8 h-8' : 'w-12 h-12'
      )}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute inset-0 border border-amber-400/40 animate-pulse"
            style={{
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              animationDelay: `${i * 0.2}s`,
              transform: `scale(${1 - i * 0.3})`,
            }}
          />
        ))}
      </div>
    </div>
    
    {/* Center glow */}
    <div className="absolute inset-0 flex items-center justify-center">
      <div className={cn(
        'rounded-full bg-emerald-400/30 backdrop-blur-sm animate-pulse',
        size === 'small' ? 'w-3 h-3' : size === 'medium' ? 'w-4 h-4' : size === 'large' ? 'w-6 h-6' : 'w-8 h-8'
      )} />
    </div>
  </div>
)

const GamingLoader = ({ size }: { size: LoaderSizeTypes }) => (
  <div className="relative">
    {/* Energy orb */}
    <div className={cn(
      'absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500',
      'animate-pulse shadow-[0_0_30px_rgba(168,85,247,0.8)]'
    )}>
      {/* Rotating energy particles */}
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-white animate-spin"
          style={{
            top: '50%',
            left: '50%',
            transformOrigin: size === 'small' ? '0 -16px' : size === 'medium' ? '0 -24px' : size === 'large' ? '0 -32px' : '0 -48px',
            transform: `rotate(${i * 90}deg)`,
            animationDuration: '1.5s',
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
    
    {/* Power-up effect */}
    <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping" />
  </div>
)

const MinimalLoader = ({ size }: { size: LoaderSizeTypes }) => (
  <div className="relative">
    <svg
      className={cn('animate-spin', sizeClasses[size])}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  </div>
)

export default function Loader({
  size = 'medium',
  variant = 'cyberpunk',
  showText = true,
  message,
  className,
  ...props
}: LoaderTypes) {
  const isFullscreen = size === 'fullscreen'

  const loaderContent = (
    <>
      {/* Loader animation */}
      <div className={cn('relative', sizeClasses[size])} role="status" aria-live="polite">
        {variant === 'retro' && <RetroLoader size={size} />}
        {variant === 'cyberpunk' && <CyberpunkLoader size={size} />}
        {variant === 'gaming' && <GamingLoader size={size} />}
        {variant === 'minimal' && <MinimalLoader size={size} />}
        <span className="sr-only">Loading...</span>
      </div>

      {/* Text content */}
      {showText && (
        <div className="flex flex-col items-center gap-2">
          <TypewriterText text="Gmeow" size={size} />
          {message && (
            <p className={cn(
              'text-gray-600 dark:text-gray-400 font-medium animate-pulse',
              textSizes[size]
            )}>
              {message}
            </p>
          )}
        </div>
      )}
    </>
  )

  if (isFullscreen) {
    return (
      <div
        className={cn(
          'fixed inset-0 z-50 flex flex-col items-center justify-center',
          'bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900',
          'backdrop-blur-sm',
          className
        )}
        {...props}
      >
        <div className={cn('flex flex-col items-center', containerSizes[size])}>
          {loaderContent}
        </div>
        
        {/* Fullscreen decorative elements */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
          
          {/* Corner accents */}
          {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => (
            <div
              key={corner}
              className={cn(
                'absolute w-20 h-20 border-2 border-cyan-400/30',
                corner === 'top-left' && 'top-4 left-4 border-r-0 border-b-0',
                corner === 'top-right' && 'top-4 right-4 border-l-0 border-b-0',
                corner === 'bottom-left' && 'bottom-4 left-4 border-r-0 border-t-0',
                corner === 'bottom-right' && 'bottom-4 right-4 border-l-0 border-t-0'
              )}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        containerSizes[size],
        className
      )}
      {...props}
    >
      {loaderContent}
    </div>
  )
}
