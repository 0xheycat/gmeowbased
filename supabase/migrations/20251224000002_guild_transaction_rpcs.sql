-- Migration: Create Guild Transaction RPC Functions
-- Purpose: Fix BUG #9 - Missing Database Transactions for Critical Operations
-- Issue: Multi-table updates not wrapped in transactions (data inconsistency risk)
-- Solution: Atomic RPC functions with EXCEPTION handling for automatic rollback
-- CVSS Score: 5.5 (Medium)
-- CWE Reference: CWE-662 (Improper Synchronization)

-- ==========================================
-- 1. Guild Member Join Transaction
-- ==========================================

CREATE OR REPLACE FUNCTION public.guild_member_join_tx(
  p_guild_id TEXT,
  p_member_address TEXT,
  p_fid INTEGER,
  p_guild_name TEXT,
  p_request_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id BIGINT;
  v_current_members INTEGER;
BEGIN
  -- Insert event (guild_events table)
  INSERT INTO public.guild_events (
    guild_id,
    event_type,
    actor_address,
    target_address,
    amount,
    metadata,
    created_at
  )
  VALUES (
    p_guild_id,
    'MEMBER_JOINED',
    p_member_address,
    NULL,
    NULL,
    jsonb_build_object(
      'guild_name', p_guild_name,
      'request_id', p_request_id,
      'fid', p_fid
    ),
    NOW()
  )
  RETURNING id INTO v_event_id;

  -- Update guild stats cache (guild_stats_cache table)
  -- Only update if row exists, otherwise let cron job create it
  UPDATE public.guild_stats_cache
  SET 
    member_count = member_count + 1,
    updated_at = NOW()
  WHERE guild_id = p_guild_id::BIGINT;

  -- Get current member count for response
  SELECT member_count INTO v_current_members
  FROM public.guild_stats_cache
  WHERE guild_id = p_guild_id::BIGINT;

  -- Return success with event details
  RETURN jsonb_build_object(
    'success', true,
    'event_id', v_event_id,
    'event_type', 'MEMBER_JOINED',
    'member_count', COALESCE(v_current_members, 1),
    'timestamp', NOW()
  );

EXCEPTION WHEN OTHERS THEN
  -- Automatic rollback on any error
  -- PostgreSQL rolls back entire function on RAISE
  RAISE EXCEPTION 'Guild join transaction failed: %', SQLERRM;
END;
$$;

-- ==========================================
-- 2. Guild Member Leave Transaction
-- ==========================================

CREATE OR REPLACE FUNCTION public.guild_member_leave_tx(
  p_guild_id TEXT,
  p_member_address TEXT,
  p_guild_name TEXT,
  p_request_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id BIGINT;
  v_current_members INTEGER;
BEGIN
  -- Insert event (guild_events table)
  INSERT INTO public.guild_events (
    guild_id,
    event_type,
    actor_address,
    target_address,
    amount,
    metadata,
    created_at
  )
  VALUES (
    p_guild_id,
    'MEMBER_LEFT',
    p_member_address,
    NULL,
    NULL,
    jsonb_build_object(
      'guild_name', p_guild_name,
      'request_id', p_request_id
    ),
    NOW()
  )
  RETURNING id INTO v_event_id;

  -- Update guild stats cache (guild_stats_cache table)
  UPDATE public.guild_stats_cache
  SET 
    member_count = GREATEST(member_count - 1, 0), -- Prevent negative
    updated_at = NOW()
  WHERE guild_id = p_guild_id::BIGINT;

  -- Get current member count for response
  SELECT member_count INTO v_current_members
  FROM public.guild_stats_cache
  WHERE guild_id = p_guild_id::BIGINT;

  -- Return success with event details
  RETURN jsonb_build_object(
    'success', true,
    'event_id', v_event_id,
    'event_type', 'MEMBER_LEFT',
    'member_count', COALESCE(v_current_members, 0),
    'timestamp', NOW()
  );

EXCEPTION WHEN OTHERS THEN
  -- Automatic rollback on any error
  RAISE EXCEPTION 'Guild leave transaction failed: %', SQLERRM;
END;
$$;

-- ==========================================
-- 3. Guild Deposit Points Transaction
-- ==========================================

CREATE OR REPLACE FUNCTION public.guild_deposit_points_tx(
  p_guild_id TEXT,
  p_depositor_address TEXT,
  p_amount BIGINT,
  p_guild_name TEXT,
  p_request_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id BIGINT;
  v_current_treasury BIGINT;
BEGIN
  -- Insert event (guild_events table)
  INSERT INTO public.guild_events (
    guild_id,
    event_type,
    actor_address,
    target_address,
    amount,
    metadata,
    created_at
  )
  VALUES (
    p_guild_id,
    'POINTS_DEPOSITED',
    p_depositor_address,
    NULL,
    p_amount,
    jsonb_build_object(
      'guild_name', p_guild_name,
      'request_id', p_request_id,
      'amount', p_amount
    ),
    NOW()
  )
  RETURNING id INTO v_event_id;

  -- Update guild stats cache (guild_stats_cache table)
  -- Increment treasury_points
  UPDATE public.guild_stats_cache
  SET 
    treasury_points = treasury_points + p_amount,
    updated_at = NOW()
  WHERE guild_id = p_guild_id::BIGINT;

  -- Get current treasury for response
  SELECT treasury_points INTO v_current_treasury
  FROM public.guild_stats_cache
  WHERE guild_id = p_guild_id::BIGINT;

  -- Return success with event details
  RETURN jsonb_build_object(
    'success', true,
    'event_id', v_event_id,
    'event_type', 'POINTS_DEPOSITED',
    'amount', p_amount,
    'treasury_points', COALESCE(v_current_treasury, p_amount),
    'timestamp', NOW()
  );

EXCEPTION WHEN OTHERS THEN
  -- Automatic rollback on any error
  RAISE EXCEPTION 'Guild deposit transaction failed: %', SQLERRM;
END;
$$;

-- ==========================================
-- 4. Guild Claim Points Transaction
-- ==========================================

CREATE OR REPLACE FUNCTION public.guild_claim_points_tx(
  p_guild_id TEXT,
  p_claimer_address TEXT,
  p_amount BIGINT,
  p_guild_name TEXT,
  p_request_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id BIGINT;
  v_current_treasury BIGINT;
BEGIN
  -- Insert event (guild_events table)
  INSERT INTO public.guild_events (
    guild_id,
    event_type,
    actor_address,
    target_address,
    amount,
    metadata,
    created_at
  )
  VALUES (
    p_guild_id,
    'POINTS_CLAIMED',
    p_claimer_address,
    NULL,
    p_amount,
    jsonb_build_object(
      'guild_name', p_guild_name,
      'request_id', p_request_id,
      'amount', p_amount
    ),
    NOW()
  )
  RETURNING id INTO v_event_id;

  -- Update guild stats cache (guild_stats_cache table)
  -- Decrement treasury_points
  UPDATE public.guild_stats_cache
  SET 
    treasury_points = GREATEST(treasury_points - p_amount, 0), -- Prevent negative
    updated_at = NOW()
  WHERE guild_id = p_guild_id::BIGINT;

  -- Get current treasury for response
  SELECT treasury_points INTO v_current_treasury
  FROM public.guild_stats_cache
  WHERE guild_id = p_guild_id::BIGINT;

  -- Return success with event details
  RETURN jsonb_build_object(
    'success', true,
    'event_id', v_event_id,
    'event_type', 'POINTS_CLAIMED',
    'amount', p_amount,
    'treasury_points', COALESCE(v_current_treasury, 0),
    'timestamp', NOW()
  );

EXCEPTION WHEN OTHERS THEN
  -- Automatic rollback on any error
  RAISE EXCEPTION 'Guild claim transaction failed: %', SQLERRM;
END;
$$;

-- ==========================================
-- Comments & Documentation
-- ==========================================

COMMENT ON FUNCTION public.guild_member_join_tx IS 
  'Atomically logs guild member join event and updates stats cache. 
   Prevents data inconsistency via PostgreSQL transaction with automatic rollback on error.
   Used by: app/api/guild/[guildId]/join/route.ts';

COMMENT ON FUNCTION public.guild_member_leave_tx IS 
  'Atomically logs guild member leave event and updates stats cache.
   Prevents data inconsistency via PostgreSQL transaction with automatic rollback on error.
   Used by: app/api/guild/[guildId]/leave/route.ts';

COMMENT ON FUNCTION public.guild_deposit_points_tx IS 
  'Atomically logs points deposit event and updates treasury balance.
   Prevents data inconsistency via PostgreSQL transaction with automatic rollback on error.
   Used by: app/api/guild/[guildId]/deposit/route.ts';

COMMENT ON FUNCTION public.guild_claim_points_tx IS 
  'Atomically logs points claim event and updates treasury balance.
   Prevents data inconsistency via PostgreSQL transaction with automatic rollback on error.
   Used by: app/api/guild/[guildId]/claim/route.ts';
