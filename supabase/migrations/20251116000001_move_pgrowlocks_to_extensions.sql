-- Move pgrowlocks extension from public to extensions schema
-- Date: 2025-11-16
-- Fixes: WARN - Extension in Public advisor

-- Supabase best practice: Keep extensions in the 'extensions' schema
-- to avoid exposing internal functions in the public schema

-- Move pgrowlocks extension to extensions schema
ALTER EXTENSION pgrowlocks SET SCHEMA extensions;

-- Grant necessary permissions if needed
-- (pgrowlocks is typically used for lock monitoring, admin-only functionality)
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Document the change
COMMENT ON EXTENSION pgrowlocks IS 
'Row-level lock information extension. Moved to extensions schema per Supabase best practices.';

-- Expected Result: 
-- ✅ Security advisor count: 1 → 0
-- ✅ All security advisors resolved!
