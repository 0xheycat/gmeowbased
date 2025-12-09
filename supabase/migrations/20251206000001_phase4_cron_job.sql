-- ============================================================================
-- Phase 4: Daily Snapshot Cron Job
-- ============================================================================
-- Created: December 6, 2025
-- Purpose: Schedule daily snapshots at 00:00 UTC for all tracked addresses
-- 
-- Architecture:
-- 1. pg_cron calls capture_daily_snapshots() every day at 00:00 UTC
-- 2. Function fetches tracked addresses from profiles table
-- 3. Function calls external API endpoint to fetch Blockscout data
-- 4. External API updates snapshot rows with real data
-- ============================================================================

-- ============================================================================
-- Function: capture_daily_snapshots
-- ============================================================================
-- Purpose: Capture snapshots for all tracked addresses
-- Called by: pg_cron every day at 00:00 UTC
-- ============================================================================

CREATE OR REPLACE FUNCTION capture_daily_snapshots()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tracked_addresses TEXT[];
  v_address TEXT;
  v_chain TEXT := 'base';  -- Default chain
  v_snapshot_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_result TEXT;
BEGIN
  -- Get unique verified addresses from user_profiles table
  -- These are wallets that have connected and want tracking
  -- verified_addresses is an ARRAY, so we unnest it
  SELECT ARRAY_AGG(DISTINCT LOWER(addr))
  INTO v_tracked_addresses
  FROM user_profiles
  CROSS JOIN LATERAL unnest(verified_addresses) as addr
  WHERE verified_addresses IS NOT NULL
    AND verified_addresses != '{}'::TEXT[];
  
  -- If no addresses found, exit early
  IF v_tracked_addresses IS NULL OR array_length(v_tracked_addresses, 1) = 0 THEN
    RAISE NOTICE 'No tracked addresses found';
    RETURN 'No tracked addresses found';
  END IF;
  
  RAISE NOTICE 'Starting daily snapshots for % addresses', array_length(v_tracked_addresses, 1);
  
  -- Create placeholder snapshots for each address
  FOREACH v_address IN ARRAY v_tracked_addresses LOOP
    BEGIN
      -- Create placeholder snapshot
      INSERT INTO onchain_stats_snapshots (
        address,
        chain,
        snapshot_date
      ) VALUES (
        v_address,
        v_chain,
        CURRENT_DATE
      )
      ON CONFLICT (address, chain, snapshot_date) 
      DO NOTHING;  -- Skip if already exists
      
      v_snapshot_count := v_snapshot_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      RAISE WARNING 'Error creating snapshot for address %: %', v_address, SQLERRM;
    END;
  END LOOP;
  
  -- Build result message
  v_result := format(
    'Daily snapshots completed: %s created, %s errors out of %s addresses',
    v_snapshot_count,
    v_error_count,
    array_length(v_tracked_addresses, 1)
  );
  
  RAISE NOTICE '%', v_result;
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION capture_daily_snapshots IS 
  'Creates placeholder snapshot rows for all tracked addresses. External cron service populates data by calling /api/onchain-stats/snapshot API.';

-- ============================================================================
-- pg_cron Schedule: Daily Snapshots
-- ============================================================================
-- Runs every day at 00:00 UTC (midnight)
-- ============================================================================

-- Remove existing job if exists
SELECT cron.unschedule('daily-onchain-stats-snapshots');

-- Schedule new job
SELECT cron.schedule(
  'daily-onchain-stats-snapshots',
  '0 0 * * *',  -- Every day at 00:00 UTC
  $$SELECT capture_daily_snapshots()$$
);

-- ============================================================================
-- Verify Cron Job
-- ============================================================================

-- List all cron jobs
SELECT jobid, schedule, command, nodename, nodeport, database, username, active
FROM cron.job
WHERE jobname = 'daily-onchain-stats-snapshots';

-- View cron job history (last 10 runs)
SELECT jobid, runid, job_pid, database, username, command, status, 
       return_message, start_time, end_time
FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job WHERE jobname = 'daily-onchain-stats-snapshots'
)
ORDER BY start_time DESC
LIMIT 10;
