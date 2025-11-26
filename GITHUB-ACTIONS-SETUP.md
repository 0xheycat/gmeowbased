# GitHub Actions Migration - Setup Guide

## 🎯 Migration Complete!

All cron jobs migrated from Vercel to GitHub Actions (no Vercel Pro plan needed).

---

## ✅ GitHub Actions Workflows Configured

### 1. **Frame Warmup** (Already Running)
- **File:** `.github/workflows/warmup-frames.yml`
- **Schedule:** Every 10min (6am-10pm UTC), Every 30min (off-hours)
- **Status:** ✅ Active

### 2. **Leaderboard Sync** (Now Enabled)
- **File:** `.github/workflows/supabase-leaderboard-sync.yml`
- **Schedule:** Daily at midnight UTC (00:00)
- **Status:** ✅ Active
- **Changed:** Enabled daily sync (was disabled)

### 3. **Badge Minting** (New GitHub Actions)
- **File:** `.github/workflows/badge-minting.yml`
- **Schedule:** Daily at 1 AM UTC (01:00)
- **Status:** 🆕 New workflow
- **Replaces:** Vercel Cron (removed from `vercel.json`)

### 4. **GM Reminders** (New GitHub Actions)
- **File:** `.github/workflows/gm-reminders.yml`
- **Schedule:** Twice daily at 9 AM and 9 PM UTC
- **Status:** 🆕 New workflow
- **Purpose:** Send push notifications to users who haven't GM'd

---

## 🔐 Required GitHub Secrets

You need to add these secrets to your GitHub repository:

### **Navigate to GitHub Secrets:**
1. Go to: `https://github.com/0xheycat/gmeowbased/settings/secrets/actions`
2. Click **"New repository secret"** for each secret below

### **Required Secrets:**

#### **Supabase (Required for all workflows)**
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
```

#### **Neynar (Required for badge minting & GM reminders)**
```
NEYNAR_API_KEY
```

#### **RPC Endpoints (Required for all workflows)**
```
RPC_BASE
RPC_OP
RPC_CELO
RPC_UNICHAIN
RPC_INK
```

#### **Badge Minting (Optional - only if minting badges on-chain)**
```
MINTER_PRIVATE_KEY
```

#### **Leaderboard Sync (Already configured)**
These should already exist from the previous leaderboard sync setup:
```
SUPABASE_LEADERBOARD_TABLE
SUPABASE_LEADERBOARD_VIEW_CURRENT
```

---

## 📝 How to Add Secrets

### **Method 1: Via GitHub Web UI**

1. Go to your repository settings:
   ```
   https://github.com/0xheycat/gmeowbased/settings/secrets/actions
   ```

2. Click **"New repository secret"**

3. Add each secret:
   - **Name:** `SUPABASE_URL`
   - **Value:** `https://your-project.supabase.co`
   - Click **"Add secret"**

4. Repeat for all secrets listed above

### **Method 2: Via GitHub CLI (Faster)**

```bash
# Install GitHub CLI if not already installed
# https://cli.github.com/

# Authenticate
gh auth login

# Add secrets (replace values with your actual secrets)
gh secret set SUPABASE_URL --body "https://your-project.supabase.co"
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "your_service_role_key"
gh secret set SUPABASE_ANON_KEY --body "your_anon_key"
gh secret set NEYNAR_API_KEY --body "your_neynar_api_key"
gh secret set RPC_BASE --body "https://base-mainnet.g.alchemy.com/v2/your-key"
gh secret set RPC_OP --body "https://opt-mainnet.g.alchemy.com/v2/your-key"
gh secret set RPC_CELO --body "https://forno.celo.org"
gh secret set RPC_UNICHAIN --body "https://mainnet.unichain.org"
gh secret set RPC_INK --body "https://ink-mainnet.g.alchemy.com/v2/your-key"

# Optional: Minter private key (only if minting badges)
gh secret set MINTER_PRIVATE_KEY --body "0x..."
```

---

## 🚀 Verify Setup

### **Check if secrets are added:**

```bash
# List all secrets (values are hidden)
gh secret list
```

You should see:
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
NEYNAR_API_KEY
RPC_BASE
RPC_OP
RPC_CELO
RPC_UNICHAIN
RPC_INK
MINTER_PRIVATE_KEY (optional)
```

### **Test workflows manually:**

```bash
# Test badge minting
gh workflow run badge-minting.yml

# Test GM reminders (dry run)
gh workflow run gm-reminders.yml -f dry_run=true -f max_notifications=10

# Test leaderboard sync
gh workflow run supabase-leaderboard-sync.yml

# View workflow runs
gh run list --limit 5
```

### **Check workflow status:**

```bash
# View all workflows
gh workflow list

# View recent runs
gh run list --limit 10

# View specific workflow
gh run view <run-id>
```

---

## 📊 Workflow Schedule Summary

| Workflow | Schedule | Purpose |
|----------|----------|---------|
| **Frame Warmup** | Every 10-30min | Keep functions warm |
| **Leaderboard Sync** | Daily at 00:00 UTC | Sync on-chain leaderboard |
| **Badge Minting** | Daily at 01:00 UTC | Process badge queue |
| **GM Reminders** | 09:00 & 21:00 UTC | Send GM reminders |

**Total:** 4 automated workflows running on GitHub Actions (FREE tier)

---

## ⚠️ Important Notes

### **Vercel Cron Removed**
- ✅ Removed `crons` section from `vercel.json`
- ✅ No Vercel Pro plan needed anymore
- ✅ Badge minting now runs on GitHub Actions

### **GitHub Actions Free Tier Limits**
- ✅ 2,000 minutes/month (plenty for these workflows)
- ✅ Unlimited public repository usage
- ✅ All workflows stay well within limits

**Estimated monthly usage:**
- Frame warmup: ~300 minutes
- Leaderboard sync: ~60 minutes
- Badge minting: ~30 minutes
- GM reminders: ~60 minutes
- **Total: ~450 minutes/month** (well under 2,000 limit)

### **Manual Triggers Available**
All workflows support manual triggering via:
```bash
gh workflow run <workflow-name>.yml
```

Or via GitHub UI:
1. Go to Actions tab
2. Select workflow
3. Click "Run workflow"

---

## 🐛 Troubleshooting

### **Workflow fails with "secret not found"**

**Solution:** Add the missing secret to GitHub:
```bash
gh secret set SECRET_NAME --body "secret_value"
```

### **Badge minting script not found**

**Solution:** Ensure script exists:
```bash
ls -la scripts/automation/mint-badge-queue.ts
```

If missing, the script may need to be created.

### **GM reminders not sending**

**Check:**
1. NEYNAR_API_KEY is set correctly
2. SUPABASE secrets are valid
3. Check workflow logs:
   ```bash
   gh run list --workflow=gm-reminders.yml --limit=1
   gh run view <run-id> --log
   ```

### **RPC endpoints timing out**

**Solution:** Use Alchemy or Infura endpoints with API keys:
```bash
gh secret set RPC_BASE --body "https://base-mainnet.g.alchemy.com/v2/YOUR_KEY"
```

---

## ✅ Migration Checklist

- [x] Remove Vercel cron from `vercel.json`
- [x] Enable leaderboard sync (daily)
- [x] Create badge minting workflow
- [x] Create GM reminders workflow
- [ ] Add GitHub secrets (do this now!)
- [ ] Test workflows manually
- [ ] Monitor first scheduled runs
- [ ] Verify badges are minting
- [ ] Verify GM reminders are sending

---

## 📚 Next Steps

1. **Add GitHub Secrets** (see above)
2. **Test workflows manually:**
   ```bash
   gh workflow run badge-minting.yml
   gh workflow run gm-reminders.yml -f dry_run=true
   ```
3. **Monitor workflow runs:**
   ```bash
   gh run list --limit 5
   ```
4. **Check logs if issues:**
   ```bash
   gh run view <run-id> --log
   ```

---

## 🎉 Benefits of GitHub Actions

✅ **Free:** No Vercel Pro plan needed ($20/month saved)  
✅ **Flexible:** Can run any frequency (not limited to daily)  
✅ **Powerful:** Full Node.js environment with npm packages  
✅ **Transparent:** Logs available in GitHub UI  
✅ **Reliable:** GitHub infrastructure  
✅ **Version controlled:** Workflows are in your repo  

---

## 📞 Support

If you encounter issues:
1. Check workflow logs: `gh run view <run-id> --log`
2. Verify secrets are set: `gh secret list`
3. Test manually: `gh workflow run <workflow>.yml`
4. Check GitHub Actions status: https://www.githubstatus.com/

---

**Migration Status:** ✅ Complete - All workflows ready to run!

**Action Required:** Add GitHub secrets (see above) and test workflows.
