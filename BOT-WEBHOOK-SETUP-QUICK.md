# 🤖 Bot Webhook Setup - Quick Fix

## ✅ What's Fixed
The webhook route (`/api/neynar/webhook`) has been restored and deployed to production.

## 🚀 Final Step: Configure Webhook in Neynar Dashboard

The bot is ready to auto-reply, but it needs a **webhook configured in Neynar**.

### Option 1: Neynar Dashboard (Recommended - 2 minutes)

1. **Go to Neynar Webhooks**: https://dev.neynar.com/webhooks
2. **Create New Webhook**:
   - **Name**: `Gmeowbased Bot Auto-Reply`
   - **URL**: `https://gmeowhq.art/api/neynar/webhook`
   - **Webhook Secret**: (will be generated, save it)
   - **Events**: Check ✅ `cast.created`
   - **Filter by mention**: FID `1069798` (bot FID)

3. **Save webhook secret** to `.env.local` and Vercel:
   ```bash
   NEYNAR_WEBHOOK_SECRET=<secret_from_dashboard>
   ```

4. **Test it**:
   ```
   @gmeowbased show my stats
   ```
   
   Expected: Bot replies within 1-3 seconds with your stats + frame embed

---

### Option 2: API (Alternative)

```bash
curl -X POST https://api.neynar.com/v2/farcaster/webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_NEYNAR_API_KEY" \
  -d '{
    "name": "Gmeowbased Bot Auto-Reply",
    "url": "https://gmeowhq.art/api/neynar/webhook",
    "subscription": {
      "cast.created": {
        "author_fids": [],
        "mentioned_fids": [1069798]
      }
    },
    "active": true
  }'
```

---

## 🔧 Environment Variables Already Set
- ✅ `NEYNAR_BOT_SIGNER_UUID=4a7fc895-eb3c-4118-b529-4a47a92166e1`
- ✅ `NEYNAR_BOT_FID=1069798`
- ✅ `NEYNAR_API_KEY` (configured)
- ⏳ `NEYNAR_WEBHOOK_SECRET` (add after dashboard setup)

---

## 🧪 Testing Checklist

After webhook is configured:

- [ ] Cast: `@gmeowbased show my stats`
- [ ] Check: Bot replies within 1-3 seconds
- [ ] Frame: Embed is visible in reply
- [ ] Button: Frame button launches miniapp
- [ ] Try: `@gmeowbased what quests can I do?`

---

## 📊 Vercel Logs (Debugging)

Check if webhook events are received:

```bash
vercel logs --prod --filter="/api/neynar/webhook" --since=10m
```

---

## ✨ Done!

Once webhook is configured in Neynar dashboard → Bot will auto-reply to all mentions! 🎉
