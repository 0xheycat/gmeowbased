# Badge Minting - Vercel Hobby Plan Workaround

**Date:** November 20, 2025  
**Issue:** Vercel Hobby plan only supports daily cron jobs (not 5-minute intervals)  
**Solution:** Daily cron + manual trigger endpoint

---

## Problem

Vercel Hobby plan limitation:
```
Error: Hobby accounts are limited to daily cron jobs. 
This cron expression (*/5 * * * *) would run more than once per day.
Upgrade to the Pro plan to unlock all Cron Jobs features on Vercel.
```

**Hobby Plan:** Once per day maximum  
**Pro Plan ($20/month):** Unlimited frequency

---

## Solution: Hybrid Approach

### Architecture

```
Badge Earned
     ↓
Assigned to Database (minted: false)
     ↓
Added to mint_queue (status: pending)
     ↓
     ├─> Daily Cron (automatic at midnight)
     │   └─> Processes all pending mints
     │
     └─> Manual Trigger (on-demand)
         └─> POST /api/badges/mint-manual
             └─> Immediate processing (admin only)
```

---

## Implementation

### 1. Daily Cron Job (Automatic)

**Configuration:** `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/mint-badges",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Schedule:** `0 0 * * *` = Every day at midnight (UTC)  
**Behavior:** Processes ALL pending mints in queue  
**Capacity:** Unlimited (processes entire queue)

### 2. Manual Trigger Endpoint (On-Demand)

**Endpoint:** `POST /api/badges/mint-manual`

**Features:**
- Immediate badge minting without waiting for daily cron
- Admin-only access (requires ADMIN_ACCESS_CODE)
- Rate limited (strictLimiter: 10 req/min)
- Configurable batch size (1-50 mints)
- Dry run support for testing

**Request:**
```bash
curl -X POST https://gmeowhq.art/api/badges/mint-manual \
  -H "Authorization: Bearer YOUR_ADMIN_ACCESS_CODE" \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 10,
    "dryRun": false
  }'
```

**Response:**
```json
{
  "success": true,
  "result": {
    "success": 3,
    "failed": 0,
    "processed": 3,
    "skipped": 0
  },
  "duration": 12453,
  "timestamp": "2025-11-20T00:15:00.000Z"
}
```

---

## Usage Patterns

### Pattern 1: Let Daily Cron Handle Everything

**Best for:** Low-traffic apps, badge rewards aren't time-critical

**User Experience:**
- User earns badge → Shows "Mint Pending"
- Wait until midnight UTC
- Badge minted automatically
- Shows "Minted" status next day

**Pros:**
- ✅ Zero manual intervention
- ✅ No API calls needed
- ✅ Works perfectly on Hobby plan

**Cons:**
- ❌ Up to 24-hour delay for minting
- ❌ Users see "Mint Pending" for hours

### Pattern 2: Manual Trigger for VIP/Special Badges

**Best for:** Important milestones, legendary badges, special events

**User Experience:**
- User earns legendary badge
- Admin gets notification
- Admin triggers manual mint
- Badge minted within seconds
- User sees "Minted" immediately

**Workflow:**
1. User earns rare badge
2. Webhook notification sent
3. Admin dashboard shows alert
4. Admin clicks "Mint Now" button
5. Calls POST /api/badges/mint-manual
6. Badge minted immediately

**Pros:**
- ✅ Immediate minting for important badges
- ✅ Flexible control
- ✅ Great user experience for special moments

**Cons:**
- ❌ Requires manual intervention
- ❌ Rate limited (10 req/min)

### Pattern 3: Automated Manual Triggers

**Best for:** Semi-automated processing with external scheduling

**Implementation:**
```bash
# Use external cron service (free)
# Run every 30 minutes via cron-job.org or similar

*/30 * * * * curl -X POST https://gmeowhq.art/api/badges/mint-manual \
  -H "Authorization: Bearer $ADMIN_ACCESS_CODE" \
  -H "Content-Type: application/json" \
  -d '{"limit": 20}'
```

**Free Services:**
- [cron-job.org](https://cron-job.org) - Free, up to 1-minute intervals
- [EasyCron](https://www.easycron.com) - Free tier available
- [GitHub Actions](https://docs.github.com/actions) - Free for public repos

**Pros:**
- ✅ 30-minute minting cycle
- ✅ Free external service
- ✅ Automated workflow

**Cons:**
- ❌ Requires external service setup
- ❌ Less reliable than native Vercel cron

---

## Configuration

### Environment Variables

**Vercel Dashboard (Settings → Environment Variables):**

```bash
# Required (already set)
ADMIN_ACCESS_CODE=pZhDMxF3U2vb3mIvFRZxcDwXZSMN2dtB

# Optional
WEBHOOK_SECRET=k6HjxTLRqruxyukjQD+CzxEHXQ8AHJ+3xJ55RU0yG/M=
BADGE_MINT_WEBHOOK_URL=https://gmeowhq.art/api/webhooks/badge-minted
```

### Rate Limits

**Daily Cron:** No limit (processes entire queue)  
**Manual Trigger:** 10 requests per minute (strictLimiter)

---

## Testing

### Test Daily Cron Locally

```bash
# Start dev server
pnpm dev

# Simulate cron execution
curl -X POST http://localhost:3000/api/cron/mint-badges \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Test Manual Trigger

```bash
# Manual mint (limit 10)
curl -X POST http://localhost:3000/api/badges/mint-manual \
  -H "Authorization: Bearer $ADMIN_ACCESS_CODE" \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'

# Dry run (test without minting)
curl -X POST http://localhost:3000/api/badges/mint-manual \
  -H "Authorization: Bearer $ADMIN_ACCESS_CODE" \
  -H "Content-Type: application/json" \
  -d '{"limit": 10, "dryRun": true}'
```

### Integration with Badge Assignment

Badge assignment API already queues mints:
```bash
# Assign badge (automatically adds to mint_queue)
curl -X POST https://gmeowhq.art/api/badges/assign \
  -H "Content-Type: application/json" \
  -d '{"fid": 18139, "badgeId": "neon-initiate"}'

# Check queue status
# (requires database access or queue status API)

# Trigger manual mint
curl -X POST https://gmeowhq.art/api/badges/mint-manual \
  -H "Authorization: Bearer $ADMIN_ACCESS_CODE" \
  -H "Content-Type: application/json" \
  -d '{"limit": 5}'

# Verify badge minted
curl https://gmeowhq.art/api/badges/list?fid=18139
```

---

## Deployment

### Deploy to Vercel

```bash
# Commit changes
git add vercel.json app/api/badges/mint-manual/route.ts
git commit -m "feat: add daily cron + manual mint trigger for Hobby plan"
git push origin main

# Deploy (should succeed now with daily cron)
vercel --prod
```

### Verify Deployment

1. **Check Cron Job:**
   - Vercel Dashboard → Settings → Cron Jobs
   - Should show: `0 0 * * *` (daily at midnight)

2. **Test Manual Endpoint:**
   ```bash
   curl https://gmeowhq.art/api/badges/mint-manual
   # Should return status info
   ```

3. **Test Manual Mint:**
   ```bash
   curl -X POST https://gmeowhq.art/api/badges/mint-manual \
     -H "Authorization: Bearer $ADMIN_ACCESS_CODE" \
     -H "Content-Type: application/json" \
     -d '{"limit": 1, "dryRun": true}'
   ```

---

## Monitoring

### Check Mint Queue Depth

```sql
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM mint_queue
WHERE status = 'pending'
GROUP BY status;
```

**Thresholds:**
- 0-10 pending: Normal
- 11-50 pending: Consider manual trigger
- 51-100 pending: Trigger manual mint
- 100+ pending: Investigate issues

### Daily Cron Health

**Check logs after midnight UTC:**
```bash
vercel logs --production --filter=/api/cron/mint-badges
```

**Expected output:**
```
[Cron] Starting badge mint batch processing...
[Worker] Processing 15 pending mints
[Worker] Mint successful: 0x123...
[Cron] Batch complete: 15 success, 0 failed
```

---

## Upgrade Path

### If You Need Faster Minting

**Option A: Upgrade to Vercel Pro ($20/month)**
- Change schedule back to `*/5 * * * *`
- 5-minute minting cycle
- Professional hosting

**Option B: External Cron Service (Free)**
- Keep Vercel Hobby
- Use cron-job.org for frequent triggers
- Call /api/badges/mint-manual every 30 minutes

**Option C: Hybrid (Recommended)**
- Daily Vercel cron for bulk processing
- External service for urgent mints
- Manual trigger for special occasions

---

## FAQ

### Q: Will users see long "Mint Pending" times?

**A:** Yes, up to 24 hours with daily cron. Options:
1. Accept delay (badges still assigned immediately)
2. Manual trigger for important badges
3. External cron service for faster processing
4. Upgrade to Pro for 5-minute cycle

### Q: Can I automate manual triggers?

**A:** Yes! Use external cron services:
- cron-job.org (free, 1-minute intervals)
- GitHub Actions (free)
- Railway/Render (free tier)

### Q: What happens if daily cron fails?

**A:** 
1. Check Vercel logs for errors
2. Manually trigger mint: POST /api/badges/mint-manual
3. Investigate and fix issue
4. Queue will process next day automatically

### Q: How many badges can daily cron process?

**A:** Unlimited! Processes entire queue. No batch size limit for daily cron.

### Q: Can I still use 5-minute intervals locally?

**A:** Yes! Local development isn't restricted. Just change vercel.json back for local testing.

---

## Comparison: Hobby vs Pro

| Feature | Hobby (Free) | Pro ($20/mo) |
|---------|--------------|--------------|
| Cron Frequency | Daily only | Any frequency |
| Badge Mint Delay | Up to 24 hours | 5 minutes |
| Manual Trigger | Yes | Yes |
| Queue Capacity | Unlimited | Unlimited |
| Cost | $0/month | $20/month |

**Recommendation for Hobby:**
- Daily cron for bulk processing
- Manual trigger for urgent cases
- External cron for 30-min intervals (free)

---

## Summary

**Current Setup (Hobby Plan):**
- ✅ Daily cron at midnight (automatic)
- ✅ Manual trigger endpoint (on-demand)
- ✅ Badge queue working correctly
- ✅ Webhook notifications ready

**User Experience:**
- Badges assigned immediately (minted: false)
- Show "Mint Pending" status
- Minted within 24 hours (daily cron)
- Or immediately (manual trigger)

**Next Steps:**
1. Deploy with daily cron schedule
2. Test manual trigger endpoint
3. Monitor queue depth
4. Consider external cron if needed

**Status:** ✅ Ready for production on Vercel Hobby plan
