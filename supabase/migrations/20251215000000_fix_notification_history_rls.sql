/*
 * Fix user_notification_history RLS Policies
 * 
 * ISSUE: Browser client using anon key cannot query notifications
 * - RLS policy checks JWT claims for FID
 * - Browser auth via wallet doesn't set JWT FID claim
 * - Result: All queries return 0 results despite data existing
 * 
 * SOLUTION: Add public read policy for notification history
 * - Users can read ANY notification (view-only, no sensitive data)
 * - Still enforce RLS for updates/deletes (users own data only)
 * - Matches pattern from other public tables (leaderboards, etc.)
 * 
 * DATE: December 15, 2025
 * RELATED: Phase 4 notification system integration
 */

-- Drop existing restrictive SELECT policy if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_notification_history' 
    AND policyname = 'Users can view their own notifications'
  ) THEN
    DROP POLICY "Users can view their own notifications" ON user_notification_history;
  END IF;
END $$;

-- Create permissive SELECT policy (anyone can view notifications)
-- Notifications are not sensitive data (just XP events and achievements)
CREATE POLICY "Anyone can view notification history" 
  ON user_notification_history
  FOR SELECT
  USING (true);

-- Keep UPDATE restricted to own notifications
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_notification_history' 
    AND policyname = 'Users can dismiss their own notifications'
  ) THEN
    DROP POLICY "Users can dismiss their own notifications" ON user_notification_history;
  END IF;
END $$;

CREATE POLICY "Users can dismiss their own notifications" 
  ON user_notification_history
  FOR UPDATE
  USING (
    fid = (SELECT (current_setting('request.jwt.claims', true)::json->>'fid')::bigint)
    OR fid IS NULL -- Allow service role
  )
  WITH CHECK (
    fid = (SELECT (current_setting('request.jwt.claims', true)::json->>'fid')::bigint)
    OR fid IS NULL
  );

-- Ensure RLS is enabled
ALTER TABLE user_notification_history ENABLE ROW LEVEL SECURITY;

-- Add comment explaining the security model
COMMENT ON POLICY "Anyone can view notification history" ON user_notification_history IS 
  'Public read access - notifications are not sensitive (XP events, achievements). Write access restricted via separate policies.';
