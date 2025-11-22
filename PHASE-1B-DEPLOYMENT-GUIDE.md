# Phase 1B Deployment Guide

## Pre-Deployment Checklist

- [x] ✅ Code implementation complete (aae88cc)
- [x] ✅ Migration created: `20251203000000_phase1b_frame_sessions.sql`
- [x] ✅ No TypeScript errors
- [x] ✅ Test script created: `scripts/test-phase1b-actions.ts`
- [ ] ⏸️ Migration applied to production Supabase
- [ ] ⏸️ Deployed to Vercel
- [ ] ⏸️ Production testing completed

---

## Step 1: Apply Migration to Supabase

### Option A: Using Supabase CLI (Recommended)
```bash
# Navigate to project
cd /home/heycat/Desktop/2025/Gmeowbased

# Push migration to production
npx supabase db push --linked

# Verify table created
npx supabase db remote commit
```

### Option B: Using Supabase Dashboard
1. Go to https://supabase.com/dashboard/project/Gmeow50_
2. Navigate to **SQL Editor**
3. Copy contents of `supabase/migrations/20251203000000_phase1b_frame_sessions.sql`
4. Paste and click **Run**
5. Verify success: Query `SELECT * FROM frame_sessions LIMIT 1;`

**Expected Result**: Empty table with schema created

---

## Step 2: Verify Environment Variables

### Vercel Production Env Vars
```bash
# Check production env vars
vercel env ls

# Required for Phase 1B:
# - NEXT_PUBLIC_SUPABASE_URL ✅ (from Phase 0)
# - SUPABASE_SERVICE_ROLE_KEY ✅ (from Phase 0)
```

**If missing**, add via Vercel Dashboard:
1. Go to https://vercel.com/your-org/gmeow/settings/environment-variables
2. Add `SUPABASE_SERVICE_ROLE_KEY` (Production scope)
3. Redeploy to apply

---

## Step 3: Deploy to Vercel

### Push to Main Branch
```bash
# Ensure changes are committed
git log --oneline -1
# Should show: feat(phase1b): Add interactive frame actions...

# Push to main (triggers Vercel deployment)
git push origin main

# Monitor deployment
vercel logs --follow
```

**Expected Build Time**: 2-3 minutes

---

## Step 4: Production Testing

### Test 1: recordGM Action
```bash
curl -X POST https://gmeowhq.art/api/frame \
  -H "Content-Type: application/json" \
  -d '{
    "action": "recordGM",
    "payload": {
      "fid": 12345,
      "untrustedData": { "fid": 12345 }
    }
  }' | jq
```

**Expected Response**:
```json
{
  "ok": true,
  "message": "🌅 GM Recorded!\nStreak: X days • Total GMs: Y...",
  "frameUrl": "https://gmeowhq.art/api/frame?type=gm&fid=12345&session=<uuid>",
  "sessionId": "<uuid>",
  "gmCount": 42,
  "streak": 15,
  "traces": [...]
}
```

### Test 2: questProgress Action (New Session)
```bash
curl -X POST https://gmeowhq.art/api/frame \
  -H "Content-Type: application/json" \
  -d '{
    "action": "questProgress",
    "payload": {
      "fid": 12345,
      "questId": "test-quest-1",
      "untrustedData": { "fid": 12345 }
    }
  }' | jq
```

**Expected Response**:
```json
{
  "ok": true,
  "message": "📝 Quest Progress: Quest test-quest-1\nStep 1/3 complete...",
  "frameUrl": "https://gmeowhq.art/api/frame?type=quest&questId=test-quest-1&session=<uuid>",
  "sessionId": "<uuid>",
  "currentStep": 1,
  "isComplete": false,
  "traces": [...]
}
```

### Test 3: Continue Existing Quest Session
```bash
# Use sessionId from Test 2 response
SESSION_ID="<uuid-from-test-2>"

curl -X POST https://gmeowhq.art/api/frame \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"questProgress\",
    \"payload\": {
      \"fid\": 12345,
      \"questId\": \"test-quest-1\",
      \"session\": \"$SESSION_ID\",
      \"untrustedData\": { \"fid\": 12345 }
    }
  }" | jq
```

**Expected Response**:
```json
{
  "ok": true,
  "message": "📝 Quest Progress: Quest test-quest-1\nStep 2/3 complete...",
  "currentStep": 2,
  "isComplete": false
}
```

### Test 4: Verify Supabase frame_sessions
```bash
# Via Supabase Dashboard SQL Editor:
SELECT * FROM frame_sessions ORDER BY created_at DESC LIMIT 5;
```

**Expected Result**: Rows with session_id, fid, state JSONB

---

## Step 5: Warpcast Frame Testing

### Manual Frame Test
1. Open Warpcast
2. Cast a frame URL: `https://gmeowhq.art/api/frame?type=gm&fid=12345`
3. Click GM button
4. **Expected**: Success message appears in feed
5. Refresh frame
6. **Expected**: Updated state visible (if frame uses session)

### Frame Validator
1. Go to https://warpcast.com/~/developers/frames
2. Enter frame URL: `https://gmeowhq.art/api/frame?type=gm&fid=12345`
3. Click **Validate**
4. Click buttons in preview
5. **Expected**: POST actions work, messages appear

---

## Rollback Plan

### If Production Issues Occur

#### Rollback Code
```bash
# Revert to previous commit
git revert aae88cc

# Push to trigger redeployment
git push origin main
```

#### Rollback Migration (if needed)
```sql
-- Via Supabase Dashboard SQL Editor
DROP TABLE IF EXISTS frame_sessions CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_frame_sessions() CASCADE;
DROP FUNCTION IF EXISTS update_frame_sessions_updated_at() CASCADE;
```

**Impact**: Frame actions will fail with 500, but existing functionality (Phase 1A caching) continues working.

---

## Monitoring

### Vercel Logs
```bash
# Real-time logs
vercel logs --follow

# Filter for frame actions
vercel logs | grep "recordGM\|questProgress"
```

### Supabase Logs
1. Go to Supabase Dashboard → **Logs**
2. Filter by `frame_sessions` table
3. Check for INSERT/UPDATE operations

### Expected Patterns
```
[frame-state] Session not found: <uuid>          → Normal (new session)
[frame-state] Cleaned up 0 expired sessions      → Normal (cleanup run)
[FRAME_CACHE] Invalidating user frames: 12345   → Normal (after recordGM)
```

---

## Success Criteria

- [ ] ✅ recordGM action returns sessionId and message
- [ ] ✅ questProgress action tracks currentStep correctly
- [ ] ✅ Session continuation works (same sessionId)
- [ ] ✅ frame_sessions table populates with JSONB state
- [ ] ✅ Cache invalidation works (invalidateUserFrames called)
- [ ] ✅ No 500 errors in production logs
- [ ] ✅ Warpcast frame buttons trigger actions

**All criteria met**: Phase 1B deployment successful ✅

---

## Next Steps After Deployment

1. **Monitor for 24 hours**: Check logs, frame_sessions growth
2. **Run cleanup manually**: `cleanupExpiredSessions()` via API or script
3. **Update frame metadata**: Add fc:frame:button:N:action="post" to frame GET responses
4. **Phase 1C planning**: Visual enhancements (animations, typography)

---

## Troubleshooting

### Issue: "failed to save state" error
**Cause**: Supabase connection issue or missing env vars  
**Fix**: Verify SUPABASE_SERVICE_ROLE_KEY in Vercel, check Supabase logs

### Issue: Sessions not persisting
**Cause**: Migration not applied or table name mismatch  
**Fix**: Re-run migration, verify table name is `frame_sessions`

### Issue: Cache not invalidating
**Cause**: invalidateUserFrames() failing silently  
**Fix**: Check Redis connection, verify UPSTASH_REDIS_REST_URL in Vercel

### Issue: TypeScript errors on build
**Cause**: Missing imports or type mismatches  
**Fix**: Check `get_errors` output, ensure all imports from lib/frame-*.ts are correct

---

## Contact

If deployment issues arise, check:
- Vercel logs: `vercel logs --follow`
- Supabase logs: Dashboard → Logs
- GitHub Actions: `.github/workflows/` (if warmup affected)

**Phase 1B Owner**: GitHub Copilot (Agent)  
**Phase 1B PR**: (Create PR if deploying to staging first)
