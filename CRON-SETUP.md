# Cron Job Setup Guide

## Overview

The Neynar wallet sync cron job automatically updates multi-wallet configurations for active users every 6 hours.

**Endpoint**: `/api/cron/sync-neynar-wallets`  
**Schedule**: Every 6 hours (`0 */6 * * *`)  
**Scope**: Top 1000 active users (updated in last 30 days)  
**Duration**: ~2 minutes per run

---

## Deployment Steps

### 1. Set Environment Variable

Add to your Vercel project settings:

```bash
CRON_SECRET=<your-secret-token>
```

**Generate secret**:
```bash
openssl rand -base64 32
```

Or use any secure random string generator.

### 2. Verify Configuration

The `vercel.json` file already includes:

```json
{
  "crons": [{
    "path": "/api/cron/sync-neynar-wallets",
    "schedule": "0 */6 * * *"
  }]
}
```

### 3. Deploy to Vercel

```bash
git push origin main
```

Vercel will automatically:
- Detect the cron configuration
- Schedule the job
- Run it every 6 hours starting from deployment

### 4. Verify Setup

**Via Vercel Dashboard**:
1. Go to your project → Settings → Cron Jobs
2. Verify the job is listed and enabled
3. Check execution logs after first run

**Manual Test** (optional):
```bash
curl -X GET https://your-app.vercel.app/api/cron/sync-neynar-wallets \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## How It Works

### Process Flow

```
1. Query active users (updated in last 30 days)
2. Batch sync in groups of 10 (rate limiting)
3. For each user:
   - Fetch wallet data from Neynar API
   - Update user_profiles table
   - Log sync status
4. Return statistics
```

### Response Format

```json
{
  "success": true,
  "stats": {
    "processed": 1000,
    "successful": 987,
    "failed": 13,
    "duration": "112000ms"
  }
}
```

### Error Handling

- **Rate limit exceeded**: Waits 1 second between batches
- **Neynar API down**: Continues with remaining users
- **Database errors**: Logged but non-blocking

---

## Monitoring

### Check Logs

**Vercel Dashboard**:
- Go to Deployments → Functions
- Filter by `/api/cron/sync-neynar-wallets`
- View execution logs

**Expected logs**:
```
[Cron:SyncWallets] Processing 1000 active users...
[syncWalletsFromNeynar] ✅ Synced 3 wallets for FID 18139
[Cron:SyncWallets] ✅ Complete: 987 success, 13 failed (112000ms)
```

### Success Metrics

- ✅ 95%+ success rate (expected ~98%)
- ✅ Execution time: 1.5-3 minutes
- ✅ No timeouts (5 min limit)
- ✅ Database updates reflected in user_profiles

---

## Manual Execution

### Trigger Manually

```bash
# Using curl
curl -X GET https://your-app.vercel.app/api/cron/sync-neynar-wallets \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Using Vercel CLI
vercel env pull
vercel cron run api/cron/sync-neynar-wallets
```

### Force Sync Single User

```typescript
// In your app or API route
import { syncWalletsFromNeynar } from '@/lib/integrations/neynar-wallet-sync'

await syncWalletsFromNeynar(fid, true) // forceUpdate = true
```

---

## Troubleshooting

### Job Not Running

1. **Check Vercel project settings**:
   - Cron Jobs section should show the job
   - Ensure project is on Pro plan (crons require Pro)

2. **Verify environment variable**:
   ```bash
   vercel env ls
   # Should show CRON_SECRET
   ```

3. **Check deployment logs**:
   - Look for cron job registration messages
   - Verify no build errors

### High Failure Rate

1. **Neynar API issues**:
   - Check Neynar status page
   - Verify API key is valid
   - Review rate limits (we batch to respect limits)

2. **Database issues**:
   - Check Supabase health
   - Verify RLS policies allow updates
   - Check connection pool usage

### Timeout Errors

If hitting 5-minute timeout:
1. Reduce batch size in code (currently 1000 users)
2. Increase batch processing size (currently 10 users/batch)
3. Optimize database queries

---

## Integration with 3-Layer Sync

The cron job is **Layer 3** of the hybrid sync system:

**Layer 1 (Real-Time)**: Auth context auto-sync on wallet connect  
**Layer 2 (On-Demand)**: Profile fetch background sync  
**Layer 3 (Batch)**: This cron job - keeps top 1000 users fresh

All layers write to the same `user_profiles` table, ensuring consistency.

---

## Cost Estimation

**Vercel Pricing** (Pro Plan):
- Cron jobs: Included in Pro plan
- Function executions: ~4 runs/day = ~120 runs/month
- Duration: ~2 min/run = ~240 min/month
- Cost: Free tier covers this easily

**Neynar API**:
- ~1000 API calls per run
- ~4000 calls/day
- Check your plan limits (most plans allow 10k+/day)

---

## Security

✅ **Authentication**: Bearer token required (CRON_SECRET)  
✅ **Authorization**: Only Vercel cron can trigger (IP whitelist)  
✅ **Rate limiting**: Respects Neynar API limits  
✅ **Error handling**: Fails gracefully, doesn't expose secrets

**Best practices**:
- Rotate CRON_SECRET quarterly
- Monitor execution logs for anomalies
- Set up alerts for high failure rates

---

## Next Steps

After deployment:
1. Monitor first few executions
2. Verify wallet data updates in database
3. Check user profiles show updated wallets
4. Set up alerts for failures (optional)

For issues or questions, check logs first, then review this guide.
