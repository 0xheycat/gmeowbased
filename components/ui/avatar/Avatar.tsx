'use client'

import React, { useState } from 'react'
import clsx from 'clsx'

export interface AvatarProps {
  src?: string
  alt?: string
  fallback?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  variant?: 'circle' | 'square' | 'rounded'
  status?: 'online' | 'offline' | 'away' | 'busy'
  className?: string
}

/**
 * Avatar component for user profile pictures
 * Shows fallback text if image fails to load
 * Supports status indicators
 * 
 * @example
 * <Avatar
 *   src={user.avatar}
 *   alt={user.name}
 *   fallback={user.name[0]}
 *   size="lg"
 *   status="online"
 * />
 */
export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  fallback,
  size = 'md',
  variant = 'circle',
  status,
  className,
}) => {
  const [imageError, setImageError] = useState(false)

  const containerStyles = clsx(
    'relative inline-flex items-center justify-center',
    'bg-gradient-to-br from-gmeow-purple to-gmeow-purple-dark',
    'text-white font-semibold flex-shrink-0',
    
    // Size variants
    {
      'w-6 h-6 text-xs': size === 'xs',
      'w-8 h-8 text-xs': size === 'sm',
      'w-10 h-10 text-sm': size === 'md',
      'w-12 h-12 text-base': size === 'lg',
      'w-16 h-16 text-xl': size === 'xl',
      'w-24 h-24 text-3xl': size === '2xl',
    },
    
    // Variant styles
    {
      'rounded-full': variant === 'circle',
      'rounded-md': variant === 'rounded',
      'rounded-none': variant === 'square',
    },
    
    className
  )

  const imageStyles = clsx(
    'w-full h-full object-cover',
    {
      'rounded-full': variant === 'circle',
      'rounded-md': variant === 'rounded',
      'rounded-none': variant === 'square',
    }
  )

  const statusIndicatorStyles = clsx(
    'absolute bottom-0 right-0',
    'rounded-full border-2 border-gray-900',
    {
      'w-2 h-2': size === 'xs' || size === 'sm',
      'w-3 h-3': size === 'md' || size === 'lg',
      'w-4 h-4': size === 'xl' || size === '2xl',
    },
    {
      'bg-green-500': status === 'online',
      'bg-gray-500': status === 'offline',
      'bg-yellow-500': status === 'away',
      'bg-red-500': status === 'busy',
    }
  )

  return (
    <div className={containerStyles}>
      {src && !imageError ? (
        <img
          src={src}
          alt={alt}
          className={imageStyles}
          onError={() => setImageError(true)}
        />
      ) : (
        <span>{fallback || alt?.[0]?.toUpperCase() || '?'}</span>
      )}
      
      {status && (
        <span className={statusIndicatorStyles} aria-label={`Status: ${status}`} />
      )}
    </div>
  )
}

export interface AvatarGroupProps {
  children: React.ReactNode
  max?: number
  size?: AvatarProps['size']
  className?: string
}

/**
 * AvatarGroup for displaying multiple avatars
 * Automatically stacks and shows overflow count
 * 
 * @example
 * <AvatarGroup max={3}>
 *   <Avatar src={user1.avatar} alt={user1.name} />
 *   <Avatar src={user2.avatar} alt={user2.name} />
 *   <Avatar src={user3.avatar} alt={user3.name} />
 *   <Avatar src={user4.avatar} alt={user4.name} />
 * </AvatarGroup>
 */
export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  children,
  max = 3,
  size = 'md',
  className,
}) => {
  const childrenArray = React.Children.toArray(children)
  const visibleChildren = childrenArray.slice(0, max)
  const remainingCount = childrenArray.length - max

  return (
    <div className={clsx('flex items-center', className)}>
      {visibleChildren.map((child, index) => (
        <div
          key={index}
          className={clsx(
            'ring-2 ring-gray-900',
            index > 0 && '-ml-3'
          )}
          style={{ zIndex: visibleChildren.length - index }}
        >
          {child}
        </div>
      ))}
      
      {remainingCount > 0 && (
        <div
          className={clsx(
            'flex items-center justify-center -ml-3',
            'bg-white/20 text-white font-semibold',
            'ring-2 ring-gray-900',
            {
              'w-6 h-6 text-xs rounded-full': size === 'xs',
              'w-8 h-8 text-xs rounded-full': size === 'sm',
              'w-10 h-10 text-sm rounded-full': size === 'md',
              'w-12 h-12 text-base rounded-full': size === 'lg',
              'w-16 h-16 text-xl rounded-full': size === 'xl',
              'w-24 h-24 text-3xl rounded-full': size === '2xl',
            }
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
}
