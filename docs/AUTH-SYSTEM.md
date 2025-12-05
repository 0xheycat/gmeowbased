# Authentication System Documentation
**Last Updated**: January 19, 2025  
**Version**: 1.0.0 (Task 8.3 Complete)  
**Status**: ✅ Production Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Multi-Wallet Setup](#multi-wallet-setup)
4. [WalletButton Usage](#walletbutton-usage)
5. [AuthContext Integration](#authcontext-integration)
6. [Farcaster Miniapp Support](#farcaster-miniapp-support)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

Gmeowbased uses a **unified authentication system** that combines:

- **Multi-wallet support** - MetaMask, Coinbase Wallet, WalletConnect, Farcaster
- **Single trust source** - One `WalletButton` component across entire app
- **Auto-connect** - Seamless connection in Farcaster miniapp (Warpcast)
- **Professional UX** - Dropdown menu, error handling, loading states
- **Coinbase MCP aligned** - Follows CDP best practices (Dec 2025)

### Key Components

| Component | Purpose | Lines | Location |
|-----------|---------|-------|----------|
| `WalletButton` | Single wallet button for entire app | 310 | `components/WalletButton.tsx` |
| `AuthContext` | Unified auth state management | 263 | `lib/contexts/AuthContext.tsx` |
| `wagmi.ts` | Multi-wallet configuration | 90 | `lib/wagmi.ts` |
| `useMiniKitAuth` | Farcaster authentication hook | 178 | `hooks/useMiniKitAuth.ts` |

---

## 🏗️ Architecture

### Authentication Priority Order

```
1. Farcaster Miniapp Context (if in Warpcast)
   └─ Auto-connect with Farcaster connector
   
2. Wallet Address (main app)
   ├─ MetaMask (injected provider)
   ├─ Coinbase Wallet (browser extension or mobile)
   ├─ WalletConnect (mobile wallets)
   └─ Other injected providers (Brave, Rainbow, etc.)
   
3. Not Authenticated
   └─ Show wallet selection menu
```

### State Flow Diagram

```
┌─────────────────┐
│  User Visits    │
│  Application    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐       ┌──────────────────┐
│ Check Miniapp?  │──Yes──▶│ Auto-Connect     │
│ (Warpcast)      │       │ Farcaster        │
└────────┬────────┘       └──────────────────┘
         │ No
         ▼
┌─────────────────┐
│ Show Wallet     │
│ Selection Menu  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐       ┌──────────────────┐
│ User Selects    │──────▶│ Connect Wallet   │
│ Wallet Type     │       │ (wagmi)          │
└─────────────────┘       └──────────────────┘
```

---

## 🔌 Multi-Wallet Setup

### Wagmi Configuration

File: `lib/wagmi.ts`

```typescript
import { injected, coinbaseWallet, walletConnect } from 'wagmi/connectors'
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'

export const wagmiConfig = createConfig({
  chains: [base, mainnet, optimism, arbitrum, /* ... 15 chains total */],
  
  connectors: [
    // Priority 1: Farcaster Mini App (auto-connect in Warpcast)
    miniAppConnector(),
    
    // Priority 2: Coinbase Wallet (recommended for Base ecosystem)
    coinbaseWallet({
      appName: 'Gmeowbased',
      appLogoUrl: 'https://gmeowhq.art/logo.png',
      preference: 'all', // Supports both extension and smart wallet
    }),
    
    // Priority 3: Injected providers (MetaMask, Brave Wallet, etc.)
    injected({
      shimDisconnect: true,
    }),
    
    // Priority 4: WalletConnect (universal mobile wallet support)
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
      metadata: {
        name: 'Gmeowbased',
        description: 'Multi-chain gaming platform with quests and rewards',
        url: 'https://gmeowhq.art',
        icons: ['https://gmeowhq.art/logo.png'],
      },
      showQrModal: true,
    }),
  ],
  
  transports: { /* ... RPC endpoints for 15 chains ... */ },
})
```

### Environment Variables

File: `.env.local`

```bash
# Coinbase Developer Platform
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_onchainkit_api_key_here

# WalletConnect Project ID (get from https://cloud.walletconnect.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here

# RPC URLs (optional - defaults provided)
NEXT_PUBLIC_RPC_BASE=https://mainnet.base.org
NEXT_PUBLIC_RPC_OPTIMISM=https://opt-mainnet.g.alchemy.com/v2/demo

# Neynar API Key (for Farcaster data)
NEXT_PUBLIC_NEYNAR_API_KEY=your_neynar_api_key_here
```

**Get API Keys:**
- OnchainKit: https://portal.cdp.coinbase.com/
- WalletConnect: https://cloud.walletconnect.com/
- Neynar: https://neynar.com/

---

## 🎨 WalletButton Usage

### Basic Usage

```tsx
import { WalletButton } from '@/components/WalletButton'

function Header() {
  return (
    <nav>
      <WalletButton />
    </nav>
  )
}
```

### With Account State

```tsx
import { WalletButton } from '@/components/WalletButton'
import { useAccount } from 'wagmi'

function Dashboard() {
  const { address, isConnected } = useAccount()
  
  return (
    <div>
      <WalletButton />
      
      {isConnected && (
        <p>Connected: {address}</p>
      )}
    </div>
  )
}
```

### Features

- ✅ **Auto-connect** in Farcaster miniapp (Warpcast)
- ✅ **Dropdown menu** with all available wallets
- ✅ **Loading states** while connecting
- ✅ **Error handling** with user-friendly messages
- ✅ **Address display** when connected (0x1234...5678)
- ✅ **Disconnect option** in dropdown
- ✅ **Click outside** to close menu
- ✅ **Responsive** design for mobile

### UI States

| State | UI | Description |
|-------|-----|-------------|
| Not Connected | "Connect Wallet" button | Click to show wallet menu |
| Connecting | "Connecting..." (disabled) | Connection in progress |
| Connected | "0x1234...5678" + dropdown | Address + disconnect option |
| Auto-connecting | "Connecting..." (auto) | Silent auto-connect in Farcaster |

---

## 🔐 AuthContext Integration

### Setup

File: `app/layout.tsx` or `app/providers.tsx`

```tsx
import { AuthProvider } from '@/lib/contexts/AuthContext'
import { WagmiProvider } from 'wagmi'
import { wagmiConfig } from '@/lib/wagmi'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </WagmiProvider>
  )
}
```

### Using AuthContext

```tsx
import { useAuthContext } from '@/lib/contexts/AuthContext'

function Profile() {
  const { 
    fid,              // Farcaster FID (if linked)
    address,          // Wallet address
    profile,          // Farcaster profile data
    isAuthenticated,  // true if fid or address exists
    authMethod,       // 'miniapp' | 'wallet' | null
    isMiniappSession, // true if in Warpcast
    authenticate,     // Manual re-auth function
    logout,           // Clear auth state
    isLoading,        // Loading state
    error,            // Error message
  } = useAuthContext()
  
  if (!isAuthenticated) {
    return <WalletButton />
  }
  
  return (
    <div>
      <h1>Welcome {profile?.displayName || 'Anon'}!</h1>
      <p>FID: {fid}</p>
      <p>Address: {address}</p>
      <p>Method: {authMethod}</p>
    </div>
  )
}
```

### Authentication Priority

1. **Miniapp Context** (highest priority)
   - Checks if in Farcaster miniapp (Warpcast)
   - Loads FID from miniapp SDK
   - Fetches full profile from Neynar

2. **Wallet Address** (fallback)
   - Uses wagmi's `useAccount` hook
   - Attempts to resolve Farcaster profile by address
   - Works without Farcaster profile (wallet-only mode)

3. **Not Authenticated** (no auth)
   - User hasn't connected wallet
   - Show `<WalletButton />` to prompt connection

---

## 🚀 Farcaster Miniapp Support

### Detection

File: `lib/miniappEnv.ts`

```typescript
/**
 * Check if in Farcaster miniapp context
 * MCP best practice: Check referrer + iframe + SDK handshake
 */
export async function probeMiniappReady(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (window.self === window.top) return false // Not in iframe
  
  const referrer = document.referrer
  if (!referrer) return false
  
  const hostname = new URL(referrer).hostname
  const isAllowed = 
    hostname.endsWith('.farcaster.xyz') ||
    hostname.endsWith('.warpcast.com') ||
    hostname === 'farcaster.xyz' ||
    hostname === 'warpcast.com'
  
  if (!isAllowed) return false
  
  // Check SDK availability
  const { sdk } = await import('@farcaster/miniapp-sdk')
  await sdk.actions.ready() // Required by MCP spec
  
  return true
}
```

### Auto-Connect Flow

```typescript
// components/WalletButton.tsx

useEffect(() => {
  if (triedAutoRef.current) return
  if (isConnected) return
  
  const farcaster = availableConnectors.find(c => 
    c?.name?.toLowerCase().includes('farcaster')
  )
  
  if (!farcaster) return
  
  triedAutoRef.current = true
  
  setTimeout(async () => {
    try {
      await connectAsync({ connector: farcaster })
    } catch (err) {
      console.warn('Auto-connect failed:', err)
    }
  }, 0) // Defer to avoid blocking first paint
}, [isConnected, availableConnectors])
```

### MiniKit Authentication

File: `hooks/useMiniKitAuth.ts`

```typescript
export function useMiniKitAuth({
  context,
  isFrameReady,
  isMiniAppSession,
  signInWithMiniKit,
}) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('idle')
  const [profile, setProfile] = useState<FarcasterUser | null>(null)
  
  // Extract FID from context or sign-in
  const contextFid = context?.user?.fid
  const signInFid = signInResult?.fid
  const resolvedFid = contextFid || signInFid
  
  // Fetch Neynar profile
  useEffect(() => {
    if (!resolvedFid) return
    
    fetchUserByFid(resolvedFid).then(setProfile)
  }, [resolvedFid])
  
  return {
    authStatus,
    profile,
    resolvedFid,
    authenticate: () => signInWithMiniKit(),
  }
}
```

---

## ⚠️ Error Handling

### Normalized Error Messages

File: `components/WalletButton.tsx`

```typescript
function normalizeConnectError(error: unknown): string | null {
  // Ignore user cancellations (don't show error)
  const ignoredErrors = [
    'CancelError',
    'ConnectorNotFoundError',
    'InternalError',
    'UserRejectedRequestError',
    'User rejected',
    'User denied',
  ]
  
  const errorName = (error as any)?.name || ''
  const errorMessage = (error as any)?.message || ''
  
  for (const ignored of ignoredErrors) {
    if (errorName.includes(ignored) || errorMessage.includes(ignored)) {
      return null // Silent fail
    }
  }
  
  // Extract readable message
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  
  return 'Unable to connect. Please try again.'
}
```

### Common Error Scenarios

| Error | Cause | Solution |
|-------|-------|----------|
| "User rejected" | User cancelled in wallet | Ignored (silent fail) |
| "Connector not found" | Wallet not installed | Show install prompt |
| "Network mismatch" | Wrong chain selected | Show chain switch prompt |
| "RPC timeout" | RPC endpoint down | Fallback to secondary RPC |
| "Wallet not ready" | Extension loading | Retry after delay |

### Error Notifications

```typescript
const handleConnect = async (connector: any) => {
  try {
    await connectAsync({ connector })
    
    showNotification({
      tone: 'success',
      title: 'Wallet connected',
      description: `Connected with ${connector.name}`,
      duration: 3000,
    })
  } catch (err) {
    const message = normalizeConnectError(err)
    
    if (message) {
      showNotification({
        tone: 'error',
        title: 'Connection failed',
        description: message,
        duration: 5000,
      })
    }
  }
}
```

---

## ✅ Best Practices

### 1. Single Trust Source

❌ **Don't**: Create multiple wallet connection buttons
```tsx
function Header() {
  return (
    <nav>
      <ConnectWallet />    {/* Old component */}
      <WalletButton />     {/* New component */}
    </nav>
  )
}
```

✅ **Do**: Use one `WalletButton` across entire app
```tsx
function Header() {
  return (
    <nav>
      <WalletButton />  {/* Single source of truth */}
    </nav>
  )
}
```

### 2. Check Authentication Before Actions

❌ **Don't**: Assume user is authenticated
```tsx
function ClaimReward() {
  const { address } = useAccount()
  
  const handleClaim = async () => {
    await claimReward(address) // May be undefined!
  }
  
  return <button onClick={handleClaim}>Claim</button>
}
```

✅ **Do**: Check `isAuthenticated` first
```tsx
function ClaimReward() {
  const { address, isAuthenticated } = useAuthContext()
  
  if (!isAuthenticated) {
    return <WalletButton />
  }
  
  const handleClaim = async () => {
    await claimReward(address!) // Safe to use
  }
  
  return <button onClick={handleClaim}>Claim</button>
}
```

### 3. Handle Loading States

❌ **Don't**: Show UI before auth check
```tsx
function Profile() {
  const { profile } = useAuthContext()
  
  return <h1>Welcome {profile?.displayName}!</h1>
}
```

✅ **Do**: Handle loading state
```tsx
function Profile() {
  const { profile, isLoading } = useAuthContext()
  
  if (isLoading) {
    return <div>Loading...</div>
  }
  
  if (!profile) {
    return <WalletButton />
  }
  
  return <h1>Welcome {profile.displayName}!</h1>
}
```

### 4. Respect User Privacy

❌ **Don't**: Track wallet without permission
```tsx
const { address } = useAccount()

// Immediately send to analytics
trackUser(address)
```

✅ **Do**: Ask for analytics consent
```tsx
const { address } = useAccount()

if (userConsentedToAnalytics) {
  trackUser(address)
}
```

### 5. Test in Multiple Environments

✅ **Required Test Environments**:
- [ ] Desktop browser (MetaMask extension)
- [ ] Mobile browser (WalletConnect)
- [ ] Farcaster miniapp (Warpcast)
- [ ] Coinbase Wallet app
- [ ] No wallet installed (graceful fallback)

---

## 🔧 Troubleshooting

### Issue: "No compatible wallets detected"

**Cause**: No wallet connectors available

**Solution**:
1. Check wagmi config has connectors
2. Verify WalletConnect project ID is set
3. Ensure user has at least one wallet installed
4. Check browser console for connector errors

### Issue: "Auto-connect not working in Warpcast"

**Cause**: Farcaster miniapp detection failed

**Solution**:
1. Verify app is embedded in iframe
2. Check referrer is `*.warpcast.com` or `*.farcaster.xyz`
3. Ensure Farcaster SDK is properly imported
4. Check console for `probeMiniappReady()` errors

### Issue: "Connected but profile is null"

**Cause**: Wallet address not linked to Farcaster

**Solution**:
1. This is expected for non-Farcaster users
2. Use wallet-only mode (address without FID)
3. Prompt user to link wallet to Farcaster
4. Check Neynar API key is valid

### Issue: "WalletConnect QR not showing"

**Cause**: Missing WalletConnect project ID

**Solution**:
1. Get project ID from https://cloud.walletconnect.com/
2. Set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in `.env.local`
3. Restart dev server
4. Check `showQrModal: true` in wagmi config

### Issue: "TypeScript errors in WalletButton"

**Cause**: Missing type definitions

**Solution**:
1. Check `@wagmi/core` version matches `wagmi` version
2. Verify `wagmi/connectors` exports types
3. Run `pnpm install` to update types
4. Restart TypeScript server in VS Code

---

## 📚 Additional Resources

- [Coinbase OnchainKit Docs](https://docs.cdp.coinbase.com/onchainkit/)
- [Wagmi Documentation](https://wagmi.sh/)
- [Farcaster Miniapp SDK](https://docs.farcaster.xyz/developers/miniapps)
- [WalletConnect Docs](https://docs.walletconnect.com/)
- [Neynar API Docs](https://docs.neynar.com/)

---

## 🎓 Next Steps

1. ✅ Task 8.3: Multi-wallet authentication - **COMPLETE**
2. ⏳ Task 8.4: Quest completion verification
3. ⏳ Task 8.5: Reward distribution system
4. ⏳ Task 8.6: Guild membership management

---

**Updated**: January 19, 2025  
**Maintained by**: Gmeowbased Core Team  
**Questions?**: Check CURRENT-TASK.md or ask in Discord
