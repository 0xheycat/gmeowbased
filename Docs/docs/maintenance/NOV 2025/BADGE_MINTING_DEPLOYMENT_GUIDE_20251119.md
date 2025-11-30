# Badge Minting Automation - Quick Deployment Guide

**Status:** ✅ Code Complete - Ready for Production  
**Time Required:** 15-30 minutes  
**Commits:** 443adb7, 89dce25, c0e8cbb

---

## Pre-Deployment Checklist

### ✅ Code Changes (Complete)
- [x] Vercel Cron job configured in `vercel.json`
- [x] Cron API endpoint created (`/api/cron/mint-badges`)
- [x] Webhook endpoint created (`/api/webhooks/badge-minted`)
- [x] Mint worker updated with webhook support
- [x] Test script created (`test:badge-minting`)
- [x] Documentation complete (800+ lines)
- [x] All changes committed and pushed

### ⏳ Production Setup (Pending)
- [ ] Generate CRON_SECRET
- [ ] Add environment variables to Vercel
- [ ] Deploy to production
- [ ] Verify cron job active
- [ ] Test first mint batch
- [ ] Monitor execution logs

---

## Step 1: Generate Secrets (2 minutes)

```bash
# Generate CRON_SECRET (required)
openssl rand -base64 32
# Example output: Kx9Lm2Np4Qr5St6Uv7Ww8Xx9Yy0Zz1Aa2Bb3Cc4Dd5

# Generate WEBHOOK_SECRET (optional, for webhook notifications)
openssl rand -base64 32
# Example output: Ee6Ff7Gg8Hh9Ii0Jj1Kk2Ll3Mm4Nn5Oo6Pp7Qq8Rr9
```

**Save these secrets!** You'll need them in the next step.

---

## Step 2: Configure Vercel Environment Variables (5 minutes)

### Go to Vercel Dashboard

1. Navigate to: https://vercel.com/dashboard
2. Select project: **gmeowbased**
3. Go to: **Settings → Environment Variables**

### Add Required Variables

**CRON_SECRET** (Required)
```
Name: CRON_SECRET
Value: [paste output from Step 1]
Environment: Production, Preview
```

**Verify Existing Variables:**
- ✓ ORACLE_PRIVATE_KEY (should already exist)
- ✓ BADGE_CONTRACT_BASE (should already exist)
- ✓ BADGE_CONTRACT_INK (should already exist)
- ✓ BADGE_CONTRACT_UNICHAIN (should already exist)
- ✓ BADGE_CONTRACT_OPTIMISM (should already exist)

### Add Optional Variables (for webhooks)

**BADGE_MINT_WEBHOOK_URL** (Optional)
```
Name: BADGE_MINT_WEBHOOK_URL
Value: https://gmeowhq.art/api/webhooks/badge-minted
Environment: Production, Preview
```

**WEBHOOK_SECRET** (Optional)
```
Name: WEBHOOK_SECRET
Value: [paste output from Step 1]
Environment: Production, Preview
```

**Click "Save"** after adding each variable.

---

## Step 3: Deploy to Production (3 minutes)

The code is already pushed to `main` branch. Vercel will automatically deploy.

### Check Deployment Status

1. Go to: **Vercel Dashboard → Deployments**
2. Look for latest deployment (commit: c0e8cbb)
3. Wait for "Ready" status (usually 2-3 minutes)

### Or Trigger Manual Deployment

```bash
# If needed, trigger manual deployment
cd /home/heycat/Desktop/2025/Gmeowbased
vercel --prod
```

---

## Step 4: Verify Cron Job Active (2 minutes)

### Check Vercel Dashboard

1. Go to: **Settings → Cron Jobs**
2. Verify you see:
   ```
   Path: /api/cron/mint-badges
   Schedule: */5 * * * *
   Status: Active
   Last Run: [should show after 5 minutes]
   ```

### If Cron Job Not Visible

1. Check `vercel.json` is in root directory
2. Verify deployment included `vercel.json` changes
3. Re-deploy if needed:
   ```bash
   git commit --allow-empty -m "trigger: re-deploy for cron"
   git push origin main
   ```

---

## Step 5: Test First Execution (10 minutes)

### Wait for First Cron Run

The cron job runs every 5 minutes. Wait for the next scheduled execution.

**Current time:** Check clock  
**Next execution:** Round up to next 5-minute mark (e.g., 11:30, 11:35, 11:40)

### Monitor Logs

```bash
# Watch Vercel logs (requires Vercel CLI)
vercel logs --production --follow --filter=/api/cron/mint-badges
```

**Or use Vercel Dashboard:**
1. Go to: **Deployments → [latest] → Logs**
2. Filter: `/api/cron/mint-badges`
3. Look for execution logs every 5 minutes

### Expected Log Output

```
[Cron] Starting badge mint batch processing...
[Worker] Processing 3 pending mints
[Worker] Mint successful: 0x123..., tokenId: 42
[Cron] Batch processing complete in 12453ms
```

**If no pending mints:**
```
[Cron] Starting badge mint batch processing...
[Worker] No pending mints
[Cron] Batch processing complete in 245ms
```

---

## Step 6: Test with Real Badge (5 minutes)

### Assign Test Badge

```bash
# Assign badge to your FID
curl -X POST https://gmeowhq.art/api/badges/assign \
  -H "Content-Type: application/json" \
  -d '{
    "fid": 18139,
    "badgeType": "neon_initiate",
    "chain": "base"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "badge": {
    "badgeId": "neon-initiate",
    "minted": false,
    ...
  }
}
```

### Wait for Mint

- Badge will show "Mint Pending" immediately
- Wait up to 5 minutes for cron execution
- Refresh badge page after cron runs

### Verify Badge Minted

```bash
# Check badge status
curl https://gmeowhq.art/api/badges/list?fid=18139 | jq '.badges[] | select(.badgeType == "neon_initiate")'
```

**Expected after mint:**
```json
{
  "badgeId": "neon-initiate",
  "minted": true,
  "txHash": "0x123...",
  "tokenId": 42,
  ...
}
```

### Check Badge Page

Visit: `https://gmeowhq.art/profile/18139/badges`

**Badge should show:**
- ✓ "Minted" badge (green)
- ✓ Glow effect (if mythic/legendary)
- ✓ Transaction hash in tooltip

---

## Troubleshooting

### Issue: Cron job not visible in dashboard

**Solution:**
```bash
# Re-deploy to trigger cron setup
git commit --allow-empty -m "fix: trigger cron setup"
git push origin main
```

### Issue: "Unauthorized" error in logs

**Solution:**
1. Check `CRON_SECRET` is set in Vercel
2. Verify no leading/trailing whitespace
3. Regenerate and update if needed

### Issue: Badge not minting

**Check:**
1. ORACLE_PRIVATE_KEY is correct
2. Wallet has sufficient gas funds
3. Contract addresses are correct
4. Check mint_queue table for errors

**Query database:**
```sql
SELECT * FROM mint_queue 
WHERE status = 'failed' 
ORDER BY created_at DESC 
LIMIT 5;
```

### Issue: Need to mint badges immediately

**Manual trigger:**
```bash
# Requires CRON_SECRET from Step 1
curl -X POST https://gmeowhq.art/api/cron/mint-badges \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Success Indicators

### ✅ Deployment Successful

After following all steps, you should see:

1. **Vercel Dashboard:**
   - ✓ Cron job visible in Settings
   - ✓ Status: Active
   - ✓ Last run: Recent timestamp

2. **Logs:**
   - ✓ Executions every 5 minutes
   - ✓ "Batch processing complete" messages
   - ✓ No errors

3. **Badge System:**
   - ✓ New badges show "Mint Pending"
   - ✓ Badges mint within 5 minutes
   - ✓ Badge page shows "Minted" status
   - ✓ Transaction hash visible

4. **Webhooks (if configured):**
   - ✓ Notifications received on mint
   - ✓ Webhook logs show successful delivery
   - ✓ No rate limit errors

---

## Post-Deployment Monitoring

### First 24 Hours

**Check every few hours:**
- Cron execution consistency
- Mint success rate (target: >95%)
- Queue depth (should stay <100)
- No unauthorized access attempts

### Ongoing Monitoring

**Daily:**
- Review error logs for failed mints
- Check queue backlog depth
- Monitor webhook delivery rate

**Weekly:**
- Analyze mint success rate trends
- Review gas costs per mint
- Check wallet balance for gas funds

**Monthly:**
- Performance optimization review
- Scale up if queue consistently >100
- Review and update documentation

---

## Quick Reference

### Important URLs

**Vercel Dashboard:**
- Project: https://vercel.com/dashboard/gmeowbased
- Cron Jobs: Settings → Cron Jobs
- Logs: Deployments → [latest] → Logs

**Badge System:**
- Assign: `POST /api/badges/assign`
- List: `GET /api/badges/list?fid={fid}`
- Cron: `POST /api/cron/mint-badges`
- Webhook: `POST /api/webhooks/badge-minted`

**Documentation:**
- Setup Guide: docs/.../BADGE_MINTING_AUTOMATION_SETUP_20251119.md
- User Guide: docs/.../BADGE_MINTING_EXPLAINED_20251119.md
- Summary: docs/.../BADGE_MINTING_AUTOMATION_COMPLETE_20251119.md

### Environment Variables

**Required:**
- CRON_SECRET (generate: `openssl rand -base64 32`)
- ORACLE_PRIVATE_KEY (existing)
- BADGE_CONTRACT_* (existing)

**Optional:**
- BADGE_MINT_WEBHOOK_URL
- WEBHOOK_SECRET
- MINT_BATCH_SIZE (default: 5)

### Commands

**Test script:**
```bash
pnpm test:badge-minting --fid 18139
```

**Manual worker:**
```bash
pnpm tsx scripts/automation/mint-badge-queue.ts
```

**View logs:**
```bash
vercel logs --production --filter=/api/cron/mint-badges
```

**Manual trigger:**
```bash
curl -X POST https://gmeowhq.art/api/cron/mint-badges \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Next Steps After Deployment

### Immediate (First Week)

1. Monitor mint success rate daily
2. Check for any failed mints in queue
3. Verify webhook notifications working
4. Review gas costs per mint

### Phase 2 (Week 2-4)

1. Implement Miniapp push notifications
2. Add analytics tracking for mints
3. Set up Sentry alerts for failures
4. Create admin dashboard for monitoring

### Phase 3 (Month 2)

1. Optimize batch minting (multiple in one tx)
2. Add gasless minting via relay
3. Implement predictive minting
4. Scale up if needed (increase batch size/frequency)

---

## Support

**If you encounter issues:**

1. Check troubleshooting section above
2. Review detailed docs: BADGE_MINTING_AUTOMATION_SETUP_20251119.md
3. Check Vercel logs for specific errors
4. Query mint_queue table for failed mints

**Common solutions:**
- Re-deploy if cron not visible
- Regenerate secrets if unauthorized
- Check wallet funds if mints failing
- Increase batch size if queue backing up

---

**Status:** 📋 Deployment guide ready  
**Estimated deployment time:** 15-30 minutes  
**Next action:** Follow steps 1-6 above  
**Success criteria:** Badges minting automatically every 5 minutes
