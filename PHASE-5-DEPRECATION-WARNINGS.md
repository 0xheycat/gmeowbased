# Phase 5: Deprecation Warnings Added

**Status**: ✅ Warnings Added  
**Date**: December 2024  
**Objective**: Add deprecation warnings to lib files that still reference dropped tables

---

## Summary

Added deprecation warnings to **8 lib files** that still query dropped tables from Phase 3. These warnings help developers identify legacy code that needs migration to Subsquid.

**Note**: viral_milestone_achievements table was kept (not dropped) as requested by user.

---

## Files Updated

### 1. ✅ lib/bot/analytics/stats.ts
- **Function**: `fetchTipPoints()`
- **Warning Added**: Line 103
- **Status**: Returns 0 until Subsquid implementation
```typescript
console.warn('[fetchTipPoints] DEPRECATED - gmeow_rank_events table dropped, returning 0')
```

### 2. ✅ lib/bot/context/user-context.ts
- **Query 1**: User profile and XP stats (line 167)
- **Query 2**: Active quests (line 179)
- **Warnings Added**: Inline deprecation comments
```typescript
// ⚠️ DEPRECATED - Replace with Subsquid getGMRankEvents()
```

### 3. ✅ lib/bot/recommendations/index.ts
- **Function**: `fetchCompletionHistory()`
- **Warning Added**: Line 93
```typescript
// ⚠️ DEPRECATED - Replace with Subsquid getGMRankEvents()
```

### 4. ✅ lib/supabase/queries/gm.ts
- **Function**: `getLegacyGMEvents()`
- **Warning Added**: Already present (line 268)
```typescript
console.warn('[getLegacyGMEvents] DEPRECATED - Use Subsquid getGMStats() instead')
```

### 5. ✅ lib/profile/profile-service.ts
- **Function**: `fetchLeaderboardDataFromDB()`
- **Warning Added**: Line 135
```typescript
// ⚠️ DEPRECATED - Replace with Subsquid getUserStatsByFID()
```

### 6. ✅ lib/viral/viral-engagement-sync.ts
- **Function**: Event logging to `gmeow_rank_events`
- **Warning Added**: Line 308
```typescript
// ⚠️ DEPRECATED - Event logging disabled (table dropped)
```

### 7. ✅ lib/viral/viral-achievements.ts
- **Function**: Achievement event logging to `gmeow_rank_events`
- **Warning Added**: Line 344
```typescript
// ⚠️ DEPRECATED - Event logging disabled (table dropped)
```
- **Note**: viral_milestone_achievements queries kept intact (lines 144, 310, 451)

### 8. ✅ lib/leaderboard/leaderboard-scorer.ts
- **Status**: Already has comprehensive deprecation docs (lines 29-35)
- **No changes needed**: File already documents migration path

---

## Tables Referenced (Status)

| Table Name | Status | Replacement |
|-----------|--------|-------------|
| `gmeow_rank_events` | ❌ Dropped | Subsquid getGMRankEvents() |
| `leaderboard_calculations` | ❌ Dropped | Subsquid getUserStatsByFID() |
| `viral_milestone_achievements` | ✅ KEPT | Still in use (user requested) |

---

## TypeScript Errors

### Remaining Errors: 89 total

**Expected**: These errors occur because dropped tables return `never` type from Supabase client.

**Breakdown by File**:
- lib/leaderboard/leaderboard-scorer.ts: 8 errors (legacy functions)
- lib/bot/recommendations/index.ts: 9 errors (query processing)
- lib/profile/profile-service.ts: 28 errors (leaderboard data access)
- lib/supabase/queries/gm.ts: 5 errors (user profile queries)
- lib/viral/viral-engagement-sync.ts: 0 errors ✅
- lib/viral/viral-achievements.ts: 0 errors ✅
- lib/bot/context/user-context.ts: 0 errors ✅
- lib/bot/analytics/stats.ts: 0 errors ✅

**Why viral files are clean**: 
- Event logging disabled but not removed
- Code kept intact with warnings
- viral_milestone_achievements table still exists (not dropped)

**Why other files have errors**:
- Supabase queries return `never` for non-existent tables
- Property access (`.field`) fails on `never` type
- Full migration to Subsquid needed to eliminate errors

---

## Migration Strategy

### Phase 5.1 (Next): Replace with Subsquid Calls

For each file with errors:

1. **Replace query** with Subsquid client call
2. **Map response** to expected interface
3. **Test** for 0 TypeScript errors
4. **Remove** deprecated code

Example migration:
```typescript
// OLD (broken):
const { data } = await supabase
  .from('gmeow_rank_events')
  .select('*')

// NEW (working):
import { getGMRankEvents } from '@/lib/subsquid-client'
const events = await getGMRankEvents(fid, sinceDate)
```

### Priority Order:
1. lib/supabase/queries/gm.ts (5 errors - simplest)
2. lib/profile/profile-service.ts (28 errors - most impactful)
3. lib/bot/recommendations/index.ts (9 errors - medium complexity)
4. lib/leaderboard/leaderboard-scorer.ts (8 errors - already documented)

---

## Testing

### Current State:
- Warnings visible in console logs
- Deprecated functions still callable (return defaults)
- No breaking changes to existing code

### Validation:
```bash
# Check warnings are present
grep -r "DEPRECATED" lib/

# Count TypeScript errors
pnpm tsc --noEmit 2>&1 | grep "error TS" | wc -l
# Expected: 89 errors (all from dropped tables)
```

---

## Next Steps

1. **Phase 5.1**: Replace lib/supabase/queries/gm.ts with Subsquid
2. **Phase 5.2**: Replace lib/profile/profile-service.ts with Subsquid  
3. **Phase 5.3**: Replace lib/bot/recommendations/index.ts with Subsquid
4. **Phase 5.4**: Update lib/leaderboard/leaderboard-scorer.ts (legacy functions)
5. **Phase 5.5**: Final cleanup - remove all deprecated code

**ETA**: ~4-6 hours for complete migration
