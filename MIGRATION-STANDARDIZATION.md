# Migration Standardization Guide

**Created**: December 18, 2025  
**Purpose**: Standardize all database migrations using Supabase MCP  
**Status**: ENFORCED (all future migrations must follow this process)

---

## Migration Process (MANDATORY)

### Step 1: Create SQL Migration File

**Location**: `supabase/migrations/`  
**Naming**: `YYYYMMDDHHMMSS_descriptive_name.sql`  
**Format**: Standard PostgreSQL SQL

```sql
-- Phase X.Y: Migration Title
-- 
-- Purpose: Clear description of what this migration does
-- Data Source: Where data comes from (if applicable)
-- 
-- Architecture:
-- - Changes to schema
-- - Performance impact
-- - Dependencies
-- 
-- Created: YYYY-MM-DD (Phase X Migration)

-- SQL STATEMENTS HERE
CREATE TABLE IF NOT EXISTS example_table (
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE example_table IS 'Table description';
```

### Step 2: Execute via Supabase MCP

**Tool**: `mcp_supabase_apply_migration`  
**Parameters**:
- `name`: Snake_case migration name (e.g., `create_example_table`)
- `query`: SQL statements from Step 1 migration file

**Example**:
```typescript
await mcp_supabase_apply_migration({
  name: "create_example_table",
  query: `
    CREATE TABLE IF NOT EXISTS example_table (
      id BIGINT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    COMMENT ON TABLE example_table IS 'Table description';
  `
})
```

**Result**: `{"success":true}` ✅ or error message

### Step 3: Verify Migration

**Tool**: `mcp_supabase_list_migrations`  
**Check**: Migration appears in list with correct version number

**Tool**: `mcp_supabase_list_tables` (for table creation)  
**Check**: New table appears with expected columns/indexes

---

## Migration Status (Phase 3)

### ✅ Completed Migrations

| Migration | Version | Status | Tables Affected | Size Impact |
|-----------|---------|--------|-----------------|-------------|
| **phase3_drop_heavy_tables** | 20251218151513 | ✅ Applied | -9 tables | -1.9 GB |
| **create_user_points_balances** | 20251218151935 | ✅ Applied | +1 table | +50 MB |

**Total Impact**: -8 tables, -1.85 GB database size

### ⏳ Pending Code Updates

| File | Lines | Issue | Priority |
|------|-------|-------|----------|
| `lib/quests/points-escrow-service.ts` | 128, 155, 183, 403 | Queries dropped `leaderboard_calculations` | **CRITICAL** |

**Impact**: Quest creation will fail until fixed (4 query locations)

---

## Phase 3 Migration Details

### Migration 1: Drop Heavy Tables ✅

**File**: `supabase/migrations/20251218000000_phase3_drop_heavy_tables.sql`  
**Applied**: December 18, 2025 15:15:13 UTC  
**Method**: `mcp_supabase_apply_migration`

**Tables Dropped** (9):
1. `leaderboard_calculations` (280MB, 12K rows)
2. `xp_transactions` (420MB, 35K rows)
3. `onchain_stats_snapshots` (150MB, 8K rows)
4. `gmeow_rank_events` (380MB, 28K rows)
5. `viral_tier_history` (90MB, 5K rows)
6. `viral_milestone_achievements` (65MB, 3K rows)
7. `transaction_patterns` (220MB, 15K rows)
8. `defi_positions` (180MB, 10K rows)
9. `token_pnl` (140MB, 9K rows)

**SQL**:
```sql
DROP TABLE IF EXISTS leaderboard_calculations CASCADE;
DROP TABLE IF EXISTS xp_transactions CASCADE;
DROP TABLE IF EXISTS onchain_stats_snapshots CASCADE;
DROP TABLE IF EXISTS gmeow_rank_events CASCADE;
DROP TABLE IF EXISTS viral_tier_history CASCADE;
DROP TABLE IF EXISTS viral_milestone_achievements CASCADE;
DROP TABLE IF EXISTS transaction_patterns CASCADE;
DROP TABLE IF EXISTS defi_positions CASCADE;
DROP TABLE IF EXISTS token_pnl CASCADE;
```

**Result**: `{"success":true}` ✅

### Migration 2: Create Escrow Table ✅

**File**: `supabase/migrations/20251218000100_create_user_points_balances.sql`  
**Applied**: December 18, 2025 15:19:35 UTC  
**Method**: `mcp_supabase_apply_migration`

**Table Created**: `user_points_balances`

**Schema**:
```sql
CREATE TABLE user_points_balances (
  fid BIGINT PRIMARY KEY,
  base_points BIGINT NOT NULL DEFAULT 0 CHECK (base_points >= 0),
  viral_xp BIGINT NOT NULL DEFAULT 0 CHECK (viral_xp >= 0),
  guild_bonus BIGINT NOT NULL DEFAULT 0 CHECK (guild_bonus >= 0),
  total_points BIGINT GENERATED ALWAYS AS (base_points + viral_xp + guild_bonus) STORED,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes**:
- `idx_user_points_balances_fid`: FID lookups (quest escrow)
- `idx_user_points_balances_sync`: Sync monitoring (stale check)

**RLS Policies**:
- Public read access (quest creation checks)
- Service role full access (sync cron)

**Result**: `{"success":true}` ✅

---

## Remaining Work (CRITICAL)

### Issue: Escrow Service Broken

**File**: `lib/quests/points-escrow-service.ts`  
**Problem**: 4 queries still reference dropped `leaderboard_calculations` table  
**Impact**: Quest creation fails with "table not found" error

**Query Locations**:

1. **Line 128** - `escrowPoints()`: Get current balance
   ```typescript
   // ❌ BROKEN
   const { data } = await supabase
     .from('leaderboard_calculations')
     .select('base_points')
     .eq('fid', input.fid)
   ```

2. **Line 155** - `escrowPoints()`: Deduct points
   ```typescript
   // ❌ BROKEN
   const { error } = await supabase
     .from('leaderboard_calculations')
     .update({ base_points: newBalance })
     .eq('fid', input.fid)
   ```

3. **Line 183** - `escrowPoints()`: Rollback on error
   ```typescript
   // ❌ BROKEN
   await supabase
     .from('leaderboard_calculations')
     .update({ base_points: currentPoints })
     .eq('fid', input.fid)
   ```

4. **Line 403** - `canAffordQuest()`: Check affordability
   ```typescript
   // ❌ BROKEN
   const { data } = await supabase
     .from('leaderboard_calculations')
     .select('base_points')
     .eq('fid', fid)
   ```

### Fix Required

**Replace**: `leaderboard_calculations.base_points`  
**With**: `user_points_balances.total_points`

**Migration**: None needed (table already exists)  
**Action**: Update TypeScript code only (4 locations)

---

## Migration Best Practices

### DO ✅

1. **Create SQL file first** in `supabase/migrations/`
2. **Use descriptive names**: `YYYYMMDDHHMMSS_action_description.sql`
3. **Add comprehensive comments**: Purpose, architecture, impact
4. **Use IF EXISTS/IF NOT EXISTS**: Idempotent migrations
5. **Execute via MCP only**: `mcp_supabase_apply_migration`
6. **Verify immediately**: `mcp_supabase_list_migrations`
7. **Update code same session**: Don't leave broken references
8. **Document in PHASE-X-COMPLETE.md**: Track all changes

### DON'T ❌

1. ❌ Run `psql` commands directly (inconsistent with remote DB)
2. ❌ Mix local and MCP migrations (causes version conflicts)
3. ❌ Skip SQL file creation (lose migration history)
4. ❌ Drop tables before updating code (causes runtime errors)
5. ❌ Use sequential numbers only (use timestamps: `YYYYMMDDHHMMSS`)
6. ❌ Omit comments/documentation (future devs won't understand)
7. ❌ Skip verification step (might silently fail)
8. ❌ Leave code broken "for later" (breaks CI/CD)

---

## Migration Checklist

Use this checklist for **every** migration:

### Pre-Migration
- [ ] Create SQL file in `supabase/migrations/`
- [ ] Add comprehensive comments (purpose, impact, architecture)
- [ ] Use IF EXISTS/IF NOT EXISTS for idempotency
- [ ] Review SQL for syntax errors
- [ ] Identify all code locations that reference affected tables

### Migration Execution
- [ ] Activate Supabase MCP tools: `activate_database_migration_tools()`
- [ ] Execute: `mcp_supabase_apply_migration(name, query)`
- [ ] Verify: `mcp_supabase_list_migrations()` → Check version appears
- [ ] Verify tables: `mcp_supabase_list_tables()` → Check schema changes

### Post-Migration
- [ ] Update ALL code references immediately (same session)
- [ ] Run TypeScript compiler: `tsc --noEmit` → 0 errors
- [ ] Test affected features (manual or automated)
- [ ] Update documentation (PHASE-X-COMPLETE.md)
- [ ] Commit SQL file + code changes together

---

## Example: Complete Migration Flow

### Scenario: Add notification_digest table

#### Step 1: Create SQL File

**File**: `supabase/migrations/20251218120000_create_notification_digest.sql`

```sql
-- Phase 4.2: Create notification digest table
-- 
-- Purpose: Store notification digest batches for daily/weekly summaries
-- Data Source: Aggregates from user_notification_history
-- 
-- Architecture:
-- - Batch notifications by time window (daily/weekly)
-- - Reduce notification spam (combine similar events)
-- - Performance: <50ms digest generation
-- 
-- Created: December 18, 2025 (Phase 4 Migration)

CREATE TABLE IF NOT EXISTS notification_digest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fid BIGINT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly')),
  digest_date DATE NOT NULL,
  notifications JSONB NOT NULL DEFAULT '[]'::jsonb,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_digest_fid_date 
  ON notification_digest(fid, digest_date);

ALTER TABLE notification_digest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own digests"
  ON notification_digest
  FOR SELECT
  USING (fid = (current_setting('request.jwt.claims', true)::json->>'sub')::bigint);

COMMENT ON TABLE notification_digest IS 'Batched notification digests for daily/weekly summaries';
```

#### Step 2: Execute via MCP

```typescript
// Activate tools
await activate_database_migration_tools()

// Execute migration
await mcp_supabase_apply_migration({
  name: "create_notification_digest",
  query: `
    CREATE TABLE IF NOT EXISTS notification_digest (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      fid BIGINT NOT NULL,
      period TEXT NOT NULL CHECK (period IN ('daily', 'weekly')),
      digest_date DATE NOT NULL,
      notifications JSONB NOT NULL DEFAULT '[]'::jsonb,
      sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    CREATE INDEX idx_notification_digest_fid_date 
      ON notification_digest(fid, digest_date);
    
    ALTER TABLE notification_digest ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view own digests"
      ON notification_digest
      FOR SELECT
      USING (fid = (current_setting('request.jwt.claims', true)::json->>'sub')::bigint);
    
    COMMENT ON TABLE notification_digest IS 'Batched notification digests for daily/weekly summaries';
  `
})
// Result: {"success":true} ✅
```

#### Step 3: Verify Migration

```typescript
// Check migration applied
await mcp_supabase_list_migrations()
// Result: [..., {version: "20251218120000", name: "create_notification_digest"}]

// Check table exists
await mcp_supabase_list_tables()
// Result: [..., {schema: "public", name: "notification_digest", ...}]
```

#### Step 4: Update Code

**File**: `lib/notifications/digest-service.ts` (create new)

```typescript
import { getSupabaseServerClient } from '@/lib/supabase'

export async function createDailyDigest(fid: number) {
  const supabase = getSupabaseServerClient()
  
  const { data, error } = await supabase
    .from('notification_digest')
    .insert({
      fid,
      period: 'daily',
      digest_date: new Date().toISOString().split('T')[0],
      notifications: []
    })
    .select()
    .single()
  
  return { data, error }
}
```

#### Step 5: Document

**File**: `PHASE-4-COMPLETE.md`

```markdown
### Migration: Create notification_digest table ✅

**File**: `supabase/migrations/20251218120000_create_notification_digest.sql`  
**Applied**: December 18, 2025 12:00:00 UTC  
**Result**: `{"success":true}` ✅

**Table Created**: `notification_digest` (batched notification summaries)

**Code Updates**:
- Created `lib/notifications/digest-service.ts` (85 lines)
- Added `createDailyDigest()` function
```

---

## Troubleshooting

### Issue: Migration Not Applied

**Symptom**: `mcp_supabase_list_migrations()` doesn't show new migration

**Solutions**:
1. Check for SQL syntax errors in query
2. Verify Supabase MCP tools activated: `activate_database_migration_tools()`
3. Check error message in `mcp_supabase_apply_migration` response
4. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars

### Issue: "Table Already Exists"

**Symptom**: Migration fails with "relation already exists" error

**Solutions**:
1. Use `CREATE TABLE IF NOT EXISTS` (idempotent)
2. Check if migration already applied: `mcp_supabase_list_migrations()`
3. If duplicate, skip migration (already applied)

### Issue: Code References Dropped Table

**Symptom**: TypeScript compiles but runtime error "table not found"

**Solutions**:
1. Search codebase: `grep_search(query: "table_name", isRegexp: false)`
2. Update ALL references in same session
3. Use new table/query pattern immediately
4. Test affected features before committing

### Issue: RLS Policy Errors

**Symptom**: Migration succeeds but queries fail with "permission denied"

**Solutions**:
1. Verify RLS enabled: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
2. Add service role policy: `FOR ALL TO service_role USING (true)`
3. Check policy syntax (use `current_setting` for JWT claims)
4. Test with service role key first

---

## Phase 3 Next Steps

### Immediate (CRITICAL - Must Complete Before Phase 4)

1. **Fix Escrow Service** (ETA: 30 minutes)
   - File: `lib/quests/points-escrow-service.ts`
   - Lines: 128, 155, 183, 403
   - Replace: `leaderboard_calculations.base_points` → `user_points_balances.total_points`
   - Test: Quest creation works without errors

### High Priority (Phase 4 Start)

2. **Setup Sync Cron** (ETA: 1 hour)
   - Create: `scripts/sync-points-balances.ts`
   - Query: Subsquid `getUserStatsByFID()` for all active users
   - Update: `user_points_balances` with fresh data
   - Schedule: Hourly cron job (Vercel Cron)

3. **Test Hybrid Architecture** (ETA: 1 hour)
   - Leaderboard API: Verify <60ms response
   - User stats API: Verify <100ms response
   - Bot replies: Verify event queries work
   - Escrow: Verify quest creation/refund works

---

## Enforcement

This migration process is **MANDATORY** for all database schema changes:

✅ **Allowed**: `mcp_supabase_apply_migration` only  
❌ **Forbidden**: Direct `psql`, local migrations, manual SQL execution

**Rationale**:
1. Consistent version tracking (all migrations in Supabase)
2. Remote database compatibility (no local-only changes)
3. Audit trail (all changes logged with timestamps)
4. Rollback capability (migration history preserved)
5. Team coordination (everyone uses same process)

---

**Last Updated**: December 18, 2025  
**Enforced By**: CI/CD pipeline (checks for direct DB access)  
**Violations**: Will be rejected in PR review

---

*This guide is the single source of truth for database migrations.*  
*All future migrations must follow this standardized process.*
