# 🔧 Vercel Build Cache Troubleshooting

## Issue: `__dirname is not defined` Error Persisting

**Problem:** Vercel is using a cached build that still contains the old `localFont` code, even though we removed it from the source.

---

## ✅ Solution Steps

### Option 1: Clear Build Cache via Vercel Dashboard (RECOMMENDED)

1. **Go to Vercel Dashboard:**
   ```
   https://vercel.com/0xheycat/gmeowbased/settings/general
   ```

2. **Scroll to "Build & Development Settings"**

3. **Click "Clear Build Cache"** button

4. **Trigger a new deployment:**
   - Go to: https://vercel.com/0xheycat/gmeowbased
   - Click "Deployments" tab
   - Click "Redeploy" on the latest deployment
   - ✅ Check "Use existing Build Cache" is **UNCHECKED**

---

### Option 2: Force Clean Build via Git (Already Done)

✅ We've already committed changes to force a clean build:
- Added `.vercelignore`
- Updated `versel.json`
- Commit message: "VERCEL: PLEASE DO CLEAN BUILD - NO CACHE"

Wait 2-3 minutes for Vercel to rebuild.

---

### Option 3: Delete and Recreate Deployment (LAST RESORT)

If cache persists:

1. **Delete all deployments:**
   - Go to: https://vercel.com/0xheycat/gmeowbased/deployments
   - Delete recent deployments with errors

2. **Trigger fresh deploy:**
   ```bash
   git commit --allow-empty -m "trigger: fresh vercel deployment"
   git push origin origin
   ```

---

## 🔍 How to Verify Fix

**Check Vercel Build Logs:**
1. Go to: https://vercel.com/0xheycat/gmeowbased/deployments
2. Click on latest deployment
3. View "Build Logs"
4. Search for "localFont" or "__dirname" - should NOT appear
5. Check final output shows successful build

**Test the Site:**
1. Visit: https://gmeowhq.art
2. Should load without 500 error
3. Check: https://gmeowhq.art/.well-known/farcaster.json
4. Should redirect to hosted manifest

---

## 📊 What Was Fixed

### Source Code Changes (Already Committed):
- ✅ Removed `import localFont from 'next/font/local'` from `/app/layout.tsx`
- ✅ Removed `siteFont` variable and configuration
- ✅ Moved font loading to CSS `@font-face` in `/app/globals.css`
- ✅ All source code is clean

### The Problem:
- Vercel's build cache retained the compiled code with `localFont`
- This compiled code includes `__dirname` references
- When deployed, edge/standalone runtime doesn't support `__dirname`
- Result: `ReferenceError: __dirname is not defined`

### The Solution:
- Force Vercel to rebuild from scratch
- Clear all cached build artifacts
- Recompile with updated source (no localFont)

---

## 🚨 If Error Still Persists

### Check These:

1. **Verify Source Code:**
   ```bash
   cd /home/heycat/Desktop/2025/Gmeowbased
   grep -r "localFont" app/
   # Should return: no matches
   
   grep -r "__dirname" app/
   # Should return: no matches
   ```

2. **Check Git History:**
   ```bash
   git log --oneline -5
   # Should see: "fix: remove localFont to prevent __dirname error"
   ```

3. **Verify Deployment:**
   - Check deployment uses latest commit hash
   - Build logs show clean build (not from cache)
   - No warnings about `localFont`

---

## 💡 Prevention

To avoid this in future:

1. **Always clear cache** when:
   - Removing font configurations
   - Changing webpack config
   - Modifying build dependencies

2. **Test locally first:**
   ```bash
   rm -rf .next
   pnpm build
   pnpm start
   ```

3. **Check for CommonJS patterns:**
   - Avoid `__dirname`, `__filename`
   - Use ES modules: `import.meta.url` instead
   - Or use CSS/static files for fonts

---

## 📞 Support

**If you still see the error after:**
1. Clearing build cache via dashboard
2. Waiting for latest deployment
3. Verifying source code is clean

**Then:**
- Check if any dependencies use `localFont` internally
- Consider disabling `output: 'standalone'` temporarily
- Or use Vercel support: https://vercel.com/support

---

**Last Updated:** November 14, 2025  
**Status:** Cache clear triggered, awaiting rebuild  
**Expected Fix Time:** 2-5 minutes
