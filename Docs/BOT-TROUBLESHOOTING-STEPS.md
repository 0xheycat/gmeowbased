# 🔍 Bot Not Replying - Troubleshooting Guide

**Issue**: Bot FID 1069798 (@gmeowbased) not replying to @heycat (FID 18139)  
**User Neynar Score**: 0.81 ✅ (above minimum 0.5)  
**Date**: November 25, 2025

---

## ✅ What We've Verified

1. **Bot Configuration**:
   - ✅ Bot FID: 1069798
   - ✅ Signer UUID configured
   - ✅ Mention matchers: `@gmeowbased`, `#gmeowbased`
   - ✅ Min Neynar score: 0.5 (user has 0.81)
   - ✅ Webhook endpoint live: https://gmeowhq.art/api/neynar/webhook

2. **Code Logic**:
   - ✅ Direct @mention detection in `mentioned_profiles` array
   - ✅ Text-based mention detection (`@gmeowbased` in text)
   - ✅ Intent detection system (9 intents)
   - ✅ Frame builder (6 frame types)

3. **User Status**:
   - ✅ Neynar score: 0.81 (meets requirement)
   - ✅ Profile URL: https://farcaster.xyz/heycat/0xfc89ba0d

---

## 🚨 Most Likely Issue: Webhook Not Configured in Neynar

The webhook endpoint exists and works, BUT Neynar needs to be told to send events to it.

### Steps to Configure Webhook:

#### Option 1: Via Neynar Dashboard (Recommended)

1. **Go to Neynar Dashboard**:
   - Visit: https://dev.neynar.com/webhooks
   - Sign in with your account

2. **Create or Update Webhook**:
   - Click "Create Webhook" or edit existing
   - **Webhook URL**: `https://gmeowhq.art/api/neynar/webhook`
   - **Events to subscribe**:
     - ✅ `cast.created` (REQUIRED for bot replies)
     - ✅ `miniapp_added` (optional)
     - ✅ `miniapp_removed` (optional)
     - ✅ `notifications_enabled` (optional)
     - ✅ `notifications_disabled` (optional)
   
3. **Set Webhook Secret**:
   - Copy the webhook secret from dashboard
   - Add to `.env.local` and Vercel:
     ```bash
     NEYNAR_WEBHOOK_SECRET=your_secret_here
     ```

4. **Filter Settings** (Important!):
   - **FID Filter**: Leave empty OR add bot FID 1069798
   - **Mention Filter**: Add bot FID 1069798 (so webhook only fires when bot is mentioned)
   - This reduces noise and makes bot more responsive

5. **Save and Test**:
   - Click "Save Webhook"
   - Use Neynar's "Test Webhook" button to verify

#### Option 2: Via Neynar API

```bash
curl -X POST https://api.neynar.com/v2/farcaster/webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_NEYNAR_API_KEY" \
  -d '{
    "name": "Gmeowbased Bot Webhook",
    "url": "https://gmeowhq.art/api/neynar/webhook",
    "subscription": {
      "cast.created": {
        "author_fids": [],
        "mentioned_fids": [1069798]
      }
    }
  }'
```

---

## 🔍 Additional Checks

### 1. Verify Webhook Secret

Check if webhook secret is configured:

```bash
# In .env.local
grep NEYNAR_WEBHOOK_SECRET .env.local

# In Vercel (if deployed)
vercel env ls | grep NEYNAR_WEBHOOK_SECRET
```

If missing, the webhook will reject all requests with signature mismatch.

### 2. Check Signer Permissions

The bot signer needs permission to cast. Verify:

```bash
curl -X GET "https://api.neynar.com/v2/farcaster/signer?signer_uuid=4a7fc895-eb3c-4118-b529-4a47a92166e1" \
  -H "x-api-key: YOUR_NEYNAR_API_KEY"
```

Should return:
```json
{
  "signer_uuid": "4a7fc895-eb3c-4118-b529-4a47a92166e1",
  "fid": 1069798,
  "status": "approved",
  "permissions": ["cast"]
}
```

If status is not `approved`, you need to approve the signer.

### 3. Test Webhook Manually

Send a test POST to verify webhook processing:

```bash
# Generate signature (replace YOUR_SECRET)
BODY='{"type":"cast.created","data":{"hash":"0xtest","author":{"fid":18139,"username":"heycat"},"text":"@gmeowbased show my stats","mentioned_profiles":[{"fid":1069798}]}}'
SECRET="YOUR_NEYNAR_WEBHOOK_SECRET"
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha512 -hmac "$SECRET" -hex | cut -d' ' -f2)

# Send test request
curl -X POST https://gmeowhq.art/api/neynar/webhook \
  -H "Content-Type: application/json" \
  -H "x-neynar-signature: $SIGNATURE" \
  -d "$BODY"
```

Should return: `{"ok": true}`

### 4. Check Vercel Logs

Monitor webhook calls in real-time:

```bash
vercel logs --follow --filter="/api/neynar/webhook"
```

Look for:
- `[bot-webhook] Direct @mention detected - will respond`
- `[bot-webhook] Cast IS targeted to bot:`
- Any error messages

---

## 🐛 Common Issues & Solutions

### Issue 1: Webhook Secret Mismatch

**Symptom**: Webhook returns 401 or signature error

**Solution**:
1. Get secret from Neynar dashboard
2. Update in `.env.local`:
   ```bash
   NEYNAR_WEBHOOK_SECRET=abc123...
   ```
3. Update in Vercel:
   ```bash
   vercel env add NEYNAR_WEBHOOK_SECRET
   # Paste secret when prompted
   vercel --prod
   ```

### Issue 2: Signer Not Approved

**Symptom**: Bot doesn't cast even though webhook fires

**Solution**:
1. Check signer status (see API call above)
2. If pending, approve at: https://warpcast.com/~/settings/signer-requests
3. Or create new signer and update `NEYNAR_BOT_SIGNER_UUID`

### Issue 3: Rate Limiting

**Symptom**: Bot stops replying after 5 mentions

**Solution**:
- Wait 1 minute (rate limit: 5 requests/min)
- Or update rate limit in `lib/agent-auto-reply.ts`

### Issue 4: Neynar Score Not Fetched

**Symptom**: Bot says "Current: unknown" even though you have score

**Solution**:
- Verify `NEYNAR_API_KEY` is configured
- Check API key has permissions for user lookup
- Test with:
  ```bash
  curl -X GET "https://api.neynar.com/v2/farcaster/user/bulk?fids=18139" \
    -H "x-api-key: YOUR_API_KEY"
  ```

### Issue 5: Webhook Not Receiving Events

**Symptom**: No logs in Vercel when casting @gmeowbased

**Solution**:
- Webhook not configured in Neynar dashboard (see Option 1 above)
- Add bot FID to mention filter: 1069798
- Verify webhook URL is exactly: `https://gmeowhq.art/api/neynar/webhook`

---

## ✅ Verification Checklist

Once you've configured the webhook, verify everything works:

- [ ] Webhook configured in Neynar dashboard
- [ ] Webhook URL: `https://gmeowhq.art/api/neynar/webhook`
- [ ] Event subscribed: `cast.created`
- [ ] Mention filter: FID 1069798
- [ ] Webhook secret in environment variables
- [ ] Signer status: `approved`
- [ ] Signer permissions: `["cast"]`
- [ ] Test cast posted: "@gmeowbased show my stats"
- [ ] Bot reply received (within 1-3 seconds)
- [ ] Frame embed visible in reply
- [ ] Frame button works (launches Mini App)

---

## 🎯 Quick Test Commands

After configuring webhook, test with these casts:

```
@gmeowbased show my stats
```

```
@gmeowbased what quests can I do?
```

```
gm @gmeowbased
```

**Expected**: Bot replies within 1-3 seconds with personalized message + frame embed

---

## 📞 Need More Help?

If bot still doesn't reply after following all steps:

1. **Share Vercel logs**: Run `vercel logs --filter="/api/neynar/webhook" --since=5m`
2. **Share test cast URL**: Post test cast and share URL
3. **Check Neynar webhook logs**: Dashboard shows delivery status
4. **Verify cast visibility**: Ensure cast is public (not private/hidden)

---

**Most Common Fix**: Configure webhook in Neynar dashboard → https://dev.neynar.com/webhooks

**Bot is ready to respond once webhook is configured! 🚀**
