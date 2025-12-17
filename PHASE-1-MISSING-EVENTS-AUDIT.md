# 🔍 Phase 1 Missing Events Audit - Critical Review

**Date**: December 16, 2025, 10:30 PM CST  
**Status**: 🔴 **CRITICAL FINDINGS** - Missing event handlers identified  
**Priority**: HIGH - Must fix before Phase 2  

**Website**: https://gmeowhq.art  
**Network**: Base (Chain ID 8453)

**Reference Documentation**:
- [Part 2: Section 5.3 Event Types](FARCASTER-BOT-ENHANCEMENT-PLAN-PART-2.md#53-event-types-consumed)
- [Webhook Handler](app/api/neynar/webhook/route.ts)

---

## 📊 Executive Summary

**Audit Findings**:
- ✅ **4/6 documented events IMPLEMENTED** (cast.created, miniapp_added, miniapp_removed, notifications_enabled/disabled)
- ⚠️ **2/6 documented events MISSING** (cast.deleted, reaction.created)
- ✅ **Viral engagement sync WORKING** (Phase 5.1 complete)
- ⚠️ **Documentation inconsistency** - Part 2 mentions events not in scope

**Impact Assessment**:
- **MEDIUM Impact**: Missing events are documented as "not handled" or optional
- **LOW Risk**: Current implementation matches actual requirements
- **Action Required**: Update documentation to clarify scope OR implement missing handlers

---

## 🎯 Event Handler Comparison

### ✅ IMPLEMENTED Events (4/6)

| Event Type | Status | Handler Location | Purpose | Notes |
|-----------|--------|------------------|---------|-------|
| `cast.created` | ✅ COMPLETE | Line 549 | Auto-reply generation, viral sync | Primary bot trigger |
| `miniapp_added` | ✅ COMPLETE | Line 154 | Token registration | Phase 4 priority system |
| `miniapp_removed` | ✅ COMPLETE | Line 197 | Token cleanup | Marks as 'removed' |
| `notifications_enabled` | ✅ COMPLETE | Line 154 | Token activation | Same as miniapp_added |
| `notifications_disabled` | ✅ COMPLETE | Line 197 | Token deactivation | Same as miniapp_removed |

### ⚠️ DOCUMENTED BUT NOT IMPLEMENTED (2/6)

| Event Type | Status | Documentation Says | Current Behavior | Action Needed |
|-----------|--------|-------------------|------------------|---------------|
| `cast.deleted` | ❌ MISSING | "Not handled (skipped)" | Returns `ignored:cast.deleted` | **ADD HANDLER** - Clean up references |
| `reaction.created` | ❌ MISSING | "Not handled (use engagement sync instead)" | Returns `ignored:reaction.created` | **DECISION NEEDED** - Is engagement sync sufficient? |

---

## 🔍 Detailed Analysis

### 1. cast.deleted Event

**Documentation** (Part 2, Section 5.2):
```typescript
// Registered webhook events
- cast.deleted            // Not handled (skipped)
```

**Current Implementation**:
```typescript
// Line 549: app/api/neynar/webhook/route.ts
if (eventType !== 'cast.created') {
  return NextResponse.json({ ok: true, skipped: `ignored:${eventType || 'unknown'}` })
}
```

**Issues**:
1. No explicit handler for `cast.deleted`
2. Could leave orphaned data in `badge_casts` table
3. Viral engagement metrics may reference deleted casts
4. Bot replies may reference deleted parent casts

**Recommendation**: **IMPLEMENT CLEANUP HANDLER**

**Proposed Implementation**:
```typescript
// After miniapp event handling, before cast.created check
if (eventType === 'cast.deleted') {
  const castHash = event.data?.hash
  if (castHash) {
    // Clean up badge_casts entry
    const supabase = getSupabaseServerClient()
    if (supabase) {
      await supabase
        .from('badge_casts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('cast_hash', castHash)
      
      console.log('[webhook] Cast deleted, marked in badge_casts:', castHash)
    }
  }
  
  return NextResponse.json({ ok: true, handled: 'cast-deleted' })
}
```

**Effort**: 30 minutes  
**Risk**: LOW  
**Priority**: MEDIUM

---

### 2. reaction.created Event

**Documentation** (Part 2, Section 5.2):
```typescript
// Registered webhook events
- reaction.created        // Not handled (use engagement sync instead)
```

**Current Implementation**:
```typescript
// Engagement sync runs on cast.created webhook
// Fetches metrics from Neynar API (likes, recasts, replies)
// See: handleViralEngagementSync() at line 394
```

**Issues**:
1. Documentation says "not handled"
2. Engagement sync is ASYNC (may be delayed up to 5 min)
3. Real-time reaction events could improve responsiveness

**Current Sync Strategy**:
- Triggered on `cast.created` webhook (when cast created OR mentioned)
- Fetches current metrics via Neynar API
- Updates `badge_casts` table with latest counts
- Awards XP if tier upgraded

**Analysis**: **ENGAGEMENT SYNC IS SUFFICIENT**
- Reaction webhooks would create 3x traffic (likes + recasts + replies)
- Async sync acceptable for viral tier upgrades (not time-critical)
- Current implementation avoids webhook spam

**Recommendation**: **NO ACTION NEEDED** - Document strategy clearly

**Documentation Update**:
```markdown
**Why reaction.created is not handled**:
- Would create 3x webhook traffic (every like/recast/reply)
- Async engagement sync via Neynar API is sufficient
- Viral tier upgrades not time-critical (5-min delay acceptable)
- Reduces webhook processing overhead
```

**Effort**: 0 minutes (documentation only)  
**Risk**: NONE  
**Priority**: LOW

---

## 🔗 Dynamic Route Links Audit

### Frame URLs Generated by Bot

**Current Implementation** (lib/bot-frame-builder.ts):
```typescript
const FRAME_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://gmeowhq.art'

const FRAME_PATHS = {
  stats: '/frames/stats',
  quests: '/frames/quests',
  leaderboards: '/frames/leaderboards',
  guild: '/frames/guild',
  badges: '/frames/badges',
  // ... etc
}
```

**Audit Results**:
✅ All frame paths use lowercase routes (no `/Quest`, `/Dashboard` issues)
✅ Frame URLs match app router structure
✅ No hardcoded routes in agent-auto-reply.ts

**Status**: **NO ISSUES FOUND**

---

## 📋 Recommended Actions

### CRITICAL (Before Phase 2)

1. **✅ Add cast.deleted Handler** (30 minutes)
   ```typescript
   // File: app/api/neynar/webhook/route.ts
   // Add after miniapp event handling, before cast.created check
   if (eventType === 'cast.deleted') {
     await handleCastDeleted(event.data?.hash)
     return NextResponse.json({ ok: true, handled: 'cast-deleted' })
   }
   ```

2. **✅ Update Documentation** (15 minutes)
   - Clarify reaction.created strategy in Part 2
   - Add cast.deleted handler documentation
   - Update webhook event table with actual status

### OPTIONAL (Future Enhancement)

3. **⏳ Real-time Reaction Handling** (Phase 3, if needed)
   - Only if viral tier upgrades need <1s latency
   - Add rate limiting (reactions can spam webhooks)
   - Estimated effort: 4 hours

---

## 🧪 Testing Requirements

**After Implementing cast.deleted Handler**:

1. **Unit Tests** (1 hour):
   ```typescript
   // __tests__/api/neynar/webhook-cast-deleted.test.ts
   - Should mark cast as deleted in badge_casts
   - Should handle missing cast gracefully
   - Should return success response
   ```

2. **Integration Test** (30 minutes):
   - Mock Neynar webhook with cast.deleted event
   - Verify badge_casts.deleted_at is updated
   - Verify engagement sync skips deleted casts

3. **Manual QA** (15 minutes):
   - Delete a badge cast on Farcaster
   - Verify webhook received and processed
   - Check badge_casts table for deleted_at timestamp

---

## 📊 Phase 2 Impact Analysis

**Does this block Phase 2?**
- **NO** - Phase 2 features don't depend on cast.deleted or reaction.created
- **RECOMMENDED**: Fix cast.deleted handler before Phase 2 for clean foundation

**Timeline Adjustment**:
- Original Phase 2 Start: Immediate
- With Fixes: +1 hour delay (30 min implementation + 30 min testing)

---

## 🎯 Final Recommendations

### Immediate Actions (1 hour total)

1. **Implement cast.deleted handler** (30 min)
   - Add explicit handler in webhook route
   - Mark casts as deleted in badge_casts table
   - Add console logging for debugging

2. **Update documentation** (15 min)
   - Clarify reaction.created strategy
   - Update event handling table
   - Add "Why not handled" notes

3. **Add unit tests** (15 min)
   - Test cast.deleted handler
   - Test badge_casts cleanup

### Phase 2 Readiness

**Status After Fixes**: ✅ **READY FOR PHASE 2**
- All critical events handled
- Documentation accurate
- Clean foundation for Phase 2 features

---

## 📝 Implementation Checklist

- [ ] Create handleCastDeleted function
- [ ] Add cast.deleted event handler in webhook route
- [ ] Update badge_casts schema (add deleted_at column if missing)
- [ ] Add unit tests for cast.deleted handler
- [ ] Update FARCASTER-BOT-ENHANCEMENT-PLAN-PART-2.md with clarifications
- [ ] Run full test suite (30 + 30 = 60 tests)
- [ ] Manual QA with staging account
- [ ] Update PHASE-2-STATUS.md with completion
- [ ] Deploy fixes to staging
- [ ] Proceed with Phase 2 implementation

---

## 🚨 Critical Issues Summary

**FOUND**: 2 missing event handlers (cast.deleted, reaction.created)  
**SEVERITY**: MEDIUM (documented as optional, but incomplete)  
**RECOMMENDATION**: Fix cast.deleted (30 min), document reaction.created strategy  
**BLOCKER**: NO - Can proceed with Phase 2 after 1-hour fixes  

**Status**: ✅ **AUDIT COMPLETE** - Action plan ready for implementation

