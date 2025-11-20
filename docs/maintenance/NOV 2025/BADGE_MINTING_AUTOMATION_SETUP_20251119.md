# Badge Minting Automation Setup

**Date:** November 19, 2025  
**Status:** ✅ Complete  
**Components:** Vercel Cron, Worker Script, Webhook Notifications

---

## Overview

Automated badge minting system that processes pending badge mints from the `mint_queue` table every 5 minutes via Vercel Cron jobs.

### Architecture

```
User Earns Badge
      ↓
Badge Assignment API
      ↓
Insert into mint_queue (status: pending)
      ↓
[AUTOMATED - Vercel Cron runs every 5 minutes]
      ↓
GET /api/cron/mint-badges (with CRON_SECRET)
      ↓
processBatch() from mint-badge-queue.ts
      ↓
Mint on blockchain (5 per batch)
      ↓
Update user_badges (minted: true)
      ↓
Send webhook notification (optional)
      ↓
[USER SEES BADGE WITH "MINTED" STATUS]
```

---

## Components

### 1. Vercel Cron Job

**Configuration:** `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/mint-badges",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Schedule:** Every 5 minutes (*/5 * * * *)  
**Endpoint:** POST /api/cron/mint-badges  
**Security:** Requires `CRON_SECRET` in Authorization header  
**Max Duration:** 300 seconds (5 minutes)

### 2. Cron API Endpoint

**File:** `app/api/cron/mint-badges/route.ts`

**Features:**
- Verifies CRON_SECRET to prevent unauthorized execution
- Calls processBatch() from mint worker
- Returns batch processing results
- Logs execution time and results
- Supports GET in development mode for testing

**Example Response:**
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
  "timestamp": "2025-11-19T23:15:00.000Z"
}
```

### 3. Mint Worker Script

**File:** `scripts/automation/mint-badge-queue.ts`

**Updated Features:**
- Returns structured result object for monitoring
- Sends webhook notifications on successful mints
- Non-blocking webhook calls (don't fail mint if webhook fails)
- Tracks success/failed/processed/skipped counts
- Graceful shutdown support (SIGINT/SIGTERM)

**Configuration:**
```bash
# Required
ORACLE_PRIVATE_KEY=0x...              # Wallet for minting
CRON_SECRET=your-secret-here          # Vercel cron authentication

# Optional
BADGE_MINT_WEBHOOK_URL=https://...    # Webhook endpoint
WEBHOOK_SECRET=your-webhook-secret    # Webhook authentication
MINT_BATCH_SIZE=5                     # Mints per batch
MINT_INTERVAL_MS=30000                # 30s between batches
MINT_MAX_RETRIES=3                    # Max retry attempts
```

### 4. Webhook Endpoint

**File:** `app/api/webhooks/badge-minted/route.ts`

**Features:**
- Receives notifications when badges are minted
- Rate limited (webhookLimiter: 500 req/5min)
- Verifies WEBHOOK_SECRET
- Zod schema validation
- Extensible for custom logic

**Payload Schema:**
```typescript
{
  fid: number,
  badgeId: string,
  badgeType: string,
  tier: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic',
  txHash: string,
  tokenId: number,
  chain: 'base' | 'ink' | 'unichain' | 'optimism',
  contractAddress: string,
  mintedAt: string (ISO timestamp)
}
```

**Use Cases:**
- Send Miniapp notifications to users
- Track analytics events
- Award bonus XP for rare badge mints
- Trigger social sharing prompts
- Update leaderboards

### 5. End-to-End Test Script

**File:** `scripts/test-badge-minting.ts`

**Usage:**
```bash
# Test with specific FID
pnpm test:badge-minting --fid 18139

# Test specific badge type
pnpm test:badge-minting --fid 18139 --badge-type pulse_runner

# Test mint queue processing only (skip assignment)
pnpm test:badge-minting --fid 18139 --skip-assign

# Test with custom webhook URL
pnpm test:badge-minting --fid 18139 --webhook-url http://localhost:3000/api/webhooks/badge-minted
```

**Test Flow:**
1. ✅ Assign badge to user (unless --skip-assign)
2. ✅ Verify entry in mint_queue
3. ✅ Run mint worker manually
4. ✅ Verify badge minted on-chain
5. ✅ Check webhook notification

---

## Environment Variables

### Required for Production

```bash
# Badge Minting
ORACLE_PRIVATE_KEY=0x...              # Wallet private key for minting
BADGE_CONTRACT_BASE=0x...             # Base chain contract
BADGE_CONTRACT_INK=0x...              # Ink chain contract
BADGE_CONTRACT_UNICHAIN=0x...         # Unichain contract
BADGE_CONTRACT_OPTIMISM=0x...         # Optimism contract

# Vercel Cron
CRON_SECRET=your-secret-here          # Generate: openssl rand -base64 32
```

### Optional (Webhooks)

```bash
# Webhook Notifications
BADGE_MINT_WEBHOOK_URL=https://gmeowhq.art/api/webhooks/badge-minted # Webhook endpoint
WEBHOOK_SECRET=your-webhook-secret    # Generate: openssl rand -base64 32

# Worker Configuration
MINT_BATCH_SIZE=5                     # Default: 5 mints per batch
MINT_INTERVAL_MS=30000                # Default: 30 seconds (for standalone worker)
MINT_MAX_RETRIES=3                    # Default: 3 retry attempts
```

### Generate Secrets

```bash
# Generate CRON_SECRET
openssl rand -base64 32

# Generate WEBHOOK_SECRET
openssl rand -base64 32
```

---

## Deployment

### 1. Configure Environment Variables

**Vercel Dashboard:**
1. Go to Project Settings → Environment Variables
2. Add required variables:
   - `ORACLE_PRIVATE_KEY` (Production only)
   - `CRON_SECRET` (All environments)
   - `BADGE_MINT_WEBHOOK_URL` (Optional)
   - `WEBHOOK_SECRET` (Optional)

**Local Development (.env.local):**
```bash
ORACLE_PRIVATE_KEY=0x...
CRON_SECRET=dev-secret-12345
BADGE_MINT_WEBHOOK_URL=http://localhost:3000/api/webhooks/badge-minted
WEBHOOK_SECRET=dev-webhook-secret
```

### 2. Deploy to Vercel

```bash
# Commit changes
git add vercel.json app/api/cron/mint-badges/route.ts
git commit -m "feat: add automated badge minting via Vercel Cron"
git push origin main

# Vercel will automatically deploy with cron configuration
```

### 3. Verify Cron Job

**Check Vercel Dashboard:**
1. Go to Project → Settings → Cron Jobs
2. Verify job appears:
   - Path: `/api/cron/mint-badges`
   - Schedule: `*/5 * * * *`
   - Status: Active

**Check Logs:**
1. Go to Project → Logs
2. Filter: `/api/cron/mint-badges`
3. Look for execution every 5 minutes

### 4. Test Manually (Development)

```bash
# Start development server
pnpm dev

# Test cron endpoint (GET in dev mode)
curl http://localhost:3000/api/cron/mint-badges

# Test with POST and secret
curl -X POST http://localhost:3000/api/cron/mint-badges \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Monitoring

### Check Cron Execution

**Vercel Logs:**
```bash
# View recent cron executions
vercel logs --production --filter=/api/cron/mint-badges

# Expected output every 5 minutes:
[Cron] Starting badge mint batch processing...
[Worker] Processing 3 pending mints
[Worker] Mint successful: 0x123..., tokenId: 42
[Cron] Batch processing complete in 12453ms
```

**Log Patterns to Monitor:**
- ✅ `Batch processing complete` - Success
- ❌ `Batch processing error` - Error occurred
- ⚠️ `No pending mints` - Empty queue (normal)
- ⚠️ `Mint failed` - Blockchain transaction failed

### Metrics to Track

**Success Rate:**
```typescript
success_rate = (result.success / result.processed) * 100
// Target: >95%
```

**Average Processing Time:**
- Target: <30 seconds per batch
- Alert if: >60 seconds

**Queue Depth:**
- Query: `SELECT COUNT(*) FROM mint_queue WHERE status = 'pending'`
- Target: <100 pending
- Alert if: >500 pending (backlog)

### Health Check Query

```sql
-- Check recent mint activity
SELECT 
  status,
  COUNT(*) as count,
  MAX(updated_at) as last_updated
FROM mint_queue
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY status;

-- Expected results:
-- status    | count | last_updated
-- pending   | 0-5   | recent (if new badges earned)
-- minting   | 0     | NULL (transient state)
-- minted    | 10-20 | recent (last 5 mins)
-- failed    | 0-1   | old (should retry)
```

---

## Troubleshooting

### Issue 1: Cron Not Executing

**Symptoms:**
- No logs in Vercel dashboard
- Badges stuck in "Mint Pending" for >10 minutes

**Solutions:**
1. Check `vercel.json` includes cron configuration
2. Verify deployment included `vercel.json` changes
3. Check Vercel dashboard → Settings → Cron Jobs
4. Re-deploy if cron job not visible

### Issue 2: Unauthorized Error (401)

**Symptoms:**
- Cron logs show: `Unauthorized request`

**Solutions:**
1. Verify `CRON_SECRET` is set in Vercel environment variables
2. Check secret doesn't have leading/trailing whitespace
3. Regenerate secret if needed

### Issue 3: Mints Failing

**Symptoms:**
- Cron runs but no badges minted
- Logs show: `Mint failed for {id}`

**Solutions:**
1. Check `ORACLE_PRIVATE_KEY` is correct
2. Verify wallet has sufficient funds for gas
3. Check contract addresses are correct for each chain
4. Review error message in mint_queue.error_message

### Issue 4: Webhook Not Received

**Symptoms:**
- Mints succeed but no webhook notifications

**Solutions:**
1. Check `BADGE_MINT_WEBHOOK_URL` is set
2. Verify webhook endpoint is accessible
3. Check webhook logs for errors
4. Verify `WEBHOOK_SECRET` matches on both sides
5. Check rate limits (500 req/5min)

### Issue 5: Queue Backlog

**Symptoms:**
- Hundreds of pending mints
- Cron not keeping up with demand

**Solutions:**
1. Increase `MINT_BATCH_SIZE` (e.g., 10 or 20)
2. Reduce `MINT_INTERVAL_MS` for faster processing
3. Check for failing mints causing retry loops
4. Consider horizontal scaling (multiple workers)

---

## Manual Operations

### Trigger Mint Manually

```bash
# Production (requires CRON_SECRET)
curl -X POST https://gmeowhq.art/api/cron/mint-badges \
  -H "Authorization: Bearer $CRON_SECRET"

# Development
curl http://localhost:3000/api/cron/mint-badges
```

### Run Worker Locally

```bash
# One-time execution
pnpm tsx scripts/automation/mint-badge-queue.ts

# Continuous (30s interval)
pnpm run automation:run
```

### Clear Failed Mints

```sql
-- Retry failed mints (resets status to pending)
UPDATE mint_queue
SET status = 'pending', retry_count = retry_count + 1
WHERE status = 'failed'
AND retry_count < 3;

-- Delete old failed mints (after manual review)
DELETE FROM mint_queue
WHERE status = 'failed'
AND retry_count >= 3
AND created_at < NOW() - INTERVAL '7 days';
```

### Check Specific User's Mints

```sql
-- Check mint status for FID
SELECT 
  mq.id,
  mq.badge_type,
  mq.status,
  mq.created_at,
  mq.minted_at,
  mq.tx_hash,
  mq.error_message
FROM mint_queue mq
WHERE mq.fid = 18139
ORDER BY mq.created_at DESC
LIMIT 10;
```

---

## Performance

### Current Performance

**Badge Assignment API:**
- Response Time: 1800-2000ms
- Includes: Badge assignment + mint queue insertion
- Non-blocking: Mint queue insertion (fire-and-forget)

**Mint Worker:**
- Batch Size: 5 mints
- Processing Time: ~12-15 seconds per batch
- Throughput: ~20-25 mints per minute
- Cron Frequency: Every 5 minutes
- Max Throughput: ~100-125 mints per 5 minutes

**Webhook Delivery:**
- Non-blocking: Doesn't fail mint if webhook fails
- Retry: No automatic retry (handled by receiving system)
- Timeout: 10 seconds

### Scaling Considerations

**Current Capacity:**
- 5 mints per batch × 12 batches per hour = **60 mints/hour**
- 60 mints/hour × 24 hours = **1,440 mints/day**

**If Higher Throughput Needed:**
1. Increase batch size: `MINT_BATCH_SIZE=10` → 120 mints/hour
2. Increase cron frequency: `*/2 * * * *` → 180 mints/hour
3. Add parallel workers (multiple cron jobs)
4. Move to dedicated background job system (BullMQ, etc.)

---

## Testing

### Automated Test

```bash
# Run end-to-end test
pnpm test:badge-minting --fid 18139

# Expected output:
🧪 Badge Minting End-to-End Test
================================
Configuration: { fid: 18139, badgeType: 'neon_initiate', skipAssign: false }

=== Step 1: Assigning Badge ===
✅ Badge assigned successfully

=== Step 2: Checking Mint Queue ===
✅ Queue check complete (entry should exist)

=== Step 3: Running Mint Worker ===
✅ Mint worker complete
Results: { success: 1, failed: 0, processed: 1, skipped: 0 }

=== Step 4: Verifying Badge Minted ===
✅ Badge successfully minted on-chain!

=== Step 5: Testing Webhook (Optional) ===
Webhook URL: http://localhost:3000/api/webhooks/badge-minted

=== Test Summary ===
✅ All steps passed!
Badge successfully minted on-chain
```

### Manual Test Checklist

- [ ] Assign badge to test user via API
- [ ] Verify entry in mint_queue (status: pending)
- [ ] Wait for cron execution (max 5 minutes)
- [ ] Check badge shows "Minted" on profile
- [ ] Verify transaction on blockchain explorer
- [ ] Check webhook notification received (if configured)
- [ ] Verify mint_queue status updated to 'minted'
- [ ] Check Vercel logs show successful execution

---

## Next Steps

### Phase 1: Production Deployment ✅
- [x] Create Vercel Cron endpoint
- [x] Update mint worker with webhook support
- [x] Add webhook notification endpoint
- [x] Create end-to-end test script
- [x] Update vercel.json with cron configuration
- [x] Document setup and monitoring

### Phase 2: Enhanced Notifications 🔄
- [ ] Implement Miniapp push notifications
- [ ] Add Discord webhook for rare badge mints
- [ ] Create email notifications for mythic/legendary
- [ ] Add in-app notification center

### Phase 3: Advanced Monitoring 📊
- [ ] Set up Sentry alerts for mint failures
- [ ] Create Grafana dashboard for mint metrics
- [ ] Add webhook retry mechanism
- [ ] Implement queue depth monitoring
- [ ] Create admin dashboard for mint status

### Phase 4: Optimization 🚀
- [ ] Implement batch minting (multiple badges in one tx)
- [ ] Add gasless minting via relay
- [ ] Optimize contract calls for gas efficiency
- [ ] Implement predictive minting (mint before earned)

---

## References

**Related Files:**
- `app/api/badges/assign/route.ts` - Badge assignment API
- `app/api/cron/mint-badges/route.ts` - Cron endpoint
- `app/api/webhooks/badge-minted/route.ts` - Webhook endpoint
- `scripts/automation/mint-badge-queue.ts` - Worker script
- `scripts/test-badge-minting.ts` - E2E test script
- `lib/badges.ts` - Badge database operations
- `lib/contract-mint.ts` - Blockchain minting logic

**Documentation:**
- [BADGE_MINTING_EXPLAINED_20251119.md](./BADGE_MINTING_EXPLAINED_20251119.md) - User-facing explanation
- [BADGE_PERFORMANCE_OPTIMIZATION_20251119.md](./BADGE_PERFORMANCE_OPTIMIZATION_20251119.md) - Performance analysis

**Vercel Documentation:**
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

**Status:** ✅ Ready for Production  
**Last Updated:** November 19, 2025  
**Next Review:** December 1, 2025 (after 2 weeks of production data)
