'use client'

// Enhanced button component with loading states and drip animation from gmeowbased0.6 template
import { useState, useRef, forwardRef, useImperativeHandle, type HTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'
import ButtonDrip from '@/components/ui/button-drip'
import ButtonLoader from '@/components/ui/button-loader'
import { type LoaderSizeTypes, type LoaderVariantTypes } from '@/components/ui/loader'

const buttonVariants = cva(
  'relative inline-flex shrink-0 items-center justify-center overflow-hidden text-center text-xs sm:text-sm font-medium tracking-wider outline-none transition-all',
  {
    variants: {
      variant: {
        default: 'btn-primary text-white hover:-translate-y-0.5 hover:shadow-large focus:-translate-y-0.5 focus:shadow-large', // Uses .btn-primary from globals.css
        destructive: 'bg-red-500 text-white hover:bg-red-600 hover:-translate-y-0.5 hover:shadow-large focus:-translate-y-0.5 focus:shadow-large focus-visible:ring-red-500',
        secondary: 'btn-secondary hover:-translate-y-0.5 hover:shadow-large focus:-translate-y-0.5 focus:shadow-large', // Uses .btn-secondary from globals.css
        success: 'bg-green-500 text-white hover:bg-green-600 hover:-translate-y-0.5 hover:shadow-large focus:-translate-y-0.5 focus:shadow-large',
        outline: 'border-2 border-solid border-primary text-primary bg-transparent hover:bg-primary/10',
        ghost: 'bg-transparent text-primary hover:bg-accent hover:text-accent-foreground',
        transparent: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-gray-100 dark:focus:bg-gray-800',
        link: 'underline-offset-4 hover:underline text-primary',
      },
      size: {
        mini: 'px-4 h-8 rounded-md',
        sm: 'px-7 h-10 rounded-md',
        default: 'px-5 sm:px-8 h-10 sm:h-12 rounded-lg',
        lg: 'px-7 sm:px-9 h-11 sm:h-13 rounded-lg',
        icon: 'h-10 w-10 rounded-full',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      fullWidth: false,
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
  loaderSize?: LoaderSizeTypes
  loaderVariant?: LoaderVariantTypes
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { 
      className, 
      variant, 
      size, 
      fullWidth,
      isLoading,
      disabled,
      loaderSize = 'small',
      loaderVariant = 'scaleUp',
      onClick,
      children,
      ...props 
    }, 
    ref
  ) => {
    const [dripShow, setDripShow] = useState<boolean>(false)
    const [dripX, setDripX] = useState<number>(0)
    const [dripY, setDripY] = useState<number>(0)
    const buttonRef = useRef<HTMLButtonElement>(null)
    
    useImperativeHandle(ref, () => buttonRef.current!)

    const dripCompletedHandle = () => {
      setDripShow(false)
      setDripX(0)
      setDripY(0)
    }

    const clickHandler = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!isLoading && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        setDripShow(true)
        setDripX(event.clientX - rect.left)
        setDripY(event.clientY - rect.top)
      }
      if (onClick) {
        onClick(event)
      }
    }

    // Determine drip color based on variant
    const getDripColor = () => {
      if (variant === 'outline' || variant === 'ghost' || variant === 'transparent') {
        return 'rgba(0, 0, 0, 0.1)'
      }
      return 'rgba(255, 255, 255, 0.3)'
    }

    return (
      <button
        ref={buttonRef}
        onClick={clickHandler}
        className={cn(
          buttonVariants({ variant, size, fullWidth, className }),
          (disabled || isLoading) && 'cursor-not-allowed bg-gray-100 text-gray-400 hover:translate-y-0 hover:shadow-none',
          isLoading && 'pointer-events-auto cursor-default focus:outline-none'
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        <span className={cn(isLoading && 'invisible opacity-0')}>
          {children}
        </span>

        {isLoading && (
          <ButtonLoader size={loaderSize} variant={loaderVariant} />
        )}

        {dripShow && !disabled && !isLoading && (
          <ButtonDrip
            x={dripX}
            y={dripY}
            color={getDripColor()}
            fullWidth={fullWidth || false}
            onCompleted={dripCompletedHandle}
          />
        )}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }

// ============================================================================
// Card Components
// ============================================================================

type CardTone = 'neutral' | 'frosted' | 'accent' | 'muted' | 'danger' | 'info'
type CardPadding = 'none' | 'xs' | 'sm' | 'md' | 'lg'

interface SharedCardProps {
  tone?: CardTone
  padding?: CardPadding
  interactive?: boolean
}

const CARD_TONE_STYLES: Record<CardTone, string> = {
  neutral: 'border-white dark:border-slate-700/15 bg-slate-100/5 dark:bg-white/5 text-slate-950 dark:text-white',
  frosted: 'border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-white/5 text-slate-950 dark:text-white backdrop-blur-md',
  accent: 'border-emerald-200/35 bg-emerald-500/15 text-white shadow-[0_0_40px_rgba(16,185,129,0.18)]',
  muted: 'border-white dark:border-slate-700/10 bg-slate-950/30 dark:bg-slate-950/30 text-slate-950 dark:text-white',
  danger: 'border-rose-400/35 bg-rose-500/15 text-white shadow-[0_0_40px_rgba(244,63,94,0.18)]',
  info: 'border-sky-400/35 bg-sky-500/15 text-white shadow-[0_0_40px_rgba(56,189,248,0.18)]',
}

const CARD_PADDING_STYLES: Record<CardPadding, string> = {
  none: 'p-0',
  xs: 'p-3 sm:p-3.5',
  sm: 'p-4 sm:p-5',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
}

const CARD_BASE_CLASS = 'relative overflow-hidden rounded-2xl border backdrop-blur-xl transition-transform duration-200 ease-out will-change-transform'

export interface CardProps extends HTMLAttributes<HTMLDivElement>, SharedCardProps {
  asChild?: boolean
}

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
  return <Comp ref={ref} className={cn('text-lg font-semibold text-slate-950 dark:text-white sm:text-xl', className)} {...props} />
})

export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  asChild?: boolean
}

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(function CardDescription(
  { className, asChild = false, ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'p'
  return <Comp ref={ref} className={cn('text-sm text-slate-950 dark:text-white/70', className)} {...props} />
})

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  asChild?: boolean
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(function CardFooter(
  { className, asChild = false, ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'div'
  return <Comp ref={ref} className={cn('flex items-center gap-2', className)} {...props} />
})

// ============================================================================
// Input Component
// ============================================================================

const INPUT_SIZE_STYLES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-4 py-3 text-base',
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg'
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
        'pixel-input block w-full rounded-xl border border-white dark:border-white/15 bg-slate-100 dark:bg-black/20 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/70 focus-visible:ring-offset-0 focus:border-emerald-300/50 disabled:cursor-not-allowed disabled:opacity-50',
        INPUT_SIZE_STYLES[size],
        className,
      )}
      {...props}
    />
  )
})

// ============================================================================
// EmptyState Component
// ============================================================================

export interface EmptyStateProps extends Pick<CardProps, 'tone' | 'padding' | 'className'> {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action, tone = 'muted', padding = 'sm', className }: EmptyStateProps) {
  return (
    <Card tone={tone} padding={padding} className={cn('flex flex-col items-center gap-3 text-center', className)}>
      {icon ? <span className="text-4xl">{icon}</span> : null}
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-slate-950 dark:text-white">{title}</h3>
        {description ? <p className="text-sm text-slate-950 dark:text-white/70">{description}</p> : null}
      </div>
      {action ?? null}
    </Card>
  )
}
