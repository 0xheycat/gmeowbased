# Railway Deployment Guide - Post-Rebrand

**Date**: November 28, 2025  
**Project**: Gmeowbased (Rebranded Smart Contracts)  
**Environment**: Beta Testing → Railway (Hobby Plan $5/month)  
**Purpose**: Test Phase 12 Farcaster Feed before Vercel production

---

## ⚠️ CRITICAL: Smart Contract Rebrand

**OLD MONOLITHIC ARCHITECTURE** → ❌ REMOVED  
**NEW PROXY-BASED ARCHITECTURE** → ✅ ACTIVE

### What Changed:
- ❌ Removed all old `NEXT_PUBLIC_GM_*_ADDRESS` variables
- ✅ Added new proxy-based contract addresses:
  - `NEXT_PUBLIC_GM_*_CORE` (Daily GM + Points)
  - `NEXT_PUBLIC_GM_*_GUILD` (Team functionality)
  - `NEXT_PUBLIC_GM_*_NFT` (Achievement NFTs)
  - `NEXT_PUBLIC_GM_*_PROXY` (Upgradeable proxy)
  
### Chains Supported:
- Base (Primary), Optimism, Unichain, Celo, Ink, Arbitrum

---

## 📁 Project Structure (Cleaned for Railway)

### Excluded from Deployment:
✅ `.railwayignore` configured to exclude:
- `backups/` (700MB+ old foundation backup)
- `old-foundation/` (deprecated code)
- `src-archived-20251127-092205/` (archived source)
- `Docs/`, `docs/`, `planning/` (documentation)
- `__tests__/`, `e2e/`, `playwright-report/` (testing)
- `cache/` (build artifacts)

### Included in Deployment:
- `app/`, `components/`, `lib/`, `hooks/`, `types/`, `utils/`
- `contract/` (Solidity files for reference)
- `public/` (static assets)
- `package.json`, `pnpm-lock.yaml`
- Configuration files (next.config.js, tailwind.config.ts, etc.)

---

## 🔧 Railway Configuration Files

### 1. `railway.json`
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install && pnpm run build"
  },
  "deploy": {
    "startCommand": "pnpm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "healthcheckPath": "/",
    "healthcheckTimeout": 30
  }
}
```

### 2. `.railwayignore`
- Excludes 1GB+ of unnecessary files
- Keeps deployment lean (~200MB instead of 1.2GB)
- See full list in `.railwayignore` file

### 3. `.dockerignore`
- Same exclusions as `.railwayignore`
- For Docker-based deployments (if needed)

---

## 🌐 Environment Variables for Railway

### Quick Deploy Option:
```bash
# Copy all from .env.local EXCEPT old contract addresses
railway variables set --from-file .env.local

# Then update URLs after first deploy (see Step 3 below)
```

### Manual Option (Recommended):
Use Railway Dashboard → Raw Editor → Paste these categories:

---

### Category 1: Core Configuration (3 variables)
```bash
# ⚠️ UPDATE THESE AFTER FIRST DEPLOY
NEXT_PUBLIC_BASE_URL=https://your-app.up.railway.app
MAIN_URL=https://your-app.up.railway.app
NEXT_PUBLIC_FRAME_ORIGIN=https://your-app.up.railway.app
NODE_ENV=production
```

---

### Category 2: Neynar API - Farcaster Integration (6 variables)
```bash
NEYNAR_API_KEY=76C0C613-378F-4562-9512-600DD84EB085
NEYNAR_GLOBAL_API=81f742da-b485-45ca-926e-22a6bbbf3ae7
NEYNAR_SIGNER_UUID=81f742da-b485-45ca-926e-22a6bbbf3ae7
NEXT_PUBLIC_NEYNAR_API_KEY=76C0C613-378F-4562-9512-600DD84EB085
NEXT_PUBLIC_NEYNAR_CLIENT_ID=76C0C613-378F-4562-9512-600DD84EB085
NEYNAR_SERVER_WALLET_ID=earh62bp9a17h87gk0p7lapj
```

---

### Category 3: Supabase Database (3 variables)
```bash
SUPABASE_URL=https://bgnerptdanbgvcjentbt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnbmVycHRkYW5iZ3ZjamVudGJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE2NzAzOSwiZXhwIjoyMDc2NzQzMDM5fQ.7jg7jDBZYBplAfbZlz7rsLRG4K2dQ27QZsv79nnioeM
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnbmVycHRkYW5iZ3ZjamVudGJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNjcwMzksImV4cCI6MjA3Njc0MzAzOX0.XyXD7nJ21saJaJEzxfAReT8kpZY6yLhYq3_1sgbyiZM
```

---

### Category 4: Authentication (1 variable)
```bash
SESSION_SECRET=66ffffa3c16f3defeea159be13218aeefdf82192ed277ee7263b0e7d22437878
ADMIN_JWT_SECRET=66ffffa3c16f3defeea159be13218aeefdf82192ed277ee7263b0e7d22437878
```

---

### Category 5: RPC Endpoints (11 variables)
```bash
# Alchemy API Key
ALCHEMY_API_KEY=AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe

# Public RPC (for client-side)
NEXT_PUBLIC_RPC_BASE=https://base-mainnet.g.alchemy.com/v2/A6u4vxXFMPMk07zeChjbziq1Ch0Wcrjg
NEXT_PUBLIC_RPC_OP=https://opt-mainnet.g.alchemy.com/v2/A6u4vxXFMPMk07zeChjbziq1Ch0Wcrjg
NEXT_PUBLIC_RPC_CELO=https://celo-mainnet.g.alchemy.com/v2/A6u4vxXFMPMk07zeChjbziq1Ch0Wcrjg
NEXT_PUBLIC_RPC_UNICHAIN=https://unichain-mainnet.g.alchemy.com/v2/A6u4vxXFMPMk07zeChjbziq1Ch0Wcrjg
NEXT_PUBLIC_RPC_INK=https://ink-mainnet.g.alchemy.com/v2/A6u4vxXFMPMk07zeChjbziq1Ch0Wcrjg

# Server RPC (for API routes)
RPC_BASE=https://base-mainnet.g.alchemy.com/v2/AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe
RPC_OP=https://opt-mainnet.g.alchemy.com/v2/AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe
RPC_CELO=https://celo-mainnet.g.alchemy.com/v2/AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe
RPC_UNICHAIN=https://unichain-mainnet.g.alchemy.com/v2/AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe
RPC_INK=https://ink-mainnet.g.alchemy.com/v2/AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe
```

---

### Category 6: Smart Contracts - NEW PROXY ARCHITECTURE (24+ variables)

**⚠️ CRITICAL: Use NEW addresses from `.env.contracts.railway`**

```bash
# === BASE CHAIN (Primary) ===
NEXT_PUBLIC_GM_BASE_CORE=0x9BDD11aA50456572E3Ea5329fcDEb81974137f92
NEXT_PUBLIC_GM_BASE_GUILD=0x967457be45facE07c22c0374dAfBeF7b2f7cd059
NEXT_PUBLIC_GM_BASE_NFT=0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20
NEXT_PUBLIC_GM_BASE_PROXY=0x6A48B758ed42d7c934D387164E60aa58A92eD206
NEXT_PUBLIC_BADGE_CONTRACT_BASE=0xF13d6f70Af6cf6C47Cd3aFb545d906309eebD1b9

# === OPTIMISM ===
NEXT_PUBLIC_GM_OP_CORE=0x1599e491FaA2F22AA053dD9304308231c0F0E15B
NEXT_PUBLIC_GM_OP_GUILD=0x71EA982A8E2be62191ac7e2A98277c986DEbBc58
NEXT_PUBLIC_GM_OP_NFT=0x9BDD11aA50456572E3Ea5329fcDEb81974137f92
NEXT_PUBLIC_GM_OP_PROXY=0x9f95383B4AFA0f9633Ef9E3D5eF37A704E26F839
NEXT_PUBLIC_BADGE_CONTRACT_OP=0xb6055bF4AeD5f10884eC313dE7b733Ceb4dc3446

# === UNICHAIN ===
NEXT_PUBLIC_GM_UNICHAIN_CORE=0x9BDD11aA50456572E3Ea5329fcDEb81974137f92
NEXT_PUBLIC_GM_UNICHAIN_GUILD=0x967457be45facE07c22c0374dAfBeF7b2f7cd059
NEXT_PUBLIC_GM_UNICHAIN_NFT=0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20
NEXT_PUBLIC_GM_UNICHAIN_PROXY=0x6A48B758ed42d7c934D387164E60aa58A92eD206
NEXT_PUBLIC_BADGE_CONTRACT_UNICHAIN=0xd54275a6e8db11f5aC5C065eE1E8f10dCA37Ad86

# === CELO ===
NEXT_PUBLIC_GM_CELO_CORE=0xC8c39e1312c4F3775CE1fc35327ed2c719B82eFe
NEXT_PUBLIC_GM_CELO_GUILD=0x3030cbD17bc8AB3Fa1CC45964C20A12617a7D42C
NEXT_PUBLIC_GM_CELO_NFT=0x059b474799f8602975E60A789105955CbB61d878
NEXT_PUBLIC_GM_CELO_PROXY=0xa0001886C87a19d49BAC88a5Cbf993f0866110C4
NEXT_PUBLIC_BADGE_CONTRACT_CELO=0x16CF68d057e931aBDFeC67D0B4C3CaF3BA21f9D3

# === INK ===
NEXT_PUBLIC_GM_INK_CORE=0xC8c39e1312c4F3775CE1fc35327ed2c719B82eFe
NEXT_PUBLIC_GM_INK_GUILD=0x3030cbD17bc8AB3Fa1CC45964C20A12617a7D42C
NEXT_PUBLIC_GM_INK_NFT=0x059b474799f8602975E60A789105955CbB61d878
NEXT_PUBLIC_GM_INK_PROXY=0xa0001886C87a19d49BAC88a5Cbf993f0866110C4
NEXT_PUBLIC_BADGE_CONTRACT_INK=0x1fC08c7466dF4134E624bc18520eC0d9CC308765

# === ARBITRUM ===
NEXT_PUBLIC_GM_ARBITRUM_CORE=0xC8c39e1312c4F3775CE1fc35327ed2c719B82eFe
NEXT_PUBLIC_GM_ARBITRUM_GUILD=0x3030cbD17bc8AB3Fa1CC45964C20A12617a7D42C
NEXT_PUBLIC_GM_ARBITRUM_NFT=0x059b474799f8602975E60A789105955CbB61d878
NEXT_PUBLIC_GM_ARBITRUM_PROXY=0xa0001886C87a19d49BAC88a5Cbf993f0866110C4
NEXT_PUBLIC_BADGE_CONTRACT_ARBITRUM=0x0000000000000000000000000000000000000000

# Chain Start Blocks (for event indexing)
CHAIN_START_BLOCK_BASE=37445375
CHAIN_START_BLOCK_UNICHAIN=30931846
CHAIN_START_BLOCK_CELO=49779488
CHAIN_START_BLOCK_INK=28181876
CHAIN_START_BLOCK_OP=143040782
CHAIN_START_BLOCK_ARBITRUM=0
```

---

### Category 7: OnchainKit (4 variables)
```bash
ONCHAINKIT_API_KEY=o31jreNnAPiGBlfKGiCA2DzIUGcWBdtX
NEXT_PUBLIC_ONCHAINKIT_API_KEY=o31jreNnAPiGBlfKGiCA2DzIUGcWBdtX
NEXT_PUBLIC_ONCHAINKIT_APP_NAME=Gmeow Adventure
NEXT_PUBLIC_ONCHAINKIT_LOGO=https://gmeowhq.art/logo.png
```

---

### Category 8: Farcaster Account Association (3 variables)
```bash
FARCASTER_ACCOUNT_ASSOCIATION_HEADER=eyJmaWQiOjE4MTM5LCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4NzUzOTQ3MkRBZDZhMzcxZTZFMTUyQzVBMjAzNDY5YUEzMjMxNDEzMCJ9
FARCASTER_ACCOUNT_ASSOCIATION_PAYLOAD=eyJkb21haW4iOiJnbWVvd2hxLmFydCJ9
FARCASTER_ACCOUNT_ASSOCIATION_SIGNATURE=TURZpn1Psyf48uIuDZbU54FvYFqZgo7PnzXBE4/6J89/nazDAJNI56QYCfY2v3ubODbu63Tkg0yVt+qA7rDHVxw=
```

---

## 🚀 Deployment Steps

### Step 1: Initialize Railway Project
```bash
cd /home/heycat/Desktop/2025/Gmeowbased
railway init
```

Choose:
- **Create new project**: Yes
- **Project name**: gmeowbased-beta
- **Environment**: production

---

### Step 2: Set Environment Variables

**Option A: Railway Dashboard** (Recommended)
1. Go to Railway Dashboard → Your Project
2. Click "Variables" tab
3. Click "Raw Editor"
4. Paste all variables from categories above
5. Click "Save"

**Option B: CLI** (Quick but less organized)
```bash
# Set each category manually
railway variables set NEXT_PUBLIC_BASE_URL=https://temp.railway.app
railway variables set NEYNAR_API_KEY=76C0C613-378F-4562-9512-600DD84EB085
# ... (repeat for all variables)
```

**⚠️ IMPORTANT**: Do NOT use `--from-file .env.local` directly as it may include old contract addresses!

---

### Step 3: Deploy to Railway
```bash
# First deployment (temporary URLs)
railway up

# Watch build logs
railway logs --follow
```

Expected output:
```
Building...
✓ pnpm install completed (2-3 min)
✓ pnpm run build completed (3-5 min)
✓ Deployment successful
→ URL: https://gmeowbased-beta-production-xxxx.up.railway.app
```

---

### Step 4: Update URLs with Railway Domain
```bash
# Get your Railway domain
railway domain

# Update URL variables (⚠️ CRITICAL STEP)
railway variables set NEXT_PUBLIC_BASE_URL=https://gmeowbased-beta-production-xxxx.up.railway.app
railway variables set MAIN_URL=https://gmeowbased-beta-production-xxxx.up.railway.app
railway variables set NEXT_PUBLIC_FRAME_ORIGIN=https://gmeowbased-beta-production-xxxx.up.railway.app

# Redeploy with correct URLs
railway up
```

---

### Step 5: Verify Deployment
```bash
# Check logs for errors
railway logs --tail 100

# Check deployment status
railway status

# Open in browser
railway open
```

---

## ✅ Testing Checklist

### Phase 12 Farcaster Feed Testing:
- [ ] **Landing Page**: Visit `/` → Should show trending feed
- [ ] **Authentication**: Mock user or test with MiniKit
- [ ] **Infinite Scroll**: Scroll down → More casts load
- [ ] **Like Button**: Click like → Icon changes (requires signer)
- [ ] **Recast Button**: Click recast → Icon changes (requires signer)
- [ ] **Profile Dropdown**: Click avatar → Profile menu appears
- [ ] **Tab Switching**: Click "Following" → Feed updates
- [ ] **Empty States**: No auth → Login prompt shows

### Technical Checks:
- [ ] **Build Time**: <5 minutes ✓
- [ ] **Page Load**: <3 seconds ✓
- [ ] **TypeScript**: 0 errors ✓
- [ ] **Console Errors**: None ✓
- [ ] **Supabase Connection**: Queries working ✓
- [ ] **RPC Endpoints**: Web3 calls successful ✓
- [ ] **Contract Addresses**: NEW addresses loaded ✓

### Contract Address Verification:
- [ ] **NO OLD ADDRESSES**: Check browser console → Should NOT see `0x3ad420B8C2Be19ff8EBAdB484Ed839Ae9254bf2F` (old Base)
- [ ] **NEW ADDRESSES**: Should see `0x9BDD11aA50456572E3Ea5329fcDEb81974137f92` (new Base Core)
- [ ] **Proxy Architecture**: 4 contract types per chain (Core, Guild, NFT, Proxy)

---

## 🔍 Monitoring

### Check Logs:
```bash
# Real-time logs
railway logs --follow

# Last 100 lines
railway logs --tail 100

# Filter errors only
railway logs | grep ERROR
```

### Check Environment Variables:
```bash
# List all variables
railway variables

# Check specific variable
railway variables | grep NEXT_PUBLIC_GM_BASE_CORE
```

### Resource Usage (Hobby Plan):
- **Execution Time**: 500 hours/month
- **RAM**: 8GB
- **Bandwidth**: 100GB/month
- **Storage**: Limited by repo size (~200MB with exclusions)

---

## 🐛 Troubleshooting

### Issue: Build fails with "Module not found"
**Solution**: Check `.railwayignore` → Ensure you're not excluding required files

### Issue: Page shows 500 error
**Solution**: 
1. Check logs: `railway logs --tail 50`
2. Verify environment variables: `railway variables`
3. Check Supabase connection

### Issue: Contract calls fail
**Solution**:
1. Verify NEW contract addresses are set (not old ones)
2. Check RPC endpoints: `railway variables | grep RPC`
3. Check Alchemy API key is valid

### Issue: Farcaster feed not loading
**Solution**:
1. Check Neynar API key: `railway variables | grep NEYNAR`
2. Check logs for rate limit errors
3. Verify NEYNAR_SIGNER_UUID is set

### Issue: Build succeeds but site won't load
**Solution**:
1. Check healthcheck: `/` endpoint should return 200
2. Verify PORT is not hardcoded (Railway assigns it)
3. Check `next.config.js` → `output: 'standalone'` not required

---

## 📊 Performance Optimization

### Railway Hobby Plan Limits:
- ✅ **500 hours/month**: ~16.6 hours/day (good for testing)
- ✅ **8GB RAM**: Plenty for Next.js
- ✅ **100GB bandwidth**: ~3.2GB/day (sufficient for beta)
- ⚠️ **No sleep policy**: App won't sleep after 30 days inactivity

### Optimization Tips:
1. **Enable caching**: Already done (2-min cache for feeds)
2. **Optimize images**: Use Next.js Image component (already done)
3. **Lazy load components**: Dynamic imports where possible
4. **Monitor bandwidth**: Check Railway dashboard weekly
5. **Use CDN**: Vercel Edge Network (production only)

---

## 🔄 CI/CD Workflow (Optional)

### GitHub Integration:
```bash
# Connect Railway to GitHub
railway github connect

# Auto-deploy on push
railway github enable
```

### Manual Redeploy:
```bash
# Redeploy current branch
railway up

# Redeploy specific branch
railway up --branch main
```

---

## 🔐 Security Notes

### DO NOT COMMIT:
- ❌ `.env.local` (contains secrets)
- ❌ `.env.contracts.railway` (reference only)
- ❌ Railway API tokens
- ❌ Supabase service role key
- ❌ Neynar API keys

### Keep Secret:
- ✅ All `SESSION_SECRET` values
- ✅ All `ADMIN_JWT_SECRET` values
- ✅ All `SUPABASE_SERVICE_ROLE_KEY` values
- ✅ All Neynar `SIGNER_UUID` values

---

## 📝 Next Steps After Railway Success

1. **Test thoroughly** (15+ checklist items above)
2. **Document any Railway-specific issues**
3. **Plan migration to Vercel** for production:
   - Vercel has better Edge Network
   - Better Next.js optimization
   - Easier custom domain setup
4. **Continue to Phase 13** (if Railway testing successful)

---

## 📚 Additional Resources

- **Railway Docs**: https://docs.railway.app
- **Railway CLI**: https://docs.railway.app/develop/cli
- **Hobby Plan**: https://railway.app/pricing
- **Nixpacks**: https://nixpacks.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment

---

**Ready to deploy?** Follow Steps 1-5 above! 🚂✨
