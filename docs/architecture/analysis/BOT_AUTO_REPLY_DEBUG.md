# Bot Auto-Reply Troubleshooting Guide

**Your Scenario**: 
- Neynar Score: 0.8 ✅ (meets minimum 0.5)
- Message: "hey show me my stats"
- Expected: Bot replies
- Actual: No reply

---

## How Bot Auto-Reply Works

### Step 1: Cast Targeting Check
The bot checks if a cast is targeted using **3 methods**:

#### Method 1: Direct @mention
```typescript
mentioned_profiles includes FID 18139
```
**Your case**: ❓ Check if you @mentioned @gmeowbased

#### Method 2: Text @mention or #hashtag
```typescript
Text contains: @gmeowbased OR #gmeowbased
```
**Your case**: ❓ "hey show me my stats" - NO mention/hashtag

#### Method 3: Signal Keywords + Question Pattern
```typescript
Signal keywords: ['stats', 'stat', 'rank', 'level', 'xp', 'points', 'progress', 'insights']
Question starters: ['what', 'how', 'show', 'share', 'can', 'may']
Requires: (question starter OR question mark) when requireQuestionMark=false
```

**Your case**: 
- ✅ Has signal keyword: "stats"
- ✅ Has question starter: "show" (in "show me")
- ✅ Should match!

**Test result**:
```bash
node test-bot-targeting.js
# Testing: "hey show me my stats"
# ✅ Has signal keyword
# Question starter: true
# Result: true
```

### Step 2: Filter Self-Casts
```typescript
if (author.fid === botFid) skip
```
**Your case**: ❓ Check if you're replying to the bot itself

### Step 3: Neynar Score Check
```typescript
if (neynarScore < 0.5) skip with reason: 'low-score'
```
**Your case**: ✅ 0.8 >= 0.5, should pass

### Step 4: Wallet Check
```typescript
if (!walletAddress) return help message
```
**Your case**: ❓ Check if your FID has a verified wallet

### Step 5: Generate Reply
Bot generates personalized response based on intent detection.

---

## Debugging Your Issue

### Check 1: View Webhook Logs
```bash
# Go to Vercel dashboard → Functions → Logs
# Filter for: [bot-webhook]
# Look for your cast
```

**What to look for**:
```
[bot-webhook] Cast not targeted: { author: 'yourname', fid: 12345, text: 'hey show me...' }
```
OR
```
[bot-webhook] Cast IS targeted to bot: { author: 'yourname', fid: 12345 }
```

### Check 2: Verify Cast Structure
The cast must reach the webhook as `cast.created` event with:
```json
{
  "type": "cast.created",
  "data": {
    "hash": "0x...",
    "author": {
      "fid": 12345,
      "username": "yourname"
    },
    "text": "hey show me my stats",
    "mentioned_profiles": []
  }
}
```

### Check 3: Neynar Score Verification
```bash
curl -X GET "https://api.neynar.com/v2/farcaster/user/bulk?fids=YOUR_FID" \
  -H "x-api-key: YOUR_KEY" | jq '.users[0].neynar_score'
```

Expected: Should return 0.8 or higher

### Check 4: Self-Cast Detection
Are you replying to a cast made by @gmeowbased?
- ❌ If yes: Bot won't reply (self-cast filter)
- ✅ If no: Should work

---

## Common Issues & Solutions

### Issue 1: "Cast not targeted"
**Symptoms**: Logs show `skipped: 'bot-not-targeted'`

**Solutions**:
1. Add @mention: `@gmeowbased show me my stats`
2. Add question mark: `hey show me my stats?`
3. Use question starter: `what are my stats` or `how do I check my stats`
4. Use hashtag: `#gmeowbased stats`

### Issue 2: "Low Neynar score"
**Symptoms**: Logs show `skipped: 'min-neynar-score'`

**Your case**: Shouldn't happen (you have 0.8)

**If it does happen**:
```bash
# Check actual score from Neynar
curl "https://api.neynar.com/v2/farcaster/user/bulk?fids=YOUR_FID" \
  -H "x-api-key: KEY"
```

### Issue 3: "Self-cast"
**Symptoms**: Logs show `skipped: 'self-cast'`

**Solution**: Don't reply to bot's own casts. Create a new cast instead.

### Issue 4: "Missing wallet"
**Symptoms**: Bot replies with "Connect your wallet first"

**Solution**: 
1. Go to https://gmeowhq.art
2. Connect wallet
3. Link wallet to Farcaster

---

## Test Your Message

### Test Patterns That Work

✅ **Direct mention** (always works):
```
@gmeowbased show me my stats
@gmeowbased what's my rank
```

✅ **Signal keyword + question starter**:
```
show me my stats
what are my points
how do I check my xp
```

✅ **Signal keyword + question mark**:
```
my stats?
rank?
level?
```

✅ **Hashtag**:
```
#gmeowbased stats
#gmeowbased rank
```

❌ **Won't work** (no trigger):
```
hey show me my stats  ← No @mention, and "show" not at start/after space
check stats           ← "check" not in questionStarters
my current stats      ← No question pattern
```

### How to Fix "hey show me my stats"

Your text: `"hey show me my stats"`

The issue: `"show"` is in the middle, but the code checks:
```typescript
text.startsWith('show') || text.includes(' show ') || text.includes('\nshow ')
```

Your text: `"hey show me"` - includes `" show "` ✅

**This SHOULD work!** If it's not working, the issue is likely:
1. You're replying to bot's own cast (self-cast filter)
2. The webhook isn't receiving the event
3. There's an error in the auto-reply pipeline

---

## Immediate Action Steps

### 1. Check Vercel Logs (Most Important)
```
Vercel Dashboard → gmeowbased → Functions → Logs
Filter: [bot-webhook]
Time: When you posted your message
```

**Look for**:
- Is the webhook receiving the event?
- Is it showing "Cast not targeted" or "Cast IS targeted"?
- Is there a "low-score" or "self-cast" skip?
- Are there any errors?

### 2. Try With Direct @mention
```
@gmeowbased show me my stats
```
This should ALWAYS work (bypasses all other checks).

### 3. Check Your Cast Context
- Did you cast directly in feed? ✅
- Or reply to bot's cast? ❌ (will be filtered)

### 4. Wait 30 Seconds
Webhooks can have a delay. Give it 30 seconds after posting.

### 5. Check Bot FID Configuration
```bash
# Check .env or Vercel environment variables
BOT_FID=18139
BOT_SIGNER_UUID=xxx
```

---

## Understanding the New Logs

After deployment (commit c1a69e2), you'll see detailed logs:

### When NOT targeted:
```
[bot-webhook] Cast not targeted: {
  author: 'yourname',
  fid: 12345,
  text: 'hey show me my stats',
  botFid: 18139,
  mentions: []
}
```

### When targeted but low score:
```
[bot-webhook] Skipping reply - low Neynar score: {
  author: 'yourname',
  fid: 12345,
  detail: 'score-0.3',
  minRequired: 0.5
}
```

### When self-cast:
```
[bot-webhook] Skipping self-cast from bot FID: 18139
```

### When successful:
```
[bot-webhook] Cast IS targeted to bot: {
  author: 'yourname',
  fid: 12345,
  text: 'hey show me my stats'
}
[bot-webhook] Auto-reply sent: { intent: 'stats', ... }
```

---

## Quest Frame Fix

**Issue**: Quest frames showing static image instead of dynamic stats

**Fixed**: Commit c1a69e2
- Quest frames now generate dynamic OG images
- Shows: Quest name, type, reward, spots left, expires
- Uses violet badge for quest type

**Test**:
```bash
curl "https://gmeowhq.art/api/frame?type=quest&chain=ink&questId=1" | grep "fc:frame:image"
```

**Expected** (after deployment):
```html
<meta property="fc:frame:image" content="https://gmeowhq.art/api/frame/og?title=gollow&subtitle=Farcaster+Follow&chain=Ink&..." />
```

---

## Next Steps

1. **Wait 2-3 minutes** for deployment (commit c1a69e2)
2. **Post a new test cast**: `@gmeowbased show me my stats`
3. **Check Vercel logs** for `[bot-webhook]` entries
4. **Share logs** if still not working - we'll debug together

**Most likely cause**: You were replying to the bot's own cast (self-cast filter). Try creating a NEW cast directly in feed, not as a reply.
