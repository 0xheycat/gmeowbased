/**
 * Reusable UI Components - Tailwick v2.0 Patterns
 * Based on planning/template/gmeowbasedv0.3/Nextjs-TS/ (Tailwick v2.0)
 * 
 * These components follow the 5-template strategy:
 * 1. Gmeowbased v0.3 (Tailwick v2.0) - Component patterns, CSS classes ⭐ PRIMARY
 * 2. Gmeowbased v0.1 - Assets (55 SVG icons, illustrations) ⭐ PRIMARY ASSETS
 * 3-5. ProKit Flutter - UI/UX inspiration only (NOT code)
 * 
 * ❌ NEVER use old foundation UI/UX/CSS
 * ✅ Reuse old foundation APIs/logic (frame API, utilities, hooks)
 */

import Image from 'next/image'
import type { FC, ReactNode } from 'react'

// ========================================
// CARD COMPONENT (Tailwick pattern)
// ========================================

export type CardProps = {
  children: ReactNode
  className?: string
  hover?: boolean
  gradient?: 'purple' | 'blue' | 'orange' | 'green' | 'pink' | 'cyan'
  border?: boolean
}

export function Card({ children, className = '', hover = false, gradient, border = true }: CardProps) {
  // Use Tailwind utilities - Tailwick v2.0 pattern
  const gradientClasses = {
    purple: 'bg-gradient-to-br from-purple-900/60 via-purple-800/40 to-purple-900/60',
    blue: 'bg-gradient-to-br from-blue-900/60 via-blue-800/40 to-blue-900/60',
    orange: 'bg-gradient-to-br from-orange-900/60 via-orange-800/40 to-orange-900/60',
    green: 'bg-gradient-to-br from-green-900/60 via-green-800/40 to-green-900/60',
    pink: 'bg-gradient-to-br from-pink-900/60 via-pink-800/40 to-pink-900/60',
    cyan: 'bg-gradient-to-br from-cyan-900/60 via-cyan-800/40 to-cyan-900/60',
  }

  return (
    <div
      className={`
        rounded-lg border backdrop-blur-sm
        ${gradient ? gradientClasses[gradient] : 'theme-bg-overlay'}
        ${border ? 'theme-border-default' : 'border-transparent'}
        ${hover ? 'transition-all hover:-translate-y-1 hover:shadow-xl' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`p-6 ${className}`}>{children}</div>
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`p-6 pb-0 ${className}`}>{children}</div>
}

export function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`p-6 pt-4 border-t theme-border-subtle ${className}`}>{children}</div>
}

// ========================================
// STATS CARD COMPONENT (Tailwick pattern)
// ========================================

export type StatsCardProps = {
  icon: string // SVG icon path from Gmeowbased v0.1
  iconAlt: string
  label: string
  value: string | number
  gradient?: CardProps['gradient']
  loading?: boolean
}

export function StatsCard({ icon, iconAlt, label, value, gradient = 'purple', loading = false }: StatsCardProps) {
  return (
    <Card gradient={gradient}>
      <CardBody>
        <div className="flex items-center gap-4">
          <Image src={icon} alt={iconAlt} width={48} height={48} className="w-12 h-12" />
          <div>
            <div className="text-sm theme-text-secondary">{label}</div>
            {loading ? (
              <div className="h-8 w-24 theme-bg-subtle rounded animate-pulse mt-1" />
            ) : (
              <div className="text-3xl font-bold theme-text-primary">{value}</div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

// ========================================
// BUTTON COMPONENT (Tailwick pattern)
// ========================================

export type ButtonProps = {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  icon?: string // Optional icon path
}

export function Button({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  className = '',
  icon,
}: ButtonProps) {
  // Use Tailwind utilities - Tailwick v2.0 pattern
  const variantClasses = {
    primary: 'bg-primary hover:bg-primary/90 text-white border-primary',
    secondary: 'bg-secondary hover:bg-secondary/90 text-white border-secondary',
    success: 'bg-success hover:bg-success/90 text-white border-success',
    danger: 'bg-danger hover:bg-danger/90 text-white border-danger',
    ghost: 'bg-transparent hover:bg-white/10 text-white border-white/20',
  }

  const sizeClasses = {
    sm: 'px-3.5 py-1.5 text-xs',
    md: 'px-4 py-1.75 text-sm',
    lg: 'px-5 py-3 text-base',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2
        rounded border font-medium transition-all
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${loading ? 'opacity-70 cursor-wait' : ''}
        ${className}
      `}
    >
      {loading && (
        <div className="w-5 h-5 border-2 theme-border-subtle border-t-primary rounded-full animate-spin" />
      )}
      {icon && !loading && (
        <Image src={icon} alt="" width={20} height={20} className="w-5 h-5" />
      )}
      {children}
    </button>
  )
}

// ========================================
// BADGE COMPONENT (Tailwick pattern)
// ========================================

export type BadgeProps = {
  children: ReactNode
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ children, variant = 'primary', size = 'md', className = '' }: BadgeProps) {
  const variants = {
    primary: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    success: 'bg-green-500/20 text-green-300 border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    danger: 'bg-red-500/20 text-red-300 border-red-500/30',
    info: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  }

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium border
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
    >
      {children}
    </span>
  )
}

// ========================================
// SECTION HEADING (Tailwick pattern)
// ========================================

export type SectionHeadingProps = {
  title: string
  subtitle?: string
  centered?: boolean
  className?: string
}

export function SectionHeading({ title, subtitle, centered = true, className = '' }: SectionHeadingProps) {
  return (
    <div className={`mb-12 ${centered ? 'text-center' : ''} ${className}`}>
      <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-4">
        {title}
      </h2>
      {subtitle && (
        <p className="text-xl theme-text-secondary max-w-3xl mx-auto">
          {subtitle}
        </p>
      )}
    </div>
  )
}

// ========================================
// ICON WITH BADGE (Common pattern)
// ========================================

export type IconWithBadgeProps = {
  icon: string
  iconAlt: string
  iconSize?: number
  badge?: {
    content: string | number
    variant?: BadgeProps['variant']
  }
}

export function IconWithBadge({ icon, iconAlt, iconSize = 80, badge }: IconWithBadgeProps) {
  return (
    <div className="relative inline-block">
      <Image
        src={icon}
        alt={iconAlt}
        width={iconSize}
        height={iconSize}
        className={`w-${iconSize/4} h-${iconSize/4} drop-shadow-lg`}
      />
      {badge && (
        <div className="absolute -top-2 -right-2">
          <Badge variant={badge.variant}>
            {badge.content}
          </Badge>
        </div>
      )}
    </div>
  )
}

// ========================================
// LOADING SKELETON (Common pattern)
// ========================================

export function LoadingSkeleton({ className = 'h-8 w-full' }: { className?: string }) {
  return (
    <div className={`theme-bg-subtle rounded animate-pulse ${className}`} />
  )
}

// ========================================
// EMPTY STATE (Common pattern)
// ========================================

export type EmptyStateProps = {
  icon: string
  iconAlt: string
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, iconAlt, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <Image
        src={icon}
        alt={iconAlt}
        width={64}
        height={64}
        className="w-16 h-16 mx-auto mb-4 opacity-50"
      />
      <h3 className="text-xl font-bold theme-text-primary mb-2">{title}</h3>
      {description && (
        <p className="theme-text-secondary mb-6 max-w-md mx-auto">{description}</p>
      )}
      {action && (
        <div className="mt-6">{action}</div>
      )}
    </div>
  )
}
