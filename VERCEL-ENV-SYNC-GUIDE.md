# Vercel Environment Variables Sync Guide
**Phase 9 - Complete Environment Update**  
**Date:** January 4, 2026  
**Issue:** Vercel environment outdated (50+ days old) - Missing Phase 9 updates

---

## ⚠️ Current Issue: Vercel Fair Use Limit

Your Vercel team has been blocked due to fair use limits. This prevents:
- ❌ CLI deployments (`vercel deploy`)
- ❌ Environment variable updates (`vercel env add`)

### Resolve Fair Use Limit

1. **Visit:** http://vercel.link/fair-use
2. **Review** your team's usage (likely API rate limits or deployment frequency)
3. **Wait** for the block to expire (usually 1-24 hours)
4. **Or upgrade** to a paid plan if needed

---

## 🔍 Environment Comparison

### Critical Differences Found

| Variable | Vercel (OLD - 50d ago) | .env.local (CURRENT) | Status |
|----------|----------------------|---------------------|--------|
| `NEXT_PUBLIC_RPC_BASE` | Alchemy RPC | Subsquid RPC (Phase 9) | ❌ OUTDATED |
| `RPC_BASE` | Alchemy RPC | Subsquid RPC (Phase 9) | ❌ OUTDATED |
| `RPC_BASE_HTTP` | Not set | Subsquid RPC (Phase 9) | ❌ MISSING |
| `NEXT_PUBLIC_GM_BASE_SCORING` | Not set | 0xdeCF...13Bd6 (Phase 9) | ❌ MISSING |
| `NEXT_PUBLIC_SUBSQUID_URL` | Not set | https://4d34...graphql | ❌ MISSING |
| `RPC_API_KEY` | Not set | sqd_rpc_ngh...GxNFR | ❌ MISSING |

### Impact

Without sync, production deployment will:
- ❌ Use wrong RPC endpoints (Alchemy instead of Subsquid)
- ❌ Miss new ScoringModule contract (Phase 9.1)
- ❌ Fail to connect to Subsquid GraphQL (Phase 9.4)
- ❌ Break on-chain stats and leaderboard (500x performance loss)

---

## 🚀 Automated Sync (After Limit Resolved)

### Step 1: Run Sync Script

```bash
cd /home/heycat/Desktop/2025/Gmeowbased
./scripts/sync-vercel-env.sh
```

This script will:
- ✅ Read all 116 variables from `.env.local`
- ✅ Update Vercel for all environments (Production, Preview, Development)
- ✅ Remove old values and add new ones
- ✅ Show progress and summary

**Expected time:** ~10-15 minutes (2 second delay between updates to respect rate limits)

### Step 2: Verify Sync

```bash
# Pull updated environment to verify
vercel env pull .env.vercel.new

# Compare with .env.local
diff .env.local .env.vercel.new
```

### Step 3: Test Deployment

```bash
# Deploy to preview environment
vercel deploy

# Test the preview URL:
# - https://[preview-url]/api/admin/subsquid-metrics
# - https://[preview-url]/leaderboard
# - https://[preview-url]/profile/[address]
```

### Step 4: Production Deployment

```bash
# If preview tests pass, deploy to production
vercel deploy --prod
```

---

## 🛠️ Manual Sync (Alternative)

If the automated script fails, update critical variables manually via Vercel Dashboard:

1. **Go to:** https://vercel.com/0xheycat/gmeow-adventure/settings/environment-variables

2. **Update these CRITICAL variables** for all environments:

### RPC Endpoints (Phase 9 - Subsquid)
```bash
NEXT_PUBLIC_RPC_BASE=https://rpc.subsquid.io/base/sqd_rpc_nghV2pOll4Fd1ksRPiIeyn_lU30hKbtQ6mo65Bfgqs3GxNFR
RPC_BASE=https://rpc.subsquid.io/base/sqd_rpc_nghV2pOll4Fd1ksRPiIeyn_lU30hKbtQ6mo65Bfgqs3GxNFR
RPC_BASE_HTTP=https://rpc.subsquid.io/base/sqd_rpc_nghV2pOll4Fd1ksRPiIeyn_lU30hKbtQ6mo65Bfgqs3GxNFR
RPC_API_KEY=sqd_rpc_nghV2pOll4Fd1ksRPiIeyn_lU30hKbtQ6mo65Bfgqs3GxNFR
```

### Subsquid GraphQL (Phase 9.4)
```bash
NEXT_PUBLIC_SUBSQUID_URL=https://4d343279-1b28-406c-886e-e47719c79639.squids.live/gmeow-indexer@v1/api/graphql
SUBSQUID_API_KEY=sqt_vSebqAYYarf53LTc_ZyNdDmgD93KcoVVwqRSoedLufQ6dCNl9DIEAGYCONt2t3xiV
```

### ScoringModule Contract (Phase 9.1)
```bash
NEXT_PUBLIC_GM_BASE_SCORING=0xdeCFDc900DD1DBD6f947d3558143aA8374413Bd6
```

3. **Click "Save"** for each variable

---

## 📊 Environment Variables Count

- **Local (.env.local):** 116 variables
- **Vercel (current):** 97+ variables
- **Missing on Vercel:** ~19+ variables (including Phase 9 additions)

---

## ⏱️ Timeline

1. **Now:** Waiting for fair use limit to clear
2. **After resolved:** Run sync script (~15 minutes)
3. **Then:** Test deployment (~5 minutes)
4. **Finally:** Production deployment (~3 minutes)

**Total estimated time:** 25-30 minutes (after limit clears)

---

## 🔒 Security Notes

- ✅ `.env.local` contains production secrets (never commit to git)
- ✅ Vercel environment variables are encrypted
- ✅ Sync script adds 2-second delay between updates (rate limit safety)
- ✅ Script logs variable names only, not values

---

## 📝 Post-Deployment Checklist

After successful deployment:

- [ ] Test Subsquid metrics: `/api/admin/subsquid-metrics`
- [ ] Verify RPC endpoints working (check browser console, no RPC errors)
- [ ] Test leaderboard loading (should be fast with cache)
- [ ] Test profile pages with on-chain stats
- [ ] Check Vercel logs for errors
- [ ] Monitor for 24 hours (error rate should be 0.00%)

---

## 🆘 Troubleshooting

### If sync script fails:

```bash
# Check Vercel CLI login
vercel whoami

# Re-login if needed
vercel login

# Check project link
vercel link

# Test single variable manually
echo "test-value" | vercel env add TEST_VAR development
```

### If deployment fails:

```bash
# Check build logs
vercel logs [deployment-url]

# Test build locally
npm run build

# Check for TypeScript errors
npx tsc --noEmit
```

---

## 📚 References

- [Vercel Fair Use Policy](http://vercel.link/fair-use)
- [Vercel Environment Variables Docs](https://vercel.com/docs/concepts/projects/environment-variables)
- [Phase 9 Documentation](./HYBRID-ARCHITECTURE-MIGRATION-PLAN.md)
- [Phase 9 Test Results](./PHASE-9-TEST-RESULTS.md)

---

**Last Updated:** January 4, 2026  
**Phase:** Phase 9.7.1 Complete (waiting for Vercel deployment)  
**Next Action:** Resolve fair use limit, then run sync script
