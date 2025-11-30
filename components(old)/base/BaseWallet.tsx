/**
 * BaseWallet Component
 * 
 * OnchainKit Wallet component with Tailwick v2.0 styling
 * Reuses wallet patterns with enhanced UI/UX
 * 
 * Features:
 * - OnchainKit Wallet, ConnectWallet, WalletDropdown
 * - Connect button for navigation
 * - Account display with avatar
 * - Network switching
 * - Tailwick v2.0 Button styling
 * 
 * @example
 * <BaseWalletButton />
 * <BaseWalletDropdown />
 */

'use client'

import { type FC, useState, useEffect } from 'react'
import {
  Wallet,
  ConnectWallet,
  WalletDropdown,
  WalletDropdownBasename,
  WalletDropdownDisconnect,
  WalletDropdownLink,
} from '@coinbase/onchainkit/wallet'
import { 
  Avatar,
  Name,
  Address,
} from '@coinbase/onchainkit/identity'
import { useAccount } from 'wagmi'
import { Button } from '../ui/tailwick-primitives'
import { formatAddress } from '@/lib/base-helpers'

// ========================================
// CONNECT WALLET BUTTON (Simple)
// ========================================

export type BaseWalletButtonProps = {
  /** Button text when disconnected */
  connectText?: string
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost'
  /** Button size */
  size?: 'sm' | 'md' | 'lg'
  /** Custom className */
  className?: string
}

export function BaseWalletButton({
  connectText = 'Connect Wallet',
  variant = 'primary',
  size = 'md',
  className = '',
}: BaseWalletButtonProps) {
  const { address, isConnected } = useAccount()

  const variantClasses = {
    primary: 'bg-primary hover:bg-primary/90 text-white border-primary',
    secondary: 'bg-secondary hover:bg-secondary/90 text-white border-secondary',
    ghost: 'bg-transparent hover:bg-white/10 text-white border-white/20',
  }

  const sizeClasses = {
    sm: 'px-3.5 py-1.5 text-xs',
    md: 'px-4 py-1.75 text-sm',
    lg: 'px-5 py-3 text-base',
  }

  return (
    <Wallet>
      <ConnectWallet
        className={`
          inline-flex items-center justify-center gap-2
          rounded border font-medium transition-all
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
      >
        <div className="flex items-center gap-2">
          {isConnected && address ? (
            <>
              <Avatar 
                address={address}
                className="w-5 h-5 rounded-full"
              />
              <span className="hidden sm:inline">
                {formatAddress(address)}
              </span>
            </>
          ) : (
            <span>{connectText}</span>
          )}
        </div>
      </ConnectWallet>
    </Wallet>
  )
}

// ========================================
// WALLET DROPDOWN (Full Featured)
// ========================================

export type BaseWalletDropdownProps = {
  /** Show Basename (ENS) option */
  showBasename?: boolean
  /** Custom disconnect text */
  disconnectText?: string
  /** Custom className */
  className?: string
}

export function BaseWalletDropdown({
  showBasename = true,
  disconnectText = 'Disconnect',
  className = '',
}: BaseWalletDropdownProps) {
  const { address, isConnected } = useAccount()

  if (!isConnected || !address) {
    return <BaseWalletButton />
  }

  return (
    <Wallet>
      <ConnectWallet
        className={`
          inline-flex items-center justify-center gap-2
          rounded border font-medium transition-all
          px-4 py-1.75 text-sm
          bg-primary hover:bg-primary/90 text-white border-primary
          ${className}
        `}
      >
        <div className="flex items-center gap-2">
          <Avatar 
            address={address}
            className="w-5 h-5 rounded-full"
          />
          <Name 
            address={address}
            className="hidden sm:inline font-medium"
          />
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </ConnectWallet>
      
      <WalletDropdown
        className="
          mt-2 min-w-[280px] rounded-lg border backdrop-blur-sm
          theme-bg-overlay theme-border-default
          shadow-xl overflow-hidden
        "
      >
        {/* User Info */}
        <div className="p-4 border-b theme-border-subtle">
          <div className="flex items-center gap-3">
            <Avatar 
              address={address}
              className="w-12 h-12 rounded-full border-2 theme-border-default"
            />
            <div className="flex-1 min-w-0">
              <Name 
                address={address}
                className="font-semibold theme-text-primary block mb-1"
              />
              <Address
                address={address}
                className="text-sm theme-text-secondary font-mono"
              />
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="py-2">
          {showBasename && (
            <WalletDropdownBasename
              className="
                flex items-center gap-2 px-4 py-2.5
                hover:theme-bg-subtle transition-colors
                theme-text-primary text-sm
              "
            />
          )}
          
          <WalletDropdownLink
            icon="wallet"
            href="/profile"
            className="
              flex items-center gap-2 px-4 py-2.5
              hover:theme-bg-subtle transition-colors
              theme-text-primary text-sm
            "
          >
            View Profile
          </WalletDropdownLink>

          <WalletDropdownLink
            icon="wallet"
            href="/badges"
            className="
              flex items-center gap-2 px-4 py-2.5
              hover:theme-bg-subtle transition-colors
              theme-text-primary text-sm
            "
          >
            My Badges
          </WalletDropdownLink>
        </div>

        {/* Disconnect */}
        <div className="border-t theme-border-subtle p-2">
          <WalletDropdownDisconnect
            className="
              w-full flex items-center gap-2 px-4 py-2.5
              hover:theme-bg-subtle transition-colors
              theme-text-danger text-sm rounded
            "
          />
        </div>
      </WalletDropdown>
    </Wallet>
  )
}

// ========================================
// COMPACT WALLET (For Header/Nav)
// ========================================

export function BaseWalletCompact({ className = '' }: { className?: string }) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Don't render wallet UI during SSR to avoid hydration mismatch
  if (!isMounted) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-10 w-full rounded-lg bg-slate-800/50 animate-pulse" />
      </div>
    )
  }

  return <BaseWalletCompactClient className={className} />
}

// Client-only component that uses wagmi hooks
function BaseWalletCompactClient({ className = '' }: { className?: string }) {
  const { address, isConnected } = useAccount()

  return (
    <Wallet>
      <ConnectWallet
        className={`
          inline-flex items-center justify-center gap-2
          rounded-full border font-medium transition-all
          px-3 py-2 text-sm
          bg-primary/10 hover:bg-primary/20 text-primary border-primary/30
          ${className}
        `}
      >
        {isConnected && address ? (
          <div className="flex items-center gap-2">
            <Avatar 
              address={address}
              className="w-6 h-6 rounded-full"
            />
            <span className="font-mono text-xs hidden sm:inline">
              {formatAddress(address)}
            </span>
          </div>
        ) : (
          <span>Connect</span>
        )}
      </ConnectWallet>
    </Wallet>
  )
}

// ========================================
// FULL WALLET (With Balance)
// ========================================

export type BaseWalletFullProps = {
  /** Show balance */
  showBalance?: boolean
  /** Custom className */
  className?: string
}

export function BaseWalletFull({
  showBalance = true,
  className = '',
}: BaseWalletFullProps) {
  const { address, isConnected } = useAccount()

  if (!isConnected || !address) {
    return (
      <div className={`
        rounded-lg border backdrop-blur-sm p-6
        theme-bg-overlay theme-border-default
        text-center
        ${className}
      `}>
        <div className="mb-4">
          <svg
            className="w-16 h-16 mx-auto theme-text-secondary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold theme-text-primary mb-2">
          Connect Your Wallet
        </h3>
        <p className="text-sm theme-text-secondary mb-4">
          Connect your wallet to start earning badges and posting GMs
        </p>
        <BaseWalletButton size="lg" />
      </div>
    )
  }

  return (
    <div className={`
      rounded-lg border backdrop-blur-sm
      theme-bg-overlay theme-border-default
      ${className}
    `}>
      <div className="p-6">
        {/* Avatar + Identity */}
        <div className="flex items-center gap-4 mb-6">
          <Avatar 
            address={address}
            className="w-16 h-16 rounded-full border-2 theme-border-default"
          />
          <div className="flex-1 min-w-0">
            <Name 
              address={address}
              className="font-bold theme-text-primary text-lg block mb-1"
            />
            <Address
              address={address}
              className="text-sm theme-text-secondary font-mono"
            />
          </div>
        </div>

        {/* Balance (if enabled) */}
        {showBalance && (
          <div className="border-t theme-border-subtle pt-4">
            <div className="text-sm theme-text-secondary mb-1">Balance</div>
            <div className="text-2xl font-bold theme-text-primary">
              0.00 ETH
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t theme-border-subtle p-4 flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => window.open('/profile', '_self')}
        >
          View Profile
        </Button>
        <BaseWalletDropdown />
      </div>
    </div>
  )
}

// ========================================
// EXPORTS
// ========================================

const BaseWallet = {
  Button: BaseWalletButton,
  Dropdown: BaseWalletDropdown,
  Compact: BaseWalletCompact,
  Full: BaseWalletFull,
}

export default BaseWallet
