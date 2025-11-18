# Onboarding Flow Testing Guide

**Date**: 2025-11-18  
**Dev Server**: http://localhost:3000  
**Purpose**: Test wallet-based FID authentication on desktop

---

## 🧪 TEST SCENARIOS

### Scenario 1: Desktop User - Wallet Connected (Farcaster-Linked) ⭐ BEST PATH

**Prerequisites**:
- Wallet installed (MetaMask, Rainbow, Coinbase Wallet, etc.)
- Wallet address linked to Farcaster account
- Example: If you have Farcaster account, find "Connected addresses" in Warpcast settings

**Steps**:
1. Open http://localhost:3000
2. **DO NOT add `?fid=` to URL**
3. Wait for onboarding modal to open
4. Look for the error message/manual input UI
5. Click "Connect Wallet" button
6. Approve wallet connection
7. Watch console for FID detection logs

**Expected Result**:
```
Console:
[OnboardingFlow] Checking wallet address for FID: 0x1234...5678
[OnboardingFlow] ✅ FID from wallet address: 18139
[OnboardingFlow] 🔍 Using FID 18139 (source: wallet-address)

UI:
- Profile loads automatically
- Avatar appears
- Neynar score displays
- No manual input needed ✅
```

---

### Scenario 2: Desktop User - Wallet Not Connected

**Steps**:
1. Open http://localhost:3000
2. Wait for onboarding modal
3. Look for blue box with "✨ Easiest Way: Connect Your Wallet"

**Expected Result**:
```
UI:
- Blue gradient box visible
- Message: "If your wallet is linked to Farcaster, we'll automatically detect your FID"
- ConnectWallet button displayed
- Manual FID input below as fallback
- Label says: "Enter Your Farcaster ID (FID)"
```

---

### Scenario 3: Desktop User - Wallet Connected (NOT Farcaster-Linked)

**Steps**:
1. Connect wallet that is NOT linked to any Farcaster account
2. Wait for onboarding modal

**Expected Result**:
```
Console:
[OnboardingFlow] Checking wallet address for FID: 0x1234...5678
[OnboardingFlow] ⚠️ No FID linked to wallet: 0x1234...5678
[OnboardingFlow] ❌ No FID detected from any source

UI:
- Error message: "No Farcaster account linked to your wallet..."
- Manual input form visible
- Label says: "Or Enter Your FID Manually"
- Help link to warpcast.com/~/settings
```

---

### Scenario 4: URL Parameter (Shared Link)

**Steps**:
1. Open http://localhost:3000/?fid=18139
2. Wait for onboarding modal

**Expected Result**:
```
Console:
[OnboardingFlow] ✅ FID from URL param: 18139
[OnboardingFlow] 🔍 Using FID 18139 (source: url-parameter)

UI:
- Profile loads immediately
- No wallet connection needed
- No manual input shown
```

---

### Scenario 5: Manual FID Input

**Steps**:
1. Open http://localhost:3000 (no wallet connected)
2. See blue "Connect Wallet" box
3. Scroll down to manual input
4. Enter FID: 18139
5. Click "Continue with FID" or press Enter

**Expected Result**:
```
Action:
- Page reloads with ?fid=18139 added to URL
- Profile loads on reload
- Onboarding continues normally
```

---

## 🐛 COMMON ISSUES & FIXES

### Issue: "No FID linked to wallet"
**Cause**: Wallet not connected to Farcaster account  
**Fix**: 
1. Go to warpcast.com/~/settings
2. Look for "Connected addresses"
3. Connect your wallet there first
4. Return to app and reconnect wallet

### Issue: Wallet connects but FID not detected
**Cause**: Neynar API might not have indexed the wallet linkage yet  
**Fix**: 
1. Use URL parameter method: `?fid=YOUR_FID`
2. Or use manual input as fallback
3. Try again in 5 minutes (indexing delay)

### Issue: "Unable to detect your Farcaster account automatically"
**Cause**: Not in miniapp, no wallet connected, no URL param  
**Fix**: This is expected! Connect wallet or use manual input

---

## 📊 CONSOLE LOG REFERENCE

### Successful Wallet Detection:
```
[OnboardingFlow] Checking wallet address for FID: 0xabcd...
[OnboardingFlow] ✅ FID from wallet address: 18139
[OnboardingFlow] 🔍 Using FID 18139 (source: wallet-address)
```

### Wallet Not Linked:
```
[OnboardingFlow] Checking wallet address for FID: 0xabcd...
[OnboardingFlow] ⚠️ No FID linked to wallet: 0xabcd...
[OnboardingFlow] ❌ No FID detected from any source
```

### URL Parameter:
```
[OnboardingFlow] ✅ FID from URL param: 18139
[OnboardingFlow] 🔍 Using FID 18139 (source: url-parameter)
```

### Miniapp Context:
```
[OnboardingFlow] Attempting miniapp context...
[OnboardingFlow] ✅ FID from miniapp context: 18139
[OnboardingFlow] 🔍 Using FID 18139 (source: miniapp-context)
```

---

## ✅ TEST CHECKLIST

- [ ] Test with wallet connected (Farcaster-linked) → Auto-detects FID
- [ ] Test with wallet connected (not linked) → Shows helpful error
- [ ] Test without wallet → Shows "Connect Wallet" button
- [ ] Test URL parameter `?fid=18139` → Instant load
- [ ] Test manual input → Page reloads with FID param
- [ ] Verify console logs show correct detection source
- [ ] Check error messages are contextual (connected vs not connected)
- [ ] Confirm "Connect Wallet" button works (opens wallet modal)

---

## 🎯 SUCCESS CRITERIA

✅ Desktop users can authenticate via wallet (no manual FID lookup)  
✅ Clear UX guidance for users without wallet  
✅ Manual input as last resort with improved messaging  
✅ All detection sources work (wallet → URL → miniapp → manual)  
✅ Console logs help debug which path was taken  
✅ No breaking changes to existing flows  

---

## 📝 NOTES

- **Priority Order**: Wallet → URL → Miniapp → Manual
- **Wallet detection is instant** - uses Neynar bulk lookup API
- **URL params still work** - good for shared links and frames
- **Miniapp context** - only works inside Warpcast app
- **Manual input** - fallback for all edge cases

**Dev Server**: Keep `pnpm dev` running during testing  
**Browser Console**: Keep DevTools open to see detection logs  
**Cache**: Hard refresh (Ctrl+Shift+R) if issues persist
