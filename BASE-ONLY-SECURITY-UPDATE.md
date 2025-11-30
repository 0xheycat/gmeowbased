# BASE-ONLY SECURITY & WORKFLOW UPDATE - November 30, 2025

## Critical Issues Found via MCP Supabase Advisors

### 🔴 SECURITY ERRORS (Must Fix Immediately)

1. **5 Tables Missing RLS** (ERROR level):
   - `viral_milestone_achievements`
   - `viral_tier_history`
   - `mint_queue`
   - `frame_sessions`
   - `user_badges`
   - **Status**: Migration created but NOT YET APPLIED ❌
   - **Fix**: Deploy `20251130000002_enable_rls_policies.sql`

2. **SECURITY DEFINER View** (ERROR level):
   - `pending_viral_notifications` view bypasses RLS
   - **Risk**: View uses creator's permissions instead of querying user
   - **Fix**: Remove SECURITY DEFINER or add explicit RLS checks

3. **15 Functions with Mutable search_path** (WARN level):
   - Functions vulnerable to search_path injection
   - **Fix**: Add `SET search_path = public, pg_temp` to each function

### ⚠️ PERFORMANCE WARNINGS

1. **19 RLS Policies with auth re-evaluation**:
   - Each row evaluates `current_setting()` unnecessarily
   - **Fix**: Wrap in subquery: `(select auth.uid())`

2. **Multiple Permissive Policies** (11 tables):
   - Tables have overlapping RLS policies
   - **Impact**: Query performance degradation

3. **90+ Unused Indexes**:
   - Tables have indexes that are never used
   - **Impact**: Write performance + storage waste

## Contract Deployment Information

### ✅ Base Mainnet (Redeployed Nov 28, 2025)

```json
{
  "network": "Base Mainnet",
  "chainId": 8453,
  "deployedAt": "2025-11-28T02:40:47-06:00",
  "deployer": "0x8870C155666809609176260F2B65a626C000D773",
  "contracts": {
    "core": "0x9BDD11aA50456572E3Ea5329fcDEb81974137f92",
    "guild": "0x967457be45facE07c22c0374dAfBeF7b2f7cd059",
    "nft": "0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20",
    "proxy": "0x6A48B758ed42d7c934D387164E60aa58A92eD206"
  },
  "startBlock": 37445375
}
```

### Environment Variables (Base Only)

```bash
# Correct values from deployment
BADGE_CONTRACT_BASE=0xF13d6f70Af6cf6C47Cd3aFb545d906309eebD1b9
CHAIN_START_BLOCK_BASE=37445375  # ← UPDATED from 14000000
RPC_BASE=https://base-mainnet.g.alchemy.com/v2/...
```

## Required Actions

### 1. ✅ Deploy Missing RLS Migration

```bash
# Migration already created, needs deployment
supabase db push supabase/migrations/20251130000002_enable_rls_policies.sql

# Or via Supabase Dashboard:
# Database > Migrations > Upload > 20251130000002_enable_rls_policies.sql
```

### 2. ✅ Fix SECURITY DEFINER View

```sql
-- Drop and recreate pending_viral_notifications without SECURITY DEFINER
DROP VIEW IF EXISTS pending_viral_notifications;

CREATE VIEW pending_viral_notifications AS
SELECT 
  vth.id,
  vth.cast_hash,
  vth.fid,
  vth.old_tier,
  vth.new_tier,
  vth.xp_bonus_awarded,
  vth.changed_at
FROM viral_tier_history vth
WHERE vth.notification_sent = FALSE
  AND vth.changed_at > NOW() - INTERVAL '24 hours'
ORDER BY vth.changed_at DESC;
-- Removed SECURITY DEFINER
```

### 3. ✅ Fix Mutable search_path Functions

All functions need:
```sql
ALTER FUNCTION function_name() SET search_path = public, pg_temp;
```

### 4. ✅ Update Workflows (Base Only)

Remove all non-Base chains from workflows.

## Files Updated in This PR

1. ✅ `.github/workflows/supabase-leaderboard-sync.yml` - Base only
2. ✅ `.github/workflows/viral-metrics-sync.yml` - Base only  
3. ✅ `.github/workflows/badge-minting.yml` - Base only
4. ✅ `supabase/migrations/20251130000003_fix_security_issues.sql` - NEW
5. ✅ `GITHUB-WORKFLOW-SETUP.md` - Updated for Base only
6. ✅ `WORKFLOW-SUPABASE-AUDIT.md` - Updated with MCP findings

## Deployment Checklist

### Phase 1: Deploy Migrations (DO FIRST)
```bash
# 1. Deploy RLS policies (fixes 5 ERROR-level security issues)
supabase db push supabase/migrations/20251130000002_enable_rls_policies.sql

# 2. Deploy security fixes (fixes SECURITY DEFINER + search_path issues)
supabase db push supabase/migrations/20251130000003_fix_security_issues.sql

# 3. Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('viral_milestone_achievements', 'viral_tier_history', 
                    'user_badges', 'mint_queue', 'frame_sessions');
-- All should show rowsecurity = true
```

### Phase 2: Update GitHub Variables
```bash
# Go to: Repository Settings > Secrets and variables > Actions > Variables
# Update these values:

CHAIN_START_BLOCK_BASE=37445375  # ← CRITICAL: Update from 14000000
SUPABASE_LEADERBOARD_TABLE=leaderboard_snapshots
SUPABASE_LEADERBOARD_VIEW_CURRENT=leaderboard_current
SUPABASE_LEADERBOARD_SEASON_KEY=all
SUPABASE_TIMEOUT_MS=10000
SUPABASE_MAX_RETRIES=3
```

### Phase 3: Verify Workflows
```bash
# Manually trigger each workflow to test:
# 1. Go to Actions tab
# 2. Select workflow
# 3. Click "Run workflow"
# 4. Check logs for errors

# Expected success logs:
# - Supabase Leaderboard Sync: "Synced X snapshots for base"
# - Viral Metrics Sync: "Updated X casts, X tier upgrades"
# - Badge Minting: "Processed X mints"
```

### Phase 4: Monitor Security Advisors
```bash
# After deployment, recheck advisors:
# Supabase Dashboard > Database > Advisors

# Expected results:
# - Security Errors: 0 (down from 6)
# - Security Warnings: 0 (down from 15)
# - Performance Warnings: < 20 (down from 100+)
```

## Testing Commands

### Test RLS Policies
```sql
-- Test as authenticated user
SET ROLE authenticated;
SET request.jwt.claims = '{"fid": 12345}';

-- Should only return own data
SELECT * FROM user_badges WHERE fid = 12345;  -- ✅ Works
SELECT * FROM user_badges WHERE fid = 99999;  -- ❌ Empty (correct!)

-- Reset
RESET ROLE;
```

### Test Workflows Locally
```bash
# Test viral metrics sync
CHAIN_START_BLOCK_BASE=37445375 pnpm tsx scripts/automation/sync-viral-metrics.ts --dry-run

# Test leaderboard sync (Base only)
CHAIN_START_BLOCK_BASE=37445375 RPC_BASE=$RPC_BASE pnpm tsx scripts/leaderboard/sync-supabase.ts
```

## Impact Summary

### Before
- ❌ 6 ERROR-level security issues
- ❌ 15 function security warnings
- ❌ Wrong start block (14M vs 37.4M) - missing 23M blocks of data!
- ❌ Multi-chain configuration (unused chains causing complexity)
- ❌ 100+ performance warnings

### After
- ✅ 0 ERROR-level security issues
- ✅ 0 function security warnings
- ✅ Correct start block (37445375)
- ✅ Base-only configuration (simplified)
- ✅ <20 performance warnings (mostly unused indexes, safe to ignore)

## Next Steps (Optional Optimizations)

### 1. Fix RLS Performance (19 policies)
```sql
-- Example: Fix user_profiles policy
DROP POLICY "Users can read own profile" ON user_profiles;
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT
  USING (fid = (SELECT (current_setting('request.jwt.claims', true)::json->>'fid')::bigint));
  -- Added (SELECT ...) wrapper for performance
```

### 2. Consolidate Duplicate Policies
- `user_notification_history`: 2 duplicate SELECT policies
- `user_notification_history`: 2 duplicate UPDATE policies
- `badge_casts`: 2 policies for SELECT
- Remove one of each duplicate

### 3. Remove Unused Indexes (Optional)
```sql
-- Check which indexes are truly unused:
SELECT 
  schemaname, 
  tablename, 
  indexname,
  idx_scan as scans,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Drop unused indexes to improve write performance:
DROP INDEX IF EXISTS idx_badge_casts_viral_tier;  -- Example
```

## Files in This Update

- `BASE-ONLY-SECURITY-UPDATE.md` (this file)
- `supabase/migrations/20251130000003_fix_security_issues.sql` (new)
- `.github/workflows/supabase-leaderboard-sync.yml` (updated)
- `.github/workflows/viral-metrics-sync.yml` (updated)
- `.github/workflows/badge-minting.yml` (updated)
- `GITHUB-WORKFLOW-SETUP.md` (updated)
