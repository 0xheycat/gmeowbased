# Cron Jobs & Automation Checklist

## 📊 Current Automation Status

### ✅ **Already Configured & Running**

| Job | Status | Platform | Schedule | Purpose |
|-----|--------|----------|----------|---------|
| **Frame Warmup** | ✅ Active | GitHub Actions | Every 10min (6am-10pm UTC)<br>Every 30min (off-hours) | Keep serverless functions warm, prevent cold starts |
| **Badge Minting** | ✅ Active | Vercel Cron | Daily at midnight UTC | Process pending badge mints from queue |

### ⏸️ **Disabled (Manual Trigger Only)**

| Job | Status | Platform | Why Disabled | How to Enable |
|-----|--------|----------|--------------|---------------|
| **Leaderboard Sync** | ⏸️ Manual Only | GitHub Actions | Performance optimization<br>(data updated on-demand) | Uncomment cron in `.github/workflows/supabase-leaderboard-sync.yml` |

### 🔄 **Real-Time (Webhook-Based - No Cron Needed)**

| Feature | Trigger | Platform | Status |
|---------|---------|----------|--------|
| **Viral Engagement Sync** | Webhook (`cast.created`) | Neynar → Next.js API | ✅ Real-time |
| **Bot Auto-Reply** | Webhook (`cast.created`) | Neynar → Next.js API | ✅ Real-time |
| **Tier Upgrades** | Webhook (`cast.created`) | Neynar → Next.js API | ✅ Real-time |
| **Push Notifications** | Webhook (`cast.created`) | Neynar → Next.js API | ✅ Real-time |

---

## 📋 Detailed Configuration

### 1. **Frame Warmup** (GitHub Actions)

**File:** `.github/workflows/warmup-frames.yml`

**Schedule:**
```yaml
# Active hours (6am-10pm UTC): Every 10 minutes
- cron: '*/10 6-22 * * *'

# Off-hours (10pm-6am UTC): Every 30 minutes  
- cron: '*/30 22-23,0-5 * * *'
```

**What it does:**
- Hits 20 frame endpoints to keep functions warm
- Maintains Redis cache for all tier variations (Mythic, Legendary, Epic, Rare, Common)
- Reduces cold starts → faster user experience
- ~80% cache hit rate expected

**Endpoints warmed:**
- `/api/frame?type=gm&fid={1,18139,5,100,99999}` (5 tiers)
- `/api/frame/image?type=gm&fid={tiers}` (image generation)
- `/api/frame/image?type=onchainstats&fid={tiers}`
- `/api/frame/image?type=badge&fid={tiers}`
- `/api/frame?type=quest&questId=1`
- `/api/frame?type=leaderboards` (FID-independent)

**Status:** ✅ **Already running** - No action needed

**To verify:**
```bash
# Check recent runs
gh workflow view "Warmup Frame Functions" --web

# Or view logs
gh run list --workflow=warmup-frames.yml --limit=5
```

---

### 2. **Badge Minting** (Vercel Cron)

**File:** `vercel.json`

**Schedule:**
```json
{
  "crons": [{
    "path": "/api/cron/mint-badges",
    "schedule": "0 0 * * *"
  }]
}
```

**What it does:**
- Processes pending badge mints from `mint_queue` table
- Mints badges on-chain via GM contract
- Sends push notifications on successful mint
- Cleans up processed queue items

**API Endpoint:** `/api/cron/mint-badges`

**Status:** ✅ **Already configured** - Runs daily at midnight UTC

**Note:** Vercel Hobby plan only supports daily cron jobs. For more frequent execution:
- Upgrade to Vercel Pro ($20/month) for hourly/minute-based schedules
- OR use GitHub Actions alternative (see Alternative Setup below)

**To verify:**
```bash
# Check Vercel dashboard
# Project → Settings → Cron Jobs → View Logs
```

---

### 3. **Leaderboard Sync** (GitHub Actions - Disabled)

**File:** `.github/workflows/supabase-leaderboard-sync.yml`

**Current Schedule:**
```yaml
# Disabled - uncomment to enable
# schedule:
#   - cron: '0 * * * *'  # Every hour
```

**Why disabled:**
- Leaderboard data is fetched on-demand (better performance)
- Reduces unnecessary API calls to RPC endpoints
- Hourly sync was adding latency without clear benefit

**What it does (when enabled):**
- Fetches on-chain leaderboard data from 5 chains (Base, OP, Celo, Unichain, Ink)
- Syncs to Supabase `leaderboard_snapshot` table
- Aggregates cross-chain XP, streaks, quests

**To enable:**
1. Edit `.github/workflows/supabase-leaderboard-sync.yml`
2. Uncomment the schedule section:
   ```yaml
   on:
     schedule:
       - cron: '0 * * * *'  # Hourly
   ```
3. Commit and push to main branch

**Requirements if enabled:**
```bash
# GitHub Secrets needed (already configured)
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
RPC_BASE
RPC_OP
RPC_CELO
RPC_UNICHAIN
RPC_INK
```

**Recommendation:** ⏸️ **Keep disabled** unless you need historical snapshots

---

### 4. **GM Reminders** (Manual Script - No Cron)

**File:** `scripts/automation/send-gm-reminders.ts`

**Purpose:** Send push notifications to users who haven't GM'd today

**How to run:**
```bash
# Dry run (test without sending)
npm run notifications:gm-reminders -- --dry-run

# Send actual reminders (max 100)
npm run notifications:gm-reminders -- --max 100

# Custom reminder window (180 minutes before GM expires)
npm run notifications:gm-reminders -- --window-minutes 180
```

**Status:** 📝 **Manual only** - Not automated yet

**To automate with GitHub Actions:**

Create `.github/workflows/gm-reminders.yml`:
```yaml
name: GM Reminders

on:
  schedule:
    # Run twice daily at 9 AM and 9 PM UTC
    - cron: '0 9,21 * * *'
  workflow_dispatch:

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - run: pnpm install --frozen-lockfile
      - name: Send GM reminders
        env:
          NEYNAR_API_KEY: ${{ secrets.NEYNAR_API_KEY }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: npm run notifications:gm-reminders -- --max 100
```

**Recommendation:** ⏳ **Consider automating** if user engagement drops

---

### 5. **Viral Engagement Sync** (Real-Time Webhook)

**Trigger:** Neynar webhook → `/api/neynar/webhook`

**Event:** `cast.created`

**What it does:**
- ✅ Auto-syncs engagement metrics (likes, recasts, replies) for badge casts
- ✅ Detects tier upgrades (active → engaging → popular → viral → mega viral)
- ✅ Awards incremental XP bonuses (25 to 500 XP)
- ✅ Sends push notifications for achievements
- ✅ Tracks viral achievements (Viral Wizard, Engagement King, etc.)

**Status:** ✅ **Already configured** - Real-time processing

**No cron job needed** - webhook handles everything automatically!

See: `NEYNAR-WEBHOOK-SETUP.md` for webhook configuration

---

## 🚀 Recommended Setup for Production

### **Minimal (Current Setup)**

✅ This is what you have NOW (fully functional):

1. **Frame Warmup** (GitHub Actions) - ✅ Running
2. **Badge Minting** (Vercel Cron daily) - ✅ Running
3. **Viral Engagement** (Real-time webhook) - ✅ Running
4. **Bot Auto-Reply** (Real-time webhook) - ✅ Running

### **Enhanced Setup (Optional)**

💡 Consider adding these for better engagement:

1. **GM Reminders** (GitHub Actions twice daily)
   - Sends push notifications to users who haven't GM'd
   - Increases daily active users
   - Run at 9 AM and 9 PM UTC

2. **Leaderboard Sync** (GitHub Actions hourly)
   - Only if you need historical leaderboard snapshots
   - Useful for analytics and trends
   - Adds ~1-2 min processing time per hour

### **Advanced Setup (Pro Tier Only)**

💰 Requires Vercel Pro ($20/month):

1. **Badge Minting** (every 5 minutes instead of daily)
   - Faster badge delivery to users
   - Change schedule to: `"schedule": "*/5 * * * *"`

2. **Quest Expiration** (hourly)
   - Auto-close expired quests
   - Send notifications for expiring quests
   - Endpoint: `/api/cron/expire-quests`

---

## 📊 Monitoring & Health Checks

### **Check GitHub Actions Status**

```bash
# View all workflows
gh workflow list

# View recent runs
gh run list --limit 10

# View specific workflow
gh workflow view "Warmup Frame Functions" --web
gh workflow view "Supabase Leaderboard Sync" --web
```

### **Check Vercel Cron Jobs**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Settings → Cron Jobs
4. View execution logs

### **Check Webhook Health**

```bash
# Bot health check
curl https://gmeowhq.art/api/bot/health

# Webhook endpoint (should return 400 without signature)
curl -I https://gmeowhq.art/api/neynar/webhook
```

### **Check Viral Engagement Stats**

```bash
# Viral leaderboard
curl https://gmeowhq.art/api/viral/leaderboard

# Badge metrics for user
curl https://gmeowhq.art/api/viral/badge-metrics?fid=18139
```

---

## 🐛 Troubleshooting

### **GitHub Actions Not Running**

1. Check if workflow is enabled:
   - GitHub repo → Actions tab
   - Find workflow → Enable if disabled

2. Check cron schedule syntax:
   ```yaml
   # ✅ Correct
   - cron: '0 * * * *'  # Every hour
   
   # ❌ Wrong
   - cron: '0 * * * *'  # Missing quotes
   ```

3. Check GitHub Secrets:
   - Settings → Secrets and variables → Actions
   - Ensure all required secrets are set

### **Vercel Cron Not Running**

1. Check if cron is configured:
   - Vercel Dashboard → Settings → Cron Jobs
   - Should show badge minting job

2. Check endpoint exists:
   ```bash
   curl -I https://gmeowhq.art/api/cron/mint-badges
   # Should return 401 (unauthorized) - this is correct
   ```

3. Check Vercel logs:
   - Deployments → Latest → Logs
   - Filter by "cron"

### **Webhook Not Processing**

1. Check Neynar dashboard:
   - Webhooks → View logs
   - Should show successful deliveries

2. Check webhook secret matches:
   ```bash
   # In your .env
   NEYNAR_WEBHOOK_SECRET=your_secret_here
   ```

3. Check bot credentials:
   ```bash
   NEYNAR_BOT_FID=your_bot_fid
   NEYNAR_BOT_SIGNER_UUID=your_signer_uuid
   ```

---

## 📚 Related Documentation

- **Webhook Setup:** `NEYNAR-WEBHOOK-SETUP.md`
- **GitHub Actions Fix:** `docs/architecture/analysis/GITHUB_ACTIONS_CRON_FIX.md`
- **Badge Minting:** `Docs/Maintenance/frame/archives/nov-2025/BADGE_MINTING_AUTOMATION_COMPLETE_20251119.md`
- **Viral System:** `lib/viral-bonus.ts`, `lib/viral-engagement-sync.ts`

---

## ✅ Summary

### **You Already Have (✅ Running):**
1. Frame warmup (GitHub Actions - every 10-30min)
2. Badge minting (Vercel Cron - daily)
3. Viral engagement sync (Real-time webhook)
4. Bot auto-reply (Real-time webhook)

### **You DON'T Need (Already Handled):**
- ❌ Separate viral engagement cron (webhook handles it)
- ❌ Manual leaderboard sync (on-demand is better)
- ❌ Badge queue cleanup (handled by minting cron)

### **You MIGHT Want (Optional):**
- 💡 GM reminders (twice daily via GitHub Actions)
- 💡 Leaderboard snapshots (hourly via GitHub Actions)
- 💰 Faster badge minting (requires Vercel Pro)

---

## 🎉 You're All Set!

Your current automation setup is **production-ready** and handles all critical features:
- ✅ Frames stay warm (fast loading)
- ✅ Badges mint automatically (daily)
- ✅ Viral bonuses award in real-time (webhook)
- ✅ Bot responds instantly (webhook)

No additional cron jobs required for core functionality! 🚀
