'use client'

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
  type MouseEvent,
  type ButtonHTMLAttributes,
  // @edit-start 2025-11-13 — Shared UI primitives imports
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { Slot } from '@radix-ui/react-slot'
// @edit-end

import Loader, {
  type LoaderSizeTypes,
  type LoaderVariantTypes,
} from '@/components/ui/loader'
import { cn } from '@/lib/utils'

type ShapeNames = 'rounded' | 'pill' | 'circle'
type VariantNames = 'ghost' | 'solid' | 'transparent'
type ColorNames =
  | 'primary'
  | 'white'
  | 'gray'
  | 'success'
  | 'info'
  | 'warning'
  | 'danger'
type SizeNames = 'large' | 'medium' | 'small' | 'mini'

interface ButtonStyleConfig {
  shape?: ShapeNames
  variant?: VariantNames
  color?: ColorNames
  size?: SizeNames
  fullWidth?: boolean
  disabled?: boolean
  isLoading?: boolean
  className?: string
}

const shapes: Record<ShapeNames, string> = {
  rounded: 'rounded-xl sm:rounded-2xl',
  pill: 'rounded-full',
  circle: 'rounded-full',
}

const colors: Record<ColorNames, { text: string; background: string; border: string; drip: string }> = {
  primary: {
    text: 'text-sky-100',
    background: 'bg-sky-500/20',
    border: 'border-sky-400/60',
    drip: 'rgba(109, 168, 255, 0.35)',
  },
  white: {
    text: 'text-slate-900',
    background: 'bg-slate-100/90 dark:bg-white/5 text-slate-900 dark:text-slate-500',
    border: 'border-slate-200 dark:border-white/10',
    drip: 'rgba(22, 36, 67, 0.18)',
  },
  gray: {
    text: 'text-slate-200',
    background: 'bg-slate-900/70',
    border: 'border-slate-700/60',
    drip: 'rgba(120, 130, 150, 0.32)',
  },
  success: {
    text: 'text-emerald-100',
    background: 'bg-emerald-500/20',
    border: 'border-emerald-400/50',
    drip: 'rgba(52, 211, 153, 0.35)',
  },
  info: {
    text: 'text-sky-100',
    background: 'bg-blue-500/20',
    border: 'border-blue-400/60',
    drip: 'rgba(96, 165, 250, 0.32)',
  },
  warning: {
    text: 'text-amber-100',
    background: 'bg-amber-500/20',
    border: 'border-amber-400/60',
    drip: 'rgba(251, 191, 36, 0.3)',
  },
  danger: {
    text: 'text-rose-100',
    background: 'bg-rose-500/20',
    border: 'border-rose-400/60',
    drip: 'rgba(248, 113, 113, 0.32)',
  },
}

const sizes: Record<SizeNames, [string, string]> = {
  large: ['px-8 py-4 text-[12px] sm:text-xs', 'h-14 w-14 sm:h-16 sm:w-16'],
  medium: ['px-6 py-3 text-[11px] sm:text-xs', 'h-12 w-12 sm:h-13 sm:w-13'],
  small: ['px-4 py-2 text-[10px]', 'h-10 w-10'],
  mini: ['px-3 py-1.5 text-[9px]', 'h-8 w-8'], // 32px - below 44px touch target (Apple HIG). Use only for desktop-only, non-primary actions (tags, badges, compact UI)
}

const variantBase: Record<VariantNames, string> = {
  solid:
    'shadow-[0_18px_60px_rgba(25,58,119,0.45)] hover:-translate-y-0.5 hover:shadow-[0_28px_80px_rgba(49,104,224,0.45)] focus:-translate-y-0.5 focus:shadow-[0_32px_96px_rgba(78,149,255,0.4)]',
  ghost:
    'bg-transparent hover:-translate-y-0.5 hover:shadow-[0_16px_48px_rgba(22,32,68,0.32)] focus:-translate-y-0.5 focus:shadow-[0_20px_60px_rgba(36,56,112,0.35)]',
  transparent:
    'bg-transparent hover:bg-slate-100/90 dark:bg-white/5 focus:bg-slate-100/90 dark:bg-white/5 hover:shadow-none focus:shadow-none',
}

export const buttonVariants = ({
  shape = 'pill',
  variant = 'solid',
  color = 'primary',
  size = 'medium',
  fullWidth,
  disabled,
  isLoading,
  className,
}: ButtonStyleConfig = {}) => {
  const colorPreset = colors[color]
  const sizePreset = sizes[size]
  const shapePreset = shapes[shape]

  const base = cn(
    'relative inline-flex shrink-0 items-center justify-center overflow-hidden text-center font-semibold uppercase tracking-[0.32em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60 focus-visible:ring-offset-0',
    fullWidth && 'w-full',
    shapePreset,
    shape === 'circle' ? sizePreset[1] : sizePreset[0],
    variant === 'solid'
      ? cn('border', colorPreset.border, colorPreset.background, colorPreset.text)
      : variant === 'ghost'
        ? cn('border-2 border-solid', colorPreset.border, colorPreset.text)
        : cn(colorPreset.text),
    !disabled && !isLoading && variantBase[variant],
    (disabled || isLoading) && 'cursor-not-allowed opacity-60 shadow-none translate-y-0',
    className,
  )

  return base
}

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'>,
    Omit<ButtonStyleConfig, 'className'> {
  isLoading?: boolean
  loaderSize?: LoaderSizeTypes
  loaderVariant?: LoaderVariantTypes
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      isLoading = false,
      disabled = false,
      fullWidth,
      shape = 'pill',
      variant = 'solid',
      color = 'primary',
      size = 'medium',
      loaderSize = 'small',
      loaderVariant = 'scaleUp',
      onClick,
      ...buttonProps
    },
    ref,
  ) => {
    const buttonRef = useRef<HTMLButtonElement>(null)
    useImperativeHandle(ref, () => buttonRef.current as HTMLButtonElement)

    const [dripActive, setDripActive] = useState(false)
    const [dripX, setDripX] = useState(0)
    const [dripY, setDripY] = useState(0)

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !isLoading && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        setDripActive(true)
        setDripX(event.clientX - rect.left)
        setDripY(event.clientY - rect.top)
      }
      onClick?.(event)
    }

    const resetDrip = () => {
      setDripActive(false)
      setDripX(0)
      setDripY(0)
    }

    const colorPreset = colors[color]
    const buttonClassName = buttonVariants({
      shape,
      variant,
      color,
      size,
      fullWidth,
      disabled,
      isLoading,
      className,
    })

    return (
      <button
        ref={buttonRef}
        className={buttonClassName}
        disabled={disabled}
        onClick={handleClick}
        {...buttonProps}
      >
        <span className={cn('flex items-center gap-2', isLoading && 'invisible opacity-0')}>
          {children}
        </span>
        {isLoading ? <ButtonLoader size={loaderSize} variant={loaderVariant} /> : null}
        {dripActive ? (
          <ButtonDrip
            color={colorPreset.drip}
            fullWidth={fullWidth}
            onCompleted={resetDrip}
            x={dripX}
            y={dripY}
          />
        ) : null}
      </button>
    )
  },
)

Button.displayName = 'Button'

export { Button }

interface ButtonDripProps {
  x: number
  y: number
  color: string
  fullWidth?: boolean
  onCompleted: () => void
}

function ButtonDrip({ x, y, color, fullWidth, onCompleted }: ButtonDripProps) {
  const dripRef = useRef<HTMLSpanElement>(null)
  const top = Number.isNaN(+y) ? 0 : y - 10
  const left = Number.isNaN(+x) ? 0 : x - 10

  useEffect(() => {
    const node = dripRef.current
    if (!node) return
    const handleAnimationEnd = () => onCompleted()
    node.addEventListener('animationend', handleAnimationEnd)
    return () => node.removeEventListener('animationend', handleAnimationEnd)
  }, [onCompleted])

  return (
    <span ref={dripRef} className="absolute inset-0 block">
      <svg
        width={20}
        height={20}
        viewBox="0 0 20 20"
        className={cn(
          'absolute h-4 w-4',
          fullWidth ? 'animate-drip-expand-large' : 'animate-drip-expand',
        )}
        style={{ top, left }}
      >
        <g fill="none" fillRule="evenodd" stroke="none" strokeWidth="1">
          <rect fill={color} height="100%" rx="10" width="100%" />
        </g>
      </svg>
    </span>
  )
}

ButtonDrip.displayName = 'ButtonDrip'

interface ButtonLoaderProps {
  size: LoaderSizeTypes
  variant: LoaderVariantTypes
}

function ButtonLoader({ size, variant }: ButtonLoaderProps) {
  return (
    <span className="absolute inset-0 flex h-full w-full items-center justify-center">
      <Loader className="text-current" showOnlyThreeDots size={size} tag="span" variant={variant} />
    </span>
  )
}

ButtonLoader.displayName = 'ButtonLoader'

// @edit-start 2025-11-13 — Shared UI primitives (Card, Input, EmptyState)
export type CardTone = 'neutral' | 'frosted' | 'accent' | 'muted' | 'danger' | 'info'
export type CardPadding = 'none' | 'xs' | 'sm' | 'md' | 'lg'

type SharedCardProps = {
  tone?: CardTone
  padding?: CardPadding
  interactive?: boolean
}

export interface CardProps extends HTMLAttributes<HTMLDivElement>, SharedCardProps {
  asChild?: boolean
}

const CARD_TONE_STYLES: Record<CardTone, string> = {
  neutral: 'border-slate-200 dark:border-white/10 bg-slate-100/90 dark:bg-white/5 text-slate-900 dark:text-slate-950 dark:text-slate-700 dark:text-white/90',
  frosted: 'border-slate-200 dark:border-white/10 bg-slate-100/90 dark:bg-white/5 text-slate-900 dark:text-slate-950 dark:text-slate-700 dark:text-white/90',
  accent: 'border-emerald-400/30 bg-emerald-400/10 text-slate-900 dark:text-slate-950 dark:text-white shadow-[0_0_40px_rgba(16,185,129,0.18)]',
  muted: 'border-slate-200 dark:border-white/10 bg-black/25 text-slate-900 dark:text-slate-950 dark:text-slate-700 dark:text-white/85',
  danger: 'border-rose-400/35 bg-rose-500/15 text-slate-900 dark:text-slate-950 dark:text-white shadow-[0_0_40px_rgba(244,63,94,0.18)]',
  info: 'border-sky-400/35 bg-sky-500/15 text-slate-900 dark:text-slate-950 dark:text-white shadow-[0_0_40px_rgba(56,189,248,0.18)]',
}

const CARD_PADDING_STYLES: Record<CardPadding, string> = {
  none: 'p-0',
  xs: 'p-3 sm:p-3.5',
  sm: 'p-4 sm:p-5',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
}

const CARD_BASE_CLASS = 'relative overflow-hidden rounded-2xl border backdrop-blur-xl transition-transform duration-200 ease-out will-change-transform'

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, tone = 'frosted', padding = 'sm', interactive = false, asChild = false, ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'div'
  return (
    <Comp
      ref={ref}
      className={cn(
        CARD_BASE_CLASS,
        CARD_TONE_STYLES[tone],
        CARD_PADDING_STYLES[padding],
        interactive && 'hover:-translate-y-[1px] hover:shadow-[0_24px_48px_rgba(22,36,68,0.35)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/60 focus-visible:ring-offset-0',
        className,
      )}
      {...props}
    />
  )
})

interface CardSectionProps extends HTMLAttributes<HTMLDivElement>, SharedCardProps {
  asChild?: boolean
}

export const CardSection = forwardRef<HTMLDivElement, CardSectionProps>(function CardSection(
  { className, tone = 'neutral', padding = 'sm', interactive = false, asChild = false, ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'div'
  return (
    <Comp
      ref={ref}
      className={cn(
        'rounded-2xl border transition-colors duration-200',
        CARD_TONE_STYLES[tone],
        CARD_PADDING_STYLES[padding],
        interactive && 'hover:border-emerald-200/50 hover:bg-emerald-300/10',
        className,
      )}
      {...props}
    />
  )
})

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  asChild?: boolean
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(function CardTitle(
  { className, asChild = false, ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'h2'
  return <Comp ref={ref} className={cn('text-lg font-semibold text-slate-900 dark:text-slate-950 dark:text-white sm:text-xl', className)} {...props} />
})

export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  asChild?: boolean
}

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(function CardDescription(
  { className, asChild = false, ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'p'
  return <Comp ref={ref} className={cn('text-sm text-slate-900 dark:text-slate-950 dark:text-slate-700 dark:text-white/70', className)} {...props} />
})

export type CardFooterProps = HTMLAttributes<HTMLDivElement>

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(function CardFooter(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={cn('flex items-center gap-2 text-xs text-slate-900 dark:text-slate-950 dark:text-slate-700 dark:text-white/60', className)} {...props} />
})

// @edit-start 2025-02-15 — Align InputProps size with custom tokens
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg'
}
// @edit-end

const INPUT_SIZE_STYLES: Record<NonNullable<InputProps['size']>, string> = {
  sm: 'h-9 px-3 text-[13px]',
  md: 'h-10 px-3.5 text-sm',
  lg: 'h-11 px-4 text-base',
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = 'text', size = 'md', disabled, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn(
        'pixel-input block w-full rounded-xl border border-slate-200 dark:border-white/10 bg-black/20 text-slate-900 dark:text-slate-950 dark:text-white placeholder:text-slate-950 dark:text-slate-700 dark:text-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/70 focus-visible:ring-offset-0 focus:border-emerald-300/50 disabled:cursor-not-allowed disabled:opacity-50',
        INPUT_SIZE_STYLES[size],
        className,
      )}
      {...props}
    />
  )
})

export interface EmptyStateProps extends Pick<CardProps, 'tone' | 'padding' | 'className'> {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action, tone = 'muted', padding = 'sm', className }: EmptyStateProps) {
  return (
    <Card tone={tone} padding={padding} className={cn('flex flex-col items-center gap-3 text-center', className)}>
      {icon ? <span className="text-slate-950 dark:text-white/60">{icon}</span> : null}
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-slate-950 dark:text-white">{title}</h3>
        {description ? <p className="text-sm text-slate-950 dark:text-white/70">{description}</p> : null}
      </div>
      {action ?? null}
    </Card>
  )
}
// @edit-end
