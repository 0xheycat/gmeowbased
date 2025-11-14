-- Fix timezone handling for rank events
-- This removes the unnecessary timezone() function call that was causing
-- "time zone not recognized" errors in Supabase PostgREST queries

-- Update the default to use simple now() instead of timezone('utc', now())
-- Postgres TIMESTAMPTZ already stores everything in UTC by default
ALTER TABLE public.gmeow_rank_events 
  ALTER COLUMN created_at SET DEFAULT now();

-- Add helpful comment explaining the fix
COMMENT ON COLUMN public.gmeow_rank_events.created_at 
  IS 'Event timestamp in UTC (Postgres TIMESTAMPTZ automatically handles timezone conversion)';

-- Verify the migration worked
DO $$
DECLARE
  default_val text;
BEGIN
  SELECT column_default INTO default_val
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'gmeow_rank_events' 
    AND column_name = 'created_at';
  
  RAISE NOTICE 'Migration completed. New default for created_at: %', default_val;
END $$;
