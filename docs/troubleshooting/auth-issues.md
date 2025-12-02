# 🔧 Auth Troubleshooting Guide

**Version**: Phase 1.5 (December 2025)  
**Last Updated**: December 1, 2025

---

## Common Issues & Solutions

### 1. "useAuth must be used within AuthProvider"

**Symptoms**:
```
Error: useAuth must be used within AuthProvider
```

**Cause**: Component is rendered outside the AuthProvider wrapper

**Solution**: Verify AuthProvider wraps your app in `app/providers.tsx`

```tsx
// app/providers.tsx
export function MiniAppProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider>
          {/* AuthProvider must wrap all components that use useAuth */}
          <AuthProvider>
            <NotificationProvider>
              {children}
            </NotificationProvider>
          </AuthProvider>
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

**How to verify**: Check browser console for the error stack trace

---

### 2. Miniapp Context Not Detected

**Symptoms**:
- `isMiniappSession` is `false` when in Warpcast
- FID is `null` even though in miniapp
- Console shows: `[AuthProvider] Not in miniapp context`

**Possible Causes**:

#### A. Not Actually in Miniapp
**Check**: Open dev tools → Console → Look for referrer
```javascript
console.log('Referrer:', document.referrer)
console.log('In iframe:', window.self !== window.top)
```

**Expected**: 
- Referrer should contain `farcaster.xyz`, `warpcast.com`, or `base.dev`
- In iframe should be `true`

**Solution**: Open the app in Warpcast mobile app or base.dev

#### B. SDK Timeout
**Check**: Console logs for timeout errors
```
[AuthProvider] Miniapp context check failed: Context timeout after 10s
```

**Solution**: 
1. Check network connection (slow networks need >10s)
2. Try refreshing the app
3. Check if Farcaster SDK is blocked by ad blocker

#### C. Referrer Not Allowed
**Check**: Look for this log
```
[miniappEnv] isAllowedReferrer: false host: example.com
```

**Solution**: The app is embedded in unauthorized domain
- Allowed: `*.farcaster.xyz`, `*.warpcast.com`, `*.base.dev`
- If you need to add a domain, update `lib/miniappEnv.ts` line 1

---

### 3. FID is Null But Wallet Connected

**Symptoms**:
- `address` has value
- `fid` is `null`
- `isAuthenticated` is `true`
- No profile data

**Cause**: Wallet address has no associated Farcaster account

**Solution**: Show user-friendly message

```tsx
import { useAuth } from '@/lib/hooks/use-auth'

function Component() {
  const { fid, address, isAuthenticated } = useAuth()
  
  if (isAuthenticated && !fid && address) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold">No Farcaster Profile</h2>
        <p className="text-muted-foreground mt-2">
          Your wallet is connected, but we couldn't find a Farcaster profile.
        </p>
        <a 
          href="https://warpcast.com"
          className="btn btn-primary mt-4"
          target="_blank"
        >
          Create Farcaster Account
        </a>
      </div>
    )
  }
  
  return <div>Content</div>
}
```

---

### 4. Authentication Stuck in Loading

**Symptoms**:
- `isLoading` is always `true`
- App shows loading spinner forever
- No error message

**Possible Causes**:

#### A. Network Error (Neynar API)
**Check**: Console for Neynar API errors
```
[AuthProvider] Authentication failed: Failed to fetch
```

**Solution**:
1. Check network connection
2. Verify Neynar API key in `.env.local`
3. Check Neynar API status: https://status.neynar.com

#### B. Infinite Auth Loop
**Check**: Console for repeated auth attempts
```
[AuthProvider] Authenticating via miniapp FID: 12345
[AuthProvider] Authenticating via miniapp FID: 12345
[AuthProvider] Authenticating via miniapp FID: 12345
```

**Solution**: Check `useEffect` dependencies in components using `useAuth`

```tsx
// ❌ BAD - Causes infinite loop
useEffect(() => {
  authenticate()
}, []) // Missing dependency

// ✅ GOOD - Proper dependency array
const { authenticate } = useAuth()
// Don't call authenticate manually unless needed
```

---

### 5. Context Timeout After 10s

**Symptoms**:
```
[AuthProvider] Miniapp context check failed: Context timeout after 10s
```

**Causes**:
- Slow mobile network
- Farcaster SDK not loading
- Ad blocker blocking SDK

**Solutions**:

#### A. Increase Timeout (if needed)
```tsx
// lib/contexts/AuthContext.tsx (line 98)
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Context timeout after 10s')), 10000)
)

// Change to 15s for very slow networks
setTimeout(() => reject(new Error('Context timeout after 15s')), 15000)
```

#### B. Check SDK Loading
```javascript
// Open browser console
const { sdk } = await import('@farcaster/miniapp-sdk')
console.log('SDK loaded:', sdk)
console.log('SDK context:', await sdk.context)
```

#### C. Disable Ad Blocker
- uBlock Origin and similar extensions can block Farcaster SDK
- Try disabling temporarily to test

---

### 6. Auth Method Mismatch

**Symptoms**:
- Expected miniapp auth but got wallet auth
- `authMethod` is `'wallet'` in Warpcast

**Cause**: Miniapp context check failed, fell back to wallet

**Debug Steps**:

1. **Check Miniapp Detection**:
```javascript
// Browser console
console.log('In iframe:', window.self !== window.top)
console.log('Referrer:', document.referrer)
```

2. **Check SDK Ready**:
```javascript
const { sdk } = await import('@farcaster/miniapp-sdk')
await sdk.actions.ready()
console.log('SDK ready:', true)
```

3. **Check Context**:
```javascript
const context = await sdk.context
console.log('User FID:', context?.user?.fid)
```

**Solution**: If any step fails, that's where the issue is. See related sections above.

---

### 7. Profile Not Loading

**Symptoms**:
- `fid` has value
- `profile` is `null`
- `isAuthenticated` is `true`

**Cause**: Neynar API call failed

**Check Console**:
```
[AuthProvider] Authentication failed: Failed to fetch user by FID
```

**Solutions**:

#### A. Verify Neynar API Key
```bash
# Check .env.local
cat .env.local | grep NEYNAR_API_KEY
```

Should output:
```
NEYNAR_API_KEY=your-actual-key-here
```

#### B. Test Neynar API Directly
```bash
curl -X GET "https://api.neynar.com/v2/farcaster/user/bulk?fids=12345" \
  -H "api_key: YOUR_API_KEY"
```

Expected: JSON response with user data

#### C. Check API Quota
- Neynar has rate limits
- Check usage: https://neynar.com/dashboard
- Upgrade plan if over limit

---

### 8. Logout Not Working

**Symptoms**:
- Called `logout()` but user still authenticated
- `isAuthenticated` still `true` after logout

**Cause**: External wallet/miniapp still connected

**Explanation**:
- `logout()` clears AuthContext state
- It does NOT disconnect wallet (handled by Wagmi)
- It does NOT exit miniapp (handled by Farcaster)

**Solution**: To fully log out:

```tsx
import { useAuth } from '@/lib/hooks/use-auth'
import { useDisconnect } from 'wagmi'

function LogoutButton() {
  const { logout } = useAuth()
  const { disconnect } = useDisconnect()
  
  const handleLogout = () => {
    // 1. Clear auth state
    logout()
    
    // 2. Disconnect wallet
    disconnect()
    
    // 3. Optional: Close miniapp (if needed)
    // User should manually close Warpcast
  }
  
  return <button onClick={handleLogout}>Logout</button>
}
```

---

## Debug Logging

### Enable Verbose Logging

AuthContext already logs to console. Look for these prefixes:
- `[AuthProvider]` - Main auth flow
- `[miniappEnv]` - Miniapp detection
- `[isMiniappContext]` - Context checks (lib/share.ts)

### Example Console Output (Success)

```
[miniappEnv] isEmbedded: true
[miniappEnv] referrerHost: warpcast.com from: https://warpcast.com/~/channel/gm
[miniappEnv] isAllowedReferrer: true host: warpcast.com
[AuthProvider] ✅ Miniapp context loaded: { fid: 12345, username: 'alice' }
[AuthProvider] Authenticating via miniapp FID: 12345
```

### Example Console Output (Failure)

```
[miniappEnv] isEmbedded: false
[AuthProvider] Not in miniapp context
[AuthProvider] Authenticating via wallet address: 0x123...
```

---

## Testing Checklist

Use this checklist to verify auth is working:

### Miniapp Context Tests
- [ ] Open in Warpcast mobile app → FID detected
- [ ] Open in base.dev preview → FID detected
- [ ] Open in regular browser → Falls back to wallet
- [ ] Check console: No "Context timeout" errors
- [ ] Verify `isMiniappSession` is `true` in Warpcast

### Wallet Auth Tests
- [ ] Connect wallet → Address detected
- [ ] Profile fetched from Neynar
- [ ] Disconnect wallet → Auth cleared
- [ ] `authMethod` is `'wallet'` when wallet connected

### Loading States
- [ ] `isLoading` shows during auth check
- [ ] Loading spinner displayed
- [ ] No infinite loading

### Error Handling
- [ ] Network error → Error message shown
- [ ] Invalid FID → Graceful fallback
- [ ] Neynar API error → User-friendly message

### Integration
- [ ] `useAuth()` works in all pages
- [ ] No prop drilling needed
- [ ] TypeScript types correct
- [ ] No console errors

---

## Manual Testing Steps

### Test 1: Miniapp Context Detection

1. Open https://gmeowhq.art in regular browser
2. Open dev tools → Console
3. Check logs:
   - Should see: `[miniappEnv] isEmbedded: false`
   - Should see: `[AuthProvider] Not in miniapp context`

4. Open same URL in Warpcast mobile app
5. Check logs:
   - Should see: `[miniappEnv] isEmbedded: true`
   - Should see: `[miniappEnv] isAllowedReferrer: true`
   - Should see: `[AuthProvider] ✅ Miniapp context loaded`

### Test 2: Wallet Connection

1. Open in regular browser (not Warpcast)
2. Click "Connect Wallet"
3. Connect with MetaMask/Coinbase Wallet
4. Check console:
   - Should see: `[AuthProvider] Authenticating via wallet address:`
   - Verify `address` has value
   - Verify `profile` fetched from Neynar

### Test 3: Priority Order

1. Open in Warpcast (miniapp context)
2. Also connect wallet
3. Verify `authMethod` is `'miniapp'` (not `'wallet'`)
4. Miniapp auth should take priority

---

## Performance Issues

### Slow Auth Check (>5s)

**Symptoms**: Takes long time to authenticate

**Check**:
1. Network tab → Look for slow Neynar API calls
2. Console → Check timeout warnings
3. Lighthouse → Check performance score

**Solutions**:
- Optimize Neynar API calls (batch requests)
- Cache profile data (React Query)
- Use loading skeletons (better perceived performance)

### Excessive Re-renders

**Symptoms**: Components re-render too often

**Check**: React DevTools Profiler

**Solution**: Memoize auth values

```tsx
// If needed, wrap in useMemo
const authValue = useMemo(() => ({
  fid, address, profile, isAuthenticated, authMethod,
  miniappContext, isMiniappSession,
  authenticate, logout, isLoading, error
}), [fid, address, profile, /* ... other deps */])
```

---

## Getting Help

If issues persist after trying these solutions:

1. **Check Documentation**:
   - `docs/api/auth/unified-auth.md` - API reference
   - `docs/architecture/AUTH-CONSOLIDATION-PLAN.md` - Architecture

2. **Review Console Logs**:
   - Look for `[AuthProvider]` messages
   - Check for error stack traces
   - Verify SDK loading

3. **Test in Isolation**:
   - Create minimal test component
   - Remove other hooks/contexts
   - Verify AuthProvider wrapping

4. **Check Dependencies**:
   ```bash
   # Verify packages installed
   npm list wagmi @coinbase/onchainkit @farcaster/miniapp-sdk
   ```

5. **Review Code**:
   - `lib/contexts/AuthContext.tsx` - Implementation
   - `lib/hooks/use-auth.ts` - Hook
   - `app/providers.tsx` - Integration

---

**Last Updated**: December 1, 2025 (Phase 1.5)
