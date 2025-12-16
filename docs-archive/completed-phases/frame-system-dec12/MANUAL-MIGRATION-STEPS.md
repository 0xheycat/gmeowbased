# Manual Migration Instructions

## Status
- ✅ `referral_stats` table created successfully
- ❌ `referral_activity` table needs creation
- ❌ `referral_registrations` table needs creation

## Steps to Complete Migration

### 1. Open Supabase SQL Editor
Navigate to: https://supabase.com/dashboard/project/bgnerptdanbgvcjentbt/sql/new

### 2. Copy and Paste This SQL

```sql
-- =====================================================
-- Table 2: referral_activity
-- =====================================================
CREATE TABLE IF NOT EXISTS referral_activity (
  id BIGSERIAL PRIMARY KEY,
  fid INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  
  -- Event details
  referral_code TEXT,
  referred_fid INTEGER,
  points_awarded INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB,
  
  -- Timestamps
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_event_type CHECK (event_type IN (
    'code_registered',
    'code_used',
    'referral_completed',
    'tier_upgraded',
    'points_earned',
    'milestone_reached'
  ))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referral_activity_fid ON referral_activity(fid);
CREATE INDEX IF NOT EXISTS idx_referral_activity_timestamp ON referral_activity(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_referral_activity_event_type ON referral_activity(event_type);
CREATE INDEX IF NOT EXISTS idx_referral_activity_code ON referral_activity(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_activity_referred_fid ON referral_activity(referred_fid);

-- RLS
ALTER TABLE referral_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for referral_activity"
  ON referral_activity FOR SELECT
  USING (true);

CREATE POLICY "Service role can modify referral_activity"
  ON referral_activity FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- Table 3: referral_registrations
-- =====================================================
CREATE TABLE IF NOT EXISTS referral_registrations (
  id BIGSERIAL PRIMARY KEY,
  fid INTEGER NOT NULL,
  wallet_address TEXT NOT NULL,
  referral_code TEXT UNIQUE NOT NULL,
  
  -- Referral chain
  referrer_fid INTEGER,
  referrer_code TEXT,
  
  -- Blockchain data
  registration_tx TEXT,
  referrer_set_tx TEXT,
  block_number BIGINT,
  
  -- Timestamps
  registered_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT unique_fid_registration UNIQUE(fid),
  CONSTRAINT unique_wallet_registration UNIQUE(wallet_address)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referral_registrations_fid ON referral_registrations(fid);
CREATE INDEX IF NOT EXISTS idx_referral_registrations_wallet ON referral_registrations(wallet_address);
CREATE INDEX IF NOT EXISTS idx_referral_registrations_code ON referral_registrations(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_registrations_referrer_fid ON referral_registrations(referrer_fid);
CREATE INDEX IF NOT EXISTS idx_referral_registrations_block ON referral_registrations(block_number);

-- RLS
ALTER TABLE referral_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for referral_registrations"
  ON referral_registrations FOR SELECT
  USING (true);

CREATE POLICY "Service role can modify referral_registrations"
  ON referral_registrations FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- Triggers
-- =====================================================
CREATE OR REPLACE FUNCTION update_referral_registrations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_referral_registrations_timestamp
  BEFORE UPDATE ON referral_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_registrations_timestamp();

-- =====================================================
-- Sample Data
-- =====================================================
INSERT INTO referral_activity (fid, event_type, referral_code, points_awarded)
VALUES
  (18139, 'code_registered', 'TESTCODE', 0),
  (18139, 'code_used', 'TESTCODE', 50),
  (18139, 'referral_completed', 'TESTCODE', 100)
ON CONFLICT DO NOTHING;

-- =====================================================
-- Verification
-- =====================================================
SELECT 
  'referral_activity' as table_name,
  COUNT(*) as row_count
FROM referral_activity
UNION ALL
SELECT 
  'referral_registrations',
  COUNT(*)
FROM referral_registrations
UNION ALL
SELECT 
  'referral_stats',
  COUNT(*)
FROM referral_stats;
```

### 3. Click "RUN" Button

You should see:
```
Success. No rows returned
```

### 4. Verify Tables Created

Run this verification query:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'referral%'
ORDER BY table_name;
```

Expected output:
- referral_activity
- referral_registrations  
- referral_stats

### 5. After Successful Creation

Come back to this terminal and type: **"done"**

Then I will:
1. Update REFERRAL-SYSTEM-FIX-PLAN.md (Priority 1 complete)
2. Test all API endpoints (Priority 3)
3. Continue with remaining priorities
