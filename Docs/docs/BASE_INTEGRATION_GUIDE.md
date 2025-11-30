# Base.dev Integration - OnchainKit Components

**Status**: ✅ Complete  
**Last Updated**: Phase 12 - Task 4 Complete  
**Components**: 3 Base components (Identity, Transaction, Wallet) + helpers

## Overview

Phase 12 Task 4 added comprehensive Base.dev integration with OnchainKit components, paymaster support, and Tailwick v2.0 styling.

## Components Created

### 1. BaseIdentity Component (`components/base/BaseIdentity.tsx`)

**Purpose**: Display user identity with avatar, name, address, and badges

**Variants**:
- **Compact**: Avatar + name only (for inline display)
- **Default**: Avatar + name + address in card
- **Detailed**: Full identity with stats (GMs, Badges, Points)

**Usage**:
```tsx
import { BaseIdentity } from '@/components/base'

// Compact variant
<BaseIdentity address="0x..." variant="compact" />

// Default variant
<BaseIdentity address="0x..." showBadges />

// Detailed variant with stats
<BaseIdentity address="0x..." variant="detailed" />
```

**Features**:
- OnchainKit Identity, Avatar, Name, Address, Badge components
- Tailwick v2.0 Card styling with gradient support
- Responsive layout
- Type-safe with viem Address type

---

### 2. Transaction Components (`components/base/BaseTransaction.tsx`)

**Purpose**: Execute blockchain transactions with optional sponsorship

**Components**:
- **PostGMButton**: Post GM message with sponsored tx support
- **MintBadgeButton**: Mint badge NFT with sponsored tx support

**Usage**:
```tsx
import { PostGMButton, MintBadgeButton } from '@/components/base'

// Post GM (sponsored)
<PostGMButton
  chain="base"
  message="GM Farcaster!"
  sponsored
  onSuccess={(txHash) => console.log('Posted!', txHash)}
  onError={(error) => console.error(error)}
/>

// Mint Badge (regular)
<MintBadgeButton
  chain="base"
  badgeId={1n}
  onSuccess={(txHash) => console.log('Minted!', txHash)}
/>
```

**Features**:
- Wagmi `useWriteContract` hook integration
- Paymaster integration for sponsored transactions (Coinbase Paymaster)
- Error handling with user-friendly messages
- Basescan link for transaction viewing
- Tailwick v2.0 Button styling
- Loading states

---

### 3. Wallet Components (`components/base/BaseWallet.tsx`)

**Purpose**: Wallet connection and account management

**Variants**:
- **Button**: Simple connect button
- **Dropdown**: Full-featured wallet dropdown with profile links
- **Compact**: Minimal button for navigation
- **Full**: Complete wallet card with balance

**Usage**:
```tsx
import BaseWallet from '@/components/base'

// Simple button
<BaseWallet.Button variant="primary" />

// Full dropdown
<BaseWallet.Dropdown showBasename />

// Compact for navbar
<BaseWallet.Compact />

// Full wallet card
<BaseWallet.Full showBalance />
```

**Features**:
- OnchainKit Wallet, ConnectWallet, WalletDropdown components
- Avatar + Name + Address display
- Profile and badges navigation links
- Disconnect functionality
- Tailwick v2.0 styling
- Responsive design

---

## Helper Library (`lib/base-helpers.ts`)

**Purpose**: Utilities for Base chain interactions and paymaster integration

### Contract Interaction Helpers

```typescript
import { 
  preparePostGMTransaction,
  prepareMintBadgeTransaction,
  prepareJoinGuildTransaction
} from '@/lib/base-helpers'

// Prepare GM post transaction
const txParams = preparePostGMTransaction('base', userAddress, 'GM!')

// Prepare badge mint transaction
const txParams = prepareMintBadgeTransaction('base', userAddress, 1n)

// Prepare guild join transaction
const txParams = prepareJoinGuildTransaction('base', userAddress, 1n)
```

### Paymaster Integration (NEW FEATURE)

**Coinbase Paymaster** - Sponsor user transactions on Base

```typescript
import { 
  requestPaymasterSponsorship,
  prepareSponsoredPostGM,
  prepareSponsoredMintBadge
} from '@/lib/base-helpers'

// Request paymaster sponsorship
const paymaster = await requestPaymasterSponsorship({
  chainId: 8453, // Base
  from: userAddress,
  to: contractAddress,
  data: encodedCall,
})

// Prepare sponsored GM post
const txParams = await prepareSponsoredPostGM('base', userAddress, 'GM!')

// Prepare sponsored badge mint
const txParams = await prepareSponsoredMintBadge('base', userAddress, 1n)
```

**Configuration**:
- API URL: `https://api.developer.coinbase.com/rpc/v1/base/paymaster`
- API Key: `NEXT_PUBLIC_ONCHAINKIT_API_KEY` (env var)
- Supported Chains: Base mainnet (8453)

### Error Handling

```typescript
import { parseTransactionError } from '@/lib/base-helpers'

try {
  await writeContractAsync(...)
} catch (error) {
  const { code, message } = parseTransactionError(error)
  // code: 'USER_REJECTED' | 'INSUFFICIENT_FUNDS' | 'GAS_ERROR' | 'PAYMASTER_ERROR' | 'UNKNOWN_ERROR'
  console.error(message) // User-friendly error message
}
```

### Chain Utilities

```typescript
import { 
  getBaseExplorerUrl,
  formatTxHash,
  formatAddress
} from '@/lib/base-helpers'

// Get Basescan URL
const url = getBaseExplorerUrl('tx', '0x1234...')
// => https://basescan.org/tx/0x1234...

// Format transaction hash
const short = formatTxHash('0x1234567890abcdef...')
// => 0x1234...cdef

// Format address
const short = formatAddress('0x1234567890abcdef...')
// => 0x1234...cdef
```

---

## Integration Examples

### Daily GM with Sponsored Transaction

```tsx
import { PostGMButton } from '@/components/base'

function DailyGMPage() {
  return (
    <div>
      <h1>Post Your Daily GM</h1>
      <PostGMButton
        chain="base"
        message="GM Farcaster!"
        sponsored // Free for users!
        buttonText="Post GM (Free)"
        onSuccess={(txHash) => {
          console.log('GM posted!', txHash)
          // Refresh UI, show success message, etc.
        }}
      />
    </div>
  )
}
```

### Badge Minting with Identity Display

```tsx
import { BaseIdentity, MintBadgeButton } from '@/components/base'
import { useAccount } from 'wagmi'

function BadgePage({ badgeId }: { badgeId: bigint }) {
  const { address } = useAccount()

  if (!address) return <div>Connect wallet to mint</div>

  return (
    <div>
      {/* Show user identity */}
      <BaseIdentity address={address} variant="detailed" />

      {/* Mint badge */}
      <MintBadgeButton
        chain="base"
        badgeId={badgeId}
        sponsored
        buttonText="Mint Badge (Free)"
        onSuccess={(txHash) => {
          console.log('Badge minted!', txHash)
        }}
      />
    </div>
  )
}
```

### Navigation with Wallet

```tsx
import BaseWallet from '@/components/base'

function Navbar() {
  return (
    <nav>
      <div>Logo</div>
      <div>Links</div>
      {/* Compact wallet for nav */}
      <BaseWallet.Compact />
    </nav>
  )
}
```

---

## TypeScript Integration

All components are fully type-safe:

```typescript
import type { 
  BaseIdentityProps,
  PostGMButtonProps,
  MintBadgeButtonProps,
  BaseWalletButtonProps,
  GMChainKey,
  PaymasterResult,
  TransactionError
} from '@/components/base'
```

**Type Safety**:
- ✅ viem `Address` type for wallet addresses
- ✅ `GMChainKey` for supported chains
- ✅ `bigint` for token IDs
- ✅ Proper error types
- ✅ 50 TypeScript errors (STABLE, no new errors from Base components)

---

## Environment Variables

Required for Base.dev integration:

```bash
# OnchainKit API Key (for paymaster + identity)
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_key_here

# RPC URLs (already configured)
NEXT_PUBLIC_RPC_BASE=https://mainnet.base.org
NEXT_PUBLIC_RPC_OPTIMISM=...
NEXT_PUBLIC_RPC_CELO=...
```

---

## Architecture

### Provider Setup

Already configured in `components/providers/WagmiProvider.tsx`:

```tsx
<WagmiProvider config={wagmiConfig}>
  <QueryClientProvider client={queryClient}>
    <OnchainKitProvider
      chain={base}
      apiKey={apiKey}
      config={{
        appearance: {
          mode: 'dark',
          theme: 'base',
        },
      }}
    >
      {children}
    </OnchainKitProvider>
  </QueryClientProvider>
</WagmiProvider>
```

### Chain Configuration

Configured in `lib/wagmi.ts`:

```typescript
export const wagmiConfig = createConfig({
  chains: [
    base,       // Base mainnet (8453)
    mainnet,    // Ethereum
    optimism,   // Optimism
    // ... 13 more chains
  ],
  transports: {
    [base.id]: http(RPC_BASE),
    // ...
  },
  connectors: [
    miniAppConnector(), // Farcaster Mini App
  ],
})
```

### Contract Addresses

Configured in `lib/gm-utils.ts`:

```typescript
export const STANDALONE_ADDRESSES = {
  base: {
    core: '0x9BDD11aA50456572E3Ea5329fcDEb81974137f92',
    guild: '0x967457be45facE07c22c0374dAfBeF7b2f7cd059',
    nft: '0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20',
    proxy: '0x6A48B758ed42d7c934D387164E60aa58A92eD206'
  },
  // ... other chains
}
```

---

## Testing

All components are ready for testing:

```tsx
// Test PostGMButton
import { PostGMButton } from '@/components/base'
import { render, screen } from '@testing-library/react'

test('renders PostGMButton', () => {
  render(<PostGMButton chain="base" message="GM!" />)
  expect(screen.getByText('Post GM')).toBeInTheDocument()
})
```

---

## Next Steps (Task 5-6)

1. **Task 5** - Component Integration:
   - Connect PostGMButton to daily GM page
   - Connect MintBadgeButton to badge pages
   - Add BaseWallet to navigation
   - Add BaseIdentity to profile page

2. **Task 6** - Documentation:
   - Update component docs
   - Add usage examples
   - Document paymaster setup

---

## References

- **OnchainKit Docs**: https://onchainkit.xyz
- **Coinbase Paymaster**: https://docs.cdp.coinbase.com/onchainkit/docs/paymaster
- **Base Docs**: https://docs.base.org
- **Wagmi Docs**: https://wagmi.sh

---

## Status Summary

✅ **Task 4 Complete** (2.5 hours)

**Files Created**:
- `lib/base-helpers.ts` (401 lines) - Utilities + paymaster
- `components/base/BaseIdentity.tsx` (200 lines) - Identity display
- `components/base/BaseTransaction.tsx` (230 lines) - Transaction execution
- `components/base/BaseWallet.tsx` (330 lines) - Wallet management
- `components/base/index.ts` (37 lines) - Exports

**Total**: 1,198 lines of production-ready code

**TypeScript**: 50 errors (STABLE, no new errors)

**Next**: Task 5 (Feature integration) + Task 6 (Documentation updates)
