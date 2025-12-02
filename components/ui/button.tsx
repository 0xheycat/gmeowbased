'use client'

// Enhanced button component with loading states and drip animation from gmeowbased0.6 template
import { useState, useRef, forwardRef, useImperativeHandle } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
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
      onClick && onClick(event)
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
