# Phase 5: Type Recognition Issues

## Current Status
- **TypeScript Errors**: 341 errors (increased from 323 after adding types)
- **Root Cause**: TypeScript not recognizing newly added types in types/supabase.ts
- **Commits**: 
  - 787a039 (Phase 5 partial - 89 → 68 errors)
  - 4913216 (Added 10 table types + deprecated 2 endpoints)

## Problem Analysis

### Issue 1: TypeScript Not Recognizing New Types
Even though we added 10 table types to `types/supabase.ts`, TypeScript is still inferring `never` type when querying these tables:

```typescript
// In lib/badges/badges.ts
const { data } = await supabase.from('user_badges').select('*')
// TypeScript infers: data: never[]
// Expected: data: Database['public']['Tables']['user_badges']['Row'][]
```

**Possible Causes**:
1. TypeScript server cache not invalidated
2. Types not properly exported/imported
3. Supabase client generic type parameter not correctly applied
4. VS Code/TS server needs full restart

### Issue 2: Non-Existent Tables Referenced in Code
Several tables are queried in code but don't exist in migrations:

**Referral System**:
- ❌ `referral_tracking` - NOT in migrations (but queried in code)
- ❌ `referral_period_comparison` - NOT in migrations
- ❌ `referral_tier_distribution` - NOT in migrations
- ❌ `referral_timeline` - NOT in migrations
- ✅ `referral_activity` - EXISTS
- ✅ `referral_registrations` - EXISTS
- ✅ `referral_stats` - EXISTS

### Issue 3: Dropped Tables Still Queried
These tables were dropped in Phase 3 but are still referenced:

**Dropped in Phase 3**:
- ❌ `viral_tier_history` (10 references)
- ❌ `viral_milestone_achievements` (multiple references)
- ❌ `gmeow_rank_events` (event logging)
- ❌ `leaderboard_calculations`

**Files Still Querying Dropped Tables**:
- lib/notifications/xp-rewards.ts
- lib/notifications/priority.ts
- lib/subsquid-client.ts
- lib/viral/viral-achievements.ts (lines 144, 310, 452)
- lib/viral/viral-engagement-sync.ts (line 310)
- app/api/admin/viral/top-casts/route.ts
- app/api/viral/* (multiple files)

## Completed Actions

### ✅ Tables Added to types/supabase.ts
1. user_badges - Badge assignments and minting status
2. mint_queue - Badge minting queue with retry logic
3. quest_creators - User quest creation tracking
4. bot_metrics - Bot performance metrics
5. frame_sessions - Frame interaction tracking
6. guild_metadata - Guild names/descriptions/avatars
7. guild_events - Guild activity log
8. notification_preferences - User notification settings
9. notification_batch_queue - Notification delivery queue
10. user_contracts - User-deployed contract tracking

### ✅ Deprecated Endpoints
1. `/api/admin/viral/tier-upgrades` - Returns 410 Gone
2. `/api/admin/viral/achievement-stats` - Returns 410 Gone

### ✅ Fixed
1. badge_casts field names (last_updated_at → last_metrics_update)
2. lib/bot/recommendations - Replaced with empty stub + deprecation warning
3. lib/profile/profile-service - Replaced with Subsquid getLeaderboardEntry()

## Remaining Work

### Priority 1: Fix Type Recognition (BLOCKER)
**Options**:
1. **Restart TypeScript server** in VS Code (Cmd/Ctrl+Shift+P → "TypeScript: Restart TS Server")
2. **Fully restart VS Code** to clear all caches
3. **Regenerate types properly** if Supabase becomes available locally
4. **Add explicit type annotations** to all queries as workaround:
   ```typescript
   const { data } = await supabase
     .from('user_badges')
     .select('*') as { data: Database['public']['Tables']['user_badges']['Row'][] | null }
   ```

### Priority 2: Add Missing Table Types
Need to add types for existing tables still queried in code:
- referral_activity
- referral_registrations
- referral_stats
- points_transactions
- quest_completions
- quest_definitions
- quest_templates (needs updating - current type is minimal)
- task_completions
- unified_quests (needs more fields added)
- user_quest_progress
- badge_ownership
- miniapp_notification_tokens
- pending_viral_notifications
- leaderboard_weekly

### Priority 3: Remove/Deprecate Non-Existent Table References
**Referral Tables** (don't exist in migrations):
- Remove all queries to: referral_tracking, referral_period_comparison, referral_tier_distribution, referral_timeline
- Files to check: app/api/referral/*/route.ts

**Viral Tables** (dropped in Phase 3):
- Comment out viral_tier_history queries in:
  - lib/notifications/xp-rewards.ts
  - lib/notifications/priority.ts
  - lib/subsquid-client.ts
- Comment out viral_milestone_achievements queries in:
  - lib/viral/viral-achievements.ts
  - app/api/viral/stats/route.ts
- Remove gmeow_rank_events logging in:
  - lib/viral/viral-engagement-sync.ts (line 310)
  - lib/viral/viral-achievements.ts (line 346)

### Priority 4: Fix leaderboard-scorer.ts
- 8 errors from querying dropped leaderboard_calculations table
- Lines: 111, 116, 160, 164, 310, 367, 372, 376
- Solution: Comment out deprecated functions or replace with Subsquid

## Recommended Next Steps

1. **IMMEDIATE**: Have user restart TypeScript server in VS Code
   - Command: Cmd/Ctrl+Shift+P → "TypeScript: Restart TS Server"
   - This should recognize the new types we added

2. **IF STEP 1 FAILS**: Fully restart VS Code
   - Close all windows
   - Reopen workspace
   - Wait for TypeScript server to initialize

3. **AFTER TYPES RECOGNIZED**: Continue adding remaining table types
   - Focus on tables actually referenced in code
   - Skip tables that don't exist

4. **CLEANUP**: Remove all references to dropped tables
   - viral_tier_history
   - viral_milestone_achievements
   - gmeow_rank_events
   - leaderboard_calculations

5. **FINAL**: Test compilation and commit Phase 5 complete

## Error Progression Tracking
- Start: 89 TypeScript errors
- After manual types: 68 errors (21 fixed)
- After VS Code restart: 361 errors (types not recognized)
- After field name fix: 323 errors (38 fixed)
- After adding 10 types: 341 errors (types still not recognized + 2 endpoints deprecated)

**Target**: 0 TypeScript errors

## Key Insights
1. Manual type addition works BUT requires TypeScript server restart to recognize
2. Many "tables" referenced in code don't actually exist in migrations
3. Phase 3 dropped 9 tables but many files still query them
4. VS Code/TS server caching causes type recognition issues
5. viral_milestone_achievements was supposed to be kept but was dropped in migration
