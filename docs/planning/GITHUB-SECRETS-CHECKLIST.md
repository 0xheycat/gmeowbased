# GitHub Secrets & Environment Variables Checklist

**Last Updated:** November 30, 2025  
**Phase:** Foundation Rebuild Phase 1 Complete  
**Architecture:** Base-only (GMChainKey = 'base')

---

## ✅ Required GitHub Secrets (Base-only Architecture)

### Supabase (Database & Storage)
- [x] `SUPABASE_URL` - Supabase project URL
- [x] `SUPABASE_SERVICE_ROLE_KEY` - Service role key (workflows only)
- [x] `SUPABASE_ANON_KEY` - Anonymous public key

### Neynar (Farcaster API)
- [x] `NEYNAR_API_KEY` - Neynar API key for Farcaster data

### Base Chain RPC
- [x] `RPC_BASE` - Base mainnet RPC endpoint (Alchemy/Infura/QuickNode)

### Badge Minting (Base-only)
- [x] `MINTER_PRIVATE_KEY` - Private key for badge minting wallet (Base)
- [x] `BADGE_CONTRACT_BASE` - Badge NFT contract address on Base (0x...)

### Webhooks (Optional)
- [ ] `BADGE_MINT_WEBHOOK_URL` - Webhook URL for badge mint notifications
- [ ] `WEBHOOK_SECRET` - Webhook authentication secret

---

## ❌ Removed Secrets (Multi-chain Deprecated - Nov 28, 2025)

These secrets are **NO LONGER NEEDED** after Base-only redeploy:

- ~~`RPC_OP`~~ - Optimism RPC (removed)
- ~~`RPC_CELO`~~ - Celo RPC (removed)
- ~~`RPC_UNICHAIN`~~ - Unichain RPC (removed)
- ~~`RPC_INK`~~ - Ink RPC (removed)
- ~~`BADGE_CONTRACT_UNICHAIN`~~ - Unichain badge contract (removed)
- ~~`BADGE_CONTRACT_CELO`~~ - Celo badge contract (removed)
- ~~`BADGE_CONTRACT_INK`~~ - Ink badge contract (removed)
- ~~`BADGE_CONTRACT_OP`~~ - Optimism badge contract (removed)

**Action Required:** Delete these from GitHub repository settings → Secrets and variables → Actions → Repository secrets

---

## 🔍 GitHub Workflows Using Secrets

### 1. `badge-minting.yml` (Base-only)
```yaml
SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
NEYNAR_API_KEY: ${{ secrets.NEYNAR_API_KEY }}
RPC_BASE: ${{ secrets.RPC_BASE }}
MINTER_PRIVATE_KEY: ${{ secrets.MINTER_PRIVATE_KEY }}
```

### 2. `gm-reminders.yml` (Base-only)
```yaml
NEYNAR_API_KEY: ${{ secrets.NEYNAR_API_KEY }}
SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
RPC_BASE: ${{ secrets.RPC_BASE }}
```

### 3. `viral-metrics-sync.yml` (No RPC needed)
```yaml
SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
NEYNAR_API_KEY: ${{ secrets.NEYNAR_API_KEY }}
```

### 4. `supabase-leaderboard-sync.yml` (Base-only)
```yaml
SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

### 5. `warmup-frames.yml` (No secrets needed - HTTP only)
- No secrets used (warmup via public HTTP requests)

---

## 📋 Verification Steps

### Step 1: Check GitHub Secrets
```bash
# Go to: https://github.com/0xheycat/gmeowbased/settings/secrets/actions
# Verify all ✅ required secrets are present
# Delete all ❌ deprecated multi-chain secrets
```

### Step 2: Test Workflows Locally
```bash
# Load .env.local with all required secrets
cp .env.example .env.local

# Test badge minting script
pnpm tsx scripts/automation/mint-badge-queue.ts

# Test GM reminders script
pnpm tsx scripts/automation/send-gm-reminders.ts --dry-run --max 5

# Test viral metrics sync
pnpm tsx scripts/automation/sync-viral-metrics.ts
```

### Step 3: Test Workflow Dispatch
```bash
# Go to: https://github.com/0xheycat/gmeowbased/actions
# Run each workflow manually via "Run workflow" button
# Check logs for missing environment variables
```

---

## 🔐 Local Development (.env.local)

```bash
# Supabase
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Neynar (Farcaster)
NEYNAR_API_KEY="NEYNAR_API_DOCS_..."
NEXT_PUBLIC_NEYNAR_API_KEY="NEYNAR_API_DOCS_..."

# Base Chain RPC
RPC_BASE="https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY"

# Badge Minting (Base-only)
MINTER_PRIVATE_KEY="0x..."
BADGE_CONTRACT_BASE="0x..."

# Optional Webhooks
BADGE_MINT_WEBHOOK_URL="https://your-webhook-url.com/badge-minted"
WEBHOOK_SECRET="your-webhook-secret"
```

---

## 🚨 Common Issues

### Issue 1: Missing `RPC_BASE`
**Error:** `Cannot read property 'base' of undefined` or `RPC endpoint not configured`  
**Fix:** Add `RPC_BASE` secret to GitHub repository settings

### Issue 2: Missing `MINTER_PRIVATE_KEY`
**Error:** `Private key required for minting` or `Wallet not configured`  
**Fix:** Add `MINTER_PRIVATE_KEY` secret (must have ETH for gas on Base)

### Issue 3: Old Multi-chain Secrets Present
**Error:** Workflows may try to use deprecated RPC endpoints  
**Fix:** Delete `RPC_OP`, `RPC_CELO`, `RPC_UNICHAIN`, `RPC_INK` from GitHub secrets

### Issue 4: Supabase Connection Failed
**Error:** `Failed to connect to Supabase` or `Invalid JWT`  
**Fix:** Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct

---

## 📊 Database Advisory Summary (from MCP)

**Security Issues:** 1 ERROR
- `pending_viral_notifications` view with SECURITY DEFINER ([fix in Phase 2](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view))

**Performance Warnings:** 32 WARN
- RLS policies re-evaluate `auth.<function>()` for each row ([fix in Phase 2](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan))

**Optimization Info:** 90 INFO
- Unused indexes (can remove in production optimization)

**Multiple Policies:** 22 WARN
- Multiple permissive policies (can consolidate for performance)

**Status:** No missing requirements, all 21 tables present, Base-only architecture consistent ✅

---

## ✅ Phase 1 Verification Complete

All GitHub workflows updated to Base-only architecture (Nov 28, 2025):
- ✅ `badge-minting.yml` - Removed multi-chain RPC vars
- ✅ `gm-reminders.yml` - Removed multi-chain RPC vars  
- ✅ `viral-metrics-sync.yml` - Already Base-only (no RPC)
- ✅ `supabase-leaderboard-sync.yml` - Fixed vars context
- ✅ `warmup-frames.yml` - No backend RPC calls

All automation scripts updated to Base-only:
- ✅ `mint-badge-queue.ts` - Removed multi-chain contract addresses
- ✅ `send-gm-reminders.ts` - Already Base-only
- ✅ `sync-viral-metrics.ts` - Already Base-only

**Phase 1 Status:** 100% Complete ✅  
**Ready for Phase 2:** Quest System Rebuild + NFT Functions
