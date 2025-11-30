# Railway Deployment - Quick Commands

## 🚀 Deploy Now (5 Steps)

### Step 1: Initialize Project
```bash
cd /home/heycat/Desktop/2025/Gmeowbased
railway init
```

### Step 2: Set Environment Variables

**Option A: Railway Dashboard** (Recommended - easier to organize)
1. Open: https://railway.app/dashboard
2. Select your project
3. Click "Variables" tab
4. Click "Raw Editor"
5. Copy/paste variables from `.env.local` (EXCEPT old contract addresses)
6. Save

**Option B: From File** (Quick but needs manual cleanup)
```bash
# WARNING: This includes old contract addresses - needs cleanup after
railway variables set --from-file .env.local

# Then manually delete old addresses:
railway variables delete NEXT_PUBLIC_GM_BASE_ADDRESS
railway variables delete NEXT_PUBLIC_GM_UNICHAIN_ADDRESS
railway variables delete NEXT_PUBLIC_GM_CELO_ADDRESS
railway variables delete NEXT_PUBLIC_GM_INK_ADDRESS
railway variables delete NEXT_PUBLIC_GM_OP_ADDRESS
```

**Option C: Manual** (Most control, but time-consuming)
```bash
# Core
railway variables set NEXT_PUBLIC_BASE_URL=https://temp.railway.app
railway variables set MAIN_URL=https://temp.railway.app
railway variables set NODE_ENV=production

# Neynar (6 vars)
railway variables set NEYNAR_API_KEY=76C0C613-378F-4562-9512-600DD84EB085
railway variables set NEYNAR_GLOBAL_API=81f742da-b485-45ca-926e-22a6bbbf3ae7
# ... (continue with remaining variables)
```

### Step 3: Deploy
```bash
railway up

# Watch logs in another terminal
railway logs --follow
```

**Expected Build Time**: 5-8 minutes
- `pnpm install`: 2-3 mins
- `pnpm run build`: 3-5 mins

### Step 4: Get Railway URL
```bash
railway domain
```

Example output:
```
gmeowbased-beta-production-a1b2c3d4.up.railway.app
```

### Step 5: Update URLs & Redeploy
```bash
# Replace with YOUR actual Railway URL
RAILWAY_URL="https://gmeowbased-beta-production-a1b2c3d4.up.railway.app"

railway variables set NEXT_PUBLIC_BASE_URL=$RAILWAY_URL
railway variables set MAIN_URL=$RAILWAY_URL
railway variables set NEXT_PUBLIC_FRAME_ORIGIN=$RAILWAY_URL

# Redeploy with correct URLs
railway up
```

---

## ✅ Quick Verification

### Check Deployment Status
```bash
railway status
```

### Check Logs for Errors
```bash
railway logs --tail 50 | grep ERROR
```

### Open in Browser
```bash
railway open
```

### Test Checklist (5 mins):
- [ ] Page loads without errors
- [ ] Farcaster feed visible (trending tab)
- [ ] Can scroll feed (infinite scroll)
- [ ] Profile dropdown works (if authenticated)
- [ ] No console errors

---

## 🔍 Troubleshooting

### Build Fails
```bash
# Check full logs
railway logs --tail 100

# Common issues:
# - Missing environment variables
# - TypeScript errors (expected - 40+, non-critical)
# - pnpm install timeout (retry: railway up)
```

### Page Won't Load
```bash
# Check if deployment is running
railway status

# Check recent logs
railway logs --tail 20

# Common issues:
# - Healthcheck timeout (normal first deploy)
# - Missing NEXT_PUBLIC_BASE_URL
# - Port binding issues (Railway auto-assigns)
```

### Contract Calls Fail
```bash
# Verify new contract addresses are set
railway variables | grep NEXT_PUBLIC_GM_BASE_CORE

# Should see: 0x9BDD11aA50456572E3Ea5329fcDEb81974137f92
# Should NOT see: 0x3ad420B8C2Be19ff8EBAdB484Ed839Ae9254bf2F (old)
```

---

## 📊 Monitoring

### Real-Time Logs
```bash
railway logs --follow
```

### Resource Usage
```bash
# Check Railway dashboard
# - Execution time: Should be < 500 hours/month
# - RAM usage: Should be < 8GB
# - Bandwidth: Should be < 100GB/month
```

---

## 🎯 Success Criteria

✅ Build completes in < 10 minutes  
✅ Page loads in < 5 seconds  
✅ Farcaster feed displays casts  
✅ No critical console errors  
✅ NEW contract addresses loaded (not old)  
✅ Supabase queries working  
✅ RPC endpoints responding  

---

## 📝 After Deployment

### Document Results:
1. Railway URL: `___________________________`
2. Build time: `_____ minutes`
3. Page load time: `_____ seconds`
4. Feed working: `YES / NO`
5. Errors encountered: `___________________________`

### Report Back:
Share results with agent for:
- Performance analysis
- Issue troubleshooting
- Phase 13 planning

---

**Ready?** Run `railway init` and follow the 5 steps! 🚂✨
