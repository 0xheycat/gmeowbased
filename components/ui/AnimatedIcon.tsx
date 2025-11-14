'use client'

import dynamic from 'next/dynamic'
import type { CSSProperties, ComponentType } from 'react'
import { cn } from '@/lib/utils'

type PlayerProps = {
  src: string
  autoplay?: boolean
  loop?: boolean
  style?: CSSProperties
  playMode?: 'normal' | 'bounce'
  speed?: number
  renderer?: 'svg' | 'canvas'
  onEvent?: (event: string) => void
  role?: string
  'aria-label'?: string
}

const DotLottiePlayer = dynamic(() => import('@lottiefiles/dotlottie-react').then((mod) => {
  const exports = mod as unknown as { DotLottieReact?: ComponentType<PlayerProps> }
  if (!exports.DotLottieReact) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('DotLottieReact export not found in @lottiefiles/dotlottie-react')
    }
    return (() => null) as ComponentType<PlayerProps>
  }
  return exports.DotLottieReact
}), { ssr: false, loading: () => null }) as ComponentType<PlayerProps>

type AnimatedIconProps = {
  src: string
  size?: number
  loop?: boolean
  autoplay?: boolean
  speed?: number
  className?: string
  renderer?: 'svg' | 'canvas'
  ariaLabel?: string
}

export function AnimatedIcon({
  src,
  size = 56,
  loop = true,
  autoplay = true,
  speed = 1,
  className,
  renderer = 'svg',
  ariaLabel,
}: AnimatedIconProps) {
  if (!src) return null
  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <DotLottiePlayer
        src={src}
        loop={loop}
        autoplay={autoplay}
        speed={speed}
        renderer={renderer}
        style={{ width: size, height: size, pointerEvents: 'none' }}
        role={ariaLabel ? 'img' : 'presentation'}
        aria-label={ariaLabel}
      />
    </div>
  )
}
