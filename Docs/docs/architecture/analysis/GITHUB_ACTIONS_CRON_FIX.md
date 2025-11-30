# GitHub Actions & Supabase Cron Jobs - Fix & Setup Guide

## 🐛 Problem: Failed Supabase Leaderboard Sync Job

**Issue:** GitHub Actions workflow failing due to `npm ci` command not working with pnpm project.

**Root Cause:** The workflow was using `npm` with `npm ci`, but this project uses `pnpm` as the package manager.

---

## ✅ Solution Applied

### 1. Fixed GitHub Actions Workflow

**File:** `.github/workflows/supabase-leaderboard-sync.yml`

**Changes:**
- ✅ Removed `cache: npm` from Node.js setup
- ✅ Added `pnpm/action-setup@v4` step
- ✅ Changed `npm ci` to `pnpm install --frozen-lockfile`

**Updated workflow:**
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 20

- name: Setup pnpm
  uses: pnpm/action-setup@v4
  with:
    version: 9

- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

**Next Run:** The workflow will now succeed on the next hourly cron trigger or manual dispatch.

---

## 🔧 Supabase Cron Jobs Setup (Optional)

### What is pg_cron?

`pg_cron` is a PostgreSQL extension that allows scheduling jobs directly in the database. This is an alternative to GitHub Actions for automated tasks.

**Availability:**
- ❌ **Supabase Free Tier**: NOT available
- ✅ **Supabase Pro Tier**: Available by default
- ✅ **Supabase Team/Enterprise**: Available

### Recommended Cron Jobs

#### 1. **Notification Cleanup** (Already Configured)

**Purpose:** Delete notifications older than 90 days  
**Frequency:** Daily at 2 AM UTC  
**Function:** `cleanup_old_notifications()`

**To Enable:**
```sql
-- Run in Supabase SQL Editor
select cron.schedule(
  'cleanup-old-notifications',
  '0 2 * * *',
  'select cleanup_old_notifications();'
);
```

#### 2. **Leaderboard Snapshot** (Optional Alternative)

**Current:** Handled by GitHub Actions (hourly)  
**Alternative:** Move to Supabase pg_cron

**Benefits of GitHub Actions (Current):**
- ✅ Free (no cost on Free tier)
- ✅ Access to full Node.js environment
- ✅ Can use all npm packages
- ✅ Logs available in GitHub UI

**Benefits of Supabase pg_cron:**
- ✅ Runs inside database (lower latency)
- ✅ No external dependencies
- ✅ Simpler for pure SQL operations

**Recommendation:** Keep leaderboard sync in GitHub Actions for now (better logging and flexibility).

---

## 📋 Setup Instructions

### Option A: Use GitHub Actions (Recommended - Current Setup)

✅ **Already configured!** No additional setup needed.

**What happens:**
1. GitHub Actions runs hourly via cron schedule
2. Fetches on-chain leaderboard data
3. Syncs to Supabase tables
4. Logs available in GitHub Actions UI

**To monitor:**
- Visit: https://github.com/0xheycat/gmeowbased/actions/workflows/supabase-leaderboard-sync.yml
- Check run history and logs

---

### Option B: Add Supabase pg_cron (Pro Tier Required)

**1. Check if pg_cron is available:**

```sql
-- Run in Supabase SQL Editor
select * from pg_extension where extname = 'pg_cron';
```

If it returns a row, pg_cron is available.

**2. Run setup script:**

File: `scripts/sql/setup_supabase_cron_jobs.sql`

```bash
# Copy contents and paste in Supabase SQL Editor
# Or run via psql/script
```

**3. Verify scheduled jobs:**

```sql
select jobid, jobname, schedule, active
from cron.job
order by jobname;
```

**4. Check execution history:**

```sql
select job_name, status, start_time, return_message
from cron.job_run_details
where start_time > now() - interval '24 hours'
order by start_time desc;
```

---

## 🗂️ Files Created/Modified

### Modified Files
- ✅ `.github/workflows/supabase-leaderboard-sync.yml` - Fixed to use pnpm

### New Files
- ✅ `scripts/sql/setup_supabase_cron_jobs.sql` - Supabase cron setup script

---

## 🎯 Recommended Actions

### Immediate (Required)
- [x] Fixed GitHub Actions workflow to use pnpm
- [ ] Wait for next hourly run to verify fix
- [ ] Monitor workflow runs for 24 hours

### Optional (If on Supabase Pro)
- [ ] Enable pg_cron for notification cleanup
- [ ] Run `scripts/sql/setup_supabase_cron_jobs.sql` in Supabase SQL Editor
- [ ] Verify cron job is scheduled: `select * from cron.job`
- [ ] Check job runs after 24 hours: `select * from cron.job_run_details`

### Admin Dashboard Improvements
- [ ] Add cron job status panel in `/admin` page
- [ ] Show last cleanup run timestamp
- [ ] Add manual trigger button for cleanup
- [ ] Display pg_cron availability status

---

## 📊 Current Automation Status

| Task | Method | Frequency | Status |
|------|--------|-----------|--------|
| Leaderboard Sync | GitHub Actions | Hourly | ✅ Fixed |
| Notification Cleanup | Manual/Cron | Daily | ⏳ Ready (needs pg_cron) |
| Badge Management | Manual | On-demand | ✅ Working |
| Analytics Refresh | Manual | On-demand | ✅ Working |

---

## 🔍 Monitoring & Troubleshooting

### GitHub Actions Monitoring

**Check workflow status:**
```bash
# View recent runs
gh run list --workflow=supabase-leaderboard-sync.yml --limit=10

# View specific run logs
gh run view <run-id> --log
```

**Or via GitHub UI:**
- Go to: https://github.com/0xheycat/gmeowbased/actions
- Click on "Supabase Leaderboard Sync"
- View run history and logs

### Supabase Cron Monitoring

**Check if jobs are running:**
```sql
-- View all scheduled jobs
select * from cron.job;

-- View recent executions
select * from cron.job_run_details 
where start_time > now() - interval '7 days'
order by start_time desc;
```

**Check for failures:**
```sql
select 
  job_name,
  status,
  return_message,
  start_time
from cron.job_run_details
where status != 'succeeded'
  and start_time > now() - interval '7 days'
order by start_time desc;
```

---

## 💡 Next Steps

1. **Verify GitHub Actions Fix**
   - Wait for next hourly run (check top of hour)
   - Confirm job succeeds
   - Check Supabase tables have fresh data

2. **Enable Notification Cleanup** (If on Pro tier)
   - Run `setup_supabase_cron_jobs.sql`
   - Verify job is scheduled
   - Check first run after 2 AM UTC

3. **Monitor for 48 Hours**
   - GitHub Actions: Should run every hour
   - Supabase Cron: Should run daily at 2 AM UTC
   - Check for any failures

4. **Optional Enhancements**
   - Add admin panel section for cron status
   - Create alert system for failed jobs
   - Add Slack/Discord notifications

---

## 📞 Support

**If issues persist:**
1. Check GitHub Actions logs for error messages
2. Verify Supabase environment variables are set in GitHub Secrets
3. Test leaderboard sync manually via `/admin` panel
4. Check Supabase table permissions and RLS policies

**GitHub Actions Environment Variables Required:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `RPC_BASE`, `RPC_OP`, `RPC_CELO`, `RPC_UNICHAIN`, `RPC_INK`
- Chain start block variables

---

**Status:** ✅ GitHub Actions fixed, ready for next run  
**Cron Jobs:** ⏳ Optional setup available (requires Pro tier)  
**Next Action:** Monitor workflow runs for 24 hours
