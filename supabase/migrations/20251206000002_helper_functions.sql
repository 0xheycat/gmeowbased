-- ============================================================================
-- Helper Function: Get Tracked Addresses
-- ============================================================================
-- Created: December 6, 2025
-- Purpose: Return all addresses that should have daily snapshots
-- Called by: GitHub Actions workflow
-- ============================================================================

CREATE OR REPLACE FUNCTION get_tracked_addresses()
RETURNS TABLE (verified_address TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT LOWER(addr) as verified_address
  FROM user_profiles p
  CROSS JOIN LATERAL unnest(p.verified_addresses) as addr
  WHERE p.verified_addresses IS NOT NULL
    AND p.verified_addresses != '{}'::TEXT[]
  ORDER BY verified_address;
END;
$$;

COMMENT ON FUNCTION get_tracked_addresses IS 
  'Returns all unique verified addresses from profiles table for daily snapshot creation.';

-- Grant execute to service role (for GitHub Actions)
GRANT EXECUTE ON FUNCTION get_tracked_addresses() TO service_role;
GRANT EXECUTE ON FUNCTION get_tracked_addresses() TO anon;

-- Test the function
SELECT * FROM get_tracked_addresses() LIMIT 5;
