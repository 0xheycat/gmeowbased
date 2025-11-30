/**
 * BaseIdentity Component
 * 
 * OnchainKit Identity component with Tailwick v2.0 styling
 * Reuses OnchainKit Identity patterns with Gmeowbased v0.1 icons
 * 
 * Features:
 * - User avatar (from OnchainKit)
 * - Display name / ENS
 * - Address with copy button
 * - Badge indicators
 * - Tailwick v2.0 Card styling
 * 
 * @example
 * <BaseIdentity address="0x1234..." showBadges />
 */

'use client'

import { type FC } from 'react'
import { 
  Identity,
  Avatar,
  Name,
  Address,
  Badge,
} from '@coinbase/onchainkit/identity'
import { type Address as AddressType } from 'viem'
import { Card, CardBody } from '../ui/tailwick-primitives'
import { formatAddress } from '@/lib/base-helpers'

export type BaseIdentityProps = {
  /** User wallet address */
  address: AddressType
  /** Show badges (verified, etc.) */
  showBadges?: boolean
  /** Show full address or shortened */
  shortenAddress?: boolean
  /** Card variant */
  variant?: 'default' | 'compact' | 'detailed'
  /** Custom className */
  className?: string
}

/**
 * BaseIdentity Component (Compact Variant)
 * Shows avatar + name only
 */
export function BaseIdentityCompact({ address, className = '' }: { address: AddressType; className?: string }) {
  return (
    <Identity
      address={address}
      className={`flex items-center gap-2 ${className}`}
      schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
    >
      <Avatar 
        address={address}
        className="w-8 h-8 rounded-full"
      />
      <Name 
        address={address}
        className="font-medium theme-text-primary text-sm"
      />
    </Identity>
  )
}

/**
 * BaseIdentity Component (Default Variant)
 * Shows avatar + name + address
 */
export function BaseIdentityDefault({ 
  address, 
  showBadges = false,
  shortenAddress = true,
  className = '' 
}: BaseIdentityProps) {
  return (
    <Card className={className}>
      <CardBody>
        <Identity
          address={address}
          className="flex items-center gap-4"
          schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
        >
          <Avatar 
            address={address}
            className="w-12 h-12 rounded-full border-2 theme-border-default"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Name 
                address={address}
                className="font-semibold theme-text-primary text-base"
              />
              {showBadges && (
                <Badge 
                  className="inline-flex"
                />
              )}
            </div>
            <Address
              address={address}
              className="text-sm theme-text-secondary font-mono mt-1"
            />
          </div>
        </Identity>
      </CardBody>
    </Card>
  )
}

/**
 * BaseIdentity Component (Detailed Variant)
 * Shows full identity with stats and badges
 */
export function BaseIdentityDetailed({ 
  address, 
  className = '' 
}: { address: AddressType; className?: string }) {
  return (
    <Card gradient="purple" className={className}>
      <CardBody className="space-y-4">
        {/* Avatar + Name Section */}
        <Identity
          address={address}
          className="flex items-center gap-4"
          schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
        >
          <Avatar 
            address={address}
            className="w-16 h-16 rounded-full border-2 theme-border-default shadow-lg"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Name 
                address={address}
                className="font-bold theme-text-primary text-lg"
              />
              <Badge className="inline-flex" />
            </div>
            <Address
              address={address}
              className="text-sm theme-text-secondary font-mono"
            />
          </div>
        </Identity>

        {/* Divider */}
        <div className="border-t theme-border-subtle" />

        {/* Stats Section */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold theme-text-primary">0</div>
            <div className="text-xs theme-text-secondary">GMs</div>
          </div>
          <div>
            <div className="text-2xl font-bold theme-text-primary">0</div>
            <div className="text-xs theme-text-secondary">Badges</div>
          </div>
          <div>
            <div className="text-2xl font-bold theme-text-primary">0</div>
            <div className="text-xs theme-text-secondary">Points</div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

/**
 * Main BaseIdentity Component
 * Renders based on variant prop
 */
const BaseIdentity: FC<BaseIdentityProps> = ({ 
  address, 
  variant = 'default',
  showBadges = false,
  shortenAddress = true,
  className = '' 
}) => {
  switch (variant) {
    case 'compact':
      return <BaseIdentityCompact address={address} className={className} />
    case 'detailed':
      return <BaseIdentityDetailed address={address} className={className} />
    case 'default':
    default:
      return (
        <BaseIdentityDefault
          address={address}
          showBadges={showBadges}
          shortenAddress={shortenAddress}
          className={className}
        />
      )
  }
}

export default BaseIdentity
