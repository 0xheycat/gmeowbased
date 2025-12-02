# Workflow & Supabase Updates - Implementation Summary

**Date**: November 30, 2025  
**Status**: ✅ All 4 Tasks Complete

---

## ✅ Task 1: Fix GitHub Workflow Variable Contexts

### Changes Made

**File**: `.github/workflows/supabase-leaderboard-sync.yml`

- Moved configuration variables from `secrets` to `vars` context
- Added default fallback values for all variables
- Variables with defaults (will work even if not set in GitHub):
  - `SUPABASE_LEADERBOARD_TABLE` → `leaderboard_snapshots`
  - `SUPABASE_LEADERBOARD_VIEW_CURRENT` → `leaderboard_current`
  - `SUPABASE_LEADERBOARD_SEASON_KEY` → `all`
  - `SUPABASE_TIMEOUT_MS` → `10000`
  - `SUPABASE_MAX_RETRIES` → `3`
  - `CHAIN_START_BLOCK` → `14000000`
  - `CHAIN_START_BLOCK_BASE` → `14000000`
  - `CHAIN_START_BLOCK_OP` → `110000000`
  - `CHAIN_START_BLOCK_CELO` → `24000000`
  - `CHAIN_START_BLOCK_UNICHAIN` → `1`
  - `CHAIN_START_BLOCK_INK` → `1`

### Benefits
- ✅ Workflow will run successfully even without GitHub Variables configured
- ✅ Non-sensitive config values properly separated from secrets
- ✅ Clear distinction between authentication (secrets) and configuration (vars)

---

## ✅ Task 2: Create Viral Metrics Workflow

### New Files Created

#### 1. **Script**: `scripts/automation/sync-viral-metrics.ts` (400+ lines)

**Features**:
- Fetches cast engagement metrics from Neynar API
- Calculates viral score: `(recasts × 10) + (replies × 5) + (likes × 2)`
- Determines viral tier:
  - `none`: 0-9 score
  - `active`: 10-49 score (+10 XP)
  - `engaging`: 50-99 score (+25 XP)
  - `popular`: 100-249 score (+50 XP)
  - `viral`: 250-499 score (+100 XP)
  - `mega_viral`: 500+ score (+250 XP)
- Awards bonus XP for tier upgrades
- Logs XP transactions with metadata
- Supports `--dry-run` flag for testing
- Rate limiting protection (100ms between requests)
- Updates only casts older than 6 hours

**Usage**:
```bash
# Dry run (test mode)
pnpm tsx scripts/automation/sync-viral-metrics.ts --dry-run

# Production run
pnpm tsx scripts/automation/sync-viral-metrics.ts
```

#### 2. **Workflow**: `.github/workflows/viral-metrics-sync.yml`

**Schedule**: Every 6 hours (`0 */6 * * *`)

**Environment Variables**:
- `SUPABASE_URL` (secret)
- `SUPABASE_SERVICE_ROLE_KEY` (secret)
- `NEYNAR_API_KEY` (secret)

**Timeout**: 30 minutes

### Impact
- ✅ Automatically tracks badge share engagement
- ✅ Awards bonus XP for viral performance
- ✅ Maintains viral tier history for analytics
- ✅ Reduces manual tracking overhead

---

## ✅ Task 3: Set Up pg_cron Jobs for Automated Cleanup

### New Migration: `20251130000001_setup_pg_cron_jobs.sql`

**Created Functions**:

1. **cleanup_old_notifications()**
   - Deletes notification history older than 90 days
   - Returns count of deleted rows
   - Scheduled: Weekly on Sunday at 2 AM UTC

2. **cleanup_expired_frame_sessions()**
   - Deletes frame sessions older than 24 hours
   - Returns count of deleted rows
   - Scheduled: Daily at 4 AM UTC

3. **expire_old_quests()**
   - Marks expired user quests as `expired` status
   - Returns count of expired quests
   - Scheduled: Daily at 3 AM UTC

**Additional Schema Update**:
- Added `metadata JSONB` column to `xp_transactions` table
- Created GIN index on metadata for efficient JSON queries

**pg_cron Schedule**:
```
cleanup-old-notifications       | 0 2 * * 0  | Weekly (Sunday 2 AM UTC)
cleanup-expired-frame-sessions  | 0 4 * * *  | Daily (4 AM UTC)
expire-old-quests              | 0 3 * * *  | Daily (3 AM UTC)
```

### Verification Commands

```sql
-- List all scheduled jobs
SELECT * FROM cron.job ORDER BY jobname;

-- Check job run history
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;

-- Test functions manually
SELECT cleanup_old_notifications();
SELECT cleanup_expired_frame_sessions();
SELECT expire_old_quests();
```

### Benefits
- ✅ Automated database maintenance (no manual intervention)
- ✅ Prevents database bloat from old records
- ✅ Maintains data hygiene automatically
- ✅ Reduces storage costs

---

## ✅ Task 4: Enable RLS on Sensitive Tables

### New Migration: `20251130000002_enable_rls_policies.sql`

**Tables with RLS Enabled**:

1. **viral_milestone_achievements**
   - Users can view own achievements
   - Authenticated users can view all (for leaderboards)
   - Service role has full access

2. **viral_tier_history**
   - Users can view own tier history
   - Authenticated users can view all (for analytics)
   - Service role has full access

3. **user_badges**
   - Users can view/update own badges
   - Authenticated users can view all (for profiles)
   - Service role has full access

4. **mint_queue**
   - Users can view/insert own mint requests
   - Service role has full access (for automation)

5. **frame_sessions**
   - Users can CRUD own sessions
   - Anon users can create/update sessions (for unauthenticated frames)
   - Service role has full access (for cleanup automation)

### RLS Policy Patterns

**User-specific policies**:
```sql
USING (
  fid = (current_setting('request.jwt.claims', true)::json->>'fid')::bigint
)
```

**Public read policies**:
```sql
FOR SELECT
TO authenticated
USING (true)
```

**Service role override**:
```sql
FOR ALL
TO service_role
USING (true)
WITH CHECK (true)
```

### Verification

```sql
-- Check RLS is enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename IN (
  'viral_milestone_achievements',
  'viral_tier_history', 
  'user_badges',
  'mint_queue',
  'frame_sessions'
);

-- Expected result: rowsecurity = true for all
```

### Benefits
- ✅ Data security at database level
- ✅ Users can only access their own sensitive data
- ✅ Public data still accessible for leaderboards/profiles
- ✅ Automation scripts unaffected (service role bypass)

---

## 📄 Additional Documentation

### Created Files:

1. **WORKFLOW-SUPABASE-AUDIT.md**
   - Complete audit of current state
   - Missing workflows identified
   - Recommended implementation priority
   - Status tracking (40% workflows, 100% tables, 50% Edge Functions)

2. **GITHUB-WORKFLOW-SETUP.md**
   - Step-by-step GitHub configuration guide
   - Required secrets and variables
   - Workflow overview
   - Testing procedures
   - Troubleshooting tips
   - Migration deployment instructions

---

## 🚀 Deployment Checklist

### 1. GitHub Configuration

```bash
# Add required Secrets (Repository Settings > Secrets and variables > Actions > Secrets):
✅ SUPABASE_URL
✅ SUPABASE_SERVICE_ROLE_KEY
✅ SUPABASE_ANON_KEY
✅ NEYNAR_API_KEY
✅ RPC_BASE, RPC_OP, RPC_CELO, RPC_UNICHAIN, RPC_INK
✅ ORACLE_PRIVATE_KEY

# Add optional Variables (Repository Settings > Secrets and variables > Actions > Variables):
# These have defaults but can be customized:
⚪ SUPABASE_LEADERBOARD_TABLE (default: leaderboard_snapshots)
⚪ SUPABASE_LEADERBOARD_VIEW_CURRENT (default: leaderboard_current)
⚪ SUPABASE_LEADERBOARD_SEASON_KEY (default: all)
⚪ SUPABASE_TIMEOUT_MS (default: 10000)
⚪ SUPABASE_MAX_RETRIES (default: 3)
⚪ CHAIN_START_BLOCK_* (defaults provided for all chains)
```

### 2. Supabase Migrations

```bash
# Deploy new migrations
supabase db push

# Or via Supabase Dashboard:
# Database > Migrations > Upload:
# - 20251130000001_setup_pg_cron_jobs.sql
# - 20251130000002_enable_rls_policies.sql
```

### 3. Verify pg_cron Jobs

```sql
-- Connect to Supabase SQL Editor
SELECT * FROM cron.job ORDER BY jobname;

-- Expected: 3 jobs scheduled
```

### 4. Test Workflows

```bash
# Test viral metrics locally (dry run)
pnpm tsx scripts/automation/sync-viral-metrics.ts --dry-run

# Manually trigger workflow on GitHub
# Go to Actions > Viral Metrics Sync > Run workflow
```

### 5. Monitor First Runs

- ✅ Check GitHub Actions logs for errors
- ✅ Verify badge_casts table is being updated
- ✅ Check xp_transactions for tier upgrade records
- ✅ Confirm pg_cron jobs execute at scheduled times

---

## 📊 Impact Summary

### Before
- ❌ No automated viral engagement tracking
- ❌ Manual XP awards required
- ❌ No automated database cleanup
- ❌ 5 tables without RLS (security risk)
- ❌ Configuration values in wrong GitHub context

### After
- ✅ Automated viral metrics sync every 6 hours
- ✅ Automatic bonus XP for viral performance
- ✅ 3 pg_cron jobs for automated cleanup
- ✅ All sensitive tables protected with RLS
- ✅ Proper separation of secrets vs variables
- ✅ Comprehensive documentation for team

### New Capabilities
1. **Viral Engagement Tracking**: Badge shares now automatically tracked and rewarded
2. **Automated Maintenance**: Database cleanup runs automatically without manual intervention
3. **Enhanced Security**: RLS policies protect user data at database level
4. **Better Configuration**: GitHub workflows properly use vars with defaults
5. **Rich Analytics**: XP transactions now include metadata for deeper insights

---

## 🔜 Next Steps (Optional)

### Additional Workflows (See WORKFLOW-SUPABASE-AUDIT.md)

1. **Quest Expiration Cleanup** - Mark expired quests (scheduled via pg_cron ✅)
2. **Leaderboard Achievement Check** - Award badges for rank milestones
3. **Mint Queue Error Retry** - Retry failed mints with exponential backoff
4. **Frame Session Cleanup** - Clean old sessions (scheduled via pg_cron ✅)

### Additional Edge Functions

1. **Viral Metrics Updater** - Real-time webhook for instant updates
2. **Quest Completion Webhook** - External service integration
3. **Notification Sender** - Centralized push notification service

### Database Optimizations

```sql
-- Add performance indexes (optional)
CREATE INDEX IF NOT EXISTS idx_badge_casts_viral_tier 
  ON badge_casts(viral_tier, viral_score DESC);

CREATE INDEX IF NOT EXISTS idx_user_quests_expires 
  ON user_quests(expires_at) 
  WHERE status IN ('available', 'in_progress');
```

---

## 📝 Files Modified/Created

### Modified Files
1. `.github/workflows/supabase-leaderboard-sync.yml` - Fixed variable contexts

### New Files
1. `scripts/automation/sync-viral-metrics.ts` - Viral engagement sync script
2. `.github/workflows/viral-metrics-sync.yml` - Viral metrics workflow
3. `supabase/migrations/20251130000001_setup_pg_cron_jobs.sql` - Automated cleanup jobs
4. `supabase/migrations/20251130000002_enable_rls_policies.sql` - RLS security policies
5. `WORKFLOW-SUPABASE-AUDIT.md` - Complete infrastructure audit
6. `GITHUB-WORKFLOW-SETUP.md` - Configuration guide
7. `WORKFLOW-IMPLEMENTATION-SUMMARY.md` - This file

---

## ✅ Completion Confirmation

All 4 requested tasks completed successfully:

1. ✅ **Fixed GitHub workflow variable contexts** - Proper separation of secrets/vars with defaults
2. ✅ **Created viral metrics workflow** - Automated engagement tracking every 6 hours
3. ✅ **Set up pg_cron jobs** - 3 automated cleanup jobs scheduled
4. ✅ **Enabled RLS on sensitive tables** - 5 tables secured with proper policies

**Total Impact**:
- 1 workflow modified
- 1 workflow created
- 1 automation script created (400+ lines)
- 2 SQL migrations created
- 3 documentation files created
- 5 tables secured with RLS
- 3 pg_cron jobs scheduled
- 1 schema enhancement (xp_transactions metadata)

🎉 **All changes ready for deployment!**
