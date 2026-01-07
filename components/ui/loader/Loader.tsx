/**
 * Unified Loader Component
 * Professional loading animations for the entire foundation
 * 
 * Features:
 * - 3 animation variants (dots, pulse, spin)
 * - 3 sizes (small, medium, large)
 * - Accessible (aria-busy, aria-live)
 * - GPU-optimized animations
 * 
 * @template music/loader + gmeowbased0.6/loader (30% adaptation)
 */

import { cn } from '@/lib/utils'

export type LoaderSize = 'small' | 'medium' | 'large'
export type LoaderVariant = 'dots' | 'pulse' | 'spin'

export interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Size of the loader */
  size?: LoaderSize
  /** Animation variant */
  variant?: LoaderVariant
  /** Show text alongside loader */
  text?: string
  /** Custom color (defaults to current text color) */
  color?: string
}

const sizeClasses = {
  small: {
    dots: 'w-1.5 h-1.5 gap-1.5',
    pulse: 'w-8 h-8',
    spin: 'w-8 h-8 border-2',
  },
  medium: {
    dots: 'w-2.5 h-2.5 gap-2',
    pulse: 'w-12 h-12',
    spin: 'w-12 h-12 border-[3px]',
  },
  large: {
    dots: 'w-3 h-3 gap-2.5',
    pulse: 'w-16 h-16',
    spin: 'w-16 h-16 border-4',
  },
}

const textSizeClasses = {
  small: 'text-xs',
  medium: 'text-sm',
  large: 'text-base',
}

/**
 * Dots Loader (3-dot animation)
 * LinkedIn-style moving dots with stagger delay
 */
function DotsLoader({ size = 'medium', color, className }: LoaderProps) {
  const dotSize = sizeClasses[size].dots.split(' ').slice(0, 2).join(' ')
  const gap = sizeClasses[size].dots.split(' ')[2]

  return (
    <div
      className={cn('flex items-center', gap, className)}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span
        className={cn(
          'animate-move-up rounded-full bg-current',
          dotSize
        )}
        style={{ color }}
      />
      <span
        className={cn(
          'animate-move-up animation-delay-200 rounded-full bg-current',
          dotSize
        )}
        style={{ color }}
      />
      <span
        className={cn(
          'animate-move-up animation-delay-500 rounded-full bg-current',
          dotSize
        )}
        style={{ color }}
      />
      <span className="sr-only">Loading...</span>
    </div>
  )
}

/**
 * Pulse Loader (concentric circles)
 * Twitter-style expanding pulse rings
 */
function PulseLoader({ size = 'medium', color, className }: LoaderProps) {
  const pulseSize = sizeClasses[size].pulse

  return (
    <div
      className={cn('relative flex items-center justify-center', pulseSize, className)}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      {/* Outer pulse ring */}
      <span
        className={cn(
          'absolute inset-0 animate-skeleton-pulsate rounded-full border-2 opacity-75',
          color ? '' : 'border-current'
        )}
        style={{ borderColor: color }}
      />
      {/* Middle pulse ring */}
      <span
        className={cn(
          'absolute inset-2 animate-skeleton-pulsate animation-delay-200 rounded-full border-2 opacity-50',
          color ? '' : 'border-current'
        )}
        style={{ borderColor: color }}
      />
      {/* Inner dot */}
      <span
        className={cn(
          'absolute inset-4 animate-skeleton-pulsate animation-delay-500 rounded-full',
          color ? '' : 'bg-current'
        )}
        style={{ backgroundColor: color }}
      />
      <span className="sr-only">Loading...</span>
    </div>
  )
}

/**
 * Spin Loader (rotating circle)
 * Stripe-style smooth circular spinner
 */
function SpinLoader({ size = 'medium', color, className }: LoaderProps) {
  const spinSize = sizeClasses[size].spin

  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <div
        className={cn(
          'animate-spin rounded-full border-transparent border-t-current',
          spinSize
        )}
        style={{
          borderTopColor: color,
          willChange: 'transform', // GPU optimization
        }}
      />
      <span className="sr-only">Loading...</span>
    </div>
  )
}

/**
 * Main Loader Component
 * Unified loading indicator with multiple variants
 */
export default function Loader({
  size = 'medium',
  variant = 'dots',
  text,
  color,
  className,
  ...props
}: LoaderProps) {
  const LoaderComponent = {
    dots: DotsLoader,
    pulse: PulseLoader,
    spin: SpinLoader,
  }[variant]

  return (
    <div
      className={cn('inline-flex items-center gap-3', className)}
      {...props}
    >
      <LoaderComponent size={size} color={color} />
      {text && (
        <span
          className={cn(
            'font-medium',
            textSizeClasses[size],
            color ? '' : 'text-current'
          )}
          style={{ color }}
        >
          {text}
        </span>
      )}
    </div>
  )
}

/**
 * Preset: Loading Overlay
 * Full-screen loading overlay with blur backdrop
 */
export function LoadingOverlay({
  text = 'Loading...',
  variant = 'spin',
  size = 'large',
}: Partial<LoaderProps>) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="rounded-2xl bg-slate-900/90 px-8 py-6 shadow-2xl">
        <Loader variant={variant} size={size} text={text} />
      </div>
    </div>
  )
}

/**
 * Preset: Inline Loader
 * Small inline loader for buttons/forms
 */
export function InlineLoader({ text }: { text?: string }) {
  return <Loader variant="dots" size="small" text={text} />
}

/**
 * Preset: Page Loader
 * Centered loader for full-page loading states
 */
export function PageLoader({
  text = 'Loading your data...',
  variant = 'pulse',
}: Partial<LoaderProps>) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader variant={variant} size="large" text={text} />
    </div>
  )
}
