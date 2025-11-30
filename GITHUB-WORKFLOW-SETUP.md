# GitHub Workflow Configuration Guide

This guide explains how to configure GitHub Actions variables and secrets for the Gmeowbased workflows.

## Required GitHub Secrets

Configure these in: `Repository Settings > Secrets and variables > Actions > Secrets`

```bash
# Supabase Authentication
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Neynar API (for cast metrics and notifications)
NEYNAR_API_KEY=your_neynar_api_key

# RPC Endpoint (Base mainnet only)
RPC_BASE=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY

# Badge Contract Oracle (for minting)
ORACLE_PRIVATE_KEY=0x...
```

## Required GitHub Variables

Configure these in: `Repository Settings > Secrets and variables > Actions > Variables`

```bash
# Supabase Configuration (non-sensitive)
SUPABASE_LEADERBOARD_TABLE=leaderboard_snapshots
SUPABASE_LEADERBOARD_VIEW_CURRENT=leaderboard_current
SUPABASE_LEADERBOARD_SEASON_KEY=all
SUPABASE_TIMEOUT_MS=10000
SUPABASE_MAX_RETRIES=3

# Chain Start Block (Base mainnet - redeployed Nov 28, 2025)
CHAIN_START_BLOCK_BASE=37445375
```

## Workflows Overview

### 1. Supabase Leaderboard Sync
- **File**: `.github/workflows/supabase-leaderboard-sync.yml`
- **Schedule**: Daily at midnight UTC
- **Purpose**: Syncs on-chain leaderboard data to Supabase
- **Script**: `scripts/leaderboard/sync-supabase.ts`

### 2. Badge Minting
- **File**: `.github/workflows/badge-minting.yml`
- **Schedule**: Daily at 1 AM UTC
- **Purpose**: Processes badge minting queue
- **Script**: `scripts/automation/mint-badge-queue.ts`

### 3. GM Reminders
- **File**: `.github/workflows/gm-reminders.yml`
- **Schedule**: 
  - 9 AM UTC (afternoon Asia, morning Europe)
  - 9 PM UTC (afternoon Americas, evening Europe)
- **Purpose**: Sends push notifications to users who haven't GM'd
- **Script**: `scripts/automation/send-gm-reminders.ts`

### 4. Warmup Frame Functions
- **File**: `.github/workflows/warmup-frames.yml`
- **Schedule**: 
  - Every 10 minutes (6am-10pm UTC)
  - Every 30 minutes (10pm-6am UTC)
- **Purpose**: Prevents cold starts for serverless functions

### 5. 🆕 Viral Metrics Sync
- **File**: `.github/workflows/viral-metrics-sync.yml`
- **Schedule**: Every 6 hours
- **Purpose**: Updates engagement metrics for badge casts
- **Script**: `scripts/automation/sync-viral-metrics.ts`
- **Features**:
  - Fetches likes, recasts, replies from Neynar API
  - Calculates viral score: `(recasts × 10) + (replies × 5) + (likes × 2)`
  - Awards bonus XP for tier upgrades
  - Tracks tier history for analytics

## Setup Steps

### 1. Add Secrets to GitHub

```bash
# Navigate to your repo on GitHub
# Go to Settings > Secrets and variables > Actions > Secrets
# Click "New repository secret" for each secret above
```

### 2. Add Variables to GitHub

```bash
# Navigate to your repo on GitHub
# Go to Settings > Secrets and variables > Actions > Variables
# Click "New repository variable" for each variable above
```

### 3. Test Workflows Locally

```bash
# Test leaderboard sync
pnpm tsx scripts/leaderboard/sync-supabase.ts

# Test badge minting (dry run)
pnpm tsx scripts/automation/mint-badge-queue.ts --dry-run

# Test GM reminders (dry run)
pnpm tsx scripts/automation/send-gm-reminders.ts --dry-run

# Test viral metrics sync (dry run)
pnpm tsx scripts/automation/sync-viral-metrics.ts --dry-run
```

### 4. Manually Trigger Workflows

```bash
# Go to Actions tab on GitHub
# Select a workflow from the left sidebar
# Click "Run workflow" dropdown (top right)
# Click "Run workflow" button
```

## Supabase pg_cron Jobs

After deploying the migrations, verify pg_cron jobs are scheduled:

```sql
-- Connect to Supabase SQL Editor
-- Run this query to list all scheduled jobs:
SELECT * FROM cron.job ORDER BY jobname;

-- Expected jobs:
-- 1. cleanup-old-notifications (Sunday 2 AM UTC)
-- 2. cleanup-expired-frame-sessions (Daily 4 AM UTC)
-- 3. expire-old-quests (Daily 3 AM UTC)
```

### Manual Job Execution (Testing)

```sql
-- Test notification cleanup
SELECT cleanup_old_notifications();

-- Test frame session cleanup
SELECT cleanup_expired_frame_sessions();

-- Test quest expiration
SELECT expire_old_quests();
```

## Migration Deployment

Deploy the new migrations to Supabase:

```bash
# Option 1: Via Supabase CLI
supabase db push

# Option 2: Via Supabase Dashboard
# Go to Database > Migrations
# Upload migration files:
# - 20251130000001_setup_pg_cron_jobs.sql
# - 20251130000002_enable_rls_policies.sql
```

## Verification

### Check Workflow Status

```bash
# Go to Actions tab on GitHub
# Verify all workflows have green checkmarks
# Click on recent runs to view logs
```

### Check Supabase Data

```sql
-- Check badge casts are being tracked
SELECT COUNT(*) FROM badge_casts;

-- Check viral metrics are updating
SELECT 
  cast_hash, 
  viral_tier, 
  viral_score, 
  viral_bonus_xp,
  last_metrics_update
FROM badge_casts
WHERE viral_tier != 'none'
ORDER BY viral_score DESC
LIMIT 10;

-- Check XP transactions are being logged
SELECT 
  fid, 
  amount, 
  source, 
  metadata,
  created_at
FROM xp_transactions
WHERE source = 'viral_tier_upgrade'
ORDER BY created_at DESC
LIMIT 10;

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
```

## Troubleshooting

### Workflow Fails with "Variable not found"

- Check that all GitHub Variables are created (not just Secrets)
- Variable names are case-sensitive
- Variables must be in the correct context (vars vs secrets)

### pg_cron Jobs Not Running

```sql
-- Check if pg_cron extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Check job schedule
SELECT * FROM cron.job;

-- Check job run history
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

### Viral Metrics Sync Failing

- Verify `NEYNAR_API_KEY` is set in GitHub Secrets
- Check rate limits (100ms delay between requests)
- Review logs for specific cast hash errors
- Test locally with `--dry-run` flag

### RLS Blocking Queries

```sql
-- Temporarily disable RLS for testing (DO NOT USE IN PRODUCTION)
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;

-- Re-enable after testing
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

## Monitoring

### Workflow Notifications

- Enable email notifications: `Settings > Notifications > Actions`
- Set up Slack/Discord webhooks for workflow failures

### Database Monitoring

```sql
-- Monitor pg_cron job success rate
SELECT 
  jobname,
  COUNT(*) as total_runs,
  SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END) as successes,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failures
FROM cron.job_run_details
GROUP BY jobname;
```

## Next Steps

1. ✅ Configure GitHub Secrets and Variables
2. ✅ Deploy Supabase migrations
3. ✅ Test workflows manually
4. ✅ Verify pg_cron jobs are scheduled
5. ✅ Monitor first automated runs
6. 🔄 Create additional workflows (see WORKFLOW-SUPABASE-AUDIT.md)
