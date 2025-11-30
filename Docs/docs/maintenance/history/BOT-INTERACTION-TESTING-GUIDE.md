# 🤖 Bot Interaction Testing Guide
**User**: @heycat (FID 18139)  
**Bot**: @gmeowbased (FID 1069798)  
**Last Updated**: November 25, 2025

---

## 📋 System Overview

### Bot Configuration
- **Webhook URL**: `https://gmeowhq.art/api/neynar/webhook`
- **Bot FID**: 1069798
- **Signer UUID**: `4a7fc895-eb3c-4118-b529-4a47a92166e1`
- **Min Neynar Score**: 0.5 (configurable, defaults to 0.3 for legitimate users)
- **Rate Limit**: 5 requests per minute per user

### Frame System (MCP Verified)
- **Specification**: Farcaster Mini App Embed (v1)
- **Action Type**: `launch_frame` (single button only)
- **SDK Actions**: addMiniApp, openUrl, composeCast, viewProfile, etc.
- **NO deprecated POST buttons or multi-button arrays**

---

## 🎯 Supported Intents (9 Types)

| Intent | Keywords | Frame Type | Example |
|--------|----------|------------|---------|
| `stats` | stats, xp, points, progress | `stats-summary` | "@gmeowbased show my stats" |
| `quests` | quests, challenges, tasks | `quest-board` | "@gmeowbased what quests can I do?" |
| `quest-recommendations` | recommend quests | `quest-board` | "@gmeowbased recommend me some quests" |
| `leaderboards` | leaderboard, rank, top | `leaderboards` | "@gmeowbased show leaderboard" |
| `streak` | streak, daily | `daily-streak` | "@gmeowbased my streak status" |
| `gm` | gm, good morning | `daily-streak` | "gm @gmeowbased" |
| `tips` | tips, tipped, tipping | `stats-summary` | "@gmeowbased my tips this week" |
| `guild` | guild, team | `guild-invite` | "@gmeowbased show guilds" |
| `help` | help, commands | `quest-board` | "@gmeowbased help" |

---

## 🔄 Bot Interaction Flow

### 1. **Cast Created**
```
User mentions @gmeowbased in a cast
   ↓
Webhook receives cast.created event
   ↓
Verify signature & rate limit
```

### 2. **Intent Detection**
```
Parse cast text
   ↓
Detect intent (stats/quests/streak/etc)
   ↓
Extract timeframe (today/week/month)
   ↓
Load conversation context
```

### 3. **User Validation**
```
Fetch Neynar score via Neynar API
   ↓
Check score >= 0.5 (or 0.3 for verified users)
   ↓
Fetch verified wallet address
   ↓
If fails: Return helpful guidance message
```

### 4. **Stats Computation**
```
Check cached stats (3min TTL)
   ↓
If miss: Query database
   ↓
Aggregate events (gm, quests, tips)
   ↓
Cache results
```

### 5. **Reply Generation**
```
Generate reply text (320 char limit)
   ↓
Select appropriate frame embed
   ↓
Build Mini App embed URL
   ↓
Post reply via Neynar SDK
```

### 6. **Frame Embed**
```json
{
  "version": "1",
  "imageUrl": "https://gmeowhq.art/api/frame/og?type=stats&fid=18139",
  "button": {
    "title": "View Full Stats ✨",
    "action": {
      "type": "launch_frame",
      "name": "Gmeowbased",
      "url": "https://gmeowhq.art/frame/stats/18139",
      "splashImageUrl": "https://gmeowhq.art/logo.png",
      "splashBackgroundColor": "#000000"
    }
  }
}
```

---

## ✅ Testing Checklist

### Prerequisites
- [ ] User has Neynar score >= 0.5 (check at https://neynar.com)
- [ ] User has verified wallet on Farcaster profile
- [ ] User has GM'ed or completed quests (for stats)
- [ ] Webhook is deployed and accessible
- [ ] Environment variables configured (API keys, signer)

### Test Scenarios

#### Test 1: Stats Request
```
Cast: "@gmeowbased show me my stats"

Expected:
✅ Bot replies with XP, streaks, achievements
✅ Frame embed with "View Full Stats" button
✅ Button launches /frame/stats/18139
✅ Frame image shows preview of stats
```

#### Test 2: Quest Recommendations
```
Cast: "@gmeowbased recommend me some quests"

Expected:
✅ Bot replies with 3 personalized quest suggestions
✅ Frame embed with "Browse Quests" button
✅ Button launches /frame/quest board
✅ Shows active quests based on user progress
```

#### Test 3: Streak Status
```
Cast: "@gmeowbased my streak"

Expected:
✅ Bot replies with current streak count & multiplier
✅ Frame embed with "Claim Daily GM" button
✅ Button launches /frame/gm with Base chain selector
✅ User can claim GM and extend streak
```

#### Test 4: Leaderboard
```
Cast: "@gmeowbased show leaderboard"

Expected:
✅ Bot replies with user's rank position
✅ Frame embed with "View Rankings" button
✅ Button launches /frame/leaderboard
✅ Shows top pilots by XP
```

#### Test 5: Help Command
```
Cast: "@gmeowbased help"

Expected:
✅ Bot replies with command list
✅ Frame embed with "Get Started" button
✅ Button launches /frame/quest board
✅ Shows available quests for new users
```

#### Test 6: Rate Limiting
```
Send 6 mentions within 1 minute

Expected:
✅ First 5 replies succeed
✅ 6th reply: "Slow down! Try again in X minutes"
✅ No frame embed on rate-limited response
✅ Rate limit resets after 1 minute
```

#### Test 7: Low Neynar Score
```
User with score < 0.5 mentions bot

Expected:
✅ Bot replies: "Need Neynar score 0.5+ to interact"
✅ Provides guidance on building score
✅ Shows current score in message
✅ No frame embed
```

#### Test 8: Missing Wallet
```
User without verified wallet mentions bot

Expected:
✅ Bot replies: "Connect a wallet to interact"
✅ Provides link to Warpcast settings
✅ No frame embed
```

---

## 🧪 Manual Testing (Production)

### Step 1: Verify Webhook is Live
```bash
curl -X POST https://gmeowhq.art/api/neynar/webhook \
  -H "Content-Type: application/json" \
  -H "x-neynar-signature: test" \
  -d '{"type":"cast.created","data":{"hash":"0xtest"}}'

# Expected: 200 OK (will reject invalid signature but endpoint is live)
```

### Step 2: Cast on Warpcast
1. Open https://warpcast.com
2. Create new cast
3. Mention @gmeowbased
4. Add your question: "show me my stats"
5. Post cast

### Step 3: Monitor Webhook
```bash
# Check Vercel logs
vercel logs --follow

# Or check Neynar webhook dashboard
# https://dev.neynar.com/webhooks
```

### Step 4: Verify Reply
1. Wait 1-3 seconds for bot response
2. Check your cast for bot reply
3. Verify reply text is relevant to your question
4. Click frame embed to test Mini App launch
5. Verify frame image loads correctly
6. Test button interaction (should launch full app)

---

## 🐛 Troubleshooting

### Issue: Bot doesn't reply

**Possible causes:**
1. Webhook not configured in Neynar dashboard
2. Bot FID or signer UUID invalid
3. User's Neynar score < 0.5
4. User doesn't have verified wallet
5. Rate limit exceeded
6. Webhook signature verification failed

**Debug steps:**
```bash
# 1. Check environment variables
echo "Bot FID: $NEYNAR_BOT_FID"
echo "Signer: $NEYNAR_BOT_SIGNER_UUID"
echo "API Key: ${NEYNAR_API_KEY:0:10}..."

# 2. Check webhook logs
vercel logs /api/neynar/webhook --since 5m

# 3. Test bot health endpoint (public, no auth)
curl https://gmeowhq.art/api/bot/health

# Note: Admin endpoints require authentication cookie
# Use /api/bot/health for public status checks
```

### Issue: Frame doesn't load

**Possible causes:**
1. Frame URL malformed
2. Image generation failed
3. Invalid Mini App embed format
4. Button action type incorrect (must be launch_frame)
5. Missing required fields (action.name)

**Debug steps:**
```bash
# 1. Validate frame metadata
curl https://gmeowhq.art/frame/stats/18139 | grep -E "fc:miniapp|fc:frame"

# 2. Test image endpoint
curl -I https://gmeowhq.art/api/frame/og?type=stats&fid=18139

# 3. Validate embed format
node -e 'console.log(JSON.parse(process.argv[1]))' '<frame_content>'
```

### Issue: Button doesn't work

**Possible causes:**
1. Action type is not `launch_frame` or `view_token`
2. URL is not HTTPS
3. Missing action.name field
4. Target URL returns 404
5. Warpcast app needs update

**Debug steps:**
```bash
# 1. Check frame button config
curl https://gmeowhq.art/frame/stats/18139 | \
  grep -o '"button":{[^}]*}' | \
  python3 -m json.tool

# 2. Verify action.name present
curl -s https://gmeowhq.art/frame/stats/18139 | \
  grep -o '"action":{[^}]*"name"[^}]*}'

# 3. Test target URL
curl -I https://gmeowhq.art/frame/stats/18139
```

---

## 📊 Bot Activity Dashboard

### Admin Endpoint
```
GET https://gmeowhq.art/api/admin/bot/activity
```

Returns:
- Total casts processed (24h/7d/30d)
- Intent distribution
- Frame embed rate
- Average response time
- Error rate
- Rate limit triggers
- Top users by interactions

### Metrics to Monitor
- **Response Rate**: Should be > 95% (within 3 seconds)
- **Frame Embed Rate**: Should be > 80% (for successful replies)
- **Error Rate**: Should be < 5%
- **Rate Limit Rate**: Should be < 10%

---

## 🚀 Enhancement Options (from Audit)

Based on the audit, here are the recommended enhancements:

### Option 2: Improve Intent Detection (Quick Win)
**Effort**: 1-2 hours  
**Impact**: Better user experience

Add 4 new intents:
- `battle` - PvP challenges
- `achievement` - Milestone tracking
- `token` - Reward claims
- `agent` - AI assistant

### Option 3: Custom Frame Layouts (Medium)
**Effort**: 3-5 hours  
**Impact**: Richer interactions

Build 3 new frame types:
- Achievement showcase
- Battle history
- Multi-chain comparison

**Note**: Remember single-button limitation! Focus on in-app SDK interactions.

### Option 4: Auto-Generate Frames (Advanced)
**Effort**: 1-2 days  
**Impact**: Scalability

Create dynamic Mini App launcher:
- Query → Preview Image → Launch Full App
- SDK-based pagination/filters inside app
- Cache generated frames

### Option 5: Enhanced OG Images (Quick Win)
**Effort**: 1-2 hours  
**Impact**: Better visual appeal

Add:
- Intent-specific backgrounds
- Real-time data visualization
- User tier-based styling

---

## 📝 Testing Log Template

```markdown
### Test Run: [Date/Time]
**Tester**: @heycat (FID 18139)
**Environment**: Production

| Test | Cast | Reply | Frame | Status | Notes |
|------|------|-------|-------|--------|-------|
| Stats | ✅ | ✅ | ✅ | PASS | Response in 2.1s |
| Quests | ✅ | ✅ | ✅ | PASS | 3 recommendations shown |
| Streak | ✅ | ✅ | ✅ | PASS | Current streak: 5 days |
| Leaderboard | ✅ | ✅ | ✅ | PASS | Rank #42 shown |
| Help | ✅ | ✅ | ✅ | PASS | Command list complete |
| Rate Limit | ✅ | ✅ | ❌ | PASS | Blocked after 5 requests |

**Overall**: 6/6 PASS
**Issues**: None
**Next Steps**: Test enhanced intents
```

---

## 🎯 Next Actions for @heycat

1. **Verify Your Score**
   - Check https://neynar.com for your current score
   - Ensure score >= 0.5
   - If low, cast & engage to build it up

2. **Test Basic Interaction**
   - Cast: "@gmeowbased show my stats"
   - Verify bot replies within 3 seconds
   - Click frame embed to launch Mini App
   - Test in-app interactions

3. **Test All Intents**
   - Use testing log template above
   - Test each of the 9 intent types
   - Verify frame embeds work for each
   - Report any issues

4. **Choose Enhancement Path**
   - Review BOT-ENHANCEMENT-AUDIT.md
   - Pick Option 2, 3, 4, or 5
   - Confirm choice before implementation

5. **Monitor Production**
   - Check webhook logs during testing
   - Monitor response times
   - Track error rates
   - Review frame embed success rate

---

## 📚 Reference Documentation

- **Bot Webhook**: `app/api/neynar/webhook/route.ts`
- **Intent Detection**: `lib/agent-auto-reply.ts`
- **Frame Builder**: `lib/bot-frame-builder.ts`
- **Frame Routes**: `app/frame/**/route.tsx`
- **Share Utils**: `lib/share.ts`
- **Mini App Validation**: `lib/miniapp-validation.ts`

**MCP Verification Docs**:
- `docs/maintenance/FMX-BUTTON-VALIDATION-CHECKLIST.md`
- `docs/maintenance/MCP-QUICK-REFERENCE.md`
- `docs/frame-implementation-comparison.md`
- Official Spec: https://miniapps.farcaster.xyz/docs/specification

---

**Status**: ✅ Ready for Production Testing  
**Blocking Issues**: None  
**Prerequisites**: User score >= 0.5, verified wallet

**Let's test! Cast "@gmeowbased show my stats" on Warpcast to begin! 🚀**
