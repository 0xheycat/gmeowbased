# Railway Environment Variables Setup Guide

## 🚂 Railway Configuration for Testing

**Environment**: Beta Testing (Hobby Plan)  
**Purpose**: Testing Phase 12 Farcaster Feed before Vercel production launch  
**Status**: ✅ Railway CLI installed and authenticated

---

## 📋 Required Environment Variables

Copy these variables from your `.env.local` to Railway:

### 1. Core Configuration (Required)
```bash
# App URLs (Update with Railway URL after first deploy)
NEXT_PUBLIC_BASE_URL=https://your-app.up.railway.app
MAIN_URL=https://your-app.up.railway.app
NEXT_PUBLIC_FRAME_ORIGIN=https://your-app.up.railway.app

# Node Environment
NODE_ENV=production
```

### 2. Neynar API (Required for Farcaster Feed)
```bash
NEYNAR_API_KEY=76C0C613-378F-4562-9512-600DD84EB085
NEYNAR_GLOBAL_API=81f742da-b485-45ca-926e-22a6bbbf3ae7
NEYNAR_SIGNER_UUID=81f742da-b485-45ca-926e-22a6bbbf3ae7
NEXT_PUBLIC_NEYNAR_API_KEY=76C0C613-378F-4562-9512-600DD84EB085
NEXT_PUBLIC_NEYNAR_CLIENT_ID=76C0C613-378F-4562-9512-600DD84EB085
NEYNAR_SERVER_WALLET_ID=earh62bp9a17h87gk0p7lapj
```

### 3. Supabase (Required for Database)
```bash
SUPABASE_URL=https://bgnerptdanbgvcjentbt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnbmVycHRkYW5iZ3ZjamVudGJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE2NzAzOSwiZXhwIjoyMDc2NzQzMDM5fQ.7jg7jDBZYBplAfbZlz7rsLRG4K2dQ27QZsv79nnioeM
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnbmVycHRkYW5iZ3ZjamVudGJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNjcwMzksImV4cCI6MjA3Njc0MzAzOX0.XyXD7nJ21saJaJEzxfAReT8kpZY6yLhYq3_1sgbyiZM
```

### 4. Authentication (Required for User Sessions)
```bash
SESSION_SECRET=your-random-32-char-secret-here
```

### 5. RPC Endpoints (Required for Web3)
```bash
# Alchemy API Key
ALCHEMY_API_KEY=AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe

# Public RPC URLs
NEXT_PUBLIC_RPC_BASE=https://base-mainnet.g.alchemy.com/v2/A6u4vxXFMPMk07zeChjbziq1Ch0Wcrjg
NEXT_PUBLIC_RPC_OP=https://opt-mainnet.g.alchemy.com/v2/A6u4vxXFMPMk07zeChjbziq1Ch0Wcrjg
NEXT_PUBLIC_RPC_CELO=https://celo-mainnet.g.alchemy.com/v2/A6u4vxXFMPMk07zeChjbziq1Ch0Wcrjg
NEXT_PUBLIC_RPC_UNICHAIN=https://unichain-mainnet.g.alchemy.com/v2/A6u4vxXFMPMk07zeChjbziq1Ch0Wcrjg
NEXT_PUBLIC_RPC_INK=https://ink-mainnet.g.alchemy.com/v2/A6u4vxXFMPMk07zeChjbziq1Ch0Wcrjg

# Server RPC URLs
RPC_BASE=https://base-mainnet.g.alchemy.com/v2/AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe
RPC_OP=https://opt-mainnet.g.alchemy.com/v2/AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe
RPC_CELO=https://celo-mainnet.g.alchemy.com/v2/AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe
RPC_UNICHAIN=https://unichain-mainnet.g.alchemy.com/v2/AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe
RPC_INK=https://ink-mainnet.g.alchemy.com/v2/AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe
```

### 6. Contract Addresses (Required for Web3)
```bash
# GM Contracts
NEXT_PUBLIC_GM_BASE_ADDRESS=0x3ad420B8C2Be19ff8EBAdB484Ed839Ae9254bf2F
NEXT_PUBLIC_GM_UNICHAIN_ADDRESS=0xD8b4190c87d86E28f6B583984cf0C89FCf9C2a0f
NEXT_PUBLIC_GM_CELO_ADDRESS=0xa68BfB4BB6F7D612182A3274E7C555B7b0b27a52
NEXT_PUBLIC_GM_INK_ADDRESS=0x6081a70c2F33329E49cD2aC673bF1ae838617d26
NEXT_PUBLIC_GM_OP_ADDRESS=0xF670d5387DF68f258C4D5aEBE67924D85e3C6db6

# Badge Contracts
BADGE_CONTRACT_BASE=0xF13d6f70Af6cf6C47Cd3aFb545d906309eebD1b9
BADGE_CONTRACT_OP=0xb6055bF4AeD5f10884eC313dE7b733Ceb4dc3446
BADGE_CONTRACT_UNICHAIN=0xd54275a6e8db11f5aC5C065eE1E8f10dCA37Ad86
BADGE_CONTRACT_CELO=0x16CF68d057e931aBDFeC67D0B4C3CaF3BA21f9D3
BADGE_CONTRACT_INK=0x1fC08c7466dF4134E624bc18520eC0d9CC308765
```

### 7. OnchainKit (Optional but Recommended)
```bash
ONCHAINKIT_API_KEY=o31jreNnAPiGBlfKGiCA2DzIUGcWBdtX
NEXT_PUBLIC_ONCHAINKIT_API_KEY=o31jreNnAPiGBlfKGiCA2DzIUGcWBdtX
NEXT_PUBLIC_ONCHAINKIT_APP_NAME=Gmeow Adventure
NEXT_PUBLIC_ONCHAINKIT_LOGO=https://gmeowhq.art/logo.png
```

### 8. Farcaster Account Association (Optional)
```bash
FARCASTER_ACCOUNT_ASSOCIATION_HEADER=eyJmaWQiOjE4MTM5LCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4NzUzOTQ3MkRBZDZhMzcxZTZFMTUyQzVBMjAzNDY5YUEzMjMxNDEzMCJ9
FARCASTER_ACCOUNT_ASSOCIATION_PAYLOAD=eyJkb21haW4iOiJnbWVvd2hxLmFydCJ9
FARCASTER_ACCOUNT_ASSOCIATION_SIGNATURE=TURZpn1Psyf48uIuDZbU54FvYFqZgo7PnzXBE4/6J89/nazDAJNI56QYCfY2v3ubODbu63Tkg0yVt+qA7rDHVxw=
```

---

## 🚀 Railway Deployment Steps

### Step 1: Create New Project
```bash
# Login to Railway (already done ✅)
railway login

# Initialize new project
railway init

# Link to your project (if already created on Railway dashboard)
railway link
```

### Step 2: Set Environment Variables

**Option A: Via Railway CLI (Recommended)**
```bash
# Set variables one by one
railway variables set NEYNAR_API_KEY=76C0C613-378F-4562-9512-600DD84EB085
railway variables set SUPABASE_URL=https://bgnerptdanbgvcjentbt.supabase.co
# ... (repeat for each variable)

# Or import from .env.local (filter sensitive ones)
railway variables set --from-file .env.local
```

**Option B: Via Railway Dashboard (Easier for Hobby Plan)**
1. Go to https://railway.app/dashboard
2. Select your project
3. Click "Variables" tab
4. Click "Raw Editor"
5. Paste all variables from above
6. Click "Save"

### Step 3: Configure Build Settings

Railway should auto-detect Next.js, but verify:
```bash
# Check railway.json is created (already done ✅)
cat railway.json

# Verify build configuration
railway up --detach
```

### Step 4: Deploy
```bash
# Deploy to Railway
railway up

# Watch build logs
railway logs

# Get deployment URL
railway domain
```

### Step 5: Update URLs After First Deploy
Once deployed, update these variables with your Railway URL:
```bash
# Get your Railway URL (e.g., gmeowbased-production.up.railway.app)
RAILWAY_URL=$(railway domain)

# Update URLs
railway variables set NEXT_PUBLIC_BASE_URL=https://$RAILWAY_URL
railway variables set MAIN_URL=https://$RAILWAY_URL
railway variables set NEXT_PUBLIC_FRAME_ORIGIN=https://$RAILWAY_URL

# Redeploy with updated URLs
railway up
```

---

## 🔍 Testing Checklist

After deployment, test these features:

### 1. Farcaster Feed (Task 6.1)
- [ ] Visit `/` - Should show trending feed
- [ ] Check feed loads without errors
- [ ] Verify infinite scroll works
- [ ] Test like/recast buttons (requires signer)

### 2. Authentication
- [ ] User context loads (mock data for now)
- [ ] Profile dropdown works
- [ ] Sign in/out flow functional

### 3. Web3 Integration
- [ ] Contract addresses loaded
- [ ] RPC endpoints working
- [ ] Wagmi provider initialized

### 4. Supabase
- [ ] Database queries work
- [ ] Type-safe operations functional
- [ ] MCP tools available

### 5. Performance
- [ ] Build completes in <5 minutes
- [ ] Page loads in <3 seconds
- [ ] No TypeScript errors
- [ ] No console errors

---

## 🐛 Troubleshooting

### Build Fails
```bash
# Check logs
railway logs

# Common issues:
# 1. Missing environment variable → Add it
# 2. TypeScript error → Fix locally first
# 3. Memory limit → Upgrade plan or optimize build
```

### Runtime Errors
```bash
# Check runtime logs
railway logs --follow

# Common issues:
# 1. Supabase connection → Verify SUPABASE_URL and keys
# 2. Neynar API → Verify NEYNAR_API_KEY
# 3. RPC errors → Verify Alchemy endpoints
```

### Feed Not Loading
```bash
# Check Neynar API calls
railway logs | grep "neynarFetch"

# Verify environment variables
railway variables

# Test Neynar API manually
curl -H "x-api-key: $NEYNAR_API_KEY" \
  https://api.neynar.com/v2/farcaster/feed?filter_type=global_trending&limit=5
```

---

## 💰 Railway Hobby Plan Limits

**Your Plan**: Hobby ($5/month)
- ✅ 500 hours execution time/month
- ✅ 8GB RAM
- ✅ 100GB outbound bandwidth
- ✅ Unlimited inbound bandwidth
- ✅ Custom domains
- ⚠️ No sleep after 30 days inactivity

**Optimization Tips**:
1. Use Railway only for testing (move to Vercel for production)
2. Enable auto-sleep for unused services
3. Monitor usage in Railway dashboard
4. Delete old deployments to save space

---

## 🔄 CI/CD Workflow

**Development Flow**:
```bash
1. Code locally → Test with pnpm dev
2. Fix TypeScript errors → pnpm build
3. Commit to GitHub → foundation-rebuild branch
4. Deploy to Railway → railway up
5. Test in Railway → Use Railway URL
6. If stable → Merge to main → Deploy to Vercel (later)
```

**Railway Auto-Deploy** (Optional):
1. Connect GitHub repo in Railway dashboard
2. Enable auto-deploy on push to foundation-rebuild
3. Railway will rebuild on every commit

---

## 📊 Monitoring

**Railway Dashboard**:
- Deployment status: https://railway.app/dashboard
- Logs: `railway logs`
- Metrics: CPU, Memory, Network usage
- Environment variables: `railway variables`

**Health Checks**:
```bash
# Check if app is running
curl https://your-app.up.railway.app/api/health

# Check feed endpoint
curl https://your-app.up.railway.app/api/farcaster/feed

# Check build info
curl https://your-app.up.railway.app/api/build-info
```

---

## ✅ Next Steps After Railway Setup

1. ✅ Deploy to Railway with all environment variables
2. ✅ Test Farcaster feed functionality
3. ✅ Verify authentication flow
4. ✅ Check Supabase integration
5. 🔄 Continue with Phase 12 Task 6.1 improvements
6. 🔄 Document any Railway-specific issues
7. 🔄 Plan migration to Vercel for production

---

## 🔐 Security Notes

**DO NOT commit these to GitHub**:
- ❌ `.env.local` file (already in .gitignore ✅)
- ❌ Private keys (ORACLE_PRIVATE_KEY)
- ❌ Service role keys (SUPABASE_SERVICE_ROLE_KEY)
- ❌ API keys (NEYNAR_API_KEY, ALCHEMY_API_KEY)

**Railway Environment Variables are encrypted** ✅
- Stored securely in Railway's infrastructure
- Accessible only via Railway CLI or dashboard
- Not exposed in build logs

---

## 📞 Support

**Railway Issues**:
- Dashboard: https://railway.app/dashboard
- Docs: https://docs.railway.app
- Discord: https://discord.gg/railway

**Gmeowbased Issues**:
- GitHub: https://github.com/0xheycat/gmeowbased/issues
- Check TypeScript errors: `pnpm build`
- Check logs: `railway logs`
