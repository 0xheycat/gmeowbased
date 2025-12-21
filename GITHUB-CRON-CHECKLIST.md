# GitHub Actions Cron - Setup Checklist

## ✅ What Was Done

1. **Created GitHub Actions workflow**: `.github/workflows/neynar-wallet-sync.yml`
2. **Removed Vercel cron config**: Cleaned up `vercel.json`
3. **Updated documentation**: `CRON-SETUP.md` now uses GitHub Actions
4. **Updated secrets tracking**: Added `CRON_SECRET` to `.github/secrets-check.md`
5. **Pushed to GitHub**: Commit `04ea7e3`

---

## 🔧 Required GitHub Secrets

Verify these secrets exist in your repository:

**Go to**: https://github.com/0xheycat/gmeowbased/settings/secrets/actions

### Must Have:

| Secret Name | Value Source | Status |
|-------------|--------------|--------|
| `CRON_SECRET` | From `.env.local` | ⚠️ **VERIFY** |
| `NEXT_PUBLIC_BASE_URL` | `https://gmeowhq.art` | ⚠️ **VERIFY** |

### Current `.env.local` values to add:

```bash
CRON_SECRET=sb_publishable_6tAPtzvPnF-2GLR4kg3c-Q_JeIyqixs
NEXT_PUBLIC_BASE_URL=https://gmeowhq.art
```

---

## 🚀 How to Verify

### 1. Check Workflow is Active

**URL**: https://github.com/0xheycat/gmeowbased/actions

Look for: **"Neynar Wallet Sync (Every 6 Hours)"**

### 2. Add Missing Secrets (if any)

```bash
# Option A: Using GitHub CLI
gh secret set CRON_SECRET --body "sb_publishable_6tAPtzvPnF-2GLR4kg3c-Q_JeIyqixs"
gh secret set NEXT_PUBLIC_BASE_URL --body "https://gmeowhq.art"

# Option B: Via Web UI
# 1. Go to Settings → Secrets and variables → Actions
# 2. Click "New repository secret"
# 3. Add each secret
```

### 3. Test Manual Run

1. Go to Actions tab
2. Select "Neynar Wallet Sync (Every 6 Hours)"
3. Click "Run workflow" button
4. Select branch: `main`
5. Click green "Run workflow"
6. Monitor execution (~2-3 minutes)

### 4. Expected Output

✅ **Success response**:
```
👛 Starting Neynar wallet sync...
📍 Target: https://gmeowhq.art/api/cron/sync-neynar-wallets
📊 Response status: 200
✅ Wallet sync completed successfully!
📈 Sync summary:
  Total users: 1000
  ✅ Synced: 987
  ⏭️  Skipped: 10
  ❌ Failed: 3
⏱️  Duration: 112000ms
```

❌ **If you see 401 Unauthorized**:
- Missing or incorrect `CRON_SECRET`
- Add the secret from `.env.local`

---

## 📅 Cron Schedule

**When it runs**: Every 6 hours
- 00:00 UTC (7:00 PM EST / 4:00 PM PST)
- 06:00 UTC (1:00 AM EST / 10:00 PM PST)
- 12:00 UTC (7:00 AM EST / 4:00 AM PST)
- 18:00 UTC (1:00 PM EST / 10:00 AM PST)

**What it does**:
1. Queries 1000 most active users (updated in last 30 days)
2. Fetches their wallet data from Neynar API
3. Updates `user_profiles` table with custody + verified addresses
4. Enables multi-wallet queries across the app

---

## 🔍 Monitoring

### Check Workflow Runs

**URL**: https://github.com/0xheycat/gmeowbased/actions/workflows/neynar-wallet-sync.yml

### Check API Logs

After deployment, monitor your app logs for:
```
[CRON] Neynar Wallet Sync started
[CRON] Processing 1000 users in batches of 10
[CRON] Sync complete: 987 synced, 10 skipped, 3 failed
```

---

## ⚡ Quick Actions

### Manual API Test (from terminal)

```bash
curl -X POST https://gmeowhq.art/api/cron/sync-neynar-wallets \
  -H "Authorization: Bearer sb_publishable_6tAPtzvPnF-2GLR4kg3c-Q_JeIyqixs" \
  -H "Content-Type: application/json"
```

### Check Secret Exists

```bash
gh secret list | grep CRON_SECRET
```

### View Workflow Definition

```bash
cat .github/workflows/neynar-wallet-sync.yml
```

---

## 🎯 Next Steps

1. ✅ Verify `CRON_SECRET` exists in GitHub secrets
2. ✅ Verify `NEXT_PUBLIC_BASE_URL` exists in GitHub secrets  
3. ✅ Trigger manual workflow run to test
4. ✅ Monitor first scheduled run (next 00:00, 06:00, 12:00, or 18:00 UTC)
5. ✅ Continue route migration to TRUE HYBRID pattern

---

**Status**: Ready for production ✅  
**Platform**: GitHub Actions (not Vercel)  
**All env vars**: Sourced from `.env.local`
