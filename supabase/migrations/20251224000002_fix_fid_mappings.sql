-- Fix FID mappings for guild member addresses (BUG #2 follow-up)
-- Issue: user_profiles table has mock/incorrect FID data
-- Real data from Neynar API:
--   0x8870C155666809609176260F2B65a626C000D773 = FID 1069798 (@gmeowbased)
--   0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1 = No Farcaster account (mock data)

-- Update correct FID for 0x8870C155666809609176260F2B65a626C000D773
UPDATE user_profiles 
SET 
  fid = 1069798,
  display_name = 'Gmeowbased',
  username = 'gmeowbased',
  updated_at = NOW()
WHERE wallet_address = '0x8870C155666809609176260F2B65a626C000D773';

-- Delete mock data for 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1 (no Farcaster account)
DELETE FROM user_profiles 
WHERE wallet_address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1';
