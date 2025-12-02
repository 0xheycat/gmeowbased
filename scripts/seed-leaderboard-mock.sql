-- ============================================================================
-- Leaderboard Mock Data Seeding Script
-- ============================================================================
-- Purpose: Generate realistic mock data for visual review of leaderboard UI
-- Status: TEMPORARY - Will be reset when moving to production
-- Date: December 2, 2025
--
-- NOTE: This script creates sample data for testing the leaderboard UI.
--       basePoints and streakBonus are set to 0 (contract integration pending).
--       Real data will come from:
--       - basePoints: QuestCompleted contract events
--       - streakBonus: GMEvent contract reads
-- ============================================================================

-- Clean existing mock data (if any)
DELETE FROM leaderboard_calculations WHERE period = 'all_time';

-- Insert 25 mock users with varied scores
-- Top 3 (Trophy winners)
INSERT INTO leaderboard_calculations (
  address,
  farcaster_fid,
  base_points,
  viral_xp,
  guild_bonus,
  referral_bonus,
  streak_bonus,
  badge_prestige,
  rank_tier,
  global_rank,
  rank_change,
  period
) VALUES
  -- Rank 1: Omniversal Being (500K+ points)
  (
    '0x1234567890123456789012345678901234567890',
    18139,
    0,  -- basePoints (pending contract integration)
    450000,  -- Massive viral engagement
    5000,    -- Guild level 50
    25000,   -- 500 referrals
    0,       -- streakBonus (pending contract integration)
    7500,    -- 300 badges
    'Omniversal Being',
    1,
    0,  -- No change (already top)
    'all_time'
  ),
  
  -- Rank 2: Infinite GM (250K-500K)
  (
    '0x2345678901234567890123456789012345678902',
    12345,
    0,
    320000,
    4500,  -- Guild level 45
    18000, -- 360 referrals
    0,
    6000,  -- 240 badges
    'Infinite GM',
    2,
    1,  -- Moved up 1 position
    'all_time'
  ),
  
  -- Rank 3: Singularity Prime (100K-250K)
  (
    '0x3456789012345678901234567890123456789013',
    45678,
    0,
    185000,
    3800,  -- Guild level 38
    12000, -- 240 referrals
    0,
    4500,  -- 180 badges
    'Singularity Prime',
    3,
    -1, -- Moved down 1 position
    'all_time'
  ),

-- Top 10 (High performers)
  -- Rank 4: Void Walker
  (
    '0x4567890123456789012345678901234567890124',
    23456,
    0,
    92000,
    3200,  -- Guild level 32
    9500,  -- 190 referrals
    0,
    3200,  -- 128 badges
    'Void Walker',
    4,
    2,  -- Moved up 2 positions
    'all_time'
  ),
  
  -- Rank 5: Cosmic Architect
  (
    '0x5678901234567890123456789012345678901235',
    34567,
    0,
    78000,
    2800,  -- Guild level 28
    7500,  -- 150 referrals
    0,
    2800,  -- 112 badges
    'Cosmic Architect',
    5,
    0,
    'all_time'
  ),
  
  -- Rank 6-10: Quantum Navigator tier
  (
    '0x6789012345678901234567890123456789012346',
    56789,
    0,
    52000,
    2200,
    5500,
    0,
    2000,
    'Quantum Navigator',
    6,
    -2,  -- Moved down 2
    'all_time'
  ),
  (
    '0x7890123456789012345678901234567890123457',
    67890,
    0,
    48000,
    2000,
    5000,
    0,
    1800,
    'Quantum Navigator',
    7,
    1,
    'all_time'
  ),
  (
    '0x8901234567890123456789012345678901234568',
    78901,
    0,
    45000,
    1900,
    4800,
    0,
    1700,
    'Quantum Navigator',
    8,
    0,
    'all_time'
  ),
  (
    '0x9012345678901234567890123456789012345679',
    89012,
    0,
    42000,
    1800,
    4500,
    0,
    1600,
    'Quantum Navigator',
    9,
    -1,
    'all_time'
  ),
  (
    '0xa123456789012345678901234567890123456780',
    90123,
    0,
    39000,
    1700,
    4200,
    0,
    1500,
    'Quantum Navigator',
    10,
    3,
    'all_time'
  ),

-- Mid-tier performers (Rank 11-20)
  (
    '0xb234567890123456789012345678901234567891',
    91234,
    0,
    22000,
    1200,
    2800,
    0,
    1000,
    'Nebula Commander',
    11,
    0,
    'all_time'
  ),
  (
    '0xc345678901234567890123456789012345678902',
    92345,
    0,
    18500,
    1100,
    2400,
    0,
    900,
    'Nebula Commander',
    12,
    -2,
    'all_time'
  ),
  (
    '0xd456789012345678901234567890123456789013',
    93456,
    0,
    16000,
    1000,
    2200,
    0,
    850,
    'Star Captain',
    13,
    1,
    'all_time'
  ),
  (
    '0xe567890123456789012345678901234567890124',
    94567,
    0,
    14500,
    900,
    2000,
    0,
    800,
    'Star Captain',
    14,
    0,
    'all_time'
  ),
  (
    '0xf678901234567890123456789012345678901235',
    95678,
    0,
    13000,
    850,
    1900,
    0,
    750,
    'Star Captain',
    15,
    2,
    'all_time'
  ),

-- Lower-tier performers (Rank 16-25)
  (
    '0x0789012345678901234567890123456789012346',
    96789,
    0,
    6500,
    500,
    1000,
    0,
    500,
    'Night Operator',
    16,
    -1,
    'all_time'
  ),
  (
    '0x1890123456789012345678901234567890123457',
    97890,
    0,
    5800,
    450,
    900,
    0,
    450,
    'Night Operator',
    17,
    0,
    'all_time'
  ),
  (
    '0x2901234567890123456789012345678901234568',
    98901,
    0,
    4200,
    300,
    650,
    0,
    300,
    'Beacon Runner',
    18,
    1,
    'all_time'
  ),
  (
    '0x3012345678901234567890123456789012345679',
    99012,
    0,
    3800,
    280,
    600,
    0,
    280,
    'Beacon Runner',
    19,
    -3,
    'all_time'
  ),
  (
    '0x4123456789012345678901234567890123456780',
    99123,
    0,
    3200,
    250,
    550,
    0,
    250,
    'Beacon Runner',
    20,
    0,
    'all_time'
  ),
  (
    '0x5234567890123456789012345678901234567891',
    99234,
    0,
    1800,
    150,
    350,
    0,
    150,
    'Warp Scout',
    21,
    2,
    'all_time'
  ),
  (
    '0x6345678901234567890123456789012345678902',
    99345,
    0,
    1500,
    120,
    300,
    0,
    125,
    'Warp Scout',
    22,
    0,
    'all_time'
  ),
  (
    '0x7456789012345678901234567890123456789013',
    99456,
    0,
    1200,
    100,
    250,
    0,
    100,
    'Warp Scout',
    23,
    -1,
    'all_time'
  ),
  (
    '0x8567890123456789012345678901234567890124',
    99567,
    0,
    800,
    50,
    150,
    0,
    75,
    'Signal Kitten',
    24,
    1,
    'all_time'
  ),
  (
    '0x9678901234567890123456789012345678901235',
    99678,
    0,
    600,
    30,
    100,
    0,
    50,
    'Signal Kitten',
    25,
    0,
    'all_time'
  );

-- Verify insertion
SELECT 
  global_rank,
  rank_tier,
  total_score,
  viral_xp,
  guild_bonus,
  referral_bonus,
  badge_prestige,
  rank_change
FROM leaderboard_calculations
WHERE period = 'all_time'
ORDER BY global_rank
LIMIT 10;

-- Summary statistics
SELECT 
  COUNT(*) as total_entries,
  MIN(total_score) as min_score,
  MAX(total_score) as max_score,
  AVG(total_score)::INTEGER as avg_score,
  COUNT(DISTINCT rank_tier) as unique_tiers
FROM leaderboard_calculations
WHERE period = 'all_time';

-- ============================================================================
-- NOTES FOR PRODUCTION:
-- ============================================================================
-- 1. This mock data will be replaced when contract integration is complete
-- 2. basePoints (quest completions) currently = 0 (needs QuestCompleted events)
-- 3. streakBonus (GM streaks) currently = 0 (needs GMEvent reads)
-- 4. Real scores will be calculated by lib/leaderboard-scorer.ts
-- 5. Cron job (.github/workflows/leaderboard-update.yml) will update every 6h
-- 6. To reset: DELETE FROM leaderboard_calculations WHERE period = 'all_time';
-- ============================================================================
