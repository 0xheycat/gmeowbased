# 🚀 Production Deployment Guide

## Prerequisites ✅
- [x] Auto-reply engine implemented
- [x] Test data seeded and validated
- [x] Environment variables configured
- [x] Git repository initialized and committed

## Required Environment Variables

Make sure these are set in your Vercel project settings:

```env
NEYNAR_BOT_SIGNER_UUID=4a7fc895-eb3c-4118-b529-4a47a92166e1
NEYNAR_BOT_FID=1069798
NEYNAR_WEBHOOK_SECRET=L-SPUjEhZVwoKkyhp4lRNNzPd
SUPABASE_URL=https://bgnerptdanbgvcjentbt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEYNAR_API_KEY=76C0C613-378F-4562-9512-600DD84EB085
```

## Deployment Steps

### Option 1: Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
cd /home/heycat/Desktop/2025/Gmeow50_
vercel --prod
```

### Option 2: Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Import your repository
3. Configure environment variables in Project Settings → Environment Variables
4. Deploy

### Option 3: Git Push (if connected to GitHub/GitLab)

```bash
# Add remote (replace with your repo URL)
git remote add origin https://github.com/0xheycat/gmeow-adventure.git

# Push to main
git push -u origin main
```

Vercel will automatically detect the push and deploy.

## Post-Deployment Checklist

### 1. Verify Environment Variables
Check Vercel dashboard → Settings → Environment Variables

### 2. Configure Neynar Webhook
Update Neynar webhook URL to point to your production domain:
```
https://gmeowhq.art/api/neynar/webhook
```

### 3. Test Auto-Reply
Send a test cast mentioning @gmeowbased with "show me my stats"

### 4. Monitor Logs
```bash
vercel logs --prod
```

Or check Vercel dashboard → Deployments → View Function Logs

### 5. Verify Neynar Score Gating
Check webhook logs for:
- `skipped: 'min-neynar-score'` (users below threshold)
- `intent: 'stats'` (intent detection working)
- `totalEvents` > 0 (event aggregation working)

## Testing Production Webhook

Use the mock script with production URL:

```bash
MOCK_NEYNAR_URL=https://gmeowhq.art/api/neynar/webhook \
NEYNAR_WEBHOOK_SECRET=L-SPUjEhZVwoKkyhp4lRNNzPd \
NEYNAR_BOT_FID=1069798 \
pnpm dlx tsx scripts/mock-neynar.ts
```

## Troubleshooting

### Webhook Returns 502
- Check Supabase connection (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- Verify Neynar signer (NEYNAR_BOT_SIGNER_UUID, NEYNAR_BOT_FID)
- Check function logs for Neynar API errors

### No Events Found (totalEvents: 0)
- Verify user has events in `gmeow_rank_events` table
- Check wallet address resolution (verified > custody)
- Validate timeframe filtering (default: last 7 days)

### Duplicate Cast Errors (409)
- This is expected behavior from Neynar
- Metadata is still returned with `error: 'duplicate cast'`
- Check `meta.events` for stats

## Success Indicators

✅ Deployment URL: https://gmeowhq.art
✅ Webhook endpoint: https://gmeowhq.art/api/neynar/webhook
✅ Auto-reply detects intent correctly
✅ Event aggregation returns non-zero counts
✅ Neynar score gating filters low-score users
✅ Admin panel at: https://gmeowhq.art/admin?tab=bot

## Next Steps

After successful deployment:
1. ✅ Monitor webhook logs for 24 hours
2. ⏳ Enhance reply templates (emojis, tier badges)
3. ⏳ Build admin analytics dashboard

gmeow
