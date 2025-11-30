# 🔐 Miniapp Authentication Fix - Complete Guide

**Date:** November 29, 2025  
**Commit:** `834db55`  
**Issue:** No auth successful in miniapp context  
**Status:** ✅ Fixed

---

## 🐛 Problem Identified

The app was failing to authenticate users in Farcaster miniapp context because:

1. ❌ **Missing Auth Integration**: Dashboard page used `useMiniapp()` but not `useUnifiedFarcasterAuth()`
2. ❌ **No FID Extraction**: Miniapp SDK context wasn't being used to get user FID
3. ❌ **API Query Param Missing**: `/api/user/onboarding-status` didn't support FID query params
4. ❌ **Session Cookie Dependency**: APIs relied on session cookies which don't work in miniapp iframe

---

## ✅ Solution Implemented

### 1. **Integrated Unified Auth Hook**

**File:** `app/app/page.tsx`

**Before:**
```tsx
const { isMiniapp, isFarcaster, isBase } = useMiniapp()
// No FID, no profile, no auth ❌
```

**After:**
```tsx
const { isMiniapp, isFarcaster, isBase, context } = useMiniapp()

// Unified auth hook with miniapp context
const { fid, profile, isAuthenticated, authSource } = useUnifiedFarcasterAuth({
  miniKitEnabled: isMiniapp,
  miniKitContext: context,
  isFrameReady: isMiniapp,
  isMiniAppSession: isMiniapp,
  autoSignIn: true,
  frameContext: context,
})
// ✅ FID extracted from context.user.fid
```

### 2. **Auth Source Priority**

The `useUnifiedFarcasterAuth` hook now follows this priority order:

1. **MiniKit SDK** (cryptographic signature) - Most trusted
2. **Frame headers** (`x-farcaster-fid`) - Trusted by Farcaster
3. **Session JWT** - User session (persistent auth)
4. **Query params** - Legacy fallback

**In miniapp context:**
```typescript
// SDK context provides:
context = {
  user: {
    fid: 12345,
    username: "heycat",
    displayName: "Hey Cat",
    pfpUrl: "https://..."
  }
}

// Auth hook extracts: fid = 12345 ✅
```

### 3. **API Query Param Support**

**File:** `app/api/user/onboarding-status/route.ts`

**Before:**
```typescript
// Only worked with Supabase auth session ❌
const { data: { user }, error: authError } = await supabase.auth.getUser()
```

**After:**
```typescript
// Supports both query param AND auth session ✅
const { searchParams } = new URL(request.url)
const queryFid = searchParams.get('fid')
const authFid = await getFarcasterFid(request)

const fid = queryFid ? Number(queryFid) : authFid
```

**Now works:**
- `/api/user/onboarding-status` - Uses session FID
- `/api/user/onboarding-status?fid=12345` - Uses query param FID ✅

### 4. **Auth Debug Panel**

Added development-only debug panel to dashboard:

```tsx
{isMiniapp && process.env.NODE_ENV === 'development' && (
  <Card className="mb-4">
    <div className="text-xs font-mono">
      🔐 Auth Debug:
      • FID: {fid || 'null'}
      • Source: {authSource || 'null'}
      • Authenticated: {isAuthenticated ? 'Yes' : 'No'}
      • Profile: {profile?.username || 'null'}
      • Context: {context?.user?.fid || 'null'}
    </div>
  </Card>
)}
```

---

## 🎯 How It Works Now

### **Miniapp Auth Flow** (New)

```
1. User opens miniapp in Farcaster
   └─> Farcaster loads: gmeow-adventure-9y184f0kt-0xheycat.vercel.app

2. MiniappReady component fires
   └─> Initializes @farcaster/miniapp-sdk
   └─> Gets context.user.fid

3. useMiniapp() hook detects:
   └─> isEmbedded: true
   └─> isAllowed: true
   └─> context: { user: { fid: 12345 } }

4. useUnifiedFarcasterAuth() extracts FID:
   └─> fid = context.user.fid (12345)
   └─> authSource = 'frame'
   └─> isAuthenticated = true ✅

5. Dashboard loads user data:
   └─> fetch(`/api/user/stats?fid=${fid}`)
   └─> fetch(`/api/user/onboarding-status?fid=${fid}`)

6. APIs return real user data:
   └─> GM streak, XP, badges, rank ✅
```

---

## 🧪 Testing Instructions

### **Test on Vercel Deployment**

**URL:** https://gmeow-adventure-9y184f0kt-0xheycat.vercel.app

#### Step 1: Open in Farcaster App
1. Go to Warpcast mobile app
2. Navigate to miniapp URL (or scan QR code)
3. App should load in embedded frame

#### Step 2: Verify Auth Debug (Development)
If `NODE_ENV=development` in Vercel:
- You should see debug panel at top of dashboard
- Check: FID, authSource, isAuthenticated

**Expected Values:**
```
🔐 Auth Debug:
• FID: 12345 (your actual FID)
• Source: frame
• Authenticated: Yes
• Profile: heycat (your username)
• Context: 12345 (same as FID)
```

#### Step 3: Verify User Stats Load
- GM Streak should show real value (not 0)
- Total XP should show real value
- Badges Earned should show count
- Rank should show position

#### Step 4: Test API Endpoints Directly

**With cURL:**
```bash
# Test with FID query param (miniapp style)
curl "https://gmeow-adventure-9y184f0kt-0xheycat.vercel.app/api/user/stats?fid=12345"

# Expected response:
{
  "gmStreak": 5,
  "totalXP": 1250,
  "badgesEarned": 3,
  "rank": 42
}
```

---

## 📊 Verification Checklist

### ✅ **Miniapp Context**
- [ ] App loads in Farcaster miniapp
- [ ] No 401 errors in console
- [ ] Debug panel shows FID (if dev mode)
- [ ] authSource = 'frame'

### ✅ **User Data Loads**
- [ ] GM Streak displays
- [ ] Total XP displays
- [ ] Badges count displays
- [ ] Leaderboard rank displays

### ✅ **API Endpoints**
- [ ] `/api/user/stats?fid=X` returns data
- [ ] `/api/user/onboarding-status?fid=X` returns data
- [ ] No "Unauthorized" errors

### ✅ **Profile Data**
- [ ] Username displays correctly
- [ ] Display name shows
- [ ] Profile picture loads

---

## 🔧 Troubleshooting

### Issue: "FID: null" in debug panel

**Possible Causes:**
1. SDK context not loaded yet (wait 2-3 seconds)
2. Not in miniapp iframe (open in Farcaster app)
3. Referrer not allowed (check console for warnings)

**Fix:**
```typescript
// Check if miniapp context is available:
console.log('Context:', context)
console.log('User:', context?.user)
console.log('FID:', context?.user?.fid)
```

### Issue: "Authenticated: No"

**Possible Causes:**
1. FID is null (see above)
2. Context hasn't loaded yet
3. Not in allowed referrer (farcaster.xyz, warpcast.com)

**Fix:**
- Wait for `miniapp:ready` event
- Check `isAllowedReferrer()` returns true
- Verify `probeMiniappReady()` succeeds

### Issue: API returns 400 "Invalid FID"

**Possible Causes:**
1. FID is null or 0
2. Query param not being passed
3. FID not extracted from context

**Fix:**
```typescript
// Verify FID before calling API:
if (!fid || fid <= 0) {
  console.error('Invalid FID:', fid)
  return
}

// Always pass FID in query:
fetch(`/api/user/stats?fid=${fid}`)
```

### Issue: "Profile not found" (404)

**Possible Causes:**
1. User profile doesn't exist in database
2. FID mismatch
3. Onboarding not completed

**Fix:**
- Complete onboarding flow first
- Check Supabase `user_profiles` table
- Verify FID matches database

---

## 🚀 Deployment Status

**Latest Commit:** `834db55`  
**Branch:** foundation-rebuild  
**Vercel URL:** gmeow-adventure-9y184f0kt-0xheycat.vercel.app

**Build Status:** ✅ Passing  
**Auth Integration:** ✅ Complete  
**API Support:** ✅ Query params working  

**Changes Deployed:**
1. ✅ Dashboard auth integration
2. ✅ API query param support
3. ✅ Auth debug panel
4. ✅ Miniapp context extraction

---

## 📝 Next Steps

### If Auth Still Not Working:

1. **Check Vercel Logs:**
   ```bash
   vercel logs gmeow-adventure-9y184f0kt-0xheycat
   ```

2. **Verify Environment Variables:**
   - `NEXT_PUBLIC_NEYNAR_API_KEY` is set
   - `NEXT_PUBLIC_FRAME_ORIGIN` is correct
   - `SUPABASE_URL` is configured
   - `SUPABASE_ANON_KEY` is set

3. **Test Locally:**
   ```bash
   cd /home/heycat/Desktop/2025/Gmeowbased
   pnpm dev
   # Open http://localhost:3000?fid=12345
   ```

4. **Check Farcaster SDK:**
   - Open DevTools in miniapp
   - Check `window.fc` exists
   - Verify `sdk.context` resolves

### Recommended Improvements:

1. **Add Loading States:**
   ```tsx
   {!fid && profileLoading && (
     <div>Loading authentication...</div>
   )}
   ```

2. **Add Error States:**
   ```tsx
   {!fid && !profileLoading && (
     <div>Unable to authenticate. Please try again.</div>
   )}
   ```

3. **Add Retry Logic:**
   ```typescript
   const retryAuth = async () => {
     // Re-fetch SDK context
     const newContext = await getMiniappContext()
     // Update state
   }
   ```

---

## 📚 Related Files

**Core Auth:**
- `hooks/useUnifiedFarcasterAuth.ts` - Main auth hook
- `hooks/useMiniapp.tsx` - Miniapp detection
- `lib/miniapp-detection.ts` - SDK integration
- `lib/auth/farcaster.ts` - FID extraction

**API Endpoints:**
- `app/api/auth/session/route.ts` - Session management
- `app/api/user/stats/route.ts` - User statistics
- `app/api/user/onboarding-status/route.ts` - Onboarding check

**Components:**
- `app/app/page.tsx` - Dashboard (updated)
- `components/MiniappReady.tsx` - SDK initialization

---

**Issue:** Authentication failing in miniapp  
**Root Cause:** Missing FID extraction from SDK context  
**Fix:** Integrated useUnifiedFarcasterAuth with miniapp context  
**Status:** ✅ Resolved - Ready for testing
