-- Add custody_address and verified_addresses columns to user_profiles
-- These fields come from Neynar API and should be stored for future use

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS custody_address TEXT,
ADD COLUMN IF NOT EXISTS verified_addresses TEXT[];

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_custody_address ON user_profiles(custody_address);
CREATE INDEX IF NOT EXISTS idx_user_profiles_wallet_address ON user_profiles(wallet_address);

-- Add comments
COMMENT ON COLUMN user_profiles.custody_address IS 'Farcaster custody address from Neynar';
COMMENT ON COLUMN user_profiles.verified_addresses IS 'Array of verified Ethereum addresses from Neynar';
COMMENT ON COLUMN user_profiles.wallet_address IS 'Primary wallet address (user-provided or first verified address)';
