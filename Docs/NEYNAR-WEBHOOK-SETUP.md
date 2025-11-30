# Neynar Webhook Configuration for Viral Bonus System

## 🎯 Overview

Your Gmeowbased app has a **complete viral bonus system** that automatically:
- ✅ Syncs cast engagement metrics (likes, recasts, replies)
- ✅ Detects tier upgrades (active → engaging → popular → viral → mega viral)
- ✅ Awards incremental XP bonuses for viral growth
- ✅ Sends push notifications for achievements
- ✅ Responds to bot mentions with smart frame embeds

## 🔗 Webhook Configuration Required

### 1. **Main Webhook Endpoint**

**Webhook URL:**
```
https://gmeowhq.art/api/neynar/webhook
```

**Required Configuration on Neynar Dashboard:**

#### A. **Webhook Secret**
- Set in your environment: `NEYNAR_WEBHOOK_SECRET=your_secret_here`
- Must match the secret configured in Neynar dashboard
- Used for HMAC signature verification

#### B. **Events to Subscribe**

You need to configure **ONE webhook subscription** for the following event:

##### 🎯 **Primary Event: `cast.created`**

**Purpose:** This single event powers ALL features:
1. **Bot Auto-Reply**: Responds to @mentions with smart frame embeds
2. **Viral Engagement Sync**: Tracks engagement metrics for badge casts
3. **Tier Upgrade Detection**: Detects when casts reach new viral tiers
4. **Achievement Awards**: Auto-awards achievements for milestones
5. **Push Notifications**: Sends notifications for tier upgrades

**Event Type:** `cast.created`

**Filters (Optional but Recommended):**
```
Filter by: Mentions
Include: @gmeowbased (your bot FID)
```

**Why This Works:**
- Every time someone creates a cast mentioning @gmeowbased, the webhook fires
- The webhook handler checks if it's a badge cast and syncs engagement
- The bot also replies with a helpful frame embed
- Background: Viral engagement sync runs async without blocking

---

### 2. **Additional Webhook Events (Already Configured)**

Your webhook handler also supports these Miniapp events (no additional config needed):

#### Miniapp Management Events
- ✅ `miniapp_added` - User adds your app
- ✅ `miniapp_removed` - User removes your app  
- ✅ `notifications_enabled` - User enables push notifications
- ✅ `notifications_disabled` - User disables push notifications

**These events are auto-handled** when they arrive at the webhook endpoint.

---

## 📋 Step-by-Step Setup on Neynar Dashboard

### **Step 1: Navigate to Webhooks**
1. Go to [Neynar Developer Dashboard](https://dev.neynar.com)
2. Select your app
3. Click **Webhooks** in the sidebar

### **Step 2: Create New Webhook**
1. Click **"Create Webhook"**
2. Enter webhook details:
   - **Name:** `Gmeowbased Main Webhook`
   - **URL:** `https://gmeowhq.art/api/neynar/webhook`
   - **Secret:** Copy from your `NEYNAR_WEBHOOK_SECRET` env var

### **Step 3: Configure Events**
1. Under **"Events to Subscribe"**, select:
   - ✅ **`cast.created`** ← CRITICAL

2. Under **"Filters"** (recommended):
   - Filter Type: **Mentions**
   - Include FID: **Your bot FID** (from `NEYNAR_BOT_FID`)

### **Step 4: Save and Test**
1. Click **"Create Webhook"**
2. Status should show: **Active** ✅
3. Test by mentioning @gmeowbased in a cast

---

## 🔍 How Viral Bonus System Works

### **Engagement Flow:**

```
1. User shares badge cast on Farcaster
   ↓
2. Cast gets engagement (likes, recasts, replies)
   ↓
3. When cast.created webhook fires (or someone mentions it):
   - Webhook checks if cast is a badge cast
   - Syncs engagement metrics from Neynar API
   - Calculates engagement score (recasts×10 + replies×5 + likes×2)
   ↓
4. Tier Detection:
   - Score ≥100 → Mega Viral (500 XP)
   - Score ≥50  → Viral (250 XP)
   - Score ≥25  → Popular (100 XP)
   - Score ≥10  → Engaging (50 XP)
   - Score ≥5   → Active (25 XP)
   ↓
5. If tier upgraded:
   - Award incremental XP bonus
   - Send push notification
   - Check for achievements (Viral Wizard, Engagement King, etc.)
   ↓
6. User sees notification and bonus XP in app
```

### **Viral Tiers:**

| Tier | Score | XP Bonus | Emoji |
|------|-------|----------|-------|
| Mega Viral | 100+ | 500 | 🔥 |
| Viral | 50-99 | 250 | ⚡ |
| Popular | 25-49 | 100 | 🌟 |
| Engaging | 10-24 | 50 | 💫 |
| Active | 5-9 | 25 | ✨ |

**Score Calculation:**
```
score = (recasts × 10) + (replies × 5) + (likes × 2)
```

---

## 🧪 Testing Viral Bonus System

### **Test 1: Bot Auto-Reply**
1. Create a cast mentioning @gmeowbased
2. Expected: Bot replies with helpful frame embed
3. Check: `https://gmeowhq.art/api/bot/health`

### **Test 2: Viral Engagement Sync**
1. Share a badge cast (must be in `badge_casts` table)
2. Get some engagement (likes, recasts, replies)
3. Mention @gmeowbased in a reply to that cast
4. Expected: Engagement metrics sync, XP awarded if tier upgraded
5. Check database: `badge_casts` table should show updated metrics

### **Test 3: Push Notifications**
1. Enable notifications in your miniapp
2. Share a badge cast
3. Get enough engagement to trigger tier upgrade
4. Expected: Push notification sent to your device

### **Test 4: Check Webhook Logs**
```bash
# Check webhook endpoint
curl -I https://gmeowhq.art/api/neynar/webhook

# Check bot health
curl https://gmeowhq.art/api/bot/health
```

---

## 🔑 Required Environment Variables

Make sure these are set in your production environment (Vercel):

```bash
# Neynar API (Required)
NEYNAR_API_KEY=your_api_key
NEYNAR_WEBHOOK_SECRET=your_webhook_secret
NEYNAR_BOT_FID=your_bot_fid
NEYNAR_BOT_SIGNER_UUID=your_signer_uuid

# Supabase (Required for viral system)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 📊 Database Schema for Viral System

Your Supabase database should have these tables:

### **`badge_casts`** (stores engagement metrics)
```sql
CREATE TABLE badge_casts (
  cast_hash TEXT PRIMARY KEY,
  fid BIGINT NOT NULL,
  badge_type TEXT,
  reactions_count INT DEFAULT 0,
  recasts_count INT DEFAULT 0,
  replies_count INT DEFAULT 0,
  engagement_score INT DEFAULT 0,
  viral_tier TEXT DEFAULT 'none',
  viral_bonus_xp INT DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **`viral_achievements`** (tracks achievements)
```sql
CREATE TABLE viral_achievements (
  id BIGSERIAL PRIMARY KEY,
  fid BIGINT NOT NULL,
  achievement_type TEXT NOT NULL,
  cast_hash TEXT,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fid, achievement_type)
);
```

### **`notification_tokens`** (push notifications)
```sql
CREATE TABLE notification_tokens (
  id BIGSERIAL PRIMARY KEY,
  fid BIGINT NOT NULL,
  token TEXT NOT NULL,
  notification_url TEXT NOT NULL,
  status TEXT DEFAULT 'enabled',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🚀 Deployment Checklist

- [ ] Webhook configured on Neynar dashboard
- [ ] `cast.created` event subscribed
- [ ] Webhook secret matches environment variable
- [ ] Bot FID and signer UUID configured
- [ ] Supabase tables created
- [ ] Environment variables set in production
- [ ] Test bot mention → receives reply
- [ ] Test viral engagement → XP awarded
- [ ] Test push notification → received on device

---

## 🐛 Troubleshooting

### **Bot Not Responding to Mentions**
- Check webhook is active on Neynar dashboard
- Verify `NEYNAR_WEBHOOK_SECRET` matches
- Check bot health: `https://gmeowhq.art/api/bot/health`
- View webhook logs in Neynar dashboard

### **Viral Engagement Not Syncing**
- Ensure cast is in `badge_casts` table
- Check Neynar API key is valid
- View webhook logs: cast must be badge cast to sync

### **Push Notifications Not Sending**
- User must enable notifications in miniapp
- Check `notification_tokens` table has valid token
- Verify notification URL is correct

### **Webhook Signature Verification Failing**
- Check `NEYNAR_WEBHOOK_SECRET` in environment
- Verify secret matches Neynar dashboard
- Check webhook logs for signature mismatch

---

## 📚 Related Documentation

- **Viral Bonus Logic:** `lib/viral-bonus.ts`
- **Engagement Sync:** `lib/viral-engagement-sync.ts`
- **Achievement System:** `lib/viral-achievements.ts`
- **Push Notifications:** `lib/viral-notifications.ts`
- **Bot Auto-Reply:** `lib/agent-auto-reply.ts`
- **Frame Builder:** `lib/bot-frame-builder.ts`

---

## 🎉 Success!

Once configured, your viral bonus system will:
- ✅ Auto-sync engagement metrics for badge casts
- ✅ Award XP bonuses for tier upgrades  
- ✅ Send push notifications for achievements
- ✅ Reply to mentions with helpful frames
- ✅ Track viral achievements automatically

**Need help?** Check the webhook logs on Neynar dashboard or view server logs in Vercel.
