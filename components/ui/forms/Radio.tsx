'use client'

import React, { forwardRef, type InputHTMLAttributes } from 'react'
import clsx from 'clsx'

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string
  helperText?: string
  error?: boolean
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Radio button for exclusive selection
 * Use RadioGroup for managing multiple radios
 * 
 * @example
 * <Radio
 *   name="difficulty"
 *   value="easy"
 *   label="Easy"
 *   checked={difficulty === 'easy'}
 *   onChange={(e) => setDifficulty(e.target.value)}
 * />
 */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      label,
      helperText,
      error = false,
      size = 'md',
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const wrapperStyles = clsx(
      'flex flex-col gap-1',
      disabled && 'opacity-50 cursor-not-allowed'
    )

    const containerStyles = clsx(
      'flex items-start gap-3',
      disabled ? 'cursor-not-allowed' : 'cursor-pointer'
    )

    const radioStyles = clsx(
      'flex-shrink-0 appearance-none rounded-full',
      'border-2 transition-all duration-200',
      'focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900',
      
      // Size variants
      {
        'w-4 h-4': size === 'sm',
        'w-5 h-5': size === 'md',
        'w-6 h-6': size === 'lg',
      },
      
      // State styles
      error
        ? 'border-red-500 focus:ring-red-500/50'
        : 'border-white/30 focus:ring-gmeow-purple/50',
      
      'checked:border-gmeow-purple checked:border-[6px]',
      'disabled:cursor-not-allowed',
      
      className
    )

    return (
      <div className={wrapperStyles}>
        <label className={containerStyles}>
          <input
            ref={ref}
            type="radio"
            className={radioStyles}
            disabled={disabled}
            {...props}
          />
          
          {label && (
            <div className="flex-1">
              <span className="text-sm font-medium">{label}</span>
            </div>
          )}
        </label>
        
        {helperText && (
          <p className={clsx(
            'text-xs ml-8',
            error ? 'text-red-500' : 'text-current/60'
          )}>
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Radio.displayName = 'Radio'

export interface RadioGroupProps {
  children: React.ReactNode
  label?: string
  error?: boolean
  helperText?: string
  className?: string
}

/**
 * RadioGroup container for managing multiple radio buttons
 * 
 * @example
 * <RadioGroup label="Quest Difficulty">
 *   <Radio name="diff" value="easy" label="Easy" />
 *   <Radio name="diff" value="medium" label="Medium" />
 *   <Radio name="diff" value="hard" label="Hard" />
 * </RadioGroup>
 */
export const RadioGroup: React.FC<RadioGroupProps> = ({
  children,
  label,
  error,
  helperText,
  className,
}) => {
  return (
    <div className={clsx('flex flex-col gap-3', className)}>
      {label && (
        <label className="text-sm font-medium text-current/80">
          {label}
        </label>
      )}
      
      <div className="flex flex-col gap-2">
        {children}
      </div>
      
      {helperText && (
        <p className={clsx(
          'text-xs',
          error ? 'text-red-500' : 'text-current/60'
        )}>
          {helperText}
        </p>
      )}
    </div>
  )
}
