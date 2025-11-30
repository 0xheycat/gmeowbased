'use client'

import React, { useState, useRef, useEffect, type ReactNode } from 'react'
import clsx from 'clsx'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps {
  options: SelectOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  label?: string
  helperText?: string
  error?: boolean
  disabled?: boolean
  searchable?: boolean
  fullWidth?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Select dropdown with optional search functionality
 * Mobile-friendly with touch targets
 * 
 * @example
 * <Select
 *   options={[{ value: 'base', label: 'Base' }, { value: 'eth', label: 'Ethereum' }]}
 *   value={chain}
 *   onChange={setChain}
 *   label="Select Chain"
 *   searchable
 * />
 */
export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  label,
  helperText,
  error = false,
  disabled = false,
  searchable = false,
  fullWidth = false,
  size = 'md',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  const filteredOptions = searchable && searchQuery
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue)
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setSearchQuery('')
    }
  }

  const wrapperStyles = clsx(
    'flex flex-col gap-1',
    fullWidth ? 'w-full' : 'w-auto'
  )

  const selectStyles = clsx(
    'relative flex items-center justify-between gap-2',
    'transition-all duration-200',
    'rounded-md cursor-pointer',
    'bg-white/5 border border-white/10 hover:border-white/20',
    
    // Size variants
    {
      'h-8 px-3 text-xs': size === 'sm',
      'h-11 px-4 text-sm': size === 'md',
      'h-12 px-5 text-base': size === 'lg',
    },
    
    // State styles
    error
      ? 'border-red-500 focus-within:ring-2 focus-within:ring-red-500/50'
      : 'focus-within:ring-2 focus-within:ring-gmeow-purple/50',
    disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
    isOpen && 'ring-2 ring-gmeow-purple/50',
    
    className
  )

  const dropdownStyles = clsx(
    'absolute z-50 mt-2 w-full',
    'max-h-60 overflow-auto',
    'bg-gray-900 border border-white/20 rounded-lg shadow-xl',
    'animate-in fade-in-0 zoom-in-95 duration-200'
  )

  return (
    <div className={wrapperStyles} ref={containerRef} onKeyDown={handleKeyDown}>
      {label && (
        <label className="text-sm font-medium text-current/80">
          {label}
        </label>
      )}
      
      <div className="relative">
        <div
          className={selectStyles}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <span className={clsx(
            'flex-1 truncate',
            !selectedOption && 'text-current/40'
          )}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronIcon isOpen={isOpen} />
        </div>

        {isOpen && (
          <div className={dropdownStyles}>
            {searchable && (
              <div className="sticky top-0 p-2 bg-gray-900 border-b border-white/10">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-md outline-none focus:ring-2 focus:ring-gmeow-purple/50"
                  autoFocus
                />
              </div>
            )}

            <div className="py-1">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-current/60">
                  No options found
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    disabled={option.disabled}
                    className={clsx(
                      'w-full px-3 py-2 text-left text-sm',
                      'hover:bg-white/10 transition-colors',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      option.value === value && 'bg-gmeow-purple/20 text-gmeow-purple'
                    )}
                  >
                    {option.label}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
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

const ChevronIcon: React.FC<{ isOpen: boolean }> = ({ isOpen }) => (
  <svg
    className={clsx(
      'w-4 h-4 transition-transform duration-200',
      isOpen && 'rotate-180'
    )}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)
