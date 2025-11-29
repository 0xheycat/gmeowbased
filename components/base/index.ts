/**
 * Base.dev Components - OnchainKit Integration
 * 
 * Export all Base.dev components for easy importing
 * 
 * @example
 * import { BaseIdentity, BaseWallet, PostGMButton } from '@/components/base'
 */

// Identity Components
export {
  default as BaseIdentity,
  BaseIdentityCompact,
  BaseIdentityDefault,
  BaseIdentityDetailed,
  type BaseIdentityProps,
} from './BaseIdentity'

// Transaction Components
export {
  PostGMButton,
  MintBadgeButton,
  type PostGMButtonProps,
  type MintBadgeButtonProps,
} from './BaseTransaction'

// Wallet Components
export {
  default as BaseWallet,
  BaseWalletButton,
  BaseWalletDropdown,
  BaseWalletCompact,
  BaseWalletFull,
  type BaseWalletButtonProps,
  type BaseWalletDropdownProps,
  type BaseWalletFullProps,
} from './BaseWallet'
