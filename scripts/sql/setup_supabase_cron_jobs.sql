-- Supabase pg_cron Job Setup
-- Run this in Supabase SQL Editor to enable automated maintenance tasks
-- Requires pg_cron extension (available on Supabase Pro plan and above)

-- Enable pg_cron extension (if not already enabled)
create extension if not exists pg_cron;

-- ============================================================================
-- 1. Cleanup Old Notifications (Daily at 2 AM UTC)
-- ============================================================================
-- Removes notifications older than 90 days from user_notification_history
-- Purpose: Keep storage usage low and improve query performance
-- Frequency: Once per day

select cron.schedule(
  'cleanup-old-notifications',
  '0 2 * * *',  -- Daily at 2:00 AM UTC
  $$
    select cleanup_old_notifications();
  $$
);

comment on function cron.schedule is 'Scheduled job: cleanup-old-notifications - Runs daily at 2 AM UTC';

-- ============================================================================
-- 2. OPTIONAL: Leaderboard Snapshot Sync (Hourly)
-- ============================================================================
-- Alternative to GitHub Actions workflow for leaderboard sync
-- Requires a stored procedure that syncs leaderboard data
-- NOTE: Currently handled by GitHub Actions cron, uncomment if moving to Supabase

-- UNCOMMENT BELOW TO ENABLE:
/*
create or replace function sync_leaderboard_snapshot()
returns void as $$
begin
  -- Insert your leaderboard sync logic here
  -- This should match the logic in scripts/leaderboard/sync-supabase.ts
  raise notice 'Leaderboard snapshot sync completed at %', now();
end;
$$ language plpgsql security definer;

select cron.schedule(
  'sync-leaderboard-snapshot',
  '0 * * * *',  -- Every hour at minute 0
  $$
    select sync_leaderboard_snapshot();
  $$
);
*/

-- ============================================================================
-- View Active Cron Jobs
-- ============================================================================
-- Check which cron jobs are currently scheduled

select 
  jobid,
  jobname,
  schedule,
  command,
  active,
  database
from cron.job
order by jobname;

-- ============================================================================
-- View Cron Job History (Last 24 Hours)
-- ============================================================================
-- Check execution history and any errors

select 
  job_name,
  status,
  start_time,
  end_time,
  return_message
from cron.job_run_details
where start_time > now() - interval '24 hours'
order by start_time desc
limit 50;

-- ============================================================================
-- Unscheduling Jobs (if needed)
-- ============================================================================
-- Run these commands if you need to remove a scheduled job:

-- To unschedule notification cleanup:
-- select cron.unschedule('cleanup-old-notifications');

-- To unschedule leaderboard sync:
-- select cron.unschedule('sync-leaderboard-snapshot');

-- ============================================================================
-- Verify Cleanup Function Exists
-- ============================================================================
-- Ensure the cleanup function is available before scheduling

select 
  proname as function_name,
  pg_get_functiondef(oid) as definition
from pg_proc
where proname = 'cleanup_old_notifications';

-- ============================================================================
-- Manual Test Run
-- ============================================================================
-- Test the cleanup function manually before scheduling:

-- select cleanup_old_notifications();

-- ============================================================================
-- Notes
-- ============================================================================
-- 1. pg_cron runs in UTC timezone
-- 2. Supabase Free tier does NOT support pg_cron
-- 3. Pro tier and above have pg_cron enabled by default
-- 4. If pg_cron is not available, rely on GitHub Actions workflows
-- 5. Monitor job execution via cron.job_run_details table
-- 6. Failed jobs will show error messages in return_message column

comment on extension pg_cron is 'Supabase automated job scheduler using pg_cron extension';
