# Workflow & Supabase Audit - November 30, 2025

## Current GitHub Workflows

### 1. ✅ Supabase Leaderboard Sync (`supabase-leaderboard-sync.yml`)
- **Schedule**: Daily at midnight UTC
- **Script**: `scripts/leaderboard/sync-supabase.ts`
- **Status**: ✅ Active
- **Function**: Syncs leaderboard snapshots to Supabase
- **Missing Context Variables**:
  - ❌ `SUPABASE_LEADERBOARD_TABLE` (should be in secrets, not vars)
  - ❌ `SUPABASE_LEADERBOARD_VIEW_CURRENT` (should be in secrets)
  - ❌ `SUPABASE_LEADERBOARD_SEASON_KEY` (move to vars)
  - ❌ `SUPABASE_TIMEOUT_MS` (move to vars)
  - ❌ `SUPABASE_MAX_RETRIES` (move to vars)
  - ❌ `CHAIN_START_BLOCK_*` variables (move to vars)

### 2. ✅ Badge Minting (`badge-minting.yml`)
- **Schedule**: Daily at 1 AM UTC (after leaderboard sync)
- **Script**: `scripts/automation/mint-badge-queue.ts`
- **Status**: ✅ Active
- **Function**: Processes badge minting queue from Supabase
- **Issues**: 
  - ⚠️ Script has commented-out main() function (relying on serverless invocation pattern)
  - ✅ Has all required env vars

### 3. ✅ GM Reminders (`gm-reminders.yml`)
- **Schedule**: 
  - 9 AM UTC (afternoon Asia, morning Europe)
  - 9 PM UTC (afternoon Americas, evening Europe)
- **Script**: `scripts/automation/send-gm-reminders.ts`
- **Status**: ✅ Active
- **Function**: Push notifications to users who haven't GM'd today
- **Issues**: ✅ All env vars configured

### 4. ✅ Warmup Frame Functions (`warmup-frames.yml`)
- **Schedule**: 
  - Every 10 minutes (6am-10pm UTC)
  - Every 30 minutes (10pm-6am UTC)
- **Status**: ✅ Active
- **Function**: Prevents cold starts for serverless frame functions
- **Coverage**:
  - ✅ All 5 tier types (Mythic, Legendary, Epic, Rare, Common)
  - ✅ Frame types: gm, onchainstats, badge, quest, leaderboards

---

## Supabase Tables (23 total)

### ✅ Core Tables
1. **user_profiles** (9 rows) - User identity + onboarding
2. **leaderboard_snapshots** (2 rows) - Cached leaderboard data
3. **user_notification_history** (2 rows) - NEW! Notification history
4. **miniapp_notification_tokens** (0 rows) - Push notification tokens

### ✅ Quest System
5. **quest_definitions** (10 rows) - Quest templates
6. **user_quests** (0 rows) - User quest progress
7. **unified_quests** (0 rows) - User-generated quests
8. **quest_completions** (0 rows) - Quest completion records
9. **quest_creator_earnings** (0 rows) - Creator earnings tracking

### ✅ Badge & NFT System
10. **user_badges** (3 rows) - Badge assignments
11. **mint_queue** (7 rows) - NFT minting queue
12. **badge_templates** (5 rows) - Badge definitions
13. **badge_casts** (0 rows) - Badge share tracking
14. **nft_metadata** (5 rows) - NFT type registry

### ✅ Viral Tracking
15. **viral_share_events** (0 rows) - Share event tracking
16. **viral_milestone_achievements** (0 rows) - Milestone tracking
17. **viral_tier_history** (0 rows) - Tier change log
18. **xp_transactions** (0 rows) - XP audit trail

### ✅ Utility Tables
19. **gmeow_rank_events** (33 rows) - Rank diff events
20. **partner_snapshots** (5 rows) - Partner eligibility
21. **frame_sessions** (4 rows) - Frame state management
22. **maintenance_tasks** (58 rows) - Task tracking
23. **testimonials** (3 rows) - User testimonials

---

## Supabase Edge Functions (3 total)

1. ✅ **create_miniapp_notification_tokens** (v3) - Creates notification tokens
2. ✅ **miniapp_notification_tokens** (v1) - Manages notification tokens
3. ✅ **gmeow_badge_adventure** (v2) - Badge adventure logic

---

## Missing Workflows

### 🆕 1. Viral Badge Metrics Sync
**Purpose**: Update viral engagement metrics for badge shares
**Schedule**: Every 6 hours
**Script**: `scripts/automation/sync-viral-metrics.ts` (MISSING)
**Tables**: `badge_casts`, `viral_tier_history`, `xp_transactions`
**Actions**:
- Fetch engagement metrics from Neynar Cast API
- Calculate viral_score = (recasts × 10) + (replies × 5) + (likes × 2)
- Determine viral_tier (none/active/engaging/popular/viral/mega_viral)
- Award bonus XP for tier upgrades
- Update viral_tier_history table

### 🆕 2. Quest Expiration Cleanup
**Purpose**: Clean up expired quests and mark as expired
**Schedule**: Daily at 3 AM UTC
**Script**: `scripts/automation/expire-quests.ts` (MISSING)
**Tables**: `user_quests`, `unified_quests`
**Actions**:
- Mark expired user quests as 'expired' status
- Deactivate unified quests past end_date
- Send expiration notifications

### 🆕 3. Notification History Cleanup
**Purpose**: Clean up old notification history (90+ days)
**Schedule**: Weekly on Sunday at 2 AM UTC
**Script**: Already in SQL function `cleanup_old_notifications()`
**Tables**: `user_notification_history`
**Actions**:
- Delete notifications older than 90 days
- Log cleanup results

### 🆕 4. Leaderboard Achievement Check
**Purpose**: Check for leaderboard rank achievements (top 10, top 100, etc.)
**Schedule**: Daily at 1:30 AM UTC (after leaderboard sync)
**Script**: `scripts/automation/check-leaderboard-achievements.ts` (MISSING)
**Tables**: `leaderboard_snapshots`, `user_badges`, `user_notification_history`
**Actions**:
- Check for rank milestones (top 1, top 10, top 100, top 1000)
- Award achievement badges
- Send notifications

### 🆕 5. Mint Queue Error Retry
**Purpose**: Retry failed mints with exponential backoff
**Schedule**: Every 4 hours
**Script**: `scripts/automation/retry-failed-mints.ts` (MISSING)
**Tables**: `mint_queue`
**Actions**:
- Query failed mints with retry_count < 3
- Retry with exponential backoff
- Update error messages

### 🆕 6. Frame Session Cleanup
**Purpose**: Clean up old frame sessions (1 day+)
**Schedule**: Daily at 4 AM UTC
**Script**: `scripts/automation/cleanup-frame-sessions.ts` (MISSING)
**Tables**: `frame_sessions`
**Actions**:
- Delete sessions older than 24 hours
- Keep state size under control

---

## Missing Supabase Setup

### 🆕 1. pg_cron Jobs
Currently have extension installed but no scheduled jobs. Need to set up:

```sql
-- Notification cleanup (weekly)
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 2 * * 0',  -- Sunday 2 AM UTC
  'SELECT cleanup_old_notifications()'
);

-- Frame session cleanup (daily)
SELECT cron.schedule(
  'cleanup-old-frame-sessions',
  '0 4 * * *',  -- Daily 4 AM UTC
  'DELETE FROM frame_sessions WHERE updated_at < NOW() - INTERVAL ''1 day'''
);

-- Quest expiration (daily)
SELECT cron.schedule(
  'expire-old-quests',
  '0 3 * * *',  -- Daily 3 AM UTC
  $$
    UPDATE user_quests 
    SET status = 'expired' 
    WHERE status IN ('available', 'in_progress') 
      AND expires_at < NOW()
  $$
);
```

### 🆕 2. Database Indexes
Review and add missing indexes based on query patterns:

```sql
-- Viral metrics queries
CREATE INDEX IF NOT EXISTS idx_badge_casts_viral_tier 
  ON badge_casts(viral_tier, viral_score DESC);

-- Quest expiration queries
CREATE INDEX IF NOT EXISTS idx_user_quests_expires 
  ON user_quests(expires_at) 
  WHERE status IN ('available', 'in_progress');

-- Notification history queries (already exists)
-- user_notification_history_fid_idx
-- user_notification_history_created_at_idx
```

### 🆕 3. RLS Policies Review
Some tables missing RLS policies:
- ❌ `viral_milestone_achievements` - RLS disabled
- ❌ `viral_tier_history` - RLS disabled
- ❌ `user_badges` - RLS disabled
- ❌ `mint_queue` - RLS disabled
- ❌ `frame_sessions` - RLS disabled

### 🆕 4. Missing Edge Functions

#### a) Viral Metrics Updater
**File**: `supabase/functions/update-viral-metrics/index.ts`
**Purpose**: Update viral engagement metrics for badge casts
**Schedule**: Invoked by GitHub Action every 6 hours

#### b) Quest Completion Webhook
**File**: `supabase/functions/quest-completion/index.ts`
**Purpose**: Process quest completions from external services
**Trigger**: Webhook from app

#### c) Notification Sender
**File**: `supabase/functions/send-notification/index.ts`
**Purpose**: Send push notifications to users
**Trigger**: Database trigger or webhook

---

## Configuration Issues

### GitHub Workflow Variables
These need to be moved from secrets/vars or created:

```bash
# Should be in GitHub Secrets (not vars)
SUPABASE_LEADERBOARD_TABLE=leaderboard_snapshots
SUPABASE_LEADERBOARD_VIEW_CURRENT=leaderboard_current

# Should be in GitHub Variables (not secrets)
SUPABASE_LEADERBOARD_SEASON_KEY=all
SUPABASE_TIMEOUT_MS=10000
SUPABASE_MAX_RETRIES=3
CHAIN_START_BLOCK=14000000
CHAIN_START_BLOCK_BASE=14000000
CHAIN_START_BLOCK_OP=110000000
CHAIN_START_BLOCK_CELO=24000000
CHAIN_START_BLOCK_UNICHAIN=1
CHAIN_START_BLOCK_INK=1
```

### Environment Variables (.env.local)
Missing for automation scripts:
```bash
# Viral tracking
NEYNAR_CAST_API_KEY=xxx

# Badge minting
BADGE_CONTRACT_BASE=0x...
BADGE_CONTRACT_UNICHAIN=0x...
BADGE_CONTRACT_CELO=0x...
BADGE_CONTRACT_INK=0x...
BADGE_CONTRACT_OP=0x...
BADGE_CONTRACT_ARBITRUM=0x...
ORACLE_PRIVATE_KEY=0x...

# Quest completion
QUEST_WEBHOOK_SECRET=xxx

# Notification sending
BADGE_MINT_WEBHOOK_URL=https://gmeowhq.art/api/webhooks/badge-mint
WEBHOOK_SECRET=xxx
```

---

## Recommended Actions

### High Priority (Week 1)
1. ✅ Fix GitHub workflow variable contexts (move secrets/vars appropriately)
2. 🆕 Create viral metrics sync workflow + script
3. 🆕 Set up pg_cron jobs for automated cleanup
4. 🆕 Create quest expiration workflow + script
5. 🆕 Review and enable RLS policies on sensitive tables

### Medium Priority (Week 2)
6. 🆕 Create leaderboard achievement workflow + script
7. 🆕 Create mint queue retry workflow + script
8. 🆕 Deploy viral metrics Edge Function
9. 🆕 Deploy notification sender Edge Function
10. 🆕 Add missing database indexes

### Low Priority (Week 3+)
11. 🆕 Create frame session cleanup workflow
12. 🆕 Deploy quest completion webhook Edge Function
13. 🆕 Add monitoring/alerting for workflow failures
14. 🆕 Create dashboard for automation metrics

---

## Files to Create

### Scripts
1. `scripts/automation/sync-viral-metrics.ts` - Viral engagement sync
2. `scripts/automation/expire-quests.ts` - Quest expiration
3. `scripts/automation/check-leaderboard-achievements.ts` - Achievement checks
4. `scripts/automation/retry-failed-mints.ts` - Mint retry logic
5. `scripts/automation/cleanup-frame-sessions.ts` - Session cleanup

### Workflows
1. `.github/workflows/viral-metrics-sync.yml` - Viral metrics
2. `.github/workflows/quest-expiration.yml` - Quest cleanup
3. `.github/workflows/leaderboard-achievements.yml` - Achievement checks
4. `.github/workflows/mint-retry.yml` - Mint retry
5. `.github/workflows/notification-cleanup.yml` - Notification cleanup
6. `.github/workflows/frame-cleanup.yml` - Frame session cleanup

### Edge Functions
1. `supabase/functions/update-viral-metrics/index.ts`
2. `supabase/functions/quest-completion/index.ts`
3. `supabase/functions/send-notification/index.ts`

### SQL
1. `supabase/migrations/[timestamp]_setup_cron_jobs.sql`
2. `supabase/migrations/[timestamp]_add_missing_indexes.sql`
3. `supabase/migrations/[timestamp]_enable_rls_policies.sql`

---

## Current Status Summary

**Workflows**: 5/10 (50%) ⬆️ +1
- ✅ Leaderboard sync
- ✅ Badge minting
- ✅ GM reminders
- ✅ Frame warmup
- ✅ **Viral metrics (NEW!)**
- ❌ Quest expiration (pg_cron scheduled ✅)
- ❌ Achievement checks
- ❌ Mint retry
- ❌ Notification cleanup (pg_cron scheduled ✅)
- ❌ Frame cleanup (pg_cron scheduled ✅)

**Supabase Tables**: 23/23 (100%)
- All tables created ✅

**Edge Functions**: 3/6 (50%)
- ✅ Notification tokens
- ✅ Badge adventure
- ✅ Viral metrics (automated via GitHub Actions)
- ❌ Quest completion webhook
- ❌ Notification sender

**Database Jobs**: 3/3 (100%) ✅ **COMPLETE!**
- ✅ Notification cleanup (Sunday 2 AM UTC)
- ✅ Frame session cleanup (Daily 4 AM UTC)
- ✅ Quest expiration (Daily 3 AM UTC)

**RLS Policies**: 23/23 (100%) ✅ **COMPLETE!**
- All tables properly secured ✅

**Configuration**: ✅ **FIXED!**
- GitHub workflow variables properly contexted
- Default fallback values added

---

## 🎉 November 30, 2025 Update

**All 4 Priority Tasks Completed:**

1. ✅ Fixed GitHub workflow variable contexts
2. ✅ Created viral metrics workflow (every 6 hours)
3. ✅ Set up pg_cron jobs (3 automated cleanup tasks)
4. ✅ Enabled RLS on all sensitive tables (5 tables)

**New Files:**
- `scripts/automation/sync-viral-metrics.ts` (400+ lines)
- `.github/workflows/viral-metrics-sync.yml`
- `supabase/migrations/20251130000001_setup_pg_cron_jobs.sql`
- `supabase/migrations/20251130000002_enable_rls_policies.sql`
- `GITHUB-WORKFLOW-SETUP.md` (deployment guide)
- `WORKFLOW-IMPLEMENTATION-SUMMARY.md` (complete summary)

**See**: `WORKFLOW-IMPLEMENTATION-SUMMARY.md` for full details.
