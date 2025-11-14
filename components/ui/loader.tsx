import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

export type LoaderSizeTypes = 'large' | 'medium' | 'small'
export type LoaderVariantTypes = 'blink' | 'scaleUp' | 'moveUp'

export interface LoaderProps extends HTMLAttributes<HTMLDivElement | HTMLSpanElement> {
  tag?: 'div' | 'span'
  size?: LoaderSizeTypes
  variant?: LoaderVariantTypes
  showOnlyThreeDots?: boolean
}

const variants: Record<LoaderVariantTypes, string> = {
  blink: 'animate-blink',
  scaleUp: 'animate-scale-up',
  moveUp: 'animate-move-up',
}

const sizes: Record<LoaderSizeTypes, string> = {
  large: 'h-3 w-3',
  medium: 'h-2.5 w-2.5',
  small: 'h-1.5 w-1.5',
}

const moveUpOffsets: Record<LoaderSizeTypes, string> = {
  large: 'relative top-3',
  medium: 'relative top-2',
  small: 'relative top-1.5',
}

function resolveVariantClasses(variant: LoaderVariantTypes, size: LoaderSizeTypes) {
  if (variant === 'moveUp' && size === 'small') {
    return 'animate-move-up-small'
  }
  return variants[variant]
}

export default function Loader({
  tag = 'div',
  size = 'medium',
  variant = 'moveUp',
  showOnlyThreeDots,
  className,
  ...rest
}: LoaderProps) {
  const dots = [0, 1, 2, 3]

  const content = (
    <>
      {dots.map((index) => {
        if (showOnlyThreeDots && index === 3) {
          return null
        }
        return (
          <span
            key={index}
            className={cn(
              index === 1 && 'animation-delay-200',
              index === 2 && 'animation-delay-500',
              index === 3 && 'animation-delay-700',
              'rounded-full bg-current',
              resolveVariantClasses(variant, size),
              sizes[size],
            )}
          />
        )
      })}
    </>
  )

  if (tag === 'span') {
    return (
      <span
        className={cn(
          'flex items-center gap-2 text-current',
          variant === 'moveUp' && moveUpOffsets[size],
          className,
        )}
        {...rest}
      >
        {content}
      </span>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-current',
        variant === 'moveUp' && moveUpOffsets[size],
        className,
      )}
      {...rest}
    >
      {content}
    </div>
  )
}
